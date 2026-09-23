/**
 * The Local Group (1 unit ≈ 1 million light-years): the Milky Way (child
 * level) and Andromeda, 2.5 million light-years apart, with the Triangulum
 * galaxy, the Magellanic Clouds and dozens of dwarf galaxies. Named members
 * sit at their real directions and distances from us. Each big galaxy is
 * wrapped in a faint glow standing for its much larger halo of dark matter.
 * Galaxies are drawn at their true size; only their glows are enlarged.
 */
import * as THREE from "three";
import { rng } from "../../../engine/kit";
import type { SceneBuilder } from "../types";
import { glow, mixColor, paintedDisc, randomDirection, stars } from "./fx";
import { distantGalaxies, spiralTexture } from "./galaxy";
import { inLocalGroup } from "./frames";

/** Dwarf galaxies: galactic longitude, latitude (°), distance (ly), relative brightness. */
const DWARFS: [number, number, number, number][] = [
  [5.6, -14.2, 65e3, 1], // Sagittarius dwarf
  [237.1, -65.7, 460e3, 1], // Fornax
  [287.5, -83.2, 290e3, 0.8], // Sculptor
  [86.4, 34.7, 260e3, 0.6], // Draco
  [105.0, 44.8, 200e3, 0.6], // Ursa Minor
  [260.1, -22.2, 330e3, 0.6], // Carina
  [243.5, 42.3, 290e3, 0.6], // Sextans
  [226.0, 49.1, 820e3, 0.8], // Leo I
  [220.2, 67.2, 690e3, 0.6], // Leo II
  [25.3, -18.4, 1.6e6, 1], // NGC 6822
  [129.8, -60.6, 2.4e6, 0.9], // IC 1613
  [75.9, -73.6, 3.0e6, 0.9], // WLM
  [119.0, -3.3, 2.2e6, 1], // IC 10
  [196.9, 52.4, 2.6e6, 0.7], // Leo A
  [94.8, -43.6, 3.0e6, 0.7], // Pegasus dwarf
  [272.2, -68.9, 1.4e6, 0.6], // Phoenix
  [322.9, -47.4, 2.9e6, 0.6], // Tucana
  [101.5, -72.9, 2.5e6, 0.6], // Cetus
  [34.0, -31.3, 3.2e6, 0.6], // Aquarius
  [21.1, -16.3, 3.4e6, 0.6], // Sagittarius dwarf irregular
  [262.1, 23.1, 4.3e6, 1], // NGC 3109
  [263.1, 22.3, 4.3e6, 0.5], // Antlia
  [246.2, 39.9, 4.6e6, 0.8], // Sextans A
  [233.2, 43.8, 4.4e6, 0.8], // Sextans B
];

/** Neighbouring groups beyond the Local Group (surroundings). */
const GROUPS: [number, number, number, number][] = [
  [142.1, 40.9, 11.7e6, 1.2], // M81 group
  [97.4, -88.0, 11.4e6, 1], // Sculptor group
  [309.5, 19.4, 12e6, 1.2], // Centaurus A group
  [135.9, -0.55, 9.8e6, 1], // Maffei group
  [138.2, 10.6, 10.7e6, 0.8], // IC 342
  [332.7, -75.7, 6.5e6, 0.7], // NGC 55
  [299.2, -79.4, 6.1e6, 0.7], // NGC 300
];

