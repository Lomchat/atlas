/**
 * Layered blocks for the skin cut-aways (`skin`, `epidermis`): closed slabs
 * between two height fields, with a per-vertex "layer" attribute used to
 * paint the strata of the epidermis on the cut faces.
 */
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Kit } from "../../../engine/kit";
import { patchToon } from "./skinShaders";

export type Height = (x: number, z: number) => number;
export interface Bounds {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
}

/** A grid surface; `at(u, v)` returns a position and the two layer distances. */
export function grid(
  nu: number,
  nv: number,
  at: (u: number, v: number) => [number, number, number, number, number],
  outward: THREE.Vector3,
) {
  const positions: number[] = [];
  const layers: number[] = [];
  const index: number[] = [];
  for (let j = 0; j <= nv; j++)
    for (let i = 0; i <= nu; i++) {
      const [x, y, z, depth, height] = at(i / nu, j / nv);
      positions.push(x, y, z);
      layers.push(depth, height);
    }
  for (let j = 0; j < nv; j++)
    for (let i = 0; i < nu; i++) {
      const a = j * (nu + 1) + i;
      index.push(a, a + 1, a + nu + 1, a + 1, a + nu + 2, a + nu + 1);
    }
  const p = (k: number) => new THREE.Vector3(positions[3 * k], positions[3 * k + 1], positions[3 * k + 2]);
  const mid = Math.floor(nv / 2) * (nu + 1) + Math.floor(nu / 2);
  const n = p(mid + 1).sub(p(mid)).cross(p(mid + nu + 1).sub(p(mid)));
  if (n.dot(outward) < 0)
    for (let k = 0; k < index.length; k += 3) [index[k + 1], index[k + 2]] = [index[k + 2], index[k + 1]];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("aLayer", new THREE.Float32BufferAttribute(layers, 2));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return geometry;
}

/** A closed block between two height fields over the footprint of the skin block. */
export function slab(
  bounds: Bounds,
  top: Height,
  bottom: Height,
  options: {
    nx: number;
    nz: number;
    ny: number;
    faces: ("top" | "bottom" | "front" | "back" | "left" | "right")[];
    /** Marker written as the depth of the top face (≤ −1: outer surface; −1 − crest). */
    topMarker?: Height;
    /** Resolution of the top and bottom faces, if different from nx × nz. */
    top?: [number, number];
    bottom?: [number, number];
  },
) {
  const { nx, nz, ny } = options;
  const [tx, tz] = options.top ?? [nx, nz];
  const [bx, bz] = options.bottom ?? [nx, nz];
  const { x0: X0, x1: X1, z0: Z0, z1: Z1 } = bounds;
  const lx = (u: number) => X0 + (X1 - X0) * u;
  const lz = (u: number) => Z0 + (Z1 - Z0) * u;
  const wall = (x: number, z: number, v: number): [number, number, number, number, number] => {
    const t = top(x, z);
    const b = bottom(x, z);
    const y = b + (t - b) * v;
    return [x, y, z, t - y, y - b];
  };
  const parts: THREE.BufferGeometry[] = [];
  for (const face of options.faces) {
    if (face === "top")
      parts.push(grid(tx, tz, (u, v) => { const x = lx(u), z = lz(v), t = top(x, z); return [x, t, z, options.topMarker ? options.topMarker(x, z) : -1, t - bottom(x, z)]; }, new THREE.Vector3(0, 1, 0)));
    if (face === "bottom")
      parts.push(grid(bx, bz, (u, v) => { const x = lx(u), z = lz(v), b = bottom(x, z); return [x, b, z, top(x, z) - b, 0]; }, new THREE.Vector3(0, -1, 0)));
    if (face === "front") parts.push(grid(nx, ny, (u, v) => wall(lx(u), Z1, v), new THREE.Vector3(0, 0, 1)));
    if (face === "back") parts.push(grid(nx, ny, (u, v) => wall(lx(u), Z0, v), new THREE.Vector3(0, 0, -1)));
    if (face === "right") parts.push(grid(nz, ny, (u, v) => wall(X1, lz(u), v), new THREE.Vector3(1, 0, 0)));
    if (face === "left") parts.push(grid(nz, ny, (u, v) => wall(X0, lz(u), v), new THREE.Vector3(-1, 0, 0)));
  }
  const merged = mergeGeometries(parts)!;
  for (const part of parts) part.dispose();
  return merged;
}

