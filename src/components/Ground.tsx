import { useMemo } from 'react'
import * as THREE from 'three'

const vertexShader = /* glsl */ `
  varying vec2 vWorld;
  varying vec2 vScreen;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xz;
    vec4 clip = projectionMatrix * viewMatrix * world;
    vScreen = clip.xy / clip.w;
    gl_Position = clip;
  }
`

const fragmentShader = /* glsl */ `
  varying vec2 vWorld;
  varying vec2 vScreen;
  uniform vec3 uCenterColor;
  uniform vec3 uEdgeColor;
  uniform vec3 uLineColor;

  // Anti-aliased grid line mask for a given cell size and line half-width.
  float gridLine(vec2 p, float cell, float width) {
    vec2 q = abs(fract(p / cell - 0.5) - 0.5) * cell;
    vec2 fw = fwidth(p);
    vec2 line = 1.0 - smoothstep(width - fw, width + fw, q);
    return max(line.x, line.y);
  }

  void main() {
    // Uniform dark purple that darkens smoothly towards the far left and right edges only.
    float edge = smoothstep(0.3, 1.05, abs(vScreen.x));
    vec3 col = mix(uCenterColor, uEdgeColor, edge);

    // Faint grid: large blocks with slightly stronger lines.
    float small = gridLine(vWorld, 4.0, 0.035) * 0.035;
    float large = gridLine(vWorld, 16.0, 0.05) * 0.055;
    float lines = max(small, large) * (1.0 - edge * 0.85);
    col = mix(col, uLineColor, lines);

    gl_FragColor = vec4(col, 1.0);
  }
`

export function Ground() {
  const uniforms = useMemo(
    () => ({
      uCenterColor: { value: new THREE.Color('#1b1629') },
      uEdgeColor: { value: new THREE.Color('#0d0a15') },
      uLineColor: { value: new THREE.Color('#3a3052') },
    }),
    [],
  )

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[400, 400]} />
      <shaderMaterial vertexShader={vertexShader} fragmentShader={fragmentShader} uniforms={uniforms} />
    </mesh>
  )
}
