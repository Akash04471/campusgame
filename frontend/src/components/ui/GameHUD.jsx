import React, { useEffect, useRef, useState } from 'react'
import useGameStore from '../../store/gameStore'
import TaskList from './TaskList'
import EvidenceBoard from './EvidenceBoard'
import ChatPanel from './ChatPanel'
import AbilityMenu from './AbilityMenu'
import VirtualControls from './VirtualControls'
import CCTVReportPanel from './CCTVReportPanel'
import EvidenceCardPopup from './EvidenceCardPopup'
import MovementTraceReportPanel from './MovementTraceReportPanel'
import TaskCompass from './TaskCompass'



/* ── Christ University Campus Minimap ── */
// Faithfully represents the aerial photo layout
/* ── Christ University Campus Minimap ── */
// Roads in 3D world coordinates
const PATHS_3D = [
  { pos: [4, 0], size: [5, 100] },      // Central road
  { pos: [-22, 0], size: [3, 100] },    // Left road
  { pos: [29, 0], size: [3, 100] },     // Right road
  { pos: [0, -30], size: [80, 3] },     // Upper crossroad
  { pos: [0, 10], size: [80, 3] },      // Middle crossroad
  { pos: [0, 36], size: [80, 3] }       // Lower crossroad
]

// Lawns in 3D world coordinates
const GREEN_ZONES_3D = [
  { pos: [20, -38], size: [26, 14] },   // Plants & Trees Area
  { pos: [20, -2], size: [16, 16] },    // Park Garden
  { pos: [20, 30], size: [14, 10] },    // Birds Park
  { pos: [-22, -44], size: [16, 8] }    // Upper Left Garden
]

// Trees in 3D world coordinates
const TREES_3D = [
  [-18, -45], [-12, -45], [12, -45], [18, -45],
  [24, -14], [24, -8], [24, 18], [24, 24],
  [-32, -8], [-32, 0], [-32, 8],
  [-4, 24], [4, 24], [-4, 38], [4, 38],
  [16, 30], [20, 30], [-16, 30],
  [22, -38], [24, -36], [20, -40]
]

