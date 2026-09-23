/**
 * Shared geometry of the nucleosome (1 unit = 1.1 nm), used by the
 * `nucleosome`, `chromatin` and `dna` scenes so that the levels line up.
 *
 * 147 bp wrap 1.65 turns of a left-handed superhelix around the Z axis
 * (the histone disc faces the viewer); the dyad points down (−Y). Base pair
 * KA sits on the front gyre at the top, facing the camera: the `dna` child
 * is anchored there. The linkers leave downwards towards two neighbours.
 * Only `three` is imported so the geometry can be checked from Node.
 */
import * as THREE from "three";
import type { Frame } from "./dna-model";

export const NUC = {
  /** Superhelix radius (DNA axis), units. */
  radius: 4.3,
  /** Superhelix pitch per turn, units. */
  pitch: 2.3,
  bp: 147,
  turns: 1.65,
  /** Base pair under the `dna` child. */
  anchorBp: 117,
  /** Scene units per ångström. */
  scale: 1 / 11,
  /** Nanometres per unit. */
  nm: 1.1,
};

const dTheta = (2 * Math.PI * NUC.turns) / (NUC.bp - 1);

/** Point of the superhelix at (fractional) base pair k. */
export function superhelixPoint(k: number, target = new THREE.Vector3()) {
  const theta = (k - NUC.anchorBp) * dTheta;
  const s = ((k - (NUC.bp - 1) / 2) * NUC.turns) / (NUC.bp - 1);
  return target.set(NUC.radius * Math.sin(theta), NUC.radius * Math.cos(theta), NUC.pitch * s);
}

/** Path frame on the superhelix: T along the DNA, U pointing away from the histone core. */
export function superhelixFrame(k: number): Frame {
  const origin = superhelixPoint(k);
  const T = superhelixPoint(k + 0.01).sub(superhelixPoint(k - 0.01)).normalize();
  const radial = new THREE.Vector3(origin.x, origin.y, 0).normalize();
  const U = radial.sub(T.clone().multiplyScalar(radial.dot(T))).normalize();
  const W = new THREE.Vector3().crossVectors(T, U);
  return { origin, T, U, W };
}

/** Histone colours (the classic scheme of Luger et al. 1997). */
export const HISTONE_COLORS = { H2A: "#ffd65c", H2B: "#ff6f7d", H3: "#4f8bff", H4: "#5fd67a" };
export type Histone = keyof typeof HISTONE_COLORS;

/**
 * The eight histone lobes: front layer (z > 0) and its copy by the dyad
 * symmetry (x, y, z) → (−x, y, −z). H3–H4 sit at the dyad (bottom), the
 * H2A–H2B dimers further round, under the DNA near the anchor.
 */
export function octamerLobes() {
  const front: { histone: Histone; angle: number }[] = [
    { histone: "H2B", angle: 0 },
    { histone: "H2A", angle: Math.PI / 2 },
    { histone: "H3", angle: Math.PI },
    { histone: "H4", angle: -Math.PI / 2 },
  ];
  return [1, -1].flatMap((layer) =>
    front.map(({ histone, angle }) => ({
      histone,
      position: new THREE.Vector3(layer * Math.sin(angle) * 1.95, Math.cos(angle) * 1.95, layer * 1.12),
      angle: layer * angle,
      layer,
    })),
  );
}

/** Pose of a neighbouring nucleosome along the fibre, in nucleosome units. */
export interface NeighbourPose {
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
}
const pose = (x: number, y: number, z: number, rx: number, ry: number, rz: number): NeighbourPose => ({
  position: new THREE.Vector3(x, y, z),
  quaternion: new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)),
});
/** The nucleosomes before bp 0 and after bp 146. */
export const NEIGHBOURS = {
  before: pose(-15.2, -11.8, -4.6, 0.5, 0.9, -0.5),
  after: pose(15.4, -11.2, 1.2, -0.4, -0.8, 0.6),
};

/** A point/tangent of a neighbour's wrap, in this nucleosome's frame. */
function neighbourEnd(neighbour: NeighbourPose, bp: number) {
  const point = superhelixPoint(bp).applyQuaternion(neighbour.quaternion).add(neighbour.position);
  const tangent = superhelixPoint(bp + 0.01)
    .sub(superhelixPoint(bp - 0.01))
    .normalize()
    .applyQuaternion(neighbour.quaternion);
  return { point, tangent };
}

/**
 * Smooth linker paths from both ends of the wrap to the neighbours, as dense
 * point lists (spacing ≈ one base pair). `before` runs from bp 0 towards the
 * previous nucleosome (its bp 146); `after` from bp 146 to the next one (its bp 0).
 */
export function linkerPaths() {
  const rise = 3.38 * NUC.scale;
  const tangentAt = (bp: number) => superhelixPoint(bp + 0.01).sub(superhelixPoint(bp - 0.01)).normalize();
  const make = (start: THREE.Vector3, startDir: THREE.Vector3, end: THREE.Vector3, endDir: THREE.Vector3) => {
    const span = start.distanceTo(end);
    const curve = new THREE.CubicBezierCurve3(
      start,
      start.clone().addScaledVector(startDir, span * 0.45),
      end.clone().addScaledVector(endDir, -span * 0.45),
      end,
    );
    const count = Math.max(8, Math.round(curve.getLength() / rise));
    return curve.getSpacedPoints(count);
  };
  const previous = neighbourEnd(NEIGHBOURS.before, NUC.bp - 1);
  const next = neighbourEnd(NEIGHBOURS.after, 0);
  return {
    // Walking away from bp 0 (against the base-pair order).
    before: make(superhelixPoint(0), tangentAt(0).negate(), previous.point, previous.tangent.clone().negate()),
    after: make(superhelixPoint(NUC.bp - 1), tangentAt(NUC.bp - 1), next.point, next.tangent),
  };
}

/** Parallel-transported path frames along points, starting from a given frame. */
export function transportFrames(points: THREE.Vector3[], start: Frame, reverse = false): Frame[] {
  const frames: Frame[] = [];
  let U = start.U.clone();
  let previousT = reverse ? start.T.clone().negate() : start.T.clone();
  points.forEach((origin, i) => {
    const a = points[Math.max(0, i - 1)];
    const b = points[Math.min(points.length - 1, i + 1)];
    const walk = b.clone().sub(a).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(previousT, walk);
    U.applyQuaternion(q);
    U = U.sub(walk.clone().multiplyScalar(U.dot(walk))).normalize();
    previousT = walk.clone();
    // Keep T oriented along increasing base-pair index.
    const T = reverse ? walk.clone().negate() : walk.clone();
    const W = new THREE.Vector3().crossVectors(T, U);
    frames.push({ origin: origin.clone(), T, U: U.clone(), W });
  });
  return frames;
}
