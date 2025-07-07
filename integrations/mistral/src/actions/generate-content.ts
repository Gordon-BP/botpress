import { Mistral } from "@mistralai/mistralai"
import { InvalidPayloadError } from "@botpress/client"
import { llm } from "@botpress/common"
import { IntegrationLogger, z } from "@botpress/sdk"
import type { LanguageModelId } from "src/schemas"

export async function generateContent(
  input: llm.GenerateContentInput,
  mistral: Mistral,
  logger: IntegrationLogger,
  params: {
    models: Record<LanguageModelId, llm.ModelDetails>
    defaultModel: LanguageModelId
  }
): Promise<llm.GenerateContentOutput> {
  // ─── Model validation ──────────────────────────────────────────────────────
  const modelId = (input.model?.id || params.defaultModel) as LanguageModelId
  const model = params.models[modelId]

  if (!model) {
    throw new InvalidPayloadError(
      `Model ID "${modelId}" is not allowed, supported model IDs are: ${Object.keys(params.models).join(", ")}`
    )
  }

  // ─── Generic input guards ─────────────────────────────────────────────────
  if (input.messages.length === 0 && !input.systemPrompt) {
    throw new InvalidPayloadError("At least one message or a system prompt is required")
  }

  if (input.maxTokens && input.maxTokens > model.output.maxTokens) {
    throw new InvalidPayloadError(
      `maxTokens must be ≤ ${model.output.maxTokens} for model \"${modelId}\"`
    )
  }

  if (input.responseFormat === "json_object") {
    input.systemPrompt =
      (input.systemPrompt || "") +
      "\n\nYour response must always be valid JSON and expressed as a JSON object."
  }

  // ─── Message mapping ──────────────────────────────────────────────────────
  const mistralMessages = await Promise.all(
    (input.messages.length ? input.messages : [defaultPromptMessage()]).map(mapToMistralMessage)
  )

  // ─── Build chat request ───────────────────────────────────────────────────
  const request = {
    model: modelId,
    // max_tokens: input.maxTokens ?? model.output.maxTokens,
    temperature: input.temperature,
    // top_p: input.topP,
    stop: input.stopSequences,
    // system: input.systemPrompt,
    // safe_prompt: undefined as boolean | undefined, // expose later if needed
    // tools: mapToMistralTools(input),
    // tool_choice: mapToMistralToolChoice(input.toolChoice),
    messages: mistralMessages,
  } satisfies Parameters<typeof mistral.chat.complete>[0]

  if (input.debug) {
    logger.forBot().info("Mistral request →\n" + JSON.stringify(request, null, 2))
  }

  // ─── Invoke remote API ────────────────────────────────────────────────────
  let response: Awaited<ReturnType<typeof mistral.chat.complete>>
  try {
    response = await mistral.chat.complete(request)
  } catch (err: any) {
    /* ---- Mistral SDK surfaces two families of errors: SDKError + HTTPValidationError. ---- */
    // Re‑throw as Botpress‑style error with context.
    throw llm.createUpstreamProviderFailedError(err)
  }

  if (input.debug) {
    logger.forBot().info("Mistral response ←\n" + JSON.stringify(response, null, 2))
  }

  // ─── Translate response back to Botpress format ───────────────────────────
  const choice = response.choices[0]

  const { prompt_tokens: promptTokens, completion_tokens: completionTokens } = response.usage ?? {
    prompt_tokens: 0,
    completion_tokens: 0,
  }

  const inputCost = calculateTokenCost(model.input.costPer1MTokens, promptTokens)
  const outputCost = calculateTokenCost(model.output.costPer1MTokens, completionTokens)

  return {
    id: response.id,
    provider: "mistral",
    model: response.model,
    choices: [
      {
        role: choice.message.role,
        type: "multipart",
        index: 0,
        stopReason: mapToStopReason(choice.finish_reason),
        toolCalls: mapFromMistralToolCalls(choice.message.tool_calls),
        content: choice.message.content ?? "",
      },
    ],
    usage: {
      promptTokens,
      inputCost,
      completionTokens,
      outputCost,
    },
    botpress: {
      cost: inputCost + outputCost, // DEPRECATED
    },
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function calculateTokenCost(costPer1MTokens: number, tokenCount: number) {
  return (costPer1MTokens / 1_000_000) * tokenCount
}

function defaultPromptMessage(): llm.Message {
  return {
    role: "user",
    type: "text",
    content: "Follow the instructions provided in the system prompt.",
  }
}

async function mapToMistralMessage(message: llm.Message): Promise<any /* ChatMessage */> {
  switch (message.type) {
    case "text":
      if (typeof message.content !== "string") {
        throw new InvalidPayloadError("`content` must be a string when message type is \"text\"")
      }
      return { role: message.role, content: message.content }

    case "multipart":
      if (!Array.isArray(message.content)) {
        throw new InvalidPayloadError("`content` must be an array when message type is \"multipart\"")
      }
      return { role: message.role, content: await mapMultipart(message.content) }

    case "tool_calls":
      if (!message.toolCalls?.length) {
        throw new InvalidPayloadError("`toolCalls` must contain at least one tool call")
      }
      return {
        role: "assistant",
        tool_calls: message.toolCalls.map((t) => ({
          id: t.id,
          type: "function",
          function: {
            name: t.function.name,
            arguments: t.function.arguments,
          },
        })),
      }

    case "tool_result":
      return {
        role: "tool",
        content: String(message.content ?? ""),
        tool_call_id: message.toolResultCallId,
      }

    default:
      throw new InvalidPayloadError(`Message type \"${message.type}\" is not supported`)
  }
}

async function mapMultipart(parts: NonNullable<llm.Message["content"]>): Promise<any[]> {
  const result: any[] = []
  for (const part of parts) {
    if (part.type === "text") {
      result.push({ type: "text", text: part.text })
    } else if (part.type === "image") {
      if (!part.url) throw new InvalidPayloadError("`url` is required when part type is \"image\"")
      result.push({ type: "image_url", image_url: part.url })
    }
  }
  return result
}

function mapToMistralTools(input: llm.GenerateContentInput) {
  if (!input.tools?.length || input.toolChoice?.type === "none") return undefined
  return input.tools.map((t) => ({
    name: t.function.name,
    description: t.function.description,
    parameters: t.function.argumentsSchema,
  }))
}

function mapToMistralToolChoice(
  toolChoice: llm.GenerateContentInput["toolChoice"]
): "auto" | { name: string } | undefined {
  if (!toolChoice) return undefined
  switch (toolChoice.type) {
    case "auto":
    case "any":
      return "auto"
    case "specific":
      return { name: toolChoice.functionName }
    default:
      return undefined
  }
}

function mapToStopReason(reason?: string | null): llm.GenerateContentOutput["choices"][0]["stopReason"] {
  switch (reason) {
    case "stop":
      return "stop"
    case "length":
      return "max_tokens"
    case "tool_calls":
      return "tool_calls"
    default:
      return "other"
  }
}

function mapFromMistralToolCalls(toolCalls: any | undefined): llm.ToolCall[] | undefined {
  if (!toolCalls?.length) return undefined
  return toolCalls.map((tc: any) => ({
    id: tc.id,
    type: "function",
    function: {
      name: tc.function.name,
      arguments: tc.function.arguments as llm.ToolCall["function"]["arguments"],
    },
  }))
}
