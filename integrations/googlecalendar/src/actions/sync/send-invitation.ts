import { getMailClient } from 'src/client'
import { parseError } from 'src/misc/utils'
import * as bp from '.botpress'
import { gmail_v1 } from 'googleapis'
import * as uuid from 'uuid'


type SendInvitationProps = bp.ActionProps['sendInvitation']

const getRFC2822Date = () => {
  const date = new Date(Date.now());
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const dayOfWeek = days[date.getUTCDay()];
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = months[date.getUTCMonth()];
  const year = date.getUTCFullYear();
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');

  return `${dayOfWeek}, ${day} ${month} ${year} ${hours}:${minutes}:${seconds} +0000`;
};
// Format date to UTC in iCalendar format
function formatToICalDate(date: string | Date): string {
  return new Date(date).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

const createICSFile = (async (props: SendInvitationProps) => {
  const { logger, ctx, input } = props;
  if (!input.event) {
    logger.forBot().error("Cannot create ICS file without calendar event!")
    throw Error("Cannot create ICS file without calendar event!")
  }
  const { summary, description, location, startDateTime, endDateTime, attendees } = input.event
  // Required fields for .ics format
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
    `DTSTART:${formatToICalDate(startDateTime)}`,
    `DTEND:${formatToICalDate(endDateTime)}`,
    `ORGANIZER;CN=${ctx.configuration.subject}:MAILTO:${ctx.configuration.subject}`,
  ];
  if (attendees) {
    attendees.forEach((attendee) => {
      lines.push(`ATTENDEE;CN=${attendee.email};RSVP=TRUE;PARTSTAT=NEEDS-ACTION:MAILTO:${attendee.email}`);
    });
  }
  lines.push('END:VEVENT');
  lines.push('END:VCALENDAR');

  return lines.join('\n');
})

const createMail = (async (props: SendInvitationProps) => {
  const { logger, ctx, input } = props;
  var recipientCSV = ''
  if (!input.to) {
    logger.forBot().error("Cannot create message without to field")
    throw Error("Cannot create message without a to field!")
  } else if (input.to.length > 1) {
    input.to.forEach(attendee => {
      recipientCSV += attendee + ", "
    })
  } else if (input.to.length === 1 && input.to[0]) {
    recipientCSV += input.to[0]
  }
  const icsFile = Buffer.from(await createICSFile(props)).toString('base64')

  const rfc2822 = `From: ${ctx.configuration.subject}
To: ${recipientCSV}
Bcc: ${ctx.configuration.subject}
Date: ${getRFC2822Date()}
Subject: Invitation: ${input.event?.summary} @ ${input.event?.startDateTime} (${ctx.configuration.subject})
Message-ID: ${uuid.v4()}.${ctx.configuration.subject}
MIME-Version: 1.0
Content-Type: multipart/mixed; boundary="boundary-separator"

--boundary-separator
Content-Type: text/plain; charset="UTF-8"

${input.body}

--boundary-separator
Content-Type: text/calendar; charset=UTF-8; method=REQUEST
Content-Disposition: attachment; filename="invite.ics"
Content-Transfer-Encoding: base64

${icsFile}
--boundary-separator--
  `
  const message: gmail_v1.Schema$Message = {
    "id": uuid.v4(),
    raw: Buffer.from(rfc2822).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
  }
  return message
});

export const sendInvitation = (async (props: SendInvitationProps) => {
  const { logger, ctx, input } = props
  try {
    const { gmail } = await getMailClient(ctx.configuration)

    const rawMessage = await createMail(props)
    if (!rawMessage) {
      logger.forBot().warn('Cannot send invitations for an event with no attendees')
      return {
        eventId: "abc123",
        success: false
      }
    }
    await gmail.users.messages.send({
      userId: 'me',
      requestBody: rawMessage,
    });
    return {
      eventId: uuid.v4(),
      success: true
    }
  } catch (error) {
    const err = parseError(error)
    logger.forBot().error('Error while mailing invitation ', err.message)
    throw err
  }
}) satisfies bp.IntegrationProps['actions']['sendInvitation']
