import React, { useState } from 'react'
import useGameStore from '../../store/gameStore'

export default function AccusationScreen() {
  const gamePhase = useGameStore((s) => s.gamePhase)
  const role = useGameStore((s) => s.role) || 'INVESTIGATOR'
  const ws = useGameStore((s) => s.ws)
  const prefilledMastermind = useGameStore((s) => s.prefilledMastermindSuspect)

  const [mastermindSuspect, setMastermindSuspect] = useState(prefilledMastermind || '')
  const [conspiratorSuspect, setConspiratorSuspect] = useState('')
  const [submitted, setSubmitted] = useState(false)

  // Pull player list from other players + self
  const otherPlayers = useGameStore((s) => s.otherPlayers)
  const playerId = useGameStore((s) => s.playerId)
  const playerName = useGameStore((s) => s.playerName)

  const allPlayers = [
    { id: String(playerId), name: playerName || 'You' },
    ...Object.entries(otherPlayers).map(([id, data]) => ({ id: String(id), name: data.username || `Agent #${id}` })),
  ]

  if (gamePhase !== 'accusation') return null

  const isDetective = role.toUpperCase() === 'DETECTIVE'
  const isInvestigator = role.toUpperCase() === 'INVESTIGATOR'
  const isVillain = ['MASTERMIND', 'CONSPIRATOR'].includes(role.toUpperCase())

  const handleSubmitDetective = () => {
    if (!mastermindSuspect || !conspiratorSuspect) return
    if (mastermindSuspect === conspiratorSuspect) return
    if (ws) {
      ws.send(JSON.stringify({
        action: 'SUBMIT_ACCUSATION',
        mastermind_accusation: mastermindSuspect,
        conspirator_accusation: conspiratorSuspect,
      }))
    }
    setSubmitted(true)
  }

  const handleSubmitInvestigator = () => {
    if (!mastermindSuspect) return
    if (ws) {
      ws.send(JSON.stringify({
        action: 'SUBMIT_ACCUSATION',
        mastermind_accusation: mastermindSuspect,
      }))
    }
    setSubmitted(true)
  }

  return (
    <div className="accusation-overlay" id="accusation-screen">
      <div className="accusation-panel">
        
        {/* ── DETECTIVE DECISION SCREEN ── */}
        {isDetective && !submitted && (
          <>
            <div className="accusation-header">
              <h2>⚖️ DECISION PHASE — DETECTIVE VERDICT</h2>
              <p className="accusation-sub">
                Select one current player as the <strong>CONSPIRATOR</strong> and one as the <strong>MASTERMIND</strong>.
              </p>
            </div>

            <div className="accusation-form">
              <div className="accusation-field">
                <label>Select MASTERMIND:</label>
                <div className="player-select-grid">
                  {allPlayers.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      className={`player-select-btn ${mastermindSuspect === p.id ? 'selected mastermind' : ''}`}
                      onClick={() => {
                        setMastermindSuspect(p.id)
                        if (conspiratorSuspect === p.id) setConspiratorSuspect('')
                      }}
                    >
                      🧠 {p.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="accusation-field">
                <label>Select CONSPIRATOR:</label>
                <div className="player-select-grid">
                  {allPlayers.filter(p => p.id !== mastermindSuspect).map(p => (
                    <button
                      key={p.id}
                      type="button"
                      className={`player-select-btn ${conspiratorSuspect === p.id ? 'selected conspirator' : ''}`}
                      onClick={() => setConspiratorSuspect(p.id)}
                    >
                      🔪 {p.name}
                    </button>
                  ))}
                </div>
              </div>

              <button
                id="submit-accusation-btn"
                type="button"
                className={`accusation-submit-btn ${(!mastermindSuspect || !conspiratorSuspect) ? 'disabled' : ''}`}
                onClick={handleSubmitDetective}
                disabled={!mastermindSuspect || !conspiratorSuspect}
              >
                ⚖️ SUBMIT DETECTIVE VERDICT
              </button>
            </div>
          </>
        )}

        {/* ── INVESTIGATOR DECISION SCREEN ── */}
        {isInvestigator && !submitted && (
          <>
            <div className="accusation-header">
              <h2>🧩 DECISION PHASE — INVESTIGATOR VOTE</h2>
              <p className="accusation-sub">
                Independently select one current player as the <strong>MASTERMIND</strong>.
              </p>
            </div>

            <div className="accusation-form">
              <div className="accusation-field">
                <label>Select MASTERMIND:</label>
                <div className="player-select-grid">
                  {allPlayers.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      className={`player-select-btn ${mastermindSuspect === p.id ? 'selected mastermind' : ''}`}
                      onClick={() => setMastermindSuspect(p.id)}
                    >
                      🧠 {p.name}
                    </button>
                  ))}
                </div>
              </div>

              <button
                id="submit-investigator-vote-btn"
                type="button"
                className={`accusation-submit-btn ${!mastermindSuspect ? 'disabled' : ''}`}
                onClick={handleSubmitInvestigator}
                disabled={!mastermindSuspect}
              >
                🗳️ CAST MASTERMIND VOTE
              </button>
            </div>
          </>
        )}

        {/* ── VILLAIN WAITING SCREEN (MASTERMIND & CONSPIRATOR) ── */}
        {isVillain && (
          <div className="accusation-header" style={{ textAlign: 'center', padding: '30px 20px' }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🔒</div>
            <h2 style={{ color: '#ef4444', fontFamily: 'Orbitron, sans-serif' }}>DECISION PHASE — VOTING DISABLED</h2>
            <div className="accusation-waiting" style={{ marginTop: '24px' }}>
              <div className="waiting-spinner" />
              <p style={{ fontSize: '1.1rem', color: '#f87171', fontFamily: "'JetBrains Mono', monospace", fontWeight: 'bold' }}>
                The Detective and Investigators are making their decisions...
              </p>
            </div>
          </div>
        )}

        {/* ── SUBMITTED WAITING STATE ── */}
        {!isVillain && submitted && (
          <div className="accusation-waiting" style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div className="waiting-spinner" />
            <h3 style={{ color: '#10b981', fontFamily: 'Orbitron, sans-serif' }}>DECISION REGISTERED</h3>
            <p style={{ color: '#94a3b8', fontFamily: "'JetBrains Mono', monospace", marginTop: '12px' }}>
              Awaiting final verdict calculations from headquarters...
            </p>
          </div>
        )}

      </div>
    </div>
  )
}
