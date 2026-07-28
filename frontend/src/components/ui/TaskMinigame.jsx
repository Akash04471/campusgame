import React, { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle2, RotateCw, Zap, Wrench, Shield, AlertTriangle, Play, Sparkles } from 'lucide-react'
import useGameStore from '../../store/gameStore'
import audioManager from '../../utils/audioManager'

/* ──────────────────────────────────────────────────────────────
   VARIANT 1: WIRE MATCH (REPAIR_NETWORK, CHECK_CCTV)
   ────────────────────────────────────────────────────────────── */
const WIRE_COLORS = [
  { id: 'pink', name: 'Alpha', color: '#ec4899', glow: 'rgba(236, 72, 153, 0.6)' },
  { id: 'cyan', name: 'Beta', color: '#06b6d4', glow: 'rgba(6, 182, 212, 0.6)' },
  { id: 'amber', name: 'Gamma', color: '#f59e0b', glow: 'rgba(245, 158, 11, 0.6)' },
  { id: 'emerald', name: 'Delta', color: '#10b981', glow: 'rgba(16, 185, 129, 0.6)' },
]

function WireMatchGame({ onSuccess, onCancel }) {
  const [selectedWire, setSelectedWire] = useState(null)
  const [connections, setConnections] = useState({}) // { leftIndex: rightIndex }
  const [isSuccess, setIsSuccess] = useState(false)

  // Shuffle right-side ports on mount
  const rightPorts = useMemo(() => {
    const arr = [0, 1, 2, 3]
    return arr.sort(() => Math.random() - 0.5)
  }, [])

  const handleLeftClick = (leftIdx) => {
    if (isSuccess) return
    audioManager.playSfx('taskProgress')
    setSelectedWire(leftIdx)
  }

  const handleRightClick = (rightIdx) => {
    if (isSuccess || selectedWire === null) return
    const leftWireColor = WIRE_COLORS[selectedWire].id
    const rightPortColor = WIRE_COLORS[rightPorts[rightIdx]].id

    if (leftWireColor === rightPortColor) {
      audioManager.playSfx('taskProgress')
      const updated = { ...connections, [selectedWire]: rightIdx }
      setConnections(updated)
      setSelectedWire(null)


      if (Object.keys(updated).length === 4) {
        setIsSuccess(true)
        setTimeout(() => onSuccess(), 900)
      }
    } else {
      // Incorrect match shake feedback
      setSelectedWire(null)
    }
  }

  const handleReset = () => {
    setConnections({})
    setSelectedWire(null)
    setIsSuccess(false)
  }

  return (
    <div className="minigame-container wire-match-container">
      <div className="minigame-header-section">
        <h3>⚡ CIRCUIT & FEED REPAIR</h3>
        <p>Connect matching signal wires from left terminals to right interface ports.</p>
      </div>

      <div className="wire-grid">
        {/* Left Terminals */}
        <div className="wire-column left-col">
          <span className="col-label">SOURCE TERMINALS</span>
          {WIRE_COLORS.map((wire, idx) => {
            const isConnected = connections[idx] !== undefined
            const isSelected = selectedWire === idx
            return (
              <button
                key={wire.id}
                className={`wire-node left-node ${isSelected ? 'selected' : ''} ${isConnected ? 'connected' : ''}`}
                style={{ '--wire-color': wire.color, '--wire-glow': wire.glow }}
                onClick={() => handleLeftClick(idx)}
                disabled={isConnected || isSuccess}
              >
                <span className="node-dot" />
                <span className="node-label">{wire.name}</span>
                {isConnected && <CheckCircle2 className="check-icon" size={14} />}
              </button>
            )
          })}
        </div>

        {/* Center SVG Wires overlay */}
        <div className="wire-center-canvas">
          <svg className="wire-svg">
            {Object.entries(connections).map(([lIdx, rIdx]) => {
              const leftY = 40 + parseInt(lIdx) * 65
              const rightY = 40 + parseInt(rIdx) * 65
              const color = WIRE_COLORS[lIdx].color
              return (
                <g key={lIdx}>
                  <path
                    d={`M 10 ${leftY} C 120 ${leftY}, 140 ${rightY}, 250 ${rightY}`}
                    stroke={color}
                    strokeWidth="4"
                    fill="none"
                    strokeLinecap="round"
                    className="wire-path-glow"
                  />
                  <path
                    d={`M 10 ${leftY} C 120 ${leftY}, 140 ${rightY}, 250 ${rightY}`}
                    stroke="#ffffff"
                    strokeWidth="1.5"
                    fill="none"
                    strokeDasharray="4 4"
                    className="wire-path-flow"
                  />
                </g>
              )
            })}
          </svg>
        </div>

        {/* Right Ports */}
        <div className="wire-column right-col">
          <span className="col-label">RECEIVING PORTS</span>
          {rightPorts.map((wireIdx, rIdx) => {
            const wire = WIRE_COLORS[wireIdx]
            const isMatched = Object.values(connections).includes(rIdx)
            return (
              <button
                key={rIdx}
                className={`wire-node right-node ${isMatched ? 'connected' : ''}`}
                style={{ '--wire-color': wire.color, '--wire-glow': wire.glow }}
                onClick={() => handleRightClick(rIdx)}
                disabled={isMatched || isSuccess}
              >
                <span className="node-label">{wire.name}</span>
                <span className="node-dot" />
              </button>
            )
          })}
        </div>
      </div>

      <div className="minigame-footer">
        <button className="minigame-btn-secondary" onClick={handleReset} disabled={isSuccess}>
          <RotateCw size={14} /> RESET WIRES
        </button>
        <span className="status-badge">
          {isSuccess ? '✅ CIRCUIT REPAIRED' : `${Object.keys(connections).length}/4 CONNECTED`}
        </span>
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────
   VARIANT 2: ROTATE VALVE (RESTOCK_LAB, SETUP_AUDITORIUM)
   ────────────────────────────────────────────────────────────── */
function RotateValveGame({ onSuccess, onCancel }) {
  // 3 Valves with current angle and target angle range [min, max]
  const [valves, setValves] = useState([
    { id: 'v1', name: 'Pressure Valve Alpha', angle: 20, targetMin: 70, targetMax: 100 },
    { id: 'v2', name: 'Flow Regulator Beta', angle: 220, targetMin: 130, targetMax: 160 },
    { id: 'v3', name: 'Voltage Stabilizer Gamma', angle: 45, targetMin: 200, targetMax: 230 },
  ])
  const [isSuccess, setIsSuccess] = useState(false)

  const handleRotate = (idx, step) => {
    if (isSuccess) return
    setValves(prev => {
      const next = [...prev]
      const newAngle = (next[idx].angle + step + 360) % 360
      next[idx] = { ...next[idx], angle: newAngle }

      // Check all aligned
      const allAligned = next.every(v => v.angle >= v.targetMin && v.angle <= v.targetMax)
      if (allAligned) {
        setIsSuccess(true)
        setTimeout(() => onSuccess(), 900)
      }
      return next
    })
  }

  return (
    <div className="minigame-container rotate-valve-container">
      <div className="minigame-header-section">
        <h3>🎛️ SYSTEM VALVE & RELAY TUNING</h3>
        <p>Rotate control dials until all gauges settle in their designated green safety target zones.</p>
      </div>

      <div className="valves-grid">
        {valves.map((v, idx) => {
          const isAligned = v.angle >= v.targetMin && v.angle <= v.targetMax
          return (
            <div key={v.id} className={`valve-card ${isAligned ? 'aligned' : ''}`}>
              <div className="valve-card-header">
                <span className="valve-title">{v.name}</span>
                <span className={`valve-status ${isAligned ? 'status-green' : 'status-red'}`}>
                  {isAligned ? 'ALIGNED' : 'UNBALANCED'}
                </span>
              </div>

              {/* Rotary Knob Display */}
              <div className="valve-knob-wrapper">
                <svg className="knob-svg" viewBox="0 0 100 100">
                  {/* Outer Track */}
                  <circle cx="50" cy="50" r="40" stroke="rgba(255,255,255,0.1)" strokeWidth="6" fill="none" />

                  {/* Target Zone Arc */}
                  <circle
                    cx="50" cy="50" r="40"
                    stroke="#10b981" strokeWidth="8" fill="none"
                    strokeDasharray={`${((v.targetMax - v.targetMin) / 360) * 251} 251`}
                    strokeDashoffset={`-${(v.targetMin / 360) * 251}`}
                    strokeLinecap="round"
                    className="target-arc-glow"
                  />

                  {/* Dial Needle */}
                  <line
                    x1="50" y1="50" x2="50" y2="16"
                    stroke={isAligned ? '#10b981' : '#f43f5e'}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    transform={`rotate(${v.angle} 50 50)`}
                    className="knob-needle"
                  />
                  <circle cx="50" cy="50" r="7" fill="#0f172a" stroke="#ffffff" strokeWidth="2" />
                </svg>
                <div className="valve-readout">{v.angle}°</div>
              </div>

              {/* Angle Adjustment Controls */}
              <div className="valve-controls-row">
                <button className="knob-btn" onClick={() => handleRotate(idx, -15)} disabled={isSuccess}>-15°</button>
                <button className="knob-btn" onClick={() => handleRotate(idx, -5)} disabled={isSuccess}>-5°</button>
                <button className="knob-btn" onClick={() => handleRotate(idx, 5)} disabled={isSuccess}>+5°</button>
                <button className="knob-btn" onClick={() => handleRotate(idx, 15)} disabled={isSuccess}>+15°</button>
              </div>
            </div>
          )
        })}
      </div>

      <div className="minigame-footer">
        <span className="status-badge">
          {isSuccess ? '✅ VALVES TUNED & LOCKED' : 'ALIGN ALL 3 VALVES TO PROCEED'}
        </span>
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────
   VARIANT 3: HOLD BAR (DEFAULT / ARCHIVE_FILES, SUBMIT_ATTENDANCE etc)
   ────────────────────────────────────────────────────────────── */
function HoldBarGame({ onSuccess, onCancel, task }) {
  const [progress, setProgress] = useState(0)
  const [isHolding, setIsHolding] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const animRef = useRef(null)

  /* Keydown/keyup listener for E and Space keys */
  useEffect(() => {
    const onDown = (e) => {
      if (e.code === 'KeyE' || e.key === 'e' || e.key === 'E' || e.code === 'Space') {
        if (!isSuccess) setIsHolding(true)
      }
    }
    const onUp = (e) => {
      if (e.code === 'KeyE' || e.key === 'e' || e.key === 'E' || e.code === 'Space') {
        if (!isSuccess) setIsHolding(false)
      }
    }
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup',   onUp)
    return () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup',   onUp)
    }
  }, [isSuccess])

  useEffect(() => {
    if (isHolding && !isSuccess) {
      animRef.current = setInterval(() => {
        setProgress(p => {
          const next = p + 3.0
          if (next >= 100) {
            clearInterval(animRef.current)
            setIsSuccess(true)
            setTimeout(() => onSuccess(), 600)
            return 100
          }
          return next
        })
      }, 40)
    } else if (!isHolding && !isSuccess && progress > 0) {
      animRef.current = setInterval(() => {
        setProgress(p => {
          const next = Math.max(0, p - 4.0)
          if (next <= 0) {
            clearInterval(animRef.current)
            return 0
          }
          return next
        })
      }, 40)
    } else {
      clearInterval(animRef.current)
    }
    return () => clearInterval(animRef.current)
  }, [isHolding, isSuccess, progress, onSuccess])

  const handleHoldStart = () => { if (!isSuccess) setIsHolding(true) }
  const handleHoldEnd = () => { if (!isSuccess) setIsHolding(false) }

  return (
    <div className="minigame-container hold-bar-container">
      <div className="minigame-header-section">
        <h3>📊 SYSTEM OVERRIDE & DATA TRANSFER</h3>
        <p>Press and hold the execute trigger to initiate encrypted data sequence.</p>
      </div>

      <div className="hold-display-section">
        <div className="radial-progress-wrapper">
          <svg className="radial-svg" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="50" stroke="rgba(255,255,255,0.08)" strokeWidth="10" fill="none" />
            <circle
              cx="60" cy="60" r="50"
              stroke={isSuccess ? '#10b981' : '#8b5cf6'}
              strokeWidth="10"
              fill="none"
              strokeDasharray="314"
              strokeDashoffset={314 - (314 * progress) / 100}
              strokeLinecap="round"
              transform="rotate(-90 60 60)"
              className="radial-fill"
            />
          </svg>
          <div className="radial-center-text">
            <span className="radial-percent">{Math.floor(progress)}%</span>
            <span className="radial-sub">{isSuccess ? 'COMPLETE' : isHolding ? 'TRANSFERRING' : 'STANDBY'}</span>
          </div>
        </div>

        {/* Hold Button Trigger */}
        <button
          className={`hold-trigger-btn ${isHolding ? 'holding' : ''} ${isSuccess ? 'success' : ''}`}
          onMouseDown={handleHoldStart}
          onMouseUp={handleHoldEnd}
          onMouseLeave={handleHoldEnd}
          onTouchStart={handleHoldStart}
          onTouchEnd={handleHoldEnd}
          disabled={isSuccess}
        >
          <div className="btn-glow-layer" />
          <Zap className={`zap-icon ${isHolding ? 'anim-pulse' : ''}`} size={28} />
          <span>{isSuccess ? 'OVERRIDE COMPLETE' : isHolding ? 'HOLDING TRIGGER…' : 'HOLD TO EXECUTE'}</span>
        </button>
      </div>

      <div className="minigame-footer">
        <span className="status-badge">
          {isSuccess ? '✅ TASK OVERRIDE EXECUTED' : 'HOLD UNTIL PROGRESS REACHES 100%'}
        </span>
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────
   MAIN OVERLAY WRAPPER
   ────────────────────────────────────────────────────────────── */
export default function TaskMinigame() {
  const activeMinigameTask = useGameStore((s) => s.activeMinigameTask)
  const closeMinigame = useGameStore((s) => s.closeMinigame)
  const ws = useGameStore((s) => s.ws)
  const updateTask = useGameStore((s) => s.updateTask)

  useEffect(() => {
    if (activeMinigameTask) {
      audioManager.playSfx('taskStart')
    }
  }, [activeMinigameTask])

  if (!activeMinigameTask) return null


  const taskType = activeMinigameTask.task_type

  const handleSuccess = () => {
    audioManager.playSfx('taskComplete')
    // Always mark task as completed locally in store immediately
    updateTask({ ...activeMinigameTask, progress: 1.0, completed: true })

    if (ws && ws.readyState === WebSocket.OPEN) {
      // Send single completion delta: 1.0 to server
      ws.send(JSON.stringify({
        action: 'TASK_PROGRESS',
        task_id: activeMinigameTask.task_id,
        delta: 1.0,
      }))
    }
    closeMinigame()
  }


  const handleCancel = () => {
    closeMinigame()
  }

  return (
    <AnimatePresence>
      <div className="task-minigame-overlay" id="task-minigame-modal">
        <motion.div
          className="task-minigame-modal"
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        >
          {/* Top Bar / Header */}
          <div className="modal-header">
            <div className="modal-title-group">
              <span className="modal-badge">{activeMinigameTask.location}</span>
              <h2>{activeMinigameTask.name || 'Campus Objective'}</h2>
            </div>
            <button className="modal-close-btn" onClick={handleCancel} title="Abort Task (No Penalty)">
              <X size={18} />
            </button>
          </div>

          {/* Body variant switch */}
          <div className="modal-body">
            {taskType === 'REPAIR_NETWORK' || taskType === 'CHECK_CCTV' ? (
              <WireMatchGame onSuccess={handleSuccess} onCancel={handleCancel} />
            ) : taskType === 'RESTOCK_LAB' || taskType === 'SETUP_AUDITORIUM' ? (
              <RotateValveGame onSuccess={handleSuccess} onCancel={handleCancel} />
            ) : (
              <HoldBarGame onSuccess={handleSuccess} onCancel={handleCancel} task={activeMinigameTask} />
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
