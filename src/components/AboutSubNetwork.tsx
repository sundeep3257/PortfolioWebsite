import { useRef, type CSSProperties } from 'react'
import * as THREE from 'three'
import { CAMERA_PITCH, CAMERA_YAW } from '../data/camera'
import { STATIONS } from '../data/stations'
import {
  ABOUT_BOARD_WIDTH,
  ABOUT_HEADING,
  ABOUT_LINKS,
  ABOUT_NODE,
  ABOUT_PARAGRAPHS,
  ABOUT_PLATFORM,
  ABOUT_PLATFORM_SIZE,
  ABOUT_STRUCTURE,
  ABOUT_TIMELINE,
  ABOUT_TRACK_END,
} from '../data/about'
import { SUB_STATION_SCALE, SUB_TRACK_WIDTH } from '../data/skills'
import { useTrainNavigationContext } from '../hooks/useTrainNavigation'
import { applyReveal, clamp01, easeOutBack, easeOutCubic, useRevealTimeline } from '../lib/reveal'
import { StationMarker, type MarkerAnimation } from './StationMarker'
import { STATION_OVERRUN } from './SubwayMap'
import { Track } from './Track'
import { Platform, type PlatformAnimation } from './Platform'
import { SignSlab, SLAB_COLOR, type SlabAnimation } from './SignSlab'
import { PANEL_PX_PER_UNIT, WorldPanel } from './WorldPanel'
import { DownloadIcon, LinkedInIcon, PubMedIcon, ResearchGateIcon } from './Icons'

const POST_COLOR = '#7079a2'

/** Structure dimensions in world units. */
const SIGN_WIDTH = ABOUT_BOARD_WIDTH / PANEL_PX_PER_UNIT
const BASE_WIDTH = SIGN_WIDTH + 2 * ABOUT_STRUCTURE.base.margin
const BASE_HEIGHT = ABOUT_STRUCTURE.consolePx / PANEL_PX_PER_UNIT
const POST_GAP = ABOUT_STRUCTURE.posts.gapPx / PANEL_PX_PER_UNIT
/** Posts run from the base top into the sign body. */
const POST_LENGTH = POST_GAP + 0.45
const SIGN_BOTTOM = BASE_HEIGHT + POST_GAP

/**
 * The About close-up. A short branch leaves the station for a sub-station,
 * and behind it one large illuminated billboard stands on a platform slab,
 * carrying the biography with the CV and social links built into its base.
 * Hidden on the landing map; unfolds once the train has come to rest.
 */
