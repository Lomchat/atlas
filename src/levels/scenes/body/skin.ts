/**
 * Skin in cross-section (1 unit = 0.2 mm): a 2 mm block cut out of the
 * fingertip, built like a layered cake.
 * - Epidermis on top, ridged exactly like the fingerprint above it, its cut
 *   faces showing the strata (corneum, lucidum, granulosum, spinosum, basale).
 * - Dermis as a translucent jelly revealing what it holds: collagen fibres,
 *   dermal papillae with capillary loops, an arteriole and a venule, a coiled
 *   sweat gland whose duct spirals up to a pore on a ridge, and a nerve ending
 *   in a Meissner corpuscle (fine touch).
 * - Hypodermis: fat lobules, with a Pacinian corpuscle (vibration).
 * Fingertip skin is glabrous: no hair follicles.
 */
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { rng } from "../../../engine/kit";
import type { SceneBuilder } from "../types";
import { flowToon, disposeInstances } from "./skinShaders";
import { type Height, slab, strataMaterial } from "./skinSlab";
import {
  BASALE,
  CORNEUM,
  CRESTS,
  FAT_BOTTOM,
  crest,
  GRANULOSUM,
  LUCIDUM,
  PAPILLA_X,
  X0,
  X1,
  Z0,
  Z1,
  dermisBottom,
  frontPapilla,
  junction,
  surface,
} from "./skinLayout";

/** A tube coloured from `from` to `to` along its length (capillary loops). */
function gradientTube(points: THREE.Vector3[], radius: number, from: THREE.Color, to: THREE.Color) {
  const geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 40, radius, 6);
  const uv = geometry.getAttribute("uv");
  const colors: number[] = [];
  const c = new THREE.Color();
  for (let i = 0; i < uv.count; i++) {
    c.copy(from).lerp(to, THREE.MathUtils.smoothstep(uv.getX(i), 0.35, 0.65));
    colors.push(c.r, c.g, c.b);
  }
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  return geometry;
}

const BOUNDS = { x0: X0, x1: X1, z0: Z0, z1: Z1 };

