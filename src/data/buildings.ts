/**
 * Decorative city blocks. Positions are given in reference-image pixels
 * (the point where the building's base centre sits on the ground) and are
 * converted to world coordinates by `designToWorld`, so they can be placed
 * by reading directly off the reference render.
 *
 * Neon lighting comes in two styles that can mix on one building: a tall
 * vertical bar, and a short stack of horizontal bars (like rack LEDs).
 */
import type { ExpandableStation } from './stations'

export type Face = 'left' | 'right'
export type StripKind = 'vertical' | 'bars'

export interface GlowStrip {
  /** `left` = the face visible on the screen-left side (+Z), `right` = screen-right side (+X). */
  face: Face
  /** 0 = at the shared front edge, 1 = at the far end of the face. */
  t: number
  color: string
  kind?: StripKind
  /** Vertical: fraction of building height. Bars: height of the stack. */
  span?: number
  /** Bars only: how many horizontal bands. */
  count?: number
  /** Bars only: centre of the stack as a fraction of building height. */
  y?: number
}

/** Decoration that would sit under a station's sub-network sinks into the ground while that station is open. */
interface Retractable {
  hideWhenExpanded?: ExpandableStation[]
  /**
   * Extra side-gutter clusters. They only appear on short, wide landscapes
   * (where the 960×540 frame leaves empty left/right world) and stay off
   * 16:9 desktop. They also retract for every station close-up.
   */
  gutter?: boolean
}

const GUTTER_HIDE: ExpandableStation[] = ['about', 'skills', 'experiences', 'projects', 'publications']

export interface BuildingBox extends Retractable {
  at: [number, number]
  /** Footprint [along X, along Z] in world units. */
  size: [number, number]
  height: number
  strips?: GlowStrip[]
}

export interface GlowPillar extends Retractable {
  at: [number, number]
  color: string
  height?: number
}

export interface BlockOutline extends Retractable {
  at: [number, number]
  size: [number, number]
  color?: string
  opacity?: number
}

export const STRIP_COLORS = {
  coral: '#f6bfb2',
  cream: '#f7e3ad',
  cyan: '#8fd8f4',
} as const

function vertical(face: Face, color: string, t: number, span = 0.84): GlowStrip {
  return { kind: 'vertical', face, color, t, span }
}

function bars(face: Face, color: string, count: number, y = 0.58, span = 0.2, t = 0.5): GlowStrip {
  return { kind: 'bars', face, color, count, y, span, t }
}

