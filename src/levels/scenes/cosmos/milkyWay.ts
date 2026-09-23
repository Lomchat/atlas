/**
 * The Milky Way (1 unit = 10,000 light-years), seen from above its north
 * side: a barred spiral with two major arms (Perseus, Scutum–Centaurus)
 * starting at the ends of the central bar, two minor arms and the small Orion
 * Spur where the Sun sits, about 26,000 light-years from the centre.
 *
 * The disc is painted (arms, dust lanes, pink star-forming nebulae) and
 * sprinkled with 3D star points. The galaxy turns clockwise as seen from the
 * north: field stars drift slowly around it while the arm pattern (and the
 * Sun, anchor of the next level) stays put, as spiral density waves do.
 */
import * as THREE from "three";
import { rng } from "../../../engine/kit";
import type { SceneBuilder } from "../types";
import { emissive, gauss, glow, magnification, mixColor, paintedDisc, randomDirection, stars } from "./fx";
import { armAngle, spiralTexture } from "./galaxy";
import type { Arm } from "./galaxy";
import { SUN_IN_GALAXY, galacticDirection } from "./frames";

/** Galaxy radius in local units (50,000 light-years). */
const R = 5;
const PITCH = 12.5;
const TAN = Math.tan((PITCH * Math.PI) / 180);

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

