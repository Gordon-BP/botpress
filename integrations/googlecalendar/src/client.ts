import { JWT } from 'google-auth-library'
import { google } from 'googleapis'

export type Config = {
  calendarId: string
  privateKey: string
  clientEmail: string
}

export async function getClient(config: Config) {
  const auth = new JWT({
    email: config.clientEmail,
    key: config.privateKey.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/calendar'],
    subject: "gordy@hanakano.com"
  })
  const calendar = google.calendar({ version: 'v3', auth })
  await auth.authorize()
  return {
    auth,
    calendar,
  }
}
export async function getMailClient(config: Config) {
  const auth = new JWT({
    email: config.clientEmail,
    key: config.privateKey.replace(/\\n/g, '\n'),
    scopes: [
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/gmail.compose'
    ],
    subject: "gordy@hanakano.com"
  })
  const gmail = google.gmail({ version: 'v1', auth })
  await auth.authorize()
  return {
    auth,
    gmail,
  }
}

