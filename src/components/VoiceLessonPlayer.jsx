import { useEffect, useMemo, useRef, useState } from 'react'
import { analyseFrames, buildFeedback } from '../lib/voiceAnalysis'
import { canRecord, canTranscribe, useVoiceRecorder } from '../lib/useVoiceRecorder'
import { loadProgress, lastSessionFor, recordSession } from '../lib/voiceProgress'
import './VoiceLessonPlayer.css'

const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

// 把 "/" 渲染成停顿标记，把全大写词渲染成重音
function RichLine({ text }) {
  return text.split('/').map((part, i, arr) => (
    <span key={i}>
      {part.split(/(\b[A-Z]{2,}\b)/).map((w, j) => (/^[A-Z]{2,}$/.test(w) ? <strong key={j} className="stress">{w}</strong> : w))}
      {i < arr.length - 1 && <span className="pause-mark" aria-label="pause">⏸</span>}
    </span>
  ))
}

function LearnStep({ step, onNext }) {
  return (
    <div className="card vp-card">
      <div className="eyebrow">先理解一点点</div>
      <h2 className="vp-title">{step.title}</h2>
      <p className="vp-body">{step.body}</p>
      {step.tips?.length > 0 && (
        <ul className="vp-tips">{step.tips.map((t) => <li key={t}>{t}</li>)}</ul>
      )}
      <button className="primary" onClick={onNext}>继续</button>
    </div>
  )
}

function TimerStep({ step, onNext }) {
  const [running, setRunning] = useState(false)
  const [t, setT] = useState(0)
  const cycle = step.pattern.reduce((a, p) => a + p.sec, 0)

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setT((v) => v + 0.25), 250)
    return () => clearInterval(id)
  }, [running])

  const done = t >= step.seconds
  let pos = t % cycle
  let phase = step.pattern[0]
  for (const p of step.pattern) { if (pos < p.sec) { phase = p; break } pos -= p.sec }
  const growing = phase.label.toLowerCase().startsWith('in')

  return (
    <div className="card vp-card">
      <div className="eyebrow">热身 · {step.seconds} 秒</div>
      <h2 className="vp-title">{step.title}</h2>
      <p className="vp-body">{step.instruction}</p>
      <div className="breath-wrap">
        <div
          className="breath-circle"
          style={{
            transform: running && !done ? `scale(${growing ? 1.25 : 0.8})` : 'scale(1)',
            transitionDuration: `${phase.sec}s`
          }}
        >
          <span>{done ? '✓' : running ? phase.label : '准备'}</span>
        </div>
      </div>
      <div className="vp-meta">{running ? `${Math.max(0, Math.ceil(step.seconds - t))} 秒` : '准备好就开始'}</div>
      {!running && !done && <button className="primary" onClick={() => setRunning(true)}>开始</button>}
      {(done || running) && <button className={done ? 'primary' : 'secondary tiny'} onClick={onNext}>{done ? '继续' : '跳过'}</button>}
    </div>
  )
}

function RecordStep({ step, onNext }) {
  const isRead = step.type === 'read'
  const lang = step.lang || 'en-US'
  const rec = useVoiceRecorder({ lang })
  const [promptIdx, setPromptIdx] = useState(() => new Date().getDate() % (step.prompts?.length || 1))
  const [checked, setChecked] = useState({})
  const limit = isRead ? 90 : step.seconds

  const targetText = isRead ? step.lines.join(' ') : null
  const prompt = isRead ? null : step.prompt || step.prompts[promptIdx]

  // 到时自动停止
  useEffect(() => {
    if (rec.status === 'recording' && rec.elapsed >= limit) rec.stop()
  }, [rec.elapsed, rec.status, limit]) // eslint-disable-line react-hooks/exhaustive-deps

  const feedback = useMemo(() => {
    if (!rec.result) return null
    const analysis = analyseFrames(rec.result.frames)
    return {
      analysis,
      ...buildFeedback({
        analysis,
        transcript: rec.result.transcript,
        hasTranscript: rec.result.hasTranscript,
        srAvailable: rec.result.srAvailable,
        targetText,
        target: step.target || {},
        durationSec: rec.result.durationSec
      })
    }
  }, [rec.result, targetText, step.target])

  if (!canRecord) {
    return (
      <div className="card vp-card">
        <h2 className="vp-title">这个浏览器不支持录音</h2>
        <p className="vp-body">请用最新版 Chrome、Edge 或 Safari 打开。</p>
        <button className="secondary" onClick={() => onNext(null)}>跳过这一步</button>
      </div>
    )
  }

  const done = rec.status === 'done' && feedback
  const level = Math.round(rec.level * 100)

  return (
    <div className="card vp-card">
      <div className="eyebrow">{isRead ? '朗读练习' : '开口说'}</div>
      <h2 className="vp-title">{step.title}</h2>
      {step.instruction && <p className="vp-body">{step.instruction}</p>}

      <div className="vp-script" lang={lang}>
        {isRead
          ? step.lines.map((l) => <p key={l}><RichLine text={l} /></p>)
          : <p>{prompt}</p>}
      </div>
      {!isRead && step.prompts && rec.status === 'idle' && (
        <button className="link-btn" onClick={() => setPromptIdx((i) => (i + 1) % step.prompts.length)}>换一个问题</button>
      )}

      {rec.status === 'idle' && (
        <>
          <button className="primary rec-btn" onClick={rec.start}>🎙 开始录音</button>
          <p className="vp-hint">{canTranscribe ? '录音只在你的浏览器里处理，不会上传。' : '这个浏览器只能分析音量与停顿；用 Chrome / Edge 可获得语速和清晰度反馈。'}</p>
        </>
      )}

      {rec.status === 'error' && (
        <>
          <p className="vp-error">{rec.error}</p>
          <button className="primary" onClick={rec.start}>再试一次</button>
        </>
      )}

      {rec.status === 'recording' && (
        <>
          <div className="meter" role="img" aria-label="音量"><div className="meter-fill" style={{ width: `${level}%` }} /></div>
          <div className="vp-meta">
            <span className="rec-dot" /> {fmt(rec.elapsed)}{!isRead && ` / ${fmt(limit)}`}
          </div>
          <button className="primary stop-btn" onClick={rec.stop}>■ 完成</button>
        </>
      )}

      {done && (
        <div className="vp-result">
          <audio controls src={rec.audioUrl} className="vp-audio" />
          <p className="vp-hint">先听一遍回放，再看下面的观察。</p>

          {rec.result.transcript && (
            <details className="vp-transcript">
              <summary>系统听到的内容</summary>
              <p>{rec.result.transcript}</p>
            </details>
          )}

          <div className="notes">
            {feedback.notes.map((n) => (
              <div key={n.key} className={`note ${n.tone}`}>
                <div className="note-title">{n.tone === 'good' ? '✓ ' : '→ '}{n.title}</div>
                <div className="note-text">{n.text}</div>
              </div>
            ))}
          </div>

          {step.selfCheck?.length > 0 && (
            <div className="selfcheck">
              <div className="eyebrow">自己听完，对照一下</div>
              {step.selfCheck.map((q) => (
                <label key={q} className="check-row">
                  <input type="checkbox" checked={!!checked[q]} onChange={(e) => setChecked({ ...checked, [q]: e.target.checked })} />
                  <span>{q}</span>
                </label>
              ))}
            </div>
          )}

          <button className="primary" onClick={() => onNext({ ...feedback.metrics, stepTitle: step.title })}>继续</button>
          <button className="secondary tiny" onClick={rec.reset}>再录一次</button>
        </div>
      )}
    </div>
  )
}

