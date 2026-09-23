/**
 * A region seen from high above (1 unit = 30 km, 300 km across): a flat,
 * illustrated map of patchwork fields, rounded forests, a meandering river,
 * a reservoir lake, towns and roads. Popcorn cumulus clouds float at their
 * real heights (1.5–3 km) with their shadows, and an airliner at 10 km
 * draws a contrail, all in `env`. The river is drawn wider than life.
 *
 * Seen from the globe only the core disc shows, its edges fading into the
 * painted continent; once inside, the map extends to the horizon haze.
 * The river passes through the landscape anchor in the same direction as the
 * landscape's own river, and a small town sits where the landscape's town is.
 */
import * as THREE from "three";
import { rng } from "../../../engine/kit";
import type { SceneBuilder } from "../types";
import { LANDSCAPE_ANCHOR, LANDSCAPE_SCALE, LANDSCAPE_TOWN, RIVER_HEADING } from "./geography";
import {
  FlatBuilder,
  blobOutline,
  distanceToPolyline,
  groundMaterial,
  groundMesh,
  insideOutline,
  smoothLine,
  softDiscTexture,
} from "./shared";

const CORE: [number, number] = [3.9, 5.6];
const FAR: [number, number] = [10.5, 15.5];
const EDGE = 15.5;

const region: SceneBuilder = ({ kit }) => {
  const root = new THREE.Group();
  const env = new THREE.Group();
  const random = rng(2024);
  const [ax, , az] = LANDSCAPE_ANCHOR;

  /* ---------------- Geography ---------------- */
  const [hx, hz] = RIVER_HEADING;
  const riverControl: [number, number][] = [
    [-16, -7.6],
    [-12, -5.4],
    [-9, -5.9],
    [-6.2, -3.6],
    [-3.6, -2.8],
    [-1.6, -0.9],
    [ax - hx * 0.9, az - hz * 0.9],
    [ax, az],
    [ax + hx * 0.9, az + hz * 0.9],
    [3.3, 2.7],
    [5.6, 2.3],
    [8.2, 4.3],
    [11.4, 5.4],
    [16, 6.2],
  ];
  const base = smoothLine(riverControl, 700);
  // Meanders, calmer near the landscape so both rivers agree.
  const river: number[] = [];
  let travelled = 0;
  for (let i = 0; i < base.length / 2; i++) {
    const x = base[i * 2];
    const z = base[i * 2 + 1];
    if (i > 0) travelled += Math.hypot(x - base[i * 2 - 2], z - base[i * 2 - 1]);
    const j = Math.min(base.length / 2 - 1, i + 1);
    const k = Math.max(0, i - 1);
    let tx = base[j * 2] - base[k * 2];
    let tz = base[j * 2 + 1] - base[k * 2 + 1];
    const len = Math.hypot(tx, tz) || 1;
    tx /= len;
    tz /= len;
    const calm = Math.min(1, Math.hypot(x - ax, z - az) / 0.9);
    const wiggle =
      (Math.sin(travelled * 5.3) * 0.055 * (0.6 + 0.4 * Math.sin(travelled * 1.13)) + Math.sin(travelled * 2.2 + 1) * 0.06) * calm;
    river.push(x + tz * wiggle, z - tx * wiggle);
  }
  const tributary = smoothLine(
    [
      [-7, 9],
      [-5.6, 6.6],
      [-4.4, 5.2],
      [-3.4, 3.1],
      [-3.1, 2.4],
    ],
    160,
  );
  const lake = blobOutline(-3.3, 1.9, 0.48, 7, 0.35, 48, 1.7, -0.5);

  const towns: { x: number; z: number; r: number; big?: boolean }[] = [
    { x: 3.7, z: -2.0, r: 0.36, big: true },
    { x: -2.7, z: -1.4, r: 0.17 },
    { x: 2.3, z: 2.9, r: 0.16 },
    { x: -1.1, z: 3.3, r: 0.13 },
    { x: 4.6, z: 1.1, r: 0.14 },
    { x: -4.3, z: -3.4, r: 0.18 },
    { x: 1.4, z: -3.8, r: 0.12 },
    { x: -5.4, z: 3.1, r: 0.15 },
    { x: 6.6, z: -3.6, r: 0.2 },
    { x: -7.6, z: -0.4, r: 0.22 },
    { x: 8.6, z: 2.2, r: 0.18 },
    { x: -0.2, z: -6.8, r: 0.25 },
    { x: 1.8, z: 7.4, r: 0.2 },
    { x: -9.5, z: 6.2, r: 0.2 },
    { x: 10.5, z: -6.5, r: 0.28 },
    // The landscape's own small town.
    { x: ax + LANDSCAPE_TOWN.x * LANDSCAPE_SCALE, z: az + LANDSCAPE_TOWN.z * LANDSCAPE_SCALE, r: 0.03 },
  ];
  const forests = [
    { x: -1.6, z: 1.3, r: 0.75, seed: 1 },
    { x: 2.7, z: -0.3, r: 0.55, seed: 2 },
    { x: -4.6, z: 0.2, r: 0.95, seed: 3 },
    { x: 0.6, z: -2.3, r: 0.6, seed: 4 },
    { x: 4.1, z: 3.6, r: 0.7, seed: 5 },
    { x: -0.3, z: 4.4, r: 0.5, seed: 6 },
    { x: -2.2, z: -3.6, r: 0.7, seed: 7 },
    { x: 5.8, z: -1.2, r: 0.6, seed: 8 },
    { x: -6.6, z: -3.2, r: 1.2, seed: 9 },
    { x: 7.4, z: 5.6, r: 1.1, seed: 10 },
    { x: -8.4, z: 3.4, r: 1.3, seed: 11 },
    { x: 9.4, z: -2.4, r: 1.1, seed: 12 },
    { x: 2.4, z: -6.2, r: 1.2, seed: 13 },
    { x: -3.2, z: 7.4, r: 1.2, seed: 14 },
    { x: -11.4, z: -4.4, r: 1.6, seed: 15 },
    { x: 12, z: 1.4, r: 1.5, seed: 16 },
    { x: -0.8, z: 10.2, r: 1.6, seed: 17 },
    { x: 5.2, z: -9.6, r: 1.8, seed: 18 },
    // The landscape's forest, north-west of its town.
    { x: ax - 0.08, z: az - 0.09, r: 0.05, seed: 19 },
  ];
  const forestOutlines = forests.map((f) => blobOutline(f.x, f.z, f.r, f.seed * 13, 0.45, 40, 1.25, f.seed));
  const inForest = (x: number, z: number) =>
    forests.some((f, k) => Math.hypot(x - f.x, z - f.z) < f.r * 1.9 && insideOutline(forestOutlines[k], x, z));
  const inTown = (x: number, z: number, margin = 0) => towns.some((t) => Math.hypot(x - t.x, z - t.z) < t.r + margin);

  /* ---------------- Ground layers ---------------- */
  const placed = new Set<string>();
  const layer = (builder: FlatBuilder, index: number) => {
    const mesh = groundMesh(builder.build(kit), groundMaterial(kit, { core: CORE, far: FAR, layer: index, vertexColors: true }), index);
    root.add(mesh);
    return mesh;
  };

  // 1. Base: soft meadow green.
  const baseLayer = new FlatBuilder();
  baseLayer.ellipse(0, 0, EDGE, EDGE, "#68bd57", 96);
  layer(baseLayer, 1);

  // 2. Patchwork of fields: tidy blocks with a shared orientation and palette per farming area.
  const fields = new FlatBuilder();
  const palettes = [
    ["#e8cd68", "#f1d97c", "#c9d466", "#abd062", "#e2c25e"],
    ["#7fcf5d", "#90d865", "#6ec358", "#a4da6b", "#86cc5c"],
    ["#b6d45f", "#e3d27a", "#8ccf5d", "#d4bb70", "#9fd662"],
  ];
  const areas: { x: number; z: number; angle: number; palette: string[] }[] = [];
  for (let i = 0; i < 26; i++) {
    const a = random() * Math.PI * 2;
    const d = Math.sqrt(random()) * EDGE;
    areas.push({ x: Math.cos(a) * d, z: Math.sin(a) * d, angle: (random() - 0.5) * 1.2, palette: palettes[i % palettes.length] });
  }
  const areaOf = (x: number, z: number) => {
    let best = areas[0];
    let bestD = Infinity;
    for (const area of areas) {
      const d = Math.hypot(x - area.x, z - area.z);
      if (d < bestD) (bestD = d), (best = area);
    }
    return best;
  };
  const cellW = 0.4;
  const cellD = 0.29;
  for (let gx = -EDGE; gx <= EDGE; gx += 0.33) {
    for (let gz = -EDGE; gz <= EDGE; gz += 0.33) {
      const area = areaOf(gx, gz);
      const c = Math.cos(area.angle);
      const s = Math.sin(area.angle);
      // Snap the field to its area's rotated grid so neighbours line up.
      const u = gx * c + gz * s;
      const v = -gx * s + gz * c;
      const cu = (Math.floor(u / cellW) + 0.5) * cellW;
      const cv = (Math.floor(v / cellD) + 0.5) * cellD;
      const key = `${Math.floor(u / cellW)},${Math.floor(v / cellD)},${areas.indexOf(area)}`;
      if (placed.has(key)) continue;
      placed.add(key);
      const cx = cu * c - cv * s;
      const cz = cu * s + cv * c;
      if (Math.hypot(cx, cz) > EDGE - 0.3 || areaOf(cx, cz) !== area) continue;
      if (inForest(cx, cz) || inTown(cx, cz, 0.06) || insideOutline(lake, cx, cz)) continue;
      if (distanceToPolyline(river, cx, cz) < 0.16) continue;
      if (random() < 0.18) continue;
      // Some fields are two cells long.
      let hw = cellW / 2 - 0.02;
      let shift = 0;
      if (random() < 0.3) {
        const next = `${Math.floor(u / cellW) + 1},${Math.floor(v / cellD)},${areas.indexOf(area)}`;
        if (!placed.has(next)) placed.add(next), (hw += cellW / 2), (shift = cellW / 2);
      }
      const hd = cellD / 2 - 0.02;
      const corners = [
        [-hw, -hd],
        [hw, -hd],
        [hw, hd],
        [-hw, hd],
      ].flatMap(([pu, pv]) => [cx + (pu + shift) * c - pv * s, cz + (pu + shift) * s + pv * c]);
      fields.polygon(corners, area.palette[Math.floor(random() * area.palette.length)]);
    }
  }
  layer(fields, 2);

  // 3. Forests: a dark rounded canopy with a lighter sunlit inner shape.
  const woods = new FlatBuilder();
  for (const outline of forestOutlines) woods.polygon(outline, "#2e8a4e");
  layer(woods, 3);
  const woodLight = new FlatBuilder();
  forests.forEach((f) => {
    const inner = blobOutline(f.x - f.r * 0.08, f.z - f.r * 0.08, f.r * 0.72, f.seed * 13, 0.45, 40, 1.25, f.seed);
    woodLight.polygon(inner, "#3aa45a");
  });
  layer(woodLight, 4);

  // 4. Roads between towns, and the towns themselves.
  const roads = new FlatBuilder();
  const link = (a: (typeof towns)[number], b: (typeof towns)[number], width: number, color: string) => {
    const mx = (a.x + b.x) / 2 + (random() - 0.5) * 0.6;
    const mz = (a.z + b.z) / 2 + (random() - 0.5) * 0.6;
    roads.ribbon(
      smoothLine(
        [
          [a.x, a.z],
          [mx, mz],
          [b.x, b.z],
        ],
        40,
      ),
      width,
      color,
    );
  };
  const main = towns[0];
  for (let i = 1; i < towns.length - 1; i++) {
    const t = towns[i];
    let nearest = main;
    let best = Infinity;
    for (let j = 0; j < towns.length - 1; j++) {
      if (j === i) continue;
      const d = Math.hypot(towns[j].x - t.x, towns[j].z - t.z);
      if (d < best && (j < i || d < 2.5)) (best = d), (nearest = towns[j]);
    }
    link(t, nearest, 0.028, "#fff1d2");
  }
  // A motorway sweeping across the region.
  roads.ribbon(
    smoothLine(
      [
        [-16, 3.4],
        [-9, 1.6],
        [-4.6, -1.8],
        [0, -3.0],
        [3.7, -2.0],
        [8, -0.3],
        [16, -1.6],
      ],
      220,
    ),
    0.04,
    "#fff7e6",
  );
  const landscapeTown = towns[towns.length - 1];
  link(landscapeTown, towns[0], 0.022, "#fff1d2");
  layer(roads, 5);

  const townLayer = new FlatBuilder();
  const roofs = new FlatBuilder();
  towns.forEach((t, k) => {
    townLayer.blob(t.x, t.z, t.r * 1.35, "#f6e3cf", 100 + k, 0.35, 28);
    if (t.big) roofs.blob(t.x + 0.03, t.z - 0.02, t.r * 0.55, "#dccbe0", 200 + k, 0.3, 24);
    const count = Math.round(10 + t.r * 120);
    for (let i = 0; i < count; i++) {
      const a = random() * Math.PI * 2;
      const d = Math.sqrt(random()) * t.r * 1.1;
      const size = Math.max(0.012, t.r * (0.05 + random() * 0.06));
      roofs.ellipse(t.x + Math.cos(a) * d, t.z + Math.sin(a) * d, size, size * 0.7, random() < 0.7 ? "#f07f55" : "#c98bb0", 6, random());
    }
  });
  // Villages dotted between the fields.
  for (let i = 0; i < 90; i++) {
    const a = random() * Math.PI * 2;
    const d = Math.sqrt(random()) * (EDGE - 1);
    const x = Math.cos(a) * d;
    const z = Math.sin(a) * d;
    if (inForest(x, z) || insideOutline(lake, x, z) || distanceToPolyline(river, x, z) < 0.1) continue;
    if (Math.hypot(x - ax, z - az) < 0.15) continue;
    townLayer.blob(x, z, 0.045 + random() * 0.035, "#f6e3cf", 300 + i, 0.3, 12);
    roofs.ellipse(x, z, 0.018, 0.014, "#f07f55", 6, random());
  }
  layer(townLayer, 6);
  layer(roofs, 7);

  // 5. Water: pale banks, then the river, its tributary and the lake.
  // Narrower near the landscape, so its own (true-width) river takes over smoothly.
  const nearAnchor = (i: number) => {
    const d = Math.hypot(river[i * 2] - ax, river[i * 2 + 1] - az);
    const t = Math.min(1, Math.max(0, (d - 0.1) / 1.9));
    return t * t * (3 - 2 * t);
  };
  const taper = (_t: number, i: number): [number, number] => {
    const w = 0.0375 * (0.12 + 0.88 * nearAnchor(i));
    return [w, w];
  };
  const bankTaper = (_t: number, i: number): [number, number] => {
    const k = nearAnchor(i);
    const w = 0.0375 * (0.12 + 0.88 * k) + 0.02 * (0.3 + 0.7 * k);
    return [w, w];
  };
  const banks = new FlatBuilder();
  banks.ribbon(river, bankTaper, "#bfe6ff");
  banks.ribbon(tributary, 0.06, "#bfe6ff");
  banks.polygon(blobOutline(-3.3, 1.9, 0.54, 7, 0.35, 48, 1.7, -0.5), "#bfe6ff");
  layer(banks, 8);
  const water = new FlatBuilder();
  water.ribbon(river, taper, "#2f8df0");
  water.ribbon(tributary, 0.032, "#2f8df0");
  water.polygon(lake, "#2f8df0");
  water.polygon(blobOutline(-3.36, 1.84, 0.3, 7, 0.35, 40, 1.7, -0.5), "#3aa0ff");
  layer(water, 9);

  /* ---------------- Surroundings: clouds, glints, an airliner ---------------- */
  const puff = kit.geometry(new THREE.IcosahedronGeometry(1, 1));
  const cloudMaterial = kit.toon("#ffffff", { env: true, shadow: "#aeb9f0", rim: 0.3, rimColor: "#ffffff", gloss: 0.08, soft: 0.4 });
  const shadowTexture = softDiscTexture(kit, "24,28,90");
  const shadowMaterial = kit.textured(shadowTexture, { env: true, flat: 1, rim: 0, gloss: 0, opacity: 0.2, depthWrite: false });
  const maxPuffs = kit.count(900, 420);
  const puffs = new THREE.InstancedMesh(puff, cloudMaterial, maxPuffs);
  const shadows = new THREE.InstancedMesh(kit.geometry(new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2)), shadowMaterial, kit.count(200, 100));
  puffs.renderOrder = 30;
  shadows.renderOrder = 20;
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const pos = new THREE.Vector3();
  let puffCount = 0;
  let shadowCount = 0;
  const clouds: { x: number; z: number; y: number; first: number; count: number; shadow: number; phase: number }[] = [];
  const offsets: { dx: number; dy: number; dz: number; s: THREE.Vector3 }[] = [];
  // Cumulus come in fields, with clear sky between them.
  // The first field sits under the "clouds" hotspot.
  const cloudFields: [number, number, number][] = [[2.2, 1.7, 0.75]];
  for (let i = 0; i < 11; i++) {
    const a = random() * Math.PI * 2;
    const d = 1.5 + Math.sqrt(random()) * 10;
    cloudFields.push([Math.cos(a) * d, Math.sin(a) * d, 0.9 + random() * 1.4]);
  }
  for (let tries = 0; tries < 800 && shadowCount < Math.min(shadows.count, kit.count(120, 60)); tries++) {
    const [fx, fz, fr] = cloudFields[tries % cloudFields.length];
    const a = random() * Math.PI * 2;
    const d = Math.sqrt(random()) * fr;
    const x = fx + Math.cos(a) * d * 1.3;
    const z = fz + Math.sin(a) * d;
    // Keep the sky clear right above the landscape we dive into.
    if (Math.hypot(x - ax, z - az) < 0.55) continue;
    const size = 0.07 + Math.pow(random(), 1.6) * 0.15;
    const y = 0.05 + random() * 0.04 + size * 0.3;
    const n = 4 + Math.floor(random() * 4);
    if (puffCount + n + 1 > maxPuffs) break;
    const first = puffCount;
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0 : i / (n - 1) - 0.5;
      const r = size * (0.5 + 0.45 * Math.sin(Math.PI * (i / Math.max(1, n - 1))) + random() * 0.15);
      offsets.push({ dx: t * size * 2.2, dy: r * 0.35, dz: (random() - 0.5) * size * 0.8, s: new THREE.Vector3(r, r * 0.85, r * 0.9) });
      puffCount++;
    }
    offsets.push({ dx: 0, dy: 0, dz: 0, s: new THREE.Vector3(size * 1.4, size * 0.3, size * 0.7) });
    puffCount++;
    const shadow = shadowCount++;
    clouds.push({ x, z, y, first, count: n + 1, shadow, phase: random() * 10 });
  }
  puffs.count = puffCount;
  shadows.count = shadowCount;
  env.add(shadows, puffs);

  // Glints twinkling on the water.
  const glints: number[] = [];
  for (let i = 0; i < 70; i++) {
    const k = Math.floor(random() * (river.length / 2));
    glints.push(river[k * 2] + (random() - 0.5) * 0.03, 0.004, river[k * 2 + 1] + (random() - 0.5) * 0.03);
  }
  for (let i = 0; i < 25; i++) {
    const a = random() * Math.PI * 2;
    const d = Math.sqrt(random()) * 0.35;
    glints.push(-3.3 + Math.cos(a) * d * 1.5, 0.004, 1.9 + Math.sin(a) * d * 0.7);
  }
  const glint = kit.points(glints, { size: 0.05, color: "#eaffff", soft: 0.6, twinkle: 1, env: true, additive: true, maxPx: 6 });
  glint.renderOrder = 25;
  env.add(glint);

  // An airliner at 10 km, drawing a contrail.
  const trailCount = 60;
  const trailPositions = new Float32Array(trailCount * 3);
  const trailSizes = Array.from({ length: trailCount }, (_, i) => 0.25 + 0.75 * Math.pow(i / trailCount, 0.7));
  const contrail = kit.points(trailPositions, { size: 0.045, sizes: trailSizes, color: "#ffffff", soft: 0.7, opacity: 0.8, env: true });
  contrail.renderOrder = 45;
  const trailAttribute = contrail.geometry.getAttribute("position") as THREE.BufferAttribute;
  const plane = kit.glow("#ffffff", 0.09, { opacity: 0.95, env: true });
  plane.renderOrder = 46;
  env.add(contrail, plane);

  const placeClouds = (time: number) => {
    for (const cloud of clouds) {
      const drift = Math.sin(time * 0.05 + cloud.phase) * 0.12;
      const cx = cloud.x + drift;
      const cz = cloud.z + drift * 0.3;
      for (let i = 0; i < cloud.count; i++) {
        const o = offsets[cloud.first + i];
        const breathe = 1 + Math.sin(time * 0.6 + cloud.phase + i) * 0.03;
        m.compose(pos.set(cx + o.dx, cloud.y + o.dy, cz + o.dz), q.identity(), scale.copy(o.s).multiplyScalar(breathe));
        puffs.setMatrixAt(cloud.first + i, m);
      }
      // The Sun is in the west-south-west, about 37° high: shadows fall east.
      const size = offsets[cloud.first + cloud.count - 1].s.x;
      m.compose(pos.set(cx + cloud.y * 1.3, 0.002, cz - cloud.y * 0.15), q.identity(), scale.set(size * 1.1, 1, size * 0.55));
      shadows.setMatrixAt(cloud.shadow, m);
    }
    puffs.instanceMatrix.needsUpdate = true;
    shadows.instanceMatrix.needsUpdate = true;
  };
  placeClouds(0);

  const heading = new THREE.Vector3(0.93, 0, -0.37).normalize();
  const flight = (t: number, target: THREE.Vector3) => {
    const s = ((t * 0.35) % 34) - 17;
    return target.set(-2 + heading.x * s, 0.34, -3.5 + heading.z * s);
  };
  const tmp = new THREE.Vector3();

  return {
    root,
    env,
    update({ time }) {
      placeClouds(time);
      flight(time, plane.position);
      for (let i = 0; i < trailCount; i++) {
        flight(time - (trailCount - i) * 0.09, tmp);
        if (tmp.distanceTo(plane.position) > 3.5) tmp.copy(plane.position);
        trailAttribute.setXYZ(i, tmp.x, tmp.y, tmp.z);
      }
      trailAttribute.needsUpdate = true;
    },
  };
};

export default region;
