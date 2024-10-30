import sync from './sync'
import * as bp from '.botpress'
import { parseError } from 'src/misc/utils'

export const sendInvitation: bp.IntegrationProps['actions']['sendInvitation'] = async (props) => {
  const { client, ctx, input, logger, metadata } = props
  try {
    const output = await sync.sendInvitation({
      type: 'sendInvitation',
      client,
      ctx,
      logger,
      metadata,
      input: {
        to: input.to,
        subject: input.subject,
        body: input.body,
        event: input.event,
      }
    })
    return {
      eventId: "abc123",
      success: true
    }
  } catch (error) {
    const err = parseError(error)
    logger.forBot().error('Error while deleting event ', err.message)
    throw err
  }
}

