/**
 * Fixed orthographic camera that reproduces the reference render.
 *
 * The reference image is 960x540. Everything in the scene is laid out against
 * that "design space" and the camera zoom is scaled with the viewport so the
 * composition stays identical at any 16:9 size (and is letterboxed otherwise).
 */
export const DESIGN_WIDTH = 960
export const DESIGN_HEIGHT = 540

/** Pixels per world unit when the viewport is exactly 960x540. */
export const BASE_ZOOM = 16

/** Camera elevation angle above the ground plane (degrees). */
export const CAMERA_PITCH_DEG = 39.4
/** Camera rotation around the vertical axis (degrees). */
export const CAMERA_YAW_DEG = 48.3
export const CAMERA_DISTANCE = 120

const pitch = (CAMERA_PITCH_DEG * Math.PI) / 180
const yaw = (CAMERA_YAW_DEG * Math.PI) / 180

export const CAMERA_PITCH = pitch
export const CAMERA_YAW = yaw

/** Zoom (multiplier on BASE_ZOOM) shared by every station close-up. */
export const STATION_ZOOM = 1.5

/**
 * Euler angles (order 'YXZ') for a plane that faces the camera square-on:
 * its local +Y is screen-up and local +X is screen-right.
 */
export const CAMERA_FACING_ROTATION: [number, number, number] = [-pitch, yaw, 0]

/** Design px that one world unit of *height* covers on screen at BASE_ZOOM. */
export const VERTICAL_PX_PER_UNIT = BASE_ZOOM * Math.cos(pitch)

export const CAMERA_POSITION: [number, number, number] = [
  Math.cos(pitch) * Math.sin(yaw) * CAMERA_DISTANCE,
  Math.sin(pitch) * CAMERA_DISTANCE,
  Math.cos(pitch) * Math.cos(yaw) * CAMERA_DISTANCE,
]

/** Phone / short-device landscapes. Laptop and desktop heights stay above this. */
export const SHORT_LANDSCAPE_MAX_HEIGHT = 520

export function isShortLandscape(viewportWidth: number, viewportHeight: number) {
  return viewportWidth > viewportHeight && viewportHeight <= SHORT_LANDSCAPE_MAX_HEIGHT
}

/**
 * How much wider than 16:9 the viewport is, 0 at ≤16:9 and 1 around ~2.2:1
 * (typical landscape phones). Laptop 16:9 / 16:10 stays at 0.
 */
export function wideLandscapeT(viewportWidth: number, viewportHeight: number) {
  if (viewportHeight <= 0) return 0
  const aspect = viewportWidth / viewportHeight
  const designAspect = DESIGN_WIDTH / DESIGN_HEIGHT
  return Math.min(1, Math.max(0, (aspect / designAspect - 1) / 0.35))
}

/**
 * Scale factor that maps design pixels to viewport pixels ("contain" fit).
 *
 * Extra width on short landscapes is used by moving / widening overlays and
 * station boards — not by zooming in, which would crop tall signs.
 */
export function designScale(viewportWidth: number, viewportHeight: number) {
  return Math.min(viewportWidth / DESIGN_WIDTH, viewportHeight / DESIGN_HEIGHT)
}

/**
 * Converts a point in reference-image pixel coordinates to the matching
 * point on the ground plane (y = 0). Lets decoration be placed by reading
 * positions straight off the reference image.
 */
export function designToWorld(px: number, py: number): [number, number] {
  return screenDeltaToGround(px - DESIGN_WIDTH / 2, py - DESIGN_HEIGHT / 2)
}

/**
 * Converts a screen-space offset (in design pixels at BASE_ZOOM) into the
 * corresponding displacement on the ground plane.
 */
export function screenDeltaToGround(dx: number, dy: number): [number, number] {
  const a = dx / BASE_ZOOM
  const b = dy / (BASE_ZOOM * Math.sin(pitch))
  const x = a * Math.cos(yaw) + b * Math.sin(yaw)
  const z = -a * Math.sin(yaw) + b * Math.cos(yaw)
  return [x, z]
}

