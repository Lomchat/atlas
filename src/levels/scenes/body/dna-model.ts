/**
 * An atomic B-DNA model shared by the `dna` and `nucleosome` scenes.
 *
 * Bases use the standard reference-frame coordinates of Olson et al.,
 * J. Mol. Biol. 313:229 (2001). The sugar–phosphate backbone is the mean
 * geometry of the central nucleotides of the Dickerson dodecamer (PDB 1BNA),
 * expressed in each base's own frame. An ideal helix is rebuilt from that
 * template with 10.5 base pairs per turn and a rise of 3.38 Å.
 *
 * Frames: along a DNA path, T is the helix axis (5'→3' of strand I), U a
 * reference direction across it and W = T × U. Base pair k is rotated by
 * Ω(k) about T; its x axis (towards the major groove) is cos Ω·U + sin Ω·W.
 * Only `three` is imported so the geometry can be checked from Node.
 */
import * as THREE from "three";

export type Base = "A" | "T" | "G" | "C";
export const COMPLEMENT: Record<Base, Base> = { A: "T", T: "A", G: "C", C: "G" };
/** Fill colours of the bases (A–T and G–C pairs are easy to tell apart). */
export const BASE_COLORS: Record<Base, string> = {
  A: "#4fe08a",
  T: "#ff6b8a",
  G: "#ffc93f",
  C: "#45b6ff",
};

export const RISE = 3.38; // Å per base pair
export const TWIST = (2 * Math.PI) / 10.5; // radians per base pair
/** Phase so that the major groove faces the histones at the nucleosome dyad (bp 73). */
export const OMEGA0 = Math.PI - TWIST * 73;
export const omega = (k: number) => OMEGA0 + TWIST * k;

type XY = [string, number, number];
const BASE_ATOMS: Record<Base, XY[]> = {
  A: [["N9", -1.291, 4.498], ["C8", 0.024, 4.897], ["N7", 0.877, 3.902], ["C5", 0.071, 2.771], ["C6", 0.369, 1.398], ["N6", 1.611, 0.909], ["N1", -0.668, 0.532], ["C2", -1.912, 1.023], ["N3", -2.32, 2.29], ["C4", -1.267, 3.124]],
  G: [["N9", -1.289, 4.551], ["C8", 0.023, 4.962], ["N7", 0.87, 3.969], ["C5", 0.071, 2.833], ["C6", 0.424, 1.46], ["O6", 1.554, 0.955], ["N1", -0.7, 0.641], ["C2", -1.999, 1.087], ["N2", -2.949, 0.139], ["N3", -2.342, 2.364], ["C4", -1.265, 3.177]],
  C: [["N1", -1.285, 4.542], ["C2", -1.472, 3.158], ["O2", -2.628, 2.709], ["N3", -0.391, 2.344], ["C4", 0.837, 2.868], ["N4", 1.875, 2.027], ["C5", 1.056, 4.275], ["C6", -0.023, 5.068]],
  T: [["N1", -1.284, 4.5], ["C2", -1.462, 3.135], ["O2", -2.562, 2.608], ["N3", -0.298, 2.407], ["C4", 0.994, 2.897], ["O4", 1.944, 2.119], ["C5", 1.106, 4.338], ["C7", 2.466, 4.961], ["C6", -0.024, 5.057]],
};
/** Sugar–phosphate atoms in the base frame (Å), mean of 1BNA nucleotides 3–10. */
const BACKBONE: [string, number, number, number][] = [
  ["P", -0.272, 9.444, -2.032],
  ["OP1", -0.955, 10.691, -2.216],
  ["OP2", 0.958, 9.476, -1.265],
  ["O5'", -1.284, 8.45, -1.389],
  ["C5'", -2.527, 8.24, -1.999],
  ["C4'", -3.197, 7.186, -1.221],
  ["O4'", -2.395, 6.027, -1.295],
  ["C3'", -3.365, 7.477, 0.244],
  ["O3'", -4.663, 7.435, 0.644],
  ["C2'", -2.519, 6.471, 0.873],
  ["C1'", -2.506, 5.356, -0.102],
];
/** Rings to fill with the base colour. */
const RINGS: Record<Base, string[][]> = {
  A: [["N1", "C2", "N3", "C4", "C5", "C6"], ["C4", "C5", "N7", "C8", "N9"]],
  G: [["N1", "C2", "N3", "C4", "C5", "C6"], ["C4", "C5", "N7", "C8", "N9"]],
  C: [["N1", "C2", "N3", "C4", "C5", "C6"]],
  T: [["N1", "C2", "N3", "C4", "C5", "C6"]],
};
/** Watson–Crick hydrogen bonds (strand I atom, strand II atom). */
const HBONDS: Record<Base, [string, string][]> = {
  A: [["N6", "O4"], ["N1", "N3"]],
  T: [["O4", "N6"], ["N3", "N1"]],
  G: [["O6", "N4"], ["N1", "N3"], ["N2", "O2"]],
  C: [["N4", "O6"], ["N3", "N1"], ["O2", "N2"]],
};

