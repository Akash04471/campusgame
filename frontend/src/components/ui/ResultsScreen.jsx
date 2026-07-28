import React, { useState, useEffect, useRef } from 'react'
import useGameStore from '../../store/gameStore'
import MuteToggleButton from './MuteToggleButton'

const ROLE_ICONS = {
  DETECTIVE: '🔍',
  INVESTIGATOR: '🧩',
  MASTERMIND: '🧠',
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

export default function GameResultsScreen() {
  const gameResult = useGameStore((s) => s.gameResult)
  const gamePhase = useGameStore((s) => s.gamePhase)
  const myRole = (useGameStore((s) => s.role) || 'INVESTIGATOR').toUpperCase()

  // Staggered reveal animation sequence step (0 to 4)
  const [revealStep, setRevealStep] = useState(0)

  // Expandable breakdown toggle
  const [showBreakdown, setShowBreakdown] = useState(false)

  useEffect(() => {
    if (gamePhase !== 'results' || !gameResult) return

    setRevealStep(0)
    const t1 = setTimeout(() => setRevealStep(1), 500)
    const t2 = setTimeout(() => setRevealStep(2), 1000)
    const t3 = setTimeout(() => setRevealStep(3), 1500)
    const t4 = setTimeout(() => setRevealStep(4), 2000)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
      clearTimeout(t4)
    }
  }, [gamePhase, gameResult])

  if (gamePhase !== 'results' || !gameResult) return null

  // Extract payload structure from server
  const {
    winner_faction,
    winningRoles = [],
    mastermind_id,
    conspirator_id,
    actualConspirator,
    actualMastermind,
    detective,
    investigators,
    investigatorVoteResult,
    detectiveCorrect,
    player_stats = [],
    all_roles = {},
    player_names = {},
  } = gameResult

  // Normalize actual Conspirator data
  const conspiratorName = actualConspirator?.name || (conspirator_id ? player_names[conspirator_id] || `Agent #${conspirator_id}` : 'None')
  
  // Normalize actual Mastermind data
  const mastermindName = actualMastermind?.name || (mastermind_id ? player_names[mastermind_id] || `Agent #${mastermind_id}` : 'None')

  // Normalize Detective data
  const isDetectiveCorrect = detective?.correct ?? detectiveCorrect ?? false
  const detectiveGuessName = detective?.guessName || (detective?.guess ? player_names[detective.guess] || `Agent #${detective.guess}` : 'None')

  // Normalize Investigator majority data
  const invResult = investigators || investigatorVoteResult || {}
  const isInvSuccess = invResult.success ?? true
  const isInvCorrect = invResult.correct ?? invResult.investigators_correct ?? false
  const invFinalGuessName = invResult.finalGuessName || (invResult.finalGuess || invResult.final_guess ? player_names[invResult.finalGuess || invResult.final_guess] || `Agent #${invResult.finalGuess || invResult.final_guess}` : 'None')

  // Determine overall win condition
  const investigatorsWon = winner_faction === 'INVESTIGATORS' || winningRoles.includes('INVESTIGATOR') || winningRoles.includes('DETECTIVE')
  const sortedStats = [...player_stats].sort((a, b) => b.points_earned - a.points_earned)

  // Personal Outcome Card messaging (Section 2)
  const getPersonalOutcome = () => {
    switch (myRole) {
      case 'DETECTIVE':
        return isDetectiveCorrect
          ? { text: `You correctly identified the Conspirator! ${conspiratorName} was exposed.`, success: true }
          : { text: `You failed to identify the Conspirator. ${conspiratorName} evaded capture.`, success: false }

      case 'INVESTIGATOR':
        if (isInvSuccess && isInvCorrect) {
          return { text: `The Investigators correctly identified the Mastermind! ${mastermindName} was exposed.`, success: true }
        } else if (isInvSuccess && !isInvCorrect) {
          return { text: `The Investigators identified ${invFinalGuessName}, but the true Mastermind was ${mastermindName}. The Mastermind evaded capture.`, success: false }
        } else {
          return { text: `The Investigators could not reach a majority decision. The Mastermind, ${mastermindName}, evaded capture.`, success: false }
        }

      case 'CONSPIRATOR':
        return !isDetectiveCorrect
          ? { text: `You evaded capture! The Detective failed to identify you.`, success: true }
          : { text: `You were exposed! The Detective correctly identified you as the Conspirator.`, success: false }

      case 'MASTERMIND':
        return !isInvCorrect
          ? { text: `You evaded capture! The Investigators failed to identify you.`, success: true }
          : { text: `You were exposed! The Investigators correctly identified you as the Mastermind.`, success: false }

      default:
        return investigatorsWon
          ? { text: `The Investigators correctly identified the Mastermind and Conspirator.`, success: true }
          : { text: `The Mastermind and Conspirator evaded capture.`, success: false }
    }
  }

  const personalOutcome = getPersonalOutcome()

  return (
    <div className="results-overlay" id="results-screen">
      <ConfettiCanvas winner={investigatorsWon ? 'INVESTIGATORS' : 'VILLAINS'} />

      <div className="results-panel" style={{ position: 'relative', maxWidth: '780px', width: '94%', padding: '28px' }}>
        <div style={{ position: 'absolute', top: '18px', right: '18px', zIndex: 10 }}>
          <MuteToggleButton />
        </div>

        {/* ── A. OVERALL WIN/LOSS BANNER (TOP) ── */}
        <div className={`results-banner ${investigatorsWon ? 'investigators-win' : 'villains-win'}`} style={{
          animation: 'fadeIn 0.5s ease-out'
        }}>
          <span className="results-faction-icon">
            {investigatorsWon ? '🔍' : '🕵️'}
          </span>
          <div>
            <h2 className="results-title">
              {investigatorsWon ? 'DETECTIVE & INVESTIGATORS WIN!' : 'MASTERMIND & CONSPIRATOR WIN!'}
            </h2>
            <p className="results-subtitle">
              {investigatorsWon
                ? 'The criminal syndicate was successfully identified and brought to justice.'
                : 'The Mastermind and Conspirator evaded detection and executed their scheme.'}
            </p>
          </div>
        </div>

        {/* ── B. REVEAL SECTION (CONSPIRATOR + MASTERMIND CARDS) ── */}
        <div style={{
          margin: '20px 0',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '14px'
        }}>
          {/* Conspirator Reveal Card */}
          {revealStep >= 1 && (
            <div style={{
              background: '#111827',
              padding: '16px 20px',
              borderRadius: '12px',
              borderLeft: '5px solid #f97316',
              boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
              animation: 'flipIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: '#f97316', fontWeight: 'bold', fontFamily: 'Orbitron, sans-serif' }}>
                  ACTUAL CONSPIRATOR
                </span>
                <span style={{
                  fontSize: '0.75rem',
                  padding: '3px 10px',
                  borderRadius: '12px',
                  background: isDetectiveCorrect ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                  color: isDetectiveCorrect ? '#f87171' : '#34d399',
                  fontWeight: 'bold',
                  border: isDetectiveCorrect ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(16, 185, 129, 0.4)'
                }}>
                  {isDetectiveCorrect ? 'EXPOSED 🚨' : 'EVADED 🏃'}
                </span>
              </div>
              <h3 style={{ margin: '8px 0 4px 0', fontSize: '1.25rem', color: '#f3f4f6' }}>
                🔪 {conspiratorName}
              </h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>
                Detective Verdict: {isDetectiveCorrect ? '✓ Correctly Identified' : '✗ Evaded Detection'}
              </p>
            </div>
          )}

          {/* Mastermind Reveal Card */}
          {revealStep >= 2 && (
            <div style={{
              background: '#111827',
              padding: '16px 20px',
              borderRadius: '12px',
              borderLeft: '5px solid #ef4444',
              boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
              animation: 'flipIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: '#ef4444', fontWeight: 'bold', fontFamily: 'Orbitron, sans-serif' }}>
                  ACTUAL MASTERMIND
                </span>
                <span style={{
                  fontSize: '0.75rem',
                  padding: '3px 10px',
                  borderRadius: '12px',
                  background: isInvCorrect ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                  color: isInvCorrect ? '#f87171' : '#34d399',
                  fontWeight: 'bold',
                  border: isInvCorrect ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(16, 185, 129, 0.4)'
                }}>
                  {isInvCorrect ? 'EXPOSED 🚨' : 'EVADED 🏃'}
                </span>
              </div>
              <h3 style={{ margin: '8px 0 4px 0', fontSize: '1.25rem', color: '#f3f4f6' }}>
                🧠 {mastermindName}
              </h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>
                Investigators Vote: {isInvSuccess ? (isInvCorrect ? '✓ Majority Correct' : '✗ Majority Wrong') : '⚠️ No Majority Reached'}
              </p>
            </div>
          )}
        </div>

        {/* ── C. PERSONAL OUTCOME CARD (TAILORED TO VIEWER ROLE) ── */}
        {revealStep >= 3 && (
          <div style={{
            margin: '0 0 20px 0',
            padding: '16px 20px',
            borderRadius: '12px',
            background: personalOutcome.success ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
            border: personalOutcome.success ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(239, 68, 68, 0.4)',
            textAlign: 'center',
            animation: 'fadeIn 0.5s ease-out'
          }}>
            <span style={{
              fontSize: '0.8rem',
              letterSpacing: '1px',
              color: personalOutcome.success ? '#34d399' : '#f87171',
              fontWeight: 'bold',
              fontFamily: 'Orbitron, sans-serif'
            }}>
              YOUR ROLE OUTCOME ({myRole})
            </span>
            <p style={{
              margin: '8px 0 0 0',
              fontSize: '1.1rem',
              color: '#f3f4f6',
              fontWeight: 'bold',
              fontFamily: "'JetBrains Mono', monospace"
            }}>
              "{personalOutcome.text}"
            </p>
          </div>
        )}

        {/* ── D. EXPANDABLE FULL BREAKDOWN ACCORDION ── */}
        {revealStep >= 4 && (
          <div>
            <button
              type="button"
              onClick={() => setShowBreakdown(!showBreakdown)}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                background: '#1f2937',
                border: '1px solid #374151',
                color: '#60a5fa',
                fontWeight: 'bold',
                cursor: 'pointer',
                marginBottom: '16px',
                display: 'flex',
                justify: 'space-between',
                alignItems: 'center',
                fontSize: '0.95rem'
              }}
            >
              <span>📊 Detailed Investigation Breakdown & Standings</span>
              <span>{showBreakdown ? '▲ Hide' : '▼ Expand'}</span>
            </button>

            {showBreakdown && (
              <div style={{ animation: 'fadeIn 0.3s ease-out', marginBottom: '20px' }}>
                {/* Voting breakdown stats */}
                <div style={{
                  background: '#111827',
                  padding: '14px 18px',
                  borderRadius: '8px',
                  marginBottom: '14px',
                  border: '1px solid #1f2937'
                }}>
                  <h4 style={{ color: '#e2e8f0', margin: '0 0 8px 0', fontSize: '0.95rem' }}>
                    🕵️ Detective Guess:
                  </h4>
                  <p style={{ margin: '0 0 12px 0', color: '#94a3b8', fontSize: '0.88rem' }}>
                    Selected <strong>{detectiveGuessName}</strong> as Conspirator → {isDetectiveCorrect ? '✓ Correct' : '✗ Incorrect'}
                  </p>

                  <h4 style={{ color: '#e2e8f0', margin: '0 0 8px 0', fontSize: '0.95rem' }}>
                    🧩 Investigator Majority Vote:
                  </h4>
                  <p style={{ margin: '0 0 4px 0', color: '#94a3b8', fontSize: '0.88rem' }}>
                    Status: {isInvSuccess ? `Majority pick for Mastermind: ${invFinalGuessName}` : `⚠️ ${invResult.failMessage || 'No majority reached'}`}
                  </p>
                  {invResult.voteCounts && (
                    <p style={{ margin: 0, color: '#64748b', fontSize: '0.82rem', fontFamily: 'monospace' }}>
                      Tally: {Object.entries(invResult.voteCounts).map(([pid, cnt]) => `${player_names[pid] || pid}: ${cnt} vote(s)`).join(' | ')}
                    </p>
                  )}
                </div>

                {/* All Roles Grid */}
                <div className="results-roles-section" style={{ marginBottom: '16px' }}>
                  <p className="results-section-label">PLAYER IDENTITIES</p>
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

                {/* Standings table */}
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
                      {sortedStats.map((stat, i) => (
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
              </div>
            )}
          </div>
        )}

        {/* ── E. ACTION BUTTONS ── */}
        {revealStep >= 4 && (
          <div className="results-actions" style={{ marginTop: '10px' }}>
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
        )}
      </div>
    </div>
  )
}
