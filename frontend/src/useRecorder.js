import { useRef, useState } from 'react'

// Push-to-talk recorder: start() on press, stop() resolves with a webm blob.
export function useRecorder() {
  const [recording, setRecording] = useState(false)
  const recorderRef = useRef(null)
  const chunksRef = useRef([])

  async function start() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
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
        resolve(new Blob(chunksRef.current, { type: 'audio/webm' }))
      }
      recorder.stop()
    })
  }

  return { recording, start, stop }
}
