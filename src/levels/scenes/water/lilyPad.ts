/**
 * A lily pad on the pond (1 unit = 3 cm, water surface at y = 0).
 * The pad and its flower are the subject; the child level "drop" is drawn by
 * its own scene at its anchor: here only its wet footprint is painted.
 * The surroundings reuse the pond's own neighbouring pads, so the dive from
 * the pond cross-fades without a jump.
 */
import * as THREE from "three";
import { rng } from "../../../engine/kit";
import type { Kit } from "../../../engine/kit";
import type { SceneBuilder } from "../types";
import {
  PAD,
  emitRipple,
  glassMaterial,
  lensMaterial,
  openWaterMaterial,
  padGeometry,
  padTexture,
  waterLily,
  type RippleSource,
} from "./shared";
import { padYaw, pondPads } from "./pondLayout";

/** Pad radius in local units (26 cm across). */
export const PAD_RADIUS = 4.3;
const NOTCH = 0.3;
/** The pad is turned so that its notch opens towards the back right. */
const PAD_YAW = 0.75;

/** Height of the pad's upper surface at a fraction `r` of its radius. */
export const padHeight = (r: number, a = 0) => {
  const curl = THREE.MathUtils.smoothstep(r, 0.8, 1);
  return 0.06 + 0.2 * curl * curl + 0.02 * Math.sin(a * 9) * curl;
};

/** The pad's upper surface: a notched disc with a slightly raised rim. */
function padSurface(kit: Kit) {
  const rings = 22;
  const segments = 120;
  const positions: number[] = [0, padHeight(0), 0];
  const uvs: number[] = [0.5, 0.5];
  const index: number[] = [];
  for (let j = 1; j <= rings; j++) {
    const r = j / rings;
    for (let i = 0; i <= segments; i++) {
      const a = NOTCH / 2 + (i / segments) * (Math.PI * 2 - NOTCH);
      positions.push(Math.cos(a) * r * PAD_RADIUS, padHeight(r, a), -Math.sin(a) * r * PAD_RADIUS);
      uvs.push((Math.cos(a) * r + 1) / 2, (Math.sin(a) * r + 1) / 2);
    }
  }
  const at = (j: number, i: number) => (j === 0 ? 0 : 1 + (j - 1) * (segments + 1) + i);
  for (let i = 0; i < segments; i++) index.push(0, at(1, i), at(1, i + 1));
  for (let j = 1; j < rings; j++)
    for (let i = 0; i < segments; i++) {
      const a = at(j, i);
      const b = at(j, i + 1);
      const c = at(j + 1, i);
      const d = at(j + 1, i + 1);
      index.push(a, c, b, b, c, d);
    }
  const geometry = kit.geometry(new THREE.BufferGeometry());
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return geometry;
}

