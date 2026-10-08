import { supabase } from './supabase'
import { VOICE_LESSONS } from '../data/voiceLessons'

// 先读 Supabase 的 voice_lessons 表；表不存在或为空时回退到本地数据（与 Coach 卡片同样的做法）。
export async function loadVoiceLessons() {
  try {
    const { data, error } = await supabase
      .from('voice_lessons')
      .select('*')
      .order('lesson_order', { ascending: true })
    if (!error && data?.length) {
      return data.map((r) => ({
        id: r.id, order: r.lesson_order, module: r.module, title: r.title, title_zh: r.title_zh,
        minutes: r.minutes, goal: r.goal, steps: r.steps
      }))
    }
  } catch { /* 回退本地 */ }
  return VOICE_LESSONS
}
