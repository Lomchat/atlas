/**
 * Earth and the Moon (1 unit = 77,000 km), everything at TRUE scale:
 * Earth is a 0.165-unit marble, the Moon a 0.045-unit pebble 5 units away.
 * Glows keep them findable. The Moon is shown at its farthest (apogee) on its
 * real elliptical orbit, where all the other planets fit side by side in the
 * gap: they are lined up there, at true scale, as translucent "ghosts".
 * A light pulse crosses the gap at the real speed of light for this scale
 * (1.35 s each way) and bounces back from the Moon.
 *
 * The `earth` level is drawn on top of the Earth here (same map, same Sun,
 * same axial tilt), so this scene only draws a matching base sphere and glow.
 */
import * as THREE from "three";
import { rng } from "../../../engine/kit";
import type { SceneBuilder } from "../types";
import { paintEarth } from "./earthMap";
import { SUN_EARTH, SUN_EARTH_MOON, planetMaterial } from "./shared";

const UNIT = 7.7e7; // metres per local unit
const EARTH_R = 6.371e6 / UNIT;
const MOON_R = 1.7374e6 / UNIT;
/** Apogee distance (405,500 km) and the orbit's semi-major axis and eccentricity. */
const MOON_D = 4.055e8 / UNIT;
const MOON_A = 3.844e8 / UNIT;
const MOON_E = 0.0549;
const GEO_R = 4.2164e7 / UNIT;
/** Light crosses Earth → Moon (at apogee) in about 1.35 s. */
const LIGHT_TIME = 1.35;
const DEG = Math.PI / 180;

/** Moon position on its orbit: to the right and slightly towards the viewer. */
export const MOON_ANGLE = 22.9 * DEG;

