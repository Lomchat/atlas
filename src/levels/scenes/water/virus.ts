/**
 * Bacteriophages on a bacterium (1 unit = 20 nm).
 * This level sits 100 nm above the rounded end of the hero bacterium of the
 * bacteria level; its axes are turned (see the anchor in data/water.ts) so
 * that +Y is the wall's outward normal. The wall is that very capsule,
 * rebuilt here from the anchor: a dome of radius WALL_RADIUS whose top is at
 * y = WALL_TOP, the body of the rod sweeping away to the lower left. The
 * child level "water-molecules" is anchored in the water between the phages.
 */
import * as THREE from "three";
import { rng } from "../../../engine/kit";
import type { Kit } from "../../../engine/kit";
import { level as levelById } from "../../index";
import type { SceneBuilder } from "../types";
import { HERO } from "./shared";

/** 1 µm (bacteria level unit) in this level's units. */
const PER_MICRON = 50;
/** The hero rod's radius in this level's units. */
export const WALL_RADIUS = HERO.radius * PER_MICRON;
export const WALL_TOP = -5;
const WALL_CENTER = new THREE.Vector3(0, WALL_TOP - WALL_RADIUS, 0);

/** Height of the (locally spherical) end cap above (x, z). */
const wallY = (x: number, z = 0) => WALL_CENTER.y + Math.sqrt(Math.max(0, WALL_RADIUS * WALL_RADIUS - x * x - z * z));
/** Tilt that stands an object upright on the cap at (x, z). */
const upright = (x: number, z: number) =>
  new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(x, wallY(x, z) - WALL_CENTER.y, z).normalize(),
  );

const m = new THREE.Matrix4();
const q = new THREE.Quaternion();
const s = new THREE.Vector3();
const p = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

interface PhageParts {
  head: THREE.BufferGeometry;
  collar: THREE.BufferGeometry;
  sheath: THREE.BufferGeometry;
  tube: THREE.BufferGeometry;
  plate: THREE.BufferGeometry;
  rod: THREE.BufferGeometry;
  headMaterial: THREE.Material;
  bodyMaterial: THREE.Material;
  fibreMaterial: THREE.Material;
  plateMaterial: THREE.Material;
}

function phageParts(kit: Kit, env = false): PhageParts {
  // A prolate icosahedron with a vertex pointing up, like the T4 head.
  const head = new THREE.IcosahedronGeometry(1, 0);
  head.rotateX(-Math.atan((1 + Math.sqrt(5)) / 2));
  head.scale(1.95, 2.7, 1.95);
  // The striated contractile sheath.
  const profile: THREE.Vector2[] = [];
  const rings = 22;
  for (let i = 0; i <= rings * 2; i++) {
    const t = i / (rings * 2);
    profile.push(new THREE.Vector2(0.52 + (i % 2 ? 0.07 : 0), t - 0.5));
  }
  profile.unshift(new THREE.Vector2(0.001, -0.5));
  profile.push(new THREE.Vector2(0.001, 0.5));
  const sheath = new THREE.LatheGeometry(profile, 20);
  return {
    head: kit.geometry(head),
    collar: kit.geometry(new THREE.CylinderGeometry(0.85, 0.75, 0.35, 16)),
    sheath: kit.geometry(sheath),
    tube: kit.geometry(new THREE.CylinderGeometry(0.22, 0.22, 1, 10)),
    plate: kit.geometry(new THREE.CylinderGeometry(1.25, 1.1, 0.4, 6)),
    rod: kit.geometry(new THREE.CapsuleGeometry(0.075, 1, 3, 8).translate(0, 0.5, 0)),
    headMaterial: kit.toon("#ff8a5c", { shadow: "#b8406a", rim: 0.55, rimColor: "#ffd2b0", gloss: 0.35, soft: 0.12, env }),
    bodyMaterial: kit.toon("#d9c8ff", { shadow: "#6f5cb8", rim: 0.45, rimColor: "#ffffff", gloss: 0.25, env }),
    fibreMaterial: kit.toon("#ffb3d1", { shadow: "#9a4f8a", rim: 0.4, rimColor: "#ffffff", env }),
    plateMaterial: kit.toon("#ffcf5c", { shadow: "#a86a4a", rim: 0.4, gloss: 0.2, env }),
  };
}

/**
 * One phage: origin at the baseplate centre, tail along +Y. `contracted`
 * shortens and thickens the sheath and exposes the tail tube (injection).
 * `pose(reach)` bends the six long tail fibres: 0 folded up, 1 reaching down
 * to `ground` (height of the wall below the baseplate, local units).
 */
