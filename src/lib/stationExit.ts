import { CAMERA_MOVE_SECONDS } from '../data/camera'
import { ABOUT_TIMELINE } from '../data/about'
import { EXPERIENCES_TIMELINE } from '../data/experiences'
import { PROJECTS_TIMELINE } from '../data/projects'
import { PUBLICATIONS_TIMELINE } from '../data/publications'
import { SKILLS_EXIT_SECONDS } from '../data/skills'
import type { ExpandableStation } from '../data/stations'
import { timelineEnd } from './reveal'

/** How long the train waits for each station's fold-away. */
export const STATION_EXIT_SECONDS: Record<ExpandableStation, number> = {
  skills: SKILLS_EXIT_SECONDS,
  about: timelineEnd(ABOUT_TIMELINE.reveal),
  experiences: timelineEnd(EXPERIENCES_TIMELINE.reveal),
  projects: timelineEnd(PROJECTS_TIMELINE.reveal),
  publications: timelineEnd(PUBLICATIONS_TIMELINE.reveal),
}

/**
 * Seconds the close-up framing stays put after the rider leaves, so the
 * fold-away finishes as the camera eases back to the map.
 */
export function closeupHoldSeconds(station: ExpandableStation): number {
  return Math.max(0, STATION_EXIT_SECONDS[station] - CAMERA_MOVE_SECONDS)
}