const milkyWay: SceneBuilder = ({ kit, level }) => {
  const root = new THREE.Group();
  const env = new THREE.Group();
  const random = rng(1977);
  const sun = SUN_IN_GALAXY;
  const sunTheta = Math.atan2(-sun.z, sun.x);
  // The bar's near end points 27° from the Sun–centre line, towards positive longitudes.
  const barTheta = sunTheta - (27 * Math.PI) / 180;
  const at = (r: number, theta: number) => new THREE.Vector3(r * R * Math.cos(theta), 0, -r * R * Math.sin(theta));
  const armThrough = (r: number, theta: number, r0: number) => theta + Math.log(r0 / r) / TAN;

  const arms: Arm[] = [
    // Perseus (major), from the far end of the bar.
    { theta: barTheta + Math.PI, r0: 0.3, r1: 1.0, width: 0.075, color: "#6f9dff", strength: 1.2, dust: 1 },
    // Scutum–Centaurus (major), from the near end of the bar.
    { theta: barTheta, r0: 0.3, r1: 0.98, width: 0.075, color: "#7aa6ff", strength: 1.2, dust: 1 },
    // Sagittarius–Carina (minor), just inside the Sun.
    { theta: armThrough(0.45, sunTheta, 0.24), r0: 0.24, r1: 0.92, width: 0.05, color: "#9d7dff", strength: 0.8, dust: 0.6 },
    // Norma / Outer arm (minor).
    { theta: armThrough(0.935, sunTheta, 0.24), r0: 0.24, r1: 1.0, width: 0.05, color: "#8f78ff", strength: 0.7, dust: 0.5 },
    // Orion Spur: the Sun sits near its inner edge.
    {
      theta: sunTheta + Math.log(0.46 / 0.548) / Math.tan((15 * Math.PI) / 180),
      r0: 0.46,
      r1: 0.64,
      width: 0.035,
      color: "#a8c8ff",
      strength: 0.75,
      pitch: 15,
    },
  ];

  /* ---------------- The painted disc ---------------- */
  const extent = 0.9;
  const texture = spiralTexture(kit, {
    size: kit.quality === "high" ? 2048 : 1024,
    seed: 11,
    extent,
    pitch: PITCH,
    arms,
    disc: { inner: "#ff9f5a", outer: "#4b3cc4", alpha: 0.5 },
    bulge: { radius: 0.13, color: "#ff9f4a", core: "#fff0c8", stretch: 0.75, angle: barTheta },
    bar: { length: 0.3, width: 0.09, angle: barTheta, color: "#ffb14f" },
  });
  // The painting is smooth light and dust only: stars and nebulae are 3D points,
  // which stay crisp while diving towards the Sun.
  const disc = paintedDisc(kit, texture, R / extent);
  root.add(disc);

  /* ---------------- Stars in 3D ---------------- */
  const positions: number[] = [];
  const colors: number[] = [];
  const sizes: number[] = [];
  const field: number[] = [];
  const fieldColors: number[] = [];
  const fieldSizes: number[] = [];
  const p = new THREE.Vector3();
  const n = kit.count(1, 0.5);
  // Along the arms: young, blue-white stars.
  const weights = arms.map((arm) => (arm.r1 - arm.r0) * (arm.strength ?? 1) * arm.width);
  const total = weights.reduce((a, b) => a + b, 0);
  const pickArm = () => {
    let x = random() * total;
    for (let k = 0; k < arms.length; k++) if ((x -= weights[k]) <= 0) return arms[k];
    return arms[0];
  };
  for (let i = 0; i < 13000 * n; i++) {
    const arm = pickArm();
    const r = arm.r0 + (arm.r1 - arm.r0) * Math.pow(random(), 0.9);
    const theta = armAngle(arm, r, PITCH);
    p.copy(at(r, theta));
    const w = arm.width * R * (0.65 + 0.5 * r) * 0.9;
    p.x += gauss(random) * w;
    p.z += gauss(random) * w;
    p.y = gauss(random) * 0.05;
    positions.push(p.x, p.y, p.z);
    const k = random();
    if (k < 0.08) mixColor(colors, "#ff7fc4", "#ffc2e6", random());
    else mixColor(colors, "#bcd4ff", "#ffffff", random(), 0.9);
    sizes.push(0.45 + Math.pow(random(), 6) * 2.6);
  }
  // Bar and bulge: old, warm stars.
  for (let i = 0; i < 7000 * n; i++) {
    if (random() < 0.55) {
      const u = gauss(random) * 0.45 * R * 0.3;
      const v = gauss(random) * 0.1 * R * 0.3;
      p.set(u * Math.cos(barTheta) - v * Math.sin(barTheta), gauss(random) * 0.18, -(u * Math.sin(barTheta) + v * Math.cos(barTheta)));
    } else {
      randomDirection(random, p).multiplyScalar(Math.abs(gauss(random)) * 0.55);
      p.y *= 0.7;
    }
    positions.push(p.x, p.y, p.z);
    mixColor(colors, "#ff9f4a", "#ffe2b0", random(), 0.8);
    sizes.push(0.5 + Math.pow(random(), 4) * 1.6);
  }
  // Field stars of the disc, drifting around the centre.
  for (let i = 0; i < 9000 * n; i++) {
    const r = Math.min(R * 1.05, -Math.log(1 - random() * 0.97) * 1.7);
    const theta = random() * Math.PI * 2;
    field.push(r * Math.cos(theta), gauss(random) * 0.06, -r * Math.sin(theta));
    mixColor(fieldColors, "#ffe6c2", "#dfe6ff", random(), 0.75);
    fieldSizes.push(0.5 + Math.pow(random(), 4) * 1.4);
  }
  root.add(
    stars(kit, positions, { colors, sizes, size: 0.021, soft: 0.4, core: 0.3, opacity: 0.6, twinkle: 0.35, maxPx: 5 }),
    stars(kit, field, { colors: fieldColors, sizes: fieldSizes, size: 0.022, soft: 0.4, opacity: 0.5, twinkle: 0.3, maxPx: 5, spin: 0.02 }),
  );

  // Star-forming nebulae: soft pink glows along the arms.
  const nebulae: number[] = [];
  const nebulaColors: number[] = [];
  const nebulaSizes: number[] = [];
  for (let i = 0; i < 110; i++) {
    const arm = arms[Math.floor(random() * 4)];
    const r = arm.r0 + (arm.r1 - arm.r0) * (0.2 + random() * 0.75);
    p.copy(at(r, armAngle(arm, r, PITCH) + (random() - 0.5) * 0.08));
    nebulae.push(p.x, 0.02, p.z);
    mixColor(nebulaColors, "#ff4f9e", "#ff8fcf", random());
    nebulaSizes.push(0.6 + random() * 1.2);
  }
  root.add(stars(kit, nebulae, { colors: nebulaColors, sizes: nebulaSizes, size: 0.2, soft: 1, core: 0.25, opacity: 0.55, twinkle: 0.45, maxPx: 40, fadePx: 60 }));

  /* ---------------- The glowing core ---------------- */
  const bulgeWide = glow(kit, "#ff9a4a", 4.2, { opacity: 0.3, falloff: 2.2, fadePx: 1600 });
  const bulgeCore = glow(kit, "#ffd28a", 1.2, { opacity: 0.45, core: 0.3, falloff: 2, fadePx: 900, pulse: 0.06 });
  const discGlow = glow(kit, "#7a6cff", 13, { opacity: 0.18, falloff: 1.4, fadePx: 2500 });
  root.add(discGlow, bulgeWide, bulgeCore);
  const bulge = new THREE.Mesh(kit.geometry(new THREE.SphereGeometry(0.62, 32, 20)), emissive(kit.halo("#ffc070", { opacity: 0.35, power: 1.3, inner: 1 })));
  bulge.scale.set(1, 0.62, 1);
  root.add(bulge);

  /* ---------------- The Sun: you are here ---------------- */
  const sunDot = glow(kit, "#ffe27a", 0.2, { opacity: 0.95, core: 1, falloff: 2.4, maxPx: 26, minPx: 5 });
  sunDot.position.copy(sun);
  root.add(sunDot);
  const ring = kit.circle(0.2, { color: "#ffd23f", width: 1.6, opacity: 0.8, segments: 64 });
  ring.position.copy(sun);
  root.add(ring);

  /* ---------------- Around the Sun: what you fly through on the way in ---------------- */
  // Stars at log-spaced distances (30 to 6,000 light-years), flattened like the
  // disc: at every zoom, some stars are near enough to drift past.
  const local: number[] = [];
  const localColors: number[] = [];
  const localSizes: number[] = [];
  const kinds = ["#ff8a6a", "#ff8a6a", "#ff8a6a", "#ffb870", "#ffe7a8", "#fff6e6", "#cfe0ff"];
  for (let i = 0; i < kit.count(3600, 1800); i++) {
    const r = 0.003 * Math.pow(200, random());
    randomDirection(random, p).multiplyScalar(r);
    p.y *= Math.min(1, 0.06 / r + 0.08);
    p.add(sun);
    local.push(p.x, p.y, p.z);
    mixColor(localColors, kinds[Math.floor(random() * kinds.length)], "#ffffff", 0.3);
    localSizes.push(r * (0.5 + Math.pow(random(), 3) * 2));
  }
  const localStars = stars(kit, local, { colors: localColors, sizes: localSizes, size: 0.009, soft: 0.4, core: 0.6, opacity: 0, twinkle: 0.3, maxPx: 5, fadePx: 12 });
  root.add(localStars);
  // Famous nebulae and clusters near the Sun (galactic longitude, latitude, light-years, size).
  const nebulaGlows: THREE.Mesh[] = [];
  for (const [l, b, ly, size, color] of [
    [209.0, -19.4, 1344, 0.03, "#ff6fa8"], // Orion Nebula
    [166.6, -23.5, 444, 0.012, "#8fc4ff"], // Pleiades
    [85.6, -0.8, 2590, 0.05, "#ff5f8f"], // North America Nebula
    [206.3, -2.1, 5200, 0.06, "#ff6f9f"], // Rosette Nebula
    [6.0, -1.2, 4100, 0.05, "#ff5fae"], // Lagoon Nebula
    [17.0, 0.8, 5700, 0.05, "#ff7fb8"], // Eagle Nebula
    [287.6, -0.6, 7500, 0.09, "#ff5f9a"], // Carina Nebula
  ] as const) {
    const g = glow(kit, color, size, { opacity: 0.8, core: 0.25, falloff: 1.8, maxPx: 260, fadePx: 380 });
    g.position.copy(galacticDirection(l, b).multiplyScalar(ly / 10041).add(sun));
    root.add(g);
    nebulaGlows.push(g);
  }

  /* ---------------- Surroundings: the halo ---------------- */
  const globulars: number[] = [];
  const globularSizes: number[] = [];
  for (let i = 0; i < 150; i++) {
    randomDirection(random, p).multiplyScalar(0.5 + Math.pow(random(), 1.8) * 6.5);
    globulars.push(p.x, p.y, p.z);
    globularSizes.push(0.6 + random() * 0.8);
  }
  env.add(
    glow(kit, "#4d3fb8", 16, { opacity: 0.35, falloff: 1.3, env: true, fadePx: 2500 }),
    stars(kit, globulars, { color: "#ffe0a8", sizes: globularSizes, size: 0.09, soft: 0.6, core: 0.6, opacity: 0.9, twinkle: 0.35, env: true, maxPx: 10, fadePx: 30 }),
  );

  return {
    root,
    env,
    update({ time }) {
      const zoom = magnification(root, level.frame);
      const s = 1 + 0.12 * Math.sin(time * 1.6);
      ring.scale.setScalar(s);
      (ring.material as THREE.Material & { opacity: number }).opacity = (0.75 - 0.25 * Math.sin(time * 1.6)) * (1 - smooth(2.5, 8, zoom));
      // Diving in: the painting melts away and the stars around the Sun take over.
      (disc.material as THREE.ShaderMaterial).uniforms.uOpacity.value = 1 - smooth(6, 30, zoom);
      (localStars.material as THREE.ShaderMaterial).uniforms.uOpacity.value = smooth(1.5, 5, zoom);
    },
  };
};

export default milkyWay;
