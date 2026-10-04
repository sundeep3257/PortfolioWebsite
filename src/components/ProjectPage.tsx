import { useEffect, useRef, useState } from 'react'
import { adjacentProjectPages, getProjectPageBySlug, type ProjectPageContent } from '../data/projectPages'
import { useAppNavigation } from '../hooks/useAppNavigation'
import { mapPath, projectPath } from '../lib/routes'
import { ArrowRightIcon, ExternalLinkIcon } from './Icons'

/** Train slides off-platform. */
const SHIFT_OUT_MS = 560
/** New train slides into place after the content swap. */
const SHIFT_IN_MS = 620

type ShiftPhase = 'idle' | 'out' | 'in'
type ShiftDirection = 'prev' | 'next'

interface ProjectPageProps {
  page: ProjectPageContent
  skipTrainArrival?: boolean
  className?: string
}

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function ProjectNavButton({
  direction,
  target,
  disabled,
  onGoToProject,
}: {
  direction: 'prev' | 'next'
  target?: ProjectPageContent
  disabled?: boolean
  onGoToProject: (slug: string, direction: ShiftDirection) => void
}) {
  const isPrev = direction === 'prev'
  const label = isPrev ? 'Previous Project' : 'Next Project'
  const atEnd = !target
  const inactive = atEnd || Boolean(disabled)
  const className = `ps-nav ps-nav--${direction}${atEnd ? ' is-end' : ''}`
  const content = (
    <>
      {isPrev && <ArrowRightIcon className="ps-nav__arrow ps-nav__arrow--back" />}
      <span>{label}</span>
      {!isPrev && <ArrowRightIcon className="ps-nav__arrow" />}
    </>
  )

  if (!target) {
    return (
      <span className={className} aria-label={`${label} (unavailable)`} aria-disabled="true">
        {content}
      </span>
    )
  }

  return (
    <a
      href={projectPath(target.slug)}
      className={className}
      aria-disabled={inactive || undefined}
      tabIndex={inactive ? -1 : undefined}
      aria-label={`${label}: ${target.title}`}
      title={target.title}
      onClick={(event) => {
        event.preventDefault()
        if (!disabled) onGoToProject(target.slug, direction)
      }}
    >
      {content}
    </a>
  )
}

/**
 * Hanging station sign: grows with the title up to the space left after the
 * prev/next controls and their equal gaps, then shrinks type until it fits.
 *
 * `--s` is a CSS `min(calc(...))` expression, so getPropertyValue cannot be
 * parseFloat'd — derive the used scale from the 960-wide design frame instead.
 */
function StationSign({ title }: { title: string }) {
  const signRef = useRef<HTMLDivElement>(null)
  const nameRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    const sign = signRef.current
    const name = nameRef.current
    const top = sign?.parentElement
    if (!sign || !name || !top) return

    const preferredTracking = 0.22
    const minTracking = 0.04
    const prev = top.querySelector('.ps-nav--prev') as HTMLElement | null
    const next = top.querySelector('.ps-nav--next') as HTMLElement | null
    const frame = top.closest('.ps-frame') as HTMLElement | null

    const fit = () => {
      const s = frame && frame.clientWidth > 0 ? frame.clientWidth / 960 : Math.max(0.35, top.clientWidth / 916)
      const minWidth = 244 * s
      const padX = 28 * s
      const preferredFont = 21 * s
      const minFont = Math.max(5.5, 6.5 * s)
      const gap = 16 * s
      const prevRight = prev ? prev.offsetLeft + prev.offsetWidth : 0
      const nextLeft = next ? next.offsetLeft : top.clientWidth
      const maxWidth = Math.max(0, nextLeft - prevRight - gap * 2)

      name.style.letterSpacing = `${preferredTracking}em`
      name.style.paddingLeft = `${preferredTracking}em`
      name.style.fontSize = `${preferredFont}px`
      sign.style.maxWidth = `${maxWidth}px`
      sign.style.width = 'max-content'

      const contentWidth = name.scrollWidth + padX * 2
      const width = Math.min(Math.max(contentWidth, Math.min(minWidth, maxWidth)), maxWidth)
      sign.style.width = `${Math.max(0, width)}px`

      const plate = name.parentElement
      const available = plate ? Math.max(0, plate.clientWidth - padX * 2) : Math.max(0, width - padX * 2)

      let lo = minFont
      let hi = preferredFont
      let best = minFont
      for (let i = 0; i < 24; i += 1) {
        const mid = (lo + hi) / 2
        name.style.fontSize = `${mid}px`
        if (name.scrollWidth <= available + 0.5) {
          best = mid
          lo = mid
        } else {
          hi = mid
        }
      }
      name.style.fontSize = `${best}px`

      let tracking = preferredTracking
      while (name.scrollWidth > available + 0.5 && tracking > minTracking + 0.001) {
        tracking = Math.max(minTracking, tracking - 0.02)
        name.style.letterSpacing = `${tracking}em`
        name.style.paddingLeft = `${tracking}em`
      }
    }

    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(top)
    if (prev) observer.observe(prev)
    if (next) observer.observe(next)
    if (frame) observer.observe(frame)

    let cancelled = false
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      void document.fonts.ready.then(() => {
        if (!cancelled) fit()
      })
    }

    return () => {
      cancelled = true
      observer.disconnect()
      sign.style.width = ''
      sign.style.maxWidth = ''
      name.style.fontSize = ''
      name.style.letterSpacing = ''
      name.style.paddingLeft = ''
    }
  }, [title])

  return (
    <div className="ps-sign" ref={signRef}>
      <span className="ps-sign__rod ps-sign__rod--l" aria-hidden="true" />
      <span className="ps-sign__rod ps-sign__rod--r" aria-hidden="true" />
      <div className="ps-sign__plate">
        <h1 className="ps-sign__name" ref={nameRef}>
          {title}
        </h1>
      </div>
    </div>
  )
}