function ChristUniversityMinimap() {
  const canvasRef = useRef(null)
  const playerPosition = useGameStore((s) => s.playerPosition)
  const playerRotation = useGameStore((s) => s.playerRotation)
  const campusAreas = useGameStore((s) => s.campusAreas)
  const otherPlayers = useGameStore((s) => s.otherPlayers)
  const cameraYaw = useGameStore((s) => s.cameraYaw)
  const activeTaskId = useGameStore((s) => s.activeTaskId)
  const tasks = useGameStore((s) => s.tasks)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const W = canvas.width, H = canvas.height

    ctx.clearRect(0, 0, W, H)

    // Dark sleek background
    ctx.fillStyle = '#0f172a'
    ctx.fillRect(0, 0, W, H)

    // Grid details for tactical radar look
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)'
    ctx.lineWidth = 1
    const gridSize = 15
    for (let x = 0; x < W; x += gridSize) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke()
    }
    for (let y = 0; y < H; y += gridSize) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke()
    }

    // World coordinate limits mapping
    const worldToMap = (wx, wz) => {
      const nx = (wx + 53) / 106
      const ny = (wz + 53) / 106
      return [nx * W, ny * H]
    }

    // Draw lawns (Grass)
    GREEN_ZONES_3D.forEach(g => {
      const [gx1, gy1] = worldToMap(g.pos[0] - g.size[0]/2, g.pos[1] - g.size[1]/2)
      const [gx2, gy2] = worldToMap(g.pos[0] + g.size[0]/2, g.pos[1] + g.size[1]/2)
      ctx.fillStyle = '#14532d'
      ctx.globalAlpha = 0.5
      ctx.fillRect(gx1, gy1, gx2 - gx1, gy2 - gy1)
      ctx.globalAlpha = 1
      ctx.strokeStyle = '#166534'
      ctx.lineWidth = 0.8
      ctx.strokeRect(gx1, gy1, gx2 - gx1, gy2 - gy1)
    })

    // Draw pathways/roads
    PATHS_3D.forEach(p => {
      const [rx1, ry1] = worldToMap(p.pos[0] - p.size[0]/2, p.pos[1] - p.size[1]/2)
      const [rx2, ry2] = worldToMap(p.pos[0] + p.size[0]/2, p.pos[1] + p.size[1]/2)
      ctx.fillStyle = '#334155'
      ctx.fillRect(rx1, ry1, rx2 - rx1, ry2 - ry1)
    })

    // Draw campus buildings (mapped from gameStore campusAreas dynamically)
    campusAreas.forEach(area => {
      const [ax, , az] = area.position
      const [aw, , ad] = area.size

      // Filter lawn zones which are already drawn
      if (
        area.id === 'plants_trees' ||
        area.id === 'park_garden' ||
        area.id === 'birds_park' ||
        area.id === 'sitting_area'
      ) {
        return
      }

      const [x1, y1] = worldToMap(ax - aw/2, az - ad/2)
      const [x2, y2] = worldToMap(ax + aw/2, az + ad/2)
      const bw = x2 - x1
      const bh = y2 - y1

      let fillColor = '#475569'
      let strokeColor = '#1e293b'
      let textColor = '#cbd5e1'
      const label = area.name

      // Color logic based on building classification
      if (area.id.includes('gate')) {
        fillColor = '#1e293b'
        strokeColor = '#475569'
        textColor = '#94a3b8'
      } else if (area.id.includes('court') || area.id.includes('hockey')) {
        fillColor = area.id.includes('hockey') ? 'rgba(6, 95, 70, 0.45)' : 'rgba(29, 78, 216, 0.45)'
        strokeColor = area.id.includes('hockey') ? '#059669' : '#3b82f6'
        textColor = area.id.includes('hockey') ? '#a7f3d0' : '#bfdbfe'
      } else if (area.id.includes('canteen')) {
        fillColor = '#78350f'
        strokeColor = '#d97706'
        textColor = '#fde68a'
      } else if (area.id.includes('hostel') || area.id.includes('she_block')) {
        fillColor = '#581c87'
        strokeColor = '#c084fc'
        textColor = '#f3e8ff'
      } else if (area.id.includes('parking')) {
        fillColor = '#1e293b'
        strokeColor = '#64748b'
        textColor = '#cbd5e1'
      } else {
        // Academic blocks
        fillColor = '#7c2d12'
        strokeColor = '#ea580c'
        textColor = '#ffedd5'
      }

      // Draw shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)'
      ctx.fillRect(x1 + 1.5, y1 + 1.5, bw, bh)

      // Draw building block
      ctx.fillStyle = fillColor
      ctx.fillRect(x1, y1, bw, bh)
      ctx.strokeStyle = strokeColor
      ctx.lineWidth = 1.2
      ctx.strokeRect(x1, y1, bw, bh)

      // Sports court line markings
      if (area.id.includes('court')) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)'
        ctx.lineWidth = 0.8
        ctx.strokeRect(x1 + 2, y1 + 2, bw - 4, bh - 4)
        ctx.beginPath()
        ctx.arc(x1 + bw/2, y1 + bh/2, Math.min(bw, bh) * 0.22, 0, Math.PI * 2)
        ctx.stroke()
      }

      // Readable label names matching Objective locations
      let shortName = label
      if (label === 'Central Block' || label === 'Main Block') shortName = 'Main Block'
      else if (label === 'Junior College') shortName = 'JC'
      else if (label === 'Auditorium' || label === 'Audi Block') shortName = 'Auditorium'
      else if (label === 'R&D Block' || label === 'Research Center') shortName = 'Research Ctr'
      else if (label === 'Computer Lab') shortName = 'Comp Lab'
      else if (label === 'Security Office') shortName = 'Security'
      else if (label === 'MCA Department') shortName = 'MCA Dept'
      else if (label === 'Library') shortName = 'Library'
      else if (label === 'Girls Hostel') shortName = 'GH'
      else if (label === 'She Block / Boys Hostel') shortName = 'BH'
      else if (label === 'Cafeteria' || label.includes('Canteen')) shortName = 'Cafeteria'
      else if (label.includes('Basket Ball')) shortName = label.includes('Left') ? 'BK-L' : 'BK-R'
      else if (label.includes('Hockey')) shortName = 'Hock'
      else if (label.includes('Parking')) shortName = 'PRK'

      ctx.fillStyle = textColor
      ctx.font = 'bold 8px "Outfit", sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(shortName, x1 + bw/2, y1 + bh/2)
    })

    // Draw tree indicators
    TREES_3D.forEach(t => {
      const [tx, ty] = worldToMap(t[0], t[1])
      ctx.beginPath()
      ctx.arc(tx, ty, 2.5, 0, Math.PI * 2)
      ctx.fillStyle = '#166534'
      ctx.fill()
      ctx.beginPath()
      ctx.arc(tx - 0.5, ty - 0.5, 1.2, 0, Math.PI * 2)
      ctx.fillStyle = '#22c55e'
      ctx.fill()
    })

    // Render other players
    Object.values(otherPlayers).forEach(p => {
      if (!p.position) return
      const [px, py] = worldToMap(p.position.x || p.position[0], p.position.z || p.position[2])
      ctx.beginPath(); ctx.arc(px, py, 3.8, 0, Math.PI * 2)
      ctx.fillStyle = '#94a3b8'
      ctx.fill()
      ctx.strokeStyle = 'white'
      ctx.lineWidth = 1
      ctx.stroke()
    })

    // Draw Self FOV Cone (camera viewing direction indicator)
    const [sx, sy] = worldToMap(playerPosition[0], playerPosition[2])
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(sx, sy)
    const startAngle = cameraYaw - (25 * Math.PI / 180) - Math.PI / 2
    const endAngle = cameraYaw + (25 * Math.PI / 180) - Math.PI / 2
    const radius = 38
    ctx.arc(sx, sy, radius, startAngle, endAngle)
    ctx.closePath()
    const coneGrad = ctx.createRadialGradient(sx, sy, 2, sx, sy, radius)
    coneGrad.addColorStop(0, 'rgba(6, 182, 212, 0.4)')
    coneGrad.addColorStop(1, 'rgba(6, 182, 212, 0.0)')
    ctx.fillStyle = coneGrad
    ctx.fill()
    ctx.restore()

    // Draw Self Arrow Indicator (player facing direction)
    ctx.save()
    ctx.translate(sx, sy)
    ctx.rotate(playerRotation - Math.PI / 2)
    ctx.beginPath()
    ctx.moveTo(5.5, 0)
    ctx.lineTo(-5.5, -3.5)
    ctx.lineTo(-3.5, 0)
    ctx.lineTo(-5.5, 3.5)
    ctx.closePath()
    ctx.fillStyle = '#f43f5e'
    ctx.fill()
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 1
    ctx.stroke()
    ctx.restore()

    // Pulse ring around the player
    ctx.beginPath(); ctx.arc(sx, sy, 7.5, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(244, 63, 94, 0.5)'
    ctx.lineWidth = 1.2
    ctx.stroke()

    // North arrow indicator
    ctx.fillStyle = '#94a3b8'
    ctx.font = 'bold 9px "Outfit", sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('N', W - 10, 14)

    // Draw Waypoint Tracker for active task
    const activeTask = tasks.find(t => t.task_id === activeTaskId && !t.completed)
    if (activeTask) {
      const AREA_WORLD_POSITIONS = {
        'Research Center':  [28, -20],
        'Computer Lab':     [28,   0],
        'Security Office':  [-30,  4],
        'MCA Department':   [ 8,  14],
        'Main Block':       [-10, -8],
        'Auditorium':       [-28,-28],
        'Library':          [-24, 22],
        'Cafeteria':        [ 32, 16],
      }
      const targetCoords = AREA_WORLD_POSITIONS[activeTask.location]
      if (targetCoords) {
        const [tx, ty] = worldToMap(targetCoords[0], targetCoords[1])

        // Draw dynamic pulsing beacon ring
        const pulse = 6 + Math.sin(Date.now() * 0.006) * 3
        ctx.beginPath()
        ctx.arc(tx, ty, pulse, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(139, 92, 246, 0.25)' // violet pulsing glow
        ctx.fill()
        ctx.strokeStyle = 'rgba(139, 92, 246, 0.5)'
        ctx.lineWidth = 1
        ctx.stroke()

        // Draw solid waypoint pin core
        ctx.beginPath()
        ctx.arc(tx, ty, 3.5, 0, Math.PI * 2)
        ctx.fillStyle = '#8b5cf6' // solid violet
        ctx.fill()
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 1
        ctx.stroke()

        // Draw dashed path leading from player to waypoint
        ctx.save()
        ctx.beginPath()
        ctx.setLineDash([4, 4])
        ctx.moveTo(sx, sy)
        ctx.lineTo(tx, ty)
        ctx.strokeStyle = 'rgba(139, 92, 246, 0.6)'
        ctx.lineWidth = 1.2
        ctx.stroke()
        ctx.restore()
      }
    }

    // Modern glass border outline
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
    ctx.lineWidth = 1.5
    ctx.strokeRect(0, 0, W, H)

  }, [playerPosition, playerRotation, otherPlayers, campusAreas, cameraYaw, activeTaskId, tasks])

  return (
    <div className="minimap-wrapper">
      <div className="minimap-label">CAMPUS RADAR MAP</div>
      <canvas ref={canvasRef} width={220} height={280} className="minimap-canvas" id="minimap-canvas" />
      <div className="minimap-legend" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '0.2rem 0.5rem',
        fontSize: '0.52rem',
        marginTop: '0.3rem',
        padding: '0.3rem 0.5rem',
        background: 'rgba(15, 23, 42, 0.6)',
        borderRadius: '6px',
        border: '1px solid rgba(255, 255, 255, 0.08)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#7c2d12' }} /> Academic Blocks
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#581c87' }} /> Hostels
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#1d4ed8' }} /> Sports Courts
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#78350f' }} /> Cafeterias
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#14532d' }} /> Gardens / Lawns
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#06b6d4' }} /> View Cone (FOV)
        </div>
      </div>
    </div>
  )
}

