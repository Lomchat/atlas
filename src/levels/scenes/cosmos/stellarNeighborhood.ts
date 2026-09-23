/**
 * Our stellar neighbourhood (1 unit ≈ 2 light-years): the Sun and the real
 * stars within about 12 light-years, at their measured directions and
 * distances. The galactic plane is horizontal (XZ), galactic north is up;
 * thin lines drop from each star to the plane, like a 3D star map, and rings
 * mark 5 and 10 light-years. Colours follow spectral types (red dwarfs are by
 * far the most common); glow sizes loosely follow brightness.
 * Around the Sun, a faint haze stands for the Oort cloud of icy bodies.
 */
import * as THREE from "three";
import { rng } from "../../../engine/kit";
import type { SceneBuilder } from "../types";
import { galacticDirection, equatorialToGalactic, GALACTIC, LY } from "./frames";
import { emissive, gauss, glow, magnification, mixColor, paintedDisc, pushColor, randomDirection, segments, stars } from "./fx";

type Kind = "A" | "F" | "G" | "K" | "M" | "WD" | "BD";
const COLOR: Record<Kind, string> = {
  A: "#cfe0ff",
  F: "#fff3d6",
  G: "#ffe07a",
  K: "#ffb46a",
  M: "#ff6f5a",
  WD: "#d8ecff",
  BD: "#c0508a",
};

/** Name, right ascension (h), declination (°), distance (ly), kind, glow size (units). */
const STARS: [string, number, number, number, Kind, number][] = [
  ["Proxima Centauri", 14.4953, -62.6795, 4.2465, "M", 0.2],
  ["Alpha Centauri A", 14.6599, -60.834, 4.344, "G", 0.58],
  ["Alpha Centauri B", 14.6599, -60.834, 4.344, "K", 0.44],
  ["Barnard's Star", 17.9634, 4.6934, 5.963, "M", 0.24],
  ["Luhman 16", 10.8219, -53.3194, 6.5, "BD", 0.15],
  ["WISE 0855−0714", 8.9197, -7.2453, 7.43, "BD", 0.12],
  ["Wolf 359", 10.9414, 7.0147, 7.86, "M", 0.2],
  ["Lalande 21185", 11.0556, 35.97, 8.3, "M", 0.27],
  ["Sirius A", 6.7525, -16.7161, 8.6, "A", 0.95],
  ["Sirius B", 6.7525, -16.7161, 8.6, "WD", 0.13],
  ["Gliese 65", 1.6503, -17.9503, 8.72, "M", 0.21],
  ["Ross 154", 18.8304, -23.8361, 9.7, "M", 0.22],
  ["Ross 248", 23.6985, 44.175, 10.3, "M", 0.2],
  ["Epsilon Eridani", 3.5488, -9.4583, 10.47, "K", 0.4],
  ["Lacaille 9352", 23.0978, -35.8531, 10.72, "M", 0.27],
  ["Ross 128", 11.7957, 0.8044, 11.01, "M", 0.21],
  ["EZ Aquarii", 22.6426, -15.3019, 11.11, "M", 0.2],
  ["Procyon A", 7.655, 5.225, 11.46, "F", 0.72],
  ["Procyon B", 7.655, 5.225, 11.46, "WD", 0.12],
  ["61 Cygni", 21.115, 38.7494, 11.4, "K", 0.34],
  ["Struve 2398", 18.713, 59.6303, 11.49, "M", 0.23],
  ["Groombridge 34", 0.3064, 44.0231, 11.62, "M", 0.24],
  ["Epsilon Indi", 22.056, -56.7861, 11.87, "K", 0.36],
  ["Tau Ceti", 1.7345, -15.9375, 11.91, "G", 0.44],
];
/** Brighter stars farther out, part of the surroundings. */
const FAR: [string, number, number, number, Kind, number][] = [
  ["Altair", 19.8464, 8.8683, 16.73, "A", 0.8],
  ["Vega", 18.6156, 38.7836, 25.0, "A", 0.9],
  ["Fomalhaut", 22.9608, -29.6222, 25.1, "A", 0.8],
  ["70 Ophiuchi", 18.0925, 2.5003, 16.6, "K", 0.4],
  ["Eta Cassiopeiae", 0.8183, 57.8158, 19.4, "G", 0.45],
  ["40 Eridani", 4.2533, -7.6528, 16.3, "K", 0.4],
];

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

