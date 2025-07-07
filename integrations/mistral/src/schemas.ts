import { z } from '@botpress/sdk'

export const languageModelId = z
  .enum([
    "ministral-3b-2410",
    "open-mistral-7b",
    "ministral-8b-2410",
    "open-mixtral-8x7b",
    "open-mixtral-8x22b-2404",
    "open-mistral-nemo-2407",
    "mistral-small-2506",
    "mistral-medium-2505",
    "mistral-large-2411",
    "pixtral-12b-2409",
    "pixtral-large-2411",
    "codestral-2501",
    "devstral-small-2505",
    "mistral-saba-2502",
    "magistral-small-2506",
    "magistral-medium-2506"
  ])
  .describe('Model to use for content generation')
  .placeholder('mistral-medium-2505')
export type LanguageModelId = z.infer<typeof languageModelId>
