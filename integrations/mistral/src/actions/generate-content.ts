import { InvalidPayloadError } from '@botpress/client'
import { llm } from '@botpress/common'
import { IntegrationLogger } from '@botpress/sdk'
import {
	Mistral,
} from '@mistralai/mistralai'
import { Tool, ChatCompletionResponse, ChatCompletionRequest, SystemMessage, UserMessage, AssistantMessage, ToolMessage } from '@mistralai/mistralai/models/components'
import crypto from 'crypto'
import { DiscontinuedModelIds, DefaultModelId, ModelId } from 'src/schemas'

type ChatCompletionMessage = Array<
	| (SystemMessage & { role: "system" })
	| (UserMessage & { role: "user" })
	| (AssistantMessage & { role: "assistant" })
	| (ToolMessage & { role: "tool" })
>;

export async function generateContent(
	input: llm.GenerateContentInput,
	mistralClient: Mistral,
	logger: IntegrationLogger,
	params: { models: Record<ModelId, llm.ModelDetails>; defaultModel: ModelId }
): Promise<llm.GenerateContentOutput> {
	/* ── model pick / fallback ── */
	let modelId = (input.model?.id || params.defaultModel) as ModelId
	if (DiscontinuedModelIds.includes(modelId as unknown as string)) {
		logger.forBot().warn(`Model "${modelId}" discontinued – falling back to "${DefaultModelId}".`)
		modelId = DefaultModelId
		input.model = { id: modelId }
	}
	const model = params.models[modelId]

	/* ── build request ── */
	const request = await buildRequest(input, modelId, model, logger)
	if (input.debug) logger.forBot().info('Mistral request:\n' + JSON.stringify(request, null, 2))

	/* ── call API ── */
	let resp: ChatCompletionResponse | undefined = undefined
	try {
		resp = await mistralClient.chat.complete(request)
	} catch (e: any) {
		throw llm.createUpstreamProviderFailedError(e, `Mistral error: ${e.message}`)
	} finally {
		if (input.debug && resp) logger.forBot().info('Mistral response:\n' + JSON.stringify(resp, null, 2))
	}

	/* ── usage / billing ── */
	// Setting to zero so that we don't incur billing charges on Botpress
	const inTok = resp.usage?.promptTokens ?? 0
	const outTok = resp.usage?.completionTokens ?? 0
	const inCost = calcCost(model.input.costPer1MTokens, inTok)
	const outCost = calcCost(model.output.costPer1MTokens, outTok)

	/* ── map choices ── */
	const choices = resp.choices?.map(mapChoice) ?? []

	const out: llm.GenerateContentOutput = {
		id: resp.id ?? crypto.randomUUID(),
		provider: 'mistral-ai',
		model: modelId,
		choices,
		botpress: { cost: 0 },//{ cost: inCost + outCost },
		usage: { inputTokens: inTok, inputCost: 0, outputTokens: outTok, outputCost: 0 },		//{ inputTokens: inTok, inputCost: inCost, outputTokens: outTok, outputCost: outCost },
	}
	if (input.debug) logger.forBot().info('Action output:\n' + JSON.stringify(out, null, 2))
	return out
}

/* ───────────────────────────────── helpers ──────────────────────────────── */
async function buildRequest(
	input: llm.GenerateContentInput,
	modelId: ModelId,
	model: llm.ModelDetails,
	log: IntegrationLogger
): Promise<ChatCompletionRequest> {
	/* max-tokens guard */
	let maxTokens: number | undefined
	if (input.maxTokens) {
		maxTokens = Math.min(input.maxTokens, model.output.maxTokens)
		if (input.maxTokens > model.output.maxTokens) {
			log.forBot().warn(`Capping maxTokens to ${maxTokens} (model limit).`)
		}
	}

	return {
		model: modelId,
		messages: await buildMessages(input),
		temperature: input.temperature,
		topP: input.topP,
		maxTokens: maxTokens,
		stop: input.stopSequences,
		responseFormat: input.responseFormat === 'json_object' ? { type: 'json_object' } : { type: 'text' },
		tools: buildTools(input),
		toolChoice: buildToolChoice(input.toolChoice),
		parallelToolCalls: false,
		promptMode: input.reasoningEffort === 'low' ? null : 'reasoning',
	}
}

