import React, { useRef, useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Html } from '@react-three/drei'
import useGameStore from '../../store/gameStore'

/* Dynamic role-aware text mapping */
const TASK_NAMES = {
  INVESTIGATOR: {
    REPAIR_NETWORK: 'Repair Network Terminal',
    ARCHIVE_FILES: 'Archive Research Files',
    SUBMIT_ATTENDANCE: 'Submit Attendance Logs',
    CHECK_CCTV: 'Check CCTV Feeds',
    RETRIEVE_PRINT: 'Retrieve Print Job',
    RESTOCK_LAB: 'Restock Lab Supplies',
    SETUP_AUDITORIUM: 'Set Up Auditorium',
    PLACE_LUNCH: 'Place Lunch Order',
  },
  DETECTIVE: {
    REPAIR_NETWORK: 'Repair Network Terminal',
    ARCHIVE_FILES: 'Archive Research Files',
    SUBMIT_ATTENDANCE: 'Submit Attendance Logs',
    CHECK_CCTV: 'Check CCTV Feeds',
    RETRIEVE_PRINT: 'Retrieve Print Job',
    RESTOCK_LAB: 'Restock Lab Supplies',
    SETUP_AUDITORIUM: 'Set Up Auditorium',
    PLACE_LUNCH: 'Place Lunch Order',
  },
  CONSPIRATOR: {
    REPAIR_NETWORK: 'Install Keylogger on Terminal',
    ARCHIVE_FILES: 'Corrupt Research Database',
    SUBMIT_ATTENDANCE: 'Falsify Attendance Records',
    CHECK_CCTV: 'Disable Security Cameras',
    RETRIEVE_PRINT: 'Intercept Keycard Printout',
    RESTOCK_LAB: 'Contaminate Chemical Reagents',
    SETUP_AUDITORIUM: 'Rig Stage Lights for Failure',
    PLACE_LUNCH: 'Poison Staff Cafeteria Food',
  },
  MASTERMIND: {
    REPAIR_NETWORK: 'Install Keylogger on Terminal',
    ARCHIVE_FILES: 'Corrupt Research Database',
    SUBMIT_ATTENDANCE: 'Falsify Attendance Records',
    CHECK_CCTV: 'Disable Security Cameras',
    RETRIEVE_PRINT: 'Intercept Keycard Printout',
    RESTOCK_LAB: 'Contaminate Chemical Reagents',
    SETUP_AUDITORIUM: 'Rig Stage Lights for Failure',
    PLACE_LUNCH: 'Poison Staff Cafeteria Food',
  }
}

/* Area → world [x, z] (matches CampusMap building positions) */
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

/* GDD §10.3 task type icons */
const TASK_ICONS = {
  REPAIR_NETWORK:   '🔧',
  ARCHIVE_FILES:    '📁',
  SUBMIT_ATTENDANCE:'📋',
  CHECK_CCTV:       '📹',
  RETRIEVE_PRINT:   '🖨️',
  RESTOCK_LAB:      '🧪',
  SETUP_AUDITORIUM: '🎭',
  PLACE_LUNCH:      '🍽️',
  FAKE_TASK:        '❓',
  DEFAULT:          '⚙️',
}

/* ── Sparkle particle system for task completion ── */
function CompletionSparkle({ position }) {
  const groupRef = useRef()
  const particles = useRef(
    Array.from({ length: 16 }, (_, i) => ({
      angle: (i / 16) * Math.PI * 2,
      speed: 2 + Math.random() * 2,
      vy:    1.5 + Math.random() * 2,
      r:     0.06 + Math.random() * 0.08,
      life:  1.0,
    }))
  )
  const meshRefs = useRef([])

  useFrame((_, delta) => {
    particles.current.forEach((p, i) => {
      p.life -= delta * 0.8
      if (!meshRefs.current[i]) return
      const mesh = meshRefs.current[i]
      mesh.position.x = Math.cos(p.angle) * p.speed * (1.0 - p.life)
      mesh.position.y = p.vy * (1.0 - p.life)
      mesh.position.z = Math.sin(p.angle) * p.speed * (1.0 - p.life)
      mesh.material.opacity = Math.max(0, p.life * 1.2)
      mesh.scale.setScalar(Math.max(0.01, p.life))
    })
  })

  return (
    <group ref={groupRef} position={position}>
      {particles.current.map((p, i) => (
        <mesh key={i} ref={el => (meshRefs.current[i] = el)}>
          <sphereGeometry args={[p.r, 6, 6]} />
          <meshBasicMaterial color="#f59e0b" transparent opacity={1} />
        </mesh>
      ))}
    </group>
  )
}