const stellarNeighborhood: SceneBuilder = ({ kit, level }) => {
  const root = new THREE.Group();
  const env = new THREE.Group();
  const random = rng(4243);
  const unit = level.size / 10 / LY;
  const place = (ra: number, dec: number, ly: number) => {
    const { l, b } = equatorialToGalactic(ra, dec);
    return galacticDirection(l, b).multiplyScalar(ly / unit);
  };

  /* ---------------- The galactic plane ---------------- */
  const planeTexture = kit.canvasTexture(512, 512, (g, w, h) => {
    const gradient = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    gradient.addColorStop(0, "rgba(120,150,255,0.26)");
    gradient.addColorStop(0.55, "rgba(100,110,255,0.12)");
    gradient.addColorStop(1, "rgba(90,80,230,0)");
    g.fillStyle = gradient;
    g.fillRect(0, 0, w, h);
  });
  const plane = paintedDisc(kit, planeTexture, 6.4, { opacity: 0.9 });
  root.add(plane);

  const ringNear = kit.circle(5 / unit, { color: "#8fd8ff", width: 1.2, opacity: 0.45, segments: 128, dashed: true, dashSize: 0.12, gapSize: 0.1 });
  const ringFar = kit.circle(10 / unit, { color: "#8fd8ff", width: 1.4, opacity: 0.5, segments: 160 });
  root.add(ringNear, ringFar);
  // Spokes every 30°, and a brighter one towards the galactic centre.
  const spokes: number[] = [];
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    const d = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
    spokes.push(d.x * 0.6, 0, d.z * 0.6, d.x * 5.6, 0, d.z * 5.6);
  }
  const spokeLines = segments(kit, spokes, { color: "#6f8dff", width: 1, opacity: 0.22 });
  root.add(spokeLines);

  /* ---------------- The stars ---------------- */
  const cores: number[] = [];
  const coreColors: number[] = [];
  const coreSizes: number[] = [];
  const halos: number[] = [];
  const haloColors: number[] = [];
  const haloSizes: number[] = [];
  const drops: number[] = [];
  const dropColors: number[] = [];
  const feet: THREE.Vector3[] = [];
  const footColors: string[] = [];
  const positions = new Map<string, THREE.Vector3>();
  const addStar = (name: string, p: THREE.Vector3, kind: Kind, size: number, far = false) => {
    positions.set(name, p);
    const color = COLOR[kind];
    cores.push(p.x, p.y, p.z);
    mixColor(coreColors, color, "#ffffff", kind === "M" || kind === "BD" ? 0.25 : 0.55);
    coreSizes.push(size * (kind === "WD" ? 0.9 : 0.35));
    halos.push(p.x, p.y, p.z);
    pushColor(haloColors, color, kind === "BD" ? 0.7 : 1);
    haloSizes.push(size * 2.2);
    if (far) return;
    drops.push(p.x, p.y, p.z, p.x, 0, p.z);
    pushColor(dropColors, color, 0.9);
    pushColor(dropColors, color, 0.35);
    feet.push(new THREE.Vector3(p.x, 0, p.z));
    footColors.push(color);
  };
  const offsets: Record<string, THREE.Vector3> = {
    // Close pairs are separated a little so both can be seen (they are really
    // tens to thousands of astronomical units apart, far too close to show).
    "Alpha Centauri B": new THREE.Vector3(0.09, 0.05, 0.02),
    "Sirius B": new THREE.Vector3(0.12, 0.08, 0),
    "Procyon B": new THREE.Vector3(0.11, 0.07, 0),
  };
  for (const [name, ra, dec, ly, kind, size] of STARS) {
    const p = place(ra, dec, ly);
    if (offsets[name]) p.add(offsets[name]);
    addStar(name, p, kind, size);
  }
  const haloPoints = stars(kit, halos, { colors: haloColors, sizes: haloSizes, size: 1, soft: 1, opacity: 0.55, maxPx: 90, fadePx: 140 });
  const corePoints = stars(kit, cores, { colors: coreColors, sizes: coreSizes, size: 1, soft: 0.25, core: 0.7, twinkle: 0.15, maxPx: 16, fadePx: 40 });
  root.add(haloPoints, corePoints);
  const dropLines = segments(kit, drops, { colors: dropColors, width: 1.2, opacity: 0.5, additive: true });
  root.add(dropLines);
  // Little ellipses where each star's line meets the plane.
  const footGeometry = kit.geometry(new THREE.RingGeometry(0.05, 0.075, 24));
  footGeometry.rotateX(-Math.PI / 2);
  footGeometry.setAttribute("color", new THREE.Float32BufferAttribute(new Array(footGeometry.getAttribute("position").count * 3).fill(1), 3));
  const footMaterial = kit.flat("#ffffff", { opacity: 0.55, vertexColors: true, side: THREE.DoubleSide, depthWrite: false });
  const footMesh = new THREE.InstancedMesh(footGeometry, footMaterial, feet.length);
  const matrix = new THREE.Matrix4();
  const tint = new THREE.Color();
  feet.forEach((p, k) => {
    footMesh.setMatrixAt(k, matrix.makeTranslation(p.x, 0.002, p.z));
    footMesh.setColorAt(k, tint.set(footColors[k]));
  });
  root.add(footMesh);
  // Sparkles on the brightest stars.
  const sparkles: THREE.Mesh[] = [];
  for (const [name, size, color] of [
    ["Sirius A", 1.7, "#d6e6ff"],
    ["Procyon A", 1.1, "#fff3d6"],
    ["Alpha Centauri A", 1.0, "#ffe9a8"],
  ] as const) {
    const s = glow(kit, color, size, { opacity: 0.8, rays: 0.9, core: 0.4, falloff: 3.2, maxPx: 140, fadePx: 200, pulse: 0.08, phase: size * 3 });
    s.position.copy(positions.get(name)!);
    root.add(s);
    sparkles.push(s);
  }

  /* ---------------- The Sun and its Oort cloud ---------------- */
  const sunHalo = glow(kit, "#ffae2e", 1.6, { opacity: 1, falloff: 1.7, maxPx: 130 });
  const sunWarmth = glow(kit, "#ff8a3d", 3.2, { opacity: 0.3, falloff: 1.6, maxPx: 240, fadePx: 400 });
  const sunCore = glow(kit, "#ffd84a", 0.7, { opacity: 1, core: 0.7, rays: 0.8, falloff: 2.2, maxPx: 64, pulse: 0.1 });
  // A ripple of sunlight expanding through the plane: 1 unit is 2 light-years.
  const ping = kit.circle(1, { color: "#ffd98a", width: 1.6, opacity: 0.6, segments: 96 });
  root.add(ping, sunWarmth, sunHalo, sunCore);
  const comets: number[] = [];
  const cometColors: number[] = [];
  const cometSizes: number[] = [];
  const p = new THREE.Vector3();
  for (let i = 0; i < kit.count(3200, 1600); i++) {
    // Log-uniform radii from ~2,000 AU to ~100,000 AU: the cloud looks alike at every zoom.
    const r = 0.016 * Math.pow(50, random());
    randomDirection(random, p).multiplyScalar(r);
    comets.push(p.x, p.y, p.z);
    mixColor(cometColors, "#8fb8ff", "#e6f0ff", random(), 0.8);
    cometSizes.push(r * (0.5 + random()));
  }
  const oort = stars(kit, comets, { colors: cometColors, sizes: cometSizes, size: 0.05, soft: 0.6, opacity: 0.32, twinkle: 0.4, maxPx: 6, fadePx: 9 });
  const oortGroup = new THREE.Group();
  oortGroup.add(oort);
  root.add(oortGroup);
  const oortHaze = new THREE.Mesh(kit.geometry(new THREE.SphereGeometry(0.8, 32, 20)), emissive(kit.halo("#9f9bff", { opacity: 0.12, power: 1.5, inner: 1 })));
  root.add(oortHaze);

  /* ---------------- Surroundings: farther stars and the Milky Way band ---------------- */
  const farCores: number[] = [];
  const farColors: number[] = [];
  const farSizes: number[] = [];
  for (const [, ra, dec, ly, kind, size] of FAR) {
    const q = place(ra, dec, ly);
    farCores.push(q.x, q.y, q.z);
    mixColor(farColors, COLOR[kind], "#ffffff", 0.4);
    farSizes.push(size * 0.4);
  }
  // Countless fainter stars, crowded towards the galactic plane.
  for (let i = 0; i < kit.count(1800, 900); i++) {
    const r = 7 + random() * 8;
    const a = random() * Math.PI * 2;
    const inPlane = random() < 0.7;
    p.set(Math.cos(a) * r, inPlane ? gauss(random) * 1.1 : (random() * 2 - 1) * 10, Math.sin(a) * r);
    farCores.push(p.x, p.y, p.z);
    const k = random();
    mixColor(farColors, k < 0.5 ? COLOR.M : k < 0.75 ? COLOR.K : k < 0.9 ? COLOR.G : COLOR.A, "#ffffff", 0.5, 0.5 + random() * 0.5);
    farSizes.push(0.025 + Math.pow(random(), 4) * 0.07);
  }
  env.add(stars(kit, farCores, { colors: farColors, sizes: farSizes, size: 1, soft: 0.4, core: 0.5, opacity: 0.75, twinkle: 0.4, env: true, maxPx: 12, fadePx: 30 }));
  // The glow of the galactic centre, 26,000 light-years away in that direction.
  const centre = glow(kit, "#ffc27a", 12, { opacity: 0.35, falloff: 1.6, env: true });
  centre.position.copy(GALACTIC.x).multiplyScalar(14);
  const band = glow(kit, "#8f86ff", 30, { opacity: 0.12, falloff: 1.2, env: true });
  env.add(band, centre);

  return {
    root,
    env,
    update({ time }) {
      // Diving towards the Sun: the map (plane, rings, lines) steps aside.
      const zoom = magnification(root, level.frame);
      const map = 1 - smooth(2, 7, zoom);
      (plane.material as THREE.ShaderMaterial).uniforms.uOpacity.value = 0.9 * map;
      for (const [line, base] of [
        [ringNear, 0.45],
        [ringFar, 0.5],
        [spokeLines, 0.22],
        [dropLines, 0.5],
      ] as const)
        (line.material as THREE.Material & { opacity: number }).opacity = base * map;
      footMaterial.uniforms.uOpacity.value = 0.55 * map;
      footMesh.visible = map > 0.01;
      (oortHaze.material as THREE.ShaderMaterial).uniforms.uOpacity.value = 0.12 * (1 - smooth(3, 12, zoom));
      oortGroup.rotation.y = time * 0.01;
      const t = (time / 9) % 1;
      ping.scale.setScalar(0.3 + t * 5.4);
      (ping.material as THREE.Material & { opacity: number }).opacity = 0.55 * Math.sin(Math.PI * Math.min(1, t * 1.15)) * (1 - t) * map;
    },
  };
};

export default stellarNeighborhood;
