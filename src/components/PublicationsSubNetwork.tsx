import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Html, RoundedBox } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { STATIONS } from '../data/stations'
import {
  OWN_NAME,
  PUB_BOARD,
  PUB_BOARD_WIDTH,
  PUB_CAR,
  PUB_JUNCTION,
  PUB_SIDING_LEFT,
  PUB_STOP,
  PUBLICATIONS,
  PUBLICATIONS_TIMELINE,
} from '../data/publications'
import { SUB_TRACK_WIDTH } from '../data/skills'
import { useTrainNavigationContext } from '../hooks/useTrainNavigation'
import { getRadialGlowTexture } from '../lib/textures'
import { applyReveal, approach, clamp01, easeOutBack, easeOutCubic, useRevealTimeline } from '../lib/reveal'
import { STATION_OVERRUN } from './SubwayMap'
import { RibbonTrack, type RibbonAnimation } from './RibbonTrack'
import { WorldPanel } from './WorldPanel'
import { useWideLayout } from '../hooks/useWideLayout'
import { ChevronLeftIcon, ChevronRightIcon, ExternalLinkIcon } from './Icons'

const CAR_BODY = '#62678a'
const CAR_ROOF = '#8288aa'
const CAR_TRIM = '#0e0f16'
/** Corner radius of the siding where it leaves the trunk (world units). */
const SIDING_RADIUS = 1.6

/** Per-car mutable state driven each frame. */
interface CarState {
  group: THREE.Group | null
  windows: THREE.MeshBasicMaterial | null
  spill: THREE.MeshBasicMaterial | null
  tag: HTMLButtonElement | null
  /** 0..1 how lit the car is (eased towards the selection). */
  lit: number
  /** 0..1 reveal scale. */
  reveal: number
}

interface CarProps {
  index: number
  state: CarState
  selected: boolean
  interactive: boolean
  onSelect: (index: number) => void
}

function ArchiveCar({ index, state, selected, interactive, onSelect }: CarProps) {
  const publication = PUBLICATIONS[index]
  const color = STATIONS.publications.color
  const glowTexture = getRadialGlowTexture()
  const { length, height, width } = PUB_CAR
  const bottom = 0.16
  const bodyY = bottom + height / 2
  const windowSlots = [-0.85, -0.3, 0.25, 0.8]
  const windowMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color, toneMapped: false, transparent: true, opacity: 0.4 }),
    [color],
  )
  useEffect(() => {
    state.windows = windowMat
    return () => {
      if (state.windows === windowMat) state.windows = null
      windowMat.dispose()
    }
  }, [state, windowMat])

  return (
    <group ref={(g) => void (state.group = g)} position={[index * PUB_CAR.spacing, 0, 0]}>
      <RoundedBox
        args={[length, height, width]}
        radius={0.18}
        smoothness={4}
        position={[0, bodyY, 0]}
        onClick={(e) => {
          if (!interactive) return
          e.stopPropagation()
          onSelect(index)
        }}
        onPointerOver={(e) => {
          if (!interactive) return
          e.stopPropagation()
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          document.body.style.cursor = ''
        }}
      >
        <meshStandardMaterial color={CAR_BODY} metalness={0.25} roughness={0.45} />
      </RoundedBox>
      <mesh position={[0, bottom + height - 0.01, 0]}>
        <boxGeometry args={[length - 0.5, 0.035, width - 0.4]} />
        <meshStandardMaterial color={CAR_ROOF} metalness={0.2} roughness={0.45} />
      </mesh>
      <mesh position={[0, bottom + 0.035, 0]}>
        <boxGeometry args={[length - 0.4, 0.1, width - 0.25]} />
        <meshStandardMaterial color={CAR_TRIM} roughness={0.85} />
      </mesh>
      {/* Windows share one material so the whole car lights together */}
      {[1, -1].map((side) =>
        windowSlots.map((wx) => (
          <mesh key={`${side}-${wx}`} position={[wx, bodyY + 0.08, side * (width / 2 - 0.01)]} material={windowMat}>
            <boxGeometry args={[0.32, 0.26, 0.05]} />
          </mesh>
        )),
      )}
      {/* Light spill onto the ground; only the selected car glows */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <planeGeometry args={[4, 3]} />
        <meshBasicMaterial
          ref={(m) => void (state.spill = m)}
          map={glowTexture}
          color={color}
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      {/* Year tag above the car */}
      <Html position={[0, bottom + height + 0.35, 0]} center zIndexRange={[20, 10]} style={{ pointerEvents: 'none' }}>
        <button
          ref={(el) => void (state.tag = el)}
          type="button"
          className={`pub-tag${selected ? ' is-selected' : ''}${interactive ? ' is-interactive' : ''}`}
          onClick={() => onSelect(index)}
          aria-label={`Show ${publication.title}`}
        >
          {publication.year}
        </button>
      </Html>
    </group>
  )
}

