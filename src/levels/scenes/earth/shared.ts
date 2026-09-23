/**
 * Shared helpers for the Earth journey (rocky planets → landscape):
 * sun-lit planet and atmosphere shaders, a vector-map ground shader with soft
 * edges, starfields and a helper that reads the level's on-screen scale.
 *
 * The kit's toon material is lit from a fixed view-space direction; planets
 * need light coming from the Sun instead, so they use the small shaders below
 * (still flat, illustrated tones with a violet night side and a rim light).
 */
import * as THREE from "three";
import type { Kit } from "../../../engine/kit";
import { rng } from "../../../engine/kit";

/** Direction of the Sun in the earth-moon frame (the Earth–Moon orbital plane is XZ). */
export const SUN_EARTH_MOON = new THREE.Vector3(-0.866, 0, 0.5).normalize();
/**
 * Direction of the Sun in the Earth's own frame (north = +Y). The Earth's axis
 * is tilted 23.4° towards the Sun: northern summer, so Europe is well lit.
 * Must stay consistent with the `earth` anchor rotation in cosmos.ts.
 */
export const SUN_EARTH = new THREE.Vector3(-0.7946, 0.3978, 0.4587).normalize();

/** Local units visible across the smaller side of the viewport (reads the engine's holder matrix). */
export function viewExtent(root: THREE.Object3D) {
  const holder = root.parent;
  if (!holder) return 15;
  const e = holder.matrix.elements;
  const scale = Math.hypot(e[0], e[1], e[2]);
  return scale > 0 ? 10 / scale : 15;
}

const planetVertex = /* glsl */ `
varying vec3 vObjN;
varying vec3 vN;
varying vec3 vView;
varying vec2 vUv;
varying vec3 vSunView;
uniform vec3 uSun;
void main() {
  vUv = uv;
  vObjN = normal;
  vN = normalize(normalMatrix * normal);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vView = -mv.xyz;
  vSunView = normalize((modelViewMatrix * vec4(uSun, 0.0)).xyz);
  gl_Position = projectionMatrix * mv;
}`;

const planetFragment = /* glsl */ `
uniform vec3 uColor;
uniform vec3 uSun;
uniform vec3 uNight;
uniform vec3 uTwilight;
uniform vec3 uRimColor;
uniform float uRim;
uniform float uSpec;
uniform float uOpacity;
uniform float uEnv;
uniform float uLightsOn;
#ifdef USE_PLANET_MAP
uniform sampler2D map;
#endif
#ifdef USE_PLANET_LIGHTS
uniform sampler2D lightsMap;
#endif
varying vec3 vObjN;
varying vec3 vN;
varying vec3 vView;
varying vec2 vUv;
varying vec3 vSunView;
void main() {
  vec3 base = uColor;
  #ifdef USE_PLANET_MAP
    base *= texture2D(map, vUv).rgb;
  #endif
  float ndl = dot(normalize(vObjN), uSun);
  float day = smoothstep(-0.1, 0.16, ndl);
  vec3 dayCol = base * mix(0.86, 1.04, smoothstep(0.05, 0.75, ndl));
  vec3 nightCol = mix(base * vec3(0.3, 0.27, 0.55), uNight, 0.78);
  vec3 n = normalize(vN);
  vec3 v = normalize(vView);
  float ocean = 0.0;
  #ifdef USE_PLANET_LIGHTS
    vec4 extra = texture2D(lightsMap, vUv);
    ocean = extra.g;
    float night = 1.0 - smoothstep(-0.22, 0.04, ndl);
    nightCol = mix(nightCol, vec3(1.0, 0.84, 0.45), clamp(extra.r * 1.3, 0.0, 1.0) * night * uLightsOn);
  #endif
  vec3 col = mix(nightCol, dayCol, day);
  float twilight = exp(-pow((ndl + 0.03) / 0.06, 2.0));
  col = mix(col, uTwilight, twilight * 0.18);
  // Soft illustrated sun glint on the oceans.
  vec3 r = reflect(-vSunView, n);
  float glint = smoothstep(0.972, 0.99, dot(r, v)) * ocean * day * uSpec;
  col = mix(col, vec3(0.8, 0.93, 1.0), glint * 0.45);
  float fres = 1.0 - clamp(dot(n, v), 0.0, 1.0);
  float rim = smoothstep(0.45, 1.0, fres) * uRim;
  col = mix(col, uRimColor, rim * (0.45 + 0.55 * smoothstep(-0.3, 0.3, ndl)));
  gl_FragColor = vec4(col, uOpacity * uEnv);
}`;