/** One passenger car. Blank cars bracket the three that carry copy, so the train runs off both edges. */
function Car({ index, text }: { index?: number; text?: string }) {
  const blank = text === undefined
  return (
    <article className={`ps-car${blank ? ' ps-car--blank' : ` ps-car--${index}`}`} aria-hidden={blank || undefined}>
      <div className="ps-car__shell">
        <span className="ps-car__vent" />
        <span className="ps-car__roofline" />
        {!blank && (
          <>
            <div className="ps-car__door">
              <span className="ps-car__door-panel">
                <span className="ps-car__door-glass" />
              </span>
            </div>
            <div className="ps-car__window">
              <p>{text}</p>
            </div>
            <span className="ps-car__stripe" />
          </>
        )}
        {blank && <span className="ps-car__blank-window" />}
        <span className="ps-car__skirt" />
      </div>
      <span className="ps-car__bogie ps-car__bogie--l" />
      <span className="ps-car__bogie ps-car__bogie--r" />
    </article>
  )
}

function Still({
  src,
  label,
  index,
  className,
}: {
  src: string | null
  label: string
  index: number
  className?: string
}) {
  const classes = ['ps-display__still', className].filter(Boolean).join(' ')
  if (src) return <img className={classes} src={src} alt={label} />
  return (
    <div
      className={`${classes} ps-display__slot ps-display__slot--${index + 1}`}
      role="img"
      aria-label={`${label} placeholder`}
    />
  )
}

/**
 * Standing on the platform as the project's train pulls in: a hanging
 * station sign, three lit cars carrying the copy, a tactile platform edge,
 * a bench, and a stills display on the concourse.
 *
 * Previous / Next keep this shell mounted and roll the train along the
 * platform so neighbouring projects feel like the next stretch of the same station.
 */
