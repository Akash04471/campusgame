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

/* Dynamic role-aware text mapping */
const TASK_MAPPINGS = {
  INVESTIGATOR: {
    REPAIR_NETWORK: { name: 'Repair Network Terminal', category: 'Digital Forensics', desc: 'The network interface in the Computer Lab has crashed. Reset the router and reconnect the optic terminals.', priority: 'MEDIUM', priorityColor: '#eab308' },
    ARCHIVE_FILES: { name: 'Archive Research Files', category: 'Evidence', desc: 'Secure the cryptographic project files in the Library database. Save the backup on local tape storage.', priority: 'HIGH', priorityColor: '#f59e0b' },
    SUBMIT_ATTENDANCE: { name: 'Submit Attendance Logs', category: 'Investigation', desc: 'Collect current class attendance logs from the MCA department and upload them to the registrar.', priority: 'LOW', priorityColor: '#94a3b8' },
    CHECK_CCTV: { name: 'Check CCTV Feeds', category: 'Digital Forensics', desc: 'Analyze logs in the Security Office for unauthorized logins and trace potential system anomalies.', priority: 'CRITICAL', priorityColor: '#f43f5e' },
    RETRIEVE_PRINT: { name: 'Retrieve Print Job', category: 'Evidence', desc: 'Grab keycard authorization logs printed in the Main Block printer tray before they are overwritten.', priority: 'LOW', priorityColor: '#94a3b8' },
    RESTOCK_LAB: { name: 'Restock Lab Supplies', category: 'Campus', desc: 'Refill chemical reagents and secure the research workbench at the Research Center.', priority: 'MEDIUM', priorityColor: '#eab308' },
    SETUP_AUDITORIUM: { name: 'Set Up Auditorium', category: 'Campus', desc: 'Verify stage lights and check the soundboard connections in the Auditorium for the lock-down broadcast.', priority: 'MEDIUM', priorityColor: '#eab308' },
    PLACE_LUNCH: { name: 'Place Lunch Order', category: 'Campus', desc: 'Submit a catering ticket for the security detail at the Cafeteria terminals.', priority: 'LOW', priorityColor: '#94a3b8' }
  },
  DETECTIVE: {
    REPAIR_NETWORK: { name: 'Repair Network Terminal', category: 'Digital Forensics', desc: 'The network interface in the Computer Lab has crashed. Reset the router and reconnect the optic terminals.', priority: 'MEDIUM', priorityColor: '#eab308' },
    ARCHIVE_FILES: { name: 'Archive Research Files', category: 'Evidence', desc: 'Secure the cryptographic project files in the Library database. Save the backup on local tape storage.', priority: 'HIGH', priorityColor: '#f59e0b' },
    SUBMIT_ATTENDANCE: { name: 'Submit Attendance Logs', category: 'Investigation', desc: 'Collect current class attendance logs from the MCA department and upload them to the registrar.', priority: 'LOW', priorityColor: '#94a3b8' },
    CHECK_CCTV: { name: 'Check CCTV Feeds', category: 'Digital Forensics', desc: 'Analyze logs in the Security Office for unauthorized logins and trace potential system anomalies.', priority: 'CRITICAL', priorityColor: '#f43f5e' },
    RETRIEVE_PRINT: { name: 'Retrieve Print Job', category: 'Evidence', desc: 'Grab keycard authorization logs printed in the Main Block printer tray before they are overwritten.', priority: 'LOW', priorityColor: '#94a3b8' },
    RESTOCK_LAB: { name: 'Restock Lab Supplies', category: 'Campus', desc: 'Refill chemical reagents and secure the research workbench at the Research Center.', priority: 'MEDIUM', priorityColor: '#eab308' },
    SETUP_AUDITORIUM: { name: 'Set Up Auditorium', category: 'Campus', desc: 'Verify stage lights and check the soundboard connections in the Auditorium for the lock-down broadcast.', priority: 'MEDIUM', priorityColor: '#eab308' },
    PLACE_LUNCH: { name: 'Place Lunch Order', category: 'Campus', desc: 'Submit a catering ticket for the security detail at the Cafeteria terminals.', priority: 'LOW', priorityColor: '#94a3b8' }
  },
  CONSPIRATOR: {
    REPAIR_NETWORK: { name: 'Install Keylogger on Terminal', category: 'Sabotage', desc: 'Deploy an encrypted keylogger on the main laboratory terminal to sniff researcher credentials.', priority: 'MEDIUM', priorityColor: '#eab308' },
    ARCHIVE_FILES: { name: 'Corrupt Research Database', category: 'Sabotage', desc: 'Inject a logic bomb into the primary research tables in the Library to overwrite the file index structures.', priority: 'HIGH', priorityColor: '#f59e0b' },
    SUBMIT_ATTENDANCE: { name: 'Falsify Attendance Records', category: 'Deception', desc: 'Modify attendance logs in the MCA Department to establish a fake alibi for the suspect pool.', priority: 'LOW', priorityColor: '#94a3b8' },
    CHECK_CCTV: { name: 'Disable Security Cameras', category: 'Sabotage', desc: 'Sabotage the CCTV feed loops in the Security Office, creating a blind spot on the east campus wing.', priority: 'CRITICAL', priorityColor: '#f43f5e' },
    RETRIEVE_PRINT: { name: 'Intercept Keycard Printout', category: 'Sabotage', desc: 'Steal the printed security override sheets in the Main Block before they reach the guard desk.', priority: 'LOW', priorityColor: '#94a3b8' },
    RESTOCK_LAB: { name: 'Contaminate Chemical Reagents', category: 'Sabotage', desc: 'Tamper with lab chemical formulas at the Research Center to delay database reconstruction efforts.', priority: 'MEDIUM', priorityColor: '#eab308' },
    SETUP_AUDITORIUM: { name: 'Rig Stage Lights for Failure', category: 'Sabotage', desc: 'Short-circuit the primary power distribution relay in the Auditorium to force an outage.', priority: 'MEDIUM', priorityColor: '#eab308' },
    PLACE_LUNCH: { name: 'Poison Staff Cafeteria Food', category: 'Deception', desc: 'Spike cafeteria ingredients to incapacitate guards and slow down investigator search routines.', priority: 'LOW', priorityColor: '#94a3b8' }
  },
  MASTERMIND: {
    REPAIR_NETWORK: { name: 'Install Keylogger on Terminal', category: 'Sabotage', desc: 'Deploy an encrypted keylogger on the main laboratory terminal to sniff researcher credentials.', priority: 'MEDIUM', priorityColor: '#eab308' },
    ARCHIVE_FILES: { name: 'Corrupt Research Database', category: 'Sabotage', desc: 'Inject a logic bomb into the primary research tables in the Library to overwrite the file index structures.', priority: 'HIGH', priorityColor: '#f59e0b' },
    SUBMIT_ATTENDANCE: { name: 'Falsify Attendance Records', category: 'Deception', desc: 'Modify attendance logs in the MCA Department to establish a fake alibi for the suspect pool.', priority: 'LOW', priorityColor: '#94a3b8' },
    CHECK_CCTV: { name: 'Disable Security Cameras', category: 'Sabotage', desc: 'Sabotage the CCTV feed loops in the Security Office, creating a blind spot on the east campus wing.', priority: 'CRITICAL', priorityColor: '#f43f5e' },
    RETRIEVE_PRINT: { name: 'Intercept Keycard Printout', category: 'Sabotage', desc: 'Steal the printed security override sheets in the Main Block before they reach the guard desk.', priority: 'LOW', priorityColor: '#94a3b8' },
    RESTOCK_LAB: { name: 'Contaminate Chemical Reagents', category: 'Sabotage', desc: 'Tamper with lab chemical formulas at the Research Center to delay database reconstruction efforts.', priority: 'MEDIUM', priorityColor: '#eab308' },
    SETUP_AUDITORIUM: { name: 'Rig Stage Lights for Failure', category: 'Sabotage', desc: 'Short-circuit the primary power distribution relay in the Auditorium to force an outage.', priority: 'MEDIUM', priorityColor: '#eab308' },
    PLACE_LUNCH: { name: 'Poison Staff Cafeteria Food', category: 'Deception', desc: 'Spike cafeteria ingredients to incapacitate guards and slow down investigator search routines.', priority: 'LOW', priorityColor: '#94a3b8' }
  }
}

const TASK_ICONS = {
  REPAIR_NETWORK: Wrench,
  ARCHIVE_FILES: Folder,
  SUBMIT_ATTENDANCE: Clipboard,
  CHECK_CCTV: Video,
  RETRIEVE_PRINT: Printer,
  RESTOCK_LAB: FlaskConical,
  SETUP_AUDITORIUM: Tv,
  PLACE_LUNCH: Utensils,
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

