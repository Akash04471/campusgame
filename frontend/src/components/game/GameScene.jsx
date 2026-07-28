import React, { Suspense, useState, useEffect, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
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

const DAY_FOG_COLOR = '#1e1b4b'
const FOG_NEAR = 100
const FOG_FAR = 400

export default function GameScene() {


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
          far: 450,
        }}
      >
        {/* Clear wide fog range */}
        <fog attach="fog" args={[DAY_FOG_COLOR, FOG_NEAR, FOG_FAR]} />
        <color attach="background" args={[DAY_FOG_COLOR]} />

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
