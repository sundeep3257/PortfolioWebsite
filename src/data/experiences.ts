/**
 * The Experiences close-up: six branches fan out from the station to six
 * sub-stations stacked top to bottom, and a ticket beside them shows the
 * selected experience in full.
 *
 * Titles, subtitles, and ticket copy are loaded from `content/Experiences.txt`.
 */
import experiencesSource from '../../content/Experiences.txt?raw'
import { parseExperiences, slugify } from '../lib/parseContent'
import { mirroredRetract } from '../lib/reveal'
import { designToGroundAt, framingAround, STATION_ZOOM, type CameraFraming } from './camera'
import { STATIONS } from './stations'

export interface Experience {
  id: string
  title: string
  subtitle: string
  description: string
}

export const EXPERIENCES: Experience[] = parseExperiences(experiencesSource).map((entry) => ({
  id: slugify(entry.title),
  title: entry.title,
  subtitle: entry.subtitle,
  description: entry.description,
}))

/** Screen position of the station in the close-up (design px). */
const STATION_SCREEN: [number, number] = [235, 355]

/**
 * Camera framing while Experiences is expanded: the station sits low on the
 * left so the six branches can fan out and up to the right, with Skills and
 * About still peeking in along the bottom edge.
 */
export const EXPERIENCES_FRAMING: CameraFraming = framingAround(STATIONS.experiences.position, STATION_SCREEN, STATION_ZOOM)

/** Sub-station column and spacing (design px). */
const NODE_X = 375
const NODE_TOP = 105
const NODE_STEP = 66
/** Where the branches leave the station and where their vertical risers run. */
const RISER_X0 = 265
const RISER_STEP = 18

/** Screen position (design px) of each sub-station, top to bottom. */
export const EXPERIENCE_NODES_SCREEN: [number, number][] = EXPERIENCES.map((_, i) => [NODE_X, NODE_TOP + i * NODE_STEP])

/**
 * Screen-space waypoints of one branch: out of the station, up or down a
 * vertical riser, then across into the sub-station. Branches that travel
 * further turn first, so the risers nest without crossing.
 */
function branchScreenPath(index: number): [number, number][] {
  const [sx, sy] = STATION_SCREEN
  const [nx, ny] = EXPERIENCE_NODES_SCREEN[index]
  const dy = ny - sy
  // Rank among the branches heading the same way (up or down), furthest first.
  const sameWay = EXPERIENCE_NODES_SCREEN.map(([, y]) => y - sy).filter((d) => Math.sign(d) === Math.sign(dy))
  const rank = sameWay.sort((a, b) => Math.abs(b) - Math.abs(a)).indexOf(dy)
  const riserX = RISER_X0 + rank * RISER_STEP
  return [
    [sx, sy],
    [riserX, sy],
    [riserX, ny],
    [nx, ny],
  ]
}

/** Ground waypoints of each branch, from the station to its sub-station. */
export const EXPERIENCE_BRANCHES: [number, number][][] = EXPERIENCES.map((_, i) =>
  branchScreenPath(i).map(([px, py]) => designToGroundAt(EXPERIENCES_FRAMING, px, py)),
)

/** Ground position of each sub-station. */
export const EXPERIENCE_NODES: [number, number][] = EXPERIENCE_NODES_SCREEN.map(([px, py]) =>
  designToGroundAt(EXPERIENCES_FRAMING, px, py),
)

/** Corner radius of the branch curves (world units). */
export const EXPERIENCE_CORNER_RADIUS = 1.35

/** Ticket panel: centre on screen (design px) and size. */
export const TICKET = {
  centre: [772, 270] as [number, number],
  width: 344,
  /** x (design px) of the vertical rail the connector slides along, and where its tick towards the labels ends. */
  railX: 582,
  tickX: 570,
}
export const TICKET_GROUND = designToGroundAt(EXPERIENCES_FRAMING, ...TICKET.centre)

/** Reveal timeline (seconds from arrival). Leaving plays it backwards. */
const EXPERIENCES_REVEAL = {
  tracks: [0.35, 1.05],
  stations: [0.9, 1.2],
  labels: [1.0, 1.4],
  ticket: [1.2, 1.7],
} as const

export const EXPERIENCES_TIMELINE = {
  reveal: EXPERIENCES_REVEAL,
  retract: mirroredRetract(EXPERIENCES_REVEAL),
}
