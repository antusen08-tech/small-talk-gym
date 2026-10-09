import { useMemo, useState } from 'react'
import { VOICE_LESSONS } from '../data/voiceLessons'
import { currentStreak, loadProgress, practicedDates, recommendedLesson, weekStrip, dateKey } from '../lib/voiceProgress'
import './VoiceScreen.css'

export function VoiceScreen({ onOpenLesson }) {
  const lessons = VOICE_LESSONS
  const [progress] = useState(() => loadProgress())

  const today = recommendedLesson(lessons, progress)
  const streak = currentStreak(progress)
  const strip = weekStrip(progress)
  const doneToday = practicedDates(progress).has(dateKey())
  const doneIds = useMemo(() => new Set(progress.sessions.map((s) => s.lessonId)), [progress])
  const modules = useMemo(() => {
    const m = []
    for (const l of lessons) {
      let g = m.find((x) => x.name === l.module)
      if (!g) m.push((g = { name: l.module, items: [] }))
      g.items.push(l)
    }
    return m
  }, [lessons])

  return (
    <div className="voice-screen">
      <header className="screen-header">
        <span className="eyebrow">声音与口齿 · Voice</span>
        <h1>每天练一点，声音会变稳。</h1>
        <p>每天一节，约 5 分钟：热身、朗读、开口说，录下来听，再看一份温和的反馈。</p>
      </header>

      <div className="card voice-today">
        <div className="streak-row">
          <div className="streak"><b>{streak}</b> 天连续</div>
          <div className="week">
            {strip.map((d) => (
              <span key={d.key} className={`day ${d.done ? 'done' : ''} ${d.today ? 'today' : ''}`}>{d.label}</span>
            ))}
          </div>
        </div>
        <span className="pill available">{doneToday ? '今天已完成 · 可以再练一次' : '今日一组'}</span>
        <div className="voice-today-title">Lesson {today.order} · {today.title}</div>
        <div className="voice-today-zh">{today.title_zh} · {today.minutes} 分钟</div>
        <p>{today.goal}</p>
        <button className="primary" onClick={() => onOpenLesson(today)}>
          {doneToday ? '再练这一节' : '开始今天这一组'}
        </button>
      </div>

      {modules.map((g) => (
        <section key={g.name} className="voice-module">
          <div className="module-name">{g.name}</div>
          {g.items.map((l) => (
            <button key={l.id} className={`lesson-row ${l.id === today.id ? 'next' : ''}`} onClick={() => onOpenLesson(l)}>
              <span className="lesson-no">{l.order}</span>
              <span className="lesson-text">
                <b>{l.title}</b>
                <small>{l.title_zh}</small>
              </span>
              <span className="lesson-min">{doneIds.has(l.id) ? '✓' : `${l.minutes} min`}</span>
            </button>
          ))}
        </section>
      ))}
    </div>
  )
}

export default VoiceScreen
