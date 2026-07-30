import React, { useState, useEffect, useRef, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import useGameStore from '../../store/gameStore'
import MuteToggleButton from './MuteToggleButton'
import { StudentBody } from '../game/Player'
import audioManager from '../../utils/audioManager'
import { 
  Search, Eye, Zap, ShieldAlert, RotateCw, Home, CheckCircle, XCircle, 
  Trophy, BarChart3, FileText, Users, Award, Activity, ChevronRight, 
  Clock, Target, ListFilter, MapPin, UserCheck
} from 'lucide-react'

const ROLE_ICONS = {
  DETECTIVE: Search,
  INVESTIGATOR: Eye,
  MASTERMIND: Zap,
  CONSPIRATOR: ShieldAlert,
}

const ROLE_COLORS = {
  DETECTIVE: '#3b82f6',
  INVESTIGATOR: '#22c55e',
  MASTERMIND: '#ef4444',
  CONSPIRATOR: '#f97316',
}

function ConfettiCanvas({ winner }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const colors = winner === 'INVESTIGATORS'
      ? ['#22c55e', '#3b82f6', '#a3e635', '#38bdf8']
      : ['#ef4444', '#f97316', '#dc2626', '#fbbf24']

    const particles = Array.from({ length: 80 }, () => ({
      x: Math.random() * canvas.width,
      y: -20,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: (Math.random() - 0.5) * 3,
      vy: Math.random() * 3 + 2,
      opacity: 1,
    }))

    let frame
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      particles.forEach(p => {
        p.x += p.vx
        p.y += p.vy
        p.opacity -= 0.004
        ctx.globalAlpha = Math.max(0, p.opacity)
        ctx.fillStyle = p.color
        ctx.beginPath()
        ctx.rect(p.x, p.y, p.size, p.size * 0.6)
        ctx.fill()
        if (p.y > canvas.height) {
          p.y = -20
          p.x = Math.random() * canvas.width
          p.opacity = 1
        }
      })
      frame = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(frame)
  }, [winner])

  return <canvas ref={canvasRef} className="confetti-canvas" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1 }} />
}

/* ── Spinning 3D Character for reveal ── */
function SpinningCharacter({ role }) {
  const groupRef = useRef()
  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.6
    }
  })
  return (
    <group ref={groupRef} position={[0, -0.8, 0]} scale={[1.1, 1.1, 1.1]}>
      <StudentBody role={role} isWalking={false} isRunning={false} />
    </group>
  )
}

