/**
 * A pond in the park (1 unit = 60 cm, water surface at y = 0).
 * The lily pad carrying the child level "lily-pad" is drawn by that level:
 * this scene leaves a free spot at its anchor among the other pads.
 * Surroundings mirror the park around the pond (rocks, path, bushes, trees)
 * so the cross-fade from the park is seamless.
 */
import * as THREE from "three";
import { rng } from "../../../engine/kit";
import type { Kit } from "../../../engine/kit";
import { childrenOf } from "../../index";
import type { SceneBuilder } from "../types";
import { contactShadow, stylizedTree } from "../common/props";
import {
  PAD,
  emitRipple,
  padGeometry,
  padTexture,
  pondWaterMaterial,
  waterGlints,
  waterLily,
  type RippleSource,
} from "./shared";
import { padYaw, pondPads, shore, shoreFraction } from "./pondLayout";

/* ------------------------------------------------------------------ */
/* The park around the pond (mirrors park.ts so both scenes agree)     */
/* ------------------------------------------------------------------ */

const PARK_RATIO = 6 / 40;
const PARK_PATH = [
  [3.9, 3.1],
  [2.2, 2.2],
  [0.9, 0.6],
  [-0.2, -0.9],
  [-0.4, -2.4],
  [0.6, -4.4],
];
const PARK_TREES = [
  { x: -3.3, z: -2.4, h: 2.5, leaves: ["#2f9e55", "#43b863", "#27864a"], kind: "round" as const },
  { x: 3.4, z: 1.2, h: 1.7, leaves: ["#ff9f43", "#ffb44f", "#f47c3c"], kind: "round" as const },
  { x: -1.4, z: -4.0, h: 2.9, leaves: ["#1f8a5c", "#2aa56b", "#177049"], kind: "cone" as const },
  { x: 3.2, z: -2.6, h: 2.1, leaves: ["#3fb9a0", "#4fd3b3", "#2f9c88"], kind: "round" as const },
  { x: -4.1, z: 0.8, h: 1.5, leaves: ["#56c24e", "#6fd65f", "#3fa947"], kind: "round" as const },
];

/** Re-derive the park's deterministic layout (same seed and order as park.ts). */
function parkLayout(pondAt: [number, number, number]) {
  const children = childrenOf("park");
  const keepOut = children.map((child) => ({
    x: child.anchor?.at[0] ?? 0,
    z: child.anchor?.at[2] ?? 0,
    r: child.id === "tree" ? 0.75 : child.id === "pond" ? 1.05 : 0.45,
  }));
  const curve = new THREE.CatmullRomCurve3(PARK_PATH.map(([x, z]) => new THREE.Vector3(x, 0, z)));
  const pathPoints = curve.getSpacedPoints(80);
  const free = (x: number, z: number, margin = 0) => {
    if (Math.hypot(x, z) > 5 - 0.25) return false;
    for (const k of keepOut) if (Math.hypot(x - k.x, z - k.z) < k.r + margin) return false;
    for (const p of pathPoints) if (Math.hypot(x - p.x, z - p.z) < 0.32 + margin) return false;
    return true;
  };
  const random = rng(42);
  const trees = PARK_TREES.map((spec) => ({ ...spec, rotation: random() * Math.PI * 2 }));
  const bushes: { x: number; y: number; z: number; r: number; seed: number; material: number }[] = [];
  for (let i = 0; i < 16; i++) {
    const angle = random() * Math.PI * 2;
    const radius = 3.6 + random() * 1.1;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    if (!free(x, z, 0.2)) continue;
    const r = 0.18 + random() * 0.22;
    for (let j = 0; j < 3; j++) {
      const s = r * (1 - j * 0.2);
      bushes.push({
        x: x + (j - 1) * r * 0.7,
        y: r * 0.55 * (1 - j * 0.2),
        z: z + (random() - 0.5) * r,
        r: s,
        seed: i * 3 + j,
        material: (i + j) % 3,
      });
    }
  }
  const rocks: { x: number; y: number; z: number; s: number; seed: number }[] = [];
  for (let i = 0; i < 7; i++) {
    const angle = 0.6 + i * 0.5;
    const r = 1.0 + random() * 0.15;
    const s = 0.07 + random() * 0.08;
    rocks.push({ x: pondAt[0] + Math.cos(angle) * r, y: s * 0.4, z: pondAt[2] + Math.sin(angle) * r, s, seed: 30 + i });
  }
  return { trees, bushes, rocks, curve, pathPoints, free };
}

/* ------------------------------------------------------------------ */
/* Geometry builders                                                   */
/* ------------------------------------------------------------------ */

