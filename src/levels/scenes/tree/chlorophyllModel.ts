/**
 * Approximate 3D model of chlorophyll a, C55H72MgN4O5 (Mg excluded: the
 * magnesium atom is its own level, drawn at the centre of the ring).
 *
 * Coordinates are in ångströms with Mg at the origin and the chlorin ring in
 * the XY plane. The macrocycle uses typical porphyrin distances (Mg–N 2.05 Å,
 * N–Cα 1.37 Å, Cα–Cβ 1.44 Å, Cβ–Cβ 1.36 Å); ring D is reduced (C17/C18 sp3,
 * which makes it a chlorin), ring E is the cyclopentanone with its keto group
 * and carbomethoxy ester, and the ring D propionate is esterified by the
 * 20-carbon phytyl tail, drawn here in a relaxed curved conformation.
 * Hydrogens are placed geometrically (C–H 1.09 Å).
 */
import * as THREE from "three";

export interface ModelAtom {
  symbol: "C" | "N" | "O" | "H";
  position: THREE.Vector3;
  /** Part of the flexible phytyl tail (index along it), or −1. */
  tail: number;
}

export interface ChlorophyllModel {
  atoms: ModelAtom[];
  bonds: [number, number][];
  /** Positions (Å, relative to Mg) of the four ring nitrogens. */
  nitrogens: THREE.Vector3[];
  /** Number of tail positions (for animation). */
  tailLength: number;
}

const DEG = Math.PI / 180;
const polar = (r: number, a: number) => new THREE.Vector3(Math.cos(a * DEG) * r, Math.sin(a * DEG) * r, 0);

