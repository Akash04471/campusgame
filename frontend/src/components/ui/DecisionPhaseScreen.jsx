import React, { useState, useEffect, useRef } from 'react'
import useGameStore from '../../store/gameStore'
import useDecisionPhaseAudio from '../../utils/useDecisionPhaseAudio'
import MuteToggleButton from './MuteToggleButton'


/**
 * DecisionPhaseScreen
 * 
 * Handles role-conditional rendering for the Decision Phase:
 * 1. DETECTIVE: Selects exactly ONE player as the "Conspirator" guess. Locks on submit.
 * 2. INVESTIGATOR: Independently selects ONE player as the "Mastermind" guess. Selections are private and lock on submit.
 * 3. CONSPIRATOR & MASTERMIND: Show status screen with exact message:
 *    "The Detective and Investigators are making their decisions..." (no interactive elements).
 */
export default function DecisionPhaseScreen() {
  const gamePhase = useGameStore((s) => s.gamePhase)
  const role = useGameStore((s) => s.role) || 'INVESTIGATOR'
  const ws = useGameStore((s) => s.ws)
  const playerId = useGameStore((s) => s.playerId)
  const playerName = useGameStore((s) => s.playerName)
  const otherPlayers = useGameStore((s) => s.otherPlayers)
  const decisionPhase = useGameStore((s) => s.decisionPhase)
  const setDetectiveChoice = useGameStore((s) => s.setDetectiveChoice)
  const setInvestigatorChoice = useGameStore((s) => s.setInvestigatorChoice)
  const setPlayerSubmitted = useGameStore((s) => s.setPlayerSubmitted)

  // Initialize Audio hook for Decision Phase BGM & SFX
  const { playSelectSfx, playSubmitSfx } = useDecisionPhaseAudio(gamePhase)

  // Local selection state before submitting
  const [selectedCandidate, setSelectedCandidate] = useState(null)

  // Timer countdown for decision phase (10-second duration)
  const [timerSeconds, setTimerSeconds] = useState(10)

  // Sync with server-authoritative timer updates if available
  useEffect(() => {
    if (decisionPhase?.timeRemaining !== undefined) {
      setTimerSeconds(decisionPhase.timeRemaining)
    }
  }, [decisionPhase?.timeRemaining])

  const normalizedRole = (role || '').toUpperCase()
  const isDetective = normalizedRole === 'DETECTIVE'
  const isInvestigator = normalizedRole === 'INVESTIGATOR'
  const isVillain = ['MASTERMIND', 'CONSPIRATOR'].includes(normalizedRole)

  // Filter current active/non-eliminated players
  const currentPlayers = [
    { id: String(playerId), name: playerName || 'You (Detective/Investigator)', isSelf: true },
    ...Object.entries(otherPlayers)
      .filter(([_, data]) => !data.isEliminated && !data.isDisconnected)
      .map(([id, data]) => ({
        id: String(id),
        name: data.username || `Agent #${id}`,
        isSelf: String(id) === String(playerId)
      }))
  ]

  // Prevent self-selection (only list other active players as selectable suspects)
  const selectableCandidates = currentPlayers.filter(p => !p.isSelf)

  // Track lock state based on global store or local submit
  const pidStr = String(playerId)
  const isSubmitted = isDetective
    ? decisionPhase.submitted.detective
    : isInvestigator
      ? Boolean(decisionPhase.submitted.investigators?.[pidStr])
      : false

  // Send START_DECISION_PHASE to backend to trigger bot decision scheduling
  useEffect(() => {
    if ((gamePhase === 'decision' || gamePhase === 'accusation') && ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ action: "START_DECISION_PHASE" }))
    }
  }, [gamePhase, ws])

  // Fallback timer tick
  useEffect(() => {
    if (gamePhase !== 'decision' && gamePhase !== 'accusation') return
    const interval = setInterval(() => {
      setTimerSeconds((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(interval)
  }, [gamePhase])

  // ── Solo-mode auto bot voting ──────────────────────────────────────────────
  // When there is no WebSocket (SOLO mode), wait for the 10-second timer to reach 0
  // before resolving and showing the Results Screen.
  const soloResolvedRef = useRef(false)
  useEffect(() => {
    if (gamePhase !== 'decision' && gamePhase !== 'accusation') {
      soloResolvedRef.current = false
      return
    }
    if (ws && ws.readyState === WebSocket.OPEN) return  // multiplayer — let backend handle it

    if (timerSeconds <= 0 && !soloResolvedRef.current) {
      soloResolvedRef.current = true

      const state = useGameStore.getState()
      const myRole = (state.role || 'DETECTIVE').toUpperCase()

      // Solo assignments: player=DETECTIVE, 9001=INVESTIGATOR, 9002=MASTERMIND, 9003=CONSPIRATOR
      const soloConspiratorId = '9003'
      const soloMastermindId  = '9002'

      // Bots target the true villain roles so resolution depends on the human player's choice
      const detectiveGuess   = state.decisionPhase?.detectiveChoice   || (myRole === 'DETECTIVE' ? null : soloConspiratorId)
      const investigatorGuess = state.decisionPhase?.investigatorChoices?.['9001'] || (myRole === 'INVESTIGATOR' ? null : soloMastermindId)

      const detectiveCorrect   = String(detectiveGuess) === String(soloConspiratorId)
      const investigatorCorrect = String(investigatorGuess) === String(soloMastermindId)
      const investigatorsWon   = detectiveCorrect && investigatorCorrect

      const result = {
        winner_faction: investigatorsWon ? 'INVESTIGATORS' : 'VILLAINS',
        winningRoles: investigatorsWon ? ['DETECTIVE', 'INVESTIGATOR'] : ['MASTERMIND', 'CONSPIRATOR'],
        mastermind_id: soloMastermindId,
        conspirator_id: soloConspiratorId,
        actualConspirator: { id: soloConspiratorId, name: 'Dr. Viktor (Bot)' },
        actualMastermind:  { id: soloMastermindId,  name: 'Officer Alex (Bot)' },
        detective: {
          playerId: String(state.playerId || '1'),
          guess: detectiveGuess,
          guessName: detectiveGuess ? (detectiveGuess === '9001' ? 'Agent Maya (Bot)' : detectiveGuess === '9002' ? 'Officer Alex (Bot)' : detectiveGuess === '9003' ? 'Dr. Viktor (Bot)' : 'You') : 'None',
          correct: detectiveCorrect,
        },
        investigators: {
          success: true,
          finalGuess: investigatorGuess,
          finalGuessName: investigatorGuess === '9002' ? 'Officer Alex (Bot)' : investigatorGuess === '9001' ? 'Agent Maya (Bot)' : investigatorGuess === '9003' ? 'Dr. Viktor (Bot)' : 'You',
          correct: investigatorCorrect,
          voteCounts: { [investigatorGuess]: 1 },
          failMessage: '',
        },
        detectiveCorrect,
        investigatorVoteResult: { success: true, correct: investigatorCorrect },
        player_stats: [
          { player_id: String(state.playerId || '1'), username: 'You', role: myRole, points_earned: detectiveCorrect ? 100 : 30, tasks_completed: 2, won: investigatorsWon },
          { player_id: '9001', username: 'Agent Maya (Bot)', role: 'INVESTIGATOR', points_earned: investigatorCorrect ? 80 : 20, tasks_completed: 3, won: investigatorsWon },
          { player_id: '9002', username: 'Officer Alex (Bot)', role: 'MASTERMIND', points_earned: investigatorsWon ? 0 : 90, tasks_completed: 3, won: !investigatorsWon },
          { player_id: '9003', username: 'Dr. Viktor (Bot)', role: 'CONSPIRATOR', points_earned: investigatorsWon ? 0 : 90, tasks_completed: 2, won: !investigatorsWon },
        ],
        all_roles: {
          [String(state.playerId || '1')]: myRole,
          '9001': 'INVESTIGATOR',
          '9002': 'MASTERMIND',
          '9003': 'CONSPIRATOR',
        },
        player_names: {
          [String(state.playerId || '1')]: 'You',
          '9001': 'Agent Maya (Bot)',
          '9002': 'Officer Alex (Bot)',
          '9003': 'Dr. Viktor (Bot)',
        },
      }

      state.setGameResult(result)
    }
  }, [gamePhase, timerSeconds, ws])



  if (gamePhase !== 'decision' && gamePhase !== 'accusation') return null

  const handleSelectCandidate = (candidateId) => {
    playSelectSfx()
    setSelectedCandidate(candidateId)
  }

  // Handler for Detective submission
  const handleSubmitDetective = () => {
    if (!selectedCandidate || isSubmitted) return

    playSubmitSfx()
    setDetectiveChoice(selectedCandidate)
    setPlayerSubmitted('DETECTIVE', pidStr)

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        action: 'SUBMIT_DECISION',
        role: 'DETECTIVE',
        voter_id: pidStr,
        conspirator_choice: selectedCandidate,
      }))
    }
  }

  // Handler for Investigator submission
  const handleSubmitInvestigator = () => {
    if (!selectedCandidate || isSubmitted) return

    playSubmitSfx()
    setInvestigatorChoice(pidStr, selectedCandidate)
    setPlayerSubmitted('INVESTIGATOR', pidStr)

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        action: 'SUBMIT_DECISION',
        role: 'INVESTIGATOR',
        voter_id: pidStr,
        mastermind_choice: selectedCandidate,
      }))
    }
  }

  return (
    <div className="accusation-overlay" id="decision-phase-screen">
      <div className="accusation-panel" style={{ maxWidth: '650px', width: '90%' }}>

        {/* Header section with phase badge, timer and mute toggle */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <span style={{
            background: 'rgba(239, 68, 68, 0.2)',
            color: '#ef4444',
            padding: '4px 12px',
            borderRadius: '12px',
            fontSize: '0.85rem',
            fontWeight: 'bold',
            fontFamily: 'Orbitron, sans-serif'
          }}>
            DECISION PHASE
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <MuteToggleButton />
            <span style={{ color: '#94a3b8', fontSize: '0.9rem', fontFamily: 'monospace' }}>
              ⏱️ {timerSeconds}s remaining
            </span>
          </div>
        </div>


        {/* ── 1. DETECTIVE VIEW ── */}
        {isDetective && !isSubmitted && (
          <div className="decision-role-section">
            <div className="accusation-header">
              <h2>🕵️ DETECTIVE DECISION</h2>
              <p className="accusation-sub">
                Select exactly <strong>ONE</strong> player as your <strong>Conspirator</strong> guess.
              </p>
            </div>

            <div className="accusation-form">
              <div className="accusation-field">
                <label style={{ color: '#f87171', fontWeight: 'bold' }}>Identify Conspirator:</label>
                <div className="player-select-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px', margin: '15px 0' }}>
                  {selectableCandidates.map((player) => (
                    <button
                      key={player.id}
                      type="button"
                      className={`player-select-btn ${selectedCandidate === player.id ? 'selected conspirator' : ''}`}
                      onClick={() => handleSelectCandidate(player.id)}
                      style={{
                        padding: '12px 16px',
                        borderRadius: '8px',
                        border: selectedCandidate === player.id ? '2px solid #ef4444' : '1px solid #374151',
                        background: selectedCandidate === player.id ? 'rgba(239, 68, 68, 0.25)' : '#1f2937',
                        color: '#f3f4f6',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      🔪 {player.name}
                    </button>
                  ))}
                </div>
              </div>

              <button
                id="submit-detective-decision-btn"
                type="button"
                className={`accusation-submit-btn ${!selectedCandidate ? 'disabled' : ''}`}
                onClick={handleSubmitDetective}
                disabled={!selectedCandidate}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '8px',
                  background: selectedCandidate ? 'linear-gradient(135deg, #ef4444, #b91c1c)' : '#374151',
                  color: '#ffffff',
                  fontWeight: 'bold',
                  fontSize: '1rem',
                  cursor: selectedCandidate ? 'pointer' : 'not-allowed',
                  border: 'none',
                  marginTop: '10px'
                }}
              >
                🔒 SUBMIT CONSPIRATOR GUESS
              </button>
            </div>
          </div>
        )}

        {/* ── 2. INVESTIGATOR VIEW ── */}
        {isInvestigator && !isSubmitted && (
          <div className="decision-role-section">
            <div className="accusation-header">
              <h2>🧩 INVESTIGATOR DECISION</h2>
              <p className="accusation-sub">
                Independently select <strong>ONE</strong> player as your <strong>Mastermind</strong> guess.
              </p>
            </div>

            <div className="accusation-form">
              <div className="accusation-field">
                <label style={{ color: '#60a5fa', fontWeight: 'bold' }}>Identify Mastermind:</label>
                <div className="player-select-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px', margin: '15px 0' }}>
                  {selectableCandidates.map((player) => (
                    <button
                      key={player.id}
                      type="button"
                      className={`player-select-btn ${selectedCandidate === player.id ? 'selected mastermind' : ''}`}
                      onClick={() => handleSelectCandidate(player.id)}
                      style={{
                        padding: '12px 16px',
                        borderRadius: '8px',
                        border: selectedCandidate === player.id ? '2px solid #3b82f6' : '1px solid #374151',
                        background: selectedCandidate === player.id ? 'rgba(59, 130, 246, 0.25)' : '#1f2937',
                        color: '#f3f4f6',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      🧠 {player.name}
                    </button>
                  ))}
                </div>
              </div>

              <button
                id="submit-investigator-decision-btn"
                type="button"
                className={`accusation-submit-btn ${!selectedCandidate ? 'disabled' : ''}`}
                onClick={handleSubmitInvestigator}
                disabled={!selectedCandidate}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '8px',
                  background: selectedCandidate ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)' : '#374151',
                  color: '#ffffff',
                  fontWeight: 'bold',
                  fontSize: '1rem',
                  cursor: selectedCandidate ? 'pointer' : 'not-allowed',
                  border: 'none',
                  marginTop: '10px'
                }}
              >
                🔒 SUBMIT MASTERMIND GUESS
              </button>
            </div>
          </div>
        )}

        {/* ── 3. CONSPIRATOR & MASTERMIND VIEW (VILLAIN WAITING SCREEN) ── */}
        {isVillain && (
          <div className="accusation-header" style={{ textAlign: 'center', padding: '30px 20px' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '16px' }}>🔒</div>
            <h2 style={{ color: '#ef4444', fontFamily: 'Orbitron, sans-serif' }}>DECISION PHASE</h2>
            <div className="accusation-waiting" style={{ marginTop: '24px' }}>
              <div className="waiting-spinner" style={{ margin: '0 auto 20px auto', width: '36px', height: '36px', border: '3px solid rgba(239, 68, 68, 0.3)', borderTopColor: '#ef4444', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              <p style={{ fontSize: '1.15rem', color: '#f87171', fontFamily: "'JetBrains Mono', monospace", fontWeight: 'bold' }}>
                The Detective and Investigators are making their decisions...
              </p>
              <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
                {['Agent Maya', 'Officer Alex'].map(name => (
                  <span key={name} style={{ fontSize: '0.75rem', padding: '4px 10px', borderRadius: '12px', background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', color: '#93c5fd' }}>🧩 {name} voting...</span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── 4. SUBMITTED LOCKED STATE (DETECTIVE / INVESTIGATOR) ── */}
        {!isVillain && isSubmitted && (
          <div className="accusation-waiting" style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: '3rem', marginBottom: '12px' }}>✅</div>
            <h3 style={{ color: '#10b981', fontFamily: 'Orbitron, sans-serif', fontSize: '1.4rem' }}>
              DECISION LOCKED & SUBMITTED
            </h3>
            <p style={{ color: '#94a3b8', fontFamily: "'JetBrains Mono', monospace", marginTop: '12px' }}>
              Your decision has been securely transmitted. Awaiting remaining votes...
            </p>
            <div style={{ marginTop: '20px', display: 'inline-block', padding: '8px 16px', borderRadius: '20px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34d399', fontSize: '0.85rem' }}>
              🔒 Screen Locked
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