/**
 * The Publications close-up: a siding curves off the trunk below the station
 * and an archive train stands on it, one car per paper. The car in front of
 * the reading board is the open publication; choose a car (or step with the
 * board's arrows) and the train rolls until that car is at the platform.
 * Hidden on the landing map; unfolds once the train has come to rest.
 */
export function PublicationsSubNetwork() {
  const { expandedStation } = useTrainNavigationContext()
  const { widthBoost } = useWideLayout()
  const expanded = expandedStation === 'publications'
  const root = useRef<THREE.Group>(null)
  const train = useRef<THREE.Group>(null)
  const board = useRef<HTMLDivElement>(null)
  const gantry = useRef<HTMLDivElement>(null)
  const [selected, setSelected] = useState(0)
  const [interactive, setInteractive] = useState(false)
  const color = STATIONS.publications.color
  const station = STATIONS.publications.position

  const trunkAnim = useRef<RibbonAnimation>({ progress: 0, glow: 1 })
  const cars = useMemo<CarState[]>(
    () => PUBLICATIONS.map(() => ({ group: null, windows: null, spill: null, tag: null, lit: 0, reveal: 0 })),
    [],
  )
  const slide = useRef({ offset: 0 })

  // Direction the siding runs on the ground (screen-right).
  const heading = useMemo(() => {
    const dx = PUB_JUNCTION[0] - PUB_SIDING_LEFT[0]
    const dz = PUB_JUNCTION[1] - PUB_SIDING_LEFT[1]
    return Math.atan2(-dz, dx)
  }, [])

  useEffect(() => {
    if (expanded) {
      setSelected(0)
      slide.current.offset = 0
    }
    setInteractive(expanded)
  }, [expanded])

  const select = useCallback((index: number) => {
    setSelected((index + PUBLICATIONS.length) % PUBLICATIONS.length)
  }, [])

  useRevealTimeline(
    expanded,
    PUBLICATIONS_TIMELINE,
    (phase, mode) => {
      const tracks = easeOutCubic(phase('tracks'))
      trunkAnim.current.progress = tracks
      const carPhase = phase('cars')
      cars.forEach((car, i) => {
        // Cars appear one after another from the one under the board; all shrink together on retract.
        const distance = i / Math.max(1, PUBLICATIONS.length - 1)
        car.reveal = mode === 'reveal' ? clamp01(carPhase * 1.5 - distance * 0.5) : carPhase
      })
      // The gantry lowers in from above, then the board lights up beneath it.
      applyReveal(gantry.current, easeOutCubic(phase('gantry')), -40)
      applyReveal(board.current, easeOutCubic(phase('board')), -16)
    },
    root,
    'publications',
  )

  useFrame((_, delta) => {
    // Roll the train so the selected car stops at the platform.
    slide.current.offset = approach(slide.current.offset, -selected * PUB_CAR.spacing, delta, 5)
    if (train.current) train.current.position.x = slide.current.offset
    cars.forEach((car, i) => {
      car.lit = approach(car.lit, i === selected ? 1 : 0, delta, 6)
      if (car.group) {
        const s = car.reveal > 0 ? 0.6 + 0.4 * easeOutBack(car.reveal) : 0
        car.group.visible = car.reveal > 0.001
        car.group.scale.setScalar(Math.max(s, 0.0001))
      }
      if (car.windows) car.windows.opacity = 0.35 + 0.65 * car.lit
      if (car.spill) car.spill.opacity = 0.16 * car.lit * car.reveal
      if (car.tag) {
        car.tag.style.opacity = car.reveal.toFixed(3)
      }
    })
  })

  const publication = PUBLICATIONS[selected]
  const authors = publication.authors

  return (
    <group ref={root} visible={false}>
      <RibbonTrack
        points={[station, PUB_JUNCTION, PUB_SIDING_LEFT]}
        color={color}
        width={SUB_TRACK_WIDTH}
        radius={SIDING_RADIUS}
        startOverrun={STATION_OVERRUN}
        anim={trunkAnim}
      />

      {/* Archive train on the siding; local x runs along the siding towards screen-right */}
      <group position={[PUB_STOP[0], 0, PUB_STOP[1]]} rotation={[0, heading, 0]}>
        <group ref={train}>
          {PUBLICATIONS.map((pub, i) => (
            <ArchiveCar
              key={pub.id}
              index={i}
              state={cars[i]}
              selected={i === selected}
              interactive={interactive}
              onSelect={select}
            />
          ))}
        </group>
      </group>

      {/* Reading board hanging from an overhead gantry above the stopped car */}
      <WorldPanel
        position={[PUB_BOARD[0], 0, PUB_BOARD[1]]}
        width={PUB_BOARD_WIDTH * widthBoost}
        anchor="bottom"
        className="pub-board world-panel--bare"
      >
        <div ref={gantry} className="pub-board__gantry" aria-hidden="true">
          <span className="pub-board__pole pub-board__pole--left" />
          <span className="pub-board__pole pub-board__pole--right" />
          <span className="pub-board__beam" />
          <span className="pub-board__hanger pub-board__hanger--left" />
          <span className="pub-board__hanger pub-board__hanger--right" />
        </div>
        <div ref={board} className="pub-board__sign">
          <div className="pub-board__frame">
            {/* Re-keyed on selection so the entry fades in afresh */}
            <div key={publication.id} className="pub-board__entry">
              <p className="pub-board__meta">
                <span className="pub-board__journal">{publication.journal}</span>
                <span className="pub-board__dot" aria-hidden="true" />
                <span>{publication.date}</span>
              </p>
              <h3 className="pub-board__title">{publication.title}</h3>
              <p className="pub-board__authors">
                {authors.map((name, i) => (
                  <span key={name} className={name === OWN_NAME ? 'is-me' : undefined}>
                    {name}
                    {i < authors.length - 1 ? ', ' : ''}
                  </span>
                ))}
              </p>
            </div>
            <footer className="pub-board__foot">
              <div className="pub-board__steps">
                <button
                  type="button"
                  className="pub-board__step"
                  onClick={() => select(selected - 1)}
                  disabled={!interactive}
                  aria-label="Previous publication"
                >
                  <ChevronLeftIcon />
                </button>
                <button
                  type="button"
                  className="pub-board__step"
                  onClick={() => select(selected + 1)}
                  disabled={!interactive}
                  aria-label="Next publication"
                >
                  <ChevronRightIcon />
                </button>
              </div>
              <a
                className="read-more"
                href={publication.pubmed}
                target="_blank"
                rel="noreferrer"
                tabIndex={interactive ? 0 : -1}
              >
                <span>Read More</span>
                <ExternalLinkIcon />
              </a>
            </footer>
          </div>
        </div>
      </WorldPanel>
    </group>
  )
}
