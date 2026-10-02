import { useEffect } from 'react'
import type { StationId } from '../data/stations'
import { useTrainNavigationContext } from '../hooks/useTrainNavigation'

type ArrowKey = 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight'

/**
 * Explicit homepage arrow destinations per station.
 * Keys with no entry (or stations with an empty map) do nothing —
 * those destinations are still reachable by clicking the station.
 */
const ARROW_TARGETS: Record<StationId, Partial<Record<ArrowKey, StationId>>> = {
  start: {
    ArrowUp: 'about',
    ArrowRight: 'about',
    ArrowLeft: 'skills',
  },
  about: {
    ArrowDown: 'start',
    ArrowLeft: 'skills',
    ArrowUp: 'skills',
  },
  skills: {
    ArrowDown: 'start',
    ArrowRight: 'experiences',
    ArrowUp: 'projects',
    ArrowLeft: 'projects',
  },
  experiences: {
    // Only neighbour is Skills; Left mirrors Skills→Experiences (Right).
    ArrowLeft: 'skills',
    ArrowDown: 'skills',
  },
  projects: {
    ArrowDown: 'skills',
    ArrowRight: 'skills',
    ArrowLeft: 'publications',
    ArrowUp: 'publications',
  },
  publications: {
    ArrowDown: 'projects',
    ArrowRight: 'projects',
  },
}

function isArrowKey(key: string): key is ArrowKey {
  return key === 'ArrowUp' || key === 'ArrowDown' || key === 'ArrowLeft' || key === 'ArrowRight'
}

export function KeyboardNavigation() {
  const { currentStation, isMoving, travelTo } = useTrainNavigationContext()

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!isArrowKey(e.key)) return
      e.preventDefault()
      if (isMoving || e.repeat) return
      const target = ARROW_TARGETS[currentStation][e.key]
      if (target) travelTo(target)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [currentStation, isMoving, travelTo])

  return null
}
