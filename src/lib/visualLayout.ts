/**
 * Keeps the SPA shell aligned to the *visible* viewport (Chrome mobile URL bar,
 * keyboards, etc.).
 *
 * Short phone landscapes get a small top-only cushion so hanging project chrome
 * stays clear of the browser UI — without the old symmetric letterbox that
 * crushed the 960×540 frame into a thin strip.
 *
 * Desktop / laptop: visualViewport ≈ window and pads stay 0, so --s and layout
 * match the previous 100vw / 100vh behaviour.
 */

const SHORT_LANDSCAPE_MAX_HEIGHT = 520
/** Top cushion under mobile browser chrome (no matching bottom letterbox). */
const SHORT_LANDSCAPE_PAD_TOP = 8
const SHORT_LANDSCAPE_PAD_X = 0

function isShortLandscape(width: number, height: number) {
  return width > height && height <= SHORT_LANDSCAPE_MAX_HEIGHT
}

/** Write CSS custom properties consumed by styles.css viewport shells. */
export function applyVisualLayout() {
  const vv = window.visualViewport
  const width = vv?.width ?? window.innerWidth
  const height = vv?.height ?? window.innerHeight
  const offsetTop = vv?.offsetTop ?? 0
  const offsetLeft = vv?.offsetLeft ?? 0
  const short = isShortLandscape(width, height)

  const root = document.documentElement
  root.style.setProperty('--vv-top', `${offsetTop}px`)
  root.style.setProperty('--vv-left', `${offsetLeft}px`)
  root.style.setProperty('--vv-width', `${width}px`)
  root.style.setProperty('--vv-height', `${height}px`)
  root.style.setProperty('--frame-pad-top', short ? `${SHORT_LANDSCAPE_PAD_TOP}px` : '0px')
  root.style.setProperty('--frame-pad-bottom', '0px')
  root.style.setProperty('--frame-pad-left', short ? `${SHORT_LANDSCAPE_PAD_X}px` : '0px')
  root.style.setProperty('--frame-pad-right', short ? `${SHORT_LANDSCAPE_PAD_X}px` : '0px')
  root.dataset.shortLandscape = short ? 'true' : 'false'
}

/** Subscribe to viewport changes; returns an unsubscribe function. */
export function startVisualLayoutSync() {
  applyVisualLayout()

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
