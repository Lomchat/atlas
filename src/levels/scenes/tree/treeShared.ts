/**
 * Shared shapes for the tree journey scenes owned by tree.ts, leaf.ts,
 * leafSection.ts and leafCell.ts: tapered tubes, the leaf outline, leaf cards
 * and a wind deformation that can be injected into kit.toon materials.
 */
import * as THREE from "three";

/** Leaf greens shared by the tree canopy, the leaf and its tissues. */
export const GREENS = {
  deep: "#237a45",
  dark: "#2f9a4a",
  mid: "#45b34e",
  bright: "#62c952",
  light: "#8fdc5c",
  lime: "#b9ec6a",
  vein: "#d6f58a",
} as const;

/**
 * Leaf frame layout (leaf.ts, 1 unit = 1 cm). The blade lies in the XZ plane,
 * its upper surface facing +Y; the twig comes from the far side (−Z) and the
 * tip points along LEAF_AXIS, towards the viewer and to the right.
 */
export const LEAF_ANGLE = (28 * Math.PI) / 180;
export const LEAF_AXIS = new THREE.Vector3(Math.cos(LEAF_ANGLE), 0, Math.sin(LEAF_ANGLE));
/** Across the blade, towards the near (+Z) half. */
export const LEAF_SIDE = new THREE.Vector3(-Math.sin(LEAF_ANGLE), 0, Math.cos(LEAF_ANGLE));
/** Blade from u = BASE to u = TIP along the axis (cm). */
export const LEAF_BASE = -3.7;
export const LEAF_TIP = 4.5;
export const LEAF_HALF_WIDTH = 2.5;
/** Where the petiole meets the twig. */
export const LEAF_NODE = new THREE.Vector3(-5.35, -0.75, -3.2);
/** The twig carrying the leaf, base first (the base leaves the frame, towards the tree). */
export const LEAF_TWIG = [
  new THREE.Vector3(-9.6, -1.5, -12.5),
  new THREE.Vector3(-7.6, -1.1, -7.6),
  LEAF_NODE,
  new THREE.Vector3(-5.1, -0.6, -1.0),
  new THREE.Vector3(-5.9, -0.45, 0.9),
];

/** Other leaves of the same spray, in leaf units: petiole node, tip direction, face normal, length. */
export interface NeighbourLeaf {
  node: [number, number, number];
  tip: [number, number, number];
  face: [number, number, number];
  length: number;
  tone: number;
}
export const NEIGHBOURS: NeighbourLeaf[] = [
  // On the same twig, towards its base (top left).
  { node: [-8.2, -1.25, -9.2], tip: [1, -0.15, -0.3], face: [0.1, 1, 0.35], length: 9.2, tone: 1 },
  { node: [-8.6, -1.3, -10.4], tip: [-1, -0.2, 0.1], face: [0, 1, 0.3], length: 8.6, tone: 2 },
  { node: [-6.6, -1.4, -5.6], tip: [-0.75, -0.35, 1], face: [-0.2, 1, 0.2], length: 8.2, tone: 1 },
  // A second twig behind, on the right.
  { node: [3.5, -2.6, -12.8], tip: [0.75, -0.1, 0.45], face: [0.1, 1, 0.1], length: 9.6, tone: 0 },
  { node: [2.8, -2.4, -12.2], tip: [-0.2, -0.1, -1], face: [0, 1, 0.1], length: 9.2, tone: 1 },
  { node: [5.5, -3.2, -9.6], tip: [0.75, -0.3, 0.85], face: [-0.15, 1, 0.25], length: 8.6, tone: 0 },
  // Lower leaves, deeper in the shade.
  { node: [-10.5, -3.6, 3.5], tip: [0.45, -0.25, 1], face: [0.1, 1, 0.25], length: 9, tone: 0 },
  { node: [8.2, -4.6, 2.2], tip: [0.35, -0.2, 1], face: [-0.2, 1, 0.1], length: 9.4, tone: 0 },
  { node: [-10.5, -3.5, 11.5], tip: [0.6, -0.2, 0.8], face: [0.1, 1, 0.2], length: 10, tone: 1 },
  { node: [2.5, -6.5, 12.5], tip: [-0.2, -0.3, 1], face: [0, 1, 0.3], length: 9, tone: 1 },
  // Further round the spray (seen from the tree).
  { node: [-18, -2.5, -14], tip: [-1, -0.2, 0.6], face: [0.1, 1, 0.3], length: 9.5, tone: 2 },
  { node: [-2, -1.8, -24], tip: [0.3, 0.1, -1], face: [0, 1, 0.2], length: 9, tone: 2 },
  { node: [12, -3, -16], tip: [1, -0.1, 0.2], face: [0, 1, 0.3], length: 9.8, tone: 1 },
  { node: [-19, -4, 6], tip: [-0.8, -0.3, 0.6], face: [0.2, 1, 0.3], length: 8.8, tone: 1 },
  { node: [17, -5, -2], tip: [0.9, -0.3, 0.5], face: [-0.2, 1, 0.3], length: 9.2, tone: 2 },
];
/** A second twig carrying NEIGHBOURS 4–6, base first. */
export const SECOND_TWIG = [
  new THREE.Vector3(-1.5, -2.2, -22),
  new THREE.Vector3(1.4, -2.4, -15),
  new THREE.Vector3(3.2, -2.55, -12.5),
  new THREE.Vector3(5.3, -3.1, -9.8),
  new THREE.Vector3(6.2, -3.3, -8.2),
];

