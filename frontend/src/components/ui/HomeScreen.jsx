import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Stars } from '@react-three/drei'
import useGameStore from '../../store/gameStore'

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
    let errMsg = `HTTP ${res.status}`;
    const detail = data.detail;
    if (typeof detail === 'string') {
      errMsg = detail;
    } else if (Array.isArray(detail)) {
      errMsg = detail.map(d => `${d.loc ? d.loc.join('.') + ': ' : ''}${d.msg}`).join(', ');
    } else if (detail && typeof detail === 'object') {
      errMsg = detail.message || JSON.stringify(detail);
    }
    throw new Error(errMsg);
  }
  return data
}

/* ─────────────────────────────────────────────
   HOOK — Ambient Web Audio synth drone
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

  useEffect(() => () => {
    try { nodes.current.o1?.stop(); nodes.current.o2?.stop(); ctx.current?.close() } catch {}
  }, [])

  return { muted, toggle }
}

/* ─────────────────────────────────────────────
   COMPONENT — Custom Cursor
   ───────────────────────────────────────────── */
function CursorGlow() {
  const dotRef = useRef(null)
  const haloRef = useRef(null)
  const pos = useRef({ x: 0, y: 0 })
  const haloPos = useRef({ x: 0, y: 0 })
  const raf = useRef(null)

  useEffect(() => {
    const move = (e) => { pos.current = { x: e.clientX, y: e.clientY } }
    window.addEventListener('mousemove', move)
    const animate = () => {
      if (dotRef.current) {
        dotRef.current.style.transform = `translate(${pos.current.x - 4}px, ${pos.current.y - 4}px)`
      }
      haloPos.current.x += (pos.current.x - haloPos.current.x) * 0.1
      haloPos.current.y += (pos.current.y - haloPos.current.y) * 0.1
      if (haloRef.current) {
        haloRef.current.style.transform = `translate(${haloPos.current.x - 40}px, ${haloPos.current.y - 40}px)`
      }
      raf.current = requestAnimationFrame(animate)
    }
    raf.current = requestAnimationFrame(animate)
    const grow = () => haloRef.current?.classList.add('cu-cursor-grow')
    const shrink = () => haloRef.current?.classList.remove('cu-cursor-grow')
    const interactives = document.querySelectorAll('button, a, [data-hover]')
    interactives.forEach(el => { el.addEventListener('mouseenter', grow); el.addEventListener('mouseleave', shrink) })
    return () => { window.removeEventListener('mousemove', move); cancelAnimationFrame(raf.current) }
  }, [])

  return (
    <>
      <div ref={dotRef} className="cu-cursor-dot" />
      <div ref={haloRef} className="cu-cursor-halo" />
    </>
  )
}

/* ─────────────────────────────────────────────
   COMPONENT — Loading Gate (cinematic intro)
   ───────────────────────────────────────────── */
const TITLE_CHARS = 'CAMPUS GAME'.split('')

function LoadingGate({ onDone }) {
  const [phase, setPhase] = useState('typing')
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('wiping'), 2400)
    const t2 = setTimeout(() => { setVisible(false); onDone() }, 3200)
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
            <span key={i} className="cu-gate-char" style={{ animationDelay: `${i * 60}ms` }}>
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
   COMPONENT — Unsplash Background Crossfade
   Curated dark campus/mystery images
   ───────────────────────────────────────────── */
const BG_IMAGES = [
  'https://images.unsplash.com/photo-1562774053-701939374585?w=1920&q=80', // dark university campus
  'https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?w=1920&q=80', // dark corridor hallway
  'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1920&q=80', // university building night
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1920&q=80', // dark moody atmosphere
  'https://images.unsplash.com/photo-1516912481808-3406841bd33c?w=1920&q=80', // mystery dark
]

