import { useRef, useState } from 'react'

// Pick the first recording format this browser supports. Chrome/Edge/Firefox
// use webm; Safari and iPhones only support mp4 — hardcoding webm breaks them.
const CANDIDATES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
  'audio/ogg;codecs=opus',
]

// Push-to-talk recorder: start() on press, stop() resolves with an audio blob.
export function useRecorder() {
  const [recording, setRecording] = useState(false)
  const recorderRef = useRef(null)
  const chunksRef = useRef([])

  async function start() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const mimeType = CANDIDATES.find(
      (t) => window.MediaRecorder && MediaRecorder.isTypeSupported(t),
    )
    const recorder = mimeType
      ? new MediaRecorder(stream, { mimeType })
      : new MediaRecorder(stream)
    chunksRef.current = []
    recorder.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data)
    recorder.start()
    recorderRef.current = recorder
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
