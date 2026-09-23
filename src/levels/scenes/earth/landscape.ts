/**
 * The landscape around the park (1 unit = 500 m, 5 km across): a painted
 * patchwork of fields with crop rows, a meandering river with sand bars on
 * the inside of its bends and flowing water, a forest of little trees, a
 * small riverside town with its church and station, a railway with a train,
 * wind turbines, and the green park where the home `park` diorama sits.
 *
 * Trees and houses are drawn about three times larger than life so they stay
 * readable; near the park they return to true size, so the 40 m park diorama
 * fits in naturally when diving. Wind turbines (150 m) are at true scale.
 */
import * as THREE from "three";
import { rng } from "../../../engine/kit";
import type { SceneBuilder } from "../types";
import { LANDSCAPE_FOREST, LANDSCAPE_RIVER, LANDSCAPE_TOWN, PARK_ANCHOR } from "./geography";
import {
  FlatBuilder,
  STANDING,
  blobOutline,
  distanceToPolyline,
  groundMaterial,
  groundMesh,
  insideOutline,
  smoothLine,
  softDiscTexture,
} from "./shared";

const CORE: [number, number] = [4.3, 5.7];
const FAR: [number, number] = [10.5, 15.5];
const EDGE = 15.5;
const DEG = Math.PI / 180;

const PALETTES = [
  ["#f0cf62", "#f5dc7a", "#e6c357", "#f2d46c"],
  ["#8fd663", "#7fcf5d", "#a2dc6c", "#76c75a"],
  ["#c8d864", "#b5d15e", "#dccf6e", "#d9b774"],
  ["#ffe45c", "#8fd663", "#d6a56a", "#b9dd6a"],
];

const flowVertex = /* glsl */ `
varying vec2 vUv;
varying vec2 vXZ;
void main() {
  vUv = uv;
  vXZ = position.xz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const flowFragment = /* glsl */ `
