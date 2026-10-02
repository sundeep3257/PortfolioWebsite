/**
 * Full-screen prompt shown in portrait on narrow screens. The 3D map is
 * authored for a landscape frame, so this asks the visitor to rotate.
 */
export function RotateDevice() {
  return (
    <div className="rotate-device" role="dialog" aria-modal="true" aria-labelledby="rotate-device-title">
      <div className="rotate-device__mark" aria-hidden="true">
        <div className="rotate-device__phone">
          <span className="rotate-device__bezel" />
          <span className="rotate-device__screen">
            <span className="rotate-device__rail" />
            <span className="rotate-device__station rotate-device__station--a" />
            <span className="rotate-device__station rotate-device__station--b" />
            <span className="rotate-device__station rotate-device__station--c" />
          </span>
        </div>
      </div>
      <h2 id="rotate-device-title" className="rotate-device__title">
        Rotate your device
      </h2>
      <p className="rotate-device__copy">This portfolio is best experienced in landscape.</p>
      <div className="rotate-device__rule" aria-hidden="true" />
    </div>
  )
}
