/**
 * A granum (10 units = 500 nm): a stack of twelve thylakoids, flattened sacs
 * whose membranes enclose the lumen. A wedge is cut away to show the lumen of
 * every disc. The membranes are studded with protein complexes, ATP synthase
 * heads stick out into the stroma, and stroma lamellae run off to other grana.
 *
 * The `photosystem` child sits on the top membrane, facing the camera: the
 * stack never moves (only the stroma, the protons and the light do).
 */
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { rng } from "../../../engine/kit";
import type { Kit } from "../../../engine/kit";
import type { SceneBuilder } from "../types";
import {
  GRANUM,
  HERO_LAMELLAE,
  PHOTO_COLORS as C,
  discGeometry,
  discProfile,
  discY,
  lightShafts,
} from "./chloroplastShared";

const { radius: R, half: T, membrane: M } = GRANUM;
const PHI_START = GRANUM.wedgeCenter + GRANUM.wedgeHalf;
const PHI_LENGTH = Math.PI * 2 - 2 * GRANUM.wedgeHalf;
const DEG = Math.PI / 180;

/** Lathe angle → direction in the XZ plane. */
const dir = (phi: number) => new THREE.Vector3(Math.sin(phi), 0, Math.cos(phi));
const inWedge = (phi: number, margin = 0) => {
  let d = phi - GRANUM.wedgeCenter;
  d = Math.atan2(Math.sin(d), Math.cos(d));
  return Math.abs(d) < GRANUM.wedgeHalf + margin;
};

/** A flat sheet with rounded edges swept along a path (a stroma lamella). */
function ribbon(kit: Kit, path: THREE.Vector3[], width: number, thickness: number) {
  const curve = new THREE.CatmullRomCurve3(path);
  const steps = Math.max(12, path.length * 10);
  const section: { s: number; n: number; ns: number; nn: number }[] = [];
  const r = thickness / 2;
  const arc = 6;
  for (let i = 0; i <= arc; i++) {
    const a = -Math.PI / 2 + (i / arc) * Math.PI;
    section.push({ s: width / 2 - r + Math.cos(a) * r, n: Math.sin(a) * r, ns: Math.cos(a), nn: Math.sin(a) });
  }
  for (let i = 0; i <= arc; i++) {
    const a = Math.PI / 2 + (i / arc) * Math.PI;
    section.push({ s: -width / 2 + r + Math.cos(a) * r, n: Math.sin(a) * r, ns: Math.cos(a), nn: Math.sin(a) });
  }
  const positions: number[] = [];
  const normals: number[] = [];
  const index: number[] = [];
  const up = new THREE.Vector3(0, 1, 0);
  const tangent = new THREE.Vector3();
  const side = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const p = new THREE.Vector3();
  const k = section.length;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    curve.getPointAt(t, p);
    curve.getTangentAt(t, tangent);
    side.crossVectors(tangent, up).normalize();
    normal.crossVectors(side, tangent).normalize();
    for (const c of section) {
      positions.push(
        p.x + side.x * c.s + normal.x * c.n,
        p.y + side.y * c.s + normal.y * c.n,
        p.z + side.z * c.s + normal.z * c.n,
      );
      normals.push(
        side.x * c.ns + normal.x * c.nn,
        side.y * c.ns + normal.y * c.nn,
        side.z * c.ns + normal.z * c.nn,
      );
    }
    if (i < steps)
      for (let j = 0; j < k; j++) {
        const a = i * k + j;
        const b = i * k + ((j + 1) % k);
        index.push(a, a + k, b, b, a + k, b + k);
      }
  }
  const geometry = kit.geometry(new THREE.BufferGeometry());
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geometry.setIndex(index);
  return geometry;
}

/** The C-shaped membrane section of a disc at lathe angle `phi`. */
function sectionShape(phi: number) {
  const outer = discProfile(R, T);
  const inner = discProfile(R - M, T - M);
  // Outer path from the top axis round the rim to the bottom axis, then back inside.
  const points: THREE.Vector2[] = [];
  for (let i = outer.length - 1; i >= 0; i--) points.push(outer[i]);
  for (const v of inner) points.push(v);
  const geometry = new THREE.ShapeGeometry(new THREE.Shape(points), 1);
  geometry.rotateY(phi - Math.PI / 2);
  return geometry;
}

