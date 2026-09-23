/**
 * Chromatin (500 nm; 1 unit = 50 nm, a nucleosome bead ≈ 0.22 units).
 * 10-nm "beads on a string" fibres wander through the nucleoplasm: open,
 * loosely spaced stretches (where genes can be read) and compact clusters.
 * A cohesin ring holds the base of a loop and an RNA polymerase reads an
 * open stretch. The child level "nucleosome" is the bead at its anchor; the
 * beads on either side sit where the nucleosome scene draws its neighbours.
 */
import * as THREE from "three";
import { rng } from "../../../engine/kit";
import type { SceneBuilder } from "../types";
import { instances, merge, randomQuaternion, smoothPath, sweepGeometry, type Placement } from "./cell-shapes";
import { NEIGHBOURS, NUC } from "./nucleosome-layout";

const NUC_TO_CHROMATIN = NUC.nm / 50;
const BEAD = 0.11;

type Waypoint =
  | { kind: "to"; at: THREE.Vector3 }
  | { kind: "bead"; at: THREE.Vector3; quaternion?: THREE.Quaternion }
  | { kind: "domain"; at: THREE.Vector3; radius: number; beads: number };

interface Bead {
  position: THREE.Vector3;
  compact: boolean;
  quaternion?: THREE.Quaternion;
}

/** Walk a beads-on-a-string fibre through waypoints. */
function buildFibre(waypoints: Waypoint[], random: () => number, start: THREE.Vector3, heading0: THREE.Vector3) {
  const beads: Bead[] = [{ position: start.clone(), compact: false }];
  const p = start.clone();
  const heading = heading0.clone().normalize();
  const noise = new THREE.Vector3();
  const step = (length: number, toward: THREE.Vector3 | null, pull: number, wobble: number) => {
    if (toward) heading.lerp(toward.clone().sub(p).normalize(), pull);
    noise.set(random() - 0.5, random() - 0.5, random() - 0.5).multiplyScalar(wobble);
    heading.add(noise).normalize();
    p.addScaledVector(heading, length);
  };
  for (const w of waypoints) {
    if (w.kind === "to" || w.kind === "bead") {
      // The pull grows with every step so the fibre never circles its target.
      for (let guard = 0; guard < 120 && p.distanceTo(w.at) > 0.5; guard++) {
        step(0.36, w.at, Math.min(0.9, 0.2 + guard * 0.025), 0.55);
        beads.push({ position: p.clone(), compact: false });
      }
      if (w.kind === "bead") {
        p.copy(w.at);
        beads.push({ position: p.clone(), compact: false, quaternion: w.quaternion?.clone() });
      }
    } else {
      // Enter the domain, crumple inside it, then carry on.
      for (let guard = 0; guard < 120 && p.distanceTo(w.at) > w.radius * 0.8; guard++) {
        step(0.3, w.at, Math.min(0.9, 0.3 + guard * 0.03), 0.5);
        beads.push({ position: p.clone(), compact: false });
      }
      for (let k = 0; k < w.beads; k++) {
        const inward = p.distanceTo(w.at) > w.radius ? w.at : null;
        step(0.215, inward, inward ? 0.45 : 0, 1.6);
        beads.push({ position: p.clone(), compact: true });
      }
    }
  }
  return beads;
}

