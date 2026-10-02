import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import * as THREE from 'three'
import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { STATIONS } from '../data/stations'
import {
  EXPERIENCE_BRANCHES,
  EXPERIENCE_CORNER_RADIUS,
  EXPERIENCE_NODES,
  EXPERIENCE_NODES_SCREEN,
  EXPERIENCES,
  EXPERIENCES_TIMELINE,
  TICKET,
  TICKET_GROUND,
} from '../data/experiences'
import { SUB_STATION_SCALE, SUB_TRACK_WIDTH } from '../data/skills'
import { useTrainNavigationContext } from '../hooks/useTrainNavigation'
import { applyReveal, approach, clamp01, easeOutBack, easeOutCubic, useRevealTimeline } from '../lib/reveal'
import { StationMarker, STATION_Y, type MarkerAnimation } from './StationMarker'
import { STATION_OVERRUN } from './SubwayMap'
import { RibbonTrack, type RibbonAnimation } from './RibbonTrack'
import { WorldPanel, useMeasuredHeight } from './WorldPanel'
import { ArrowRightIcon } from './Icons'

/** Refs for everything one branch animates per frame. */
interface BranchRefs {
  track: RefObject<RibbonAnimation>
  marker: RefObject<MarkerAnimation>
  label: RefObject<HTMLButtonElement | null>
  /** 0..1 how lit the branch currently is (eased towards the selection). */
  lit: number
  /** Decaying flash fired when the branch becomes selected. */
  pulse: number
}

interface SubStationProps {
  index: number
  refs: BranchRefs
  selected: boolean
  interactive: boolean
  onSelect: (index: number) => void
}

function SubStation({ index, refs, selected, interactive, onSelect }: SubStationProps) {
  const experience = EXPERIENCES[index]
  const [x, z] = EXPERIENCE_NODES[index]
  const color = STATIONS.experiences.color
  const [hovered, setHovered] = useState(false)

  useEffect(() => {
    if (!interactive) setHovered(false)
  }, [interactive])

  return (
    <group position={[x, 0, z]}>
      <StationMarker color={color} hovered={selected || hovered} sizeScale={SUB_STATION_SCALE} anim={refs.marker} />
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, STATION_Y + 0.01, 0]}
        onClick={(e) => {
          if (!interactive) return
          e.stopPropagation()
          onSelect(index)
        }}
        onPointerOver={(e) => {
          if (!interactive) return
          e.stopPropagation()
          setHovered(true)
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          setHovered(false)
          document.body.style.cursor = ''
        }}
      >
        <circleGeometry args={[1.7, 32]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <Html position={[0, 0.2, 0]} zIndexRange={[20, 10]} style={{ pointerEvents: 'none' }}>
        <button
          ref={refs.label}
          type="button"
          className={`exp-label${selected ? ' is-selected' : ''}${interactive ? ' is-interactive' : ''}`}
          onClick={() => onSelect(index)}
          aria-pressed={selected}
        >
          <span className="exp-label__title">{experience.title}</span>
          <span className="exp-label__subtitle">{experience.subtitle}</span>
        </button>
      </Html>
    </group>
  )
}

/**
 * The Experiences close-up: six branches fan out from the station to six
 * sub-stations stacked top to bottom, each carrying an employer and role.
 * Beside them a ticket shows the selected experience in full; selecting a
 * sub-station (or the ticket's arrow) lights that branch and re-issues the
 * ticket. Hidden on the landing map; unfolds once the train has come to rest.
 */
