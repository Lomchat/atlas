/**
 * The fingerprint of the middle finger, as a smooth field `f(x, y)` in
 * fingertip units (1 unit = 1.6 mm): ridge crests lie where f / SPACING is an
 * integer. The same formulas exist in JavaScript (to place pores, droplets
 * and the matching ridges of the skin block) and in GLSL (to shade the pad).
 */

import * as THREE from "three";
import { FINGERTIP_PAD_Y, FINGERTIP_SCALE, FINGER_DEPTH, MIDDLE, fingerRadius } from "./handShape";

/** Depth of the pad surface in front of the finger's axis (fingertip units). */
export const PAD_Z = fingerRadius(MIDDLE, FINGERTIP_PAD_Y) * FINGER_DEPTH * FINGERTIP_SCALE;

/** Height of the finger's skin above the anchor plane at (x, y), in fingertip units. */
export function padSurfaceZ(x: number, y: number) {
  const r = fingerRadius(MIDDLE, FINGERTIP_PAD_Y + y / FINGERTIP_SCALE) * FINGERTIP_SCALE;
  return Math.sqrt(Math.max(0, r * r - x * x)) * FINGER_DEPTH - PAD_Z;
}

/** Skin block units per fingertip unit (2 mm block, 1.6 cm fingertip). */
export const SKIN_SCALE = 0.016 / 0.002;
/** Mean height of the block's ridged top surface, in skin units. */
export const SKIN_TOP = 4.12;

/**
 * Frame of the skin block on the pad: its +Y is the outward skin normal,
 * its +Z points down the finger (towards the palm), so its ridges, which run
 * along Z, follow the fingerprint's locally vertical ridges.
 */
export function skinFrame() {
  const e = 0.01;
  const { x, y } = SKIN_SPOT;
  const p = new THREE.Vector3(x, y, padSurfaceZ(x, y));
  const dx = new THREE.Vector3(2 * e, 0, padSurfaceZ(x + e, y) - padSurfaceZ(x - e, y));
  const dy = new THREE.Vector3(0, 2 * e, padSurfaceZ(x, y + e) - padSurfaceZ(x, y - e));
  const ey = new THREE.Vector3().crossVectors(dx, dy).normalize();
  const down = new THREE.Vector3(0, -1, 0);
  const ez = down.sub(ey.clone().multiplyScalar(down.dot(ey))).normalize();
  const ex = new THREE.Vector3().crossVectors(ey, ez).normalize();
  const origin = p.clone().addScaledVector(ey, -SKIN_TOP / SKIN_SCALE);
  const rotation = new THREE.Matrix4().makeBasis(ex, ey, ez);
  const euler = new THREE.Euler().setFromRotationMatrix(rotation, "XYZ");
  return { origin, ex, ey, ez, surface: p, euler };
}

/** Fingerprint ridge phase along the skin block's X axis (skin units → ridge count). */
export function skinRidgePhase() {
  const { surface, ex } = skinFrame();
  const q = new THREE.Vector3();
  return (xSkin: number) => {
    q.copy(surface).addScaledVector(ex, xSkin / SKIN_SCALE);
    return printField(q.x, q.y).f / SPACING;
  };
}

/** Ridge period: 0.45 mm. */
export const SPACING = 0.45 / 1.6;
/** Spacing of sweat pores along a ridge (≈ 0.5 mm). */
export const PORE_SPACING = 0.5 / 1.6;
/** Centre (core) of the whorl. */
export const CORE = { x: -1.05, y: 0.55 };
/** Where the skin block is cut out: level with the core, where ridges run vertically. */
export const SKIN_SPOT = { x: 1.0, y: 0.55 };
const ELLIPSE = 1.22;

export interface PrintSample {
  /** Ridge coordinate: crests at integer multiples of SPACING. */
  f: number;
  /** Coordinate along the ridge (for pores). */
  along: number;
}

export function printField(x: number, y: number): PrintSample {
  const dx = x - CORE.x;
  const dy = y - CORE.y;
  const wx = dx + 0.22 * Math.sin(0.9 * y + 0.4) + 0.1 * Math.sin(1.7 * x - 0.8 * y);
  const wy = dy + 0.18 * Math.sin(0.8 * x + 1.1);
  const ey = wy / ELLIPSE;
  const re = Math.sqrt(wx * wx + ey * ey) + 1e-5;
  const theta = Math.atan2(ey, wx);
  // A single spiral ridge system (continuous across θ = ±π).
  const whorl = re + SPACING * (theta / (Math.PI * 2));
  // Below the whorl, the rings flatten into transverse arches.
  const arch = -ey + 0.045 * wx * wx;
  const w = smooth(3.0, 6.0, re) * smooth(-0.2, -0.95, ey / re);
  return {
    f: whorl + (arch - whorl) * w,
    along: theta * re + (wx - theta * re) * w,
  };
}

function smooth(a: number, b: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/** GLSL twin of printField: `vec2 printField(vec2 p)` returns (f, along). */
export const PRINT_GLSL = /* glsl */ `
const float PRINT_SPACING = ${SPACING.toFixed(6)};
const float PORE_SPACING = ${PORE_SPACING.toFixed(6)};
const vec2 PRINT_CORE = vec2(${CORE.x.toFixed(4)}, ${CORE.y.toFixed(4)});
vec2 printField(vec2 p) {
  float dx = p.x - PRINT_CORE.x;
  float dy = p.y - PRINT_CORE.y;
  float wx = dx + 0.22 * sin(0.9 * p.y + 0.4) + 0.1 * sin(1.7 * p.x - 0.8 * p.y);
  float wy = dy + 0.18 * sin(0.8 * p.x + 1.1);
  float ey = wy / ${ELLIPSE.toFixed(4)};
  float re = sqrt(wx * wx + ey * ey) + 1e-5;
  float theta = atan(ey, wx);
  float whorl = re + PRINT_SPACING * (theta / 6.2831853);
  float arch = -ey + 0.045 * wx * wx;
  float w = smoothstep(3.0, 6.0, re) * (1.0 - smoothstep(-0.95, -0.2, ey / re));
  return vec2(mix(whorl, arch, w), mix(theta * re, wx, w));
}
/** Ridge height in [0, 1] (1 on crests), with pores carved along the crests. */
float printHeight(vec2 p, out float pore) {
  vec2 fa = printField(p);
  float phase = fa.x / PRINT_SPACING;
  float ridge = 0.5 + 0.5 * cos(phase * 6.2831853);
  ridge = pow(ridge, 0.7);
  float index = floor(phase + 0.5);
  float across = (phase - index) * PRINT_SPACING;
  float a = fa.y / PORE_SPACING + index * 0.37;
  float along = (fract(a) - 0.5) * PORE_SPACING;
  float d = length(vec2(across, along));
  pore = 1.0 - smoothstep(0.022, 0.036, d);
  return ridge * (1.0 - 0.6 * pore);
}
`;