/* ── Bright single ring pulse when player enters zone ── */
function ArrivalPulse({ position }) {
  const [life, setLife] = useState(1.0)

  useFrame((_, delta) => {
    setLife(l => Math.max(0, l - delta * 1.5))
  })

  if (life <= 0) return null

  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[2.5, 3.5, 48]} />
      <meshBasicMaterial
        color="#10b981"
        transparent
        opacity={life * 0.9}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  )
}

/* ── Single Task Zone ── */
function SingleTaskZone({ task }) {
  const ringRef      = useRef()
  const innerRef     = useRef()
  const iconPlaneRef = useRef()

  const [showSparkle, setShowSparkle] = useState(false)
  const [showArrivalPulse, setShowArrivalPulse] = useState(false)
  const wasCompleted = useRef(task.completed)

  // Track E-key hold state in a ref to avoid re-render churn inside useFrame.
  // VirtualControls fires window keydown/keyup with code:'KeyE', so one listener covers both.
  const isInteracting  = useRef(false)
  const wasInteracting = useRef(false)   // used to detect the exact release frame

  const playerPosition = useGameStore((s) => s.playerPosition)
  const ws             = useGameStore((s) => s.ws)
  const updateTask     = useGameStore((s) => s.updateTask)
  const activeTaskId   = useGameStore((s) => s.activeTaskId)
  const role           = useGameStore((s) => s.role)

  const [ax, az] = AREA_WORLD_POSITIONS[task.location] || [0, 0]
  const zonePos  = [ax, 0.04, az]

  const dx     = playerPosition[0] - ax
  const dz     = playerPosition[2] - az
  const dist   = Math.sqrt(dx * dx + dz * dz)
  const isInZone = dist < 3.5

  const taskStartedId        = useGameStore((s) => s.taskStartedId)
  const setTaskStarted       = useGameStore((s) => s.setTaskStarted)
  const activeMinigameTask = useGameStore((s) => s.activeMinigameTask)
  const openMinigame         = useGameStore((s) => s.openMinigame)

  const isStarted = taskStartedId === task.task_id
  const isTracked = (isStarted || activeTaskId === task.task_id) && !task.completed
  const wasInZone = useRef(isInZone)

  /* Trigger on-enter arrival pulse when player steps into zone */
  useEffect(() => {
    if (isInZone && !wasInZone.current && isTracked) {
      setShowArrivalPulse(true)
      const t = setTimeout(() => setShowArrivalPulse(false), 800)
      return () => clearTimeout(t)
    }
    wasInZone.current = isInZone
  }, [isInZone, isTracked])

  /* Keydown / keyup listeners — covers keyboard 'e' and VirtualControls KeyE dispatch */
  useEffect(() => {
    const onDown = (e) => {
      if (e.code === 'KeyE' || e.key === 'e' || e.key === 'E') {
        isInteracting.current = true
      }
    }
    const onUp = (e) => {
      if (e.code === 'KeyE' || e.key === 'e' || e.key === 'E') {
        isInteracting.current = false
      }
    }
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup',   onUp)
    return () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup',   onUp)
    }
  }, [])

  /* Detect task completion → trigger sparkle once */
  useEffect(() => {
    if (task.completed && !wasCompleted.current) {
      wasCompleted.current = true
      setShowSparkle(true)
      const t = setTimeout(() => setShowSparkle(false), 1400)
      return () => clearTimeout(t)
    }
  }, [task.completed])

  /* Clear taskStartedId if player walks away from zone or task completes */
  useEffect(() => {
    if (isStarted && !isInZone) {
      setTaskStarted(null)
    }
  }, [isStarted, isInZone, setTaskStarted])

  useEffect(() => {
    if (task.completed && isStarted) {
      setTaskStarted(null)
    }
  }, [task.completed, isStarted, setTaskStarted])

  const floorDiscRef  = useRef()
  const accentBeamRef = useRef()

  /* Task interaction & progress streaming — only active if player clicked "START TASK" first */
  useFrame((_, delta) => {
    const t = Date.now() * 0.001
    const currentRingCol = isStarted
      ? (isInZone ? (isInteracting.current ? '#a78bfa' : '#10b981') : '#f59e0b')
      : '#475569'

    if (ringRef.current && ringRef.current.material) {
      const interactPulse = isStarted && isInZone && isInteracting.current
      ringRef.current.rotation.y = t * 0.45
      const pulse = interactPulse ? 1 + Math.sin(t * 8) * 0.09 : (isStarted && isInZone) ? 1 + Math.sin(t * 5) * 0.06 : 1.0
      ringRef.current.scale.setScalar(pulse)
      ringRef.current.material.color.set(currentRingCol)
      ringRef.current.material.opacity = isInZone ? 0.75 : (isStarted ? 0.45 : 0.22)
    }
    if (innerRef.current && innerRef.current.material) {
      innerRef.current.rotation.y = -t * 0.7
      innerRef.current.material.color.set(currentRingCol)
      innerRef.current.material.opacity = isInZone ? 0.55 : (isStarted ? 0.3 : 0.12)
    }
    if (floorDiscRef.current && floorDiscRef.current.material) {
      floorDiscRef.current.material.color.set(currentRingCol)
      floorDiscRef.current.material.opacity = isInZone ? 0.18 : 0.04
    }
    if (accentBeamRef.current && accentBeamRef.current.material) {
      accentBeamRef.current.material.color.set(currentRingCol)
      accentBeamRef.current.material.opacity = isInZone ? 0.65 : (isStarted ? 0.35 : 0.15)
    }
    if (iconPlaneRef.current && iconPlaneRef.current.material) {
      iconPlaneRef.current.rotation.y = t * 0.3
      iconPlaneRef.current.material.emissive.set(currentRingCol)
    }

    const activeNow = isStarted && isInZone && isInteracting.current && !task.completed

    /* Stream task progress when holding E inside zone */
    if (activeNow) {
      if (ws) {
        ws.send(JSON.stringify({
          action:  'TASK_PROGRESS',
          task_id: task.task_id,
          delta:   delta * 0.35, // ~3 seconds to fill 100%
        }))
      } else {
        const next = Math.min(1.0, (task.progress || 0) + delta * 0.35)
        updateTask({ ...task, progress: next, completed: next >= 1.0 })
      }

      /* Also open minigame modal if not already open */
      if (!activeMinigameTask) {
        openMinigame(task)
      }
    }

    /* Send TASK_RESET when E is released or player exits zone before completion (only if minigame is not active) */
    if (wasInteracting.current && !activeNow && !task.completed && !activeMinigameTask) {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          action:  'TASK_RESET',
          task_id: task.task_id,
        }))
      } else {
        updateTask({ ...task, progress: 0.0 })
      }
    }

    wasInteracting.current = !!activeNow
  })

  if (task.completed && !showSparkle) return null

  const roleKey = (role && TASK_NAMES[role.toUpperCase()]) ? role.toUpperCase() : 'INVESTIGATOR'
  const ringCol = isInZone ? '#10b981' : (isStarted ? '#f59e0b' : '#475569')

  return (
    <group position={zonePos}>
      {/* ── Completion sparkle ── */}
      {showSparkle && <CompletionSparkle position={[0, 0.1, 0]} />}

      {/* ── On-Enter Arrival Pulse ── */}
      {showArrivalPulse && <ArrivalPulse position={[0, 0.08, 0]} />}

      {/* ── Sky-High Always-Visible Light Pillar for Tracked Task ── */}
      {isTracked && (
        <group position={[0, 0, 0]}>
          <mesh position={[0, 30, 0]}>
            <cylinderGeometry args={[0.3, 0.6, 60, 16, 1, true]} />
            <meshBasicMaterial
              color={isInZone ? "#10b981" : "#a78bfa"}
              transparent
              opacity={0.35 + Math.sin(Date.now() * 0.006) * 0.12}
              blending={THREE.AdditiveBlending}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
            <ringGeometry args={[3.2, 4.2, 48]} />
            <meshBasicMaterial
              color={isInZone ? "#10b981" : "#8b5cf6"}
              transparent
              opacity={0.4 + Math.sin(Date.now() * 0.006) * 0.15}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
        </group>
      )}

      {/* ── 3D Waypoint UI Badge ── */}
      {isTracked && (
        <Html position={[0, 4.5, 0]} center distanceFactor={14}>
          <div className={`game-waypoint-marker ${isInZone ? 'arrived' : ''}`}>
            <div className="waypoint-label">
              {isInZone ? "🎯 YOU'VE ARRIVED" : (TASK_NAMES[roleKey][task.task_type] || task.name)}
            </div>
            <div className="waypoint-distance">{isInZone ? "HERE!" : `${Math.round(dist)}m`}</div>
            <div className="waypoint-arrow">▼</div>
          </div>
        </Html>
      )}

      {/* ── "Hold E" HUD prompt — visible ONLY when task is started, inside zone, and not done ── */}
      {isStarted && isInZone && !task.completed && (
        <Html position={[0, 2.2, 0]} center distanceFactor={10}>
          <div className="task-interact-prompt arrived-prompt">
            {isInteracting.current ? '⚡ Interacting…' : '🎯 You\'ve Arrived — Hold [E]'}
          </div>
        </Html>
      )}

      {/* ── Outer rotating ring ── */}
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.5, 3.0, 64]} />
        <meshBasicMaterial
          color={ringCol}
          transparent
          opacity={isInZone ? 0.65 : 0.28}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* ── Second inner ring (counter-spin) ── */}
      <mesh ref={innerRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.4, 1.8, 64]} />
        <meshBasicMaterial
          color={ringCol}
          transparent
          opacity={isInZone ? 0.5 : 0.14}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* ── Floor fill disc ── */}
      <mesh ref={floorDiscRef} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[2.5, 64]} />
        <meshBasicMaterial
          color={ringCol}
          transparent
          opacity={isInZone ? 0.12 : 0.04}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* ── Vertical accent beam ── */}
      <mesh ref={accentBeamRef} position={[0, 1.6, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 3.2, 8]} />
        <meshBasicMaterial
          color={ringCol}
          transparent
          opacity={isInZone ? 0.55 : 0.18}
        />
      </mesh>

      {/* ── Floating icon disc (billboard) ── */}
      <mesh ref={iconPlaneRef} position={[0, 2.8, 0]}>
        <cylinderGeometry args={[0.55, 0.55, 0.08, 32]} />
        <meshStandardMaterial
          color={isInZone ? '#22c55e' : '#1a1a2e'}
          emissive={ringCol}
          emissiveIntensity={isInZone ? 0.8 : 0.3}
          roughness={0.2}
          metalness={0.6}
        />
      </mesh>

      {/* ── Point light ── */}
      <pointLight
        color={ringCol}
        intensity={isInZone ? 1.2 : 0.4}
        distance={isInZone ? 7 : 4}
        decay={2}
        position={[0, 1, 0]}
      />

      {/* ── Progress bar (thin strip at ground level) ── */}
      {isInZone && !task.completed && (
        <mesh
          position={[-(2.4 * (1 - (task.progress || 0))) / 2, 0.06, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[2.4 * (task.progress || 0.01), 0.18]} />
          <meshBasicMaterial color="#22c55e" transparent opacity={0.9} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  )
}

export default function TaskZones() {
  const tasks = useGameStore((s) => s.tasks)
  return (
    <group>
      {tasks.map(task => (
        <SingleTaskZone key={task.task_id} task={task} />
      ))}
    </group>
  )
}
