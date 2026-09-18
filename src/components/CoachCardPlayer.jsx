import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import './CoachCardPlayer.css'

export function CoachCardPlayer({ level = '初阶', onComplete, onExit }) {
  const [cards, setCards] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedChoice, setSelectedChoice] = useState(null)
  const [showFeedback, setShowFeedback] = useState(false)
  const [userInput, setUserInput] = useState('')
  const [showTextInput, setShowTextInput] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCards()
  }, [level])

  async function loadCards() {
    setLoading(true)
    const { data, error } = await supabase
      .from('skill_cards')
      .select('*')
      .eq('level', level)
      .order('skill_order', { ascending: true })
    
    if (error) {
      console.error('Failed to load cards:', error)
      setCards(getFallbackCards(level))
    } else {
      setCards(data.length > 0 ? data : getFallbackCards(level))
    }
    setLoading(false)
  }

  const currentCard = cards[currentIndex]
  const isLastCard = currentIndex === cards.length - 1

  function handleChoiceSelect(choice) {
    if (showFeedback) return
    setSelectedChoice(choice)
    setShowFeedback(true)
  }

  function handleTextSubmit() {
    setShowFeedback(true)
  }

  function handleNext() {
    if (isLastCard) {
      if (onComplete) onComplete(cards)
    } else {
      setCurrentIndex(prev => prev + 1)
      setSelectedChoice(null)
      setShowFeedback(false)
      setUserInput('')
      setShowTextInput(false)
    }
  }

  if (loading) {
    return (
      <div className="coach-player loading">
        <div className="spinner"></div>
        <p>加载中...</p>
      </div>
    )
  }

  if (!currentCard) {
    return (
      <div className="coach-player empty">
        <p>暂无可用技能卡片</p>
        <button className="secondary" onClick={onExit}>返回</button>
      </div>
    )
  }

  const choices = currentCard.choices || []
  const hasTextInput = choices.length === 0 && currentCard.scenario_text?.includes('会怎样') || currentCard.scenario_text?.includes('写下')

  return (
    <div className="coach-player">
      <header className="coach-header">
        <button className="back-btn" onClick={onExit}>← 返回</button>
        <span className="eyebrow">{level} · 技能 {currentIndex + 1}/{cards.length}</span>
      </header>

      <div className="card skill-card">
        <h2 className="skill-title">{currentCard.title}</h2>
        <p className="skill-principle">{currentCard.principle}</p>
        
        {currentCard.illustration_url && (
          <img 
            src={currentCard.illustration_url} 
            alt={currentCard.title}
            className="skill-illustration"
          />
        )}
      </div>

      <div className="card scenario-card">
        <div className="scenario-text">
          {currentCard.scenario_text}
        </div>
        
        {hasTextInput && !showTextInput && (
          <button 
            className="text-input-toggle"
            onClick={() => setShowTextInput(true)}
          >
            写下你的回答
          </button>
        )}

        {showTextInput && (
          <div className="text-input-area">
            <textarea
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="写下你的回应..."
              rows={3}
            />
            {!showFeedback && (
              <button className="secondary" onClick={handleTextSubmit}>
                请教练看一看
              </button>
            )}
          </div>
        )}

        {!hasTextInput && choices.length > 0 && (
          <div className="choices">
            {choices.map((choice, idx) => (
              <button
                key={idx}
                className={`choice-btn ${selectedChoice === choice ? 'selected' : ''} ${
                  showFeedback && choice.isCorrect ? 'correct' : ''
                } ${showFeedback && selectedChoice === choice && !choice.isCorrect ? 'wrong' : ''}`}
                onClick={() => handleChoiceSelect(choice)}
                disabled={showFeedback}
              >
                <span className="choice-label">
                  {String.fromCharCode(65 + idx)}
                </span>
                <span className="choice-text">{choice.text}</span>
              </button>
            ))}
          </div>
        )}

        {showFeedback && (
          <div className={`feedback ${selectedChoice?.isCorrect || userInput ? 'show' : ''}`}>
            {userInput ? (
              <p>
                {userInput.length > 5 
                  ? "你已经有自己的想法了。继续练习，会越来越自然。" 
                  : "先写一句你的版本。重点是从共同情境开始。"}
              </p>
            ) : (
              <p>{selectedChoice?.feedback || ''}</p>
            )}
          </div>
        )}
      </div>

      <div className="progress-dots">
        {cards.map((_, idx) => (
          <span 
            key={idx} 
            className={`dot ${idx === currentIndex ? 'active' : ''} ${idx < currentIndex ? 'completed' : ''}`}
          />
        ))}
      </div>

      {showFeedback && (
        <button className="primary" onClick={handleNext}>
          {isLastCard ? '完成这一组' : '下一题'}
        </button>
      )}
    </div>
  )
}