export const BUILDINGS: BuildingBox[] = [
  // Upper-left, beside Publications
  {
    at: [136, 122],
    size: [1.8, 1.9],
    height: 5.0,
    strips: [bars('left', STRIP_COLORS.cyan, 4, 0.62, 0.28), vertical('right', STRIP_COLORS.coral, 0.55, 0.88)],
    hideWhenExpanded: ['projects'],
  },
  {
    at: [108, 121],
    size: [1.5, 1.5],
    height: 1.4,
    strips: [bars('left', STRIP_COLORS.cyan, 2, 0.58, 0.28), vertical('right', STRIP_COLORS.cyan, 0.45, 0.72)],
    hideWhenExpanded: ['projects', 'publications'],
  },

  // Top-middle, behind Publications / Projects
  {
    at: [302, 36],
    size: [1.4, 1.4],
    height: 3.4,
    strips: [bars('left', STRIP_COLORS.cyan, 3, 0.6, 0.24)],
  },
  {
    at: [400, 48],
    size: [1.5, 1.5],
    height: 1.3,
    strips: [bars('left', STRIP_COLORS.cream, 2, 0.55, 0.26)],
  },
  {
    at: [465, 46],
    size: [2.0, 2.0],
    height: 5.8,
    strips: [vertical('right', STRIP_COLORS.cream, 0.48, 0.86)],
    hideWhenExpanded: ['projects'],
  },
  {
    at: [494, 44],
    size: [1.4, 1.4],
    height: 2.6,
    strips: [bars('left', STRIP_COLORS.cyan, 3, 0.58, 0.26), vertical('right', STRIP_COLORS.coral, 0.5, 0.82)],
    hideWhenExpanded: ['projects'],
  },

  // Upper-right (under the About billboard / Experiences labels)
  {
    at: [873, 162],
    size: [2.1, 2.0],
    height: 5.2,
    strips: [bars('left', STRIP_COLORS.cyan, 3, 0.64, 0.22), vertical('right', STRIP_COLORS.coral, 0.85, 0.86)],
    hideWhenExpanded: ['about', 'experiences'],
  },
  {
    at: [826, 145],
    size: [1.7, 1.7],
    height: 1.8,
    strips: [bars('left', STRIP_COLORS.coral, 2, 0.56, 0.24)],
    hideWhenExpanded: ['about', 'experiences'],
  },
  {
    at: [912, 143],
    size: [1.7, 1.7],
    height: 3.0,
    strips: [bars('left', STRIP_COLORS.cyan, 3, 0.6, 0.24), vertical('right', STRIP_COLORS.cream, 0.42, 0.8)],
    hideWhenExpanded: ['about', 'experiences'],
  },
  {
    at: [940, 165],
    size: [1.8, 1.8],
    height: 2.6,
    strips: [vertical('right', STRIP_COLORS.cream, 0.55, 0.78)],
    hideWhenExpanded: ['about', 'experiences'],
  },
  {
    at: [857, 197],
    size: [1.8, 1.8],
    height: 1.8,
    strips: [bars('left', STRIP_COLORS.coral, 3, 0.55, 0.3)],
    hideWhenExpanded: ['about', 'experiences'],
  },

  // Middle-right, between Experiences and About
  {
    at: [684, 222],
    size: [1.7, 1.7],
    height: 1.4,
    strips: [bars('left', STRIP_COLORS.coral, 2, 0.55, 0.26)],
    hideWhenExpanded: ['experiences'],
  },
  {
    at: [706, 218],
    size: [1.7, 1.7],
    height: 2.9,
    strips: [bars('left', STRIP_COLORS.cyan, 3, 0.58, 0.22), vertical('right', STRIP_COLORS.cyan, 0.4, 0.76)],
    hideWhenExpanded: ['experiences'],
  },

  // Bottom-right, beside START
  {
    at: [805, 318],
    size: [1.5, 1.5],
    height: 1.3,
    strips: [bars('left', STRIP_COLORS.cyan, 2, 0.56, 0.28)],
    hideWhenExpanded: ['about'],
  },
  {
    at: [826, 348],
    size: [1.8, 1.8],
    height: 3.0,
    strips: [bars('left', STRIP_COLORS.cyan, 3, 0.6, 0.24), vertical('right', STRIP_COLORS.coral, 0.5, 0.84)],
    hideWhenExpanded: ['about'],
  },
  {
    at: [848, 345],
    size: [1.4, 1.4],
    height: 1.2,
    strips: [bars('left', STRIP_COLORS.cream, 2, 0.54, 0.26)],
    hideWhenExpanded: ['about'],
  },

  // Bottom-middle, below Skills
  {
    at: [500, 368],
    size: [2.3, 2.2],
    height: 3.6,
    strips: [bars('left', STRIP_COLORS.cyan, 3, 0.6, 0.22), vertical('right', STRIP_COLORS.cream, 0.62, 0.8)],
    hideWhenExpanded: ['skills'],
  },
  {
    at: [539, 375],
    size: [1.5, 1.5],
    height: 1.3,
    strips: [bars('left', STRIP_COLORS.coral, 2, 0.55, 0.26)],
    hideWhenExpanded: ['skills'],
  },

  // Bottom
  {
    at: [432, 496],
    size: [2.1, 2.0],
    height: 3.8,
    strips: [bars('left', STRIP_COLORS.cyan, 4, 0.58, 0.26), vertical('right', STRIP_COLORS.cream, 0.78, 0.72)],
    hideWhenExpanded: ['skills'],
  },

  // Small left-side cluster
  {
    at: [82, 212],
    size: [1.4, 1.4],
    height: 1.0,
    strips: [bars('left', STRIP_COLORS.cream, 2, 0.52, 0.3)],
    hideWhenExpanded: ['projects', 'publications'],
  },

  // Wide-landscape left gutter (above the branding block; design y stays < 260)
  {
    at: [-70, 88],
    size: [1.9, 1.8],
    height: 4.6,
    strips: [bars('left', STRIP_COLORS.cyan, 4, 0.6, 0.26), vertical('right', STRIP_COLORS.coral, 0.52, 0.84)],
    gutter: true,
    hideWhenExpanded: GUTTER_HIDE,
  },
  {
    at: [-118, 102],
    size: [1.5, 1.5],
    height: 2.2,
    strips: [bars('left', STRIP_COLORS.cream, 2, 0.55, 0.26)],
    gutter: true,
    hideWhenExpanded: GUTTER_HIDE,
  },
  {
    at: [-52, 118],
    size: [1.6, 1.6],
    height: 1.5,
    strips: [bars('left', STRIP_COLORS.coral, 2, 0.54, 0.24), vertical('right', STRIP_COLORS.cyan, 0.42, 0.7)],
    gutter: true,
    hideWhenExpanded: GUTTER_HIDE,
  },
  {
    at: [-128, 152],
    size: [1.8, 1.7],
    height: 3.4,
    strips: [vertical('right', STRIP_COLORS.cream, 0.48, 0.8), bars('left', STRIP_COLORS.cyan, 3, 0.58, 0.22)],
    gutter: true,
    hideWhenExpanded: GUTTER_HIDE,
  },
  {
    at: [-168, 138],
    size: [1.4, 1.4],
    height: 1.3,
    strips: [bars('left', STRIP_COLORS.coral, 2, 0.52, 0.28)],
    gutter: true,
    hideWhenExpanded: GUTTER_HIDE,
  },
  {
    at: [-150, 198],
    size: [1.5, 1.5],
    height: 2.0,
    strips: [bars('left', STRIP_COLORS.cyan, 3, 0.56, 0.24)],
    gutter: true,
    hideWhenExpanded: GUTTER_HIDE,
  },

  // Wide-landscape right gutter (beyond About / Start)
  {
    at: [1048, 128],
    size: [2.0, 1.9],
    height: 5.0,
    strips: [bars('left', STRIP_COLORS.cyan, 3, 0.62, 0.24), vertical('right', STRIP_COLORS.coral, 0.58, 0.86)],
    gutter: true,
    hideWhenExpanded: GUTTER_HIDE,
  },
  {
    at: [1092, 152],
    size: [1.6, 1.6],
    height: 2.4,
    strips: [bars('left', STRIP_COLORS.cream, 3, 0.58, 0.26)],
    gutter: true,
    hideWhenExpanded: GUTTER_HIDE,
  },
  {
    at: [1018, 176],
    size: [1.5, 1.5],
    height: 1.4,
    strips: [bars('left', STRIP_COLORS.coral, 2, 0.54, 0.26)],
    gutter: true,
    hideWhenExpanded: GUTTER_HIDE,
  },
  {
    at: [1135, 198],
    size: [1.7, 1.7],
    height: 3.2,
    strips: [vertical('right', STRIP_COLORS.cream, 0.5, 0.78), bars('left', STRIP_COLORS.cyan, 3, 0.6, 0.22)],
    gutter: true,
    hideWhenExpanded: GUTTER_HIDE,
  },
  {
    at: [1072, 328],
    size: [1.8, 1.8],
    height: 2.8,
    strips: [bars('left', STRIP_COLORS.cyan, 3, 0.58, 0.24), vertical('right', STRIP_COLORS.coral, 0.46, 0.8)],
    gutter: true,
    hideWhenExpanded: GUTTER_HIDE,
  },
  {
    at: [1118, 352],
    size: [1.4, 1.4],
    height: 1.2,
    strips: [bars('left', STRIP_COLORS.cream, 2, 0.54, 0.26)],
    gutter: true,
    hideWhenExpanded: GUTTER_HIDE,
  },
]

