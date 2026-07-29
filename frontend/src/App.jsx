import React, { useState, useEffect, useCallback } from 'react'
import GameScene from './components/game/GameScene'
import RoleRevealScreen from './components/ui/RoleRevealScreen'
import HomeScreen, { getBackendHost, getWsProtocol } from './components/ui/HomeScreen'
import SplashScreen from './components/ui/SplashScreen'
import StoryCinematic from './components/ui/StoryCinematic'
import useGameStore from './store/gameStore'
import { SCREENS } from './store/gameStore'
import audioManager from './utils/audioManager'


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
  const showToast = useGameStore((s) => s.showToast)
  const addTimelineEvent = useGameStore((s) => s.addTimelineEvent)
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
            setTimerSeconds(Math.min(payload.timer_seconds || 300, 300))  // cap at 5 min
            if (payload.partner_id) {
              setPartnerInfo({ partner_id: payload.partner_id, partner_name: payload.partner_name, partner_role: payload.partner_role })
            } else {
              setPartnerInfo(null)
            }
            setGamePhase('role_reveal')
            break
          case 'GAME_STARTED':
            setNpcs(payload.npcs || [])
            if (typeof payload.timer_seconds === 'number') setTimerSeconds(Math.min(payload.timer_seconds, 300))
            break
          case 'GAME_STATE':
            setTasks(payload.tasks || [])
            setAbilities(payload.abilities || [])
            setWorldEvidence(payload.evidence || [])
            if (payload.role) setRole(payload.role)
            if (typeof payload.time_remaining === 'number') setTimerSeconds(Math.min(payload.time_remaining, 300))
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
            if (typeof payload.time_remaining === 'number') setTimerSeconds(Math.min(payload.time_remaining, 300))
            break
          case 'MEETING_TIMER_UPDATE':
            if (typeof payload.time_remaining === 'number') setMeetingTimeRemaining(payload.time_remaining)
            break
          case 'EVIDENCE_COLLECTED':
            if (payload.evidence) {
              removeWorldEvidence(payload.evidence.evidence_id)
              if (String(payload.collector_id) === String(playerId)) incrementEvidenceCollected()
              addTimelineEvent({
                event_id: 'col_' + payload.evidence.evidence_id,
                event_type: 'COLLECTED',
                title: 'Evidence Secured',
                description: `Secured ${payload.evidence.evidence_type || 'PHYSICAL'} evidence in ${payload.evidence.area || 'campus'}.`,
                area: payload.evidence.area || 'Campus',
                timestamp: Date.now()
              })
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
            showToast(payload.message || 'Evidence has been demolished.')
            addTimelineEvent({
              event_id: 'dem_' + payload.evidence_id,
              event_type: 'DEMOLISHED',
              title: 'Evidence Demolished',
              description: `Evidence in ${payload.area || 'campus'} has been demolished.`,
              area: payload.area || 'Campus',
              timestamp: Date.now()
            })
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
          case 'NPC_STATEMENT':
            showNpcDialog({ npc_name: payload.npc_name, statement: payload.statement })
            addTimelineEvent({
              event_id: 'npc_' + Date.now(),
              event_type: 'STATEMENT',
              title: 'Witness Statement Recorded',
              description: `${payload.npc_name}: "${payload.statement}"`,
              area: 'Witness Interview',
              timestamp: Date.now()
            })
            break
          case 'CHAT_MESSAGE': addChatMessage(payload); break
          case 'MEETING_STARTED':
            setMeetingActive(true)
            setMeetingTimeRemaining(payload.time_remaining || 120)
            setGamePhase('meeting')
            break
          case 'MEETING_ENDED':
            setMeetingActive(false)
            if (payload.resumed === false) {
              setGamePhase('accusation')
            } else {
              setGamePhase('exploration')
            }
            break
          case 'ABILITY_RESULT': if (payload.ability_id) updateAbility(payload); break
          case 'CCTV_REPORT': setCctvReport(payload); break
          case 'CORRELATION_RESULT': addCorrelation(payload.evidence_id_a, payload.evidence_id_b, payload); break
          case 'NPC_POSITIONS': setNpcs(payload.npcs || []); break
          case 'TASK_COMPLETED':
            if (payload && payload.task) {
              updateTask(payload.task)
            }
            if (payload && payload.player_id && String(payload.player_id) === String(playerId)) {
              audioManager.playSfx('taskComplete')
            }
            break

          case 'GLOBAL_TASK_PROGRESS': if (payload) setGlobalTaskPercent(payload); break
          case 'ACCUSATION_PHASE':
          case 'DECISION_PHASE':
            setGamePhase('decision')
            break
          case 'DECISION_TIMER_UPDATE':
            if (payload && payload.time_remaining !== undefined) {
              useGameStore.getState().setDecisionPhaseState({ timeRemaining: payload.time_remaining })
            }
            break
          case 'DECISION_SUBMITTED':
            if (payload) {
              const { role, voter_id } = payload
              useGameStore.getState().setPlayerSubmitted(role, voter_id)
            }
            break

          case 'PLAYER_MOVED': if (String(payload.player_id) !== String(playerId)) updateOtherPlayer(payload.player_id, { position: payload.position, rotation: payload.rotation }); break
          case 'PLAYER_DISCONNECTED': removeOtherPlayer(payload.player_id); break

          case 'GAME_OVER':
            setGameResult(payload)
            setGamePhase('results')
            break


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
  const [screen, setScreen] = useState('cinematic')  // cinematic | game

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
  const updateOtherPlayer    = useGameStore((s) => s.updateOtherPlayer)

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
    if (!roomCode || String(roomCode).startsWith('SOLO')) {
      // Offline / solo mode — seed state and show Role Reveal Screen
      setGamePhase('role_reveal')
      setRole('DETECTIVE')
      setAbilities([
        { ability_id: 'CCTV_ANALYSIS',    name: 'CCTV Analysis',              description: 'Review surveillance from Security Office',       location_required: 'Security Office', duration_seconds: 90, cooldown_remaining: 0, is_on_cooldown: false, uses_remaining: 99, max_uses: 99 },
        { ability_id: 'DIGITAL_ANALYSIS', name: 'Digital Evidence Analysis',  description: 'Recover server access logs from Computer Lab',   location_required: 'Computer Lab',    duration_seconds: 60, cooldown_remaining: 0, is_on_cooldown: false, uses_remaining: 99, max_uses: 99 },
        { ability_id: 'RECOVER_LOGS',     name: 'Recover Logs',               description: 'Recover deleted file metadata from Research Center', location_required: 'Research Center', duration_seconds: 45, cooldown_remaining: 0, is_on_cooldown: false, uses_remaining: 99, max_uses: 99 },
        { ability_id: 'CORRELATE_EVIDENCE',name:'Correlate Evidence',          description: 'Link two pieces of evidence on the Evidence Board', location_required: null,           duration_seconds: 0,  cooldown_remaining: 0, is_on_cooldown: false, uses_remaining: 10, max_uses: 10 },
      ])
      setTasks([
        { task_id: 'task_1', name: 'Analyze CCTV Surveillance Feeds', location: 'Security Office', task_type: 'ANALYZE_CCTV',       progress: 0, completed: false, points: 25 },
        { task_id: 'task_2', name: 'Audit Server Access Logs',        location: 'Computer Lab',    task_type: 'AUDIT_SERVER_LOGS',  progress: 0, completed: false, points: 20 },
        { task_id: 'task_3', name: 'Decrypt Encrypted Schematics',    location: 'Research Center', task_type: 'DECRYPT_SCHEMATICS', progress: 0, completed: false, points: 30 },
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

      // Seed 3 bot players for solo mode so they appear on campus and radar
      updateOtherPlayer('9001', { username: 'Agent Maya (Bot)', position: [12.0, 0.5, -10.0], rotation: 0, role: 'INVESTIGATOR' })
      updateOtherPlayer('9002', { username: 'Officer Alex (Bot)', position: [-10.0, 0.5, 15.0], rotation: 0, role: 'MASTERMIND' })
      updateOtherPlayer('9003', { username: 'Dr. Viktor (Bot)', position: [20.0, 0.5, 5.0], rotation: 0, role: 'CONSPIRATOR' })
    }
  }, [roomCode, setGamePhase, setRole, setAbilities, setTasks, setWorldEvidence, setNpcs, updateOtherPlayer, setCurrentScreen])

  const handleBeginInvestigation = useCallback(() => {
    setGamePhase('exploration')
  }, [setGamePhase])

  // Solo mode autonomous bot chat loop
  useEffect(() => {
    if (screen === 'game' && (!roomCode || String(roomCode).startsWith('SOLO'))) {
      const interval = setInterval(() => {
        const state = useGameStore.getState()
        const currentPhase = state.gamePhase
        const ch = currentPhase === 'meeting' ? 'meeting' : 'public'
        const botPool = currentPhase === 'meeting' ? [
          { name: 'Agent Maya (Bot)', text: 'I completed all my assigned tasks in MCA Department and Library. I\'m clean.' },
          { name: 'Officer Alex (Bot)', text: 'I saw someone near Research Center right before the evidence was wiped...' },
          { name: 'Dr. Viktor (Bot)', text: 'I was archiving files in Library when the emergency alarm triggered.' }
        ] : [
          { name: 'Agent Maya (Bot)', text: 'Working on task at Library.' },
          { name: 'Officer Alex (Bot)', text: 'Inspecting server logs in Computer Lab.' },
          { name: 'Dr. Viktor (Bot)', text: 'Restocking lab supplies in Research Center.' }
        ]
        const pick = botPool[Math.floor(Math.random() * botPool.length)]
        state.addChatMessage({
          channel: ch,
          sender_id: '900' + (Math.floor(Math.random() * 3) + 1),
          sender_name: pick.name,
          message: pick.text,
          timestamp: Date.now() / 1000
        })
      }, 20000)
      return () => clearInterval(interval)
    }
  }, [screen, roomCode])

  // Solo mode: autonomous bot movement loop
  useEffect(() => {
    if (screen !== 'game' || (roomCode && !String(roomCode).startsWith('SOLO'))) return

    const CAMPUS_WAYPOINTS = [
      [34.5, 0.5, 3.5],   // Computer Lab
      [-30.5, 0.5, 29.5], // Library
      [34.0, 0.5, -22.0], // Cafeteria
      [-30.5, 0.5, 43.0], // Research Center
      [-31.5, 0.5, 18.0], // Security Office
      [-9.0, 0.5, -6.0],  // Main Block
      [-12.0, 0.5, -38.0],// Auditorium
      [19.0, 0.5, -2.0],  // Park Garden
    ]

    const botTargets = {
      '9001': { wpIdx: 0, currPos: [12.0, 0.5, -10.0] },
      '9002': { wpIdx: 2, currPos: [-10.0, 0.5, 15.0] },
      '9003': { wpIdx: 5, currPos: [20.0, 0.5, 5.0] },
    }

    const BOT_NAMES = {
      '9001': 'Agent Maya (Bot)',
      '9002': 'Officer Alex (Bot)',
      '9003': 'Dr. Viktor (Bot)',
    }
    const BOT_ROLES = {
      '9001': 'INVESTIGATOR',
      '9002': 'MASTERMIND',
      '9003': 'CONSPIRATOR',
    }

    const movementInterval = setInterval(() => {
      const state = useGameStore.getState()
      if (state.gamePhase === 'decision' || state.gamePhase === 'results') return

      Object.keys(botTargets).forEach(pid => {
        const bt = botTargets[pid]
        const target = CAMPUS_WAYPOINTS[bt.wpIdx]
        const [cx, cy, cz] = bt.currPos
        const [tx, , tz] = target
        const dx = tx - cx
        const dz = tz - cz
        const dist = Math.sqrt(dx * dx + dz * dz)

        const speed = 5.5 // units per tick
        let newX, newZ
        if (dist < 1.5) {
          // Arrived — pick next random waypoint
          bt.wpIdx = (bt.wpIdx + 1 + Math.floor(Math.random() * 3)) % CAMPUS_WAYPOINTS.length
          newX = cx; newZ = cz
        } else {
          newX = cx + (dx / dist) * Math.min(speed, dist)
          newZ = cz + (dz / dist) * Math.min(speed, dist)
        }

        bt.currPos = [newX, cy, newZ]
        const rot = Math.atan2(dx, dz)

        state.updateOtherPlayer(pid, {
          username: BOT_NAMES[pid],
          position: [newX, cy, newZ],
          rotation: rot,
          role: BOT_ROLES[pid],
        })
      })
    }, 350)

    return () => clearInterval(movementInterval)
  }, [screen, roomCode])

  /* ── Render ── */
  if (screen === 'loading')          return <LoadingScreen    onFinish={handleLoadingFinish} />
  if (screen === 'splash')           return <SplashScreen     onUnleash={handleUnleash} />
  if (screen === 'story_cinematic')  return <StoryCinematic   onComplete={handleCinematicComplete} />
  if (screen === 'cinematic')        return <HomeScreen       onPlay={handlePlay} />

  // GAME branch
  if (gamePhase === 'role_reveal') return <RoleRevealScreen onBegin={handleBeginInvestigation} />
  return <GameScene />
}
