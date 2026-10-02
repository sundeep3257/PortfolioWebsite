/**
 * The Publications close-up: a siding leaves the terminus and runs along the
 * lower part of the view. On it waits the archive train - one car per
 * publication - which shunts along so the selected car stops beneath a
 * reading board hanging from an overhead gantry.
 *
 * Titles, journals, dates, authors, and PubMed links are loaded from
 * `content/Publications.txt`.
 */
import publicationsSource from '../../content/Publications.txt?raw'
import { parsePublications, slugify } from '../lib/parseContent'
import { designToGroundAt, framingAround, STATION_ZOOM, type CameraFraming } from './camera'
import { STATIONS } from './stations'

export interface Publication {
  id: string
  title: string
  journal: string
  /** Short journal name for the car's tag. */
  short: string
  date: string
  year: string
  authors: string[]
  pubmed: string
}

export const PUBLICATIONS: Publication[] = parsePublications(publicationsSource).map((entry) => ({
  id: slugify(entry.title).slice(0, 64) || slugify(entry.short),
  title: entry.title,
  journal: entry.journal,
  short: entry.short,
  date: entry.date,
  year: entry.year,
  authors: entry.authors,
  pubmed: entry.pubmed,
}))

/** The author to highlight in every author list (first author in the file). */
export const OWN_NAME = PUBLICATIONS[0]?.authors[0] ?? 'Sundeep Chakladar'

/** Screen position of the station in the close-up (design px). */
const STATION_SCREEN: [number, number] = [690, 150]

/**
 * Camera framing while Publications is expanded: the terminus sits upper
 * right with the trunk running off towards Projects, leaving the left and
 * lower parts of the view to the siding, the archive train and the board.
 */
export const PUBLICATIONS_FRAMING: CameraFraming = framingAround(
  STATIONS.publications.position,
  STATION_SCREEN,
  STATION_ZOOM,
)

/** Siding layout (design px). The siding leaves the trunk and runs left under the archive train. */
const SIDING_Y = 448
/** Where the selected car stops, directly in front of the reading board. */
const STOP_X = 316
const SIDING_LEFT = -420

export const PUB_JUNCTION = designToGroundAt(PUBLICATIONS_FRAMING, STATION_SCREEN[0], SIDING_Y)
export const PUB_SIDING_LEFT = designToGroundAt(PUBLICATIONS_FRAMING, SIDING_LEFT, SIDING_Y)
export const PUB_STOP = designToGroundAt(PUBLICATIONS_FRAMING, STOP_X, SIDING_Y)

/** Ground point below the hanging reading board's bottom edge, above the stopped car. */
export const PUB_BOARD = designToGroundAt(PUBLICATIONS_FRAMING, STOP_X, SIDING_Y - 64)

/** Reading board width (design px). */
export const PUB_BOARD_WIDTH = 430

/** Archive car dimensions (world units) and the spacing between car centres. */
export const PUB_CAR = { length: 2.6, height: 0.72, width: 1.05, spacing: 3.15 }

/** Reveal / retract timeline (seconds from the moment the mode changes). */
export const PUBLICATIONS_TIMELINE = {
  reveal: {
    tracks: [0.35, 1.05],
    cars: [0.95, 1.45],
    /** The gantry drops in from above, then the board lights. */
    gantry: [1.05, 1.5],
    board: [1.35, 1.85],
  },
  retract: {
    board: [0, 0.2],
    gantry: [0.05, 0.35],
    cars: [0, 0.25],
    tracks: [0.1, 0.5],
  },
} as const
