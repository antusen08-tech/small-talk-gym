import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import './LearningScreen.css'

const LEVELS = [
  { id: '初阶', title: '先看，再开口', desc: '5 个技能 · 从判断开口讯号，到自然收尾', unlocked: true },
  { id: '中阶', title: '让对话走下去', desc: '接住关键词、追问、回应、恢复冷场', locked: true },
  { id: '高阶', title: '复杂社交场合', desc: '群体对话、工作社交、判断互动边界', locked: true }
]

export function LearningScreen({ onNavigate, user }) {
  const [levels, setLevels] = useState(LEVELS)
  const [progress, setProgress] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProgress()
  }, [user])

  async function loadProgress() {
    setLoading(true)
    
    // Load skill progress from practice_records
    const { data: records } = await supabase
      .from('practice_records')
      .select('skill_card_id, completed_at')
      .eq('user_id', user?.id)
      .not('skill_card_id', 'is', null)

    if (records) {
      // Count completed skills
      const completedSkills = new Set(records.map(r => r.skill_card_id))
      setProgress({
        completedCount: completedSkills.size,
        totalSkills: 5 // 初阶有5个技能
      })
    }

    setLoading(false)
  }

  function getSkillDescription(levelId) {
    const skills = {
      '初阶': [
        '1. 先看开口时机',
        '2. 共同情境开场',
        '3. 问一句，也给一点自己',
        '4. 抓关键词接话',
        '5. 自然收尾'
      ],
      '中阶': [
        '1. 传球式来回',
        '2. 追问细节',
        '3. 用具体细节回应',
        '4. 短小故事回应',
        '5. 冷场恢复'
      ],
      '高阶': [
        '1. 加入群体对话',
        '2. 关系切入点',
        '3. 工作社交',
        '4. 互动边界判断',
        '5. 话题深浅转换'
      ]
    }
    return skills[levelId] || []
  }

  return (
    <div className="learning-screen">
      <header className="screen-header">
        <span className="eyebrow">学习 · Coach</span>
        <h1>选一个训练等级。</h1>
        <p>每一阶都有明确技能和题目数。完成前一阶，才会解锁下一阶。</p>
      </header>

      {levels.map((level, idx) => (
        <div key={level.id} className={`level-card ${level.locked ? 'locked' : ''}`}>
          {level.unlocked ? (
            <>
              <div className="level-status">
                <span className="pill available">可以开始</span>
              </div>
              <div className="level-title">{level.title}</div>
              <p className="level-desc">{level.desc}</p>
              
              {!loading && progress.completedCount !== undefined && (
                <div className="level-progress">
                  <div className="progress-header">
                    <span>{progress.completedCount} / {progress.totalSkills} 个技能</span>
                    <span>{Math.round((progress.completedCount / progress.totalSkills) * 100)}%</span>
                  </div>
                  <div className="progress-track">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${(progress.completedCount / progress.totalSkills) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              <button 
                className="primary"
                onClick={() => onNavigate('coach', level.id)}
              >
                开始 {level.id} 训练
              </button>
            </>
          ) : (
            <>
              <div className="level-status">
                <span className="pill locked">🔒 完成初阶后解锁</span>
              </div>
              <div className="level-title">{level.title}</div>
              <p className="level-desc">{level.desc}</p>
            </>
          )}

          <details className="skills-expand">
            <summary>{level.id} 会学什么 <span>{getSkillDescription(level.id).length} 个技能</span></summary>
            <ul className="skills-list">
              {getSkillDescription(level.id).map((skill, i) => (
                <li key={i}>{skill}</li>
              ))}
            </ul>
          </details>
        </div>
      ))}
    </div>
  )
}

export default LearningScreen