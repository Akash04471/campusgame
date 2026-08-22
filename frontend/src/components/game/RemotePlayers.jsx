import React, { useRef, useEffect, useMemo, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import useGameStore from '../../store/gameStore'
import { StudentBody } from './Player'

/* ── Inlined from Player.jsx (getUniqueOutfit is not a named export) ── */
const _OUTFIT_COLORS   = ['#3b82f6', '#22c55e', '#ec4899', '#f97316', '#a855f7', '#06b6d4', '#14b8a6', '#ef4444']
const _HAIR_COLORS     = ['#1a0a00', '#2a1500', '#0a0a0a', '#1a0800', '#3b2512']
const _SKIN_COLORS     = ['#f5c5a0', '#e8b88a', '#f0d0b0', '#c8a070', '#e8c090']

function getUniqueOutfit(playerId) {
  const index = parseInt(playerId || '0') % _OUTFIT_COLORS.length
  return {
    shirt: _OUTFIT_COLORS[index],
    pants: _OUTFIT_COLORS[(index + 2) % _OUTFIT_COLORS.length],
    skin:  _SKIN_COLORS[index % _SKIN_COLORS.length],
    hair:  _HAIR_COLORS[index % _HAIR_COLORS.length],
  }
}

/* ─────────────────────────────────────────────────────────────
   SINGLE REMOTE PLAYER
   Renders one entry from `otherPlayers` as a fully-articulated
   StudentBody mesh.  Position and rotation are smoothly lerped
   every frame — identical lerp factor used in NPCCharacters.jsx
   SingleNPC (0.08 / THREE.MathUtils.lerp).
   ───────────────────────────────────────────────────────────── */
function SingleRemotePlayer({ playerId, data }) {
  const groupRef   = useRef()
  const bodyRef    = useRef()
  const targetPos  = useRef(new THREE.Vector3())
  const prevPos    = useRef(new THREE.Vector3())
  const targetRot  = useRef(0)

  const [isWalking, setIsWalking] = useState(false)
  const [isRunning, setIsRunning] = useState(false)

  /* Stable outfit derived from player id */
  const customOutfit = useMemo(() => getUniqueOutfit(playerId), [playerId])

  /* Per-player accent color (same palette as Player.jsx) */
  const baseColor = _OUTFIT_COLORS[parseInt(playerId || '0') % _OUTFIT_COLORS.length]

  /* ── Helper: decode position from {x,y,z} or [x,y,z] or [x,z] ── */
  const decodePos = (pos) => {
    if (!pos) return [0, 0, 0]
    if (Array.isArray(pos) && pos.length >= 3) return [pos[0], pos[1] ?? 0, pos[2]]
    if (Array.isArray(pos) && pos.length === 2) return [pos[0], 0, pos[1]]
    if (typeof pos.x === 'number') return [pos.x, pos.y ?? 0, pos.z ?? 0]
    return [0, 0, 0]
  }

  /* Snap to initial position on mount so there is no slide-in from origin */
  useEffect(() => {
    if (!groupRef.current) return
    const [px, py, pz] = decodePos(data.position)
    groupRef.current.position.set(px, py, pz)
    targetPos.current.set(px, py, pz)
    prevPos.current.copy(groupRef.current.position)
    if (data.rotation !== undefined) {
      groupRef.current.rotation.y = data.rotation
      targetRot.current = data.rotation
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])   // intentionally run once on mount only

  useFrame((_, delta) => {
    if (!groupRef.current) return

    /* Dynamically decode target position directly from data on frame tick */
    const [px, py, pz] = decodePos(data.position)
    targetPos.current.set(px, py, pz)
    if (data.rotation !== undefined) {
      targetRot.current = data.rotation
    }

    /* Responsive smooth lerp */
    groupRef.current.position.lerp(targetPos.current, 0.15)
    groupRef.current.rotation.y = THREE.MathUtils.lerp(
      groupRef.current.rotation.y,
      targetRot.current,
      0.18
    )

    /* Derive walking/running from per-frame position delta */
    const distMoved = groupRef.current.position.distanceTo(prevPos.current)
    const speed     = distMoved / (delta || 0.016)
    const walking   = speed > 0.05 && speed <= 6.5
    const running   = speed > 6.5

    if (isWalking !== walking) setIsWalking(walking)
    if (isRunning !== running) setIsRunning(running)

    prevPos.current.copy(groupRef.current.position)
  })

  const username = data.username || `Player ${playerId}`
  const role     = data.role || null

  /* Role-dot color — mirrors the same logic in Player.jsx */
  const dotColor =
    role === 'DETECTIVE'    ? '#06b6d4' :
    role === 'MASTERMIND'   ? '#ef4444' :
    role === 'INVESTIGATOR' ? '#10b981' :
    baseColor

  return (
    <group ref={groupRef} scale={[1.18, 1.18, 1.18]}>
      {/* ── Articulated student mesh ── */}
      <StudentBody
        role={role}
        isWalking={isWalking}
        isRunning={isRunning}
        bodyRef={bodyRef}
        customOutfit={customOutfit}
      />

      {/* ── Floating nameplate billboard (camera-facing via Html, same approach as TaskZones.jsx) ── */}
      <Html
        position={[0, 2.05, 0]}
        center
        distanceFactor={12}
        occlude={false}
        style={{ pointerEvents: 'none' }}
      >
        <div className="remote-player-nameplate">
          <span className="remote-player-name">{username}</span>
        </div>
      </Html>

      {/* ── Role indicator dot (same as local Player.jsx) ── */}
      <mesh position={[0, 1.95, 0]} renderOrder={9999}>
        <sphereGeometry args={[0.068, 12, 12]} />
        <meshBasicMaterial
          color={dotColor}
          depthTest={false}
          transparent
          opacity={0.85}
        />
      </mesh>

      {/* ── Ground shadow circle ── */}
      <mesh position={[0, 0.017, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.28, 24]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.32} depthWrite={false} />
      </mesh>

      {/* ── Colored ground glow ring ── */}
      <mesh position={[0, 0.025, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.28, 0.40, 32]} />
        <meshBasicMaterial
          color={baseColor}
          transparent
          opacity={0.38}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* ── Soft ambient glow light ── */}
      <pointLight
        position={[0, 1.8, 0]}
        intensity={2.0}
        distance={5}
        color={baseColor}
      />
    </group>
  )
}

/* ─────────────────────────────────────────────────────────────
   REMOTE PLAYERS — top-level component
   Maps over otherPlayers (human players + bots share the same
   store shape: player_id -> { position, rotation, username }).
   Bots (ids 9001-9003) and real remote players both render
   through this single path — no separate rendering path.
   ───────────────────────────────────────────────────────────── */
export default function RemotePlayers() {
  const otherPlayers = useGameStore((s) => s.otherPlayers)

  return (
    <group>
      {Object.entries(otherPlayers).map(([pid, data]) => (
        <SingleRemotePlayer
          key={pid}
          playerId={pid}
          data={data}
        />
      ))}
    </group>
  )
}
