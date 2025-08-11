import { IntegrationDefinition, z } from '@botpress/sdk'
import { ModelId } from 'src/schemas'
import llm from "./bp_modules/llm"

export default new IntegrationDefinition({
	name: 'mistral-ai',
	title: 'Mistral AI',
	description: 'Gain access to Mistral models for content generation, chat responses, and advanced language tasks',
	version: '0.0.6',
	readme: 'hub.md',
	icon: 'icon.svg',
	entities: {
		modelRef: {
			schema: z.object({
				id: ModelId,
			}),
		},
	},
	configuration: {
		schema: z.object({
			MISTRAL_API_KEY: z.string().title("Mistral API Key").describe("API key for Mistral La Platforme account"),
		}),
	},
}).extend(llm, ({ entities: { modelRef } }) => ({
	entities: { modelRef },
	actions: {
		generateContent: { billable: false }
	}
}))
