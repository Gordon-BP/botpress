import { llm } from '@botpress/common'
import { Mistral } from '@mistralai/mistralai'
import { generateContent } from './actions/generate-content'
import { ModelId } from 'src/schemas'
import * as bp from ".botpress"

const DEFAULT_LANGUAGE_MODEL_ID: ModelId = 'mistral-medium-2505'

const languageModels: Record<ModelId, llm.ModelDetails> = {
	// Reference https://mistral.ai/pricing#api-pricing
	'mistral-medium-2505': {
		name: 'Mistral Medium 3',
		description:
			"Mistral's frontier-class multimodal model released May 2025.",
		tags: ['recommended', 'agents', 'general-purpose', 'vision'],
		input: {
			costPer1MTokens: 0.4,
			maxTokens: 128_000,
		},
		output: {
			costPer1MTokens: 2.0,
			maxTokens: 32_000,
		},
	},
	'magistral-medium-2507': {
		name: 'Magistral Medium 1.1',
		description:
			"Mistral's frontier-class reasoning model released July 2025.",
		tags: ['recommended', 'reasoning', 'agents'],
		input: {
			costPer1MTokens: 2,
			maxTokens: 40_000,
		},
		output: {
			costPer1MTokens: 5,
			maxTokens: 24_000,
		},
	},
	'codestral-2508': {
		name: 'Codestral',
		description:
			"Mistral's cutting-edge language model for coding released end of July 2025, Codestral specializes in low-latency, high-frequency tasks such as fill-in-the-middle (FIM), code correction and test generation.",
		tags: ['low-cost', 'coding'],
		input: {
			costPer1MTokens: 0.1,
			maxTokens: 1_048_576,
		},
		output: {
			costPer1MTokens: 0.4,
			maxTokens: 8192,
		},
	},
	"mistral-large-2411": {
		name: 'Mistral Large 2.1',
		description:
			"Mistral's top-tier large model for high-complexity tasks with the lastest version released November 2024. ",
		tags: ['reasoning', 'agents'],
		input: {
			costPer1MTokens: 2,
			maxTokens: 128_000,
		},
		output: {
			costPer1MTokens: 6,
			maxTokens: 64_000,
		},
	},
	"mistral-small-2506": {
		name: 'Mistral Small 3.2',
		description:
			"An update to Mistral's previous small model, released June 2025.",
		tags: ['low-cost'],
		input: {
			costPer1MTokens: 0.1,
			maxTokens: 128_000,
		},
		output: {
			costPer1MTokens: 0.3,
			maxTokens: 64_000,
		},
	},
	"ministral-8b-2410": {
		name: 'Mistral 8B 24.10',
		description:
			"Powerful model for on-device use cases.",
		tags: ['low-cost', 'deprecated'],
		input: {
			costPer1MTokens: 0.1,
			maxTokens: 128_000,
		},
		output: {
			costPer1MTokens: 1,
			maxTokens: 64_000,
		},
	},
}

export default new bp.Integration({
	register: async () => { },
	unregister: async () => { },
	actions: {
		generateContent: async ({ input, logger, metadata, ctx }) => {
			const mistralAIClient = new Mistral({ apiKey: ctx.configuration.MISTRAL_API_KEY })
			const output = await generateContent(<llm.GenerateContentInput>input, mistralAIClient, logger, {
				models: languageModels,
				defaultModel: DEFAULT_LANGUAGE_MODEL_ID,
			})
			metadata.setCost(output.botpress.cost)
			return output
		},
		listLanguageModels: async ({ }) => {
			return {
				models: Object.entries(languageModels).map(([id, model]) => ({ id: <ModelId>id, ...model })),
			}
		},
	},
	channels: {},
	handler: async () => { },
})
