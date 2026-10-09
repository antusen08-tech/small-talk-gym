// 声音分析：纯函数，不依赖浏览器 API，便于单测。
// 输入是录音期间每 FRAME_MS 毫秒采一次的 RMS 音量序列，以及语音识别得到的文字。

export const FRAME_MS = 50
const PAUSE_FRAMES = 8   // ≥400ms 的静音算一次停顿
const BRIDGE_FRAMES = 4  // <200ms 的静音视为词内/辅音间隙，不算停顿

const toDb = (rms) => 20 * Math.log10(Math.max(rms, 1e-6))

function percentile(sorted, p) {
  if (!sorted.length) return 0
  return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))]
}

const mean = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0)

export function analyseFrames(frames) {
  const empty = { spanSec: 0, voicedSec: 0, loudnessDb: null, pauses: 0, phrases: 0, trailOffRatio: 0, silent: true }
  if (!frames || frames.length < 10) return empty

  const sorted = [...frames].sort((a, b) => a - b)
  const floor = percentile(sorted, 0.1)
  const peak = percentile(sorted, 0.98)
  const threshold = Math.max(floor * 3, peak * 0.15, 0.008)
  if (peak < 0.008) return empty

  // 有声帧，并把过短的静音补成有声
  const voiced = frames.map((f) => f > threshold)
  let run = 0
  for (let i = 0; i <= voiced.length; i++) {
    if (i < voiced.length && !voiced[i]) { run++; continue }
    if (run > 0 && run < BRIDGE_FRAMES && i - run > 0 && i < voiced.length) {
      for (let j = i - run; j < i; j++) voiced[j] = true
    }
    run = 0
  }

  const first = voiced.indexOf(true)
  const last = voiced.lastIndexOf(true)
  if (first === -1) return empty

  // 按 ≥PAUSE_FRAMES 的静音切成"短语"
  const phrases = []
  let start = first
  let gap = 0
  for (let i = first; i <= last; i++) {
    if (voiced[i]) {
      if (gap >= PAUSE_FRAMES) { phrases.push([start, i - gap - 1]); start = i }
      gap = 0
    } else gap++
  }
  phrases.push([start, last])
  const pauses = phrases.length - 1

  // 每个短语：末尾 25% 的平均音量 vs 前 75%
  let weakEnds = 0
  let measured = 0
  for (const [a, b] of phrases) {
    const seg = frames.slice(a, b + 1).filter((_, k) => voiced[a + k])
    if (seg.length < 12) continue
    const cut = Math.floor(seg.length * 0.75)
    const body = mean(seg.slice(0, cut))
    const tail = mean(seg.slice(cut))
    measured++
    if (body > 0 && tail / body < 0.5) weakEnds++
  }

  const voicedFrames = frames.filter((_, i) => voiced[i])
  return {
    spanSec: ((last - first + 1) * FRAME_MS) / 1000,
    voicedSec: (voicedFrames.length * FRAME_MS) / 1000,
    loudnessDb: toDb(percentile([...voicedFrames].sort((a, b) => a - b), 0.9)),
    pauses,
    phrases: phrases.length,
    trailOffRatio: measured ? weakEnds / measured : 0,
    trailOffMeasured: measured,
    silent: false
  }
}

export function tokenize(text) {
  return (text || '')
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
}

// 目标文本与识别文本的最长公共子序列，得出"被识别到的词"比例和漏掉的词
export function matchWords(targetText, spokenText) {
  const t = tokenize(targetText)
  const s = tokenize(spokenText)
  if (!t.length) return { total: 0, matched: 0, ratio: 0, missed: [] }
  const dp = Array.from({ length: t.length + 1 }, () => new Array(s.length + 1).fill(0))
  for (let i = 1; i <= t.length; i++) {
    for (let j = 1; j <= s.length; j++) {
      dp[i][j] = t[i - 1] === s[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1])
    }
  }
  const hit = new Set()
  for (let i = t.length, j = s.length; i > 0 && j > 0;) {
    if (t[i - 1] === s[j - 1]) { hit.add(i - 1); i--; j-- }
    else if (dp[i - 1][j] >= dp[i][j - 1]) i--
    else j--
  }
  const missed = t.filter((_, i) => !hit.has(i))
  return { total: t.length, matched: hit.size, ratio: hit.size / t.length, missed: [...new Set(missed)] }
}

export function wordsPerMinute(transcript, spanSec) {
  const words = tokenize(transcript).length
  if (words < 4 || spanSec < 2) return null
  return Math.round((words / spanSec) * 60)
}

