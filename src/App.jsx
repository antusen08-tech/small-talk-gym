import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { TodayScreen } from './screens/TodayScreen'
import { LearningScreen } from './screens/LearningScreen'
import { PracticeScreen } from './screens/PracticeScreen'
import { RecordsScreen } from './screens/RecordsScreen'
import { CoachCardPlayer } from './components/CoachCardPlayer'
import { SimulatorChatPlayer } from './components/SimulatorChatPlayer'
import './App.css'

const SCREENS = {
  today: 'today',
  coachHub: 'coachHub',
  coach: 'coach',
  simHub: 'simHub',
  simulator: 'simulator',
  records: 'records'
}

function App() {
  const [currentScreen, setCurrentScreen] = useState(SCREENS.today)
  const [user, setUser] = useState(null)
  const [selectedLevel, setSelectedLevel] = useState('初阶')
  const [selectedScene, setSelectedScene] = useState(null)
  const [showCompletion, setShowCompletion] = useState(false)
  const [completionData, setCompletionData] = useState(null)

  useEffect(() => {
    checkSession()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function checkSession() {
    const { data: { session } } = await supabase.auth.getSession()
    setUser(session?.user ?? null)
  }

  function navigate(screen, data = null) {
    if (screen === 'coach') {
      if (data) setSelectedLevel(data)
      setCurrentScreen(SCREENS.coach)
    } else if (screen === 'simulator') {
      if (data) setSelectedScene(data)
      setCurrentScreen(SCREENS.simulator)
    } else {
      setCurrentScreen(SCREENS[screen] || screen)
    }
  }

  function handleCoachComplete(cards) {
    setCompletionData({ type: 'coach', cards })
    setShowCompletion(true)
  }

  function handleSimulatorComplete(data) {
    setCompletionData({ type: 'simulator', ...data })
    setShowCompletion(true)
  }

  async function handleSavePractice() {
    if (!completionData) return

    if (!user) {
      // Allow saving without login for testing (uses anonymous record)
      const record = {
        user_id: 'test-user',
        completed_at: new Date().toISOString(),
        user_reflection_text: completionData.reflection || null,
        rating: completionData.rating || null,
        scene_card_id: completionData.type === 'simulator' ? completionData.sceneCard?.id || null : null,
        skill_card_id: completionData.type === 'coach' ? 'test-skill' : null,
        milestone_flag: false
      }

      try {
        await supabase.from('practice_records').insert([record])
      } catch {
        // Ignore DB errors in test mode
      }

      setShowCompletion(false)
      setCompletionData(null)
      setCurrentScreen(SCREENS.records)
      return
    }

    try {
      const record = {
        user_id: user.id,
        completed_at: new Date().toISOString(),
        user_reflection_text: completionData.reflection || null,
        rating: completionData.rating || null
      }

      if (completionData.type === 'coach') {
        // Mark skill cards as completed
      } else if (completionData.type === 'simulator') {
        record.scene_card_id = completionData.sceneCard?.id || null
      }

      const { error } = await supabase
        .from('practice_records')
        .insert([record])

      if (error) throw error

      setShowCompletion(false)
      setCompletionData(null)
      setCurrentScreen(SCREENS.records)
    } catch (err) {
      console.error('Failed to save practice:', err)
    }
  }

  function getNavButtonClass(screen) {
    const isActive = 
      (screen === 'today' && currentScreen === SCREENS.today) ||
      (screen === 'coachHub' && [SCREENS.coachHub, SCREENS.coach].includes(currentScreen)) ||
      (screen === 'simHub' && [SCREENS.simHub, SCREENS.simulator].includes(currentScreen)) ||
      (screen === 'records' && currentScreen === SCREENS.records)
    
    return isActive ? 'active' : ''
  }

  const defaultScene = {
    id: 'demo',
    location: '跨部门咖啡局',
    moment: '大家刚点好饮料、坐下来',
    relationships: '坐在你旁边的跨部门同事；你们刚互相介绍过',
    current_thread: '桌上的饮品、今天的安排、彼此的轻量认识',
    goal: '由你先开口，从桌上的饮品或今天的安排说起',
    green_light: '对视、微笑、主动问候',
    yellow_light: '刚好在旁边但不确定',
    red_light: '戴耳机、看手机、赶时间'
  }

  return (
    <div className="phone">
      <main className="main-content">
        {currentScreen === SCREENS.today && (
          <TodayScreen onNavigate={navigate} user={user} />
        )}

        {currentScreen === SCREENS.coachHub && (
          <LearningScreen onNavigate={navigate} user={user} />
        )}

        {currentScreen === SCREENS.coach && (
          <CoachCardPlayer
            level={selectedLevel}
            onComplete={handleCoachComplete}
            onExit={() => navigate('coachHub')}
          />
        )}

        {currentScreen === SCREENS.simHub && (
          <PracticeScreen onNavigate={navigate} user={user} />
        )}

        {currentScreen === SCREENS.simulator && (
          <SimulatorChatPlayer
            sceneCard={selectedScene || defaultScene}
            onComplete={handleSimulatorComplete}
            onExit={() => navigate('simHub')}
          />
        )}

        {currentScreen === SCREENS.records && (
          <RecordsScreen user={user} />
        )}
      </main>

      {showCompletion && completionData && (
        <div className="completion-overlay">
          <div className="completion-card card">
            <div className="eyebrow">完成一组</div>
            <h2>
              {completionData.type === 'coach' 
                ? '你已经完成了技能练习。' 
                : '你已经开口了。\n这就算完成。'}
            </h2>
            <p>不需要判断自己够不够有趣。只记录真实感觉。</p>

            <div className="rating-section">
              <label>刚才感觉如何？</label>
              <div className="rating-buttons">
                <button 
                  className={`rating-btn ${completionData.rating === 'easy' ? 'selected' : ''}`}
                  onClick={() => setCompletionData({ ...completionData, rating: 'easy' })}
                >
                  🙂<br />比想像轻松
                </button>
                <button 
                  className={`rating-btn ${completionData.rating === 'normal' ? 'selected' : ''}`}
                  onClick={() => setCompletionData({ ...completionData, rating: 'normal' })}
                >
                  😐<br />普通
                </button>
                <button 
                  className={`rating-btn ${completionData.rating === 'hard' ? 'selected' : ''}`}
                  onClick={() => setCompletionData({ ...completionData, rating: 'hard' })}
                >
                  😰<br />有点难
                </button>
              </div>
            </div>

            <textarea
              placeholder="留一句给未来的自己（可选）"
              value={completionData.reflection || ''}
              onChange={(e) => setCompletionData({ ...completionData, reflection: e.target.value })}
            />

            <div className="completion-actions">
              <button className="primary" onClick={handleSavePractice}>
                保存这一次
              </button>
              <button 
                className="secondary tiny" 
                onClick={() => {
                  setShowCompletion(false)
                  setCompletionData(null)
                  setCurrentScreen(SCREENS.today)
                }}
              >
                稍后再说
              </button>
            </div>
          </div>
        </div>
      )}

      <nav className="nav">
        <button 
          className={getNavButtonClass('today')}
          onClick={() => navigate('today')}
        >
          <svg viewBox="0 0 24 24">
            <path d="m3 10 9-7 9 7v10H3z"/>
            <path d="M9 20v-6h6v6"/>
          </svg>
          今天
        </button>
        <button 
          className={getNavButtonClass('coachHub')}
          onClick={() => navigate('coachHub')}
        >
          <svg viewBox="0 0 24 24">
            <path d="M3 5.5A2.5 2.5 0 0 1 5.5 3H10a3 3 0 0 1 3 3v15a3 3 0 0 0-3-3H5.5A2.5 2.5 0 0 0 3 20.5z"/>
            <path d="M21 5.5A2.5 2.5 0 0 0 18.5 3H14a3 3 0 0 0-1 3v15a3 3 0 0 1 3-3h2.5a2.5 2.5 0 0 1 2.5 2.5z"/>
          </svg>
          学习
        </button>
        <button 
          className={getNavButtonClass('simHub')}
          onClick={() => navigate('simHub')}
        >
          <svg viewBox="0 0 24 24">
            <path d="M20 11a4 4 0 0 1-4 4H9l-5 4v-8a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4z"/>
            <path d="M8 11h.01M12 11h.01M16 11h.01"/>
          </svg>
          练习
        </button>
        <button 
          className={getNavButtonClass('records')}
          onClick={() => navigate('records')}
        >
          <svg viewBox="0 0 24 24">
            <path d="M4 5a2 2 0 0 1 2-2h10l4 4v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/>
            <path d="M16 3v5h5M8 13h8M8 17h6"/>
          </svg>
          我的记录
        </button>
      </nav>
    </div>
  )
}

export default App