uniform sampler2D map;
uniform float uTime;
uniform float uEnv;
uniform vec2 uCore;
uniform vec2 uFar;
uniform vec3 uWater;
uniform vec3 uDeep;
uniform vec3 uLight;
varying vec2 vUv;
varying vec2 vXZ;
void main() {
  float across = abs(vUv.y - 0.5) * 2.0;
  vec3 col = mix(uDeep, uWater, smoothstep(0.1, 0.95, across));
  float streak = texture2D(map, vec2(vUv.x * 1.4 - uTime * 0.12, vUv.y)).a;
  float streak2 = texture2D(map, vec2(vUv.x * 0.9 - uTime * 0.07 + 0.37, 1.0 - vUv.y)).a;
  col = mix(col, uLight, max(streak, streak2 * 0.7) * 0.75);
  float r = length(vXZ);
  float a = max(1.0 - smoothstep(uCore.x, uCore.y, r), uEnv * (1.0 - smoothstep(uFar.x, uFar.y, r)));
  gl_FragColor = vec4(col, a);
}`;

const landscape: SceneBuilder = ({ kit, children }) => {
  const root = new THREE.Group();
  const env = new THREE.Group();
  const random = rng(5000);
  const parkChild = children.find((child) => child.id === "park");
  const [px, , pz] = parkChild?.at ?? PARK_ANCHOR;
  // Near the park, things return to (almost) true size so the diorama fits in when diving.
  const nearParkScale = (x: number, z: number, near = 0.35) => {
    const d = Math.hypot(x - px, z - pz);
    const t = Math.min(1, Math.max(0, (d - 0.45) / 1.4));
    return near + (1 - near) * t * t * (3 - 2 * t);
  };

  /* ---------------- Geography ---------------- */
  const river = smoothLine(LANDSCAPE_RIVER, 900);
  const riverWidth = 0.13;
  const town = LANDSCAPE_TOWN;
  const townOutline = blobOutline(town.x, town.z, town.r, 41, 0.28, 48, 1.15, 0.4);
  const inTown = (x: number, z: number) => Math.hypot(x - town.x, z - town.z) < town.r * 1.6 && insideOutline(townOutline, x, z);
  const PARK_R = 0.5;
  const inPark = (x: number, z: number, margin = 0) => Math.hypot(x - px, z - pz) < PARK_R + margin;
  const rail = smoothLine(
    [
      [-16, 4.8],
      [-9, 3.6],
      [-3.5, 2.4],
      [1, 1.65],
      [5, 1.15],
      [9.5, 0.1],
      [16, -1.4],
    ],
    500,
  );
  const woods = [
    { ...LANDSCAPE_FOREST, seed: 3 },
    { x: -1.6, z: 3.9, r: 0.75, seed: 5 },
    { x: 4.5, z: 4.9, r: 0.8, seed: 6 },
    { x: 7.8, z: -6.2, r: 1.5, seed: 7 },
    { x: -9.5, z: -0.8, r: 2.1, seed: 8 },
    { x: 9, z: 7.4, r: 1.9, seed: 9 },
    { x: -6.5, z: 8.6, r: 1.6, seed: 10 },
    { x: 1.5, z: -8.4, r: 2, seed: 11 },
    { x: 12.3, z: 1.2, r: 1.4, seed: 12 },
    { x: -12.5, z: 5.5, r: 1.5, seed: 13 },
    { x: -2.2, z: -10.5, r: 1.8, seed: 14 },
  ];
  const woodOutlines = woods.map((w) => blobOutline(w.x, w.z, w.r, w.seed * 7, 0.42, 44, 1.2, w.seed));
  const inWood = (x: number, z: number) =>
    woods.some((w, k) => Math.hypot(x - w.x, z - w.z) < w.r * 1.7 && insideOutline(woodOutlines[k], x, z));
  const village = { x: -8.3, z: 4.4, r: 0.55 };
  const inVillage = (x: number, z: number) => Math.hypot(x - village.x, z - village.z) < village.r;
  const turbines: [number, number][] = [
    [6.1, -3.1],
    [7.0, -2.35],
    [7.9, -1.6],
  ];

  const roadLines = [
    // Main road: west over the river, through the town, east.
    smoothLine(
      [
        [-16, -1.4],
        [-8, -1.9],
        [-2.6, -0.6],
        [0.6, -0.2],
        [2.2, -0.9],
        [3.4, -1.1],
        [6, -0.2],
        [10, -1.8],
        [16, -2.6],
      ],
      400,
    ),
    // North road through the forest's edge.
    smoothLine(
      [
        [3.3, -1.3],
        [2.4, -4],
        [0.3, -7],
        [-0.4, -16],
      ],
      200,
    ),
    // South-west lane to the village.
    smoothLine(
      [
        [1.4, 0.9],
        [-1.2, 2.2],
        [-4.8, 3.4],
        [-8.3, 4.4],
        [-12, 8],
        [-14, 12],
      ],
      300,
    ),
    // South road over the railway.
    smoothLine(
      [
        [3.9, 0.2],
        [4.2, 2.2],
        [3.2, 6],
        [4.4, 11],
        [3.8, 16],
      ],
      220,
    ),
    // Farm lanes.
    smoothLine(
      [
        [-2.6, -0.6],
        [-3.8, 1.4],
        [-6.6, 1.8],
      ],
      80,
    ),
    smoothLine(
      [
        [6, -0.2],
        [8.4, 2.4],
        [11.5, 3.2],
      ],
      80,
    ),
  ];
  const nearRoad = (x: number, z: number, margin: number) => roadLines.some((line) => distanceToPolyline(line, x, z) < margin);

  /* ---------------- Painted ground ---------------- */
  const layer = (builder: FlatBuilder, index: number) => {
    const mesh = groundMesh(builder.build(kit), groundMaterial(kit, { core: CORE, far: FAR, layer: index, vertexColors: true }), index);
    root.add(mesh);
    return mesh;
  };

  // 1. Meadow base.
  const base = new FlatBuilder();
  base.ellipse(0, 0, EDGE, EDGE, "#69c35a", 120);
  layer(base, 1);

  // 2. Fields with crop rows.
  const fields = new FlatBuilder();
  const rows = new FlatBuilder();
  const areas: { x: number; z: number; angle: number; palette: string[] }[] = [];
  for (let i = 0; i < 22; i++) {
    const a = random() * Math.PI * 2;
    const d = 1 + Math.sqrt(random()) * EDGE;
    areas.push({ x: Math.cos(a) * d, z: Math.sin(a) * d, angle: (random() - 0.5) * 1.1, palette: PALETTES[i % PALETTES.length] });
  }
  const areaOf = (x: number, z: number) => {
    let best = 0;
    let bestD = Infinity;
    areas.forEach((area, k) => {
      const d = Math.hypot(x - area.x, z - area.z);
      if (d < bestD) (bestD = d), (best = k);
    });
    return best;
  };
  const placed = new Set<string>();
  const cellW = 0.95;
  const cellD = 0.62;
  const shade = new THREE.Color();
  for (let gx = -EDGE; gx <= EDGE; gx += 0.45) {
    for (let gz = -EDGE; gz <= EDGE; gz += 0.45) {
      const k = areaOf(gx, gz);
      const area = areas[k];
      const c = Math.cos(area.angle);
      const s = Math.sin(area.angle);
      const u = gx * c + gz * s;
      const v = -gx * s + gz * c;
      const iu = Math.floor(u / cellW);
      const iv = Math.floor(v / cellD);
      const key = `${iu},${iv},${k}`;
      if (placed.has(key)) continue;
      placed.add(key);
      let hw = cellW / 2 - 0.035;
      let shift = 0;
      if (random() < 0.25 && !placed.has(`${iu + 1},${iv},${k}`)) placed.add(`${iu + 1},${iv},${k}`), (hw += cellW / 2), (shift = cellW / 2);
      const cu = (iu + 0.5) * cellW + shift;
      const cv = (iv + 0.5) * cellD;
      const cx = cu * c - cv * s;
      const cz = cu * s + cv * c;
      if (Math.hypot(cx, cz) > EDGE - 0.4 || areaOf(cx, cz) !== k) continue;
      const clear = (x: number, z: number) =>
        !inWood(x, z) && !inTown(x, z) && !inPark(x, z, 0.1) && !inVillage(x, z) && distanceToPolyline(river, x, z) > 0.3 && distanceToPolyline(rail, x, z) > 0.1;
      const hd = cellD / 2 - 0.035;
      const corners: number[] = [];
      let ok = true;
      for (const [a, b] of [
        [-hw, -hd],
        [hw, -hd],
        [hw, hd],
        [-hw, hd],
      ]) {
        const x = cx + a * c - b * s;
        const z = cz + a * s + b * c;
        if (!clear(x, z)) ok = false;
        corners.push(x, z);
      }
      if (!ok || !clear(cx, cz) || random() < 0.12) continue;
      const color = area.palette[Math.floor(random() * area.palette.length)];
      fields.polygon(corners, color);
      // Crop rows along the long side of some fields.
      if (random() < 0.55) {
        shade.set(color).offsetHSL(0, 0.02, random() < 0.5 ? -0.07 : 0.06);
        const n = Math.max(3, Math.floor((hd * 2) / 0.09));
        for (let r = 0; r < n; r++) {
          const b = -hd + ((r + 0.5) / n) * hd * 2;
          const x0 = cx + (-hw + 0.04) * c - b * s;
          const z0 = cz + (-hw + 0.04) * s + b * c;
          const x1 = cx + (hw - 0.04) * c - b * s;
          const z1 = cz + (hw - 0.04) * s + b * c;
          rows.ribbon([x0, z0, x1, z1], 0.022, shade);
        }
      }
    }
  }
  layer(fields, 2);
  layer(rows, 3);

  // 3. Forest floor, town ground, park lawn and village.
  const floors = new FlatBuilder();
  for (const outline of woodOutlines) floors.polygon(outline, "#2f8a4c");
  floors.polygon(townOutline, "#cfe3b0");
  floors.blob(village.x, village.z, village.r, "#e7ddd0", 77, 0.3, 24);
  layer(floors, 4);
  const lawn = new FlatBuilder();
  lawn.blob(px, pz, PARK_R, "#4cbf52", 91, 0.14, 48);
  lawn.blob(px, pz, PARK_R * 0.9, "#5fcf5a", 92, 0.14, 48);
  lawn.blob(px + 0.02, pz - 0.02, PARK_R * 0.62, "#6fd65f", 93, 0.18, 40);
  layer(lawn, 5);

  // 4. Streets, roads and the railway bed.
  const streets = new FlatBuilder();
  const houses: { x: number; z: number; angle: number; w: number; d: number; h: number; tall?: boolean }[] = [];
  const townAngle = 0.32;
  const tc = Math.cos(townAngle);
  const ts = Math.sin(townAngle);
  const blockU = 0.3;
  const blockV = 0.24;
  const toTown = (u: number, v: number): [number, number] => [town.x + u * tc - v * ts, town.z + u * ts + v * tc];
  const streetOk = (x: number, z: number) => inTown(x, z) && !inPark(x, z, 0.02) && distanceToPolyline(river, x, z) > 0.12;
  const street = (points: [number, number][]) => {
    let run: number[] = [];
    const flush = () => {
      if (run.length >= 4) streets.ribbon(run, 0.034, "#f3ece4");
      run = [];
    };
    for (const [x, z] of points) {
      if (streetOk(x, z)) run.push(x, z);
      else flush();
    }
    flush();
  };
  // A few main streets: every other line of the block grid, plus the high street.
  for (let u = -2.4 + blockU; u <= 2.4; u += blockU * 2) {
    const pts: [number, number][] = [];
    for (let v = -2.4; v <= 2.4; v += 0.04) pts.push(toTown(u, v));
    street(pts);
  }
  for (let v = -2.4 + blockV; v <= 2.4; v += blockV * 2) {
    const pts: [number, number][] = [];
    for (let u = -2.4; u <= 2.4; u += 0.04) pts.push(toTown(u, v));
    street(pts);
  }
  // Houses around each block, facing the streets.
  for (let u = -2.4; u < 2.4; u += blockU) {
    for (let v = -2.4; v < 2.4; v += blockV) {
      const [bx, bz] = toTown(u + blockU / 2, v + blockV / 2);
      if (!inTown(bx, bz) || inPark(bx, bz, 0.08)) continue;
      const centre = Math.hypot(bx - town.x, bz - town.z) / town.r;
      const edges: [number, number, number, number, number][] = [
        [u + 0.06, v + 0.055, u + blockU - 0.06, v + 0.055, 0],
        [u + 0.06, v + blockV - 0.055, u + blockU - 0.06, v + blockV - 0.055, 0],
        [u + 0.055, v + 0.09, u + 0.055, v + blockV - 0.09, Math.PI / 2],
        [u + blockU - 0.055, v + 0.09, u + blockU - 0.055, v + blockV - 0.09, Math.PI / 2],
      ];
      for (const [u0, v0, u1, v1, turn] of edges) {
        const length = Math.hypot(u1 - u0, v1 - v0);
        const n = Math.max(1, Math.round(length / 0.085));
        for (let i = 0; i < n; i++) {
          if (random() < 0.12 + centre * 0.25) continue;
          const t = n === 1 ? 0.5 : i / (n - 1);
          const [x, z] = toTown(u0 + (u1 - u0) * t, v0 + (v1 - v0) * t);
          if (!inTown(x, z) || inPark(x, z, 0.06) || distanceToPolyline(river, x, z) < 0.13) continue;
          const tall = centre < 0.35 && random() < 0.25;
          const k = nearParkScale(x, z, 0.5);
          houses.push({
            x,
            z,
            angle: -townAngle - turn + (random() - 0.5) * 0.08,
            w: (0.06 + random() * 0.02) * k,
            d: (0.045 + random() * 0.01) * k,
            h: (tall ? 0.08 + random() * 0.04 : 0.03 + random() * 0.012) * k,
            tall,
          });
        }
      }
    }
  }
  const roads = new FlatBuilder();
  roadLines.forEach((line, k) => roads.ribbon(line, k === 0 ? 0.065 : 0.05, k === 0 ? "#fff6e4" : "#fbecc9"));
  roads.ribbon(rail, 0.07, "#b9aed0");
  roads.ribbon(rail, 0.018, "#6d628f");
  layer(streets, 6);
  layer(roads, 7);

  // 5. The river: sandy banks (wider on the inside of bends), then flowing water, and the park pond.
  const count = river.length / 2;
  const curvature: number[] = [];
  for (let i = 0; i < count; i++) {
    const a = Math.max(0, i - 6);
    const b = Math.min(count - 1, i + 6);
    const m = i;
    const t1x = river[m * 2] - river[a * 2];
    const t1z = river[m * 2 + 1] - river[a * 2 + 1];
    const t2x = river[b * 2] - river[m * 2];
    const t2z = river[b * 2 + 1] - river[m * 2 + 1];
    const l1 = Math.hypot(t1x, t1z) || 1;
    const l2 = Math.hypot(t2x, t2z) || 1;
    const tx = (t1x / l1 + t2x / l2) / 2;
    const tz = (t1z / l1 + t2z / l2) / 2;
    // Turning towards the ribbon's left normal (tz, -tx) is positive.
    const dx = t2x / l2 - t1x / l1;
    const dz = t2z / l2 - t1z / l1;
    curvature.push((dx * tz - dz * tx) / ((l1 + l2) / 2));
  }
  const banks = new FlatBuilder();
  banks.ribbon(river, (_t, i) => {
    const k = curvature[i];
    const bar = Math.min(0.2, Math.abs(k) * 0.18);
    return k > 0 ? [riverWidth / 2 + 0.035 + bar, riverWidth / 2 + 0.03] : [riverWidth / 2 + 0.03, riverWidth / 2 + 0.035 + bar];
  }, "#f3e2a8");
  const pond = { x: px + 0.2, z: pz - 0.15 };
  banks.blob(pond.x, pond.z, 0.085, "#f3e2a8", 55, 0.25, 28);
  layer(banks, 8);

  // Water with scrolling streaks: a textured ribbon with its own UVs.
  const streaks = kit.canvasTexture(512, 64, (g, w, h) => {
    const r = rng(3);
    g.clearRect(0, 0, w, h);
    g.strokeStyle = "rgba(255,255,255,1)";
    g.lineCap = "round";
    for (let i = 0; i < 16; i++) {
      const y = h * (0.15 + r() * 0.7);
      const x = r() * w;
      const length = 30 + r() * 70;
      g.lineWidth = 2 + r() * 2.5;
      for (const offset of [-w, 0, w]) {
        g.beginPath();
        g.moveTo(x + offset, y);
        g.lineTo(x + length + offset, y + (r() - 0.5) * 3);
        g.stroke();
      }
    }
  });
  streaks.wrapS = THREE.RepeatWrapping;
  const waterGeometry = kit.geometry(new THREE.BufferGeometry());
  {
    const positions: number[] = [];
    const uvs: number[] = [];
    const index: number[] = [];
    let travelled = 0;
    for (let i = 0; i < count; i++) {
      const a = Math.max(0, i - 1);
      const b = Math.min(count - 1, i + 1);
      let tx = river[b * 2] - river[a * 2];
      let tz = river[b * 2 + 1] - river[a * 2 + 1];
      const len = Math.hypot(tx, tz) || 1;
      tx /= len;
      tz /= len;
      if (i > 0) travelled += Math.hypot(river[i * 2] - river[i * 2 - 2], river[i * 2 + 1] - river[i * 2 - 1]);
      const x = river[i * 2];
      const z = river[i * 2 + 1];
      const hw = riverWidth / 2;
      positions.push(x + tz * hw, 0, z - tx * hw, x - tz * hw, 0, z + tx * hw);
      uvs.push(travelled, 0, travelled, 1);
      if (i > 0) {
        const k = (i - 1) * 2;
        index.push(k, k + 2, k + 1, k + 1, k + 2, k + 3);
      }
    }
    waterGeometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    waterGeometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    waterGeometry.setIndex(index);
  }
  const waterMaterial = kit.track(
    new THREE.ShaderMaterial({
      vertexShader: flowVertex,
      fragmentShader: flowFragment,
      uniforms: {
        map: { value: streaks },
        uTime: { value: 0 },
        uEnv: kit.envUniform,
        uCore: { value: new THREE.Vector2(...CORE) },
        uFar: { value: new THREE.Vector2(...FAR) },
        uWater: { value: new THREE.Color("#46b0ff") },
        uDeep: { value: new THREE.Color("#2f8df0") },
        uLight: { value: new THREE.Color("#c9f1ff") },
      },
      transparent: true,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  root.add(groundMesh(waterGeometry, waterMaterial, 9));
  const ponds = new FlatBuilder();
  ponds.blob(pond.x, pond.z, 0.07, "#3aa6ff", 55, 0.25, 28);
  ponds.blob(pond.x - 0.01, pond.z - 0.008, 0.042, "#5cc0ff", 56, 0.25, 20);
  // Park paths.
  ponds.ribbon(
    smoothLine(
      [
        [px - 0.42, pz + 0.12],
        [px - 0.16, pz + 0.1],
        [px + 0.04, pz + 0.11],
        [px + 0.26, pz - 0.02],
        [px + 0.4, pz - 0.2],
      ],
      40,
    ),
    0.014,
    "#f4dcaa",
  );
  ponds.ribbon(
    smoothLine(
      [
        [px - 0.05, pz - 0.4],
        [px - 0.1, pz - 0.18],
        [px - 0.02, pz - 0.07],
        [px + 0.08, pz + 0.1],
        [px + 0.05, pz + 0.4],
      ],
      40,
    ),
    0.012,
    "#f4dcaa",
  );
  layer(ponds, 10);

  /* ---------------- Standing things: trees, houses, turbines, train ---------------- */
  const standing = (color: string, options: { env?: boolean; rim?: number; shadow?: string } = {}) =>
    kit.toon(color, { transparent: true, rim: options.rim ?? 0.3, shadow: options.shadow, env: options.env });

  const crown = kit.geometry(new THREE.IcosahedronGeometry(1, 1));
  const crownLow = kit.geometry(new THREE.IcosahedronGeometry(1, 0));
  const cone = kit.geometry(new THREE.ConeGeometry(1, 2.2, 6, 1, true).translate(0, 1.1, 0));
  const trunkGeometry = kit.geometry(new THREE.CylinderGeometry(0.18, 0.25, 1, 4, 1, true).translate(0, 0.5, 0));
  const treeGreens = ["#2f9a4f", "#3aaa55", "#48b95c", "#2a8a4a", "#57c062", "#3fae6a"];
  const autumn = ["#f2a33a", "#ef7f3c", "#ffc94a"];
  type Tree = { x: number; z: number; r: number; kind: "round" | "cone"; color: string };
  const coreTrees: Tree[] = [];
  const outerTrees: Tree[] = [];
  const addTree = (tree: Tree) => {
    tree.r *= nearParkScale(tree.x, tree.z);
    if (Math.hypot(tree.x, tree.z) < CORE[0] - 0.2) coreTrees.push(tree);
    else if (Math.hypot(tree.x, tree.z) < FAR[0] + 1) outerTrees.push(tree);
  };
  const greenOf = () => (random() < 0.018 ? autumn[Math.floor(random() * autumn.length)] : treeGreens[Math.floor(random() * treeGreens.length)]);
  // Forests: dense, with conifers in the big forest.
  woods.forEach((w, k) => {
    for (let x = w.x - w.r * 1.5; x <= w.x + w.r * 1.5; ) {
      const inner = Math.hypot(x, w.z) < CORE[0] + 0.5;
      const spacing = inner ? 0.1 : 0.2;
      for (let z = w.z - w.r * 1.5; z <= w.z + w.r * 1.5; z += spacing * 0.87) {
        const tx = x + (random() - 0.5) * spacing * 0.8;
        const tz = z + (random() - 0.5) * spacing * 0.8;
        const far = Math.hypot(tx, tz) > CORE[0] - 0.2;
        if (far !== !inner && Math.abs(Math.hypot(tx, tz) - CORE[0]) > 0.6) continue;
        if (!insideOutline(woodOutlines[k], tx, tz) || nearRoad(tx, tz, 0.06)) continue;
        const conifer = k === 0 && random() < 0.45;
        const r = (far ? 0.075 : 0.045) + random() * (far ? 0.03 : 0.025);
        addTree({ x: tx, z: tz, r, kind: conifer ? "cone" : "round", color: conifer ? (random() < 0.5 ? "#1f7a4d" : "#27875a") : greenOf() });
      }
      x += spacing;
    }
  });
  // Trees lining the river and hedgerows, and a few in town gardens.
  for (let i = 0; i < count; i += 3) {
    if (random() < 0.55) continue;
    const side = random() < 0.5 ? 1 : -1;
    const j = Math.min(count - 1, i + 1);
    const tx = river[j * 2] - river[i * 2];
    const tz = river[j * 2 + 1] - river[i * 2 + 1];
    const len = Math.hypot(tx, tz) || 1;
    const offset = riverWidth / 2 + 0.09 + Math.abs(curvature[i]) * 0.18 + random() * 0.05;
    const x = river[i * 2] + (tz / len) * offset * side;
    const z = river[i * 2 + 1] - (tx / len) * offset * side;
    if (inTown(x, z) || inPark(x, z, 0.05) || nearRoad(x, z, 0.05) || distanceToPolyline(rail, x, z) < 0.08) continue;
    addTree({ x, z, r: 0.04 + random() * 0.02, kind: "round", color: greenOf() });
  }
  // Hedgerows: lines of trees along some field edges.
  for (let i = 0; i < 150; i++) {
    const a = random() * Math.PI * 2;
    const d = 0.8 + Math.sqrt(random()) * (FAR[0] - 1);
    const x0 = Math.cos(a) * d;
    const z0 = Math.sin(a) * d;
    const area = areas[areaOf(x0, z0)];
    const along = random() < 0.5 ? 0 : Math.PI / 2;
    const dx = Math.cos(area.angle + along);
    const dz = Math.sin(area.angle + along);
    const n = 4 + Math.floor(random() * 6);
    for (let k = 0; k < n; k++) {
      const x = x0 + dx * k * 0.085;
      const z = z0 + dz * k * 0.085;
      if (inWood(x, z) || inTown(x, z) || inPark(x, z, 0.1) || inVillage(x, z) || distanceToPolyline(river, x, z) < 0.2 || nearRoad(x, z, 0.05)) continue;
      if (distanceToPolyline(rail, x, z) < 0.08 || turbines.some(([u, v]) => Math.hypot(x - u, z - v) < 0.2)) continue;
      addTree({ x, z, r: 0.035 + random() * 0.015, kind: "round", color: greenOf() });
    }
  }
  // Garden trees in town.
  for (let i = 0; i < 160; i++) {
    const a = random() * Math.PI * 2;
    const d = Math.sqrt(random()) * town.r;
    const x = town.x + Math.cos(a) * d;
    const z = town.z + Math.sin(a) * d;
    if (!inTown(x, z) || inPark(x, z, 0.05) || distanceToPolyline(river, x, z) < 0.12) continue;
    if (houses.some((h) => Math.hypot(h.x - x, h.z - z) < 0.06)) continue;
    addTree({ x, z, r: 0.022 + random() * 0.012, kind: "round", color: greenOf() });
  }
  // The park: true-size trees around the lawn, clear around the diorama.
  for (let i = 0; i < 70; i++) {
    const a = random() * Math.PI * 2;
    const d = 0.12 + Math.pow(random(), 0.6) * (PARK_R - 0.14);
    const x = px + Math.cos(a) * d;
    const z = pz + Math.sin(a) * d;
    if (Math.hypot(x - pond.x, z - pond.z) < 0.1) continue;
    // True size: crowns 5 to 9 m wide next to the diorama, a little larger further out.
    const r = (d < 0.25 ? 0.005 + random() * 0.004 : 0.008 + random() * 0.006) / nearParkScale(x, z);
    addTree({ x, z, r, kind: random() < 0.2 ? "cone" : "round", color: greenOf() });
  }

  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const position = new THREE.Vector3();
  const color = new THREE.Color();
  const buildTrees = (trees: Tree[], outer: boolean, detailed = false) => {
    const rounds = trees.filter((t) => t.kind === "round");
    const cones = trees.filter((t) => t.kind === "cone");
    const crowns = new THREE.InstancedMesh(detailed ? crown : crownLow, standing("#ffffff", { env: outer, rim: 0.35, shadow: "#2c5d56" }), Math.max(1, rounds.length));
    const spires = new THREE.InstancedMesh(cone, standing("#ffffff", { env: outer, rim: 0.3, shadow: "#1d4a47" }), Math.max(1, cones.length));
    // Trunks only where they can be seen up close (not on the far, outer trees).
    const trunks = new THREE.InstancedMesh(trunkGeometry, standing("#8a5a3c", { env: outer, rim: 0.1 }), Math.max(1, outer ? 1 : trees.length));
    rounds.forEach((t, i) => {
      quaternion.setFromEuler(new THREE.Euler(0, random() * 6, 0));
      matrix.compose(position.set(t.x, t.r * 1.45, t.z), quaternion, scale.set(t.r, t.r * 1.05, t.r));
      crowns.setMatrixAt(i, matrix);
      crowns.setColorAt(i, color.set(t.color));
    });
    cones.forEach((t, i) => {
      matrix.compose(position.set(t.x, t.r * 0.35, t.z), quaternion.identity(), scale.set(t.r * 0.85, t.r * 1.1, t.r * 0.85));
      spires.setMatrixAt(i, matrix);
      spires.setColorAt(i, color.set(t.color));
    });
    if (!outer)
      trees.forEach((t, i) => {
        matrix.compose(position.set(t.x, 0, t.z), quaternion.identity(), scale.set(t.r * 0.9, t.r * (t.kind === "cone" ? 0.6 : 1.0), t.r * 0.9));
        trunks.setMatrixAt(i, matrix);
      });
    crowns.count = rounds.length;
    spires.count = cones.length;
    trunks.count = outer ? 0 : trees.length;
    for (const mesh of [trunks, crowns, spires]) {
      mesh.renderOrder = STANDING;
      (outer ? env : root).add(mesh);
    }
  };
  // Rounder crowns near the park, where the dive comes close; simple ones elsewhere.
  const nearPark = (t: Tree) => Math.hypot(t.x - px, t.z - pz) < 1.6;
  buildTrees(coreTrees.filter(nearPark), false, true);
  buildTrees(coreTrees.filter((t) => !nearPark(t)).slice(0, kit.count(1800, 800)), false);
  buildTrees(outerTrees.slice(0, kit.count(3000, 1300)), true);

  // Houses: instanced walls and gabled roofs, plus farms and the village.
  for (let i = 0; i < 70; i++) {
    const a = random() * Math.PI * 2;
    const d = Math.sqrt(random()) * village.r * 0.9;
    const x = village.x + Math.cos(a) * d;
    const z = village.z + Math.sin(a) * d;
    if (nearRoad(x, z, 0.04)) continue;
    houses.push({ x, z, angle: 0.2 + Math.round(random() * 3) * (Math.PI / 2), w: 0.05, d: 0.038, h: 0.025 });
  }
  const farms: [number, number][] = [
    [-2.4, 1.6],
    [-4.4, -0.9],
    [5.2, 2.6],
    [-0.6, 3.1],
    [8.8, -3.8],
    [-6.6, 1.2],
    [2.6, 6.8],
    [-10.5, 2.4],
    [10.6, 4.4],
    [6.4, -6.6],
  ];
  for (const [fx, fz] of farms) {
    const angle = random() * Math.PI;
    for (let k = 0; k < 3; k++) {
      const off = (k - 1) * 0.085;
      houses.push({ x: fx + Math.cos(angle) * off, z: fz + Math.sin(angle) * off + (k === 1 ? 0.07 : 0), angle: -angle + (k === 1 ? Math.PI / 2 : 0), w: k === 1 ? 0.085 : 0.055, d: 0.042, h: 0.028 });
    }
  }
  const coreHouses = houses.filter((h) => Math.hypot(h.x, h.z) < CORE[0] - 0.2);
  const outerHouses = houses.filter((h) => Math.hypot(h.x, h.z) >= CORE[0] - 0.2);
  const box = kit.geometry(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0));
  // A gabled roof: unit footprint, ridge along X at height 1.
  const prism = kit.geometry(new THREE.BufferGeometry());
  {
    const v = [
      [-0.5, 0, -0.5],
      [0.5, 0, -0.5],
      [0.5, 0, 0.5],
      [-0.5, 0, 0.5],
      [-0.5, 1, 0],
      [0.5, 1, 0],
    ];
    const faces = [
      [0, 4, 5],
      [0, 5, 1],
      [3, 2, 5],
      [3, 5, 4],
      [0, 3, 4],
      [1, 5, 2],
    ];
    const positions: number[] = [];
    for (const face of faces) for (const k of face) positions.push(...v[k]);
    prism.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    prism.computeVertexNormals();
  }
  const wallColors = ["#fff4e0", "#ffe8cc", "#f7f1ff", "#ffe1d6", "#fff9ec", "#e8f3ff"];
  const roofColors = ["#ef6f4f", "#e25b45", "#f28a54", "#f07a5a", "#d95f4a", "#ef6f4f", "#9a86cf"];
  const buildHouses = (list: typeof houses, outer: boolean) => {
    const walls = new THREE.InstancedMesh(box, standing("#ffffff", { env: outer, rim: 0.2, shadow: "#b3a6d6" }), Math.max(1, list.length));
    const roofs = new THREE.InstancedMesh(prism, standing("#ffffff", { env: outer, rim: 0.25, shadow: "#8c3f52" }), Math.max(1, list.length));
    let r = 0;
    list.forEach((house, i) => {
      quaternion.setFromEuler(new THREE.Euler(0, house.angle, 0));
      matrix.compose(position.set(house.x, 0, house.z), quaternion, scale.set(house.w, house.h, house.d));
      walls.setMatrixAt(i, matrix);
      walls.setColorAt(i, color.set(house.tall ? "#f4efff" : wallColors[Math.floor(random() * wallColors.length)]));
      if (!house.tall) {
        matrix.compose(position.set(house.x, house.h, house.z), quaternion, scale.set(house.w * 1.08, house.d * 0.6, house.d * 1.12));
        roofs.setMatrixAt(r, matrix);
        roofs.setColorAt(r++, color.set(roofColors[Math.floor(random() * roofColors.length)]));
      }
    });
    walls.count = list.length;
    roofs.count = r;
    for (const mesh of [walls, roofs]) {
      mesh.renderOrder = STANDING;
      (outer ? env : root).add(mesh);
    }
  };
  buildHouses(coreHouses, false);
  buildHouses(outerHouses, true);

  // The church in the town square, with its spire.
  const [cx, cz] = toTown(0.18, -0.13);
  const church = new THREE.Group();
  church.position.set(cx, 0, cz);
  church.rotation.y = -townAngle;
  church.scale.setScalar(1.5);
  const stone = standing("#fff2dc", { shadow: "#b8a3cf" });
  const nave = new THREE.Mesh(box, stone);
  nave.scale.set(0.1, 0.035, 0.045);
  const tower = new THREE.Mesh(box, stone);
  tower.scale.set(0.035, 0.08, 0.035);
  tower.position.x = -0.06;
  const spire = new THREE.Mesh(kit.geometry(new THREE.ConeGeometry(0.026, 0.07, 4).translate(0, 0.035, 0)), standing("#7c6fc0", { rim: 0.3 }));
  spire.position.set(-0.06, 0.08, 0);
  spire.rotation.y = Math.PI / 4;
  const naveRoof = new THREE.Mesh(prism, standing("#e25b45", { shadow: "#8c3f52" }));
  naveRoof.scale.set(0.105, 0.028, 0.052);
  naveRoof.position.y = 0.035;
  for (const mesh of [nave, tower, spire, naveRoof]) mesh.renderOrder = STANDING;
  church.add(nave, tower, spire, naveRoof);
  root.add(church);

  // Bridges where the main road and the railway cross the river.
  const bridgeMaterial = standing("#f4ecff", { shadow: "#9f93c9" });
  const bridges: THREE.Mesh[] = [];
  const addBridge = (line: number[], width: number) => {
    let best = Infinity;
    let at = 0;
    for (let i = 0; i < line.length / 2; i++) {
      const d = distanceToPolyline(river, line[i * 2], line[i * 2 + 1]);
      if (d < best) (best = d), (at = i);
    }
    if (best > 0.05) return;
    const a = Math.max(0, at - 2);
    const b = Math.min(line.length / 2 - 1, at + 2);
    const angle = Math.atan2(line[b * 2 + 1] - line[a * 2 + 1], line[b * 2] - line[a * 2]);
    const deck = new THREE.Mesh(box, bridgeMaterial);
    deck.position.set(line[at * 2], 0.004, line[at * 2 + 1]);
    deck.rotation.y = -angle;
    deck.scale.set(riverWidth + 0.14, 0.012, width);
    deck.renderOrder = STANDING;
    bridges.push(deck);
    root.add(deck);
  };
  addBridge(roadLines[0], 0.08);
  addBridge(rail, 0.07);
  addBridge(roadLines[2], 0.06);

  // Wind turbines, at true scale: 100 m masts, 60 m blades.
  const mastGeometry = kit.geometry(new THREE.CylinderGeometry(0.007, 0.013, 0.2, 8).translate(0, 0.1, 0));
  const masts = new THREE.InstancedMesh(mastGeometry, standing("#ffffff", { shadow: "#b9b3dc", rim: 0.4, env: true }), turbines.length);
  const bladeShape = new THREE.BufferGeometry();
  {
    const blade: number[] = [];
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2;
      const c = Math.cos(a);
      const s = Math.sin(a);
      const pts = [
        [0, 0.011],
        [0.12, 0.005],
        [0.12, -0.002],
        [0, -0.011],
      ].map(([u, v]) => [u * c - v * s, u * s + v * c]);
      blade.push(pts[0][0], pts[0][1], 0, pts[1][0], pts[1][1], 0, pts[2][0], pts[2][1], 0);
      blade.push(pts[0][0], pts[0][1], 0, pts[2][0], pts[2][1], 0, pts[3][0], pts[3][1], 0);
    }
    bladeShape.setAttribute("position", new THREE.Float32BufferAttribute(blade, 3));
    bladeShape.computeVertexNormals();
  }
  kit.geometry(bladeShape);
  const rotors = new THREE.InstancedMesh(bladeShape, kit.toon("#ffffff", { env: true, side: THREE.DoubleSide, rim: 0.2, shadow: "#c9c3ea" }), turbines.length);
  const hubs = new THREE.InstancedMesh(kit.geometry(new THREE.BoxGeometry(0.02, 0.012, 0.012)), standing("#f4f1ff", { env: true }), turbines.length);
  turbines.forEach(([tx, tz], i) => {
    masts.setMatrixAt(i, matrix.compose(position.set(tx, 0, tz), quaternion.identity(), scale.set(1, 1, 1)));
    hubs.setMatrixAt(i, matrix.compose(position.set(tx, 0.2, tz), quaternion.setFromEuler(new THREE.Euler(0, -35 * DEG, 0)), scale.set(1, 1, 1)));
  });
  for (const mesh of [masts, rotors, hubs]) {
    mesh.renderOrder = STANDING;
    env.add(mesh);
  }

  // The train: a locomotive and five carriages gliding along the railway.
  const railLength = (() => {
    let total = 0;
    for (let i = 1; i < rail.length / 2; i++) total += Math.hypot(rail[i * 2] - rail[i * 2 - 2], rail[i * 2 + 1] - rail[i * 2 - 1]);
    return total;
  })();
  const railAt = (distance: number, target: THREE.Vector3) => {
    let d = ((distance % railLength) + railLength) % railLength;
    for (let i = 1; i < rail.length / 2; i++) {
      const sx = rail[i * 2] - rail[i * 2 - 2];
      const sz = rail[i * 2 + 1] - rail[i * 2 - 1];
      const l = Math.hypot(sx, sz);
      if (d <= l) {
        target.set(rail[i * 2 - 2] + (sx * d) / l, Math.atan2(sz, sx), rail[i * 2 - 1] + (sz * d) / l);
        return target;
      }
      d -= l;
    }
    return target.set(rail[rail.length - 2], 0, rail[rail.length - 1]);
  };
  const cars = 6;
  const train = new THREE.InstancedMesh(
    kit.geometry(new THREE.CapsuleGeometry(0.022, 0.09, 3, 8).rotateZ(Math.PI / 2).translate(0, 0.024, 0)),
    standing("#ffffff", { rim: 0.35, shadow: "#9d93c9" }),
    cars,
  );
  for (let i = 0; i < cars; i++) train.setColorAt(i, color.set(i === 0 ? "#ff5a5f" : i % 2 ? "#ffffff" : "#ffd23f"));
  train.renderOrder = STANDING;
  root.add(train);
  const carPos = new THREE.Vector3();
  const placeTrain = (time: number) => {
    const head = railLength * 0.45 + time * 0.16;
    for (let i = 0; i < cars; i++) {
      railAt(head - i * 0.125, carPos);
      // Visible in the core from afar, and everywhere nearby once you are in the landscape.
      const r = Math.hypot(carPos.x, carPos.z);
      const inside = r < CORE[0] || (kit.envUniform.value > 0.5 && r < FAR[0]);
      train.setMatrixAt(
        i,
        matrix.compose(position.set(carPos.x, 0.004, carPos.z), quaternion.setFromEuler(new THREE.Euler(0, -carPos.y, 0)), scale.setScalar(inside ? 1 : 0)),
      );
    }
    train.instanceMatrix.needsUpdate = true;
  };

  /* ---------------- Sky: a few big clouds and their shadows ---------------- */
  const puff = kit.geometry(new THREE.IcosahedronGeometry(1, 2));
  const cloudMaterial = kit.toon("#ffffff", { env: true, shadow: "#b3c1f2", rim: 0.3, rimColor: "#ffffff", gloss: 0.08, soft: 0.4 });
  const cloudSpecs = [
    [-7.2, 2.6, -5.2, 1.0],
    [8.2, 3.0, -6.4, 1.2],
    [-9.5, 2.4, 4.2, 0.85],
    [9.6, 2.2, 3.2, 0.9],
    [1.5, 3.4, -10, 1.1],
  ];
  const cloudPuffs = new THREE.InstancedMesh(puff, cloudMaterial, cloudSpecs.length * 7);
  cloudPuffs.renderOrder = STANDING + 20;
  const cloudShadowMaterial = kit.textured(softDiscTexture(kit, "24,28,90"), { env: true, flat: 1, rim: 0, gloss: 0, opacity: 0.16, depthWrite: false, transparent: true });
  const cloudShadows = new THREE.InstancedMesh(kit.geometry(new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2)), cloudShadowMaterial, cloudSpecs.length);
  cloudShadows.renderOrder = 12;
  env.add(cloudShadows, cloudPuffs);
  const puffOffsets: [number, number, number, number][] = [];
  cloudSpecs.forEach(([, , , size], k) => {
    const r = rng(60 + k);
    for (let i = 0; i < 6; i++) {
      const t = i / 5 - 0.5;
      const s = size * (0.42 + 0.35 * Math.sin(Math.PI * (i / 5)) + r() * 0.12);
      puffOffsets.push([t * size * 2.3, s * 0.35, (r() - 0.5) * size * 0.5, s]);
    }
    puffOffsets.push([0, 0, 0, -size]);
  });
  const placeClouds = (time: number) => {
    cloudSpecs.forEach(([x, y, z, size], k) => {
      const drift = Math.sin(time * 0.04 + k * 1.7) * 0.6;
      for (let i = 0; i < 7; i++) {
        const [dx, dy, dz, s] = puffOffsets[k * 7 + i];
        if (s > 0) matrix.compose(position.set(x + drift + dx, y + dy, z + dz), quaternion.identity(), scale.set(s, s * 0.9, s * 0.85));
        else matrix.compose(position.set(x + drift, y, z), quaternion.identity(), scale.set(-s * 1.45, -s * 0.28, -s * 0.55));
        cloudPuffs.setMatrixAt(k * 7 + i, matrix);
      }
      matrix.compose(position.set(x + drift + y * 1.3, 0, z - y * 0.15), quaternion.identity(), scale.set(size * 1.7, 1, size * 0.9));
      cloudShadows.setMatrixAt(k, matrix);
    });
    cloudPuffs.instanceMatrix.needsUpdate = true;
    cloudShadows.instanceMatrix.needsUpdate = true;
  };

  const rotorQ = new THREE.Quaternion();
  const yawQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -35 * DEG, 0));
  const spinQ = new THREE.Quaternion();
  const zAxis = new THREE.Vector3(0, 0, 1);
  const update = (time: number) => {
    waterMaterial.uniforms.uTime.value = time;
    placeTrain(time);
    turbines.forEach(([tx, tz], i) => {
      spinQ.setFromAxisAngle(zAxis, time * 1.1 + i * 1.3);
      rotorQ.copy(yawQ).multiply(spinQ);
      rotors.setMatrixAt(i, matrix.compose(position.set(tx, 0.2, tz).add(new THREE.Vector3(0.012, 0, 0.012)), rotorQ, scale.set(1, 1, 1)));
    });
    rotors.instanceMatrix.needsUpdate = true;
    placeClouds(time);
  };
  update(0);

  return {
    root,
    env,
    update({ time }) {
      update(time);
    },
  };
};

export default landscape;
