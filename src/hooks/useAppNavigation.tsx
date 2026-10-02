import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { getProjectPageBySlug } from '../data/projectPages'
import { mapPath, navigate, projectPath } from '../lib/routes'

export type PageOverlay =
  | { mode: 'to-project'; slug: string; title: string }
  | { mode: 'to-map' }

interface AppNavigation {
  goToProject: (slug: string) => void
  goToMap: () => void
  overlay: PageOverlay | null
  /** True once the forward transition has pushed the project route (page mounts under the overlay). */
  projectRouteLive: boolean
  completeTransition: () => void
  skipProjectTrainArrival: boolean
}

const AppNavigationContext = createContext<AppNavigation | null>(null)

export function useAppNavigation() {
  const ctx = useContext(AppNavigationContext)
  if (!ctx) throw new Error('useAppNavigation must be used within AppNavigationProvider')
  return ctx
}

export function AppNavigationProvider({ children }: { children: ReactNode }) {
  const [overlay, setOverlay] = useState<PageOverlay | null>(null)
  const [projectRouteLive, setProjectRouteLive] = useState(false)
  const [skipProjectTrainArrival, setSkipProjectTrainArrival] = useState(false)
  const busy = useRef(false)
  const timers = useRef<number[]>([])

  const clearTimers = useCallback(() => {
    timers.current.forEach((id) => window.clearTimeout(id))
    timers.current = []
  }, [])

  const completeTransition = useCallback(() => {
    busy.current = false
    setOverlay(null)
    setProjectRouteLive(false)
    setSkipProjectTrainArrival(false)
    clearTimers()
  }, [clearTimers])

  const goToProject = useCallback((slug: string) => {
    if (busy.current) return
    const page = getProjectPageBySlug(slug)
    if (!page) return
    navigate(projectPath(slug))
  }, [])

  const goToMap = useCallback(() => {
    if (busy.current) return
    navigate(mapPath())
  }, [])

  const value = useMemo(
    () => ({
      goToProject,
      goToMap,
      overlay,
      projectRouteLive,
      completeTransition,
      skipProjectTrainArrival,
    }),
    [goToProject, goToMap, overlay, projectRouteLive, completeTransition, skipProjectTrainArrival],
  )

  useEffect(() => () => clearTimers(), [clearTimers])

  return <AppNavigationContext.Provider value={value}>{children}</AppNavigationContext.Provider>
}
