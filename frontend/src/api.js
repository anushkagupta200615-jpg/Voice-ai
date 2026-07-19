// Thin client for the voice_core backend. If you embed this UI in another
// project, this file is the only place that knows about the API.

async function jsonOrThrow(resp) {
  if (!resp.ok) {
    let detail = resp.statusText
    try { detail = (await resp.json()).detail || detail } catch { /* ignore */ }
    throw new Error(detail)
  }
  return resp.json()
}

export async function newSession() {
  const { session_id } = await jsonOrThrow(await fetch('/api/session'))
  return session_id
}

export async function sendChat(message, sessionId) {
  const resp = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, session_id: sessionId }),
  })
  const { reply } = await jsonOrThrow(resp)
  return reply
}

export async function transcribe(audioBlob) {
  // Name the file by its real format (webm on Chrome, mp4 on Safari/iPhone)
  // so the STT provider decodes it correctly.
  const ext = (audioBlob.type.match(/audio\/(\w+)/) || [null, 'webm'])[1]
  const form = new FormData()
  form.append('audio', audioBlob, `recording.${ext}`)
  const resp = await fetch('/api/stt', { method: 'POST', body: form })
  const { text } = await jsonOrThrow(resp)
  return text
}

// Returns an object URL for an MP3 of the spoken text.
// `voice` optionally overrides the server's default voice.
export async function speak(text, voice) {
  const resp = await fetch('/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voice }),
  })
  if (!resp.ok) throw new Error('TTS failed')
  return URL.createObjectURL(await resp.blob())
}
