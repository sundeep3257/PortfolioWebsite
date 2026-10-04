import { useMemo, useRef, type CSSProperties, type RefObject } from 'react'
import * as THREE from 'three'
import { CAMERA_YAW, SCREEN_RIGHT } from '../data/camera'
import { STATIONS } from '../data/stations'
import {
  SKILL_BOARD,
  SKILL_CATEGORIES,
  SKILLS_TIMELINE,
  SUB_STATION_SCALE,
  SUB_TRACK_WIDTH,
  skillBoardBase,
  skillWaypoints,
  type SkillCategory,
} from '../data/skills'
import { useTrainNavigationContext } from '../hooks/useTrainNavigation'
import { applyReveal, clamp01, easeOutBack, easeOutCubic, useRevealTimeline } from '../lib/reveal'
import { StationMarker, type MarkerAnimation } from './StationMarker'
import { STATION_OVERRUN } from './SubwayMap'
import { Track } from './Track'
import { Platform, type PlatformAnimation } from './Platform'
import { SignSlab, type SlabAnimation } from './SignSlab'
import { PANEL_PX_PER_UNIT } from './WorldPanel'
import { useWideLayout } from '../hooks/useWideLayout'

/** Refs for everything one branch animates per frame. */
interface BranchRefs {
  legs: RefObject<THREE.Group | null>[]
  stub: RefObject<THREE.Group | null>
  marker: RefObject<MarkerAnimation>
  pedestal: RefObject<PlatformAnimation>
  slab: RefObject<SlabAnimation>
  board: RefObject<HTMLDivElement | null>
  details: RefObject<HTMLUListElement | null>
}

interface BranchProps {
  category: SkillCategory
  refs: BranchRefs
  widthBoost: number
  baseOffset: [number, number]
}

/** How far the stub track runs from the sub-station in behind the board (90 design px, in world units). */
const STUB_LENGTH = 90 / PANEL_PX_PER_UNIT

/** The slab stands towards the back of its pedestal: its base offset from the pedestal's top centre. */
const slabOffset: [number, number, number] = [
  -SKILL_BOARD.setback * Math.sin(CAMERA_YAW + SKILL_BOARD.yaw),
  0,
  -SKILL_BOARD.setback * Math.cos(CAMERA_YAW + SKILL_BOARD.yaw),
]