// 生成场景化的观察与建议（不打"对/错"分）。
// 每条：{ key, tone: 'good' | 'note', title, text }
export function buildFeedback({ analysis, transcript, hasTranscript, srAvailable = hasTranscript, targetText, target = {}, durationSec }) {
  const notes = []

  if (analysis.silent) {
    return {
      notes: [{ key: 'silent', tone: 'note', title: '几乎没录到声音',
        text: '麦克风没有收到足够的声音。检查一下是否选对了麦克风、离嘴巴是否太远，然后再试一次。' }],
      metrics: { wpm: null, clarityPct: null, loudnessDb: null, durationSec }
    }
  }

  const wpm = hasTranscript ? wordsPerMinute(transcript, analysis.spanSec) : null
  const clarity = hasTranscript && targetText ? matchWords(targetText, transcript) : null
  const clarityPct = clarity && clarity.total ? Math.round(clarity.ratio * 100) : null

  if (wpm != null && target.wpm) {
    const [lo, hi] = target.wpm
    if (wpm > hi) notes.push({ key: 'pace', tone: 'note', title: `语速偏快 · ${wpm} 词/分`,
      text: `舒适区间大约是 ${lo}–${hi}。快的时候，听的人来不及消化。试试在每个句号处多停半拍，并把句尾的音收完整。` })
    else if (wpm < lo) notes.push({ key: 'pace', tone: 'note', title: `语速偏慢 · ${wpm} 词/分`,
      text: `如果是为了发音清楚刻意放慢，这很好。想更自然，可以把短句连成一口气，只在意群处停顿。` })
    else notes.push({ key: 'pace', tone: 'good', title: `语速刚好 · ${wpm} 词/分`,
      text: `落在 ${lo}–${hi} 的舒适区间。注意一下这个速度的感觉，下次尽量复制它。` })
  } else if (wpm != null) {
    notes.push({ key: 'pace', tone: 'good', title: `语速 · ${wpm} 词/分`, text: '作为参考，大多数人听着舒服的范围约 110–150。' })
  }

  if (clarityPct != null) {
    const missed = clarity.missed.slice(0, 6).join('、')
    if (clarityPct >= 85) notes.push({ key: 'clarity', tone: 'good', title: `听得很清楚 · 识别到 ${clarityPct}%`,
      text: '语音识别几乎跟上了你的每个词，说明吐字和词尾基本是完整的。' })
    else if (clarityPct >= 60) notes.push({ key: 'clarity', tone: 'note', title: `有些词被含糊带过 · 识别到 ${clarityPct}%`,
      text: `系统没抓到：${missed}。这些词常常是词尾被吞掉或嘴没张开。再读一遍，把它们的最后一个音咬清楚。（口音和环境噪音也会影响识别，仅作参考。）` })
    else notes.push({ key: 'clarity', tone: 'note', title: `可以先放慢一半 · 识别到 ${clarityPct}%`,
      text: `漏掉较多：${missed}。别急着加速，先慢慢读、把嘴张大，等清楚了再提速。` })
  }

  if (analysis.loudnessDb != null) {
    const db = analysis.loudnessDb
    if (db < -38) notes.push({ key: 'volume', tone: 'note', title: '音量偏轻',
      text: '声音有点飘。把气息吸深一点，想象对面站着一个 5 米外的人，用气送出声音，而不是靠挤喉咙。' })
    else if (db > -8) notes.push({ key: 'volume', tone: 'note', title: '音量很大，接近破音',
      text: '离麦克风远一点，或把力量从喉咙放回腹部。响亮不等于用力。' })
    else notes.push({ key: 'volume', tone: 'good', title: '音量够用',
      text: '音量充足而不过载。这是一个可复制的基准。' })
  }

  if (analysis.trailOffMeasured >= 1) {
    if (analysis.trailOffRatio >= 0.5) notes.push({ key: 'trail', tone: 'note', title: '句尾声音变弱',
      text: '有一半以上的短语在结尾处明显变轻，这是"越说越没底气"的典型信号。下一遍：把最后一个词说到底，再安静停下，而不是让它淡出去。' })
    else notes.push({ key: 'trail', tone: 'good', title: '句尾保持住了',
      text: '短语结尾的音量没有明显掉下去，听起来更笃定。' })
  }

  if (target.pauses) {
    if (analysis.pauses >= target.pauses) notes.push({ key: 'pause', tone: 'good', title: `停顿 ${analysis.pauses} 次`,
      text: '你给了想法落地的空间。停顿不是失误，是节奏的一部分。' })
    else notes.push({ key: 'pause', tone: 'note', title: `停顿只有 ${analysis.pauses} 次`,
      text: `这段练习希望至少 ${target.pauses} 次约半拍的停顿。在每个 / 或句号处闭上嘴、默数"一"，再继续。` })
  }

  if (target.minSeconds && durationSec < target.minSeconds) {
    notes.push({ key: 'length', tone: 'note', title: `只说了 ${Math.round(durationSec)} 秒`,
      text: `多给自己几秒，试着说到 ${target.minSeconds} 秒以上。多说一点，比说得完美更能练出稳定感。` })
  }

  if (!hasTranscript) {
    notes.push(srAvailable
      ? { key: 'nosr', tone: 'note', title: '这次没有识别出文字',
          text: '可能是声音太轻、网络不稳，或语音识别服务暂时不可用，所以这次只分析了音量、句尾和停顿。靠近一点、说清楚一点再录一次试试。' }
      : { key: 'nosr', tone: 'note', title: '这个浏览器无法做语音转文字',
          text: '目前只分析了音量、句尾和停顿。使用 Chrome 或 Edge，可以额外得到语速和清晰度反馈。' })
  }

  return {
    notes,
    metrics: { wpm, clarityPct, loudnessDb: analysis.loudnessDb != null ? Math.round(analysis.loudnessDb) : null, durationSec: Math.round(durationSec) }
  }
}
