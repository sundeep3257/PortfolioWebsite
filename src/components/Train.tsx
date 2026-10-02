import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import { sampleJourney } from '../lib/routing'
import { TRAIN_INTRO, useIntroReveal } from '../hooks/useIntroReveal'
import { useTrainNavigationContext } from '../hooks/useTrainNavigation'
import { getRadialGlowTexture } from '../lib/textures'

const CAR_LENGTH = 3.3
const CAR_HEIGHT = 1.0
const CAR_WIDTH = 1.25
const CAR_GAP = 0.2
/** Distance of each car's centre from the train pivot along the track. */
const CAR_OFFSET = (CAR_LENGTH + CAR_GAP) / 2
const BODY_BOTTOM = 0.18

const BODY_COLOR = '#6a6f8e'
const ROOF_COLOR = '#8a90b0'
const TRIM_COLOR = '#0e0f16'
const WINDOW_COLOR = '#8ee6ff'
const STRIPE_COLOR = '#f6f7ff'

/** Units per second at cruising speed. */
const BASE_SPEED = 19

const WINDOW_SLOTS = [-1.05, -0.55, -0.05, 0.45, 0.95]

function Car({ isFront }: { isFront: boolean }) {
  const glowTexture = getRadialGlowTexture()
  const bodyY = BODY_BOTTOM + CAR_HEIGHT / 2
  const roofY = BODY_BOTTOM + CAR_HEIGHT
  return (
    <group>
      {/* Body shell */}
      <RoundedBox args={[CAR_LENGTH, CAR_HEIGHT, CAR_WIDTH]} radius={0.24} smoothness={4} position={[0, bodyY, 0]}>
        <meshStandardMaterial color={BODY_COLOR} metalness={0.25} roughness={0.4} />
      </RoundedBox>

      {/* Roof panel */}
      <mesh position={[0, roofY - 0.01, 0]}>
        <boxGeometry args={[CAR_LENGTH - 0.7, 0.04, CAR_WIDTH - 0.5]} />
        <meshStandardMaterial color={ROOF_COLOR} metalness={0.2} roughness={0.45} />
      </mesh>

      {/* Undercarriage */}
      <mesh position={[0, BODY_BOTTOM + 0.04, 0]}>
        <boxGeometry args={[CAR_LENGTH - 0.5, 0.12, CAR_WIDTH - 0.3]} />
        <meshStandardMaterial color={TRIM_COLOR} roughness={0.85} />
      </mesh>

      {/* Roof highlight stripes (bright on the screen-left edge, softer on the other) */}
      {[1, -1].map((side) => (
        <mesh key={side} position={[0, roofY - 0.07, side * (CAR_WIDTH / 2 - 0.05)]}>
          <boxGeometry args={[CAR_LENGTH - 0.75, 0.05, 0.07]} />
          <meshBasicMaterial color={side === 1 ? STRIPE_COLOR : '#9aa2c8'} toneMapped={false} />
        </mesh>
      ))}

      {/* Side windows */}
      {[1, -1].map((side) =>
        WINDOW_SLOTS.map((wx) => (
          <mesh key={`${side}-${wx}`} position={[wx + 0.05, bodyY + 0.13, side * (CAR_WIDTH / 2 - 0.01)]}>
            <boxGeometry args={[0.34, 0.32, 0.05]} />
            <meshBasicMaterial color={WINDOW_COLOR} toneMapped={false} />
          </mesh>
        )),
      )}

      {/* Cab window on the outer end */}
      <mesh position={[(isFront ? 1 : -1) * (CAR_LENGTH / 2 - 0.02), bodyY + 0.16, 0]}>
        <boxGeometry args={[0.06, 0.36, 0.72]} />
        <meshBasicMaterial color={WINDOW_COLOR} toneMapped={false} />
      </mesh>

      {/* Cyan spill onto the ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.035, 0]}>
        <planeGeometry args={[4.6, 3.4]} />
        <meshBasicMaterial
          map={glowTexture}
          color={WINDOW_COLOR}
          transparent
          opacity={0.14}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  )
}

export function Train() {
  const { activeJourney, parkedPose, completeJourney } = useTrainNavigationContext()
  const { pop } = useIntroReveal()
  const root = useRef<THREE.Group>(null)
  const frontCar = useRef<THREE.Group>(null)
  const rearCar = useRef<THREE.Group>(null)
  const light = useRef<THREE.PointLight>(null)

  const scratch = useMemo(() => ({ pos: new THREE.Vector3(), tan: new THREE.Vector3() }), [])

  const placeCar = (car: THREE.Group | null, pos: THREE.Vector3, tan: THREE.Vector3) => {
    if (!car) return
    car.position.copy(pos)
    car.rotation.set(0, Math.atan2(-tan.z, tan.x), 0)
  }

  const placeTrain = (pivot: THREE.Vector3, sample: (offset: number) => void) => {
    sample(CAR_OFFSET)
    placeCar(frontCar.current, scratch.pos, scratch.tan)
    sample(-CAR_OFFSET)
    placeCar(rearCar.current, scratch.pos, scratch.tan)
    light.current?.position.set(pivot.x, 1.6, pivot.z)
  }

  useFrame((_, rawDelta) => {
    const active = activeJourney.current
    const delta = Math.min(rawDelta, 0.05)

    const intro = pop(TRAIN_INTRO.start, TRAIN_INTRO.end)
    if (root.current) {
      // Keep the train (and its point light) in the scene so lit materials
      // never see the light count change during the homepage intro.
      root.current.visible = true
      root.current.scale.setScalar(Math.max(intro, 0.0001))
      root.current.position.y = (1 - Math.min(intro, 1)) * -1.1
    }
    if (light.current) {
      if (light.current.userData.baseIntensity == null) {
        light.current.userData.baseIntensity = 2.5
      }
      light.current.intensity = (light.current.userData.baseIntensity as number) * Math.min(intro, 1)
    }

    if (active && active.holdBeforeDeparture > 0) active.holdBeforeDeparture -= delta

    if (!active || active.holdBeforeDeparture > 0) {
      const { position, heading } = parkedPose.current
      placeTrain(position, (offset) => {
        scratch.pos.copy(position).addScaledVector(heading, offset)
        scratch.tan.copy(heading)
      })
      return
    }
    const { journey } = active
    const s = active.distance
    const remaining = journey.length - s

    // Speed profile: ease away from the platform, slow near intermediate stations, ease into the destination.
    const easeIn = Math.min(1, 0.15 + s / 2.5)
    const easeOut = Math.max(0.1, Math.sqrt(Math.min(1, remaining / 4.5)))
    let stationFactor = 1
    for (const mark of journey.stationMarks) {
      const k = THREE.MathUtils.smoothstep(Math.abs(s - mark), 0, 3.5)
      stationFactor = Math.min(stationFactor, 0.4 + 0.6 * k)
    }
    const speed = BASE_SPEED * easeIn * easeOut * stationFactor

    let next = s + speed * delta
    const finished = next >= journey.length - 0.015
    if (finished) next = journey.length
    active.distance = next

    sampleJourney(journey, next, scratch.pos, scratch.tan)
    const pivot = scratch.pos.clone()
    placeTrain(pivot, (offset) => sampleJourney(journey, next + offset, scratch.pos, scratch.tan))

    if (finished) {
      const position = new THREE.Vector3()
      const heading = new THREE.Vector3()
      sampleJourney(journey, journey.length, position, heading)
      completeJourney({ position, heading })
    }
  })

  return (
    <group ref={root}>
      <group ref={frontCar}>
        <Car isFront />
      </group>
      <group ref={rearCar}>
        <Car isFront={false} />
      </group>
      <pointLight ref={light} color={WINDOW_COLOR} intensity={2.5} distance={7} decay={2} />
    </group>
  )
}
