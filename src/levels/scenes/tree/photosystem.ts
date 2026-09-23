/**
 * A photosystem II supercomplex in the thylakoid membrane (10 units = 25 nm).
 *
 * The membrane is a lipid-bilayer "shelf" (stroma above, lumen below) whose
 * front edge runs through the complex, textbook-style: the proteins are shown
 * whole, half-embedded. Light-harvesting antennae (translucent green) hold
 * glowing chlorophylls and orange carotenoids; the teal core holds the
 * reaction centre (P680) and, on the lumen side, the water-splitting cluster.
 *
 * Loop (two reaction centres, offset): a photon is absorbed in an antenna,
 * the excitation hops pigment to pigment to P680, an electron leaves towards
 * the stroma side, the Mn cluster refills it from water, releasing a proton
 * each time and one O₂ molecule every four photons. Real hops take
 * picoseconds: the animation is slowed about a trillion times.
 *
 * The `chlorophyll` child is one antenna chlorophyll facing the camera; the
 * protein around it never moves.
 */
import * as THREE from "three";
import { rng } from "../../../engine/kit";
import type { Kit } from "../../../engine/kit";
import type { SceneBuilder } from "../types";
import { ELEMENT_COLORS } from "../common/molecules";
import { PHOTO_COLORS as C, chlorophyllTileTexture, lightShafts } from "./chloroplastShared";

/** Half thickness of the bilayer (4.5 nm thick). */
const HALF = 0.9;
/** The membrane shelf: its front edge runs through the complex. */
const SHELF = { minX: -11, maxX: 11, minZ: -5.6, maxZ: 0.15, corner: 2.6 };
const PERIOD = 3.2;

interface Part {
  at: [number, number, number];
  size: [number, number, number];
  color: string;
}

/** One core monomer (reaction centre, CP43, CP47, small subunits), centred on x = 0. */
const CORE: Part[] = [
  { at: [0.2, 0.05, 0.25], size: [1.15, 1.08, 1.05], color: "#1fb8d8" },
  { at: [1.0, 0.0, -0.9], size: [1.15, 1.02, 1.05], color: "#27c6c9" },
  { at: [-0.8, 0.0, 1.05], size: [1.1, 1.02, 0.95], color: "#2ad0c0" },
  { at: [-1.05, 0.0, -0.8], size: [0.8, 0.98, 0.85], color: "#3a9fe0" },
];
/** Proteins on the lumen side that shield the Mn cluster. */
const EXTRINSIC: Part[] = [
  { at: [0.7, -1.55, 0.1], size: [0.95, 0.62, 0.85], color: "#b49cff" },
  { at: [-0.75, -1.45, 0.55], size: [0.62, 0.5, 0.58], color: "#ff9fd2" },
  { at: [1.45, -1.35, 1.0], size: [0.5, 0.45, 0.48], color: "#ffcf6b" },
];
/** Reaction centre and electron route, in monomer coordinates. */
const P680 = new THREE.Vector3(0.15, -0.35, 0.95);
const OEC = new THREE.Vector3(0.05, -1.08, 1.25);
const ELECTRON_ROUTE = [
  P680,
  new THREE.Vector3(0.5, 0.05, 0.9),
  new THREE.Vector3(0.75, 0.55, 0.7),
  new THREE.Vector3(0.1, 0.72, 0.85),
  new THREE.Vector3(-0.5, 0.62, 1.25),
  new THREE.Vector3(-1.6, 0.5, 2.3),
  new THREE.Vector3(-2.6, 0.45, 3.6),
];

