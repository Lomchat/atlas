/**
 * Bacteria on a crumb of debris (1 unit = 1 µm).
 * The subject is a rod-shaped bacterium seen through its translucent wall
 * (its DNA floats freely: no nucleus), with a bundle of helical flagella.
 * The child level "virus" (phages landing on a bacterium) is anchored on its
 * wall, facing the camera; that part of the rod never moves.
 */
import * as THREE from "three";
import { rng } from "../../../engine/kit";
import type { Kit } from "../../../engine/kit";
import type { SceneBuilder } from "../types";
import { taperedTube } from "./creatures";
import { HERO } from "./shared";

/** One helical flagellum along +X, `length` long, attached at the origin. */
function helix(kit: Kit, length: number, amplitude: number, pitch: number) {
  const points: THREE.Vector3[] = [];
  const n = 90;
  for (let i = 0; i <= n; i++) {
    const x = (i / n) * length;
    // The hook: the helix grows out of a short straight base.
    const grow = THREE.MathUtils.smoothstep(x, 0, 0.8);
    const a = (x / pitch) * Math.PI * 2;
    points.push(new THREE.Vector3(x, Math.cos(a) * amplitude * grow, Math.sin(a) * amplitude * grow));
  }
  return taperedTube(kit, points, (t) => 0.032 * (1 - 0.3 * t), { segments: 180, radial: 6 });
}

interface Rod {
  at: THREE.Vector3;
  rotation: THREE.Euler;
  half: number;
  radius: number;
  color: string;
  flagella: number;
  /** Divides: two cells joined by a pinched septum. */
  dividing?: boolean;
  drift: number;
  phase: number;
}

