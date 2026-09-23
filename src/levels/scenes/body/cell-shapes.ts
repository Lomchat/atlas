/**
 * Geometry helpers shared by the cell → DNA and hemoglobin → heme scenes:
 * swept tubes with elliptical sections (ER sacs, Golgi cisternae, fibres),
 * merged multi-tube meshes and instanced placement. Everything goes through
 * the scene's Kit so it is disposed with it.
 */
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { ColorLike, Kit } from "../../../engine/kit";

export interface SweepOptions {
  /** Half-size of the section along the frame normal (per sample or constant). */
  ra: number | ((t: number) => number);
  /** Half-size along the binormal (defaults to `ra`). */
  rb?: number | ((t: number) => number);
  /** Explicit normals (one per sample); by default a parallel-transport frame. */
  normals?: THREE.Vector3[];
  radial?: number;
  /** Close the ends with small caps. */
  caps?: boolean;
  color?: ColorLike;
}

const value = (v: number | ((t: number) => number), t: number) => (typeof v === "number" ? v : v(t));

/** Parallel-transport normals along a polyline (stable, no Frenet flips). */
export function transportNormals(points: THREE.Vector3[], seed = new THREE.Vector3(0, 0, 1)) {
  const normals: THREE.Vector3[] = [];
  const tangents = points.map((_, i) => {
    const a = points[Math.max(0, i - 1)];
    const b = points[Math.min(points.length - 1, i + 1)];
    return b.clone().sub(a).normalize();
  });
  let n = seed.clone().sub(tangents[0].clone().multiplyScalar(seed.dot(tangents[0])));
  if (n.lengthSq() < 1e-6) n = new THREE.Vector3(1, 0, 0).cross(tangents[0]);
  n.normalize();
  normals.push(n.clone());
  for (let i = 1; i < points.length; i++) {
    const q = new THREE.Quaternion().setFromUnitVectors(tangents[i - 1], tangents[i]);
    n.applyQuaternion(q).normalize();
    normals.push(n.clone());
  }
  return normals;
}

/** Sweep an ellipse along `points` (already smooth/dense). */
export function sweepGeometry(points: THREE.Vector3[], options: SweepOptions) {
  const radial = options.radial ?? 10;
  const count = points.length;
  const normals = options.normals ?? transportNormals(points);
  const positions: number[] = [];
  const vertexNormals: number[] = [];
  const uvs: number[] = [];
  const colors: number[] = [];
  const index: number[] = [];
  const color = options.color !== undefined ? new THREE.Color(options.color) : null;
  const tangent = new THREE.Vector3();
  const binormal = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const offset = new THREE.Vector3();
  const vn = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    const t = count > 1 ? i / (count - 1) : 0;
    const a = points[Math.max(0, i - 1)];
    const b = points[Math.min(count - 1, i + 1)];
    tangent.subVectors(b, a).normalize();
    normal.copy(normals[i]).sub(tangent.clone().multiplyScalar(normals[i].dot(tangent))).normalize();
    binormal.crossVectors(tangent, normal).normalize();
    const ra = value(options.ra, t);
    const rb = value(options.rb ?? options.ra, t);
    for (let j = 0; j <= radial; j++) {
      const angle = (j / radial) * Math.PI * 2;
      const c = Math.cos(angle);
      const s = Math.sin(angle);
      offset.copy(normal).multiplyScalar(c * ra).addScaledVector(binormal, s * rb);
      positions.push(points[i].x + offset.x, points[i].y + offset.y, points[i].z + offset.z);
      vn.copy(normal).multiplyScalar(c / Math.max(ra, 1e-4)).addScaledVector(binormal, s / Math.max(rb, 1e-4)).normalize();
      vertexNormals.push(vn.x, vn.y, vn.z);
      uvs.push(j / radial, t);
      if (color) colors.push(color.r, color.g, color.b);
    }
  }
  for (let i = 0; i < count - 1; i++)
    for (let j = 0; j < radial; j++) {
      const a = i * (radial + 1) + j;
      const b = a + radial + 1;
      index.push(a, b, a + 1, b, b + 1, a + 1);
    }
  if (options.caps) {
    for (const end of [0, count - 1]) {
      const centre = positions.length / 3;
      const p = points[end];
      const dir = end === 0 ? points[0].clone().sub(points[1]) : points[count - 1].clone().sub(points[count - 2]);
      dir.normalize();
      positions.push(p.x, p.y, p.z);
      vertexNormals.push(dir.x, dir.y, dir.z);
      uvs.push(0.5, end === 0 ? 0 : 1);
      if (color) colors.push(color.r, color.g, color.b);
      const ring = end * (radial + 1);
      for (let j = 0; j < radial; j++)
        if (end === 0) index.push(centre, ring + j + 1, ring + j);
        else index.push(centre, ring + j, ring + j + 1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(vertexNormals, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  if (color) geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(index);
  return geometry;
}

/** Resample a smooth Catmull–Rom curve through control points. */
export function smoothPath(control: THREE.Vector3[], samples: number, closed = false) {
  const curve = new THREE.CatmullRomCurve3(control, closed, "centripetal");
  return curve.getSpacedPoints(samples);
}

/** Merge geometries (all built the same way) into one tracked geometry. */
export function merge(kit: Kit, geometries: THREE.BufferGeometry[]) {
  const merged = mergeGeometries(geometries, false);
  for (const geometry of geometries) geometry.dispose();
  return kit.geometry(merged ?? new THREE.BufferGeometry());
}

export interface Placement {
  position: THREE.Vector3;
  quaternion?: THREE.Quaternion;
  scale?: THREE.Vector3 | number;
  color?: ColorLike;
}

/** An InstancedMesh from a list of placements (with optional per-instance colours). */
export function instances(geometry: THREE.BufferGeometry, material: THREE.Material, list: Placement[]) {
  const mesh = new THREE.InstancedMesh(geometry, material, Math.max(1, list.length));
  const matrix = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const c = new THREE.Color();
  list.forEach((item, k) => {
    if (typeof item.scale === "number") s.setScalar(item.scale);
    else if (item.scale) s.copy(item.scale);
    else s.setScalar(1);
    mesh.setMatrixAt(k, matrix.compose(item.position, item.quaternion ?? q.identity(), s));
    if (item.color !== undefined) mesh.setColorAt(k, c.set(item.color));
  });
  mesh.count = list.length;
  mesh.frustumCulled = false;
  return mesh;
}

/** Random unit vector. */
export function randomDirection(random: () => number, target = new THREE.Vector3()) {
  const u = random() * 2 - 1;
  const a = random() * Math.PI * 2;
  const r = Math.sqrt(1 - u * u);
  return target.set(r * Math.cos(a), u, r * Math.sin(a));
}

/** Random rotation. */
export function randomQuaternion(random: () => number) {
  return new THREE.Quaternion()
    .setFromEuler(new THREE.Euler(random() * Math.PI * 2, random() * Math.PI * 2, random() * Math.PI * 2));
}
