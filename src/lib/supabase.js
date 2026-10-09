import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// 未配置 Supabase 时不要让整个应用白屏：用占位地址，请求会失败并走各处的本地回退数据。
export const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)
export const supabase = createClient(
  supabaseUrl || 'http://localhost:54321',
  supabaseAnonKey || 'not-configured'
)