/* ── Mini 3D Canvas Character Reveal Card ── */
function CharacterRevealCard({ role, name, label, accentColor, badgeText, badgeSuccess, isSelected, onClick }) {
  return (
    <div 
      onClick={onClick}
      style={{
        background: isSelected ? 'linear-gradient(160deg, #1e293b 0%, #312e81 100%)' : 'linear-gradient(160deg, #0f172a 0%, #1e1b4b 100%)',
        borderRadius: '16px',
        border: isSelected ? `2.5px solid #38bdf8` : `2px solid ${accentColor}`,
        boxShadow: isSelected ? `0 0 35px #38bdf8aa, 0 4px 20px rgba(0,0,0,0.6)` : `0 0 28px ${accentColor}55, 0 4px 20px rgba(0,0,0,0.5)`,
        overflow: 'hidden',
        animation: 'flipIn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        position: 'relative',
        cursor: 'pointer',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        transform: isSelected ? 'scale(1.02)' : 'none',
      }}
      onMouseEnter={() => audioManager.playSfx('hover')}
    >
      {/* Role label */}
      <div style={{
        padding: '10px 16px 0',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <span style={{
          fontSize: '0.75rem', fontWeight: 'bold',
          fontFamily: 'Orbitron, sans-serif', color: accentColor,
          letterSpacing: '1px',
        }}>{label}</span>
        <span style={{
          fontSize: '0.7rem', padding: '3px 10px', borderRadius: '12px',
          background: badgeSuccess ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)',
          color: badgeSuccess ? '#f87171' : '#34d399',
          border: `1px solid ${badgeSuccess ? 'rgba(239,68,68,0.4)' : 'rgba(16,185,129,0.4)'}`,
          fontWeight: 'bold',
        }}>{badgeText}</span>
      </div>

      {/* 3D Character Canvas */}
      <div style={{ height: '180px', position: 'relative' }}>
        <div style={{
          position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
          width: '100px', height: '60px',
          background: `radial-gradient(ellipse at center, ${accentColor}44 0%, transparent 70%)`,
          borderRadius: '50%', zIndex: 0,
        }} />
        <Canvas
          camera={{ position: [0, 1.2, 3.5], fov: 45 }}
          gl={{ antialias: true, alpha: true }}
          style={{ background: 'transparent' }}
        >
          <ambientLight intensity={0.6} color="#e0e7ff" />
          <directionalLight position={[2, 4, 2]} intensity={1.4} color={accentColor} />
          <directionalLight position={[-2, 2, -1]} intensity={0.5} color="#bae6fd" />
          <pointLight position={[0, 3, 1]} intensity={2} distance={8} color={accentColor} />
          <Suspense fallback={null}>
            <SpinningCharacter role={role} />
          </Suspense>
        </Canvas>
      </div>

      {/* Identity text */}
      <div style={{
        padding: '12px 16px 14px',
        textAlign: 'center',
        borderTop: `1px solid ${accentColor}33`,
        background: `linear-gradient(180deg, transparent, ${accentColor}11)`,
      }}>
        <p style={{
          margin: 0, fontSize: '1.2rem', fontWeight: 'bold',
          color: '#f3f4f6', fontFamily: 'Orbitron, sans-serif',
          textShadow: `0 0 12px ${accentColor}`,
        }}>{name}</p>
        <p style={{
          margin: '4px 0 0', fontSize: '0.72rem',
          color: accentColor, fontFamily: 'monospace', letterSpacing: '2px',
        }}>TAP TO INSPECT DOSSIER</p>
      </div>
    </div>
  )
}

export default function GameResultsScreen() {
  const gameResult = useGameStore((s) => s.gameResult)
  const gamePhase = useGameStore((s) => s.gamePhase)
  const myRole = (useGameStore((s) => s.role) || 'INVESTIGATOR').toUpperCase()
  const investigationTimeline = useGameStore((s) => s.investigationTimeline) || []

  // Interactive Tab State: 'overview' | 'dossiers' | 'timeline' | 'tally'
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedPlayerId, setSelectedPlayerId] = useState(null)

  // Staggered reveal animation sequence step (0 to 4)
  const [revealStep, setRevealStep] = useState(0)

  useEffect(() => {
    if (gamePhase !== 'results' || !gameResult) return

    setRevealStep(0)
    const t1 = setTimeout(() => setAnimStep(1), 400)
    const t2 = setTimeout(() => setAnimStep(2), 800)
    const t3 = setTimeout(() => setAnimStep(3), 1200)
    const t4 = setTimeout(() => setAnimStep(4), 1600)

    function setAnimStep(s) {
      setRevealStep(s)
      audioManager.playSfx('blip')
    }

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
      clearTimeout(t4)
    }
  }, [gamePhase, gameResult])

  if (gamePhase !== 'results' || !gameResult) return null

  // Extract payload structure from server
  const {
    winner_faction,
    winningRoles = [],
    mastermind_id,
    conspirator_id,
    actualConspirator,
    actualMastermind,
    detective,
    investigators,
    investigatorVoteResult,
    detectiveCorrect,
    player_stats = [],
    all_roles = {},
    player_names = {},
  } = gameResult

  // Normalize actual Conspirator & Mastermind data
  const conspiratorName = actualConspirator?.name || (conspirator_id ? player_names[conspirator_id] || `Agent #${conspirator_id}` : 'None')
  const mastermindName = actualMastermind?.name || (mastermind_id ? player_names[mastermind_id] || `Agent #${mastermind_id}` : 'None')

  // Normalize Detective data
  const isDetectiveCorrect = detective?.correct ?? detectiveCorrect ?? false
  const detectiveGuessName = detective?.guessName || (detective?.guess ? player_names[detective.guess] || `Agent #${detective.guess}` : 'None')

  // Normalize Investigator majority data
  const invResult = investigators || investigatorVoteResult || {}
  const isInvSuccess = invResult.success ?? true
  const isInvCorrect = invResult.correct ?? invResult.investigators_correct ?? false
  const invFinalGuessName = invResult.finalGuessName || (invResult.finalGuess || invResult.final_guess ? player_names[invResult.finalGuess || invResult.final_guess] || `Agent #${invResult.finalGuess || invResult.final_guess}` : 'None')

  // Determine overall win condition
  const investigatorsWon = winner_faction === 'INVESTIGATORS' || winningRoles.includes('INVESTIGATOR') || winningRoles.includes('DETECTIVE')
  const sortedStats = [...player_stats].sort((a, b) => b.points_earned - a.points_earned)
  const mvpPlayer = sortedStats[0]

  // Currently inspected player for 3D Dossier modal
  const activeInspectedId = selectedPlayerId || (sortedStats[0]?.player_id || '1')
  const inspectedRole = all_roles[activeInspectedId] || 'INVESTIGATOR'
  const inspectedName = player_names[activeInspectedId] || `Agent #${activeInspectedId}`
  const inspectedStat = player_stats.find(s => String(s.player_id) === String(activeInspectedId))

  // Personal Outcome Card messaging
  const getPersonalOutcome = () => {
    switch (myRole) {
      case 'DETECTIVE':
        return isDetectiveCorrect
          ? { text: `You correctly identified the Conspirator! ${conspiratorName} was exposed.`, success: true }
          : { text: `You failed to identify the Conspirator. ${conspiratorName} evaded capture.`, success: false }
      case 'INVESTIGATOR':
        if (isInvSuccess && isInvCorrect) {
          return { text: `The Investigators correctly identified the Mastermind! ${mastermindName} was exposed.`, success: true }
        } else if (isInvSuccess && !isInvCorrect) {
          return { text: `The Investigators identified ${invFinalGuessName}, but the true Mastermind was ${mastermindName}. The Mastermind evaded capture.`, success: false }
        } else {
          return { text: `The Investigators could not reach a majority decision. The Mastermind, ${mastermindName}, evaded capture.`, success: false }
        }
      case 'CONSPIRATOR':
        return !isDetectiveCorrect
          ? { text: `You evaded capture! The Detective failed to identify you.`, success: true }
          : { text: `You were exposed! The Detective correctly identified you as the Conspirator.`, success: false }
      case 'MASTERMIND':
        return !isInvCorrect
          ? { text: `You evaded capture! The Investigators failed to identify you.`, success: true }
          : { text: `You were exposed! The Investigators correctly identified you as the Mastermind.`, success: false }
      default:
        return investigatorsWon
          ? { text: `The Investigators correctly identified the Mastermind and Conspirator.`, success: true }
          : { text: `The Mastermind and Conspirator evaded capture.`, success: false }
    }
  }

  const personalOutcome = getPersonalOutcome()

  const handleTabSwitch = (tab) => {
    audioManager.playSfx('click')
    setActiveTab(tab)
  }

  return (
    <div className="results-overlay" id="results-screen" style={{ position: 'fixed', inset: 0, background: 'rgba(3, 7, 18, 0.94)', backdropFilter: 'blur(12px)', zIndex: 9999, overflowY: 'auto', display: 'flex', justifyContent: 'center', padding: '24px 12px' }}>
      <ConfettiCanvas winner={investigatorsWon ? 'INVESTIGATORS' : 'VILLAINS'} />

      <div className="results-panel" style={{ position: 'relative', maxWidth: '920px', width: '100%', background: 'radial-gradient(circle at top, #1e1b4b 0%, #090d16 100%)', border: '1.5px solid rgba(99, 102, 241, 0.3)', borderRadius: '20px', boxShadow: '0 20px 60px rgba(0,0,0,0.8), 0 0 40px rgba(99,102,241,0.15)', padding: '28px', color: '#f3f4f6', zIndex: 10 }}>
        
        {/* Top Header Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '14px' }}>
          <div>
            <span style={{ fontSize: '0.72rem', fontFamily: 'Orbitron, sans-serif', color: '#06b6d4', letterSpacing: '2px', fontWeight: 'bold' }}>CLASSIFIED OPERATION DEBRIEF</span>
            <h1 style={{ margin: '4px 0 0', fontSize: '1.6rem', fontFamily: 'Orbitron, sans-serif', textTransform: 'uppercase', letterSpacing: '1px', background: 'linear-gradient(90deg, #ffffff 0%, #a5f3fc 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              TACTICAL RESULTS CONSOLE
            </h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <MuteToggleButton />
          </div>
        </div>

        {/* ── Interactive Debrief Navigation Tabs ── */}
        <div style={{ display: 'flex', gap: '8px', background: 'rgba(15, 23, 42, 0.7)', padding: '6px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '20px', overflowX: 'auto' }}>
          {[
            { id: 'overview', label: 'OVERVIEW & REVEALS', icon: Trophy },
            { id: 'dossiers', label: '3D PLAYER DOSSIERS', icon: Users },
            { id: 'tally', label: 'VOTING TALLY', icon: BarChart3 },
            { id: 'timeline', label: 'MATCH TIMELINE', icon: Clock },
          ].map(tab => {
            const TabIcon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => handleTabSwitch(tab.id)}
                style={{
                  flex: 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justify: 'center',
                  gap: '8px',
                  padding: '10px 16px',
                  borderRadius: '8px',
                  border: isActive ? '1px solid #06b6d4' : '1px solid transparent',
                  background: isActive ? 'linear-gradient(135deg, rgba(6,182,212,0.2) 0%, rgba(59,130,246,0.2) 100%)' : 'transparent',
                  color: isActive ? '#38bdf8' : '#94a3b8',
                  fontFamily: 'Orbitron, sans-serif',
                  fontSize: '0.78rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap'
                }}
              >
                <TabIcon size={15} />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* ── TAB 1: OVERVIEW & REVEALS ── */}
        {activeTab === 'overview' && (
          <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
            {/* Faction Victory Banner */}
            <div className={`results-banner ${investigatorsWon ? 'investigators-win' : 'villains-win'}`} style={{
              display: 'flex', alignItems: 'center', gap: '16px', padding: '18px 24px', borderRadius: '14px',
              background: investigatorsWon ? 'linear-gradient(135deg, rgba(34,197,94,0.18) 0%, rgba(6,182,212,0.18) 100%)' : 'linear-gradient(135deg, rgba(239,68,68,0.18) 0%, rgba(249,115,22,0.18) 100%)',
              border: investigatorsWon ? '1.5px solid rgba(34,197,94,0.5)' : '1.5px solid rgba(239,68,68,0.5)',
              boxShadow: investigatorsWon ? '0 0 30px rgba(34,197,94,0.25)' : '0 0 30px rgba(239,68,68,0.25)',
              marginBottom: '20px'
            }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: investigatorsWon ? '#22c55e' : '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', boxShadow: '0 4px 14px rgba(0,0,0,0.4)' }}>
                {investigatorsWon ? <Search size={26} /> : <ShieldAlert size={26} />}
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.3rem', fontFamily: 'Orbitron, sans-serif', color: investigatorsWon ? '#4ade80' : '#f87171' }}>
                  {investigatorsWon ? 'DETECTIVE & INVESTIGATORS VICTORY' : 'MASTERMIND & CONSPIRATOR VICTORY'}
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#cbd5e1', fontFamily: 'monospace' }}>
                  {investigatorsWon
                    ? 'The criminal syndicate was successfully identified and brought to justice.'
                    : 'The Mastermind and Conspirator evaded detection and executed their scheme.'}
                </p>
              </div>
            </div>

            {/* 3D Character Reveal Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '20px' }}>
              {revealStep >= 1 && (
                <CharacterRevealCard
                  role="CONSPIRATOR"
                  name={conspiratorName}
                  label="ACTUAL CONSPIRATOR"
                  accentColor="#f97316"
                  badgeText={isDetectiveCorrect ? 'EXPOSED' : 'EVADED'}
                  badgeSuccess={isDetectiveCorrect}
                  isSelected={selectedPlayerId === conspirator_id}
                  onClick={() => { setSelectedPlayerId(conspirator_id); setActiveTab('dossiers') }}
                />
              )}
              {revealStep >= 2 && (
                <CharacterRevealCard
                  role="MASTERMIND"
                  name={mastermindName}
                  label="ACTUAL MASTERMIND"
                  accentColor="#ef4444"
                  badgeText={isInvCorrect ? 'EXPOSED' : 'EVADED'}
                  badgeSuccess={isInvCorrect}
                  isSelected={selectedPlayerId === mastermind_id}
                  onClick={() => { setSelectedPlayerId(mastermind_id); setActiveTab('dossiers') }}
                />
              )}
            </div>

            {/* Personal Role Outcome Card */}
            {revealStep >= 3 && (
              <div style={{
                marginBottom: '20px', padding: '16px 20px', borderRadius: '12px',
                background: personalOutcome.success ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                border: personalOutcome.success ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(239, 68, 68, 0.4)',
                textAlign: 'center', animation: 'fadeIn 0.4s ease-out'
              }}>
                <span style={{ fontSize: '0.75rem', letterSpacing: '1px', color: personalOutcome.success ? '#34d399' : '#f87171', fontWeight: 'bold', fontFamily: 'Orbitron, sans-serif' }}>
                  YOUR ROLE OUTCOME ({myRole})
                </span>
                <p style={{ margin: '8px 0 0', fontSize: '1.05rem', color: '#f3f4f6', fontWeight: 'bold', fontFamily: "'JetBrains Mono', monospace" }}>
                  "{personalOutcome.text}"
                </p>
              </div>
            )}

            {/* MVP Badge Banner */}
            {mvpPlayer && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(90deg, rgba(234,179,8,0.15) 0%, rgba(249,115,22,0.15) 100%)', border: '1px solid rgba(234,179,8,0.4)', padding: '14px 20px', borderRadius: '12px', cursor: 'pointer' }} onClick={() => { setSelectedPlayerId(mvpPlayer.player_id); setActiveTab('dossiers') }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Award size={28} style={{ color: '#eab308' }} />
                  <div>
                    <span style={{ fontSize: '0.7rem', color: '#fde047', fontFamily: 'Orbitron, sans-serif', fontWeight: 'bold', letterSpacing: '1px' }}>OPERATION MVP</span>
                    <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 'bold', color: '#ffffff' }}>{mvpPlayer.username} ({mvpPlayer.points_earned} PTS)</p>
                  </div>
                </div>
                <span style={{ fontSize: '0.75rem', color: '#eab308', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  INSPECT DOSSIER <ChevronRight size={14} />
                </span>
              </div>
            )}
          </div>
        )}

        {/* ── TAB 2: 3D PLAYER DOSSIERS & PERFORMANCE MATRIX ── */}
        {activeTab === 'dossiers' && (
          <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '20px', alignItems: 'start' }}>
              {/* Standings Grid */}
              <div>
                <p style={{ margin: '0 0 12px', fontSize: '0.8rem', color: '#06b6d4', fontFamily: 'Orbitron, sans-serif', fontWeight: 'bold' }}>
                  CLICK ANY AGENT TO INSPECT 3D PROFILE
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {sortedStats.map((stat, i) => {
                    const RoleIconComp = ROLE_ICONS[stat.role] || Search
                    const isInspected = String(stat.player_id) === String(activeInspectedId)
                    const roleColor = ROLE_COLORS[stat.role] || '#8b5cf6'

                    return (
                      <div
                        key={stat.player_id}
                        onClick={() => { setSelectedPlayerId(stat.player_id); audioManager.playSfx('select') }}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '14px 18px', borderRadius: '12px',
                          background: isInspected ? 'rgba(6,182,212,0.15)' : 'rgba(15,23,42,0.6)',
                          border: isInspected ? '1.5px solid #06b6d4' : '1px solid rgba(255,255,255,0.08)',
                          boxShadow: isInspected ? '0 0 20px rgba(6,182,212,0.2)' : 'none',
                          cursor: 'pointer', transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={() => audioManager.playSfx('hover')}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <span style={{ fontSize: '1rem', fontWeight: 900, fontFamily: 'Orbitron, sans-serif', color: i === 0 ? '#eab308' : '#64748b', width: '20px' }}>
                            #{i + 1}
                          </span>
                          <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: `${roleColor}22`, border: `1px solid ${roleColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: roleColor }}>
                            <RoleIconComp size={20} />
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <strong style={{ fontSize: '1rem', color: '#f3f4f6' }}>{stat.username}</strong>
                              {i === 0 && <span style={{ background: 'rgba(234,179,8,0.2)', color: '#fde047', border: '1px solid rgba(234,179,8,0.4)', borderRadius: '4px', fontSize: '9px', padding: '1px 6px', fontWeight: 'bold' }}>MVP</span>}
                            </div>
                            <span style={{ fontSize: '0.75rem', color: roleColor, fontFamily: 'monospace', fontWeight: 'bold' }}>{stat.role}</span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', textAlign: 'right' }}>
                          <div>
                            <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', fontFamily: 'monospace' }}>TASKS / CLUES</span>
                            <span style={{ fontSize: '0.85rem', color: '#cbd5e1', fontWeight: 'bold' }}>{stat.tasks_completed} / {stat.evidence_collected}</span>
                          </div>
                          <div>
                            <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', fontFamily: 'monospace' }}>POINTS</span>
                            <span style={{ fontSize: '1.1rem', color: '#38bdf8', fontWeight: 900, fontFamily: 'Orbitron, sans-serif' }}>{stat.points_earned}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* 3D Model Inspector Side Panel */}
              <div style={{ background: 'rgba(15,23,42,0.85)', borderRadius: '16px', border: '1.5px solid rgba(255,255,255,0.1)', padding: '20px', textAlign: 'center' }}>
                <span style={{ fontSize: '0.72rem', color: '#06b6d4', fontFamily: 'Orbitron, sans-serif', fontWeight: 'bold', letterSpacing: '1px' }}>AGENT DOSSIER</span>
                <h3 style={{ margin: '4px 0 12px', fontSize: '1.2rem', color: '#ffffff' }}>{inspectedName}</h3>

                <div style={{ height: '220px', background: 'radial-gradient(circle at center, rgba(6,182,212,0.1) 0%, transparent 70%)', borderRadius: '12px', marginBottom: '16px', position: 'relative' }}>
                  <Canvas camera={{ position: [0, 1.2, 3.5], fov: 45 }}>
                    <ambientLight intensity={0.6} />
                    <directionalLight position={[2, 4, 2]} intensity={1.4} color={ROLE_COLORS[inspectedRole]} />
                    <Suspense fallback={null}>
                      <SpinningCharacter role={inspectedRole} />
                    </Suspense>
                  </Canvas>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left', fontFamily: 'monospace', fontSize: '0.82rem', color: '#cbd5e1' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '6px' }}>
                    <span>ASSIGNED ROLE:</span><strong style={{ color: ROLE_COLORS[inspectedRole] }}>{inspectedRole}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '6px' }}>
                    <span>SCORE:</span><strong style={{ color: '#38bdf8' }}>{inspectedStat?.points_earned || 0} pts</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '6px' }}>
                    <span>TASKS SECURED:</span><strong>{inspectedStat?.tasks_completed || 0}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>EVIDENCE CLUES:</span><strong>{inspectedStat?.evidence_collected || 0}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 3: VOTING & ACCUSATION TALLY ── */}
        {activeTab === 'tally' && (
          <div style={{ animation: 'fadeIn 0.4s ease-out', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ background: 'rgba(15,23,42,0.6)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', padding: '18px' }}>
              <h3 style={{ margin: '0 0 10px', color: '#38bdf8', fontSize: '1rem', fontFamily: 'Orbitron, sans-serif', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Search size={18} /> DETECTIVE ACCUSATION CHOICE
              </h3>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#cbd5e1', fontFamily: 'monospace' }}>
                Detective selected <strong style={{ color: '#f97316' }}>{detectiveGuessName}</strong> as the Conspirator → 
                <span style={{ marginLeft: '8px', color: isDetectiveCorrect ? '#4ade80' : '#f87171', fontWeight: 'bold' }}>
                  {isDetectiveCorrect ? '✓ ACCURATE EXPOSURE' : '✗ INCORRECT GUESS'}
                </span>
              </p>
            </div>

            <div style={{ background: 'rgba(15,23,42,0.6)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', padding: '18px' }}>
              <h3 style={{ margin: '0 0 10px', color: '#10b981', fontSize: '1rem', fontFamily: 'Orbitron, sans-serif', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={18} /> INVESTIGATOR MAJORITY DECISION
              </h3>
              <p style={{ margin: '0 0 12px', fontSize: '0.9rem', color: '#cbd5e1', fontFamily: 'monospace' }}>
                {isInvSuccess ? `Majority voted to accuse: ${invFinalGuessName}` : `${invResult.failMessage || 'No majority reached'}`} → 
                <span style={{ marginLeft: '8px', color: isInvCorrect ? '#4ade80' : '#f87171', fontWeight: 'bold' }}>
                  {isInvCorrect ? '✓ MASTERMIND CAPTURED' : '✗ MASTERMIND EVADED'}
                </span>
              </p>

              {invResult.voteCounts && (
                <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace' }}>VOTE TALLY BREAKDOWN:</span>
                  {Object.entries(invResult.voteCounts).map(([pid, count]) => (
                    <div key={pid} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ width: '140px', fontSize: '0.85rem', color: '#f3f4f6', fontFamily: 'monospace' }}>{player_names[pid] || `Agent #${pid}`}</span>
                      <div style={{ flex: 1, background: 'rgba(255,255,255,0.06)', borderRadius: '6px', height: '14px', overflow: 'hidden' }}>
                        <div style={{ width: `${(count / Math.max(1, sortedStats.length)) * 100}%`, background: '#10b981', height: '100%', borderRadius: '6px' }} />
                      </div>
                      <span style={{ fontSize: '0.85rem', color: '#34d399', fontWeight: 'bold', fontFamily: 'monospace' }}>{count} vote(s)</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB 4: MATCH TIMELINE LOG ── */}
        {activeTab === 'timeline' && (
          <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
            <h3 style={{ margin: '0 0 14px', color: '#f59e0b', fontSize: '1rem', fontFamily: 'Orbitron, sans-serif', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={18} /> CHRONOLOGICAL INCIDENT TIMELINE
            </h3>

            {investigationTimeline.length === 0 ? (
              <p style={{ color: '#64748b', fontStyle: 'italic', fontFamily: 'monospace', textAlign: 'center', padding: '40px 0' }}>
                No events recorded during this session.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '380px', overflowY: 'auto' }}>
                {investigationTimeline.slice().reverse().map((evt, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '14px', padding: '12px 16px', background: 'rgba(15,23,42,0.6)', borderLeft: '4px solid #38bdf8', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <Activity size={18} style={{ color: '#38bdf8', marginTop: 2 }} />
                    <div>
                      <strong style={{ fontSize: '0.9rem', color: '#f3f4f6' }}>{evt.title || evt.event_type}</strong>
                      <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: '#cbd5e1', fontFamily: 'monospace' }}>{evt.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Action Buttons ── */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '24px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px' }}>
          <button
            id="play-again-btn"
            onClick={() => { audioManager.playSfx('click'); window.location.reload() }}
            style={{
              flex: 1, padding: '14px', borderRadius: '12px',
              background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
              border: 'none', color: '#ffffff', fontFamily: 'Orbitron, sans-serif',
              fontSize: '0.9rem', fontWeight: 'bold', cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              boxShadow: '0 4px 16px rgba(6,182,212,0.4)', transition: 'transform 0.2s ease'
            }}
            onMouseEnter={() => audioManager.playSfx('hover')}
          >
            <RotateCw size={16} /> RE-DEPLOY MISSION (PLAY AGAIN)
          </button>
          <button
            id="main-menu-btn"
            onClick={() => { audioManager.playSfx('click'); window.location.reload() }}
            style={{
              padding: '14px 28px', borderRadius: '12px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.15)', color: '#cbd5e1',
              fontFamily: 'Orbitron, sans-serif', fontSize: '0.9rem',
              fontWeight: 'bold', cursor: 'pointer', display: 'inline-flex',
              alignItems: 'center', justifyContent: 'center', gap: '8px'
            }}
            onMouseEnter={() => audioManager.playSfx('hover')}
          >
            <Home size={16} /> RETURN TO HQ
          </button>
        </div>

      </div>
    </div>
  )
}

