import React, { useEffect } from 'react'
import useGameStore from '../../store/gameStore'
import { EvidenceTypeIcon, TYPE_COLORS, ReliabilityStars } from '../../utils/evidenceVisuals'
import { Pin, MapPin } from 'lucide-react'

export default function EvidenceCardPopup() {
  const cardQueue = useGameStore((s) => s.evidenceCardQueue)
  const popEvidenceCard = useGameStore((s) => s.popEvidenceCard)
  const role = useGameStore((s) => s.role)

  const currentCard = cardQueue[0] || null

  useEffect(() => {
    if (!currentCard) return
    const timer = setTimeout(() => {
      popEvidenceCard()
    }, 6000)
    return () => clearTimeout(timer)
  }, [currentCard, popEvidenceCard])

  if (!currentCard) return null

  const evColor = TYPE_COLORS[currentCard.evidence_type] || '#FFD700'
  const isDetective = role === 'DETECTIVE'

  return (
    <div
      className="evidence-popup-overlay"
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 9990,
        pointerEvents: 'auto',
      }}
    >
      <div
        className="evidence-popup-card animate-card-slide-in"
        style={{
          width: '310px',
          background: 'linear-gradient(135deg, #1c150c 0%, #2b1f14 100%)',
          border: '1.5px solid rgba(200, 160, 80, 0.4)',
          borderRadius: '8px',
          padding: '16px',
          color: '#f5d0a9',
          fontFamily: "'Inter', sans-serif",
          boxShadow: '0 12px 30px rgba(0, 0, 0, 0.7), 0 0 20px rgba(200, 160, 80, 0.15)',
          position: 'relative',
        }}
      >
        {/* Push Pin */}
        <div style={{ position: 'absolute', top: '-10px', left: '16px', display: 'flex', alignItems: 'center' }}>
          <Pin size={16} style={{ color: '#dc2626' }} />
        </div>

        {/* Card Header */}
        <div style={{ borderTop: `3px solid ${evColor}`, paddingTop: '8px', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center' }}>
              <EvidenceTypeIcon type={currentCard.evidence_type} size={20} />
            </span>
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '10px',
                background: 'rgba(200, 160, 80, 0.15)',
                color: evColor,
                padding: '2px 8px',
                borderRadius: '4px',
                textTransform: 'uppercase',
                fontWeight: 'bold',
              }}
            >
              {currentCard.evidence_type}
            </span>
          </div>

          <div
            style={{
              fontSize: '11px',
              color: '#a38a6d',
              fontFamily: "'JetBrains Mono', monospace",
              marginTop: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <MapPin size={11} />
            <span>{currentCard.area_found || currentCard.area || 'Campus Grounds'}</span>
          </div>
        </div>


        {/* Description */}
        <div
          style={{
            fontSize: '12.5px',
            lineHeight: '1.45',
            color: '#fbf0d9',
            background: 'rgba(0, 0, 0, 0.3)',
            padding: '8px 10px',
            borderRadius: '4px',
            borderLeft: '2px solid rgba(200, 160, 80, 0.4)',
            marginBottom: '10px',
          }}
        >
          {currentCard.description || 'Clue collected from the scene.'}
        </div>

        {/* Analyst Note for Non-Detectives */}
        {currentCard.analyst_note && !isDetective && (
          <div
            style={{
              fontSize: '11px',
              fontStyle: 'italic',
              color: '#d4a847',
              marginBottom: '10px',
              lineHeight: '1.35',
            }}
          >
            💡 <strong>Analyst Note:</strong> {currentCard.analyst_note}
          </div>
        )}

        {/* Target & Reliability for Detectives */}
        {isDetective && (
          <div style={{ fontSize: '11px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#c4b5fd' }}>
              Target: <strong>{currentCard.points_to_player_id || 'Neutral'}</strong>
            </span>
            {typeof currentCard.reliability_score === 'number' && (
              <ReliabilityStars score={currentCard.reliability_score} />
            )}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
          <span style={{ fontSize: '9px', color: '#8c7d6c', fontFamily: 'monospace' }}>
            AUTO-DISMISS IN 6S
          </span>
          <button
            onClick={() => popEvidenceCard()}
            style={{
              background: 'linear-gradient(135deg, #b22222 0%, #8b0000 100%)',
              color: '#ffffff',
              border: '1px solid #dc2626',
              padding: '6px 14px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '11px',
              fontWeight: 'bold',
              boxShadow: '0 2px 8px rgba(178, 34, 34, 0.4)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.03)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1.0)')}
          >
            📥 POCKET IT
          </button>
        </div>
      </div>

      <style>{`
        @keyframes cardSlideIn {
          from { opacity: 0; transform: translateY(-20px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-card-slide-in {
          animation: cardSlideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
      `}</style>
    </div>
  )
}