const localGroup: SceneBuilder = ({ kit, children }) => {
  const root = new THREE.Group();
  const env = new THREE.Group();
  const random = rng(2537);
  const mwChild = children.find((child) => child.id === "milky-way");
  const milkyWay = new THREE.Vector3(...(mwChild?.at ?? [1, 0.45, 0.07]));
  const andromeda = inLocalGroup(121.17, -21.57, 2.54e6);
  const triangulum = inLocalGroup(133.61, -31.33, 2.73e6);
  const lmc = inLocalGroup(280.47, -32.89, 163e3);
  const smc = inLocalGroup(302.8, -44.3, 203e3);

  /* ---------------- Dark matter halos ---------------- */
  const halos: THREE.Mesh[] = [];
  for (const [at, size, color] of [
    [milkyWay, 1.9, "#5f4cf0"],
    [andromeda, 2.3, "#7a4ff0"],
  ] as const) {
    const h = glow(kit, color, size, { opacity: 0.32, falloff: 1.3, fadePx: 1600 });
    h.position.copy(at);
    root.add(h);
    halos.push(h);
  }
  // The faint stellar halos: old stars and star clusters scattered around each spiral.
  const haloStars: number[] = [];
  const haloColors: number[] = [];
  const q = new THREE.Vector3();
  for (const [at, radius, count] of [
    [milkyWay, 0.5, 140],
    [andromeda, 0.65, 180],
  ] as const) {
    for (let i = 0; i < count; i++) {
      randomDirection(random, q).multiplyScalar(radius * Math.pow(random(), 1.6)).add(at);
      haloStars.push(q.x, q.y, q.z);
      mixColor(haloColors, "#ffd6a8", "#b8a8ff", random(), 0.5 + 0.5 * random());
    }
  }
  root.add(stars(kit, haloStars, { colors: haloColors, size: 0.009, soft: 0.6, opacity: 0.5, twinkle: 0.5, maxPx: 4, fadePx: 8 }));
  // A glow for the Milky Way itself, so it reads as the brightest thing here.
  const mwGlow = glow(kit, "#8fa8ff", 0.34, { opacity: 0.35, falloff: 2, fadePx: 400 });
  mwGlow.position.copy(milkyWay);
  root.add(mwGlow);

  /* ---------------- Andromeda (M31) ---------------- */
  const m31Texture = spiralTexture(kit, {
    size: kit.quality === "high" ? 1024 : 512,
    seed: 31,
    extent: 0.9,
    pitch: 9,
    arms: [
      { theta: 0.4, r0: 0.25, r1: 1, width: 0.07, color: "#8fb0ff", strength: 1.1, dust: 1 },
      { theta: 0.4 + Math.PI, r0: 0.25, r1: 1, width: 0.07, color: "#9ab4ff", strength: 1.1, dust: 1 },
    ],
    disc: { inner: "#ffb87a", outer: "#6f68e0", alpha: 0.5 },
    bulge: { radius: 0.24, color: "#ffb870", core: "#ffe8c0", stretch: 0.9 },
    ring: { radius: 0.62, width: 0.05, color: "#a8c0ff", strength: 1.2 },
    knots: { count: 60, color: "#ff6fb1" },
    stars: 700,
  });
  const m31 = new THREE.Group();
  m31.position.copy(andromeda);
  m31.rotation.set(0.95, 0.2, 0.55);
  const m31Disc = paintedDisc(kit, m31Texture, 0.085 / 0.9);
  // Andromeda's faint outer disc reaches well beyond its bright spiral.
  const outerTexture = kit.canvasTexture(256, 256, (g, w) => {
    const gradient = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    gradient.addColorStop(0, "rgba(255,226,190,0.3)");
    gradient.addColorStop(0.3, "rgba(190,190,255,0.2)");
    gradient.addColorStop(0.65, "rgba(150,140,255,0.1)");
    gradient.addColorStop(1, "rgba(140,120,255,0)");
    g.fillStyle = gradient;
    g.fillRect(0, 0, w, w);
  });
  m31.add(paintedDisc(kit, outerTexture, 0.26, { additive: true }), m31Disc);
  root.add(m31);
  const m31Glow = glow(kit, "#ffd6a0", 0.1, { opacity: 0.25, core: 0.15, falloff: 2, fadePx: 400 });
  const m31Wide = glow(kit, "#8fa8ff", 0.42, { opacity: 0.22, falloff: 2, fadePx: 600 });
  m31Wide.position.copy(andromeda);
  root.add(m31Wide);
  m31Glow.position.copy(andromeda);
  root.add(m31Glow);
  for (const [l, b, d, s] of [
    [121.15, -21.98, 2.49e6, 0.03], // M32
    [120.72, -21.14, 2.69e6, 0.04], // M110
  ]) {
    const g = glow(kit, "#ffe2b8", s, { opacity: 0.8, core: 0.4, falloff: 2, minPx: 5 });
    g.position.copy(inLocalGroup(l, b, d));
    root.add(g);
  }

  /* ---------------- Triangulum (M33) ---------------- */
  const m33Texture = spiralTexture(kit, {
    size: 512,
    seed: 33,
    extent: 0.9,
    pitch: 20,
    arms: [
      { theta: 1.2, r0: 0.12, r1: 0.95, width: 0.09, color: "#8fc4ff", strength: 1 },
      { theta: 1.2 + Math.PI, r0: 0.12, r1: 0.95, width: 0.09, color: "#9fb8ff", strength: 1 },
    ],
    disc: { inner: "#dfe0ff", outer: "#6f7dff", alpha: 0.6 },
    bulge: { radius: 0.12, color: "#ffd9a8", core: "#fff4e0" },
    knots: { count: 50, color: "#ff5fae" },
    flocculence: 60,
    stars: 300,
  });
  const m33 = new THREE.Group();
  m33.position.copy(triangulum);
  m33.rotation.set(0.7, 0, -0.4);
  const m33Disc = paintedDisc(kit, m33Texture, 0.032 / 0.9);
  m33.add(paintedDisc(kit, outerTexture, 0.08, { additive: true, opacity: 0.8 }), m33Disc);
  root.add(m33);
  const m33Glow = glow(kit, "#a8c4ff", 0.16, { opacity: 0.55, core: 0.2, falloff: 2, fadePx: 500 });
  m33Glow.position.copy(triangulum);
  root.add(m33Glow);

  /* ---------------- Magellanic Clouds ---------------- */
  for (const [at, size] of [
    [lmc, 0.05],
    [smc, 0.035],
  ] as const) {
    const g = glow(kit, "#c8d8ff", size, { opacity: 0.85, core: 0.35, falloff: 1.8, minPx: 6, fadePx: 400 });
    g.position.copy(at);
    root.add(g);
  }

  /* ---------------- Dwarf galaxies ---------------- */
  const dwarfs: number[] = [];
  const dwarfColors: number[] = [];
  const dwarfSizes: number[] = [];
  for (const [l, b, d, bright] of DWARFS) {
    const p = inLocalGroup(l, b, d);
    dwarfs.push(p.x, p.y, p.z);
    mixColor(dwarfColors, "#ffe2c2", "#c8d4ff", random(), 0.6 + 0.4 * bright);
    dwarfSizes.push(0.6 + bright * 0.6);
  }
  // Faint satellites crowd around both big spirals, circling slowly.
  const p = new THREE.Vector3();
  const swarms: THREE.Group[] = [];
  for (const [host, count, spread] of [
    [andromeda, 20, 0.45],
    [milkyWay, 14, 0.36],
  ] as const) {
    const swarm: number[] = [];
    const swarmColors: number[] = [];
    const swarmSizes: number[] = [];
    for (let i = 0; i < count; i++) {
      randomDirection(random, p).multiplyScalar(spread * (0.25 + Math.pow(random(), 0.7) * 0.75));
      swarm.push(p.x, p.y, p.z);
      mixColor(swarmColors, "#ffe2c2", "#c8d4ff", random(), 0.45 + 0.35 * random());
      swarmSizes.push(0.35 + random() * 0.5);
    }
    const group = new THREE.Group();
    group.position.copy(host);
    group.add(stars(kit, swarm, { colors: swarmColors, sizes: swarmSizes, size: 0.028, soft: 0.8, core: 0.6, opacity: 0.8, twinkle: 0.3, maxPx: 10, fadePx: 30 }));
    root.add(group);
    swarms.push(group);
  }
  root.add(stars(kit, dwarfs, { colors: dwarfColors, sizes: dwarfSizes, size: 0.03, soft: 0.8, core: 0.6, opacity: 0.95, twinkle: 0.3, maxPx: 14, fadePx: 30 }));

  /* ---------------- Light on its way from Andromeda ---------------- */
  const path = kit.line([andromeda, milkyWay], { color: "#ffe2b0", width: 1.6, opacity: 0.6, dashed: true, dashSize: 0.045, gapSize: 0.06 });
  root.add(path);

  /* ---------------- Surroundings: neighbouring groups and distant galaxies ---------------- */
  for (const [l, b, d, s] of GROUPS) {
    const at = inLocalGroup(l, b, d);
    const g = glow(kit, "#b8a8ff", 0.5 * s, { opacity: 0.5, core: 0.25, falloff: 2, env: true, fadePx: 500 });
    g.position.copy(at);
    env.add(g);
  }
  const far: number[] = [];
  const farColors: number[] = [];
  const farSizes: number[] = [];
  for (let i = 0; i < kit.count(900, 450); i++) {
    randomDirection(random, p).multiplyScalar(6 + random() * 9);
    far.push(p.x, p.y, p.z);
    mixColor(farColors, "#b9a8ff", "#ffe6c8", random(), 0.5 + 0.5 * random());
    farSizes.push(0.5 + Math.pow(random(), 3) * 1.5);
  }
  env.add(stars(kit, far, { colors: farColors, sizes: farSizes, size: 0.045, soft: 0.7, core: 0.4, opacity: 0.6, twinkle: 0.3, env: true, maxPx: 6, fadePx: 20 }));
  // Farther galaxies, beyond the Local Group.
  const tint = new THREE.Color();
  const beyond: { position: THREE.Vector3; size: number; tint: THREE.Color }[] = [];
  for (let tries = 0; beyond.length < kit.count(80, 45) && tries < 2000; tries++) {
    // Behind the Local Group and well away from its members, so none looks like a neighbour.
    p.set((random() * 2 - 1) * 12, (random() * 2 - 1) * 8, -4 - random() * 10);
    if (p.distanceTo(milkyWay) < 2 || p.distanceTo(andromeda) < 2) continue;
    tint.setHSL(0.6 + random() * 0.35, 0.45, 0.45 + random() * 0.25);
    beyond.push({ position: p.clone(), size: 0.05 + Math.pow(random(), 2) * 0.12, tint: tint.clone() });
  }
  env.add(distantGalaxies(kit, beyond, { env: true, opacity: 0.75, seed: 12 }));

  return {
    root,
    env,
    update({ time }) {
      m31Disc.rotation.y = -time * 0.03;
      swarms.forEach((swarm, k) => (swarm.rotation.y = time * (0.03 + k * 0.01)));
      m33Disc.rotation.y = -time * 0.05;
      (path.material as THREE.Material & { dashOffset: number }).dashOffset = -time * 0.06;
      halos.forEach((h, k) => {
        (h.material as THREE.ShaderMaterial).uniforms.uOpacity.value = 0.3 + 0.05 * Math.sin(time * 0.5 + k * 2);
      });
    },
  };
};

export default localGroup;
