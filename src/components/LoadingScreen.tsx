/**
 * Full-screen cover shown on first visit. A tiny subway line in the centre
 * loops while the 3D scene compiles behind it — no progress bar, no extra
 * WebGL work.
 */
export function LoadingScreen({ fading }: { fading: boolean }) {
  return (
    <div className={`loader${fading ? ' is-done' : ''}`} role="status" aria-busy={!fading}>
      <div className="loader__mark" aria-hidden="true">
        <span className="loader__rail" />
        <span className="loader__station loader__station--a" />
        <span className="loader__station loader__station--b" />
        <span className="loader__station loader__station--c" />
        <span className="loader__station loader__station--d" />
        <span className="loader__train" />
      </div>
      <p className="loader__label">Loading</p>
    </div>
  )
}
