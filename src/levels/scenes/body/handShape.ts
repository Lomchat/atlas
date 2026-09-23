/**
 * Shared geometry of the illustrated hand (1 unit = 1.9 cm), used by the
 * `hand` scene and by `fingertip`, which redraws the end of the middle finger
 * at a much larger scale and must match it exactly.
 */
import * as THREE from "three";

export interface FingerSpec {
  id: "thumb" | "index" | "middle" | "ring" | "little";
  /** Pivot at the base of the visible finger (hand units). */
  base: [number, number, number];
  /** Tilt in degrees; positive leans the finger towards −X (the thumb side). */
  angle: number;
  /** Visible length from the pivot to the tip. */
  length: number;
  radius: number;
  /** Positions of the joints along the finger (fractions of the length): knuckle (inside the palm), PIP, DIP. */
  joints: number[];
  /** Amplitude of the idle wiggle (degrees). 0 for the finger that carries the fingertip anchor. */
  wiggle: number;
}

/** Fingers flatten slightly from front to back. */
export const FINGER_DEPTH = 0.86;

export const FINGERS: FingerSpec[] = [
  { id: "thumb", base: [-1.62, -2.75, 0.3], angle: 43, length: 3.85, radius: 0.54, joints: [0.08, 0.5], wiggle: 3 },
  { id: "index", base: [-1.56, 0.62, 0], angle: 7, length: 3.72, radius: 0.48, joints: [-0.22, 0.44, 0.73], wiggle: 2.2 },
  { id: "middle", base: [-0.42, 0.78, 0], angle: 0, length: 4.22, radius: 0.49, joints: [-0.2, 0.45, 0.72], wiggle: 0 },
  { id: "ring", base: [0.72, 0.64, 0], angle: -6, length: 3.82, radius: 0.465, joints: [-0.2, 0.44, 0.72], wiggle: 2.4 },
  { id: "little", base: [1.76, 0.3, 0], angle: -15, length: 3.0, radius: 0.4, joints: [-0.22, 0.43, 0.71], wiggle: 3 },
];

export const MIDDLE = FINGERS.find((finger) => finger.id === "middle")!;

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Radius of a finger at distance `y` from its pivot (before the depth flattening). */
export function fingerRadius(spec: FingerSpec, y: number) {
  const L = spec.length;
  const R = spec.radius;
  const t = Math.max(0, y) / L;
  let r = R * (1 - 0.1 * t);
  // The thumb widens into the ball of the thumb.
  if (spec.id === "thumb") r *= 1 + 0.55 * (1 - smooth(-0.3, 0.42 * L, y));
  for (const j of spec.joints.slice(1)) r += 0.035 * R * Math.exp(-(((y - j * L) / 0.2) ** 2));
  // A slightly fuller pad before the tip.
  r += 0.03 * R * Math.exp(-(((y - (L - 0.55)) / 0.3) ** 2));
  const tipR = R * 0.9;
  const capStart = L - tipR;
  if (y > capStart) {
    const d = (y - capStart) / tipR;
    const round = Math.sqrt(Math.max(0, 1 - d * d));
    r = r * round;
  }
  return Math.max(0, r);
}

/** Lathe profile of a finger, from inside the palm (y0) to the tip. */
export function fingerProfile(spec: FingerSpec, y0 = -0.8, steps = 64, from = y0) {
  const points: THREE.Vector2[] = [];
  const L = spec.length;
  const tipR = spec.radius * 0.9;
  const capStart = L - tipR;
  const bodySteps = Math.round(steps * 0.7);
  const start = Math.max(y0, from);
  for (let i = 0; i <= bodySteps; i++) {
    const y = start + ((capStart - start) * i) / bodySteps;
    points.push(new THREE.Vector2(fingerRadius(spec, y), y));
  }
  const capSteps = steps - bodySteps;
  for (let i = 1; i <= capSteps; i++) {
    const a = (i / capSteps) * (Math.PI / 2);
    const y = capStart + tipR * Math.sin(a);
    points.push(new THREE.Vector2(i === capSteps ? 0 : fingerRadius(spec, y), y));
  }
  return points;
}

/** A finger mesh geometry in the finger's own frame (pivot at the origin, tip along +Y). */
export function fingerGeometry(spec: FingerSpec, options: { segments?: number; steps?: number; from?: number } = {}) {
  const geometry = new THREE.LatheGeometry(
    fingerProfile(spec, -0.8, options.steps ?? 64, options.from),
    options.segments ?? 28,
    Math.PI,
  );
  geometry.scale(1, 1, FINGER_DEPTH);
  return geometry;
}

/** Hand-space position of a point given in a finger's frame. */
export function fingerToHand(spec: FingerSpec, local: THREE.Vector3, target = new THREE.Vector3()) {
  const a = (spec.angle * Math.PI) / 180;
  return target.set(
    spec.base[0] + local.x * Math.cos(a) - local.y * Math.sin(a),
    spec.base[1] + local.x * Math.sin(a) + local.y * Math.cos(a),
    spec.base[2] + local.z,
  );
}

/**
 * The fingertip level is anchored on the pad of the middle finger. The
 * matching literal lives in `data/body.ts` (anchor of "fingertip").
 */
export const FINGERTIP_PAD_Y = 3.77; // along the middle finger, from its pivot
export const FINGERTIP_SCALE = 0.19 / 0.016; // fingertip units per hand unit
export function fingertipAnchor() {
  const z = fingerRadius(MIDDLE, FINGERTIP_PAD_Y) * FINGER_DEPTH;
  return new THREE.Vector3(MIDDLE.base[0], MIDDLE.base[1] + FINGERTIP_PAD_Y, MIDDLE.base[2] + z);
}

/** The person's forearm (person.ts), expressed in hand units: the hand continues it. */
export const FOREARM = {
  wrist: new THREE.Vector3(-0.7368, -4.6, -0.1842),
  direction: new THREE.Vector3(0.2284, 0.9732, 0.0254).normalize(),
  radius: 3.039,
};
