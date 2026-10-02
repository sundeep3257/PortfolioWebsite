import * as THREE from 'three'

/**
 * Scale every PointLight under `root` by `factor` without toggling `visible`.
 *
 * Three.js keys shader programs by the number of active lights. Setting
 * `light.visible = false` (or hiding an ancestor) drops lights from that count
 * and forces a synchronous recompile of every MeshStandardMaterial — the main
 * source of hitching during the homepage intro and station unfolds. Intensity
 * 0 keeps the light in the program with no visible contribution.
 */
export function setPointLightFactor(root: THREE.Object3D, factor: number) {
  const k = THREE.MathUtils.clamp(factor, 0, 1)
  root.traverse((obj) => {
    const light = obj as THREE.PointLight
    if (!light.isPointLight) return
    if (light.userData.baseIntensity == null) {
      // Prefer the authored intensity if we somehow run after a prior dim.
      light.userData.baseIntensity = light.intensity > 0 ? light.intensity : 1
    }
    light.intensity = (light.userData.baseIntensity as number) * k
  })
}

/**
 * Hide drawable content (meshes, lines, sprites) while keeping lights mounted
 * and visible so the active light count — and therefore compiled shaders —
 * stays stable. Used when buildings fully retract for a station close-up.
 */
export function setDrawableVisible(root: THREE.Object3D, visible: boolean) {
  root.traverse((obj) => {
    if (obj === root) return
    if ((obj as THREE.Light).isLight) {
      obj.visible = true
      return
    }
    if (
      (obj as THREE.Mesh).isMesh ||
      (obj as THREE.Line).isLine ||
      (obj as THREE.LineSegments).isLineSegments ||
      (obj as THREE.Points).isPoints ||
      (obj as THREE.Sprite).isSprite
    ) {
      obj.visible = visible
    }
  })
}

/** Clamp a frame delta so a hitch cannot jump animations by a huge step. */
export function clampDelta(delta: number, max = 1 / 30) {
  return Math.min(Math.max(delta, 0), max)
}
