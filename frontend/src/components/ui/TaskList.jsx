import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Wrench, 
  Folder, 
  Clipboard, 
  Video, 
  Printer, 
  FlaskConical, 
  Tv, 
  Utensils, 
  MapPin, 
  Award, 
  Clock, 
  AlertCircle, 
  ChevronDown, 
  ChevronUp, 
  Navigation,
  CheckCircle2,
  XCircle,
  Play,
  Target,
  X,
  Zap,
  ListFilter
} from 'lucide-react'
import useGameStore from '../../store/gameStore'

/* Area coordinates matching the 3D map */
const AREA_WORLD_POSITIONS = {
  'Research Center':  [28, -20],
  'Computer Lab':     [28,   0],
  'Security Office':  [-30,  4],
  'MCA Department':   [ 8,  14],
  'Main Block':       [-10, -8],
  'Auditorium':       [-28,-28],
  'Library':          [-24, 22],
  'Cafeteria':        [ 32, 16],
}

/* Dynamic role-aware task metadata — each role has 3 unique task types */
const TASK_MAPPINGS = {
  DETECTIVE: {
    ANALYZE_CCTV: { name: 'Analyze CCTV Surveillance Feeds', category: 'Surveillance', desc: 'Review and cross-reference surveillance camera feeds from the Security Office to identify suspect movements and timeline anomalies.', priority: 'CRITICAL', priorityColor: '#f43f5e' },
    AUDIT_SERVER_LOGS: { name: 'Audit Server Access Logs', category: 'Digital Forensics', desc: 'Examine server access logs in the Computer Lab for unauthorized logins, file transfers, and suspicious activity timestamps.', priority: 'HIGH', priorityColor: '#f59e0b' },
    DECRYPT_SCHEMATICS: { name: 'Decrypt Encrypted Schematics', category: 'Evidence Analysis', desc: 'Crack the encryption on classified research schematics at the Research Center to uncover hidden evidence trails.', priority: 'HIGH', priorityColor: '#f59e0b' },
  },
  INVESTIGATOR: {
    CATALOG_EVIDENCE: { name: 'Catalog Physical Evidence', category: 'Forensics', desc: 'Systematically catalog and tag all physical evidence items found in the Library archives for cross-referencing.', priority: 'HIGH', priorityColor: '#f59e0b' },
    SCAN_FINGERPRINTS: { name: 'Scan Fingerprint Database', category: 'Biometrics', desc: 'Run fingerprint scans against the MCA Department biometric database to identify unknown prints found at crime scenes.', priority: 'CRITICAL', priorityColor: '#f43f5e' },
    TRACE_SIGNAL: { name: 'Trace Radio Signal Source', category: 'Field Forensics', desc: 'Use signal triangulation equipment in the Auditorium to pinpoint the source of encrypted radio transmissions.', priority: 'MEDIUM', priorityColor: '#eab308' },
  },
  MASTERMIND: {
    INJECT_MALWARE: { name: 'Inject Malware into Server', category: 'Sabotage', desc: 'Deploy a polymorphic malware payload on the Computer Lab server to corrupt digital evidence and cover your tracks.', priority: 'CRITICAL', priorityColor: '#f43f5e' },
    FORGE_ACCESS_BADGE: { name: 'Forge Security Access Badge', category: 'Deception', desc: 'Fabricate a counterfeit security badge at the Main Block to frame an innocent player with unauthorized access records.', priority: 'HIGH', priorityColor: '#f59e0b' },
    SCRAMBLE_COMMS: { name: 'Scramble Communication Channels', category: 'Sabotage', desc: 'Disrupt encrypted communication frequencies at the Security Office to prevent investigators from coordinating.', priority: 'HIGH', priorityColor: '#f59e0b' },
  },
  CONSPIRATOR: {
    SHRED_EVIDENCE: { name: 'Shred Physical Evidence Logs', category: 'Cover-up', desc: 'Destroy physical evidence logs stored in the Library before investigators can catalog and cross-reference them.', priority: 'CRITICAL', priorityColor: '#f43f5e' },
    WIPE_BACKUP_DRIVE: { name: 'Wipe Backup Hard Drive', category: 'Sabotage', desc: 'Securely erase forensic backup drives at the Research Center to eliminate any recoverable digital evidence.', priority: 'HIGH', priorityColor: '#f59e0b' },
    PLANT_DIVERSION: { name: 'Plant Diversionary Device', category: 'Deception', desc: 'Set up a diversionary device in the Cafeteria to create chaos and draw investigators away from key evidence areas.', priority: 'MEDIUM', priorityColor: '#eab308' },
  }
}

