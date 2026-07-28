import React, { useRef, useEffect, useMemo, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import useGameStore from '../../store/gameStore'
import { generateGrid, findPath } from '../../utils/pathfinder'
import audioManager from '../../utils/audioManager'


/* ──────────────────────────────────────────────────────────────
   HUMAN STUDENT CHARACTER
   Full articulated body: head, torso, arms, legs, backpack
   Skin tones and clothing colors vary per player
   ────────────────────────────────────────────────────────────── */

const PLAYER_SPEED_BASE = 5
const SPRINT_MULT = 1.9
const WORLD_BOUNDS = 50

// Color themes per role
const ROLE_OUTFIT = {
  DETECTIVE:    { shirt: '#1e3a6e', pants: '#0f1f3a', skin: '#f5c5a0', hair: '#1a0a00' },
  INVESTIGATOR: { shirt: '#1e5e1e', pants: '#0f2f0f', skin: '#e8b88a', hair: '#2a1500' },
  MASTERMIND:   { shirt: '#5e1e1e', pants: '#2a0a0a', skin: '#f0d0b0', hair: '#0a0a0a' },
  CONSPIRATOR:  { shirt: '#3d2010', pants: '#1a0d00', skin: '#c8a070', hair: '#1a0800' },
  default:      { shirt: '#2a2a4a', pants: '#1a1a2a', skin: '#e8c090', hair: '#1a0800' },
}

/* ── 3D Human Student Mesh ── */
export { ROLE_OUTFIT }
export function StudentBody({ role, isWalking, isRunning, bodyRef, customOutfit }) {
  const outfit = customOutfit || ROLE_OUTFIT[role] || ROLE_OUTFIT.default
  const legSwingRef = useRef(0)

  useFrame((_, delta) => {
    if (isWalking || isRunning) {
      legSwingRef.current += delta * (isRunning ? 9 : 6)
    } else {
      legSwingRef.current *= 0.85
    }
  })

  const skin = outfit.skin
  const shirt = outfit.shirt
  const pants = outfit.pants
  const hair = outfit.hair
  const shoe = '#1a1a1a'

  return (
    <group ref={bodyRef}>
      {/* ── HEAD ── */}
      <group position={[0, 1.6, 0]}>
        {/* Skull */}
        <mesh castShadow>
          <sphereGeometry args={[0.18, 16, 16]} />
          <meshStandardMaterial color={skin} roughness={0.6} />
        </mesh>
        {/* Hair cap */}
        <mesh position={[0, 0.07, -0.01]} castShadow>
          <sphereGeometry args={[0.185, 12, 12, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
          <meshStandardMaterial color={hair} roughness={0.8} />
        </mesh>
        {/* Eyes */}
        <mesh position={[-0.07, 0.02, 0.16]}>
          <sphereGeometry args={[0.03, 8, 8]} />
          <meshStandardMaterial color="#1a1010" roughness={0.1} />
        </mesh>
        <mesh position={[0.07, 0.02, 0.16]}>
          <sphereGeometry args={[0.03, 8, 8]} />
          <meshStandardMaterial color="#1a1010" roughness={0.1} />
        </mesh>
        {/* Nose */}
        <mesh position={[0, -0.03, 0.17]}>
          <sphereGeometry args={[0.025, 6, 6]} />
          <meshStandardMaterial color={skin} roughness={0.6} />
        </mesh>
        {/* Ears */}
        <mesh position={[-0.18, 0, 0]}>
          <sphereGeometry args={[0.045, 8, 8]} />
          <meshStandardMaterial color={skin} roughness={0.6} />
        </mesh>
        <mesh position={[0.18, 0, 0]}>
          <sphereGeometry args={[0.045, 8, 8]} />
          <meshStandardMaterial color={skin} roughness={0.6} />
        </mesh>
        {/* Collar */}
        <mesh position={[0, -0.18, 0.02]}>
          <cylinderGeometry args={[0.11, 0.14, 0.08, 10]} />
          <meshStandardMaterial color={shirt} roughness={0.7} />
        </mesh>
      </group>

      {/* ── NECK ── */}
      <mesh position={[0, 1.42, 0]} castShadow>
        <cylinderGeometry args={[0.065, 0.07, 0.14, 10]} />
        <meshStandardMaterial color={skin} roughness={0.6} />
      </mesh>

      {/* ── TORSO (shirt) ── */}
      <mesh position={[0, 1.1, 0]} castShadow>
        <boxGeometry args={[0.38, 0.5, 0.22]} />
        <meshStandardMaterial color={shirt} roughness={0.7} />
      </mesh>

      {/* Shirt collar detail */}
      <mesh position={[0, 1.32, 0.08]}>
        <planeGeometry args={[0.12, 0.08]} />
        <meshStandardMaterial color="#ffffff" roughness={0.5} side={THREE.DoubleSide} />
      </mesh>

      {/* ── BELT area (waist) ── */}
      <mesh position={[0, 0.84, 0]}>
        <boxGeometry args={[0.40, 0.07, 0.24]} />
        <meshStandardMaterial color="#2a2010" roughness={0.5} metalness={0.2} />
      </mesh>

      {/* ── ARMS ── */}
      {/* Left upper arm */}
      <WalkingArm
        basePos={[-0.23, 1.22, 0]}
        pantsColor={shirt}
        skinColor={skin}
        isLeft={true}
        swingRef={legSwingRef}
        phase={0}
      />
      {/* Right upper arm */}
      <WalkingArm
        basePos={[0.23, 1.22, 0]}
        pantsColor={shirt}
        skinColor={skin}
        isLeft={false}
        swingRef={legSwingRef}
        phase={Math.PI}
      />

      {/* ── LEGS ── */}
      <WalkingLeg
        basePos={[-0.11, 0.62, 0]}
        pantsColor={pants}
        shoeColor={shoe}
        swingRef={legSwingRef}
        phase={0}
      />
      <WalkingLeg
        basePos={[0.11, 0.62, 0]}
        pantsColor={pants}
        shoeColor={shoe}
        swingRef={legSwingRef}
        phase={Math.PI}
      />

      {/* ── BACKPACK ── */}
      <mesh position={[0, 1.08, -0.18]} castShadow>
        <boxGeometry args={[0.26, 0.38, 0.14]} />
        <meshStandardMaterial color="#2a2a3a" roughness={0.8} />
      </mesh>
      {/* Backpack straps */}
      <mesh position={[-0.09, 1.08, -0.09]}>
        <boxGeometry args={[0.05, 0.36, 0.04]} />
        <meshStandardMaterial color="#1a1a2a" roughness={0.7} />
      </mesh>
      <mesh position={[0.09, 1.08, -0.09]}>
        <boxGeometry args={[0.05, 0.36, 0.04]} />
        <meshStandardMaterial color="#1a1a2a" roughness={0.7} />
      </mesh>
    </group>
  )
}

/* ── Animated Arm ── */
function WalkingArm({ basePos, pantsColor, skinColor, isLeft, swingRef, phase }) {
  const upperRef = useRef()
  const lowerRef = useRef()

  useFrame(() => {
    if (!upperRef.current) return
    const swing = Math.sin(swingRef.current + phase) * 0.35
    upperRef.current.rotation.x = swing
    if (lowerRef.current) {
      lowerRef.current.rotation.x = Math.abs(swing) * 0.5
    }
  })

  return (
    <group position={basePos}>
      {/* Shoulder joint */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.065, 8, 8]} />
        <meshStandardMaterial color={pantsColor} roughness={0.7} />
      </mesh>
      {/* Upper arm */}
      <group ref={upperRef} position={[0, -0.12, 0]}>
        <mesh castShadow>
          <capsuleGeometry args={[0.05, 0.24, 6, 8]} />
          <meshStandardMaterial color={pantsColor} roughness={0.7} />
        </mesh>
        {/* Forearm */}
        <group ref={lowerRef} position={[0, -0.2, 0]}>
          <mesh castShadow>
            <capsuleGeometry args={[0.042, 0.2, 5, 7]} />
            <meshStandardMaterial color={skinColor} roughness={0.5} />
          </mesh>
          {/* Hand */}
          <mesh position={[0, -0.16, 0]} castShadow>
            <sphereGeometry args={[0.048, 8, 8]} />
            <meshStandardMaterial color={skinColor} roughness={0.4} />
          </mesh>
        </group>
      </group>
    </group>
  )
}

/* ── Animated Leg ── */
function WalkingLeg({ basePos, pantsColor, shoeColor, swingRef, phase }) {
  const upperRef = useRef()
  const lowerRef = useRef()

  useFrame(() => {
    if (!upperRef.current) return
    const swing = Math.sin(swingRef.current + phase) * 0.4
    upperRef.current.rotation.x = swing
    if (lowerRef.current) {
      lowerRef.current.rotation.x = Math.max(0, -swing) * 0.6
    }
  })

  return (
    <group position={basePos}>
      <group ref={upperRef} position={[0, -0.18, 0]}>
        {/* Thigh */}
        <mesh castShadow>
          <capsuleGeometry args={[0.07, 0.28, 6, 8]} />
          <meshStandardMaterial color={pantsColor} roughness={0.8} />
        </mesh>
        <group ref={lowerRef} position={[0, -0.28, 0]}>
          {/* Shin */}
          <mesh castShadow>
            <capsuleGeometry args={[0.055, 0.26, 6, 8]} />
            <meshStandardMaterial color={pantsColor} roughness={0.8} />
          </mesh>
          {/* Shoe */}
          <mesh position={[0, -0.22, 0.04]} castShadow>
            <boxGeometry args={[0.1, 0.065, 0.18]} />
            <meshStandardMaterial color={shoeColor} roughness={0.4} metalness={0.1} />
          </mesh>
        </group>
      </group>
    </group>
  )
}

const getUniqueOutfit = (playerId) => {
  const colors = ['#3b82f6', '#22c55e', '#ec4899', '#f97316', '#a855f7', '#06b6d4', '#14b8a6', '#ef4444']
  const index = parseInt(playerId || '0') % colors.length
  const shirtColor = colors[index]
  const pantsColor = colors[(index + 2) % colors.length]
  const hairColors = ['#1a0a00', '#2a1500', '#0a0a0a', '#1a0800', '#3b2512']
  const hairColor = hairColors[index % hairColors.length]
  const skinColors = ['#f5c5a0', '#e8b88a', '#f0d0b0', '#c8a070', '#e8c090']
  const skinColor = skinColors[index % skinColors.length]

  return {
    shirt: shirtColor,
    pants: pantsColor,
    skin: skinColor,
    hair: hairColor,
  }
}

/* ── Other Player Character (Fully Articulated & Animated) ── */
function OtherPlayerCharacter({ data }) {
  const groupRef = useRef()
  const bodyRef = useRef()
  const prevPos = useRef(new THREE.Vector3())
  const targetPos = useRef(new THREE.Vector3())
  const targetRot = useRef(0)

  const [isWalking, setIsWalking] = useState(false)
  const [isRunning, setIsRunning] = useState(false)

  // Outfits and colors based on player ID
  const customOutfit = useMemo(() => getUniqueOutfit(data.player_id), [data.player_id])
  const colors = ['#3b82f6', '#22c55e', '#ec4899', '#f97316', '#a855f7', '#06b6d4', '#14b8a6', '#ef4444']
  const baseColor = colors[parseInt(data.player_id || '0') % colors.length]

  // Update target coordinates from WebSocket data
  useEffect(() => {
    if (data.position) {
      let px = 0, py = 0, pz = 0
      if (typeof data.position.x === 'number') {
        px = data.position.x
        py = data.position.y ?? 0
        pz = data.position.z ?? 0
      } else if (Array.isArray(data.position) && data.position.length >= 3) {
        px = data.position[0]
        py = data.position[1] ?? 0
        pz = data.position[2] ?? 0
      }
      targetPos.current.set(px, py, pz)
    }
    if (data.rotation !== undefined) {
      targetRot.current = data.rotation
    }
  }, [
    data.position?.x,
    data.position?.z,
    Array.isArray(data.position) ? data.position[0] : null,
    Array.isArray(data.position) ? data.position[2] : null,
    data.position,
    data.rotation
  ])

  // Initialize position on mount
  useEffect(() => {
    if (groupRef.current && data.position) {
      let px = 0, py = 0, pz = 0
      if (typeof data.position.x === 'number') {
        px = data.position.x
        py = data.position.y ?? 0
        pz = data.position.z ?? 0
      } else if (Array.isArray(data.position) && data.position.length >= 3) {
        px = data.position[0]
        py = data.position[1] ?? 0
        pz = data.position[2] ?? 0
      }
      groupRef.current.position.set(px, py, pz)
      targetPos.current.set(px, py, pz)
      prevPos.current.copy(groupRef.current.position)
    }
  }, [data.position])

  useFrame((_, delta) => {
    if (!groupRef.current) return

    // Interpolate (lerp) position and rotation for buttery-smooth multiplayer movement
    groupRef.current.position.lerp(targetPos.current, 0.15)
    groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetRot.current, 0.15)

    // Calculate speed based on position delta
    const currentPos = groupRef.current.position
    const distMoved = currentPos.distanceTo(prevPos.current)
    const speed = distMoved / (delta || 0.016)

    // Determine animation states based on speed thresholds
    const walking = speed > 0.1 && speed <= 6.5
    const running = speed > 6.5

    if (isWalking !== walking) setIsWalking(walking)
    if (isRunning !== running) setIsRunning(running)

    prevPos.current.copy(currentPos)
  })

  return (
    <group ref={groupRef} scale={[1.18, 1.18, 1.18]}>
      {/* Dynamic detailed Student Body */}
      <StudentBody
        role={data.role}
        isWalking={isWalking}
        isRunning={isRunning}
        bodyRef={bodyRef}
        customOutfit={customOutfit}
      />

      {/* Role indicator (only if known/revealed) or default name tag ring */}
      <mesh position={[0, 2.3, 0]} renderOrder={9999}>
        <sphereGeometry args={[0.08, 12, 12]} />
        <meshBasicMaterial
          color={
            data.role === 'DETECTIVE'
              ? '#06b6d4'
              : data.role === 'MASTERMIND'
              ? '#ef4444'
              : data.role === 'INVESTIGATOR'
              ? '#10b981'
              : baseColor
          }
          depthTest={false}
          transparent
          opacity={0.85}
        />
      </mesh>

      {/* Ground shadow ring */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.32, 24]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.35} />
      </mesh>

      {/* Role-colored / player-colored ground glow ring */}
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.32, 0.44, 32]} />
        <meshBasicMaterial
          color={data.role === 'MASTERMIND' || data.role === 'CONSPIRATOR' ? '#ef4444' : baseColor}
          transparent opacity={0.4}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* NO pointLight here — removed to stay within WebGL per-draw light limit */}
    </group>
  )
}

