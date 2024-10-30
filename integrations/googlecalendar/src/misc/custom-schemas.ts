import { z, IntegrationDefinition } from '@botpress/sdk'

export type ActionDefinitions = NonNullable<IntegrationDefinition['actions']>
export type Schema = ActionDefinitions[string]['input']['schema']

const eventSchema = z.object({
  summary: z.string().describe('The event title/summary.'),
  description: z.string().optional().describe('The event description.'),
  location: z.string().optional().describe('The event location.'),
  startDateTime: z.string().describe('The start date and time in RFC3339 format (e.g., "2023-12-31T10:00:00.000Z").'),
  endDateTime: z.string().describe('The end date and time in RFC3339 format (e.g., "2023-12-31T12:00:00.000Z").'),
  attendees: z
    .array(z.object({ email: z.string().email(), responseStatus: z.string().default('accepted').hidden() }))
    .optional()
    .describe('Event attendees as an array of objects like { email: user@email.com }'),
  conferenceData: z
    .object({ createRequest: z.object({ requestId: z.string() }) })
    .optional()
    .describe(
      "An Id to use to request a Google Meet conferencing link. Must be a nested object like {createRequest: { requestId: 'abc123'}}"
    ),
})

export const createEventInputSchema = eventSchema.extend({
  sendUpdates: z
    .enum(['all', 'externalOnly', 'none'])
    .default('none')
    .describe(
      "Options to send email invitations to attendees. Default is no invitations, other options include 'all' to send invites to all parties, or 'externalOnly' to send invites only to attendees outside your organization"
    ),
})

export const createEventOutputSchema = z
  .object({
    eventId: z.string().describe('The ID of the created calendar event.'),
  })
  .partial()
  .passthrough()

export const updateEventInputSchema = eventSchema.extend({
  eventId: z.string().describe('The ID of the calendar event to update.'),
})

export const updateEventOutputSchema = z
  .object({
    eventId: z.string().describe('The ID of the updated calendar event.'),
    success: z.boolean().describe('Indicates whether the event update was successful.'),
  })
  .partial()
  .passthrough()

export const deleteEventInputSchema = z
  .object({
    eventId: z.string().describe('The ID of the calendar event to delete.'),
  })
  .partial()

export const deleteEventOutputSchema = z
  .object({
    eventId: z.string().describe('The ID of the updated calendar event.'),
    success: z.boolean().describe('Indicates whether the event deletion was successful.'),
  })
  .partial()
  .passthrough()

export const listEventsInputSchema = z
  .object({
    count: z.number().min(1).max(2500).default(100).describe('The maximum number of events to return.'),
    pageToken: z.string().optional().describe('Token specifying which result page to return.'),
    timeMin: z.string().optional().describe('The minimum start time of events to return.'),
  })
  .partial()

export const listEventsOutputSchema = z.object({
  events: z
    .array(
      z
        .object({
          eventId: z.string().nullable().describe('The ID of the calendar event.'),
          event: eventSchema.describe('The calendar event data.'),
        })
        .partial()
    )
    .describe('The list of calendar events.'),
  nextPageToken: z
    .string()
    .nullable()
    .optional()
    .describe('Token used to access the next page of this result. Omitted if no further results are available.'),
})

export const sendInvitationInputSchema = z.object({
  to: z.array(z.string().email()).describe("A list of email addresses to send the invitation to"),
  subject: z.string().describe("The email subject line"),
  body: z.string().describe("The email body as plain text"),
  event: eventSchema
}).partial()

export const sendInvitationOutputSchema = z.object({
  // Recreated from users.messages.Message https://developers.google.com/gmail/api/reference/rest/v1/users.messages#Message
  // message: z.object({
  //   id: z.string().describe("The immutable ID of the message."),
  //   threadId: z.string().optional().nullable().describe("The ID of the thread the message belongs to."),
  //   labelIds: z.array(z.string()).optional().nullable().describe("List of IDs of labels applied to this message."),
  //   snippet: z.string().optional().nullable().describe("A short part of the message text."),
  //   historyId: z.string().optional().nullable().describe("The ID of the last history record that modified this message."),
  //   internalDate: z.string().describe("The internal message creation timestamp (epoch ms), which determines ordering in the inbox"),
  //   payload: z.object({
  //     partId: z.string(),
  //     mimeType: z.string(),
  //     fileName: z.string(),
  //     headers: z.array(
  //       z.object({
  //         name: z.string(),
  //         value: z.string()
  //       })
  //     ),
  //     body: z.object({
  //       attachmentId: z.string().optional().nullable().describe("When present, contains the ID of an external attachment that can be retrieved in a separate messages.attachments.get request. When not present, the entire content of the message part body is contained in the data field."),
  //       size: z.number().describe("Number of bytes for the message part data (encoding notwithstanding)."),
  //       data: z.string().describe("The body data of a MIME message part as a base64url encoded string. May be empty for MIME container types that have no message body or when the body data is sent as a separate attachment. An attachment ID is present if the body data is contained in a separate attachment."),
  //     }),
  //     parts: z.array(z.object({})).optional().nullable()
  //   }).describe("The parsed email structure in the message parts."),
  //   sizeEstimate: z.number().describe("Estimated size in bytes of the message."),
  //   raw: z.string().describe("The entire email message in an RFC 2822 formatted and base64url encoded string. Returned in messages.get and drafts.get responses when the format=RAW parameter is supplied."),
  // }).optional().nullable()
  eventId: z.string().describe('The ID of the updated calendar event.'),
  success: z.boolean().describe('Indicates whether the event deletion was successful.'),
})
  .partial()
  .passthrough()
