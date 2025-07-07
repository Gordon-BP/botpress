import { llm } from "@botpress/common"
import { generateContent } from "./actions/generate-content" // our new mapper
import { Mistral } from "@mistralai/mistralai"
import type { LanguageModelId } from "./schemas"
import * as bp from ".botpress"

const mistralClient = new Mistral({
  apiKey: bp.secrets.MISTRAL_API_KEY,
  timeoutMs: 10 * 60 * 1000, // 10 min
})

export const DefaultLanguageModelId: LanguageModelId = "mistral-medium-2505"

// NOTE: Only *full* model IDs are declared – short aliases are too volatile.
// Pricing pulled from https://mistral.ai/pricing#api-pricing (2025‑07‑07).
const languageModels: Record<LanguageModelId, llm.ModelDetails> = {
  "ministral-3b-2410": {
    name: "Mistral 3B",
    description: "World‑class edge model.",
    tags: ["low-cost", "general-purpose"],
    input: { costPer1MTokens: 0.04, maxTokens: 128_000 },
    output: { costPer1MTokens: 0.04, maxTokens: 100_000 },
  },
  "open-mistral-7b": {
    name: "Mistral 7B",
    description: "A 7B transformer model, fast‑deployed and easily customisable.",
    tags: ["general-purpose"],
    input: { costPer1MTokens: 0.25, maxTokens: 32_768 },
    output: { costPer1MTokens: 0.25, maxTokens: 32_768 },
  },
  "ministral-8b-2410": {
    name: "Mistral 8B",
    description: "Powerful edge model with extremely high performance/price ratio.",
    tags: ["recommended", "general-purpose"],
    input: { costPer1MTokens: 0.1, maxTokens: 128_000 },
    output: { costPer1MTokens: 0.1, maxTokens: 100_000 },
  },
  "open-mixtral-8x7b": {
    name: "Mixtral 8×7B",
    description: "A 7B sparse MoE – 45B total / 12.9B active params.",
    tags: ["general-purpose"],
    input: { costPer1MTokens: 0.7, maxTokens: 32_768 },
    output: { costPer1MTokens: 0.7, maxTokens: 32_768 },
  },
  "open-mixtral-8x22b-2404": {
    name: "Mixtral 8×22B",
    description: "Highest‑performing open model; 141B total / 39B active params.",
    tags: ["general-purpose"],
    input: { costPer1MTokens: 2, maxTokens: 65_536 },
    output: { costPer1MTokens: 6, maxTokens: 65_536 },
  },
  "open-mistral-nemo-2407": {
    name: "Mistral NeMo",
    description: "SOTA model tuned for code tasks.",
    tags: ["low-cost", "general-purpose"],
    input: { costPer1MTokens: 0.15, maxTokens: 128_000 },
    output: { costPer1MTokens: 0.15, maxTokens: 100_000 },
  },
  "mistral-small-2506": {
    name: "Mistral Small",
    description: "SOTA. Multimodal. Multilingual. Apache 2.0.",
    tags: ["general-purpose", "low-cost"],
    input: { costPer1MTokens: 0.1, maxTokens: 32_768 },
    output: { costPer1MTokens: 0.1, maxTokens: 32_768 },
  },
  "mistral-medium-2505": {
    name: "Mistral Medium",
    description: "Frontier‑class multimodal model (May 2025).",
    tags: ["recommended", "general-purpose"],
    input: { costPer1MTokens: 0.4, maxTokens: 128_000 },
    output: { costPer1MTokens: 2.0, maxTokens: 100_000 },
  },
  "mistral-large-2411": {
    name: "Mistral Large",
    description: "Top‑tier reasoning for complex tasks.",
    tags: ["reasoning", "recommended", "general-purpose"],
    input: { costPer1MTokens: 2, maxTokens: 128_000 },
    output: { costPer1MTokens: 6, maxTokens: 100_000 },
  },
  "pixtral-12b-2409": {
    name: "Pixtral 12B",
    description: "Vision‑capable small model.",
    tags: ["vision", "low-cost", "general-purpose"],
    input: { costPer1MTokens: 0.15, maxTokens: 128_000 },
    output: { costPer1MTokens: 0.15, maxTokens: 100_000 },
  },
  "pixtral-large-2411": {
    name: "Pixtral Large",
    description: "Vision + frontier reasoning capabilities.",
    tags: ["vision", "reasoning", "general-purpose"],
    input: { costPer1MTokens: 2, maxTokens: 128_000 },
    output: { costPer1MTokens: 6, maxTokens: 100_000 },
  },
  "codestral-2501": {
    name: "Codestral",
    description: "Lightweight, fast, proficient in 80+ programming languages.",
    tags: ["coding", "agents", "function-calling"],
    input: { costPer1MTokens: 0.3, maxTokens: 256_000 },
    output: { costPer1MTokens: 0.9, maxTokens: 100_000 },
  },
  "devstral-small-2505": {
    name: "Devstral",
    description: "Best open‑source model for coding agents.",
    tags: ["coding", "low-cost", "function-calling"],
    input: { costPer1MTokens: 0.1, maxTokens: 128_000 },
    output: { costPer1MTokens: 0.3, maxTokens: 100_000 },
  },
  "mistral-saba-2502": {
    name: "Mistral Saba",
    description: "Custom‑trained model for specific geographies & markets.",
    tags: ["general-purpose"],
    input: { costPer1MTokens: 0.2, maxTokens: 32_768 },
    output: { costPer1MTokens: 0.6, maxTokens: 32_768 },
  },
  "magistral-small-2506": {
    name: "Magistral Small",
    description: "Reasoning‑oriented small model – transparent & multilingual.",
    tags: ["reasoning", "low-cost", "agents", "general-purpose"],
    input: { costPer1MTokens: 0.5, maxTokens: 40_000 },
    output: { costPer1MTokens: 1.5, maxTokens: 40_000 },
  },
  "magistral-medium-2506": {
    name: "Magistral Medium",
    description: "Reasoning‑oriented medium model.",
    tags: ["reasoning", "agents", "general-purpose"],
    input: { costPer1MTokens: 2, maxTokens: 40_000 },
    output: { costPer1MTokens: 5, maxTokens: 40_000 },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Integration definition
// ─────────────────────────────────────────────────────────────────────────────
export default new bp.Integration({
  register: async () => { },
  unregister: async () => { },

  actions: {
    /** Generate chat completions via Mistral */
    generateContent: async ({ input, logger, metadata }) => {
      const output = await generateContent(
        input as llm.GenerateContentInput,
        mistralClient,
        logger,
        {
          models: languageModels,
          defaultModel: DefaultLanguageModelId,
        }
      )
      metadata.setCost(output.botpress.cost)
      return output
    },

    // Place‑holders – to be implemented after Botpress exposes Mistral vision/tts endpoints.
    // generateImage: async () => undefined,
    // transcribeAudio: async () => undefined,
    // generateSpeech: async () => undefined,

    /** Return all language models supported by this connector */
    listLanguageModels: async () => {
      return {
        models: Object.entries(languageModels).map(([id, m]) => ({ id: id as LanguageModelId, ...m })),
      }
    },

    // listImageModels: async () => ({ models: [] }),
    // listSpeechToTextModels: async () => ({ models: [] }),
  },

  channels: {},
  handler: async () => { },
})
