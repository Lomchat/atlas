/**
 * Illustrated planets lit by a sun placed at the origin of the scene root:
 * a bright day side, a violet night side, a soft terminator and a rim light,
 * in the same flat style as the kit's toon material.
 */
import * as THREE from "three";
import type { ColorLike, Kit } from "../../../engine/kit";

const vertex = /* glsl */ `
uniform vec3 uSunWorld;
varying vec3 vN;
varying vec3 vL;
varying vec3 vV;
varying vec2 vUv;
void main() {
  vUv = uv;
  vec4 world = modelMatrix * vec4(position, 1.0);
  vN = normalize(mat3(modelMatrix) * normal);
  vV = normalize(cameraPosition - world.xyz);
  // Mostly sunlight, with some light from the viewer so small planets read as lit discs.
  vL = normalize(mix(normalize(uSunWorld - world.xyz), vV, 0.45));
  gl_Position = projectionMatrix * viewMatrix * world;
}`;

const fragment = /* glsl */ `
uniform vec3 uColor;
uniform vec3 uNight;
uniform vec3 uRimColor;
uniform float uRim;
uniform float uOpacity;
uniform float uEnv;
#ifdef USE_PLANET_MAP
uniform sampler2D map;
#endif
varying vec3 vN;
varying vec3 vL;
varying vec3 vV;
varying vec2 vUv;
void main() {
  vec3 base = uColor;
  #ifdef USE_PLANET_MAP
    base *= texture2D(map, vUv).rgb;
  #endif
  vec3 n = normalize(vN);
  float ndl = dot(n, normalize(vL));
  float day = smoothstep(-0.08, 0.18, ndl);
  vec3 lit = base * mix(0.9, 1.06, smoothstep(0.2, 0.9, ndl));
  vec3 night = mix(base * vec3(0.32, 0.28, 0.55), uNight, 0.7);
  vec3 col = mix(night, lit, day);
  float fres = 1.0 - clamp(dot(n, normalize(vV)), 0.0, 1.0);
  col = mix(col, uRimColor, smoothstep(0.6, 1.0, fres) * uRim * (0.35 + 0.65 * day));
  gl_FragColor = vec4(col, uOpacity * uEnv);
}`;

export interface PlanetMaterialOptions {
  color?: ColorLike;
  map?: THREE.Texture;
  night?: ColorLike;
  rim?: number;
  rimColor?: ColorLike;
}

/** A sun-lit planet material; call `aimAtSun(mesh, sun)` so it follows the light. */
export function planetMaterial(kit: Kit, options: PlanetMaterialOptions = {}) {
  const material = new THREE.ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: fragment,
    uniforms: {
      uColor: { value: new THREE.Color(options.color ?? 0xffffff) },
      uNight: { value: new THREE.Color(options.night ?? "#2a1d6b") },
      uRimColor: { value: new THREE.Color(options.rimColor ?? "#ffffff") },
      uRim: { value: options.rim ?? 0.45 },
      uOpacity: { value: 1 },
      uEnv: { value: 1 },
      uSunWorld: { value: new THREE.Vector3() },
      map: { value: options.map ?? null },
    },
    defines: options.map ? { USE_PLANET_MAP: "" } : {},
  });
  return kit.track(material);
}

/** Keep a planet's light pointing at `sun` (an object whose origin is the Sun). */
export function aimAtSun(mesh: THREE.Mesh, sun: THREE.Object3D) {
  const material = mesh.material as THREE.ShaderMaterial;
  mesh.onBeforeRender = () => {
    material.uniforms.uSunWorld.value.setFromMatrixPosition(sun.matrixWorld);
  };
}

/** Horizontal bands for gas giants (a canvas texture, latitude along v). */
export function bandTexture(kit: Kit, bands: [number, string][], spot?: { x: number; y: number; w: number; h: number; color: string }) {
  return kit.canvasTexture(256, 128, (g, w, h) => {
    const gradient = g.createLinearGradient(0, 0, 0, h);
    for (const [stop, color] of bands) gradient.addColorStop(stop, color);
    g.fillStyle = gradient;
    g.fillRect(0, 0, w, h);
    if (spot) {
      g.fillStyle = spot.color;
      g.beginPath();
      g.ellipse(spot.x * w, spot.y * h, spot.w * w, spot.h * h, 0, 0, Math.PI * 2);
      g.fill();
    }
  });
}
