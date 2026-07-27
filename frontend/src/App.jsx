import React, { useState, useEffect, useCallback } from 'react'
import GameScene from './components/game/GameScene'
import RoleRevealScreen from './components/ui/RoleRevealScreen'
import HomeScreen, { getBackendHost, getWsProtocol } from './components/ui/HomeScreen'
import SplashScreen from './components/ui/SplashScreen'
import StoryCinematic from './components/ui/StoryCinematic'
import useGameStore from './store/gameStore'
import { SCREENS } from './store/gameStore'

/* ──────────────────── Loading Screen ──────────────────── */
function LoadingScreen({ onFinish }) {
  const [statusIndex, setStatusIndex] = useState(0)
  const [progress, setProgress] = useState(0)

  const statuses = [
    'Establishing Secure Connection...',
    'Decrypting Campus Blueprints...',
    'Loading CHRIST University Database...',
    'Connecting to Security Office...',
    'Downloading Surveillance Feeds...',
    'System Ready. Entering Campus...',
  ]

  useEffect(() => {
    let si = 0
    const progressInterval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(progressInterval)
          setTimeout(() => onFinish(), 400)
          return 100
        }
        return p + 1.5
      })
    }, 60)

    const statusInterval = setInterval(() => {
      si++
      if (si < statuses.length) setStatusIndex(si)
    }, 600)

    return () => { clearInterval(progressInterval); clearInterval(statusInterval) }
  }, [onFinish])

  return (
    <div className="loading-screen" id="loading-screen">
      {/* Scanline overlay */}
      <div className="loading-scanlines" />

      {/* Background grid */}
      <div className="loading-grid" />

      <div className="loading-content">
        {/* Logo area */}
        <div className="loading-logo">
          <div className="loading-crest">
            <div className="crest-ring crest-ring--outer" />
            <div className="crest-ring crest-ring--inner" />
            <span className="crest-symbol">✝</span>
          </div>
          <div className="loading-title-group">
            <h1 className="loading-title">CAMPUS GAME</h1>
            <p className="loading-subtitle">THE CHRIST MYSTERY</p>
          </div>
        </div>

        {/* Status */}
        <div className="loading-status-area">
          <p className="loading-status-text" id="loading-status">
            <span className="status-cursor">▶</span> {statuses[statusIndex]}
          </p>
        </div>

        {/* Progress bar */}
        <div className="loading-bar-track">
          <div className="loading-bar-fill" style={{ width: `${progress}%` }} />
          <div className="loading-bar-glow" style={{ left: `${progress}%` }} />
        </div>
        <p className="loading-percent">{Math.floor(progress)}%</p>

        <div className="loading-footer">Christ University, Bengaluru · Campus Game v2.0</div>
      </div>
    </div>
  )
}

