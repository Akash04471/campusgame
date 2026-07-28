import React, { useEffect, useRef } from 'react'
import useGameStore from '../../store/gameStore'
import MuteToggleButton from './MuteToggleButton'


const ROLE_ICONS = {
  DETECTIVE: '🔍',
  INVESTIGATOR: '🧩',
  MASTERMIND: '🕵️',
  CONSPIRATOR: '🔪',
}

const ROLE_COLORS = {
  DETECTIVE: '#3b82f6',
  INVESTIGATOR: '#22c55e',
  MASTERMIND: '#ef4444',
  CONSPIRATOR: '#f97316',
}

function ConfettiCanvas({ winner }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const colors = winner === 'INVESTIGATORS'
      ? ['#22c55e', '#3b82f6', '#a3e635', '#38bdf8']
      : ['#ef4444', '#f97316', '#dc2626', '#fbbf24']

    const particles = Array.from({ length: 80 }, () => ({
      x: Math.random() * canvas.width,
      y: -20,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: (Math.random() - 0.5) * 3,
      vy: Math.random() * 3 + 2,
      opacity: 1,
    }))

    let frame
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      particles.forEach(p => {
        p.x += p.vx
        p.y += p.vy
        p.opacity -= 0.004
        ctx.globalAlpha = Math.max(0, p.opacity)
        ctx.fillStyle = p.color
        ctx.beginPath()
        ctx.rect(p.x, p.y, p.size, p.size * 0.6)
        ctx.fill()
        if (p.y > canvas.height) {
          p.y = -20
          p.x = Math.random() * canvas.width
          p.opacity = 1
        }
      })
      frame = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(frame)
  }, [winner])

  return <canvas ref={canvasRef} className="confetti-canvas" />
}

export default function ResultsScreen() {
  const gameResult = useGameStore((s) => s.gameResult)
  const gamePhase = useGameStore((s) => s.gamePhase)

  if (gamePhase !== 'results' || !gameResult) return null

  const {
    winner_faction,
    correct_accusation,
    mastermind_id,
    conspirator_id,
    player_stats = [],
    all_roles = {},
    player_names = {},
    investigatorVoteResult,
    failMessage,
  } = gameResult

  const investigatorsWon = winner_faction === 'INVESTIGATORS'
  const sorted = [...player_stats].sort((a, b) => b.points_earned - a.points_earned)

  const invVoteSuccess = investigatorVoteResult?.success ?? true
  const invVoteMessage = failMessage || investigatorVoteResult?.fail_message || "The Investigators could not reach a majority decision."
  const finalGuessId = investigatorVoteResult?.final_guess
  const finalGuessName = finalGuessId ? (player_names[finalGuessId] || `Agent #${finalGuessId}`) : 'None'

  return (
    <div className="results-overlay" id="results-screen">
      <ConfettiCanvas winner={winner_faction} />

      <div className="results-panel" style={{ position: 'relative' }}>
        <div style={{ position: 'absolute', top: '15px', right: '15px', zIndex: 10 }}>
          <MuteToggleButton />
        </div>
        {/* Banner */}
        <div className={`results-banner ${investigatorsWon ? 'investigators-win' : 'villains-win'}`}>
          <span className="results-faction-icon">
            {investigatorsWon ? '🔍' : '🕵️'}
          </span>
          <div>
            <h2 className="results-title">
              {investigatorsWon ? 'INVESTIGATORS WIN!' : 'VILLAINS ESCAPE!'}
            </h2>
            <p className="results-subtitle">
              {correct_accusation
                ? 'The criminal pair was correctly identified.'
                : !invVoteSuccess
                  ? invVoteMessage
                  : investigatorsWon
                    ? 'Time ran out but evidence was overwhelming.'
                    : 'The accusation was wrong — the criminals walk free.'}
            </p>
          </div>
        </div>

        {/* ── Investigator Majority Vote Result Banner ── */}
        {investigatorVoteResult && (
          <div style={{
            margin: '16px 0',
            padding: '14px 18px',
            borderRadius: '10px',
            background: invVoteSuccess ? 'rgba(59, 130, 246, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: invVoteSuccess ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid rgba(239, 68, 68, 0.4)',
            color: '#f3f4f6'
          }}>
            {!invVoteSuccess ? (
              <div style={{ textAlign: 'center' }}>
                <h4 style={{ color: '#ef4444', margin: '0 0 6px 0', fontFamily: 'Orbitron, sans-serif', fontSize: '1.05rem' }}>
                  ⚠️ MAJORITY VOTE FAILED
                </h4>
                <p style={{ margin: 0, color: '#f87171', fontFamily: 'monospace', fontWeight: 'bold' }}>
                  "{invVoteMessage}"
                </p>
                <p style={{ margin: '6px 0 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>
                  Votes were split or tied without a strict majority. Decision automatically marked INCORRECT.
                </p>
              </div>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <h4 style={{ color: '#60a5fa', margin: '0 0 6px 0', fontFamily: 'Orbitron, sans-serif', fontSize: '1.05rem' }}>
                  🧩 INVESTIGATOR MAJORITY CONSENSUS
                </h4>
                <p style={{ margin: 0, fontSize: '0.95rem', color: '#e2e8f0' }}>
                  Majority Mastermind Guess: <strong>{finalGuessName}</strong>
                </p>
                {investigatorVoteResult.voteCounts && (
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                    Votes count: {Object.entries(investigatorVoteResult.voteCounts).map(([pid, cnt]) => `${player_names[pid] || pid}: ${cnt}`).join(', ')}
                  </p>
                )}
              </div>
            )}
          </div>
        )}


        {/* Role reveal section */}
        <div className="results-roles-section">
          <p className="results-section-label">IDENTITY REVEALED</p>
          <div className="results-roles-grid">
            {Object.entries(all_roles).map(([pid, role]) => (
              <div
                key={pid}
                className={`result-role-card ${
                  pid === mastermind_id || pid === conspirator_id ? 'villain' : 'innocent'
                }`}
                style={{ '--role-color': ROLE_COLORS[role] }}
              >
                <span className="result-role-icon">{ROLE_ICONS[role]}</span>
                <p className="result-player-name">{player_names[pid] || pid}</p>
                <p className="result-role-name">{role}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Stats table */}
        <div className="results-stats-section">
          <p className="results-section-label">FINAL STANDINGS</p>
          <table className="results-table" id="results-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Player</th>
                <th>Role</th>
                <th>Evidence</th>
                <th>Tasks</th>
                <th>Points</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((stat, i) => (
                <tr key={stat.player_id} className={stat.won ? 'winner-row' : ''}>
                  <td>{i + 1}</td>
                  <td>{stat.username}</td>
                  <td style={{ color: ROLE_COLORS[stat.role] }}>
                    {ROLE_ICONS[stat.role]} {stat.role}
                  </td>
                  <td>{stat.evidence_collected}</td>
                  <td>{stat.tasks_completed}</td>
                  <td><strong>{stat.points_earned}</strong></td>
                  <td className={stat.won ? 'stat-won' : 'stat-lost'}>
                    {stat.won ? '✓ Won' : '✗ Lost'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Actions */}
        <div className="results-actions">
          <button
            id="play-again-btn"
            className="results-btn primary"
            onClick={() => window.location.reload()}
          >
            🔄 Play Again
          </button>
          <button
            id="main-menu-btn"
            className="results-btn secondary"
            onClick={() => window.location.reload()}
          >
            🏠 Main Menu
          </button>
        </div>
      </div>
    </div>
  )
}