/* ── Timer ── */
function Timer() {
  const timeRemaining   = useGameStore((s) => s.timeRemaining)
  const tickTimer       = useGameStore((s) => s.tickTimer)
  const ws              = useGameStore((s) => s.ws)
  const playerPosition  = useGameStore((s) => s.playerPosition)
  const currentArea     = useGameStore((s) => s.currentArea)
  const intervalRef     = useRef(null)
  const cctvTickRef     = useRef(0)  // counts seconds for 5s CCTV interval

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      // 1. Tick local store timer for smooth continuous countdown
      useGameStore.getState().tickTimer()

      // 2. Read latest state for periodic movement tracking over WS
      const state = useGameStore.getState()
      const currentWs = state.ws
      const currentPos = state.playerPosition
      const area = state.currentArea

      if (currentWs && currentWs.readyState === WebSocket.OPEN) {
        // Every 5 seconds record movement for CCTV
        cctvTickRef.current += 1
        if (cctvTickRef.current >= 5) {
          cctvTickRef.current = 0
          if (currentPos && currentPos.length >= 3) {
            currentWs.send(JSON.stringify({
              action: 'RECORD_MOVEMENT',
              position: {
                x: currentPos[0],
                y: currentPos[1],
                z: currentPos[2],
              },
              area: area || 'Campus Grounds',
            }))
          }
        }
      }
    }, 1000)
    return () => clearInterval(intervalRef.current)
  }, [])

  const minutes  = Math.floor(timeRemaining / 60)
  const seconds  = timeRemaining % 60
  const isUrgent   = timeRemaining <= 120
  const isCritical = timeRemaining <= 30

  return (
    <div className={`hud-timer ${isUrgent ? 'urgent' : ''} ${isCritical ? 'critical' : ''}`} id="game-timer">
      <span className="timer-label">INVESTIGATION</span>
      <span className="timer-value">
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </span>
      {isCritical && <span className="timer-critical-text">TIME CRITICAL</span>}
    </div>
  )
}

