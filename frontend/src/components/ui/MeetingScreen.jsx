import React, { useEffect, useRef, useState } from 'react'
import useGameStore from '../../store/gameStore'

const PLAYER_COLORS = ['#3b82f6','#22c55e','#ec4899','#a855f7','#eab308','#8b5cf6','#f97316','#06b6d4','#ef4444','#14b8a6']

function CountdownRing({ timeRemaining, total }) {
  const r = 36
  const circumference = 2 * Math.PI * r
  const progress = Math.max(0, timeRemaining / total)
  const dashoffset = circumference * (1 - progress)
  const isUrgent = timeRemaining <= 20
  return (
    <svg viewBox="0 0 80 80" width="80" height="80">
      <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
      <circle cx="40" cy="40" r={r} fill="none"
        stroke={isUrgent ? '#ef4444' : '#f59e0b'} strokeWidth="5"
        strokeDasharray={circumference} strokeDashoffset={dashoffset}
        strokeLinecap="round" transform="rotate(-90 40 40)"
        style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s ease' }}
      />
      <text x="40" y="45" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold" fontFamily="Outfit, sans-serif">
        {timeRemaining}
      </text>
    </svg>
  )
}

export default function MeetingScreen() {
  const meetingActive = useGameStore((s) => s.meetingActive)
  const meetingTimeRemaining = useGameStore((s) => s.meetingTimeRemaining)
  const setMeetingTimeRemaining = useGameStore((s) => s.setMeetingTimeRemaining)
  const setMeetingActive = useGameStore((s) => s.setMeetingActive)
  const chatMessages = useGameStore((s) => s.chatMessages)
  const ws = useGameStore((s) => s.ws)
  const playerId = useGameStore((s) => s.playerId)
  const otherPlayers = useGameStore((s) => s.otherPlayers)
  const playerName = useGameStore((s) => s.playerName)

  const [input, setInput] = useState('')
  const [votes, setVotes] = useState({})
  const [phase, setPhase] = useState('discuss') // discuss | vote
  const inputRef = useRef(null)
  const chatRef = useRef(null)
  const timerRef = useRef(null)

  const meetingMessages = chatMessages.filter(m => m.channel === 'meeting' || m.channel === 'public')

  const allPlayers = [
    { id: String(playerId), name: playerName || 'You' },
    ...Object.entries(otherPlayers).map(([id, data]) => ({ id, name: data.username || `Player ${id}` })),
  ]

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight
  }, [meetingMessages])

  useEffect(() => {
    if (!meetingActive) return
    setPhase(meetingTimeRemaining > 30 ? 'discuss' : 'vote')
  }, [meetingActive, meetingTimeRemaining])

  if (!meetingActive) return null

  const sendMessage = () => {
    const msg = input.trim()
    if (!msg) return
    if (ws) ws.send(JSON.stringify({ action: 'CHAT_MESSAGE', channel: 'meeting', message: msg }))
    setInput('')
  }

  const handleVote = (id) => setVotes(v => ({ ...v, [id]: !v[id] }))

  return (
    <div className="meeting-overlay" id="meeting-screen">
      {/* Emergency broadcast scanlines */}
      <div className="meeting-scanlines" />

      <div className="meeting-panel-new">
        {/* Header */}
        <div className="meeting-header-new">
          <div className="meeting-alert-bar">
            <span className="meeting-alert-dot" />
            <span>EMERGENCY MEETING — ALL PLAYERS ASSEMBLED</span>
            <span className="meeting-alert-dot" />
          </div>
          <div className="meeting-header-row">
            <div>
              <h2 className="meeting-title-new">🏛️ DISCUSSION PHASE</h2>
              <p className="meeting-sub-new">Discuss who the Conspirator and Mastermind are!</p>
            </div>
            <div className="meeting-timer-new">
              <CountdownRing timeRemaining={meetingTimeRemaining} total={120} />
              <span className="meeting-phase-label">DISCUSSION</span>
            </div>
          </div>
        </div>

        <div className="meeting-body">
          {/* Player Vote Grid */}
          <div className="meeting-vote-grid">
            {allPlayers.map((p, i) => (
              <button
                key={p.id}
                className={`meeting-vote-player ${votes[p.id] ? 'meeting-vote-player--voted' : ''}`}
                onClick={() => handleVote(p.id)}
                disabled={phase === 'discuss'}
              >
                <div className="mvp-avatar" style={{ background: PLAYER_COLORS[i % PLAYER_COLORS.length] }}>
                  <span>{(p.name || 'P')[0].toUpperCase()}</span>
                </div>
                <span className="mvp-name">{p.name}</span>
                <span className="mvp-num" style={{ background: PLAYER_COLORS[i % PLAYER_COLORS.length] }}>{i + 1}</span>
                {votes[p.id] && <span className="mvp-voted-badge">✓ VOTED</span>}
              </button>
            ))}
            {/* Demo players if no real ones connected */}
            {allPlayers.length < 4 && ['Arjun', 'Meera', 'Karthik', 'Sneha', 'Vikram'].slice(0, 4 - allPlayers.length).map((name, i) => (
              <button key={`demo-${i}`}
                className={`meeting-vote-player ${votes[`demo-${i}`] ? 'meeting-vote-player--voted' : ''}`}
                onClick={() => handleVote(`demo-${i}`)} disabled={phase === 'discuss'}>
                <div className="mvp-avatar" style={{ background: PLAYER_COLORS[(i + allPlayers.length) % PLAYER_COLORS.length] }}>
                  <span>{name[0]}</span>
                </div>
                <span className="mvp-name">{name}</span>
                <span className="mvp-num" style={{ background: PLAYER_COLORS[(i + allPlayers.length) % PLAYER_COLORS.length] }}>{i + allPlayers.length + 1}</span>
              </button>
            ))}
          </div>

          {/* Chat */}
          <div className="meeting-chat-new" ref={chatRef}>
            {meetingMessages.length === 0 && (
              <div className="meeting-chat-empty-new">
                <span>📢</span>
                <p>Discussion has begun. Share your findings!</p>
              </div>
            )}
            {meetingMessages.map((msg, i) => (
              <div key={i} className={`meeting-msg ${String(msg.sender_id) === String(playerId) ? 'meeting-msg--own' : ''}`}>
                <span className="meeting-msg-sender">{msg.sender_name}</span>
                <span className="meeting-msg-text">{msg.message}</span>
                <span className="meeting-msg-time">{new Date(msg.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Input */}
        <div className="meeting-input-row-new">
          <input
            ref={inputRef} type="text" value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="Speak your mind... (Enter to send)"
            className="meeting-input-new" id="meeting-chat-input" maxLength={300}
          />
          <button className="meeting-send-new" onClick={sendMessage}>SEND</button>
        </div>

        {phase === 'vote' && (
          <p className="meeting-vote-hint">⚡ Voting is now open! Click a player to cast your vote.</p>
        )}
      </div>
    </div>
  )
}
