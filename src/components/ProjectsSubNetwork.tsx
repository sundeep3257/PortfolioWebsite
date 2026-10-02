import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
  type WheelEvent,
} from 'react'
import * as THREE from 'three'
import { designToGroundAt } from '../data/camera'
import { STATIONS } from '../data/stations'
import {
  PROJECT_CATEGORIES,
  PROJECT_CORNER_RADIUS,
  PROJECT_PANEL_GAP,
  PROJECT_ROW_HEIGHT,
  PROJECT_SIDES,
  PROJECTS_FRAMING,
  PROJECTS_TIMELINE,
  projectBranch,
  projectNode,
  type ProjectCategory,
  type ProjectIcon,
} from '../data/projects'
import { SUB_STATION_SCALE, SUB_TRACK_WIDTH } from '../data/skills'
import { useTrainNavigationContext } from '../hooks/useTrainNavigation'
import { applyReveal, clamp01, easeOutBack, easeOutCubic, useRevealTimeline } from '../lib/reveal'
import { StationMarker, type MarkerAnimation } from './StationMarker'
import { STATION_OVERRUN } from './SubwayMap'
import { RibbonTrack, type RibbonAnimation } from './RibbonTrack'
import { WorldPanel } from './WorldPanel'
import { getProjectPage } from '../data/projectPages'
import { projectPath } from '../lib/routes'
import { useAppNavigation } from '../hooks/useAppNavigation'
import { ArrowRightIcon, ChevronDownIcon, ChevronUpIcon, PaletteIcon, StethoscopeIcon } from './Icons'

const ICONS: Record<ProjectIcon, typeof PaletteIcon> = {
  stethoscope: StethoscopeIcon,
  palette: PaletteIcon,
}

/** Refs for everything one side animates per frame. */
interface SideRefs {
  track: RefObject<RibbonAnimation>
  marker: RefObject<MarkerAnimation>
  panel: RefObject<HTMLDivElement | null>
}

/** Wheel travel (px) that counts as one step, and the pause before the next step is accepted. */
const WHEEL_STEP = 40
const WHEEL_COOLDOWN_MS = 420

interface SideProps {
  category: ProjectCategory
  refs: SideRefs
  expanded: boolean
  interactive: boolean
}