/**
 * Epidermis material: colours its strata from the depth below the surface
 * (x of `aLayer`) and the height above the junction (y). A negative depth
 * marks the outer surface, which keeps the colour of skin seen from outside.
 */
export function strataMaterial(
  kit: Kit,
  bands: {
    corneum: number;
    lucidum: number;
    granulosum: number;
    basale: number;
    dim?: number;
    skinTop?: boolean;
    /** Paint the corneum as staggered flat cells: [length, thickness] (units). */
    squames?: [number, number];
  },
) {
  const DIM = (bands.dim ?? 1).toFixed(3);
  const SKIN_TOP = bands.skinTop === false ? "0.0" : "1.0";
  const SQUAMES = bands.squames
    ? `{
    float along0 = vSlab.x + vSlab.z;
    float wave = dep + 0.035 * sin(along0 * 2.3) + 0.02 * sin(along0 * 5.1 + 1.0);
    float sqRow = floor(wave / ${bands.squames[1].toFixed(3)});
    float sqAlong = along0 / ${bands.squames[0].toFixed(3)} + sqRow * 0.47 + 0.2 * sin(sqRow * 3.1);
    float inRow = fract(wave / ${bands.squames[1].toFixed(3)});
    float cellEnd = abs(fract(sqAlong) - 0.5) * 2.0;
    // Flakes taper at their ends, like overlapping lenses.
    float sqHalf = 0.5 - 0.42 * smoothstep(0.7, 1.0, cellEnd);
    float sqEdge = smoothstep(sqHalf - 0.12, sqHalf, abs(inRow - 0.5));
    float sqShade = 0.92 + 0.08 * fract(sin(dot(vec2(sqRow, floor(sqAlong)), vec2(12.9898, 78.233))) * 43758.5453);
    cornea = mix(vec3(1.0, 0.92, 0.84) * sqShade, vec3(0.85, 0.64, 0.66), sqEdge * 0.8);
  }`
    : "";
  const { corneum: CORNEUM, lucidum: LUCIDUM, granulosum: GRANULOSUM, basale: BASALE } = bands;
  return patchToon(kit.toon("#ffffff", { rim: 0.25, rimColor: "#fff3e6", gloss: 0.18, soft: 0.3 }) as THREE.ShaderMaterial, {
    vertexDecl: "attribute vec2 aLayer;\nvarying vec2 vLayer;\nvarying vec3 vSlab;",
    vertexMain: "vLayer = aLayer; vSlab = position;",
    fragmentDecl: "varying vec2 vLayer;\nvarying vec3 vSlab;",
    fragmentNormal: `
  float dep = vLayer.x;
  float hgt = vLayer.y;
  float aa = 0.012;
  vec3 c = vec3(0.98, 0.72, 0.6);
  c = mix(c, vec3(0.83, 0.47, 0.55), 1.0 - smoothstep(${GRANULOSUM.toFixed(3)} - aa, ${GRANULOSUM.toFixed(3)} + aa, dep));
  c = mix(c, vec3(1.0, 0.97, 0.92), 1.0 - smoothstep(${LUCIDUM.toFixed(3)} - aa, ${LUCIDUM.toFixed(3)} + aa, dep));
  float horn = 1.0 - smoothstep(${CORNEUM.toFixed(3)} - aa, ${CORNEUM.toFixed(3)} + aa, dep);
  vec3 cornea = vec3(1.0, 0.9, 0.8) * (0.96 + 0.04 * sin(dep * 110.0));
  ${SQUAMES}
  c = mix(c, cornea, horn);
  c = mix(c, vec3(0.9, 0.36, 0.56), 1.0 - smoothstep(${BASALE.toFixed(3)} - aa, ${BASALE.toFixed(3)} + aa, hgt));
  c = mix(mix(vec3(0.62, 0.25, 0.45), c, ${DIM}), c, horn);
  // The outer surface keeps the colour of the skin seen from outside.
  // Crest/furrow tint as on the fingerprint (marker −1 − crest).
  vec3 outer = vec3(0.9, 0.62, 0.47) * mix(0.86, 1.05, clamp(-dep - 1.0, 0.0, 1.0));
  c = mix(c, outer, step(dep, -0.5) * ${SKIN_TOP});
  base = c;`
  });
}
