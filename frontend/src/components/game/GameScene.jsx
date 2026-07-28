import React, { Suspense, useState, useEffect, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import CampusMap from './CampusMap'
import Player from './Player'
import EvidenceItems from './EvidenceItems'
import TaskZones from './TaskZones'
import NPCCharacters from './NPCCharacters'
import GameHUD from '../ui/GameHUD'
import MeetingScreen from '../ui/MeetingScreen'
import DecisionPhaseScreen from '../ui/DecisionPhaseScreen'
import ResultsScreen from '../ui/ResultsScreen'
import TaskMinigame from '../ui/TaskMinigame'
import useGameStore from '../../store/gameStore'


function SceneLoader() {
  return (
    <mesh position={[0, 1, 0]}>
      <sphereGeometry args={[0.4, 12, 12]} />
      <meshBasicMaterial color="#f43f5e" wireframe />
    </mesh>
  )
}

/* ── Location Reveal Bar (cinematic area announcement) ── */
function LocationReveal() {
  const currentArea = useGameStore((s) => s.currentArea)
  const [shown, setShown] = useState(null)
  const [visible, setVisible] = useState(false)
  const prevArea = useRef(null)

  useEffect(() => {
    if (currentArea && currentArea !== prevArea.current) {
      prevArea.current = currentArea
      setShown(currentArea)
      setVisible(true)
      const t = setTimeout(() => setVisible(false), 2500)
      return () => clearTimeout(t)
    }
  }, [currentArea])

  if (!shown) return null

  return (
    <div className={`location-reveal ${visible ? 'location-reveal--in' : 'location-reveal--out'}`}>
      <div className="location-reveal__line" />
      <p className="location-reveal__label">ENTERING AREA</p>
      <h2 className="location-reveal__name">{shown}</h2>
      <div className="location-reveal__line" />
    </div>
  )
}

const dayFogColor = new THREE.Color('#1e1b4b')
const nightFogColor = new THREE.Color('#09090b')

export default function GameScene() {
  const timeRemaining = useGameStore((s) => s.timeRemaining)
  const timerSeconds = useGameStore((s) => s.timerSeconds)
  const elapsed = Math.max(0, timerSeconds - timeRemaining)
  const nightFactor = Math.min(1.0, elapsed / 600)

  const fogColor = dayFogColor.clone().lerp(nightFogColor, nightFactor).getStyle()
  const fogNear = THREE.MathUtils.lerp(25, 18, nightFactor)
  const fogFar = THREE.MathUtils.lerp(110, 70, nightFactor)

  return (
    <div className="game-viewport" id="game-viewport">
      <Canvas
        shadows
        gl={{
          antialias: true,
          toneMapping: 4,
          toneMappingExposure: 1.0,
          powerPreference: 'high-performance',
        }}
        camera={{
          position: [0, 5.5, 14],
          fov: 62,
          near: 0.1,
          far: 220,
        }}
      >
        {/* Cinematic dynamic fog */}
        <fog attach="fog" args={[fogColor, fogNear, fogFar]} />
        <color attach="background" args={[fogColor]} />

        <Suspense fallback={<SceneLoader />}>
          <CampusMap />
          <Player />
          <EvidenceItems />
          <TaskZones />
          <NPCCharacters />
        </Suspense>
      </Canvas>

      {/* 2D HUD Overlay */}
      <GameHUD />

      {/* Modal Overlays */}
      <TaskMinigame />
      <MeetingScreen />
      <DecisionPhaseScreen />
      <ResultsScreen />


      {/* Cinematic vignette overlay */}
      <div className="game-vignette" />

      {/* Cinematic location reveal */}
      <LocationReveal />
    </div>
  )
}