function getFallbackCards(level) {
  const allCards = {
    '初阶': [
      {
        id: '1-1',
        level: '初阶',
        skill_order: 1,
        title: '先看开口时机',
        principle: '不是每个安静都需要填满；先看对方有没有空、有没有回应、有没有互动机会。',
        when_not_to_use: '对方戴耳机、低头赶事、明显封闭、短答或回避眼神时。',
        scenario_text: '你一个人在咖啡店排队，旁边的人戴耳机、看手机、没有看向你。这时哪一个做法比较合适？',
        choices: [
          { text: 'A　问他：这个看起来好喝吗？', isCorrect: false, feedback: '对方戴耳机、看手机，是明显的"红灯"信号。' },
          { text: 'B　先不打扰，专心点餐。', isCorrect: true, feedback: '对。这不是错过机会，而是看见了红灯。好的社交判断，也包括知道什么时候不必开口。' }
        ]
      },
      {
        id: '1-2',
        level: '初阶',
        skill_order: 2,
        title: '共同情境开场',
        principle: '有绿灯后，不必想聪明话题；从你们共同看见、共同经历的事开始。',
        when_not_to_use: '对方没有开口许可，或对方明显忙碌时。',
        scenario_text: '会议还有三分钟开始，刚介绍过的同事看着会议室投影。哪一句比较自然？',
        choices: [
          { text: 'A　你住哪里？', isCorrect: false, feedback: '这个问题跳过了共同情境，会让对方觉得突兀。' },
          { text: 'B　今天的议程看起来排得蛮满，你以前参加过这个会吗？', isCorrect: true, feedback: '对。你从双方都在看的议程开始，也留了一个容易回答的问题。' }
        ]
      },
      {
        id: '1-3',
        level: '初阶',
        skill_order: 3,
        title: '问一句，也给一点自己',
        principle: '只发问像审问；只讲自己像独白。给一点自己的信息，再把球传回去。',
        when_not_to_use: '不必透露私人、敏感或不舒服的信息。',
        scenario_text: '新同事问你：你平时喝咖啡吗？',
        choices: [
          { text: 'A　有。', isCorrect: false, feedback: '只回答一个字，对话就停了。' },
          { text: 'B　有，不过我常喝 Americano，不太喜欢甜的。你呢？', isCorrect: true, feedback: '对。你回答了问题、给了一个小细节，也让对方容易接话。' }
        ]
      },
      {
        id: '1-4',
        level: '初阶',
        skill_order: 4,
        title: '抓关键词接话',
        principle: '不急着换成自己的故事；先抓住对方刚说的一个词，往下接一层。',
        when_not_to_use: '对方只给��常短的答复、明显想结束时，不要连环追问。',
        scenario_text: '对方说：我周末去跑步了。',
        choices: [
          { text: 'A　！我最近工作很忙。', isCorrect: false, feedback: '突然换到自己的事，打断了对方的话题。' },
          { text: 'B　你通常跑哪里？我最近也想多走走。', isCorrect: true, feedback: '对。你接住了"跑步"，再往下问一层。' }
        ]
      },
      {
        id: '1-5',
        level: '初阶',
        skill_order: 5,
        title: '自然收尾',
        principle: '对话不是一定要聊长；知道怎样离开，会让开口变得更轻。',
        when_not_to_use: '对方短答、看回手机、身体转开、活动要开始，或话题自然结束时。',
        scenario_text: '主持人准备开始会议，对方也转向会议室。',
        choices: [
          { text: 'A　继续追问：你周末到底做了什么？', isCorrect: false, feedback: '对方已经转向会议了，勉强继续会让双方都尴尬。' },
          { text: 'B　很高兴认识你，等会儿再聊。', isCorrect: true, feedback: '对。你读到场合变化，也给了双方舒服的结束。' }
        ]
      }
    ]
  }
  return allCards[level] || []
}

export default CoachCardPlayer