/* ── Area Indicator ── */
function AreaIndicator() {
  const currentArea = useGameStore((s) => s.currentArea)
  return (
    <div className={`hud-area ${currentArea ? 'visible' : ''}`} id="area-indicator">
      <span className="area-icon">📍</span>
      <span className="area-name">{currentArea || 'Campus Grounds'}</span>
    </div>
  )
}

/* ── Role Badge ── */
function RoleBadge() {
  const role = useGameStore((s) => s.role)
  const displayRole = role || 'INVESTIGATOR'
  const roleColors = {
    DETECTIVE: '#3b82f6', INVESTIGATOR: '#22c55e',
    MASTERMIND: '#ef4444', CONSPIRATOR: '#f97316',
  }
  const roleIcons = { DETECTIVE: '🔍', INVESTIGATOR: '🧩', MASTERMIND: '🕵️', CONSPIRATOR: '🔪' }
  return (
    <div className="hud-role-badge" id="role-badge" style={{ '--role-color': roleColors[displayRole] || '#8b5cf6' }}>
      <span className="role-icon-big">{roleIcons[displayRole] || '👤'}</span>
      <div>
        <span className="role-label">ROLE</span>
        <span className="role-name">{displayRole}</span>
      </div>
    </div>
  )
}

/* ── NPC Dialog ── */
function NPCDialog() {
  const visible = useGameStore((s) => s.npcDialogVisible)
  const content = useGameStore((s) => s.npcDialogContent)
  const hideNpcDialog = useGameStore((s) => s.hideNpcDialog)
  if (!visible || !content) return null
  return (
    <div className="npc-dialog-overlay" id="npc-dialog" onClick={hideNpcDialog}>
      <div className="npc-dialog-box" onClick={e => e.stopPropagation()}>
        <div className="npc-dialog-header">
          <div className="npc-avatar-circle">
            <span>👤</span>
          </div>
          <div>
            <strong className="npc-name">{content.npc_name}</strong>
            <p className="npc-subtitle">Witness Statement</p>
          </div>
        </div>
        <div className="npc-speech-bubble">
          <p className="npc-dialog-text">"{content.statement}"</p>
        </div>
        <button className="npc-dialog-close" onClick={hideNpcDialog}>
          ✕ Close
        </button>
      </div>
    </div>
  )
}

