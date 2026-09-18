// Supabase Edge Function for Simulator AI responses
// Deploy to: supabase/functions/simulator-chat/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { sceneCard, userMessage, conversationHistory } = await req.json()

    // Build the system prompt from scene card fields
    const systemPrompt = `你是一个社交模拟训练助手，扮演场景中的对话对象。

场景设定：
- 地点：${sceneCard.location}
- 时刻：${sceneCard.moment}
- 人物关系：${sceneCard.relationships}
- 当前对话线：${sceneCard.current_thread}
- 练习目标：${sceneCard.goal}

开口许可判断：
- 绿灯（自然互动）：${sceneCard.green_light}
- 黄灯（需谨慎）：${sceneCard.yellow_light || '无特别提示'}
- 红灯（不合时宜）：${sceneCard.red_light}
- 明显越界：${sceneCard.off_limits_notes || '无'}

你的任务：
1. 判断用户输入是否符合当前场景和对话线
2. 根据判断类型返回：
   - "natural"：符合当前话题线，自然继续角色对话
   - "needs_guidance"：有点跳题但可接，给较短真实回应+可选教练提示
   - "boundary"：明显越界或不合时宜，暂停该轮+温和说明原因

反馈语气要求：
- 不说"错了"或"失败"
- 用场景化解释（这句放在这个关系/时刻里会怎样）
- 温和、具体、尊重边界

返回 JSON 格式：
{
  "type": "natural" | "needs_guidance" | "boundary",
  "reply": "角色回复",
  "coachHint": "教练提示（可选）"
}`

    // Call Claude API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': Deno.env.get('ANTHROPIC_API_KEY'),
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [
          ...conversationHistory,
          { role: 'user', content: userMessage }
        ]
      })
    })

    const data = await response.json()
    
    // Parse Claude's response
    const aiResponse = JSON.parse(data.content[0].text)

    return new Response(
      JSON.stringify(aiResponse),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
