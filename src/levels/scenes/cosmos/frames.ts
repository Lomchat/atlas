/**
 * Shared cosmic reference frames, so that real sky directions line up from one
 * level to the next.
 *
 * - Milky Way (and the stellar neighbourhood, same orientation): the galactic
 *   plane is XZ, galactic north is +Y, and the Sun sits at the neighbourhood's
 *   anchor. Galactic longitude 0 points from the Sun to the galactic centre.
 * - Local Group and Laniakea: objects are placed from their real galactic
 *   longitude, latitude and distance, through the anchors in the level data.
 */
import * as THREE from "three";
import { level } from "../../index";

const DEG = Math.PI / 180;
/** Metres per light-year. */
export const LY = 9.4607e15;

function anchorOf(id: string) {
  const data = level(id);
  const at = data.anchor?.at ?? [0, 0, 0];
  const r = data.anchor?.rotate ?? [0, 0, 0];
  return {
    at: new THREE.Vector3(at[0], at[1], at[2]),
    rot: new THREE.Quaternion().setFromEuler(new THREE.Euler(r[0] * DEG, r[1] * DEG, r[2] * DEG, "XYZ")),
    data,
  };
}

/** The Sun in Milky Way units. */
export const SUN_IN_GALAXY = anchorOf("stellar-neighborhood").at;

/** Galactic axes expressed in Milky Way (and neighbourhood) local units. */
export const GALACTIC = (() => {
  const x = SUN_IN_GALAXY.clone().setY(0).multiplyScalar(-1).normalize();
  const z = new THREE.Vector3(0, 1, 0);
  const y = z.clone().cross(x);
  return { x, y, z };
})();

/** Unit vector towards galactic longitude `l`, latitude `b` (degrees), in the galaxy frame. */
export function galacticDirection(l: number, b: number, target = new THREE.Vector3()) {
  const cb = Math.cos(b * DEG);
  return target
    .copy(GALACTIC.x)
    .multiplyScalar(cb * Math.cos(l * DEG))
    .addScaledVector(GALACTIC.y, cb * Math.sin(l * DEG))
    .addScaledVector(GALACTIC.z, Math.sin(b * DEG));
}

/** Position, in Local Group units, of an object seen from the Milky Way at (l, b, light-years). */
export function inLocalGroup(l: number, b: number, lightYears: number) {
  const mw = anchorOf("milky-way");
  const unit = anchorOf("local-group").data.size / 10 / LY;
  return galacticDirection(l, b).applyQuaternion(mw.rot).multiplyScalar(lightYears / unit).add(mw.at);
}

/** Position, in Laniakea units, of an object seen from the Local Group at (l, b, light-years). */
export function inLaniakea(l: number, b: number, lightYears: number) {
  const mw = anchorOf("milky-way");
  const lg = anchorOf("local-group");
  const unit = anchorOf("laniakea").data.size / 10 / LY;
  return galacticDirection(l, b)
    .applyQuaternion(mw.rot)
    .applyQuaternion(lg.rot)
    .multiplyScalar(lightYears / unit)
    .add(lg.at);
}

/** Equatorial (right ascension in hours, declination in degrees) to galactic (l, b) in degrees. */
export function equatorialToGalactic(raHours: number, decDegrees: number) {
  const a = raHours * 15 * DEG;
  const d = decDegrees * DEG;
  const x = Math.cos(d) * Math.cos(a);
  const y = Math.cos(d) * Math.sin(a);
  const z = Math.sin(d);
  const gx = -0.0548755604 * x - 0.8734370902 * y - 0.4838350155 * z;
  const gy = 0.4941094279 * x - 0.44482963 * y + 0.7469822445 * z;
  const gz = -0.867666149 * x - 0.1980763734 * y + 0.4559837762 * z;
  return { l: ((Math.atan2(gy, gx) / DEG) + 360) % 360, b: Math.asin(gz) / DEG };
}