export function chlorophyllA(): ChlorophyllModel {
  const atoms: ModelAtom[] = [];
  const bonds: [number, number][] = [];
  const hCount: number[] = [];
  const add = (symbol: ModelAtom["symbol"], position: THREE.Vector3, hydrogens = 0, tail = -1) => {
    atoms.push({ symbol, position, tail });
    hCount.push(hydrogens);
    return atoms.length - 1;
  };
  const bond = (a: number, b: number) => bonds.push([a, b]);
  const P = (i: number) => atoms[i].position;

  /* ---------------- Macrocycle ---------------- */
  // Rings A, B, C, D at 135°, 45°, −45°, −135°; meso carbons on the axes.
  const ringAngles = [135, 45, -45, -135];
  const N: number[] = [];
  const Ca: number[][] = [];
  const Cb: number[][] = [];
  ringAngles.forEach((phi) => {
    N.push(add("N", polar(2.05, phi)));
    const a1 = add("C", polar(3.07, phi + 20.8));
    const b1 = add("C", polar(4.29, phi + 9.1));
    const b2 = add("C", polar(4.29, phi - 9.1));
    const a2 = add("C", polar(3.07, phi - 20.8));
    Ca.push([a1, a2]);
    Cb.push([b1, b2]);
  });
  // IUPAC names: ring A = C1..C4, B = C6..C9, C = C11..C14, D = C16..C19.
  const [C1, C4] = Ca[0];
  const [C2, C3] = Cb[0];
  const [C6, C9] = Ca[1];
  const [C7, C8] = Cb[1];
  const [C11, C14] = Ca[2];
  const [C12, C13] = Cb[2];
  const [C16, C19] = Ca[3];
  const [C17, C18] = Cb[3];
  const C5 = add("C", polar(3.45, 90), 1);
  const C10 = add("C", polar(3.45, 0), 1);
  const C15 = add("C", polar(3.45, -90), 0);
  const C20 = add("C", polar(3.45, 180), 1);
  for (let k = 0; k < 4; k++) {
    const [a1, a2] = Ca[k];
    const [b1, b2] = Cb[k];
    bond(N[k], a1), bond(a1, b1), bond(b1, b2), bond(b2, a2), bond(a2, N[k]);
  }
  bond(C4, C5), bond(C5, C6), bond(C9, C10), bond(C10, C11), bond(C14, C15), bond(C15, C16), bond(C19, C20), bond(C20, C1);

  const centroid = (k: number) => {
    const c = new THREE.Vector3();
    for (const i of [N[k], ...Ca[k], ...Cb[k]]) c.add(P(i));
    return c.multiplyScalar(1 / 5);
  };
  const outward = (atom: number, ring: number) => P(atom).clone().sub(centroid(ring)).normalize();
  const z = new THREE.Vector3(0, 0, 1);
  const rotateZ = (v: THREE.Vector3, deg: number) => v.clone().applyAxisAngle(z, deg * DEG);

  /* ---------------- Substituents ---------------- */
  // C2: methyl. C3: vinyl.
  const c21 = add("C", P(C2).clone().addScaledVector(outward(C2, 0), 1.5), 3);
  bond(C2, c21);
  const out3 = outward(C3, 0);
  const c31 = add("C", P(C3).clone().addScaledVector(out3, 1.47), 1);
  const c32 = add("C", P(c31).clone().addScaledVector(rotateZ(out3, -58), 1.34), 2);
  bond(C3, c31), bond(c31, c32);
  // C7: methyl. C8: ethyl (second carbon out of plane).
  const c71 = add("C", P(C7).clone().addScaledVector(outward(C7, 1), 1.5), 3);
  bond(C7, c71);
  const out8 = outward(C8, 1);
  const c81 = add("C", P(C8).clone().addScaledVector(out8, 1.52), 2);
  const c82 = add("C", P(c81).clone().addScaledVector(out8.clone().multiplyScalar(0.45).add(new THREE.Vector3(0, 0, 0.89)).normalize(), 1.53), 3);
  bond(C8, c81), bond(c81, c82);
  // C12: methyl.
  const c121 = add("C", P(C12).clone().addScaledVector(outward(C12, 2), 1.5), 3);
  bond(C12, c121);
  // Ring E: C13–C13¹(=O)–C13²–C15, closing a five-membered ring with C14.
  const mid = P(C13).clone().add(P(C15)).multiplyScalar(0.5);
  const u = mid.clone().sub(P(C14)).normalize();
  const along = P(C15).clone().sub(P(C13));
  const half = along.length() / 2;
  const v = along.normalize();
  const d = Math.sqrt(Math.max(0.5, 2.25 - (half - 0.77) ** 2));
  const c131 = add("C", mid.clone().addScaledVector(u, d).addScaledVector(v, -0.77));
  const c132 = add("C", mid.clone().addScaledVector(u, d).addScaledVector(v, 0.77), 1);
  bond(C13, c131), bond(c131, c132), bond(c132, C15);
  const ringE = new THREE.Vector3();
  for (const i of [C13, C14, C15, c131, c132]) ringE.add(P(i));
  ringE.multiplyScalar(1 / 5);
  const o131 = add("O", P(c131).clone().addScaledVector(P(c131).clone().sub(ringE).normalize(), 1.22));
  bond(c131, o131);
  // 13²-carbomethoxy group, sticking out of the ring plane (sp3 carbon).
  const out132 = P(c132).clone().sub(ringE).normalize();
  const c133 = add("C", P(c132).clone().addScaledVector(out132.clone().multiplyScalar(0.55).add(new THREE.Vector3(0, 0, 0.84)).normalize(), 1.52));
  bond(c132, c133);
  const esterAxis = P(c133).clone().sub(P(c132)).normalize();
  const side = new THREE.Vector3().crossVectors(esterAxis, z).normalize();
  const o134 = add("O", P(c133).clone().addScaledVector(esterAxis.clone().multiplyScalar(0.5).addScaledVector(side, 0.87).normalize(), 1.21));
  const o135 = add("O", P(c133).clone().addScaledVector(esterAxis.clone().multiplyScalar(0.5).addScaledVector(side, -0.87).normalize(), 1.34));
  const c136 = add("C", P(o135).clone().addScaledVector(esterAxis, 1.44), 3);
  bond(c133, o134), bond(c133, o135), bond(o135, c136);
  // C18: methyl (above the plane); C17: the propionate that carries the tail (below).
  const out18 = outward(C18, 3);
  const c181 = add("C", P(C18).clone().addScaledVector(out18.clone().multiplyScalar(0.8).add(new THREE.Vector3(0, 0, 0.6)).normalize(), 1.53), 3);
  bond(C18, c181);
  hCount[C17] = 1;
  hCount[C18] = 1;

  /* ---------------- Propionate + phytyl tail ---------------- */
  // The propionate leaves C17 behind the ring plane (C17 is sp3); the tail then
  // follows a smooth path down and round under ring E, zig-zagging along it.
  const out17 = outward(C17, 3);
  const first = P(C17).clone().addScaledVector(out17.clone().multiplyScalar(0.62).add(new THREE.Vector3(0, 0, -0.78)).normalize(), 1.53);
  const path = new THREE.CatmullRomCurve3([
    first,
    new THREE.Vector3(-4.3, -6.4, -1.9),
    new THREE.Vector3(-4.6, -9.6, -1.0),
    new THREE.Vector3(-1.9, -12.1, 0.2),
    new THREE.Vector3(2.5, -12.5, 0.4),
    new THREE.Vector3(6.5, -10.5, -0.4),
    new THREE.Vector3(8.7, -7.2, 0.1),
    new THREE.Vector3(9.3, -4.0, 0.7),
  ]);
  const length = path.getLength();
  // Tail atoms: C17¹, C17², C17³, O (ester), then P1…P16.
  const tailSymbols: ("C" | "O")[] = ["C", "C", "C", "O", ...Array<"C">(16).fill("C")];
  const tailH = [2, 2, 0, 0, 2, 1, 0, 2, 2, 2, 1, 2, 2, 2, 1, 2, 2, 2, 1, 3];
  const tail: number[] = [];
  const step = 1.26;
  const tangent = new THREE.Vector3();
  const perp = new THREE.Vector3();
  const zigzag: THREE.Vector3[] = [];
  for (let i = 0; i < tailSymbols.length; i++) {
    const t = Math.min(1, (i * step) / length);
    const p = path.getPointAt(t);
    path.getTangentAt(t, tangent);
    perp.crossVectors(tangent, z).normalize();
    // Alternate on both sides of the path (the first atom sits on it).
    const offset = i === 0 ? 0 : i % 2 === 1 ? 0.42 : -0.42;
    zigzag.push(perp.clone().multiplyScalar(offset >= 0 ? 1 : -1));
    tail.push(add(tailSymbols[i], p.addScaledVector(perp, offset), tailH[i], i));
  }
  bond(C17, tail[0]);
  for (let i = 0; i + 1 < tail.length; i++) bond(tail[i], tail[i + 1]);
  // Carbonyl oxygen of the ester (on C17³), in the zig-zag plane.
  const o173 = add("O", P(tail[2]).clone().addScaledVector(zigzag[2], 1.21), 0, 2);
  bond(tail[2], o173);
  // Methyl branches on P3, P7, P11, P15 (tail indices 6, 10, 14, 18).
  for (const i of [6, 10, 14, 18]) {
    const dir = zigzag[i].clone().multiplyScalar(0.75).add(new THREE.Vector3(0, 0, i % 4 === 2 ? 0.66 : -0.66)).normalize();
    const methyl = add("C", P(tail[i]).clone().addScaledVector(dir, 1.52), 3, i);
    bond(tail[i], methyl);
  }

  /* ---------------- Hydrogens ---------------- */
  const heavyCount = atoms.length;
  const neighbours: number[][] = atoms.map(() => []);
  for (const [a, b] of bonds) neighbours[a].push(b), neighbours[b].push(a);
  const CH = 1.09;
  const tetra = Math.acos(-1 / 3);
  for (let i = 0; i < heavyCount; i++) {
    const n = hCount[i];
    if (!n) continue;
    const c = P(i);
    const dirs = neighbours[i].map((j) => P(j).clone().sub(c).normalize());
    const sum = dirs.reduce((acc, d) => acc.add(d), new THREE.Vector3());
    const placed: THREE.Vector3[] = [];
    if (n === 1 && dirs.length >= 2) {
      placed.push(sum.clone().negate().normalize());
    } else if (n === 2 && dirs.length === 2) {
      const bisector = sum.clone().negate().normalize();
      const normal = new THREE.Vector3().crossVectors(dirs[0], dirs[1]).normalize();
      const a = tetra / 2;
      placed.push(bisector.clone().multiplyScalar(Math.cos(a)).addScaledVector(normal, Math.sin(a)));
      placed.push(bisector.clone().multiplyScalar(Math.cos(a)).addScaledVector(normal, -Math.sin(a)));
    } else if (n === 2 && dirs.length === 1) {
      // Terminal =CH2: in the plane of the neighbour's other bond.
      const j = neighbours[i][0];
      const other = neighbours[j].find((k) => k !== i)!;
      const axis = dirs[0].clone().negate();
      const inPlane = P(other).clone().sub(P(j)).projectOnVector(axis).sub(P(other).clone().sub(P(j))).normalize();
      for (const s of [1, -1])
        placed.push(axis.clone().multiplyScalar(0.5).addScaledVector(inPlane, s * 0.866).normalize());
    } else if (n === 3 && dirs.length === 1) {
      const axis = dirs[0].clone().negate();
      const ref = Math.abs(axis.z) < 0.9 ? z : new THREE.Vector3(1, 0, 0);
      const p1 = new THREE.Vector3().crossVectors(axis, ref).normalize();
      const p2 = new THREE.Vector3().crossVectors(axis, p1).normalize();
      for (let k = 0; k < 3; k++) {
        const a = (k / 3) * Math.PI * 2;
        placed.push(
          axis
            .clone()
            .multiplyScalar(-Math.cos(tetra))
            .addScaledVector(p1, Math.sin(tetra) * Math.cos(a))
            .addScaledVector(p2, Math.sin(tetra) * Math.sin(a)),
        );
      }
    }
    for (const dir of placed) {
      const h = add("H", c.clone().addScaledVector(dir.normalize(), CH), 0, atoms[i].tail);
      bond(i, h);
    }
  }

  return {
    atoms,
    bonds,
    nitrogens: N.map((i) => P(i).clone()),
    tailLength: tailSymbols.length,
  };
}