const bacteria: SceneBuilder = ({ kit, children }) => {
  const root = new THREE.Group();
  const env = new THREE.Group();
  const random = rng(11);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();
  const X = new THREE.Vector3(1, 0, 0);
  const e = new THREE.Euler();

  const virusChild = children.find((child) => child.id === "virus");
  const virusAt = new THREE.Vector3(...(virusChild?.at ?? [2.32, 0.525, 0.196]));
  // The phages' landing site: the wall point right under the virus level.
  const axisPoint = new THREE.Vector3(THREE.MathUtils.clamp(virusAt.x, -HERO.half, HERO.half), 0, 0);
  const landing = virusAt.clone().sub(axisPoint).setLength(HERO.radius).add(axisPoint);

  /* ---------------- The hero bacterium (still: it carries the virus anchor). ---------------- */
  const hero = new THREE.Group();
  root.add(hero);
  const capsule = (half: number, radius: number) =>
    kit.geometry(new THREE.CapsuleGeometry(radius, half * 2, 12, 36).rotateZ(Math.PI / 2));
  // Inside: a tangle of DNA (the nucleoid) and ribosomes.
  const dnaPoints: THREE.Vector3[] = [];
  for (let i = 0; i <= 90; i++) {
    const t = i / 90;
    dnaPoints.push(
      new THREE.Vector3(
        Math.sin(t * 13.1) * 1.1 + Math.sin(t * 5.3) * 0.35,
        Math.sin(t * 17.3 + 1) * 0.26,
        Math.cos(t * 11.7) * 0.26,
      ),
    );
  }
  const dna = new THREE.Mesh(
    kit.tube(dnaPoints, 0.04, { segments: 600, radial: 6 }),
    kit.toon("#c79bff", { rim: 0.4, rimColor: "#f0e0ff", gloss: 0.2 }),
  );
  hero.add(dna);
  const ribosomes: number[] = [];
  for (let i = 0; i < kit.count(260, 140); i++) {
    const x = (random() * 2 - 1) * (HERO.half + 0.25);
    const a = random() * Math.PI * 2;
    const r = Math.sqrt(random()) * HERO.radius * 0.78;
    if (Math.abs(x) > HERO.half && Math.hypot(Math.abs(x) - HERO.half, r) > HERO.radius * 0.8) continue;
    ribosomes.push(x, Math.cos(a) * r, Math.sin(a) * r);
  }
  hero.add(kit.points(ribosomes, { size: 0.06, color: "#fff1a8", soft: 0.2 }));
  const heroBody = new THREE.Mesh(
    capsule(HERO.half, HERO.radius),
    kit.toon("#a6f05a", { opacity: 0.62, rim: 0.75, rimColor: "#f0ffd0", gloss: 0.35, soft: 0.3, depthWrite: false, shadow: "#3d8a5a" }),
  );
  heroBody.renderOrder = 2;
  hero.add(heroBody);
  const heroGlow = new THREE.Mesh(heroBody.geometry, kit.halo("#d4ff9a", { opacity: 0.6, power: 2.2 }));
  heroGlow.scale.setScalar(1.04);
  hero.add(heroGlow);
  // Fimbriae: short straight hairs used to stick to surfaces.
  const hairCount = kit.count(120, 60);
  const hairs = new THREE.InstancedMesh(
    kit.geometry(new THREE.CylinderGeometry(0.014, 0.014, 1, 4).translate(0, 0.5, 0)),
    kit.flat("#e6ffc0", { opacity: 0.75 }),
    hairCount,
  );
  const n = new THREE.Vector3();
  let placed = 0;
  for (let tries = 0; placed < hairCount && tries < 800; tries++) {
    const x = (random() * 2 - 1) * HERO.half;
    const a = random() * Math.PI * 2;
    n.set(0, Math.cos(a), Math.sin(a));
    p.set(x, n.y * HERO.radius, n.z * HERO.radius);
    // Keep the phage landing site clear.
    if (p.distanceTo(landing) < 0.5) continue;
    q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n.clone().add(new THREE.Vector3((random() - 0.5) * 0.4, 0, 0)).normalize());
    hairs.setMatrixAt(placed++, m.compose(p, q, s.set(1, 0.3 + random() * 0.3, 1)));
  }
  hairs.count = placed;
  hero.add(hairs);

  /* ---------------- Other bacteria, drifting ---------------- */
  const rods: Rod[] = [
    { at: new THREE.Vector3(-4.4, -3.4, -0.5), rotation: new THREE.Euler(0.3, 0.4, 0.3), half: 1.3, radius: 0.46, color: "#5ff2b5", flagella: 2, dividing: true, drift: 0.2, phase: 0 },
    { at: new THREE.Vector3(5.6, 3.2, -1.2), rotation: new THREE.Euler(0.2, -0.5, -0.5), half: 0.9, radius: 0.45, color: "#ffd84a", flagella: 3, drift: 0.25, phase: 1 },
    { at: new THREE.Vector3(5.2, -3.5, 0.6), rotation: new THREE.Euler(-0.2, 0.3, 0.25), half: 0.8, radius: 0.42, color: "#b8f55a", flagella: 1, drift: 0.2, phase: 2 },
    { at: new THREE.Vector3(-5.2, 3.6, -2), rotation: new THREE.Euler(0.5, 0.2, -0.8), half: 1.0, radius: 0.44, color: "#7fe0ff", flagella: 2, drift: 0.25, phase: 3 },
    { at: new THREE.Vector3(9.6, -0.8, -3), rotation: new THREE.Euler(0.1, 0.8, 1.2), half: 0.7, radius: 0.4, color: "#5ff2b5", flagella: 1, drift: 0.3, phase: 4 },
    { at: new THREE.Vector3(-9.8, 0.4, -2.5), rotation: new THREE.Euler(0.2, -0.3, 0.9), half: 0.9, radius: 0.43, color: "#ffd84a", flagella: 2, drift: 0.25, phase: 5 },
  ];
  const rodMaterials = new Map<string, THREE.Material>();
  const material = (color: string) => {
    let found = rodMaterials.get(color);
    if (!found) {
      found = kit.toon(color, { rim: 0.6, rimColor: "#ffffff", gloss: 0.3, soft: 0.3 });
      rodMaterials.set(color, found);
    }
    return found;
  };
  const rodGroups: { group: THREE.Group; rod: Rod; halves?: THREE.Mesh[] }[] = [];
  const attach: { owner: THREE.Object3D; at: THREE.Vector3; dir: THREE.Vector3; scale: number; spin: number }[] = [];
  for (const rod of rods) {
    const group = new THREE.Group();
    group.position.copy(rod.at);
    group.rotation.copy(rod.rotation);
    if (rod.dividing) {
      const half = rod.half / 2;
      const halves = [-1, 1].map((side) => {
        const cell = new THREE.Mesh(capsule(half * 0.95, rod.radius), material(rod.color));
        cell.position.x = side * (half + rod.radius * 0.72);
        group.add(cell);
        return cell;
      });
      rodGroups.push({ group, rod, halves });
    } else {
      group.add(new THREE.Mesh(capsule(rod.half, rod.radius), material(rod.color)));
      rodGroups.push({ group, rod });
    }
    const tip = rod.dividing ? rod.half + rod.radius * 1.9 : rod.half + rod.radius * 0.9;
    for (let f = 0; f < rod.flagella; f++) {
      const a = (f / Math.max(1, rod.flagella)) * Math.PI * 2 + random();
      attach.push({
        owner: group,
        at: new THREE.Vector3(-tip, Math.cos(a) * rod.radius * 0.35, Math.sin(a) * rod.radius * 0.35),
        dir: new THREE.Vector3(-1, Math.cos(a) * 0.25, Math.sin(a) * 0.25).normalize(),
        scale: 0.85 + random() * 0.3,
        spin: 14 + random() * 4,
      });
    }
    root.add(group);
  }
  // Hero flagella: a bundle trailing from the left pole.
  for (let f = 0; f < 5; f++) {
    const a = (f / 5) * Math.PI * 2 + 0.4;
    attach.push({
      owner: hero,
      at: new THREE.Vector3(-(HERO.half + HERO.radius * 0.8), Math.cos(a) * 0.28, Math.sin(a) * 0.28),
      dir: new THREE.Vector3(-1, Math.cos(a) * 0.18 - 0.12, Math.sin(a) * 0.18).normalize(),
      scale: 1 + f * 0.05,
      spin: 16,
    });
  }

  /* Round bacteria (cocci): a chain and a pair. */
  const cocciSpecs = [
    { at: new THREE.Vector3(-9.2, 5.4, -2.2), n: 5, dir: new THREE.Vector3(0.3, -1, 0.2).normalize(), color: "#ff7ab8" },
    { at: new THREE.Vector3(1.6, 5.0, -2.5), n: 2, dir: new THREE.Vector3(1, 0.3, 0).normalize(), color: "#c79bff" },
    { at: new THREE.Vector3(0.6, -5.2, -1), n: 3, dir: new THREE.Vector3(1, -0.2, 0.3).normalize(), color: "#ff7ab8" },
  ];
  const cocciTotal = cocciSpecs.reduce((sum, c) => sum + c.n, 0);
  const cocci = new THREE.InstancedMesh(
    kit.geometry(new THREE.SphereGeometry(0.5, 24, 16)),
    kit.toon("#ffffff", { rim: 0.6, rimColor: "#ffffff", gloss: 0.3, soft: 0.3 }),
    cocciTotal,
  );
  const tint = new THREE.Color();
  let ci = 0;
  for (const spec of cocciSpecs) for (let i = 0; i < spec.n; i++) cocci.setColorAt(ci++, tint.set(spec.color));
  root.add(cocci);

  /* A spiral bacterium (spirillum). */
  const spiralPoints: THREE.Vector3[] = [];
  for (let i = 0; i <= 60; i++) {
    const t = i / 60;
    spiralPoints.push(new THREE.Vector3((t - 0.5) * 4.2, Math.cos(t * Math.PI * 5) * 0.35, Math.sin(t * Math.PI * 5) * 0.35));
  }
  const spirillum = new THREE.Mesh(
    taperedTube(kit, spiralPoints, (t) => 0.26 * Math.pow(Math.sin(Math.PI * t), 0.25), { segments: 120, radial: 12 }),
    kit.toon("#b08cff", { rim: 0.6, rimColor: "#f0e6ff", gloss: 0.3 }),
  );
  spirillum.position.set(8.2, 4.4, -3.2);
  spirillum.rotation.set(0.4, 0.3, -0.35);
  root.add(spirillum);

  /* All flagella in one instanced mesh, spinning about their own axis like propellers. */
  const flagellumGeometry = helix(kit, 5.5, 0.26, 2.2);
  const flagella = new THREE.InstancedMesh(
    flagellumGeometry,
    kit.toon("#d8fff0", { rim: 0.3, gloss: 0.2, soft: 0.5, opacity: 0.75, depthWrite: false }),
    attach.length,
  );
  root.add(flagella);
  const spinQ = new THREE.Quaternion();
  const baseQ = new THREE.Quaternion();
  const worldAt = new THREE.Vector3();
  const worldQ = new THREE.Quaternion();
  const ownerQ = new THREE.Quaternion();
  const updateFlagella = (time: number) => {
    attach.forEach((f, i) => {
      f.owner.updateMatrix();
      worldAt.copy(f.at).applyMatrix4(f.owner.matrix);
      ownerQ.setFromEuler(f.owner.rotation);
      baseQ.setFromUnitVectors(X, f.dir);
      spinQ.setFromAxisAngle(X, -time * f.spin);
      worldQ.copy(ownerQ).multiply(baseQ).multiply(spinQ);
      flagella.setMatrixAt(i, m.compose(worldAt, worldQ, s.setScalar(f.scale)));
    });
    flagella.instanceMatrix.needsUpdate = true;
  };

  /* ---------------- Surroundings: more bacteria in the distance, particles ---------------- */
  const far = new THREE.InstancedMesh(
    capsule(0.8, 0.42),
    kit.toon("#ffffff", { rim: 0.5, gloss: 0.2, opacity: 0.32, env: true, depthWrite: false }),
    kit.count(26, 14),
  );
  const farColors = ["#5fd2a0", "#8fd45a", "#d9c04a", "#d27ab0", "#6fb8e0"];
  for (let i = 0; i < far.count; i++) {
    e.set(random() * 6, random() * 6, random() * 6);
    const at = new THREE.Vector3((random() * 2 - 1) * 17, (random() * 2 - 1) * 10, -10 - random() * 5);
    far.setMatrixAt(i, m.compose(at, q.setFromEuler(e), s.setScalar(0.6 + random() * 0.3)));
    far.setColorAt(i, tint.set(farColors[i % farColors.length]));
  }
  env.add(far);
  const specks: number[] = [];
  const speckSizes: number[] = [];
  for (let i = 0; i < kit.count(200, 100); i++) {
    specks.push((random() * 2 - 1) * 15, (random() * 2 - 1) * 9, -9 + random() * 14);
    speckSizes.push(0.3 + random() * 1.4);
  }
  const dust = kit.points(specks, { size: 0.09, sizes: speckSizes, color: "#c8ffe0", soft: 0.7, opacity: 0.5, twinkle: 0.3, env: true });
  env.add(dust);
  const haze: number[] = [];
  for (let i = 0; i < 10; i++) haze.push((random() * 2 - 1) * 14, (random() * 2 - 1) * 8, -12 + random() * 4);
  env.add(kit.points(haze, { size: 5, color: "#3fe0b0", soft: 1, opacity: 0.12, env: true }));

  return {
    root,
    env,
    update({ time }) {
      for (const { group, rod, halves } of rodGroups) {
        const t = time * 0.25 + rod.phase;
        group.position.set(rod.at.x + Math.sin(t) * rod.drift, rod.at.y + Math.sin(t * 1.3) * rod.drift * 0.6, rod.at.z);
        group.rotation.set(rod.rotation.x + Math.sin(t * 0.7) * 0.1, rod.rotation.y + t * 0.15, rod.rotation.z + Math.sin(t * 0.9) * 0.08);
        if (halves) {
          // The two daughter cells slowly pull apart and relax.
          const pull = 0.06 * (0.5 + 0.5 * Math.sin(time * 0.8));
          halves[0].position.x = -(rod.half / 2 + rod.radius * 0.72 + pull);
          halves[1].position.x = rod.half / 2 + rod.radius * 0.72 + pull;
        }
      }
      let k = 0;
      for (const spec of cocciSpecs)
        for (let i = 0; i < spec.n; i++) {
          const wobble = Math.sin(time * 1.3 + k) * 0.04;
          p.copy(spec.at).addScaledVector(spec.dir, i * 0.92 + wobble).add(s.set(0, Math.sin(time * 0.4 + spec.at.x) * 0.2, 0));
          cocci.setMatrixAt(k++, m.compose(p, q.identity(), s.set(1, 1, 1)));
        }
      cocci.instanceMatrix.needsUpdate = true;
      spirillum.rotation.x = 0.4 + time * 1.2;
      spirillum.position.y = 4.4 + Math.sin(time * 0.3) * 0.2;
      updateFlagella(time);
      dust.position.x = Math.sin(time * 0.05) * 0.4;
    },
  };
};

export default bacteria;
