import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import { clampDelta } from '../lib/lights'
import { clamp01, easeInOutCubic, easeOutBack, easeOutCubic } from '../lib/reveal'

/**
 * Homepage intro after the loading overlay: buildings erect, tracks grow
 * together, stations pop in. While shaders are warming behind the loader the
 * scene stays fully drawn; once warming ends it hides, then plays when armed.
 */
export const INTRO_DURATION = 3.15

type IntroPhase = 'warming' | 'hidden' | 'playing' | 'done'

interface IntroRevealApi {
  /** 0..1 progress for a timed window on the intro clock. */
  progress: (start: number, end: number) => number
  /** Same as progress, with easeOutCubic. */
  ease: (start: number, end: number) => number
  /** Same as progress, with easeInOutCubic (good for growing tracks). */
  easeInOut: (start: number, end: number) => number
  /** Pop / erect overshoot easing; settles at 1 when the window finishes. */
  pop: (start: number, end: number) => number
  phase: () => IntroPhase
}

const PASS_THROUGH: IntroRevealApi = {
  progress: () => 1,
  ease: () => 1,
  easeInOut: () => 1,
  pop: () => 1,
  phase: () => 'done',
}

const IntroRevealContext = createContext<IntroRevealApi>(PASS_THROUGH)

export function useIntroReveal() {
  return useContext(IntroRevealContext)
}

interface IntroRevealProviderProps {
  /** True while SceneWarmup is compiling — force the full scene so shaders bake. */
  warming: boolean
  /** True once the loader is ready to fade; starts the intro clock. */
  armed: boolean
  onComplete?: () => void
  children: ReactNode
}

export function IntroRevealProvider({ warming, armed, onComplete, children }: IntroRevealProviderProps) {
  const phase = useRef<IntroPhase>(warming ? 'warming' : 'hidden')
  const elapsed = useRef(0)
  const completed = useRef(false)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  useEffect(() => {
    if (warming) {
      phase.current = 'warming'
      elapsed.current = 0
      completed.current = false
      return
    }
    if (armed) {
      if (phase.current === 'done') return
      phase.current = 'playing'
      elapsed.current = 0
      completed.current = false
      return
    }
    phase.current = 'hidden'
    elapsed.current = 0
    completed.current = false
  }, [warming, armed])

  useFrame((_, delta) => {
    if (phase.current !== 'playing') return
    // Cap spikes so a compile hitch cannot jump the intro forward.
    elapsed.current += clampDelta(delta)
    if (elapsed.current >= INTRO_DURATION && !completed.current) {
      completed.current = true
      phase.current = 'done'
      onCompleteRef.current?.()
    }
  })

  const api = useMemo<IntroRevealApi>(
    () => ({
      progress: (start, end) => {
        const p = phase.current
        if (p === 'warming' || p === 'done') return 1
        if (p === 'hidden') return 0
        return clamp01((elapsed.current - start) / Math.max(end - start, 0.0001))
      },
      ease: (start, end) => {
        const p = phase.current
        if (p === 'warming' || p === 'done') return 1
        if (p === 'hidden') return 0
        return easeOutCubic(clamp01((elapsed.current - start) / Math.max(end - start, 0.0001)))
      },
      easeInOut: (start, end) => {
        const p = phase.current
        if (p === 'warming' || p === 'done') return 1
        if (p === 'hidden') return 0
        return easeInOutCubic(clamp01((elapsed.current - start) / Math.max(end - start, 0.0001)))
      },
      pop: (start, end) => {
        const p = phase.current
        if (p === 'warming' || p === 'done') return 1
        if (p === 'hidden') return 0
        const t = clamp01((elapsed.current - start) / Math.max(end - start, 0.0001))
        return t <= 0 ? 0 : easeOutBack(t)
      },
      phase: () => phase.current,
    }),
    [],
  )

  return <IntroRevealContext.Provider value={api}>{children}</IntroRevealContext.Provider>
}

/** Stagger windows for building / pillar / outline clusters (seconds on the intro clock). */
export const BUILDING_INTRO: { start: number; end: number }[] = [
  // Upper-left (Publications)
  { start: 0.05, end: 0.55 },
  { start: 0.12, end: 0.62 },
  // Top-middle
  { start: 0.18, end: 0.7 },
  { start: 0.22, end: 0.74 },
  { start: 0.28, end: 0.8 },
  { start: 0.32, end: 0.84 },
  // Upper-right (About / Experiences)
  { start: 0.38, end: 0.92 },
  { start: 0.42, end: 0.96 },
  { start: 0.48, end: 1.02 },
  { start: 0.52, end: 1.06 },
  { start: 0.56, end: 1.1 },
  // Middle-right
  { start: 0.6, end: 1.14 },
  { start: 0.64, end: 1.18 },
  // Bottom-right (near START)
  { start: 0.7, end: 1.28 },
  { start: 0.74, end: 1.32 },
  { start: 0.78, end: 1.36 },
  // Bottom-middle (Skills)
  { start: 0.82, end: 1.42 },
  { start: 0.86, end: 1.46 },
  // Bottom + small left
  { start: 0.9, end: 1.52 },
  { start: 0.95, end: 1.55 },
]

export const PILLAR_INTRO: { start: number; end: number }[] = [
  { start: 0.2, end: 0.65 },
  { start: 0.35, end: 0.8 },
  { start: 0.4, end: 0.85 },
  { start: 0.5, end: 0.95 },
  { start: 0.55, end: 1.0 },
  { start: 0.65, end: 1.1 },
  { start: 0.85, end: 1.35 },
  { start: 0.9, end: 1.4 },
  { start: 0.25, end: 0.7 },
]

export const OUTLINE_INTRO: { start: number; end: number }[] = [
  { start: 0.15, end: 0.7 },
  { start: 0.45, end: 1.05 },
  { start: 0.62, end: 1.2 },
  { start: 0.72, end: 1.35 },
  { start: 0.84, end: 1.48 },
  { start: 0.92, end: 1.55 },
  { start: 1.0, end: 1.65 },
]

/** Track edges grow in network order, slightly overlapping. */
export const TRACK_INTRO: { start: number; end: number }[] = [
  { start: 0.55, end: 1.25 }, // start → aboutJunction
  { start: 0.85, end: 1.5 }, // aboutJunction → skills
  { start: 1.15, end: 1.8 }, // skills → projects
  { start: 1.4, end: 2.05 }, // projects → publications
  { start: 1.2, end: 1.85 }, // skills → experiences
  { start: 0.95, end: 1.6 }, // aboutJunction → about
]

/** Station markers pop as the tracks that reach them finish arriving. */
export const STATION_INTRO: Record<string, { start: number; end: number }> = {
  start: { start: 0.5, end: 1.0 },
  about: { start: 1.25, end: 1.75 },
  skills: { start: 1.2, end: 1.7 },
  experiences: { start: 1.55, end: 2.05 },
  projects: { start: 1.5, end: 2.0 },
  publications: { start: 1.75, end: 2.25 },
}

export const LABEL_INTRO: Record<string, { start: number; end: number }> = {
  start: { start: 1.85, end: 2.35 },
  about: { start: 1.95, end: 2.45 },
  skills: { start: 1.9, end: 2.4 },
  experiences: { start: 2.05, end: 2.55 },
  projects: { start: 2.0, end: 2.5 },
  publications: { start: 2.15, end: 2.65 },
}

export const TRAIN_INTRO = { start: 1.7, end: 2.35 }