export const PILLARS: GlowPillar[] = [
  { at: [170, 137], color: STRIP_COLORS.coral, hideWhenExpanded: ['projects'] },
  { at: [445, 64], color: STRIP_COLORS.cream, height: 1.3, hideWhenExpanded: ['projects'] },
  { at: [551, 58], color: STRIP_COLORS.cyan, height: 1.0, hideWhenExpanded: ['projects'] },
  { at: [851, 143], color: STRIP_COLORS.cyan, height: 1.6, hideWhenExpanded: ['about', 'experiences'] },
  { at: [939, 267], color: STRIP_COLORS.cyan, height: 1.1, hideWhenExpanded: ['about'] },
  { at: [728, 208], color: STRIP_COLORS.cyan, height: 1.1, hideWhenExpanded: ['experiences'] },
  { at: [460, 335], color: STRIP_COLORS.cream, hideWhenExpanded: ['skills'] },
  { at: [529, 381], color: STRIP_COLORS.coral, hideWhenExpanded: ['skills'] },
  { at: [95, 216], color: STRIP_COLORS.cream, hideWhenExpanded: ['projects', 'publications'] },
  { at: [-78, 96], color: STRIP_COLORS.cyan, height: 1.4, gutter: true, hideWhenExpanded: GUTTER_HIDE },
  { at: [-140, 155], color: STRIP_COLORS.coral, height: 1.1, gutter: true, hideWhenExpanded: GUTTER_HIDE },
  { at: [1060, 140], color: STRIP_COLORS.cream, height: 1.5, gutter: true, hideWhenExpanded: GUTTER_HIDE },
  { at: [1108, 336], color: STRIP_COLORS.cyan, height: 1.1, gutter: true, hideWhenExpanded: GUTTER_HIDE },
]

export const OUTLINES: BlockOutline[] = [
  { at: [165, 133], size: [5.5, 4], hideWhenExpanded: ['projects'] },
  { at: [880, 180], size: [5.7, 8.7], hideWhenExpanded: ['about', 'experiences'] },
  { at: [700, 215], size: [5, 4], color: '#3a3448', hideWhenExpanded: ['experiences'] },
  { at: [825, 340], size: [7, 6], hideWhenExpanded: ['about'] },
  { at: [496, 360], size: [8, 6.4], hideWhenExpanded: ['skills'] },
  { at: [395, 512], size: [6, 6], hideWhenExpanded: ['skills'] },
  { at: [670, 490], size: [12, 8], color: '#34344a', opacity: 0.3 },
  { at: [-90, 130], size: [7.2, 6.2], gutter: true, hideWhenExpanded: GUTTER_HIDE },
  { at: [1085, 190], size: [7.4, 7.0], gutter: true, hideWhenExpanded: GUTTER_HIDE },
]