async function buildMessages(input: llm.GenerateContentInput): Promise<ChatCompletionMessage> {
	const m: ChatCompletionMessage = []
	if (input.systemPrompt) m.push({ role: 'system', content: input.systemPrompt })

	for (const msg of input.messages) {
		switch (msg.type) {
			case 'text':
				if (typeof msg.content !== 'string')
					throw new InvalidPayloadError('`content` must be string for type "text".')
				m.push({ role: msg.role, content: msg.content })
				break

			case 'multipart':
				if (!Array.isArray(msg.content))
					throw new InvalidPayloadError('`content` must be array for "multipart".')
				m.push({ role: msg.role, content: msg.content.join('\n') })
				break

			case 'tool_calls':
				if (!msg.toolCalls?.length)
					throw new InvalidPayloadError('"tool_calls" requires non-empty `toolCalls`.')
				m.push({
					role: 'assistant',
					content: '',
					tool_calls: msg.toolCalls.map((tc) => ({
						id: tc.id,
						type: 'function',
						function: { name: tc.function.name, arguments: JSON.stringify(tc.function.arguments ?? {}) },
					})),
				} as any)
				break

			case 'tool_result':
				if (typeof msg.content !== 'string')
					throw new InvalidPayloadError('`content` must be string for "tool_result".')
				if (!msg.toolResultCallId)
					throw new InvalidPayloadError('Missing `toolResultCallId` for "tool_result".')
				m.push({
					role: 'tool',
					name: msg.toolResultCallId,
					content: msg.content,
					tool_call_id: msg.toolResultCallId,
				} as any)
				break

			default:
				throw new InvalidPayloadError(`Unsupported message type "${(msg as any).type}".`)
		}
	}
	return m
}

function buildTools(input: llm.GenerateContentInput): Tool[] | undefined {
	return input.tools?.filter((t) => t.type === 'function').map((t) => ({
		type: 'function',
		function: {
			name: t.function.name,
			description: t.function.description,
			parameters: t.function.argumentsSchema,
		},
	} as Tool))
}

function buildToolChoice(choice: llm.GenerateContentInput['toolChoice']): ChatCompletionRequest['toolChoice'] {
	if (!choice) return undefined
	switch (choice.type) {
		case 'auto':
		case 'any':
		case 'none':
			return choice.type
		case 'specific':
			return { type: 'function', function: { name: choice.functionName ?? "" } }
		default:
			return undefined
	}
}

/* ── response mapping ──────────────────────────────────────────────────── */
type ChoiceOut = llm.GenerateContentOutput['choices'][0]

function mapChoice(c: {
	index?: number
	finish_reason?: string
	message: AssistantMessage
}): ChoiceOut {
	const msg: any = c.message            // SDK type is fine; we narrow with `any` for extra keys
	const toolCallsArr = Array.isArray(msg.tool_calls) ? msg.tool_calls : []

	const choice: ChoiceOut = {
		index: c.index ?? 0,
		role: 'assistant',
		type: toolCallsArr.length ? 'multipart' : 'text',
		content: '',
		stopReason: mapFinish(c.finish_reason),
	}

	/* ── tool calls → Botpress format ────────────────────────────────────── */
	if (toolCallsArr.length) {
		choice.toolCalls = toolCallsArr.map((tc: any) => ({
			id: tc.id,
			type: 'function',
			function: {
				name: tc.function.name,
				arguments: JSON.parse(tc.function.arguments || '{}'),
			},
		}))
	}

	/* ── content (plain text) ────────────────────────────────────────────── */
	if (typeof msg.content === 'string' && msg.content.length) {
		choice.content = msg.content
		if (!toolCallsArr.length) choice.type = 'text' // keep 'multipart' when both text + calls
	}

	return choice
}

function mapFinish(r?: string): ChoiceOut['stopReason'] {
	switch (r) {
		case 'stop':
			return 'stop'
		case 'length':
			return 'max_tokens'
		case 'tool_calls':
			return 'tool_calls'
		default:
			return 'other'
	}
}

function calcCost(perM: number, tokens: number) {
	return (perM / 1_000_000) * tokens
}
