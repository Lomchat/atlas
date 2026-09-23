/**
 * The Solar System (1 unit ≈ 6 astronomical units): the Sun at the centre,
 * the orbits of the four giant planets at their true relative distances, the
 * asteroid belt and the icy Kuiper belt beyond Neptune, with Pluto on its
 * tilted, elongated orbit. The rocky planets are the child level (drawn at
 * the Sun). Planets are drawn thousands of times larger than they are, or
 * they would be invisible; the level's hotspots say so.
 *
 * Planets are a snapshot at illustrative positions (hotspots stay on them);
 * the flowing dashes on each orbit, the belts and a passing comet show the
 * direction of motion.
 */
import * as THREE from "three";
import { rng } from "../../../engine/kit";
import type { SceneBuilder } from "../types";
import { gauss, glow, magnification, mixColor, paintedDisc, stars } from "./fx";
import { aimAtSun, bandTexture, planetMaterial } from "./planet";

/** Astronomical units per local unit. */
const AU = 1.495978707e11;

/**
 * Orbit radius (AU), drawn radius, angle (radians, counter-clockwise seen from
 * above). All four are enlarged by the same factor (3,600 times), so
 * their sizes compare correctly with each other, but not with their orbits.
 */
const ENLARGE = 3600;
const EARTH_RADIUS = 6.371e6;
const drawn = (earthRadii: number) => (earthRadii * EARTH_RADIUS * ENLARGE) / 9e11;
export const GIANTS = {
  jupiter: { a: 5.2, r: drawn(10.97), theta: -0.42, glow: "#ffc48a" },
  saturn: { a: 9.54, r: drawn(9.14), theta: 2.55, glow: "#ffe2a0" },
  uranus: { a: 19.19, r: drawn(3.98), theta: 0.42, glow: "#8ff0ff" },
  neptune: { a: 30.07, r: drawn(3.86), theta: -2.2, glow: "#6f9dff" },
};

