import { useCallback, useEffect, useRef, useState } from 'react'
import { FRAME_MS } from './voiceAnalysis'

const SR = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null
export const canRecord = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined'
export const canTranscribe = !!SR

// 录音 + 实时音量 + （若浏览器支持）语音转文字。
// 全部在本地浏览器完成，音频不上传。
export function useVoiceRecorder({ lang = 'en-US' } = {}) {
  const [status, setStatus] = useState('idle') // idle | recording | done | error
  const [level, setLevel] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [audioUrl, setAudioUrl] = useState(null)
  const [result, setResult] = useState(null) // { frames, transcript, durationSec, hasTranscript }
  const [error, setError] = useState(null)

  const ref = useRef({})

  const cleanup = useCallback(() => {
    const r = ref.current
    clearInterval(r.timer)
    clearInterval(r.tick)
    r.stream?.getTracks().forEach((t) => t.stop())
    r.ctx?.close().catch(() => {})
    ref.current = {}
  }, [])

  useEffect(() => () => { cleanup() }, [cleanup])
  useEffect(() => () => { if (audioUrl) URL.revokeObjectURL(audioUrl) }, [audioUrl])

  const reset = useCallback(() => {
    setStatus('idle'); setAudioUrl(null); setResult(null); setError(null); setElapsed(0); setLevel(0)
  }, [])

  const start = useCallback(async () => {
    reset()
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true } })
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      if (ctx.state === 'suspended') await ctx.resume().catch(() => {})
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 1024
      ctx.createMediaStreamSource(stream).connect(analyser)
      const buf = new Float32Array(analyser.fftSize)

      const frames = []
      const timer = setInterval(() => {
        analyser.getFloatTimeDomainData(buf)
        let sum = 0
        for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i]
        const rms = Math.sqrt(sum / buf.length)
        frames.push(rms)
        setLevel(Math.min(1, rms * 6))
      }, FRAME_MS)

      const startedAt = Date.now()
      const tick = setInterval(() => setElapsed((Date.now() - startedAt) / 1000), 200)

      const chunks = []
      const recorder = new MediaRecorder(stream)
      recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data)

      // 语音转文字（Chrome / Edge / Safari）
      let transcript = ''
      let recognition = null
      let wantRecognition = true
      if (SR) {
        recognition = new SR()
        recognition.lang = lang
        recognition.continuous = true
        recognition.interimResults = false
        recognition.onresult = (e) => {
          for (let i = e.resultIndex; i < e.results.length; i++) {
            if (e.results[i].isFinal) transcript += ' ' + e.results[i][0].transcript
          }
        }
        recognition.onerror = () => {}
        recognition.onend = () => { if (wantRecognition) { try { recognition.start() } catch { /* 已在运行 */ } } }
        try { recognition.start() } catch { /* 忽略 */ }
      }

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' })
        const durationSec = (Date.now() - startedAt) / 1000
        const finish = () => {
          setAudioUrl(URL.createObjectURL(blob))
          setResult({ frames, transcript: transcript.trim(), durationSec, hasTranscript: !!transcript.trim(), srAvailable: !!SR })
          setStatus('done')
        }
        // 给识别器最多 1 秒时间吐出最后一段结果
        wantRecognition = false
        if (recognition) {
          let finished = false
          const once = () => { if (!finished) { finished = true; finish() } }
          recognition.onend = once
          try { recognition.stop() } catch { once() }
          setTimeout(once, 1000)
        } else finish()
        cleanup()
      }

      ref.current = { stream, ctx, timer, tick, recorder }
      recorder.start()
      setStatus('recording')
    } catch (e) {
      cleanup()
      setError(e?.name === 'NotAllowedError'
        ? '没有麦克风权限。请在浏览器地址栏允许使用麦克风后再试。'
        : '无法使用麦克风。请检查设备后重试。')
      setStatus('error')
    }
  }, [lang, reset, cleanup])

  const stop = useCallback(() => {
    const rec = ref.current.recorder
    if (rec && rec.state !== 'inactive') rec.stop()
  }, [])

  return { status, level, elapsed, audioUrl, result, error, start, stop, reset }
}
