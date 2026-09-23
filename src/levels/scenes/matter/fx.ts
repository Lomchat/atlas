/**
 * Shared effects for the end of every journey (atom → almost nothing →
 * nucleus → proton → quark): fizzing point clouds, sparks of bounded screen
 * size, toon balls that dissolve into clouds, gluon flux tubes, popping
 * quark–antiquark pairs, element data and the deterministic nucleus packing.
 *
 * Every resource is created through the scene's Kit so it is disposed with it.
 */
import * as THREE from "three";
import type { ColorLike, Kit, ToonOptions } from "../../../engine/kit";
import { PALETTE, PX_SCALE, TIME, rng } from "../../../engine/kit";

export type V3 = [number, number, number];

/* ------------------------------------------------------------------ */
/* Small helpers                                                        */
/* ------------------------------------------------------------------ */

export const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/**
 * Local units currently visible across the smaller side of the viewport.
 * The engine shows 10 world units there and sets the holder (the root's
 * parent) matrix before `update()`, so its scale tells how far we zoomed.
 */
export function unitsAcross(root: THREE.Object3D, fallback = 15) {
  const parent = root.parent;
  if (!parent) return fallback;
  const e = parent.matrix.elements;
  const s = Math.max(Math.hypot(e[0], e[1]), Math.hypot(e[4], e[5]));
  return s > 1e-12 ? 10 / s : fallback;
}

/** A uniformly random unit vector. */
export function direction(random: () => number, out = new THREE.Vector3()) {
  const z = random() * 2 - 1;
  const a = random() * Math.PI * 2;
  const s = Math.sqrt(1 - z * z);
  return out.set(Math.cos(a) * s, Math.sin(a) * s, z);
}

export function gaussian(random: () => number) {
  let u = 0;
  while (u === 0) u = random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * random());
}

