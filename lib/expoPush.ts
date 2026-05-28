const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'

interface PushMessage {
  to: string
  title: string
  body: string
  data?: Record<string, unknown>
  channelId?: string
  sound?: 'default'
  badge?: number
  priority?: 'default' | 'normal' | 'high'
}

// Send one or more push messages to Expo's push service.
// Fire-and-forget — call with .catch(() => {}) so errors never break the
// primary request handler.
export async function sendExpoPush(messages: PushMessage[]): Promise<void> {
  if (messages.length === 0) return
  await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-Encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(messages),
  })
}
