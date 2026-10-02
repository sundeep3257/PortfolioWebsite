import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { isStation, NODE_COLORS, NODE_POSITIONS, TRACKS, type NodeId, type TrackEdge } from '../data/stations'
import { TRACK_INTRO, useIntroReveal } from '../hooks/useIntroReveal'
import { RING_INNER, RING_OUTER } from './StationMarker'
import { Track, TRACK_WIDTH } from './Track'

/**
 * Tracks stop short of station centres, ending underneath the ring, so the
 * open gap between ring and centre disc shows bare ground.
 */
export const STATION_OVERRUN = -(RING_INNER + RING_OUTER) / 2

function direction(edge: TrackEdge, fromNode: NodeId) {
  const [ax, az] = NODE_POSITIONS[fromNode]
  const other = edge.from === fromNode ? edge.to : edge.from
  const [bx, bz] = NODE_POSITIONS[other]
  return new THREE.Vector2(bx - ax, bz - az).normalize()
}

/**
 * How far past a node's centre this track should extend at that end.
 * - At a station: under the ring.
 * - At a junction, continuing straight through: meet the other half exactly.
 * - At a junction, branching off: stop at the near edge of the through-track
 *   so nothing pokes out the far side.
 */
function endOverrun(edge: TrackEdge, node: NodeId) {
  if (isStation(node)) return STATION_OVERRUN
  const mine = direction(edge, node)
  const continuesThrough = TRACKS.some((other) => {
    if (other === edge || (other.from !== node && other.to !== node)) return false
    return mine.dot(direction(other, node)) < -0.99
  })
  return continuesThrough ? 0 : -TRACK_WIDTH / 2
}

function mixColor(a: string, b: string, t: number) {
  const ca = new THREE.Color(a)
  const cb = new THREE.Color(b)
  return `#${ca.clone().lerp(cb, t).getHexString()}`
}

/**
 * One network edge drawn as two half-tracks that grow from each end toward
 * the midpoint, so the line appears to knit itself together.
 */
function GrowingTrack({ edge, index }: { edge: TrackEdge; index: number }) {
  const { easeInOut } = useIntroReveal()
  const fromRef = useRef<THREE.Group>(null)
  const toRef = useRef<THREE.Group>(null)
  const window = TRACK_INTRO[index] ?? { start: 0.6, end: 1.6 }

  const from = NODE_POSITIONS[edge.from]
  const to = NODE_POSITIONS[edge.to]
  const mid = useMemo<[number, number]>(() => [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2], [from, to])
  const colorFrom = NODE_COLORS[edge.from]
  const colorTo = NODE_COLORS[edge.to]
  const midColor = useMemo(() => mixColor(colorFrom, colorTo, 0.5), [colorFrom, colorTo])

  useFrame(() => {
    const t = easeInOut(window.start, window.end)
    const s = Math.max(t, 0.0001)
    if (fromRef.current) {
      fromRef.current.scale.x = s
      fromRef.current.visible = true
    }
    if (toRef.current) {
      toRef.current.scale.x = s
      toRef.current.visible = true
    }
  })

  return (
    <group>
      <Track
        ref={fromRef}
        from={from}
        to={mid}
        colorFrom={colorFrom}
        colorTo={midColor}
        startOverrun={endOverrun(edge, edge.from)}
        endOverrun={0.04}
      />
      <Track
        ref={toRef}
        from={to}
        to={mid}
        colorFrom={colorTo}
        colorTo={midColor}
        startOverrun={endOverrun(edge, edge.to)}
        endOverrun={0.04}
      />
    </group>
  )
}

export function SubwayMap() {
  return (
    <group>
      {TRACKS.map((edge, i) => (
        <GrowingTrack key={`${edge.from}-${edge.to}`} edge={edge} index={i} />
      ))}
    </group>
  )
}