const TASK_ICONS = {
  // Detective
  ANALYZE_CCTV: Video,
  AUDIT_SERVER_LOGS: Clipboard,
  DECRYPT_SCHEMATICS: Zap,
  // Investigator
  CATALOG_EVIDENCE: Folder,
  SCAN_FINGERPRINTS: Target,
  TRACE_SIGNAL: Tv,
  // Mastermind
  INJECT_MALWARE: AlertCircle,
  FORGE_ACCESS_BADGE: Printer,
  SCRAMBLE_COMMS: Wrench,
  // Conspirator
  SHRED_EVIDENCE: XCircle,
  WIPE_BACKUP_DRIVE: FlaskConical,
  PLANT_DIVERSION: Utensils,
}

function TaskItemCard({ task, isExpanded, onToggleExpand, activeTaskId, setActiveTask, distance, role, inConsole, onActionClose }) {
  const currentArea = useGameStore((s) => s.currentArea)
  const taskStartedId = useGameStore((s) => s.taskStartedId)
  const setTaskStarted = useGameStore((s) => s.setTaskStarted)

  const isInZone = currentArea === task.location
  const progressPercent = Math.round(task.progress * 100)
  const isStarted = taskStartedId === task.task_id
  
  // Get dynamic details based on player role
  const roleKey = (role && TASK_MAPPINGS[role.toUpperCase()]) ? role.toUpperCase() : 'INVESTIGATOR'
  const details = TASK_MAPPINGS[roleKey][task.task_type] || {
    name: task.name,
    category: 'Campus',
    desc: 'Perform the designated objective.',
    priority: 'LOW',
    priorityColor: '#94a3b8'
  }

  const IconComp = TASK_ICONS[task.task_type] || AlertCircle
  const isTracked = activeTaskId === task.task_id

  const handleStartClick = (e) => {
    e.stopPropagation()
    if (isStarted) {
      setTaskStarted(null)
    } else {
      setActiveTask(task.task_id)
      setTaskStarted(task.task_id)
    }
    if (onActionClose) onActionClose()
  }

  const handleTrackClick = (e) => {
    e.stopPropagation()
    if (isTracked) {
      setActiveTask(null)
    } else {
      setActiveTask(task.task_id)
    }
    if (onActionClose) onActionClose()
  }

  // Force expanded when in console view for total clarity
  const showFullDetails = inConsole || isExpanded

  return (
    <motion.div
      layout
      onClick={onToggleExpand}
      className={`task-item-card ${task.completed ? 'completed' : ''} ${isStarted ? 'task-started' : ''} ${isInZone && !task.completed ? 'active-zone' : ''} ${isTracked && !task.completed ? 'active-tracked' : ''}`}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.2 }}
      style={{ '--priority-color': details.priorityColor }}
    >
      {/* Top Header Badge Bar */}
      <div className="task-card-badge-bar">
        <div className="task-badge-category">
          <IconComp size={13} />
          <span>{details.category}</span>
        </div>
        <span className={`task-badge-priority priority-${details.priority.toLowerCase()}`}>
          {details.priority} PRIORITY
        </span>
        <span className="task-badge-points">+{task.points} pts</span>
      </div>

      {/* Main Title & Location */}
      <div className="task-card-header">
        <h3 className="task-card-title">{details.name}</h3>
        <div className="task-card-location">
          <span>📍 {task.location}</span>
          {distance !== null && !task.completed && (
            <span className="task-card-distance">{distance}m away</span>
          )}
        </div>
      </div>

      {/* Progress Bar (if in progress) */}
      {!task.completed && task.progress > 0 && (
        <div className="task-card-progress-container">
          <div className="task-card-progress-info">
            <span>Progress</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="task-card-progress-bar">
            <div
              className="task-card-progress-fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Description & Metadata */}
      {showFullDetails && (
        <div className="task-card-body">
          <p className="task-card-desc">{details.desc}</p>

          <div className="task-meta-pills">
            <div className="meta-pill">
              <span className="meta-pill-label">Est. Time:</span>
              <span className="meta-pill-val">{task.duration_seconds}s</span>
            </div>
            <div className="meta-pill">
              <span className="meta-pill-label">Status:</span>
              <span className={`meta-pill-val ${task.completed ? 'text-emerald-400' : 'text-amber-400'}`}>
                {task.completed ? '✓ Completed' : task.progress > 0 ? `${progressPercent}% Done` : 'Not Started'}
              </span>
            </div>
          </div>

          {/* Action Buttons Row */}
          {!task.completed && (
            <div className="task-actions-row">
              <button
                type="button"
                className={`task-btn-start ${isStarted ? 'started' : ''}`}
                onClick={handleStartClick}
              >
                <Play size={13} fill={isStarted ? '#10b981' : 'currentColor'} />
                <span>{isStarted ? 'ACTIVE TASK' : 'START TASK'}</span>
              </button>

              <button
                type="button"
                className={`task-btn-track ${isTracked ? 'tracked' : ''}`}
                onClick={handleTrackClick}
              >
                <Navigation size={13} />
                <span>{isTracked ? 'UNTRACK' : 'TRACK MISSION'}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {isInZone && !task.completed && (
        <div className="task-zone-hint">
          <Navigation size={12} className="animate-pulse" />
          <span>{isStarted ? 'Objective Zone Reached! Hold E' : 'Tap START TASK to interact'}</span>
        </div>
      )}
    </motion.div>
  )
}

export default function TaskList() {
  const setTaskStarted = useGameStore((s) => s.setTaskStarted)
  const tasks = useGameStore((s) => s.tasks)
  const role = useGameStore((s) => s.role)
  const playerPosition = useGameStore((s) => s.playerPosition)
  const activeTaskId = useGameStore((s) => s.activeTaskId)
  const setActiveTask = useGameStore((s) => s.setActiveTask)

  const [isOpen, setIsOpen] = useState(false)
  const [expandedId, setExpandedId] = useState(null)
  const [filterTab, setFilterTab] = useState('ALL') // ALL | INCOMPLETE | COMPLETED
  const [sortBy, setSortBy] = useState('NEAREST') // NEAREST | PRIORITY | REWARD

  // Listen for Escape key to close objectives modal
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  // Calculate dynamic distances to each task location
  const taskDistances = {}
  tasks.forEach(task => {
    const coords = AREA_WORLD_POSITIONS[task.location]
    if (coords && playerPosition) {
      const dx = playerPosition[0] - coords[0]
      const dz = playerPosition[2] - coords[1]
      taskDistances[task.task_id] = Math.round(Math.sqrt(dx * dx + dz * dz))
    } else {
      taskDistances[task.task_id] = null
    }
  })

  if (tasks.length === 0) return null

  // Priority weight mapping
  const getPriorityWeight = (taskType) => {
    const roleKey = (role && TASK_MAPPINGS[role.toUpperCase()]) ? role.toUpperCase() : 'INVESTIGATOR'
    const details = TASK_MAPPINGS[roleKey][taskType]
    if (!details) return 0
    switch(details.priority) {
      case 'CRITICAL': return 4
      case 'HIGH': return 3
      case 'MEDIUM': return 2
      case 'LOW': return 1
      default: return 0
    }
  }

  const activeTasks = tasks.filter(t => !t.completed)
  const completedTasks = tasks.filter(t => t.completed)
  const completionPercent = Math.round((completedTasks.length / Math.max(1, tasks.length)) * 100)

  // Tracked task details for HUD button preview
  const trackedTask = tasks.find(t => t.task_id === activeTaskId && !t.completed) || activeTasks[0]
  const roleKey = (role && TASK_MAPPINGS[role.toUpperCase()]) ? role.toUpperCase() : 'INVESTIGATOR'
  const trackedDetails = trackedTask ? TASK_MAPPINGS[roleKey][trackedTask.task_type] : null

  // Filter & sort logic
  let displayedTasks = tasks
  if (filterTab === 'INCOMPLETE') displayedTasks = activeTasks
  else if (filterTab === 'COMPLETED') displayedTasks = completedTasks

  displayedTasks = [...displayedTasks].sort((a, b) => {
    const aTracked = a.task_id === activeTaskId ? 1 : 0
    const bTracked = b.task_id === activeTaskId ? 1 : 0
    if (aTracked !== bTracked) return bTracked - aTracked

    if (sortBy === 'NEAREST') {
      const distA = taskDistances[a.task_id] ?? 9999
      const distB = taskDistances[b.task_id] ?? 9999
      return distA - distB
    } else if (sortBy === 'PRIORITY') {
      return getPriorityWeight(b.task_type) - getPriorityWeight(a.task_type)
    } else if (sortBy === 'REWARD') {
      return b.points - a.points
    }
    return 0
  })

  // Full Objectives Modal content
  const modalContent = isOpen ? (
    <div
      className="objectives-modal-overlay"
      onClick={(e) => { e.stopPropagation(); setIsOpen(false) }}
    >
      <div
        className="objectives-modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="obj-modal-header">
          <div className="obj-modal-header-left">
            <Target size={22} className="obj-modal-icon" />
            <div>
              <h2 className="obj-modal-title">MISSION OBJECTIVES CONSOLE</h2>
              <p className="obj-modal-sub">
                Christ University Operations · Directives & Progress Matrix
              </p>
            </div>
          </div>
          <button
            type="button"
            className="obj-modal-close-btn"
            onClick={(e) => { e.stopPropagation(); setIsOpen(false) }}
          >
            <X size={16} />
            <span>CLOSE</span>
          </button>
        </div>

        {/* Global Progress Bar */}
        <div className="obj-modal-progress-card">
          <div className="obj-progress-label-row">
            <span className="obj-progress-title">CAMPUS TASKS SECURED</span>
            <span className="obj-progress-stats">
              {completedTasks.length} / {tasks.length} Completed ({completionPercent}%)
            </span>
          </div>
          <div className="obj-progress-track">
            <div
              className="obj-progress-fill"
              style={{ width: `${completionPercent}%` }}
            />
          </div>
        </div>

        {/* Controls & Filter Bar */}
        <div className="obj-modal-controls-bar">
          {/* Tabs */}
          <div className="obj-tabs-group">
            {[
              ['ALL', `ALL (${tasks.length})`],
              ['INCOMPLETE', `ACTIVE (${activeTasks.length})`],
              ['COMPLETED', `COMPLETED (${completedTasks.length})`],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={`obj-tab-btn ${filterTab === key ? 'active' : ''}`}
                onClick={(e) => { e.stopPropagation(); setFilterTab(key) }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Sort & Auto-Track */}
          <div className="obj-actions-group">
            <select
              className="obj-sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="NEAREST">📍 Nearest First</option>
              <option value="PRIORITY">⚠️ Highest Priority</option>
              <option value="REWARD">⭐ Highest Reward</option>
            </select>

            <button
              type="button"
              className="obj-autotrack-btn"
              onClick={(e) => {
                e.stopPropagation()
                const firstIncomplete = activeTasks[0]
                if (firstIncomplete) {
                  setActiveTask(firstIncomplete.task_id)
                  setTaskStarted(firstIncomplete.task_id)
                }
              }}
              disabled={activeTasks.length === 0}
            >
              <Zap size={12} />
              <span>Auto-Track</span>
            </button>
          </div>
        </div>

        {/* Task Cards Grid */}
        <div className="obj-modal-cards-grid">
          <AnimatePresence>
            {displayedTasks.map((task) => (
              <TaskItemCard
                key={task.task_id}
                task={task}
                isExpanded={expandedId === task.task_id}
                onToggleExpand={() =>
                  setExpandedId(expandedId === task.task_id ? null : task.task_id)
                }
                activeTaskId={activeTaskId}
                setActiveTask={setActiveTask}
                distance={taskDistances[task.task_id]}
                role={role}
                inConsole={true}
                onActionClose={() => setIsOpen(false)}
              />
            ))}
          </AnimatePresence>

          {displayedTasks.length === 0 && (
            <div className="obj-modal-empty">
              <span>🎉</span>
              <p>No objectives match the selected filter.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  ) : null

  return (
    <>
      {/* HUD Compact Objectives Button */}
      <button
        id="objectives-toggle-btn"
        type="button"
        className={`objectives-hud-btn ${isOpen ? 'active' : ''}`}
        onClick={(e) => {
          e.stopPropagation()
          setIsOpen(!isOpen)
        }}
        title="Open Objectives Console"
      >
        <div className="obj-hud-btn-main">
          <Target size={14} className="obj-hud-icon" />
          <span className="obj-hud-btn-title">OBJECTIVES</span>
          <span className="obj-hud-btn-badge">
            {completedTasks.length}/{tasks.length}
          </span>
        </div>
        {trackedTask && (
          <div className="obj-hud-btn-sub">
            📍 {trackedTask.location} · {trackedDetails?.name || trackedTask.name}
          </div>
        )}
      </button>

      {/* Full Objectives Console Modal Portal */}
      {modalContent && ReactDOM.createPortal(modalContent, document.body)}
    </>
  )
}

