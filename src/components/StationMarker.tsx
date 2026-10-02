import { useMemo, useRef, type RefObject } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { getRadialGlowTexture } from '../lib/textures'

export const RING_OUTER = 1.32
export const RING_INNER = 1.1
export const DISC_RADIUS = 0.78
export const STATION_Y = 0.13

/** Per-frame animation values a parent can drive without re-rendering. */
export interface MarkerAnimation {
  /** 0 = invisible, 1 = fully shown. */
  opacity: number
  /** Multiplies the marker's size. */
  scale: number
}

interface StationMarkerProps {
  color: string
  hovered?: boolean
  /** Overall size relative to a main station (sub-stations use < 1). */
  sizeScale?: number
  /** When provided, opacity/scale are read from this ref every frame. */
  anim?: RefObject<MarkerAnimation>
  /**
   * Keep a real point light even while `anim` drives intensity. Main stations
   * use this during the homepage intro; sub-stations leave it off so expanding
   * a network does not mount new lights and hitch the first visit.
   */
  keepLight?: boolean
}

/**
 * The ring / open gap / glowing disc that every station in the subway world
 * is drawn with, plus its light pool and local point light.
 */
export function StationMarker({
  color,
  hovered = false,
  sizeScale = 1,
  anim,
  keepLight = false,
}: StationMarkerProps) {
  const glowTexture = getRadialGlowTexture()
  const group = useRef<THREE.Group>(null)
  const ringMat = useRef<THREE.MeshBasicMaterial>(null)
  const discMat = useRef<THREE.MeshBasicMaterial>(null)
  const glowMat = useRef<THREE.MeshBasicMaterial>(null)
  const light = useRef<THREE.PointLight>(null)

  const { ringColor, discColor } = useMemo(() => {
    const base = new THREE.Color(color)
    const boost = hovered ? 1.28 : 1
    return {
      ringColor: base.clone().multiplyScalar(boost),
      discColor: base.clone().lerp(new THREE.Color('#ffffff'), 0.28).multiplyScalar(boost),
    }
  }, [color, hovered])

  const glowOpacity = hovered ? 0.32 : 0.24
  const lightIntensity = (hovered ? 5 : 3.5) * sizeScale
  const animated = anim !== undefined
  const showLight = keepLight || !animated

  useFrame(() => {
    if (!anim || !group.current) return
    const { opacity, scale } = anim.current
    // Never hide a lit marker via `visible` — that drops its PointLight from
    // Three's light count and recompiles every MeshStandardMaterial.
    group.current.visible = true
    group.current.scale.setScalar(Math.max(scale, 0.0001) * sizeScale)
    if (ringMat.current) ringMat.current.opacity = opacity
    if (discMat.current) discMat.current.opacity = opacity
    if (glowMat.current) glowMat.current.opacity = glowOpacity * opacity
    if (light.current) light.current.intensity = lightIntensity * opacity
  })

  return (
    <group ref={group} scale={sizeScale}>
      {/* Soft light pool on the ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <planeGeometry args={[6, 6]} />
        <meshBasicMaterial
          ref={glowMat}
          map={glowTexture}
          color={color}
          transparent
          opacity={glowOpacity}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* Outer ring (the gap between ring and disc is open, showing the ground) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, STATION_Y, 0]}>
        <ringGeometry args={[RING_INNER, RING_OUTER, 64]} />
        <meshBasicMaterial ref={ringMat} color={ringColor} toneMapped={false} transparent={animated} />
      </mesh>

      {/* Inner disc */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, STATION_Y, 0]}>
        <circleGeometry args={[DISC_RADIUS, 48]} />
        <meshBasicMaterial ref={discMat} color={discColor} toneMapped={false} transparent={animated} />
      </mesh>

      {showLight && (
        <pointLight
          ref={light}
          position={[0, 1.2, 0]}
          color={color}
          intensity={animated ? 0 : lightIntensity}
          distance={9}
          decay={2}
          userData={{ baseIntensity: lightIntensity }}
        />
      )}
    </group>
  )
}