/* ── Controls Hint ── */
function ControlsHint() {
  return (
    <div className="hud-controls" id="controls-hint">
      <span><kbd>WASD</kbd> Move</span>
      <span><kbd>Shift</kbd> Sprint</span>
      <span><kbd>E</kbd> Interact</span>
      <span><kbd>T</kbd> Chat</span>
      <span><kbd>Tab</kbd> Abilities</span>
    </div>
  )
}

/* ── Global Task Progress Bar ── */
function GlobalTaskProgressBar() {
  const globalTaskPercent = useGameStore((s) => s.globalTaskPercent) || 0
  const globalTaskCompleted = useGameStore((s) => s.globalTaskCompleted) || 0
  const globalTaskTotal = useGameStore((s) => s.globalTaskTotal) || 0

  const percentClamped = Math.min(100, Math.max(0, globalTaskPercent))

  return (
    <div className="hud-global-task-progress" id="global-task-progress">
      <div className="global-task-header">
        <span className="global-task-label">CAMPUS TASKS</span>
        <span className="global-task-stats">
          {globalTaskTotal > 0 ? `${globalTaskCompleted}/${globalTaskTotal} (${Math.round(percentClamped)}%)` : `${Math.round(percentClamped)}%`}
        </span>
      </div>
      <div className="global-task-bar-track">
        <div 
          className="global-task-bar-fill" 
          style={{ width: `${percentClamped}%` }}
        />
      </div>
    </div>
  )
}

/* Area → world [x, z] coordinates for arrival check */
const AREA_ZONE_COORDS = {
  'Research Center':  [28, -20],
  'Computer Lab':     [28,   0],
  'Security Office':  [-30,  4],
  'MCA Department':   [ 8,  14],
  'Main Block':       [-10, -8],
  'Auditorium':       [-28,-28],
  'Library':          [-24, 22],
  'Cafeteria':        [ 32, 16],
}

/* ── 2D Objective Arrival Banner ── */
function ObjectiveArrivalBanner() {
  const playerPosition = useGameStore((s) => s.playerPosition)
  const activeTaskId = useGameStore((s) => s.activeTaskId)
  const taskStartedId = useGameStore((s) => s.taskStartedId)
  const tasks = useGameStore((s) => s.tasks)

  const trackedTaskId = taskStartedId || activeTaskId
  const trackedTask = tasks.find(t => t.task_id === trackedTaskId && !t.completed)

  if (!trackedTask || !playerPosition) return null

  const targetCoords = AREA_ZONE_COORDS[trackedTask.location]
  if (!targetCoords) return null

  const dx = targetCoords[0] - playerPosition[0]
  const dz = targetCoords[1] - playerPosition[2]
  const distance = Math.sqrt(dx * dx + dz * dz)
  const isInZone = distance < 3.5

  if (!isInZone) return null

  return (
    <div className="objective-arrival-banner" id="objective-arrival-banner">
      <span className="banner-icon">🎯</span>
      <div className="banner-text-group">
        <strong className="banner-title">OBJECTIVE REACHED — {trackedTask.name}</strong>
        <p className="banner-sub">Hold <kbd>E</kbd> (or tap interact) to perform task</p>
      </div>
    </div>
  )
}

/* ── Full HUD ── */
export default function GameHUD() {
  return (
    <div className="game-hud" id="game-hud">
      <div className="hud-top-bar">
        <RoleBadge />
        <Timer />
        <GlobalTaskProgressBar />
        <AreaIndicator />
      </div>

      <TaskCompass />
      <ObjectiveArrivalBanner />

      {/* Right sidebar */}
      <div className="hud-right-sidebar">
        <TaskList />
        <EvidenceBoard />
      </div>

      <div className="hud-bottom-bar">
        <ChristUniversityMinimap />
        <ControlsHint />
        <div className="hud-bottom-right">
          <ChatPanel />
          <AbilityMenu />
          <VirtualControls />
        </div>
      </div>

      <NPCDialog />
      <CCTVReportPanel />
      <MovementTraceReportPanel />
      <EvidenceCardPopup />
    </div>
  )
}