/** The pad's reddish edge: a thin wall around the rim and along the notch. */
function padEdge(kit: Kit) {
  const positions: number[] = [];
  const index: number[] = [];
  const wall = (points: THREE.Vector3[]) => {
    const start = positions.length / 3;
    for (const p of points) positions.push(p.x, p.y, p.z, p.x * 1.004, -0.02, p.z * 1.004);
    for (let i = 0; i < points.length - 1; i++) {
      const a = start + i * 2;
      index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  };
  const segments = 120;
  const rim: THREE.Vector3[] = [];
  for (let i = 0; i <= segments; i++) {
    const a = NOTCH / 2 + (i / segments) * (Math.PI * 2 - NOTCH);
    rim.push(new THREE.Vector3(Math.cos(a) * PAD_RADIUS, padHeight(1, a), -Math.sin(a) * PAD_RADIUS));
  }
  wall(rim);
  for (const a of [NOTCH / 2, -NOTCH / 2]) {
    const side: THREE.Vector3[] = [];
    for (let j = 0; j <= 16; j++) {
      const r = j / 16;
      side.push(new THREE.Vector3(Math.cos(a) * r * PAD_RADIUS, padHeight(r, a), -Math.sin(a) * r * PAD_RADIUS));
    }
    wall(side);
  }
  const geometry = kit.geometry(new THREE.BufferGeometry());
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return geometry;
}

const lilyPad: SceneBuilder = ({ kit, level, children }) => {
  const root = new THREE.Group();
  const env = new THREE.Group();
  const random = rng(314);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);

  const dropChild = children.find((child) => child.id === "drop");
  const dropAt = new THREE.Vector3(...(dropChild?.at ?? [1.2, 0.11, 1.5]));
  const dropRadius = dropChild?.radius ?? 0.067;

  /* The pad. */
  const pad = new THREE.Group();
  pad.rotation.y = PAD_YAW;
  root.add(pad);
  const top = new THREE.Mesh(
    padSurface(kit),
    kit.textured(padTexture(kit), { rim: 0.25, rimColor: "#d8ffc0", gloss: 0.18, soft: 0.3, shadow: "#2b7a4a" }),
  );
  const edge = new THREE.Mesh(padEdge(kit), kit.toon(PAD.under, { rim: 0.3, rimColor: "#ff9fc0", side: THREE.DoubleSide }));
  pad.add(top, edge);
  // Soft shade on the water around the pad.
  const shade = new THREE.Mesh(
    kit.geometry(new THREE.CircleGeometry(1, 48).rotateX(-Math.PI / 2)),
    kit.flat("#0d3f8a", { opacity: 0.22, depthWrite: false }),
  );
  shade.scale.setScalar(PAD_RADIUS * 1.08);
  shade.position.set(0.25, 0.004, 0.25);
  root.add(shade);

  /* Water beads scattered on the waxy pad (the child "drop" is one more). */
  const flowerAt = new THREE.Vector3(-2.7, 0.1, -2.7);
  const beads: { x: number; z: number; r: number }[] = [];
  for (let tries = 0; beads.length < kit.count(34, 20) && tries < 3000; tries++) {
    const a = random() * Math.PI * 2;
    const d = Math.sqrt(random()) * PAD_RADIUS * 0.84;
    const x = Math.cos(a) * d;
    const z = Math.sin(a) * d;
    // Stay off the notch, the flower and the anchored drop.
    const local = new THREE.Vector2(x, z).rotateAround(new THREE.Vector2(), PAD_YAW);
    if (Math.abs(Math.atan2(-local.y, local.x)) < NOTCH && d > 0.3) continue;
    if (Math.hypot(x - flowerAt.x, z - flowerAt.z) < 2.1) continue;
    if (Math.hypot(x - dropAt.x, z - dropAt.z) < 0.45) continue;
    const r = 0.04 + Math.pow(random(), 2.2) * 0.14;
    if (beads.some((b) => Math.hypot(b.x - x, b.z - z) < b.r + r + 0.08)) continue;
    beads.push({ x, z, r });
  }
  const sphere = kit.geometry(new THREE.SphereGeometry(1, 20, 14));
  // Glassy beads like the drop itself: an upside-down image inside a clear shell.
  const beadMesh = new THREE.InstancedMesh(sphere, lensMaterial(kit), beads.length);
  const beadShell = new THREE.InstancedMesh(
    sphere,
    glassMaterial(kit, { top: "#c8fbff", bottom: "#9ff0ff", rim: "#ffffff", opacity: 0.2, rimPower: 2.4, spec: 0.995 }),
    beads.length,
  );
  beadShell.renderOrder = 2;
  const glintMesh = new THREE.InstancedMesh(sphere, kit.flat("#ffffff"), beads.length + 1);
  const beadShadow = new THREE.InstancedMesh(
    kit.geometry(new THREE.CircleGeometry(1, 16).rotateX(-Math.PI / 2)),
    kit.flat("#1f6b3f", { opacity: 0.35, depthWrite: false }),
    beads.length + 1,
  );
  beads.forEach((bead, i) => {
    const r = Math.hypot(bead.x, bead.z) / PAD_RADIUS;
    const y = padHeight(r) + bead.r * 0.62;
    beadMesh.setMatrixAt(i, m.compose(p.set(bead.x, y, bead.z), q.identity(), s.set(bead.r, bead.r * 0.78, bead.r)));
    beadShell.setMatrixAt(i, m.compose(p, q, s.multiplyScalar(1.01)));
    glintMesh.setMatrixAt(i, m.compose(p.set(bead.x - bead.r * 0.35, y + bead.r * 0.45, bead.z + bead.r * 0.2), q, s.setScalar(bead.r * 0.22)));
    beadShadow.setMatrixAt(i, m.compose(p.set(bead.x + bead.r * 0.4, padHeight(r) + 0.004, bead.z + bead.r * 0.3), q, s.set(bead.r * 1.1, 1, bead.r * 0.8)));
  });
  // The anchored drop's footprint: a wet shadow and a glint (the drop itself is the child level).
  const footprintY = padHeight(Math.hypot(dropAt.x, dropAt.z) / PAD_RADIUS);
  glintMesh.setMatrixAt(
    beads.length,
    m.compose(p.set(dropAt.x - dropRadius * 0.3, footprintY + dropRadius * 1.1, dropAt.z + dropRadius * 0.2), q, s.setScalar(dropRadius * 0.25)),
  );
  beadShadow.setMatrixAt(
    beads.length,
    m.compose(p.set(dropAt.x + dropRadius * 0.4, footprintY + 0.004, dropAt.z + dropRadius * 0.3), q, s.set(dropRadius * 1.1, 1, dropRadius * 0.8)),
  );
  beadShadow.renderOrder = 1;
  root.add(beadShadow, beadMesh, beadShell, glintMesh);

  /* A water lily resting against the back of the pad. */
  const flower = waterLily(kit, { size: 3.4, seed: 21 });
  flower.position.copy(flowerAt);
  flower.rotation.y = 0.4;
  root.add(flower);

  /* ---------------- Surroundings ---------------- */
  const ratio = 20; // pond units → lily pad units (0.6 m / 3 cm)
  const anchor = level.anchor?.at ?? [1.9, 0, 1.4];
  const neighbours = pondPads({ x: anchor[0], z: anchor[2] }, 0.3)
    .map((pond) => ({ ...pond, lx: (pond.x - anchor[0]) * ratio, lz: (pond.z - anchor[2]) * ratio, lr: pond.r * ratio }))
    .filter((pond) => Math.hypot(pond.lx, pond.lz) - pond.lr < 18);

  const ripples: RippleSource[] = [
    { x: 4.2, z: 1.2, period: 6, radius: 5 },
    { x: -3.9, z: 1.8, period: 7, radius: 4.5 },
    { x: 1.0, z: -4.3, period: 8, radius: 5.5 },
    { x: 0, z: 0, period: 2.6, radius: 3.2 },
    { x: 0, z: 0, period: 2.6, radius: 3.2 },
  ];
  const waterMaterial = openWaterMaterial(kit, {
    deep: "#2a7fdc",
    light: "#6fd0f7",
    ripples,
    rippleWidth: 0.16,
    fade: [12, 21],
    scale: 1.3,
    env: true,
  });
  const water = new THREE.Mesh(kit.geometry(new THREE.CircleGeometry(22, 96).rotateX(-Math.PI / 2)), waterMaterial);
  water.renderOrder = -2;
  env.add(water);

  const padTex = padTexture(kit);
  const padGeo = padGeometry(kit);
  const others = new THREE.InstancedMesh(padGeo, kit.textured(padTex, { rim: 0.15, gloss: 0.25, soft: 0.35, env: true }), Math.max(1, neighbours.length));
  const othersEdge = new THREE.InstancedMesh(padGeo, kit.toon(PAD.under, { rim: 0.2, env: true }), Math.max(1, neighbours.length));
  others.count = othersEdge.count = neighbours.length;
  const padTints = ["#ffffff", "#e8ffe0", "#d4f5c8", "#f4ffe8"];
  const tint = new THREE.Color();
  // Same tint order as the pond (its pads are tinted by index in the full list).
  const allPads = pondPads({ x: anchor[0], z: anchor[2] }, 0.3);
  neighbours.forEach((pond, i) => {
    const k = allPads.findIndex((other) => other.x === pond.x && other.z === pond.z);
    others.setColorAt(i, tint.set(padTints[k % padTints.length]));
  });
  env.add(othersEdge, others);
  const updateNeighbours = (time: number) => {
    neighbours.forEach((pond, i) => {
      q.setFromAxisAngle(up, padYaw(pond, time));
      others.setMatrixAt(i, m.compose(p.set(pond.lx, 0.03, pond.lz), q, s.set(pond.lr, 1, pond.lr)));
      othersEdge.setMatrixAt(i, m.compose(p.set(pond.lx, 0.015, pond.lz), q, s.set(pond.lr * 1.035, 1, pond.lr * 1.035)));
    });
    others.instanceMatrix.needsUpdate = true;
    othersEdge.instanceMatrix.needsUpdate = true;
  };
  updateNeighbours(0);

  // Duckweed: tiny floating leaves drifting in the calm corners.
  const duckweed: number[] = [];
  const clumps = [
    [-8.5, 3.5],
    [7.5, 5],
    [-6, -7],
  ];
  for (const [cx, cz] of clumps)
    for (let i = 0; i < 26; i++) {
      const a = random() * Math.PI * 2;
      const d = Math.sqrt(random()) * 1.8;
      const x = cx + Math.cos(a) * d;
      const z = cz + Math.sin(a) * d * 0.7;
      if (neighbours.some((pond) => Math.hypot(x - pond.lx, z - pond.lz) < pond.lr + 0.2)) continue;
      duckweed.push(x, 0.02, z);
    }
  const duckweedMesh = new THREE.InstancedMesh(
    kit.geometry(new THREE.CircleGeometry(1, 12).rotateX(-Math.PI / 2)),
    kit.toon("#7bdc4a", { rim: 0.2, gloss: 0.2, env: true }),
    duckweed.length / 3,
  );
  for (let i = 0; i < duckweed.length / 3; i++) {
    q.setFromAxisAngle(up, random() * 6);
    const r = 0.1 + random() * 0.08;
    duckweedMesh.setMatrixAt(i, m.compose(p.set(duckweed[i * 3], 0.02, duckweed[i * 3 + 2]), q, s.set(r * 1.4, 1, r)));
  }
  env.add(duckweedMesh);

  // Sparkles of sunlight on the water.
  const sparkles: number[] = [];
  for (let tries = 0; sparkles.length < kit.count(90, 50) * 3 && tries < 3000; tries++) {
    const x = (random() * 2 - 1) * 14;
    const z = (random() * 2 - 1) * 12;
    if (Math.hypot(x, z) < PAD_RADIUS + 0.4 || Math.hypot(x, z) > 14) continue;
    if (neighbours.some((pond) => Math.hypot(x - pond.lx, z - pond.lz) < pond.lr + 0.1)) continue;
    sparkles.push(x, 0.05, z);
  }
  env.add(kit.points(sparkles, { size: 0.16, color: "#ffffff", twinkle: 0.95, soft: 0.6, env: true }));

  /* A pond skater patrolling round the pad, dimpling the surface. */
  const skater = new THREE.Group();
  const skaterMaterial = kit.toon("#3b2f5a", { rim: 0.45, rimColor: "#a99cff", gloss: 0.3, env: true });
  const body = new THREE.Mesh(kit.geometry(new THREE.CapsuleGeometry(0.075, 0.45, 4, 10)), skaterMaterial);
  body.rotation.z = Math.PI / 2;
  body.position.y = 0.2;
  const head = new THREE.Mesh(kit.geometry(new THREE.SphereGeometry(0.07, 12, 10)), skaterMaterial);
  head.position.set(0.33, 0.21, 0);
  const eyeMaterial = kit.toon("#ffd23f", { rim: 0.2, gloss: 0.5, env: true });
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(kit.geometry(new THREE.SphereGeometry(0.035, 8, 6)), eyeMaterial);
    eye.position.set(0.36, 0.24, side * 0.055);
    skater.add(eye);
  }
  skater.add(body, head);
  const legGeometry = kit.geometry(new THREE.CylinderGeometry(0.014, 0.014, 1, 5).translate(0, 0.5, 0));
  const legs = new THREE.InstancedMesh(legGeometry, skaterMaterial, 12 + 2);
  const dimples = new THREE.InstancedMesh(
    kit.geometry(new THREE.RingGeometry(0.6, 1, 20).rotateX(-Math.PI / 2)),
    kit.flat("#eafcff", { opacity: 0.85, env: true, depthWrite: false }),
    4,
  );
  const dimpleShadow = new THREE.InstancedMesh(
    kit.geometry(new THREE.CircleGeometry(1, 16).rotateX(-Math.PI / 2)),
    kit.flat("#0d3f8a", { opacity: 0.35, env: true, depthWrite: false }),
    4,
  );
  skater.add(legs, dimples, dimpleShadow);
  // Front legs short and raised, middle legs long (rowing), hind legs long (steering).
  const legSpecs = [
    { x: 0.22, spread: 0.55, length: 0.42, knee: 0.18 },
    { x: 0.05, spread: 1.45, length: 1.25, knee: 0.34 },
    { x: -0.08, spread: 2.45, length: 1.05, knee: 0.3 },
  ];
  const legPose = (row: number) => {
    let k = 0;
    let dimple = 0;
    legSpecs.forEach((spec, j) => {
      for (const side of [-1, 1]) {
        const swing = j === 1 ? row * 0.35 : 0;
        const a = spec.spread - swing;
        const hip = new THREE.Vector3(spec.x, 0.2, side * 0.05);
        const foot = new THREE.Vector3(spec.x + Math.cos(a) * spec.length, j === 0 ? 0.12 : 0.012, side * Math.sin(a) * spec.length);
        const knee = hip.clone().lerp(foot, 0.35).setY(spec.knee + 0.2);
        for (const [from, to] of [
          [hip, knee],
          [knee, foot],
        ]) {
          const d = to.clone().sub(from);
          q.setFromUnitVectors(up, d.clone().normalize());
          legs.setMatrixAt(k++, m.compose(from, q, s.set(1, d.length(), 1)));
        }
        if (j > 0) {
          dimples.setMatrixAt(dimple, m.compose(p.set(foot.x, 0.02, foot.z), q.identity(), s.setScalar(0.1)));
          dimpleShadow.setMatrixAt(dimple++, m.compose(p.set(foot.x + 0.05, 0.015, foot.z + 0.04), q, s.setScalar(0.12)));
        }
      }
    });
    // Antennae.
    for (const side of [-1, 1]) {
      const from = new THREE.Vector3(0.38, 0.22, side * 0.03);
      const to = new THREE.Vector3(0.62, 0.3, side * 0.12);
      const d = to.clone().sub(from);
      q.setFromUnitVectors(up, d.clone().normalize());
      legs.setMatrixAt(k++, m.compose(from, q, s.set(0.6, d.length(), 0.6)));
    }
    legs.instanceMatrix.needsUpdate = true;
    dimples.instanceMatrix.needsUpdate = true;
    dimpleShadow.instanceMatrix.needsUpdate = true;
  };
  legPose(0);
  env.add(skater);
  const skaterPath = (t: number) => new THREE.Vector2(Math.cos(t) * 7.2, Math.sin(t) * 5.6 + 0.8);
  let lastStroke = -1;

  return {
    root,
    env,
    update({ time }) {
      flower.rotation.y = 0.4 + Math.sin(time * 0.35) * 0.05;
      updateNeighbours(time);
      const strokeTime = Math.floor(time / 1.3) * 1.3;
      const since = time - strokeTime;
      const glide = strokeTime + (1 - Math.exp(-since * 3)) * 0.9;
      const angle = 2.3 - glide * 0.12;
      const at = skaterPath(angle);
      const ahead = skaterPath(angle - 0.05);
      skater.position.set(at.x, 0, at.y);
      skater.rotation.y = Math.atan2(-(ahead.y - at.y), ahead.x - at.x);
      legPose(Math.exp(-since * 5) * Math.cos(since * 9));
      if (strokeTime !== lastStroke) {
        lastStroke = strokeTime;
        emitRipple(waterMaterial, 3 + (Math.round(strokeTime / 1.3) % 2), at.x, at.y, strokeTime);
      }
    },
  };
};

export default lilyPad;
