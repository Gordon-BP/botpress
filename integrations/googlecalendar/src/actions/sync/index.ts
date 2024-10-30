import { eventCreate } from './event-create'
import { eventDelete } from './event-delete'
import { eventList } from './event-list'
import { eventRead } from './event-read'
import { eventUpdate } from './event-update'
import { sendInvitation } from './send-invitation'

import * as bp from '.botpress'

export default {
  eventList,
  eventCreate,
  eventRead,
  eventUpdate,
  eventDelete,
  sendInvitation,
} satisfies Partial<bp.IntegrationProps['actions']>
