import { createContext, useCallback, useContext, useMemo, useRef, useState, type RefObject } from 'react'
import * as THREE from 'three'
import { INITIAL_STATION, type ExpandableStation, type StationId } from '../data/stations'
import { buildJourney, parkedPoseAt, shortestPath, type Journey, type ParkedPose } from '../lib/routing'

export type { ExpandableStation }

export interface ActiveJourney {
  journey: Journey
  /** Distance travelled along the journey curve so far. */
  distance: number
  /** Seconds the train waits at the platform before pulling away. */
  holdBeforeDeparture: number
}

const EXPANDABLE_STATIONS: readonly StationId[] = ['skills', 'about', 'experiences', 'projects', 'publications']

export function isExpandable(id: StationId): id is ExpandableStation {
  return EXPANDABLE_STATIONS.includes(id)
}

export interface TrainNavigation {
  currentStation: StationId
  isMoving: boolean
  /** The station whose sub-network is currently unfolded, or null while travelling / elsewhere. */
  expandedStation: ExpandableStation | null
  /** True only once the train has actually come to rest on Skills. */
  skillsExpanded: boolean
  /** True only once the train has actually come to rest on About. */
  aboutExpanded: boolean
  /** Route the train to a station through the subway graph. Ignored while moving. */
  travelTo: (target: StationId) => void
  /** Mutable per-frame travel state, read/written by the Train component. */
  activeJourney: RefObject<ActiveJourney | null>
  /** Where the train rests when it is not travelling. */
  parkedPose: RefObject<ParkedPose>
  /** Called by the Train component once it has settled on the destination. */
  completeJourney: (finalPose: ParkedPose) => void
}

/** On load the train sits on START with its nose pointing down the trunk, as in the reference. */
const INITIAL_HEADING = new THREE.Vector3(1, 0, 0)
/** Seconds the train lingers at an expanded station after a new destination is chosen. */
const LEAVE_EXPANDED_HOLD = 0.5

export function useTrainNavigation(): TrainNavigation {
  const [currentStation, setCurrentStation] = useState<StationId>(INITIAL_STATION)
  const [isMoving, setIsMoving] = useState(false)
  const activeJourney = useRef<ActiveJourney | null>(null)
  const parkedPose = useRef<ParkedPose>(parkedPoseAt(INITIAL_STATION, INITIAL_HEADING))
  const stationRef = useRef<StationId>(INITIAL_STATION)

  const travelTo = useCallback((target: StationId) => {
    if (activeJourney.current) return
    const from = stationRef.current
    if (target === from) return
    const nodes = shortestPath(from, target)
    if (nodes.length < 2) return
    activeJourney.current = {
      journey: buildJourney(nodes, parkedPose.current),
      distance: 0,
      // Leaving an expanded station: give its sub-network a moment to fold away and the camera to start pulling back.
      holdBeforeDeparture: isExpandable(from) ? LEAVE_EXPANDED_HOLD : 0,
    }
    setIsMoving(true)
  }, [])

  const completeJourney = useCallback((finalPose: ParkedPose) => {
    const active = activeJourney.current
    if (!active) return
    stationRef.current = active.journey.destination
    parkedPose.current = finalPose
    activeJourney.current = null
    setCurrentStation(active.journey.destination)
    setIsMoving(false)
  }, [])

  const expandedStation = !isMoving && isExpandable(currentStation) ? currentStation : null
  const skillsExpanded = expandedStation === 'skills'
  const aboutExpanded = expandedStation === 'about'

  return useMemo(
    () => ({
      currentStation,
      isMoving,
      expandedStation,
      skillsExpanded,
      aboutExpanded,
      travelTo,
      activeJourney,
      parkedPose,
      completeJourney,
    }),
    [currentStation, isMoving, expandedStation, skillsExpanded, aboutExpanded, travelTo, completeJourney],
  )
}

export const TrainNavigationContext = createContext<TrainNavigation | null>(null)

export function useTrainNavigationContext(): TrainNavigation {
  const ctx = useContext(TrainNavigationContext)
  if (!ctx) throw new Error('TrainNavigationContext is missing')
  return ctx
}
