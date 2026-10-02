import { useEffect, useRef, type RefObject } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import type { ExpandableStation } from '../data/stations'
import { clampDelta } from './lights'
import { warmupTarget } from './warmup'

export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)
export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
export const easeOutBack = (t: number) => {
  const c1 = 1.2
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
}
export const clamp01 = (v: number) => THREE.MathUtils.clamp(v, 0, 1)

/** Frame-rate independent exponential approach of `current` towards `target`. */
export function approach(current: number, target: number, delta: number, speed: number) {
  return THREE.MathUtils.lerp(current, target, 1 - Math.exp(-speed * delta))
}

/** [start, end] seconds of one phase of a reveal / retract timeline. */
export type Phase = readonly [number, number]
export type RevealMode = 'reveal' | 'retract'

export interface RevealSpec<K extends string> {
  reveal: Record<K, Phase>
  retract: Record<K, Phase>
}

/**
 * Shared reveal / retract timeline for the station sub-networks.
 *
 * When `expanded` flips, a fresh timeline starts and `onFrame` is called every
 * frame until every phase has finished. `phase(key)` reports that phase's
 * progress as 0 (hidden) .. 1 (shown) regardless of direction. The initial
 * state is fully retracted, and `root` (if given) is hidden whenever nothing
 * is showing so a folded-away network costs nothing to draw.
 */
export function useRevealTimeline<K extends string>(
  expanded: boolean,
  spec: RevealSpec<K>,
  onFrame: (phase: (key: K) => number, mode: RevealMode, elapsed: number) => void,
  root?: RefObject<THREE.Object3D | null>,
  warmupId?: ExpandableStation,
) {
  const timeline = useRef<{ mode: RevealMode; elapsed: number } | null>({ mode: 'retract', elapsed: 10 })
  const callback = useRef(onFrame)
  callback.current = onFrame
  const wasWarming = useRef(false)

  useEffect(() => {
    timeline.current = { mode: expanded ? 'reveal' : 'retract', elapsed: 0 }
  }, [expanded])

  useFrame((_, delta) => {
    const step = clampDelta(delta)

    // Behind the loading overlay, each station is fully shown for a few frames
    // so its shaders and HTML compile. Snap back to hidden when the cursor moves on.
    const warmingThis = Boolean(warmupId && warmupTarget.current === warmupId)
    if (warmingThis) {
      wasWarming.current = true
      if (root?.current) {
        root.current.visible = true
        root.current.traverse((obj) => {
          obj.frustumCulled = false
        })
      }
      callback.current(() => 1, 'reveal', 99)
      return
    }
    if (wasWarming.current) {
      wasWarming.current = false
      if (root?.current) {
        root.current.visible = false
        root.current.traverse((obj) => {
          obj.frustumCulled = true
        })
      }
      callback.current(() => 0, 'retract', 99)
      timeline.current = expanded ? { mode: 'reveal', elapsed: 0 } : null
      return
    }

    const tl = timeline.current
    if (!tl) return
    tl.elapsed += step
    const phases = spec[tl.mode]
    const keys = Object.keys(phases) as K[]
    const phase = (key: K) => {
      const [start, end] = phases[key]
      const p = clamp01((tl.elapsed - start) / (end - start))
      return tl.mode === 'reveal' ? p : 1 - p
    }
    if (root?.current) root.current.visible = keys.some((k) => phase(k) > 0)
    callback.current(phase, tl.mode, tl.elapsed)
    const end = Math.max(...keys.map((k) => phases[k][1]))
    if (tl.elapsed >= end) timeline.current = null
  })
}

/** Applies a 0..1 reveal value to an HTML element as a fade + small rise. */
export function applyReveal(el: HTMLElement | null, k: number, risePx = 10) {
  if (!el) return
  el.style.opacity = k.toFixed(3)
  el.style.setProperty('--rise', `${((1 - k) * risePx).toFixed(2)}px`)
  el.style.visibility = k > 0.001 ? 'visible' : 'hidden'
}
