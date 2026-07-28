/**
 * audioManager.js
 * 
 * Audio management utility for the Decision Phase and gameplay feedback.
 * Supports HTML5 Audio assets with Web Audio API procedural synthesis fallbacks.
 * Features: BGM looping, smooth fading, SFX triggers, mute persistence in localStorage.
 */

class AudioManager {
  constructor() {
    this.isMuted = localStorage.getItem('campusgame_muted') === 'true'
    this.bgmVolume = 0.5
    this.sfxVolume = 0.7
    
    this.bgmAudio = null
    this.fadeInterval = null
    
    // Web Audio API context for synthetic fallbacks
    this.audioCtx = null
  }

  getAudioContext() {
    if (!this.audioCtx && typeof window !== 'undefined') {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass()
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {})
    }
    return this.audioCtx
  }

  toggleMute() {
    this.isMuted = !this.isMuted
    localStorage.setItem('campusgame_muted', String(this.isMuted))
    
    if (this.bgmAudio) {
      this.bgmAudio.muted = this.isMuted
    }
    return this.isMuted
  }

  getMuted() {
    return this.isMuted
  }

  /**
   * Play Decision Phase Tension BGM
   */
  playDecisionBgm(src = '/sounds/decision-phase-bgm.mp3') {
    if (this.isMuted) return
    
    // Stop any existing fade
    if (this.fadeInterval) {
      clearInterval(this.fadeInterval)
      this.fadeInterval = null
    }

    try {
      if (!this.bgmAudio) {
        this.bgmAudio = new Audio(src)
        this.bgmAudio.loop = true
      }
      this.bgmAudio.volume = this.bgmVolume
      this.bgmAudio.muted = this.isMuted
      
      const playPromise = this.bgmAudio.play()
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Autoplay policy or missing file fallback -> use procedural Web Audio tension drone
          this.playProceduralTensionBgm()
        })
      }
    } catch (e) {
      this.playProceduralTensionBgm()
    }
  }

  /**
   * Fade out BGM over durationMs (~1200ms) then stop
   */
  fadeAndStopBgm(durationMs = 1200) {
    if (this.fadeInterval) {
      clearInterval(this.fadeInterval)
    }

    if (this.proceduralBgmNodes) {
      this.stopProceduralTensionBgm(durationMs)
    }

    if (!this.bgmAudio) return

    const stepMs = 50
    const steps = durationMs / stepMs
    const volumeStep = this.bgmAudio.volume / steps

    this.fadeInterval = setInterval(() => {
      if (!this.bgmAudio) {
        clearInterval(this.fadeInterval)
        return
      }

      if (this.bgmAudio.volume > volumeStep) {
        this.bgmAudio.volume = Math.max(0, this.bgmAudio.volume - volumeStep)
      } else {
        this.bgmAudio.volume = 0
        this.bgmAudio.pause()
        this.bgmAudio.currentTime = 0
        clearInterval(this.fadeInterval)
        this.fadeInterval = null
      }
    }, stepMs)
  }

  /**
   * Stop BGM immediately
   */
  stopBgm() {
    if (this.fadeInterval) {
      clearInterval(this.fadeInterval)
      this.fadeInterval = null
    }
    if (this.bgmAudio) {
      this.bgmAudio.pause()
      this.bgmAudio.currentTime = 0
    }
    if (this.proceduralBgmNodes) {
      this.stopProceduralTensionBgm(0)
    }
  }

  /**
   * Play SFX by type: 'select', 'submit', 'reveal'
   */
  playSfx(type) {
    if (this.isMuted) return

    const soundPaths = {
      select: '/sounds/select-click.mp3',
      submit: '/sounds/submit-lock.mp3',
      reveal: '/sounds/reveal-sting.mp3',
    }

    const path = soundPaths[type]
    if (path) {
      const sfx = new Audio(path)
      sfx.volume = this.sfxVolume
      sfx.play().catch(() => {
        // Fallback to Web Audio synthesized SFX
        this.playProceduralSfx(type)
      })
    } else {
      this.playProceduralSfx(type)
    }
  }

  // ── Procedural Web Audio Fallbacks ──────────────────────────────────────

  playProceduralTensionBgm() {
    const ctx = this.getAudioContext()
    if (!ctx) return
    if (this.proceduralBgmNodes) return // Already playing

    try {
      const osc1 = ctx.createOscillator()
      const osc2 = ctx.createOscillator()
      const gainNode = ctx.createGain()

      osc1.type = 'sawtooth'
      osc1.frequency.setValueAtTime(55, ctx.currentTime) // Low A1

      osc2.type = 'sine'
      osc2.frequency.setValueAtTime(58.73, ctx.currentTime) // Detuned Bb1 low tension beat

      // Lowpass filter for dark thriller vibe
      const filter = ctx.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.setValueAtTime(280, ctx.currentTime)

      gainNode.gain.setValueAtTime(this.isMuted ? 0 : 0.15, ctx.currentTime)

      osc1.connect(filter)
      osc2.connect(filter)
      filter.connect(gainNode)
      gainNode.connect(ctx.destination)

      osc1.start()
      osc2.start()

      this.proceduralBgmNodes = { osc1, osc2, gainNode, filter }
    } catch (e) {
      // AudioContext unavailable
    }
  }

  stopProceduralTensionBgm(fadeMs = 1200) {
    if (!this.proceduralBgmNodes) return
    const ctx = this.getAudioContext()
    const { osc1, osc2, gainNode } = this.proceduralBgmNodes

    if (ctx && gainNode && fadeMs > 0) {
      gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + (fadeMs / 1000))
      setTimeout(() => {
        try {
          osc1.stop()
          osc2.stop()
        } catch (e) {}
        this.proceduralBgmNodes = null
      }, fadeMs)
    } else {
      try {
        osc1.stop()
        osc2.stop()
      } catch (e) {}
      this.proceduralBgmNodes = null
    }
  }

  playProceduralSfx(type) {
    const ctx = this.getAudioContext()
    if (!ctx) return

    try {
      const now = ctx.currentTime
      if (type === 'select') {
        // High crisp tech tick
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(1200, now)
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.04)

        gain.gain.setValueAtTime(0.2, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04)

        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(now)
        osc.stop(now + 0.04)
      } else if (type === 'submit') {
        // Locking heavy synth pulse
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'triangle'
        osc.frequency.setValueAtTime(180, now)
        osc.frequency.exponentialRampToValueAtTime(60, now + 0.25)

        gain.gain.setValueAtTime(0.4, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25)

        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(now)
        osc.stop(now + 0.25)
      } else if (type === 'reveal') {
        // Dramatic reveal brass sting synth
        const osc1 = ctx.createOscillator()
        const osc2 = ctx.createOscillator()
        const gain = ctx.createGain()

        osc1.type = 'sawtooth'
        osc2.type = 'square'

        osc1.frequency.setValueAtTime(110, now) // Low A2
        osc1.frequency.exponentialRampToValueAtTime(220, now + 0.6) // Rise to A3

        osc2.frequency.setValueAtTime(164.81, now) // E3
        osc2.frequency.exponentialRampToValueAtTime(329.63, now + 0.6) // Rise to E4

        gain.gain.setValueAtTime(0.5, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9)

        osc1.connect(gain)
        osc2.connect(gain)
        gain.connect(ctx.destination)

        osc1.start(now)
        osc2.start(now)
        osc1.stop(now + 0.9)
        osc2.stop(now + 0.9)
      }
    } catch (e) {
      // AudioContext unavailable
    }
  }
}

const audioManager = new AudioManager()
export default audioManager
