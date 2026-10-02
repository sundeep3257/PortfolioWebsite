/**
 * The About station close-up: a short branch runs from the station to a
 * sub-station, behind which stands one large illuminated billboard carrying
 * the biography, with the CV / social links built into its base.
 *
 * Heading and paragraphs are loaded from `content/About.txt`.
 */
import aboutSource from '../../content/About.txt?raw'
import { parseAbout } from '../lib/parseContent'
import { designToGroundAt, framingAround, STATION_ZOOM, type CameraFraming } from './camera'
import { STATIONS } from './stations'

const about = parseAbout(aboutSource)

export const ABOUT_HEADING = about.heading
export const ABOUT_PARAGRAPHS = about.paragraphs

/** External links built into the billboard base. */
export const ABOUT_LINKS = {
  cv: { label: 'Download Curriculum Vitae', href: '/Sundeep_Chakladar_CV.pdf' },
  linkedin: { label: 'LinkedIn', href: 'https://www.linkedin.com/in/sundeep-chakladar-37b467252/' },
  pubmed: { label: 'PubMed', href: 'https://pubmed.ncbi.nlm.nih.gov/?term=sundeep+chakladar&sort=date' },
  researchgate: { label: 'ResearchGate', href: 'https://www.researchgate.net/profile/Sundeep-Chakladar' },
} as const

/**
 * Camera framing while About is expanded: pushes in and places the station
 * on the left so the billboard fills the right side, with Experiences and
 * START still peeking in at the edges.
 */
export const ABOUT_FRAMING: CameraFraming = framingAround(STATIONS.about.position, [215, 235], STATION_ZOOM)

/** Billboard width in design px. */
export const ABOUT_BOARD_WIDTH = 470

/** Layout of the close-up, in design px at ABOUT_FRAMING. */
const LAYOUT = {
  /** Sub-station between About and the billboard. */
  node: [432, 237] as [number, number],
  /** Where the branch disappears behind the billboard. */
  trackEnd: [500, 237] as [number, number],
  /** Centre of the platform slab the billboard stands on (its top face). */
  platform: [700, 508] as [number, number],
}

export const ABOUT_NODE = designToGroundAt(ABOUT_FRAMING, ...LAYOUT.node)
export const ABOUT_TRACK_END = designToGroundAt(ABOUT_FRAMING, ...LAYOUT.trackEnd)
export const ABOUT_PLATFORM = designToGroundAt(ABOUT_FRAMING, ...LAYOUT.platform)

/** Plinth slab: [along screen-right, along screen-down] in world units, and height. */
export const ABOUT_PLATFORM_SIZE = { width: 22.4, depth: 2.4, height: 0.3 }

/**
 * The billboard structure standing on the plinth (world units unless noted):
 * a base block whose front face carries the link console, two posts, and the
 * sign slab above them.
 */
export const ABOUT_STRUCTURE = {
  /** Console / base height in design px. Tall enough that the 40px social buttons read as squares after camera foreshortening. */
  consolePx: 64,
  base: { depth: 1.6, margin: 0.5 },
  /** Clear height between base and sign (design px), post radius, and post inset from the sign's edges. */
  posts: { gapPx: 32, radius: 0.46, inset: 3.6, setback: 0.34 },
  sign: { depth: 0.65 },
}

/** Reveal / retract timeline (seconds from the moment the mode changes). */
export const ABOUT_TIMELINE = {
  reveal: {
    tracks: [0.35, 0.95],
    stations: [0.85, 1.15],
    platform: [0.9, 1.35],
    board: [1.15, 1.85],
  },
  retract: {
    board: [0, 0.22],
    platform: [0.05, 0.3],
    stations: [0.05, 0.3],
    tracks: [0.1, 0.5],
  },
} as const