/** Gamma-distributed sample (Marsaglia–Tsang). */
export function gamma(random: () => number, shape: number): number {
  if (shape < 1) return gamma(random, shape + 1) * Math.pow(random(), 1 / shape);
  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  for (;;) {
    let x = 0;
    let v = 0;
    do {
      x = gaussian(random);
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    const u = random();
    if (u < 1 - 0.0331 * x ** 4) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

/** Small deterministic hash in [0, 1). */
export function hash(n: number) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/* ------------------------------------------------------------------ */
/* Electrons: effective nuclear charges and radial distributions        */
/* ------------------------------------------------------------------ */

/** Bohr radius, metres. */
export const BOHR = 5.29177e-11;

/**
 * Effective nuclear charge felt by each shell, electron-weighted averages of
 * Clementi & Raimondi (1963, 1967) orbital exponents.
 */
const Z_EFF: Record<string, number[]> = {
  H: [1],
  C: [5.67, 3.18],
  N: [6.67, 3.84],
  O: [7.66, 4.47],
  Mg: [11.61, 8.94, 3.31],
  P: [14.56, 12.6, 5.2],
  S: [15.54, 13.5, 5.7],
  Fe: [25.38, 21.2, 11.4, 5.43],
};
/** Slater's effective principal quantum numbers. */
const N_STAR = [1, 2, 3, 3.7, 4.0, 4.2];

/** Z_eff per shell for an element (table above, Slater's rules otherwise). */
export function shellCharges(symbol: string, Z: number, shells: number[]) {
  const known = Z_EFF[symbol];
  if (known && known.length === shells.length) return known;
  return shells.map((count, k) => {
    let screen = (count - 1) * (k === 0 ? 0.3 : 0.35);
    if (k >= 1) screen += shells[k - 1] * 0.85;
    for (let j = 0; j < k - 1; j++) screen += shells[j];
    return Math.max(1, Z - screen);
  });
}

/**
 * Radius (in Bohr radii) of an electron of shell `n` sampled from the
 * Slater-type radial probability r^(2n*) e^(−2 Z r / n*).
 */
export function shellRadius(random: () => number, n: number, zeff: number) {
  const ns = N_STAR[Math.min(n, N_STAR.length) - 1];
  return (gamma(random, 2 * ns + 1) * ns) / (2 * zeff);
}

/** Mean radius (Bohr radii) of that distribution. */
export function shellMean(n: number, zeff: number) {
  const ns = N_STAR[Math.min(n, N_STAR.length) - 1];
  return ((2 * ns + 1) * ns) / (2 * zeff);
}

/** Van der Waals radii (Bondi), ångström. */
export const VDW: Record<string, number> = {
  H: 1.2,
  C: 1.7,
  N: 1.55,
  O: 1.52,
  Mg: 1.73,
  P: 1.8,
  S: 1.8,
  Fe: 2.0,
};

/**
 * Radii (local units) of the spheres that enclose the given fractions of an
 * atom's electron probability, from Monte-Carlo samples of each shell.
 */
export function enclosingRadii(
  shells: number[],
  charges: number[],
  perBohr: number,
  fractions: number[],
  seed = 1,
) {
  const random = rng(seed);
  const radii: number[] = [];
  shells.forEach((count, k) => {
    for (let i = 0; i < count * 1500; i++) radii.push(shellRadius(random, k + 1, charges[k]) * perBohr);
  });
  radii.sort((a, b) => a - b);
  return fractions.map((f) => radii[Math.min(radii.length - 1, Math.floor(f * radii.length))]);
}

/**
 * Camera-facing flat discs, painted outside-in like layers of tinted paper,
 * that can breathe independently. `rings` go from the largest to the smallest;
 * the first one can fade out towards its edge (`feather`).
 */
export function ringStack(
  kit: Kit,
  rings: { radius: number; color: ColorLike; alpha: number }[],
  options: { feather?: number; order?: number | ((k: number) => number) } = {},
) {
  const order = (k: number) =>
    typeof options.order === "function" ? options.order(k) : (options.order ?? 0) + k * 0.01;
  const disc = (softness: number) =>
    kit.canvasTexture(256, 256, (g, w) => {
      const c = w / 2;
      if (softness > 0) {
        const gradient = g.createRadialGradient(c, c, 0, c, c, c - 1);
        gradient.addColorStop(0, "rgba(255,255,255,1)");
        gradient.addColorStop(Math.max(0, 1 - softness), "rgba(255,255,255,1)");
        gradient.addColorStop(1, "rgba(255,255,255,0)");
        g.fillStyle = gradient;
      } else g.fillStyle = "#ffffff";
      g.beginPath();
      g.arc(c, c, c - 1.5, 0, Math.PI * 2);
      g.fill();
    });
  const crisp = disc(0);
  const soft = options.feather ? disc(options.feather) : crisp;
  const group = new THREE.Group();
  const sprites = rings.map((ring, k) => {
    const material = kit.track(
      new THREE.SpriteMaterial({
        map: k === 0 ? soft : crisp,
        color: new THREE.Color(ring.color),
        transparent: true,
        opacity: ring.alpha,
        depthWrite: false,
        depthTest: false,
      }),
    );
    const sprite = new THREE.Sprite(material);
    sprite.scale.setScalar(ring.radius * 2);
    sprite.renderOrder = order(k);
    group.add(sprite);
    return sprite;
  });
  return {
    group,
    sprites,
    /** Gentle, out-of-phase breathing of each ring. */
    breathe(time: number, amount = 0.025) {
      sprites.forEach((sprite, k) => {
        const s = 1 + amount * Math.sin(time * (0.7 + k * 0.23) + k * 1.9);
        sprite.scale.setScalar(rings[k].radius * 2 * s);
      });
    },
  };
}

/* ------------------------------------------------------------------ */
/* Opacity bookkeeping                                                  */
/* ------------------------------------------------------------------ */

type Fadable = THREE.Material & { opacity: number; uniforms?: Record<string, THREE.IUniform> };

/** Collects materials with their base opacity so a group can fade as one. */
export class Fader {
  private readonly items: { material: Fadable; base: number }[] = [];
  add<T extends THREE.Material>(material: T, base?: number): T {
    const m = material as unknown as Fadable;
    const value = base ?? (m.uniforms?.uOpacity ? (m.uniforms.uOpacity.value as number) : m.opacity);
    this.items.push({ material: m, base: value });
    return material;
  }
  set(factor: number) {
    for (const { material, base } of this.items) {
      if (material.uniforms?.uOpacity) material.uniforms.uOpacity.value = base * factor;
      else material.opacity = base * factor;
    }
  }
}

/* ------------------------------------------------------------------ */
/* Fizzing points                                                        */
/* ------------------------------------------------------------------ */

const HASH_GLSL = /* glsl */ `
float fxHash(float p) { p = fract(p * 0.1031); p *= p + 33.33; p *= p + p; return fract(p); }
vec3 fxRotate(vec3 p, vec3 axis, float a) {
  float c = cos(a), s = sin(a);
  return p * c + cross(axis, p) * s + axis * dot(axis, p) * (1.0 - c);
}
vec3 fxAxis(float k) {
  return normalize(vec3(fxHash(k) - 0.5, fxHash(k + 1.37) - 0.5, fxHash(k + 2.71) - 0.5) + vec3(1e-3));
}`;

const fizzVertex = /* glsl */ `
attribute float aSize;
attribute float aSeed;
attribute vec3 aColor;
uniform float uSize;
uniform float uPx;
uniform float uTime;
uniform float uRate;
uniform float uFlicker;
uniform float uHop;
uniform float uMinPx;
uniform float uMaxPx;
varying float vAlpha;
varying vec3 vColor;
${HASH_GLSL}
void main() {
  float ct = uTime * uRate * (0.55 + aSeed * 0.9) + aSeed * 37.0;
  float cycle = floor(ct);
  float f = fract(ct);
  vec3 p = position;
  if (uHop > 0.0) {
    float k = cycle * 7.13 + aSeed * 113.7;
    p = fxRotate(p, fxAxis(k), uHop * 6.2831853 * (fxHash(k + 5.3) - 0.5));
  }
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float scale = length(modelMatrix[0].xyz);
  float px = uSize * aSize * scale * uPx / max(-mv.z, 0.001);
  float life = smoothstep(0.0, 0.14, f) * (1.0 - smoothstep(0.4, 1.0, f));
  float tiny = uMinPx > 0.0 ? 1.0 : clamp(px, 0.0, 1.0);
  vAlpha = mix(1.0, life, uFlicker) * tiny;
  gl_PointSize = clamp(px, max(uMinPx, 1.0), uMaxPx);
  vColor = aColor;
}`;

const fizzFragment = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
uniform float uEnv;
uniform float uSoft;
uniform float uCore;
varying float vAlpha;
varying vec3 vColor;
void main() {
  vec2 q = gl_PointCoord * 2.0 - 1.0;
  float d = dot(q, q);
  if (d > 1.0) discard;
  float a = mix(smoothstep(1.0, 0.7, d), pow(1.0 - d, 2.4), uSoft);
  vec3 c = uColor * vColor;
  c = mix(c, vec3(1.0), uCore * smoothstep(0.12, 0.0, d));
  gl_FragColor = vec4(c, a * vAlpha * uOpacity * uEnv);
}`;

export interface FizzOptions {
  /** World size of a point, in local units (before per-point `sizes`). */
  size?: number;
  color?: ColorLike;
  /** Per-point RGB (0–1). */
  colors?: ArrayLike<number>;
  sizes?: ArrayLike<number>;
  opacity?: number;
  /** 0 crisp discs, 1 soft glows. */
  soft?: number;
  /** White-hot centre (0–1). */
  core?: number;
  /** Blink cycles per second (0: static). */
  rate?: number;
  /** 0–1: how much each point fades out between cycles. */
  flicker?: number;
  /** Fraction of a turn each point jumps around the origin at every cycle. */
  hop?: number;
  minPx?: number;
  maxPx?: number;
  additive?: boolean;
  env?: boolean;
  depthTest?: boolean;
  seed?: number;
}

export type FxPoints = THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;

/**
 * Points that blink and hop around the origin: each blink shows the point at a
 * new place, like repeated measurements of where an electron is.
 */
export function fizz(kit: Kit, positions: ArrayLike<number>, o: FizzOptions = {}): FxPoints {
  const count = positions.length / 3;
  const geometry = kit.geometry(new THREE.BufferGeometry());
  geometry.setAttribute("position", new THREE.BufferAttribute(Float32Array.from(positions), 3));
  const sizes = new Float32Array(count);
  const seeds = new Float32Array(count);
  const colors = new Float32Array(count * 3);
  const random = rng(o.seed ?? count * 13 + 5);
  for (let i = 0; i < count; i++) {
    sizes[i] = o.sizes ? o.sizes[i] : 1;
    seeds[i] = random();
    for (let c = 0; c < 3; c++) colors[i * 3 + c] = o.colors ? o.colors[i * 3 + c] : 1;
  }
  geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
  geometry.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
  const material = kit.track(
    new THREE.ShaderMaterial({
      vertexShader: fizzVertex,
      fragmentShader: fizzFragment,
      uniforms: {
        uColor: { value: new THREE.Color(o.color ?? 0xffffff) },
        uSize: { value: o.size ?? 0.2 },
        uPx: PX_SCALE,
        uTime: TIME,
        uRate: { value: o.rate ?? 0 },
        uFlicker: { value: o.flicker ?? 0 },
        uHop: { value: o.hop ?? 0 },
        uMinPx: { value: o.minPx ?? 0 },
        uMaxPx: { value: o.maxPx ?? 64 },
        uOpacity: { value: o.opacity ?? 1 },
        uEnv: o.env ? kit.envUniform : { value: 1 },
        uSoft: { value: o.soft ?? 0.6 },
        uCore: { value: o.core ?? 0 },
      },
      transparent: true,
      depthWrite: false,
      depthTest: o.depthTest ?? true,
      blending: o.additive === false ? THREE.NormalBlending : THREE.AdditiveBlending,
    }),
  );
  const points = new THREE.Points(geometry, material) as FxPoints;
  points.frustumCulled = false;
  return points;
}

/** A single glowing point: bounded in pixels, so it stays a spark while zooming. */
export function spark(
  kit: Kit,
  color: ColorLike,
  o: { size: number; minPx?: number; maxPx?: number; soft?: number; core?: number; opacity?: number; env?: boolean },
) {
  return fizz(kit, [0, 0, 0], {
    color,
    size: o.size,
    minPx: o.minPx ?? 2,
    maxPx: o.maxPx ?? 40,
    soft: o.soft ?? 1,
    core: o.core ?? 0,
    opacity: o.opacity ?? 1,
    env: o.env,
  });
}

/** Mix two colours into an [r, g, b] triple (0–1). */
export function rgb(a: ColorLike, b?: ColorLike, t = 0): V3 {
  const c = new THREE.Color(a);
  if (b !== undefined) c.lerp(new THREE.Color(b), t);
  return [c.r, c.g, c.b];
}

/* ------------------------------------------------------------------ */
/* A toon ball that dissolves into a cloud                              */
/* ------------------------------------------------------------------ */

const NOISE_GLSL = /* glsl */ `
float fxH3(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float fxNoise(vec3 x) {
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(fxH3(i), fxH3(i + vec3(1, 0, 0)), f.x), mix(fxH3(i + vec3(0, 1, 0)), fxH3(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(fxH3(i + vec3(0, 0, 1)), fxH3(i + vec3(1, 0, 1)), f.x), mix(fxH3(i + vec3(0, 1, 1)), fxH3(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}`;

export type DissolveMaterial = THREE.ShaderMaterial & {
  uniforms: { uDissolve: { value: number }; uOpacity: { value: number } };
};

/**
 * The kit's toon material with a noisy dissolve (`uniforms.uDissolve`, 0–1)
 * and a glowing edge, so a solid ball can melt into the cloud it stands for.
 */
export function dissolvable(
  kit: Kit,
  color: ColorLike,
  options: ToonOptions & { edge?: ColorLike; frequency?: number } = {},
) {
  const { edge, frequency, ...toon } = options;
  const material = kit.toon(color, { ...toon, transparent: true }) as THREE.ShaderMaterial;
  material.uniforms.uDissolve = { value: 0 };
  material.uniforms.uEdgeColor = { value: new THREE.Color(edge ?? "#ffffff") };
  material.uniforms.uFreq = { value: frequency ?? 1 };
  material.vertexShader = material.vertexShader
    .replace("varying vec3 vView;", "varying vec3 vView;\nvarying vec3 vObj;")
    .replace("#include <project_vertex>", "#include <project_vertex>\n  vObj = position;");
  material.fragmentShader =
    NOISE_GLSL +
    material.fragmentShader
      .replace(
        "varying vec3 vView;",
        "varying vec3 vView;\nvarying vec3 vObj;\nuniform float uDissolve;\nuniform vec3 uEdgeColor;\nuniform float uFreq;",
      )
      .replace(
        "gl_FragColor = vec4(col, uOpacity * uEnv);",
        `float nz = fxNoise(vObj * uFreq) * 0.62 + fxNoise(vObj * uFreq * 2.7 + 7.1) * 0.38;
  float cut = uDissolve * 1.2 - 0.1;
  if (uDissolve > 0.001 && nz < cut) discard;
  float burn = uDissolve > 0.001 ? 1.0 - smoothstep(0.0, 0.09, nz - cut) : 0.0;
  col = mix(col, uEdgeColor, burn);
  gl_FragColor = vec4(col, uOpacity * uEnv);`,
      );
  return material as DissolveMaterial;
}

/* ------------------------------------------------------------------ */
/* Nucleons and quarks: one look shared across neighbouring scales      */
/* ------------------------------------------------------------------ */

export type Nucleon = "proton" | "neutron";

/** Shared nucleon sphere resolution, so a child ball matches its siblings. */
export function nucleonGeometry(kit: Kit) {
  return kit.geometry(new THREE.SphereGeometry(1, 34, 22));
}

export function nucleonOptions(type: Nucleon): ToonOptions {
  return type === "proton"
    ? { rim: 0.5, rimColor: "#ffd0c8", gloss: 0.32, shadow: "#a8266a", soft: 0.26 }
    : { rim: 0.5, rimColor: "#d2ecff", gloss: 0.32, shadow: "#3b3fae", soft: 0.26 };
}

export const nucleonColor = (type: Nucleon) => (type === "proton" ? PALETTE.proton : PALETTE.neutron);

export type Flavor = "up" | "down";
export const flavorColor = (flavor: Flavor) => (flavor === "up" ? PALETTE.up : PALETTE.down);

/**
 * A valence quark as drawn inside the proton: a white-hot point that stays a
 * few pixels wide, in a glow of its flavour colour. `setSize(unit)` takes the
 * size of one proton unit in the local units of the calling scene.
 */
export function quarkGlyph(kit: Kit, flavor: Flavor) {
  const group = new THREE.Group();
  const color = flavorColor(flavor);
  const fader = new Fader();
  const halo = kit.glow(color, 1, { opacity: 0.3 });
  fader.add(halo.material);
  const glow = spark(kit, color, { size: 1, maxPx: 600, soft: 1, opacity: 0.55 });
  fader.add(glow.material);
  const body = fizz(kit, [0, 0, 0], { color, size: 1, minPx: 6, maxPx: 600, soft: 0.25, opacity: 1, additive: false });
  fader.add(body.material);
  const core = spark(kit, "#fffdf2", { size: 1, minPx: 4, maxPx: 9, soft: 0.5, core: 1, opacity: 0.95 });
  fader.add(core.material);
  group.add(halo, glow, body, core);
  return {
    group,
    fader,
    /** Sizes in local units: `unit` is one proton unit; `point` shrinks the body. */
    setSize(unit: number, point = 1) {
      halo.scale.setScalar(3.8 * unit);
      glow.material.uniforms.uSize.value = 2 * unit;
      body.material.uniforms.uSize.value = 0.78 * unit * point;
      core.material.uniforms.uSize.value = 0.3 * unit * point;
    },
    /** Opacities of the coloured body and of the soft glows (after `fader`). */
    setBody(alpha: number, glowAlpha = 1) {
      body.material.uniforms.uOpacity.value = alpha;
      glow.material.uniforms.uOpacity.value *= glowAlpha;
      halo.material.opacity *= glowAlpha;
    },
    pulse(time: number, seed: number) {
      const k = 1 + 0.07 * Math.sin(time * 2.3 + seed * 5) + 0.04 * Math.sin(time * 5.1 + seed);
      glow.scale.setScalar(k);
      body.scale.setScalar(1 + 0.05 * Math.sin(time * 3.7 + seed * 2));
    },
  };
}

/* ------------------------------------------------------------------ */
/* Gluon flux tubes                                                     */
/* ------------------------------------------------------------------ */

const fluxVertex = /* glsl */ `
uniform vec3 uA[ARMS];
uniform vec3 uB[ARMS];
uniform float uTime;
uniform float uStrands;
uniform float uRadius;
uniform float uBundle;
uniform float uSheath;
uniform float uFan;
uniform float uFanLen;
uniform vec2 uFanEnds;
uniform float uWobble;
uniform float uWave;
uniform float uTwist;
uniform float uSpin;
attribute float aT;
attribute float aTheta;
attribute float aStrand;
attribute float aArm;
varying float vFacing;
varying float vS;
varying float vSheath;
varying float vSeed;
varying float vEnds;
void main() {
  int arm = int(aArm + 0.5);
  vec3 A = uA[arm];
  vec3 B = uB[arm];
  vec3 d = B - A;
  float L = max(length(d), 1e-4);
  vec3 dir = d / L;
  vec3 ref = abs(dir.z) < 0.92 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
  vec3 n1 = normalize(cross(dir, ref));
  vec3 n2 = cross(dir, n1);
  float s = aT * L;
  float sB = L - s;
  float fanA = uFanEnds.x * uFan * (s / uFanLen) * exp(1.0 - s / uFanLen);
  float fanB = uFanEnds.y * uFan * (sB / uFanLen) * exp(1.0 - sB / uFanLen);
  float endA = mix(1.0, smoothstep(0.0, uFanLen * 1.4, s), uFanEnds.x);
  float endB = mix(1.0, smoothstep(0.0, uFanLen * 1.4, sB), uFanEnds.y);
  float ends = endA * endB;
  float w = sin(3.14159265 * aT) * (0.35 + 0.65 * ends);
  float ph = aArm * 2.1;
  vec3 wob = (n1 * sin(s * uWave + uTime * 1.9 + ph) + n2 * sin(s * uWave * 0.71 - uTime * 1.37 + ph * 1.7)) * uWobble * w;
  vec3 center = A + dir * s + wob;
  vec3 radial = n1 * cos(aTheta) + n2 * sin(aTheta);
  float r;
  if (aStrand < -0.5) {
    r = uSheath * ends + (fanA + fanB) * 1.15;
    vSheath = 1.0;
  } else {
    float spin = uSpin * (mod(aArm, 2.0) * 2.0 - 1.0);
    float phi = aStrand / uStrands * 6.2831853 + s * uTwist + uTime * spin + aArm;
    float wander = 1.0 + 0.25 * sin(s * 1.7 + aStrand * 2.3 + uTime * 0.9);
    center += (n1 * cos(phi) + n2 * sin(phi)) * ((uBundle * ends) * wander + fanA + fanB);
    r = uRadius * mix(0.3, 1.0, ends);
    vSheath = 0.0;
  }
  vec3 p = center + radial * r;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  vec3 nView = normalize(normalMatrix * radial);
  vFacing = abs(dot(nView, normalize(-mv.xyz)));
  vS = s;
  vSeed = aStrand * 1.618 + aArm * 3.7;
  vEnds = ends;
}`;

const fluxFragment = /* glsl */ `
uniform vec3 uColor;
uniform vec3 uHot;
uniform float uOpacity;
uniform float uSheathOpacity;
uniform float uEnv;
uniform float uTime;
uniform float uPulse;
varying float vFacing;
varying float vS;
varying float vSheath;
varying float vSeed;
varying float vEnds;
void main() {
  if (vSheath > 0.5) {
    float a = pow(vFacing, 2.2) * uSheathOpacity * (0.55 + 0.45 * vEnds);
    gl_FragColor = vec4(uColor, a * uOpacity * uEnv);
    return;
  }
  float dirn = mod(floor(vSeed * 3.0), 2.0) * 2.0 - 1.0;
  float pulse = pow(0.5 + 0.5 * sin(vS * uPulse - uTime * 3.2 * dirn + vSeed * 2.1), 6.0);
  float core = pow(vFacing, 1.4);
  vec3 col = mix(uColor, uHot, clamp(core * 0.45 + pulse * 0.75, 0.0, 1.0));
  float a = core * (0.6 + 0.6 * pulse);
  gl_FragColor = vec4(col, a * uOpacity * uEnv);
}`;

export interface FluxOptions {
  arms: number;
  strands: number;
  segments?: number;
  radial?: number;
  /** Radius of each strand. */
  radius: number;
  /** Distance of the strands from the tube axis. */
  bundle: number;
  /** Radius of the soft sheath around the strands (0: none). */
  sheath?: number;
  /** Bulge of the strands near a quark and its length scale. */
  fan?: number;
  fanLength?: number;
  /** Which ends are quarks (the strands converge and fan out there). */
  fanEnds?: [boolean, boolean];
  wobble?: number;
  wave?: number;
  twist?: number;
  spin?: number;
  pulse?: number;
  color?: ColorLike;
  hot?: ColorLike;
  opacity?: number;
  sheathOpacity?: number;
  env?: boolean;
}

/**
 * Glowing gluon flux tubes between moving end points, in one draw call. The
 * strands twist and wobble in the vertex shader; bright pulses run along them.
 */
export function fluxTubes(kit: Kit, o: FluxOptions) {
  const segments = o.segments ?? 72;
  const radial = o.radial ?? 7;
  const strandIds: number[] = [];
  if ((o.sheath ?? 0) > 0) strandIds.push(-1);
  for (let s = 0; s < o.strands; s++) strandIds.push(s);
  const t: number[] = [];
  const theta: number[] = [];
  const strand: number[] = [];
  const arm: number[] = [];
  const index: number[] = [];
  let base = 0;
  for (let a = 0; a < o.arms; a++)
    for (const s of strandIds) {
      for (let i = 0; i <= segments; i++)
        for (let j = 0; j <= radial; j++) {
          t.push(i / segments);
          theta.push((j / radial) * Math.PI * 2);
          strand.push(s);
          arm.push(a);
        }
      for (let i = 0; i < segments; i++)
        for (let j = 0; j < radial; j++) {
          const p = base + i * (radial + 1) + j;
          const q = p + radial + 1;
          index.push(p, q, p + 1, p + 1, q, q + 1);
        }
      base += (segments + 1) * (radial + 1);
    }
  const geometry = kit.geometry(new THREE.BufferGeometry());
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(t.length * 3), 3));
  geometry.setAttribute("aT", new THREE.Float32BufferAttribute(t, 1));
  geometry.setAttribute("aTheta", new THREE.Float32BufferAttribute(theta, 1));
  geometry.setAttribute("aStrand", new THREE.Float32BufferAttribute(strand, 1));
  geometry.setAttribute("aArm", new THREE.Float32BufferAttribute(arm, 1));
  geometry.setIndex(index);
  const A = Array.from({ length: o.arms }, () => new THREE.Vector3());
  const B = Array.from({ length: o.arms }, () => new THREE.Vector3(1, 0, 0));
  const material = kit.track(
    new THREE.ShaderMaterial({
      defines: { ARMS: o.arms },
      vertexShader: fluxVertex,
      fragmentShader: fluxFragment,
      uniforms: {
        uA: { value: A },
        uB: { value: B },
        uTime: TIME,
        uStrands: { value: o.strands },
        uRadius: { value: o.radius },
        uBundle: { value: o.bundle },
        uSheath: { value: o.sheath ?? 0 },
        uFan: { value: o.fan ?? 0 },
        uFanLen: { value: o.fanLength ?? 1 },
        uFanEnds: { value: new THREE.Vector2(o.fanEnds?.[0] === false ? 0 : 1, o.fanEnds?.[1] === false ? 0 : 1) },
        uWobble: { value: o.wobble ?? 0.2 },
        uWave: { value: o.wave ?? 1 },
        uTwist: { value: o.twist ?? 1 },
        uSpin: { value: o.spin ?? 0.6 },
        uPulse: { value: o.pulse ?? 2.2 },
        uColor: { value: new THREE.Color(o.color ?? PALETTE.gluon) },
        uHot: { value: new THREE.Color(o.hot ?? "#fff1fb") },
        uOpacity: { value: o.opacity ?? 1 },
        uSheathOpacity: { value: o.sheathOpacity ?? 0.25 },
        uEnv: o.env ? kit.envUniform : { value: 1 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  return {
    mesh,
    material,
    setArm(i: number, a: THREE.Vector3, b: THREE.Vector3) {
      A[i].copy(a);
      B[i].copy(b);
    },
  };
}

/* ------------------------------------------------------------------ */
/* Quark–antiquark pairs popping in and out                              */
/* ------------------------------------------------------------------ */

const pairVertex = /* glsl */ `
attribute vec3 aAxis;
attribute float aSide;
attribute float aSeed;
attribute vec3 aColor;
uniform float uTime;
uniform float uRate;
uniform float uSep;
uniform float uSize;
uniform float uPx;
uniform float uMaxPx;
uniform vec3 uSpark;
varying float vAlpha;
varying vec3 vColor;
varying float vRing;
varying float vSpark;
${HASH_GLSL}
void main() {
  float ct = uTime * uRate * (0.7 + aSeed * 0.6) + aSeed * 23.0;
  float cycle = floor(ct);
  float f = fract(ct);
  float k = cycle * 3.71 + aSeed * 57.3;
  vec3 axis = fxAxis(k);
  vec3 c = fxRotate(position, axis, 6.2831853 * fxHash(k + 4.4));
  vec3 u = normalize(fxRotate(aAxis, fxAxis(k + 9.0), 6.2831853 * fxHash(k + 6.1)));
  float open = sin(3.14159265 * f);
  vec3 p = c + u * aSide * uSep * (0.12 + 0.88 * open);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float spark = 1.0 - step(0.95, abs(aSide));
  float life = smoothstep(0.0, 0.1, f) * (1.0 - smoothstep(0.82, 1.0, f));
  float scale = length(modelMatrix[0].xyz);
  float px = uSize * mix(1.0, 0.5, spark) * scale * uPx / max(-mv.z, 0.001);
  gl_PointSize = clamp(px, 1.0, uMaxPx);
  float flick = 0.55 + 0.45 * sin(uTime * 19.0 + aSeed * 40.0 + aSide * 9.0);
  vAlpha = life * mix(1.0, flick * open, spark) * clamp(px, 0.0, 1.0);
  vRing = aSide < -0.95 ? 1.0 : 0.0;
  vSpark = spark;
  vColor = mix(aColor, uSpark, spark);
}`;

const pairFragment = /* glsl */ `
uniform float uOpacity;
uniform float uEnv;
varying float vAlpha;
varying vec3 vColor;
varying float vRing;
varying float vSpark;
void main() {
  vec2 q = gl_PointCoord * 2.0 - 1.0;
  float d = length(q);
  if (d > 1.0) discard;
  float a;
  if (vSpark > 0.5) a = pow(1.0 - d, 2.0);
  else if (vRing > 0.5) a = smoothstep(0.42, 0.56, d) * (1.0 - smoothstep(0.78, 0.98, d)) + 0.18 * (1.0 - d);
  else a = 1.0 - smoothstep(0.6, 0.95, d);
  vec3 c = mix(vColor, vec3(1.0), vRing > 0.5 || vSpark > 0.5 ? 0.0 : 0.35 * (1.0 - smoothstep(0.0, 0.5, d)));
  gl_FragColor = vec4(c, a * vAlpha * uOpacity * uEnv);
}`;

export interface PairOptions {
  count: number;
  /** Pair centres are spread within this radius (between `inner` and `radius`). */
  radius: number;
  inner?: number;
  /** Largest half-separation of a pair. */
  separation: number;
  /** Diameter of a quark dot, in local units. */
  size: number;
  rate?: number;
  opacity?: number;
  maxPx?: number;
  env?: boolean;
  seed?: number;
}

/**
 * Sea quarks: pairs that appear from a spark of gluon field, drift apart a
 * little and annihilate. Quarks are filled dots, antiquarks are rings, both in
 * the colour of their flavour; three pink sparks link them.
 */
export function quarkPairs(kit: Kit, o: PairOptions) {
  const random = rng(o.seed ?? 31);
  const sides = [-1, -0.5, 0, 0.5, 1];
  const flavors = [PALETTE.up, PALETTE.down, PALETTE.up, PALETTE.down, "#b98cff"];
  const position: number[] = [];
  const axis: number[] = [];
  const side: number[] = [];
  const seed: number[] = [];
  const color: number[] = [];
  const v = new THREE.Vector3();
  const w = new THREE.Vector3();
  const inner = o.inner ?? 0;
  for (let i = 0; i < o.count; i++) {
    direction(random, v).multiplyScalar(inner + (o.radius - inner) * Math.cbrt(random()));
    direction(random, w);
    const s = random();
    const c = rgb(flavors[Math.floor(random() * flavors.length)]);
    for (const k of sides) {
      position.push(v.x, v.y, v.z);
      axis.push(w.x, w.y, w.z);
      side.push(k);
      seed.push(s);
      color.push(...c);
    }
  }
  const geometry = kit.geometry(new THREE.BufferGeometry());
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(position, 3));
  geometry.setAttribute("aAxis", new THREE.Float32BufferAttribute(axis, 3));
  geometry.setAttribute("aSide", new THREE.Float32BufferAttribute(side, 1));
  geometry.setAttribute("aSeed", new THREE.Float32BufferAttribute(seed, 1));
  geometry.setAttribute("aColor", new THREE.Float32BufferAttribute(color, 3));
  const material = kit.track(
    new THREE.ShaderMaterial({
      vertexShader: pairVertex,
      fragmentShader: pairFragment,
      uniforms: {
        uTime: TIME,
        uRate: { value: o.rate ?? 0.45 },
        uSep: { value: o.separation },
        uSize: { value: o.size },
        uPx: PX_SCALE,
        uMaxPx: { value: o.maxPx ?? 40 },
        uSpark: { value: new THREE.Color(PALETTE.gluon) },
        uOpacity: { value: o.opacity ?? 1 },
        uEnv: o.env ? kit.envUniform : { value: 1 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  return points;
}

/* ------------------------------------------------------------------ */
/* Radial field lines                                                    */
/* ------------------------------------------------------------------ */

const rayVertex = /* glsl */ `
attribute float aR;
attribute float aSeed;
varying float vR;
varying float vSeed;
void main() {
  vR = aR;
  vSeed = aSeed;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const rayFragment = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
uniform float uEnv;
uniform float uTime;
uniform float uInner;
uniform float uOuter;
uniform float uFall;
varying float vR;
varying float vSeed;
void main() {
  float a = smoothstep(uInner, uInner * 1.8 + 0.05, vR) * (1.0 - smoothstep(uOuter * 0.55, uOuter, vR));
  a *= 1.0 / (1.0 + vR / uFall);
  a *= 0.75 + 0.25 * sin(uTime * 1.3 + vSeed * 30.0);
  gl_FragColor = vec4(uColor, a * uOpacity * uEnv);
}`;

/**
 * Faint radial field lines around a charge (one draw call, 1 px lines).
 */
export function radialLines(
  kit: Kit,
  o: { count: number; inner: number; outer: number; fall: number; color: ColorLike; opacity?: number; env?: boolean; seed?: number },
) {
  const random = rng(o.seed ?? 71);
  const positions: number[] = [];
  const radii: number[] = [];
  const seeds: number[] = [];
  const v = new THREE.Vector3();
  const steps = 24;
  // Fibonacci sphere directions: evenly spread, like field lines of a point charge.
  for (let i = 0; i < o.count; i++) {
    const y = 1 - ((i + 0.5) / o.count) * 2;
    const r = Math.sqrt(1 - y * y);
    const a = i * 2.39996323 + random() * 0.3;
    v.set(Math.cos(a) * r, y, Math.sin(a) * r);
    const s = random();
    for (let k = 0; k < steps; k++) {
      const r0 = o.inner * Math.pow(o.outer / o.inner, k / steps);
      const r1 = o.inner * Math.pow(o.outer / o.inner, (k + 1) / steps);
      positions.push(v.x * r0, v.y * r0, v.z * r0, v.x * r1, v.y * r1, v.z * r1);
      radii.push(r0, r1);
      seeds.push(s, s);
    }
  }
  const geometry = kit.geometry(new THREE.BufferGeometry());
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("aR", new THREE.Float32BufferAttribute(radii, 1));
  geometry.setAttribute("aSeed", new THREE.Float32BufferAttribute(seeds, 1));
  const material = kit.track(
    new THREE.ShaderMaterial({
      vertexShader: rayVertex,
      fragmentShader: rayFragment,
      uniforms: {
        uColor: { value: new THREE.Color(o.color) },
        uOpacity: { value: o.opacity ?? 1 },
        uEnv: o.env ? kit.envUniform : { value: 1 },
        uTime: TIME,
        uInner: { value: o.inner },
        uOuter: { value: o.outer },
        uFall: { value: o.fall },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  const lines = new THREE.LineSegments(geometry, material);
  lines.frustumCulled = false;
  return lines;
}

/* ------------------------------------------------------------------ */
/* Nucleus packing (shared by the nucleus and the proton's surroundings) */
/* ------------------------------------------------------------------ */

/** Nucleus layout, in nucleus units (set in `data/matter.ts`). */
export interface NucleusLayout {
  /** Nucleon radius (0.84 fm). */
  radius: number;
  /** Largest distance of a nucleon centre from the middle (1.2 A^⅓ fm − radius). */
  extent: number;
  /** Centre of the proton the visitor dives into. */
  anchor: V3;
  /** Centres of the proton and neutron pointed at by hotspots. */
  proton: V3;
  neutron: V3;
}

export interface Packing {
  positions: THREE.Vector3[];
  protons: boolean[];
}

/**
 * A deterministic, tightly packed arrangement of Z protons and N neutrons.
 * Index 0 is the anchored proton, 1 the hotspot proton, 2 the hotspot neutron.
 */
export function packNucleus(Z: number, N: number, layout: NucleusLayout): Packing {
  const random = rng(Z * 131 + N * 7 + 3);
  const total = Z + N;
  const positions: THREE.Vector3[] = [
    new THREE.Vector3(...layout.anchor),
    new THREE.Vector3(...layout.proton),
    new THREE.Vector3(...layout.neutron),
  ];
  const fixed = [true, true, true];
  const v = new THREE.Vector3();
  while (positions.length < total) {
    positions.push(direction(random, v.clone()).multiplyScalar(layout.extent * 0.85 * Math.cbrt(random())));
    fixed.push(false);
  }
  // Types: two pinned protons, one pinned neutron, the rest shuffled.
  const rest: boolean[] = [];
  for (let k = 0; k < Z - 2; k++) rest.push(true);
  for (let k = 0; k < N - 1; k++) rest.push(false);
  for (let k = rest.length - 1; k > 0; k--) {
    const j = Math.floor(random() * (k + 1));
    [rest[k], rest[j]] = [rest[j], rest[k]];
  }
  const protons = [true, true, false, ...rest];
  // Relax: no deep overlaps, stay inside the nucleus, gently gather in.
  const dmin = layout.radius * 2 * 0.93;
  const d = new THREE.Vector3();
  for (let iteration = 0; iteration < 360; iteration++) {
    for (let i = 0; i < total; i++)
      for (let j = i + 1; j < total; j++) {
        d.subVectors(positions[j], positions[i]);
        const dist = d.length();
        if (dist >= dmin) continue;
        if (dist < 1e-6) d.set(random() - 0.5, random() - 0.5, random() - 0.5);
        d.normalize().multiplyScalar(dmin - dist);
        if (fixed[i] && fixed[j]) continue;
        if (fixed[i]) positions[j].add(d);
        else if (fixed[j]) positions[i].sub(d);
        else {
          positions[j].addScaledVector(d, 0.5);
          positions[i].addScaledVector(d, -0.5);
        }
      }
    const gather = iteration < 300 ? 0.985 : 1;
    for (let i = 0; i < total; i++) {
      if (fixed[i]) continue;
      const p = positions[i];
      p.multiplyScalar(gather);
      const length = p.length();
      if (length > layout.extent) p.multiplyScalar(layout.extent / length);
    }
  }
  return { positions, protons };
}

/** Gentle thermal-looking jiggle of nucleon `i` (same in every scene). */
export function jiggle(i: number, time: number, amplitude: number, out: THREE.Vector3) {
  const h = (k: number) => hash(i * 7.31 + k * 1.93);
  return out
    .set(
      Math.sin(time * (1.3 + h(1) * 1.2) + h(2) * 6.28),
      Math.sin(time * (1.1 + h(3) * 1.3) + h(4) * 6.28),
      Math.sin(time * (1.5 + h(5) * 1.1) + h(6) * 6.28),
    )
    .multiplyScalar(amplitude);
}
