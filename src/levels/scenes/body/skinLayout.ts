/**
 * Layout of the 2 mm skin block (1 unit = 0.2 mm), shared by the `skin`
 * scene and used to place the `epidermis` anchor. Ridges run along Z and
 * continue the fingerprint of the fingertip level exactly.
 */
import { skinRidgePhase } from "./fingertipPrint";

export const X0 = -5;
export const X1 = 5;
export const Z0 = -3.2;
export const Z1 = 3.2;
/** Furrow level and ridge height of the skin surface. */
export const SURF = 3.95;
export const RIDGE = 0.34;
/** Mean level of the dermal–epidermal junction under the furrows. */
const JUNCTION = 2.62;
export const FAT_BOTTOM = -4.4;
/** Stratum thicknesses on the cut faces (depth below the surface, units). */
export const CORNEUM = 0.42;
export const LUCIDUM = 0.47;
export const GRANULOSUM = 0.58;
export const BASALE = 0.12;

const phaseAt = skinRidgePhase();
const TABLE = 401;
const phases = Array.from({ length: TABLE }, (_, i) => phaseAt(X0 - 0.5 + ((X1 - X0 + 1) * i) / (TABLE - 1)));

/** Number of ridges crossed from the fingerprint's reference (continuous). */
export function phase(x: number) {
  const t = ((x - (X0 - 0.5)) / (X1 - X0 + 1)) * (TABLE - 1);
  const i = Math.max(0, Math.min(TABLE - 2, Math.floor(t)));
  const f = t - i;
  return phases[i] * (1 - f) + phases[i + 1] * f;
}

/** 1 on a ridge crest, 0 in a furrow. */
export function crest(x: number) {
  return Math.pow(0.5 + 0.5 * Math.cos(phase(x) * Math.PI * 2), 0.8);
}

export function surface(x: number) {
  return SURF + RIDGE * crest(x);
}

/** x where the ridge phase reaches `target` (bisection; phase grows with x). */
function solve(target: number) {
  let a = X0 - 0.5;
  let b = X1 + 0.5;
  for (let k = 0; k < 40; k++) {
    const m = (a + b) / 2;
    if (phase(m) < target) a = m;
    else b = m;
  }
  return (a + b) / 2;
}

const first = Math.floor(phase(X0));
const last = Math.ceil(phase(X1));
/** Crest positions (x) inside the block. */
export const CRESTS: number[] = [];
/** Papilla columns (x): two rows under the flanks of each furrow. */
export const PAPILLA_X: number[] = [];
for (let k = first; k <= last; k++) {
  const c = solve(k);
  if (c > X0 + 0.2 && c < X1 - 0.2) CRESTS.push(c);
  for (const off of [0.28, 0.72]) {
    const x = solve(k + off);
    if (x > X0 + 0.35 && x < X1 - 0.35) PAPILLA_X.push(x);
  }
}
/** Rows of papillae along Z; the first row is cut open by the front face. */
export const PAPILLA_Z = [Z1, 2.2, 1.2, 0.2, -0.8, -1.8, -2.8];
export const PAPILLA_HEIGHT = 0.68;
export const PAPILLAE = PAPILLA_X.flatMap((x, i) =>
  PAPILLA_Z.map((z, k) => ({ x, z: k === 0 ? z : z + (i % 2 ? 0.28 : -0.2), front: k === 0 })),
);

/** Height of the dermal–epidermal junction (papillae rise into the epidermis). */
export function junction(x: number, z: number) {
  let y = JUNCTION - 0.5 * Math.pow(crest(x), 1.5);
  for (const p of PAPILLAE) {
    const dx = (x - p.x) / 0.36;
    const dz = (z - p.z) / 0.38;
    const d = dx * dx + dz * dz;
    if (d < 1) y += PAPILLA_HEIGHT * Math.pow(1 - d, 0.75);
  }
  return y;
}

/** Boundary between dermis and hypodermis. */
export function dermisBottom(x: number, z: number) {
  return -2.3 + 0.12 * Math.sin(1.3 * x + 0.5) + 0.08 * Math.sin(1.7 * z);
}

/** Front-row papilla nearest to x. */
export function frontPapilla(x: number) {
  return PAPILLA_X.reduce((best, p) => (Math.abs(p - x) < Math.abs(best - x) ? p : best), PAPILLA_X[0]);
}
