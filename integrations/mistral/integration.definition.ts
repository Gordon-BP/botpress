/* bplint-disable */
import { IntegrationDefinition, z } from '@botpress/sdk'
import { languageModelId } from './src/schemas'
import llm from './bp_modules/llm'

export default new IntegrationDefinition({
  name: 'mistral',
  title: 'Mistral',
  description:
    'Gain access to Mistral models and European inference hosting.',
  version: '0.0.3',
  readme: 'hub.md',
  icon: 'icon.svg',
  entities: {
    modelRef: {
      schema: z.object({
        id: languageModelId,
      }),
    },
  },
  configuration: {
    schema: z.object({
      MISTRAL_API_KEY: z.string().describe('Mistral API key')
    })
  },
  secrets: {
  },
  actions: {
  },
})
  .extend(llm, ({ entities: { modelRef } }) => ({ entities: { modelRef } }))