/* ──────────────────── WebSocket Handler ──────────────────── */
function useGameWebSocket(roomCode, playerId) {
  const setWs = useGameStore((s) => s.setWs)
  const setRole = useGameStore((s) => s.setRole)
  const setPartnerInfo = useGameStore((s) => s.setPartnerInfo)
  const setTimerSeconds = useGameStore((s) => s.setTimerSeconds)
  const setNpcs = useGameStore((s) => s.setNpcs)
  const setTasks = useGameStore((s) => s.setTasks)
  const setAbilities = useGameStore((s) => s.setAbilities)
  const setWorldEvidence = useGameStore((s) => s.setWorldEvidence)
  const addWorldEvidence = useGameStore((s) => s.addWorldEvidence)
  const removeWorldEvidence = useGameStore((s) => s.removeWorldEvidence)
  const setEvidenceBoard = useGameStore((s) => s.setEvidenceBoard)
  const updateTask = useGameStore((s) => s.updateTask)
  const updateAbility = useGameStore((s) => s.updateAbility)
  const showNpcDialog = useGameStore((s) => s.showNpcDialog)
  const addChatMessage = useGameStore((s) => s.addChatMessage)
  const incrementEvidenceCollected = useGameStore((s) => s.incrementEvidenceCollected)
  const setMeetingActive = useGameStore((s) => s.setMeetingActive)
  const setMeetingTimeRemaining = useGameStore((s) => s.setMeetingTimeRemaining)
  const setGameResult = useGameStore((s) => s.setGameResult)
  const updateOtherPlayer = useGameStore((s) => s.updateOtherPlayer)
  const removeOtherPlayer = useGameStore((s) => s.removeOtherPlayer)
  const setGamePhase = useGameStore((s) => s.setGamePhase)
  const addCorrelation = useGameStore((s) => s.addCorrelation)
  const setCctvReport = useGameStore((s) => s.setCctvReport)
  const pushEvidenceCard = useGameStore((s) => s.pushEvidenceCard)
  const setSuspectDossier = useGameStore((s) => s.setSuspectDossier)
  const setMovementTraceReport = useGameStore((s) => s.setMovementTraceReport)
  const setGlobalTaskPercent = useGameStore((s) => s.setGlobalTaskPercent)
  const token = useGameStore((s) => s.authToken)

  useEffect(() => {
    if (!roomCode || !playerId) return
    const protocol = getWsProtocol()
    const host = getBackendHost()
    const wsUrl = `${protocol}://${host}/ws/game/${roomCode}/${playerId}?token=${encodeURIComponent(token || '')}`
    let ws
    try { ws = new WebSocket(wsUrl) } catch (e) { console.warn('[WS] Could not connect:', e); return }
    setWs(ws)
    ws.onopen = () => console.log('[WS] Connected:', roomCode)
    ws.onmessage = (event) => {
      try {
        const { type, payload } = JSON.parse(event.data)
        switch (type) {
          case 'ROLE_REVEAL':
            setRole(payload.role)
            setTimerSeconds(Math.min(payload.timer_seconds || 600, 600))  // cap at 10 min
            if (payload.partner_id) {
              setPartnerInfo({ partner_id: payload.partner_id, partner_name: payload.partner_name, partner_role: payload.partner_role })
            } else {
              setPartnerInfo(null)
            }
            setGamePhase('role_reveal')
            break
          case 'GAME_STARTED': setNpcs(payload.npcs || []); break
          case 'GAME_STATE':
            setTasks(payload.tasks || [])
            setAbilities(payload.abilities || [])
            setWorldEvidence(payload.evidence || [])
            if (payload.role) setRole(payload.role)
            if (typeof payload.time_remaining === 'number') setTimerSeconds(Math.min(payload.time_remaining, 600))
            if (payload.game_phase) {
              const currentPhase = useGameStore.getState().gamePhase
              if (currentPhase !== 'role_reveal' || ['meeting', 'accusation', 'results'].includes(payload.game_phase)) {
                setGamePhase(payload.game_phase)
              }
            }
            if (typeof payload.meeting_active === 'boolean') setMeetingActive(payload.meeting_active)
            if (typeof payload.meeting_time_remaining === 'number') setMeetingTimeRemaining(payload.meeting_time_remaining)
            if (payload.all_players) {
              Object.entries(payload.all_players).forEach(([opId, opData]) => {
                if (String(opId) !== String(playerId)) {
                  updateOtherPlayer(opId, opData)
                }
              })
            }
            if (payload.other_players) {
              Object.entries(payload.other_players).forEach(([opId, opData]) => {
                if (String(opId) !== String(playerId)) {
                  updateOtherPlayer(opId, opData)
                }
              })
            }
            break
          case 'MATCH_TIMER_UPDATE':
            if (typeof payload.time_remaining === 'number') setTimerSeconds(Math.min(payload.time_remaining, 600))
            break
          case 'MEETING_TIMER_UPDATE':
            if (typeof payload.time_remaining === 'number') setMeetingTimeRemaining(payload.time_remaining)
            break
          case 'EVIDENCE_COLLECTED':
            if (payload.evidence) {
              removeWorldEvidence(payload.evidence.evidence_id)
              if (String(payload.collector_id) === String(playerId)) incrementEvidenceCollected()
            }
            break
          case 'EVIDENCE_CARD':
            pushEvidenceCard(payload)
            break
          case 'EVIDENCE_APPEARED':
            if (payload.evidence) addWorldEvidence(payload.evidence)
            break
          case 'EVIDENCE_DESTROYED':
            removeWorldEvidence(payload.evidence_id)
            break
          case 'EVIDENCE_BOARD_UPDATE':
            setEvidenceBoard(payload.board || [])
            break
          case 'SUSPECT_DOSSIER_UPDATE':
            setSuspectDossier(payload.suspects || [])
            break
          case 'MOVEMENT_TRACE_REPORT':
            setMovementTraceReport(payload)
            break
          case 'TASK_UPDATED': updateTask(payload); break
          case 'NPC_STATEMENT': showNpcDialog({ npc_name: payload.npc_name, statement: payload.statement }); break
          case 'CHAT_MESSAGE': addChatMessage(payload); break
          case 'MEETING_STARTED':
            setMeetingActive(true)
            setMeetingTimeRemaining(payload.time_remaining || 90)
            setGamePhase('meeting')
            break
          case 'MEETING_ENDED':
            setMeetingActive(false)
            setGamePhase('exploration')
            break
          case 'ABILITY_RESULT': if (payload.ability_id) updateAbility(payload); break
          case 'CCTV_REPORT': setCctvReport(payload); break
          case 'CORRELATION_RESULT': addCorrelation(payload.evidence_id_a, payload.evidence_id_b, payload); break
          case 'NPC_POSITIONS': setNpcs(payload.npcs || []); break
          case 'TASK_COMPLETED': updateTask(payload.task); break
          case 'GLOBAL_TASK_PROGRESS': if (payload) setGlobalTaskPercent(payload); break
          case 'ACCUSATION_PHASE': setGamePhase('accusation'); break
          case 'PLAYER_MOVED': if (String(payload.player_id) !== String(playerId)) updateOtherPlayer(payload.player_id, { position: payload.position, rotation: payload.rotation }); break
          case 'PLAYER_DISCONNECTED': removeOtherPlayer(payload.player_id); break

          case 'GAME_OVER': setGameResult(payload); break
          default: break
        }
      } catch (e) { console.error('[WS] Parse error:', e) }
    }
    ws.onerror = () => console.warn('[WS] Connection error — running offline.')
    ws.onclose = (e) => console.log('[WS] Closed:', e.code)
    return () => { if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) ws.close() }
  }, [roomCode, playerId, token])
}