function ProjectSide({ category, refs, expanded, interactive }: SideProps) {
  const { goToProject } = useAppNavigation()
  const { side, projects } = category
  const geometry = PROJECT_SIDES[side]
  const color = STATIONS.projects.color
  const points = useMemo(() => projectBranch(side), [side])
  const node = useMemo(() => projectNode(side), [side])
  const panelGround = useMemo(() => {
    const [nx, ny] = geometry.node
    const half = geometry.panelWidth / 2
    const cx = side === 'left' ? nx - PROJECT_PANEL_GAP - half : nx + PROJECT_PANEL_GAP + half
    return designToGroundAt(PROJECTS_FRAMING, cx, ny)
  }, [geometry, side])

  const [index, setIndex] = useState(0)
  const wheel = useRef({ acc: 0, lastStep: 0 })
  const Icon = ICONS[category.icon]

  // Every visit starts at the top of each list.
  useEffect(() => {
    if (expanded) setIndex(0)
  }, [expanded])

  const step = useCallback(
    (delta: number) => setIndex((i) => THREE.MathUtils.clamp(i + delta, 0, projects.length - 1)),
    [projects.length],
  )

  const onWheel = (e: WheelEvent<HTMLDivElement>) => {
    if (!interactive) return
    const now = performance.now()
    const w = wheel.current
    if (now - w.lastStep < WHEEL_COOLDOWN_MS) return
    w.acc += e.deltaY
    if (Math.abs(w.acc) >= WHEEL_STEP) {
      step(Math.sign(w.acc))
      w.acc = 0
      w.lastStep = now
    }
  }

  const atStart = index === 0
  const atEnd = index === projects.length - 1

  return (
    <group>
      <RibbonTrack
        points={points}
        color={color}
        width={SUB_TRACK_WIDTH}
        radius={PROJECT_CORNER_RADIUS}
        startOverrun={STATION_OVERRUN}
        endOverrun={STATION_OVERRUN * SUB_STATION_SCALE}
        anim={refs.track}
      />
      <group position={[node[0], 0, node[1]]}>
        <StationMarker color={color} sizeScale={SUB_STATION_SCALE} anim={refs.marker} />
      </group>

      <WorldPanel
        position={[panelGround[0], 0, panelGround[1]]}
        width={geometry.panelWidth}
        anchor="top"
        contentRef={refs.panel}
        className={`projects projects--${side}${interactive ? ' is-interactive' : ''}`}
        style={{ '--row': `${PROJECT_ROW_HEIGHT}px`, '--gap': `${PROJECT_PANEL_GAP}px` } as CSSProperties}
      >
        <div className="projects__inner" onWheel={onWheel}>
          <header className="projects__header">
            <span className="projects__icon">
              <Icon />
            </span>
            <h3 className="projects__category">{category.title}</h3>
          </header>

          {/* One row per project; the strip slides so the active row sits level with the sub-station. */}
          <div className="projects__viewport">
            <ul className="projects__strip" style={{ transform: `translateY(${-index * PROJECT_ROW_HEIGHT}px)` }}>
              {projects.map((project, i) => {
                const offset = i - index
                const state = offset === 0 ? 'is-active' : offset === 1 ? 'is-next' : offset < 0 ? 'is-past' : 'is-later'
                return (
                  <li key={project.id} className={`project ${state}`} aria-hidden={offset !== 0}>
                    <h4 className="project__title">{project.title}</h4>
                    <p className="project__subtitle">{project.subtitle}</p>
                    <a
                      href={projectPath(project.id)}
                      className="learn-more"
                      onClick={(event) => {
                        event.preventDefault()
                        const page = getProjectPage(project.id)
                        if (page) goToProject(page.slug)
                      }}
                      tabIndex={offset === 0 && interactive ? 0 : -1}
                      aria-disabled={offset !== 0 || !interactive || undefined}
                    >
                      <span>Learn More</span>
                      <ArrowRightIcon />
                    </a>
                  </li>
                )
              })}
            </ul>
          </div>

          {/* Faint ring one row down, where the next project's sub-station would stand */}
          <span className={`projects__ghost${atEnd ? '' : ' is-visible'}`} aria-hidden="true" />

          {/* Up / down controls with a position rail, on the side away from the station */}
          <nav className="projects__nav" aria-label={`Browse ${category.title}`}>
            <button
              type="button"
              className="projects__step"
              onClick={() => step(-1)}
              disabled={atStart || !interactive}
              aria-label="Previous project"
            >
              <ChevronUpIcon />
            </button>
            <span className="projects__rail" aria-hidden="true">
              {projects.map((p, i) => (
                <i key={p.id} className={i === index ? 'is-current' : undefined} />
              ))}
            </span>
            <button
              type="button"
              className="projects__step"
              onClick={() => step(1)}
              disabled={atEnd || !interactive}
              aria-label="Next project"
            >
              <ChevronDownIcon />
            </button>
            <span className="projects__count">
              {String(index + 1).padStart(2, '0')} / {String(projects.length).padStart(2, '0')}
            </span>
          </nav>
        </div>
      </WorldPanel>
    </group>
  )
}

/**
 * The Projects close-up: one branch to each side of the station, each ending
 * at a sub-station beside a browsable list of that category's projects. One
 * project per side is shown level with its sub-station; the next waits,
 * dimmed, beneath it. Hidden on the landing map; unfolds once the train has
 * come to rest.
 */
export function ProjectsSubNetwork() {
  const { expandedStation } = useTrainNavigationContext()
  const expanded = expandedStation === 'projects'
  const root = useRef<THREE.Group>(null)
  const [interactive, setInteractive] = useState(false)

  const sideRefs = useMemo<SideRefs[]>(
    () =>
      PROJECT_CATEGORIES.map(() => ({
        track: { current: { progress: 0, glow: 1 } },
        marker: { current: { opacity: 0, scale: 0 } },
        panel: { current: null },
      })),
    [],
  )

  useRevealTimeline(
    expanded,
    PROJECTS_TIMELINE,
    (phase, mode) => {
      const tracks = easeOutCubic(phase('tracks'))
      const stations = phase('stations')
      const panels = phase('panels')
      sideRefs.forEach((refs, i) => {
        refs.track.current.progress = tracks
        refs.marker.current.opacity = stations
        refs.marker.current.scale = stations > 0 ? 0.6 + 0.4 * easeOutBack(stations) : 0
        const own = mode === 'reveal' ? clamp01(panels * 1.3 - i * 0.3) : panels
        applyReveal(refs.panel.current, easeOutCubic(own), 12)
      })
      if (mode === 'reveal' && panels >= 1) setInteractive(true)
      if (mode === 'retract') setInteractive(false)
    },
    root,
    'projects',
  )

  return (
    <group ref={root} visible={false}>
      {PROJECT_CATEGORIES.map((category, i) => (
        <ProjectSide
          key={category.id}
          category={category}
          refs={sideRefs[i]}
          expanded={expanded}
          interactive={interactive}
        />
      ))}
    </group>
  )
}
