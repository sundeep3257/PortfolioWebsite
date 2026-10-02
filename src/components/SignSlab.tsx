import { useRef, type CSSProperties, type ReactNode, type RefObject } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { CAMERA_PITCH, CAMERA_YAW } from '../data/camera'
import { PANEL_PX_PER_UNIT, WorldPanel, useMeasuredHeight } from './WorldPanel'

export const SLAB_COLOR = '#30304a'
const SLAB_EDGE_COLOR = '#3d3d58'
const LAMP_HOLDER_COLOR = '#1b1b2a'

/** Per-frame reveal value a parent drives without re-rendering. */
export interface SlabAnimation {
  /** 0 = folded flat into its base, 1 = fully raised. */
  k: number
}

export interface SignSlabProps {
  /** World offset of the slab's bottom-front-centre from the parent origin. */
  position?: [number, number, number]
  /** Face width in design px. */
  width: number
  /** Slab thickness in world units. */
  depth?: number
  /** Turn about the vertical axis; positive makes the right-hand side recede. */
  yaw?: number
  /** Accent colour of the glowing bezel and lamp. */
  color: string
  /** Bezel bar thickness in world units. */
  bezel?: number
  /** Lamp bar floating above the top edge, as on lit transit boards. */
  lamp?: boolean
  anim?: RefObject<SlabAnimation>
  /** Receives the HTML face; also measured to size the slab body. */
  contentRef: RefObject<HTMLDivElement | null>
  className?: string
  style?: CSSProperties
  children?: ReactNode
}

/**
 * An upright sign with real thickness: a dark slab body, a glowing bezel
 * wrapping its front edges, and an HTML face (WorldPanel) standing on its
 * front. The body sizes itself to the rendered face, so boards can hold any
 * amount of text. Its bottom-front edge sits on the group origin.
 */
export function SignSlab({
  position = [0, 0, 0],
  width,
  depth = 0.5,
  yaw = 0,
  color,
  bezel = 0.11,
  lamp = false,
  anim,
  contentRef,
  className,
  style,
  children,
}: SignSlabProps) {
  const group = useRef<THREE.Group>(null)
  const measuredPx = useMeasuredHeight(contentRef)
  // Meshes exist from the first frame so warmup can compile them before measure lands.
  const heightPx = measuredPx || 96
  const w = width / PANEL_PX_PER_UNIT
  const h = heightPx / PANEL_PX_PER_UNIT

  useFrame(() => {
    const g = group.current
    if (!g) return
    const k = anim ? THREE.MathUtils.clamp(anim.current.k, 0, 1) : 1
    g.visible = true
    g.scale.y = Math.max(k, 0.0001)
  })

  return (
    <group position={position}>
      <group ref={group} rotation={[0, CAMERA_YAW + yaw, 0]} scale={anim ? [1, 0.0001, 1] : [1, 1, 1]}>
        {/* Body, front face flush with the origin plane */}
        <mesh position={[0, h / 2, -depth / 2]}>
          <boxGeometry args={[w, h, depth]} />
          <meshStandardMaterial color={SLAB_COLOR} roughness={0.65} metalness={0.2} />
        </mesh>
        {/* Back plate, a shade lighter so the top and side faces read as separate planes */}
        <mesh position={[0, h / 2 + bezel / 2, -depth - 0.02]}>
          <boxGeometry args={[w + 2 * bezel, h + bezel, 0.04]} />
          <meshStandardMaterial color={SLAB_EDGE_COLOR} roughness={0.7} metalness={0.15} />
        </mesh>
        {/* Glowing bezel along the top and both sides, wrapping the slab's depth */}
        {[-1, 1].map((side) => (
          <mesh key={side} position={[side * (w / 2 + bezel / 2), h / 2, -depth / 2]}>
            <boxGeometry args={[bezel, h, depth + 0.02]} />
            <meshBasicMaterial color={color} toneMapped={false} />
          </mesh>
        ))}
        <mesh position={[0, h + bezel / 2, -depth / 2]}>
          <boxGeometry args={[w + 2 * bezel, bezel, depth + 0.02]} />
          <meshBasicMaterial color={color} toneMapped={false} />
        </mesh>
        {lamp && (
          <group position={[0, h + bezel + 0.55, 0.08]}>
            <mesh position={[0, 0.09, 0]}>
              <boxGeometry args={[w * 0.52, 0.14, 0.36]} />
              <meshStandardMaterial color={LAMP_HOLDER_COLOR} roughness={0.8} />
            </mesh>
            <mesh>
              <boxGeometry args={[w * 0.48, 0.07, 0.3]} />
              <meshBasicMaterial color={color} toneMapped={false} />
            </mesh>
          </group>
        )}
      </group>
      {/* Upright HTML face on the front plane */}
      <WorldPanel width={width} lean={CAMERA_PITCH} yaw={yaw} contentRef={contentRef} className={className} style={style}>
        {children}
      </WorldPanel>
    </group>
  )
}
