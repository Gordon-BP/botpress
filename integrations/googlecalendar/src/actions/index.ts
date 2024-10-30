import { createEvent } from './create-event'
import { deleteEvent } from './delete-event'
import { listEvents } from './list-events'
import { sendInvitation } from './send-invites'
import sync from './sync'
import { updateEvent } from './update-event'
import * as bp from '.botpress'

export default {
  ...sync,
  createEvent,
  updateEvent,
  deleteEvent,
  listEvents,
  sendInvitation,
} satisfies bp.IntegrationProps['actions']