export interface PlanetOptions {
  color?: THREE.ColorRepresentation;
  map?: THREE.Texture;
  /** Texture with city lights (red) and an ocean mask (green). */
  lights?: THREE.Texture;
  /** Direction of the Sun in the mesh's object space. */
  sun: THREE.Vector3;
  night?: THREE.ColorRepresentation;
  twilight?: THREE.ColorRepresentation;
  rimColor?: THREE.ColorRepresentation;
  rim?: number;
  spec?: number;
  env?: boolean;
  opacity?: number;
}

/** A planet lit by the Sun: flat day colours, violet night side, warm terminator, rim light. */
export function planetMaterial(kit: Kit, options: PlanetOptions) {
  const defines: Record<string, string> = {};
  const uniforms: Record<string, THREE.IUniform> = {
    uColor: { value: new THREE.Color(options.color ?? 0xffffff) },
    uSun: { value: options.sun.clone().normalize() },
    uNight: { value: new THREE.Color(options.night ?? "#2a1d6b") },
    uTwilight: { value: new THREE.Color(options.twilight ?? "#ff8a5c") },
    uRimColor: { value: new THREE.Color(options.rimColor ?? "#9fd8ff") },
    uRim: { value: options.rim ?? 0.6 },
    uSpec: { value: options.spec ?? 0 },
    uOpacity: { value: options.opacity ?? 1 },
    uEnv: options.env ? kit.envUniform : { value: 1 },
    uLightsOn: { value: 1 },
  };
  if (options.map) {
    defines.USE_PLANET_MAP = "";
    uniforms.map = { value: options.map };
  }
  if (options.lights) {
    defines.USE_PLANET_LIGHTS = "";
    uniforms.lightsMap = { value: options.lights };
  }
  return kit.track(
    new THREE.ShaderMaterial({
      vertexShader: planetVertex,
      fragmentShader: planetFragment,
      uniforms,
      defines,
      transparent: !!options.env || (options.opacity ?? 1) < 1,
    }),
  );
}

const atmosphereFragment = /* glsl */ `
uniform vec3 uColor;
uniform vec3 uSun;
uniform float uOpacity;
uniform float uPower;
uniform float uEdge;
uniform float uEnv;
uniform float uNightFloor;
varying vec3 vObjN;
varying vec3 vN;
varying vec3 vView;
varying vec2 vUv;
varying vec3 vSunView;
void main() {
  vec3 n = normalize(vN);
  vec3 v = normalize(vView);
  float facing = clamp(abs(dot(n, v)) / uEdge, 0.0, 1.0);
  float a = pow(facing, uPower);
  float day = smoothstep(-0.45, 0.35, dot(normalize(vObjN), uSun));
  gl_FragColor = vec4(uColor, a * uOpacity * mix(uNightFloor, 1.0, day) * uEnv);
}`;

/**
 * Outer atmosphere glow: put it on a back-side sphere `shell` times the planet
 * radius. Brightest just outside the limb, fading outwards, dimmer at night.
 */
