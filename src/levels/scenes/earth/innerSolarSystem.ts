/**
 * The inner Solar System (1 unit = 46 million km; 1 AU ≈ 3.25 units):
 * the Sun and the orbits of Mercury, Venus, Earth and Mars, with the
 * asteroid belt beyond. Orbit sizes and shapes are true (Mercury's and Mars's
 * orbits are visibly off-centre); the planets are all enlarged by the same
 * factor (×1,500) so they compare correctly with each other, and the Sun ×36.
 *
 * Every planet is lit by the Sun. Earth stays put: the `earth-moon` level is
 * anchored at its centre. While diving towards it, the enlarged Earth shrinks
 * back to its true size so the true-scale Earth and Moon can take over.
 */
import * as THREE from "three";
import { rng } from "../../../engine/kit";
import type { SceneBuilder } from "../types";
import { paintEarth } from "./earthMap";
import { planetMaterial, viewExtent } from "./shared";

const AU = 3.2522; // local units per astronomical unit
const ENLARGE = 1500;
const UNIT = 4.6e10;
const planetRadius = (km: number) => ((km * 1000) / UNIT) * ENLARGE;
const DEG = Math.PI / 180;

interface PlanetSpec {
  id: string;
  a: number;
  e: number;
  /** Direction of perihelion (radians, same convention as `theta`). */
  omega: number;
  /** Angle of the planet on its orbit, from +X towards +Z (motion goes towards smaller angles). */
  theta: number;
  radiusKm: number;
  orbit: string;
  glow: string;
}

const PLANETS: PlanetSpec[] = [
  { id: "mercury", a: 0.387, e: 0.2056, omega: 80 * DEG, theta: -75 * DEG, radiusKm: 2440, orbit: "#c9b3ff", glow: "#e2d8ff" },
  { id: "venus", a: 0.723, e: 0.0068, omega: 0, theta: 215 * DEG, radiusKm: 6052, orbit: "#ffd98a", glow: "#ffe6a8" },
  { id: "earth", a: 1, e: 0, omega: 0, theta: -30 * DEG, radiusKm: 6371, orbit: "#6fd3ff", glow: "#6fc3ff" },
  { id: "mars", a: 1.524, e: 0.0934, omega: 300 * DEG, theta: 200 * DEG, radiusKm: 3390, orbit: "#ff9a6b", glow: "#ff9a6b" },
];

const orbitRadius = (p: PlanetSpec, angle: number) => (p.a * AU * (1 - p.e * p.e)) / (1 + p.e * Math.cos(angle - p.omega));
const orbitPoint = (p: PlanetSpec, angle: number) => {
  const r = orbitRadius(p, angle);
  return new THREE.Vector3(Math.cos(angle) * r, 0, Math.sin(angle) * r);
};