export function ProjectPage({ page, skipTrainArrival, className }: ProjectPageProps) {
  const { goToMap, goToProject } = useAppNavigation()
  const [displayPage, setDisplayPage] = useState(page)
  const [phase, setPhase] = useState<ShiftPhase>('idle')
  const [direction, setDirection] = useState<ShiftDirection>('next')
  const [preview, setPreview] = useState<number | null>(null)
  // Opt-in Learn More pull-in only — never the default, so Previous/Next cannot restart it.
  const [arrive, setArrive] = useState(!skipTrainArrival)
  const timers = useRef<number[]>([])
  const trainRef = useRef<HTMLElement>(null)

  const { prev, next } = adjacentProjectPages(displayPage.id)
  const visitHref = displayPage.visitUrl
  const open = preview !== null
  const shifting = phase !== 'idle'

  const clearTimers = () => {
    timers.current.forEach((id) => window.clearTimeout(id))
    timers.current = []
  }

  useEffect(() => () => clearTimers(), [])

  useEffect(() => {
    if (skipTrainArrival) setArrive(false)
  }, [skipTrainArrival])

  // Drop the arrive class after the pull-in finishes so it cannot retrigger later.
  useEffect(() => {
    if (!arrive) return
    const train = trainRef.current
    const finish = () => setArrive(false)
    const fallback = window.setTimeout(finish, 3100)
    train?.addEventListener('animationend', finish)
    return () => {
      window.clearTimeout(fallback)
      train?.removeEventListener('animationend', finish)
    }
  }, [arrive])

  // External navigations (Learn More, Back→project) update the shown page when idle.
  useEffect(() => {
    if (phase !== 'idle') return
    setDisplayPage(page)
  }, [page, phase])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') goToMap()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goToMap])

  const shiftToProject = (slug: string, dir: ShiftDirection) => {
    const target = getProjectPageBySlug(slug)
    if (!target || phase !== 'idle') return

    setArrive(false)

    if (prefersReducedMotion()) {
      setDisplayPage(target)
      goToProject(slug)
      setPreview(null)
      return
    }

    setPreview(null)
    setDirection(dir)
    setPhase('out')
    clearTimers()

    timers.current.push(
      window.setTimeout(() => {
        setDisplayPage(target)
        goToProject(slug)
        setPhase('in')
        timers.current.push(
          window.setTimeout(() => {
            setPhase('idle')
          }, SHIFT_IN_MS),
        )
      }, SHIFT_OUT_MS),
    )
  }

  const trainClass = [
    'ps-train',
    arrive && 'ps-train--arrive',
    phase === 'out' && `is-shift-out is-shift-${direction}`,
    phase === 'in' && `is-shift-in is-shift-${direction}`,
  ]
    .filter(Boolean)
    .join(' ')

  const rootClass = [
    'project-station',
    phase === 'out' && 'is-shift-out',
    phase === 'in' && 'is-shift-in',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <main className={rootClass} aria-label={`${displayPage.title} project`} aria-busy={shifting || undefined}>
      <div className="ps-frame">
        {/* Hall: back wall with trusses, ceiling ledge and its row of lights */}
        <div className="ps-hall" aria-hidden="true">
          <div className="ps-hall__wall" />
          <div className="ps-hall__ledge">
            <span className="ps-hall__lamp" />
            <span className="ps-hall__lamp" />
            <span className="ps-hall__lamp" />
            <span className="ps-hall__lamp" />
            <span className="ps-hall__lamp" />
          </div>
        </div>

        {/* Concourse: dark pit under the train, tactile edge, tiled floor */}
        <div className="ps-pit" aria-hidden="true" />
        <div className="ps-floor" aria-hidden="true">
          <div className="ps-floor__tiles" />
        </div>
        <div className="ps-edge" aria-hidden="true" />

        <header className="ps-top">
          <ProjectNavButton direction="prev" target={prev} disabled={shifting} onGoToProject={shiftToProject} />
          <StationSign title={displayPage.title} />
          <ProjectNavButton direction="next" target={next} disabled={shifting} onGoToProject={shiftToProject} />
        </header>

        <a
          href={mapPath()}
          className="ps-back"
          aria-disabled={shifting || undefined}
          tabIndex={shifting ? -1 : undefined}
          onClick={(event) => {
            event.preventDefault()
            if (!shifting) goToMap()
          }}
        >
          Back to map
        </a>

        <section ref={trainRef} className={trainClass} aria-label="Project details">
          <div className="ps-train__cars">
            <Car />
            {displayPage.paragraphs.map((text, index) => (
              <Car key={`${displayPage.id}-${index}`} index={index + 1} text={text} />
            ))}
            <Car />
          </div>
        </section>

        <div className="ps-kiosk">
          {visitHref && (
            <a className="ps-visit" href={visitHref} target="_blank" rel="noopener noreferrer">
              <span>{displayPage.visitLabel ?? `Visit ${displayPage.title}`}</span>
              <ExternalLinkIcon />
            </a>
          )}
          <div className="ps-bench" aria-hidden="true">
            <span className="ps-bench__top" />
            <span className="ps-bench__side" />
            <span className="ps-bench__front" />
            <span className="ps-bench__light" />
          </div>
        </div>

        <aside
          className={`ps-display${open ? ' is-open' : ''}`}
          aria-label="Project stills"
          onMouseLeave={() => setPreview(null)}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
              setPreview(null)
            }
          }}
        >
          <div className="ps-display__frame" />
          <div className="ps-display__screen">
            <div className="ps-display__hero" aria-hidden={!open}>
              {preview !== null && (
                <Still
                  src={displayPage.images[preview]}
                  index={preview}
                  label={`${displayPage.title} — ${displayPage.subtitle} (image ${preview + 1})`}
                  className="ps-display__hero-still"
                />
              )}
            </div>
            <div className="ps-display__images">
              {displayPage.images.map((src, index) => (
                <button
                  key={`${displayPage.id}-img-${index}`}
                  type="button"
                  className={`ps-display__thumb${preview === index ? ' is-active' : ''}`}
                  aria-label={`Enlarge ${displayPage.title} image ${index + 1}: ${displayPage.subtitle}`}
                  onMouseEnter={() => setPreview(index)}
                  onFocus={() => setPreview(index)}
                  disabled={shifting}
                >
                  <Still
                    src={src}
                    index={index}
                    label={`${displayPage.title} — ${displayPage.subtitle} (image ${index + 1})`}
                  />
                </button>
              ))}
            </div>
            <div className="ps-display__dots" aria-hidden="true">
              {displayPage.images.map((_, index) => (
                <span
                  key={`${displayPage.id}-dot-${index}`}
                  className={preview === index || (preview === null && index === 0) ? 'is-current' : undefined}
                />
              ))}
            </div>
          </div>
        </aside>
      </div>
    </main>
  )
}