export function atmosphereMaterial(
  kit: Kit,
  options: {
    color: THREE.ColorRepresentation;
    sun: THREE.Vector3;
    shell: number;
    opacity?: number;
    power?: number;
    nightFloor?: number;
    env?: boolean;
  },
) {
  const edge = Math.sqrt(Math.max(0.01, 1 - 1 / (options.shell * options.shell)));
  return kit.track(
    new THREE.ShaderMaterial({
      vertexShader: planetVertex,
      fragmentShader: atmosphereFragment,
      uniforms: {
        uColor: { value: new THREE.Color(options.color) },
        uSun: { value: options.sun.clone().normalize() },
        uOpacity: { value: options.opacity ?? 0.9 },
        uPower: { value: options.power ?? 2.2 },
        uEdge: { value: edge },
        uNightFloor: { value: options.nightFloor ?? 0.25 },
        uEnv: options.env ? kit.envUniform : { value: 1 },
      },
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
}

const groundVertex = /* glsl */ `
#include <common>
#include <color_pars_vertex>
varying vec2 vXZ;
void main() {
  #include <color_vertex>
  vXZ = position.xz;
  #include <begin_vertex>
  #include <project_vertex>
}`;

const groundFragment = /* glsl */ `
uniform float uEnv;
uniform vec2 uCore;
uniform vec2 uFar;
uniform float uOpacity;
uniform vec3 uColor;
#include <color_pars_fragment>
varying vec2 vXZ;
void main() {
  vec3 col = uColor;
  #if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
    col *= vColor.rgb;
  #endif
  float r = length(vXZ);
  float core = 1.0 - smoothstep(uCore.x, uCore.y, r);
  float far = 1.0 - smoothstep(uFar.x, uFar.y, r);
  float a = max(core, uEnv * far);
  gl_FragColor = vec4(col, a * uOpacity);
}`;

/**
 * Flat map colours for vector ground layers. Seen from the parent level only
 * the core disc shows (soft edge between `core[0]` and `core[1]`); once the
 * visitor is inside, the surroundings extend to the `far` radius.
 *
 * Ground layers are painted in order (`layer`, then triangle order) without
 * depth testing, like a 2D map: no z-fighting at any zoom. Anything standing
 * on the ground must therefore be drawn after it: use `standing()` materials.
 */
export function groundMaterial(
  kit: Kit,
  options: {
    core: [number, number];
    far: [number, number];
    layer: number;
    color?: THREE.ColorRepresentation;
    vertexColors?: boolean;
    opacity?: number;
  },
) {
  return kit.track(
    new THREE.ShaderMaterial({
      vertexShader: groundVertex,
      fragmentShader: groundFragment,
      uniforms: {
        uEnv: kit.envUniform,
        uCore: { value: new THREE.Vector2(...options.core) },
        uFar: { value: new THREE.Vector2(...options.far) },
        uOpacity: { value: options.opacity ?? 1 },
        uColor: { value: new THREE.Color(options.color ?? 0xffffff) },
      },
      vertexColors: options.vertexColors ?? false,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    }),
  );
}

/** A mesh for a ground layer, painted in layer order before the 3D props. */
export function groundMesh(geometry: THREE.BufferGeometry, material: THREE.Material, layer: number) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.renderOrder = layer;
  mesh.frustumCulled = false;
  return mesh;
}

/** Render order for 3D props standing on a painted ground (use with `transparent: true` materials). */
export const STANDING = 100;

/**
 * Accumulates flat, coloured polygons (convex fans or strips) into one
 * geometry, so a whole map layer is a single draw call.
 */
export class FlatBuilder {
  readonly positions: number[] = [];
  readonly colors: number[] = [];
  private readonly color = new THREE.Color();

  constructor(readonly y = 0) {}

  /** A convex polygon (x, z pairs), triangulated as a fan. */
  polygon(points: ArrayLike<number>, color: THREE.ColorRepresentation) {
    this.color.set(color);
    const n = points.length / 2;
    let cx = 0,
      cz = 0;
    for (let i = 0; i < n; i++) (cx += points[i * 2]), (cz += points[i * 2 + 1]);
    cx /= n;
    cz /= n;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      this.tri(cx, cz, points[j * 2], points[j * 2 + 1], points[i * 2], points[i * 2 + 1]);
    }
  }

  /** A ribbon along a polyline (x, z pairs) with a width per point. */
  ribbon(points: ArrayLike<number>, width: number | ((t: number, i: number) => [number, number]), color: THREE.ColorRepresentation) {
    this.color.set(color);
    const n = points.length / 2;
    let previousL: [number, number] | null = null;
    let previousR: [number, number] | null = null;
    for (let i = 0; i < n; i++) {
      const a = Math.max(0, i - 1);
      const b = Math.min(n - 1, i + 1);
      let tx = points[b * 2] - points[a * 2];
      let tz = points[b * 2 + 1] - points[a * 2 + 1];
      const len = Math.hypot(tx, tz) || 1;
      tx /= len;
      tz /= len;
      const [wl, wr] = typeof width === "number" ? [width / 2, width / 2] : width(i / (n - 1), i);
      const x = points[i * 2];
      const z = points[i * 2 + 1];
      // Left normal of the direction (tx, tz) in the XZ plane seen from above (+Y).
      const L: [number, number] = [x + tz * wl, z - tx * wl];
      const R: [number, number] = [x - tz * wr, z + tx * wr];
      if (previousL && previousR) {
        this.tri(previousL[0], previousL[1], L[0], L[1], previousR[0], previousR[1]);
        this.tri(previousR[0], previousR[1], L[0], L[1], R[0], R[1]);
      }
      previousL = L;
      previousR = R;
    }
  }

  /** A filled disc / ellipse. */
  ellipse(x: number, z: number, rx: number, rz: number, color: THREE.ColorRepresentation, segments = 24, rotation = 0) {
    const pts: number[] = [];
    const c = Math.cos(rotation),
      s = Math.sin(rotation);
    for (let i = 0; i < segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      const px = Math.cos(a) * rx;
      const pz = Math.sin(a) * rz;
      pts.push(x + px * c - pz * s, z + px * s + pz * c);
    }
    this.polygon(pts, color);
  }

  /** An organic blob outline (for lakes, forests, towns). */
  blob(x: number, z: number, radius: number, color: THREE.ColorRepresentation, seed: number, wobble = 0.25, segments = 40, stretch = 1, rotation = 0) {
    const pts = blobOutline(x, z, radius, seed, wobble, segments, stretch, rotation);
    this.polygon(pts, color);
    return pts;
  }

  tri(ax: number, az: number, bx: number, bz: number, cx: number, cz: number) {
    const y = this.y;
    // Keep triangles facing up (+Y).
    const cross = (bx - ax) * (cz - az) - (bz - az) * (cx - ax);
    if (cross > 0) this.positions.push(ax, y, az, cx, y, cz, bx, y, bz);
    else this.positions.push(ax, y, az, bx, y, bz, cx, y, cz);
    const { r, g, b } = this.color;
    this.colors.push(r, g, b, r, g, b, r, g, b);
  }

  build(kit: Kit) {
    const geometry = kit.geometry(new THREE.BufferGeometry());
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(this.positions, 3));
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(this.colors, 3));
    geometry.setAttribute("normal", new THREE.Float32BufferAttribute(new Float32Array(this.positions.length).map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
    return geometry;
  }
}

/** An organic closed outline around (x, z), as x, z pairs. */
export function blobOutline(x: number, z: number, radius: number, seed: number, wobble = 0.25, segments = 40, stretch = 1, rotation = 0) {
  const random = rng(seed);
  const harmonics = [1, 2, 3, 5].map((k) => ({ k, a: (random() - 0.5) * wobble * (1.6 / k), p: random() * Math.PI * 2 }));
  const pts: number[] = [];
  const c = Math.cos(rotation),
    s = Math.sin(rotation);
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    let r = 1;
    for (const h of harmonics) r += h.a * Math.sin(h.k * a + h.p);
    const px = Math.cos(a) * radius * r * stretch;
    const pz = Math.sin(a) * radius * r;
    pts.push(x + px * c - pz * s, z + px * s + pz * c);
  }
  return pts;
}

