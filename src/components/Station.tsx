import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { Html } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import { useFrame } from '@react-three/fiber'
import type { StationDef } from '../data/stations'
import { LABEL_INTRO, STATION_INTRO, useIntroReveal } from '../hooks/useIntroReveal'
import { applyReveal } from '../lib/reveal'
import { StationMarker, STATION_Y, type MarkerAnimation } from './StationMarker'

interface StationProps {
  station: StationDef
  onSelect: (id: StationDef['id']) => void
  /** Dim the interactive affordance while the train is moving. */
  disabled?: boolean
}

export function Station({ station, onSelect, disabled = false }: StationProps) {
  const [hovered, setHovered] = useState(false)
  const [x, z] = station.position
  const { pop, ease } = useIntroReveal()
  const markerAnim = useRef<MarkerAnimation>({ opacity: 0, scale: 0 })
  const labelRef = useRef<HTMLButtonElement>(null)
  const markerWindow = STATION_INTRO[station.id] ?? { start: 0.6, end: 1.2 }
  const labelWindow = LABEL_INTRO[station.id] ?? { start: 1.8, end: 2.4 }

  useEffect(() => {
    document.body.style.cursor = hovered && !disabled ? 'pointer' : ''
    return () => {
      document.body.style.cursor = ''
    }
  }, [hovered, disabled])

  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation()
      onSelect(station.id)
    },
    [onSelect, station.id],
  )

  useFrame(() => {
    const t = pop(markerWindow.start, markerWindow.end)
    markerAnim.current.opacity = Math.min(t, 1)
    markerAnim.current.scale = t > 0 ? Math.max(t, 0.0001) : 0

    const labelT = ease(labelWindow.start, labelWindow.end)
    applyReveal(labelRef.current, labelT, 14)
  })

  const [dx, dy] = station.labelOffset

  return (
    <group position={[x, 0, z]}>
      <StationMarker color={station.color} hovered={hovered} anim={markerAnim} keepLight />

      {/* Click / hover target */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, STATION_Y + 0.01, 0]}
        onClick={handleClick}
        onPointerOver={(e) => {
          e.stopPropagation()
          setHovered(true)
        }}
        onPointerOut={() => setHovered(false)}
      >
        <circleGeometry args={[2.1, 32]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      <Html position={[0, 0.2, 0]} zIndexRange={[20, 10]} style={{ pointerEvents: 'none' }}>
        <button
          ref={labelRef}
          type="button"
          className={`station-label station-label--${station.id}${hovered ? ' is-hovered' : ''}`}
          style={
            {
              color: station.labelColor,
              // Default design-px offset from the ring centre; the stylesheet turns it into a
              // position and can override it (e.g. while a station's sub-network is unfolded).
              '--label-dx': dx,
              '--label-dy': dy,
            } as CSSProperties
          }
          onClick={() => onSelect(station.id)}
          onPointerEnter={() => setHovered(true)}
          onPointerLeave={() => setHovered(false)}
          aria-label={`Go to ${station.name}`}
        >
          {station.name}
        </button>
      </Html>
    </group>
  )
}
