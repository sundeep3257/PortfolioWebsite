import type { CSSProperties } from 'react'
import type { PageOverlay } from '../hooks/useAppNavigation'

interface ProjectPageTransitionProps {
  overlay: PageOverlay
}

/**
 * Full-viewport ride between the map and a project station — not a separate route,
 * but a layer that crossfades with the pages underneath.
 */
export function ProjectPageTransition({ overlay }: ProjectPageTransitionProps) {
  const toProject = overlay.mode === 'to-project'
  const title = toProject ? overlay.title : undefined

  return (
    <div
      className={`page-transition${toProject ? ' is-to-project' : ' is-to-map'}`}
      aria-hidden="true"
    >
      <div className="page-transition__frame">
        <div className="pt-tunnel">
          <div className="pt-tunnel__wall pt-tunnel__wall--l" />
          <div className="pt-tunnel__wall pt-tunnel__wall--r" />
          <div className="pt-tunnel__tracks">
            <span />
            <span />
          </div>
          <div className="pt-tunnel__streaks">
            {Array.from({ length: 12 }, (_, i) => (
              <span key={i} style={{ '--i': i } as CSSProperties} />
            ))}
          </div>
        </div>

        <div className="pt-platform">
          <div className="pt-hall__ledge">
            <span className="pt-hall__lamp" />
            <span className="pt-hall__lamp" />
            <span className="pt-hall__lamp" />
            <span className="pt-hall__lamp" />
            <span className="pt-hall__lamp" />
          </div>
          {title && (
            <div className="pt-sign">
              <span className="pt-sign__rod pt-sign__rod--l" />
              <span className="pt-sign__rod pt-sign__rod--r" />
              <div className="pt-sign__plate">
                <span className="pt-sign__name">{title}</span>
              </div>
            </div>
          )}
          <div className="pt-edge" />
          <div className="pt-floor">
            <div className="pt-floor__tiles" />
          </div>
        </div>

        <div className="pt-train">
          <span className="pt-car pt-car--blank" />
          <span className="pt-car pt-car--lit">
            <span className="pt-car__window" />
          </span>
          <span className="pt-car pt-car--lit">
            <span className="pt-car__window" />
          </span>
          <span className="pt-car pt-car--lit">
            <span className="pt-car__window" />
          </span>
          <span className="pt-car pt-car--blank" />
        </div>

        <p className="pt-caption">{toProject ? 'Arriving at station' : 'Returning to map'}</p>
      </div>
    </div>
  )
}
