/**
 * A palisade cell of a leaf (1 unit = 6 µm): a 60 µm column with a stiff,
 * translucent cellulose wall. A large central vacuole fills it; around it a
 * thin layer of cytoplasm streams, carrying dozens of lens-shaped chloroplasts
 * and a few mitochondria. The nucleus is pressed against the wall.
 *
 * The child "chloroplast" (another scene) sits still under the top of the
 * cell, where a few chloroplasts gather; the streaming bands never reach it.
 * Surroundings: neighbouring palisade cells, the clear epidermis above, loose
 * spongy cells below and sunlight falling from above.
 */
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { rng } from "../../../engine/kit";
import type { Kit } from "../../../engine/kit";
import type { SceneBuilder } from "../types";
import { tintShadow } from "./treeShared";

/** Cell: a capsule of radius 2 and total height 10 (24 × 60 µm). */
const R = 2;
const HALF = 3;
/** Radius of the chloroplast layer (their centres). */
const LAYER = 1.7;
/** Chloroplast semi-axes: 5 × 2.3 × 3.2 µm (long, thin, wide). */
const PLAST = new THREE.Vector3(0.42, 0.19, 0.27);
const NUCLEUS_ANGLE = (215 * Math.PI) / 180;
const NUCLEUS_Y = -1.2;

const SHADE: [number, number, number] = [0.42, 0.6, 0.72];
const TINT: [number, number, number] = [0.04, 0.15, 0.26];

/** Painted chloroplast skin: a bright envelope with darker grana showing through. */
function plastTexture(kit: Kit) {
  return kit.canvasTexture(256, 128, (g, w, h) => {
    g.fillStyle = "#6ad85a";
    g.fillRect(0, 0, w, h);
    const random = rng(8);
    for (let k = 0; k < 46; k++) {
      const x = random() * w;
      const y = 14 + random() * (h - 28);
      const r = 5 + random() * 5;
      g.fillStyle = random() < 0.5 ? "#2b9a45" : "#34a94a";
      g.beginPath();
      g.ellipse(x, y, r * 1.1, r, 0, 0, Math.PI * 2);
      g.fill();
    }
  });
}

