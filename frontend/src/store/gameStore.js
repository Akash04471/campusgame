import { create } from 'zustand'

// ── Screen Enum ─────────────────────────────────────────────────────────────
// Canonical app-level screen states. Always resets to LOADING on page refresh
// (no persistence by design — ensures the player always sees the full cinematic
// entry flow and prevents stale auth/lobby state from a previous session).
export const SCREENS = {
  LOADING:          'LOADING',
  SPLASH:           'SPLASH',
  STORY_CINEMATIC:  'STORY_CINEMATIC',
  CINEMATIC:        'CINEMATIC',
  AUTH:             'AUTH',
  LOBBY:            'LOBBY',
  ROLE_REVEAL:      'ROLE_REVEAL',
  GAMEPLAY:         'GAMEPLAY',
  RESULTS:          'RESULTS',
}

const useGameStore = create((set, get) => ({
  // ── Screen State ──
  currentScreen:    SCREENS.CINEMATIC,   // starts directly at CINEMATIC / HomeScreen on load
  hasSeenCinematic: false,             // session-level flag; resets on refresh

  // ── Player State ──
  playerPosition: [0, 0.5, -35],
  playerRotation: 0,
  playerSpeed: 4,
  sprintMultiplier: 1.8,
  isSprinting: false,

  // ── Other Players ──
  otherPlayers: {},  // player_id -> { position, rotation, username }

  // ── Game Session ──
  gamePhase: 'loading',   // loading | role_reveal | exploration | meeting | accusation | results
  timeRemaining: 5 * 60,
  timerSeconds: 5 * 60,
  difficulty: 'standard',
  role: null,
  partnerInfo: null,      // { partner_id, partner_name, partner_role } for villains
  roomCode: null,
  playerId: null,
  playerName: null,
  authToken: null,

  // ── Campus Areas ──
  campusAreas: [
    { id: 'front_gate',      name: 'Front Gate',      position: [0, 0, -48],  size: [14, 5, 4],   color: '#5a4a3a' },
    { id: 'vehicle_entry',   name: 'Vehicle Entry',   position: [-36, 0, -48],size: [8, 5, 4],    color: '#374151' },
    { id: 'parking',         name: 'Parking',         position: [-36, 0, -32],size: [12, 1, 26],  color: '#4b5563' },
    { id: 'audi_block',      name: 'Auditorium',      position: [-12, 0, -38],size: [16, 9, 10],  color: '#7c3412' },
    { id: 'junior_college',  name: 'Junior College',  position: [-10, 0, -24.5],size: [18, 7, 8], color: '#7c2d12' },
    { id: 'central_block',   name: 'Main Block',      position: [-9, 0, -6],  size: [20, 12, 18], color: '#8a3412' },
    { id: 'plants_trees',    name: 'Plants & Trees',  position: [22, 0, -38], size: [26, 1, 14],  color: '#15803d' },
    { id: 'basketball_court',name: 'Basket Ball Court (Right)',position: [20, 0, -22],size: [16, 1, 12],color: '#1d4ed8' },
    { id: 'canteen_right_top',name: 'Canteen (Top)',  position: [34, 0, -26],size: [6, 4, 4], color: '#7c3d00' },
    { id: 'canteen_right_mid',name: 'Cafeteria',       position: [34, 0, -22],size: [6, 4, 4],color: '#7c3d00' },
    { id: 'canteen_right_bot',name: 'Canteen (Bottom)',position: [34, 0, -17],size: [6, 4, 4],color: '#7c3d00' },
    { id: 'block_1',         name: 'Computer Lab',    position: [34.5, 0, 3.5],size: [8, 8, 10],  color: '#3b1c57' },
    { id: 'park_garden',     name: 'Park Garden',     position: [20, 0, -2],  size: [16, 1, 16],  color: '#16a34a' },
    { id: 'block_2',         name: 'MCA Department',  position: [19, 0, 18],  size: [16, 8, 12],  color: '#7c3412' },
    { id: 'birds_park',      name: 'Birds Park',      position: [20, 0, 30],  size: [14, 1, 10],  color: '#15803d' },
    { id: 'canteen_bot_right',name: 'Canteen (South)',position: [34.5, 0, 44],size: [8, 5, 10],color: '#7c3d00' },
    { id: 'back_gate',       name: 'Back Gate',       position: [-2, 0, 48],  size: [10, 5, 4],   color: '#5a4a3a' },
    { id: 'rd_block',        name: 'Research Center', position: [-30.5, 0, 43],size: [14, 6, 8],   color: '#3b1c57' },
    { id: 'block_4',         name: 'Library',         position: [-30.5, 0, 29.5],size: [14, 7, 8], color: '#7c3412' },
    { id: 'she_block',       name: 'Security Office', position: [-31.5, 0, 18],size: [16, 7, 10],color: '#7c185d' },
    { id: 'hockey_court',    name: 'Hockey Court',    position: [-31, 0, 4.5],size: [14, 1, 8],   color: '#065f46' },
    { id: 'basketball_court_left',name: 'Basket Ball Court (Left)',position: [-31, 0, -5],size: [14, 1, 10],color: '#1d4ed8' },
    { id: 'sitting_area',    name: 'Sitting Area',    position: [-12, 0, 16.5],size: [12, 1, 10], color: '#374151' },
    { id: 'girls_hostel',    name: 'Girls Hostel',    position: [17, 0, 42.5],size: [14, 6, 10],  color: '#7c3412' },
  ],
  currentArea: null,
  clickTarget: null,
  cameraYaw: 0,

  // ── Evidence ──
  worldEvidence: [],         // evidence items visible in 3D world
  evidenceBoard: [],         // Detective only: all collected evidence
  correlations: [],          // Detective only: linked evidence pairs
  evidenceCollectedCount: 0,
  evidenceCardQueue: [],     // FIFO queue of pickup cards to display
  personalEvidenceLog: [],   // every card this player has ever seen this match
  suspectDossier: [],        // Detective only: compiled suspect case files
  movementTraceReport: null, // last MOVEMENT_TRACE_REPORT payload


  // ── Tasks ──
  tasks: [],
  activeTaskId: null,
  taskStartedId: null,
  taskProgress: 0,
  globalTaskPercent: 0,
  globalTaskCompleted: 0,
  globalTaskTotal: 0,
  activeMinigameTask: null,

  // ── NPCs ──
  npcs: [],
  npcDialogVisible: false,
  npcDialogContent: null,    // { npc_name, statement }

  // ── Chat ──
  chatMessages: [],          // { channel, sender_name, message, timestamp }
  chatChannel: 'public',
  chatOpen: false,

  // ── Abilities ──
  abilities: [],
  abilityMenuOpen: false,

  // ── Meeting ──
  meetingActive: false,
  meetingTimeRemaining: 90,

  // ── CCTV Report ──
  cctvReport: null,        // { area, movement_replay, generated_evidence } from server

  // ── Decision Phase ──
  decisionPhase: {
    detectiveChoice: null,
    investigatorChoices: {},
    submitted: {
      detective: false,
      investigators: {},
    },
    timeoutSeconds: 60,
  },

  // ── Results ──
  gameResult: null,



  // ── WebSocket ──
  ws: null,

  // ── Actions ──
  setPlayerPosition: (position) => set({ playerPosition: position }),
  setClickTarget: (target) => set({ clickTarget: target }),
  setCameraYaw: (yaw) => set({ cameraYaw: yaw }),
  setPlayerRotation: (rotation) => set({ playerRotation: rotation }),
  setSprinting: (isSprinting) => set({ isSprinting }),
  setCurrentArea: (area) => set({ currentArea: area }),
  setGamePhase: (phase) => set({ gamePhase: phase }),
  setRole: (role) => set({ role }),
  setPartnerInfo: (info) => set({ partnerInfo: info }),
  setRoomCode: (code) => set({ roomCode: code }),
  setPlayerId: (id) => set({ playerId: id }),
  setPlayerName: (name) => set({ playerName: name }),
  setAuthToken: (token) => set({ authToken: token }),
  setTimerSeconds: (s) => set({ timerSeconds: s, timeRemaining: s }),
  setCurrentScreen:    (screen) => set({ currentScreen: screen }),
  setHasSeenCinematic: (val)    => set({ hasSeenCinematic: val }),

  tickTimer: () => set((state) => {
    const newTime = Math.max(0, state.timeRemaining - 1)
    if (newTime === 0 && state.gamePhase === 'exploration') {
      return { timeRemaining: 0, gamePhase: 'accusation' }
    }
    return { timeRemaining: newTime }
  }),

  // Evidence actions
  setWorldEvidence: (ev) => set({ worldEvidence: ev }),
  addWorldEvidence: (item) => set((s) => ({ worldEvidence: [...s.worldEvidence, item] })),
  removeWorldEvidence: (id) => set((s) => ({ worldEvidence: s.worldEvidence.filter(e => e.evidence_id !== id) })),
  setEvidenceBoard: (payload) => set((s) => {
    if (Array.isArray(payload)) return { evidenceBoard: payload }
    return {
      evidenceBoard: payload?.board || [],
      investigationTimeline: payload?.timeline && payload.timeline.length > 0 ? payload.timeline : s.investigationTimeline
    }
  }),
  addTimelineEvent: (evt) => set((s) => ({
    investigationTimeline: [...s.investigationTimeline.filter(e => e.event_id !== evt.event_id), evt]
  })),
  setInvestigationTimeline: (list) => set({ investigationTimeline: list }),
  showToast: (msg) => set({ toastMessage: msg }),
  clearToast: () => set({ toastMessage: null }),
  addCorrelation: (a, b, data = null) => set((s) => ({
    correlations: [...s.correlations.filter(c => !(c[0] === a && c[1] === b || c[0] === b && c[1] === a)), [a, b, data]]
  })),
  incrementEvidenceCollected: () => set((s) => ({ evidenceCollectedCount: s.evidenceCollectedCount + 1 })),
  pushEvidenceCard: (card) => set((s) => ({
    evidenceCardQueue: [...s.evidenceCardQueue, card],
    personalEvidenceLog: [...s.personalEvidenceLog, card]
  })),
  popEvidenceCard: () => set((s) => ({
    evidenceCardQueue: s.evidenceCardQueue.slice(1)
  })),
  setSuspectDossier: (list) => set({ suspectDossier: list }),
  setMovementTraceReport: (report) => set({ movementTraceReport: report }),



  // Task actions
  setTasks: (tasks) => set({ tasks }),
  updateTask: (updated) => set((s) => ({
    tasks: s.tasks.map(t => t.task_id === updated.task_id ? updated : t)
  })),
  setActiveTask: (id) => set({ activeTaskId: id }),
  setTaskStarted: (id) => set({ taskStartedId: id }),
  setTaskStartedId: (id) => set({ taskStartedId: id }),
  setTaskProgress: (p) => set({ taskProgress: p }),
  setGlobalTaskPercent: (val) => set((s) => ({
    globalTaskPercent: typeof val === 'object' ? (val.percent ?? 0) : val,
    globalTaskCompleted: typeof val === 'object' ? (val.completed ?? s.globalTaskCompleted) : s.globalTaskCompleted,
    globalTaskTotal: typeof val === 'object' ? (val.total ?? s.globalTaskTotal) : s.globalTaskTotal,
  })),
  setGlobalTaskProgress: (data) => set({
    globalTaskPercent: typeof data === 'object' ? (data.percent ?? 0) : data,
    globalTaskCompleted: data?.completed || 0,
    globalTaskTotal: data?.total || 0,
  }),
  openMinigame: (task) => set({ activeMinigameTask: task }),
  closeMinigame: () => set({ activeMinigameTask: null }),

  // NPC actions
  setNpcs: (npcs) => set({ npcs }),
  showNpcDialog: (content) => set({ npcDialogVisible: true, npcDialogContent: content }),
  hideNpcDialog: () => set({ npcDialogVisible: false, npcDialogContent: null }),

  // Chat actions
  addChatMessage: (msg) => set((s) => ({ chatMessages: [...s.chatMessages.slice(-100), msg] })),
  setChatChannel: (ch) => set({ chatChannel: ch }),
  toggleChat: () => set((s) => ({ chatOpen: !s.chatOpen })),

  // Ability actions
  setAbilities: (abilities) => set({ abilities }),
  updateAbility: (updated) => set((s) => ({
    abilities: s.abilities.map(a => a.ability_id === updated.ability_id ? { ...a, ...updated } : a)
  })),
  tickAbilityCooldowns: () => set((s) => ({
    abilities: s.abilities.map(a => {
      if (!a.is_on_cooldown) return a
      const remaining = Math.max(0, (a.cooldown_remaining || 0) - 1)
      return {
        ...a,
        cooldown_remaining: remaining,
        is_on_cooldown: remaining > 0
      }
    })
  })),
  toggleAbilityMenu: () => set((s) => ({ abilityMenuOpen: !s.abilityMenuOpen })),

  // Meeting actions
  setMeetingActive: (active) => set({ meetingActive: active }),
  setMeetingTimeRemaining: (t) => set((state) => ({
    meetingTimeRemaining: typeof t === 'function' ? t(state.meetingTimeRemaining) : t
  })),

  // CCTV report
  setCctvReport: (report) => set({ cctvReport: report }),

  // Game result
  setGameResult: (result) => set({ gameResult: result, gamePhase: 'results' }),
  setPrefilledMastermindSuspect: (pid) => set({ prefilledMastermindSuspect: pid }),

  // Decision Phase actions
  setDecisionPhaseState: (newState) => set((s) => ({
    decisionPhase: typeof newState === 'function'
      ? newState(s.decisionPhase)
      : { ...s.decisionPhase, ...newState }
  })),
  setDetectiveChoice: (choice) => set((s) => ({
    decisionPhase: { ...s.decisionPhase, detectiveChoice: choice }
  })),
  setInvestigatorChoice: (pid, choice) => set((s) => ({
    decisionPhase: {
      ...s.decisionPhase,
      investigatorChoices: { ...s.decisionPhase.investigatorChoices, [pid]: choice }
    }
  })),
  setPlayerSubmitted: (role, pid = null) => set((s) => {
    const isDetective = role?.toUpperCase() === 'DETECTIVE'
    if (isDetective) {
      return {
        decisionPhase: {
          ...s.decisionPhase,
          submitted: { ...s.decisionPhase.submitted, detective: true }
        }
      }
    } else {
      return {
        decisionPhase: {
          ...s.decisionPhase,
          submitted: {
            ...s.decisionPhase.submitted,
            investigators: { ...s.decisionPhase.submitted.investigators, [pid]: true }
          }
        }
      }
    }
  }),
  resetDecisionPhase: () => set({
    decisionPhase: {
      detectiveChoice: null,
      investigatorChoices: {},
      submitted: { detective: false, investigators: {} },
      timeoutSeconds: 10,
    }
  }),




  // WS
  setWs: (ws) => set({ ws }),

  // Other players
  updateOtherPlayer: (pid, data) => set((s) => ({
    otherPlayers: { ...s.otherPlayers, [pid]: { ...(s.otherPlayers[pid] || {}), ...data } }
  })),
  removeOtherPlayer: (pid) => set((s) => {
    const rest = { ...s.otherPlayers }
    delete rest[pid]
    return { otherPlayers: rest }
  }),

  // Leave room & return to room lobby/creation page
  leaveRoom: async () => {
    const { ws, roomCode, authToken } = get()
    if (ws) {
      try {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'LEAVE_ROOM', payload: { room_code: roomCode } }))
        }
        ws.close()
      } catch (e) {
        console.warn('WS close error:', e)
      }
    }
    if (roomCode && authToken) {
      try {
        const rawApiUrl = import.meta.env.VITE_API_URL
        const apiBase = rawApiUrl
          ? rawApiUrl.replace(/\/$/, '')
          : `${window.location.protocol}//${window.location.hostname}:8000`
        await fetch(`${apiBase}/api/v1/lobby/leave/${roomCode}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          }
        })
      } catch (e) {
        console.warn('Leave room HTTP API error:', e)
      }
    }

    set({
      roomCode: null,
      gamePhase: 'loading',
      currentScreen: SCREENS.CINEMATIC,
      role: null,
      partnerInfo: null,
      otherPlayers: {},
      worldEvidence: [],
      evidenceBoard: [],
      tasks: [],
      chatMessages: [],
      ws: null,
      gameResult: null,
      npcDialogVisible: false,
      npcDialogContent: null,
      cctvReport: null,
      movementTraceReport: null,
      activeTaskId: null,
      activeMinigameTask: null,
    })
  },
}))

export default useGameStore

