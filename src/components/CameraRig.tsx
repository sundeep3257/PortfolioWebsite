import { useEffect, useLayoutEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrthographicCamera } from '@react-three/drei'
import * as THREE from 'three'
import type { OrthographicCamera as OrthographicCameraImpl } from 'three'
import { BASE_ZOOM, CAMERA_POSITION, designScale, MAP_FRAMING, type CameraFraming } from '../data/camera'
import { SKILLS_FRAMING } from '../data/skills'
import { ABOUT_FRAMING } from '../data/about'
import { EXPERIENCES_FRAMING } from '../data/experiences'
import { PROJECTS_FRAMING } from '../data/projects'
import { PUBLICATIONS_FRAMING } from '../data/publications'
import { useTrainNavigationContext, type ExpandableStation } from '../hooks/useTrainNavigation'
import { warmupTarget } from '../lib/warmup'
import { RING_OUTER } from './StationMarker'

/** Seconds for the camera to move between the map and a station's close-up framing. */
const TRANSITION_SECONDS = 1.25

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
 * reference composition is preserved ("contain" fit) at any window size.
 *
 * The viewing angle never changes; the rig only slides its target point and
 * zoom factor between framings (map <-> a station close-up) with an eased tween.
 */
export function CameraRig() {
  const ref = useRef<OrthographicCameraImpl>(null)
  const { width, height } = useThree((s) => s.size)
  const { expandedStation } = useTrainNavigationContext()

  const current = useRef<CameraFraming>({ target: [...MAP_FRAMING.target], zoom: MAP_FRAMING.zoom })
  const tween = useRef<Tween | null>(null)
  const offset = useRef(new THREE.Vector3(...CAMERA_POSITION))
  const warming = useRef(false)

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

  useLayoutEffect(() => {
    apply(current.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height])

  useEffect(() => {
    const to = expandedStation ? STATION_FRAMINGS[expandedStation] : MAP_FRAMING
    tween.current = {
      from: { target: [...current.current.target], zoom: current.current.zoom },
      to,
      elapsed: 0,
    }
  }, [expandedStation])

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
      current.current = { target: [...MAP_FRAMING.target], zoom: MAP_FRAMING.zoom }
      tween.current = null
      apply(current.current)
      return
    }

    const t = tween.current
    if (!t) return
    t.elapsed = Math.min(t.elapsed + delta, TRANSITION_SECONDS)
    const k = easeInOutCubic(t.elapsed / TRANSITION_SECONDS)
    current.current = {
      target: [
        THREE.MathUtils.lerp(t.from.target[0], t.to.target[0], k),
        THREE.MathUtils.lerp(t.from.target[1], t.to.target[1], k),
      ],
      zoom: THREE.MathUtils.lerp(t.from.zoom, t.to.zoom, k),
    }
    apply(current.current)
    if (t.elapsed >= TRANSITION_SECONDS) tween.current = null
  })

  return <OrthographicCamera ref={ref} makeDefault near={1} far={400} position={CAMERA_POSITION} />
}