export interface Frame {
  origin: THREE.Vector3;
  T: THREE.Vector3;
  U: THREE.Vector3;
  W: THREE.Vector3;
}

export interface DnaAtom {
  symbol: string;
  name: string;
  position: THREE.Vector3;
  strand: 1 | 2;
  bp: number;
}

export interface BasePairModel {
  atoms: DnaAtom[];
  /** Ring polygons (positions) with their base. */
  rings: { base: Base; points: THREE.Vector3[] }[];
  /** Hydrogen bonds between the two bases. */
  hbonds: [THREE.Vector3, THREE.Vector3][];
  /** Phosphorus atoms of both strands (for cartoon backbones). */
  p1: THREE.Vector3;
  p2: THREE.Vector3;
  c1: THREE.Vector3;
  c2: THREE.Vector3;
  /** Helix axis direction at this pair. */
  axis: THREE.Vector3;
  base: Base;
}

/** Map base-frame coordinates (Å) of strand I or II into a path frame, scaled to scene units. */
function mapper(frame: Frame, angle: number, scale: number, strand: 1 | 2) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const ex = frame.U.clone().multiplyScalar(c).addScaledVector(frame.W, s);
  const ey = frame.U.clone().multiplyScalar(-s).addScaledVector(frame.W, c);
  const ez = frame.T.clone();
  const flip = strand === 2 ? -1 : 1;
  return (x: number, y: number, z: number) =>
    frame.origin
      .clone()
      .addScaledVector(ex, x * scale)
      .addScaledVector(ey, flip * y * scale)
      .addScaledVector(ez, flip * z * scale);
}

/** Atoms of base pair `bp` (strand I carries `base`), in a frame, `scale` scene units per Å. */
export function basePair(base: Base, bp: number, frame: Frame, scale: number): BasePairModel {
  const angle = omega(bp);
  const atoms: DnaAtom[] = [];
  const named: [Map<string, THREE.Vector3>, Map<string, THREE.Vector3>] = [new Map(), new Map()];
  const bases: [Base, Base] = [base, COMPLEMENT[base]];
  ([1, 2] as const).forEach((strand) => {
    const map = mapper(frame, angle, scale, strand);
    const b = bases[strand - 1];
    for (const [name, x, y] of BASE_ATOMS[b]) {
      const position = map(x, y, 0);
      named[strand - 1].set(name, position);
      atoms.push({ symbol: name[0], name, position, strand, bp });
    }
    for (const [name, x, y, z] of BACKBONE) {
      const position = map(x, y, z);
      named[strand - 1].set(name, position);
      atoms.push({ symbol: name === "P" ? "P" : name[0] === "O" ? "O" : "C", name, position, strand, bp });
    }
  });
  const rings = ([1, 2] as const).flatMap((strand) =>
    RINGS[bases[strand - 1]].map((ring) => ({
      base: bases[strand - 1],
      points: ring.map((name) => named[strand - 1].get(name)!),
    })),
  );
  const hbonds = HBONDS[base].map(
    ([a, b]) => [named[0].get(a)!, named[1].get(b)!] as [THREE.Vector3, THREE.Vector3],
  );
  return {
    atoms,
    rings,
    hbonds,
    p1: named[0].get("P")!,
    p2: named[1].get("P")!,
    c1: named[0].get("C1'")!,
    c2: named[1].get("C1'")!,
    axis: frame.T.clone(),
    base,
  };
}

/** Bonds by distance within one model (Å threshold scaled to scene units). */
export function dnaBonds(atoms: DnaAtom[], scale: number) {
  const max = 1.9 * scale;
  const max2 = max * max;
  const bonds: [number, number][] = [];
  for (let i = 0; i < atoms.length; i++)
    for (let j = i + 1; j < atoms.length; j++) {
      if (Math.abs(atoms[i].bp - atoms[j].bp) > 1) continue;
      if (atoms[i].position.distanceToSquared(atoms[j].position) <= max2) bonds.push([i, j]);
    }
  return bonds;
}

/** A deterministic, pleasant sequence (contains both pair types in every turn). */
export function sequence(k: number): Base {
  const motif: Base[] = ["G", "A", "T", "T", "A", "C", "A", "G", "C", "T", "C", "G", "A", "C", "G", "T", "A", "C", "C", "G", "A"];
  return motif[((k % motif.length) + motif.length) % motif.length];
}
