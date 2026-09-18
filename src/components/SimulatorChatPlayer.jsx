import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import './SimulatorChatPlayer.css'

export function SimulatorChatPlayer({ sceneCard, onComplete, onExit }) {
  const [messages, setMessages] = useState([])
  const [userInput, setUserInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [coachHint, setCoachHint] = useState(null)
  const [turnCount, setTurnCount] = useState(0)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    if (sceneCard) {
      // Add initial scene setup message
      setMessages([{
        role: 'system',
        content: getSceneSetupMessage(sceneCard)
      }])
    }
  }, [sceneCard])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  function getSceneSetupMessage(card) {
    return `场景：${card.location}\n时刻：${card.moment}\n对方：${card.relationships}\n当前话题：${card.current_thread}\n\n这是练习，不是真的对话。对方会等你开口。`
  }

  async function handleSendMessage() {
    if (!userInput.trim() || isLoading) return

    const userMessage = userInput.trim()
    setUserInput('')
    
    // Add user message to chat
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setIsLoading(true)
    setCoachHint(null)

    try {
      // Try to call Edge Function first
      const response = await callSimulatorEdgeFunction(userMessage)
      
      if (response) {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: response.reply,
          type: response.type 
        }])
        
        if (response.coachHint) {
          setCoachHint(response.coachHint)
        }
        
        setTurnCount(prev => prev + 1)
      } else {
        throw new Error('No response')
      }
    } catch (error) {
      // Fallback: use local response logic
      console.log('Using local fallback response')
      const fallbackReply = getLocalReply(userMessage, sceneCard, messages)
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: fallbackReply.text,
        type: fallbackReply.type
      }])
      
      if (fallbackReply.hint) {
        setCoachHint(fallbackReply.hint)
      }
      
      setTurnCount(prev => prev + 1)
    }

    setIsLoading(false)
  }

  async function callSimulatorEdgeFunction(userMessage) {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseKey) return null

    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/simulator-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`
        },
        body: JSON.stringify({
          sceneCard,
          userMessage,
          conversationHistory: messages.filter(m => m.role !== 'system')
        })
      })

      if (!response.ok) return null
      return await response.json()
    } catch {
      return null
    }
  }

  function getLocalReply(userMessage, card, history) {
    const lower = userMessage.toLowerCase()
    const turn = history.filter(m => m.role === 'assistant').length
    
    // Cross-department coffee scenario (咖啡局)
    if (card.location?.includes('咖啡')) {
      if (turn === 0) {
        // First AI response after user's opening
        if (lower.includes('蛋糕') || lower.includes('cake') || lower.includes('甜点')) {
          return {
            text: '我刚才没有留意甜点耶。你平时常来这家店吗？',
            type: 'needs_guidance',
            hint: '教练小提示：你刚才从「饮品」直接跳到「甜点」。不是不能换话题；但刚开场时，先接住当前对话线会更自然。'
          }
        }
        return {
          text: '这个燕麦拿铁很多人点。你平时喝咖啡吗？',
          type: 'natural'
        }
      } else {
        // Second turn and beyond
        if (lower.includes('americano') || lower.includes('美式') || lower.includes('不喜欢甜')) {
          return {
            text: '原来你喜欢比较直接的咖啡味。那你会选冰的还是热的？',
            type: 'natural'
          }
        }
        if (lower.includes('冰') || lower.includes('热的')) {
          return {
            text: '我通常喝冰的，不过天冷的时候也会想喝热的。对了，你是做什么的？',
            type: 'natural'
          }
        }
        return {
          text: '听起来你对咖啡有自己的偏好。那你平时会选冰的还是热的？',
          type: 'natural'
        }
      }
    }

    // Generic responses for other scenarios
    const genericReplies = [
      '哦？是吗？我之前倒是没怎么想过这个问题。',
      '这样啊，那你有经常做这个吗？',
      '有意思，你怎么会开始这个的？',
      '明白了，你觉得这个难吗？'
    ]
    
    return {
      text: genericReplies[Math.floor(Math.random() * genericReplies.length)],
      type: 'natural'
    }
  }

  function handleKeyPress(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  function handleEndPractice(reason) {
    if (onComplete) {
      onComplete({
        sceneCard,
        turnCount,
        messages: messages.filter(m => m.role !== 'system'),
        reason
      })
    }
  }

  if (!sceneCard) {
    return (
      <div className="simulator-player empty">
        <p>请选择一个场景开始练习</p>
        <button className="secondary" onClick={onExit}>返回</button>
      </div>
    )
  }

  return (
    <div className="simulator-player">
      <header className="simulator-header">
        <button className="back-btn" onClick={onExit}>← 返回</button>
        <div className="scene-info">
          <span className="scene-title">{sceneCard.location}</span>
          <span className="turn-count">第 {turnCount + 1} 轮</span>
        </div>
      </header>

      <div className="scene-setup card">
        <div className="setup-item">
          <span className="setup-label">地点</span>
          <span>{sceneCard.location}</span>
        </div>
        <div className="setup-item">
          <span className="setup-label">时刻</span>
          <span>{sceneCard.moment}</span>
        </div>
        <div className="setup-item">
          <span className="setup-label">关系</span>
          <span>{sceneCard.relationships}</span>
        </div>
        <div className="setup-item">
          <span className="setup-label">话题</span>
          <span>{sceneCard.current_thread}</span>
        </div>
      </div>

      <div className="chat-container">
        <div className="messages">
          {messages.filter(m => m.role !== 'system').map((msg, idx) => (
            <div 
              key={idx} 
              className={`message ${msg.role} ${msg.type || ''}`}
            >
              <div className="bubble">
                {msg.content}
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="message assistant loading">
              <div className="bubble">
                <span className="typing-dot"></span>
                <span className="typing-dot"></span>
                <span className="typing-dot"></span>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {coachHint && (
          <div className="coach-hint">
            <span className="hint-icon">💡</span>
            <p>{coachHint}</p>
          </div>
        )}
      </div>

      <div className="input-area">
        <div className="input-wrapper">
          <textarea
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="输入你的回应..."
            rows={2}
            disabled={isLoading}
          />
          <button 
            className="send-btn"
            onClick={handleSendMessage}
            disabled={!userInput.trim() || isLoading}
          >
            发送
          </button>
        </div>

        <div className="action-buttons">
          <button 
            className="action-btn"
            onClick={() => handleEndPractice('自然收尾')}
          >
            自然收尾
          </button>
          <button 
            className="action-btn"
            onClick={() => handleEndPractice('结束练习')}
          >
            结束练习
          </button>
        </div>
      </div>
    </div>
  )
}

export default SimulatorChatPlayer