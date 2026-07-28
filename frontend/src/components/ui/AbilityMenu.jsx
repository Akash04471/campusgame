import React, { useEffect } from 'react'
import useGameStore from '../../store/gameStore'
import audioManager from '../../utils/audioManager'

const ROLE_ABILITY_ICONS = {
  CCTV_ANALYSIS:      '📷',
  MOVEMENT_TRACE:     '📍',
  DIGITAL_ANALYSIS:   '💻',
  RECOVER_LOGS:       '🗄️',
  CORRELATE_EVIDENCE: '🔗',
  SUBMIT_OBSERVATION: '📝',
  PLANT_FAKE_EVIDENCE:'🎭',
  TRIGGER_MEETING:    '🔔',
  FRAME_PLAYER:       '🎯',
  MANIPULATE_NPC:     '🧠',
  DESTROY_EVIDENCE:   '🗑️',
  SECURE_PERIMETER:   '🔒',
  CREATE_ALIBI:       '📋',
}


function CooldownRing({ progress }) {
  const r = 18
  const circumference = 2 * Math.PI * r
  const dashoffset = circumference * (1 - progress)
  return (
    <svg className="cooldown-ring" viewBox="0 0 40 40">
      <circle cx="20" cy="20" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
      <circle
        cx="20" cy="20" r={r}
        fill="none"
        stroke="#f43f5e"
        strokeWidth="3"
        strokeDasharray={circumference}
        strokeDashoffset={dashoffset}
        strokeLinecap="round"
        transform="rotate(-90 20 20)"
      />
    </svg>
  )
}

function AbilityButton({ ability, onUse }) {
  const progress = ability.is_on_cooldown
    ? (ability.cooldown_remaining / (ability.cooldown_remaining + 1))
    : 0

  return (
    <button
      className={`ability-btn ${ability.is_on_cooldown || ability.uses_remaining <= 0 ? 'disabled' : ''}`}
      onClick={() => !ability.is_on_cooldown && ability.uses_remaining > 0 && onUse(ability)}
      title={ability.description}
      id={`ability-${ability.ability_id}`}
    >
      <div className="ability-btn-inner">
        {ability.is_on_cooldown && <CooldownRing progress={1 - progress} />}
        <span className="ability-btn-icon">
          {ROLE_ABILITY_ICONS[ability.ability_id] || '⚡'}
        </span>
      </div>
      <p className="ability-btn-label">{ability.name}</p>
      {ability.is_on_cooldown && (
        <p className="ability-cooldown-text">{ability.cooldown_remaining}s</p>
      )}
      {!ability.is_on_cooldown && ability.max_uses < 99 && (
        <p className="ability-uses-text">{ability.uses_remaining}/{ability.max_uses}</p>
      )}
    </button>
  )
}

