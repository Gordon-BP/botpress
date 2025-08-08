import { z } from '@botpress/sdk'

export const DefaultModelId: ModelId = 'mistral-medium-2505'

export const ModelId = z
	.enum([
		'mistral-medium-2505',
		'magistral-medium-2507',
		'codestral-2508',
		'mistral-small-2506',
		'ministral-8b-2410',
		'mistral-large-2411',
	])
	.describe('Model to use for content generation')
	.placeholder(DefaultModelId)
export type ModelId = z.infer<typeof ModelId>

export const DiscontinuedModelIds = [
	'open-mistral-7b',
	'open-mixtral-8x7b',
	'open-mixtral-8x22b',
]