/** Ovate half-width profile, t = 0 at the blade base, 1 at the tip (0–1). */
export function ovate(t: number) {
  const x = Math.min(1, Math.max(0, t));
  // Rounded base, widest near 38 %, long drawn-out acuminate tip.
  const body = Math.pow(Math.sin(Math.PI * Math.pow(x, 0.78)), 0.85);
  const tip = 1 - Math.pow(x, 5) * 0.35;
  return body * tip;
}

/** Gentle forward-pointing serration (0 at a sinus, 1 at a tooth point). */
export function serration(t: number, teeth: number) {
  const s = (t * teeth) % 1;
  return s < 0.78 ? s / 0.78 : 1 - (s - 0.78) / 0.22;
}

/** A tube along a Catmull–Rom spine with a varying radius (position, normal, color). */
export function taperedTube(
  points: THREE.Vector3[],
  radius: (t: number) => number,
  options: { segments?: number; radial?: number; color?: THREE.Color; colorEnd?: THREE.Color; cap?: boolean } = {},
) {
  const segments = options.segments ?? Math.max(8, points.length * 6);
  const radial = options.radial ?? 8;
  const curve = new THREE.CatmullRomCurve3(points, false, "centripetal");
  const frames = curve.computeFrenetFrames(segments, false);
  const positions: number[] = [];
  const normals: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const c0 = options.color ?? new THREE.Color(1, 1, 1);
  const c1 = options.colorEnd ?? c0;
  const c = new THREE.Color();
  const p = new THREE.Vector3();
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    curve.getPointAt(t, p);
    const r = radius(t);
    const N = frames.normals[i];
    const B = frames.binormals[i];
    c.copy(c0).lerp(c1, t);
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      const nx = Math.cos(a) * N.x + Math.sin(a) * B.x;
      const ny = Math.cos(a) * N.y + Math.sin(a) * B.y;
      const nz = Math.cos(a) * N.z + Math.sin(a) * B.z;
      positions.push(p.x + r * nx, p.y + r * ny, p.z + r * nz);
      normals.push(nx, ny, nz);
      colors.push(c.r, c.g, c.b);
    }
  }
  for (let i = 0; i < segments; i++)
    for (let j = 0; j < radial; j++) {
      const a = i * (radial + 1) + j;
      const b = a + radial + 1;
      indices.push(a, a + 1, b, b, a + 1, b + 1);
    }
  if (options.cap) {
    const T = frames.tangents[segments];
    curve.getPointAt(1, p);
    const center = positions.length / 3;
    positions.push(p.x + T.x * radius(1) * 0.6, p.y + T.y * radius(1) * 0.6, p.z + T.z * radius(1) * 0.6);
    normals.push(T.x, T.y, T.z);
    colors.push(c1.r, c1.g, c1.b);
    const ring = segments * (radial + 1);
    for (let j = 0; j < radial; j++) indices.push(ring + j + 1, ring + j, center);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  return geometry;
}

/**
 * A small leaf card: base at the origin, tip at +Y (length 1), lying in the XY
 * plane with a slight fold along the midrib (normal ≈ +Z). Position, normal, color.
 */