function phage(parts: PhageParts, options: { contracted?: boolean } = {}) {
  const group = new THREE.Group();
  const contracted = options.contracted ?? false;
  const sheathLength = contracted ? 2.3 : 4.6;
  const tubeLength = 4.9;
  const tube = new THREE.Mesh(parts.tube, parts.bodyMaterial);
  tube.scale.y = tubeLength;
  tube.position.y = contracted ? tubeLength / 2 - 0.5 : tubeLength / 2 + 0.2;
  const sheath = new THREE.Mesh(parts.sheath, parts.bodyMaterial);
  sheath.scale.set(contracted ? 1.45 : 1, sheathLength, contracted ? 1.45 : 1);
  sheath.position.y = contracted ? tubeLength - sheathLength / 2 + 0.1 : 0.2 + sheathLength / 2;
  const collar = new THREE.Mesh(parts.collar, parts.plateMaterial);
  collar.position.y = tubeLength + 0.35;
  const head = new THREE.Mesh(parts.head, parts.headMaterial);
  head.position.y = tubeLength + 0.5 + 2.7;
  const plate = new THREE.Mesh(parts.plate, parts.plateMaterial);
  plate.position.y = contracted ? -0.15 : 0;
  group.add(tube, sheath, collar, head, plate);
  if (contracted) group.position.y = 0;

  const fibres = new THREE.InstancedMesh(parts.rod, parts.fibreMaterial, 12);
  group.add(fibres);
  const hip = new THREE.Vector3();
  const knee = new THREE.Vector3();
  const foot = new THREE.Vector3();
  const pose = (reach: number, ground: number, time = 0) => {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.3;
      const out = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
      hip.copy(out).multiplyScalar(1.05).setY(plate.position.y + 0.1);
      const flex = Math.sin(time * 1.3 + i) * 0.15 * (1 - reach);
      // Folded: fibres run up along the tail. Reaching: they splay out and down to the wall.
      const kneeOut = THREE.MathUtils.lerp(1.7, 3.3, reach);
      const kneeUp = THREE.MathUtils.lerp(3.2, 1.9, reach) + flex;
      knee.copy(out).multiplyScalar(kneeOut).setY(plate.position.y + kneeUp);
      const footOut = THREE.MathUtils.lerp(1.3, 5.0, reach);
      const footY = THREE.MathUtils.lerp(plate.position.y + 0.8, ground, reach);
      foot.copy(out).multiplyScalar(footOut).setY(footY);
      for (const [k, from, to] of [
        [i * 2, hip, knee],
        [i * 2 + 1, knee, foot],
      ] as const) {
        const d = to.clone().sub(from);
        q.setFromUnitVectors(UP, d.clone().normalize());
        fibres.setMatrixAt(k, m.compose(from, q, s.set(1, d.length(), 1)));
      }
    }
    fibres.instanceMatrix.needsUpdate = true;
  };
  return { group, head, pose };
}

