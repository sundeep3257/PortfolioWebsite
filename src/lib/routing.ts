import * as THREE from 'three'
import { ADJACENCY, NODE_POSITIONS, isStation, type NodeId, type StationId } from '../data/stations'

/** Height at which the train's pivot travels above the ground. */
export const TRACK_Y = 0.06

function nodeVec(id: NodeId, y = TRACK_Y) {
  const [x, z] = NODE_POSITIONS[id]
  return new THREE.Vector3(x, y, z)
}

function edgeLength(a: NodeId, b: NodeId) {
  return nodeVec(a).distanceTo(nodeVec(b))
}

/** Dijkstra over the station/junction graph. Returns the node sequence including both ends. */
export function shortestPath(from: NodeId, to: NodeId): NodeId[] {
  if (from === to) return [from]
  const dist = new Map<NodeId, number>()
  const prev = new Map<NodeId, NodeId>()
  const open = new Set<NodeId>(Object.keys(NODE_POSITIONS) as NodeId[])
  for (const id of open) dist.set(id, Infinity)
  dist.set(from, 0)

  while (open.size) {
    let current: NodeId | null = null
    let best = Infinity
    for (const id of open) {
      const d = dist.get(id)!
      if (d < best) {
        best = d
        current = id
      }
    }
    if (current === null || current === to) break
    open.delete(current)
    for (const next of ADJACENCY[current]) {
      if (!open.has(next)) continue
      const alt = best + edgeLength(current, next)
      if (alt < dist.get(next)!) {
        dist.set(next, alt)
        prev.set(next, current)
      }
    }
  }

  const path: NodeId[] = [to]
  let cursor: NodeId = to
  while (cursor !== from) {
    const p = prev.get(cursor)
    if (!p) return []
    path.unshift(p)
    cursor = p
  }
  return path
}

/**
 * Stations that can be reached from `from` by following a single track,
 * passing straight through non-station junction nodes.
 */
export function neighbouringStations(from: StationId): StationId[] {
  const result: StationId[] = []
  const walk = (node: NodeId, cameFrom: NodeId) => {
    for (const next of ADJACENCY[node]) {
      if (next === cameFrom) continue
      if (isStation(next)) result.push(next)
      else walk(next, node)
    }
  }
  walk(from, from)
  return result
}

export interface Journey {
  curve: THREE.CurvePath<THREE.Vector3>
  length: number
  /** Arc-length positions of intermediate stations the train passes through. */
  stationMarks: number[]
  destination: StationId
}

/** Where the train pivot rests relative to a station, and which way the nose points. */
export interface ParkedPose {
  position: THREE.Vector3
  heading: THREE.Vector3
}

/**
 * When parked, the train pivot sits this far *behind* the station along its
 * heading, so the nose of the leading car comes to rest on the platform the
 * way it does in the reference image.
 */
export const PARK_OFFSET = 2.75

/** Radius used to round the corner where the train changes track. */
const CORNER_RADIUS = 1.6

export function parkedPoseAt(station: StationId, heading: THREE.Vector3): ParkedPose {
  const h = heading.clone().normalize()
  return { position: nodeVec(station).addScaledVector(h, -PARK_OFFSET), heading: h }
}

interface Waypoint {
  point: THREE.Vector3
  isStation: boolean
}

/**
 * Builds a smooth travel curve from the train's current parked pose through
 * a list of graph nodes, ending parked nose-first on the final station.
 */
export function buildJourney(nodes: NodeId[], from: ParkedPose): Journey {
  const waypoints: Waypoint[] = nodes.map((id, i) => ({
    point: nodeVec(id),
    // The origin and destination are handled by the parking logic.
    isStation: i > 0 && i < nodes.length - 1 && isStation(id),
  }))

  // Start from where the train is actually parked. If the first leg heads back
  // along the track the train arrived on, skip the origin node (the pivot is
  // already on that track); otherwise roll forward through the station first.
  const firstDir = waypoints[1].point.clone().sub(waypoints[0].point).normalize()
  if (firstDir.dot(from.heading) < -0.5) waypoints.shift()
  waypoints.unshift({ point: from.position.clone(), isStation: false })

  // Stop PARK_OFFSET short of the destination so the nose rests on it.
  const last = waypoints[waypoints.length - 1]
  const beforeLast = waypoints[waypoints.length - 2]
  const lastDir = last.point.clone().sub(beforeLast.point).normalize()
  const lastLen = last.point.distanceTo(beforeLast.point)
  last.point.addScaledVector(lastDir, -Math.min(PARK_OFFSET, lastLen * 0.9))

  const points = waypoints.map((w) => w.point)
  const curve = new THREE.CurvePath<THREE.Vector3>()
  const stationMarks: number[] = []

  let cursor = points[0].clone()
  let travelled = 0

  for (let i = 1; i < points.length; i++) {
    const p = points[i]
    const isLast = i === points.length - 1
    const prevDir = p.clone().sub(points[i - 1]).normalize()

    let segmentEnd = p.clone()
    let corner: THREE.QuadraticBezierCurve3 | null = null

    if (!isLast) {
      const nextDir = points[i + 1].clone().sub(p).normalize()
      const turning = prevDir.dot(nextDir) < 0.999
      if (turning) {
        const r = Math.min(
          CORNER_RADIUS,
          p.distanceTo(points[i - 1]) * 0.45,
          p.distanceTo(points[i + 1]) * 0.45,
        )
        segmentEnd = p.clone().sub(prevDir.clone().multiplyScalar(r))
        const cornerExit = p.clone().add(nextDir.clone().multiplyScalar(r))
        corner = new THREE.QuadraticBezierCurve3(segmentEnd, p.clone(), cornerExit)
      }
    }

    const line = new THREE.LineCurve3(cursor.clone(), segmentEnd.clone())
    curve.add(line)
    travelled += line.getLength()

    if (corner) {
      const cornerLength = corner.getLength()
      if (waypoints[i].isStation) stationMarks.push(travelled + cornerLength / 2 - PARK_OFFSET)
      curve.add(corner)
      travelled += cornerLength
      cursor = corner.v2.clone()
    } else {
      if (waypoints[i].isStation) stationMarks.push(travelled - PARK_OFFSET)
      cursor = segmentEnd
    }
  }

  return {
    curve,
    length: curve.getLength(),
    stationMarks,
    destination: nodes[nodes.length - 1] as StationId,
  }
}

const _tangent = new THREE.Vector3()
const _point = new THREE.Vector3()

/**
 * Samples a journey at arc-length `s`, extrapolating linearly beyond both
 * ends so individual train cars can trail/lead the pivot.
 */
export function sampleJourney(
  journey: Journey,
  s: number,
  outPosition: THREE.Vector3,
  outTangent: THREE.Vector3,
) {
  const { curve, length } = journey
  const clamped = THREE.MathUtils.clamp(s, 0, length)
  const u = length > 0 ? clamped / length : 0
  curve.getPointAt(u, _point)
  curve.getTangentAt(u, _tangent)
  outTangent.copy(_tangent)
  outPosition.copy(_point)
  const overshoot = s - clamped
  if (overshoot !== 0) outPosition.addScaledVector(_tangent, overshoot)
}
