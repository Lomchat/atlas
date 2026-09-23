/**
 * One helical turn of B-DNA (3.4 nm long, 2 nm wide; 1 unit = 0.34 nm),
 * atom by atom: sugar–phosphate backbones and base pairs (A–T in green/pink,
 * G–C in yellow/blue rings), joined by hydrogen bonds. The helix follows the
 * gentle curve it has around the histones (same base-pair frames as the
 * nucleosome scene) and continues beyond the frame in the surroundings, over
 * the histone core. The child "c-atom" is a camera-facing backbone carbon.
 */
import * as THREE from "three";
import type { Kit } from "../../../engine/kit";
import { rng } from "../../../engine/kit";
import type { SceneBuilder } from "../types";
import { molecule } from "../common/molecules";
import { instances, merge, smoothPath, sweepGeometry, type Placement } from "./cell-shapes";
import { BASE_COLORS, COMPLEMENT, RISE, basePair, dnaBonds, sequence, type BasePairModel, type DnaAtom, type Frame } from "./dna-model";
import { HISTONE_COLORS, NUC, octamerLobes } from "./nucleosome-layout";

const ANGSTROM = 1 / 3.4;
/** Radius of the DNA axis curve around the histone core, in DNA units. */
const BEND = (NUC.radius + (NUC.pitch / (2 * Math.PI)) ** 2 / NUC.radius) * (NUC.nm / 0.34);

/** Base-pair frame j (0 at the anchor) along the arch. */
export function dnaFrame(j: number): Frame {
  const a = (j * RISE * ANGSTROM) / BEND;
  const origin = new THREE.Vector3(BEND * Math.sin(a), BEND * Math.cos(a) - BEND, 0);
  const T = new THREE.Vector3(Math.cos(a), -Math.sin(a), 0);
  const U = new THREE.Vector3(Math.sin(a), Math.cos(a), 0);
  const W = new THREE.Vector3(0, 0, 1);
  return { origin, T, U, W };
}

/**
 * Ball-and-stick atoms, filled base rings and hydrogen bonds for some base
 * pairs. `ghosts` are neighbouring pairs drawn elsewhere: they only provide
 * the backbone bonds that cross the seam.
 */
function build(kit: Kit, pairs: BasePairModel[], env: boolean, segments: [number, number], ghosts: BasePairModel[] = []) {
  const group = new THREE.Group();
  const atoms: DnaAtom[] = [...pairs, ...ghosts].flatMap((pair) => pair.atoms);
  const ghostFrom = pairs.reduce((n, pair) => n + pair.atoms.length, 0);
  const bonds = dnaBonds(atoms, ANGSTROM).filter(([a, b]) => a < ghostFrom || b < ghostFrom);
  const model = molecule(
    kit,
    atoms.map((atom) => ({ symbol: atom.symbol, position: atom.position })),
    bonds,
    { atomScale: 0.25, bondRadius: 0.075, bondColor: "#ece6ff", env },
  );
  // The shared builder uses finely tessellated spheres; hundreds of atoms need lighter ones.
  const sphere = kit.geometry(new THREE.SphereGeometry(1, segments[0], segments[1]));
  const atomMeshes: THREE.InstancedMesh[] = [];
  const hidden = new THREE.Matrix4().makeScale(0, 0, 0);
  model.traverse((object) => {
    const mesh = object as THREE.InstancedMesh;
    if (!mesh.isInstancedMesh || !mesh.userData.symbol) return;
    mesh.geometry = sphere;
    atomMeshes.push(mesh);
    // A cool rim light separates the many overlapping atoms.
    const material = mesh.material as THREE.ShaderMaterial;
    material.uniforms.uRimColor.value.set("#dff4ff");
    material.uniforms.uUseRim.value = 1;
    material.uniforms.uRim.value = 0.55;
    // Ghost atoms (instances keep the order of the atom list) are not drawn here.
    let k = 0;
    atoms.forEach((atom, i) => {
      if (atom.symbol !== mesh.userData.symbol) return;
      if (i >= ghostFrom) mesh.setMatrixAt(k, hidden);
      k++;
    });
  });
  group.add(model);
  group.userData.atoms = atomMeshes;
  group.userData.sphere = sphere;

  // Each base is a coloured tile (A green, T pink, G yellow, C blue) under its atoms.
  const tiles: Placement[] = [];
  const x = new THREE.Vector3();
  const y = new THREE.Vector3();
  const basis = new THREE.Matrix4();
  for (const pair of pairs) {
    const mid = pair.c1.clone().lerp(pair.c2, 0.5);
    for (const [from, base] of [
      [pair.c1, pair.base],
      [pair.c2, COMPLEMENT[pair.base]],
    ] as const) {
      y.subVectors(mid, from);
      const length = y.length();
      y.normalize();
      x.crossVectors(y, pair.axis).normalize();
      const purine = base === "A" || base === "G";
      tiles.push({
        position: from.clone().lerp(mid, 0.52),
        quaternion: new THREE.Quaternion().setFromRotationMatrix(basis.makeBasis(x, y, pair.axis)),
        scale: new THREE.Vector3(purine ? 1.05 : 0.85, length * 0.86, 0.2),
        color: BASE_COLORS[base],
      });
    }
  }
  group.add(
    instances(
      kit.geometry(new THREE.CapsuleGeometry(0.5, 0.01, 4, 16).scale(1, 1 / 1.01, 1)),
      kit.toon("#ffffff", { rim: 0.35, rimColor: "#ffffff", gloss: 0.3, soft: 0.35, env }),
      tiles,
    ),
  );

  // A soft ribbon along each backbone, echoing the cartoon strands of the nucleosome.
  const ribbons = [pairs.map((pair) => pair.p1), pairs.map((pair) => pair.p2)]
    .filter((points) => points.length > 1)
    .map((points) => sweepGeometry(smoothPath(points, points.length * 6), { ra: 0.42, radial: 12 }));
  if (ribbons.length)
    group.add(
      new THREE.Mesh(
        merge(kit, ribbons),
        kit.halo("#ffb347", { opacity: env ? 0.3 : 0.42, inner: 1, power: 1.6, env }),
      ),
    );

  // Hydrogen bonds: two between A and T, three between G and C.
  const dots: Placement[] = [];
  for (const pair of pairs)
    for (const [a, b] of pair.hbonds)
      for (const t of [0.3, 0.5, 0.7]) dots.push({ position: a.clone().lerp(b, t), scale: 0.055 });
  group.add(
    instances(kit.geometry(new THREE.SphereGeometry(1, 6, 4)), kit.flat("#eafcff", { env }), dots),
  );
  return group;
}

