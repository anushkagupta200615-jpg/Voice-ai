import { useRef, useState } from 'react'

// Pick the first recording format this browser supports. Chrome/Edge/Firefox
// use webm; Safari and iPhones only support mp4 — hardcoding webm breaks them.
const CANDIDATES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
  'audio/ogg;codecs=opus',
]

// Push-to-talk recorder: start() resolves once recording has truly begun,
// stop() resolves with an audio blob.
export function useRecorder() {
  const [recording, setRecording] = useState(false)
  const recorderRef = useRef(null)
  const chunksRef = useRef([])

  async function start() {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    })
    const mimeType = CANDIDATES.find(
      (t) => window.MediaRecorder && MediaRecorder.isTypeSupported(t),
    )
    const opts = { audioBitsPerSecond: 128000 }
    if (mimeType) opts.mimeType = mimeType
    const recorder = new MediaRecorder(stream, opts)
    chunksRef.current = []
    recorder.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data)
    recorderRef.current = recorder
    // Resolve only when capture has actually begun, so the UI never says
    // "listening" before the mic is rolling (which clipped first words).
    await new Promise((resolve) => {
      recorder.onstart = resolve
      recorder.start()
    })
    setRecording(true)
  }

  function stop() {
    return new Promise((resolve) => {
      const recorder = recorderRef.current
      if (!recorder || recorder.state === 'inactive') return resolve(null)
      recorder.onstop = () => {
        recorder.stream.getTracks().forEach((t) => t.stop())
        setRecording(false)
        const type = recorder.mimeType || 'audio/webm'
        resolve(new Blob(chunksRef.current, { type }))
      }
      recorder.stop()
    })
  }

  return { recording, start, stop }
}