function SkillBranch({ category, refs, widthBoost, baseOffset }: BranchProps) {
  const points = useMemo(() => skillWaypoints(category), [category])
  const station = points[points.length - 1]
  const base = useMemo(() => skillBoardBase(category, baseOffset), [category, baseOffset])
  const spread = baseOffset[0] !== 0 || baseOffset[1] !== 0
  // Desktop keeps the short authored spur behind the board. On wide landscape
  // the board has moved, so the stub runs to the pedestal and actually meets it.
  const stubEnd = useMemo<[number, number]>(() => {
    if (!spread) {
      return [station[0] - SCREEN_RIGHT[0] * STUB_LENGTH, station[1] - SCREEN_RIGHT[1] * STUB_LENGTH]
    }
    return [base[0], base[1]]
  }, [station, base, spread])
  const color = STATIONS.skills.color
  const legCount = points.length - 1

  return (
    <group>
      {points.slice(0, -1).map((from, i) => (
        <Track
          key={i}
          ref={refs.legs[i]}
          from={from}
          to={points[i + 1]}
          colorFrom={color}
          width={SUB_TRACK_WIDTH}
          // Start under the main Skills ring; overlap neighbouring legs at corners; end under the sub-station ring.
          startOverrun={i === 0 ? STATION_OVERRUN : SUB_TRACK_WIDTH / 2}
          endOverrun={i === legCount - 1 ? STATION_OVERRUN * SUB_STATION_SCALE : SUB_TRACK_WIDTH / 2}
        />
      ))}
      {/* Short spur from the sub-station in behind the board */}
      <Track
        ref={refs.stub}
        from={station}
        to={stubEnd}
        colorFrom={color}
        width={SUB_TRACK_WIDTH}
        startOverrun={STATION_OVERRUN * SUB_STATION_SCALE}
        endOverrun={spread ? SKILL_BOARD.pedestal.depth * 0.35 : 0}
      />

      <group position={[station[0], 0, station[1]]}>
        <StationMarker color={color} sizeScale={SUB_STATION_SCALE} anim={refs.marker} />
      </group>

      <Platform
        position={base}
        width={SKILL_BOARD.pedestal.width * widthBoost}
        depth={SKILL_BOARD.pedestal.depth}
        height={SKILL_BOARD.pedestal.height}
        color={color}
        yaw={SKILL_BOARD.yaw}
        edge={false}
        anim={refs.pedestal}
      >
        {/* Upright slab standing towards the back of the pedestal */}
        <SignSlab
          position={slabOffset}
          width={SKILL_BOARD.width * widthBoost}
          depth={SKILL_BOARD.depth}
          yaw={SKILL_BOARD.yaw}
          color={color}
          lamp
          anim={refs.slab}
          contentRef={refs.board}
          className="skill-board"
        >
          <div className="skill-board__panel">
            <div className="skill-board__body">
              <h3 className="skill-board__title">
                {category.title.map((line) => (
                  <span key={line}>{line}</span>
                ))}
              </h3>
              {/* Bullets cascade in after the board; `--p` (0..1) is driven per frame, `--i`/`--n` stagger the items. */}
              <ul
                ref={refs.details}
                className="skill-board__items"
                style={{ '--p': 0, '--n': category.items.length } as CSSProperties}
              >
                {category.items.map((item, i) => (
                  <li key={item} style={{ '--i': i } as CSSProperties}>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </SignSlab>
      </Platform>
    </group>
  )
}

/**
 * The three Skills branches and their information boards. Hidden on the
 * landing map; unfolds from the Skills station once the train has come to
 * rest there and folds away as soon as the train is sent elsewhere. Purely
 * informational - not part of the routing graph.
 */
/** Extra screen-space offset (design px) so short-landscape boards fan into the left gutter. */
function skillSpreadOffset(index: number, spread: number): [number, number] {
  if (spread <= 0) return [0, 0]
  // AIA/ML stay left; Web Development shifts left and up so its last line stays on screen.
  if (index === 0) return [-spread * 0.8, spread * 0.1]
  if (index === 1) return [-spread * 1.2, spread * 0.36]
  return [-spread * 0.68, -spread * 0.48]
}

export function SkillsSubNetwork() {
  const { skillsExpanded } = useTrainNavigationContext()
  const { skillWidthBoost, skillSpreadPx } = useWideLayout()
  const root = useRef<THREE.Group>(null)

  const branchRefs = useMemo<BranchRefs[]>(
    () =>
      SKILL_CATEGORIES.map((c) => ({
        legs: c.legs.map(() => ({ current: null })),
        stub: { current: null },
        marker: { current: { opacity: 0, scale: 0 } },
        pedestal: { current: { rise: 0 } },
        slab: { current: { k: 0 } },
        board: { current: null },
        details: { current: null },
      })),
    [],
  )

  useRevealTimeline(
    skillsExpanded,
    SKILLS_TIMELINE,
    (phase, mode) => {
      const tracks = easeOutCubic(phase('tracks'))
      const stations = phase('stations')
      const boards = phase('boards')
      const details = phase('details')
      const categoryCount = SKILL_CATEGORIES.length

      SKILL_CATEGORIES.forEach((category, ci) => {
        const refs = branchRefs[ci]
        const n = category.legs.length
        refs.legs.forEach((leg, i) => {
          const p = clamp01(tracks * n - i)
          if (!leg.current) return
          leg.current.visible = p > 0
          leg.current.scale.x = Math.max(p, 0.0001)
        })
        if (refs.stub.current) {
          refs.stub.current.visible = stations > 0
          refs.stub.current.scale.x = Math.max(stations, 0.0001)
        }
        refs.marker.current.opacity = stations
        refs.marker.current.scale = stations > 0 ? 0.6 + 0.4 * easeOutBack(stations) : 0
        // Boards rise one after another, left to right; all fade together on retract.
        const own = mode === 'reveal' ? clamp01((boards * (categoryCount + 1) - ci) / 2) : boards
        refs.pedestal.current.rise = easeOutCubic(own)
        // The slab rises out of the pedestal just behind it; the face lights once it is up.
        refs.slab.current.k = easeOutCubic(clamp01(own * 1.25))
        applyReveal(refs.board.current, easeOutCubic(clamp01(own * 1.6 - 0.6)), 6)
        // Each category owns an equal slice of the details window, in order.
        const listProgress = mode === 'reveal' ? clamp01(details * categoryCount - ci) : details
        refs.details.current?.style.setProperty('--p', listProgress.toFixed(3))
      })
    },
    root,
    'skills',
  )

  return (
    <group ref={root} visible={false}>
      {SKILL_CATEGORIES.map((category, i) => (
        <SkillBranch
          key={category.id}
          category={category}
          refs={branchRefs[i]}
          widthBoost={skillWidthBoost}
          baseOffset={skillSpreadOffset(i, skillSpreadPx)}
        />
      ))}
    </group>
  )
}