/* ── Ray-Box AABB Intersection for Camera Collision ── */
function intersectRayAABB(rayStart, rayDir, boxMin, boxMax) {
  let tmin = -Infinity
  let tmax = Infinity

  for (let i = 0; i < 3; i++) {
    const startCoord = i === 0 ? rayStart.x : (i === 1 ? rayStart.y : rayStart.z)
    const dirCoord = i === 0 ? rayDir.x : (i === 1 ? rayDir.y : rayDir.z)
    const boxMinCoord = i === 0 ? boxMin.x : (i === 1 ? boxMin.y : boxMin.z)
    const boxMaxCoord = i === 0 ? boxMax.x : (i === 1 ? boxMax.y : boxMax.z)

    if (Math.abs(dirCoord) < 1e-6) {
      if (startCoord < boxMinCoord || startCoord > boxMaxCoord) {
        return null
      }
    } else {
      const invD = 1.0 / dirCoord
      let t1 = (boxMinCoord - startCoord) * invD
      let t2 = (boxMaxCoord - startCoord) * invD

      if (t1 > t2) {
        const temp = t1
        t1 = t2
        t2 = temp
      }

      tmin = Math.max(tmin, t1)
      tmax = Math.min(tmax, t2)

      if (tmin > tmax) return null
    }
  }

  return tmin >= 0 ? tmin : null
}

