import type { ExpandableStation } from '../data/stations'

export const WARMUP_STATIONS: readonly ExpandableStation[] = [
  'skills',
  'about',
  'experiences',
  'projects',
  'publications',
]

/**
 * Which expandable station is being GPU-warmed behind the loading overlay.
 * Read from useFrame so cycling stations does not re-render the tree.
 */
export const warmupTarget: { current: ExpandableStation | null } = { current: null }

const WARMUP_SELECTORS: Record<ExpandableStation, string[]> = {
  skills: ['.skill-board'],
  about: ['.about-board', '.about-base'],
  experiences: ['.ticket', '.exp-label'],
  projects: ['.projects'],
  publications: ['.pub-board'],
}

/** True once this station's HTML boards have real layout (drei Html mounts a frame late). */
export function stationContentReady(station: ExpandableStation) {
  return WARMUP_SELECTORS[station].every((selector) => {
    const nodes = document.querySelectorAll(selector)
    if (nodes.length === 0) return false
    return Array.from(nodes).some((node) => (node as HTMLElement).offsetHeight > 1)
  })
}

/** Force style / layout so the first real visit is not the first paint. */
export function paintWarmupHtml(station: ExpandableStation) {
  WARMUP_SELECTORS[station].forEach((selector) => {
    document.querySelectorAll(selector).forEach((node) => {
      const el = node as HTMLElement
      if (el.style.visibility === 'hidden') el.style.visibility = 'visible'
      if (el.style.opacity === '0' || el.style.opacity === '') el.style.opacity = '1'
      void el.offsetHeight
      el.getBoundingClientRect()
    })
  })
  // Station labels also layout behind the loader so the intro and first hover
  // do not pay for first-time text metrics.
  document.querySelectorAll(`.station-label--${station}`).forEach((node) => {
    const el = node as HTMLElement
    void el.offsetHeight
    el.getBoundingClientRect()
  })
}