/** Small painted surfaces for the planets. */
function paintPlanet(id: string) {
  return (g: CanvasRenderingContext2D, w: number, h: number) => {
    const random = rng(id.length * 31 + 7);
    const blot = (x: number, y: number, rx: number, ry: number, color: string) => {
      g.fillStyle = color;
      for (const offset of [-w, 0, w]) {
        g.beginPath();
        g.ellipse(x + offset, y, rx, ry, 0, 0, Math.PI * 2);
        g.fill();
      }
    };
    if (id === "mercury") {
      g.fillStyle = "#b9aecf";
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < 26; i++) blot(random() * w, (0.1 + random() * 0.8) * h, 6 + random() * 16, 4 + random() * 8, random() < 0.5 ? "#9d91b8" : "#cfc6e0");
      for (let i = 0; i < 40; i++) {
        const x = random() * w;
        const y = (0.12 + random() * 0.76) * h;
        const s = 2 + random() * 5;
        blot(x, y, s, s * 0.8, "#8f84ab");
        blot(x - s * 0.25, y - s * 0.25, s * 0.6, s * 0.5, "#ddd5ec");
      }
    } else if (id === "venus") {
      const gradient = g.createLinearGradient(0, 0, 0, h);
      gradient.addColorStop(0, "#f7e2a6");
      gradient.addColorStop(0.5, "#f3cf86");
      gradient.addColorStop(1, "#f7e2a6");
      g.fillStyle = gradient;
      g.fillRect(0, 0, w, h);
      g.strokeStyle = "rgba(255,248,225,0.8)";
      g.lineCap = "round";
      for (let i = 0; i < 22; i++) {
        const y = random() * h;
        const x = random() * w;
        g.lineWidth = 3 + random() * 7;
        g.beginPath();
        g.moveTo(x, y);
        g.bezierCurveTo(x + 40, y - 18 + random() * 36, x + 90, y - 18 + random() * 36, x + 150, y + (random() - 0.5) * 30);
        g.stroke();
      }
      g.strokeStyle = "rgba(226,170,92,0.55)";
      for (let i = 0; i < 12; i++) {
        const y = random() * h;
        const x = random() * w;
        g.lineWidth = 2 + random() * 5;
        g.beginPath();
        g.moveTo(x, y);
        g.bezierCurveTo(x + 50, y + 20, x + 100, y - 20, x + 160, y);
        g.stroke();
      }
    } else if (id === "mars") {
      g.fillStyle = "#e46a3d";
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < 18; i++) blot(random() * w, (0.25 + random() * 0.5) * h, 10 + random() * 26, 4 + random() * 10, random() < 0.6 ? "#b8492f" : "#f08a55");
      // Valles Marineris and the polar caps.
      blot(w * 0.3, h * 0.55, w * 0.1, 2.5, "#9c3a26");
      const cap = g.createLinearGradient(0, 0, 0, h * 0.14);
      cap.addColorStop(0, "#fff6f0");
      cap.addColorStop(0.7, "#fff6f0");
      cap.addColorStop(1, "rgba(255,246,240,0)");
      g.fillStyle = cap;
      g.fillRect(0, 0, w, h * 0.14);
      const south = g.createLinearGradient(0, h, 0, h * 0.9);
      south.addColorStop(0, "#fff6f0");
      south.addColorStop(1, "rgba(255,246,240,0)");
      g.fillStyle = south;
      g.fillRect(0, h * 0.9, w, h * 0.1);
    }
  };
}

