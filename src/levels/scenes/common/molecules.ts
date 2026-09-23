/**
 * Shared chemistry look: one colour per element across every molecular scene,
 * and a ball-and-stick builder based on instancing (two draw calls per element).
 */
import * as THREE from "three";
import type { Kit } from "../../../engine/kit";

/** Illustrated element colours (inspired by CPK conventions, brightened). */
export const ELEMENT_COLORS: Record<string, string> = {
  H: "#f4f1ff",
  C: "#4b4970",
  N: "#3f7bff",
  O: "#ff4f5e",
  P: "#ffa62b",
  S: "#ffd23f",
  Mg: "#6fe36b",
  Fe: "#ff7b3a",
};

/** Relative display radii (≈ scaled covalent radii). */
export const ELEMENT_RADII: Record<string, number> = {
  H: 0.55,
  C: 0.8,
  N: 0.78,
  O: 0.76,
  P: 1.0,
  S: 1.0,
  Mg: 1.1,
  Fe: 1.15,
};

export interface MoleculeAtom {
  symbol: string;
  position: THREE.Vector3;
}

export interface MoleculeOptions {
  /** Multiplies ELEMENT_RADII (units). Default 0.35. */
  atomScale?: number;
  /** Bond cylinder radius (units). Default 0.09; 0 hides bonds. */
  bondRadius?: number;
  bondColor?: string;
  env?: boolean;
  /** Space-filling look: large overlapping spheres, no bonds. */
  spaceFilling?: boolean;
  /** Sphere segments (width, height). Default [24, 16]; use fewer for distant molecules. */
  sphereDetail?: [number, number];
}

/** Build a ball-and-stick (or space-filling) molecule. */
export function molecule(
  kit: Kit,
  atoms: MoleculeAtom[],
  bonds: [number, number][],
  options: MoleculeOptions = {},
) {
  const group = new THREE.Group();
  const scale = options.atomScale ?? (options.spaceFilling ? 1.1 : 0.35);
  const [segments, rings] = options.sphereDetail ?? [24, 16];
  const sphere = kit.geometry(new THREE.SphereGeometry(1, segments, rings));
  const bySymbol = new Map<string, MoleculeAtom[]>();
  for (const atom of atoms) {
    const list = bySymbol.get(atom.symbol) ?? [];
    list.push(atom);
    bySymbol.set(atom.symbol, list);
  }
  const matrix = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  for (const [symbol, list] of bySymbol) {
    const mesh = new THREE.InstancedMesh(
      sphere,
      kit.toon(ELEMENT_COLORS[symbol] ?? "#cccccc", { rim: 0.4, gloss: 0.35, env: options.env }),
      list.length,
    );
    list.forEach((atom, k) => {
      s.setScalar((ELEMENT_RADII[symbol] ?? 0.8) * scale);
      mesh.setMatrixAt(k, matrix.compose(atom.position, q.identity(), s));
    });
    mesh.userData.symbol = symbol;
    group.add(mesh);
  }
  const bondRadius = options.spaceFilling ? 0 : (options.bondRadius ?? 0.09);
  if (bondRadius > 0 && bonds.length) {
    const cylinder = kit.geometry(new THREE.CylinderGeometry(1, 1, 1, 10, 1, true));
    const mesh = new THREE.InstancedMesh(
      cylinder,
      kit.toon(options.bondColor ?? "#d9d4ff", { rim: 0.2, env: options.env }),
      bonds.length,
    );
    const up = new THREE.Vector3(0, 1, 0);
    const d = new THREE.Vector3();
    const mid = new THREE.Vector3();
    bonds.forEach(([a, b], k) => {
      const pa = atoms[a].position;
      const pb = atoms[b].position;
      d.subVectors(pb, pa);
      mid.addVectors(pa, pb).multiplyScalar(0.5);
      q.setFromUnitVectors(up, d.clone().normalize());
      s.set(bondRadius, d.length(), bondRadius);
      mesh.setMatrixAt(k, matrix.compose(mid, q, s));
    });
    group.add(mesh);
  }
  return group;
}

/** Guess bonds from distances (for generated structures). */
export function bondsByDistance(atoms: MoleculeAtom[], maxDistance: number) {
  const bonds: [number, number][] = [];
  for (let i = 0; i < atoms.length; i++)
    for (let j = i + 1; j < atoms.length; j++)
      if (atoms[i].position.distanceTo(atoms[j].position) <= maxDistance) bonds.push([i, j]);
  return bonds;
}