function UnsplashBackground() {
  const [current, setCurrent] = useState(0)
  const [next, setNext] = useState(1)
  const [fading, setFading] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setFading(true)
      setTimeout(() => {
        setCurrent(c => (c + 1) % BG_IMAGES.length)
        setNext(n => (n + 1) % BG_IMAGES.length)
        setFading(false)
      }, 1500)
    }, 7000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="cu-unsplash-bg">
      {/* Current image */}
      <div
        className={`cu-bg-layer cu-bg-layer-current ${fading ? 'cu-bg-layer-fade' : ''}`}
        style={{ backgroundImage: `url(${BG_IMAGES[current]})` }}
      />
      {/* Next image preloaded */}
      <div
        className={`cu-bg-layer cu-bg-layer-next ${fading ? 'cu-bg-layer-next-show' : ''}`}
        style={{ backgroundImage: `url(${BG_IMAGES[next]})` }}
      />
      {/* Multi-layer darkening overlay */}
      <div className="cu-bg-overlay-dark" />
      <div className="cu-bg-overlay-gradient" />
      <div className="cu-bg-overlay-vignette" />
      {/* Animated scanlines */}
      <div className="cu-bg-scanlines" />
      {/* Noise grain */}
      <div className="cu-bg-grain" />
    </div>
  )
}

/* ─────────────────────────────────────────────
   COMPONENT — Floating Particle Dust
   ───────────────────────────────────────────── */