export default function AbilityMenu() {
  const abilities = useGameStore((s) => s.abilities)
  const abilityMenuOpen = useGameStore((s) => s.abilityMenuOpen)
  const toggleAbilityMenu = useGameStore((s) => s.toggleAbilityMenu)
  const updateAbility = useGameStore((s) => s.updateAbility)
  const currentArea = useGameStore((s) => s.currentArea)
  const showToast = useGameStore((s) => s.showToast)
  const setCctvReport = useGameStore((s) => s.setCctvReport)
  const pushEvidenceCard = useGameStore((s) => s.pushEvidenceCard)
  const setMovementTraceReport = useGameStore((s) => s.setMovementTraceReport)
  const setMeetingActive = useGameStore((s) => s.setMeetingActive)
  const ws = useGameStore((s) => s.ws)

  // Tab key toggle
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Tab') {
        e.preventDefault()
        toggleAbilityMenu()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [toggleAbilityMenu])

  const handleUse = (ability) => {
    if (ability.is_on_cooldown || (ability.uses_remaining !== undefined && ability.uses_remaining <= 0)) {
      return
    }

    // Play select sound effect
    audioManager.playSfx('select')

    // Send to WebSocket server if connected
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        action: 'USE_ABILITY',
        ability_id: ability.ability_id,
      }))
    }

    // Apply local cooldown & update remaining uses
    const newUses = ability.uses_remaining < 99 ? Math.max(0, ability.uses_remaining - 1) : ability.uses_remaining
    const cdTime = ability.duration_seconds || 30

    updateAbility({
      ability_id: ability.ability_id,
      uses_remaining: newUses,
      is_on_cooldown: cdTime > 0,
      cooldown_remaining: cdTime,
    })

    // Execute local feature effect (works in solo mode or as instant local feedback)
    switch (ability.ability_id) {
      case 'CCTV_ANALYSIS': {
        const areaName = currentArea || 'Security Office'
        setCctvReport({
          area: areaName,
          time_window_minutes: 5,
          movement_replay: [
            { color_index: 1, waypoints: [{ x: -5, z: -10 }, { x: 0, z: -5 }, { x: 5, z: 0 }] },
            { color_index: 2, waypoints: [{ x: 10, z: 8 }, { x: 5, z: 2 }, { x: -2, z: -5 }] },
            { color_index: 3, waypoints: [{ x: -12, z: 10 }, { x: -5, z: 5 }, { x: 0, z: 0 }] },
          ],
          generated_evidence: [
            {
              evidence_id: 'cctv_ev_' + Date.now(),
              evidence_type: 'DIGITAL',
              area: areaName,
              description: `CCTV feed captured suspect movement pattern in ${areaName} at 22:14.`,
              reliability_score: 0.88,
            }
          ]
        })
        showToast(`📷 CCTV Analysis generated report for ${areaName}.`)
        break
      }
      case 'DIGITAL_ANALYSIS': {
        const areaName = currentArea || 'Computer Lab'
        pushEvidenceCard({
          evidence_id: 'dig_ev_' + Date.now(),
          evidence_type: 'DIGITAL',
          title: 'Digital Evidence Log Recovered',
          area_found: areaName,
          description: `Recovered terminal system log in ${areaName} showing unauthorized login at 22:47.`,
          points_to_player_id: '9002',
          reliability_score: 0.92,
          timestamp: Date.now()
        })
        showToast(`💻 Digital Analysis complete. Evidence Card secured!`)
        break
      }
      case 'RECOVER_LOGS': {
        const areaName = currentArea || 'Research Center'
        pushEvidenceCard({
          evidence_id: 'rec_log_' + Date.now(),
          evidence_type: 'PHYSICAL',
          title: 'Encrypted Log Fragment',
          area_found: areaName,
          description: `Extracted deleted project metadata in ${areaName} linked to suspicious activity.`,
          points_to_player_id: '9003',
          reliability_score: 0.85,
          timestamp: Date.now()
        })
        showToast(`🗄️ Logs recovered in ${areaName}! Evidence Card secured.`)
        break
      }
      case 'CORRELATE_EVIDENCE': {
        showToast(`🔗 Evidence correlation active! Use Evidence Board to link cards.`)
        break
      }
      case 'MOVEMENT_TRACE': {
        const areaName = currentArea || 'Security Office'
        setMovementTraceReport({
          area: areaName,
          time_window_minutes: 8,
          identified_presence: [
            { player_id: '9001', first_seen: 120, last_seen: 240, duration_seconds: 120 },
            { player_id: '9002', first_seen: 300, last_seen: 450, duration_seconds: 150 },
          ]
        })
        showToast(`📍 Movement Trace report generated for ${areaName}.`)
        break
      }
      case 'TRIGGER_MEETING': {
        setMeetingActive(true)
        showToast('🔔 Emergency meeting triggered!')
        break
      }
      default: {
        showToast(`⚡ Ability "${ability.name}" activated!`)
        break
      }
    }

    // Close ability menu
    toggleAbilityMenu()
  }

  if (abilities.length === 0) return null

  return (
    <>
      {/* Tab hint */}
      {!abilityMenuOpen && (
        <div className="ability-hint" id="ability-hint">
          <kbd>Tab</kbd> Abilities
        </div>
      )}

      {/* Menu overlay */}
      {abilityMenuOpen && (
        <div className="ability-menu-overlay" id="ability-menu" onClick={toggleAbilityMenu}>
          <div className="ability-menu-panel" onClick={(e) => e.stopPropagation()}>
            <div className="ability-menu-header">
              <h3>⚡ ABILITIES</h3>
              <button className="panel-close-btn" onClick={toggleAbilityMenu}>✕</button>
            </div>
            <div className="ability-grid">
              {abilities.map(ab => (
                <AbilityButton key={ab.ability_id} ability={ab} onUse={handleUse} />
              ))}
            </div>
            <p className="ability-menu-hint">Press <kbd>Tab</kbd> to close</p>
          </div>
        </div>
      )}
    </>
  )
}
