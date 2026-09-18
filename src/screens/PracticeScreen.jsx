import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import './PracticeScreen.css'

const DEFAULT_THEMES = [
  { category: '工作场合', title: '跨部门咖啡局', scenes: 5, icon: '☕', desc: '和不熟同事开场' },
  { category: '工作场合', title: '会议开始前', scenes: 3, icon: '🏢', desc: '和不熟同事寒暄' },
  { category: '日常生活', title: '餐厅等位', scenes: 4, icon: '🍽', desc: '和同行陌生人开场' },
  { category: '日常生活', title: '电梯', scenes: 3, icon: '↕', desc: '短暂寒暄' },
  { category: '社交聚会', title: '朋友聚会', scenes: 4, icon: '🎉', desc: '认识朋友的朋友' },
  { category: '社交聚会', title: '熟人偶遇', scenes: 3, icon: '👋', desc: '自然重新开场' }
]

export function PracticeScreen({ onNavigate, user }) {
  const [themes, setThemes] = useState(DEFAULT_THEMES)
  const [expandedCategory, setExpandedCategory] = useState('工作场合')
  const [unlocked, setUnlocked] = useState(false)
  const [sceneCounts, setSceneCounts] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [user])

  async function loadData() {
    setLoading(true)
    
    // Check if user has completed Coach初阶 (at least 1 practice record)
    if (user) {
      const { data: records } = await supabase
        .from('practice_records')
        .select('id')
        .eq('user_id', user.id)
        .not('skill_card_id', 'is', null)
        .limit(1)

      setUnlocked(records && records.length > 0)

      // Load scene completion counts
      const { data: sceneRecords } = await supabase
        .from('practice_records')
        .select('scene_card_id')
        .eq('user_id', user.id)
        .not('scene_card_id', 'is', null)

      if (sceneRecords) {
        const counts = {}
        sceneRecords.forEach(r => {
          counts[r.scene_card_id] = (counts[r.scene_card_id] || 0) + 1
        })
        setSceneCounts(counts)
      }
    } else {
      // Not logged in - show locked state
      setUnlocked(false)
    }

    // Load themes from database
    const { data: dbThemes } = await supabase
      .from('scenario_themes')
      .select('*, scene_cards(*)')
      .order('display_order', { ascending: true })

    if (dbThemes && dbThemes.length > 0) {
      const formatted = dbThemes.map(t => ({
        category: t.category,
        title: t.title,
        scenes: t.scene_cards?.length || 0,
        icon: getIconForTheme(t.title),
        desc: t.description
      }))
      setThemes(formatted)
    }

    setLoading(false)
  }

  function getIconForTheme(title) {
    const icons = {
      '跨部门咖啡局': '☕',
      '会议开始前': '🏢',
      '餐厅等位': '🍽',
      '电梯': '↕',
      '朋友聚会': '🎉',
      '熟人偶遇': '👋',
      '公园/健身房': '🌳',
      '朋友带来的新朋友': '🐕'
    }
    return icons[title] || '💬'
  }

  const groupedThemes = themes.reduce((acc, theme) => {
    if (!acc[theme.category]) acc[theme.category] = []
    acc[theme.category].push(theme)
    return acc
  }, {})

  const categoryOrder = ['日常生活', '工作场合', '社交聚会', '专业表达']

  return (
    <div className="practice-screen">
      <header className="screen-header">
        <span className="eyebrow">练习 · Simulator</span>
        <h1>选一个你想练的场景。</h1>
        <p>这里不再翻题，而是练一段完整、连续的对话。</p>
      </header>

      {!unlocked && (
        <div className="card locked-notice">
          <div className="lock-icon">🔒</div>
          <div className="lock-text">
            <strong>先完成初阶第一组</strong>
            <p>先学会一个开场技能，再把它放进真实场景，会更有安全感。</p>
          </div>
        </div>
      )}

      {categoryOrder.map(category => {
        const categoryThemes = groupedThemes[category]
        if (!categoryThemes) return null

        return (
          <details 
            key={category} 
            className="theme-group"
            open={expandedCategory === category}
            onToggle={(e) => setExpandedCategory(category)}
          >
            <summary>
              <span className="category-title">{category}</span>
              <span className="category-count">{categoryThemes.length} 个场景</span>
            </summary>
            
            <div className="theme-grid">
              {categoryThemes.map((theme, idx) => {
                const isUnlocked = unlocked || category === '日常生活'
                const sceneKey = `${theme.title}-${idx}`
                const completedCount = sceneCounts[sceneKey] || 0

                return (
                  <button
                    key={idx}
                    className={`theme-card ${!isUnlocked ? 'disabled' : ''}`}
                    onClick={() => isUnlocked && onNavigate('simulator', theme)}
                    disabled={!isUnlocked}
                  >
                    <div className="theme-icon">{theme.icon}</div>
                    <div className="theme-info">
                      <strong>{theme.title}</strong>
                      <span>{theme.desc}</span>
                    </div>
                    {completedCount > 0 && (
                      <div className="scene-count">
                        <span className="count-number">{completedCount}</span>
                        <span className="count-label">已完成</span>
                      </div>
                    )}
                    {completedCount === 0 && isUnlocked && (
                      <div className="scene-count new">
                        <span>新</span>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </details>
        )
      })}
    </div>
  )
}

export default PracticeScreen