const skin: SceneBuilder = ({ kit }) => {
  const root = new THREE.Group();
  const env = new THREE.Group();
  const random = rng(31);
  const top: Height = (x) => surface(x);

  /* ------------------------- epidermis ------------------------- */
  const epidermis = new THREE.Mesh(
    kit.geometry(slab(BOUNDS, top, junction, { nx: 200, nz: 70, ny: 6, top: [200, 6], bottom: [120, 60], faces: ["top", "bottom", "front", "back", "left", "right"], topMarker: (x) => -1 - crest(x) })),
    strataMaterial(kit, { corneum: CORNEUM, lucidum: LUCIDUM, granulosum: GRANULOSUM, basale: BASALE }),
  );
  root.add(epidermis);

  /* --------------------------- dermis --------------------------- */
  // Translucent jelly walls in front, an opaque interior behind.
  const dermisGeometry = kit.geometry(slab(BOUNDS, junction, dermisBottom, { nx: 160, nz: 70, ny: 4, bottom: [40, 20], faces: ["front", "back", "left", "right", "bottom"] }));
  const dermisInside = new THREE.Mesh(dermisGeometry, kit.toon("#c9416f", { side: THREE.BackSide, rim: 0, gloss: 0, soft: 0.6, shadow: "#7a1f55" }));
  const dermisFront = new THREE.Mesh(
    dermisGeometry,
    kit.toon("#ff8fb1", { opacity: 0.5, rim: 0.7, rimColor: "#ffd6e4", gloss: 0.25, depthWrite: false }),
  );
  dermisFront.renderOrder = 2;
  root.add(dermisInside, dermisFront);

  // Collagen fibres: finer and looser just under the epidermis, thicker below.
  const fibres: THREE.BufferGeometry[] = [];
  for (let i = 0; i < kit.count(28, 16); i++) {
    const deep = i % 3 !== 0;
    let x = X0 + 0.3 + random() * 9.4;
    let z = Z0 + 0.3 + random() * 6.2;
    let y = deep ? -2.0 + random() * 2.6 : 1.0 + random() * 0.7;
    const a = random() * Math.PI * 2;
    const points: THREE.Vector3[] = [];
    for (let k = 0; k < 9; k++) {
      points.push(new THREE.Vector3(x, y, z));
      x += Math.cos(a + Math.sin(k * 1.3 + i) * 0.7) * 0.75;
      z += Math.sin(a + Math.sin(k * 1.3 + i) * 0.7) * 0.75;
      y += Math.sin(k * 2.1 + i * 0.7) * 0.18;
      x = THREE.MathUtils.clamp(x, X0 + 0.15, X1 - 0.15);
      z = THREE.MathUtils.clamp(z, Z0 + 0.15, Z1 - 0.25);
      y = THREE.MathUtils.clamp(y, dermisBottom(x, z) + 0.15, (deep ? 0.6 : 1.9));
    }
    fibres.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 48, deep ? 0.06 : 0.035, 6));
  }
  root.add(new THREE.Mesh(kit.geometry(mergeGeometries(fibres)!), kit.toon("#ffc2d4", { rim: 0.35, rimColor: "#ffe6ee", gloss: 0.25, shadow: "#b8487a" })));
  for (const g of fibres) g.dispose();

  /* ------------------------ blood vessels ------------------------ */
  const artery: THREE.BufferGeometry[] = [];
  const vein: THREE.BufferGeometry[] = [];
  const along = (y: number, z: number, wobble: number, seed: number) =>
    Array.from({ length: 9 }, (_, k) => {
      const x = X0 + ((X1 - X0) * k) / 8;
      return new THREE.Vector3(x, y + Math.sin(k * 1.1 + seed) * wobble, z + Math.cos(k * 0.9 + seed) * wobble);
    });
  const deepArtery = along(-1.8, 1.85, 0.12, 1);
  const deepVein = along(-1.95, 0.8, 0.14, 2);
  artery.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(deepArtery), 80, 0.2, 14));
  vein.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(deepVein), 80, 0.26, 14));
  const arteryY = 1.75;
  const veinY = 1.58;
  const plexusA = along(arteryY, 2.55, 0.04, 3);
  const plexusV = along(veinY, 2.12, 0.05, 4);
  artery.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(plexusA), 80, 0.075, 8));
  vein.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(plexusV), 80, 0.09, 8));
  artery.push(
    new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3([new THREE.Vector3(3.3, -1.75, 1.85), new THREE.Vector3(3.2, -0.2, 2.15), new THREE.Vector3(3.05, 1.2, 2.45), new THREE.Vector3(3.0, arteryY, 2.55)]),
      30,
      0.1,
      8,
    ),
  );
  vein.push(
    new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3([new THREE.Vector3(-3.4, -1.9, 0.85), new THREE.Vector3(-3.5, -0.3, 1.4), new THREE.Vector3(-3.55, 1.0, 1.95), new THREE.Vector3(-3.6, veinY, 2.12)]),
      30,
      0.12,
      8,
    ),
  );
  root.add(new THREE.Mesh(kit.geometry(mergeGeometries(artery)!), flowToon(kit, "#ff3f63", { rim: 0.45, rimColor: "#ffb3c0", gloss: 0.4, speed: 0.5, stripes: 5, strength: 0.28, pulse: "#ffd0da" })));
  root.add(new THREE.Mesh(kit.geometry(mergeGeometries(vein)!), flowToon(kit, "#6a5cff", { rim: 0.45, rimColor: "#c9c2ff", gloss: 0.35, speed: -0.3, stripes: 4, strength: 0.22, pulse: "#d8d2ff" })));
  for (const g of [...artery, ...vein]) g.dispose();
  // Cut ends of the deep vessels on the side faces.
  const capGeometry = kit.geometry(new THREE.CircleGeometry(1, 28));
  const capMaterials = {
    artery: kit.flat("#b3123d"),
    vein: kit.flat("#3a2c9a"),
  };
  for (const [curve, r, material] of [
    [deepArtery, 0.2, capMaterials.artery],
    [deepVein, 0.26, capMaterials.vein],
  ] as const)
    for (const end of [curve[0], curve[curve.length - 1]]) {
      const cap = new THREE.Mesh(capGeometry, material);
      cap.scale.setScalar(r * 0.78);
      cap.position.copy(end).setX(end.x > 0 ? X1 + 0.012 : X0 - 0.012);
      cap.rotation.y = end.x > 0 ? Math.PI / 2 : -Math.PI / 2;
      root.add(cap);
    }

  // Capillary loops rising into the front papillae.
  const nerveX = frontPapilla(1.0);
  const loops: THREE.BufferGeometry[] = [];
  const red = new THREE.Color("#ff3f63");
  const blue = new THREE.Color("#7a5cff");
  for (const x of PAPILLA_X) {
    if (x === nerveX) continue;
    const tip = junction(x, Z1);
    loops.push(
      gradientTube(
        [
          new THREE.Vector3(x - 0.12, arteryY, 2.55),
          new THREE.Vector3(x - 0.09, (arteryY + tip) / 2, 2.85),
          new THREE.Vector3(x - 0.07, tip - 0.28, 3.0),
          new THREE.Vector3(x, tip - 0.17, 3.02),
          new THREE.Vector3(x + 0.07, tip - 0.28, 3.0),
          new THREE.Vector3(x + 0.1, (veinY + tip) / 2, 2.75),
          new THREE.Vector3(x + 0.14, veinY, 2.12),
        ],
        0.038,
        red,
        blue,
      ),
    );
  }
  root.add(new THREE.Mesh(kit.geometry(mergeGeometries(loops)!), kit.toon("#ffffff", { vertexColors: true, rim: 0.4, gloss: 0.3 })));
  for (const g of loops) g.dispose();

  /* ------------------------- sweat gland ------------------------- */
  const ductX = CRESTS.reduce((best, c) => (Math.abs(c - 1.65) < Math.abs(best - 1.65) ? c : best), CRESTS[0]);
  const coilCenter = new THREE.Vector3(ductX + 0.55, -1.72, 2.6);
  const coil: THREE.Vector3[] = [];
  for (let i = 0; i <= 220; i++) {
    const t = (i / 220) * Math.PI * 6;
    const d = new THREE.Vector3(Math.sin(2.3 * t), Math.cos(3.1 * t) * 0.8, Math.sin(1.7 * t + 1)).normalize();
    const r = 0.32 + 0.24 * (0.5 + 0.5 * Math.sin(5 * t));
    coil.push(coilCenter.clone().add(d.multiplyScalar(r).multiply(new THREE.Vector3(1.4, 0.85, 1.0))));
  }
  const surfaceAtDuct = surface(ductX);
  const duct: THREE.Vector3[] = [
    coil[coil.length - 1],
    new THREE.Vector3(ductX + 0.3, -0.9, 2.7),
    new THREE.Vector3(ductX + 0.1, 0.2, 2.8),
    new THREE.Vector3(ductX, 1.2, 2.95),
    new THREE.Vector3(ductX, 1.8, 3.12),
  ];
  // In the epidermis the duct corkscrews up to the pore (drawn cut open on the front face).
  const turns = 3.5;
  for (let i = 0; i <= 80; i++) {
    const t = i / 80;
    const y = 2.0 + (surfaceAtDuct - 0.06 - 2.0) * t;
    duct.push(new THREE.Vector3(ductX + Math.sin(t * turns * Math.PI * 2) * 0.12 * Math.min(1, t * 6), y, Z1 - 0.005));
  }
  const glandMaterial = kit.toon("#3fc4ff", { rim: 0.55, rimColor: "#d5f6ff", gloss: 0.45 });
  root.add(
    new THREE.Mesh(
      kit.geometry(mergeGeometries([new THREE.TubeGeometry(new THREE.CatmullRomCurve3(coil), 600, 0.1, 8), new THREE.TubeGeometry(new THREE.CatmullRomCurve3(duct), 200, 0.062, 8)])!),
      glandMaterial,
    ),
  );
  // The pore it opens into, and a bead of sweat.
  const poreGeometry = kit.geometry(new THREE.CircleGeometry(1, 24));
  const poreMaterial = kit.flat("#8b3358");
  const pores = new THREE.InstancedMesh(poreGeometry, poreMaterial, 20);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
  let poreCount = 0;
  CRESTS.forEach((x, k) => {
    const zs = x === ductX ? [Z1 - 0.13, 0.55, -1.95] : [2.2 - ((k * 0.9) % 2.4), -0.3 - ((k * 0.9) % 2.4)];
    for (const z of zs)
      pores.setMatrixAt(poreCount++, m.compose(new THREE.Vector3(x, surface(x) + 0.006, z), q, new THREE.Vector3(0.085, 0.07, 1)));
  });
  pores.count = poreCount;
  root.add(pores);
  const drop = new THREE.Mesh(
    kit.geometry(new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2)),
    kit.toon("#c4f3ff", { rim: 0.8, rimColor: "#ffffff", gloss: 0.9, opacity: 0.82 }),
  );
  drop.position.set(ductX, surfaceAtDuct, Z1 - 0.13);
  root.add(drop);

  /* ------------------------ nerve & touch ------------------------ */
  const nerveTip = junction(nerveX, Z1);
  const corpuscleCenter = new THREE.Vector3(nerveX, nerveTip - 0.42, 3.02);
  const pacini = new THREE.Vector3(-2.9, -3.45, Z1);
  const nerveMain = [
    new THREE.Vector3(X1, -1.2, 1.3),
    new THREE.Vector3(3.9, -0.9, 1.7),
    new THREE.Vector3(2.7, 0.15, 2.2),
    new THREE.Vector3(1.6, 1.2, 2.6),
    new THREE.Vector3(nerveX + 0.05, 2.0, 2.92),
    corpuscleCenter.clone().setY(corpuscleCenter.y - 0.3),
  ];
  const nerveDeep = [
    new THREE.Vector3(3.9, -0.9, 1.7),
    new THREE.Vector3(2.0, -1.6, 2.2),
    new THREE.Vector3(-0.5, -2.2, 2.6),
    new THREE.Vector3(-2.0, -3.0, 2.95),
    pacini.clone().setX(pacini.x + 0.75).setZ(3.05),
  ];
  const nerveMaterial = flowToon(kit, "#ffcf3a", { rim: 0.5, rimColor: "#fff3b8", gloss: 0.4, speed: -0.6, stripes: 3, strength: 0.75, pulse: "#ffffff" });
  root.add(
    new THREE.Mesh(
      kit.geometry(mergeGeometries([new THREE.TubeGeometry(new THREE.CatmullRomCurve3(nerveMain), 120, 0.06, 8), new THREE.TubeGeometry(new THREE.CatmullRomCurve3(nerveDeep), 120, 0.05, 8)])!),
      nerveMaterial,
    ),
  );
  const nerveCap = new THREE.Mesh(capGeometry, kit.flat("#e0a51c"));
  nerveCap.scale.setScalar(0.05);
  nerveCap.position.set(X1 + 0.012, -1.2, 1.3);
  nerveCap.rotation.y = Math.PI / 2;
  root.add(nerveCap);
  // Meissner corpuscle: a capsule of stacked lamellae in the papilla.
  const meissner = new THREE.Group();
  meissner.position.copy(corpuscleCenter);
  const capsule = new THREE.Mesh(kit.geometry(new THREE.SphereGeometry(1, 24, 16)), kit.toon("#fff0b3", { rim: 0.7, rimColor: "#ffffff", opacity: 0.55, depthWrite: false }));
  capsule.scale.set(0.19, 0.34, 0.16);
  const lamella = new THREE.InstancedMesh(kit.geometry(new THREE.CylinderGeometry(1, 1, 1, 18)), kit.toon("#ffd65a", { rim: 0.4, gloss: 0.3 }), 6);
  for (let k = 0; k < 6; k++) {
    const y = -0.21 + k * 0.085;
    const w = 0.15 * Math.sqrt(1 - Math.pow(y / 0.32, 2));
    lamella.setMatrixAt(k, m.compose(new THREE.Vector3(0, y, 0), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, (k % 2 ? 1 : -1) * 0.18)), new THREE.Vector3(w, 0.03, w * 0.9)));
  }
  const touchGlow = kit.glow("#fff3a0", 1.2, { opacity: 0.0 });
  meissner.add(lamella, capsule, touchGlow);
  root.add(meissner);

  /* -------------------------- hypodermis -------------------------- */
  const fatSlab = new THREE.Mesh(
    kit.geometry(slab(BOUNDS, dermisBottom, () => FAT_BOTTOM, { nx: 60, nz: 30, ny: 6, faces: ["front", "back", "left", "right", "bottom"] })),
    kit.toon("#f7a88c", { rim: 0.3, soft: 0.4 }),
  );
  root.add(fatSlab);
  const fatSpots: { p: THREE.Vector3; r: number }[] = [];
  const clearOfPacini = (x: number, y: number) => Math.hypot((x - pacini.x) / 1.35, (y - pacini.y) / 0.85) > 1.05;
  let row = 0;
  for (let y = -4.05; y < -2.4; y += 0.6, row++)
    for (let x = X0 + 0.38 + (row % 2) * 0.36; x < X1 - 0.2; x += 0.74) {
      const r = 0.4 + random() * 0.1;
      const px = x + (random() - 0.5) * 0.12;
      const py = y + (random() - 0.5) * 0.1;
      if (py + r * 0.45 > dermisBottom(px, Z1) || !clearOfPacini(px, py)) continue;
      fatSpots.push({ p: new THREE.Vector3(px, py, Z1 - r * 0.45), r });
    }
  row = 0;
  for (let y = -4.05; y < -2.4; y += 0.6, row++)
    for (let z = Z0 + 0.38 + (row % 2) * 0.36; z < Z1 - 0.2; z += 0.74) {
      const r = 0.4 + random() * 0.1;
      const py = y + (random() - 0.5) * 0.1;
      if (py + r * 0.45 > dermisBottom(X1, z)) continue;
      fatSpots.push({ p: new THREE.Vector3(X1 - r * 0.45, py, z + (random() - 0.5) * 0.12), r });
    }
  for (let x = X0 + 0.4; x < X1 - 0.2; x += 0.8)
    for (let z = Z0 + 0.4; z < Z1 - 0.2; z += 0.8) {
      const r = 0.4 + random() * 0.1;
      fatSpots.push({ p: new THREE.Vector3(x + (random() - 0.5) * 0.15, FAT_BOTTOM + r * 0.45, z + (random() - 0.5) * 0.15), r });
    }
  const fat = new THREE.InstancedMesh(kit.blob(1, { detail: 2, noise: 0.06, seed: 4 }), kit.toon("#ffffff", { rim: 0.45, rimColor: "#fff6c9", gloss: 0.45 }), fatSpots.length);
  const yellows = ["#ffd34d", "#ffdd6b", "#ffc93f", "#ffe488"].map((c) => new THREE.Color(c));
  fatSpots.forEach(({ p, r }, k) => {
    fat.setMatrixAt(k, m.compose(p, new THREE.Quaternion().setFromEuler(new THREE.Euler(random(), random(), random())), new THREE.Vector3(r, r * 0.92, r)));
    fat.setColorAt(k, yellows[k % yellows.length]);
  });
  root.add(fat);
  // Pacinian corpuscle, cut open on the front face: concentric lamellae.
  const onion = kit.canvasTexture(256, 256, (g, w, h) => {
    const rings = ["#f3ecff", "#d9ccff", "#f7f1ff", "#cbbcff", "#efe7ff", "#bfaeff", "#fff8ff", "#b09cff"];
    for (let k = 0; k < rings.length; k++) {
      const t = 1 - k / rings.length;
      g.fillStyle = rings[k];
      g.beginPath();
      g.ellipse(w / 2 + (1 - t) * 6, h / 2, (w / 2) * t, (h / 2) * t, 0, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = "#ffcf3a";
    g.beginPath();
    g.ellipse(w / 2 + 40, h / 2, 26, 9, 0, 0, Math.PI * 2);
    g.fill();
  });
  const paciniFace = new THREE.Mesh(kit.geometry(new THREE.CircleGeometry(1, 48)), kit.textured(onion, { rim: 0, gloss: 0.2, flat: 0.35 }));
  paciniFace.scale.set(1.25, 0.72, 1);
  paciniFace.position.copy(pacini).setZ(Z1 + 0.015);
  root.add(paciniFace);

  /* ------------------------ surroundings ------------------------ */
  const glow = kit.glow("#ff7ab6", 30, { opacity: 0.28, env: true });
  glow.position.set(0, -1, -6);
  env.add(glow);
  const motes: number[] = [];
  for (let i = 0; i < kit.count(60); i++) {
    const a = random() * Math.PI * 2;
    const r = 7 + random() * 7;
    motes.push(Math.cos(a) * r, (random() - 0.5) * 16, Math.sin(a) * r * 0.6 - 3);
  }
  const moteCloud = kit.points(motes, { size: 0.12, color: "#ffc2d6", opacity: 0.6, soft: 1, twinkle: 0.6, env: true });
  env.add(moteCloud);

  return {
    root,
    env,
    dispose: () => disposeInstances(root, env),
    update({ time }) {
      const beat = 0.5 + 0.5 * Math.sin(time * 1.3);
      drop.scale.set(0.09 + 0.05 * beat, 0.07 + 0.05 * beat, 0.09 + 0.05 * beat);
      const touch = Math.pow(0.5 + 0.5 * Math.sin(time * 1.9), 6);
      touchGlow.material.opacity = 0.2 + 0.8 * touch;
      touchGlow.scale.setScalar(0.6 + 0.5 * touch);
      moteCloud.rotation.y = time * 0.02;
    },
  };
};

export default skin;