const solarSystem: SceneBuilder = ({ kit, level }) => {
  const root = new THREE.Group();
  const env = new THREE.Group();
  const random = rng(1846);
  const unitAU = level.size / 10 / AU;
  const orbitAt = (a: number, theta: number, y = 0) => {
    const r = a / unitAU;
    return new THREE.Vector3(r * Math.cos(theta), y, -r * Math.sin(theta));
  };

  /* ---------------- The Sun ---------------- */
  const sun = new THREE.Group();
  root.add(sun);
  const corona = glow(kit, "#ff6a2a", 3.6, { opacity: 0.55, falloff: 1.7, maxPx: 620, fadePx: 800 });
  const halo = glow(kit, "#ffb52e", 1.5, { opacity: 1, falloff: 1.8, maxPx: 280, fadePx: 420, pulse: 0.05 });
  const core = glow(kit, "#fff1b0", 0.6, { opacity: 1, core: 1, rays: 1, falloff: 2.4, maxPx: 130, fadePx: 260, pulse: 0.08 });
  sun.add(corona, halo, core);

  /* ---------------- Orbits ---------------- */
  const orbitLines: THREE.Object3D[] = [];
  const orbit = (a: number, color: string, opacity: number, width = 1.4) => {
    const r = a / unitAU;
    const line = kit.circle(r, { color, width, opacity, segments: Math.round(96 + r * 30), dashed: true, dashSize: 0.1 + r * 0.035, gapSize: 0.05 + r * 0.02 });
    root.add(line);
    orbitLines.push(line);
    return line;
  };
  orbit(GIANTS.jupiter.a, "#ffc48a", 0.7, 1.6);
  orbit(GIANTS.saturn.a, "#ffe29a", 0.65, 1.6);
  orbit(GIANTS.uranus.a, "#8ff0ff", 0.6, 1.5);
  orbit(GIANTS.neptune.a, "#8fa8ff", 0.65, 1.5);

  // Soft luminous bands under the asteroid and Kuiper belts, and a faint plane.
  const band = (inner: number, outer: number, color: string, alpha: number) =>
    kit.canvasTexture(512, 512, (g, w) => {
      const c = w / 2;
      const gradient = g.createRadialGradient(c, c, 0, c, c, c);
      const rgb = new THREE.Color(color);
      const rgba = (a: number) => `rgba(${Math.round(rgb.r * 255)},${Math.round(rgb.g * 255)},${Math.round(rgb.b * 255)},${a})`;
      gradient.addColorStop(0, rgba(0));
      gradient.addColorStop(Math.max(0, inner - 0.08), rgba(0));
      gradient.addColorStop((inner + outer) / 2, rgba(alpha));
      gradient.addColorStop(Math.min(1, outer + 0.08), rgba(0));
      gradient.addColorStop(1, rgba(0));
      g.fillStyle = gradient;
      g.fillRect(0, 0, w, w);
    });
  const kuiperR = 55 / unitAU;
  root.add(paintedDisc(kit, band(30 / 55, 50 / 55, "#6f8dff", 0.17), kuiperR, { additive: true }));
  const beltR = 4 / unitAU;
  root.add(paintedDisc(kit, band(2.1 / 4, 3.3 / 4, "#c8a8ff", 0.14), beltR, { additive: true }));
  root.add(paintedDisc(kit, band(0.02, 0.62, "#3a2a8a", 0.35), 6.2, { additive: true }));

  /* ---------------- Giant planets ---------------- */
  const sphere = kit.geometry(new THREE.SphereGeometry(1, 40, 28));
  const planets: THREE.Mesh[] = [];
  const bodies: THREE.Object3D[] = [];
  const addPlanet = (spec: { a: number; r: number; theta: number; glow: string }, material: THREE.ShaderMaterial, tilt = 0) => {
    const aura = glow(kit, spec.glow, spec.r * 6, { opacity: 0.5, falloff: 1.8, minPx: 22, maxPx: 120, fadePx: 240 });
    aura.position.copy(orbitAt(spec.a, spec.theta));
    root.add(aura);
    const group = new THREE.Group();
    group.position.copy(orbitAt(spec.a, spec.theta));
    group.rotation.z = tilt;
    const mesh = new THREE.Mesh(sphere, material);
    mesh.scale.setScalar(spec.r);
    aimAtSun(mesh, sun);
    group.add(mesh);
    root.add(group);
    planets.push(mesh);
    bodies.push(group);
    return group;
  };
  const jupiterMap = bandTexture(
    kit,
    [
      [0, "#c9a27c"],
      [0.18, "#f1dcc0"],
      [0.3, "#d49a6a"],
      [0.38, "#fff0dc"],
      [0.46, "#c47e4f"],
      [0.54, "#f6e2c6"],
      [0.62, "#d8a070"],
      [0.72, "#f3dfc4"],
      [0.84, "#c89a74"],
      [1, "#a98a78"],
    ],
    { x: 0.62, y: 0.6, w: 0.07, h: 0.045, color: "#e0643c" },
  );
  addPlanet(GIANTS.jupiter, planetMaterial(kit, { map: jupiterMap, rimColor: "#ffe2c2" }), 0.05);
  const saturnMap = bandTexture(kit, [
    [0, "#d9c08a"],
    [0.3, "#f4e2b0"],
    [0.45, "#e6c88a"],
    [0.55, "#fbecc4"],
    [0.7, "#e2c690"],
    [1, "#bca577"],
  ]);
  const saturn = addPlanet(GIANTS.saturn, planetMaterial(kit, { map: saturnMap, rimColor: "#fff2c8" }), 0.47);
  // Saturn's rings: soft bands with the Cassini division.
  const ringGeometry = kit.geometry(new THREE.RingGeometry(GIANTS.saturn.r * 1.25, GIANTS.saturn.r * 2.3, 96, 8));
  const ringColors: number[] = [];
  const ringPosition = ringGeometry.getAttribute("position");
  for (let i = 0; i < ringPosition.count; i++) {
    const d = Math.hypot(ringPosition.getX(i), ringPosition.getY(i)) / GIANTS.saturn.r;
    const cassini = Math.abs(d - 1.95) < 0.05 ? 0.25 : 1;
    const shade = (d < 1.5 ? 0.55 : d < 1.95 ? 1 : 0.8) * cassini;
    mixColor(ringColors, "#c9a86a", "#fff0c8", Math.min(1, (d - 1.25) / 1.05), shade);
  }
  ringGeometry.setAttribute("color", new THREE.Float32BufferAttribute(ringColors, 3));
  ringGeometry.rotateX(-Math.PI / 2);
  const rings = new THREE.Mesh(
    ringGeometry,
    kit.flat("#ffffff", { vertexColors: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false }),
  );
  saturn.add(rings);
  addPlanet(GIANTS.uranus, planetMaterial(kit, { color: "#9ff0f4", rimColor: "#e6fdff" }), 1.71);
  const neptuneMap = bandTexture(kit, [
    [0, "#3f63e8"],
    [0.4, "#5a86ff"],
    [0.55, "#4a73f6"],
    [1, "#3452c8"],
  ], { x: 0.4, y: 0.62, w: 0.05, h: 0.03, color: "#2a3aa0" });
  addPlanet(GIANTS.neptune, planetMaterial(kit, { map: neptuneMap, rimColor: "#c6d8ff" }), 0.49);

  /* ---------------- Asteroid belt ---------------- */
  const belt: number[] = [];
  const beltColors: number[] = [];
  const beltSizes: number[] = [];
  for (let i = 0; i < kit.count(1600, 800); i++) {
    const a = 2.1 + Math.pow(random(), 0.8) * 1.2;
    const theta = random() * Math.PI * 2;
    const p = orbitAt(a, theta, gauss(random) * 0.012);
    belt.push(p.x, p.y, p.z);
    mixColor(beltColors, "#8f84c4", "#d8c8b0", random(), 0.7);
    beltSizes.push(0.4 + Math.pow(random(), 4) * 1.2);
  }
  const asteroids = new THREE.Group();
  asteroids.add(stars(kit, belt, { colors: beltColors, sizes: beltSizes, size: 0.018, soft: 0.3, opacity: 0.5, maxPx: 3, fadePx: 8 }));
  root.add(asteroids);

  /* ---------------- Kuiper belt and Pluto ---------------- */
  const kuiper: number[] = [];
  const kuiperColors: number[] = [];
  const kuiperSizes: number[] = [];
  for (let i = 0; i < kit.count(4500, 2200); i++) {
    // Most objects between 39 and 48 AU (the "classical" belt), a few scattered wider.
    const scattered = random() < 0.2;
    const a = scattered ? 30 + random() * 25 : 39 + gauss(random) * 2.8;
    const theta = random() * Math.PI * 2;
    const inclination = (scattered ? 0.28 : 0.07) * gauss(random);
    const p = orbitAt(a, theta, (a / unitAU) * Math.sin(inclination));
    kuiper.push(p.x, p.y, p.z);
    mixColor(kuiperColors, "#7fa8ff", "#d9ecff", random(), 0.75);
    kuiperSizes.push(0.4 + Math.pow(random(), 5) * 1.6);
  }
  const kuiperGroup = new THREE.Group();
  kuiperGroup.add(stars(kit, kuiper, { colors: kuiperColors, sizes: kuiperSizes, size: 0.034, soft: 0.45, opacity: 0.65, twinkle: 0.3, maxPx: 6, fadePx: 10 }));
  root.add(kuiperGroup);
  // Pluto: a = 39.5 AU, e = 0.25, inclined 17°.
  const pluto: THREE.Vector3[] = [];
  const e = 0.2488;
  const aPluto = 39.48 / unitAU;
  const tilt = new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(Math.cos(1.93), 0, -Math.sin(1.93)), (17.16 * Math.PI) / 180);
  for (let i = 0; i <= 160; i++) {
    const E = (i / 160) * Math.PI * 2;
    const x = aPluto * (Math.cos(E) - e);
    const z = aPluto * Math.sqrt(1 - e * e) * Math.sin(E);
    const q = new THREE.Vector3(x, 0, z).applyAxisAngle(new THREE.Vector3(0, 1, 0), -1.99).applyMatrix4(tilt);
    pluto.push(q);
  }
  root.add(kit.line(pluto, { color: "#e6c9a8", width: 1.1, opacity: 0.4, dashed: true, dashSize: 0.14, gapSize: 0.12 }));
  const plutoAt = pluto[52];
  const plutoBody = new THREE.Mesh(sphere, planetMaterial(kit, { color: "#e8c9a4", rimColor: "#fff0dc" }));
  plutoBody.scale.setScalar(0.05);
  plutoBody.position.copy(plutoAt);
  aimAtSun(plutoBody, sun);
  root.add(plutoBody);
  const plutoSize = plutoBody.scale.x;

  /* ---------------- A comet on a long, elongated orbit ---------------- */
  const comet = new THREE.Group();
  const cometHead = glow(kit, "#dff6ff", 0.2, { opacity: 0.95, core: 0.8, falloff: 2.6, maxPx: 30, minPx: 3 });
  comet.add(cometHead);
  const tailPoints: number[] = [];
  const tailSizes: number[] = [];
  for (let i = 0; i < 60; i++) {
    const t = i / 60;
    tailPoints.push(t * 1.1, (random() - 0.5) * 0.04 * t, (random() - 0.5) * 0.08 * t);
    tailSizes.push(1.2 * (1 - t) + 0.2);
  }
  const tail = stars(kit, tailPoints, { color: "#9fe0ff", sizes: tailSizes, size: 0.09, soft: 1, opacity: 0.55, maxPx: 12 });
  const tailPivot = new THREE.Group();
  tailPivot.add(tail);
  comet.add(tailPivot);
  root.add(comet);
  const cometOrbit = { a: 3.3, e: 0.82, w: 0.9, incline: 0.35 };
  const cometAxis = new THREE.Vector3(1, 0, 0.3).normalize();
  const cometPosition = (time: number, target: THREE.Vector3) => {
    // Kepler's equation, solved roughly: fast near the Sun, slow far away.
    const M = ((time / 26) % 1) * Math.PI * 2;
    let E = M;
    for (let k = 0; k < 6; k++) E = M + cometOrbit.e * Math.sin(E);
    const x = cometOrbit.a * (Math.cos(E) - cometOrbit.e);
    const z = cometOrbit.a * Math.sqrt(1 - cometOrbit.e ** 2) * Math.sin(E);
    return target.set(x, 0, -z).applyAxisAngle(new THREE.Vector3(0, 1, 0), cometOrbit.w).applyAxisAngle(cometAxis, cometOrbit.incline);
  };

  /* ---------------- Surroundings: the starry sky ---------------- */
  const sky: number[] = [];
  const skyColors: number[] = [];
  const skySizes: number[] = [];
  const v = new THREE.Vector3();
  for (let i = 0; i < kit.count(1800, 900); i++) {
    v.set(gauss(random), gauss(random) * 0.6, gauss(random)).normalize().multiplyScalar(13 + random() * 2);
    sky.push(v.x, v.y, v.z);
    mixColor(skyColors, "#b8c8ff", "#fff1d6", random(), 0.6 + random() * 0.4);
    skySizes.push(0.5 + Math.pow(random(), 5) * 2);
  }
  env.add(stars(kit, sky, { colors: skyColors, sizes: skySizes, size: 0.05, soft: 0.4, core: 0.5, opacity: 0.8, twinkle: 0.45, env: true, maxPx: 5 }));

  const cometAt = new THREE.Vector3();
  return {
    root,
    env,
    update({ time }) {
      // The enlarged planets keep their on-screen size when diving in, instead
      // of ballooning over the rocky planets.
      const shrink = Math.min(1, 1.3 / magnification(root, level.frame));
      for (const body of bodies) body.scale.setScalar(shrink);
      plutoBody.scale.setScalar(plutoSize * shrink);
      for (const line of orbitLines) {
        const material = (line as THREE.Mesh).material as THREE.Material & { dashOffset: number };
        material.dashOffset = -time * 0.05;
      }
      planets.forEach((planet, k) => (planet.rotation.y = time * (0.5 - k * 0.08)));
      asteroids.rotation.y = time * 0.02;
      kuiperGroup.rotation.y = time * 0.004;
      cometPosition(time, cometAt);
      comet.position.copy(cometAt);
      // The tail always points away from the Sun, longer when close.
      const distance = cometAt.length();
      tailPivot.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), cometAt.clone().normalize());
      tailPivot.scale.setScalar(Math.min(1.4, 0.9 / Math.max(distance, 0.3)));
      (tail.material as THREE.ShaderMaterial).uniforms.uOpacity.value = Math.min(0.6, 0.9 / Math.max(distance, 0.4));
    },
  };
};

export default solarSystem;
