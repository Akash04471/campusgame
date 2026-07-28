import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import useGameStore from '../../store/gameStore'

/* GDD §8.6 — NPC type color scheme */
const NPC_TYPE_COLORS = {
  FACULTY:   { body: '#1d4ed8', accent: '#93c5fd' },  // blue shirt, grey trousers
  STUDENT:   { body: '#7c3aed', accent: '#c4b5fd' },  // casual, varied by NPC id
  SECURITY:  { body: '#1e293b', accent: '#475569' },  // dark blue uniform
  STAFF:     { body: '#15803d', accent: '#86efac' },  // green vest
}

/* Per-NPC index offset so students have varied colors */
const STUDENT_BODY_PALETTE = [
  '#7c3aed', '#0f766e', '#b45309', '#0369a1', '#9f1239', '#4d7c0f',
]

const INTERACT_RADIUS = 3.2

function SingleNPC({ npc, npcIndex }) {
  const bodyRef  = useRef()
  const groupRef = useRef()

  const playerPosition = useGameStore((s) => s.playerPosition)
  const ws             = useGameStore((s) => s.ws)
  const showNpcDialog  = useGameStore((s) => s.showNpcDialog)

  /* Determine position from the npc object — backend can send [x,z] array or {x,y,z} */
  const pos = useMemo(() => {
    if (Array.isArray(npc.position)) {
      return [npc.position[0], 0, npc.position[1]]
    }
    if (npc.position && typeof npc.position === 'object') {
      return [npc.position.x ?? 0, 0, npc.position.z ?? 0]
    }
    return [0, 0, 0]
  }, [npc.position])

  /* Resolve type-specific colors */
  const npcType = (npc.npc_type || npc.type || 'STUDENT').toUpperCase()
  const colors  = NPC_TYPE_COLORS[npcType] || NPC_TYPE_COLORS.STUDENT
  const bodyColor = npcType === 'STUDENT'
    ? STUDENT_BODY_PALETTE[npcIndex % STUDENT_BODY_PALETTE.length]
    : colors.body

  /* Proximity check */
  const dx     = playerPosition[0] - pos[0]
  const dz     = playerPosition[2] - pos[2]
  const dist   = Math.sqrt(dx * dx + dz * dz)
  const isNear = dist < INTERACT_RADIUS

  useFrame((_, delta) => {
    const t = Date.now() * 0.001
    if (groupRef.current) {
      /* Smooth-lerp to server-authoritative position */
      groupRef.current.position.x = THREE.MathUtils.lerp(
        groupRef.current.position.x, pos[0], 0.08
      )
      groupRef.current.position.z = THREE.MathUtils.lerp(
        groupRef.current.position.z, pos[2], 0.08
      )
    }
    if (bodyRef.current) {
      /* Gentle idle bob */
      bodyRef.current.position.y = 1.0 + Math.sin(t * 0.9 + pos[0]) * 0.04
    }
  })

  const handleInteract = () => {
    if (!isNear) return
    if (ws) {
      ws.send(JSON.stringify({ action: 'NPC_INTERACT', npc_id: npc.npc_id }))
    }
    /* Optimistic placeholder while server responds */
    showNpcDialog({ npc_name: npc.name || npc.display_name || 'NPC', statement: '...' })
  }

  return (
    <group ref={groupRef} position={pos} onClick={handleInteract}>

      {/* ── Body ── */}
      <mesh ref={bodyRef} castShadow>
        <capsuleGeometry args={[0.27, 0.62, 8, 16]} />
        <meshStandardMaterial
          color={bodyColor}
          roughness={0.55}
          metalness={0.08}
        />
      </mesh>

      {/* ── Head ── */}
      <mesh position={[0, 1.22, 0]} castShadow>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial color="#fde68a" roughness={0.42} />
      </mesh>

      {/* ── Type badge collar dot (small sphere on chest) ── */}
      <mesh position={[0.14, 0.95, 0.22]}>
        <sphereGeometry args={[0.055, 8, 8]} />
        <meshStandardMaterial
          color={colors.accent}
          emissive={colors.accent}
          emissiveIntensity={0.6}
        />
      </mesh>

      {/* ── Interaction prompt — visible only when near ── */}
      {isNear && (
        <>
          {/* Dark backdrop */}
          <mesh position={[0, 1.78, 0.05]} rotation={[0, 0, 0]}>
            <planeGeometry args={[1.5, 0.36]} />
            <meshBasicMaterial color="#0a0813" transparent opacity={0.84} side={THREE.DoubleSide} />
          </mesh>
          {/* Glow outline */}
          <mesh position={[0, 1.78, 0.04]} rotation={[0, 0, 0]}>
            <planeGeometry args={[1.54, 0.40]} />
            <meshBasicMaterial color={bodyColor} transparent opacity={0.35} side={THREE.DoubleSide} />
          </mesh>
          {/* Attention ring on ground */}
          <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.55, 0.7, 40]} />
            <meshBasicMaterial color={bodyColor} transparent opacity={0.5} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
        </>
      )}

      {/* ── Ground shadow circle ── */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.42, 32]} />
        <meshBasicMaterial
          color={isNear ? bodyColor : '#1a1a2e'}
          transparent
          opacity={isNear ? 0.45 : 0.28}
          depthWrite={false}
        />
      </mesh>

      {/* ── Point light — only visible when near ── */}
      {isNear && (
        <pointLight color={colors.accent} intensity={0.5} distance={4.0} decay={2} />
      )}
    </group>
  )
}

export default function NPCCharacters() {
  const npcs = useGameStore((s) => s.npcs)
  return (
    <group>
      {npcs.map((npc, i) => (
        <SingleNPC key={npc.npc_id} npc={npc} npcIndex={i} />
      ))}
    </group>
  )
}
