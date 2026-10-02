import { forwardRef, useMemo } from 'react'
import * as THREE from 'three'

export const TRACK_WIDTH = 0.3
export const TRACK_HEIGHT = 0.1

export interface TrackProps {
  from: [number, number]
  to: [number, number]
  colorFrom: string
  colorTo?: string
  /** How far the track extends past `from` / `to` (negative to stop short). */
  startOverrun?: number
  endOverrun?: number
  width?: number
  /** Optional transparency, used while a track fades. */
  opacity?: number
}

/**
 * A straight, slightly raised, emissive track segment. Vertex colours blend
 * linearly from `colorFrom` at `from` to `colorTo` at `to`.
 *
 * The mesh lives inside a group anchored at `from` and rotated along the
 * track, so scaling the group's X axis makes the track grow outward from
 * its start - used by the Skills branches when they unfold.
 */
export const Track = forwardRef<THREE.Group, TrackProps>(function Track(
  { from, to, colorFrom, colorTo = colorFrom, startOverrun = 0, endOverrun = 0, width = TRACK_WIDTH, opacity },
  ref,
) {
  const { geometry, rotationY, offset } = useMemo(() => {
    const dx = to[0] - from[0]
    const dz = to[1] - from[1]
    const length = Math.hypot(dx, dz)
    const total = length + startOverrun + endOverrun

    const a = new THREE.Color(colorFrom)
    const b = new THREE.Color(colorTo)
    const geometry = new THREE.BoxGeometry(total, TRACK_HEIGHT, width, 24, 1, 1)
    const pos = geometry.attributes.position
    const colors = new Float32Array(pos.count * 3)
    const c = new THREE.Color()
    for (let i = 0; i < pos.count; i++) {
      const t = THREE.MathUtils.clamp((pos.getX(i) + total / 2 - startOverrun) / length, 0, 1)
      c.copy(a).lerp(b, t)
      colors[i * 3] = c.r
      colors[i * 3 + 1] = c.g
      colors[i * 3 + 2] = c.b
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    return {
      geometry,
      rotationY: Math.atan2(-dz, dx),
      // Box centre along the local X axis, measured from `from`.
      offset: (length + endOverrun - startOverrun) / 2,
    }
  }, [from, to, colorFrom, colorTo, startOverrun, endOverrun, width])

  return (
    <group ref={ref} position={[from[0], TRACK_HEIGHT / 2 + 0.005, from[1]]} rotation={[0, rotationY, 0]}>
      <mesh geometry={geometry} position={[offset, 0, 0]}>
        <meshBasicMaterial
          vertexColors
          toneMapped={false}
          transparent={opacity !== undefined}
          opacity={opacity ?? 1}
          depthWrite={opacity === undefined || opacity > 0.99}
        />
      </mesh>
    </group>
  )
})
