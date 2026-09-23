/**
 * Thousands of toon-shaded spheres in one draw call: camera-facing point
 * sprites shaded as spheres, writing a per-pixel sphere depth so that they
 * intersect correctly. Used for the hemoglobin crowd and lipid heads.
 */
import * as THREE from "three";
import type { Kit } from "../../../engine/kit";
import { LIGHT_DIR, PX_SCALE, TIME } from "../../../engine/kit";

export interface SphereSpec {
  p: THREE.Vector3;
  r: number;
  color: THREE.Color;
  /** Spheres sharing a phase jiggle together (one molecule). */
  phase: number;
}

const vertex = /* glsl */ `
attribute float aRadius;
attribute float aPhase;
attribute vec3 color;
uniform float uPx;
uniform float uTime;
uniform float uJiggle;
uniform vec2 uCue;
uniform float uGrow;
varying vec3 vColor;
varying float vCue;
varying vec3 vCenter;
varying float vRadius;
varying float vFade;
void main() {
  vec3 p = position;
  float ph = aPhase * 6.2831853;
  p += uJiggle * vec3(sin(uTime * 1.3 + ph), sin(uTime * 1.7 + ph * 2.0), sin(uTime * 1.1 + ph * 3.0));
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  float scale = length(modelViewMatrix[0].xyz);
  float r = aRadius * scale * smoothstep(0.0, 0.45, uGrow);
  gl_Position = projectionMatrix * mv;
  float px = 2.0 * r * uPx / max(-mv.z, 0.001);
  gl_PointSize = clamp(px + 1.0, 1.0, 1024.0);
  vFade = clamp(px - 0.5, 0.0, 1.0);
  vCenter = mv.xyz;
  vRadius = r;
  vColor = color;
  vCue = uCue.x < uCue.y ? smoothstep(uCue.x, uCue.y, position.z) : 1.0;
}`;

const fragment = /* glsl */ `
uniform mat4 projectionMatrix;
uniform vec3 uLightDir;
uniform float uRim;
varying vec3 vColor;
varying vec3 vCenter;
varying float vRadius;
varying float vFade;
varying float vCue;
void main() {
  vec2 q = gl_PointCoord * 2.0 - 1.0;
  q.y = -q.y;
  float d2 = dot(q, q);
  if (d2 > 1.0 || vFade <= 0.0) discard;
  vec3 n = vec3(q, sqrt(1.0 - d2));
  vec3 base = mix(vColor * vec3(0.42, 0.26, 0.42), vColor, vCue);
  float ndl = dot(n, uLightDir);
  float lit = smoothstep(-0.28, 0.28, ndl + 0.08);
  vec3 shade = mix(base * vec3(0.5, 0.48, 0.66), vec3(0.17, 0.1, 0.4), 0.3);
  vec3 col = mix(shade, base, lit);
  float hl = smoothstep(0.78 - 0.1, 0.78 + 0.1, ndl) * 0.3;
  col = mix(col, mix(base, vec3(1.0, 0.98, 0.92), 0.6), hl);
  float rim = smoothstep(0.55, 0.95, 1.0 - n.z) * uRim;
  col = mix(col, mix(base, vec3(1.0), 0.6), rim);
  vec4 clip = projectionMatrix * vec4(vCenter + n * vRadius, 1.0);
  gl_FragDepth = clamp((clip.z / clip.w) * 0.5 + 0.5, 0.0, 1.0);
  gl_FragColor = vec4(col, 1.0);
}`;

export function sphereCloud(
  kit: Kit,
  spheres: SphereSpec[],
  options: { env?: boolean; jiggle?: number; rim?: number; /** Depth cue: darken from z = cue[1] (front) to cue[0] (back). */ cue?: [number, number] } = {},
) {
  const geometry = kit.track(new THREE.BufferGeometry());
  const n = spheres.length;
  const positions = new Float32Array(n * 3);
  const colors = new Float32Array(n * 3);
  const radii = new Float32Array(n);
  const phases = new Float32Array(n);
  spheres.forEach((s, i) => {
    positions.set([s.p.x, s.p.y, s.p.z], i * 3);
    colors.set([s.color.r, s.color.g, s.color.b], i * 3);
    radii[i] = s.r;
    phases[i] = s.phase;
  });
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute("aRadius", new THREE.BufferAttribute(radii, 1));
  geometry.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));
  const material = kit.track(
    new THREE.ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: fragment,
      uniforms: {
        uPx: PX_SCALE,
        uTime: TIME,
        uJiggle: { value: options.jiggle ?? 0 },
        uLightDir: LIGHT_DIR,
        uRim: { value: options.rim ?? 0.4 },
        uCue: { value: new THREE.Vector2(options.cue?.[0] ?? 1, options.cue?.[1] ?? 0) },
        // Surroundings grow in with immersion instead of fading (no dark seams in dense crowds).
        uGrow: options.env ? kit.envUniform : { value: 1 },
      },
      transparent: false,
      depthWrite: true,
    }),
  );
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  return points;
}