const earthMoon: SceneBuilder = ({ kit, children }) => {
  const root = new THREE.Group();
  const env = new THREE.Group();

  /* Earth: a base sphere matching the `earth` level drawn over it, plus a glow. */
  const earthChild = children.find((child) => child.id === "earth");
  const tilt = new THREE.Group();
  const r = earthChild?.rotate ?? [11.48, 2.05, 20.16];
  tilt.rotation.set(r[0] * DEG, r[1] * DEG, r[2] * DEG, "XYZ");
  root.add(tilt);
  const earthMap = kit.canvasTexture(512, 256, paintEarth);
  earthMap.wrapS = THREE.RepeatWrapping;
  const earth = new THREE.Mesh(
    kit.geometry(new THREE.SphereGeometry(EARTH_R, 48, 24)),
    planetMaterial(kit, { map: earthMap, sun: SUN_EARTH, night: "#2b1f73", rimColor: "#a6ddff", rim: 0.8 }),
  );
  tilt.add(earth);
  const earthGlow = kit.glow("#5fb4ff", EARTH_R * 9, { opacity: 0.55 });
  root.add(earthGlow);
  const earthHalo = kit.glow("#8fd0ff", EARTH_R * 3.2, { opacity: 0.7 });
  root.add(earthHalo);

  /* Geostationary satellites: a ring 36,000 km up, in the equatorial plane. */
  const geo = new THREE.Group();
  const random = rng(4);
  const satellites: number[] = [];
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2 + random() * 0.15;
    satellites.push(Math.cos(a) * GEO_R, 0, Math.sin(a) * GEO_R);
  }
  geo.add(kit.points(satellites, { size: 0.018, color: "#fff4c2", soft: 0.3, twinkle: 0.5, env: true, maxPx: 4 }));
  geo.add(kit.circle(GEO_R, { color: "#9fd8ff", width: 1, opacity: 0.25, env: true }));
  tilt.add(geo);

  /* The Moon's elliptical orbit (Earth at a focus), the Moon at apogee, and a trail showing its motion. */
  const orbitPoints: number[] = [];
  const orbitAt = (angle: number) => {
    const r = (MOON_A * (1 - MOON_E * MOON_E)) / (1 - MOON_E * Math.cos(angle - MOON_ANGLE));
    return [Math.cos(angle) * r, 0, Math.sin(angle) * r];
  };
  for (let i = 0; i <= 160; i++) orbitPoints.push(...orbitAt((i / 160) * Math.PI * 2));
  const orbit = kit.line(orbitPoints, { color: "#c9b3ff", width: 1.6, opacity: 0.55, dashed: true, dashSize: 0.16, gapSize: 0.12 });
  root.add(orbit);
  const trailArc: number[] = [];
  const trailArcColors: number[] = [];
  const lilac = new THREE.Color("#d9c8ff");
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    trailArc.push(...orbitAt(MOON_ANGLE + t * 30 * DEG));
    const fade = Math.pow(1 - t, 1.5);
    trailArcColors.push(lilac.r * fade, lilac.g * fade, lilac.b * fade);
  }
  const moonTrail = kit.line(trailArc, { width: 3, opacity: 0.9, env: true });
  (moonTrail.geometry as unknown as { setColors(c: number[]): void }).setColors(trailArcColors);
  (moonTrail.material as THREE.Material & { vertexColors: boolean }).vertexColors = true;
  moonTrail.material.blending = THREE.AdditiveBlending;
  env.add(moonTrail);
  const moonPosition = new THREE.Vector3(Math.cos(MOON_ANGLE) * MOON_D, 0, Math.sin(MOON_ANGLE) * MOON_D);
  const moonMap = kit.canvasTexture(256, 128, (g, w, h) => {
    g.fillStyle = "#cfc9e2";
    g.fillRect(0, 0, w, h);
    const spots = rng(21);
    // Dark maria, mostly on the near side (centred on u = 0.25).
    const maria = [
      [0.2, 0.32, 0.07, 0.06],
      [0.27, 0.38, 0.05, 0.08],
      [0.22, 0.5, 0.08, 0.07],
      [0.31, 0.3, 0.04, 0.05],
      [0.16, 0.44, 0.05, 0.05],
      [0.29, 0.58, 0.04, 0.04],
      [0.7, 0.35, 0.03, 0.03],
    ];
    g.fillStyle = "#958fb3";
    for (const [u, v, rx, ry] of maria) {
      g.beginPath();
      g.ellipse(u * w, v * h, rx * w, ry * h * 2, 0, 0, Math.PI * 2);
      g.fill();
    }
    for (let i = 0; i < 40; i++) {
      const x = spots() * w;
      const y = (0.15 + spots() * 0.7) * h;
      const s = 1 + spots() * 3;
      g.fillStyle = "#b3adcb";
      g.beginPath();
      g.arc(x, y, s, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#e6e1f5";
      g.beginPath();
      g.arc(x - s * 0.3, y - s * 0.3, s * 0.55, 0, Math.PI * 2);
      g.fill();
    }
  });
  // SphereGeometry puts u = 0.25 on +Z: turn +Z (the painted near side) towards Earth.
  const facing = new THREE.Object3D();
  facing.position.copy(moonPosition);
  facing.lookAt(0, 0, 0);
  const moonSun = SUN_EARTH_MOON.clone().applyQuaternion(facing.quaternion.clone().invert());
  const moon = new THREE.Mesh(
    kit.geometry(new THREE.SphereGeometry(MOON_R, 32, 16)),
    planetMaterial(kit, { map: moonMap, sun: moonSun, night: "#241c5c", twilight: "#ffb38a", rimColor: "#ffffff", rim: 0.4 }),
  );
  moon.position.copy(moonPosition);
  moon.quaternion.copy(facing.quaternion);
  root.add(moon);
  const moonGlow = kit.glow("#e9e2ff", MOON_R * 14, { opacity: 0.5 });
  moonGlow.position.copy(moonPosition);
  root.add(moonGlow);

  /* A pulse of light going to the Moon and back, at the true speed of light for this scale. */
  const beam = kit.line([0, 0, 0, moonPosition.x, 0, moonPosition.z], {
    color: "#9ff3ff",
    width: 1.2,
    opacity: 0.3,
    env: true,
    dashed: true,
    dashSize: 0.05,
    gapSize: 0.09,
  });
  env.add(beam);
  const pulse = new THREE.Group();
  pulse.add(kit.glow("#b8fbff", 0.34, { opacity: 0.95, env: true }));
  pulse.add(kit.glow("#ffffff", 0.1, { opacity: 1, env: true }));
  // The pulse passes through the ghost planets: always drawn on top.
  pulse.children.forEach((child) => ((child as THREE.Sprite).material.depthTest = false, (child.renderOrder = 10)));
  env.add(pulse);
  const trailCount = 14;
  const trailPositions = new Float32Array(trailCount * 3);
  const trailSizes = Array.from({ length: trailCount }, (_, i) => 1 - i / trailCount);
  const trail = kit.points(trailPositions, { size: 0.09, sizes: trailSizes, color: "#9ff3ff", soft: 0.8, additive: true, env: true });
  (trail.material as THREE.ShaderMaterial).depthTest = false;
  trail.renderOrder = 10;
  env.add(trail);
  const trailAttribute = trail.geometry.getAttribute("position") as THREE.BufferAttribute;
  const flash = kit.glow("#b8fbff", 0.5, { opacity: 0 });
  flash.position.copy(moonPosition);
  env.add(flash);

  /* All the other planets, at true scale, side by side in the gap. */
  const lineup = new THREE.Group();
  env.add(lineup);
  const planets = [
    { id: "mercury", km: 4879, color: "#b9aecf", bands: ["#9d91b8", "#d6cde6"] },
    { id: "venus", km: 12104, color: "#f4d68f", bands: ["#f7e2a6", "#e9c27a"] },
    { id: "mars", km: 6779, color: "#e46a3d", bands: ["#b8492f", "#f08a55"] },
    { id: "jupiter", km: 139820, color: "#e9b98a", bands: ["#f6e0c0", "#c98a5e", "#e8a36e", "#fff0da"] },
    { id: "saturn", km: 116460, color: "#f1d79a", bands: ["#f8e7bd", "#dcb876", "#efd08f"] },
    { id: "uranus", km: 50724, color: "#8fe9f0", bands: ["#a6f1f5", "#7fdce6"] },
    { id: "neptune", km: 49244, color: "#4f7dff", bands: ["#6f96ff", "#3f63e0"] },
  ];
  const diameters = planets.map((p) => (p.km * 1000) / UNIT);
  const gap = (MOON_D - EARTH_R - MOON_R - diameters.reduce((a, b) => a + b, 0)) / (planets.length + 1);
  const along = moonPosition.clone().normalize();
  let cursor = EARTH_R + gap;
  planets.forEach((planet, k) => {
    const radius = diameters[k] / 2;
    const texture = kit.canvasTexture(128, 64, (g, w, h) => {
      g.fillStyle = planet.color;
      g.fillRect(0, 0, w, h);
      const r = rng(k + 40);
      const stripes = planet.id === "jupiter" || planet.id === "saturn" ? 9 : 3;
      for (let i = 0; i < stripes; i++) {
        g.fillStyle = planet.bands[i % planet.bands.length];
        const y = (0.12 + (i / stripes) * 0.8 + r() * 0.04) * h;
        g.fillRect(0, y, w, (0.03 + r() * 0.06) * h);
      }
      if (planet.id === "jupiter") {
        g.fillStyle = "#e0673c";
        g.beginPath();
        g.ellipse(w * 0.3, h * 0.62, w * 0.06, h * 0.06, 0, 0, Math.PI * 2);
        g.fill();
      }
    });
    const mesh = new THREE.Mesh(
      kit.geometry(new THREE.SphereGeometry(radius, 40, 20)),
      planetMaterial(kit, { map: texture, sun: SUN_EARTH_MOON, rimColor: "#ffffff", rim: 0.55, opacity: 0.82, env: true }),
    );
    mesh.position.copy(along).multiplyScalar(cursor + radius);
    mesh.renderOrder = 2;
    lineup.add(mesh);
    if (planet.id === "saturn") {
      const ring = new THREE.Mesh(
        kit.geometry(new THREE.RingGeometry(radius * 1.24, radius * 2.1, 64)),
        kit.flat("#f3dfae", { env: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false }),
      );
      ring.position.copy(mesh.position);
      // Perpendicular to the line so it does not overlap its neighbours, opened a little towards us.
      ring.lookAt(mesh.position.clone().add(along));
      ring.rotateY(-28 * DEG);
      ring.rotateX(12 * DEG);
      ring.renderOrder = 3;
      lineup.add(ring);
    }
    cursor += diameters[k] + gap;
  });


  const direction = moonPosition.clone().normalize();
  const alongLine = (s: number, target: THREE.Vector3) => target.copy(direction).multiplyScalar(Math.max(0, Math.min(MOON_D, s)));
  const tmp = new THREE.Vector3();

  return {
    root,
    env,
    update({ time }) {
      geo.rotation.y = time * 0.05;
      const cycle = 5.5;
      const t = time % cycle;
      const speed = MOON_D / LIGHT_TIME;
      let s = -1;
      let sign = 1;
      if (t < LIGHT_TIME) s = t * speed;
      else if (t < 2 * LIGHT_TIME) (s = MOON_D - (t - LIGHT_TIME) * speed), (sign = -1);
      pulse.visible = s >= 0;
      trail.visible = s >= 0;
      if (s >= 0) {
        alongLine(s, pulse.position);
        for (let i = 0; i < trailCount; i++) {
          alongLine(s - sign * i * 0.07, tmp);
          trailAttribute.setXYZ(i, tmp.x, tmp.y, tmp.z);
        }
        trailAttribute.needsUpdate = true;
      }
      const sinceBounce = t - LIGHT_TIME;
      (flash.material as THREE.SpriteMaterial).opacity =
        sinceBounce > -0.05 && sinceBounce < 0.8 ? Math.max(0, 1 - Math.abs(sinceBounce) / 0.8) * 0.9 * kit.envUniform.value : 0;
      const breathe = 1 + Math.sin(time * 1.3) * 0.04;
      earthGlow.scale.setScalar(EARTH_R * 9 * breathe);
      moonGlow.scale.setScalar(MOON_R * 14 * (1 + Math.sin(time * 1.1 + 1) * 0.05));
    },
  };
};

export default earthMoon;
