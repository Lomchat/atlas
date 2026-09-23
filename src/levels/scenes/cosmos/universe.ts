/**
 * The observable Universe (1 unit ≈ 9.3 billion light-years): a bubble of the
 * cosmic web, galaxy clusters strung along glowing filaments around empty
 * voids, wrapped in the warm speckled glow of the oldest light (the cosmic
 * microwave background). The web is drawn far coarser than it really is, so
 * that it can be seen at all. Laniakea (and us) sits at the very centre, inside
 * a finer local web that takes over as you dive.
 */
import * as THREE from "three";
import { fbm3, rng } from "../../../engine/kit";
import type { SceneBuilder } from "../types";
import { gauss, glow, mixColor, randomDirection, stars, emissive } from "./fx";
import { buildWeb } from "./web";

const RADIUS = 5;

/** Landmarks referenced by hotspots (see data/cosmos.ts). */
const CLUSTER = new THREE.Vector3(-2.3, 1.55, 2.1);
const VOID = new THREE.Vector3(1.75, -1.3, 2.3);

const FILAMENT = ["#4fb6ff", "#6f7dff", "#9a5cff", "#d65cff", "#ff5fae"];

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

const universe: SceneBuilder = ({ kit }) => {
  const root = new THREE.Group();
  const env = new THREE.Group();
  const random = rng(20260923);

  /* ---------------- The large-scale web ---------------- */
  const web = buildWeb(random, {
    radius: 4.75,
    spacing: 1.3,
    link: 2.15,
    maxLinks: 3,
    tries: 3000,
    seeds: [CLUSTER],
    avoid: (p) => p.distanceTo(VOID) < 1.05 || p.length() < 0.75,
  });
  // The central node: us.
  web.nodes.push(new THREE.Vector3(0, 0, 0));
  web.weights.push(1.1);
  const centre = web.nodes.length - 1;
  web.nodes
    .map((n, j) => ({ j, d: n.length() }))
    .filter((e) => e.j !== centre)
    .sort((a, b) => a.d - b.d)
    .slice(0, 5)
    .forEach(({ j }) => web.edges.push([centre, j]));

  const positions: number[] = [];
  const colors: number[] = [];
  const sizes: number[] = [];
  const flowFrom: number[] = [];
  const flowTo: number[] = [];
  const flowColors: number[] = [];
  const flowSizes: number[] = [];
  const flowSpeeds: number[] = [];
  const haze: number[] = [];
  const hazeColors: number[] = [];
  const hazeSizes: number[] = [];
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const q = new THREE.Vector3();
  const tint = (p: THREE.Vector3) => {
    const n = 0.5 + 0.5 * Math.tanh(2.2 * fbm3(p.x * 0.3 + 3.1, p.y * 0.3, p.z * 0.3 - 1.7, 3, 5));
    const k = Math.min(FILAMENT.length - 1.001, n * (FILAMENT.length - 1));
    const i = Math.floor(k);
    return { from: FILAMENT[i], to: FILAMENT[i + 1], t: k - i };
  };
  const bezier = (t: number, target: THREE.Vector3) =>
    target
      .copy(a)
      .multiplyScalar((1 - t) * (1 - t))
      .addScaledVector(c, 2 * t * (1 - t))
      .addScaledVector(b, t * t);

  const density = kit.count(1, 0.5);
  for (const [i, j] of web.edges) {
    a.copy(web.nodes[i]);
    b.copy(web.nodes[j]);
    const length = a.distanceTo(b);
    c.copy(a).add(b).multiplyScalar(0.5);
    c.x += gauss(random) * 0.07 * length;
    c.y += gauss(random) * 0.07 * length;
    c.z += gauss(random) * 0.07 * length;
    // A few bright, thick filaments; many faint, thin ones. The farthest
    // structure is dimmer: we see it younger, before it had fully grown.
    const major = random() < 0.3;
    const strength = (major ? 0.9 + 0.5 * random() : 0.2 + 0.35 * random()) * (0.5 + 0.5 * Math.min(web.weights[i], web.weights[j]));
    const young = 1 - 0.65 * smooth(2.8, 4.8, Math.max(a.length(), b.length()));
    const count = Math.round(length * (major ? 150 : 70) * density);
    for (let k = 0; k < count; k++) {
      const u = random();
      const t = 0.5 - 0.5 * Math.cos(Math.PI * u);
      bezier(t, q);
      const spread = (major ? 0.03 : 0.018) + (major ? 0.06 : 0.03) * Math.sin(Math.PI * t) * random();
      q.x += gauss(random) * spread;
      q.y += gauss(random) * spread;
      q.z += gauss(random) * spread;
      if (q.distanceTo(VOID) < 0.85) continue;
      positions.push(q.x, q.y, q.z);
      const { from, to, t: mix } = tint(q);
      mixColor(colors, from, to, mix, (0.45 + 0.55 * random()) * strength * young);
      sizes.push(0.35 + Math.pow(random(), 4) * 1.6);
      if (k % 4 === 0) {
        haze.push(q.x, q.y, q.z);
        mixColor(hazeColors, from, to, mix, strength * young);
        hazeSizes.push(0.7 + random() * 0.8);
      }
    }
    // Galaxies drifting along the filament into its denser end.
    const flows = Math.round(length * 22 * density);
    const toEnd = web.weights[j] >= web.weights[i];
    for (let k = 0; k < flows; k++) {
      const t0 = random() * 0.8;
      const t1 = toEnd ? Math.min(1, t0 + 0.2) : Math.max(0, t0 - 0.2);
      bezier(t0, q);
      const s = 0.03 * gauss(random);
      flowFrom.push(q.x + s, q.y + s * 0.6, q.z - s * 0.4);
      bezier(t1, q);
      flowTo.push(q.x + s * 0.5, q.y + s * 0.3, q.z - s * 0.2);
      const { from, to, t: mix } = tint(q);
      mixColor(flowColors, from, "#ffffff", 0.35 + mix * 0.2);
      flowSizes.push(0.7 + random() * 0.7);
      flowSpeeds.push(0.035 + random() * 0.04);
      void to;
    }
  }

  // Galaxy clusters: dense knots where filaments meet.
  const nodeGlow: number[] = [];
  const nodeColors: number[] = [];
  const nodeSizes: number[] = [];
  web.nodes.forEach((node, i) => {
    const w = web.weights[i];
    const count = Math.round((30 + w * 70) * density);
    const sigma = 0.05 + w * 0.05;
    for (let k = 0; k < count; k++) {
      positions.push(node.x + gauss(random) * sigma, node.y + gauss(random) * sigma, node.z + gauss(random) * sigma);
      mixColor(colors, "#ff9ad5", "#ffe6f4", random(), 0.8);
      sizes.push(0.4 + random() * 0.9);
    }
    if (i === centre) return;
    nodeGlow.push(node.x, node.y, node.z);
    mixColor(nodeColors, "#ff8fcf", "#b3a0ff", random());
    nodeSizes.push(0.45 + w * w * 1.1);
  });

  const filaments = stars(kit, positions, {
    colors,
    sizes,
    size: 0.045,
    soft: 0.65,
    opacity: 0.42,
    maxPx: 10,
    fadePx: 14,
    depthDim: 0.75,
    depthRange: 5,
  });
  const flow = stars(kit, flowFrom, {
    targets: flowTo,
    speeds: flowSpeeds,
    colors: flowColors,
    sizes: flowSizes,
    size: 0.055,
    soft: 0.5,
    core: 0.4,
    opacity: 0.7,
    maxPx: 10,
    fadePx: 14,
    depthDim: 0.7,
  });
  const clusters = stars(kit, nodeGlow, {
    colors: nodeColors,
    sizes: nodeSizes,
    size: 0.36,
    soft: 1,
    core: 0.2,
    opacity: 0.45,
    twinkle: 0.25,
    maxPx: 60,
    fadePx: 60,
    depthDim: 0.8,
  });
  const glowHaze = stars(kit, haze, {
    colors: hazeColors,
    sizes: hazeSizes,
    size: 0.28,
    soft: 1,
    opacity: 0.12,
    maxPx: 40,
    fadePx: 40,
    depthDim: 0.8,
  });
  root.add(glowHaze, filaments, flow, clusters);

  /* ---------------- The local web around us ---------------- */
  // Finer structure near the centre, visible as you dive towards Laniakea.
  const local = buildWeb(random, {
    radius: 0.95,
    spacing: 0.07,
    link: 0.15,
    maxLinks: 3,
    tries: kit.count(4200, 2200),
  });
  const localPositions: number[] = [];
  const localColors: number[] = [];
  const localSizes: number[] = [];
  for (const [i, j] of local.edges) {
    a.copy(local.nodes[i]);
    b.copy(local.nodes[j]);
    const r = Math.max(a.length(), b.length());
    const fall = Math.exp(-(r / 0.42) * (r / 0.42));
    if (random() > fall + 0.04) continue;
    c.copy(a).add(b).multiplyScalar(0.5);
    c.x += gauss(random) * 0.012;
    c.y += gauss(random) * 0.012;
    c.z += gauss(random) * 0.012;
    const count = Math.round((8 + 20 * fall) * density);
    for (let k = 0; k < count; k++) {
      bezier(random(), q);
      q.x += gauss(random) * 0.003;
      q.y += gauss(random) * 0.003;
      q.z += gauss(random) * 0.003;
      localPositions.push(q.x, q.y, q.z);
      const pick = random();
      mixColor(localColors, pick < 0.5 ? "#8fb0ff" : "#c08bff", "#ffc2e6", random() * 0.6, 0.6 + 0.4 * fall);
      localSizes.push(0.5 + random() * 1.1);
    }
  }
  const localWeb = stars(kit, localPositions, {
    colors: localColors,
    sizes: localSizes,
    size: 0.0055,
    soft: 0.5,
    opacity: 0.9,
    maxPx: 5,
    fadePx: 7,
  });
  root.add(localWeb);
  const home = glow(kit, "#8f6bff", 1.3, { opacity: 0.35, falloff: 2.2, maxPx: 900, fadePx: 700 });
  const beacon = glow(kit, "#ffe6f7", 0.2, { opacity: 0.6, core: 0.7, falloff: 2.6, maxPx: 60, fadePx: 90, pulse: 0.25 });
  root.add(home, beacon);

  /* ---------------- The oldest light at the edge ---------------- */
  const shell: number[] = [];
  const shellColors: number[] = [];
  const shellSizes: number[] = [];
  const shellCount = kit.count(16000, 8000);
  for (let k = 0; k < shellCount; k++) {
    randomDirection(random, q);
    const n = fbm3(q.x * 2.2 + 11, q.y * 2.2, q.z * 2.2, 4, 3);
    const hot = 0.5 + 0.5 * Math.tanh(n * 3);
    q.multiplyScalar(RADIUS * (1 + random() * 0.012));
    shell.push(q.x, q.y, q.z);
    mixColor(shellColors, "#ff6f7d", hot > 0.5 ? "#ffe2a0" : "#ff9a4a", hot, 0.75 + 0.25 * hot);
    shellSizes.push(0.5 + random() * 1.1);
  }
  const cmb = stars(kit, shell, {
    colors: shellColors,
    sizes: shellSizes,
    size: 0.042,
    soft: 0.6,
    opacity: 0.75,
    twinkle: 0.4,
    maxPx: 12,
    fadePx: 16,
    rim: 4.5,
  });
  root.add(cmb);
  const sphere = kit.geometry(new THREE.SphereGeometry(RADIUS * 1.01, 64, 48));
  const rim = new THREE.Mesh(sphere, emissive(kit.halo("#ff7a5c", { opacity: 1, power: 4.5 })));
  const inner = new THREE.Mesh(sphere, emissive(kit.halo("#3a2380", { opacity: 0.3, power: 1.2, inner: 1 })));
  inner.scale.setScalar(0.98);
  const outer = glow(kit, "#ff6f8a", RADIUS * 2.5, { opacity: 0.16, falloff: 3, fadePx: 2500 });
  root.add(outer, inner, rim);

  /* ---------------- Surroundings: a faint starry beyond ---------------- */
  // Nothing observable lies beyond the bubble; only a whisper of warm haze.
  env.add(glow(kit, "#2a1760", 26, { opacity: 0.5, falloff: 1.2, env: true }));

  return {
    root,
    env,
    update({ time }) {
      (rim.material as THREE.ShaderMaterial).uniforms.uOpacity.value = 0.65 + 0.08 * Math.sin(time * 0.6);
      (inner.material as THREE.ShaderMaterial).uniforms.uOpacity.value = 0.28 + 0.05 * Math.sin(time * 0.4 + 1);
    },
  };
};

export default universe;
