import { useMemo, useRef, type ReactNode } from 'react'
import * as THREE from 'three'
import { Line } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { designToWorld } from '../data/camera'
import {
  BUILDINGS,
  OUTLINES,
  PILLARS,
  type BuildingBox,
  type BlockOutline,
  type GlowPillar,
  type GlowStrip,
} from '../data/buildings'
import {
  BUILDING_INTRO,
  OUTLINE_INTRO,
  PILLAR_INTRO,
  useIntroReveal,
} from '../hooks/useIntroReveal'
import { useTrainNavigationContext, type ExpandableStation } from '../hooks/useTrainNavigation'
import { useWideLayout } from '../hooks/useWideLayout'
import { setDrawableVisible, setPointLightFactor } from '../lib/lights'
import { getRadialGlowTexture } from '../lib/textures'

const GUTTER_INTRO = { start: 0.35, end: 1.05 }

const BUILDING_COLOR = '#35354c'
const BUILDING_TOP_COLOR = '#1f1f30'
const FACE_LEFT = '#4a4a62'
const FACE_RIGHT = '#2c2c42'
const STRIP_THICKNESS = 0.08
/** Horizontal bars cover this fraction of the face they sit on. */
const BAR_LENGTH = 0.52
/** Seconds for flagged decoration to sink into / rise out of the ground. */
const RETRACT_DURATION = 0.45

/**
 * Decoration flagged `hideWhenExpanded` sinks into the ground plane while
 * one of the listed stations' sub-networks is open, clearing space for its
 * labels / billboards, and rises back once the train leaves.
 *
 * `intro` multiplies that height so the same group can erect from the ground
 * during the homepage intro without changing the settled look.
 *
 * When fully sunk, meshes are hidden so nothing remains on screen, but neon
 * point lights stay mounted at intensity 0 so Three.js never recompiles lit
 * materials mid-animation.
 */
function Retractable({
  hideWhen,
  intro,
  children,
}: {
  hideWhen?: ExpandableStation[]
  intro?: { start: number; end: number }
  children: ReactNode
}) {
  const { expandedStation } = useTrainNavigationContext()
  const { pop } = useIntroReveal()
  const group = useRef<THREE.Group>(null)
  const progress = useRef(1) // 1 = fully raised, 0 = sunk

  useFrame((_, delta) => {
    const g = group.current
    if (!g) return

    if (hideWhen?.length) {
      const target = expandedStation && hideWhen.includes(expandedStation) ? 0 : 1
      const step = Math.min(delta, 1 / 30) / RETRACT_DURATION
      progress.current = THREE.MathUtils.clamp(
        progress.current + Math.sign(target - progress.current) * Math.min(step, Math.abs(target - progress.current)),
        0,
        1,
      )
    } else {
      progress.current = 1
    }

    const retract = progress.current * progress.current * (3 - 2 * progress.current)
    const erect = intro ? pop(intro.start, intro.end) : 1
    const height = retract * erect
    g.scale.y = Math.max(height, 0.0001)
    g.visible = true
    setPointLightFactor(g, height)
    // Fully clear the footprint once sunk (same as the old group hide), without
    // dropping lights from the shader light count.
    setDrawableVisible(g, height > 0.01)
  })

  return <group ref={group}>{children}</group>
}

