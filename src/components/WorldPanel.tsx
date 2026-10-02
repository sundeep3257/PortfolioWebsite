import { useEffect, useMemo, useState, type CSSProperties, type ReactNode, type Ref, type RefObject } from 'react'
import * as THREE from 'three'
import { Html } from '@react-three/drei'
import { BASE_ZOOM, CAMERA_FACING_ROTATION, STATION_ZOOM } from '../data/camera'

/**
 * CSS px per world unit inside a WorldPanel. Chosen so that 1 CSS px equals
 * 1 design px at the station close-up zoom - panel stylesheets can therefore
 * use plain px values, sized exactly like the rest of the design frame.
 */
export const PANEL_PX_PER_UNIT = BASE_ZOOM * STATION_ZOOM
/** drei's transform mode renders 1 CSS px as distanceFactor / 400 world units. */
const DISTANCE_FACTOR = 400 / PANEL_PX_PER_UNIT

/**
 * Layout height (CSS px, unaffected by the 3D transform) of an element inside
 * a WorldPanel, kept up to date as its content reflows. 0 until measured.
 * Lets 3D geometry (slab bodies, posts) size itself to the HTML it carries.
 * Pass `key` when the ref is re-pointed at a new element (e.g. keyed content).
 */
export function useMeasuredHeight(ref: RefObject<HTMLElement | null>, key?: unknown) {
  const [height, setHeight] = useState(0)
  useEffect(() => {
    // drei renders Html content into its own root a beat after mount, so wait for the element.
    let observer: ResizeObserver | undefined
    let frame = 0
    const attach = () => {
      const el = ref.current
      if (!el) {
        frame = requestAnimationFrame(attach)
        return
      }
      const measure = () => setHeight(el.offsetHeight)
      measure()
      observer = new ResizeObserver(measure)
      observer.observe(el)
    }
    attach()
    return () => {
      cancelAnimationFrame(frame)
      observer?.disconnect()
    }
  }, [ref, key])
  return height
}

export interface WorldPanelProps {
  /** World position of the panel's anchor point. */
  position?: [number, number, number]
  /**
   * Extra rotation (radians) around the vertical axis relative to facing the
   * camera square-on. Positive turns the panel's right-hand side away from the
   * viewer.
   */
  yaw?: number
  /**
   * How far (radians) the panel is raised from the camera-facing plane towards
   * standing vertical. 0 faces the camera exactly; CAMERA_PITCH stands upright.
   */
  lean?: number
  /** CSS width of the panel content, in design px. */
  width: number
  /** Which point of the content sits on the anchor. */
  anchor?: 'bottom' | 'center' | 'top'
  zIndexRange?: [number, number]
  contentRef?: Ref<HTMLDivElement>
  className?: string
  style?: CSSProperties
  children?: ReactNode
}

/**
 * An HTML surface placed in the 3D scene as a real plane (drei `Html` in
 * transform mode), so it scales with the camera zoom and can be tilted like a
 * physical sign. By default it faces the camera square-on, which through the
 * fixed orthographic camera renders exactly like a flat billboard while still
 * staying glued to any 3D geometry placed in the same group.
 */
export function WorldPanel({
  position = [0, 0, 0],
  yaw = 0,
  lean = 0,
  width,
  anchor = 'bottom',
  zIndexRange = [20, 10],
  contentRef,
  className,
  style,
  children,
}: WorldPanelProps) {
  const rotation = useMemo(
    () => new THREE.Euler(CAMERA_FACING_ROTATION[0] + lean, CAMERA_FACING_ROTATION[1] + yaw, 0, 'YXZ'),
    [yaw, lean],
  )

  return (
    <group position={position} rotation={rotation}>
      <Html transform distanceFactor={DISTANCE_FACTOR} zIndexRange={zIndexRange} style={{ width, height: 0 }}>
        <div ref={contentRef} className={`world-panel world-panel--${anchor}${className ? ` ${className}` : ''}`} style={style}>
          {children}
        </div>
      </Html>
    </group>
  )
}