const dna: SceneBuilder = ({ kit, level }) => {
  const root = new THREE.Group();
  const env = new THREE.Group();
  const anchorBp = NUC.anchorBp;
  const pairAt = (j: number) => basePair(sequence(anchorBp + j), anchorBp + j, dnaFrame(j), ANGSTROM);

  /* ---------------- One helical turn, atom by atom ---------------- */
  const subject: BasePairModel[] = [];
  for (let j = -5; j <= 5; j++) subject.push(pairAt(j));
  const helix = build(kit, subject, false, kit.quality === "high" ? [12, 8] : [9, 6]);
  root.add(helix);
  const nearSphere = helix.userData.sphere as THREE.BufferGeometry;
  const farSphere = kit.geometry(new THREE.SphereGeometry(1, 7, 5));
  const atomMeshes = helix.userData.atoms as THREE.InstancedMesh[];

  /* ---------------- Surroundings: the helix goes on, over the histones ---------------- */
  const reach = kit.count(11, 8);
  const left: BasePairModel[] = [];
  const right: BasePairModel[] = [];
  for (let j = 6; j <= reach; j++) {
    right.push(pairAt(j));
    left.push(pairAt(-j));
  }
  env.add(build(kit, left, true, [8, 5], [subject[0]]));
  env.add(build(kit, right, true, [8, 5], [subject[subject.length - 1]]));

  // The histone core underneath (in nucleosome units → DNA units), and its colours.
  const toDna = NUC.nm / 0.34;
  const core = new THREE.Group();
  const coreRandom = rng(8);
  const lobes: Placement[] = octamerLobes().map((lobe) => ({
    position: lobe.position.clone().multiplyScalar(toDna),
    scale: new THREE.Vector3(1.5, 1.42, 1.28).multiplyScalar(toDna),
    quaternion: new THREE.Quaternion().setFromEuler(new THREE.Euler(coreRandom() * 6, coreRandom() * 6, coreRandom() * 6)),
    color: new THREE.Color(HISTONE_COLORS[lobe.histone]).lerp(new THREE.Color("#1f1a5a"), 0.62),
  }));
  core.add(
    instances(
      kit.blob(1, { detail: 3, noise: 0.2, frequency: 2.6, seed: 13 }),
      kit.toon("#ffffff", { rim: 0.35, rimColor: "#9d8cff", gloss: 0.1, soft: 0.45, shadow: "#171046", opacity: 0.8, env: true }),
      lobes,
    ),
  );
  // Nucleosome centre relative to the anchor, in the DNA frame.
  const anchorRotation = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(...((level.anchor?.rotate ?? [0, -4.87, 0]).map((d) => (d * Math.PI) / 180) as [number, number, number])),
  );
  const anchorAt = new THREE.Vector3(...(level.anchor?.at ?? [0, NUC.radius, 1.144]));
  core.position.copy(anchorAt).negate().applyQuaternion(anchorRotation.clone().invert()).multiplyScalar(toDna);
  core.quaternion.copy(anchorRotation).invert();
  env.add(core);

  // Water molecules and ions jostling around the helix.
  const waterRandom = rng(64);
  const water: number[] = [];
  const sizes: number[] = [];
  for (let k = 0; k < kit.count(220, 100); k++) {
    const p = new THREE.Vector3((waterRandom() * 2 - 1) * 15, -4 + waterRandom() * 13, -8 + waterRandom() * 14);
    if (Math.abs(p.y) < 3.4 && p.z > -3.5 && p.z < 3.5) continue;
    water.push(p.x, p.y, p.z);
    sizes.push(0.6 + waterRandom() * 0.7);
  }
  const waterPoints = kit.points(water, { size: 0.28, sizes, color: "#8fe3ff", opacity: 0.45, soft: 0.5, twinkle: 0.3, env: true });
  env.add(waterPoints);
  const glow = kit.glow("#5f7bff", 22, { opacity: 0.25, env: true });
  glow.position.set(0, 0, -7);
  env.add(glow);

  // A soft light travelling along the helix, as if reading the letters.
  const reader = kit.glow("#bff6ff", 3.2, { opacity: 0.45 });
  root.add(reader);

  return {
    root,
    env,
    update({ time, immersion, current }) {
      // A small inset on the nucleosome needs far fewer triangles per atom.
      const sphere = immersion < 0.05 && !current ? farSphere : nearSphere;
      for (const mesh of atomMeshes) mesh.geometry = sphere;
      const j = ((time * 0.9) % 16) - 8;
      const frame = dnaFrame(j);
      reader.position.copy(frame.origin).addScaledVector(frame.W, 0.8);
      reader.material.opacity = 0.45 * Math.max(0, 1 - Math.abs(j) / 7);
      waterPoints.position.set(Math.sin(time * 0.2) * 0.3, Math.cos(time * 0.17) * 0.2, 0);
    },
  };
};

export default dna;