function NeonStrip({ strip, size }: { strip: GlowStrip; size: [number, number, number] }) {
  const [w, h, d] = size
  const kind = strip.kind ?? 'vertical'
  const t = strip.t
  const color = strip.color

  if (kind === 'bars') {
    const count = strip.count ?? 3
    const span = strip.span ?? 0.22
    const yCenter = (strip.y ?? 0.58) * h
    const groupH = h * span
    const ys =
      count === 1
        ? [yCenter]
        : Array.from({ length: count }, (_, i) => yCenter - groupH / 2 + (groupH * i) / (count - 1))

    if (strip.face === 'left') {
      const length = w * BAR_LENGTH
      const x = w / 2 - t * w
      const z = d / 2 + STRIP_THICKNESS / 2 - 0.02
      return (
        <group>
          {ys.map((y, i) => (
            <mesh key={i} position={[x, y, z]}>
              <boxGeometry args={[length, STRIP_THICKNESS, STRIP_THICKNESS]} />
              <meshBasicMaterial color={color} toneMapped={false} />
            </mesh>
          ))}
          <pointLight
            position={[x, yCenter, z + 0.45]}
            color={color}
            intensity={1.35}
            distance={4}
            decay={2}
            userData={{ baseIntensity: 1.35 }}
          />
        </group>
      )
    }

    const length = d * BAR_LENGTH
    const x = w / 2 + STRIP_THICKNESS / 2 - 0.02
    const z = d / 2 - t * d
    return (
      <group>
        {ys.map((y, i) => (
          <mesh key={i} position={[x, y, z]}>
            <boxGeometry args={[STRIP_THICKNESS, STRIP_THICKNESS, length]} />
            <meshBasicMaterial color={color} toneMapped={false} />
          </mesh>
        ))}
        <pointLight
          position={[x + 0.45, yCenter, z]}
          color={color}
          intensity={1.35}
          distance={4}
          decay={2}
          userData={{ baseIntensity: 1.35 }}
        />
      </group>
    )
  }

  const span = strip.span ?? 0.8
  const stripHeight = h * span
  const y = stripHeight / 2 + 0.05
  const pos: [number, number, number] =
    strip.face === 'left'
      ? [w / 2 - t * w, y, d / 2 + STRIP_THICKNESS / 2 - 0.02]
      : [w / 2 + STRIP_THICKNESS / 2 - 0.02, y, d / 2 - t * d]
  const lightOffset: [number, number, number] =
    strip.face === 'left' ? [pos[0], y, pos[2] + 0.5] : [pos[0] + 0.5, y, pos[2]]

  return (
    <group>
      <mesh position={pos}>
        <boxGeometry args={[STRIP_THICKNESS, stripHeight, STRIP_THICKNESS]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <pointLight
        position={lightOffset}
        color={color}
        intensity={1.6}
        distance={4.5}
        decay={2}
        userData={{ baseIntensity: 1.6 }}
      />
    </group>
  )
}

function Building({ box }: { box: BuildingBox }) {
  const [x, z] = designToWorld(...box.at)
  const [w, d] = box.size
  const h = box.height
  const size: [number, number, number] = [w, h, d]

  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, h / 2, 0]}>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial attach="material-0" color={FACE_RIGHT} roughness={0.88} metalness={0.08} />
        <meshStandardMaterial attach="material-1" color={BUILDING_COLOR} roughness={0.88} metalness={0.08} />
        <meshStandardMaterial attach="material-2" color={BUILDING_TOP_COLOR} roughness={0.92} metalness={0.05} />
        <meshStandardMaterial attach="material-3" color={BUILDING_COLOR} roughness={0.88} metalness={0.08} />
        <meshStandardMaterial attach="material-4" color={FACE_LEFT} roughness={0.88} metalness={0.08} />
        <meshStandardMaterial attach="material-5" color={BUILDING_COLOR} roughness={0.88} metalness={0.08} />
      </mesh>
      {box.strips?.map((strip, i) => (
        <NeonStrip key={i} strip={strip} size={size} />
      ))}
    </group>
  )
}

function Pillar({ pillar }: { pillar: GlowPillar }) {
  const [x, z] = designToWorld(...pillar.at)
  const h = pillar.height ?? 1.3
  const glowTexture = getRadialGlowTexture()
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, h / 2, 0]}>
        <boxGeometry args={[0.36, h, 0.36]} />
        <meshBasicMaterial color={pillar.color} toneMapped={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <planeGeometry args={[3, 3]} />
        <meshBasicMaterial
          map={glowTexture}
          color={pillar.color}
          transparent
          opacity={0.16}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  )
}

function Outline({ outline, intro }: { outline: BlockOutline; intro?: { start: number; end: number } }) {
  const { ease } = useIntroReveal()
  const group = useRef<THREE.Group>(null)
  const [x, z] = designToWorld(...outline.at)

  const points = useMemo(() => {
    const [w, d] = outline.size
    const y = 0.015
    return [
      new THREE.Vector3(-w / 2, y, -d / 2),
      new THREE.Vector3(w / 2, y, -d / 2),
      new THREE.Vector3(w / 2, y, d / 2),
      new THREE.Vector3(-w / 2, y, d / 2),
      new THREE.Vector3(-w / 2, y, -d / 2),
    ]
  }, [outline])

  useFrame(() => {
    const g = group.current
    if (!g) return
    const t = intro ? ease(intro.start, intro.end) : 1
    // Footprint expands outward from the block centre rather than fading in.
    const s = Math.max(t, 0.0001)
    g.scale.set(s, 1, s)
    // Keep drawn (even tiny) so materials stay warm; no lights under outlines.
    g.visible = true
  })

  return (
    <group ref={group} position={[x, 0, z]}>
      <Line
        points={points}
        color={outline.color ?? '#6e4552'}
        lineWidth={1}
        transparent
        opacity={outline.opacity ?? 0.4}
        depthWrite={false}
      />
    </group>
  )
}

export function Buildings() {
  const { short, wideT } = useWideLayout()
  const showGutter = short && wideT > 0.12

  return (
    <group>
      {BUILDINGS.map((box, i) => {
        if (box.gutter && !showGutter) return null
        return (
          <Retractable key={i} hideWhen={box.hideWhenExpanded} intro={BUILDING_INTRO[i] ?? GUTTER_INTRO}>
            <Building box={box} />
          </Retractable>
        )
      })}
      {PILLARS.map((pillar, i) => {
        if (pillar.gutter && !showGutter) return null
        return (
          <Retractable key={i} hideWhen={pillar.hideWhenExpanded} intro={PILLAR_INTRO[i] ?? GUTTER_INTRO}>
            <Pillar pillar={pillar} />
          </Retractable>
        )
      })}
      {OUTLINES.map((outline, i) => {
        if (outline.gutter && !showGutter) return null
        return (
          <Retractable key={i} hideWhen={outline.hideWhenExpanded}>
            <Outline outline={outline} intro={OUTLINE_INTRO[i]} />
          </Retractable>
        )
      })}
    </group>
  )
}
