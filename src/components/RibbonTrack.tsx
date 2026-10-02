import { useMemo, useRef, type RefObject } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { TRACK_HEIGHT } from './Track'

/** Per-frame animation values a parent drives without re-rendering. */
export interface RibbonAnimation {
  /** 0 = nothing drawn, 1 = the whole track, grown from its start. */
  progress: number
  /** Brightness multiplier on the track colour (1 = normal, >1 lights it up). */
  glow: number
}

interface RibbonTrackProps {
  /** Ground waypoints [x, z]; corners between legs are rounded off. */
  points: [number, number][]
  color: string
  width?: number
  /** Corner radius in world units (clamped to fit short legs). */
  radius?: number
  /** Extension past the first / last waypoint (negative stops short). */
  startOverrun?: number
  endOverrun?: number
  anim?: RefObject<RibbonAnimation>
}

const INDICES_PER_SEGMENT = 18

/** Builds a smooth centreline through `points`, rounding each corner with a quadratic curve. */
export function buildRoundedPath(points: [number, number][], radius: number, y: number) {
  const pts = points.map(([x, z]) => new THREE.Vector3(x, y, z))
  const path = new THREE.CurvePath<THREE.Vector3>()
  let cursor = pts[0].clone()
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i]
    const isLast = i === pts.length - 1
    const prevDir = p.clone().sub(pts[i - 1]).normalize()
    let segmentEnd = p.clone()
    let corner: THREE.QuadraticBezierCurve3 | null = null
    if (!isLast) {
      const nextDir = pts[i + 1].clone().sub(p).normalize()
      if (prevDir.dot(nextDir) < 0.999) {
        const r = Math.min(radius, p.distanceTo(pts[i - 1]) * 0.5, p.distanceTo(pts[i + 1]) * 0.5)
        segmentEnd = p.clone().sub(prevDir.clone().multiplyScalar(r))
        corner = new THREE.QuadraticBezierCurve3(segmentEnd, p.clone(), p.clone().add(nextDir.clone().multiplyScalar(r)))
      }
    }
    if (cursor.distanceTo(segmentEnd) > 1e-4) path.add(new THREE.LineCurve3(cursor.clone(), segmentEnd.clone()))
    if (corner) {
      path.add(corner)
      cursor = corner.v2.clone()
    } else {
      cursor = segmentEnd
    }
  }
  return path
}

/**
 * A flat, emissive track ribbon following a rounded polyline - the curved
 * counterpart of `Track`. It grows from its start via the draw range, so a
 * parent can unfold it over time, and can be lit up by scaling its colour.
 */
export function RibbonTrack({
  points,
  color,
  width = 0.26,
  radius = 1.4,
  startOverrun = 0,
  endOverrun = 0,
  anim,
}: RibbonTrackProps) {
  const material = useRef<THREE.MeshBasicMaterial>(null)
  const baseColor = useMemo(() => new THREE.Color(color), [color])

  const { geometry, segments } = useMemo(() => {
    const pts = points.map((p) => [...p] as [number, number])
    const shift = (a: [number, number], b: [number, number], amount: number) => {
      const dx = b[0] - a[0]
      const dz = b[1] - a[1]
      const len = Math.hypot(dx, dz) || 1
      a[0] -= (dx / len) * amount
      a[1] -= (dz / len) * amount
    }
    shift(pts[0], pts[1], startOverrun)
    shift(pts[pts.length - 1], pts[pts.length - 2], endOverrun)

    const path = buildRoundedPath(pts, radius, 0)
    const length = path.getLength()
    const segments = Math.max(2, Math.ceil(length * 10))
    const positions = new Float32Array((segments + 1) * 4 * 3)
    const index: number[] = []
    const p = new THREE.Vector3()
    const t = new THREE.Vector3()
    for (let i = 0; i <= segments; i++) {
      const u = i / segments
      path.getPointAt(u, p)
      path.getTangentAt(u, t)
      const nx = -t.z
      const nz = t.x
      const half = width / 2
      const base = i * 12
      // top-left, top-right, bottom-left, bottom-right
      positions.set([p.x + nx * half, TRACK_HEIGHT, p.z + nz * half], base)
      positions.set([p.x - nx * half, TRACK_HEIGHT, p.z - nz * half], base + 3)
      positions.set([p.x + nx * half, 0, p.z + nz * half], base + 6)
      positions.set([p.x - nx * half, 0, p.z - nz * half], base + 9)
      if (i < segments) {
        const a = i * 4
        const b = a + 4
        index.push(a, a + 1, b, a + 1, b + 1, b) // top
        index.push(a, a + 2, b, a + 2, b + 2, b) // left skirt
        index.push(a + 1, a + 3, b + 1, a + 3, b + 3, b + 1) // right skirt
      }
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setIndex(index)
    return { geometry, segments }
  }, [points, width, radius, startOverrun, endOverrun])

  useFrame(() => {
    if (!anim) return
    const { progress, glow } = anim.current
    geometry.setDrawRange(0, Math.round(segments * THREE.MathUtils.clamp(progress, 0, 1)) * INDICES_PER_SEGMENT)
    if (material.current) material.current.color.copy(baseColor).multiplyScalar(glow)
  })

  return (
    <mesh geometry={geometry} position={[0, 0.005, 0]}>
      <meshBasicMaterial ref={material} color={color} toneMapped={false} side={THREE.DoubleSide} />
    </mesh>
  )
}
