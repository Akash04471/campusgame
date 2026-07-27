import React, { useState, useRef, useEffect } from 'react'
import useGameStore from '../../store/gameStore'

const CHANNEL_CONFIG = {
  public: { label: '📢 Public', color: '#94a3b8' },
  meeting: { label: '🏛️ Meeting', color: '#f59e0b' },
  villain: { label: '🔴 Secure', color: '#ef4444' },
}

function formatTime(ts) {
  if (!ts) return ''
  const ms = ts > 100000000000 ? ts : ts * 1000
  const d = new Date(ms)
  return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`
}

export default function ChatPanel() {
  const chatMessages = useGameStore((s) => s.chatMessages)
  const chatChannel = useGameStore((s) => s.chatChannel)
  const chatOpen = useGameStore((s) => s.chatOpen)
  const role = useGameStore((s) => s.role)
  const setChatChannel = useGameStore((s) => s.setChatChannel)
  const toggleChat = useGameStore((s) => s.toggleChat)
  const addChatMessage = useGameStore((s) => s.addChatMessage)
  const ws = useGameStore((s) => s.ws)
  const playerName = useGameStore((s) => s.playerName)
  const playerId = useGameStore((s) => s.playerId)

  const [input, setInput] = useState('')
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  const isVillain = role === 'MASTERMIND' || role === 'CONSPIRATOR'
  const availableChannels = isVillain
    ? ['public', 'villain']
    : ['public']

  // Filter messages by active channel
  const visible = chatMessages.filter(m => m.channel === chatChannel)

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [visible.length])

  // T key to focus input
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 't' || e.key === 'T') {
        if (document.activeElement !== inputRef.current) {
          e.preventDefault()
          if (!chatOpen) toggleChat()
          setTimeout(() => inputRef.current?.focus(), 100)
        }
      }
      if (e.key === 'Escape') {
        inputRef.current?.blur()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [chatOpen, toggleChat])

  const sendMessage = () => {
    const msg = input.trim()
    if (!msg) return

    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify({
          action: 'CHAT_MESSAGE',
          channel: chatChannel,
          message: msg,
        }))
      } catch (err) {
        console.error('[Chat] Send failed:', err)
      }
    } else {
      // Offline / Solo mode fallback
      addChatMessage({
        channel: chatChannel,
        sender_id: String(playerId || '1'),
        sender_name: playerName || 'Agent',
        message: msg,
        timestamp: Date.now() / 1000
      })

      // Simulate reactive bot reply after 1.8s
      setTimeout(() => {
        const botPool = [
          { name: 'Agent Maya (Bot)', text: 'Noted. I\'m focusing on completing campus tasks in Library.' },
          { name: 'Officer Alex (Bot)', text: 'I checked the area nearby. Everything looks clear.' },
          { name: 'Dr. Viktor (Bot)', text: 'Agreed. Let\'s make sure we inspect all workstation logs.' }
        ]
        const pick = botPool[Math.floor(Math.random() * botPool.length)]
        addChatMessage({
          channel: chatChannel,
          sender_id: '9001',
          sender_name: pick.name,
          message: pick.text,
          timestamp: Date.now() / 1000
        })
      }, 1800)
    }

    setInput('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      sendMessage()
    }
  }

  // Unread count for closed panel
  const unreadCount = chatMessages.filter(
    m => m.channel === chatChannel && !chatOpen
  ).length

  return (
    <>
      {/* Toggle button */}
      <button
        id="chat-toggle-btn"
        className={`chat-toggle-btn ${chatOpen ? 'active' : ''}`}
        onClick={toggleChat}
        title="Chat (T)"
      >
        💬
        {unreadCount > 0 && !chatOpen && (
          <span className="chat-unread-badge">{unreadCount}</span>
        )}
      </button>

      {/* Panel */}
      {chatOpen && (
        <div className="chat-panel" id="chat-panel">
          {/* Header */}
          <div className="chat-header">
            <div className="chat-channels">
              {availableChannels.map(ch => (
                <button
                  key={ch}
                  className={`chat-channel-btn ${chatChannel === ch ? 'active' : ''}`}
                  style={{ '--ch-color': CHANNEL_CONFIG[ch].color }}
                  onClick={() => setChatChannel(ch)}
                >
                  {CHANNEL_CONFIG[ch].label}
                </button>
              ))}
            </div>
            <button className="panel-close-btn" onClick={toggleChat}>✕</button>
          </div>

          {/* Meeting channel only active during meeting */}
          {chatChannel === 'meeting' && (
            <div className="chat-channel-info">Only active during Emergency Meetings</div>
          )}

          {/* Messages */}
          <div className="chat-messages" id="chat-messages">
            {visible.length === 0 && (
              <p className="chat-empty">No messages yet. Press T to chat.</p>
            )}
            {visible.map((msg, i) => (
              <div
                key={i}
                className={`chat-message ${msg.sender_name === playerName ? 'own' : ''}`}
              >
                <div className="chat-message-header">
                  <span className="chat-sender">{msg.sender_name}</span>
                  <span className="chat-time">{formatTime(msg.timestamp)}</span>
                </div>
                <p className="chat-text">{msg.message}</p>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="chat-input-row">
            <input
              ref={inputRef}
              className="chat-input"
              id="chat-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Message (${chatChannel})...`}
              maxLength={300}
            />
            <button className="chat-send-btn" onClick={sendMessage}>↑</button>
          </div>
        </div>
      )}
    </>
  )
}
