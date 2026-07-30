import React, { useState, useEffect, useRef } from 'react'
import ReactDOM from 'react-dom'
import useGameStore from '../../store/gameStore'
import { EvidenceTypeIcon, TYPE_COLORS, ReliabilityStars } from '../../utils/evidenceVisuals'
import { Pin, Clock, MapPin, Link, AlertTriangle, Flame, MessageSquare, Zap, Shield } from 'lucide-react'
import SuspectDossier from './SuspectDossier'



export default function EvidenceBoard() {
  const evidenceBoard = useGameStore((s) => s.evidenceBoard)
  const investigationTimeline = useGameStore((s) => s.investigationTimeline) || []
  const correlations = useGameStore((s) => s.correlations)
  const addCorrelation = useGameStore((s) => s.addCorrelation)
  const ws = useGameStore((s) => s.ws)
  const role = useGameStore((s) => s.role)

  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('board') // 'board' | 'dossier'
  const [positions, setPositions] = useState({})
  const [draggedId, setDraggedId] = useState(null)
  const [correlateMode, setCorrelateMode] = useState(false)
  const [correlateFrom, setCorrelateFrom] = useState(null)
  const [selectedYarn, setSelectedYarn] = useState(null)
  const dragOffset = useRef({ x: 0, y: 0 })
  const containerRef = useRef(null)

  // Listen for Escape key to close board
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  // Initialize random positions for new evidence cards on the corkboard
  useEffect(() => {
    if (!isOpen) return
    setPositions(prev => {
      const next = { ...prev }
      let updated = false
      evidenceBoard.forEach((item, index) => {
        if (!next[item.evidence_id]) {
          const angle = (index / Math.max(1, evidenceBoard.length)) * Math.PI * 2
          const radiusX = window.innerWidth * 0.25
          const radiusY = window.innerHeight * 0.20
          next[item.evidence_id] = {
            x: window.innerWidth * 0.45 + Math.cos(angle) * radiusX - 95,
            y: window.innerHeight * 0.45 + Math.sin(angle) * radiusY - 70
          }
          updated = true
        }
      })
      return updated ? next : prev
    })
  }, [evidenceBoard, isOpen])

  if (role !== 'DETECTIVE') return null

  // Dragging handlers
  const handleMouseDown = (e, id) => {
    if (e.target.tagName === 'BUTTON' || e.target.className.includes('link-btn')) return
    setDraggedId(id)
    const pos = positions[id] || { x: 100, y: 100 }
    dragOffset.current = {
      x: e.clientX - pos.x,
      y: e.clientY - pos.y
    }
  }

  const handleMouseMove = (e) => {
    if (!draggedId) return
    const container = containerRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    
    // Constraint within board boundaries
    const targetX = Math.max(10, Math.min(rect.width - 210, e.clientX - dragOffset.current.x))
    const targetY = Math.max(70, Math.min(rect.height - 180, e.clientY - dragOffset.current.y))

    setPositions(prev => ({
      ...prev,
      [draggedId]: { x: targetX, y: targetY }
    }))
  }

  const handleMouseUp = () => {
    setDraggedId(null)
  }

  useEffect(() => {
    if (draggedId) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [draggedId])

  const handleCardClick = (item) => {
    if (correlateMode && correlateFrom) {
      if (correlateFrom.evidence_id !== item.evidence_id) {
        // Trigger server-authoritative correlation check using USE_ABILITY
        if (ws) {
          ws.send(JSON.stringify({
            action: 'USE_ABILITY',
            ability_id: 'CORRELATE_EVIDENCE',
            evidence_id_a: correlateFrom.evidence_id,
            evidence_id_b: item.evidence_id
          }))
        } else {
          // Offline fallback
          addCorrelation(correlateFrom.evidence_id, item.evidence_id, {
            correlated: true,
            correlation_strength: 0.85,
            fabrication_warning: false,
            correlation_note: 'Apparent connection.'
          })
        }
      }
      setCorrelateFrom(null)
      setCorrelateMode(false)
    }
  }

  const startCorrelate = (item) => {
    setCorrelateFrom(item)
    setCorrelateMode(true)
  }

  return (
    <>
      {/* HUD Board Button */}
      <button
        id="evidence-board-toggle"
        type="button"
        className={`evidence-board-toggle ${isOpen ? 'active' : ''}`}
        onClick={(e) => {
          e.stopPropagation()
          setIsOpen(!isOpen)
        }}
        title="Open Case Board (Detective Only)"
        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <Pin size={15} />
        {evidenceBoard.length > 0 && (
          <span className="evidence-badge-num">{evidenceBoard.length}</span>
        )}
      </button>

      {/* Full-Screen Detective Corkboard via React Portal */}
      {isOpen && ReactDOM.createPortal(
        <div
          className="corkboard-screen-overlay"
          ref={containerRef}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="corkboard-header">
            <div className="header-left">
              <h2 style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Pin size={18} /> CASE INVESTIGATION BOARD</h2>
              <span className="badge">DETECTIVE AUTHORIZED</span>

              {/* Tab Switcher */}
              <div style={{ display: 'flex', gap: '8px', marginLeft: '20px' }}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setActiveTab('board')
                  }}
                  style={{
                    background: activeTab === 'board' ? '#b22222' : '#3b2a1a',
                    color: '#f5d0a9',
                    border: '1px solid #5c402b',
                    padding: '6px 14px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontWeight: 'bold',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <Pin size={12} /> Evidence Board ({evidenceBoard.length})
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setActiveTab('timeline')
                  }}
                  style={{
                    background: activeTab === 'timeline' ? '#b22222' : '#3b2a1a',
                    color: '#f5d0a9',
                    border: '1px solid #5c402b',
                    padding: '6px 14px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontWeight: 'bold',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <Clock size={12} /> Timeline ({investigationTimeline.length})
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setActiveTab('dossier')
                  }}
                  style={{
                    background: activeTab === 'dossier' ? '#b22222' : '#3b2a1a',
                    color: '#f5d0a9',
                    border: '1px solid #5c402b',
                    padding: '6px 14px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontWeight: 'bold',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <Shield size={12} /> Suspect Dossiers
                </button>
              </div>
            </div>

            <div className="header-right">
              {activeTab === 'board' && correlateMode && (
                <div className="correlation-alert animate-pulse">
                  LINKING MODE: Choose another card to connect with yarn string
                  <button
                    type="button"
                    className="cancel-btn"
                    onClick={(e) => {
                      e.stopPropagation()
                      setCorrelateMode(false)
                      setCorrelateFrom(null)
                    }}
                  >
                    Cancel
                  </button>
                </div>
              )}
              <button
                type="button"
                className="close-corkboard-btn"
                onClick={(e) => {
                  e.stopPropagation()
                  e.preventDefault()
                  setIsOpen(false)
                }}
              >
                ✕ CLOSE BOARD
              </button>
            </div>
          </div>

          {activeTab === 'timeline' ? (
            <div className="timeline-container" style={{ padding: '24px 40px', overflowY: 'auto', maxHeight: 'calc(100vh - 120px)', fontFamily: "'JetBrains Mono', monospace" }}>
              <h3 style={{ color: '#f59e0b', fontSize: '15px', marginBottom: '16px', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={16} /> INVESTIGATION TIMELINE LOG
              </h3>
              {investigationTimeline.length === 0 ? (
                <p style={{ color: '#8c7d6c', fontSize: '13px', fontStyle: 'italic' }}>No timeline events recorded yet. Collect evidence or monitor campus activity to build the case history.</p>
              ) : (
                <div className="timeline-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {investigationTimeline.slice().reverse().map((evt, idx) => {
                    const EvtIcon = evt.event_type === 'DEMOLISHED' ? Flame : evt.event_type === 'COLLECTED' ? Pin : evt.event_type === 'STATEMENT' ? MessageSquare : Zap
                    return (
                      <div key={evt.event_id || evt.id || idx} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', background: 'rgba(255,255,255,0.03)', borderLeft: evt.event_type === 'DEMOLISHED' ? '4px solid #ef4444' : evt.event_type === 'COLLECTED' ? '4px solid #10b981' : '4px solid #3b82f6', padding: '12px 16px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
                          <EvtIcon size={18} style={{ color: evt.event_type === 'DEMOLISHED' ? '#ef4444' : evt.event_type === 'COLLECTED' ? '#10b981' : '#3b82f6' }} />
                        </span>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <strong style={{ color: evt.event_type === 'DEMOLISHED' ? '#f87171' : evt.event_type === 'COLLECTED' ? '#34d399' : '#60a5fa', fontSize: '13px' }}>{evt.title || evt.event_type}</strong>
                            <span style={{ color: '#94a3b8', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <MapPin size={11} /> {evt.area || 'Campus'}
                            </span>
                          </div>
                          <p style={{ color: '#e2e8f0', fontSize: '12px', margin: 0, lineHeight: '1.4' }}>{evt.description}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ) : activeTab === 'dossier' ? (
            <SuspectDossier />
          ) : (
            <>
              {/* SVG Yarn strings */}
              <svg className="corkboard-svg-yarn">
                {correlations.map(([idA, idB, meta], i) => {
                  const posA = positions[idA]
                  const posB = positions[idB]
                  if (!posA || !posB) return null

                  const cx1 = posA.x + 95
                  const cy1 = posA.y + 75
                  const cx2 = posB.x + 95
                  const cy2 = posB.y + 75

                  const isSelected = selectedYarn === i

                  return (
                    <g key={i} onClick={() => setSelectedYarn(isSelected ? null : i)}>
                      {/* Outer shadow for depth */}
                      <line
                        x1={cx1} y1={cy1} x2={cx2} y2={cy2}
                        stroke="rgba(0,0,0,0.5)"
                        strokeWidth="7"
                        strokeLinecap="round"
                      />
                      {/* Crimson yarn */}
                      <line
                        x1={cx1} y1={cy1} x2={cx2} y2={cy2}
                        stroke={isSelected ? '#f59e0b' : '#b22222'}
                        strokeWidth={isSelected ? '6' : '4.5'}
                        strokeLinecap="round"
                        className="yarn-line-draw"
                      />
                      {/* Star intersection dot */}
                      <circle cx={(cx1+cx2)/2} cy={(cy1+cy2)/2} r="4" fill="#fed7aa" />
                    </g>
                  )
                })}
              </svg>

              {/* Draggable Cards */}
              {evidenceBoard.map(item => {
                const pos = positions[item.evidence_id] || { x: 100, y: 100 }
                const isCorrelatingSource = correlateFrom?.evidence_id === item.evidence_id
                const canBeLinkedTarget = correlateMode && correlateFrom?.evidence_id !== item.evidence_id
                const evColor = TYPE_COLORS[item.evidence_type] || '#fff'

                return (
                  <div
                    key={item.evidence_id}
                    className={`corkboard-card ${isCorrelatingSource ? 'source-linking' : ''} ${canBeLinkedTarget ? 'target-linkable' : ''}`}
                    style={{
                      transform: `translate(${pos.x}px, ${pos.y}px)`,
                      '--ev-color': evColor
                    }}
                    onMouseDown={(e) => handleMouseDown(e, item.evidence_id)}
                    onClick={() => handleCardClick(item)}
                  >
                    {/* Push Pin */}
                    <div className="card-pin" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Pin size={16} style={{ color: '#dc2626' }} />
                    </div>

                    {/* Card body */}
                    <div className="card-inner">
                      <div className="card-meta">
                        <span className="type-icon">
                          <EvidenceTypeIcon type={item.evidence_type} size={20} />
                        </span>
                        <div>
                          <div className="type-label">{item.evidence_type}</div>
                          <div className="area-label">{item.area_found || item.area}</div>
                        </div>
                      </div>
                      
                      <div className="card-desc">
                        {item.description || item.template_data?.description || 'Collected clue file.'}
                      </div>

                      <div className="card-footer">
                        <div className="target-label">
                          Points to: <strong>{item.points_to_player_id || 'Neutral'}</strong>
                        </div>
                        
                        <div className="stars-row">
                          <ReliabilityStars score={item.reliability_score ?? 0.8} />
                        </div>

                        {!correlateMode && (
                          <button className="link-btn" onClick={() => startCorrelate(item)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <Link size={10} /> Link
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}

              {/* Yarn Connection Details Tooltip Panel */}
              {selectedYarn !== null && correlations[selectedYarn] && (
                <div className="yarn-details-panel">
                  <h4 style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Link size={14} /> Evidence Link Evaluation</h4>
                  {correlations[selectedYarn][2] ? (
                    <>
                      <p><strong>Note:</strong> {correlations[selectedYarn][2].correlation_note}</p>
                      <p><strong>Link Confidence:</strong> {(correlations[selectedYarn][2].correlation_strength * 100).toFixed(0)}%</p>
                      {correlations[selectedYarn][2].fabrication_warning && (
                        <p className="warning-text" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <AlertTriangle size={12} /> Warning: Suspicion of falsified evidence detected!
                        </p>
                      )}
                    </>
                  ) : (
                    <p>Establishing link metrics... (Waiting for server confirmation)</p>
                  )}
                  <button onClick={() => setSelectedYarn(null)}>Dismiss</button>
                </div>
              )}
            </>
          )}



          {/* Internal Corkboard styling */}
          <style>{`
            .corkboard-screen-overlay {
              position: fixed;
              top: 0;
              left: 0;
              width: 100vw;
              height: 100vh;
              z-index: 9999;
              background-color: #241910;
              background-image: 
                radial-gradient(rgba(0,0,0,0.15) 15%, transparent 16%),
                radial-gradient(rgba(0,0,0,0.15) 15%, transparent 16%);
              background-size: 60px 60px;
              background-position: 0 0, 30px 30px;
              box-shadow: inset 0 0 100px rgba(0,0,0,0.85);
              overflow: hidden;
              user-select: none;
            }

            .corkboard-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 15px 30px;
              background: rgba(10, 8, 5, 0.88);
              border-bottom: 2px solid #3b2a1a;
              color: #f5d0a9;
              font-family: 'JetBrains Mono', monospace;
            }

            .corkboard-header h2 {
              margin: 0;
              font-size: 20px;
              letter-spacing: 1px;
            }

            .header-left {
              display: flex;
              align-items: center;
              gap: 15px;
            }

            .header-left .badge {
              font-size: 11px;
              background: #b22222;
              color: white;
              padding: 2px 8px;
              border-radius: 3px;
              font-weight: bold;
            }

            .close-corkboard-btn {
              background: #3b2a1a;
              color: #f5d0a9;
              border: 1px solid #5c402b;
              padding: 8px 16px;
              cursor: pointer;
              font-family: inherit;
              font-weight: bold;
              transition: all 0.2s;
            }

            .close-corkboard-btn:hover {
              background: #b22222;
              color: white;
              border-color: #ef4444;
            }

            .corkboard-svg-yarn {
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              pointer-events: stroke;
            }

            .yarn-line-draw {
              transition: stroke 0.2s;
              cursor: pointer;
            }
            .yarn-line-draw:hover {
              stroke: #f59e0b !important;
              stroke-width: 6.5px !important;
            }

            .corkboard-card {
              position: absolute;
              width: 200px;
              background: #fbf0d9;
              border: 1px solid #dcd0b9;
              box-shadow: 3px 5px 15px rgba(0,0,0,0.45);
              border-radius: 4px;
              cursor: grab;
              z-index: 10;
              padding: 10px;
              font-family: 'Inter', sans-serif;
              color: #2b1f14;
            }

            .corkboard-card:active {
              cursor: grabbing;
              z-index: 50;
              box-shadow: 5px 10px 25px rgba(0,0,0,0.55);
            }

            .card-pin {
              position: absolute;
              top: -12px;
              left: 50%;
              transform: translateX(-50%);
              font-size: 20px;
              filter: drop-shadow(1px 2px 2px rgba(0,0,0,0.4));
              pointer-events: none;
            }

            .card-inner {
              border-top: 3px solid var(--ev-color);
              padding-top: 8px;
            }

            .card-meta {
              display: flex;
              align-items: center;
              gap: 8px;
              margin-bottom: 8px;
            }

            .type-icon {
              font-size: 22px;
            }

            .type-label {
              font-size: 11px;
              font-weight: bold;
              text-transform: uppercase;
              color: #5c4d3c;
              letter-spacing: 0.5px;
            }

            .area-label {
              font-size: 10px;
              color: #8c7d6c;
            }

            .card-desc {
              font-size: 11.5px;
              line-height: 1.4;
              height: 52px;
              overflow-y: auto;
              margin-bottom: 8px;
              background: rgba(255,255,255,0.4);
              padding: 4px;
              border-radius: 2px;
              border-left: 2px solid #5c4d3c;
            }

            .card-footer {
              display: flex;
              flex-direction: column;
              gap: 5px;
              border-top: 1px dashed #dcd0b9;
              padding-top: 6px;
            }

            .target-label {
              font-size: 10.5px;
              color: #4a3c2c;
            }

            .stars-row {
              display: flex;
              justify-content: space-between;
              align-items: center;
            }

            .reliability-stars {
              color: #dcd0b9;
              font-size: 13px;
              letter-spacing: -1px;
            }

            .reliability-stars .star.filled {
              color: #f59e0b;
            }

            .link-btn {
              background: #5c4d3c;
              color: white;
              border: none;
              padding: 3px 8px;
              font-size: 10.5px;
              cursor: pointer;
              border-radius: 2px;
              align-self: flex-end;
            }

            .link-btn:hover {
              background: #b22222;
            }

            .source-linking {
              border-color: #ef4444 !important;
              box-shadow: 0 0 15px #ef4444;
            }

            .target-linkable {
              cursor: pointer !important;
              animation: link-pulse 1.5s infinite;
            }

            @keyframes link-pulse {
              0% { box-shadow: 0 0 5px #22c55e; }
              50% { box-shadow: 0 0 15px #22c55e; }
              100% { box-shadow: 0 0 5px #22c55e; }
            }

            .correlation-alert {
              background: #b22222;
              color: white;
              padding: 6px 12px;
              font-size: 12px;
              border-radius: 3px;
              display: inline-flex;
              align-items: center;
              gap: 10px;
              font-family: sans-serif;
            }

            .cancel-btn {
              background: white;
              color: #b22222;
              border: none;
              padding: 2px 6px;
              cursor: pointer;
              font-size: 11px;
              font-weight: bold;
            }

            .yarn-details-panel {
              position: absolute;
              bottom: 30px;
              left: 30px;
              width: 280px;
              background: rgba(10, 8, 5, 0.92);
              border: 1.5px solid #d59e0b;
              border-radius: 4px;
              padding: 15px;
              color: #f5d0a9;
              font-family: 'JetBrains Mono', monospace;
              box-shadow: 0 10px 25px rgba(0,0,0,0.65);
              z-index: 100;
            }

            .yarn-details-panel h4 {
              margin-top: 0;
              color: #f59e0b;
              border-bottom: 1px solid #3b2a1a;
              padding-bottom: 6px;
            }

            .yarn-details-panel p {
              font-size: 11.5px;
              margin: 6px 0;
              line-height: 1.4;
            }

            .yarn-details-panel .warning-text {
              color: #ef4444;
              font-weight: bold;
            }

            .close-corkboard-btn {
              background: #3b2a1a;
              color: #f5d0a9;
              border: 1px solid #5c402b;
              padding: 8px 16px;
              cursor: pointer !important;
              font-family: inherit;
              font-weight: bold;
              transition: all 0.2s;
              position: relative;
              z-index: 10002 !important;
              pointer-events: auto !important;
            }

            .close-corkboard-btn:hover {
              background: #b22222;
              color: white;
              border-color: #ef4444;
            }
          `}</style>
        </div>,
        document.body
      )}
    </>
  )
}