/** Unit ground directions expressed as screen-space vectors (design px per world unit at BASE_ZOOM). */
export function groundDirToScreen(dx: number, dz: number): [number, number] {
  const sx = BASE_ZOOM * (dx * Math.cos(yaw) - dz * Math.sin(yaw))
  const sy = BASE_ZOOM * Math.sin(pitch) * (dx * Math.sin(yaw) + dz * Math.cos(yaw))
  return [sx, sy]
}

function unit([x, z]: [number, number]): [number, number] {
  const len = Math.hypot(x, z)
  return [x / len, z / len]
}

/** Unit ground direction that appears exactly screen-right through the fixed camera. */
export const SCREEN_RIGHT: [number, number] = unit(screenDeltaToGround(1, 0))
/** Unit ground direction that appears exactly screen-down through the fixed camera. */
export const SCREEN_DOWN: [number, number] = unit(screenDeltaToGround(0, 1))

/** A camera framing: which ground point sits at the screen centre and how far in we are. */
export interface CameraFraming {
  target: [number, number]
  /** Multiplier on BASE_ZOOM. */
  zoom: number
}

/**
 * Landing-map framing. The camera target is nudged screen-right so the
 * subway map, buildings, and overlays sit with equal left/right margin
 * in the 960x540 design frame (the composition was previously right-heavy).
 *
 * Short phone landscapes shift a little further right so the left gutter
 * can hold larger branding without covering tracks.
 */
const MAP_SHIFT_PX = 32
const MAP_WIDE_EXTRA_SHIFT_PX = 40

export function mapFramingForViewport(viewportWidth: number, viewportHeight: number): CameraFraming {
  const t = isShortLandscape(viewportWidth, viewportHeight) ? wideLandscapeT(viewportWidth, viewportHeight) : 0
  const shiftPx = MAP_SHIFT_PX + t * MAP_WIDE_EXTRA_SHIFT_PX
  return { target: screenDeltaToGround(shiftPx, 0), zoom: 1 }
}

/** Reference framing at the authored 16:9 design size (laptop / default). */
export const MAP_FRAMING: CameraFraming = mapFramingForViewport(DESIGN_WIDTH, DESIGN_HEIGHT)

/** Ground point that appears at design-frame pixel (px, py) while the camera holds `framing`. */
export function designToGroundAt(framing: CameraFraming, px: number, py: number): [number, number] {
  const [ox, oz] = screenDeltaToGround((px - DESIGN_WIDTH / 2) / framing.zoom, (py - DESIGN_HEIGHT / 2) / framing.zoom)
  return [framing.target[0] + ox, framing.target[1] + oz]
}

/** Design-frame pixel at which world point (x, y, z) appears while the camera holds `framing`. */
export function worldToDesignAt(framing: CameraFraming, x: number, y: number, z: number): [number, number] {
  const [sx, sy] = groundDirToScreen(x - framing.target[0], z - framing.target[1])
  return [DESIGN_WIDTH / 2 + sx * framing.zoom, DESIGN_HEIGHT / 2 + (sy - y * VERTICAL_PX_PER_UNIT) * framing.zoom]
}

/**
 * Framing used once the train has arrived at Skills: pushes in 1.5x and
 * places the station towards the upper right so its hidden branches unfold
 * into the open space on the left, while the main lines stay in frame.
 */
export function framingAround(anchor: [number, number], anchorScreen: [number, number], zoom: number): CameraFraming {
  const dx = (DESIGN_WIDTH / 2 - anchorScreen[0]) / zoom
  const dy = (DESIGN_HEIGHT / 2 - anchorScreen[1]) / zoom
  const [ox, oz] = screenDeltaToGround(dx, dy)
  return { target: [anchor[0] + ox, anchor[1] + oz], zoom }
}