const thylakoid: SceneBuilder = ({ kit, children }) => {
  const root = new THREE.Group();
  const env = new THREE.Group();
  const random = rng(2024);
  const photosystem = children.find((child) => child.id === "photosystem");
  const psAt = new THREE.Vector3(...(photosystem?.at ?? [-1.3, 2.62, 1.9]));
  const topY = discY(GRANUM.discs - 1) + T;

  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();
  const color = new THREE.Color();

  /* ---------------- The stack of discs, cut open ---------------- */
  const outerGeometry = discGeometry(kit, R, T, { segments: 64, steps: 6, phiStart: PHI_START, phiLength: PHI_LENGTH });
  const innerGeometry = discGeometry(kit, R - M, T - M, { segments: 48, steps: 4, phiStart: PHI_START, phiLength: PHI_LENGTH });
  const faceA = sectionShape(PHI_START);
  const faceB = sectionShape(PHI_START + PHI_LENGTH);
  const sectionGeometry = kit.geometry(mergeGeometries([faceA, faceB])!);
  faceA.dispose();
  faceB.dispose();

  const n = GRANUM.discs;
  const discs = new THREE.InstancedMesh(
    outerGeometry,
    kit.toon("#ffffff", { shadow: C.discShadow, rim: 0.5, rimColor: C.discRim, gloss: 0.22, soft: 0.28 }),
    n,
  );
  const lumen = new THREE.InstancedMesh(
    innerGeometry,
    kit.toon(C.lumen, { shadow: "#08302f", rim: 0, gloss: 0, soft: 0.5, side: THREE.BackSide }),
    n,
  );
  const sections = new THREE.InstancedMesh(
    sectionGeometry,
    kit.toon(C.section, { shadow: "#5fbf5a", rim: 0, gloss: 0, soft: 0.6, side: THREE.DoubleSide }),
    n,
  );
  const discA = new THREE.Color(C.disc);
  const discB = new THREE.Color(C.discTop);
  for (let k = 0; k < n; k++) {
    // Tiny radius changes keep the stack organic; the top disc stays exact.
    const scale = k === n - 1 ? 1 : 0.97 + random() * 0.05;
    s.set(scale, 1, scale);
    m4.compose(p.set(0, discY(k), 0), q.identity(), s);
    discs.setMatrixAt(k, m4);
    lumen.setMatrixAt(k, m4);
    sections.setMatrixAt(k, m4);
    discs.setColorAt(k, color.copy(discA).lerp(discB, k / (n - 1)));
  }
  root.add(discs, lumen, sections);

  /* ---------------- Protein complexes on the top membrane and the margins ---------------- */
  const studPositions: { p: THREE.Vector3; s: THREE.Vector3; rot: number; c: string }[] = [];
  const studColors = ["#1fbf8f", "#39d06a", "#8ce05a", "#23a87a", "#58d66f"];
  for (let tries = 0; studPositions.length < kit.count(230) && tries < 4000; tries++) {
    const r = Math.sqrt(random()) * (R - 0.35);
    const phi = random() * Math.PI * 2;
    if (inWedge(phi, 0.12 / Math.max(r, 0.5))) continue;
    const at = dir(phi).multiplyScalar(r).setY(topY);
    if (Math.hypot(at.x - psAt.x, at.z - psAt.z) < 0.62) continue;
    if (studPositions.some((o) => o.p.distanceTo(at) < 0.36)) continue;
    const size = 0.14 + random() * 0.1;
    studPositions.push({
      p: at,
      s: new THREE.Vector3(size * (1.1 + random() * 0.5), 0.07 + random() * 0.03, size),
      rot: random() * Math.PI,
      c: studColors[Math.floor(random() * studColors.length)],
    });
  }
  // Around the rim of every disc (the grana margins).
  for (let k = 0; k < n; k++) {
    for (let j = 0; j < 30; j++) {
      const phi = (j / 30) * Math.PI * 2 + random() * 0.15 + k * 0.4;
      if (inWedge(phi, 0.06)) continue;
      const at = dir(phi).multiplyScalar(R - 0.02).setY(discY(k) + (random() - 0.5) * 0.06);
      studPositions.push({
        p: at,
        s: new THREE.Vector3(0.09, 0.1 + random() * 0.04, 0.12 + random() * 0.05),
        rot: phi + Math.PI / 2,
        c: studColors[Math.floor(random() * studColors.length)],
      });
    }
  }
  const studs = new THREE.InstancedMesh(
    kit.geometry(new THREE.IcosahedronGeometry(1, 1)),
    kit.toon("#ffffff", { rim: 0.45, rimColor: "#d8ffb0", gloss: 0.3, shadow: "#1d5a4a", env: true }),
    studPositions.length,
  );
  studPositions.forEach((stud, i) => {
    q.setFromEuler(new THREE.Euler(0, stud.rot, 0));
    studs.setMatrixAt(i, m4.compose(stud.p, q, stud.s));
    studs.setColorAt(i, color.set(stud.c));
  });
  root.add(studs);

  // ATP synthase: a head on a short stalk, sticking out into the stroma.
  // The first one is fixed: a hotspot points at it.
  const atpSpots: THREE.Vector3[] = [dir(150 * DEG).multiplyScalar(3.2).setY(topY)];
  for (let tries = 0; atpSpots.length < 16 && tries < 600; tries++) {
    const r = R - 0.4 - random() * 1.4;
    const phi = random() * Math.PI * 2;
    if (inWedge(phi, 0.25)) continue;
    const at = dir(phi).multiplyScalar(r).setY(topY);
    if (Math.hypot(at.x - psAt.x, at.z - psAt.z) < 0.9) continue;
    if (atpSpots.some((o) => o.distanceTo(at) < 0.8)) continue;
    atpSpots.push(at);
  }
  const stalkGeometry = kit.geometry(new THREE.CylinderGeometry(0.035, 0.045, 0.22, 8));
  stalkGeometry.translate(0, 0.11, 0);
  const stalks = new THREE.InstancedMesh(stalkGeometry, kit.toon("#ffd9a0", { rim: 0.2, env: true }), atpSpots.length);
  const heads = new THREE.InstancedMesh(
    kit.geometry(new THREE.SphereGeometry(1, 16, 12)),
    kit.toon("#ffb13b", { rim: 0.5, rimColor: "#fff0b0", gloss: 0.4, shadow: "#c0602a", env: true }),
    atpSpots.length,
  );
  atpSpots.forEach((at, i) => {
    stalks.setMatrixAt(i, m4.compose(at, q.identity(), s.set(1, 1, 1)));
    heads.setMatrixAt(i, m4.compose(at.clone().setY(topY + 0.3), q.identity(), s.set(0.13, 0.11, 0.13)));
  });
  root.add(stalks, heads);

  /* ---------------- Protons piling up in the lumen, seen through the cut ---------------- */
  const protons: number[] = [];
  for (let k = 0; k < n; k++)
    for (const phi of [PHI_START - 0.03, PHI_START + PHI_LENGTH + 0.03])
      for (let j = 0; j < 7; j++) {
        const r = 0.4 + random() * (R - 1);
        const v = dir(phi).multiplyScalar(r);
        protons.push(v.x, discY(k) + (random() - 0.5) * 0.08, v.z);
      }
  const protonPoints = kit.points(protons, { size: 0.13, color: "#fff3a0", soft: 0.8, twinkle: 0.7, additive: true });
  root.add(protonPoints);

  // Sparkles where light is caught on the top membrane.
  const sparkles: number[] = [];
  for (let i = 0; i < 40; i++) {
    const stud = studPositions[Math.floor(random() * Math.min(studPositions.length, 200))];
    sparkles.push(stud.p.x, stud.p.y + 0.06, stud.p.z);
  }
  const sparklePoints = kit.points(sparkles, { size: 0.5, color: "#fff6a8", soft: 1, twinkle: 1, additive: true, opacity: 0.8, env: true });
  root.add(sparklePoints);

  /* ---------------- Stroma lamellae: short in the subject, long in the surroundings ---------------- */
  const lamellaMaterial = kit.toon(C.lamella, { shadow: C.discShadow, rim: 0.45, rimColor: C.discRim, gloss: 0.15 });
  const lamellaEnvMaterial = kit.toon(C.lamella, { shadow: C.discShadow, rim: 0.45, rimColor: C.discRim, gloss: 0.15, env: true });
  const ends: THREE.Vector3[] = [];
  const lamellaPath = (l: (typeof HERO_LAMELLAE)[number], from: number, to: number) => {
    const points: THREE.Vector3[] = [];
    const steps = Math.max(3, Math.round((to - from) / 1.2));
    for (let i = 0; i <= steps; i++) {
      const r = from + ((to - from) * i) / steps;
      // Frets wind slightly around the stack, like a gentle helix.
      const phi = l.phi * DEG + (r - R) * 0.035;
      const v = dir(phi).multiplyScalar(r);
      points.push(new THREE.Vector3(v.x, discY(l.disc) + (r - R + 0.5) * l.slope, v.z));
    }
    return points;
  };
  const split = R + 1.4;
  const root2 = new THREE.Group();
  for (const l of HERO_LAMELLAE) {
    root2.add(new THREE.Mesh(ribbon(kit, lamellaPath(l, R - 0.6, split), l.width, 2 * T), lamellaMaterial));
    const far = lamellaPath(l, split, R + 10.5);
    env.add(new THREE.Mesh(ribbon(kit, far, l.width, 2 * T), lamellaEnvMaterial));
    ends.push(far[far.length - 1]);
  }
  root.add(root2);

  /* ---------------- Surroundings ---------------- */
  // Neighbouring grana where some lamellae arrive, dimmed by distance.
  const neighbourDiscGeometry = discGeometry(kit, 3.3, T, { segments: 32, steps: 4 });
  const neighbourDiscs = new THREE.InstancedMesh(
    neighbourDiscGeometry,
    kit.toon("#ffffff", { shadow: "#0b3230", rim: 0.4, rimColor: "#5fbf8a", gloss: 0.05, transparent: true }),
    30,
  );
  // They only appear late in the dive, so they do not double the chloroplast's own grana.
  const neighbourMaterial = neighbourDiscs.material as THREE.ShaderMaterial;
  const farA = new THREE.Color("#1a5e46");
  const farB = new THREE.Color("#22704f");
  let d = 0;
  for (const [end, count] of [
    [ends[0], 9],
    [ends[1], 10],
    [ends[3], 8],
  ] as const) {
    const center = end.clone().add(new THREE.Vector3(end.x, 0, end.z).normalize().multiplyScalar(2.9));
    for (let k = 0; k < count; k++) {
      const y = end.y + (k - count / 2) * GRANUM.repeat;
      neighbourDiscs.setMatrixAt(d, m4.compose(p.set(center.x, y, center.z), q.identity(), s.set(1, 1, 1)));
      neighbourDiscs.setColorAt(d++, color.copy(farA).lerp(farB, k / count));
    }
  }
  neighbourDiscs.count = d;
  env.add(neighbourDiscs);

  // A plastoglobule (lipid droplet) clinging to a lamella.
  const globule = new THREE.Mesh(
    kit.geometry(new THREE.SphereGeometry(0.85, 32, 20)),
    kit.toon(C.plastoglobule, { rim: 0.5, gloss: 0.5, shadow: "#e0782f", env: true }),
  );
  const g0 = lamellaPath(HERO_LAMELLAE[2], R + 5, R + 5)[0];
  globule.position.copy(g0).add(new THREE.Vector3(0, 0.9, 0));
  env.add(globule);

  // The crowded stroma: Rubisco enzymes (the most abundant protein on Earth) and ribosomes.
  const rubisco: number[] = [];
  const rubiscoCount = kit.count(520);
  for (let i = 0; i < rubiscoCount; i++) {
    const v = new THREE.Vector3((random() * 2 - 1) * 15, (random() * 2 - 1) * 9, (random() * 2 - 1) * 9 - 2);
    if (Math.hypot(v.x, v.z) < R + 0.6 && Math.abs(v.y) < topY + 0.6) continue;
    // Keep the space between the camera and the stack clear.
    if (v.z > 2 && Math.abs(v.x) < R + 2.5) continue;
    rubisco.push(v.x, v.y, v.z);
  }
  const rubiscoSizes = rubisco.map(() => 0.6 + random() * 0.8).slice(0, rubisco.length / 3);
  const rubiscoPoints = kit.points(rubisco, { size: 0.17, sizes: rubiscoSizes, color: "#b9a3ff", opacity: 0.45, soft: 0.6, env: true });
  env.add(rubiscoPoints);
  const ribosomeGeometry = kit.blob(1, { detail: 2, noise: 0.18, seed: 9, stretch: [1.1, 0.85, 0.9] });
  const ribosomes = new THREE.InstancedMesh(
    ribosomeGeometry,
    kit.toon("#7a5ad8", { rim: 0.5, rimColor: "#d9c9ff", gloss: 0.25, env: true }),
    9,
  );
  for (let i = 0; i < 9; i++) {
    const a = Math.PI * (0.55 + random() * 0.9);
    const r = R + 2.5 + random() * 6;
    ribosomes.setMatrixAt(
      i,
      m4.compose(
        p.set(Math.sin(a) * r * 1.3, (random() * 2 - 1) * 5, Math.cos(a) * r),
        q.setFromEuler(new THREE.Euler(random() * 3, random() * 3, 0)),
        s.setScalar(0.22 + random() * 0.07),
      ),
    );
  }
  env.add(ribosomes);
  const backGlow = kit.glow("#3fe0b0", 22, { opacity: 0.22, env: true });
  backGlow.position.set(0, 0.5, -6);
  env.add(backGlow);
  const shafts = lightShafts(kit, [
    { at: [-10, 11, -5], width: 2.6, length: 18, opacity: 0.11 },
    { at: [-6.5, 11, -5], width: 1.5, length: 16, opacity: 0.08 },
    { at: [-2.5, 11, -6], width: 3.2, length: 17, opacity: 0.07 },
  ]);
  env.add(shafts.group);

  return {
    root,
    env,
    update({ time, immersion }) {
      shafts.update(time, immersion);
      const late = THREE.MathUtils.smoothstep(immersion, 0.55, 1);
      neighbourMaterial.uniforms.uOpacity.value = late;
      neighbourDiscs.visible = late > 0.004;
      rubiscoPoints.rotation.y = time * 0.012;
      rubiscoPoints.position.y = Math.sin(time * 0.3) * 0.15;
      ribosomes.rotation.y = -time * 0.01;
      globule.position.y = g0.y + 0.9 + Math.sin(time * 0.8) * 0.04;
    },
  };
};

export default thylakoid;
