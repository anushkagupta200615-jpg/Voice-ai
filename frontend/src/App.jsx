import { useEffect, useRef, useState } from 'react'
import { newSession, sendChat, transcribe, speak } from './api.js'
import { useRecorder } from './useRecorder.js'
import AnimeGirl from './AnimeGirl.jsx'

// All Edge TTS voices here are female; first two are Indian.
const VOICES = [
  { id: 'en-IN-NeerjaNeural', label: 'Neerja · English (India)' },
  { id: 'hi-IN-SwaraNeural', label: 'Swara · हिन्दी' },
  { id: 'en-US-AriaNeural', label: 'Aria · English (US)' },
  { id: 'en-US-JennyNeural', label: 'Jenny · English (US)' },
  { id: 'en-GB-SoniaNeural', label: 'Sonia · English (UK)' },
]

const STATUS_LABEL = {
  idle: 'Tap the mic and talk to me',
  listening: 'Listening… tap again to send',
  thinking: 'Thinking…',
  speaking: 'Speaking… tap me (or the mic) to stop',
}

// status: idle | listening | thinking | speaking
export default function App() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [status, setStatus] = useState('idle')
  const [voiceOn, setVoiceOn] = useState(true)
  const [voice, setVoice] = useState(VOICES[0].id)
  const [error, setError] = useState('')
  const sessionRef = useRef('default')
  const audioRef = useRef(null)      // the single reusable <audio> player
  const unlockedRef = useRef(false)  // has audio been unlocked by a tap yet?
  const bottomRef = useRef(null)
  const playGenRef = useRef(0) // bumped to cancel an in-flight playback pipeline
  const voiceRef = useRef(voice)
  voiceRef.current = voice
  const { recording, start, stop } = useRecorder()

  useEffect(() => {
    newSession().then((id) => { sessionRef.current = id }).catch(() => {})
    // One persistent audio element, reused for every reply. Creating a fresh
    // `new Audio()` per reply can't be played on phones (not tied to a tap).
    audioRef.current = new Audio()
    audioRef.current.preload = 'auto'
  }, [])

  // Phones block audio that isn't started by a user gesture. Call this inside
  // a tap (mic / send) to "bless" our audio element so later replies can play.
  const SILENT =
    'data:audio/wav;base64,UklGRiwAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQgAAAAAAAAAAAAAAA=='
  function unlockAudio() {
    try { speechSynthesis.resume() } catch { /* ignore */ }
    const el = audioRef.current
    if (!el || unlockedRef.current) return
    el.src = SILENT
    el.play().then(() => {
      el.pause(); el.currentTime = 0; unlockedRef.current = true
    }).catch(() => { /* will retry on next tap */ })
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, status])

  function addMessage(role, text) {
    setMessages((m) => [...m, { role, text }])
  }

  function stopSpeaking() {
    playGenRef.current++ // cancels the playback pipeline
    const el = audioRef.current
    if (el) { el.pause(); el.removeAttribute('src'); el.load() }
    speechSynthesis.cancel()
    setStatus((s) => (s === 'speaking' ? 'idle' : s))
  }

  // Split a reply into sentence chunks (~max 180 chars) so TTS can be
  // pipelined: chunk N plays while chunk N+1 is being synthesized. This
  // makes her start talking in ~1s instead of waiting for the full audio.
  function splitSentences(text) {
    const parts = text.match(/[^.!?।]+[.!?।]+["')\]]*\s*|[^.!?।]+$/g) || [text]
    const chunks = []
    let cur = ''
    for (const p of parts) {
      if (cur && (cur + p).length > 180) { chunks.push(cur); cur = p }
      else cur += p
    }
    if (cur.trim()) chunks.push(cur)
    return chunks
  }

  function playUrl(url) {
    return new Promise((resolve) => {
      const el = audioRef.current
      if (!el) return resolve()
      el.onended = resolve
      el.onpause = resolve // user stopped playback
      el.onerror = resolve
      el.src = url
      el.play().catch(resolve)
    })
  }

  async function playReply(text) {
    const gen = ++playGenRef.current
    setStatus('speaking')
    try {
      const chunks = splitSentences(text)
      let next = speak(chunks[0], voiceRef.current)
      for (let i = 0; i < chunks.length; i++) {
        const url = await next
        if (playGenRef.current !== gen) return
        // Prefetch the next chunk while this one plays.
        if (i + 1 < chunks.length) next = speak(chunks[i + 1], voiceRef.current)
        await playUrl(url)
        if (playGenRef.current !== gen) return
      }
    } catch {
      // Server TTS failed — fall back to the browser's built-in voice.
      if (playGenRef.current !== gen) return
      await new Promise((resolve) => {
        const u = new SpeechSynthesisUtterance(text)
        u.onend = resolve
        u.onerror = resolve
        speechSynthesis.speak(u)
      })
    } finally {
      if (playGenRef.current === gen) {
        setStatus((s) => (s === 'speaking' ? 'idle' : s))
      }
    }
  }

  async function handleTurn(userText) {
    setError('')
    addMessage('user', userText)
    setStatus('thinking')
    try {
      const reply = await sendChat(userText, sessionRef.current)
      addMessage('assistant', reply)
      if (voiceOn) await playReply(reply)
      else setStatus('idle')
    } catch (e) {
      setError(e.message)
      setStatus('idle')
    }
  }

  async function handleSend(e) {
    e.preventDefault()
    const text = input.trim()
    if (!text || status !== 'idle') return
    unlockAudio() // within the tap, so her reply can play on phones
    setInput('')
    await handleTurn(text)
  }

  async function handleMic() {
    setError('')
    unlockAudio() // within the tap, so her reply can play on phones
    if (status === 'speaking') {
      // First tap while she's talking just stops the audio.
      stopSpeaking()
      return
    }
    if (recording) {
      const blob = await stop()
      if (!blob || blob.size < 1000) { setStatus('idle'); return }
      setStatus('thinking')
      try {
        // Hint STT with the language of the selected voice (hi for Swara).
        const lang = voiceRef.current.startsWith('hi-') ? 'hi' : 'en'
        const text = await transcribe(blob, lang)
        if (!text) {
          setError("Didn't catch that — try again or type instead.")
          setStatus('idle')
          return
        }
        setStatus('idle')
        await handleTurn(text)
      } catch (e) {
        setError(`Transcription failed: ${e.message}`)
        setStatus('idle')
      }
    } else {
      try {
        // Stop any playback so the mic doesn't record the agent's own voice.
        stopSpeaking()
        await start()
        setStatus('listening')
      } catch (err) {
        const msg =
          err?.name === 'NotAllowedError'
            ? 'Microphone blocked — click the lock icon in the address bar, allow the microphone, then try again.'
            : err?.name === 'NotFoundError'
              ? 'No microphone found on this device — you can still type below.'
              : `Mic error: ${err?.message || err} — you can still type below.`
        setError(msg)
      }
    }
  }

  return (
    <div className="app">
      <div className="bg-gradient" />
      <AnimeGirl status={status} onStop={stopSpeaking} />

      <header>
        <div className="brand">
          <span className="brand-dot" />
          <h1>Aria</h1>
          <span className="brand-sub">voice agent</span>
        </div>
        <div className="controls">
          <select
            className="voice-select"
            value={voice}
            onChange={(e) => setVoice(e.target.value)}
            title="Voice"
          >
            {VOICES.map((v) => (
              <option key={v.id} value={v.id}>{v.label}</option>
            ))}
          </select>
          <label className="voice-toggle">
            <input
              type="checkbox"
              checked={voiceOn}
              onChange={(e) => setVoiceOn(e.target.checked)}
            />
            <span className="switch" />
            Speak
          </label>
        </div>
      </header>

      <main className="transcript">
        {messages.length === 0 && (
          <p className="hint">Tap the mic and talk to Aria, or type below.</p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`bubble ${m.role}`}>{m.text}</div>
        ))}
        {status === 'thinking' && (
          <div className="bubble assistant typing">
            <span /><span /><span />
          </div>
        )}
        {error && <div className="error">{error}</div>}
        <div ref={bottomRef} />
      </main>

      <div className="status-bar">
        {status !== 'idle' && (
          <span className={`status-pill ${status}`}>{STATUS_LABEL[status]}</span>
        )}
        {status === 'speaking' && (
          <button className="stop-btn" onClick={stopSpeaking} title="Stop speaking">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <rect x="6" y="6" width="12" height="12" rx="2.5" />
            </svg>
            Stop
          </button>
        )}
      </div>

      <footer>
        <button
          className={`mic ${recording ? 'recording' : ''}`}
          onClick={handleMic}
          disabled={status === 'thinking'}
          title={
            status === 'speaking' ? 'Stop speaking'
              : recording ? 'Stop and send'
              : 'Start talking'
          }
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
            {recording
              ? <rect x="6" y="6" width="12" height="12" rx="2" />
              : <path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2z" />}
          </svg>
        </button>
        <form onSubmit={handleSend}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message…"
            disabled={status === 'thinking'}
          />
          <button type="submit" disabled={status !== 'idle' || !input.trim()}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M2 21l21-9L2 3v7l15 2-15 2v7z" />
            </svg>
          </button>
        </form>
      </footer>
    </div>
  )
}
