import { useCallback, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'
import { STATION_IDS, STATIONS } from '../data/stations'
import { IntroRevealProvider } from '../hooks/useIntroReveal'
import { TrainNavigationContext, useTrainNavigation, type ExpandableStation } from '../hooks/useTrainNavigation'
import { CameraRig } from './CameraRig'
import { Ground } from './Ground'
import { SubwayMap } from './SubwayMap'
import { Station } from './Station'
import { Train } from './Train'
import { Buildings } from './Buildings'
import { KeyboardNavigation } from './KeyboardNavigation'
import { SkillsSubNetwork } from './SkillsSubNetwork'
import { AboutSubNetwork } from './AboutSubNetwork'
import { ExperiencesSubNetwork } from './ExperiencesSubNetwork'
import { ProjectsSubNetwork } from './ProjectsSubNetwork'
import { PublicationsSubNetwork } from './PublicationsSubNetwork'
import { SceneWarmup } from './SceneWarmup'

interface SceneProps {
  /** Fires when the station close-up framing changes, so overlays outside the canvas can react. */
  onExpandedStationChange?: (station: ExpandableStation | null) => void
  /** True while the loading overlay is compiling hidden station graphics. */
  warming: boolean
  /** Fires once shaders, geometries, and station HTML have been drawn once. */
  onReady?: () => void
  /** True once the loader is ready to fade; starts the homepage intro reveal. */
  introArmed: boolean
  /** Fires when buildings, tracks, and stations have finished revealing. */
  onIntroComplete?: () => void
  /** Blocks keyboard travel until the loading overlay has gone. */
  inputEnabled: boolean
  /** Freeze the renderer while a project page is covering the map. */
  paused?: boolean
}

function Lights() {
  return (
    <>
      <ambientLight color="#4a4c6a" intensity={0.7} />
      <hemisphereLight color="#4a5a8c" groundColor="#241c26" intensity={0.8} />
      {/* Key light from screen-left so the +Z faces of the buildings read lighter and warmer */}
      <directionalLight position={[-34, 22, 38]} color="#d8c6c0" intensity={2.4} />
      {/* Cool fill from screen-right so the +X faces stay readable */}
      <directionalLight position={[40, 14, 12]} color="#4c5a8a" intensity={1.1} />
      {/* Faint rim from the far side */}
      <directionalLight position={[30, 18, -40]} color="#5a6fa8" intensity={0.5} />
    </>
  )
}

function SceneContents({
  onExpandedStationChange,
  warming,
  onReady,
  introArmed,
  onIntroComplete,
  inputEnabled,
}: SceneProps) {
  const navigation = useTrainNavigation()
  const handleReady = useCallback(() => onReady?.(), [onReady])

  useEffect(() => {
    onExpandedStationChange?.(navigation.closeupStation)
  }, [navigation.closeupStation, onExpandedStationChange])

  return (
    <TrainNavigationContext.Provider value={navigation}>
      <IntroRevealProvider warming={warming} armed={introArmed} onComplete={onIntroComplete}>
        <CameraRig />
        <Lights />
        <Ground />
        <Buildings />
        <SubwayMap />
        {STATION_IDS.map((id) => (
          <Station
            key={id}
            station={STATIONS[id]}
            onSelect={navigation.travelTo}
            disabled={navigation.isMoving || !inputEnabled}
          />
        ))}
        <SkillsSubNetwork />
        <AboutSubNetwork />
        <ExperiencesSubNetwork />
        <ProjectsSubNetwork />
        <PublicationsSubNetwork />
        <Train />
        {inputEnabled && <KeyboardNavigation />}
        {warming && <SceneWarmup onReady={handleReady} />}
        <EffectComposer multisampling={0}>
          <Bloom luminanceThreshold={0.6} luminanceSmoothing={0.3} intensity={0.6} mipmapBlur radius={0.42} />
        </EffectComposer>
      </IntroRevealProvider>
    </TrainNavigationContext.Provider>
  )
}

export function Scene({
  onExpandedStationChange,
  warming,
  onReady,
  introArmed,
  onIntroComplete,
  inputEnabled,
  paused = false,
}: SceneProps) {
  return (
    <Canvas
      className="scene-canvas"
      frameloop={paused ? 'never' : 'always'}
      dpr={[1, 1.5]}
      gl={{ antialias: true, toneMapping: THREE.NoToneMapping, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => gl.setClearColor('#0d0a15')}
    >
      <SceneContents
        onExpandedStationChange={onExpandedStationChange}
        warming={warming}
        onReady={onReady}
        introArmed={introArmed}
        onIntroComplete={onIntroComplete}
        inputEnabled={inputEnabled}
      />
    </Canvas>
  )
}
