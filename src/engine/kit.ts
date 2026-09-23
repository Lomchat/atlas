/**
 * The illustrated style kit shared by every scene.
 *
 * Colour management is disabled for the whole app (see Atlas.ts): hex colours
 * are written to the screen exactly as specified, like in a 2D illustration.
 * Every GPU resource created through a Kit is released by `kit.dispose()`.
 */
import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";

export type ColorLike = THREE.ColorRepresentation;

/** Palette for a consistent, vivid illustrated look. */
export const PALETTE = {
  night: "#140c3a",
  violet: "#8c5cff",
  lavender: "#c9b3ff",
  pink: "#ff6fb1",
  coral: "#ff5e6c",
  red: "#e8394f",
  orange: "#ff8a3d",
  amber: "#ffb13b",
  yellow: "#ffd23f",
  cream: "#fff4d6",
  mint: "#3ff2b5",
  green: "#4fcf5f",
  leaf: "#39b54a",
  teal: "#1fc8b8",
  cyan: "#3fd0ff",
  sky: "#6fc3ff",
  blue: "#3f7bff",
  white: "#ffffff",
  skin: "#f2a27e",
  skinShade: "#d97a64",
  proton: "#ff5a5f",
  neutron: "#5aa9ff",
  electron: "#6ff3ff",
  up: "#ffcf3f",
  down: "#4fe3a0",
  gluon: "#ff7ad9",
} as const;

/* ------------------------------------------------------------------ */
/* Shared uniforms, updated by the engine.                              */
/* ------------------------------------------------------------------ */

/** Seconds since start (frozen in screenshot mode). */
export const TIME = { value: 0 };
/** Device pixels per world unit at distance 1 (for point sizes). */
export const PX_SCALE = { value: 600 };
/** Key light direction, in view space. */
export const LIGHT_DIR = {
  value: new THREE.Vector3(-0.45, 0.72, 0.55).normalize(),
};
const lineMaterials = new Set<LineMaterial>();
/** Called by the engine whenever the drawing buffer changes size. */
export function setLineResolution(width: number, height: number) {
  for (const material of lineMaterials) material.resolution.set(width, height);
}
const RESOLUTION = new THREE.Vector2(1, 1);
export function setKitResolution(width: number, height: number) {
  RESOLUTION.set(width, height);
  setLineResolution(width, height);
}

/* ------------------------------------------------------------------ */
/* Noise and randomness                                                 */
/* ------------------------------------------------------------------ */

