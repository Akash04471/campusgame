import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Stars } from '@react-three/drei'
import { gsap } from 'gsap'
import useGameStore from '../../store/gameStore'
import { Volume2, VolumeX, FileText, Eye, AlertTriangle, ChevronRight, Radio, MapPin, Clock, Zap, Lock, Key, Plus, Globe, RotateCw, Crown, Bot, User } from 'lucide-react'

/* ─────────────────────────────────────────────
   EXPORTS — used by App.jsx for WebSocket setup
   ───────────────────────────────────────────── */
export const getBackendHost = () => {
  const envUrl = import.meta.env.VITE_API_URL
  if (envUrl) {
    try { return new URL(envUrl).host } catch (e) {}
  }
  return `${window.location.hostname}:8000`
}

export const getWsProtocol = () => {
  const envUrl = import.meta.env.VITE_API_URL
  if (envUrl) {
    try {
      return new URL(envUrl).protocol === 'https:' ? 'wss' : 'ws'
    } catch (e) {}
  }
  return window.location.protocol === 'https:' ? 'wss' : 'ws'
}

const rawApiUrl = import.meta.env.VITE_API_URL
const API_BASE = rawApiUrl
  ? rawApiUrl.replace(/\/$/, '')
  : `${window.location.protocol}//${window.location.hostname}:8000`

/* ─────────────────────────────────────────────
   HELPER — API
   ───────────────────────────────────────────── */
async function apiFetch(path, opts = {}, token = null) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    let errMsg = `HTTP ${res.status}`
    const detail = data.detail
    if (typeof detail === 'string') {
      errMsg = detail
    } else if (Array.isArray(detail)) {
      errMsg = detail.map(d => `${d.loc ? d.loc.join('.') + ': ' : ''}${d.msg}`).join(', ')
    } else if (detail && typeof detail === 'object') {
      errMsg = detail.message || JSON.stringify(detail)
    }
    throw new Error(errMsg)
  }
  return data
}

/* ─────────────────────────────────────────────
   HOOK — Ambient Web Audio synth drone & blips
   ───────────────────────────────────────────── */
function useAmbientAudio() {
  const [muted, setMuted] = useState(true)
  const ctx = useRef(null)
  const nodes = useRef({})

  const toggle = useCallback(() => {
    if (muted) {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext
        const ac = new AudioCtx()
        ctx.current = ac
        const o1 = ac.createOscillator(); o1.type = 'sawtooth'; o1.frequency.value = 55
        const o2 = ac.createOscillator(); o2.type = 'triangle'; o2.frequency.value = 55.4
        const filter = ac.createBiquadFilter(); filter.type = 'lowpass'
        filter.frequency.value = 110; filter.Q.value = 3
        const gain = ac.createGain(); gain.gain.setValueAtTime(0, ac.currentTime)
        gain.gain.linearRampToValueAtTime(0.14, ac.currentTime + 1.5)
        o1.connect(filter); o2.connect(filter)
        filter.connect(gain); gain.connect(ac.destination)
        o1.start(); o2.start()
        nodes.current = { o1, o2, gain }
        setMuted(false)
      } catch {}
    } else {
      const { o1, o2, gain } = nodes.current
      if (gain && ctx.current) {
        gain.gain.linearRampToValueAtTime(0, ctx.current.currentTime + 0.4)
        setTimeout(() => {
          try { o1?.stop(); o2?.stop(); ctx.current?.close() } catch {}
          ctx.current = null; nodes.current = {}
        }, 500)
      }
      setMuted(true)
    }
  }, [muted])

  const playBlip = useCallback(() => {
    if (muted || !ctx.current) return
    try {
      const ac = ctx.current
      const osc = ac.createOscillator()
      const g = ac.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(880, ac.currentTime)
      osc.frequency.exponentialRampToValueAtTime(440, ac.currentTime + 0.08)
      g.gain.setValueAtTime(0.08, ac.currentTime)
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.08)
      osc.connect(g)
      g.connect(ac.destination)
      osc.start()
      osc.stop(ac.currentTime + 0.08)
    } catch {}
  }, [muted])

  useEffect(() => () => {
    try { nodes.current.o1?.stop(); nodes.current.o2?.stop(); ctx.current?.close() } catch {}
  }, [])

  return { muted, toggle, playBlip }
}

/* ─────────────────────────────────────────────
   HOOK — prefers-reduced-motion
   ───────────────────────────────────────────── */
function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handler = (e) => setReduced(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return reduced
}

/* ─────────────────────────────────────────────
   COMPONENT — Custom Cursor (GSAP quickTo + magnetic)
   ───────────────────────────────────────────── */
function CursorGlow() {
  const dotRef = useRef(null)
  const haloRef = useRef(null)
  const reducedMotion = usePrefersReducedMotion()

  useEffect(() => {
    if (reducedMotion) return

    const dot = dotRef.current
    const halo = haloRef.current
    if (!dot || !halo) return

    const moveDotX  = gsap.quickTo(dot,  'x', { duration: 0.1, ease: 'power3' })
    const moveDotY  = gsap.quickTo(dot,  'y', { duration: 0.1, ease: 'power3' })
    const moveHaloX = gsap.quickTo(halo, 'x', { duration: 0.45, ease: 'power3' })
    const moveHaloY = gsap.quickTo(halo, 'y', { duration: 0.45, ease: 'power3' })

    const onMove = (e) => {
      moveDotX(e.clientX - 4)
      moveDotY(e.clientY - 4)
      moveHaloX(e.clientX - 40)
      moveHaloY(e.clientY - 40)
    }
    window.addEventListener('mousemove', onMove)

    const grow   = () => { halo.classList.add('cu-cursor-grow');   halo.classList.add('cu-cursor-diff') }
    const shrink = () => { halo.classList.remove('cu-cursor-grow'); halo.classList.remove('cu-cursor-diff') }
    const interactives = document.querySelectorAll('button, a, [data-hover]')
    interactives.forEach(el => {
      el.addEventListener('mouseenter', grow)
      el.addEventListener('mouseleave', shrink)
    })

    const magnetBtns = document.querySelectorAll('[data-magnetic]')
    const magnetCleanups = []
    magnetBtns.forEach(btn => {
      const label = btn.querySelector('[data-magnetic-label]')
      const RADIUS = 120

      const onEnter = (e) => {
        const r = btn.getBoundingClientRect()
        const dx = e.clientX - (r.left + r.width  / 2)
        const dy = e.clientY - (r.top  + r.height / 2)
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < RADIUS) {
          const strength = (1 - dist / RADIUS) * 16
          gsap.to(btn,   { x: dx * strength * 0.1, y: dy * strength * 0.1, duration: 0.3, ease: 'power2.out' })
          if (label) gsap.to(label, { x: dx * strength * 0.15, y: dy * strength * 0.15, duration: 0.3, ease: 'power2.out' })
        }
      }
      const onLeave = () => {
        gsap.to(btn,   { x: 0, y: 0, duration: 0.7, ease: 'elastic.out(1, 0.4)' })
        if (label) gsap.to(label, { x: 0, y: 0, duration: 0.7, ease: 'elastic.out(1, 0.4)' })
      }
      btn.addEventListener('mousemove',  onEnter)
      btn.addEventListener('mouseleave', onLeave)
      magnetCleanups.push(() => {
        btn.removeEventListener('mousemove',  onEnter)
        btn.removeEventListener('mouseleave', onLeave)
      })
    })

    return () => {
      window.removeEventListener('mousemove', onMove)
      interactives.forEach(el => {
        el.removeEventListener('mouseenter', grow)
        el.removeEventListener('mouseleave', shrink)
      })
      magnetCleanups.forEach(fn => fn())
    }
  }, [reducedMotion])

  if (reducedMotion) return null

  return (
    <>
      <div ref={dotRef}  className="cu-cursor-dot" />
      <div ref={haloRef} className="cu-cursor-halo" />
    </>
  )
}