const innerSolarSystem: SceneBuilder = ({ kit, children }) => {
  const root = new THREE.Group();
  const env = new THREE.Group();

  /* ---------------- The Sun (×36) ---------------- */
  const SUN_R = 0.55;
  const sun = new THREE.Group();
  root.add(sun);
  const sunBody = new THREE.Mesh(kit.geometry(new THREE.SphereGeometry(SUN_R, 48, 24)), kit.flat("#fff0a8"));
  sun.add(sunBody);
  const sunRim = new THREE.Mesh(
    kit.geometry(new THREE.SphereGeometry(SUN_R * 1.01, 48, 24)),
    kit.halo("#ff9a2e", { opacity: 0.95, power: 1.6, inner: 0 }),
  );
  sun.add(sunRim);
  const rays = kit.canvasTexture(256, 256, (g, w) => {
    const c = w / 2;
    g.translate(c, c);
    const random = rng(8);
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2 + random() * 0.1;
      const length = c * (0.62 + random() * 0.38);
      const width = 0.05 + random() * 0.05;
      const gradient = g.createLinearGradient(0, 0, Math.cos(a) * length, Math.sin(a) * length);
      gradient.addColorStop(0, "rgba(255,210,120,0.9)");
      gradient.addColorStop(1, "rgba(255,140,60,0)");
      g.fillStyle = gradient;
      g.beginPath();
      g.moveTo(Math.cos(a - width) * c * 0.2, Math.sin(a - width) * c * 0.2);
      g.lineTo(Math.cos(a) * length, Math.sin(a) * length);
      g.lineTo(Math.cos(a + width) * c * 0.2, Math.sin(a + width) * c * 0.2);
      g.fill();
    }
  });
  const rayMaterial = kit.track(
    new THREE.SpriteMaterial({ map: rays, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
  const rayMaterial2 = kit.track(
    new THREE.SpriteMaterial({ map: rays, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending, color: "#ff9a5a" }),
  );
  const raySprite = new THREE.Sprite(rayMaterial);
  raySprite.scale.setScalar(SUN_R * 5.2);
  const raySprite2 = new THREE.Sprite(rayMaterial2);
  raySprite2.scale.setScalar(SUN_R * 6.5);
  const corona = kit.glow("#ff6a2a", SUN_R * 14, { opacity: 0.45 });
  const halo = kit.glow("#ffb52e", SUN_R * 6, { opacity: 0.85 });
  const core = kit.glow("#fff1b0", SUN_R * 2.8, { opacity: 0.9 });
  sun.add(corona, raySprite2, raySprite, halo, core);

  // The Sun's light spreading through the plane of the planets.
  const planeGlow = kit.canvasTexture(256, 256, (g, w) => {
    const c = w / 2;
    const gradient = g.createRadialGradient(c, c, 0, c, c, c);
    gradient.addColorStop(0, "rgba(255,190,110,0.55)");
    gradient.addColorStop(0.25, "rgba(255,150,90,0.18)");
    gradient.addColorStop(0.6, "rgba(160,120,255,0.06)");
    gradient.addColorStop(1, "rgba(120,100,255,0)");
    g.fillStyle = gradient;
    g.fillRect(0, 0, w, w);
  });
  const plane = new THREE.Mesh(
    kit.geometry(new THREE.PlaneGeometry(22, 22)),
    kit.textured(planeGlow, { env: true, flat: 1, rim: 0, gloss: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }),
  );
  plane.rotation.x = -Math.PI / 2;
  env.add(plane);

  /* ---------------- Orbits, trails and planets ---------------- */
  const spinning: { mesh: THREE.Mesh; material: THREE.ShaderMaterial; toSun: THREE.Vector3; frame: THREE.Quaternion }[] = [];
  const earthChild = children.find((child) => child.id === "earth-moon");
  let earthGroup: THREE.Group | null = null;
  let earthGlow: THREE.Sprite | null = null;
  let earthRadius = 0.2;
  const tmpQ = new THREE.Quaternion();

  for (const spec of PLANETS) {
    // The orbit: a thin pastel line, dashed, and a bright trail just behind the planet.
    const points: number[] = [];
    const segments = 200;
    for (let i = 0; i <= segments; i++) {
      const p = orbitPoint(spec, (i / segments) * Math.PI * 2);
      points.push(p.x, 0, p.z);
    }
    root.add(kit.line(points, { color: spec.orbit, width: 1.4, opacity: 0.45, env: true, dashed: true, dashSize: 0.12, gapSize: 0.08 }));
    const trailPoints: number[] = [];
    const trailColors: number[] = [];
    const color = new THREE.Color(spec.orbit);
    const steps = 48;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const p = orbitPoint(spec, spec.theta + t * 55 * DEG);
      trailPoints.push(p.x, 0, p.z);
      const fade = Math.pow(1 - t, 1.6);
      trailColors.push(color.r * fade, color.g * fade, color.b * fade);
    }
    const trail = kit.line(trailPoints, { color: "#ffffff", width: 3, opacity: 0.9, env: true });
    (trail.geometry as unknown as { setColors(c: number[]): void }).setColors(trailColors);
    const trailMaterial = trail.material as THREE.Material & { vertexColors: boolean };
    trailMaterial.vertexColors = true;
    trailMaterial.blending = THREE.AdditiveBlending;
    root.add(trail);

    const position = spec.id === "earth" && earthChild ? new THREE.Vector3(...earthChild.at) : orbitPoint(spec, spec.theta);
    const radius = planetRadius(spec.radiusKm);
    const toSun = position.clone().negate().normalize();
    const holder = new THREE.Group();
    holder.position.copy(position);
    root.add(holder);
    const glow = kit.glow(spec.glow, radius * 6, { opacity: spec.id === "earth" ? 0.6 : 0.5 });
    root.add(glow);
    glow.position.copy(position);

    let frame = new THREE.Quaternion();
    let texture: THREE.Texture;
    if (spec.id === "earth") {
      texture = kit.canvasTexture(256, 128, paintEarth);
      // Same axial tilt as the `earth` level (anchored in earth-moon without rotation).
      frame = new THREE.Quaternion().setFromEuler(new THREE.Euler(11.48 * DEG, 2.05 * DEG, 20.16 * DEG, "XYZ"));
      earthGroup = holder;
      earthGlow = glow;
      earthRadius = radius;
    } else texture = kit.canvasTexture(256, 128, paintPlanet(spec.id));
    texture.wrapS = THREE.RepeatWrapping;
    const material = planetMaterial(kit, {
      map: texture,
      sun: toSun,
      night: spec.id === "mars" ? "#3a1f66" : "#2a1d6b",
      twilight: spec.id === "venus" ? "#ffb070" : "#ff8a5c",
      rimColor: spec.id === "earth" ? "#a6ddff" : spec.id === "venus" ? "#fff0c0" : spec.id === "mars" ? "#ffb08a" : "#e6ddff",
      rim: spec.id === "venus" || spec.id === "earth" ? 0.75 : 0.4,
    });
    const mesh = new THREE.Mesh(kit.geometry(new THREE.SphereGeometry(radius, 40, 20)), material);
    mesh.quaternion.copy(frame);
    holder.add(mesh);
    spinning.push({ mesh, material, toSun, frame });
    if (spec.id === "earth") {
      const atmosphere = new THREE.Mesh(
        kit.geometry(new THREE.SphereGeometry(radius * 1.12, 32, 16)),
        kit.halo("#5fb4ff", { opacity: 0.9, power: 2.2 }),
      );
      holder.add(atmosphere);
    }
    if (spec.id === "venus") {
      const haze = new THREE.Mesh(kit.geometry(new THREE.SphereGeometry(radius * 1.1, 32, 16)), kit.halo("#ffe0a0", { opacity: 0.7, power: 2 }));
      holder.add(haze);
    }
  }

  /* ---------------- Surroundings ---------------- */
  // The asteroid belt, 2.2 to 3.2 AU from the Sun, turning slowly.
  const belt = new THREE.Group();
  const random = rng(314);
  const beltPositions: number[] = [];
  const beltColors: number[] = [];
  const beltSizes: number[] = [];
  const beltPalette = ["#c9b28f", "#a896c8", "#d9c49c", "#8f82b8", "#e0cfae"].map((c) => new THREE.Color(c));
  const beltCount = kit.count(2600, 1200);
  for (let i = 0; i < beltCount; i++) {
    const a = random() * Math.PI * 2;
    const r = (2.7 + (random() + random() + random() - 1.5) * 0.36) * AU;
    beltPositions.push(Math.cos(a) * r, (random() - 0.5) * 0.3, Math.sin(a) * r);
    const c = beltPalette[Math.floor(random() * beltPalette.length)];
    beltColors.push(c.r, c.g, c.b);
    beltSizes.push(0.5 + Math.pow(random(), 3) * 1.8);
  }
  belt.add(kit.points(beltPositions, { size: 0.07, sizes: beltSizes, colors: beltColors, soft: 0.1, env: true, maxPx: 6 }));
  env.add(belt);

  const tmpV = new THREE.Vector3();
  let lastView = 12;

  return {
    root,
    env,
    update({ time }) {
      // The Sun breathes and its rays turn slowly.
      const pulse = 1 + Math.sin(time * 1.2) * 0.04;
      halo.scale.setScalar(SUN_R * 6 * pulse);
      core.scale.setScalar(SUN_R * 2.8 * (1 + Math.sin(time * 1.9) * 0.03));
      rayMaterial.rotation = time * 0.05;
      rayMaterial2.rotation = -time * 0.035;
      belt.rotation.y = time * 0.01;

      // Planets spin; keep the Sun on their lit side.
      spinning.forEach((planet, k) => {
        const spin = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), time * (0.15 + k * 0.03));
        planet.mesh.quaternion.copy(planet.frame).multiply(spin);
        tmpQ.copy(planet.mesh.quaternion).invert();
        planet.material.uniforms.uSun.value.copy(tmpV.copy(planet.toSun).applyQuaternion(tmpQ));
      });

      // Diving towards Earth: the enlarged Earth keeps a constant apparent size,
      // then shrinks smoothly (in log scale) to its true size, so the true-scale
      // Earth–Moon view takes over.
      const view = viewExtent(root);
      if (Math.abs(view - lastView) > 1e-6 && earthGroup && earthGlow) {
        lastView = view;
        const home = 12;
        const trueSize = 6.371e6 / UNIT / earthRadius;
        let s = view >= home ? 1 : view / home;
        const start = 2;
        const end = 0.12;
        if (view < start) {
          const t = Math.min(1, Math.log(start / view) / Math.log(start / end));
          s = Math.exp(Math.log(s) * (1 - t) + Math.log(trueSize) * t);
        }
        s = Math.max(trueSize, s);
        earthGroup.scale.setScalar(s);
        // A soft beacon of constant apparent size guides the dive, then hands over
        // to the Earth–Moon level's own glows.
        const beacon = view < home ? 0.13 * view : earthRadius * 6;
        earthGlow.scale.setScalar(Math.max(earthRadius * 6 * s, beacon));
        const fade = Math.min(1, Math.max(0, (view - 0.04) / 0.2));
        (earthGlow.material as THREE.SpriteMaterial).opacity = (view < home ? 0.75 : 0.6) * fade;
      }
    },
  };
};

export default innerSolarSystem;