export function AboutSubNetwork() {
  const { aboutExpanded } = useTrainNavigationContext()
  const root = useRef<THREE.Group>(null)
  const branch = useRef<THREE.Group>(null)
  const stub = useRef<THREE.Group>(null)
  const marker = useRef<MarkerAnimation>({ opacity: 0, scale: 0 })
  const platform = useRef<PlatformAnimation>({ rise: 0 })
  const slab = useRef<SlabAnimation>({ k: 0 })
  const board = useRef<HTMLDivElement>(null)
  const consolePanel = useRef<HTMLDivElement>(null)
  const color = STATIONS.about.color

  useRevealTimeline(
    aboutExpanded,
    ABOUT_TIMELINE,
    (phase) => {
      const tracks = easeOutCubic(phase('tracks'))
      // The branch grows first, then the stub continues behind the billboard.
      const growBranch = clamp01(tracks * 1.3)
      const growStub = clamp01(tracks * 1.3 - 0.3)
      if (branch.current) {
        branch.current.visible = growBranch > 0
        branch.current.scale.x = Math.max(growBranch, 0.0001)
      }
      if (stub.current) {
        stub.current.visible = growStub > 0
        stub.current.scale.x = Math.max(growStub, 0.0001)
      }
      const stations = phase('stations')
      marker.current.opacity = stations
      marker.current.scale = stations > 0 ? 0.6 + 0.4 * easeOutBack(stations) : 0
      const rise = easeOutCubic(phase('platform'))
      platform.current.rise = rise
      applyReveal(consolePanel.current, rise, 0)
      // The sign rises out of the posts, then its face lights up.
      const boardPhase = phase('board')
      slab.current.k = easeOutCubic(clamp01(boardPhase * 1.3))
      applyReveal(board.current, easeOutCubic(clamp01(boardPhase * 1.6 - 0.6)), 6)
    },
    root,
    'about',
  )

  return (
    <group ref={root} visible={false}>
      <Track
        ref={branch}
        from={STATIONS.about.position}
        to={ABOUT_NODE}
        colorFrom={color}
        width={SUB_TRACK_WIDTH}
        startOverrun={STATION_OVERRUN}
        endOverrun={STATION_OVERRUN * SUB_STATION_SCALE}
      />
      <Track
        ref={stub}
        from={ABOUT_NODE}
        to={ABOUT_TRACK_END}
        colorFrom={color}
        width={SUB_TRACK_WIDTH}
        startOverrun={STATION_OVERRUN * SUB_STATION_SCALE}
      />
      <group position={[ABOUT_NODE[0], 0, ABOUT_NODE[1]]}>
        <StationMarker color={color} sizeScale={SUB_STATION_SCALE} anim={marker} />
      </group>

      <Platform
        position={ABOUT_PLATFORM}
        width={ABOUT_PLATFORM_SIZE.width}
        depth={ABOUT_PLATFORM_SIZE.depth}
        height={ABOUT_PLATFORM_SIZE.height}
        color={color}
        anim={platform}
      >
        {/* Base block and the two posts, aligned with the screen like the plinth */}
        <group rotation={[0, CAMERA_YAW, 0]}>
          <mesh position={[0, BASE_HEIGHT / 2, -ABOUT_STRUCTURE.base.depth / 2]}>
            <boxGeometry args={[BASE_WIDTH, BASE_HEIGHT, ABOUT_STRUCTURE.base.depth]} />
            <meshStandardMaterial color={SLAB_COLOR} roughness={0.65} metalness={0.2} />
          </mesh>
          {/* Lit lip along the base's top front edge */}
          <mesh position={[0, BASE_HEIGHT - 0.04, -0.04]}>
            <boxGeometry args={[BASE_WIDTH, 0.08, 0.08]} />
            <meshBasicMaterial color={color} toneMapped={false} />
          </mesh>
          {[-1, 1].map((side) => (
            <mesh
              key={side}
              position={[
                side * (SIGN_WIDTH / 2 - ABOUT_STRUCTURE.posts.inset),
                BASE_HEIGHT + POST_LENGTH / 2,
                -ABOUT_STRUCTURE.posts.setback,
              ]}
            >
              <cylinderGeometry args={[ABOUT_STRUCTURE.posts.radius, ABOUT_STRUCTURE.posts.radius, POST_LENGTH, 24]} />
              <meshStandardMaterial color={POST_COLOR} roughness={0.45} metalness={0.3} />
              {/* Collar where the post meets the base */}
              <mesh position={[0, -POST_LENGTH / 2 + 0.08, 0]}>
                <cylinderGeometry args={[ABOUT_STRUCTURE.posts.radius + 0.12, ABOUT_STRUCTURE.posts.radius + 0.12, 0.16, 24]} />
                <meshStandardMaterial color="#2a2a3e" roughness={0.7} />
              </mesh>
            </mesh>
          ))}
        </group>

        {/* Link console on the base's front face */}
        <WorldPanel
          width={ABOUT_BOARD_WIDTH}
          lean={CAMERA_PITCH}
          contentRef={consolePanel}
          className="about-base"
          style={{ '--console-h': `${ABOUT_STRUCTURE.consolePx}px` } as CSSProperties}
        >
          <nav className="about-base__console" aria-label="Contact and CV">
            <a className="about-base__cv" href={ABOUT_LINKS.cv.href} download>
              <DownloadIcon className="about-base__cv-icon" />
              <span>{ABOUT_LINKS.cv.label}</span>
            </a>
            <span className="about-base__divider" />
            {(
              [
                [ABOUT_LINKS.linkedin, LinkedInIcon],
                [ABOUT_LINKS.pubmed, PubMedIcon],
                [ABOUT_LINKS.researchgate, ResearchGateIcon],
              ] as const
            ).map(([link, Icon]) => (
              <a
                key={link.label}
                className="about-base__social"
                href={link.href}
                target="_blank"
                rel="noreferrer"
                aria-label={link.label}
                title={link.label}
              >
                <Icon />
              </a>
            ))}
          </nav>
        </WorldPanel>

        {/* The sign itself: a thick slab on the posts with the biography on its face */}
        <SignSlab
          position={[0, SIGN_BOTTOM, 0]}
          width={ABOUT_BOARD_WIDTH}
          depth={ABOUT_STRUCTURE.sign.depth}
          color={color}
          anim={slab}
          contentRef={board}
          className="about-board"
        >
          <div className="about-board__face">
            <h2 className="about-board__heading">{ABOUT_HEADING}</h2>
            {ABOUT_PARAGRAPHS.map((text) => (
              <p key={text.slice(0, 24)} className="about-board__text">
                {text}
              </p>
            ))}
          </div>
        </SignSlab>
      </Platform>
    </group>
  )
}