function waterGeometry(kit: Kit) {
  const rings = 20;
  const segments = 200;
  const positions: number[] = [0, 0, 0];
  const fractions: number[] = [0];
  const index: number[] = [];
  for (let j = 1; j <= rings; j++) {
    const f = j / rings;
    for (let i = 0; i < segments; i++) {
      const p = shore((i / segments) * Math.PI * 2, f);
      positions.push(p.x, 0, p.y);
      fractions.push(f);
    }
  }
  const at = (j: number, i: number) => (j === 0 ? 0 : 1 + (j - 1) * segments + (i % segments));
  for (let i = 0; i < segments; i++) index.push(0, at(1, i + 1), at(1, i));
  for (let j = 1; j < rings; j++)
    for (let i = 0; i < segments; i++) {
      const a = at(j, i);
      const b = at(j, i + 1);
      const c = at(j + 1, i);
      const d = at(j + 1, i + 1);
      index.push(a, b, c, b, d, c);
    }
  const geometry = kit.geometry(new THREE.BufferGeometry());
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("aF", new THREE.Float32BufferAttribute(fractions, 1));
  geometry.setIndex(index);
  return geometry;
}

/** The sandy rim and grassy lip around the water, fading out at its outer edge. */
function shoreGeometry(kit: Kit, groundY: number) {
  const columns = [0.985, 1.0, 1.03, 1.07, 1.12, 1.18, 1.26, 1.36];
  const heights = [-0.04, 0.0, 0.05, 0.09, 0.1, 0.06, 0.0, groundY];
  const segments = 200;
  const positions: number[] = [];
  const uvs: number[] = [];
  const index: number[] = [];
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    const wobble = 0.02 * Math.sin(a * 7 + 1.3) + 0.015 * Math.sin(a * 13 + 0.4);
    columns.forEach((f, k) => {
      const g = k > 0 && k < columns.length - 1 ? f + wobble * (k / columns.length) : f;
      const p = shore(a, g);
      positions.push(p.x, heights[k], p.y);
      uvs.push(k / (columns.length - 1), i / segments);
    });
  }
  const n = columns.length;
  for (let i = 0; i < segments; i++)
    for (let k = 0; k < n - 1; k++) {
      const a = i * n + k;
      const b = a + 1;
      const c = a + n;
      const d = c + 1;
      index.push(a, c, b, b, c, d);
    }
  const geometry = kit.geometry(new THREE.BufferGeometry());
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return geometry;
}

