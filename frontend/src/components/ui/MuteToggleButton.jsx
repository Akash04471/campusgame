import React, { useState } from 'react'
import audioManager from '../../utils/audioManager'

/**
 * MuteToggleButton
 * 
 * Accessible mute control component that toggles sound on/off and persists preference.
 */
export default function MuteToggleButton({ style, className = '' }) {
  const [muted, setMuted] = useState(() => audioManager.getMuted())

  const handleToggle = () => {
    const nextMuted = audioManager.toggleMute()
    setMuted(nextMuted)
  }

  return (
    <button
      type="button"
      className={`mute-toggle-btn ${className}`}
      onClick={handleToggle}
      title={muted ? 'Unmute Audio' : 'Mute Audio'}
      style={{
        background: 'rgba(31, 41, 55, 0.75)',
        border: '1px solid rgba(75, 85, 99, 0.6)',
        borderRadius: '8px',
        color: muted ? '#ef4444' : '#10b981',
        padding: '6px 12px',
        fontSize: '0.85rem',
        fontWeight: 'bold',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        backdropFilter: 'blur(4px)',
        transition: 'all 0.2s ease',
        ...style
      }}
    >
      <span>{muted ? '🔇' : '🔊'}</span>
      <span>{muted ? 'MUTED' : 'SOUND'}</span>
    </button>
  )
}