/** Deterministic PRNG (mulberry32). Returns numbers in [0, 1). */
export function rng(seed: number) {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash3(x: number, y: number, z: number, seed: number) {
  let h = (x * 374761393 + y * 668265263 + z * 1274126177 + seed * 144665) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
/** Smooth 3D value noise in [-1, 1]. */
export function noise3(x: number, y: number, z: number, seed = 0) {
  const xi = Math.floor(x),
    yi = Math.floor(y),
    zi = Math.floor(z);
  const xf = fade(x - xi),
    yf = fade(y - yi),
    zf = fade(z - zi);
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const c = (dx: number, dy: number, dz: number) =>
    hash3(xi + dx, yi + dy, zi + dz, seed);
  const v = lerp(
    lerp(lerp(c(0, 0, 0), c(1, 0, 0), xf), lerp(c(0, 1, 0), c(1, 1, 0), xf), yf),
    lerp(lerp(c(0, 0, 1), c(1, 0, 1), xf), lerp(c(0, 1, 1), c(1, 1, 1), xf), yf),
    zf,
  );
  return v * 2 - 1;
}
/** Fractal noise (several octaves of noise3). */
export function fbm3(x: number, y: number, z: number, octaves = 4, seed = 0) {
  let sum = 0,
    amp = 0.5,
    freq = 1,
    norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += amp * noise3(x * freq, y * freq, z * freq, seed + o * 17);
    norm += amp;
    amp *= 0.5;
    freq *= 2.03;
  }
  return sum / norm;
}

/* ------------------------------------------------------------------ */
/* Shaders                                                             */
/* ------------------------------------------------------------------ */

const toonVertex = /* glsl */ `
#include <common>
#include <color_pars_vertex>
varying vec3 vN;
varying vec3 vView;
void main() {
  #include <color_vertex>
  #include <beginnormal_vertex>
  #include <defaultnormal_vertex>
  #include <begin_vertex>
  #include <project_vertex>
  vN = normalize(transformedNormal);
  vView = -mvPosition.xyz;
}`;

const toonFragment = /* glsl */ `
uniform vec3 uColor;
uniform vec3 uShadow;
uniform float uUseShadow;
uniform vec3 uRimColor;
uniform float uUseRim;
uniform float uRim;
uniform float uGloss;
uniform float uFlat;
uniform float uSoft;
uniform float uOpacity;
uniform float uEnv;
uniform vec3 uLightDir;
#include <color_pars_fragment>
varying vec3 vN;
varying vec3 vView;
void main() {
  vec3 base = uColor;
  #if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
    base *= vColor.rgb;
  #endif
  vec3 n = normalize(vN);
  if (!gl_FrontFacing) n = -n;
  vec3 v = normalize(vView);
  float ndl = dot(n, uLightDir);
  float lit = smoothstep(-uSoft, uSoft, ndl + 0.08);
  vec3 shade = uUseShadow > 0.5
    ? uShadow
    : mix(base * vec3(0.5, 0.48, 0.66), vec3(0.17, 0.1, 0.4), 0.3);
  vec3 col = mix(shade, base, lit);
  float hl = smoothstep(0.78 - uSoft * 0.4, 0.78 + uSoft * 0.4, ndl) * uGloss;
  col = mix(col, mix(base, vec3(1.0, 0.98, 0.92), 0.6), hl);
  float fres = 1.0 - clamp(dot(n, v), 0.0, 1.0);
  float rim = smoothstep(0.55, 0.95, fres) * uRim;
  vec3 rimColor = uUseRim > 0.5 ? uRimColor : mix(base, vec3(1.0), 0.65);
  col = mix(col, rimColor, rim);
  col = mix(col, base, uFlat);
  gl_FragColor = vec4(col, uOpacity * uEnv);
}`;

const haloVertex = /* glsl */ `
#include <common>
varying vec3 vN;
varying vec3 vView;
void main() {
  #include <beginnormal_vertex>
  #include <defaultnormal_vertex>
  #include <begin_vertex>
  #include <project_vertex>
  vN = normalize(transformedNormal);
  vView = -mvPosition.xyz;
}`;

const haloFragment = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
uniform float uPower;
uniform float uEnv;
uniform float uInner;
varying vec3 vN;
varying vec3 vView;
void main() {
  vec3 n = normalize(vN);
  vec3 v = normalize(vView);
  float facing = abs(dot(n, v));
  // uInner = 0: glow brightest at the silhouette (atmosphere). 1: brightest in the middle (soft cloud).
  float a = mix(pow(1.0 - facing, uPower), pow(facing, uPower), uInner);
  gl_FragColor = vec4(uColor, a * uOpacity * uEnv);
}`;

const pointsVertex = /* glsl */ `
#include <common>
#include <color_pars_vertex>
attribute float aSize;
attribute float aPhase;
uniform float uSize;
uniform float uPx;
uniform float uTime;
uniform float uTwinkle;
uniform float uMaxPx;
varying float vAlpha;
void main() {
  #include <color_vertex>
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  float scale = length(modelMatrix[0].xyz);
  float px = uSize * aSize * scale * uPx / max(-mv.z, 0.001);
  gl_PointSize = clamp(px, 1.0, uMaxPx);
  float tw = 0.5 + 0.5 * sin(uTime * (0.8 + aPhase * 1.7) + aPhase * 40.0);
  vAlpha = (1.0 - uTwinkle * tw) * clamp(px, 0.0, 1.0);
}`;

const pointsFragment = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
uniform float uEnv;
uniform float uSoft;
#include <color_pars_fragment>
varying float vAlpha;
void main() {
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  float d = dot(p, p);
  if (d > 1.0) discard;
  float a = mix(smoothstep(1.0, 0.72, d), pow(1.0 - d, 2.2), uSoft);
  vec3 c = uColor;
  #if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
    c *= vColor.rgb;
  #endif
  gl_FragColor = vec4(c, a * vAlpha * uOpacity * uEnv);
}`;

/* ------------------------------------------------------------------ */
/* Shared textures                                                     */
/* ------------------------------------------------------------------ */

let glowTexture: THREE.Texture | null = null;
/** A soft radial glow, shared by every scene (never disposed by a kit). */
export function sharedGlowTexture() {
  if (glowTexture) return glowTexture;
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const g = canvas.getContext("2d")!;
  const gradient = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.18, "rgba(255,255,255,0.75)");
  gradient.addColorStop(0.45, "rgba(255,255,255,0.22)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gradient;
  g.fillRect(0, 0, size, size);
  glowTexture = new THREE.CanvasTexture(canvas);
  return glowTexture;
}

/* ------------------------------------------------------------------ */
/* Options                                                             */
/* ------------------------------------------------------------------ */

export interface ToonOptions {
  /** Explicit shadow colour; by default a cooler, darker version of the base. */
  shadow?: ColorLike;
  /** Rim (edge light) strength, 0–1. Default 0.35. */
  rim?: number;
  rimColor?: ColorLike;
  /** Size of the highlight band, 0–1. Default 0.2. */
  gloss?: number;
  /** 0 = shaded, 1 = flat unlit colour. */
  flat?: number;
  /** Softness of the light/shadow boundary. Default 0.22. */
  soft?: number;
  opacity?: number;
  /** Part of the surroundings: fades out when the level is seen from its parent. */
  env?: boolean;
  side?: THREE.Side;
  vertexColors?: boolean;
  transparent?: boolean;
  depthWrite?: boolean;
  blending?: THREE.Blending;
}

export interface GlowOptions {
  opacity?: number;
  env?: boolean;
  additive?: boolean;
}

export interface PointsOptions {
  /** World-space diameter of a point (in local units, before `aSize`). */
  size?: number;
  color?: ColorLike;
  /** Per-point colours (flat RGB array, 0–1). */
  colors?: ArrayLike<number>;
  /** Per-point size multipliers. */
  sizes?: ArrayLike<number>;
  opacity?: number;
  /** 0 = crisp discs, 1 = soft glows. */
  soft?: number;
  /** 0–1 twinkling amplitude. */
  twinkle?: number;
  additive?: boolean;
  env?: boolean;
  maxPx?: number;
}

export interface LineOptions {
  color?: ColorLike;
  /** Width in CSS pixels. */
  width?: number;
  opacity?: number;
  env?: boolean;
  dashed?: boolean;
  dashSize?: number;
  gapSize?: number;
}

type EnvMaterial = { material: THREE.Material & { opacity: number }; base: number };

/* ------------------------------------------------------------------ */
/* Kit                                                                 */
/* ------------------------------------------------------------------ */

export class Kit {
  /** Immersion (0–1) shared by every `env` material of this scene. */
  readonly envUniform = { value: 1 };
  private readonly one = { value: 1 };
  private readonly disposables = new Set<{ dispose(): void }>();
  private readonly envMaterials: EnvMaterial[] = [];
  readonly quality: "high" | "low";

  constructor(quality: "high" | "low" = "high") {
    this.quality = quality;
  }

  /** Scale a count down on low-end devices. */
  count(high: number, low = Math.round(high * 0.45)) {
    return this.quality === "high" ? high : low;
  }

  track<T extends { dispose(): void }>(resource: T): T {
    this.disposables.add(resource);
    return resource;
  }

  /** Engine hook: sets the immersion of this scene's surroundings. */
  setEnv(value: number) {
    this.envUniform.value = value;
    for (const { material, base } of this.envMaterials) material.opacity = base * value;
  }

  /* -------------------------- materials -------------------------- */

  /** The main illustrated material: two soft tones, a highlight and a rim light. */
  toon(color: ColorLike, options: ToonOptions = {}) {
    const material = new THREE.ShaderMaterial({
      vertexShader: toonVertex,
      fragmentShader: toonFragment,
      uniforms: {
        uColor: { value: new THREE.Color(color) },
        uShadow: { value: new THREE.Color(options.shadow ?? 0x000000) },
        uUseShadow: { value: options.shadow === undefined ? 0 : 1 },
        uRimColor: { value: new THREE.Color(options.rimColor ?? 0xffffff) },
        uUseRim: { value: options.rimColor === undefined ? 0 : 1 },
        uRim: { value: options.rim ?? 0.35 },
        uGloss: { value: options.gloss ?? 0.2 },
        uFlat: { value: options.flat ?? 0 },
        uSoft: { value: options.soft ?? 0.22 },
        uOpacity: { value: options.opacity ?? 1 },
        uEnv: options.env ? this.envUniform : this.one,
        uLightDir: LIGHT_DIR,
      },
      side: options.side ?? THREE.FrontSide,
      vertexColors: options.vertexColors ?? false,
      transparent:
        options.transparent ?? (!!options.env || (options.opacity ?? 1) < 1),
      depthWrite: options.depthWrite ?? true,
      blending: options.blending ?? THREE.NormalBlending,
    });
    return this.track(material);
  }

  /** Unlit flat colour (shapes, stripes, decals). */
  flat(color: ColorLike, options: Omit<ToonOptions, "flat"> = {}) {
    return this.toon(color, { ...options, flat: 1, rim: 0, gloss: 0 });
  }

  /**
   * A fresnel glow shell: `inner: 0` lights the silhouette (atmospheres,
   * membranes), `inner: 1` lights the centre (soft clouds).
   */
  halo(
    color: ColorLike,
    options: { opacity?: number; power?: number; inner?: number; env?: boolean; side?: THREE.Side; additive?: boolean } = {},
  ) {
    const material = new THREE.ShaderMaterial({
      vertexShader: haloVertex,
      fragmentShader: haloFragment,
      uniforms: {
        uColor: { value: new THREE.Color(color) },
        uOpacity: { value: options.opacity ?? 0.8 },
        uPower: { value: options.power ?? 2.5 },
        uInner: { value: options.inner ?? 0 },
        uEnv: options.env ? this.envUniform : this.one,
      },
      transparent: true,
      depthWrite: false,
      side: options.side ?? THREE.FrontSide,
      blending: options.additive === false ? THREE.NormalBlending : THREE.AdditiveBlending,
    });
    return this.track(material);
  }

  /** Material for a glow sprite. */
  glowMaterial(color: ColorLike, options: GlowOptions = {}) {
    const material = new THREE.SpriteMaterial({
      map: sharedGlowTexture(),
      color: new THREE.Color(color),
      transparent: true,
      opacity: options.opacity ?? 1,
      depthWrite: false,
      blending: options.additive === false ? THREE.NormalBlending : THREE.AdditiveBlending,
    });
    if (options.env) this.envMaterials.push({ material, base: material.opacity });
    return this.track(material);
  }

  /** A soft glowing disc facing the camera, `size` local units across. */
  glow(color: ColorLike, size: number, options: GlowOptions = {}) {
    const sprite = new THREE.Sprite(this.glowMaterial(color, options));
    sprite.scale.setScalar(size);
    return sprite;
  }

  /** Points with world-space sizes, soft or crisp, optionally twinkling. */
  points(positions: ArrayLike<number>, options: PointsOptions = {}) {
    const geometry = this.track(new THREE.BufferGeometry());
    const count = positions.length / 3;
    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(Float32Array.from(positions), 3),
    );
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);
    const random = rng(count * 7 + 3);
    for (let i = 0; i < count; i++) {
      sizes[i] = options.sizes ? options.sizes[i] : 1;
      phases[i] = random();
    }
    geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));
    if (options.colors)
      geometry.setAttribute(
        "color",
        new THREE.BufferAttribute(Float32Array.from(options.colors), 3),
      );
    const material = this.track(
      new THREE.ShaderMaterial({
        vertexShader: pointsVertex,
        fragmentShader: pointsFragment,
        uniforms: {
          uColor: { value: new THREE.Color(options.color ?? 0xffffff) },
          uSize: { value: options.size ?? 0.2 },
          uPx: PX_SCALE,
          uTime: TIME,
          uTwinkle: { value: options.twinkle ?? 0 },
          uOpacity: { value: options.opacity ?? 1 },
          uEnv: options.env ? this.envUniform : this.one,
          uSoft: { value: options.soft ?? 0 },
          uMaxPx: { value: options.maxPx ?? 160 },
        },
        vertexColors: !!options.colors,
        transparent: true,
        depthWrite: false,
        blending: options.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      }),
    );
    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;
    return points;
  }

  /** A line of constant screen width (orbits, fibres, outlines). */
  line(points: ArrayLike<number> | THREE.Vector3[], options: LineOptions = {}) {
    const flat: number[] = [];
    if (Array.isArray(points) && points[0] instanceof THREE.Vector3)
      for (const p of points as THREE.Vector3[]) flat.push(p.x, p.y, p.z);
    else flat.push(...Array.from(points as ArrayLike<number>));
    const geometry = this.track(new LineGeometry());
    geometry.setPositions(flat);
    const material = this.track(
      new LineMaterial({
        color: new THREE.Color(options.color ?? 0xffffff).getHex(),
        linewidth: options.width ?? 2,
        transparent: true,
        opacity: options.opacity ?? 1,
        dashed: options.dashed ?? false,
        dashSize: options.dashSize ?? 1,
        gapSize: options.gapSize ?? 1,
        depthWrite: false,
      }),
    );
    material.resolution.copy(RESOLUTION);
    lineMaterials.add(material);
    const originalDispose = material.dispose.bind(material);
    material.dispose = () => {
      lineMaterials.delete(material);
      originalDispose();
    };
    if (options.env) this.envMaterials.push({ material, base: material.opacity });
    const line = new Line2(geometry, material);
    if (options.dashed) line.computeLineDistances();
    line.frustumCulled = false;
    return line;
  }

  /** A closed circle (orbit) of `radius` in the XZ plane. */
  circle(radius: number, options: LineOptions & { segments?: number } = {}) {
    const segments = options.segments ?? 128;
    const flat: number[] = [];
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      flat.push(Math.cos(a) * radius, 0, Math.sin(a) * radius);
    }
    return this.line(flat, options);
  }

  /* -------------------------- geometry -------------------------- */

  geometry<T extends THREE.BufferGeometry>(geometry: T): T {
    return this.track(geometry);
  }

  /**
   * An organic blob: a subdivided sphere displaced by smooth noise.
   * `stretch` scales the axes before displacement.
   */
  blob(
    radius: number,
    options: {
      detail?: number;
      noise?: number;
      frequency?: number;
      seed?: number;
      stretch?: [number, number, number];
    } = {},
  ) {
    const geometry = new THREE.IcosahedronGeometry(radius, options.detail ?? 4);
    const position = geometry.getAttribute("position") as THREE.BufferAttribute;
    const [sx, sy, sz] = options.stretch ?? [1, 1, 1];
    const amount = options.noise ?? 0.12;
    const frequency = options.frequency ?? 1.4;
    const seed = options.seed ?? 1;
    const v = new THREE.Vector3();
    for (let i = 0; i < position.count; i++) {
      v.fromBufferAttribute(position, i);
      const n = v.clone().normalize();
      const d =
        1 +
        amount *
          fbm3(n.x * frequency + seed, n.y * frequency, n.z * frequency, 3, seed);
      v.multiplyScalar(d);
      v.set(v.x * sx, v.y * sy, v.z * sz);
      position.setXYZ(i, v.x, v.y, v.z);
    }
    geometry.computeVertexNormals();
    return this.track(mergeVertices(geometry));
  }

  /** A smooth tube along points (Catmull–Rom). */
  tube(
    points: THREE.Vector3[],
    radius: number,
    options: { segments?: number; radial?: number; closed?: boolean } = {},
  ) {
    const curve = new THREE.CatmullRomCurve3(points, options.closed ?? false);
    return this.track(
      new THREE.TubeGeometry(
        curve,
        options.segments ?? Math.max(16, points.length * 8),
        radius,
        options.radial ?? 12,
        options.closed ?? false,
      ),
    );
  }

  /** A texture painted with the 2D canvas API (maps, patterns, decals). */
  canvasTexture(
    width: number,
    height: number,
    paint: (g: CanvasRenderingContext2D, width: number, height: number) => void,
  ) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    paint(canvas.getContext("2d")!, width, height);
    const texture = new THREE.CanvasTexture(canvas);
    texture.anisotropy = 4;
    return this.track(texture);
  }

  /** Material using a painted texture, with the same illustrated lighting. */
  textured(texture: THREE.Texture, options: ToonOptions & { alphaTest?: number } = {}) {
    const material = this.toon(0xffffff, options) as THREE.ShaderMaterial;
    material.uniforms.map = { value: texture };
    // Honour texture.repeat / offset / rotation.
    texture.updateMatrix();
    material.uniforms.uvTransform = { value: texture.matrix };
    material.onBeforeRender = () => texture.updateMatrix();
    material.defines = { ...(material.defines ?? {}), USE_KIT_MAP: "" };
    material.vertexShader = material.vertexShader
      .replace("varying vec3 vN;", "varying vec3 vN;\nvarying vec2 vKitUv;\nuniform mat3 uvTransform;")
      .replace("#include <color_vertex>", "#include <color_vertex>\n  vKitUv = (uvTransform * vec3(uv, 1.0)).xy;");
    material.fragmentShader = material.fragmentShader
      .replace("varying vec3 vN;", "varying vec3 vN;\nvarying vec2 vKitUv;\nuniform sampler2D map;")
      .replace(
        "vec3 base = uColor;",
        `vec4 texel = texture2D(map, vKitUv);\n  ${
          options.alphaTest ? `if (texel.a < ${options.alphaTest.toFixed(3)}) discard;` : ""
        }\n  vec3 base = uColor * texel.rgb;`,
      )
      .replace(
        "gl_FragColor = vec4(col, uOpacity * uEnv);",
        "gl_FragColor = vec4(col, texel.a * uOpacity * uEnv);",
      );
    return material;
  }

  /** Release every tracked GPU resource. */
  dispose() {
    for (const resource of this.disposables) resource.dispose();
    this.disposables.clear();
    this.envMaterials.length = 0;
  }
}

/** Merge duplicated vertices so displaced/normal-smoothed surfaces stay closed. */
function mergeVertices(geometry: THREE.BufferGeometry) {
  const position = geometry.getAttribute("position");
  const map = new Map<string, number>();
  const remap: number[] = [];
  const unique: number[] = [];
  for (let i = 0; i < position.count; i++) {
    const key = `${position.getX(i).toFixed(5)},${position.getY(i).toFixed(5)},${position.getZ(i).toFixed(5)}`;
    let index = map.get(key);
    if (index === undefined) {
      index = unique.length / 3;
      map.set(key, index);
      unique.push(position.getX(i), position.getY(i), position.getZ(i));
    }
    remap.push(index);
  }
  const merged = new THREE.BufferGeometry();
  merged.setAttribute("position", new THREE.Float32BufferAttribute(unique, 3));
  merged.setIndex(remap);
  merged.computeVertexNormals();
  geometry.dispose();
  return merged;
}
