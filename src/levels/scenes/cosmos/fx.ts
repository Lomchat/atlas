/**
 * Luminous building blocks shared by the cosmic scenes: star/galaxy points
 * that stay crisp across many decades of zoom, billboard glows with a pixel
 * cap, painted galaxy discs and constant-width segment lines.
 *
 * Everything is created through the scene's Kit so it is disposed with it.
 * `env` variants read `kit.envUniform`, so they fade with immersion.
 */
import * as THREE from "three";
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry.js";
import type { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { PX_SCALE, TIME, rng } from "../../../engine/kit";
import type { ColorLike, Kit, LineOptions } from "../../../engine/kit";

const ONE = { value: 1 };

/**
 * Pure light: adds colour without touching the alpha channel. With plain
 * additive blending, glows would also accumulate alpha, which darkens the
 * background behind them whenever the engine cross-fades the layer through a
 * render target (a visible dark disc behind every glow).
 */
export function emissive<T extends THREE.Material>(material: T): T {
  material.blending = THREE.CustomBlending;
  material.blendEquation = THREE.AddEquation;
  material.blendSrc = THREE.SrcAlphaFactor;
  material.blendDst = THREE.OneFactor;
  material.blendEquationAlpha = THREE.AddEquation;
  material.blendSrcAlpha = THREE.ZeroFactor;
  material.blendDstAlpha = THREE.OneFactor;
  material.transparent = true;
  material.depthWrite = false;
  return material;
}

/* ------------------------------------------------------------------ */
/* Star points                                                          */
/* ------------------------------------------------------------------ */

const starVertex = /* glsl */ `
attribute vec3 aColor;
attribute float aSize;
attribute float aPhase;
#ifdef FLOW
attribute vec3 aTarget;
attribute float aSpeed;
#endif
uniform float uSize;
uniform float uPx;
uniform float uTime;
uniform float uTwinkle;
uniform float uMaxPx;
uniform float uFadePx;
uniform float uDepthDim;
uniform float uDepthRange;
uniform float uSpin;
uniform float uRim;
varying vec3 vColor;
varying float vAlpha;
void main() {
  vec3 p = position;
  float alpha = 1.0;
  #ifdef FLOW
    float f = fract(aPhase * 7.31 + uTime * aSpeed);
    p = mix(position, aTarget, f);
    alpha *= smoothstep(0.0, 0.18, f) * smoothstep(1.0, 0.7, f);
  #endif
  #ifdef SPIN
    float r = length(p.xz);
    float a = -uTime * uSpin / max(r, 0.6);
    float c = cos(a), s = sin(a);
    p.xz = vec2(c * p.x + s * p.z, -s * p.x + c * p.z);
  #endif
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float scale = length(modelMatrix[0].xyz);
  float px = uSize * aSize * scale * uPx / max(-mv.z, 0.001);
  gl_PointSize = clamp(px, 1.0, uMaxPx);
  float tw = 0.5 + 0.5 * sin(uTime * (0.7 + aPhase * 1.9) + aPhase * 40.0);
  float sub = clamp(px, 0.0, 1.0);
  alpha *= (1.0 - uTwinkle * tw) * sub * sub;
  if (uFadePx > 0.0) alpha *= 1.0 - smoothstep(uFadePx, uFadePx * 2.5, px);
  if (uDepthDim > 0.0) {
    vec4 o = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    float dz = (mv.z - o.z) / max(scale * uDepthRange, 1e-6);
    alpha *= mix(1.0, clamp(0.55 + 0.5 * dz, 0.12, 1.0), uDepthDim);
  }
  if (uRim > 0.0) {
    vec3 n = normalize(mat3(modelViewMatrix) * position);
    float facing = abs(dot(n, normalize(-mv.xyz)));
    alpha *= pow(1.0 - facing, uRim);
  }
  vColor = aColor;
  vAlpha = alpha;
}`;

const starFragment = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
uniform float uEnv;
uniform float uSoft;
uniform float uCore;
varying vec3 vColor;
varying float vAlpha;
void main() {
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  float d = dot(p, p);
  if (d > 1.0) discard;
  float a = mix(smoothstep(1.0, 0.6, d), pow(1.0 - d, 2.4), uSoft);
  vec3 col = uColor * vColor;
  col = mix(col, vec3(1.0), uCore * pow(max(1.0 - d * 5.0, 0.0), 2.0));
  gl_FragColor = vec4(col, a * vAlpha * uOpacity * uEnv);
}`;

export interface StarOptions {
  /** Diameter of a point in local units (times its size multiplier). */
  size?: number;
  color?: ColorLike;
  /** Per-point RGB colours (0–1). */
  colors?: ArrayLike<number>;
  sizes?: ArrayLike<number>;
  phases?: ArrayLike<number>;
  opacity?: number;
  soft?: number;
  /** 0–1: whitens the centre of each point. */
  core?: number;
  twinkle?: number;
  additive?: boolean;
  env?: boolean;
  /** Largest on-screen diameter, in device pixels. */
  maxPx?: number;
  /** Points larger than this (device px) fade out: flying through a crowd. 0 = off. */
  fadePx?: number;
  /** Dim points behind the model origin (0–1), over ± `depthRange` local units. */
  depthDim?: number;
  depthRange?: number;
  /** Animated flow from `position` to `targets`, `speeds` in cycles per second. */
  targets?: ArrayLike<number>;
  speeds?: ArrayLike<number>;
  /** Differential rotation about +Y (clockwise from above), radians·unit per second. */
  spin?: number;
  /** For points on a sphere around the origin: brighten the silhouette (exponent, 0 = off). */
  rim?: number;
}

/** A crowd of luminous points (stars, galaxies, comets). */
export function stars(kit: Kit, positions: ArrayLike<number>, options: StarOptions = {}) {
  const count = positions.length / 3;
  const geometry = kit.geometry(new THREE.BufferGeometry());
  geometry.setAttribute("position", new THREE.BufferAttribute(Float32Array.from(positions), 3));
  const random = rng(count * 13 + 7);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const phases = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    colors[i * 3] = options.colors ? options.colors[i * 3] : 1;
    colors[i * 3 + 1] = options.colors ? options.colors[i * 3 + 1] : 1;
    colors[i * 3 + 2] = options.colors ? options.colors[i * 3 + 2] : 1;
    sizes[i] = options.sizes ? options.sizes[i] : 1;
    phases[i] = options.phases ? options.phases[i] : random();
  }
  geometry.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));
  const defines: Record<string, string> = {};
  if (options.targets && options.speeds) {
    geometry.setAttribute("aTarget", new THREE.BufferAttribute(Float32Array.from(options.targets), 3));
    geometry.setAttribute("aSpeed", new THREE.BufferAttribute(Float32Array.from(options.speeds), 1));
    defines.FLOW = "";
  }
  if (options.spin) defines.SPIN = "";
  const material = kit.track(
    new THREE.ShaderMaterial({
      vertexShader: starVertex,
      fragmentShader: starFragment,
      defines,
      uniforms: {
        uColor: { value: new THREE.Color(options.color ?? 0xffffff) },
        uSize: { value: options.size ?? 0.05 },
        uPx: PX_SCALE,
        uTime: TIME,
        uTwinkle: { value: options.twinkle ?? 0 },
        uOpacity: { value: options.opacity ?? 1 },
        uEnv: options.env ? kit.envUniform : ONE,
        uSoft: { value: options.soft ?? 0.3 },
        uCore: { value: options.core ?? 0 },
        uMaxPx: { value: options.maxPx ?? 48 },
        uFadePx: { value: options.fadePx ?? 0 },
        uDepthDim: { value: options.depthDim ?? 0 },
        uDepthRange: { value: options.depthRange ?? 5 },
        uSpin: { value: options.spin ?? 0 },
        uRim: { value: options.rim ?? 0 },
      },
      transparent: true,
      depthWrite: false,
    }),
  );
  if (options.additive !== false) emissive(material);
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  return points;
}

/* ------------------------------------------------------------------ */
/* Billboard glows                                                      */
/* ------------------------------------------------------------------ */

const glowVertex = /* glsl */ `
uniform float uSize;
uniform float uPx;
uniform float uMaxPx;
uniform float uFadePx;
uniform float uMinPx;
varying vec2 vUv;
varying float vFade;
void main() {
  vUv = position.xy * 2.0;
  vec4 c = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  float scale = length(modelMatrix[0].xyz);
  float depth = max(-c.z, 0.001);
  float px = uSize * scale * uPx / depth;
  float shown = clamp(px, uMinPx, uMaxPx);
  c.xy += position.xy * shown * depth / uPx;
  gl_Position = projectionMatrix * c;
  vFade = uFadePx > 0.0 ? 1.0 - smoothstep(uFadePx, uFadePx * 3.0, px) : 1.0;
  vFade *= clamp(px / max(uMinPx, 0.001), 0.0, 1.0);
}`;

const glowFragment = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
uniform float uEnv;
uniform float uCore;
uniform float uRays;
uniform float uFalloff;
uniform float uPulse;
uniform float uTime;
uniform float uPhase;
varying vec2 vUv;
varying float vFade;
void main() {
  float r = length(vUv);
  if (r > 1.0) discard;
  float g = pow(1.0 - r, uFalloff) * (0.6 + 0.4 * exp(-r * r * 6.0));
  float core = uCore * exp(-r * r * 90.0);
  float rays = uRays * (exp(-abs(vUv.x) * 55.0 * (0.4 + r)) + exp(-abs(vUv.y) * 55.0 * (0.4 + r))) * pow(1.0 - r, 1.5);
  float pulse = 1.0 + uPulse * sin(uTime * 1.3 + uPhase);
  vec3 col = uColor * g * pulse + vec3(1.0) * (core + rays);
  gl_FragColor = vec4(col, uOpacity * uEnv * vFade);
}`;

export interface GlowOptions2 {
  opacity?: number;
  env?: boolean;
  /** White-hot centre strength. */
  core?: number;
  /** Four-point sparkle strength. */
  rays?: number;
  /** Edge falloff exponent (higher = tighter). */
  falloff?: number;
  /** Largest on-screen diameter (device px). */
  maxPx?: number;
  /** Below this size (device px) the glow keeps this size but fades. */
  minPx?: number;
  /** Fade out once larger than this (device px). 0 = off. */
  fadePx?: number;
  pulse?: number;
  phase?: number;
  additive?: boolean;
  depthTest?: boolean;
}

/** A camera-facing luminous disc, `size` local units across, with a pixel cap. */
export function glow(kit: Kit, color: ColorLike, size: number, options: GlowOptions2 = {}) {
  const material = kit.track(
    new THREE.ShaderMaterial({
      vertexShader: glowVertex,
      fragmentShader: glowFragment,
      uniforms: {
        uColor: { value: new THREE.Color(color) },
        uSize: { value: size },
        uPx: PX_SCALE,
        uMaxPx: { value: options.maxPx ?? 4000 },
        uMinPx: { value: options.minPx ?? 0 },
        uFadePx: { value: options.fadePx ?? 0 },
        uOpacity: { value: options.opacity ?? 1 },
        uEnv: options.env ? kit.envUniform : ONE,
        uCore: { value: options.core ?? 0 },
        uRays: { value: options.rays ?? 0 },
        uFalloff: { value: options.falloff ?? 1.6 },
        uPulse: { value: options.pulse ?? 0 },
        uTime: TIME,
        uPhase: { value: options.phase ?? 0 },
      },
      transparent: true,
      depthWrite: false,
      depthTest: options.depthTest ?? true,
    }),
  );
  if (options.additive !== false) emissive(material);
  const mesh = new THREE.Mesh(quad(kit), material);
  mesh.frustumCulled = false;
  return mesh;
}

const quads = new WeakMap<Kit, THREE.PlaneGeometry>();
function quad(kit: Kit) {
  let geometry = quads.get(kit);
  if (!geometry) {
    geometry = kit.geometry(new THREE.PlaneGeometry(1, 1));
    quads.set(kit, geometry);
  }
  return geometry;
}

/* ------------------------------------------------------------------ */
/* Painted discs                                                        */
/* ------------------------------------------------------------------ */

const discVertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const discFragment = /* glsl */ `
uniform sampler2D map;
uniform float uOpacity;
uniform float uEnv;
uniform vec3 uTint;
varying vec2 vUv;
void main() {
  // The texture is uploaded with premultiplied alpha: no dark fringes between texels.
  vec4 t = texture2D(map, vUv);
  float k = uOpacity * uEnv;
  #ifdef EMISSIVE
    gl_FragColor = vec4(t.rgb * uTint * k, 1.0);
  #else
    gl_FragColor = vec4(t.rgb * uTint * k, t.a * k);
  #endif
}`;

/** A flat disc in the XZ plane showing a painted texture (galaxies, maps). */
export function paintedDisc(
  kit: Kit,
  texture: THREE.Texture,
  radius: number,
  options: { opacity?: number; env?: boolean; additive?: boolean; tint?: ColorLike } = {},
) {
  const geometry = kit.geometry(new THREE.PlaneGeometry(radius * 2, radius * 2));
  geometry.rotateX(-Math.PI / 2);
  texture.premultiplyAlpha = true;
  texture.needsUpdate = true;
  const material = kit.track(
    new THREE.ShaderMaterial({
      vertexShader: discVertex,
      fragmentShader: discFragment,
      defines: options.additive ? { EMISSIVE: "" } : {},
      premultipliedAlpha: true,
      uniforms: {
        map: { value: texture },
        uOpacity: { value: options.opacity ?? 1 },
        uEnv: options.env ? kit.envUniform : ONE,
        uTint: { value: new THREE.Color(options.tint ?? 0xffffff) },
      },
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  if (options.additive) emissive(material);
  return new THREE.Mesh(geometry, material);
}

/* ------------------------------------------------------------------ */
/* Lines                                                                */
/* ------------------------------------------------------------------ */

/**
 * Many constant-width segments in one draw call. `positions` holds pairs of
 * points (xyz xyz); optional `colors` holds matching pairs of RGB colours.
 */
export function segments(
  kit: Kit,
  positions: ArrayLike<number>,
  options: LineOptions & { colors?: ArrayLike<number>; additive?: boolean } = {},
) {
  // A kit line registers its material for resolution updates; reuse that material.
  const proto = kit.line([0, 0, 0, 0, 0, 1e-4], options);
  const material = proto.material as LineMaterial;
  const geometry = kit.geometry(new LineSegmentsGeometry());
  geometry.setPositions(Float32Array.from(positions));
  if (options.colors) {
    geometry.setColors(Float32Array.from(options.colors));
    material.vertexColors = true;
  }
  if (options.additive) emissive(material);
  const lines = new LineSegments2(geometry, material);
  if (options.dashed) lines.computeLineDistances();
  lines.frustumCulled = false;
  return lines;
}

/* ------------------------------------------------------------------ */
/* Small helpers                                                        */
/* ------------------------------------------------------------------ */

/**
 * How much the level is magnified relative to its home view (1 at home,
 * larger while diving into a child). Reads the engine's holder matrix, which
 * is set before `update` is called.
 */
export function magnification(root: THREE.Object3D, frame = 1.5) {
  const holder = root.parent;
  if (!holder) return 1;
  const e = holder.matrix.elements;
  return Math.hypot(e[0], e[1], e[2]) * frame;
}

const tmpColor = new THREE.Color();
/** Push the RGB components of a colour into an array. */
export function pushColor(target: number[], color: ColorLike, intensity = 1) {
  tmpColor.set(color);
  target.push(tmpColor.r * intensity, tmpColor.g * intensity, tmpColor.b * intensity);
}

/** Mix two colours into an RGB triplet array. */
export function mixColor(target: number[], a: ColorLike, b: ColorLike, t: number, intensity = 1) {
  tmpColor.set(a).lerp(new THREE.Color(b), t);
  target.push(tmpColor.r * intensity, tmpColor.g * intensity, tmpColor.b * intensity);
}

/** Standard normal deviate from a uniform generator. */
export function gauss(random: () => number) {
  const u = Math.max(1e-9, random());
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * random());
}

/** A uniformly random unit vector. */
export function randomDirection(random: () => number, target = new THREE.Vector3()) {
  const z = random() * 2 - 1;
  const a = random() * Math.PI * 2;
  const s = Math.sqrt(1 - z * z);
  return target.set(Math.cos(a) * s, z, Math.sin(a) * s);
}
