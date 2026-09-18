import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import './TodayScreen.css'

export function TodayScreen({ onNavigate, user }) {
  const [stats, setStats] = useState({
    weeklyCount: 0,
    lastSkill: null,
    lastScene: null
  })
  const [todayRecommendation, setTodayRecommendation] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTodayData()
  }, [user])

  async function loadTodayData() {
    setLoading(true)
    
    // Load user stats from practice_records
    if (user) {
      const { data: records } = await supabase
        .from('practice_records')
        .select('*')
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false })
        .limit(10)

      if (records && records.length > 0) {
        const thisWeek = records.filter(r => {
          const completed = new Date(r.completed_at)
          const now = new Date()
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          return completed > weekAgo
        })

        setStats({
          weeklyCount: thisWeek.length,
          lastSkill: records[0]?.skill_card_id ? '从情境开场' : null,
          lastScene: records[0]?.scene_card_id ? '跨部门咖啡局' : null
        })
      }
    }

    // Load today's recommendation
    const { data: skills } = await supabase
      .from('skill_cards')
      .select('*')
      .eq('level', '初阶')
      .order('skill_order', { ascending: true })
      .limit(1)

    if (skills && skills.length > 0) {
      setTodayRecommendation({
        type: 'coach',
        skill: skills[0],
        title: skills[0].title || '从共同情境自然开场',
        duration: '约 30 秒'
      })
    } else {
      // Fallback recommendation if database is empty
      setTodayRecommendation({
        type: 'coach',
        skill: null,
        title: '从共同情境自然开场',
        duration: '约 30 秒'
      })
    }

    setLoading(false)
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return '早安'
    if (hour < 18) return '下午好'
    return '晚上好'
  }

  const userName = user?.email?.split('@')[0] || '朋友'

  return (
    <div className="today-screen">
      <header className="today-header">
        <div className="user-greeting">
          <span className="eyebrow">Small Talk Gym</span>
          <h1>{getGreeting()}，{userName}。</h1>
        </div>
        <div className="avatar">🌱</div>
      </header>

      <p className="today-intro">今天不用变得会聊天。只做一组。</p>

      {todayRecommendation && (
        <div className="card hero-card" onClick={() => onNavigate('coach')}>
          <span className="pill">今日训练 · 初阶</span>
          <div className="task">{todayRecommendation.title}</div>
          <div className="meta">
            <span>☕ 模拟练习</span>
            <span>·</span>
            <span>{todayRecommendation.duration}</span>
          </div>
          <button className="primary">开始这一组</button>
        </div>
      )}

      <div className="card progress-card">
        <div className="label">你的进度</div>
        {loading ? (
          <p>加载中...</p>
        ) : stats.weeklyCount === 0 ? (
          <>
            <div className="progress-count">这周还没完成任何一组</div>
            <p className="progress-note">从这一组开始就好。</p>
          </>
        ) : (
          <>
            <div className="progress-count highlight">
              这周完成了 <strong>{stats.weeklyCount}</strong> 组
            </div>
            {stats.lastSkill && (
              <p className="progress-note">
                上次练了：{stats.lastSkill}
              </p>
            )}
          </>
        )}
        <button className="secondary tiny" onClick={() => onNavigate('coachHub')}>
          查看学习等级
        </button>
      </div>
    </div>
  )
}

export default TodayScreen