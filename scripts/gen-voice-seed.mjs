// 由 src/data/voiceLessons.js 生成 supabase/seed-voice-lessons.sql
// 用法：node scripts/gen-voice-seed.mjs
import { writeFileSync } from 'node:fs'
import { VOICE_LESSONS } from '../src/data/voiceLessons.js'

const q = (s) => `'${String(s).replace(/'/g, "''")}'`
const rows = VOICE_LESSONS.map((l) =>
  `(${q(l.id)}, ${l.order}, ${q(l.module)}, ${q(l.title)}, ${q(l.title_zh)}, ${l.minutes}, ${q(l.goal)}, ${q(JSON.stringify(l.steps))}::jsonb)`)

writeFileSync(new URL('../supabase/seed-voice-lessons.sql', import.meta.url),
`-- 自动生成，请勿手改。改内容请编辑 src/data/voiceLessons.js 后重新运行 scripts/gen-voice-seed.mjs
INSERT INTO voice_lessons (id, lesson_order, module, title, title_zh, minutes, goal, steps) VALUES
${rows.join(',\n')}
ON CONFLICT (id) DO UPDATE SET
  lesson_order = EXCLUDED.lesson_order, module = EXCLUDED.module, title = EXCLUDED.title,
  title_zh = EXCLUDED.title_zh, minutes = EXCLUDED.minutes, goal = EXCLUDED.goal, steps = EXCLUDED.steps;
`)