const virus: SceneBuilder = ({ kit, level, children }) => {
  const root = new THREE.Group();
  const env = new THREE.Group();
  const random = rng(23);
  const parts = phageParts(kit);

  const waterChild = children.find((child) => child.id === "water-molecules");
  const waterAt = new THREE.Vector3(...(waterChild?.at ?? [0.6, 1.2, 2.6]));

  /* Phage A has landed and contracted its sheath: its tail tube pierces the wall. */
  const a = phage(parts, { contracted: true });
  const aX = -3.2;
  a.group.position.set(aX, wallY(aX) + 0.45, 0);
  a.group.quaternion.copy(upright(aX, 0));
  a.pose(1, -0.45);
  root.add(a.group);
  // A glowing puncture where its DNA enters the bacterium.
  const puncture = kit.glow("#d9a8ff", 3.2, { opacity: 0.9 });
  puncture.position.set(aX, wallY(aX) + 0.05, 0.9);
  root.add(puncture);

  /* Phage B is landing: its fibres reach for the wall. */
  const b = phage(parts);
  const bX = 3.4;
  const bBase = new THREE.Vector3(bX, wallY(bX) + 1.5, 0.4);
  b.group.position.copy(bBase);
  b.group.quaternion.copy(upright(bX, 0.4)).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0.05, 0.6, -0.12)));
  root.add(b.group);

  /* ---------------- Surroundings ---------------- */
  // The bacterial wall: the hero rod of the bacteria level, rebuilt in this frame.
  const anchor = level.anchor ?? { at: [2.32, 0.525, 0.196] as const, rotate: [12.82, -10.07, -37.53] as const };
  const rotate = anchor.rotate ?? [0, 0, 0];
  const toLocal = new THREE.Quaternion()
    .setFromEuler(new THREE.Euler(...(rotate.map((d) => (d * Math.PI) / 180) as [number, number, number]), "XYZ"))
    .invert();
  const perMicron = (levelById(level.parent ?? "bacteria").size / 10 / (level.size / 10)) || PER_MICRON;
  const rodCenter = new THREE.Vector3(...anchor.at).negate().applyQuaternion(toLocal).multiplyScalar(perMicron);
  const rodAxis = new THREE.Vector3(1, 0, 0).applyQuaternion(toLocal);
  const wallGeometry = kit.geometry(new THREE.CapsuleGeometry(HERO.radius * perMicron, HERO.half * 2 * perMicron, 48, 96));
  const wall = new THREE.Mesh(
    wallGeometry,
    kit.toon("#8fdc55", { shadow: "#2f7a55", rim: 0.45, rimColor: "#e6ffc0", gloss: 0.12, soft: 0.45, env: true }),
  );
  wall.position.copy(rodCenter);
  wall.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), rodAxis);
  env.add(wall);
  // Membrane proteins (porins) and sugar chains (lipopolysaccharide) on the surface.
  const bumpCount = kit.count(420, 220);
  const bumps = new THREE.InstancedMesh(
    kit.geometry(new THREE.SphereGeometry(1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2)),
    kit.toon("#ffffff", { rim: 0.35, gloss: 0.2, soft: 0.4, env: true }),
    bumpCount,
  );
  const bumpColors = ["#a8ea6a", "#86d95a", "#c4f78a", "#7fd88f"];
  const tint = new THREE.Color();
  const normal = new THREE.Vector3();
  const e = new THREE.Euler();
  let placed = 0;
  for (let tries = 0; placed < bumpCount && tries < bumpCount * 4; tries++) {
    // Spread over the end cap around the landing site (it stays spherical there).
    const x = (random() * 2 - 1) * 17;
    const z = (random() * 2 - 1) * 17;
    if (x * x + z * z > 17 * 17) continue;
    normal.set(x, wallY(x, z) - WALL_CENTER.y, z).normalize();
    p.copy(normal).multiplyScalar(WALL_RADIUS - 0.05).add(WALL_CENTER);
    if (Math.abs(p.x - aX) < 1.2 && Math.abs(z) < 1.2) continue;
    const r = 0.14 + Math.pow(random(), 2) * 0.3;
    q.setFromUnitVectors(UP, normal);
    e.set(0, random() * 6, 0);
    q.multiply(new THREE.Quaternion().setFromEuler(e));
    bumps.setMatrixAt(placed, m.compose(p, q, s.set(r, r * (0.4 + random() * 0.5), r)));
    bumps.setColorAt(placed++, tint.set(bumpColors[placed % bumpColors.length]));
  }
  bumps.count = placed;
  env.add(bumps);

  // A third phage drifting in the distance.
  const farParts = phageParts(kit, true);
  const c = phage(farParts);
  c.group.scale.setScalar(0.6);
  c.group.position.set(13.5, 7.5, -12);
  c.group.rotation.set(0.5, 0.3, 2.3);
  c.pose(0, 0);
  env.add(c.group);
  const d = phage(farParts);
  d.group.scale.setScalar(0.5);
  d.group.position.set(-13, 7, -14);
  d.group.rotation.set(-0.3, 0.8, -2.6);
  d.pose(0, 0);
  env.add(d.group);

  // Water: a fine haze of molecules too small to see one by one at this scale.
  const haze: number[] = [];
  const hazeSizes: number[] = [];
  for (let i = 0; i < kit.count(700, 350); i++) {
    const at = new THREE.Vector3((random() * 2 - 1) * 16, WALL_TOP - 2 + random() * 16, -12 + random() * 17);
    if (at.y < wallY(at.x, at.z) + 0.2) continue;
    haze.push(at.x, at.y, at.z);
    hazeSizes.push(0.5 + random());
  }
  const hazePoints = kit.points(haze, { size: 0.4, sizes: hazeSizes, color: "#bdeeff", soft: 1, opacity: 0.1, twinkle: 0.5, env: true, maxPx: 40 });
  env.add(hazePoints);
  // A denser shimmer where the next level waits.
  const shimmer: number[] = [];
  for (let i = 0; i < 90; i++) {
    const dir = new THREE.Vector3(random() - 0.5, random() - 0.5, random() - 0.5).normalize();
    const at = waterAt.clone().addScaledVector(dir, 0.15 + Math.pow(random(), 1.5) * 1.3);
    shimmer.push(at.x, at.y, at.z);
  }
  // Real water molecules are far smaller (0.3 nm): keep these specks tiny on screen as you dive.
  const shimmerPoints = kit.points(shimmer, { size: 0.09, color: "#bfeaff", soft: 0.5, opacity: 0.8, twinkle: 0.8, maxPx: 5 });
  root.add(shimmerPoints);
  const glows: number[] = [];
  for (let i = 0; i < 14; i++) glows.push((random() * 2 - 1) * 15, -2 + random() * 12, -13 + random() * 6);
  env.add(kit.points(glows, { size: 7, color: "#3fb4e0", soft: 1, opacity: 0.14, env: true }));

  return {
    root,
    env,
    update({ time }) {
      // Phage B hovers down onto the wall, its fibres reaching out.
      const cycle = 0.5 + 0.5 * Math.sin(time * 0.35 - 1);
      b.group.position.y = bBase.y + 0.3 * cycle;
      b.pose(0.7 + 0.25 * (1 - cycle), -1.3 - 0.3 * cycle, time);
      a.head.rotation.y = Math.sin(time * 0.3) * 0.05;
      puncture.material.opacity = 0.65 + 0.3 * Math.sin(time * 2.2);
      c.group.rotation.z = 2.3 + time * 0.08;
      c.group.position.y = 7.5 + Math.sin(time * 0.3) * 0.4;
      d.group.rotation.z = -2.6 - time * 0.06;
      hazePoints.position.x = Math.sin(time * 0.08) * 0.3;
      shimmerPoints.rotation.y = time * 0.1;
    },
  };
};

export default virus;
