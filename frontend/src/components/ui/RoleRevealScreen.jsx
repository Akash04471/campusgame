import React, { useState, useEffect, useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Stars, Html } from '@react-three/drei'
import * as THREE from 'three'
import useGameStore from '../../store/gameStore'
import audioManager from '../../utils/audioManager'
import { StudentBody, ROLE_OUTFIT } from '../game/Player'

/* ─────────────────────────────────────────────
   ROLE CONFIGS
   ───────────────────────────────────────────── */
const ROLE_CONFIGS = {
  DETECTIVE: {
    color: '#06b6d4',
    secondaryColor: '#3b82f6',
    icon: '🔍',
    title: 'DETECTIVE',
    tagline: 'DIGITAL FORENSICS & INVESTIGATION',
    bgStyle: 'radial-gradient(circle at center, rgba(6,182,212,0.06) 0%, #030712 100%)',
  },
  INVESTIGATOR: {
    color: '#10b981',
    secondaryColor: '#8b5cf6',
    icon: '🧩',
    title: 'INVESTIGATOR',
    tagline: 'TACTICAL OBSERVATION & EXPLORATION',
    bgStyle: 'radial-gradient(circle at center, rgba(16,185,129,0.06) 0%, #022c22 100%)',
  },
  CONSPIRATOR: {
    color: '#f97316',
    secondaryColor: '#dc2626',
    icon: '🔪',
    title: 'CONSPIRATOR',
    tagline: 'SABOTAGE & DECEPTIVE OPERATIONS',
    bgStyle: 'radial-gradient(circle at center, rgba(249,115,22,0.06) 0%, #1c0a00 100%)',
  },
  MASTERMIND: {
    color: '#ef4444',
    secondaryColor: '#7f1d1d',
    icon: '🧠',
    title: 'MASTERMIND',
    tagline: 'STRATEGIC DECEPTION & MANIPULATION',
    bgStyle: 'radial-gradient(circle at center, rgba(239,68,68,0.06) 0%, #0f0202 100%)',
  }
}

/* ─────────────────────────────────────────────
   WEB AUDIO SYNTH — Role Specific Ambience
   ───────────────────────────────────────────── */
function playRoleAudio(role) {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (!AudioContextClass) return
    const ac = new AudioContextClass()
    const now = ac.currentTime

    if (role === 'DETECTIVE') {
      const osc = ac.createOscillator()
      const filter = ac.createBiquadFilter()
      const gain = ac.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(440, now)
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.4)
      filter.type = 'lowpass'
      filter.frequency.setValueAtTime(2000, now)
      gain.gain.setValueAtTime(0.2, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2)
      osc.connect(filter)
      filter.connect(gain)
      gain.connect(ac.destination)
      osc.start()
      osc.stop(now + 1.3)
    } else if (role === 'INVESTIGATOR') {
      const gainNode = ac.createGain()
      gainNode.gain.setValueAtTime(0.12, now)
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 1.5)
      const osc = ac.createOscillator()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(110, now)
      osc.connect(gainNode)
      gainNode.connect(ac.destination)
      osc.start()
      osc.stop(now + 1.6)
    } else if (role === 'CONSPIRATOR') {
      const playThump = (timeOffset) => {
        const osc = ac.createOscillator()
        const gain = ac.createGain()
        osc.frequency.setValueAtTime(65, ac.currentTime + timeOffset)
        osc.frequency.exponentialRampToValueAtTime(25, ac.currentTime + timeOffset + 0.25)
        gain.gain.setValueAtTime(0.35, ac.currentTime + timeOffset)
        gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + timeOffset + 0.3)
        osc.connect(gain)
        gain.connect(ac.destination)
        osc.start(ac.currentTime + timeOffset)
        osc.stop(ac.currentTime + timeOffset + 0.35)
      }
      playThump(0)
      playThump(0.3)
    } else if (role === 'MASTERMIND') {
      const chords = [55, 65.4, 82.4]
      chords.forEach(freq => {
        const osc = ac.createOscillator()
        const gain = ac.createGain()
        osc.type = 'sawtooth'
        osc.frequency.value = freq
        gain.gain.setValueAtTime(0, now)
        gain.gain.linearRampToValueAtTime(0.08, now + 0.6)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 2.5)
        const lowpass = ac.createBiquadFilter()
        lowpass.type = 'lowpass'
        lowpass.frequency.value = 180
        osc.connect(lowpass)
        lowpass.connect(gain)
        gain.connect(ac.destination)
        osc.start()
        osc.stop(now + 2.6)
      })
    }
  } catch (e) {
    console.warn('Audio Context play failed', e)
  }
}

/* ─────────────────────────────────────────────
   3D HUMAN CHARACTER LINEUP SHOWCASE
   ───────────────────────────────────────────── */