const chromatin: SceneBuilder = ({ kit, children }) => {
  const root = new THREE.Group();
  const env = new THREE.Group();
  const random = rng(314);
  const nucleosomeChild = children.find((child) => child.id === "nucleosome");
  const anchor = new THREE.Vector3(...(nucleosomeChild?.at ?? [0.5, -0.3, 1.3]));
  const before = anchor.clone().addScaledVector(NEIGHBOURS.before.position, NUC_TO_CHROMATIN);
  const after = anchor.clone().addScaledVector(NEIGHBOURS.after.position, NUC_TO_CHROMATIN);

  /* ---------------- Fibres ---------------- */
  const loopBase = new THREE.Vector3(3.1, 0.6, 0.3);
  const fibres: Bead[][] = [
    // Through the anchor: compact domain on the left, open loop held by cohesin on the right.
    buildFibre(
      [
        { kind: "domain", at: new THREE.Vector3(-3.4, 1.4, -1.0), radius: 1.35, beads: kit.count(170, 100) },
        { kind: "to", at: new THREE.Vector3(-1.9, -1.2, 0.6) },
        { kind: "bead", at: before, quaternion: NEIGHBOURS.before.quaternion },
        { kind: "bead", at: anchor, quaternion: new THREE.Quaternion() },
        { kind: "bead", at: after, quaternion: NEIGHBOURS.after.quaternion },
        { kind: "to", at: new THREE.Vector3(1.9, -0.6, 0.9) },
        { kind: "to", at: loopBase },
        { kind: "to", at: new THREE.Vector3(4.6, 2.6, 0.2) },
        { kind: "to", at: new THREE.Vector3(3.0, 3.4, -0.5) },
        { kind: "to", at: loopBase.clone().add(new THREE.Vector3(0.05, -0.05, -0.2)) },
        { kind: "domain", at: new THREE.Vector3(3.9, -2.4, -1.3), radius: 1.15, beads: kit.count(140, 80) },
        { kind: "to", at: new THREE.Vector3(7.5, -3.5, -1.5) },
      ],
      random,
      new THREE.Vector3(-7.5, 3.2, -1.5),
      new THREE.Vector3(1, -0.3, 0),
    ),
    // Across the top: two compact clusters.
    buildFibre(
      [
        { kind: "domain", at: new THREE.Vector3(-0.6, 3.3, -1.9), radius: 1.2, beads: kit.count(160, 90) },
        { kind: "to", at: new THREE.Vector3(1.4, 2.0, -1.0) },
        { kind: "domain", at: new THREE.Vector3(1.2, 4.6, -2.6), radius: 0.9, beads: kit.count(90, 50) },
        { kind: "to", at: new THREE.Vector3(7.2, 4.5, -2.5) },
      ],
      random,
      new THREE.Vector3(-6.5, 5.5, -2.5),
      new THREE.Vector3(1, -0.4, 0),
    ),
    // Along the bottom: an open stretch being transcribed, then a cluster.
    buildFibre(
      [
        { kind: "to", at: new THREE.Vector3(-3.6, -3.2, 0.4) },
        { kind: "to", at: new THREE.Vector3(-1.2, -3.6, 0.9) },
        { kind: "to", at: new THREE.Vector3(0.9, -3.4, 0.5) },
        { kind: "domain", at: new THREE.Vector3(0.9, -4.8, -1.8), radius: 1.0, beads: kit.count(120, 70) },
        { kind: "to", at: new THREE.Vector3(2.5, -6.5, -1.0) },
      ],
      random,
      new THREE.Vector3(-7.2, -2.0, -0.6),
      new THREE.Vector3(1, -0.2, 0.1),
    ),
  ];

  const openColors = ["#5aa8ff", "#6cc2ff", "#7d8dff", "#8fb6ff"];
  const compactColors = ["#5a3fd9", "#6b4cf2", "#4d35c0", "#7a52ff"];
  const beadPlacements: Placement[] = [];
  const strings: THREE.BufferGeometry[] = [];
  const beadRandom = rng(99);
  const deep = new THREE.Color("#2a1a6e");
  for (const fibre of fibres) {
    for (const bead of fibre) {
      const isAnchor = bead.position.equals(anchor);
      const colors = bead.compact ? compactColors : openColors;
      // Atmospheric depth: beads further back sink into the nucleoplasm.
      const depth = Math.min(1, Math.max(0, (bead.position.z + 4) / 5));
      const color = new THREE.Color(isAnchor ? "#8fb6ff" : colors[Math.floor(beadRandom() * colors.length)]).lerp(
        deep,
        0.62 * (1 - depth),
      );
      beadPlacements.push({
        position: bead.position,
        quaternion: bead.quaternion ?? randomQuaternion(beadRandom),
        scale: new THREE.Vector3(BEAD, BEAD, BEAD * 0.55),
        color,
      });
    }
    strings.push(sweepGeometry(smoothPath(fibre.map((b) => b.position), fibre.length * 2), { ra: 0.021, radial: 3 }));
  }
  const beadGeometry = kit.geometry(new THREE.IcosahedronGeometry(1, 1));
  const farBeadGeometry = kit.geometry(new THREE.IcosahedronGeometry(1, 0));
  const beadMaterial = kit.toon("#ffffff", { rim: 0.45, rimColor: "#e6e9ff", gloss: 0.35, shadow: "#26145e" });
  const beadsMesh = instances(beadGeometry, beadMaterial, beadPlacements);
  root.add(beadsMesh);
  root.add(new THREE.Mesh(merge(kit, strings), kit.toon("#e4ecff", { rim: 0.2, gloss: 0.3, shadow: "#8f94d8" })));

  /* ---------------- Cohesin ring at the base of the loop ---------------- */
  const cohesin = new THREE.Group();
  const ring = new THREE.Mesh(
    kit.geometry(new THREE.TorusGeometry(0.42, 0.07, 14, 48)),
    kit.toon("#ffd23f", { rim: 0.5, rimColor: "#fff3c2", gloss: 0.45, shadow: "#d9762c" }),
  );
  const head = new THREE.Mesh(kit.geometry(new THREE.SphereGeometry(0.11, 16, 12)), kit.toon("#ff9f43", { rim: 0.4, gloss: 0.4 }));
  head.position.set(0.42, 0, 0);
  cohesin.add(ring, head);
  cohesin.position.copy(loopBase).add(new THREE.Vector3(0.02, -0.02, -0.1));
  cohesin.lookAt(cohesin.position.clone().add(new THREE.Vector3(0.3, 0.7, 1)));
  root.add(cohesin);

  /* ---------------- RNA polymerase reading an open stretch ---------------- */
  const readPath = smoothPath(
    [new THREE.Vector3(-3.6, -3.2, 0.4), new THREE.Vector3(-1.2, -3.6, 0.9), new THREE.Vector3(0.9, -3.4, 0.5)],
    60,
  );
  const polymerase = new THREE.Mesh(
    kit.blob(0.24, { detail: 3, noise: 0.18, frequency: 2.4, seed: 6 }),
    kit.toon("#ff7a59", { rim: 0.5, rimColor: "#ffd0c2", gloss: 0.35, shadow: "#a8304f" }),
  );
  root.add(polymerase);
  const rnaCount = 70;
  const rna = kit.points(new Float32Array(rnaCount * 3), { size: 0.11, color: "#ffb13b" });
  const rnaAttribute = rna.geometry.getAttribute("position") as THREE.BufferAttribute;
  root.add(rna);

  /* ---------------- Nucleoplasm: drifting proteins ---------------- */
  const proteinRandom = rng(7);
  const proteins: number[] = [];
  const proteinColors: number[] = [];
  const palette = [new THREE.Color("#ffd23f"), new THREE.Color("#3ff2b5"), new THREE.Color("#ff8fc8"), new THREE.Color("#c9b3ff")];
  for (let k = 0; k < kit.count(120, 60); k++) {
    proteins.push((proteinRandom() * 2 - 1) * 7, (proteinRandom() * 2 - 1) * 5.5, -3 + proteinRandom() * 5);
    const c = palette[k % palette.length];
    proteinColors.push(c.r, c.g, c.b);
  }
  const proteinPoints = kit.points(proteins, { size: 0.09, colors: proteinColors, soft: 0.3, twinkle: 0.3, opacity: 0.85 });
  root.add(proteinPoints);

  /* ---------------- Surroundings: more chromatin further away ---------------- */
  // More fibres criss-crossing the volume behind the main ones (surroundings).
  const backFibres: Bead[][] = [];
  const extraRandom = rng(4242);
  const box = (x: number, y: number, z0: number, z1: number) =>
    new THREE.Vector3((extraRandom() * 2 - 1) * x, (extraRandom() * 2 - 1) * y, z0 + extraRandom() * (z1 - z0));
  for (let f = 0; f < kit.count(6, 3); f++) {
    const side = f % 2 === 0 ? -1 : 1;
    const start = new THREE.Vector3(side * 8, (extraRandom() * 2 - 1) * 5, -3.5 + extraRandom() * 2);
    const domain = box(4.5, 3.6, -4, -1.5);
    const exit = new THREE.Vector3((extraRandom() * 2 - 1) * 6, (extraRandom() < 0.5 ? -1 : 1) * 6.5, -3 + extraRandom() * 2);
    backFibres.push(
      buildFibre(
        [
          { kind: "to", at: box(5, 4, -3.5, -1) },
          { kind: "domain", at: domain, radius: 0.9 + extraRandom() * 0.5, beads: kit.count(90, 50) },
          { kind: "to", at: exit },
        ],
        extraRandom,
        start,
        new THREE.Vector3(-side, 0, 0),
      ),
    );
  }

  const envRandom = rng(2718);
  const envBeads: Placement[] = [];
  const envStrings: THREE.BufferGeometry[] = [];
  const envStarts: [THREE.Vector3, THREE.Vector3, THREE.Vector3][] = [
    [new THREE.Vector3(-14, 6, -6), new THREE.Vector3(-8, 1, -8), new THREE.Vector3(-3, 6, -10)],
    [new THREE.Vector3(14, 7, -7), new THREE.Vector3(9, 2, -9), new THREE.Vector3(12, -6, -6)],
    [new THREE.Vector3(-13, -7, -5), new THREE.Vector3(-7, -6, -9), new THREE.Vector3(-1, -9, -7)],
    [new THREE.Vector3(3, 9, -9), new THREE.Vector3(0, 3, -11), new THREE.Vector3(-6, 8, -12)],
    [new THREE.Vector3(9, -9, -3), new THREE.Vector3(8, -4, -1.5), new THREE.Vector3(12, 0, -3)],
    [new THREE.Vector3(-12, 0, -2), new THREE.Vector3(-9, -3, -1), new THREE.Vector3(-11, 3, -2.5)],
  ];
  const farFibres = envStarts.map(([a, b, c]) =>
    buildFibre(
      [
        { kind: "domain", at: b, radius: 1.3, beads: kit.count(90, 50) },
        { kind: "to", at: c },
      ],
      envRandom,
      a,
      b.clone().sub(a),
    ),
  );
  for (const fibre of [...backFibres, ...farFibres]) {
    for (const bead of fibre) {
      const depth = Math.min(1, Math.max(0, (bead.position.z + 6) / 6));
      envBeads.push({
        position: bead.position,
        quaternion: randomQuaternion(envRandom),
        scale: new THREE.Vector3(BEAD, BEAD, BEAD * 0.55),
        color: new THREE.Color(bead.compact ? "#5a3fd9" : "#5aa8ff").lerp(deep, 0.35 + 0.4 * (1 - depth)),
      });
    }
    envStrings.push(sweepGeometry(smoothPath(fibre.map((bead) => bead.position), fibre.length * 2), { ra: 0.021, radial: 3 }));
  }
  env.add(
    instances(farBeadGeometry, kit.toon("#ffffff", { rim: 0.35, rimColor: "#a9b4ff", gloss: 0.2, shadow: "#1d1150", env: true }), envBeads),
    new THREE.Mesh(merge(kit, envStrings), kit.toon("#9fb0ea", { rim: 0.1, env: true })),
  );
  const glow = kit.glow("#7c5cff", 26, { opacity: 0.25, env: true });
  glow.position.set(0, 0, -9);
  env.add(glow);

  const tmp = new THREE.Vector3();
  return {
    root,
    env,
    update({ time, immersion, current }) {
      // Seen as a small patch from the nucleus, simpler beads are enough.
      beadsMesh.geometry = immersion < 0.05 && !current ? farBeadGeometry : beadGeometry;
      // The polymerase slides along the gene, spooling out RNA behind it.
      const u = (time * 0.04 + 0.35) % 1;
      const at = u * (readPath.length - 1);
      polymerase.position.copy(readPath[Math.floor(at)]).add(tmp.set(0, 0.07, 0.1));
      polymerase.rotation.set(time * 0.4, time * 0.3, 0);
      const length = 0.35 + 0.65 * u;
      for (let k = 0; k < rnaCount; k++) {
        const along = (k / (rnaCount - 1)) * length;
        const t = Math.max(0, at - along * 18);
        const base = readPath[Math.floor(t)];
        tmp.copy(base).add(
          new THREE.Vector3(
            Math.sin(k * 0.45 + time * 0.8) * 0.18 * along,
            0.14 + along * 1.1 + Math.sin(k * 0.3 + time) * 0.06,
            0.18 + Math.cos(k * 0.35 + time * 0.6) * 0.2 * along,
          ),
        );
        rnaAttribute.setXYZ(k, tmp.x, tmp.y, tmp.z);
      }
      rnaAttribute.needsUpdate = true;
      cohesin.rotation.z = Math.sin(time * 0.7) * 0.05;
      proteinPoints.position.set(Math.sin(time * 0.13) * 0.2, Math.cos(time * 0.11) * 0.15, 0);
    },
  };
};

export default chromatin;
