/**
 * The Skills sub-network: three secondary branches that unfold from the main
 * Skills station once the train has arrived there, each ending at a small
 * station beside which stands a transit information board carrying that
 * category's skills. Informational only - not part of the train routing graph.
 *
 * Titles and bullet lists are loaded from `content/Skills.txt`. Track layout
 * stays here so the three boards keep their existing geometry.
 */
import skillsSource from '../../content/Skills.txt?raw'
import { parseSkills } from '../lib/parseContent'
import { mirroredRetract, timelineEnd, type Phase } from '../lib/reveal'
import { designToGroundAt, framingAround, STATION_ZOOM, worldToDesignAt, type CameraFraming } from './camera'
import { STATIONS } from './stations'

export type SkillId = 'automated-image-analysis' | 'machine-learning' | 'web-development'

/** Ground-plane unit directions. Tracks only ever run along axes or 45° diagonals. */
const SQ = Math.SQRT1_2
const DIR = {
  negX: [-1, 0],
  posX: [1, 0],
  posZ: [0, 1],
  /** Appears horizontal (screen-left) through the fixed camera. */
  left: [-SQ, SQ],
  /** Appears vertical (screen-down) through the fixed camera. */
  down: [SQ, SQ],
} as const satisfies Record<string, readonly [number, number]>

interface Leg {
  dir: readonly [number, number]
  length: number
}

export interface SkillCategory {
  id: SkillId
  /** Title lines, wrapped as they should appear on the board. */
  title: string[]
  items: string[]
  /** Angular route from the Skills station to this category's station. */
  legs: Leg[]
}

/** Branch geometry for each board, in the same order as Skills.txt. */
const SKILL_ROUTES: { id: SkillId; legs: Leg[] }[] = [
  {
    id: 'automated-image-analysis',
    legs: [
      { dir: DIR.left, length: 4.5 },
      { dir: DIR.negX, length: 1.5 },
      { dir: DIR.left, length: 7.8 },
    ],
  },
  {
    id: 'machine-learning',
    legs: [
      { dir: DIR.posZ, length: 5 },
      { dir: DIR.down, length: 2 },
      { dir: DIR.posZ, length: 8 },
    ],
  },
  {
    id: 'web-development',
    legs: [
      { dir: DIR.down, length: 6 },
      { dir: DIR.posX, length: 1 },
      { dir: DIR.down, length: 8.8 },
    ],
  },
]

const skillCopy = parseSkills(skillsSource)
if (skillCopy.length !== SKILL_ROUTES.length) {
  throw new Error(
    `Skills.txt has ${skillCopy.length} skill(s) but the map expects ${SKILL_ROUTES.length}`,
  )
}

export const SKILL_CATEGORIES: SkillCategory[] = SKILL_ROUTES.map((route, index) => ({
  id: route.id,
  legs: route.legs,
  title: skillCopy[index].titleLines,
  items: skillCopy[index].items,
}))

/** Resolves a category's legs into absolute ground waypoints, starting at Skills. */
export function skillWaypoints(category: SkillCategory): [number, number][] {
  const points: [number, number][] = [STATIONS.skills.position]
  for (const { dir, length } of category.legs) {
    const [x, z] = points[points.length - 1]
    points.push([x + dir[0] * length, z + dir[1] * length])
  }
  return points
}

/** Sub-stations are secondary: a little smaller than the main stations. */
export const SUB_STATION_SCALE = 0.78
/** Sub-tracks are very slightly thinner than the main lines. */
export const SUB_TRACK_WIDTH = 0.26

/** Camera framing while the Skills sub-network is expanded. */
export const SKILLS_FRAMING: CameraFraming = framingAround(STATIONS.skills.position, [700, 170], STATION_ZOOM)

/** Information board dimensions (design px) and how it stands relative to its station. */
export const SKILL_BOARD = {
  width: 214,
  /** Upright slab turned so its right-hand side recedes and its left side face shows. */
  yaw: (16 * Math.PI) / 180,
  /** Slab thickness (world units). */
  depth: 0.55,
  /** How far behind the pedestal's centre line the slab stands (world units). */
  setback: 0.35,
  /** Screen offset from the sub-station to the pedestal's top centre (design px). */
  baseOffset: [-128, 84] as [number, number],
  /** Pedestal footprint in world units. */
  pedestal: { width: 10.2, depth: 1.7, height: 0.36 },
}

/** Ground point where a category's board pedestal stands. */
export function skillBoardBase(category: SkillCategory, offset: [number, number] = [0, 0]): [number, number] {
  const points = skillWaypoints(category)
  const [sx, sz] = points[points.length - 1]
  const [px, py] = worldToDesignAt(SKILLS_FRAMING, sx, 0, sz)
  return designToGroundAt(
    SKILLS_FRAMING,
    px + SKILL_BOARD.baseOffset[0] + offset[0],
    py + SKILL_BOARD.baseOffset[1] + offset[1],
  )
}

/**
 * Reveal timeline (seconds from the moment the station opens).
 *
 * `details` covers the bulleted lists of all three boards: the window is
 * split evenly between the categories in order and each list staggers its
 * bullets within its share.
 */
const SKILLS_REVEAL = {
  tracks: [0.35, 0.95],
  stations: [0.85, 1.15],
  boards: [1.0, 1.6],
  details: [1.4, 3.6],
} as const

/** On the way out every bullet fades at once, instead of line by line. */
const TEXT_RETRACT_SECONDS = 0.4

const mirrored = mirroredRetract(SKILLS_REVEAL)
const textSaved = mirrored.details[1] - mirrored.details[0] - TEXT_RETRACT_SECONDS

function earlier(phase: Phase, by: number): Phase {
  return [phase[0] - by, phase[1] - by]
}

export const SKILLS_TIMELINE = {
  reveal: SKILLS_REVEAL,
  retract: {
    details: [0, TEXT_RETRACT_SECONDS] as Phase,
    boards: earlier(mirrored.boards, textSaved),
    stations: earlier(mirrored.stations, textSaved),
    tracks: earlier(mirrored.tracks, textSaved),
  },
}

/**
 * How long the train waits after Skills is left. The fold is shorter than the
 * unfold because the bullets leave together; the extra beat is the same brief
 * settle the other stations keep after their tracks finish.
 */
export const SKILLS_EXIT_SECONDS = timelineEnd(SKILLS_TIMELINE.retract) + SKILLS_REVEAL.tracks[0]