/** Is (x, z) inside a closed outline of x, z pairs? */
export function insideOutline(outline: ArrayLike<number>, x: number, z: number) {
  let inside = false;
  const n = outline.length / 2;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = outline[i * 2],
      zi = outline[i * 2 + 1];
    const xj = outline[j * 2],
      zj = outline[j * 2 + 1];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

/** Distance from (x, z) to a polyline of x, z pairs. */
export function distanceToPolyline(line: ArrayLike<number>, x: number, z: number) {
  let best = Infinity;
  const n = line.length / 2;
  for (let i = 0; i + 1 < n; i++) {
    const ax = line[i * 2],
      az = line[i * 2 + 1];
    const bx = line[i * 2 + 2],
      bz = line[i * 2 + 3];
    const dx = bx - ax,
      dz = bz - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
    best = Math.min(best, Math.hypot(x - ax - t * dx, z - az - t * dz));
  }
  return best;
}

/** Sample a smooth curve through control points (x, z pairs) into a dense polyline. */
export function smoothLine(control: [number, number][], samples: number) {
  const curve = new THREE.CatmullRomCurve3(control.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, "centripetal");
  const out: number[] = [];
  for (const p of curve.getSpacedPoints(samples)) out.push(p.x, p.z);
  return out;
}

/** A soft radial disc texture (white centre, transparent edge). */
export function softDiscTexture(kit: Kit, color = "255,255,255", falloff = [0, 0.5, 1]) {
  return kit.canvasTexture(128, 128, (g, w, h) => {
    const gradient = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    gradient.addColorStop(falloff[0], `rgba(${color},1)`);
    gradient.addColorStop(falloff[1], `rgba(${color},0.55)`);
    gradient.addColorStop(falloff[2], `rgba(${color},0)`);
    g.fillStyle = gradient;
    g.fillRect(0, 0, w, h);
  });
}