const leafCell: SceneBuilder = ({ kit, children }) => {
  const root = new THREE.Group();
  const env = new THREE.Group();
  const random = rng(33);
  const hero = children.find((child) => child.id === "chloroplast");
  const heroAt = new THREE.Vector3(...(hero?.at ?? [0.07, 4.68, 0.23]));

  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();
  const c = new THREE.Color();
  const up = new THREE.Vector3(0, 1, 0);

  /* ---------------- Wall: stiff, clear, glowing at its edges. ---------------- */
  const wallGeometry = kit.geometry(new THREE.CapsuleGeometry(R, HALF * 2, 12, 48));
  const wall = new THREE.Mesh(
    wallGeometry,
    kit.toon("#dffff0", { opacity: 0.16, rim: 0.8, rimColor: "#ffffff", gloss: 0.5, soft: 0.25, depthWrite: false }),
  );
  wall.renderOrder = 3;
  const wallGlow = new THREE.Mesh(wallGeometry, kit.halo("#b8ffd8", { opacity: 0.75, power: 2.4 }));
  wallGlow.scale.setScalar(1.035);
  wallGlow.renderOrder = 4;
  // The back half of the wall, seen from inside: a soft mint backdrop for the cell.
  // Seen from the leaf section it matches the pale palisade cells there; it clears as you enter.
  const backMaterial = kit.toon("#c8f5b4", { side: THREE.BackSide, rim: 0, gloss: 0, soft: 0.6, opacity: 0.92, depthWrite: false }) as THREE.ShaderMaterial;
  const back = new THREE.Mesh(wallGeometry, backMaterial);
  const backFar = new THREE.Color("#c8f5b4");
  const backNear = new THREE.Color("#8fd6ae");
  back.renderOrder = 0;
  root.add(back, wall, wallGlow);

  /* ---------------- Central vacuole. ---------------- */
  const vacuoleGeometry = kit.geometry(new THREE.CapsuleGeometry(1.42, HALF * 2 - 0.2, 10, 40));
  const vacuole = new THREE.Mesh(
    vacuoleGeometry,
    kit.toon("#cfe0ff", { opacity: 0.3, rim: 0.6, rimColor: "#f0f4ff", gloss: 0.55, soft: 0.3, depthWrite: false }),
  );
  vacuole.renderOrder = 2;
  const vacuoleGlow = new THREE.Mesh(vacuoleGeometry, kit.halo("#b9c8ff", { opacity: 0.5, power: 2 }));
  vacuoleGlow.renderOrder = 2;
  vacuole.scale.set(1, 1, 1);
  root.add(vacuole, vacuoleGlow);

  /* ---------------- Nucleus pressed against the wall. ---------------- */
  const nucleusAt = new THREE.Vector3(Math.cos(NUCLEUS_ANGLE) * 1.5, NUCLEUS_Y, Math.sin(NUCLEUS_ANGLE) * 1.5);
  const nucleus = new THREE.Mesh(kit.geometry(new THREE.SphereGeometry(1, 32, 24)), kit.toon("#9a7bff", { rim: 0.55, rimColor: "#e6dcff", gloss: 0.4 }));
  nucleus.scale.set(0.95, 1.05, 0.5);
  nucleus.position.copy(nucleusAt);
  nucleus.lookAt(0, NUCLEUS_Y, 0);
  const nucleolus = new THREE.Mesh(kit.geometry(new THREE.SphereGeometry(0.32, 20, 14)), kit.toon("#5b3fc4", { rim: 0.3 }));
  nucleolus.position.copy(nucleusAt).multiplyScalar(0.92).add(new THREE.Vector3(0, 0.15, 0));
  root.add(nucleus, nucleolus);

  /* ---------------- Chloroplasts: streaming bands and a still group at the top. ---------------- */
  const texture = plastTexture(kit);
  const plastGeometry = kit.geometry(new THREE.SphereGeometry(1, 16, 10));
  const plastMaterial = tintShadow(
    kit.textured(texture, { rim: 0.5, rimColor: "#e4ff9a", gloss: 0.35, soft: 0.25 }),
    SHADE,
    TINT,
  );
  interface Band {
    y: number;
    speed: number;
    angles: number[];
    wobble: number;
  }
  const bands: Band[] = [];
  const rows = 7;
  for (let j = 0; j < rows; j++) {
    const y = -HALF + 0.35 + (j / (rows - 1)) * (HALF * 2 - 0.7);
    const n = 9 + Math.floor(random() * 2);
    const angles: number[] = [];
    for (let k = 0; k < n; k++) angles.push(((k + random() * 0.4) / n) * Math.PI * 2);
    bands.push({ y, speed: (j % 2 ? -1 : 1) * (0.1 + random() * 0.06), angles, wobble: random() * 6 });
  }
  const bandCount = bands.reduce((sum, band) => sum + band.angles.length, 0);
  // Still chloroplasts on the rounded ends (top around the child, and bottom).
  const caps: { at: THREE.Vector3; normal: THREE.Vector3; spin: number }[] = [];
  for (const [end, count] of [
    [1, 9],
    [-1, 7],
  ] as const) {
    for (let tries = 0; caps.filter((cap) => Math.sign(cap.at.y) === end).length < count && tries < 400; tries++) {
      const polar = 0.3 + random() * 0.85;
      const a = random() * Math.PI * 2;
      const normal = new THREE.Vector3(Math.sin(polar) * Math.cos(a), end * Math.cos(polar), Math.sin(polar) * Math.sin(a));
      const at = new THREE.Vector3(0, end * HALF, 0).addScaledVector(normal, LAYER);
      if (end > 0 && at.distanceTo(heroAt) < 0.95) continue;
      if (caps.some((cap) => cap.at.distanceTo(at) < 0.8)) continue;
      caps.push({ at, normal, spin: random() * Math.PI });
    }
  }
  const plasts = new THREE.InstancedMesh(plastGeometry, plastMaterial, bandCount + caps.length);
  plasts.renderOrder = 1;
  const tangent = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const side = new THREE.Vector3();
  caps.forEach((cap, k) => {
    tangent.set(1, 0, 0).applyAxisAngle(up, cap.spin).addScaledVector(cap.normal, -cap.normal.dot(tangent.set(1, 0, 0).applyAxisAngle(up, cap.spin)));
    tangent.normalize();
    side.crossVectors(tangent, cap.normal);
    m.makeBasis(tangent, cap.normal, side).scale(PLAST);
    m.setPosition(cap.at);
    plasts.setMatrixAt(bandCount + k, m);
    plasts.setColorAt(bandCount + k, c.setHSL(0.3 + random() * 0.03, 0.55, 0.8 + random() * 0.15));
  });
  for (let k = 0; k < bandCount; k++) plasts.setColorAt(k, c.setHSL(0.3 + random() * 0.03, 0.55, 0.8 + random() * 0.15));
  root.add(plasts);

  /* ---------------- Mitochondria riding the stream between the bands. ---------------- */
  const mitoSpecs = Array.from({ length: 7 }, (_, k) => ({
    y: -HALF + 0.8 + (k / 6) * (HALF * 2 - 1.6) + (random() - 0.5) * 0.3,
    angle: random() * Math.PI * 2,
    speed: (random() < 0.5 ? -1 : 1) * (0.14 + random() * 0.05),
    tilt: (random() - 0.5) * 0.8,
  }));
  const mitochondria = new THREE.InstancedMesh(
    kit.geometry(new THREE.CapsuleGeometry(0.1, 0.26, 4, 12)),
    kit.toon("#ff8a5c", { rim: 0.5, rimColor: "#ffd9c2", gloss: 0.4 }),
    mitoSpecs.length,
  );
  root.add(mitochondria);

  // Tiny particles (ribosomes, vesicles) swept along in the cytoplasm.
  const dotCount = kit.count(160, 80);
  const dotSpecs = Array.from({ length: dotCount }, () => ({
    y: -HALF - 0.6 + random() * (HALF * 2 + 1.2),
    angle: random() * Math.PI * 2,
    r: 1.5 + random() * 0.35,
    speed: (random() < 0.5 ? -1 : 1) * (0.12 + random() * 0.08),
  }));
  const dots = kit.points(new Float32Array(dotCount * 3), { size: 0.07, color: "#f4fff0", soft: 0.4, opacity: 0.7 });
  const dotPosition = dots.geometry.getAttribute("position") as THREE.BufferAttribute;
  root.add(dots);

  /* ================= Surroundings ================= */
  // Neighbouring palisade cells (a row beside it and a staggered row behind).
  const neighbourAt: [number, number, number][] = [
    [-4.25, 0.15, -0.3],
    [4.25, -0.1, -0.5],
    [-8.5, 0.05, -0.2],
    [8.5, 0.2, -0.4],
    [-2.15, -0.05, -3.9],
    [2.15, 0.1, -4.0],
    [-6.4, 0.2, -3.8],
    [6.4, -0.1, -3.9],
  ];
  const neighbourWalls = new THREE.InstancedMesh(
    kit.geometry(new THREE.CapsuleGeometry(R, HALF * 2, 6, 28)),
    kit.toon("#8fcfae", { rim: 0.7, rimColor: "#cfffe6", gloss: 0.25, soft: 0.3, env: true, opacity: 0.2, depthWrite: false }),
    neighbourAt.length,
  );
  neighbourWalls.renderOrder = 3;
  const perNeighbour = kit.count(46, 26);
  const neighbourPlasts = new THREE.InstancedMesh(
    kit.geometry(new THREE.SphereGeometry(1, 10, 6)),
    tintShadow(kit.textured(texture, { rim: 0.35, gloss: 0.2, env: true }), SHADE, TINT),
    neighbourAt.length * perNeighbour,
  );
  let np = 0;
  neighbourAt.forEach(([x, y, z], k) => {
    const tall = 0.97 + random() * 0.05;
    neighbourWalls.setMatrixAt(k, m.compose(p.set(x, y, z), q.identity(), s.set(1, tall, 1)));
    neighbourWalls.setColorAt(k, c.set(z < -2 ? "#7fb89a" : "#ffffff"));
    for (let i = 0; i < perNeighbour; i++) {
      const a = random() * Math.PI * 2;
      const yy = (random() * 2 - 1) * (HALF + 0.9);
      normal.set(Math.cos(a), 0, Math.sin(a));
      if (Math.abs(yy) > HALF) normal.y = Math.sign(yy) * (Math.abs(yy) - HALF) * 1.6;
      normal.normalize();
      const at = new THREE.Vector3(x, y + Math.max(-HALF, Math.min(HALF, yy)) * tall, z).addScaledVector(normal, LAYER);
      tangent.set(-normal.z, 0, normal.x).normalize();
      side.crossVectors(tangent, normal).normalize();
      m.makeBasis(tangent, normal, side).scale(PLAST);
      m.setPosition(at);
      neighbourPlasts.setMatrixAt(np, m);
      neighbourPlasts.setColorAt(np++, c.setHSL(0.37, 0.28, z < -2 ? 0.26 : 0.38));
    }
  });
  neighbourPlasts.count = np;
  env.add(neighbourPlasts, neighbourWalls);

  // Clear upper epidermis above (20 µm) and its waxy cuticle.
  const epidermis = new THREE.InstancedMesh(
    kit.geometry(new RoundedBoxGeometry(1, 1, 1, 3, 0.3)),
    kit.toon("#ffffff", { rim: 0.8, rimColor: "#ffffff", gloss: 0.5, soft: 0.3, env: true, shadow: "#7fc8b4" }),
    9,
  );
  for (let k = 0; k < 9; k++) {
    const x = -16 + k * 6.6 + (k % 2) * 0.4;
    epidermis.setMatrixAt(k, m.compose(p.set(x, HALF + R + 2.0, -1.5 - (k % 3) * 0.6), q.identity(), s.set(6.3, 3.0, 7)));
    epidermis.setColorAt(k, c.set(k % 2 ? "#bdf2df" : "#c9f7e6"));
  }
  env.add(epidermis);
  const cuticle = new THREE.Mesh(
    kit.geometry(new THREE.BoxGeometry(60, 0.5, 14)),
    kit.toon("#e9ffb0", { opacity: 0.55, gloss: 0.6, rim: 0.6, rimColor: "#ffffff", env: true }),
  );
  cuticle.position.set(0, HALF + R + 3.75, -3);
  env.add(cuticle);

  // Loose spongy cells below, with air between them.
  const spongy = new THREE.InstancedMesh(
    kit.blob(1, { detail: 8, noise: 0.16, frequency: 1.3, seed: 41 }),
    tintShadow(kit.toon("#4f9a5c", { rim: 0.5, rimColor: "#b8f0b0", gloss: 0.2, env: true }), SHADE, TINT),
    9,
  );
  for (let k = 0; k < 9; k++) {
    const x = -12 + k * 3.1 + (random() - 0.5);
    const r = 1.3 + random() * 0.6;
    q.setFromEuler(new THREE.Euler(random() * 3, random() * 3, random() * 3));
    spongy.setMatrixAt(k, m.compose(p.set(x, -HALF - R - 2.4 - r * 0.7 - random() * 0.8, (random() - 0.5) * 5 - 3), q, s.setScalar(r)));
  }
  env.add(spongy);

  // Sunlight falling from above.
  const beamTexture = kit.canvasTexture(64, 256, (g, w, h) => {
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, "rgba(255, 246, 200, 0.85)");
    grad.addColorStop(1, "rgba(255, 246, 200, 0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    const across = g.createLinearGradient(0, 0, w, 0);
    across.addColorStop(0, "rgba(0,0,0,1)");
    across.addColorStop(0.5, "rgba(0,0,0,0)");
    across.addColorStop(1, "rgba(0,0,0,1)");
    g.globalCompositeOperation = "destination-out";
    g.fillStyle = across;
    g.fillRect(0, 0, w, h);
  });
  const beamMaterial = kit.track(
    new THREE.MeshBasicMaterial({ map: beamTexture, transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }),
  );
  [-5.5, -1.2, 3.8].forEach((x, k) => {
    const beam = new THREE.Mesh(kit.geometry(new THREE.PlaneGeometry(2.2 + k * 0.5, 16)), beamMaterial);
    beam.position.set(x, 4, -5 + k);
    beam.rotation.z = -0.28;
    env.add(beam);
  });

  const placePlast = (index: number, angle: number, y: number, radius: number, scale: number) => {
    normal.set(Math.cos(angle), 0, Math.sin(angle));
    tangent.set(-Math.sin(angle), 0, Math.cos(angle));
    m.makeBasis(tangent, normal, up).scale(s.copy(PLAST).multiplyScalar(scale));
    m.setPosition(normal.x * radius, y, normal.z * radius);
    plasts.setMatrixAt(index, m);
  };
  const nucleusGap = (angle: number, y: number) => {
    let d = Math.abs(((angle - NUCLEUS_ANGLE + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
    d = Math.max(0, d - 0.25);
    return Math.abs(y - NUCLEUS_Y) < 1.3 ? THREE.MathUtils.smoothstep(d, 0, 0.45) : 1;
  };
  return {
    root,
    env,
    update({ time, immersion }) {
      backMaterial.uniforms.uColor.value.copy(backFar).lerp(backNear, immersion);
      backMaterial.uniforms.uOpacity.value = 0.92 - 0.4 * immersion;
      // Cytoplasmic streaming: each band turns slowly, alternating directions.
      let index = 0;
      for (const band of bands) {
        const y = band.y + Math.sin(time * 0.6 + band.wobble) * 0.04;
        for (const a0 of band.angles) {
          const a = a0 + time * band.speed;
          const hide = nucleusGap(a, y);
          placePlast(index++, a, y, LAYER - (1 - hide) * 0.3, 0.2 + 0.8 * hide);
        }
      }
      plasts.instanceMatrix.needsUpdate = true;
      mitoSpecs.forEach((mito, k) => {
        const a = mito.angle + time * mito.speed;
        normal.set(Math.cos(a), 0, Math.sin(a));
        tangent.set(-Math.sin(a), mito.tilt, Math.cos(a)).normalize();
        q.setFromUnitVectors(up, tangent);
        const hide = nucleusGap(a, mito.y);
        mitochondria.setMatrixAt(k, m.compose(p.set(normal.x * 1.62, mito.y, normal.z * 1.62), q, s.setScalar(0.2 + 0.8 * hide)));
      });
      mitochondria.instanceMatrix.needsUpdate = true;
      dotSpecs.forEach((dot, k) => {
        const a = dot.angle + time * dot.speed;
        const y = Math.max(-HALF, Math.min(HALF, dot.y));
        const cap = Math.abs(dot.y) > HALF ? Math.sqrt(Math.max(0, 1 - ((Math.abs(dot.y) - HALF) / R) ** 2)) : 1;
        dotPosition.setXYZ(k, Math.cos(a) * dot.r * cap, dot.y > HALF || dot.y < -HALF ? dot.y : y, Math.sin(a) * dot.r * cap);
      });
      dotPosition.needsUpdate = true;
      vacuole.scale.set(1 + Math.sin(time * 0.8) * 0.006, 1, 1 + Math.sin(time * 0.8) * 0.006);
    },
  };
};

export default leafCell;