export function leafCard(options: { steps?: number; fold?: number; width?: number } = {}) {
  const steps = options.steps ?? 5;
  const fold = options.fold ?? 0.12;
  const width = options.width ?? 0.3;
  const positions: number[] = [];
  const indices: number[] = [];
  // Midrib vertices, then left and right margin vertices per step.
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const w = ovate(t) * width;
    const bend = -0.08 * t * t;
    positions.push(0, t, fold * 0.5 + bend);
    positions.push(-w, t - w * 0.25, bend);
    positions.push(w, t - w * 0.25, bend);
  }
  for (let i = 0; i < steps; i++) {
    const m = i * 3;
    const n = m + 3;
    indices.push(m, m + 1, n + 1, m, n + 1, n);
    indices.push(m, n, n + 2, m, n + 2, m + 2);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const count = positions.length / 3;
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(new Array(count * 3).fill(1), 3));
  return geometry;
}

export interface WindUniforms {
  uWindTime: { value: number };
  uWindAmp: { value: number };
  uRustle: { value: number };
  uPivotY: { value: number };
  uStill: { value: THREE.Vector3 };
  uStillR: { value: THREE.Vector2 };
}

export function windUniforms(still: THREE.Vector3, inner: number, outer: number, pivotY: number): WindUniforms {
  return {
    uWindTime: { value: 0 },
    uWindAmp: { value: 0.002 },
    uRustle: { value: 0 },
    uPivotY: { value: pivotY },
    uStill: { value: still.clone() },
    uStillR: { value: new THREE.Vector2(inner, outer) },
  };
}

/**
 * Inject a gentle wind bend (and optional leafy rustle) into a kit.toon
 * material. Geometry near `uStill` does not move, so a child anchored there
 * stays on its support. Positions are in the mesh's local frame.
 */
export function addWind(material: THREE.Material, wind: WindUniforms, rustle = 0) {
  const shader = material as THREE.ShaderMaterial;
  shader.uniforms = {
    ...shader.uniforms,
    ...wind,
    uRustle: { value: rustle },
  };
  shader.vertexShader = shader.vertexShader
    .replace(
      "varying vec3 vN;",
      /* glsl */ `varying vec3 vN;
uniform float uWindTime;
uniform float uWindAmp;
uniform float uRustle;
uniform float uPivotY;
uniform vec3 uStill;
uniform vec2 uStillR;
vec3 windOffset(vec3 p) {
  float h = max(p.y - uPivotY, 0.0);
  float t = uWindTime;
  vec3 o = vec3(
    sin(t * 0.83 + p.y * 0.12) + 0.3 * sin(t * 1.9 + p.x * 0.5),
    0.0,
    0.4 * sin(t * 0.61 + 1.3 + p.x * 0.2)) * (uWindAmp * h * h);
  o += uRustle * vec3(
    sin(t * 2.3 + p.x * 3.1 + p.z * 2.3),
    0.6 * sin(t * 2.9 + p.y * 2.7 + p.x),
    sin(t * 2.1 + p.z * 3.3 + p.y * 1.7));
  return o * smoothstep(uStillR.x, uStillR.y, distance(p, uStill));
}`,
    )
    .replace(
      "#include <project_vertex>",
      /* glsl */ `vec4 mvPosition = vec4(transformed, 1.0);
#ifdef USE_INSTANCING
  mvPosition = instanceMatrix * mvPosition;
#endif
  mvPosition.xyz += windOffset(mvPosition.xyz);
  mvPosition = modelViewMatrix * mvPosition;
  gl_Position = projectionMatrix * mvPosition;`,
    );
  shader.needsUpdate = true;
  return material;
}

/**
 * Replace the kit's default violet-grey shadow with a tinted one computed from
 * the base colour (keeps foliage and tissues saturated in their shadows).
 */
export function tintShadow(material: THREE.Material, multiply: [number, number, number], tint: [number, number, number], mix = 0.25) {
  const shader = material as THREE.ShaderMaterial;
  const f = (v: number) => v.toFixed(3);
  shader.fragmentShader = shader.fragmentShader.replace(
    "mix(base * vec3(0.5, 0.48, 0.66), vec3(0.17, 0.1, 0.4), 0.3)",
    `mix(base * vec3(${multiply.map(f).join(", ")}), vec3(${tint.map(f).join(", ")}), ${f(mix)})`,
  );
  shader.needsUpdate = true;
  return material;
}