/* ══════════════════════════════════════════════
   MAIN PLAYER
   ══════════════════════════════════════════════ */
export default function Player() {
  const groupRef = useRef()
  const bodyRef = useRef()
  const controlsRef = useRef()
  const { camera } = useThree()
  
  const [isWalkingState, setIsWalkingState] = useState(false)
  const [isRunningState, setIsRunningState] = useState(false)

  const velocity = useRef(new THREE.Vector3())
  const direction = useRef(new THREE.Vector3())
  const rotationRef = useRef(0)
  const movSendTimer = useRef(0)

  const role = useGameStore((s) => s.role)
  const campusAreas = useGameStore((s) => s.campusAreas)
  const setPlayerPosition = useGameStore((s) => s.setPlayerPosition)
  const setPlayerRotation = useGameStore((s) => s.setPlayerRotation)
  const setCurrentArea = useGameStore((s) => s.setCurrentArea)
  const setSprinting = useGameStore((s) => s.setSprinting)
  const tasks = useGameStore((s) => s.tasks)
  const updateTask = useGameStore((s) => s.updateTask)
  const ws = useGameStore((s) => s.ws)
  const otherPlayers = useGameStore((s) => s.otherPlayers)
  const clickTarget = useGameStore((s) => s.clickTarget)
  const setClickTarget = useGameStore((s) => s.setClickTarget)
  const setCameraYaw = useGameStore((s) => s.setCameraYaw)

  const initialPosition = useGameStore((s) => s.playerPosition) // [0, 0.5, -35]
  const prevPos = useRef(new THREE.Vector3(initialPosition[0], 0, initialPosition[2]))
  const lastFootstepPos = useRef([initialPosition[0], 0, initialPosition[2]])


  const pathWaypoints = useRef([])
  const currentWaypointIndex = useRef(0)
  const walkGrid = useMemo(() => generateGrid(campusAreas), [campusAreas])

  // Recalculate path when clickTarget changes
  useEffect(() => {
    if (clickTarget && groupRef.current) {
      const start = groupRef.current.position.clone()
      const end = new THREE.Vector3(clickTarget[0], 0.5, clickTarget[2])
      const path = findPath(start, end, walkGrid)
      if (path.length > 0) {
        pathWaypoints.current = path
        currentWaypointIndex.current = 0
      } else {
        pathWaypoints.current = []
        setClickTarget(null)
      }
    }
  }, [clickTarget, walkGrid, setClickTarget])

  const keysRef = useRef({
    forward: false, backward: false,
    left: false,    right: false,
    sprint: false,  interact: false,
  })

  useEffect(() => {
    const keyMap = {
      KeyW: 'forward',  ArrowUp: 'forward',
      KeyS: 'backward', ArrowDown: 'backward',
      KeyA: 'left',     ArrowLeft: 'left',
      KeyD: 'right',    ArrowRight: 'right',
      ShiftLeft: 'sprint', ShiftRight: 'sprint',
      KeyE: 'interact',
    }
    const down = (e) => {
      const a = keyMap[e.code]
      if (a) { keysRef.current[a] = true; if (a === 'sprint') setSprinting(true) }

      // Camera shortcuts
      if (controlsRef.current && groupRef.current) {
        const p = groupRef.current.position
        if (e.code === 'KeyR') {
          controlsRef.current.target.set(p.x, 0.5, p.z)
          camera.position.set(p.x, 18, p.z + 16)
          controlsRef.current.update()
        } else if (e.code === 'Digit1') {
          controlsRef.current.target.set(p.x, 0.5, p.z)
          camera.position.set(p.x, 32, p.z + 0.1)
          controlsRef.current.update()
        } else if (e.code === 'Digit2') {
          controlsRef.current.target.set(p.x, 0.5, p.z)
          camera.position.set(p.x, 22, p.z + 22)
          controlsRef.current.update()
        } else if (e.code === 'Digit3') {
          controlsRef.current.target.set(p.x, 0.5, p.z)
          camera.position.set(p.x, 15, p.z + 24)
          controlsRef.current.update()
        }
      }
    }
    const up = (e) => {
      const a = keyMap[e.code]
      if (a) { keysRef.current[a] = false; if (a === 'sprint') setSprinting(false) }
    }
    const handleDblClick = () => {
      if (controlsRef.current && groupRef.current) {
        const p = groupRef.current.position
        controlsRef.current.target.set(p.x, 0.5, p.z)
        camera.position.set(p.x, camera.position.y, p.z + 18)
        controlsRef.current.update()
      }
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('dblclick', handleDblClick)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('dblclick', handleDblClick)
    }
  }, [setSprinting, camera])

  // Set initial camera view once mounted
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.target.set(initialPosition[0], 0.5, initialPosition[2])
      camera.position.set(initialPosition[0], 18, initialPosition[2] + 16)
      controlsRef.current.update()
    }
  }, [camera, initialPosition])

  // AABB collision - ignores walkable areas and allows center gate passage
  function checkCollision(pos) {
    for (const area of campusAreas) {
      // Walkable areas that have no physical barriers blocking the player
      if (
        area.id === 'basketball_court' ||
        area.id === 'basketball_court_left' ||
        area.id === 'hockey_court' ||
        area.id === 'plants_trees' ||
        area.id === 'park_garden' ||
        area.id === 'birds_park' ||
        area.id === 'sitting_area' ||
        area.id === 'parking'
      ) {
        continue
      }
      if (area.id === 'front_gate' || area.id === 'back_gate') {
        const [ax, , az] = area.position
        const [aw, , ad] = area.size
        const inZ = pos.z > az - ad/2 - 0.5 && pos.z < az + ad/2 + 0.5
        // gap is in the middle of front/back gate (e.g. from x=-1.8 to x=1.8)
        const leftPillar = pos.x > ax - aw/2 - 0.5 && pos.x < ax - 1.8
        const rightPillar = pos.x > ax + 1.8 && pos.x < ax + aw/2 + 0.5
        if (inZ && (leftPillar || rightPillar)) {
          return area
        }
        continue
      }
      const [ax, , az] = area.position
      const [aw, , ad] = area.size
      if (pos.x > ax - aw/2 - 0.5 && pos.x < ax + aw/2 + 0.5 &&
          pos.z > az - ad/2 - 0.5 && pos.z < az + ad/2 + 0.5) {
        return area
      }
    }
    return null
  }

  const activeMinigameTask = useGameStore((s) => s.activeMinigameTask)
  const meetingActive = useGameStore((s) => s.meetingActive)
  const gamePhase = useGameStore((s) => s.gamePhase)

  const lastTaskSentRef = useRef(0)

  useFrame((_, delta) => {
    if (!groupRef.current) return
    if (activeMinigameTask || meetingActive || gamePhase === 'meeting' || gamePhase === 'accusation') {
      if (isWalkingState) setIsWalkingState(false)
      if (isRunningState) setIsRunningState(false)
      return
    }

    const keys = keysRef.current
    const speed = keys.sprint ? PLAYER_SPEED_BASE * SPRINT_MULT : PLAYER_SPEED_BASE

    const hasKeyboardInput = keys.forward || keys.backward || keys.left || keys.right
    if (hasKeyboardInput && clickTarget) {
      pathWaypoints.current = []
      setClickTarget(null)
    }

    direction.current.set(0, 0, 0)
    if (hasKeyboardInput) {
      if (keys.forward)  direction.current.z -= 1
      if (keys.backward) direction.current.z += 1
      if (keys.left)     direction.current.x -= 1
      if (keys.right)    direction.current.x += 1
    } else if (pathWaypoints.current.length > 0) {
      const currentPos = groupRef.current.position
      let targetWaypoint = pathWaypoints.current[currentWaypointIndex.current]
      const dx = targetWaypoint.x - currentPos.x
      const dz = targetWaypoint.z - currentPos.z
      const dist = Math.sqrt(dx * dx + dz * dz)

      if (dist < 0.35) {
        currentWaypointIndex.current++
        if (currentWaypointIndex.current >= pathWaypoints.current.length) {
          pathWaypoints.current = []
          setClickTarget(null)
        } else {
          targetWaypoint = pathWaypoints.current[currentWaypointIndex.current]
          direction.current.set(targetWaypoint.x - currentPos.x, 0, targetWaypoint.z - currentPos.z)
        }
      } else {
        direction.current.set(dx, 0, dz)
      }
    }

    const moving = direction.current.lengthSq() > 0
    const walking = moving && !keys.sprint
    const running = moving && keys.sprint

    // Trigger state change for student leg swings/animations only when needed
    if (isWalkingState !== walking) setIsWalkingState(walking)
    if (isRunningState !== running) setIsRunningState(running)

    if (moving) {
      direction.current.normalize()
      if (hasKeyboardInput) {
        const camAngle = Math.atan2(
          camera.position.x - groupRef.current.position.x,
          camera.position.z - groupRef.current.position.z
        )
        direction.current.applyAxisAngle(new THREE.Vector3(0, 1, 0), camAngle)
      }
      rotationRef.current = Math.atan2(direction.current.x, direction.current.z)
    }

    velocity.current.lerp(direction.current.clone().multiplyScalar(speed), 0.15)

    const candidate = groupRef.current.position.clone().addScaledVector(velocity.current, delta)
    candidate.x = THREE.MathUtils.clamp(candidate.x, -WORLD_BOUNDS, WORLD_BOUNDS)
    candidate.z = THREE.MathUtils.clamp(candidate.z, -WORLD_BOUNDS, WORLD_BOUNDS)
    candidate.y = 0

    if (!checkCollision(candidate)) {
      groupRef.current.position.copy(candidate)
    } else {
      const xOnly = groupRef.current.position.clone(); xOnly.x = candidate.x
      if (!checkCollision(xOnly)) groupRef.current.position.x = candidate.x
      const zOnly = groupRef.current.position.clone(); zOnly.z = candidate.z
      if (!checkCollision(zOnly)) groupRef.current.position.z = candidate.z

      // Clear path on collision to prevent sliding/getting stuck
      if (pathWaypoints.current.length > 0) {
        pathWaypoints.current = []
        setClickTarget(null)
      }
    }

    // Footstep audio trigger for local player
    if (moving && groupRef.current) {
      const curP = groupRef.current.position
      const dxF = curP.x - lastFootstepPos.current[0]
      const dzF = curP.z - lastFootstepPos.current[2]
      const distMoved = Math.sqrt(dxF * dxF + dzF * dzF)
      if (distMoved > 1.2) {
        audioManager.playFootstep()
        lastFootstepPos.current = [curP.x, curP.y, curP.z]
      }
    }

    groupRef.current.rotation.y = THREE.MathUtils.lerp(
      groupRef.current.rotation.y, rotationRef.current, 0.12
    )


    // Camera follow and target tracking
    const currentPos = groupRef.current.position
    if (controlsRef.current) {
      const deltaX = currentPos.x - prevPos.current.x
      const deltaZ = currentPos.z - prevPos.current.z

      // Move camera and OrbitControls target along with the player
      camera.position.x += deltaX
      camera.position.z += deltaZ
      
      controlsRef.current.target.x += deltaX
      controlsRef.current.target.z += deltaZ
      
      // Clamp target within safe boundaries
      controlsRef.current.target.x = THREE.MathUtils.clamp(controlsRef.current.target.x, -45, 45)
      controlsRef.current.target.z = THREE.MathUtils.clamp(controlsRef.current.target.z, -45, 45)
      controlsRef.current.target.y = 0.8

      controlsRef.current.update()

      // Calculate cameraYaw for FOV rendering on minimap
      const targetDirX = controlsRef.current.target.x - camera.position.x
      const targetDirZ = controlsRef.current.target.z - camera.position.z
      const yaw = Math.atan2(targetDirX, targetDirZ)
      setCameraYaw(yaw)

      // Perform camera collision check against building obstacles
      const playerHeadPos = new THREE.Vector3(currentPos.x, 1.2, currentPos.z)
      const idealCamPos = camera.position.clone()
      const rayDir = idealCamPos.clone().sub(playerHeadPos)
      const distance = rayDir.length()
      rayDir.normalize()

      let closestT = distance

      for (const area of campusAreas) {
        if (
          area.id === 'basketball_court' ||
          area.id === 'basketball_court_left' ||
          area.id === 'hockey_court' ||
          area.id === 'plants_trees' ||
          area.id === 'park_garden' ||
          area.id === 'birds_park' ||
          area.id === 'sitting_area' ||
          area.id === 'parking'
        ) {
          continue
        }

        const [bx, , bz] = area.position
        const [bw, bh, bd] = area.size

        const boxMin = new THREE.Vector3(bx - bw / 2, 0, bz - bd / 2)
        const boxMax = new THREE.Vector3(bx + bw / 2, bh + 0.5, bz + bd / 2)

        const t = intersectRayAABB(playerHeadPos, rayDir, boxMin, boxMax)
        if (t !== null && t < closestT) {
          closestT = t
        }
      }

      if (closestT < distance) {
        const safeT = Math.max(1.8, closestT - 0.5) // Keep camera buffer distance
        camera.position.copy(playerHeadPos).addScaledVector(rayDir, safeT)
      }
    }
    prevPos.current.copy(currentPos)

    // Dynamic FOV based on speed/sprint
    const targetFov = keys.sprint ? 72 : 60
    if (Math.abs(camera.fov - targetFov) > 0.1) {
      camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, 0.1)
      camera.updateProjectionMatrix()
    }

    // Update store
    const p = groupRef.current.position
    setPlayerPosition([p.x, p.y, p.z])
    setPlayerRotation(rotationRef.current)

    // Area detection
    let nearest = null, nearDist = Infinity
    for (const area of campusAreas) {
      const dx = p.x - area.position[0], dz = p.z - area.position[2]
      const d = Math.sqrt(dx * dx + dz * dz)
      const thresh = Math.max(area.size[0], area.size[2]) * 0.8
      if (d < thresh && d < nearDist) { nearDist = d; nearest = area.name }
    }
    setCurrentArea(nearest)

    // Task interaction
    if (keys.interact && nearest) {
      const task = tasks.find(t => t.location === nearest && !t.completed)
      if (task) {
        const now = Date.now()
        if (ws && now - lastTaskSentRef.current > 200) {
          ws.send(JSON.stringify({ action: 'TASK_PROGRESS', task_id: task.task_id, delta: 0.05 }))
          lastTaskSentRef.current = now
        } else if (!ws) {
          const next = Math.min(1, (task.progress || 0) + delta * 0.25)
          updateTask({ ...task, progress: next, completed: next >= 1 })
        }
      }
    }

    // Send movement to server
    movSendTimer.current += delta
    if (ws && movSendTimer.current > 0.1) {
      movSendTimer.current = 0
      ws.send(JSON.stringify({
        action: 'PLAYER_MOVE',
        position: { x: p.x, y: p.y, z: p.z },
        rotation: rotationRef.current,
        area: nearest || '',
      }))
    }
  })

  return (
    <>
      {/* Self player */}
      <group ref={groupRef} position={[initialPosition[0], 0, initialPosition[2]]} scale={[1.18, 1.18, 1.18]}>
        {/* Player character */}
        <StudentBody
          role={role}
          isWalking={isWalkingState}
          isRunning={isRunningState}
          bodyRef={bodyRef}
        />

        {/* Occlusion indicator: floats above the head, rendered on top of everything */}
        <mesh position={[0, 2.3, 0]} renderOrder={9999}>
          <sphereGeometry args={[0.12, 16, 16]} />
          <meshBasicMaterial
            color={
              role === 'DETECTIVE'
                ? '#06b6d4'
                : role === 'MASTERMIND'
                ? '#ef4444'
                : role === 'INVESTIGATOR'
                ? '#10b981'
                : '#f43f5e'
            }
            depthTest={false}
            transparent
            opacity={0.9}
          />
        </mesh>

        {/* Ground shadow ring */}
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.32, 24]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.35} />
        </mesh>

        {/* Role-colored ground glow */}
        <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.32, 0.44, 32]} />
          <meshBasicMaterial
            color={role === 'MASTERMIND' || role === 'CONSPIRATOR' ? '#ef4444' : '#f43f5e'}
            transparent opacity={0.5}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* High-intensity personal point light for player visibility — single light only */}
        <pointLight
          position={[0, 2.2, 0]}
          intensity={5}
          distance={8}
          color={role === 'DETECTIVE' ? '#a5f3fc' : '#fecdd3'}
          castShadow={false}
        />
      </group>

      {/* Other players */}
      {Object.entries(otherPlayers).map(([pid, data]) => (
        <OtherPlayerCharacter key={pid} data={{ ...data, player_id: pid }} />
      ))}

      {/* Orbit controls for click-and-drag, pan, and zoom */}
      <OrbitControls
        ref={controlsRef}
        enableDamping={true}
        dampingFactor={0.06}
        minDistance={3.5}
        maxDistance={85}
        maxPolarAngle={85 * Math.PI / 180}
        minPolarAngle={30 * Math.PI / 180}
      />
    </>
  )
}