/* ──────────────────── App Root ──────────────────── */
export default function App() {
  // ── Local screen machine: LOADING → SPLASH → CINEMATIC → GAME
  // This mirrors the SCREENS enum in gameStore but lives locally to avoid
  // re-rendering the entire tree on every store update.
  const [screen, setScreen] = useState('loading')  // loading | splash | cinematic | game

  const gamePhase        = useGameStore((s) => s.gamePhase)
  const setGamePhase     = useGameStore((s) => s.setGamePhase)
  const setRole          = useGameStore((s) => s.setRole)
  const setAbilities     = useGameStore((s) => s.setAbilities)
  const setTasks         = useGameStore((s) => s.setTasks)
  const setWorldEvidence = useGameStore((s) => s.setWorldEvidence)
  const setNpcs          = useGameStore((s) => s.setNpcs)
  const roomCode         = useGameStore((s) => s.roomCode)
  const playerId         = useGameStore((s) => s.playerId)
  const setCurrentScreen     = useGameStore((s) => s.setCurrentScreen)
  const setHasSeenCinematic  = useGameStore((s) => s.setHasSeenCinematic)

  useGameWebSocket(screen === 'game' && roomCode ? roomCode : null, playerId)

  /* LOADING → SPLASH */
  const handleLoadingFinish = useCallback(() => {
    setScreen('splash')
    setCurrentScreen(SCREENS.SPLASH)
  }, [setCurrentScreen])

  /* SPLASH → STORY CINEMATIC */
  const handleUnleash = useCallback(() => {
    setScreen('story_cinematic')
    setCurrentScreen(SCREENS.STORY_CINEMATIC)
  }, [setCurrentScreen])

  /* STORY CINEMATIC → CINEMATIC LANDING (HomeScreen) */
  const handleCinematicComplete = useCallback(() => {
    setHasSeenCinematic(true)
    setScreen('cinematic')
    setCurrentScreen(SCREENS.CINEMATIC)
  }, [setCurrentScreen, setHasSeenCinematic])

  /* CINEMATIC (HomeScreen lobby flow) → GAME */
  const handlePlay = useCallback(() => {
    setScreen('game')
    setCurrentScreen(SCREENS.GAMEPLAY)
    if (!roomCode) {
      // Offline / solo mode — seed demo state and show Role Reveal Screen
      setGamePhase('role_reveal')
      setRole('DETECTIVE')
      setAbilities([
        { ability_id: 'CCTV_ANALYSIS',    name: 'CCTV Analysis',              description: 'Review surveillance from Security Office',       location_required: 'Security Office', duration_seconds: 90, cooldown_remaining: 0, is_on_cooldown: false, uses_remaining: 99, max_uses: 99 },
        { ability_id: 'DIGITAL_ANALYSIS', name: 'Digital Evidence Analysis',  description: 'Recover server access logs from Computer Lab',   location_required: 'Computer Lab',    duration_seconds: 60, cooldown_remaining: 0, is_on_cooldown: false, uses_remaining: 99, max_uses: 99 },
        { ability_id: 'RECOVER_LOGS',     name: 'Recover Logs',               description: 'Recover deleted file metadata from Research Center', location_required: 'Research Center', duration_seconds: 45, cooldown_remaining: 0, is_on_cooldown: false, uses_remaining: 99, max_uses: 99 },
        { ability_id: 'CORRELATE_EVIDENCE',name:'Correlate Evidence',          description: 'Link two pieces of evidence on the Evidence Board', location_required: null,           duration_seconds: 0,  cooldown_remaining: 0, is_on_cooldown: false, uses_remaining: 10, max_uses: 10 },
      ])
      setTasks([
        { task_id: 'task_1', name: 'Repair Server Network',     location: 'Computer Lab',    task_type: 'REPAIR_NETWORK',  progress: 0, completed: false, points: 20 },
        { task_id: 'task_2', name: 'Archive Department Records',location: 'MCA Department',  task_type: 'ARCHIVE_FILES',   progress: 0, completed: false, points: 15 },
        { task_id: 'task_3', name: 'Check Security Cameras',    location: 'Security Office', task_type: 'CHECK_CCTV',      progress: 0, completed: false, points: 10 },
      ])
      setWorldEvidence([
        { evidence_id: 'ev_0', evidence_type: 'PHYSICAL',    area_found: 'Junior College', position: { x: 0, y: 0.9, z: -32 }, description: 'Discarded keycard fragment found near entrance.', points_to_player_id: '9001', reliability_score: 0.85 },
        { evidence_id: 'ev_1', evidence_type: 'DIGITAL',     area_found: 'Computer Lab', description: 'Log file showing unauthorized access at 22:47', points_to_player_id: '9002', reliability_score: 0.90 },
        { evidence_id: 'ev_2', evidence_type: 'PHYSICAL',    area_found: 'Library',      description: 'A dropped notebook with research schematics', points_to_player_id: '9001', reliability_score: 0.75 },
        { evidence_id: 'ev_3', evidence_type: 'TESTIMONIAL', area_found: 'Cafeteria',    description: 'Student saw someone near the department at 10 PM', points_to_player_id: '9003', reliability_score: 0.80 },
      ])

      setNpcs([
        { npc_id: 'npc_1', name: 'Prof. Sharma',           position: [-15, -15], state: 'idle' },
        { npc_id: 'npc_2', name: 'Librarian Peter',        position: [-15,  15], state: 'idle' },
        { npc_id: 'npc_3', name: 'Security Guard Suresh',  position: [ 15, -15], state: 'idle' },
      ])
    }
  }, [roomCode, setGamePhase, setRole, setAbilities, setTasks, setWorldEvidence, setNpcs, setCurrentScreen])

  const handleBeginInvestigation = useCallback(() => {
    setGamePhase('exploration')
  }, [setGamePhase])

  /* ── Render ── */
  if (screen === 'loading')          return <LoadingScreen    onFinish={handleLoadingFinish} />
  if (screen === 'splash')           return <SplashScreen     onUnleash={handleUnleash} />
  if (screen === 'story_cinematic')  return <StoryCinematic   onComplete={handleCinematicComplete} />
  if (screen === 'cinematic')        return <HomeScreen       onPlay={handlePlay} />

  // GAME branch
  if (gamePhase === 'role_reveal') return <RoleRevealScreen onBegin={handleBeginInvestigation} />
  return <GameScene />
}
