import { useEffect, useRef } from 'react'
import audioManager from './audioManager'

/**
 * useDecisionPhaseAudio
 * 
 * Custom hook to manage Decision Phase BGM transitions, fading, SFX triggers,
 * and audio lifecycle cleanups.
 */
export default function useDecisionPhaseAudio(gamePhase) {
  const prevPhaseRef = useRef(gamePhase)

  useEffect(() => {
    const prevPhase = prevPhaseRef.current
    const isDecisionPhase = gamePhase === 'decision' || gamePhase === 'accusation'
    const wasDecisionPhase = prevPhase === 'decision' || prevPhase === 'accusation'

    // 1. Enter Decision Phase -> Start Tension BGM
    if (isDecisionPhase && !wasDecisionPhase) {
      audioManager.playDecisionBgm()
    }

    // 2. Transition from Decision Phase to Results -> Fade BGM out and trigger reveal sting
    if (gamePhase === 'results' && wasDecisionPhase) {
      audioManager.fadeAndStopBgm(1200)
      audioManager.playSfx('reveal')
    }

    // 3. Exit Decision Phase to any other phase -> Stop BGM
    if (!isDecisionPhase && gamePhase !== 'results' && wasDecisionPhase) {
      audioManager.stopBgm()
    }

    prevPhaseRef.current = gamePhase
  }, [gamePhase])

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      audioManager.stopBgm()
    }
  }, [])

  return {
    playSelectSfx: () => audioManager.playSfx('select'),
    playSubmitSfx: () => audioManager.playSfx('submit'),
    playRevealSting: () => audioManager.playSfx('reveal'),
    toggleMute: () => audioManager.toggleMute(),
    isMuted: () => audioManager.getMuted(),
  }
}
