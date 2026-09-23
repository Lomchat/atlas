/**
 * Deterministic layout of the pond, shared by the pond and the lily pad
 * scenes so that the neighbouring pads seen around the lily pad are the very
 * pads of the pond (seamless cross-fade while diving).
 */
import * as THREE from "three";
import { rng } from "../../../engine/kit";

const rawRadius = (a: number) =>
  1 + 0.075 * Math.sin(2 * a + 0.7) + 0.05 * Math.sin(3 * a + 2.1) + 0.025 * Math.sin(5 * a + 0.4);
const OUTLINE_SCALE = (() => {
  let max = 0;
  for (let i = 0; i < 720; i++) {
    const a = (i / 720) * Math.PI * 2;
    max = Math.max(max, Math.abs(Math.cos(a) * rawRadius(a) * 1.18));
  }
  return 4.95 / max;
})();

/** Point of the shoreline at angle `a`, scaled by `f` (0 = centre, 1 = shore), in pond units (x, z). */
export function shore(a: number, f = 1) {
  const r = rawRadius(a) * OUTLINE_SCALE * f;
  return new THREE.Vector2(Math.cos(a) * r * 1.18, Math.sin(a) * r * 0.92);
}

/** Fraction of the way from the centre to the shore (≥ 1 outside the water). */
export function shoreFraction(x: number, z: number) {
  const a = Math.atan2(z / 0.92, x / 1.18);
  return Math.hypot(x, z) / shore(a).length();
}

export interface PondPad {
  x: number;
  z: number;
  r: number;
  yaw: number;
  phase: number;
}

/** Pond pads bob gently; both scenes use this so the pads stay in step. */
export const padYaw = (pad: PondPad, time: number) => pad.yaw + Math.sin(time * 0.7 + pad.phase) * 0.03;

/** Floating lily pads of the pond, leaving `keepFree` units clear around the child pad at `padAt`. */
export function pondPads(padAt: { x: number; z: number }, keepFree: number) {
  const random = rng(4242);
  const pads: PondPad[] = [];
  const tryPad = (x: number, z: number, r: number) => {
    if (shoreFraction(x, z) > 0.86) return false;
    if (Math.hypot(x - padAt.x, z - padAt.z) < keepFree + r) return false;
    for (const other of pads) if (Math.hypot(x - other.x, z - other.z) < other.r + r + 0.02) return false;
    pads.push({ x, z, r, yaw: random() * Math.PI * 2, phase: random() * 6 });
    return true;
  };
  const colonies = [
    { x: padAt.x + 0.3, z: padAt.z - 0.3, spread: 1.2, n: 22 },
    { x: -1.1, z: -1.3, spread: 1.45, n: 30 },
    { x: -3.3, z: 0.5, spread: 0.6, n: 7 },
    { x: 3.3, z: -0.6, spread: 0.5, n: 5 },
  ];
  for (const colony of colonies) {
    let placed = 0;
    for (let tries = 0; placed < colony.n && tries < 600; tries++) {
      const a = random() * Math.PI * 2;
      const d = Math.sqrt(random()) * colony.spread;
      if (tryPad(colony.x + Math.cos(a) * d, colony.z + Math.sin(a) * d * 0.8, 0.15 + random() * 0.13)) placed++;
    }
  }
  return pads;
}
