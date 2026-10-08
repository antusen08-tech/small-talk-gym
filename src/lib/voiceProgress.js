// 本地进度（localStorage）：无需登录就能每天打卡。
// 结构：{ sessions: [{ lessonId, date: 'YYYY-MM-DD', at, metrics }] }

const KEY = 'stg_voice_progress_v1'

export function dateKey(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export function loadProgress() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '{}')
    return { sessions: Array.isArray(raw.sessions) ? raw.sessions : [] }
  } catch {
    return { sessions: [] }
  }
}

export function recordSession(lessonId, metrics) {
  const progress = loadProgress()
  progress.sessions.push({ lessonId, date: dateKey(), at: new Date().toISOString(), metrics })
  try { localStorage.setItem(KEY, JSON.stringify(progress)) } catch { /* 隐私模式下忽略 */ }
  return progress
}

export function lastSessionFor(progress, lessonId) {
  return [...progress.sessions].reverse().find((s) => s.lessonId === lessonId) || null
}

export function practicedDates(progress) {
  return new Set(progress.sessions.map((s) => s.date))
}

// 连续天数：从今天（或昨天，如果今天还没练）往回数
export function currentStreak(progress, now = new Date()) {
  const days = practicedDates(progress)
  const cursor = new Date(now)
  if (!days.has(dateKey(cursor))) cursor.setDate(cursor.getDate() - 1)
  let streak = 0
  while (days.has(dateKey(cursor))) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

// 推荐课：第一节"从没做过"的课；全部做过则回到最久没练的一节
export function recommendedLesson(lessons, progress) {
  const done = new Set(progress.sessions.map((s) => s.lessonId))
  const fresh = lessons.find((l) => !done.has(l.id))
  if (fresh) return fresh
  const lastAt = (id) => lastSessionFor(progress, id)?.at || ''
  return [...lessons].sort((a, b) => lastAt(a.id).localeCompare(lastAt(b.id)))[0]
}

// 最近 7 天（含今天）每天是否练过
export function weekStrip(progress, now = new Date()) {
  const days = practicedDates(progress)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now)
    d.setDate(d.getDate() - (6 - i))
    return { key: dateKey(d), label: ['日', '一', '二', '三', '四', '五', '六'][d.getDay()], done: days.has(dateKey(d)), today: i === 6 }
  })
}
