import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import type { WebGLRenderer } from 'three'
import { getRadialGlowTexture } from '../lib/textures'
import { paintWarmupHtml, stationContentReady, WARMUP_STATIONS, warmupTarget } from '../lib/warmup'

const SETTLE_FRAMES = 16
const PREPARE_FRAMES = 10
const HOLD_FRAMES = 36
const MAP_HOLD_FRAMES = 48
const CONTENT_TIMEOUT_FRAMES = 60
const FONT_FALLBACK_MS = 2000

/**
 * Behind the loading overlay, visit every station close-up exactly as the user
 * would: snap the camera, fully unfold the HTML + meshes, wait until those
 * boards have real layout, compile programs, and let the GPU draw them. Then
 * finish with a map-overview hold so the homepage intro shaders / bloom path
 * are warm too. The hitch happens here, once, so the first real visit is
 * already a second draw.
 */
export function SceneWarmup({ onReady }: { onReady: () => void }) {
  const { gl, scene, camera } = useThree()
  const finished = useRef(false)
  const fontsReady = useRef(false)
  /** -1 settle, 0..n-1 stations, n map overview, then done. */
  const step = useRef(-1)
  const held = useRef(0)
  const compiled = useRef(false)
  const compiling = useRef(false)

  useEffect(() => {
    getRadialGlowTexture()
    document.documentElement.dataset.warming = ''
    void document.fonts.ready.then(() => {
      fontsReady.current = true
    })
    const fallback = window.setTimeout(() => {
      fontsReady.current = true
    }, FONT_FALLBACK_MS)
    return () => {
      window.clearTimeout(fallback)
      warmupTarget.current = null
      delete document.documentElement.dataset.warming
    }
  }, [])

  const compileScene = (onDone: () => void) => {
    const renderer = gl as WebGLRenderer & {
      compileAsync?: (s: typeof scene, c: typeof camera) => Promise<void>
    }
    const finish = () => {
      try {
        // Synchronous compile as a safety net so programs exist even if the
        // async path resolved before the driver finished linking.
        gl.compile(scene, camera)
      } catch {
        /* painted frames still warm the GPU */
      }
      onDone()
    }
    try {
      if (typeof renderer.compileAsync === 'function') {
        void renderer.compileAsync(scene, camera).then(finish).catch(finish)
      } else {
        finish()
      }
    } catch {
      finish()
    }
  }

  useFrame(() => {
    if (finished.current) return
    held.current += 1

    if (step.current < 0) {
      if (!fontsReady.current || held.current < SETTLE_FRAMES) return
      step.current = 0
      held.current = 0
      compiled.current = false
      compiling.current = false
      warmupTarget.current = WARMUP_STATIONS[0]
      return
    }

    if (step.current < WARMUP_STATIONS.length) {
      const station = WARMUP_STATIONS[step.current]
      const contentReady = stationContentReady(station) || held.current >= CONTENT_TIMEOUT_FRAMES

      if (held.current >= PREPARE_FRAMES && contentReady && !compiled.current && !compiling.current) {
        compiling.current = true
        paintWarmupHtml(station)
        compileScene(() => {
          compiled.current = true
          compiling.current = false
          held.current = 0
        })
        return
      }

      if (!compiled.current) return
      if (held.current < HOLD_FRAMES) return

      step.current += 1
      held.current = 0
      compiled.current = false
      compiling.current = false
      warmupTarget.current = WARMUP_STATIONS[step.current] ?? null
      return
    }

    // Map overview: homepage framing with every lit mesh still in the scene so
    // the intro / bloom path is drawn for real before the loader lifts.
    if (step.current === WARMUP_STATIONS.length) {
      warmupTarget.current = null
      if (!compiled.current && !compiling.current) {
        compiling.current = true
        compileScene(() => {
          compiled.current = true
          compiling.current = false
          held.current = 0
        })
        return
      }
      if (!compiled.current) return
      if (held.current < MAP_HOLD_FRAMES) return
      step.current += 1
      held.current = 0
      return
    }

    if (held.current < SETTLE_FRAMES) return
    finished.current = true
    warmupTarget.current = null
    delete document.documentElement.dataset.warming
    onReady()
  })

  return null
}