const LINEUP_ROLES = [
  { role: 'DETECTIVE',    name: 'Detective',    color: '#06b6d4', pos: [-3.3, -1.05, -0.2] },
  { role: 'INVESTIGATOR', name: 'Investigator', color: '#10b981', pos: [-1.1, -1.05, 0.3] },
  { role: 'MASTERMIND',   name: 'Mastermind',   color: '#ef4444', pos: [1.1, -1.05, 0.3] },
  { role: 'CONSPIRATOR',  name: 'Conspirator',  color: '#f97316', pos: [3.3, -1.05, -0.2] },
]

function CharacterShowcaseBody({ role, isUserRole, position, color }) {
  const groupRef = useRef()
  useFrame(({ clock }) => {
    if (!groupRef.current) return
    const t = clock.getElapsedTime()
    groupRef.current.rotation.y = Math.sin(t * 0.7 + (role === 'DETECTIVE' ? 0 : role === 'INVESTIGATOR' ? 1.5 : role === 'MASTERMIND' ? 3.0 : 4.5)) * 0.22
  })

  return (
    <group position={position}>
      {/* Base Pedestal */}
      <mesh position={[0, -0.05, 0]}>
        <cylinderGeometry args={[0.7, 0.8, 0.12, 32]} />
        <meshStandardMaterial color="#0f172a" roughness={0.3} metalness={0.8} />
      </mesh>
      {/* Neon Glow Ring */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.6, 0.7, 32]} />
        <meshBasicMaterial color={color} side={THREE.DoubleSide} />
      </mesh>
      {/* Spotlight for character */}
      <pointLight position={[0, 3, 1]} intensity={1.8} color={color} distance={6} />

      {/* 3D Human Body Structure */}
      <group ref={groupRef} position={[0, 0.06, 0]}>
        <StudentBody role={role} isWalking={false} isRunning={false} />
      </group>

      {/* Role Badge directly ON TOP OF HEAD */}
      <Html position={[0, 2.2, 0]} center distanceFactor={7}>
        <div
          style={{
            padding: '6px 14px',
            borderRadius: '16px',
            background: isUserRole ? 'rgba(56, 189, 248, 0.35)' : 'rgba(15, 23, 42, 0.85)',
            border: isUserRole ? '2px solid #38bdf8' : `1.5px solid ${color}`,
            color: isUserRole ? '#38bdf8' : '#f1f5f9',
            fontSize: '13px',
            fontWeight: 'bold',
            fontFamily: "'Orbitron', sans-serif",
            boxShadow: isUserRole ? '0 0 20px rgba(56,189,248,0.7)' : `0 0 12px ${color}55`,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            backdropFilter: 'blur(8px)',
            userSelect: 'none',
          }}
        >
          <span>{role === 'DETECTIVE' ? '🔍' : role === 'INVESTIGATOR' ? '🧩' : role === 'MASTERMIND' ? '🧠' : '🔪'}</span>
          <span>{role === 'DETECTIVE' ? 'Detective' : role === 'INVESTIGATOR' ? 'Investigator' : role === 'MASTERMIND' ? 'Mastermind' : 'Conspirator'}</span>
          {isUserRole && (
            <span style={{ background: '#38bdf8', color: '#090d16', padding: '2px 6px', borderRadius: '8px', fontSize: '10px', fontWeight: 900 }}>YOU</span>
          )}
        </div>
      </Html>
    </group>
  )
}

function CharacterLineupStage({ userRole }) {
  return (
    <group>
      <gridHelper args={[16, 16, '#0284c7', '#1e293b']} position={[0, -1.12, 0]} />
      {LINEUP_ROLES.map((item) => (
        <CharacterShowcaseBody
          key={item.role}
          role={item.role}
          isUserRole={item.role === userRole}
          position={item.pos}
          color={item.color}
        />
      ))}
    </group>
  )
}

/* ─────────────────────────────────────────────
   3D BACKGROUND PARTICLES SYSTEM
   ───────────────────────────────────────────── */