function FloatingParticles() {
  const particles = Array.from({ length: 28 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 1 + Math.random() * 2.5,
    duration: 8 + Math.random() * 14,
    delay: Math.random() * 12,
    opacity: 0.15 + Math.random() * 0.45,
  }))

  return (
    <div className="cu-particles">
      {particles.map(p => (
        <div
          key={p.id}
          className="cu-particle"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            opacity: p.opacity,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  )
}

/* ─────────────────────────────────────────────
   COMPONENT — R3F Peripheral Scene (Stars only)
   ───────────────────────────────────────────── */
function HeroR3FScene() {
  return (
    <>
      <Stars radius={100} depth={50} count={400} factor={2} saturation={0} fade speed={0.3} />
      <ambientLight intensity={0.05} />
    </>
  )
}

/* ─────────────────────────────────────────────
   COMPONENT — NavBar
   ───────────────────────────────────────────── */
function NavBar({ auth, onBeginInvestigation, muted, onToggleAudio }) {
  return (
    <nav className="cu-nav cu-nav-transparent">
      <div className="cu-nav-logo">
        <span className="cu-nav-cross">✝</span>
        <span className="cu-nav-name">CAMPUS GAME</span>
        <span className="cu-nav-tag">CLASSIFIED</span>
      </div>
      <div className="cu-nav-actions">
        <button className="cu-nav-audio-btn" onClick={onToggleAudio} title="Toggle ambient sound">
          {muted ? '🔈' : '🔊'}
        </button>
        {auth ? (
          <button className="cu-nav-cta" onClick={onBeginInvestigation}>
            ACCESS HQ
          </button>
        ) : (
          <button className="cu-nav-cta" onClick={onBeginInvestigation}>
            BEGIN INVESTIGATION
          </button>
        )}
      </div>
    </nav>
  )
}

/* ─────────────────────────────────────────────
   COMPONENT — Hero Section (Full Viewport)
   ───────────────────────────────────────────── */
function HeroSection({ onBeginInvestigation }) {
  const containerRef = useRef(null)
  const spotRef = useRef(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const handler = (e) => {
      const rect = el.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      if (spotRef.current) {
        spotRef.current.style.background =
          `radial-gradient(circle 700px at ${x}px ${y}px, rgba(180,130,40,0.06) 0%, transparent 60%)`
      }
    }
    el.addEventListener('mousemove', handler)
    return () => el.removeEventListener('mousemove', handler)
  }, [])

  return (
    <section ref={containerRef} className="cu-hero-fullscreen">
      {/* Unsplash crossfading background */}
      <UnsplashBackground />

      {/* R3F stars layer */}
      <div className="cu-hero-canvas-stars">
        <Canvas camera={{ position: [0, 0, 10], fov: 60 }} gl={{ antialias: true, alpha: true }}>
          <HeroR3FScene />
        </Canvas>
      </div>

      {/* Mouse spotlight */}
      <div ref={spotRef} className="cu-hero-spotlight" />

      {/* Floating particles */}
      <FloatingParticles />

      {/* ─── Central Content ─── */}
      <div className="cu-hero-center">

        {/* Top badge */}
        <div className="cu-hero-badge-elegant">
          <div className="cu-badge-line" />
          <span className="cu-badge-text-elegant">CHRIST UNIVERSITY · CLASSIFIED OPERATION · BENGALURU</span>
          <div className="cu-badge-line" />
        </div>

        {/* Main title */}
        <div className="cu-hero-title-block">
          <h1 className="cu-hero-main-title">
            <span className="cu-title-campus">CAMPUS</span>
            <span className="cu-title-game">GAME</span>
          </h1>

          {/* Ornamental divider */}
          <div className="cu-title-ornament">
            <div className="cu-ornament-line" />
            <span className="cu-ornament-cross">✝</span>
            <div className="cu-ornament-line" />
          </div>

          {/* Subtitle */}
          <p className="cu-hero-subtitle-elegant">
            T&nbsp;H&nbsp;E&nbsp;&nbsp;&nbsp;C&nbsp;H&nbsp;R&nbsp;I&nbsp;S&nbsp;T&nbsp;&nbsp;&nbsp;M&nbsp;Y&nbsp;S&nbsp;T&nbsp;E&nbsp;R&nbsp;Y
          </p>
        </div>

        {/* Tagline */}
        <p className="cu-hero-tagline-elegant">
          A classified research project has vanished from campus.<br />
          Every player is a suspect. Every clue matters.<br />
          <em>Uncover the truth before time runs out.</em>
        </p>

        {/* CTA buttons */}
        <div className="cu-hero-ctas-elegant">
          <button
            className="cu-btn-begin"
            onClick={onBeginInvestigation}
            id="begin-investigation-btn"
            data-hover
          >
            <span className="cu-btn-begin-glow" />
            <span className="cu-btn-begin-border" />
            <span className="cu-btn-begin-label">
              ▶&nbsp;&nbsp;BEGIN INVESTIGATION
            </span>
          </button>
        </div>

        {/* Status row */}
        <div className="cu-hero-status-row">
          <span className="cu-status-item">
            <span className="cu-status-dot cu-dot-green" />
            SERVERS ONLINE
          </span>
          <span className="cu-status-sep">·</span>
          <span className="cu-status-item">
            <span className="cu-status-dot cu-dot-amber" />
            INVESTIGATION ACTIVE
          </span>
          <span className="cu-status-sep">·</span>
          <span className="cu-status-item">
            <span className="cu-status-dot cu-dot-red" />
            SUSPECTS UNIDENTIFIED
          </span>
        </div>
      </div>

      {/* Bottom footer bar */}
      <div className="cu-hero-footer-bar">
        <span className="cu-footer-bar-left">CHRIST UNIVERSITY, BENGALURU</span>
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
   COMPONENT — Auth Slide Panel
   ───────────────────────────────────────────── */
function AuthPanel({ isOpen, onAuth, onClose }) {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const fieldStyle = {
    width: '100%', padding: '12px 16px', boxSizing: 'border-box',
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 6, color: '#f1f5f9', fontSize: 14,
    fontFamily: "'JetBrains Mono', 'Courier New', monospace",
    outline: 'none', transition: 'border-color 0.2s',
  }

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      if (mode === 'register') {
        await apiFetch('/api/v1/auth/register', { method: 'POST', body: JSON.stringify({ username, email, password }) })
        setMode('login'); setError('Registered. Please log in.')
        setLoading(false); return
      }
      const token = await apiFetch('/api/v1/auth/login', { method: 'POST', body: JSON.stringify({ username: email, email, password }) })
      const me = await apiFetch('/api/v1/auth/me', {}, token.access_token)
      onAuth({ token: token.access_token, userId: me.id, username: me.username })
    } catch (err) { setError(err.message) }
    setLoading(false)
  }

  return (
    <>
      <div className={`cu-panel-backdrop ${isOpen ? 'cu-panel-backdrop-open' : ''}`} onClick={onClose} />
      <div className={`cu-auth-panel ${isOpen ? 'cu-auth-panel-open' : ''}`}>
        <button className="cu-panel-close" onClick={onClose}>✕ ESC</button>

        <div className="cu-auth-header">
          <div className="cu-auth-status-row">
            <span className="cu-auth-status-dot" />
            <span className="cu-auth-status-text">SECURE AUTHENTICATION LAYER</span>
          </div>
          <h2 className="cu-auth-title">DECRYPTION PORTAL</h2>
          <p className="cu-auth-sub">Identify yourself to access the investigation network.</p>
        </div>

        <div className="cu-auth-tabs">
          {['login', 'register'].map(m => (
            <button key={m} className={`cu-auth-tab ${mode === m ? 'cu-auth-tab-active' : ''}`}
              onClick={() => { setMode(m); setError('') }}>
              {m === 'login' ? 'DECIPHER' : 'ENROLL'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="cu-auth-form">
          {mode === 'register' && (
            <input style={fieldStyle} placeholder="Agent ID (Username)" value={username}
              onChange={e => setUsername(e.target.value)} required autoComplete="username" />
          )}
          <input style={fieldStyle} placeholder="Secure Email" type="email" value={email}
            onChange={e => setEmail(e.target.value)} required autoComplete="email" />
          <input style={fieldStyle} placeholder="Access Key (Password)" type="password" value={password}
            onChange={e => setPassword(e.target.value)} required autoComplete="current-password" />

          {error && (
            <div className={`cu-auth-msg ${error.includes('Registered') ? 'cu-auth-msg-ok' : 'cu-auth-msg-err'}`}>
              {error}
            </div>
          )}

          <button type="submit" className="cu-btn-primary" disabled={loading} data-hover>
            <span className="cu-btn-shine" />
            {loading ? 'CONNECTING...' : mode === 'login' ? 'INITIALIZE LINK' : 'CREATE AGENT FILE'}
          </button>
        </form>

        <div className="cu-auth-footer">
          <button className="cu-guest-btn" data-hover
            onClick={() => onAuth({ token: null, userId: Date.now(), username: `Guest_${Math.random().toString(36).slice(2, 6)}` })}>
            ↩ Continue as Guest (Solo Mode)
          </button>
        </div>
      </div>
    </>
  )
}

/* ─────────────────────────────────────────────
   COMPONENT — Lobby Hub
   ───────────────────────────────────────────── */
const STANDARD_GAME_LABEL = '10 MIN · STANDARD'

function LobbyHub({ auth, onPlay, onJoinedRoom, onClose }) {
  const [tab, setTab] = useState('create')
  const [maxPlayers, setMaxPlayers] = useState(1)
  const [joinCode, setJoinCode] = useState('')
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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
        // Handle server legacy ge=2 schema constraint for 1-player mode seamlessly
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
        let mockCode = 'SOLO'
        for (let i = 0; i < 2; i++) mockCode += chars[Math.floor(Math.random() * chars.length)]
        const localRoom = {
          room_code: mockCode,
          status: 'waiting',
          difficulty: 'standard',
          host_id: auth?.userId || auth?.user_id || 1,
          max_players: 1,
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
          {[['create','+ CREATE'],['join','🔑 JOIN'],['browse','🌐 BROWSE']].map(([key, label]) => (
            <button key={key} className={`cu-modal-tab ${tab === key ? 'cu-modal-tab-active' : ''}`} onClick={() => setTab(key)}>
              {label}
            </button>
          ))}
        </div>

        {error && <div className="cu-auth-msg cu-auth-msg-err">{error}</div>}

        {tab === 'create' && (
          <div className="cu-modal-body">
            <p className="cu-modal-field-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              🕐 GAME MODE
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
              <span>1 player (3 bots)</span>
              <span>2 players (2 bots)</span>
              <span>3 players (1 bot)</span>
              <span>4 players (0 bots)</span>
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
                <button onClick={fetchRooms} style={{ background: 'none', border: 'none', color: '#06b6d4', cursor: 'pointer', fontSize: 12, fontFamily: 'monospace' }}>↻ REFRESH</button>
              </div>
            </div>
            {!auth?.token
              ? <p style={{ color: '#f59e0b', fontFamily: 'monospace', fontSize: 12, textAlign: 'center', padding: '20px 0' }}>⚠️ Login required to browse rooms.</p>
              : rooms.length === 0
              ? <p style={{ color: '#475569', fontFamily: 'monospace', fontSize: 12, textAlign: 'center', padding: '20px 0' }}>No active terminals found. Create a room to get started!</p>
              : rooms.map(r => {
                const currentCount = r.players?.length ?? r.player_count ?? 0
                const isFull = currentCount >= r.max_players
                return (
                  <div key={r.room_code} className="cu-room-row">
                    <code className="cu-room-code">{r.room_code}</code>
                    <span className="cu-room-meta">
                      {currentCount}/{r.max_players} players · {STANDARD_GAME_LABEL}
                    </span>
                    <button
                      className="cu-room-join-btn"
                      onClick={() => joinRoom(r.room_code)}
                      disabled={loading || isFull}
                      style={{ opacity: isFull ? 0.5 : 1, cursor: isFull ? 'not-allowed' : 'pointer' }}
                      data-hover={!isFull}
                    >
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

  const myId = auth?.userId || auth?.user_id || auth?.id || 1
  const players = Array.isArray(room.players) ? room.players : Object.values(room.players || {})
  const myPlayer = players.find(p => String(p.player_id || p.id) === String(myId))
  // isHost: either your id matches host_id, OR the room code was locally-generated (no auth)
  const isHost = String(room.host_id) === String(myId) || !auth?.token

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
              <span className="cu-waiting-name">
                {p.username}{String(p.player_id || p.id) === String(room.host_id) ? ' 👑' : ''}
              </span>
              <span className={`cu-waiting-status ${p.is_ready ? 'cu-ready' : ''}`}>
                {p.is_ready ? '✓ READY' : '○ STANDBY'}
              </span>
            </div>
          ))}
          {/* Empty human slots waiting to be filled */}
          {Array.from({ length: Math.max(0, (room.max_players || 1) - players.length) }).map((_, i) => (
            <div key={`e${i}`} className="cu-waiting-player cu-waiting-empty">
              <span>— Awaiting agent connection...</span>
            </div>
          ))}
          {/* Bot slots that will be auto-assigned on game start */}
          {room.max_players < 4 && Array.from({ length: 4 - (room.max_players || 1) }).map((_, i) => (
            <div key={`bot${i}`} className="cu-waiting-player" style={{ opacity: 0.4, borderColor: 'rgba(167,139,250,0.2)' }}>
              <div className="cu-waiting-avatar" style={{ background: '#6b21a8' }}>🤖</div>
              <span className="cu-waiting-name" style={{ color: '#a78bfa' }}>Bot Agent (auto-assigned)</span>
              <span className="cu-waiting-status cu-ready" style={{ color: '#a78bfa' }}>✓ AUTO</span>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 20 }}>
          {(() => {
            // targetCount = number of HUMAN players needed before host can start
            const targetCount = room.max_players || 1
            const currentCount = players.length
            const hasJoinedTarget = currentCount >= targetCount
            // All non-host players must be ready (or there are no non-host players)
            const nonHostPlayers = players.filter(p => String(p.player_id || p.id) !== String(room.host_id))
            const allNonHostReady = nonHostPlayers.length === 0 || nonHostPlayers.every(p => p.is_ready)
            const canStart = hasJoinedTarget && allNonHostReady
            // How many bots will auto-fill
            const botCount = Math.max(0, 4 - targetCount)

            return isHost ? (
              <>
                <button
                  onClick={startGame}
                  disabled={!canStart}
                  style={{
                    width: '100%', padding: 12, border: 'none', borderRadius: 6,
                    background: canStart
                      ? 'linear-gradient(135deg, #7c3aed, #4f46e5)'
                      : 'rgba(255,255,255,0.05)',
                    color: canStart ? '#fff' : 'rgba(255,255,255,0.3)',
                    fontFamily: 'Orbitron, sans-serif', fontWeight: 700, fontSize: 12,
                    cursor: canStart ? 'pointer' : 'not-allowed',
                    letterSpacing: 1,
                    boxShadow: canStart ? '0 4px 15px rgba(124,58,237,0.3)' : 'none',
                    transition: 'all 0.2s'
                  }}
                  data-hover={canStart ? "true" : "false"}
                >
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
              <button
                onClick={toggleReady}
                style={{ width: '100%', padding: 12, border: `1.5px solid ${myPlayer?.is_ready ? '#22c55e' : 'rgba(6,182,212,0.5)'}`, borderRadius: 6, background: myPlayer?.is_ready ? 'rgba(34,197,94,0.1)' : 'rgba(6,182,212,0.05)', color: myPlayer?.is_ready ? '#86efac' : '#22d3ee', fontFamily: 'Orbitron, sans-serif', fontWeight: 700, fontSize: 12, cursor: 'pointer', letterSpacing: 1 }}
                data-hover
              >
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
   ROOT — HomeScreen
   ───────────────────────────────────────────── */
export default function HomeScreen({ onPlay }) {
  const setRoomCode   = useGameStore(s => s.setRoomCode)
  const setPlayerId   = useGameStore(s => s.setPlayerId)
  const setPlayerName = useGameStore(s => s.setPlayerName)
  const setAuthToken  = useGameStore(s => s.setAuthToken)

  const [gateVisible, setGateVisible] = useState(false)
  const [flow, setFlow] = useState('landing') // landing | auth | lobby | waiting
  const [auth, setAuth] = useState(null)
  const [room, setRoom] = useState(null)

  const { muted, toggle: toggleAudio } = useAmbientAudio()

  // Lock body scroll — page is single viewport
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = 'hidden' }
  }, [])

  const handleAuth = useCallback((authData) => {
    setAuth(authData)
    setPlayerName(authData.username)
    setPlayerId(authData.userId)
    setAuthToken(authData.token)
    if (!authData.token) { onPlay(); return }
    setFlow('lobby')
  }, [onPlay, setPlayerName, setPlayerId, setAuthToken])

  const handleBeginInvestigation = useCallback(() => {
    setFlow('auth')
  }, [])

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
    <>
      <CursorGlow />
      {gateVisible && <LoadingGate onDone={() => setGateVisible(false)} />}

      <NavBar
        auth={auth}
        onBeginInvestigation={handleBeginInvestigation}
        muted={muted}
        onToggleAudio={toggleAudio}
      />

      <HeroSection onBeginInvestigation={handleBeginInvestigation} />

      {/* Auth Panel */}
      <AuthPanel
        isOpen={flow === 'auth'}
        onAuth={handleAuth}
        onClose={() => setFlow('landing')}
      />

      {/* Lobby */}
      {flow === 'lobby' && (
        <LobbyHub auth={auth} onPlay={onPlay} onJoinedRoom={handleJoinedRoom} onClose={() => setFlow('landing')} />
      )}

      {/* Waiting Room */}
      {flow === 'waiting' && room && (
        <WaitingRoom auth={auth} room={room} onGameStarted={handleGameStarted} onClose={() => setFlow('lobby')} />
      )}
    </>
  )
}
