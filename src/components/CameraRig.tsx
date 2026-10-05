import { useLayoutEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrthographicCamera } from '@react-three/drei'
import * as THREE from 'three'
import type { OrthographicCamera as OrthographicCameraImpl } from 'three'
import { BASE_ZOOM, CAMERA_MOVE_SECONDS, CAMERA_POSITION, designScale, mapFramingForViewport, type CameraFraming } from '../data/camera'
import { SKILLS_FRAMING } from '../data/skills'
import { ABOUT_FRAMING } from '../data/about'
import { EXPERIENCES_FRAMING } from '../data/experiences'
import { PROJECTS_FRAMING } from '../data/projects'
import { PUBLICATIONS_FRAMING } from '../data/publications'
import { useTrainNavigationContext, type ExpandableStation } from '../hooks/useTrainNavigation'
import { clampDelta } from '../lib/lights'
import { warmupTarget } from '../lib/warmup'
import { RING_OUTER } from './StationMarker'

/** Where the camera settles while each expandable station is unfolded. */
export const STATION_FRAMINGS: Record<ExpandableStation, CameraFraming> = {
  skills: SKILLS_FRAMING,
  about: ABOUT_FRAMING,
  experiences: EXPERIENCES_FRAMING,
  projects: PROJECTS_FRAMING,
  publications: PUBLICATIONS_FRAMING,
}

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

interface Tween {
  from: CameraFraming
  to: CameraFraming
  elapsed: number
}

/**
 * Fixed orthographic camera. The zoom tracks the viewport so the 960x540
 * reference composition is preserved ("contain" fit) at laptop sizes.
 *
 * On short landscape phones the shared designScale fills more of the width
 * and the landing map shifts slightly so branding can use the left gutter.
 *
 * The viewing angle never changes; the rig only slides its target point and
 * zoom factor between framings (map <-> a station close-up) with an eased tween.
 */
export function CameraRig() {
  const ref = useRef<OrthographicCameraImpl>(null)
  const { width, height } = useThree((s) => s.size)
  const { closeupStation } = useTrainNavigationContext()

  const mapFraming = mapFramingForViewport(width, height)
  const current = useRef<CameraFraming>({ target: [...mapFraming.target], zoom: mapFraming.zoom })
  const tween = useRef<Tween | null>(null)
  const offset = useRef(new THREE.Vector3(...CAMERA_POSITION))
  const warming = useRef(false)
  const mapFramingRef = useRef(mapFraming)
  mapFramingRef.current = mapFraming

  const apply = (framing: CameraFraming) => {
    const cam = ref.current
    if (!cam) return
    const [tx, tz] = framing.target
    cam.zoom = BASE_ZOOM * designScale(width, height) * framing.zoom
    cam.position.set(tx, 0, tz).add(offset.current)
    cam.lookAt(tx, 0, tz)
    cam.updateProjectionMatrix()
    // Lets HTML labels drift outward as rings grow on screen.
    document.documentElement.style.setProperty(
      '--ring-growth',
      (RING_OUTER * BASE_ZOOM * (framing.zoom - 1)).toFixed(2),
    )
  }

  const closeupRef = useRef(closeupStation)
  closeupRef.current = closeupStation

  useLayoutEffect(() => {
    // Resize while resting on the map adopts the new map framing immediately.
    // A station close-up, or a tween already running, keeps its own framing —
    // including while a fold-away is still playing in the close-up.
    if (!closeupRef.current && !tween.current && !warming.current) {
      current.current = { target: [...mapFraming.target], zoom: mapFraming.zoom }
    }
    apply(current.current)
    // apply closes over the latest viewport; map numbers cover framing changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height, mapFraming.target[0], mapFraming.target[1], mapFraming.zoom])

  useLayoutEffect(() => {
    if (warming.current) return
    const to = closeupStation ? STATION_FRAMINGS[closeupStation] : mapFramingRef.current
    const from = current.current
    if (from.target[0] === to.target[0] && from.target[1] === to.target[1] && from.zoom === to.zoom) return
    tween.current = {
      from: { target: [...from.target], zoom: from.zoom },
      to: { target: [...to.target], zoom: to.zoom },
      elapsed: 0,
    }
  }, [closeupStation])

  useFrame((_, delta) => {
    const warm = warmupTarget.current
    if (warm) {
      warming.current = true
      const framing = STATION_FRAMINGS[warm]
      current.current = { target: [framing.target[0], framing.target[1]], zoom: framing.zoom }
      tween.current = null
      apply(current.current)
      return
    }
    if (warming.current) {
      warming.current = false
      const map = mapFramingRef.current
      current.current = { target: [...map.target], zoom: map.zoom }
      tween.current = null
      apply(current.current)
      return
    }

    const t = tween.current
    if (!t) return
    t.elapsed = Math.min(t.elapsed + clampDelta(delta), CAMERA_MOVE_SECONDS)
    const k = easeInOutCubic(t.elapsed / CAMERA_MOVE_SECONDS)
    current.current = {
      target: [
        THREE.MathUtils.lerp(t.from.target[0], t.to.target[0], k),
        THREE.MathUtils.lerp(t.from.target[1], t.to.target[1], k),
      ],
      zoom: THREE.MathUtils.lerp(t.from.zoom, t.to.zoom, k),
    }
    apply(current.current)
    if (t.elapsed >= CAMERA_MOVE_SECONDS) tween.current = null
  })

  return <OrthographicCamera ref={ref} makeDefault near={1} far={400} position={CAMERA_POSITION} />
}