function AmbientParticles({ roleColor }) {
  const pointsRef = useRef()
  const pCount = 200

  const positions = React.useMemo(() => {
    const arr = new Float32Array(pCount * 3)
    for (let i = 0; i < pCount; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 20
      arr[i * 3 + 1] = (Math.random() - 0.5) * 12
      arr[i * 3 + 2] = (Math.random() - 0.5) * 10
    }
    return arr
  }, [])

  useFrame((state) => {
    if (!pointsRef.current) return
    const t = state.clock.getElapsedTime()
    pointsRef.current.rotation.y = t * 0.03
    pointsRef.current.rotation.x = Math.sin(t * 0.05) * 0.05
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        color={roleColor}
        size={0.08}
        sizeAttenuation
        transparent
        opacity={0.35}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

/* ─────────────────────────────────────────────
   MAIN COMPONENT — RoleRevealScreen
   ───────────────────────────────────────────── */
export default function RoleRevealScreen({ onBegin }) {
  const rawRole = useGameStore((s) => s.role) || 'INVESTIGATOR'
  const role = String(rawRole).toUpperCase()
  const partnerInfo = useGameStore((s) => s.partnerInfo)
  const config = ROLE_CONFIGS[role] || ROLE_CONFIGS.INVESTIGATOR

  // Reveal timeline stages
  const [animStage, setAnimStage] = useState(0) // 0: Init fade, 1: Symbol, 2: Title, 3: Specs, 4: Abilities, 5: Quote, 6: Button active
  const [hoveredAbility, setHoveredAbility] = useState(null)

  useEffect(() => {
    // Play role audio on load
    playRoleAudio(role)

    // Stagger reveal animations sequentially (3.2 seconds total to full unlock)
    const timers = [
      setTimeout(() => setAnimStage(1), 300),   // Fade-in icon
      setTimeout(() => setAnimStage(2), 800),   // Animate game role title
      setTimeout(() => setAnimStage(3), 1400),  // Fade in role tagline/description
      setTimeout(() => setAnimStage(4), 2000),  // Stagger abilities
      setTimeout(() => setAnimStage(5), 2600),  // Quote & teammate reveal
      setTimeout(() => setAnimStage(6), 3200)   // Enable Continue button
    ]

    return () => timers.forEach(clearTimeout)
  }, [role])

  return (
    <div
      className="cu-rr-container"
      style={{
        '--role-theme': config.color,
        '--role-theme-sec': config.secondaryColor,
        background: config.bgStyle
      }}
    >
      {/* 3D Atmosphere Canvas with 4 Character Body Structures Lineup */}
      <div className="cu-rr-canvas">
        <Canvas camera={{ position: [0, 0.4, 5.2], fov: 50 }}>
          <ambientLight intensity={0.6} />
          <directionalLight position={[0, 6, 4]} intensity={1.2} />
          <Stars radius={60} depth={30} count={300} factor={1.5} saturation={0} fade speed={0.4} />
          <AmbientParticles roleColor={config.color} />
          <CharacterLineupStage userRole={role} />
        </Canvas>
      </div>

      {/* Futuristic Scan overlay lines */}
      <div className="cu-rr-scanlines" />

      {/* Main content overlay flow */}
      <div className="cu-rr-content-wrap">
        
        {/* Step 1: Big Symbol */}
        <div className={`cu-rr-crest ${animStage >= 1 ? 'cu-rr-visible' : ''}`}>
          <div className="cu-rr-ring" />
          <span className="cu-rr-crest-icon">{config.icon}</span>
        </div>

        {/* Step 2: Role title */}
        <div className={`cu-rr-title-block ${animStage >= 2 ? 'cu-rr-visible' : ''}`}>
          <p className="cu-rr-pretitle">IDENTITY DECLASSIFIED</p>
          <h1 className="cu-rr-title-text">{config.title}</h1>
          <p className="cu-rr-tagline-text">{config.tagline}</p>
        </div>

        {/* Step 3: Optional teammate reveal */}
        {partnerInfo && (partnerInfo.partner_name || partnerInfo.partner_id) && (
          <div className={`cu-rr-meta-block ${animStage >= 3 ? 'cu-rr-visible' : ''}`}>
            <div className="cu-rr-partner-reveal">
              <p className="cu-rr-partner-label">CONFIRMED TEAMMATE</p>
              <div className="cu-rr-partner-card">
                <span className="cu-rr-partner-icon">🤝</span>
                <div className="cu-rr-partner-info">
                  <span className="cu-rr-partner-name">{partnerInfo.partner_name || `Agent #${partnerInfo.partner_id}`}</span>
                  <span className="cu-rr-partner-role">{partnerInfo.partner_role || 'CO-CONSPIRATOR'}</span>
                </div>
                <span className="cu-rr-partner-warning">KEEP CLASSIFIED</span>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Begin action */}
        <div className={`cu-rr-actions ${animStage >= 4 ? 'cu-rr-visible' : ''}`} style={{ marginTop: 'auto', marginBottom: '30px' }}>
          <button className="cu-rr-btn" onClick={() => {
            audioManager.unlockAudio()
            if (onBegin) onBegin()
          }}>
            <span className="cu-rr-btn-glow" />
            <span className="cu-rr-btn-inner">BEGIN INVESTIGATION</span>
          </button>
        </div>

      </div>
    </div>
  )
}
