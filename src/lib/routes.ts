/**
 * Tiny path router for the map and project pages. Project detail lives at
 * `/projects/:slug`; everything else is the subway map. Uses the History API
 * so Learn More and the project-to-project controls stay in the SPA.
 */

export type AppRoute = { kind: 'map' } | { kind: 'project'; slug: string }

function basePrefix() {
  const base = import.meta.env.BASE_URL
  return base.endsWith('/') ? base.slice(0, -1) : base
}

/** Pathname with the Vite base stripped, always starting with `/`. */
export function stripBase(pathname: string) {
  const prefix = basePrefix()
  const raw = prefix && pathname.startsWith(prefix) ? pathname.slice(prefix.length) : pathname
  const path = raw.replace(/\/+$/, '') || '/'
  return path.startsWith('/') ? path : `/${path}`
}

export function mapPath() {
  const prefix = basePrefix()
  return prefix ? `${prefix}/` : '/'
}

export function projectPath(slug: string) {
  const prefix = basePrefix()
  return `${prefix}/projects/${slug}`
}

export function parseRoute(pathname: string): AppRoute {
  const path = stripBase(pathname)
  const match = path.match(/^\/projects\/([^/]+)$/)
  if (match) return { kind: 'project', slug: match[1] }
  return { kind: 'map' }
}

export function navigate(to: string, opts?: { replace?: boolean }) {
  const current = `${window.location.pathname}${window.location.search}`
  if (current === to) return
  if (opts?.replace) window.history.replaceState(null, '', to)
  else window.history.pushState(null, '', to)
  window.dispatchEvent(new PopStateEvent('popstate'))
}