/** Lipid heads packed on a surface, and the bilayer seen in section. */
function lipidTextures(kit: Kit) {
  const top = kit.canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = "#f2c27c";
    g.fillRect(0, 0, w, h);
    const n = 8;
    const step = w / n;
    for (let row = 0; row < n + 1; row++)
      for (let col = 0; col < n + 1; col++) {
        const x = col * step + (row % 2) * step * 0.5;
        const y = row * step;
        const grad = g.createRadialGradient(x - 4, y - 5, 2, x, y, step * 0.46);
        grad.addColorStop(0, "#fff6e0");
        grad.addColorStop(0.75, "#ffe0ac");
        grad.addColorStop(1, "#f8cf90");
        g.fillStyle = grad;
        for (const dx of [-w, 0, w])
          for (const dy of [-h, 0, h]) {
            g.beginPath();
            g.arc(x + dx, y + dy, step * 0.44, 0, Math.PI * 2);
            g.fill();
          }
      }
  });
  top.wrapS = top.wrapT = THREE.RepeatWrapping;
  const side = kit.canvasTexture(256, 176, (g, w, h) => {
    g.fillStyle = "#e0913f";
    g.fillRect(0, 0, w, h);
    const n = 8;
    const step = w / n;
    const r = step * 0.44;
    g.lineWidth = 3.2;
    g.lineCap = "round";
    for (let i = 0; i < n; i++) {
      const x = i * step + step / 2;
      for (const [y0, sign] of [
        [r, 1],
        [h - r, -1],
      ] as const) {
        g.strokeStyle = "#ffd27a";
        for (const off of [-5, 5]) {
          g.beginPath();
          g.moveTo(x + off, y0);
          for (let t = 0; t <= 1; t += 0.1)
            g.lineTo(x + off + Math.sin(t * 9 + i) * 2.5, y0 + sign * t * (h / 2 - r - 3));
          g.stroke();
        }
        const grad = g.createRadialGradient(x - 3, y0 - 4, 2, x, y0, r);
        grad.addColorStop(0, "#fff6e0");
        grad.addColorStop(0.7, "#ffdca0");
        grad.addColorStop(1, "#f0b870");
        g.fillStyle = grad;
        g.beginPath();
        g.arc(x, y0, r, 0, Math.PI * 2);
        g.fill();
      }
    }
  });
  side.wrapS = THREE.RepeatWrapping;
  return { top, side };
}

/** A rounded-rectangle membrane slab: textured top face and bilayer walls. */
function shelf(kit: Kit, y: number, env: boolean, tint = "#ffffff", bounds = SHELF, opacity = 1) {
  const { minX, maxX, minZ, maxZ, corner } = bounds;
  const shape = new THREE.Shape();
  const c = corner;
  // Shape in (x, -z) so that after rotating onto XZ the top faces +Y.
  shape.moveTo(minX + c, -maxZ);
  shape.lineTo(maxX - c, -maxZ);
  shape.quadraticCurveTo(maxX, -maxZ, maxX, -maxZ + c);
  shape.lineTo(maxX, -minZ - c);
  shape.quadraticCurveTo(maxX, -minZ, maxX - c, -minZ);
  shape.lineTo(minX + c, -minZ);
  shape.quadraticCurveTo(minX, -minZ, minX, -minZ - c);
  shape.lineTo(minX, -maxZ + c);
  shape.quadraticCurveTo(minX, -maxZ, minX + c, -maxZ);
  const textures = lipidTextures(kit);
  const unit = 2.64;
  const topUnit = 4.2;
  const topGeometry = kit.geometry(new THREE.ShapeGeometry(shape, 12));
  const topUv = topGeometry.getAttribute("uv");
  for (let i = 0; i < topUv.count; i++) topUv.setXY(i, topUv.getX(i) / topUnit, topUv.getY(i) / topUnit);
  topGeometry.rotateX(-Math.PI / 2);
  topGeometry.translate(0, y + HALF, 0);
  const group = new THREE.Group();
  const fade = opacity < 1 ? { transparent: true, opacity } : {};
  const topMaterial = kit.textured(textures.top, { env, rim: 0.1, gloss: 0.05, soft: 0.5, shadow: "#b07a5a", ...fade });
  (topMaterial.uniforms.uColor.value as THREE.Color).set(tint);
  group.add(new THREE.Mesh(topGeometry, topMaterial));
  // Walls along the outline.
  const outline = shape.getSpacedPoints(220);
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const index: number[] = [];
  let length = 0;
  for (let i = 0; i < outline.length; i++) {
    const a = outline[i];
    const b = outline[(i + 1) % outline.length];
    const prev = outline[(i - 1 + outline.length) % outline.length];
    if (i > 0) length += a.distanceTo(prev);
    const tx = b.x - prev.x;
    const ty = b.y - prev.y;
    const nl = Math.hypot(tx, ty) || 1;
    // Outward normal of a counter-clockwise outline in (x, -z).
    const nx = ty / nl;
    const nz = tx / nl;
    for (const [yy, v] of [
      [y + HALF, 1],
      [y - HALF, 0],
    ] as const) {
      positions.push(a.x, yy, -a.y);
      normals.push(nx, 0, nz);
      uvs.push(length / unit, v);
    }
    if (i + 1 < outline.length) {
      const k = i * 2;
      index.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
    }
  }
  const wall = kit.geometry(new THREE.BufferGeometry());
  wall.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  wall.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  wall.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  wall.setIndex(index);
  const wallMaterial = kit.textured(textures.side, { env, rim: 0.15, gloss: 0, soft: 0.5, shadow: "#9a5a3a", side: THREE.DoubleSide, ...fade });
  (wallMaterial.uniforms.uColor.value as THREE.Color).set(tint);
  group.add(new THREE.Mesh(wall, wallMaterial));
  group.userData.materials = [topMaterial, wallMaterial];
  return group;
}

