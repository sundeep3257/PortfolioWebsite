/**
 * Keeps the SPA shell aligned to the *visible* viewport (Chrome mobile URL bar,
 * keyboards, etc.) and applies a short-landscape inset so the 960×540 design
 * frame — including project-page chrome that sits near the top — stays on screen.
 *
 * Desktop / laptop: visualViewport ≈ window and the short-landscape pad is off,
 * so --s and layout match the previous 100vw / 100vh behaviour.
 */

const SHORT_LANDSCAPE_MAX_HEIGHT = 520
/** Extra letterbox on short phone landscapes (beyond safe-area). */
const SHORT_LANDSCAPE_PAD_Y = 36
const SHORT_LANDSCAPE_PAD_X = 12

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
  root.style.setProperty('--frame-pad-y', short ? `${SHORT_LANDSCAPE_PAD_Y}px` : '0px')
  root.style.setProperty('--frame-pad-x', short ? `${SHORT_LANDSCAPE_PAD_X}px` : '0px')
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