/* ─────────────────────────────────────────────
   COMPONENT — Loading Gate (cinematic intro)
   ───────────────────────────────────────────── */
const TITLE_CHARS = 'CAMPUS UNDERCOVER'.split('')

function LoadingGate({ onDone }) {
  const [phase, setPhase] = useState('typing')
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('wiping'), 2200)
    const t2 = setTimeout(() => { setVisible(false); onDone() }, 3000)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [onDone])

  if (!visible) return null

  return (
    <div className={`cu-gate ${phase === 'wiping' ? 'cu-gate-wipe' : ''}`}>
      <div className="cu-gate-grid" />
      <div className="cu-gate-scanlines" />
      <div className="cu-gate-content">
        <div className="cu-gate-crest">
          <div className="cu-gate-ring cu-gate-ring-outer" />
          <div className="cu-gate-ring cu-gate-ring-inner" />
          <span className="cu-gate-cross">✝</span>
        </div>
        <h1 className="cu-gate-title">
          {TITLE_CHARS.map((ch, i) => (
            <span key={i} className="cu-gate-char" style={{ animationDelay: `${i * 50}ms` }}>
              {ch === ' ' ? '\u00A0' : ch}
            </span>
          ))}
        </h1>
        <p className="cu-gate-sub">THE CHRIST MYSTERY</p>
        <div className="cu-gate-bar-track">
          <div className="cu-gate-bar-fill" />
        </div>
        <p className="cu-gate-label">ESTABLISHING SECURE CONNECTION...</p>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   COMPONENT — Cinematic Video Background
   ───────────────────────────────────────────── */
function CinematicVideoBackground({ bgRef }) {
  return (
    <div ref={bgRef} className="cu-video-bg">
      <video
        autoPlay
        loop
        muted
        playsInline
        className="cu-video-element"
        src="/LANDING_PAGE_VIDEO.mp4"
      />
      <div className="cu-bg-overlay-dark" />
      <div className="cu-bg-overlay-gradient" />
      <div className="cu-bg-overlay-vignette" />
      <div className="cu-bg-scanlines" />
      <div className="cu-bg-grain" />
    </div>
  )
}

/* ─────────────────────────────────────────────
   COMPONENT — R3F Peripheral Scene
   ───────────────────────────────────────────── */
function HeroR3FScene() {
  const meshRef = useRef()
  const count = 600
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      arr[i * 3]     = (Math.random() - 0.5) * 80
      arr[i * 3 + 1] = (Math.random() - 0.5) * 40
      arr[i * 3 + 2] = (Math.random() - 0.5) * 60
    }
    return arr
  }, [])

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.04
      meshRef.current.rotation.x += delta * 0.015
    }
  })

  return (
    <>
      <Stars radius={120} depth={60} count={600} factor={2.5} saturation={0} fade speed={0.25} />
      <points ref={meshRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={count}
            array={positions}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial size={0.12} color="#00f2fe" transparent opacity={0.45} sizeAttenuation />
      </points>
      <ambientLight intensity={0.05} />
    </>
  )
}

/* ─────────────────────────────────────────────
   COMPONENT — Eerie Canvas Background
   ───────────────────────────────────────────── */
