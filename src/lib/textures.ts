import * as THREE from 'three'

let radialGlow: THREE.CanvasTexture | null = null

/** Soft white radial gradient used for light pools on the ground. */
export function getRadialGlowTexture() {
  if (radialGlow) return radialGlow
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.25, 'rgba(255,255,255,0.45)')
  g.addColorStop(0.6, 'rgba(255,255,255,0.10)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  radialGlow = new THREE.CanvasTexture(canvas)
  radialGlow.colorSpace = THREE.SRGBColorSpace
  return radialGlow
}