/** A slender, slightly curved blade of unit height (flat, double-sided). */
function bladeGeometry(kit: Kit) {
  const rows = 8;
  const positions: number[] = [];
  const index: number[] = [];
  for (let r = 0; r <= rows; r++) {
    const t = r / rows;
    const w = 0.06 * Math.pow(1 - t, 0.8) + 0.002;
    const bend = 0.16 * t * t;
    positions.push(bend - w / 2, t, 0, bend + w / 2, t, 0);
    if (r > 0) {
      const a = (r - 1) * 2;
      index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const geometry = kit.geometry(new THREE.BufferGeometry());
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return geometry;
}

/* ------------------------------------------------------------------ */
/* Scene                                                               */
/* ------------------------------------------------------------------ */

const pond: SceneBuilder = ({ kit, level, children }) => {
  const root = new THREE.Group();
  const env = new THREE.Group();
  const random = rng(606);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();
  const color = new THREE.Color();

  const padChild = children.find((child) => child.id === "lily-pad");
  const padAt = new THREE.Vector3(...(padChild?.at ?? [1.9, 0, 1.4]));
  /** Room left for the child level's own pad and flower. */
  const padClear = (padChild?.radius ?? 0.25) * 1.2;
  const pondAnchor = (level.anchor?.at ?? [-1.9, 0.02, -0.9]) as [number, number, number];
  /** Park ground height in pond units (the water sits a little above it). */
  const groundY = -pondAnchor[1] / PARK_RATIO;
  const toPond = (x: number, y: number, z: number) =>
    new THREE.Vector3((x - pondAnchor[0]) / PARK_RATIO, (y - pondAnchor[1]) / PARK_RATIO, (z - pondAnchor[2]) / PARK_RATIO);

  /* Pond skater: moves in a small loop near the front-left; its strokes make ripples. */
  const skaterCenter = new THREE.Vector2(-1.7, 1.55);
  const skaterPath = (t: number) =>
    new THREE.Vector2(skaterCenter.x + Math.cos(t) * 0.75, skaterCenter.y + Math.sin(t) * 0.38);

  /* Water. */
  const ripples: RippleSource[] = [
    { x: padAt.x - 0.05, z: padAt.z + 0.05, period: 5.5, radius: 1.1 },
    { x: -1.3, z: -1.1, period: 6.5, radius: 1.3 },
    { x: 2.6, z: -1.8, period: 7.5, radius: 1.0 },
    { x: -3.6, z: -1.2, period: 4.8, radius: 0.8 },
    { x: 0.4, z: 0.3, period: 9, radius: 1.8 },
    // Two slots reused by the pond skater's strokes.
    { x: skaterCenter.x, z: skaterCenter.y, period: 2.4, radius: 0.9 },
    { x: skaterCenter.x, z: skaterCenter.y, period: 2.4, radius: 0.9 },
  ];
  const waterMaterial = pondWaterMaterial(kit, { ripples, rippleWidth: 0.07 });
  const water = new THREE.Mesh(waterGeometry(kit), waterMaterial);
  root.add(water);

  /* Sandy rim and grassy lip (fades into the park lawn). */
  const shoreTexture = kit.canvasTexture(256, 8, (g, w, h) => {
    const gradient = g.createLinearGradient(0, 0, w, 0);
    gradient.addColorStop(0, "rgba(150, 150, 120, 1)");
    gradient.addColorStop(0.1, "rgba(214, 186, 130, 1)");
    gradient.addColorStop(0.3, "rgba(242, 216, 160, 1)");
    gradient.addColorStop(0.44, "rgba(238, 212, 155, 1)");
    gradient.addColorStop(0.5, "rgba(112, 206, 96, 1)");
    gradient.addColorStop(0.62, "rgba(92, 198, 88, 1)");
    gradient.addColorStop(0.8, "rgba(88, 194, 86, 0.6)");
    gradient.addColorStop(1, "rgba(84, 190, 84, 0)");
    g.fillStyle = gradient;
    g.fillRect(0, 0, w, h);
  });
  const rim = new THREE.Mesh(
    shoreGeometry(kit, groundY),
    kit.textured(shoreTexture, { rim: 0, gloss: 0, soft: 0.5, transparent: true }),
  );
  root.add(rim);

  /* Pebbles on the sand. */
  const pebbleCount = kit.count(60, 36);
  const pebbles = new THREE.InstancedMesh(
    kit.blob(1, { detail: 1, noise: 0.2, seed: 4 }),
    kit.toon("#ffffff", { rim: 0.3, gloss: 0.15 }),
    pebbleCount,
  );
  const pebbleColors = ["#c8c3e0", "#a7a3c7", "#e9d8b8", "#b9a88f", "#d9d3f0"];
  for (let i = 0; i < pebbleCount; i++) {
    const a = random() * Math.PI * 2;
    const f = 1.02 + random() * 0.1;
    const at = shore(a, f);
    const r = 0.05 + random() * 0.08;
    e.set(0, random() * 6, 0);
    pebbles.setMatrixAt(
      i,
      m.compose(p.set(at.x, 0.05 + r * 0.2, at.y), q.setFromEuler(e), s.set(r * 1.3, r * 0.6, r)),
    );
    pebbles.setColorAt(i, color.set(pebbleColors[i % pebbleColors.length]));
  }
  root.add(pebbles);

  /* Reeds and cattails, in clumps on the far and right banks. */
  interface Stalk {
    x: number;
    z: number;
    h: number;
    yaw: number;
    lean: number;
    phase: number;
    kind: "blade" | "cattail";
  }
  const stalks: Stalk[] = [];
  const clumps = [
    { a0: 3.55, a1: 4.35, blades: 34, cattails: 9 },
    { a0: 5.75, a1: 6.55, blades: 22, cattails: 6 },
    { a0: 2.55, a1: 2.85, blades: 10, cattails: 2 },
  ];
  for (const clump of clumps) {
    const total = clump.blades + clump.cattails;
    for (let i = 0; i < total; i++) {
      const a = clump.a0 + random() * (clump.a1 - clump.a0);
      const edge = Math.min(1, Math.sin(((a - clump.a0) / (clump.a1 - clump.a0)) * Math.PI) * 1.6);
      const f = 0.9 + random() * 0.14;
      const at = shore(a, f);
      const cattail = i < clump.cattails;
      stalks.push({
        x: at.x,
        z: at.y,
        h: (cattail ? 2.7 + random() * 0.6 : 1.3 + random() * 1.3) * (0.55 + 0.45 * edge),
        yaw: random() * Math.PI * 2,
        lean: (random() - 0.5) * 0.25,
        phase: random() * Math.PI * 2,
        kind: cattail ? "cattail" : "blade",
      });
    }
  }
  const blades = stalks.filter((stalk) => stalk.kind === "blade");
  const cattails = stalks.filter((stalk) => stalk.kind === "cattail");
  const bladeMesh = new THREE.InstancedMesh(
    bladeGeometry(kit),
    kit.toon("#ffffff", { rim: 0.25, soft: 0.4, side: THREE.DoubleSide }),
    blades.length,
  );
  const bladeColors = ["#3fae4a", "#58c957", "#2f9446", "#7bd35a", "#4bbf6a"];
  blades.forEach((_, i) => bladeMesh.setColorAt(i, color.set(bladeColors[i % bladeColors.length])));
  root.add(bladeMesh);
  const stemGeometry = kit.geometry(new THREE.CylinderGeometry(0.6, 1, 1, 6));
  stemGeometry.translate(0, 0.5, 0);
  const stems = new THREE.InstancedMesh(stemGeometry, kit.toon("#4aa34a", { rim: 0.25 }), cattails.length * 2);
  const heads = new THREE.InstancedMesh(
    kit.geometry(new THREE.CapsuleGeometry(1, 5.5, 4, 10)),
    kit.toon("#8c4f2b", { rim: 0.3, rimColor: "#d9925f", gloss: 0.15, shadow: "#4a2340" }),
    cattails.length,
  );
  root.add(stems, heads);
  const up = new THREE.Vector3(0, 1, 0);
  const tip = new THREE.Vector3();
  const updateReeds = (time: number) => {
    blades.forEach((b, i) => {
      const sway = Math.sin(time * 1.1 + b.phase + b.x * 0.3) * 0.05;
      e.set(b.lean + sway, b.yaw, sway * 0.6, "YXZ");
      q.setFromEuler(e);
      bladeMesh.setMatrixAt(i, m.compose(p.set(b.x, -0.05, b.z), q, s.set(b.h * 0.9, b.h, b.h)));
    });
    bladeMesh.instanceMatrix.needsUpdate = true;
    cattails.forEach((c, i) => {
      const sway = Math.sin(time * 0.9 + c.phase + c.x * 0.3) * 0.035;
      e.set(c.lean * 0.4 + sway, 0, sway * 0.7, "XYZ");
      q.setFromEuler(e);
      stems.setMatrixAt(i, m.compose(p.set(c.x, -0.05, c.z), q, s.set(0.022, c.h, 0.022)));
      tip.copy(up).applyQuaternion(q).multiplyScalar(c.h * 0.8).add(p);
      heads.setMatrixAt(i, m.compose(tip, q, s.set(0.06, 0.06, 0.06)));
      tip.copy(up).applyQuaternion(q).multiplyScalar(c.h * 0.97).add(p);
      stems.setMatrixAt(cattails.length + i, m.compose(tip, q, s.set(0.008, c.h * 0.12, 0.008)));
    });
    stems.instanceMatrix.needsUpdate = true;
    heads.instanceMatrix.needsUpdate = true;
  };
  updateReeds(0);

  /* Lily pads in floating colonies, leaving room for the child "lily-pad" (pad and flower). */
  const pads = pondPads(padAt, padClear);
  const padTex = padTexture(kit);
  const padGeo = padGeometry(kit);
  const padMesh = new THREE.InstancedMesh(padGeo, kit.textured(padTex, { rim: 0.15, gloss: 0.25, soft: 0.35 }), pads.length);
  const padEdge = new THREE.InstancedMesh(padGeo, kit.toon(PAD.under, { rim: 0.2 }), pads.length);
  const padTints = ["#ffffff", "#e8ffe0", "#d4f5c8", "#f4ffe8"];
  pads.forEach((_, i) => padMesh.setColorAt(i, color.set(padTints[i % padTints.length])));
  root.add(padEdge, padMesh);
  const updatePads = (time: number) => {
    pads.forEach((pad, i) => {
      q.setFromAxisAngle(up, padYaw(pad, time));
      padMesh.setMatrixAt(i, m.compose(p.set(pad.x, 0.022, pad.z), q, s.set(pad.r, 1, pad.r)));
      padEdge.setMatrixAt(i, m.compose(p.set(pad.x, 0.012, pad.z), q, s.set(pad.r * 1.035, 1, pad.r * 1.035)));
    });
    padMesh.instanceMatrix.needsUpdate = true;
    padEdge.instanceMatrix.needsUpdate = true;
  };
  updatePads(0);

  /* A pink water lily and a bud in the far colony. */
  const flowerAt = new THREE.Vector3(-0.85, 0.02, -1.05);
  const flower = waterLily(kit, { size: 0.32, seed: 9 });
  flower.position.copy(flowerAt);
  root.add(flower);
  const bud = new THREE.Mesh(kit.blob(1, { detail: 2, noise: 0.05, seed: 3 }), kit.toon("#ff7fbd", { rim: 0.4, gloss: 0.3 }));
  bud.scale.set(0.045, 0.075, 0.045);
  bud.position.set(padAt.x + 0.75, 0.06, padAt.z - 0.55);
  root.add(bud);

  /* Surface glints. */
  const glints = waterGlints(
    kit,
    [
      { x: -2.4, z: -2.6, length: 0.9 },
      { x: 0.8, z: -2.9, length: 1.2 },
      { x: 2.9, z: -2.2, length: 0.6 },
      { x: -3.1, z: -0.9, length: 0.5 },
      { x: 0.2, z: -1.7, length: 0.7 },
      { x: 1.4, z: -0.2, length: 0.5 },
      { x: -0.4, z: 0.9, length: 0.6 },
      { x: 3.4, z: 0.1, length: 0.45 },
      { x: -2.2, z: 2.3, length: 0.55 },
      { x: 0.3, z: 2.5, length: 0.4 },
    ].filter((g) => shoreFraction(g.x, g.z) < 0.85),
    { width: 0.07, opacity: 0.55 },
  );
  root.add(glints.mesh);

  /* Submerged waterweed in the shallows, seen through the surface. */
  const weeds: { x: number; z: number; yaw: number; size: number }[] = [];
  for (let tries = 0; weeds.length < 44 && tries < 2000; tries++) {
    const a = random() * Math.PI * 2;
    const at = shore(a, 0.74 + random() * 0.18);
    if (pads.some((pad) => Math.hypot(at.x - pad.x, at.y - pad.z) < pad.r + 0.15)) continue;
    if (Math.hypot(at.x - padAt.x, at.y - padAt.z) < 0.5) continue;
    // Fronds point roughly towards the middle, like weed bending into deeper water.
    weeds.push({ x: at.x, z: at.y, yaw: Math.atan2(at.y, -at.x) + (random() - 0.5) * 0.9, size: 0.45 + random() * 0.5 });
  }
  const weedGeometry = bladeGeometry(kit).clone();
  weedGeometry.rotateX(-Math.PI / 2);
  kit.geometry(weedGeometry);
  const weedMesh = new THREE.InstancedMesh(
    weedGeometry,
    kit.flat("#ffffff", { opacity: 0.32, depthWrite: false, side: THREE.DoubleSide }),
    weeds.length,
  );
  const weedColors = ["#1f8f86", "#2aa38a", "#197a86"];
  weeds.forEach((weed, i) => {
    q.setFromAxisAngle(up, weed.yaw);
    weedMesh.setMatrixAt(i, m.compose(p.set(weed.x, 0.003, weed.z), q, s.set(weed.size * 3, weed.size, weed.size)));
    weedMesh.setColorAt(i, color.set(weedColors[i % weedColors.length]));
  });
  weedMesh.renderOrder = 1;
  root.add(weedMesh);

  /* Twinkling sparkles on the water. */
  const sparklePositions: number[] = [];
  for (let tries = 0; sparklePositions.length < kit.count(70, 40) * 3 && tries < 2000; tries++) {
    const x = (random() * 2 - 1) * 5;
    const z = (random() * 2 - 1) * 4.5;
    if (shoreFraction(x, z) > 0.9) continue;
    sparklePositions.push(x, 0.03, z);
  }
  const sparkles = kit.points(sparklePositions, { size: 0.09, color: "#ffffff", twinkle: 0.95, soft: 0.6, opacity: 0.9 });
  root.add(sparkles);

  /* Two fish gliding under the surface. */
  const fishShape = new THREE.Shape();
  fishShape.moveTo(0.5, 0);
  fishShape.bezierCurveTo(0.42, 0.2, 0.05, 0.22, -0.2, 0.06);
  fishShape.lineTo(-0.48, 0.2);
  fishShape.quadraticCurveTo(-0.42, 0, -0.48, -0.2);
  fishShape.lineTo(-0.2, -0.06);
  fishShape.bezierCurveTo(0.05, -0.22, 0.42, -0.2, 0.5, 0);
  const fishGeometry = kit.geometry(new THREE.ShapeGeometry(fishShape, 10));
  fishGeometry.rotateX(-Math.PI / 2);
  const fishes = [
    { color: "#ff7f3a", size: 0.42, rx: 1.6, rz: 0.9, cx: 0.3, cz: -0.4, speed: 0.22, phase: 0 },
    { color: "#ffa03a", size: 0.32, rx: 1.1, rz: 0.7, cx: -0.4, cz: 0.1, speed: -0.3, phase: 2.2 },
  ];
  const fishMesh = new THREE.InstancedMesh(fishGeometry, kit.flat("#ffffff", { opacity: 0.8, depthWrite: false }), fishes.length);
  fishes.forEach((fish, i) => fishMesh.setColorAt(i, color.set(fish.color)));
  fishMesh.renderOrder = 1;
  root.add(fishMesh);

  /* Dragonfly: hovers, then darts to the next spot. */
  const dragonfly = new THREE.Group();
  const bodyMaterial = kit.toon("#2fb6ff", { rim: 0.45, rimColor: "#b8f0ff", gloss: 0.35 });
  const abdomen = new THREE.Mesh(kit.geometry(new THREE.CapsuleGeometry(0.016, 0.3, 4, 8)), bodyMaterial);
  abdomen.rotation.z = Math.PI / 2;
  abdomen.position.x = -0.19;
  const thorax = new THREE.Mesh(kit.geometry(new THREE.SphereGeometry(0.035, 12, 10)), kit.toon("#1fc8b8", { rim: 0.4 }));
  thorax.scale.set(1.3, 1, 1);
  const eyes = new THREE.Mesh(kit.geometry(new THREE.SphereGeometry(0.03, 12, 10)), kit.toon("#3ff2b5", { rim: 0.5, gloss: 0.5 }));
  eyes.scale.set(0.9, 0.9, 1.5);
  eyes.position.x = 0.055;
  dragonfly.add(abdomen, thorax, eyes);
  const wingShape = kit.geometry(new THREE.CircleGeometry(1, 18));
  wingShape.rotateX(-Math.PI / 2);
  wingShape.translate(0, 0, 1);
  wingShape.scale(0.035, 1, 0.19);
  const wingMaterial = kit.toon("#e8fbff", { opacity: 0.6, rim: 0.6, rimColor: "#9ff6ff", gloss: 0.5, side: THREE.DoubleSide, depthWrite: false });
  const wingMesh = new THREE.InstancedMesh(wingShape, wingMaterial, 4);
  const wings: { at: THREE.Vector3; yaw: number; side: number; front: boolean }[] = [];
  for (const front of [true, false])
    for (const side of [-1, 1])
      wings.push({
        at: new THREE.Vector3(front ? 0.02 : -0.03, 0.02, 0),
        yaw: (side < 0 ? Math.PI : 0) + side * (front ? -0.12 : 0.18),
        side,
        front,
      });
  const wingEuler = new THREE.Euler();
  const poseWings = (flap: number) => {
    wings.forEach((wing, i) => {
      wingEuler.set(wing.side * (0.15 + 0.35 * (wing.front ? flap : -flap)), wing.yaw, 0, "XYZ");
      wingMesh.setMatrixAt(i, m.compose(wing.at, q.setFromEuler(wingEuler), s.set(1, 1, 1)));
    });
    wingMesh.instanceMatrix.needsUpdate = true;
  };
  poseWings(0);
  dragonfly.add(wingMesh);
  dragonfly.scale.setScalar(1.4);
  root.add(dragonfly);
  const dragonflyStops = [
    new THREE.Vector3(0.9, 1.3, 0.2),
    new THREE.Vector3(-1.9, 1.1, -0.6),
    new THREE.Vector3(-0.4, 1.6, 1.3),
    new THREE.Vector3(2.4, 1.2, -1.2),
  ];
  const dragonflyAt = (time: number) => {
    const cycle = 3.2;
    const k = Math.floor(time / cycle);
    const t = time / cycle - k;
    const a = dragonflyStops[((k % 4) + 4) % 4];
    const b = dragonflyStops[(((k + 1) % 4) + 4) % 4];
    const move = t < 0.6 ? 0 : THREE.MathUtils.smootherstep(t, 0.6, 1);
    const position = a.clone().lerp(b, move);
    position.y += Math.sin(time * 2.3) * 0.04;
    const heading = Math.atan2(-(b.z - a.z), b.x - a.x);
    return { position, heading, darting: move > 0 && move < 1 };
  };
  let dragonflyHeading = 0;

  /* Pond skater: a slim body on six legs, dimpling the surface. */
  const skater = new THREE.Group();
  const skaterMaterial = kit.toon("#3b2f5a", { rim: 0.4, rimColor: "#9d8cff" });
  const skaterBody = new THREE.Mesh(kit.geometry(new THREE.CapsuleGeometry(0.018, 0.08, 4, 8)), skaterMaterial);
  skaterBody.rotation.z = Math.PI / 2;
  skaterBody.position.y = 0.04;
  skater.add(skaterBody);
  const legGeometry = kit.geometry(new THREE.CylinderGeometry(0.004, 0.004, 1, 4));
  legGeometry.translate(0, 0.5, 0);
  const legSpecs = [
    { x: 0.05, a: 0.5, l: 0.07 },
    { x: 0.0, a: 1.35, l: 0.2 },
    { x: -0.03, a: 2.4, l: 0.17 },
  ];
  const legs = new THREE.InstancedMesh(legGeometry, skaterMaterial, 6);
  const dimples = new THREE.InstancedMesh(
    kit.geometry(new THREE.CircleGeometry(1, 16).rotateX(-Math.PI / 2)),
    kit.flat("#dff8ff", { opacity: 0.8, depthWrite: false }),
    4,
  );
  let legIndex = 0;
  let dimpleIndex = 0;
  const foot = new THREE.Vector3();
  for (const spec of legSpecs)
    for (const side of [-1, 1]) {
      const dir = new THREE.Vector3(Math.cos(spec.a), 0, side * Math.sin(spec.a));
      foot.copy(dir).multiplyScalar(spec.l).add(new THREE.Vector3(spec.x, 0.004, 0));
      const hip = new THREE.Vector3(spec.x, 0.04, 0);
      const d = foot.clone().sub(hip);
      q.setFromUnitVectors(up, d.clone().normalize());
      legs.setMatrixAt(legIndex++, m.compose(hip, q, s.set(1, d.length(), 1)));
      if (spec.l > 0.1) dimples.setMatrixAt(dimpleIndex++, m.compose(foot.clone().setY(0.006), q.identity(), s.set(0.018, 1, 0.018)));
    }
  skater.add(legs, dimples);
  skater.scale.setScalar(1.6);
  root.add(skater);
  let lastStroke = -1;

  /* ---------------- Surroundings: the park around the pond. ---------------- */
  const layout = parkLayout(pondAnchor);

  // Lawn with painterly colour patches, fading out at its edge.
  const lawnTexture = kit.canvasTexture(512, 512, (g, w, h) => {
    const cx = w / 2;
    const cy = h / 2;
    g.fillStyle = "#58c457";
    g.fillRect(0, 0, w, h);
    const patches = rng(12);
    for (let i = 0; i < 90; i++) {
      g.fillStyle = patches() > 0.5 ? "rgba(111, 214, 95, 0.55)" : "rgba(70, 184, 79, 0.55)";
      g.beginPath();
      g.ellipse(patches() * w, patches() * h, 20 + patches() * 50, 12 + patches() * 30, patches() * 3, 0, Math.PI * 2);
      g.fill();
    }
    const fade = g.createRadialGradient(cx, cy, w * 0.3, cx, cy, w / 2);
    fade.addColorStop(0, "rgba(0,0,0,1)");
    fade.addColorStop(1, "rgba(0,0,0,0)");
    g.globalCompositeOperation = "destination-in";
    g.fillStyle = fade;
    g.fillRect(0, 0, w, h);
  });
  const lawn = new THREE.Mesh(
    kit.geometry(new THREE.CircleGeometry(19, 72)),
    kit.textured(lawnTexture, { env: true, rim: 0, gloss: 0, soft: 0.5, depthWrite: false }),
  );
  lawn.rotation.x = -Math.PI / 2;
  lawn.position.y = groundY - 0.01;
  lawn.renderOrder = -2;
  env.add(lawn);

  // The park path passing on the right.
  const pathShape: number[] = [];
  const pathIndex: number[] = [];
  const tangent = new THREE.Vector3();
  layout.pathPoints.forEach((point, i) => {
    layout.curve.getTangent(i / (layout.pathPoints.length - 1), tangent);
    const side = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
    const width = 0.26 + 0.04 * Math.sin(i * 0.5);
    const a = toPond(point.x + side.x * width, 0.006, point.z + side.z * width);
    const b = toPond(point.x - side.x * width, 0.006, point.z - side.z * width);
    pathShape.push(a.x, a.y, a.z, b.x, b.y, b.z);
    if (i > 0) {
      const k = (i - 1) * 2;
      pathIndex.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
    }
  });
  const pathGeometry = kit.geometry(new THREE.BufferGeometry());
  pathGeometry.setAttribute("position", new THREE.Float32BufferAttribute(pathShape, 3));
  pathGeometry.setIndex(pathIndex);
  pathGeometry.computeVertexNormals();
  const path = new THREE.Mesh(
    pathGeometry,
    kit.toon("#f4dcaa", { rim: 0, gloss: 0, side: THREE.DoubleSide, env: true, depthWrite: false }),
  );
  path.renderOrder = -1;
  env.add(path);

  // Rocks, bushes and trees exactly where the park puts them.
  const near = (v: THREE.Vector3, r = 17) => Math.hypot(v.x, v.z) < r;
  const rockMaterial = kit.toon("#b3afd3", { rim: 0.35, rimColor: "#e6e2ff", shadow: "#7d77aa", gloss: 0.12, env: true });
  for (const rock of layout.rocks) {
    const at = toPond(rock.x, rock.y, rock.z);
    const mesh = new THREE.Mesh(kit.blob(1, { detail: 3, noise: 0.18, seed: rock.seed }), rockMaterial);
    mesh.scale.set((rock.s * 1.3) / PARK_RATIO, (rock.s * 0.8) / PARK_RATIO, rock.s / PARK_RATIO);
    mesh.position.copy(at);
    env.add(mesh);
  }
  const bushMaterials = ["#3fae4a", "#58c957", "#2e9a50"].map((c) => kit.toon(c, { rim: 0.35, env: true }));
  for (const bush of layout.bushes) {
    const at = toPond(bush.x, bush.y, bush.z);
    if (!near(at, 20)) continue;
    const mesh = new THREE.Mesh(kit.blob(1, { detail: 2, noise: 0.1, seed: bush.seed }), bushMaterials[bush.material]);
    mesh.scale.setScalar(bush.r / PARK_RATIO);
    mesh.position.copy(at);
    env.add(mesh);
  }
  layout.trees.forEach((spec, k) => {
    const at = toPond(spec.x, 0, spec.z);
    // Only trees close to the water: taller ones would hide the view.
    if (!near(at, 11)) return;
    const tree = stylizedTree(kit, { height: spec.h, seed: k * 13 + 5, leaves: spec.leaves, kind: spec.kind, env: true });
    tree.scale.setScalar(1 / PARK_RATIO);
    tree.position.copy(at);
    tree.rotation.y = spec.rotation;
    env.add(tree);
    const shadow = contactShadow(kit, (spec.h * 0.32) / PARK_RATIO, { opacity: 0.22, env: true });
    shadow.position.copy(toPond(spec.x + 0.1, 0.01, spec.z + 0.1));
    env.add(shadow);
  });

  // Grass tufts (three curved blades each) and little flowers, kept off the shore.
  const tuftCount = kit.count(110, 50);
  const tufts = new THREE.InstancedMesh(
    bladeGeometry(kit),
    kit.toon("#ffffff", { rim: 0.2, soft: 0.4, side: THREE.DoubleSide, env: true }),
    tuftCount * 3,
  );
  const tuftColors = ["#3fae4a", "#4fc45a", "#34a04a"];
  const flowerCount = kit.count(70, 32);
  const flowers = new THREE.InstancedMesh(
    kit.geometry(new THREE.IcosahedronGeometry(0.13, 1)),
    kit.toon("#ffffff", { rim: 0.2, gloss: 0.3, env: true }),
    flowerCount,
  );
  const flowerColors = ["#ff6fb1", "#ffd23f", "#ffffff", "#c9b3ff", "#ff5e6c"];
  const clear = (x: number, z: number) => {
    if (shoreFraction(x, z) < 1.42) return false;
    const parkX = pondAnchor[0] + x * PARK_RATIO;
    const parkZ = pondAnchor[2] + z * PARK_RATIO;
    for (const point of layout.pathPoints) if (Math.hypot(parkX - point.x, parkZ - point.z) < 0.34) return false;
    return Math.hypot(parkX, parkZ) < 4.9;
  };
  let placed = 0;
  for (let tries = 0; placed < tuftCount * 3 && tries < 3000; tries++) {
    const x = (random() * 2 - 1) * 15;
    const z = (random() * 2 - 1) * 15;
    if (!clear(x, z) || Math.hypot(x, z) > 15) continue;
    const size = 0.35 + random() * 0.35;
    const yaw = random() * 6;
    for (let k = 0; k < 3; k++) {
      e.set(-0.25 + k * 0.25, yaw + k * 2.1, 0, "YXZ");
      tufts.setMatrixAt(placed, m.compose(p.set(x, groundY, z), q.setFromEuler(e), s.set(size * 2.2, size * (1 - k * 0.15), size)));
      tufts.setColorAt(placed++, color.set(tuftColors[k]));
    }
  }
  tufts.count = placed;
  placed = 0;
  for (let tries = 0; placed < flowerCount && tries < 3000; tries++) {
    const x = (random() * 2 - 1) * 15;
    const z = (random() * 2 - 1) * 15;
    if (!clear(x, z) || Math.hypot(x, z) > 15) continue;
    flowers.setMatrixAt(placed, m.compose(p.set(x, groundY + 0.35, z), q.identity(), s.setScalar(0.7 + random() * 0.7)));
    flowers.setColorAt(placed++, color.set(flowerColors[Math.floor(random() * flowerColors.length)]));
  }
  flowers.count = placed;
  env.add(tufts, flowers);

  return {
    root,
    env,
    update({ time }) {
      updateReeds(time);
      updatePads(time);
      glints.update(time);
      flower.rotation.y = Math.sin(time * 0.4) * 0.08;
      bud.rotation.z = Math.sin(time * 0.8) * 0.05;

      fishes.forEach((fish, i) => {
        const t = time * fish.speed + fish.phase;
        const x = fish.cx + Math.cos(t) * fish.rx;
        const z = fish.cz + Math.sin(t * 2) * fish.rz * 0.5 + Math.sin(t) * fish.rz * 0.5;
        const dx = -Math.sin(t) * fish.rx * fish.speed;
        const dz = (Math.cos(t * 2) * fish.rz + Math.cos(t) * fish.rz * 0.5) * fish.speed;
        e.set(0, Math.atan2(-dz, dx) + Math.sin(time * 5 + fish.phase) * 0.12, 0);
        fishMesh.setMatrixAt(i, m.compose(p.set(x, 0.006, z), q.setFromEuler(e), s.setScalar(fish.size)));
      });
      fishMesh.instanceMatrix.needsUpdate = true;

      const fly = dragonflyAt(time);
      dragonfly.position.copy(fly.position);
      let turn = fly.heading - dragonflyHeading;
      turn = Math.atan2(Math.sin(turn), Math.cos(turn));
      dragonflyHeading += turn * Math.min(1, 0.08 + (fly.darting ? 0.2 : 0.04));
      if (time < 0.05) dragonflyHeading = fly.heading;
      dragonfly.rotation.set(0, dragonflyHeading, Math.sin(time * 1.7) * 0.05);
      const flap = Math.sin(time * 38);
      poseWings(flap);

      // Pond skater: a stroke every 1.2 s, gliding in between.
      const strokeTime = Math.floor(time / 1.2) * 1.2;
      const glide = strokeTime + (1 - Math.exp(-(time - strokeTime) * 3.5)) * 0.8;
      const angle = glide * 0.28;
      const at = skaterPath(angle);
      const ahead = skaterPath(angle + 0.05);
      skater.position.set(at.x, 0, at.y);
      skater.rotation.y = Math.atan2(-(ahead.y - at.y), ahead.x - at.x);
      if (strokeTime !== lastStroke) {
        lastStroke = strokeTime;
        emitRipple(waterMaterial, 5 + (Math.round(strokeTime / 1.2) % 2), at.x, at.y, strokeTime);
      }
    },
  };
};

export default pond;
