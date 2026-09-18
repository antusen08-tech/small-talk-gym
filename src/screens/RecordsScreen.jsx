import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import './RecordsScreen.css'

export function RecordsScreen({ user }) {
  const [records, setRecords] = useState([])
  const [stats, setStats] = useState({
    weeklyCount: 0,
    totalScenes: 0,
    totalSkills: 0,
    milestones: []
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRecords()
  }, [user])

  async function loadRecords() {
    setLoading(true)
    
    if (user) {
      // Load all practice records
      const { data: practiceRecords } = await supabase
        .from('practice_records')
        .select(`
          *,
          scene_cards(title),
          skill_cards(title)
        `)
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false })

      if (practiceRecords) {
        setRecords(practiceRecords)

        // Calculate stats
        const now = new Date()
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        
        const thisWeek = practiceRecords.filter(r => new Date(r.completed_at) > weekAgo)
        const scenes = practiceRecords.filter(r => r.scene_card_id)
        const skills = practiceRecords.filter(r => r.skill_card_id)
        const milestones = practiceRecords.filter(r => r.milestone_flag)

        setStats({
          weeklyCount: thisWeek.length,
          totalScenes: scenes.length,
          totalSkills: skills.length,
          milestones: milestones.map(m => ({
            date: m.completed_at,
            text: m.user_reflection_text,
            title: m.scene_cards?.title || m.skill_cards?.title
          }))
        })
      }
    }

    setLoading(false)
  }

  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now - date
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    
    if (days === 0) return '今天'
    if (days === 1) return '昨天'
    if (days < 7) return `${days} 天前`
    
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
  }

  const getRatingEmoji = (rating) => {
    const emojis = { easy: '🙂', normal: '😐', hard: '😰' }
    return emojis[rating] || ''
  }

  return (
    <div className="records-screen">
      <header className="screen-header">
        <span className="eyebrow">我的记录</span>
        <h1>我的训练记录</h1>
      </header>

      <div className="stats-card card">
        <div className="stat-main">
          <span className="stat-value">{stats.weeklyCount}</span>
          <span className="stat-label">本周完成组数</span>
        </div>
        
        <div className="stat-row">
          <div className="stat-item">
            <span className="stat-number">{stats.totalSkills}</span>
            <span className="stat-text">技能练习</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{stats.totalScenes}</span>
            <span className="stat-text">场景练习</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>加载中...</p>
        </div>
      ) : records.length === 0 ? (
        <div className="empty-state card">
          <div className="empty-icon">🌱</div>
          <h3>还没有练习记录</h3>
          <p>完成一组练习后，你的记录会显示在这里。</p>
        </div>
      ) : (
        <div className="records-list">
          <h2 className="section-title">历史记录</h2>
          
          {records.map((record, idx) => (
            <div key={record.id} className="record-item card">
              <div className="record-header">
                <span className="record-title">
                  {record.scene_cards?.title || record.skill_cards?.title || '练习'}
                </span>
                <span className="record-date">{formatDate(record.completed_at)}</span>
              </div>
              
              <div className="record-meta">
                {record.rating && (
                  <span className="record-rating">{getRatingEmoji(record.rating)}</span>
                )}
                {record.milestone_flag && (
                  <span className="milestone-badge">里程碑</span>
                )}
              </div>

              {record.user_reflection_text && (
                <p className="record-note">"{record.user_reflection_text}"</p>
              )}
            </div>
          ))}
        </div>
      )}

      {stats.milestones.length > 0 && (
        <div className="milestones-section">
          <h2 className="section-title">里程碑</h2>
          {stats.milestones.map((m, idx) => (
            <div key={idx} className="milestone-card card">
              <div className="milestone-icon">🏅</div>
              <div className="milestone-content">
                <strong>{m.title}</strong>
                {m.text && <p>{m.text}</p>}
                <span className="milestone-date">{formatDate(m.date)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default RecordsScreen