export function VoiceLessonPlayer({ lesson, onFinish, onExit }) {
  const [index, setIndex] = useState(0)
  const [finished, setFinished] = useState(false)
  const metricsRef = useRef([])
  const savedRef = useRef(null)
  const [previous] = useState(() => lastSessionFor(loadProgress(), lesson.id))

  const step = lesson.steps[index]
  const isLast = index === lesson.steps.length - 1

  function next(metrics) {
    if (metrics) metricsRef.current.push(metrics)
    if (isLast) {
      if (!savedRef.current) {
        const rec = metricsRef.current
        const pick = (k) => { const v = rec.map((m) => m[k]).filter((x) => x != null); return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null }
        savedRef.current = { wpm: pick('wpm'), clarityPct: pick('clarityPct'), loudnessDb: pick('loudnessDb'), durationSec: rec.reduce((a, m) => a + (m.durationSec || 0), 0) }
        recordSession(lesson.id, savedRef.current)
      }
      setFinished(true)
    } else setIndex(index + 1)
  }

  if (finished) {
    const m = savedRef.current
    const diff = (k, unit) => {
      if (!previous?.metrics || m[k] == null || previous.metrics[k] == null) return null
      const d = m[k] - previous.metrics[k]
      return d === 0 ? '与上次持平' : `比上次 ${d > 0 ? '+' : ''}${d}${unit}`
    }
    return (
      <div className="voice-player">
        <div className="card vp-card vp-done">
          <div className="eyebrow">今天这一组完成了</div>
          <h2 className="vp-title">{lesson.title}</h2>
          <p className="vp-body">不用追求完美。今天比昨天多练了一次，就是进步。</p>
          <div className="stats">
            {m.wpm != null && <div className="stat"><b>{m.wpm}</b><span>词/分钟</span><i>{diff('wpm', '')}</i></div>}
            {m.clarityPct != null && <div className="stat"><b>{m.clarityPct}%</b><span>被听清</span><i>{diff('clarityPct', '%')}</i></div>}
            {m.loudnessDb != null && <div className="stat"><b>{m.loudnessDb} dB</b><span>响度</span><i>{diff('loudnessDb', ' dB')}</i></div>}
          </div>
          {!previous && <p className="vp-hint">这是你第一次做这节课。下次再做时，这里会显示和今天的对比。</p>}
          <button className="primary" onClick={onFinish}>回到课程</button>
        </div>
      </div>
    )
  }

  return (
    <div className="voice-player">
      <div className="vp-header">
        <button className="back-btn" onClick={onExit}>← 退出</button>
        <div className="vp-lesson">{lesson.title}</div>
      </div>
      <div className="vp-progress">
        {lesson.steps.map((s, i) => <span key={i} className={i < index ? 'done' : i === index ? 'now' : ''} />)}
      </div>

      {step.type === 'learn' && <LearnStep key={index} step={step} onNext={() => next()} />}
      {step.type === 'timer' && <TimerStep key={index} step={step} onNext={() => next()} />}
      {(step.type === 'read' || step.type === 'speak') && <RecordStep key={index} step={step} onNext={next} />}
    </div>
  )
}

export default VoiceLessonPlayer