export function ExperiencesSubNetwork() {
  const { expandedStation } = useTrainNavigationContext()
  const expanded = expandedStation === 'experiences'
  const root = useRef<THREE.Group>(null)
  const ticket = useRef<HTMLDivElement>(null)
  const entry = useRef<HTMLDivElement>(null)
  const [selected, setSelected] = useState(0)
  // The ticket body is sized to the current entry (the entry element is re-keyed per selection).
  const entryHeight = useMeasuredHeight(entry, selected)
  const [interactive, setInteractive] = useState(false)
  const color = STATIONS.experiences.color

  const branchRefs = useMemo<BranchRefs[]>(
    () =>
      EXPERIENCES.map(() => ({
        track: { current: { progress: 0, glow: 1 } },
        marker: { current: { opacity: 0, scale: 0 } },
        label: { current: null },
        lit: 0,
        pulse: 0,
      })),
    [],
  )

  // Every visit starts on the first experience with the ticket ready.
  useEffect(() => {
    if (expanded) setSelected(0)
    setInteractive(expanded)
  }, [expanded])

  const select = useCallback(
    (index: number) => {
      const next = (index + EXPERIENCES.length) % EXPERIENCES.length
      setSelected((prev) => {
        if (prev !== next) branchRefs[next].pulse = 1
        return next
      })
    },
    [branchRefs],
  )

  const revealed = useRef({ tracks: 0, stations: 0 })
  useRevealTimeline(
    expanded,
    EXPERIENCES_TIMELINE,
    (phase, mode) => {
      const tracks = easeOutCubic(phase('tracks'))
      const stations = phase('stations')
      const labels = phase('labels')
      revealed.current = { tracks, stations }
      const count = EXPERIENCES.length
      branchRefs.forEach((refs, i) => {
        // Branches unfold from the top down, each slightly after the last; all retract together.
        refs.track.current.progress = mode === 'reveal' ? clamp01(tracks * 1.5 - (i / count) * 0.5) : tracks
        refs.marker.current.opacity = stations
        const own = mode === 'reveal' ? clamp01(labels * 1.4 - (i / count) * 0.4) : labels
        const el = refs.label.current
        if (el) {
          el.style.opacity = own.toFixed(3)
          el.style.setProperty('--rise', ((1 - own) * 6).toFixed(2))
        }
      })
      applyReveal(ticket.current, easeOutCubic(phase('ticket')), 12)
    },
    root,
    'experiences',
  )

  // Selection lighting runs continuously: the chosen branch brightens and its station grows a little.
  useFrame((_, delta) => {
    const { stations } = revealed.current
    branchRefs.forEach((refs, i) => {
      refs.lit = approach(refs.lit, i === selected ? 1 : 0, delta, 7)
      refs.pulse = Math.max(0, refs.pulse - delta * 2.2)
      const flash = refs.pulse * refs.pulse
      refs.track.current.glow = 1 + 0.32 * refs.lit + 0.55 * flash
      const base = stations > 0 ? 0.6 + 0.4 * easeOutBack(stations) : 0
      refs.marker.current.scale = base * (1 + 0.12 * refs.lit + 0.1 * flash)
    })
  })

  const experience = EXPERIENCES[selected]
  // Connector geometry: rail to the left of the ticket, sliding to the selected label's row.
  const dy = EXPERIENCE_NODES_SCREEN[selected][1] - TICKET.centre[1]
  const railLeft = TICKET.railX - (TICKET.centre[0] - TICKET.width / 2)
  const tickLeft = TICKET.tickX - (TICKET.centre[0] - TICKET.width / 2)

  return (
    <group ref={root} visible={false}>
      {EXPERIENCE_BRANCHES.map((points, i) => (
        // Branches share their first stretch; tiny height offsets keep them from fighting for the same pixels.
        <group key={EXPERIENCES[i].id} position={[0, i * 0.0015, 0]}>
          <RibbonTrack
            points={points}
            color={color}
            width={SUB_TRACK_WIDTH}
            radius={EXPERIENCE_CORNER_RADIUS}
            startOverrun={STATION_OVERRUN}
            endOverrun={STATION_OVERRUN * SUB_STATION_SCALE}
            anim={branchRefs[i].track}
          />
        </group>
      ))}

      {EXPERIENCES.map((entry, i) => (
        <SubStation
          key={entry.id}
          index={i}
          refs={branchRefs[i]}
          selected={i === selected}
          interactive={interactive}
          onSelect={select}
        />
      ))}

      <WorldPanel
        position={[TICKET_GROUND[0], 0, TICKET_GROUND[1]]}
        width={TICKET.width}
        anchor="center"
        contentRef={ticket}
        className="ticket"
      >
        {/* Connector from the selected sub-station's row to the ticket */}
        <div className="ticket__connector" aria-hidden="true">
          <span className="ticket__connector-h" style={{ left: railLeft, width: -railLeft }} />
          <span
            className="ticket__connector-rail"
            style={{ left: railLeft, top: `calc(50% + ${Math.min(0, dy)}px)`, height: Math.abs(dy) }}
          />
          <span
            className="ticket__connector-tick"
            style={{ left: tickLeft, width: railLeft - tickLeft, top: `calc(50% + ${dy}px)` }}
          />
        </div>

        <div className="ticket__edge">
          <div className="ticket__body">
            {/* Height follows the current entry so the ticket never carries empty space */}
            <div className="ticket__main" style={entryHeight ? { height: entryHeight } : undefined}>
              {/* Re-keyed on selection so the entry slides in afresh */}
              <div key={experience.id} ref={entry} className="ticket__entry">
                <h3 className="ticket__title">{experience.title}</h3>
                <p className="ticket__subtitle">{experience.subtitle}</p>
                <div className="ticket__rule" />
                <p className="ticket__text">{experience.description}</p>
              </div>
            </div>
            <div className="ticket__stub">
              <button
                type="button"
                className="ticket__next"
                onClick={() => select(selected + 1)}
                aria-label="Next experience"
                title="Next experience"
                disabled={!interactive}
              >
                <ArrowRightIcon />
              </button>
            </div>
          </div>
        </div>
      </WorldPanel>
    </group>
  )
}
