/**
 * Laniakea (1 unit ≈ 52 million light-years), drawn like the famous flow map
 * of Tully et al. (2014): galaxies stream along curved lines towards the Great
 * Attractor, inside a glowing basin boundary. Clusters sit at their real
 * galactic directions and distances from us; the flow lines are a simplified
 * illustration of the measured velocity field, not a reconstruction of it.
 * The Local Group (child level) sits on the outskirts, near the Virgo cluster.
 */
import * as THREE from "three";
import { rng } from "../../../engine/kit";
import type { SceneBuilder } from "../types";
import { emissive, gauss, glow, magnification, mixColor, randomDirection, segments, stars } from "./fx";
import { buildWeb, scatterWeb } from "./web";
import { inLaniakea } from "./frames";

/** The basin: a noisy ellipsoid around the Great Attractor. */
export const BASIN = {
  centre: new THREE.Vector3(0, -0.1, -0.3),
  radius: 4.3,
  stretch: new THREE.Vector3(1.1, 0.8, 1.05),
};

interface Attractor {
  at: THREE.Vector3;
  mass: number;
  soft: number;
  galaxies: number;
  spread: number;
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

const laniakea: SceneBuilder = ({ kit, children, level }) => {
  const root = new THREE.Group();
  const env = new THREE.Group();
  const random = rng(1407);
  const density = kit.count(1, 0.5);
  const lg = children.find((child) => child.id === "local-group");
  const us = new THREE.Vector3(...(lg?.at ?? [-3, -0.9, 0.65]));

  /* ---------------- Real clusters (l, b, distance) ---------------- */
  const cluster = (l: number, b: number, ly: number, mass: number, soft: number, galaxies: number, spread: number): Attractor => ({
    at: inLaniakea(l, b, ly),
    mass,
    soft,
    galaxies,
    spread,
  });
  const GA = cluster(315, 5, 200e6, 1, 0.55, 500, 0.3);
  const attractors: Attractor[] = [
    GA,
    cluster(325.3, -7.3, 220e6, 0.35, 0.3, 450, 0.16), // Norma
    cluster(302.4, 21.6, 170e6, 0.35, 0.3, 420, 0.15), // Centaurus
    cluster(269.6, 26.5, 160e6, 0.12, 0.28, 260, 0.12), // Hydra
    cluster(273, 19, 132e6, 0.08, 0.25, 160, 0.1), // Antlia
    cluster(283.8, 74.5, 54e6, 0.16, 0.22, 380, 0.11), // Virgo
    cluster(332, -24, 190e6, 0.15, 0.3, 280, 0.16), // Pavo–Indus
    cluster(236.7, -53.6, 62e6, 0.04, 0.2, 140, 0.07), // Fornax
  ];
  const inside = (p: THREE.Vector3, margin = 1) => {
    const x = (p.x - BASIN.centre.x) / BASIN.stretch.x;
    const y = (p.y - BASIN.centre.y) / BASIN.stretch.y;
    const z = (p.z - BASIN.centre.z) / BASIN.stretch.z;
    return Math.sqrt(x * x + y * y + z * z) < BASIN.radius * margin;
  };

  /* ---------------- The flow: a river network draining to the Great Attractor ---------------- */
  // Each branch is a polyline flowing towards its junction with a parent branch,
  // and ultimately towards the Great Attractor (tributaries joining rivers).
  interface Branch {
    points: THREE.Vector3[];
    parent: number;
    junction: number;
    upstream: number[];
    main: boolean;
  }
  const branches: Branch[] = [];
  const network: { branch: number; index: number }[] = [];
  const addBranch = (points: THREE.Vector3[], parent: number, junction: number, main = false) => {
    const index = branches.length;
    branches.push({ points, parent, junction, upstream: points.map(() => 1), main });
    points.forEach((_, i) => network.push({ branch: index, index: i }));
    return index;
  };
  const wiggle = (from: THREE.Vector3, to: THREE.Vector3, amount: number, step = 0.12) => {
    const d = from.distanceTo(to);
    const n = Math.max(3, Math.round(d / step));
    const side = randomDirection(random, new THREE.Vector3()).multiplyScalar(amount * d);
    const out: THREE.Vector3[] = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      out.push(from.clone().lerp(to, t).addScaledVector(side, Math.sin(Math.PI * t)));
    }
    return out;
  };
  const chain = (waypoints: THREE.Vector3[]) => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i + 1 < waypoints.length; i++) {
      const piece = wiggle(waypoints[i], waypoints[i + 1], 0.07);
      if (i > 0) piece.shift();
      pts.push(...piece);
    }
    return new THREE.CatmullRomCurve3(pts).getSpacedPoints(Math.max(8, Math.round(pts.length)));
  };
  const edgePoint = (direction: THREE.Vector3) =>
    direction.clone().normalize().multiply(BASIN.stretch).multiplyScalar(BASIN.radius * 0.93).add(BASIN.centre);
  const [, norma, centaurus, hydra, antlia, virgo, pavo, fornax] = attractors.map((a) => a.at);
  // Main rivers, from the basin edge down to the Great Attractor.
  addBranch(chain([edgePoint(us.clone().sub(BASIN.centre)), us, virgo, antlia, hydra, centaurus, GA.at]), -1, 0, true);
  addBranch(chain([edgePoint(new THREE.Vector3(0.6, -0.5, -1)), pavo, norma, GA.at]), -1, 0, true);
  const attach = (points: THREE.Vector3[], main = false) => {
    const tip = points[points.length - 1];
    let best = -1;
    let bestScore = Infinity;
    const tipToGA = tip.distanceTo(GA.at);
    const toGA = GA.at.clone().sub(tip).normalize();
    const d = new THREE.Vector3();
    network.forEach((node, k) => {
      const p = branches[node.branch].points[node.index];
      if (p.distanceTo(GA.at) > tipToGA - 0.2) return;
      d.copy(p).sub(tip);
      const length = d.length();
      const cos = d.dot(toGA) / Math.max(length, 1e-6);
      const score = length * (1 + 1.4 * (1 - cos));
      if (score < bestScore) (bestScore = score), (best = k);
    });
    if (best < 0) return -1;
    const { branch, index } = network[best];
    const target = branches[branch].points[index];
    const next = branches[branch].points[Math.min(index + 1, branches[branch].points.length - 1)];
    const tangent = next.clone().sub(target).normalize();
    const length = tip.distanceTo(target);
    const curve = new THREE.CubicBezierCurve3(
      tip.clone(),
      tip.clone().addScaledVector(toGA, 0.35 * length),
      target.clone().addScaledVector(tangent, -0.45 * length),
      target.clone(),
    );
    const joined = [...points.slice(0, -1), ...curve.getSpacedPoints(Math.max(4, Math.round(length / 0.08)))];
    return addBranch(joined, branch, index, main);
  };
  attach(chain([edgePoint(new THREE.Vector3(0.2, 1, 0.3)), centaurus.clone().add(new THREE.Vector3(0.4, 1.2, 0.2))]), true);
  attach(chain([edgePoint(new THREE.Vector3(1, 0.1, 0.6)), GA.at.clone().add(new THREE.Vector3(1.6, 0.1, 0.9))]), true);
  attach(chain([edgePoint(new THREE.Vector3(-0.6, -1, 0.2)), fornax]), true);
  attach(chain([edgePoint(new THREE.Vector3(0.3, 0.6, -1)), GA.at.clone().add(new THREE.Vector3(0.2, 1.2, -1.1))]), true);
  // Tributaries, nearest first so that outer ones join inner ones.
  const tips: THREE.Vector3[] = [];
  const v = new THREE.Vector3();
  const seed = new THREE.Vector3();
  for (let k = 0; k < kit.count(170, 110); k++) {
    randomDirection(random, seed)
      .multiply(BASIN.stretch)
      .multiplyScalar(BASIN.radius * (0.35 + 0.6 * Math.sqrt(random())))
      .add(BASIN.centre);
    if (seed.distanceTo(GA.at) > 0.9) tips.push(seed.clone());
  }
  tips
    .map((tip) => ({ tip, key: tip.distanceTo(GA.at) + random() * 0.8 }))
    .sort((a, b) => a.key - b.key)
    .forEach(({ tip }) => attach([tip]));
  // Flow accumulates downstream: propagate each branch's discharge into its parent.
  for (let k = branches.length - 1; k >= 0; k--) {
    const b = branches[k];
    for (let i = 1; i < b.points.length; i++) b.upstream[i] = Math.max(b.upstream[i], b.upstream[i - 1]);
    if (b.parent < 0) continue;
    const parent = branches[b.parent];
    const total = b.upstream[b.points.length - 1];
    for (let i = b.junction; i < parent.points.length; i++) parent.upstream[i] += total;
  }
  for (let k = 0; k < branches.length; k++) {
    const b = branches[k];
    for (let i = 1; i < b.points.length; i++) b.upstream[i] = Math.max(b.upstream[i], b.upstream[i - 1]);
  }

  const linePositions: number[] = [];
  const lineColors: number[] = [];
  const riverPositions: number[] = [];
  const riverColors: number[] = [];
  const haze: number[] = [];
  const hazeColors: number[] = [];
  const flowFrom: number[] = [];
  const flowTo: number[] = [];
  const flowColors: number[] = [];
  const flowSizes: number[] = [];
  const flowSpeeds: number[] = [];
  const galaxies: number[] = [];
  const galaxyColors: number[] = [];
  const galaxySizes: number[] = [];
  const localGalaxies: number[] = [];
  const localColors: number[] = [];
  const localSizes: number[] = [];
  const warmth = (p: THREE.Vector3) => Math.max(0, 1 - p.distanceTo(GA.at) / 3.2);
  const shade = (p: THREE.Vector3, target: number[], intensity: number) => {
    const t = warmth(p);
    if (t < 0.5) mixColor(target, "#5a78ff", "#8fe4ff", t / 0.5, intensity);
    else mixColor(target, "#8fe4ff", "#ffe29a", (t - 0.5) / 0.5, intensity);
  };
  for (const b of branches) {
    const n = b.points.length;
    const strength = (i: number) => Math.min(1.2, 0.3 + 0.16 * Math.sqrt(b.upstream[i]) + (b.main ? 0.2 : 0));
    const fade = (j: number) => Math.min(1, (j + 1) / 6);
    for (let i = 0; i + 1 < n; i++) {
      const p = b.points[i];
      const q = b.points[i + 1];
      linePositions.push(p.x, p.y, p.z, q.x, q.y, q.z);
      shade(p, lineColors, strength(i) * fade(i));
      shade(q, lineColors, strength(i + 1) * fade(i + 1));
      const big = Math.sqrt(b.upstream[i]);
      if (big > 3) {
        riverPositions.push(p.x, p.y, p.z, q.x, q.y, q.z);
        const k = Math.min(1, (big - 3) / 5);
        shade(p, riverColors, k * fade(i));
        shade(q, riverColors, k * fade(i + 1));
        if (i % 2 === 0) {
          haze.push(p.x, p.y, p.z);
          shade(p, hazeColors, 0.4 + 0.6 * k);
        }
      }
    }
    // Galaxies riding the flow, more of them where rivers are big.
    for (let i = 0; i + 3 < n; i++) {
      const riders = Math.min(3, 0.25 + 0.12 * Math.sqrt(b.upstream[i]) + (b.main ? 0.3 : 0)) * density;
      for (let r = 0; r < riders * 2; r++) {
        if (random() > riders / Math.ceil(riders * 2)) continue;
        const p = b.points[i];
        const q = b.points[i + 3];
        const s = 0.035;
        const ox = gauss(random) * s;
        const oy = gauss(random) * s;
        const oz = gauss(random) * s;
        flowFrom.push(p.x + ox, p.y + oy, p.z + oz);
        flowTo.push(q.x + ox, q.y + oy, q.z + oz);
        shade(p, flowColors, 1.1);
        flowSizes.push(0.7 + random() * 0.8);
        flowSpeeds.push(0.28 + random() * 0.18);
      }
    }
    // Galaxies gathered along the flow (filaments).
    for (let i = 0; i < n; i++) {
      if (random() > (0.35 + 0.1 * Math.sqrt(b.upstream[i])) * density) continue;
      const p = b.points[i];
      const s = 0.04 + 0.08 * random();
      galaxies.push(p.x + gauss(random) * s, p.y + gauss(random) * s, p.z + gauss(random) * s);
      mixColor(galaxyColors, "#b9a8ff", "#ffffff", random(), 0.8);
      galaxySizes.push(0.5 + Math.pow(random(), 3) * 1.4);
    }
  }
  for (const a of attractors) {
    const count = Math.round(a.galaxies * density);
    for (let i = 0; i < count; i++) {
      randomDirection(random, v).multiplyScalar(a.spread * 1.4 * Math.pow(random(), 0.7)).add(a.at);
      galaxies.push(v.x, v.y, v.z);
      mixColor(galaxyColors, "#ff9ad5", "#ffe0f0", random(), 0.55);
      galaxySizes.push(0.5 + random() * 1.1);
    }
  }
  // Our own neighbourhood: the flattened Local Sheet and nearby galaxy groups,
  // so that diving towards the Local Group means flying through galaxies.
  const sheetNormal = new THREE.Vector3(0.1, 1, 0.35).normalize();
  const sheetU = new THREE.Vector3().crossVectors(sheetNormal, new THREE.Vector3(1, 0, 0)).normalize();
  const sheetV = new THREE.Vector3().crossVectors(sheetNormal, sheetU);
  for (let i = 0; i < 900 * density; i++) {
    const r = 0.08 + Math.pow(random(), 0.7) * 0.75;
    const a = random() * Math.PI * 2;
    v.copy(us)
      .addScaledVector(sheetU, Math.cos(a) * r)
      .addScaledVector(sheetV, Math.sin(a) * r)
      .addScaledVector(sheetNormal, gauss(random) * 0.05);
    localGalaxies.push(v.x, v.y, v.z);
    mixColor(localColors, "#c8d0ff", "#fff0e0", random(), 0.6 + 0.4 * random());
    localSizes.push(0.5 + Math.pow(random(), 3) * 1.2);
  }
  for (const [l, b, d, n] of [
    [142.1, 40.9, 11.7e6, 30], // M81 group
    [309.5, 19.4, 12e6, 30], // Centaurus A group
    [97.4, -88.0, 11.4e6, 20], // Sculptor group
    [135.9, -0.55, 9.8e6, 16], // Maffei group
    [102.0, 59.8, 21e6, 18], // M101 group
    [104.8, 68.6, 28e6, 18], // M51 group
    [314.6, 32.0, 15e6, 16], // M83
  ] as const) {
    const at = inLaniakea(l, b, d);
    for (let i = 0; i < n * density; i++) {
      randomDirection(random, v).multiplyScalar(0.035 * Math.pow(random(), 0.6)).add(at);
      localGalaxies.push(v.x, v.y, v.z);
      mixColor(localColors, "#ffd6ec", "#ffffff", random(), 0.9);
      localSizes.push(0.6 + random() * 1.2);
    }
  }

  // A scattering of field galaxies in the basin.
  for (let i = 0; i < 2200 * density; i++) {
    randomDirection(random, v).multiply(BASIN.stretch).multiplyScalar(BASIN.radius * Math.cbrt(random())).add(BASIN.centre);
    galaxies.push(v.x, v.y, v.z);
    mixColor(galaxyColors, "#8f7bff", "#c9b3ff", random(), 0.55);
    galaxySizes.push(0.4 + random() * 0.8);
  }

  const localField = stars(kit, localGalaxies, {
    colors: localColors,
    sizes: localSizes,
    size: 0.016,
    soft: 0.5,
    core: 0.4,
    opacity: 0.85,
    twinkle: 0.25,
    maxPx: 6,
    fadePx: 9,
  });
  root.add(localField);

  const streamlines = segments(kit, linePositions, { colors: lineColors, width: 1.5, opacity: 0.6, additive: true });
  const rivers = segments(kit, riverPositions, { colors: riverColors, width: 3.4, opacity: 0.6, additive: true });
  const riverGlow = stars(kit, haze, { colors: hazeColors, size: 0.34, soft: 1, opacity: 0.22, maxPx: 70, fadePx: 70 });
  const flow = stars(kit, flowFrom, {
    targets: flowTo,
    speeds: flowSpeeds,
    colors: flowColors,
    sizes: flowSizes,
    size: 0.05,
    soft: 0.4,
    core: 0.5,
    opacity: 0.95,
    maxPx: 9,
    fadePx: 12,
    depthDim: 0.5,
  });
  const field = stars(kit, galaxies, {
    colors: galaxyColors,
    sizes: galaxySizes,
    size: 0.04,
    soft: 0.45,
    opacity: 0.7,
    twinkle: 0.2,
    maxPx: 8,
    fadePx: 12,
    depthDim: 0.5,
  });
  root.add(riverGlow, streamlines, rivers, field, flow);

  /* ---------------- Clusters and the Great Attractor ---------------- */
  const glows: THREE.Mesh[] = [];
  attractors.forEach((a, k) => {
    const g = glow(kit, k === 0 ? "#ffb86b" : "#ff7fc8", k === 0 ? 2.4 : 0.3 + a.mass * 1.1, {
      opacity: k === 0 ? 0.5 : 0.4,
      core: k === 0 ? 0.1 : 0.05,
      falloff: 2,
      fadePx: 500,
      pulse: 0.12,
      phase: k * 1.7,
    });
    g.position.copy(a.at);
    root.add(g);
    glows.push(g);
  });
  const gaCore = glow(kit, "#ffe9b8", 0.6, { opacity: 0.7, core: 0.5, falloff: 2.4, fadePx: 400, pulse: 0.2 });
  gaCore.position.copy(GA.at);
  root.add(gaCore);

  // "You are here": a soft beacon at the Local Group.
  const beacon = glow(kit, "#bff4ff", 0.5, { opacity: 0.6, core: 0.6, falloff: 2.4, maxPx: 70, fadePx: 90, pulse: 0.3 });
  beacon.position.copy(us);
  root.add(beacon);

  /* ---------------- The basin boundary ---------------- */
  const shellGeometry = kit.blob(BASIN.radius, {
    detail: 5,
    noise: 0.17,
    frequency: 1.35,
    seed: 7,
    stretch: [BASIN.stretch.x, BASIN.stretch.y, BASIN.stretch.z],
  });
  const shell = new THREE.Mesh(shellGeometry, emissive(kit.halo("#ff9a6c", { opacity: 0.8, power: 4.5 })));
  shell.position.copy(BASIN.centre);
  const fill = new THREE.Mesh(shellGeometry, emissive(kit.halo("#5b34e0", { opacity: 0.2, power: 1.2, inner: 1 })));
  fill.position.copy(BASIN.centre);
  root.add(fill, shell);

  /* ---------------- Surroundings: the cosmic web beyond ---------------- */
  // Neighbouring superclusters (Perseus–Pisces, Coma, Shapley) are heavier
  // nodes of the web; their galaxies drain towards other attractors.
  const neighbours = [inLaniakea(150, -13, 250e6), inLaniakea(58, 88, 320e6), inLaniakea(312, 31, 650e6)];
  const beyond = buildWeb(random, {
    radius: 0,
    box: new THREE.Vector3(15, 9, 11),
    spacing: 2.1,
    link: 3.6,
    maxLinks: 3,
    tries: 900,
    seeds: neighbours,
    avoid: (p) => inside(p, 1.25),
  });
  const cloud = scatterWeb(random, beyond, {
    perUnit: 70 * density,
    thickness: 0.16,
    bend: 0.1,
    nodeCount: 70 * density,
    nodeSpread: 0.25,
    colors: ["#5a48d6", "#9a6cff"],
    nodeColors: ["#d77fd0", "#f0c6ff"],
    intensity: 0.75,
    skip: (p) => inside(p, 1.08),
  });
  env.add(
    stars(kit, cloud.positions, {
      colors: cloud.colors,
      sizes: cloud.sizes,
      size: 0.055,
      soft: 0.55,
      opacity: 0.4,
      twinkle: 0.25,
      env: true,
      maxPx: 9,
      fadePx: 12,
      depthDim: 0.6,
      depthRange: 10,
    }),
  );
  neighbours.forEach((at, k) => {
    const g = glow(kit, "#d38bff", [1.6, 1.2, 3.2][k], { opacity: 0.35, falloff: 2, env: true, fadePx: 600 });
    g.position.copy(at);
    env.add(g);
  });

  return {
    root,
    env,
    update({ time }) {
      (shell.material as THREE.ShaderMaterial).uniforms.uOpacity.value = 0.75 + 0.1 * Math.sin(time * 0.5);
      // Constant-width flow lines turn into wires when magnified: let them go.
      const zoom = magnification(root, level.frame);
      const keep = 1 - smooth(2.5, 9, zoom);
      (streamlines.material as THREE.Material & { opacity: number }).opacity = 0.6 * keep;
      (rivers.material as THREE.Material & { opacity: number }).opacity = 0.6 * keep;
    },
  };
};

export default laniakea;
