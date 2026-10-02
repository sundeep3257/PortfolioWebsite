/**
 * Subway network definition.
 *
 * World coordinates were derived by unprojecting the station positions in the
 * reference image through the fixed camera and snapping them onto two axes:
 * the main trunk (START → Skills → Projects → Publications) runs along X and
 * the branches (Experiences, About) run along Z.
 *
 * The About branch leaves the trunk at a junction between START and Skills,
 * exactly as drawn in the reference, so the junction is a (non-station) node
 * of the routing graph.
 */

export type StationId = 'start' | 'skills' | 'about' | 'experiences' | 'projects' | 'publications'
/** Stations that zoom in and unfold extra content once the train has come to rest on them. */
export type ExpandableStation = 'skills' | 'about' | 'experiences' | 'projects' | 'publications'
export type JunctionId = 'aboutJunction'
export type NodeId = StationId | JunctionId

export const COLORS = {
  cyan: '#79d0ed',
  cyanBright: '#8be7fd',
  coral: '#f3b4a4',
  coralText: '#e2988e',
  peach: '#fbd5b7',
  cream: '#f8ecbd',
  creamText: '#ebe7b6',
  yellow: '#f6e6a4',
  yellowText: '#f1dd93',
  white: '#f7f1f8',
  lavender: '#bdb9cc',
} as const

export interface StationDef {
  id: StationId
  name: string
  /** Ground position [x, z] in world units. */
  position: [number, number]
  /** Colour of the ring / disc / glow. */
  color: string
  /** Colour of the HTML label. */
  labelColor: string
  /** Label anchor offset from the station centre, in design pixels. */
  labelOffset: [number, number]
}

const TRUNK_Z = -1.5

export const STATIONS: Record<StationId, StationDef> = {
  start: {
    id: 'start',
    name: 'Start',
    position: [19.4, TRUNK_Z],
    color: COLORS.coral,
    labelColor: COLORS.coralText,
    labelOffset: [36, 2],
  },
  skills: {
    id: 'skills',
    name: 'Skills',
    position: [-1.8, TRUNK_Z],
    color: COLORS.cyan,
    labelColor: '#77dced',
    labelOffset: [36, 2],
  },
  about: {
    id: 'about',
    name: 'About',
    position: [8.4, -9.4],
    color: COLORS.cyan,
    labelColor: '#77dced',
    labelOffset: [37, 3],
  },
  experiences: {
    id: 'experiences',
    name: 'Experiences',
    position: [-1.8, -14.4],
    color: COLORS.yellow,
    labelColor: COLORS.yellowText,
    labelOffset: [29, -7],
  },
  projects: {
    id: 'projects',
    name: 'Projects',
    position: [-14.8, TRUNK_Z],
    color: COLORS.coral,
    labelColor: COLORS.coralText,
    labelOffset: [40, -1],
  },
  publications: {
    id: 'publications',
    name: 'Publications',
    position: [-24.8, TRUNK_Z],
    color: COLORS.cream,
    labelColor: COLORS.creamText,
    labelOffset: [26, -9],
  },
}

export const STATION_IDS = Object.keys(STATIONS) as StationId[]

export const NODE_POSITIONS: Record<NodeId, [number, number]> = {
  start: STATIONS.start.position,
  skills: STATIONS.skills.position,
  about: STATIONS.about.position,
  experiences: STATIONS.experiences.position,
  projects: STATIONS.projects.position,
  publications: STATIONS.publications.position,
  aboutJunction: [8.4, TRUNK_Z],
}

export function isStation(id: NodeId): id is StationId {
  return id in STATIONS
}

export interface TrackEdge {
  from: NodeId
  to: NodeId
}

/**
 * Every track is coloured by the stations at its ends: it carries the colour
 * of the nearest station and blends linearly into the colour of the next.
 * A junction takes the colour the through-track has at that point, so the
 * gradient runs unbroken across it and the branch picks up from there.
 */
export const TRACKS: TrackEdge[] = [
  { from: 'start', to: 'aboutJunction' },
  { from: 'aboutJunction', to: 'skills' },
  { from: 'skills', to: 'projects' },
  { from: 'projects', to: 'publications' },
  { from: 'skills', to: 'experiences' },
  { from: 'aboutJunction', to: 'about' },
]

function mixHex(a: string, b: string, t: number) {
  const pa = parseInt(a.slice(1), 16)
  const pb = parseInt(b.slice(1), 16)
  const ch = (shift: number) =>
    Math.round(((pa >> shift) & 255) * (1 - t) + ((pb >> shift) & 255) * t)
  return `#${((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, '0')}`
}

/** Colour of the through-track at the About junction (START → Skills gradient). */
const junctionT =
  Math.abs(NODE_POSITIONS.aboutJunction[0] - STATIONS.start.position[0]) /
  Math.abs(STATIONS.skills.position[0] - STATIONS.start.position[0])

export const NODE_COLORS: Record<NodeId, string> = {
  start: STATIONS.start.color,
  skills: STATIONS.skills.color,
  about: STATIONS.about.color,
  experiences: STATIONS.experiences.color,
  projects: STATIONS.projects.color,
  publications: STATIONS.publications.color,
  aboutJunction: mixHex(STATIONS.start.color, STATIONS.skills.color, junctionT),
}

/** Undirected adjacency list of the routing graph. */
export const ADJACENCY: Record<NodeId, NodeId[]> = (() => {
  const adj = {} as Record<NodeId, NodeId[]>
  for (const id of Object.keys(NODE_POSITIONS) as NodeId[]) adj[id] = []
  for (const { from, to } of TRACKS) {
    adj[from].push(to)
    adj[to].push(from)
  }
  return adj
})()

/** Which station the train is parked on when the page loads. */
export const INITIAL_STATION: StationId = 'start'
