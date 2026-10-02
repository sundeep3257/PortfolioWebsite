import { useCallback, useEffect, useState } from 'react'

import { Scene } from './components/Scene'

import { BrandingOverlay } from './components/BrandingOverlay'

import { ControlsOverlay } from './components/ControlsOverlay'

import { LoadingScreen } from './components/LoadingScreen'

import { RotateDevice } from './components/RotateDevice'

import { ProjectPage } from './components/ProjectPage'

import { ProjectPageTransition } from './components/ProjectPageTransition'

import { SeoContent } from './components/SeoContent'

import type { ExpandableStation } from './hooks/useTrainNavigation'

import { AppNavigationProvider, useAppNavigation } from './hooks/useAppNavigation'

import { useDocumentMeta } from './hooks/useDocumentMeta'

import { getProjectPageBySlug } from './data/projectPages'

import { mapPath, navigate, parseRoute } from './lib/routes'



const MIN_LOADER_MS = 1600

const LOADER_FADE_MS = 480



function AppShell() {

  const [path, setPath] = useState(() => window.location.pathname)

  const [expandedStation, setExpandedStation] = useState<ExpandableStation | null>(null)

  const [sceneReady, setSceneReady] = useState(false)

  const [minTimeElapsed, setMinTimeElapsed] = useState(false)

  const [fading, setFading] = useState(false)

  const [introDone, setIntroDone] = useState(false)



  const { overlay, projectRouteLive, skipProjectTrainArrival } = useAppNavigation()



  const route = parseRoute(path)

  const projectPage = route.kind === 'project' ? getProjectPageBySlug(route.slug) : undefined

  const onProjectPage = route.kind === 'project'



  const [mapMounted, setMapMounted] = useState(() => !onProjectPage)

  const [showLoader, setShowLoader] = useState(() => !onProjectPage)



  const warmed = sceneReady && minTimeElapsed

  const warming = !sceneReady

  const introducing = warmed && !introDone



  const transitioning = overlay !== null

  const mapCovered = onProjectPage && overlay?.mode !== 'to-map'

  const showProjectPage =

    Boolean(projectPage) && onProjectPage && (!overlay || (overlay.mode === 'to-project' && projectRouteLive))

  const projectUnderOverlay = Boolean(showProjectPage && overlay?.mode === 'to-project' && projectRouteLive)

  const projectRevealed = showProjectPage && !overlay



  useEffect(() => {

    const sync = () => setPath(window.location.pathname)

    window.addEventListener('popstate', sync)

    return () => window.removeEventListener('popstate', sync)

  }, [])



  useEffect(() => {

    if (route.kind === 'project' && !projectPage) navigate(mapPath(), { replace: true })

  }, [route, projectPage])



  useDocumentMeta(projectPage)



  useEffect(() => {

    if (onProjectPage) return

    if (!mapMounted) {

      setShowLoader(true)

      setFading(false)

      setSceneReady(false)

      setMinTimeElapsed(false)

      setIntroDone(false)

      setMapMounted(true)

    }

  }, [onProjectPage, mapMounted])



  useEffect(() => {

    if (!mapMounted) return

    const timer = window.setTimeout(() => setMinTimeElapsed(true), MIN_LOADER_MS)

    const fallback = window.setTimeout(() => setSceneReady(true), 12000)

    return () => {

      window.clearTimeout(timer)

      window.clearTimeout(fallback)

    }

  }, [mapMounted])



  useEffect(() => {

    if (!warmed || !showLoader) return

    setFading(true)

    const timer = window.setTimeout(() => setShowLoader(false), LOADER_FADE_MS)

    return () => window.clearTimeout(timer)

  }, [warmed, showLoader])



  useEffect(() => {

    if (expandedStation) document.documentElement.dataset.expanded = expandedStation

    else delete document.documentElement.dataset.expanded

  }, [expandedStation])



  const onSceneReady = useCallback(() => setSceneReady(true), [])

  const onIntroComplete = useCallback(() => setIntroDone(true), [])



  const frameClass = ['design-frame', expandedStation && 'is-expanded', expandedStation && `is-${expandedStation}-expanded`]

    .filter(Boolean)

    .join(' ')



  const mapInputEnabled = !showLoader && !onProjectPage && !transitioning && introDone



  return (

    <>

      <SeoContent />

      <RotateDevice />

      {mapMounted && (

        <div

          className={['app', showLoader && 'is-loading', fading && 'is-fading', introducing && 'is-introducing', mapCovered && 'is-covered']

            .filter(Boolean)

            .join(' ')}

        >

          <Scene

            onExpandedStationChange={setExpandedStation}

            warming={warming}

            onReady={onSceneReady}

            introArmed={warmed}

            onIntroComplete={onIntroComplete}

            inputEnabled={mapInputEnabled}

            paused={onProjectPage || overlay?.mode === 'to-project'}

          />

          {!onProjectPage && !transitioning && (

            <div className={frameClass}>

              <BrandingOverlay />

              <ControlsOverlay />

            </div>

          )}

          {showLoader && !onProjectPage && !transitioning && <LoadingScreen fading={fading} />}

        </div>

      )}

      {showProjectPage && projectPage && (

        <ProjectPage

          page={projectPage}

          skipTrainArrival={skipProjectTrainArrival}

          className={[projectUnderOverlay && 'is-under-overlay', projectRevealed && 'is-revealed'].filter(Boolean).join(' ') || undefined}

        />

      )}

      {overlay && <ProjectPageTransition overlay={overlay} />}

    </>

  )

}



export default function App() {

  return (

    <AppNavigationProvider>

      <AppShell />

    </AppNavigationProvider>

  )

}