function EerieCanvasBackground({ containerRef }) {
  const canvasRef = useRef(null)
  const rafRef    = useRef(null)
  const mouseRef  = useRef({ x: -9999, y: -9999 })
  const reducedMotion = usePrefersReducedMotion()

  useEffect(() => {
    if (reducedMotion) return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const resize = () => {
      canvas.width  = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    const container = containerRef?.current || canvas
    const onMouse = (e) => {
      const r = canvas.getBoundingClientRect()
      mouseRef.current = { x: e.clientX - r.left, y: e.clientY - r.top }
    }
    const onLeave = () => { mouseRef.current = { x: -9999, y: -9999 } }
    container.addEventListener('mousemove', onMouse)
    container.addEventListener('mouseleave', onLeave)

    const makeFog = (W, H) => Array.from({ length: 45 }, () => ({
      x:   Math.random() * W,
      y:   H * 0.4 + Math.random() * H * 0.6,
      r:   80 + Math.random() * 180,
      vx:  (Math.random() - 0.5) * 0.35,
      vy:  -0.04 - Math.random() * 0.08,
      opacity: 0.015 + Math.random() * 0.035,
      phase:   Math.random() * Math.PI * 2,
    }))
    let fog = makeFog(canvas.width, canvas.height)

    const makeRain = (W, H) => Array.from({ length: 80 }, () => ({
      x:     Math.random() * (W + 200) - 100,
      y:     Math.random() * H,
      len:   10 + Math.random() * 20,
      speed: 7 + Math.random() * 9,
      opacity: 0.02 + Math.random() * 0.05,
    }))
    let rain = makeRain(canvas.width, canvas.height)

    let lightningCountdown = 200 + Math.floor(Math.random() * 300)
    let lightningFrames = 0
    let lightningAlpha  = 0
    let scanX = 0
    let t = 0

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw)
      t++
      const W = canvas.width
      const H = canvas.height
      if (!W || !H) return

      if (fog[0] && fog[0].r > W * 0.5) { fog = makeFog(W, H); rain = makeRain(W, H) }

      ctx.clearRect(0, 0, W, H)

      const pulse = 0.5 + 0.5 * Math.sin(t * 0.018)
      const g1 = ctx.createRadialGradient(W / 2, H * 0.55, 0, W / 2, H * 0.55, W * 0.55)
      g1.addColorStop(0,   `rgba(160,0,0,${0.04 + pulse * 0.06})`)
      g1.addColorStop(0.5, `rgba(80,0,0,${0.02 + pulse * 0.025})`)
      g1.addColorStop(1,   'rgba(0,0,0,0)')
      ctx.fillStyle = g1
      ctx.fillRect(0, 0, W, H)

      fog.forEach(p => {
        p.x    += p.vx
        p.y    += p.vy
        p.phase += 0.005
        if (p.x < -p.r * 2)   p.x = W + p.r
        if (p.x > W + p.r * 2) p.x = -p.r
        if (p.y < -p.r * 2)   { p.y = H + 10; p.x = Math.random() * W }

        const a = p.opacity * (0.6 + 0.4 * Math.sin(p.phase))
        const gf = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r)
        gf.addColorStop(0, `rgba(140,150,170,${a})`)
        gf.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = gf
        ctx.beginPath()
        ctx.ellipse(p.x, p.y, p.r, p.r * 0.45, 0, 0, Math.PI * 2)
        ctx.fill()
      })

      ctx.save()
      ctx.strokeStyle = 'rgba(140,170,200,0.06)'
      ctx.lineWidth = 0.6
      rain.forEach(d => {
        d.y += d.speed
        d.x -= d.speed * 0.15
        if (d.y > H + 30) { d.y = -d.len; d.x = Math.random() * (W + 200) - 100 }
        ctx.beginPath()
        ctx.moveTo(d.x, d.y)
        ctx.lineTo(d.x - d.len * 0.15, d.y + d.len)
        ctx.globalAlpha = d.opacity
        ctx.stroke()
      })
      ctx.globalAlpha = 1
      ctx.restore()

      scanX = (scanX + 0.6) % W
      const sg = ctx.createLinearGradient(scanX - 70, 0, scanX + 3, 0)
      sg.addColorStop(0, 'rgba(0,255,80,0)')
      sg.addColorStop(0.6, 'rgba(0,255,80,0.004)')
      sg.addColorStop(1, 'rgba(0,255,80,0.015)')
      ctx.fillStyle = sg
      ctx.fillRect(scanX - 70, 0, 73, H)

      lightningCountdown--
      if (lightningCountdown <= 0 && lightningFrames === 0) {
        lightningFrames = 2 + Math.floor(Math.random() * 4)
        lightningAlpha  = 0.12 + Math.random() * 0.15
        lightningCountdown = 240 + Math.floor(Math.random() * 360)
      }
      if (lightningFrames > 0) {
        ctx.fillStyle = `rgba(210,220,255,${lightningAlpha})`
        ctx.fillRect(0, 0, W, H)
        lightningFrames--
      }

      const { x: mx, y: my } = mouseRef.current
      if (mx > 0 && mx < W) {
        const srcX = W / 2, srcY = H * 0.95
        const angle = Math.atan2(my - srcY, mx - srcX)
        const coneLen = Math.max(W, H) * 0.8
        const coneAngle = Math.PI / 10
        ctx.save()
        const coneGrad = ctx.createRadialGradient(srcX, srcY, 0, srcX, srcY, coneLen)
        coneGrad.addColorStop(0,   'rgba(0,242,254,0.08)')
        coneGrad.addColorStop(0.5, 'rgba(0,242,254,0.02)')
        coneGrad.addColorStop(1,   'rgba(0,0,0,0)')
        ctx.beginPath()
        ctx.moveTo(srcX, srcY)
        ctx.arc(srcX, srcY, coneLen, angle - coneAngle, angle + coneAngle)
        ctx.closePath()
        ctx.fillStyle = coneGrad
        ctx.fill()
        ctx.restore()
      }

      if (t % 2 === 0) {
        ctx.save()
        for (let i = 0; i < 1400; i++) {
          ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.04})`
          ctx.fillRect(Math.random() * W | 0, Math.random() * H | 0, 1, 1)
        }
        ctx.restore()
      }

      const gbot = ctx.createLinearGradient(0, H * 0.7, 0, H)
      gbot.addColorStop(0, 'rgba(0,0,0,0)')
      gbot.addColorStop(1, 'rgba(6,7,10,0.75)')
      ctx.fillStyle = gbot
      ctx.fillRect(0, 0, W, H)
    }

    draw()

    return () => {
      cancelAnimationFrame(rafRef.current)
      ro.disconnect()
      container.removeEventListener('mousemove', onMouse)
      container.removeEventListener('mouseleave', onLeave)
    }
  }, [reducedMotion, containerRef])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute', inset: 0,
        width: '100%', height: '100%',
        zIndex: 1, pointerEvents: 'none',
        display: reducedMotion ? 'none' : 'block',
      }}
    />
  )
}

/* ─────────────────────────────────────────────
   COMPONENT — NavBar
   ───────────────────────────────────────────── */
function NavBar({ auth, onBeginInvestigation, onLogout, muted, onToggleAudio }) {
  return (
    <nav className="cu-nav cu-nav-transparent">
      <div className="cu-nav-logo" data-hover>
        <span className="cu-nav-cross">✝</span>
        <span className="cu-nav-name">CAMPUS UNDERCOVER</span>
        <span className="cu-nav-tag">CLASSIFIED</span>
      </div>
      <div className="cu-nav-actions">
        <button className="cu-nav-audio-btn" onClick={onToggleAudio} title="Toggle ambient sound" data-hover style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
        </button>
        {auth ? (
          <div className="cu-nav-user-group">
            <span className="cu-nav-user-badge" data-hover>
              <span className="cu-auth-status-dot" style={{ background: '#22c55e', boxShadow: '0 0 5px rgba(34,197,94,0.6)' }} />
              AGENT // {auth.username}
            </span>
            <button className="cu-nav-cta" onClick={onBeginInvestigation} data-hover>ACCESS HQ</button>
            <button className="cu-nav-sub-btn" onClick={onLogout} title="Log Out" data-hover>DISCONNECT</button>
          </div>
        ) : (
          <button className="cu-nav-cta" onClick={onBeginInvestigation} data-hover>BEGIN INVESTIGATION</button>
        )}
      </div>
    </nav>
  )
}

/* ─────────────────────────────────────────────
   COMPONENT — Short & Crisp Tactical Intel Strip
   ───────────────────────────────────────────── */
function TacticalIntelStrip({ playBlip }) {
  const [activeChip, setActiveChip] = useState(0)

  const chips = [
    { label: 'INCIDENT', icon: FileText, text: 'Classified research project vanished from campus.' },
    { label: 'SUSPECTS', icon: Eye, text: '4 Secret Roles: Detective · Investigator · Mastermind · Conspirator' },
    { label: 'LOCKDOWN', icon: AlertTriangle, text: 'Uncover the truth before 5-minute clock expires.' },
  ]

  const handleNext = (idx) => {
    playBlip()
    setActiveChip(idx)
  }

  return (
    <div className="cu-tactical-strip" data-hover>
      <div className="cu-strip-pills">
        {chips.map((c, i) => {
          const ChipIcon = c.icon
          return (
            <button
              key={i}
              className={`cu-strip-pill ${activeChip === i ? 'cu-strip-pill--active' : ''}`}
              onClick={() => handleNext(i)}
              data-hover
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <ChipIcon size={12} />
              {c.label}
            </button>
          )
        })}
      </div>
      <p className="cu-strip-text" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <ChevronRight size={13} className="cu-strip-icon" /> {chips[activeChip].text}
      </p>
    </div>
  )
}


/* ─────────────────────────────────────────────
   COMPONENT — Single Full-Viewport Hero Launcher
   ───────────────────────────────────────────── */
function HeroSection({ auth, onBeginInvestigation, playBlip }) {
  const containerRef = useRef(null)
  const cardRef      = useRef(null)
  const spotRef      = useRef(null)
  const bgRef        = useRef(null)
  const [activeIntel, setActiveIntel] = useState(null)
  const reducedMotion = usePrefersReducedMotion()

  useEffect(() => {
    const container = containerRef.current
    const card      = cardRef.current
    if (!container || reducedMotion) return

    const handleMove = (e) => {
      const rect = container.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const cx = rect.width / 2
      const cy = rect.height / 2

      if (spotRef.current) {
        spotRef.current.style.background =
          `radial-gradient(circle 600px at ${x}px ${y}px, rgba(0,242,254,0.06) 0%, transparent 65%)`
      }

      if (card) {
        const rotateX = -((y - cy) / cy) * 8
        const rotateY = ((x - cx) / cx) * 10
        gsap.to(card, {
          rotateX,
          rotateY,
          duration: 0.4,
          ease: 'power2.out',
          transformPerspective: 1000,
        })
      }
    }

    const handleLeave = () => {
      if (card) {
        gsap.to(card, { rotateX: 0, rotateY: 0, duration: 0.8, ease: 'elastic.out(1, 0.4)' })
      }
    }

    container.addEventListener('mousemove', handleMove)
    container.addEventListener('mouseleave', handleLeave)
    return () => {
      container.removeEventListener('mousemove', handleMove)
      container.removeEventListener('mouseleave', handleLeave)
    }
  }, [reducedMotion])

  const intelItems = {
    servers: { title: 'NETWORK STATUS: NOMINAL', detail: 'WebSocket cluster active in ASIA-SOUTH1. 24ms ping. Zero dropped packets.' },
    active:  { title: 'TACTICAL OPERATION: ACTIVE', detail: '24 campus zones monitored. 16 autonomous NPCs patrolling. 4 secret player roles.' },
    suspects:{ title: 'CLASSIFIED CASE FILE: UNRESOLVED', detail: 'Mastermind unidentified. 5-minute match countdown begins on deployment.' },
  }

  const handleChipClick = (key) => {
    playBlip()
    setActiveIntel(c => c === key ? null : key)
  }

  return (
    <section ref={containerRef} className="cu-hero-fullscreen" id="hero">
      <CinematicVideoBackground bgRef={bgRef} />

      <div className="cu-hero-canvas-stars">
        <Canvas camera={{ position: [0, 0, 10], fov: 60 }} gl={{ antialias: true, alpha: true }}>
          <HeroR3FScene />
        </Canvas>
      </div>

      <EerieCanvasBackground containerRef={containerRef} />

      <div ref={spotRef} className="cu-hero-spotlight" />

      {/* ── Left Flank: Interactive Surveillance & Case File Radar Widget ── */}
      <div className="cu-tactical-flank-card cu-flank-left" data-hover>
        <div className="cu-flank-header">
          <span className="cu-flank-title" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Radio size={13} /> LIVE SURVEILLANCE
          </span>
          <span className="cu-flank-status-dot cu-dot-green" />
        </div>
        <div className="cu-radar-display">
          <div className="cu-radar-sweep" />
          <span className="cu-radar-blip cu-blip-red" style={{ top: '35%', left: '42%' }} title="Suspect P01" />
          <span className="cu-radar-blip cu-blip-cyan" style={{ top: '65%', left: '70%' }} title="Patrol NPC" />
        </div>
        <div className="cu-flank-chips">
          <button className="cu-flank-chip" onClick={() => handleChipClick('servers')} data-hover style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <FileText size={12} /> CASE DOSSIER #04471
          </button>
          <button className="cu-flank-chip" onClick={() => handleChipClick('active')} data-hover style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <MapPin size={12} /> 24 ZONES · 16 NPCs
          </button>
        </div>
      </div>

      {/* ── Right Flank: Operations Timer & Signal Radar Widget ── */}
      <div className="cu-tactical-flank-card cu-flank-right" data-hover>
        <div className="cu-flank-header">
          <span className="cu-flank-title" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Clock size={13} /> MATCH CONTROL
          </span>
          <span className="cu-flank-status-dot cu-dot-red" />
        </div>
        <div className="cu-timer-ring-display">
          <svg className="cu-timer-svg" viewBox="0 0 60 60">
            <circle cx="30" cy="30" r="24" className="cu-ring-bg" />
            <circle cx="30" cy="30" r="24" className="cu-ring-fill" />
          </svg>
          <span className="cu-ring-readout">05:00</span>
        </div>
        <div className="cu-flank-chips">
          <button className="cu-flank-chip cu-chip-alert" onClick={() => handleChipClick('suspects')} data-hover style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <AlertTriangle size={12} /> 5-MIN LOCKDOWN
          </button>
          <div className="cu-flank-chip cu-chip-signal" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Zap size={12} /> 24ms REGION PING
          </div>
        </div>
      </div>


      {/* Central Content */}
      <div className="cu-hero-center">

        <div className="cu-hero-badge-elegant" data-hover>
          <div className="cu-badge-line" />
          <span className="cu-badge-text-elegant">CHRIST UNIVERSITY · CLASSIFIED OPERATION</span>
          <div className="cu-badge-line" />
        </div>

        {/* Interactive 3D Title Card */}
        <div ref={cardRef} className="cu-hero-title-block cu-title-card-3d" data-hover>
          <h1 className="cu-hero-main-title">
            <span className="cu-title-campus glitch-text-hover">CAMPUS</span>
            <span className="cu-title-undercover glitch-text-hover">UNDERCOVER</span>
          </h1>

          <div className="cu-title-ornament">
            <div className="cu-ornament-line" />
            <span className="cu-ornament-cross">✝</span>
            <div className="cu-ornament-line" />
          </div>

          <p className="cu-hero-subtitle-elegant">
            T&nbsp;H&nbsp;E&nbsp;&nbsp;&nbsp;C&nbsp;H&nbsp;R&nbsp;I&nbsp;S&nbsp;T&nbsp;&nbsp;&nbsp;M&nbsp;Y&nbsp;S&nbsp;T&nbsp;E&nbsp;R&nbsp;Y
          </p>
        </div>

        {/* Short & Crisp Tactical Intel Strip */}
        <TacticalIntelStrip playBlip={playBlip} />

        {/* CTA button */}
        <div className="cu-hero-ctas-elegant">
          <button
            className="cu-btn-begin"
            onClick={onBeginInvestigation}
            id="begin-investigation-btn"
            data-hover
            data-magnetic
          >
            <span className="cu-btn-begin-glow" />
            <span className="cu-btn-begin-border" />
            <span className="cu-btn-begin-label" data-magnetic-label>
              ▶&nbsp;&nbsp;{auth ? 'ACCESS HQ LOBBY' : 'BEGIN INVESTIGATION'}
            </span>
          </button>
        </div>


        {/* Live status row */}
        <div className="cu-hero-status-row">
          <span className={`cu-status-item ${activeIntel === 'servers' ? 'cu-status-item--active' : ''}`}
                onClick={() => handleChipClick('servers')} data-hover>
            <span className="cu-status-dot cu-dot-green" />SERVERS ONLINE
          </span>
          <span className="cu-status-sep">·</span>
          <span className={`cu-status-item ${activeIntel === 'active' ? 'cu-status-item--active' : ''}`}
                onClick={() => handleChipClick('active')} data-hover>
            <span className="cu-status-dot cu-dot-amber" />INVESTIGATION ACTIVE
          </span>
          <span className="cu-status-sep">·</span>
          <span className={`cu-status-item ${activeIntel === 'suspects' ? 'cu-status-item--active' : ''}`}
                onClick={() => handleChipClick('suspects')} data-hover>
            <span className="cu-status-dot cu-dot-red" />SUSPECTS UNIDENTIFIED
          </span>
        </div>

        {/* Intel Tooltip Modal */}
        {activeIntel && intelItems[activeIntel] && (
          <div className="cu-intel-popover">
            <div className="cu-intel-header">
              <span>🔒 {intelItems[activeIntel].title}</span>
              <button className="cu-intel-close" onClick={() => setActiveIntel(null)}>✕</button>
            </div>
            <p className="cu-intel-body">{intelItems[activeIntel].detail}</p>
          </div>
        )}
      </div>

      {/* Bottom footer bar */}
      <div className="cu-hero-footer-bar">
        <span className="cu-footer-bar-left">CHRIST UNIVERSITY</span>
        <div className="cu-footer-bar-center">
          <span className="cu-footer-bar-dot" />
          <span className="cu-footer-bar-dot" />
          <span className="cu-footer-bar-dot" />
        </div>
        <span className="cu-footer-bar-right">REAL-TIME MULTIPLAYER MYSTERY · WebGL · WebSockets</span>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────
   COMPONENT — Auth Centered Modal
   ───────────────────────────────────────────── */
function AuthPanel({ isOpen, initialMode = 'login', onAuth, onClose }) {
  const [mode,     setMode]     = useState(initialMode)
  const [email,    setEmail]    = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode)
      setError('')
    }
  }, [isOpen, initialMode])

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      if (mode === 'register') {
        await apiFetch('/api/v1/auth/register', { method: 'POST', body: JSON.stringify({ username, email, password }) })
        setMode('login'); setError('Agent registered successfully! Please log in.')
        setLoading(false); return
      }
      const token = await apiFetch('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username_or_email: email, email, username: email, password })
      })
      const me = await apiFetch('/api/v1/auth/me', {}, token.access_token)
      onAuth({ token: token.access_token, userId: me.id, username: me.username })
    } catch (err) {
      setError(err.message || 'Authentication failed.')
    }
    setLoading(false)
  }

  return (
    <div className="cu-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="cu-modal cu-auth-modal">
        <button className="cu-panel-close cu-modal-close" onClick={onClose}>✕</button>

        <div className="cu-auth-header">
          <div className="cu-auth-status-row">
            <span className="cu-auth-status-dot" />
            <span className="cu-auth-status-text">SECURE AUTHENTICATION LAYER</span>
          </div>
          <h2 className="cu-auth-title">{mode === 'login' ? 'DECRYPTION PORTAL' : 'AGENT REGISTRATION'}</h2>
          <p className="cu-auth-sub">
            {mode === 'login'
              ? 'Identify yourself to access the investigation network.'
              : 'Enroll a new agent profile into the Christ University database.'}
          </p>
        </div>

        <div className="cu-auth-tabs">
          {['login', 'register'].map(m => (
            <button key={m} className={`cu-auth-tab ${mode === m ? 'cu-auth-tab-active' : ''}`}
              onClick={() => { setMode(m); setError('') }}
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              {m === 'login' ? <Key size={13} /> : <FileText size={13} />}
              {m === 'login' ? 'DECIPHER (LOGIN)' : 'ENROLL (REGISTER)'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="cu-auth-form">
          {mode === 'register' && (
            <div>
              <label className="cu-modal-field-label">AGENT ID / USERNAME</label>
              <input className="cu-auth-input" placeholder="e.g. Agent_007" value={username}
                onChange={e => setUsername(e.target.value)} required autoComplete="username" />
            </div>
          )}
          <div>
            <label className="cu-modal-field-label">{mode === 'login' ? 'USERNAME OR EMAIL' : 'SECURE EMAIL'}</label>
            <input className="cu-auth-input" placeholder={mode === 'login' ? "agent@christ.edu or AgentID" : "agent@christ.edu"}
              type={mode === 'register' ? "email" : "text"} value={email}
              onChange={e => setEmail(e.target.value)} required autoComplete={mode === 'login' ? "username" : "email"} />
          </div>
          <div>
            <label className="cu-modal-field-label">ACCESS KEY / PASSWORD</label>
            <input className="cu-auth-input" placeholder="••••••••••••" type="password" value={password}
              onChange={e => setPassword(e.target.value)} required autoComplete={mode === 'login' ? "current-password" : "new-password"} />
          </div>

          {error && (
            <div className={`cu-auth-msg ${error.includes('successfully') || error.includes('Registered') ? 'cu-auth-msg-ok' : 'cu-auth-msg-err'}`}>
              {error}
            </div>
          )}

          <button type="submit" className="cu-btn-primary" disabled={loading} data-hover style={{ marginTop: 8 }}>
            <span className="cu-btn-shine" />
            {loading ? 'AUTHENTICATING...' : mode === 'login' ? 'INITIALIZE LINK' : 'CREATE AGENT FILE'}
          </button>
        </form>

        <div className="cu-auth-footer">
          <button className="cu-guest-btn" data-hover
            onClick={() => onAuth({ token: null, userId: Date.now(), username: `Guest_${Math.random().toString(36).slice(2, 6)}` })}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <User size={13} /> Continue as Guest (Solo Mode)
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   COMPONENT — Lobby Hub
   ───────────────────────────────────────────── */
const STANDARD_GAME_LABEL = '10 MIN · STANDARD'

function LobbyHub({ auth, onPlay, onJoinedRoom, onClose }) {
  const [tab,        setTab]        = useState('create')
  const [maxPlayers, setMaxPlayers] = useState(1)
  const [joinCode,   setJoinCode]   = useState('')
  const [rooms,      setRooms]      = useState([])
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState('')

  const fetchRooms = useCallback(async () => {
    if (!auth?.token) return
    try { setRooms(await apiFetch('/api/v1/lobby/rooms', {}, auth.token)) } catch {}
  }, [auth])

  useEffect(() => {
    if (tab === 'browse') {
      fetchRooms()
      const pollInterval = setInterval(fetchRooms, 5000)
      return () => clearInterval(pollInterval)
    }
  }, [tab, fetchRooms])

  const createRoom = async () => {
    setError(''); setLoading(true)
    try {
      const resRoom = await apiFetch('/api/v1/lobby/create', {
        method: 'POST',
        body: JSON.stringify({ difficulty: 'medium', max_players: maxPlayers })
      }, auth?.token)
      onJoinedRoom(resRoom)
    } catch (err) {
      if (maxPlayers === 1 || (err.message && (err.message.includes('greater than or equal to 2') || err.message.includes('max_players')))) {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
        let mockCode = 'SOLO'
        for (let i = 0; i < 2; i++) mockCode += chars[Math.floor(Math.random() * chars.length)]
        const localRoom = {
          room_code: mockCode, status: 'waiting', difficulty: 'standard',
          host_id: auth?.userId || auth?.user_id || 1, max_players: 1,
          players: [{ player_id: auth?.userId || auth?.user_id || 1, username: auth?.username || 'Agent', is_ready: true }]
        }
        onJoinedRoom(localRoom)
      } else {
        setError(err.message || 'Failed to create room on server. Check your connection or login status.')
      }
    }
    setLoading(false)
  }

  const joinRoom = async (code) => {
    setError(''); setLoading(true)
    const cleanCode = (code || joinCode || '').trim().toUpperCase()
    try {
      const room = await apiFetch('/api/v1/lobby/join', { method: 'POST', body: JSON.stringify({ room_code: cleanCode }) }, auth?.token)
      onJoinedRoom(room)
    } catch (err) {
      setError(err.message || `Failed to join room '${cleanCode}'`)
    }
    setLoading(false)
  }

  const tabIcons = { create: Plus, join: Key, browse: Globe }

  return (
    <div className="cu-modal-overlay">
      <div className="cu-modal">
        <button className="cu-panel-close cu-modal-close" onClick={onClose}>✕</button>
        <div className="cu-modal-header">
          <p className="cu-label-tag">OPERATIONS HQ</p>
          <h3 className="cu-modal-title">LOBBY CONSOLE</h3>
          {auth && <p className="cu-modal-agent">Agent: <span className="cu-text-cyan">{auth.username}</span></p>}
        </div>

        <div className="cu-modal-tabs">
          {[['create','CREATE'],['join','JOIN'],['browse','BROWSE']].map(([key, label]) => {
            const TabIcon = tabIcons[key]
            return (
              <button key={key} className={`cu-modal-tab ${tab === key ? 'cu-modal-tab-active' : ''}`} onClick={() => setTab(key)}
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <TabIcon size={12} />
                {label}
              </button>
            )
          })}
        </div>

        {error && <div className="cu-auth-msg cu-auth-msg-err">{error}</div>}

        {tab === 'create' && (
          <div className="cu-modal-body">
            <p className="cu-modal-field-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock size={12} /> GAME MODE
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem', color: '#06b6d4', background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.3)', borderRadius: 4, padding: '2px 8px' }}>STANDARD — 10 MINUTES</span>
            </p>
            <p style={{ fontSize: '0.78rem', color: '#64748b', fontFamily: 'monospace', marginBottom: 12 }}>All investigation sessions run for a fixed 10-minute window.</p>
            <p className="cu-modal-field-label" style={{ marginTop: 16 }}>
              HUMAN PLAYERS — {maxPlayers}
              {maxPlayers < 4 && (
                <span style={{ fontSize: '0.72rem', color: '#a78bfa', marginLeft: 8, fontFamily: 'monospace' }}>
                  (+{4 - maxPlayers} bot{4 - maxPlayers !== 1 ? 's' : ''} auto-assigned)
                </span>
              )}
            </p>
            <input type="range" min={1} max={4} value={maxPlayers} onChange={e => setMaxPlayers(+e.target.value)}
              style={{ width: '100%', accentColor: '#dc2626' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#475569', fontFamily: 'monospace', marginTop: 4 }}>
              <span>1 player (3 bots)</span><span>2 players (2 bots)</span><span>3 players (1 bot)</span><span>4 players (0 bots)</span>
            </div>
            <button className="cu-btn-primary" style={{ marginTop: 20, width: '100%' }} onClick={auth?.token ? createRoom : onPlay} disabled={loading} data-hover>
              <span className="cu-btn-shine" />
              {loading ? 'INITIALIZING...' : auth?.token ? 'DEPLOY INTERFACE' : 'PLAY OFFLINE'}
            </button>
          </div>
        )}

        {tab === 'join' && (
          <div className="cu-modal-body">
            <p className="cu-modal-field-label">LOBBY CODE</p>
            <input
              value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
              placeholder="XXXXXX" maxLength={6}
              style={{ width: '100%', padding: '16px', textAlign: 'center', letterSpacing: 6, fontSize: 24, background: 'rgba(255,255,255,0.03)', border: `1px solid ${joinCode.length === 6 ? 'rgba(6,182,212,0.5)' : 'rgba(255,255,255,0.1)'}`, borderRadius: 6, color: '#f1f5f9', fontFamily: 'monospace', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
            />
            <p style={{ fontSize: '0.72rem', color: '#475569', fontFamily: 'monospace', textAlign: 'center', marginTop: 6 }}>
              Enter the 6-character room code shared by the host
            </p>
            <button className="cu-btn-primary" style={{ marginTop: 12, width: '100%', opacity: joinCode.length === 6 ? 1 : 0.4 }}
              onClick={() => auth?.token ? joinRoom(joinCode) : onPlay()} disabled={loading || joinCode.length !== 6} data-hover>
              <span className="cu-btn-shine" />
              {loading ? 'CONNECTING...' : 'LINK TO LOBBY'}
            </button>
          </div>
        )}

        {tab === 'browse' && (
          <div className="cu-modal-body">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <p className="cu-modal-field-label" style={{ margin: 0 }}>ACTIVE TERMINALS ({rooms.length})</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 10, color: '#475569', fontFamily: 'monospace' }}>live-sync 5s</span>
                <button onClick={fetchRooms} style={{ background: 'none', border: 'none', color: '#06b6d4', cursor: 'pointer', fontSize: 12, fontFamily: 'monospace', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <RotateCw size={11} /> REFRESH
                </button>
              </div>
            </div>
            {!auth?.token
              ? <p style={{ color: '#f59e0b', fontFamily: 'monospace', fontSize: 12, textAlign: 'center', padding: '20px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><AlertTriangle size={14} /> Login required to browse rooms.</p>
              : rooms.length === 0
              ? <p style={{ color: '#475569', fontFamily: 'monospace', fontSize: 12, textAlign: 'center', padding: '20px 0' }}>No active terminals found. Create a room to get started!</p>
              : rooms.map(r => {
                const currentCount = r.players?.length ?? r.player_count ?? 0
                const isFull = currentCount >= r.max_players
                return (
                  <div key={r.room_code} className="cu-room-row">
                    <code className="cu-room-code">{r.room_code}</code>
                    <span className="cu-room-meta">{currentCount}/{r.max_players} players · {STANDARD_GAME_LABEL}</span>
                    <button className="cu-room-join-btn" onClick={() => joinRoom(r.room_code)}
                      disabled={loading || isFull}
                      style={{ opacity: isFull ? 0.5 : 1, cursor: isFull ? 'not-allowed' : 'pointer' }}
                      data-hover={!isFull}>
                      {isFull ? 'FULL' : 'CONNECT'}
                    </button>
                  </div>
                )
              })}
          </div>
        )}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   COMPONENT — Waiting Room
   ───────────────────────────────────────────── */
const PCOLORS = ['#3b82f6','#22c55e','#ec4899','#a855f7','#eab308','#f97316','#06b6d4','#ef4444']

function WaitingRoom({ auth, room: init, onGameStarted, onClose }) {
  const [room, setRoom] = useState(init)
  const [copied, setCopied] = useState(false)
  const wsRef = useRef(null)
  const setRoomCode = useGameStore(s => s.setRoomCode)

  const myId      = auth?.userId || auth?.user_id || auth?.id || 1
  const players   = Array.isArray(room.players) ? room.players : Object.values(room.players || {})
  const myPlayer  = players.find(p => String(p.player_id || p.id) === String(myId))
  const isHost    = String(room.host_id) === String(myId) || !auth?.token

  const [wsError, setWsError] = useState('')

  useEffect(() => {
    if (!auth?.token || String(room.room_code).startsWith('SOLO')) return
    const wsUrl = `${getWsProtocol()}://${getBackendHost()}/ws/lobby/${room.room_code}/${myId}?token=${encodeURIComponent(auth.token)}`
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws
    ws.onmessage = (e) => {
      try {
        const { type, payload } = JSON.parse(e.data)
        if (type === 'ERROR') setWsError(payload?.message || 'WebSocket connection error.')
        if (type === 'LOBBY_STATE' || type === 'LOBBY_STATE_UPDATE') setRoom(payload)
        if (type === 'ROLE_REVEAL' || type === 'GAME_STARTED') onGameStarted(room.room_code, myId, auth.username)
      } catch {}
    }
    ws.onerror = () => setWsError('Connection error to tactical deck server.')
    return () => ws.close()
  }, [auth, room.room_code, myId, onGameStarted])

  const toggleReady = () => wsRef.current?.readyState === WebSocket.OPEN &&
    wsRef.current.send(JSON.stringify({ action: 'TOGGLE_READY' }))

  const startGame = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN && !String(room.room_code).startsWith('SOLO') && room.max_players > 1) {
      wsRef.current.send(JSON.stringify({ action: 'START_GAME' }))
    } else {
      onGameStarted(room.room_code, myId, auth?.username || 'Agent')
    }
  }

  const handleCopy = () => {
    navigator.clipboard?.writeText(room.room_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="cu-modal-overlay">
      <div className="cu-modal">
        <button className="cu-panel-close cu-modal-close" onClick={onClose}>✕</button>
        <div className="cu-modal-header">
          <p className="cu-label-tag">TACTICAL DECK</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h3 className="cu-modal-title">TERMINAL: <span className="cu-text-cyan">{room.room_code}</span></h3>
            <button onClick={handleCopy}
              style={{ padding: '4px 10px', border: copied ? '1px solid rgba(34,197,94,0.4)' : '1px solid rgba(6,182,212,0.4)', borderRadius: 4, background: copied ? 'rgba(34,197,94,0.1)' : 'rgba(6,182,212,0.1)', color: copied ? '#4ade80' : '#22d3ee', fontSize: 10, cursor: 'pointer', fontFamily: 'Orbitron, sans-serif', transition: 'all 0.2s ease-in-out' }}>
              {copied ? 'COPIED ✓' : 'COPY'}
            </button>
          </div>
          <p className="cu-modal-agent">{STANDARD_GAME_LABEL} · {players.length}/{room.max_players} agents online</p>
        </div>

        {wsError && <div className="cu-auth-msg cu-auth-msg-err">{wsError}</div>}

        <div className="cu-waiting-players">
          {players.map((p, i) => (
            <div key={p.player_id || p.id || i} className="cu-waiting-player">
              <div className="cu-waiting-avatar" style={{ background: PCOLORS[i % PCOLORS.length] }}>
                {(p.username || '?')[0].toUpperCase()}
              </div>
              <span className="cu-waiting-name" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                {p.username}{String(p.player_id || p.id) === String(room.host_id) && <Crown size={12} style={{ color: '#eab308' }} />}
              </span>
              <span className={`cu-waiting-status ${p.is_ready ? 'cu-ready' : ''}`}>
                {p.is_ready ? '✓ READY' : '○ STANDBY'}
              </span>
            </div>
          ))}
          {Array.from({ length: Math.max(0, (room.max_players || 1) - players.length) }).map((_, i) => (
            <div key={`e${i}`} className="cu-waiting-player cu-waiting-empty">
              <span>— Awaiting agent connection...</span>
            </div>
          ))}
          {room.max_players < 4 && Array.from({ length: 4 - (room.max_players || 1) }).map((_, i) => (
            <div key={`bot${i}`} className="cu-waiting-player" style={{ opacity: 0.4, borderColor: 'rgba(167,139,250,0.2)' }}>
              <div className="cu-waiting-avatar" style={{ background: '#6b21a8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Bot size={16} /></div>
              <span className="cu-waiting-name" style={{ color: '#a78bfa' }}>Bot Agent (auto-assigned)</span>
              <span className="cu-waiting-status cu-ready" style={{ color: '#a78bfa' }}>✓ AUTO</span>
            </div>
          ))}
        </div>


        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 20 }}>
          {(() => {
            const targetCount  = room.max_players || 1
            const currentCount = players.length
            const hasJoinedTarget   = currentCount >= targetCount
            const nonHostPlayers    = players.filter(p => String(p.player_id || p.id) !== String(room.host_id))
            const allNonHostReady   = nonHostPlayers.length === 0 || nonHostPlayers.every(p => p.is_ready)
            const canStart = hasJoinedTarget && allNonHostReady
            const botCount = Math.max(0, 4 - targetCount)

            return isHost ? (
              <>
                <button onClick={startGame} disabled={!canStart}
                  style={{
                    width: '100%', padding: 12, border: 'none', borderRadius: 6,
                    background: canStart ? 'linear-gradient(135deg, #7c3aed, #4f46e5)' : 'rgba(255,255,255,0.05)',
                    color: canStart ? '#fff' : 'rgba(255,255,255,0.3)',
                    fontFamily: 'Orbitron, sans-serif', fontWeight: 700, fontSize: 12,
                    cursor: canStart ? 'pointer' : 'not-allowed', letterSpacing: 1,
                    boxShadow: canStart ? '0 4px 15px rgba(124,58,237,0.3)' : 'none', transition: 'all 0.2s'
                  }}
                  data-hover={canStart ? "true" : "false"}>
                  {!hasJoinedTarget
                    ? `⏳ WAITING FOR PLAYERS TO JOIN (${currentCount}/${targetCount})`
                    : !allNonHostReady
                    ? `⏳ WAITING FOR ALL PLAYERS TO BE READY`
                    : botCount > 0
                    ? `▶ INITIATE CASE — ${currentCount} human${currentCount !== 1 ? 's' : ''} + ${botCount} bot${botCount !== 1 ? 's' : ''}`
                    : `▶ INITIATE CASE (${currentCount}/${targetCount})`}
                </button>
                {!hasJoinedTarget ? (
                  <div style={{ textAlign: 'center', color: '#f59e0b', fontSize: 11, fontFamily: 'monospace', letterSpacing: 0.5 }}>
                    ⚠️ Waiting for {targetCount - currentCount} more player(s) to join the room before starting.
                  </div>
                ) : !allNonHostReady ? (
                  <div style={{ textAlign: 'center', color: '#ef4444', fontSize: 11, fontFamily: 'monospace', letterSpacing: 0.5 }}>
                    ⚠️ Waiting for all joined players to signal READY.
                  </div>
                ) : null}
              </>
            ) : (
              <button onClick={toggleReady}
                style={{ width: '100%', padding: 12, border: `1.5px solid ${myPlayer?.is_ready ? '#22c55e' : 'rgba(6,182,212,0.5)'}`, borderRadius: 6, background: myPlayer?.is_ready ? 'rgba(34,197,94,0.1)' : 'rgba(6,182,212,0.05)', color: myPlayer?.is_ready ? '#86efac' : '#22d3ee', fontFamily: 'Orbitron, sans-serif', fontWeight: 700, fontSize: 12, cursor: 'pointer', letterSpacing: 1 }}
                data-hover>
                {myPlayer?.is_ready ? '✓ READY' : '○ SIGNAL READY'}
              </button>
            )
          })()}
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   ROOT — HomeScreen (Single Full-Viewport AAA Launcher)
   ───────────────────────────────────────────── */
export default function HomeScreen({ onPlay }) {
  const setRoomCode   = useGameStore(s => s.setRoomCode)
  const setPlayerId   = useGameStore(s => s.setPlayerId)
  const setPlayerName = useGameStore(s => s.setPlayerName)
  const setAuthToken  = useGameStore(s => s.setAuthToken)

  const [gateVisible, setGateVisible] = useState(false)
  const [flow,        setFlow]        = useState('landing')
  const [authMode,    setAuthMode]    = useState('login')
  const [auth,        setAuth]        = useState(null)
  const [room,        setRoom]        = useState(null)

  const { muted, toggle: toggleAudio, playBlip } = useAmbientAudio()

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
      document.documentElement.style.overflow = ''
    }
  }, [])

  const handleAuth = useCallback((authData) => {
    setAuth(authData)
    setPlayerName(authData.username)
    setPlayerId(authData.userId)
    setAuthToken(authData.token)
    if (!authData.token) { onPlay(); return }
    setFlow('lobby')
  }, [onPlay, setPlayerName, setPlayerId, setAuthToken])

  const handleLogout = useCallback(() => {
    setAuth(null)
    setAuthToken(null)
    setPlayerName('')
    setPlayerId(null)
    setFlow('landing')
  }, [setAuthToken, setPlayerName, setPlayerId])

  const handleOpenAuth = useCallback((initialMode = 'login') => {
    setAuthMode(initialMode)
    setFlow('auth')
  }, [])

  const handleBeginInvestigation = useCallback(() => {
    if (!auth) {
      handleOpenAuth('login')
    } else {
      setFlow('lobby')
    }
  }, [auth, handleOpenAuth])

  const handleJoinedRoom = useCallback((roomData) => {
    setRoom(roomData)
    setRoomCode(roomData.room_code)
    setFlow('waiting')
  }, [setRoomCode])

  const handleGameStarted = useCallback((roomCode, userId, username) => {
    setRoomCode(roomCode)
    setPlayerId(userId)
    setPlayerName(username)
    onPlay()
  }, [onPlay, setRoomCode, setPlayerId, setPlayerName])

  return (
    <div className="cu-root cu-launcher-root">
      <CursorGlow />
      {gateVisible && <LoadingGate onDone={() => setGateVisible(false)} />}

      <NavBar
        auth={auth}
        onBeginInvestigation={handleBeginInvestigation}
        onLogout={handleLogout}
        muted={muted}
        onToggleAudio={toggleAudio}
      />

      {/* ── Single Full-Viewport AAA Hero Launcher ── */}
      <HeroSection
        auth={auth}
        onBeginInvestigation={handleBeginInvestigation}
        playBlip={playBlip}
      />


      {/* ── Modals ── */}
      <AuthPanel
        isOpen={flow === 'auth'}
        initialMode={authMode}
        onAuth={handleAuth}
        onClose={() => setFlow('landing')}
      />
      {flow === 'lobby' && (
        <LobbyHub auth={auth} onPlay={onPlay} onJoinedRoom={handleJoinedRoom} onClose={() => setFlow('landing')} />
      )}
      {flow === 'waiting' && room && (
        <WaitingRoom auth={auth} room={room} onGameStarted={handleGameStarted} onClose={() => setFlow('lobby')} />
      )}
    </div>
  )
}

