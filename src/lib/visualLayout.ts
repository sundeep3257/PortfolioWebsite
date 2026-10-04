/**
 * Keeps the SPA shell aligned to the *visible* viewport (Chrome mobile URL bar,
 * keyboards, etc.) and publishes aspect-aware layout tokens.
 *
 * Short phone landscapes get a small top-only cushion so hanging project chrome
 * stays clear of the browser UI — without the old symmetric letterbox that
 * crushed the 960×540 frame into a thin strip.
 *
 * Desktop / laptop: visualViewport ≈ window and pads stay 0, so --s and layout
 * match the previous 100vw / 100vh behaviour. Wider-than-16:9 phone landscapes
 * get a larger --s plus text / panel boosts so side gutters are used.
 */

import { DESIGN_HEIGHT, DESIGN_WIDTH, designScale, isShortLandscape, wideLandscapeT } from '../data/camera'

/** Top cushion under mobile browser chrome (no matching bottom letterbox). */
const SHORT_LANDSCAPE_PAD_TOP = 8
const SHORT_LANDSCAPE_PAD_X = 0

export interface LayoutTokens {
  width: number
  height: number
  short: boolean
  wideT: number
  scale: number
  textBoost: number
  labelBoost: number
  panelBoost: number
  widthBoost: number
  aboutWidthBoost: number
  aboutShiftPx: number
  skillSpreadPx: number
  skillWidthBoost: number
  ticketShiftPx: number
  carBoost: number
  gutterX: number
  gutterY: number
  brandPull: number
  controlsPull: number
}

const listeners = new Set<() => void>()

export function readLayoutTokens(): LayoutTokens {
  const vv = window.visualViewport
  const rawW = vv?.width ?? window.innerWidth
  const rawH = vv?.height ?? window.innerHeight
  const short = isShortLandscape(rawW, rawH)
  const { width, height } = (() => {
    const app = document.querySelector('.app') as HTMLElement | null
    if (app && app.clientWidth > 0 && app.clientHeight > 0) {
      return { width: app.clientWidth, height: app.clientHeight }
    }
    const padTop = short ? SHORT_LANDSCAPE_PAD_TOP : 0
    return { width: rawW, height: Math.max(1, rawH - padTop) }
  })()

  const wideT = wideLandscapeT(width, height)
  const scale = designScale(width, height)
  const frameW = DESIGN_WIDTH * scale
  const frameH = DESIGN_HEIGHT * scale
  const gutterX = Math.max(0, (width - frameW) / 2)
  const gutterY = Math.max(0, (height - frameH) / 2)
  const extra = scale > 0 ? gutterX / scale : 0
  const textBoost = short ? 1 + wideT * 0.52 : 1
  const labelBoost = short ? 1 + wideT * 0.3 : 1
  const panelBoost = short ? 1 + wideT * 0.28 : 1
  const widthBoost = short ? 1 + Math.min(0.34, extra * 0.24 / 344) : 1
  const aboutBudget = short ? Math.max(0, extra + 18) : 0
  const aboutGrow = aboutBudget * 0.88
  const aboutWidthBoost = short ? 1 + aboutGrow / 470 : 1
  const aboutShiftPx = aboutBudget * 0.08
  const skillSpreadPx = short ? extra * 0.36 : 0
  const skillWidthBoost = short ? 1 + wideT * 0.12 : 1
  const ticketShiftPx = short ? extra * 0.55 : 0
  // Three text cars + two gaps must stay inside the visible viewport with a small margin.
  const carFit = extra > 0 ? (904 + 2 * extra) / 930 : 1
  const carBoost = short ? Math.min(carFit, 1 + Math.min(0.38, extra * 0.0026 + wideT * 0.2)) : 1
  const brandPull = short ? gutterX * (0.35 + wideT * 0.5) : 0
  const controlsPull = short ? gutterX * (0.4 + wideT * 0.5) : 0

  return {
    width,
    height,
    short,
    wideT,
    scale,
    textBoost,
    labelBoost,
    panelBoost,
    widthBoost,
    aboutWidthBoost,
    aboutShiftPx,
    skillSpreadPx,
    skillWidthBoost,
    ticketShiftPx,
    carBoost,
    gutterX,
    gutterY,
    brandPull,
    controlsPull,
  }
}

/** Write CSS custom properties consumed by styles.css viewport shells. */
export function applyVisualLayout() {
  const vv = window.visualViewport
  const width = vv?.width ?? window.innerWidth
  const height = vv?.height ?? window.innerHeight
  const offsetTop = vv?.offsetTop ?? 0
  const offsetLeft = vv?.offsetLeft ?? 0
  const short = isShortLandscape(width, height)
  const tokens = readLayoutTokens()

  const root = document.documentElement
  root.style.setProperty('--vv-top', `${offsetTop}px`)
  root.style.setProperty('--vv-left', `${offsetLeft}px`)
  root.style.setProperty('--vv-width', `${width}px`)
  root.style.setProperty('--vv-height', `${height}px`)
  root.style.setProperty('--frame-pad-top', short ? `${SHORT_LANDSCAPE_PAD_TOP}px` : '0px')
  root.style.setProperty('--frame-pad-bottom', '0px')
  root.style.setProperty('--frame-pad-left', short ? `${SHORT_LANDSCAPE_PAD_X}px` : '0px')
  root.style.setProperty('--frame-pad-right', short ? `${SHORT_LANDSCAPE_PAD_X}px` : '0px')
  // --s is a length: CSS `layout-px / 960` yields `Npx`, and every `calc(k * var(--s))` relies on that unit.
  root.style.setProperty('--s', `${tokens.scale}px`)
  root.style.setProperty('--gutter-x', `${tokens.gutterX}px`)
  root.style.setProperty('--gutter-y', `${tokens.gutterY}px`)
  root.style.setProperty('--wide-t', tokens.wideT.toFixed(4))
  root.style.setProperty('--text-boost', tokens.textBoost.toFixed(4))
  root.style.setProperty('--label-boost', tokens.labelBoost.toFixed(4))
  root.style.setProperty('--panel-boost', tokens.panelBoost.toFixed(4))
  root.style.setProperty('--width-boost', tokens.widthBoost.toFixed(4))
  root.style.setProperty('--car-boost', tokens.carBoost.toFixed(4))
  root.style.setProperty('--brand-pull', `${tokens.brandPull}px`)
  root.style.setProperty('--controls-pull', `${tokens.controlsPull}px`)
  root.dataset.shortLandscape = tokens.short ? 'true' : 'false'
  root.dataset.wideLandscape = tokens.wideT > 0.08 ? 'true' : 'false'
  root.dataset.ultrawide = tokens.wideT > 0.55 ? 'true' : 'false'

  listeners.forEach((fn) => fn())
}

export function subscribeVisualLayout(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Subscribe to viewport changes; returns an unsubscribe function. */
export function startVisualLayoutSync() {
  applyVisualLayout()
  requestAnimationFrame(() => applyVisualLayout())

  const onChange = () => applyVisualLayout()
  window.addEventListener('resize', onChange)
  window.addEventListener('orientationchange', onChange)
  window.visualViewport?.addEventListener('resize', onChange)
  window.visualViewport?.addEventListener('scroll', onChange)

  return () => {
    window.removeEventListener('resize', onChange)
    window.removeEventListener('orientationchange', onChange)
    window.visualViewport?.removeEventListener('resize', onChange)
    window.visualViewport?.removeEventListener('scroll', onChange)
  }
}

