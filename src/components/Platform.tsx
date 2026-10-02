import { useRef, type ReactNode, type RefObject } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { CAMERA_YAW } from '../data/camera'
import { getRadialGlowTexture } from '../lib/textures'

export const PLATFORM_COLOR = '#3f3f55'
const EDGE_THICKNESS = 0.12

/** Per-frame reveal value a parent drives without re-rendering. */
export interface PlatformAnimation {
  /** 0 = sunk into the ground, 1 = fully raised. */
  rise: number
}

interface PlatformProps {
  /** Ground position of the slab's footprint centre. */
  position: [number, number]
  /** Footprint along screen-right / screen-down, in world units. */
  width: number
  depth: number
  height?: number
  /** Accent colour of the glowing edge strip and light pool. */
  color: string
  /** Extra rotation about the vertical axis (radians) on top of screen alignment. */
  yaw?: number
  /** Draw the glowing strip along the front (viewer-side) top edge. */
  edge?: boolean
  /** Soft light pool on the ground around the slab. */
  glow?: boolean
  anim?: RefObject<PlatformAnimation>
  children?: ReactNode
}

/**
 * A low slab aligned to the screen axes (its long side runs screen-left to
 * screen-right), lit like the buildings, with a neon strip along its front
 * edge. Signs and boards stand on it; children are placed on its top face.
 */
export function Platform({
  position,
  width,
  depth,
  height = 0.28,
  color,
  yaw = 0,
  edge = true,
  glow = true,
  anim,
  children,
}: PlatformProps) {
  const group = useRef<THREE.Group>(null)
  const edgeMat = useRef<THREE.MeshBasicMaterial>(null)
  const glowMat = useRef<THREE.MeshBasicMaterial>(null)
  const glowTexture = getRadialGlowTexture()

  useFrame(() => {
    if (!anim || !group.current) return
    const k = THREE.MathUtils.clamp(anim.current.rise, 0, 1)
    // Scale only — toggling visible here is fine for light count (no lights),
    // but keeping the group mounted avoids pipeline churn on first unfold.
    group.current.visible = true
    group.current.scale.setScalar(Math.max(k, 0.0001))
    if (edgeMat.current) edgeMat.current.opacity = k
    if (glowMat.current) glowMat.current.opacity = 0.18 * k
  })

  return (
    <group ref={group} position={[position[0], 0, position[1]]} scale={anim ? 0.0001 : 1}>
      <group rotation={[0, CAMERA_YAW + yaw, 0]}>
      {glow && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <planeGeometry args={[width * 1.3, depth * 4]} />
          <meshBasicMaterial
            ref={glowMat}
            map={glowTexture}
            color={color}
            transparent
            opacity={0.18}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      )}
      <mesh position={[0, height / 2, 0]}>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial color={PLATFORM_COLOR} roughness={0.7} metalness={0.2} />
      </mesh>
      {edge && (
        <mesh position={[0, height - EDGE_THICKNESS / 2 + 0.01, depth / 2 - EDGE_THICKNESS / 2 + 0.01]}>
          <boxGeometry args={[width - 0.2, EDGE_THICKNESS, EDGE_THICKNESS]} />
          <meshBasicMaterial ref={edgeMat} color={color} toneMapped={false} transparent={anim !== undefined} />
        </mesh>
      )}
      </group>
      {/* Children sit on the top face, in world orientation (so camera-facing panels stay camera-facing). */}
      <group position={[0, height, 0]}>{children}</group>
    </group>
  )
}