const photosystem: SceneBuilder = ({ kit, children }) => {
  const root = new THREE.Group();
  const env = new THREE.Group();
  const random = rng(680);
  const chlorophyll = children.find((child) => child.id === "chlorophyll");
  const anchor = new THREE.Vector3(...(chlorophyll?.at ?? [-3.3, 0.4, 2.6]));

  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();
  const color = new THREE.Color();
  const blobGeometry = kit.blob(1, { detail: 3, noise: 0.13, frequency: 1.6, seed: 12 });

  /* ---------------- The membrane ---------------- */
  env.add(shelf(kit, 0, true));
  // The facing membrane of the same thylakoid, across the narrow lumen (~10 nm).
  // It only appears once the visitor is nearly there, to keep the dive readable.
  const lower = shelf(kit, -HALF * 2 - 4, false, "#c9a9b0", { minX: -10.5, maxX: 10.5, minZ: -3.2, maxZ: 0.6, corner: 1.9 }, 0.999);
  const lowerMaterials = lower.userData.materials as THREE.ShaderMaterial[];
  env.add(lower);

  /* ---------------- The supercomplex ---------------- */
  // Two core monomers related by a two-fold axis, and their antennae.
  const monomers = [
    { at: new THREE.Vector3(-1.9, 0, -0.15), rot: 0 },
    { at: new THREE.Vector3(1.9, 0, -0.15), rot: Math.PI },
  ];
  const toMonomer = (k: number, v: THREE.Vector3) =>
    v.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), monomers[k].rot).add(monomers[k].at);
  // Symmetry partner used for mirrored placement: (x, z) → (−x, −z).
  const partner = (v: THREE.Vector3) => new THREE.Vector3(-v.x, v.y, -v.z);

  const corePartCount = CORE.length * 2;
  const core = new THREE.InstancedMesh(
    blobGeometry,
    kit.toon("#ffffff", {
      rim: 0.7,
      rimColor: "#c8fff4",
      gloss: 0.35,
      shadow: "#0f5560",
      soft: 0.3,
      opacity: 0.7,
      transparent: true,
      depthWrite: false,
    }),
    corePartCount,
  );
  const extrinsic = new THREE.InstancedMesh(
    blobGeometry,
    kit.toon("#ffffff", { rim: 0.5, rimColor: "#f3e8ff", gloss: 0.3, shadow: "#5a3a9a", soft: 0.3 }),
    EXTRINSIC.length * 2,
  );
  let ci = 0;
  let ei = 0;
  for (let k = 0; k < 2; k++) {
    for (const part of CORE) {
      const at = toMonomer(k, new THREE.Vector3(...part.at));
      q.setFromEuler(new THREE.Euler(0, monomers[k].rot + (random() - 0.5) * 0.4, 0));
      core.setMatrixAt(ci, m4.compose(at, q, s.set(...part.size)));
      core.setColorAt(ci++, color.set(part.color));
    }
    for (const part of EXTRINSIC) {
      const at = toMonomer(k, new THREE.Vector3(...part.at));
      q.setFromEuler(new THREE.Euler(0, random() * 3, 0));
      extrinsic.setMatrixAt(ei, m4.compose(at, q, s.set(...part.size)));
      extrinsic.setColorAt(ei++, color.set(part.color));
    }
  }
  core.renderOrder = 1;
  root.add(core, extrinsic);

  // Antennae: one LHCII trimer and two minor antennae (CP26, CP29) per side.
  const antennaParts: { at: THREE.Vector3; size: THREE.Vector3; color: string }[] = [];
  const trimerCenter = new THREE.Vector3(-5.05, 0, 0.75);
  for (const side of [0, 1]) {
    const center = side === 0 ? trimerCenter : partner(trimerCenter);
    for (let lobe = 0; lobe < 3; lobe++) {
      const a = (lobe / 3) * Math.PI * 2 + 0.25 + side * Math.PI;
      antennaParts.push({
        at: center.clone().add(new THREE.Vector3(Math.sin(a) * 0.82, 0.02, Math.cos(a) * 0.82)),
        size: new THREE.Vector3(0.98, 1.12, 0.95),
        color: ["#3ad36c", "#2fc46a", "#4ddc73"][lobe],
      });
    }
    const cp29 = new THREE.Vector3(-4.1, 0, -1.55);
    const cp26 = new THREE.Vector3(-3.35, 0, 1.95);
    antennaParts.push({ at: side === 0 ? cp29 : partner(cp29), size: new THREE.Vector3(0.8, 1.05, 0.82), color: "#6fdc5a" });
    antennaParts.push({ at: side === 0 ? cp26 : partner(cp26), size: new THREE.Vector3(0.78, 1.05, 0.8), color: "#8fe35a" });
  }
  const antenna = new THREE.InstancedMesh(
    blobGeometry,
    kit.toon("#ffffff", {
      rim: 0.75,
      rimColor: "#d8ffb0",
      gloss: 0.35,
      shadow: "#1f7a4a",
      soft: 0.3,
      opacity: 0.58,
      transparent: true,
      depthWrite: false,
    }),
    antennaParts.length,
  );
  antennaParts.forEach((part, i) => {
    q.setFromEuler(new THREE.Euler(0, i * 1.7, 0));
    antenna.setMatrixAt(i, m4.compose(part.at, q, part.size));
    antenna.setColorAt(i, color.set(part.color));
  });
  antenna.renderOrder = 2;
  root.add(antenna);

  /* ---------------- Pigments: chlorophylls (glowing tiles) and carotenoids ---------------- */
  const cam = new THREE.Vector3(0, Math.sin(25 * (Math.PI / 180)), Math.cos(25 * (Math.PI / 180)));
  const tiles: THREE.Vector3[] = [];
  const tileNormals: THREE.Vector3[] = [];
  const addTile = (at: THREE.Vector3) => {
    if (at.distanceTo(anchor) < 0.5) return;
    if (tiles.some((t) => t.distanceTo(at) < 0.42)) return;
    tiles.push(at);
    const n = cam
      .clone()
      .add(new THREE.Vector3((random() - 0.5) * 1.4, (random() - 0.5) * 1.0, (random() - 0.5) * 0.8))
      .normalize();
    tileNormals.push(n);
  };
  const fill = (center: THREE.Vector3, size: THREE.Vector3, count: number) => {
    for (let tries = 0, made = 0; made < count && tries < count * 30; tries++) {
      const v = new THREE.Vector3(random() * 2 - 1, random() * 2 - 1, random() * 2 - 1);
      if (v.lengthSq() > 0.62) continue;
      const at = center.clone().add(v.multiply(size));
      if (Math.abs(at.y) > HALF - 0.12) continue;
      const before = tiles.length;
      addTile(at);
      if (tiles.length > before) made++;
    }
  };
  for (const part of antennaParts) fill(part.at, part.size, 7);
  const coreTiles: number[] = [];
  for (let k = 0; k < 2; k++)
    for (const part of CORE.slice(1, 3)) {
      const start = tiles.length;
      fill(toMonomer(k, new THREE.Vector3(...part.at)), new THREE.Vector3(...part.size), 6);
      for (let i = start; i < tiles.length; i++) coreTiles.push(i);
    }
  // The special pair P680 in each reaction centre.
  const p680 = [toMonomer(0, P680), toMonomer(1, P680)];
  const pairIndex: number[] = [];
  for (const center of p680)
    for (const dx of [-0.13, 0.13]) {
      pairIndex.push(tiles.length);
      tiles.push(center.clone().add(new THREE.Vector3(dx, 0, 0)));
      tileNormals.push(new THREE.Vector3(1, 0, 0.35).normalize());
    }

  const tileGeometry = kit.geometry(new THREE.CircleGeometry(0.21, 24));
  const pigments = new THREE.InstancedMesh(
    tileGeometry,
    kit.textured(chlorophyllTileTexture(kit), { rim: 0, gloss: 0.2, soft: 0.6, flat: 0.45, alphaTest: 0.2, side: THREE.DoubleSide }),
    tiles.length,
  );
  const upAxis = new THREE.Vector3(0, 0, 1);
  tiles.forEach((at, i) => {
    q.setFromUnitVectors(upAxis, tileNormals[i]);
    pigments.setMatrixAt(i, m4.compose(at, q, s.set(1, 1, 1)));
  });
  root.add(pigments);
  const glowPositions: number[] = [];
  for (const t of tiles) glowPositions.push(t.x, t.y, t.z);
  const pigmentGlow = kit.points(glowPositions, { size: 0.75, color: "#9dff7a", soft: 1, twinkle: 0.45, additive: true, opacity: 0.5 });
  root.add(pigmentGlow);

  const carotenoidGeometry = kit.geometry(new THREE.CylinderGeometry(0.035, 0.035, 1.15, 6));
  const carotenoidSpots: { at: THREE.Vector3; rot: THREE.Euler }[] = [];
  for (const part of antennaParts)
    for (let j = 0; j < 2; j++) {
      const at = part.at.clone().add(new THREE.Vector3((random() - 0.5) * 0.9, 0, (random() - 0.5) * 0.9));
      if (at.distanceTo(anchor) < 0.6) continue;
      carotenoidSpots.push({ at, rot: new THREE.Euler((random() - 0.5) * 0.9, random() * 3, (random() - 0.5) * 0.9) });
    }
  const carotenoids = new THREE.InstancedMesh(
    carotenoidGeometry,
    kit.toon("#ffa232", { rim: 0.5, rimColor: "#ffe8b0", gloss: 0.5, flat: 0.3 }),
    carotenoidSpots.length,
  );
  carotenoidSpots.forEach((c, i) => carotenoids.setMatrixAt(i, m4.compose(c.at, q.setFromEuler(c.rot), s.set(1, 1, 1))));
  root.add(carotenoids);

  /* ---------------- Mn₄CaO₅ clusters (where water is split) ---------------- */
  const oec = [toMonomer(0, OEC), toMonomer(1, OEC)];
  const clusterAtoms: { at: THREE.Vector3; symbol: string }[] = [];
  const clusterShape: [number, number, number, string][] = [
    [0, 0, 0, "Mn"],
    [0.26, 0.06, 0.06, "Mn"],
    [0.1, 0.24, -0.1, "Mn"],
    [0.13, -0.03, 0.26, "Mn"],
    [-0.2, 0.16, 0.16, "Ca"],
  ];
  for (const center of oec)
    for (const [x, y, z, symbol] of clusterShape) clusterAtoms.push({ at: center.clone().add(new THREE.Vector3(x, y, z)), symbol });
  const cluster = new THREE.InstancedMesh(
    kit.geometry(new THREE.SphereGeometry(0.13, 16, 12)),
    kit.toon("#ffffff", { rim: 0.5, gloss: 0.5 }),
    clusterAtoms.length,
  );
  clusterAtoms.forEach((atom, i) => {
    cluster.setMatrixAt(i, m4.compose(atom.at, q.identity(), s.setScalar(atom.symbol === "Ca" ? 1.15 : 1)));
    cluster.setColorAt(i, color.set(atom.symbol === "Ca" ? "#e8f0ff" : "#b06bff"));
  });
  root.add(cluster);
  for (const center of oec) {
    const halo = kit.glow("#c89bff", 1.6, { opacity: 0.75 });
    halo.position.copy(center).add(new THREE.Vector3(0.05, 0.07, 0.07));
    root.add(halo);
  }

  /* ---------------- Energy paths: pigment to pigment, towards P680 ---------------- */
  const hopPath = (start: THREE.Vector3, target: THREE.Vector3, through?: THREE.Vector3) => {
    const path = [start.clone()];
    const used = new Set<number>();
    let current = start.clone();
    let passed = !through;
    for (let step = 0; step < 12; step++) {
      const goal = passed ? target : through!;
      if (current.distanceTo(goal) < 1.1) {
        path.push(goal.clone());
        current = goal.clone();
        if (passed) break;
        passed = true;
        continue;
      }
      let best = -1;
      let bestScore = -Infinity;
      tiles.forEach((t, i) => {
        if (used.has(i) || pairIndex.includes(i)) return;
        const hop = t.distanceTo(current);
        if (hop < 0.35 || hop > 1.3) return;
        const progress = current.distanceTo(goal) - t.distanceTo(goal);
        const score = progress - Math.abs(hop - 0.95) * 0.4;
        if (progress > 0.15 && score > bestScore) (bestScore = score), (best = i);
      });
      if (best < 0) {
        path.push(goal.clone());
        current = goal.clone();
        if (passed) break;
        passed = true;
        continue;
      }
      used.add(best);
      current = tiles[best].clone();
      path.push(current);
    }
    if (!path[path.length - 1].equals(target)) path.push(target.clone());
    return path;
  };
  // Stream A enters the front antenna, passes by the chlorophyll you can dive into.
  const startA = tiles.reduce((a, b) => (b.x < a.x - 0.2 || (Math.abs(b.x - a.x) < 0.2 && b.y > a.y) ? b : a), tiles[0]);
  const startB = partner(startA).setY(0.6);
  const streams = [
    { hops: hopPath(startA, p680[0], anchor), from: new THREE.Vector3(-9, 9, 5), k: 0 },
    { hops: hopPath(startB, p680[1]), from: new THREE.Vector3(-1, 11, 2), k: 1 },
  ];

  const sprite = (hex: string, size: number) => {
    const g = kit.glow(hex, size, { opacity: 0 });
    (g.material as THREE.SpriteMaterial).depthTest = false;
    g.renderOrder = 10;
    root.add(g);
    return g;
  };
  const waveLine = (hex: string) => {
    const points: number[] = [];
    for (let i = 0; i <= 48; i++) {
      const t = i / 48;
      points.push(Math.sin(t * Math.PI * 7) * 0.18 * Math.sin(t * Math.PI), 0, -t * 3.2);
    }
    const line = kit.line(points, { color: hex, width: 3, opacity: 0 });
    line.renderOrder = 9;
    root.add(line);
    return line;
  };
  const fx = streams.map((stream) => ({
    ...stream,
    photon: sprite(C.photon, 1.4),
    wave: waveLine(C.photon),
    exciton: sprite("#e6ff7a", 1.1),
    flash: sprite("#ffffff", 1.8),
    electron: sprite("#6ff3ff", 0.75),
    spark: sprite("#d9b3ff", 0.6),
  }));

  /* ---------------- Water, protons and oxygen in the lumen ---------------- */
  const waters: { base: THREE.Vector3; phase: number; rot: THREE.Euler }[] = [];
  for (let i = 0; i < 16; i++) {
    const center = oec[i % 2];
    const at = center.clone().add(new THREE.Vector3((random() - 0.5) * 3.2, -0.9 - random() * 2.2, 0.6 + random() * 2));
    waters.push({ base: at, phase: random() * 6.28, rot: new THREE.Euler(random() * 6, random() * 6, random() * 6) });
  }
  const sphere = kit.geometry(new THREE.SphereGeometry(1, 16, 12));
  const waterO = new THREE.InstancedMesh(sphere, kit.toon(ELEMENT_COLORS.O, { rim: 0.4, gloss: 0.4, env: true }), waters.length);
  const waterH = new THREE.InstancedMesh(sphere, kit.toon(ELEMENT_COLORS.H, { rim: 0.3, gloss: 0.3, env: true }), waters.length * 2);
  env.add(waterO, waterH);
  // O–H 0.96 Å, 104.5° (1 unit = 2.5 nm, drawn larger than life to be seen).
  const hOffsets = [new THREE.Vector3(0.16, 0.12, 0), new THREE.Vector3(-0.16, 0.12, 0)];
  const placeWaters = (time: number) => {
    waters.forEach((w, i) => {
      p.copy(w.base).add(new THREE.Vector3(Math.sin(time * 0.5 + w.phase) * 0.15, Math.sin(time * 0.7 + w.phase * 2) * 0.1, 0));
      q.setFromEuler(new THREE.Euler(w.rot.x + time * 0.3, w.rot.y + time * 0.2, w.rot.z));
      waterO.setMatrixAt(i, m4.compose(p, q, s.setScalar(0.13)));
      hOffsets.forEach((h, j) => {
        const hp = h.clone().applyQuaternion(q).add(p);
        waterH.setMatrixAt(i * 2 + j, m4.compose(hp, q, s.setScalar(0.08)));
      });
    });
    waterO.instanceMatrix.needsUpdate = true;
    waterH.instanceMatrix.needsUpdate = true;
  };
  placeWaters(0);

  // O₂ released every fourth photon of each reaction centre.
  const oxygen = new THREE.InstancedMesh(sphere, kit.toon(ELEMENT_COLORS.O, { rim: 0.5, gloss: 0.5, rimColor: "#ffd0d0" }), 4);
  root.add(oxygen);
  const oxygenGlow = [sprite("#ff8a8a", 1.0), sprite("#ff8a8a", 1.0)];
  // Protons (H⁺) piling up in the lumen: a haze, plus one freshly released per photon.
  const haze: number[] = [];
  for (let i = 0; i < 60; i++)
    haze.push((random() - 0.5) * 20, -1.3 - random() * 3.5, (random() - 0.2) * 5 - 1);
  env.add(kit.points(haze, { size: 0.22, color: "#ffb13b", soft: 0.8, twinkle: 0.6, additive: true, opacity: 0.7, env: true }));
  const fresh = [sprite("#ffc04d", 0.55), sprite("#ffc04d", 0.55)];

  /* ---------------- Surroundings: more antennae, cytochrome b6f, plastoquinones ---------------- */
  const loose = [
    new THREE.Vector3(-8.4, 0, -2.6),
    new THREE.Vector3(-4.2, 0, -3.9),
    new THREE.Vector3(6.2, 0, -3.8),
    new THREE.Vector3(8.2, 0, -1.6),
  ];
  const looseAntenna = new THREE.InstancedMesh(
    blobGeometry,
    kit.toon("#ffffff", { rim: 0.75, rimColor: "#d8ffb0", gloss: 0.35, shadow: "#1f7a4a", env: true }),
    loose.length * 3 + 2,
  );
  let li = 0;
  loose.forEach((center, k) => {
    for (let lobe = 0; lobe < 3; lobe++) {
      const a = (lobe / 3) * Math.PI * 2 + k;
      looseAntenna.setMatrixAt(
        li,
        m4.compose(center.clone().add(new THREE.Vector3(Math.sin(a) * 0.8, 0.12, Math.cos(a) * 0.8)), q.identity(), s.set(0.95, 1.12, 0.92)),
      );
      looseAntenna.setColorAt(li++, color.set(["#4ad875", "#3fcb6c", "#58e07c"][lobe]));
    }
  });
  // Cytochrome b6f dimer, which takes the electrons further.
  for (const dx of [-0.7, 0.7]) {
    looseAntenna.setMatrixAt(li, m4.compose(new THREE.Vector3(0.8 + dx, 0.15, -4.4), q.identity(), s.set(0.85, 1.35, 1.0)));
    looseAntenna.setColorAt(li++, color.set("#ff6fb1"));
  }
  env.add(looseAntenna);
  // Sunlight arriving from above, in soft shafts.
  const sun = kit.glow("#fff2a8", 16, { opacity: 0.4, env: true });
  sun.position.set(-11, 11, -6);
  env.add(sun);
  const shafts = lightShafts(kit, [
    { at: [-9, 10, -3], width: 2.2, length: 15, opacity: 0.16 },
    { at: [-5.5, 10, -3], width: 1.3, length: 13, opacity: 0.12 },
    { at: [-1.5, 10, -3], width: 2.8, length: 14, opacity: 0.1 },
    { at: [3, 10, -3], width: 1.6, length: 12, opacity: 0.09 },
  ]);
  env.add(shafts.group);

  /* ---------------- Animation ---------------- */
  const route = [ELECTRON_ROUTE.map((v) => toMonomer(0, v)), ELECTRON_ROUTE.map((v) => toMonomer(1, v))];
  const along = (points: THREE.Vector3[], t: number, target: THREE.Vector3) => {
    const x = THREE.MathUtils.clamp(t, 0, 1) * (points.length - 1);
    const i = Math.min(points.length - 2, Math.floor(x));
    return target.copy(points[i]).lerp(points[i + 1], x - i);
  };
  const setOpacity = (object: THREE.Sprite | THREE.Object3D, value: number) => {
    const material = (object as THREE.Mesh).material as THREE.Material & { opacity: number };
    material.opacity = value;
    object.visible = value > 0.003;
  };
  const tmp = new THREE.Vector3();
  const dirTmp = new THREE.Vector3();

  return {
    root,
    env,
    update({ time, immersion }) {
      placeWaters(time);
      const late = THREE.MathUtils.smoothstep(immersion, 0.6, 1);
      for (const material of lowerMaterials) material.uniforms.uOpacity.value = late;
      lower.visible = late > 0.004;
      shafts.update(time, immersion);
      let oxygenCount = 0;
      fx.forEach((f, k) => {
        const cycleTime = time + (k * PERIOD) / 2 + 0.6;
        const cycle = Math.floor(cycleTime / PERIOD);
        const t = cycleTime - cycle * PERIOD;
        const first = f.hops[0];
        // 1. The photon flies in.
        const flyEnd = 0.75;
        if (t < flyEnd) {
          const u = t / flyEnd;
          f.photon.position.copy(f.from).lerp(first, u * u * (3 - 2 * u) * 0.35 + u * 0.65);
          setOpacity(f.photon, Math.min(1, u * 4));
          dirTmp.copy(first).sub(f.from).normalize();
          f.wave.position.copy(f.photon.position);
          f.wave.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dirTmp);
          setOpacity(f.wave, Math.min(1, u * 4) * 0.9);
        } else {
          setOpacity(f.photon, 0);
          setOpacity(f.wave, 0);
        }
        // 2. The excitation hops from pigment to pigment.
        const hopTime = 0.17;
        const hopsEnd = flyEnd + (f.hops.length - 1) * hopTime;
        if (t >= flyEnd && t < hopsEnd) {
          const x = (t - flyEnd) / hopTime;
          const i = Math.floor(x);
          const u = Math.min(1, (x - i) / 0.55);
          f.exciton.position.copy(f.hops[i]).lerp(f.hops[i + 1], u * u * (3 - 2 * u));
          setOpacity(f.exciton, 1);
          f.exciton.scale.setScalar(0.9 + 0.5 * (1 - u));
        } else setOpacity(f.exciton, 0);
        // Flashes: absorption, then the reaction centre.
        const absorb = t - flyEnd;
        const charge = t - hopsEnd;
        if (absorb >= 0 && absorb < 0.3) {
          f.flash.position.copy(first);
          f.flash.scale.setScalar(1 + absorb * 4);
          setOpacity(f.flash, 0.9 * (1 - absorb / 0.3));
        } else if (charge >= 0 && charge < 0.45) {
          f.flash.position.copy(p680[f.k]);
          f.flash.scale.setScalar(1.2 + charge * 4);
          setOpacity(f.flash, 1 - charge / 0.45);
        } else setOpacity(f.flash, 0);
        // 3. An electron leaves the reaction centre.
        const electronTime = 1.1;
        if (charge >= 0 && charge < electronTime) {
          const u = charge / electronTime;
          along(route[f.k], u, f.electron.position);
          setOpacity(f.electron, u < 0.85 ? 1 : (1 - u) / 0.15);
        } else setOpacity(f.electron, 0);
        // 4. The Mn cluster refills P680 with an electron taken from water.
        const refill = charge - 0.25;
        if (refill >= 0 && refill < 0.35) {
          f.spark.position.copy(oec[f.k]).lerp(p680[f.k], refill / 0.35);
          setOpacity(f.spark, 1);
        } else setOpacity(f.spark, 0);
        // A proton is released into the lumen.
        const proton = charge - 0.4;
        const fp = fresh[k];
        if (proton >= 0 && proton < 1.6) {
          const u = proton / 1.6;
          fp.position.copy(oec[f.k]).add(tmp.set((k ? 0.6 : -0.6) * u, -1.2 * u, 0.5 * u));
          setOpacity(fp, Math.sin(u * Math.PI));
        } else setOpacity(fp, 0);
        // Every fourth photon, one O₂ leaves the cluster.
        const release = hopsEnd + 0.5;
        const sinceO2 = cycleTime - release - Math.floor((cycleTime - release) / (4 * PERIOD)) * 4 * PERIOD;
        const glow = oxygenGlow[k];
        if (sinceO2 >= 0 && sinceO2 < 3.2) {
          const u = sinceO2 / 3.2;
          const center = tmp.copy(oec[f.k]).add(new THREE.Vector3((k ? 1 : -1) * 0.8 * u, -0.35 - 2.4 * u, 0.4 + 1.6 * u));
          const spin = new THREE.Euler(0, 0, 0.5 + u * 3 + k);
          const axis = new THREE.Vector3(0.1, 0, 0).applyEuler(spin);
          const fade = Math.min(1, sinceO2 * 3) * (u < 0.8 ? 1 : (1 - u) / 0.2);
          const size = 0.14 * fade;
          oxygen.setMatrixAt(oxygenCount++, m4.compose(center.clone().add(axis), q.identity(), s.setScalar(size)));
          oxygen.setMatrixAt(oxygenCount++, m4.compose(center.clone().sub(axis), q.identity(), s.setScalar(size)));
          glow.position.copy(center);
          setOpacity(glow, 0.45 * fade);
        } else setOpacity(glow, 0);
      });
      oxygen.count = oxygenCount;
      oxygen.instanceMatrix.needsUpdate = true;
    },
  };
};

export default photosystem;
