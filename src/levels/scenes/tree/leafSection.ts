/**
 * A leaf in cross-section (1 unit = 0.1 mm): a cut-away block of blade with
 * real layer thicknesses. From the top: waxy cuticle, clear upper epidermis,
 * a row of 60 µm palisade cells lined with chloroplasts, spongy mesophyll with
 * air spaces, a vein (xylem above, phloem below, in a sheath of cells) and the
 * lower epidermis with a stoma. Water from the xylem evaporates into the air
 * spaces and leaves through the stoma with O₂, while CO₂ comes in.
 * The child "leaf-cell" is one palisade cell of the front row (not drawn here).
 */
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { rng } from "../../../engine/kit";
import type { Kit } from "../../../engine/kit";
import type { SceneBuilder } from "../types";
import { tintShadow } from "./treeShared";

/** Half extents of the block (x, z) and layer boundaries (y). */
export const SECTION = {
  x: 3.1,
  z: 2.1,
  top: 1.13,
  epidermisTop: 1.1,
  palisadeTop: 0.9,
  palisadeBottom: 0.26,
  spongyBottom: -0.92,
  bottom: -1.1,
  /** Palisade cells: 60 µm tall, 24 µm wide. */
  cellHeight: 0.6,
  cellRadius: 0.12,
  pitch: 0.24,
} as const;
const PALISADE_Y = (SECTION.palisadeTop + SECTION.palisadeBottom) / 2;
const VEIN = new THREE.Vector3(-1.55, -0.32, 0);
const VEIN_RADIUS = 0.42;
const STOMA = new THREE.Vector3(1.75, -1.02, SECTION.z);

const LEAF_SHADE: [number, number, number] = [0.42, 0.6, 0.72];
const LEAF_TINT: [number, number, number] = [0.04, 0.15, 0.26];

/** A path-following stream of soft dots (gases, water). */
function stream(kit: Kit, path: THREE.Vector3[], count: number, color: string, size: number, seed: number) {
  const curve = new THREE.CatmullRomCurve3(path);
  const random = rng(seed);
  const offsets = Array.from({ length: count }, () => ({
    phase: random(),
    jitter: new THREE.Vector3((random() - 0.5) * 0.22, (random() - 0.5) * 0.12, (random() - 0.5) * 0.1),
    wobble: random() * 6,
  }));
  const positions = new Float32Array(count * 3);
  const points = kit.points(positions, { size, color, soft: 0.35, opacity: 0.95, env: true });
  const position = points.geometry.getAttribute("position") as THREE.BufferAttribute;
  const sizes = points.geometry.getAttribute("aSize") as THREE.BufferAttribute;
  const p = new THREE.Vector3();
  return {
    points,
    update(time: number, speed: number, open: number) {
      offsets.forEach((o, i) => {
        const t = (o.phase + time * speed) % 1;
        curve.getPointAt(t, p);
        const spread = Math.sin(Math.PI * t);
        p.addScaledVector(o.jitter, 0.4 + spread);
        p.y += Math.sin(time * 1.7 + o.wobble) * 0.02;
        position.setXYZ(i, p.x, p.y, p.z);
        sizes.setX(i, Math.pow(spread, 0.35) * open);
      });
      position.needsUpdate = true;
      sizes.needsUpdate = true;
    },
  };
}

const leafSection: SceneBuilder = ({ kit, children }) => {
  const root = new THREE.Group();
  const env = new THREE.Group();
  const random = rng(21);
  const cellChild = children.find((child) => child.id === "leaf-cell");
  const slot = cellChild ? new THREE.Vector3(...cellChild.at) : new THREE.Vector3(0.66, PALISADE_Y, SECTION.z - 0.12);

  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();
  const c = new THREE.Color();

  /* ---------------- Interior filler: dark air and tissue behind the exposed cells. ---------------- */
  const filler = new THREE.BoxGeometry(SECTION.x * 2 - 0.1, SECTION.top - SECTION.bottom - 0.06, SECTION.z * 2 - 0.1, 1, 24, 1);
  const fillerColors: number[] = [];
  const fp = filler.getAttribute("position");
  for (let i = 0; i < fp.count; i++) {
    const y = fp.getY(i) + (SECTION.top + SECTION.bottom) / 2;
    c.set(y > SECTION.palisadeTop ? "#b8e6a8" : y > SECTION.palisadeBottom ? "#1f6b40" : y > SECTION.spongyBottom ? "#123c34" : "#9fd6a0");
    fillerColors.push(c.r, c.g, c.b);
  }
  filler.setAttribute("color", new THREE.Float32BufferAttribute(fillerColors, 3));
  filler.translate(0, (SECTION.top + SECTION.bottom) / 2, 0);
  root.add(new THREE.Mesh(kit.geometry(filler), kit.toon("#ffffff", { vertexColors: true, rim: 0, gloss: 0, soft: 0.6 })));

  /* ---------------- Top surface: pavement cells seen through the waxy cuticle. ---------------- */
  const topTexture = kit.canvasTexture(1024, 660, (g, w, h) => {
    g.fillStyle = "#4db54c";
    g.fillRect(0, 0, w, h);
    // Jigsaw-like pavement cells: jittered grid, wavy outlines.
    const cells = rng(3);
    const size = 62;
    g.strokeStyle = "rgba(214, 250, 160, 0.6)";
    g.lineWidth = 3;
    for (let y = 0; y < h + size; y += size * 0.8) {
      for (let x = (Math.floor(y / (size * 0.8)) % 2) * size * 0.5; x < w + size; x += size) {
        const cx = x + (cells() - 0.5) * 16;
        const cy = y + (cells() - 0.5) * 16;
        g.beginPath();
        for (let k = 0; k <= 24; k++) {
          const a = (k / 24) * Math.PI * 2;
          const r = size * 0.5 * (1 + 0.12 * Math.sin(a * 5 + cx) + 0.06 * Math.sin(a * 9 + cy));
          const px = cx + Math.cos(a) * r;
          const py = cy + Math.sin(a) * r * 0.8;
          if (k === 0) g.moveTo(px, py);
          else g.lineTo(px, py);
        }
        g.fillStyle = `rgba(120, 210, 100, ${0.15 + cells() * 0.2})`;
        g.fill();
        g.stroke();
      }
    }
  });
  const topGeometry = kit.geometry(new THREE.PlaneGeometry(SECTION.x * 2, SECTION.z * 2));
  topGeometry.rotateX(-Math.PI / 2);
  const top = new THREE.Mesh(topGeometry, tintShadow(kit.textured(topTexture, { rim: 0.2, gloss: 0.1, soft: 0.4 }), LEAF_SHADE, LEAF_TINT));
  top.position.y = SECTION.epidermisTop + 0.005;
  root.add(top);
  // Cuticle: a thin glossy sheet of wax over everything.
  const cuticle = new THREE.Mesh(
    kit.geometry(new RoundedBoxGeometry(SECTION.x * 2 + 0.04, 0.05, SECTION.z * 2 + 0.04, 2, 0.02)),
    kit.toon("#e9ffb0", { opacity: 0.45, gloss: 0.6, rim: 0.7, rimColor: "#ffffff", soft: 0.2, depthWrite: false }),
  );
  cuticle.position.y = SECTION.top - 0.02;
  root.add(cuticle);

  /* ---------------- Epidermis cells along the two cut faces (upper and lower). ---------------- */
  const epiGeometry = kit.geometry(new RoundedBoxGeometry(1, 1, 1, 2, 0.3));
  const epiCells: { x: number; y: number; z: number; w: number; h: number; d: number }[] = [];
  const edgeRow = (y: number, h: number, width: number, skip?: (x: number, z: number) => boolean) => {
    for (let x = -SECTION.x + width / 2; x < SECTION.x - width / 2 + 0.01; x += width) {
      if (skip?.(x, SECTION.z)) continue;
      epiCells.push({ x, y, z: SECTION.z - 0.1, w: width - 0.025, h, d: 0.2 });
    }
    for (let z = SECTION.z - width * 1.5; z > -SECTION.z + width / 2 - 0.01; z -= width) {
      if (skip?.(SECTION.x, z)) continue;
      epiCells.push({ x: SECTION.x - 0.1, y, z, w: 0.2, h, d: width - 0.025 });
    }
  };
  edgeRow((SECTION.epidermisTop + SECTION.palisadeTop) / 2, 0.18, 0.4);
  edgeRow((SECTION.spongyBottom + SECTION.bottom) / 2, 0.16, 0.34, (x, z) => z === SECTION.z && Math.abs(x - STOMA.x) < 0.3);
  const epidermis = new THREE.InstancedMesh(
    epiGeometry,
    kit.toon("#ffffff", { rim: 0.7, rimColor: "#ffffff", gloss: 0.5, soft: 0.3, shadow: "#6fb3a4" }),
    epiCells.length,
  );
  epiCells.forEach((e, k) => {
    epidermis.setMatrixAt(k, m.compose(p.set(e.x, e.y, e.z), q.identity(), s.set(e.w, e.h, e.d)));
    epidermis.setColorAt(k, c.set(e.y > 0 ? "#c9f7e6" : "#b9eed8"));
  });
  root.add(epidermis);

  /* ---------------- Palisade cells and their chloroplasts. ---------------- */
  const cellGeometry = kit.geometry(new THREE.CapsuleGeometry(SECTION.cellRadius * 0.94, SECTION.cellHeight - SECTION.cellRadius * 2, 4, 12));
  const cellsSpec: { at: THREE.Vector3; normal: THREE.Vector3; tall: number }[] = [];
  const count = Math.round((SECTION.x * 2) / SECTION.pitch);
  for (let i = 0; i < count; i++) {
    const x = -SECTION.x + SECTION.pitch * (i + 0.5);
    const at = new THREE.Vector3(x, PALISADE_Y + (random() - 0.5) * 0.03, SECTION.z - SECTION.cellRadius);
    if (at.distanceTo(new THREE.Vector3(slot.x, at.y, slot.z)) < 0.1) continue;
    cellsSpec.push({ at, normal: new THREE.Vector3(0, 0, 1), tall: 0.95 + random() * 0.06 });
  }
  for (let i = 1; i < Math.round((SECTION.z * 2) / SECTION.pitch); i++) {
    const z = SECTION.z - SECTION.pitch * (i + 0.5);
    cellsSpec.push({
      at: new THREE.Vector3(SECTION.x - SECTION.cellRadius, PALISADE_Y + (random() - 0.5) * 0.03, z),
      normal: new THREE.Vector3(1, 0, 0),
      tall: 0.95 + random() * 0.06,
    });
  }
  const palisade = new THREE.InstancedMesh(
    cellGeometry,
    tintShadow(kit.toon("#c8f5b4", { rim: 0.5, rimColor: "#f4fff0", gloss: 0.3, soft: 0.3 }), LEAF_SHADE, LEAF_TINT),
    cellsSpec.length,
  );
  cellsSpec.forEach((cell, k) => palisade.setMatrixAt(k, m.compose(cell.at, q.identity(), s.set(1, cell.tall, 1))));
  root.add(palisade);

  // Chloroplasts: lens-shaped grains lining the exposed walls.
  const plastGeometry = kit.geometry(new THREE.SphereGeometry(1, 6, 4));
  const plastSpecs: { at: THREE.Vector3; normal: THREE.Vector3; size: number }[] = [];
  const up = new THREE.Vector3(0, 1, 0);
  for (const cell of cellsSpec) {
    const side = new THREE.Vector3().crossVectors(up, cell.normal);
    for (let k = 0; k < 20; k++) {
      const h = (random() - 0.5) * (SECTION.cellHeight - 0.14) * cell.tall;
      const a = (random() - 0.5) * 2.4;
      const n = cell.normal.clone().multiplyScalar(Math.cos(a)).addScaledVector(side, Math.sin(a));
      plastSpecs.push({ at: cell.at.clone().addScaledVector(n, SECTION.cellRadius * 0.9).add(new THREE.Vector3(0, h, 0)), normal: n, size: 0.025 + random() * 0.004 });
    }
  }

  /* ---------------- Spongy mesophyll: loose, lobed cells with air between them. ---------------- */
  const blobGeometries = [0, 1, 2].map((k) => kit.blob(1, { detail: 2, noise: 0.16, frequency: 1.3, seed: 40 + k }));
  const spongySpecs: { at: THREE.Vector3; scale: THREE.Vector3; normal: THREE.Vector3; kind: number }[] = [];
  const spongyTop = SECTION.palisadeBottom - 0.04;
  const spongyBottom = SECTION.spongyBottom + 0.06;
  const avoid = (x: number, y: number, z: number) =>
    Math.hypot(x - VEIN.x, y - VEIN.y) < VEIN_RADIUS + 0.12 && z > 0 ||
    (Math.abs(x - STOMA.x) < 0.22 && y < -0.5 && z > SECTION.z - 0.5);
  const placeSpongy = (face: "front" | "right") => {
    const span = face === "front" ? SECTION.x * 2 : SECTION.z * 2 - 0.3;
    const placed: THREE.Vector2[] = [];
    for (let tries = 0; tries < 900; tries++) {
      const u = random() * span;
      const y = spongyBottom + random() * (spongyTop - spongyBottom);
      const r = 0.1 + random() * 0.07;
      const x = face === "front" ? -SECTION.x + u : SECTION.x - r * 0.9;
      const z = face === "front" ? SECTION.z - r * 0.9 : SECTION.z - 0.3 - u;
      if (face === "front" && (x < -SECTION.x + r * 0.6 || x > SECTION.x - r * 0.6)) continue;
      if (avoid(x, y, z)) continue;
      const here = new THREE.Vector2(u, y);
      if (placed.some((o) => o.distanceTo(here) < r * 1.75 + 0.03)) continue;
      placed.push(here);
      spongySpecs.push({
        at: new THREE.Vector3(x, y, z),
        scale: new THREE.Vector3(r * (0.9 + random() * 0.5), r * (0.8 + random() * 0.4), r * (0.9 + random() * 0.4)),
        normal: face === "front" ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(1, 0, 0),
        kind: Math.floor(random() * 3),
      });
    }
  };
  placeSpongy("front");
  placeSpongy("right");
  const spongyMaterial = tintShadow(kit.toon("#a8e890", { rim: 0.45, rimColor: "#eaffd8", gloss: 0.25, soft: 0.3 }), LEAF_SHADE, LEAF_TINT);
  blobGeometries.forEach((geometry, kind) => {
    const list = spongySpecs.filter((spec) => spec.kind === kind);
    const mesh = new THREE.InstancedMesh(geometry, spongyMaterial, list.length);
    list.forEach((spec, k) => {
      q.setFromEuler(new THREE.Euler(random() * 6, random() * 6, random() * 6));
      mesh.setMatrixAt(k, m.compose(spec.at, q, spec.scale));
    });
    root.add(mesh);
  });
  for (const spec of spongySpecs)
    for (let k = 0; k < 5; k++) {
      const n = spec.normal.clone().add(new THREE.Vector3((random() - 0.5) * 1.4, (random() - 0.5) * 1.4, (random() - 0.5) * 1.4)).normalize();
      if (n.dot(spec.normal) < 0.2) continue;
      plastSpecs.push({ at: spec.at.clone().addScaledVector(n, spec.scale.x * 0.92), normal: n, size: 0.024 + random() * 0.005 });
    }

  /* ---------------- The vein: bundle sheath, xylem (up) and phloem (down). ---------------- */
  const veinFront = SECTION.z - 0.02;
  const sheathGeometry = kit.geometry(new THREE.SphereGeometry(1, 14, 10));
  const sheath = new THREE.InstancedMesh(
    sheathGeometry,
    tintShadow(kit.toon("#d2f2a0", { rim: 0.5, rimColor: "#ffffff", gloss: 0.3 }), LEAF_SHADE, LEAF_TINT),
    14,
  );
  for (let k = 0; k < 14; k++) {
    const a = (k / 14) * Math.PI * 2;
    const at = new THREE.Vector3(VEIN.x + Math.cos(a) * (VEIN_RADIUS - 0.07), VEIN.y + Math.sin(a) * (VEIN_RADIUS - 0.07) * 0.92, veinFront - 0.1);
    sheath.setMatrixAt(k, m.compose(at, q.identity(), s.set(0.105, 0.1, 0.12)));
    for (let j = 0; j < 3; j++) {
      const n = new THREE.Vector3(Math.cos(a) * 0.3 + (random() - 0.5) * 0.6, Math.sin(a) * 0.3 + (random() - 0.5) * 0.6, 1).normalize();
      plastSpecs.push({ at: at.clone().add(new THREE.Vector3(n.x * 0.09, n.y * 0.09, n.z * 0.11)), normal: n, size: 0.022 });
    }
  }
  root.add(sheath);
  // Inner core of the bundle (dark background for the vessels).
  const core = new THREE.Mesh(kit.geometry(new THREE.CircleGeometry(VEIN_RADIUS - 0.1, 32)), kit.flat("#2a2350"));
  core.position.set(VEIN.x, VEIN.y, veinFront - 0.03);
  core.scale.y = 0.92;
  root.add(core);
  // Xylem: wide vessels with thick lignified walls, full of water.
  const xylemAt: [number, number, number][] = [
    [-0.13, 0.13, 0.062],
    [0.03, 0.17, 0.058],
    [0.17, 0.1, 0.05],
    [-0.02, 0.03, 0.055],
    [-0.19, 0.0, 0.045],
    [0.15, -0.02, 0.04],
  ];
  const ringGeometry = kit.geometry(new THREE.TorusGeometry(1, 0.28, 8, 20));
  const xylemWalls = new THREE.InstancedMesh(ringGeometry, kit.toon("#b98cff", { rim: 0.4, rimColor: "#f0e0ff", gloss: 0.3 }), xylemAt.length);
  const lumenGeometry = kit.geometry(new THREE.CircleGeometry(1, 20));
  const water = new THREE.InstancedMesh(lumenGeometry, kit.flat("#6fd8ff"), xylemAt.length);
  xylemAt.forEach(([dx, dy, r], k) => {
    xylemWalls.setMatrixAt(k, m.compose(p.set(VEIN.x + dx, VEIN.y + dy, veinFront), q.identity(), s.set(r, r, r)));
    water.setMatrixAt(k, m.compose(p.set(VEIN.x + dx, VEIN.y + dy, veinFront - 0.005), q.identity(), s.set(r * 0.9, r * 0.9, 1)));
  });
  root.add(xylemWalls, water);
  // Phloem: smaller sieve tubes and companion cells, carrying sugar.
  const phloem = new THREE.InstancedMesh(sheathGeometry, kit.toon("#ffc56b", { rim: 0.45, rimColor: "#fff2d0", gloss: 0.35 }), 9);
  for (let k = 0; k < 9; k++) {
    const a = Math.PI * (1.15 + (k / 8) * 0.7);
    const rr = k % 2 ? 0.2 : 0.12;
    const r = k % 2 ? 0.036 : 0.042;
    phloem.setMatrixAt(k, m.compose(p.set(VEIN.x + Math.cos(a) * rr, VEIN.y - 0.06 + Math.sin(a) * rr * 0.85, veinFront - 0.02), q.identity(), s.set(r, r, r * 0.7)));
    phloem.setColorAt(k, c.set(k % 2 ? "#ffdd8a" : "#ffb54f"));
  }
  root.add(phloem);

  /* ---------------- The stoma: two bean-shaped guard cells around a pore. ---------------- */
  const guardGeometry = kit.geometry(new THREE.TorusGeometry(0.12, 0.055, 12, 24, Math.PI));
  const guardMaterial = tintShadow(kit.toon("#b8f06a", { rim: 0.6, rimColor: "#ffffe0", gloss: 0.45 }), LEAF_SHADE, LEAF_TINT);
  // Two kidney-shaped guard cells on either side of the pore (the slit runs into the leaf).
  const guards = [1, -1].map((side) => {
    const holder = new THREE.Group();
    const guard = new THREE.Mesh(guardGeometry, guardMaterial);
    guard.rotation.x = Math.PI / 2;
    guard.scale.set(1.55, 1.1, 1.15);
    holder.add(guard);
    holder.rotation.y = side * (Math.PI / 2);
    holder.userData.side = side;
    root.add(holder);
    return holder;
  });
  // Guard cells are the only epidermal cells with chloroplasts.
  const guardPlasts: { guard: THREE.Group; local: THREE.Vector3 }[] = [];
  const plastOffset = plastSpecs.length;
  for (const guard of guards)
    for (let k = 0; k < 4; k++) {
      const a = ((k + 0.5) / 4) * Math.PI;
      guardPlasts.push({ guard, local: new THREE.Vector3(0.12 * 1.55 * Math.cos(a) * 0.9, 0.06, 0.12 * 1.1 * Math.sin(a) + 0.02) });
      plastSpecs.push({ at: new THREE.Vector3(), normal: new THREE.Vector3(0, 0.6, 0.8).normalize(), size: 0.02 });
    }

  // All chloroplasts in one instanced mesh.
  const chloroplasts = new THREE.InstancedMesh(
    plastGeometry,
    tintShadow(kit.toon("#ffffff", { rim: 0.35, rimColor: "#b8ff8a", gloss: 0.3, soft: 0.25 }), LEAF_SHADE, LEAF_TINT),
    plastSpecs.length,
  );
  const zAxis = new THREE.Vector3(0, 0, 1);
  plastSpecs.forEach((plast, k) => {
    q.setFromUnitVectors(zAxis, plast.normal);
    chloroplasts.setMatrixAt(k, m.compose(plast.at, q, s.set(plast.size, plast.size * 0.66, plast.size * 0.46)));
    chloroplasts.setColorAt(k, c.set(random() < 0.5 ? "#2aa53d" : "#36b546"));
  });
  root.add(chloroplasts);

  /* ================= Surroundings ================= */
  // Sunlight falling on the upper surface.
  const beamTexture = kit.canvasTexture(64, 256, (g, w, h) => {
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, "rgba(255, 246, 200, 0)");
    grad.addColorStop(0.5, "rgba(255, 246, 200, 0.5)");
    grad.addColorStop(1, "rgba(255, 246, 200, 0.9)");
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
    new THREE.MeshBasicMaterial({ map: beamTexture, transparent: true, opacity: 0.25, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }),
  );
  const beams: THREE.Mesh[] = [];
  [-2.4, -0.6, 1.3, 2.9].forEach((x, k) => {
    const beam = new THREE.Mesh(kit.geometry(new THREE.PlaneGeometry(0.9 + k * 0.15, 6)), beamMaterial);
    beam.position.set(x - 1.2, SECTION.top + 3, -0.4 + k * 0.3);
    beam.rotation.z = -0.35;
    env.add(beam);
    beams.push(beam);
  });
  // Photons landing on the surface: small warm sparkles.
  const sparkles: number[] = [];
  for (let k = 0; k < 40; k++) sparkles.push((random() * 2 - 1) * SECTION.x, SECTION.top + 0.04, (random() * 2 - 1) * SECTION.z);
  const photonPoints = kit.points(sparkles, { size: 0.09, color: "#fff4b8", soft: 1, twinkle: 1, additive: true, env: true });
  env.add(photonPoints);

  // Gas exchange through the stoma (dots are symbols: real molecules are far too small to see here).
  const pore = STOMA.clone().add(new THREE.Vector3(0, 0, 0.06));
  const chamber = new THREE.Vector3(STOMA.x, -0.62, SECTION.z + 0.06);
  const co2 = stream(
    kit,
    [new THREE.Vector3(STOMA.x - 1.2, -2.6, SECTION.z + 0.6), new THREE.Vector3(STOMA.x - 0.25, -1.7, SECTION.z + 0.25), pore, chamber, new THREE.Vector3(STOMA.x - 0.7, -0.1, SECTION.z + 0.08), new THREE.Vector3(STOMA.x - 1.3, 0.3, SECTION.z + 0.08)],
    kit.count(22, 12),
    "#f2f5ff",
    0.1,
    1,
  );
  const o2 = stream(
    kit,
    [new THREE.Vector3(STOMA.x + 0.6, 0.2, SECTION.z + 0.08), new THREE.Vector3(STOMA.x + 0.25, -0.35, SECTION.z + 0.08), chamber, pore, new THREE.Vector3(STOMA.x + 0.4, -1.8, SECTION.z + 0.3), new THREE.Vector3(STOMA.x + 1.5, -2.7, SECTION.z + 0.7)],
    kit.count(18, 10),
    "#ff7a92",
    0.095,
    2,
  );
  const vapour = stream(
    kit,
    [new THREE.Vector3(VEIN.x + 0.1, VEIN.y + 0.1, SECTION.z + 0.05), new THREE.Vector3(VEIN.x + 0.9, -0.55, SECTION.z + 0.08), new THREE.Vector3(STOMA.x - 0.5, -0.75, SECTION.z + 0.08), chamber, pore, new THREE.Vector3(STOMA.x + 0.1, -1.9, SECTION.z + 0.4), new THREE.Vector3(STOMA.x + 0.6, -2.9, SECTION.z + 0.9)],
    kit.count(26, 14),
    "#7fd6ff",
    0.09,
    3,
  );
  env.add(co2.points, o2.points, vapour.points);

  return {
    root,
    env,
    update({ time }) {
      // Guard cells swell (pore opens) for most of a 10 s cycle, then relax (pore closes).
      const cycle = (time % 10) / 10;
      const open = THREE.MathUtils.smoothstep(cycle, 0.02, 0.18) * (1 - THREE.MathUtils.smoothstep(cycle, 0.8, 0.95));
      const gap = 0.02 + 0.05 * open;
      guards.forEach((guard) => {
        guard.position.set(STOMA.x + guard.userData.side * gap, STOMA.y, STOMA.z - 0.1);
        guard.scale.set(1, 1, 1.0 + 0.2 * open);
      });
      guardPlasts.forEach(({ guard, local }, k) => {
        guard.updateMatrix();
        p.copy(local).applyMatrix4(guard.matrix);
        chloroplasts.getMatrixAt(plastOffset + k, m);
        m.setPosition(p);
        chloroplasts.setMatrixAt(plastOffset + k, m);
      });
      chloroplasts.instanceMatrix.needsUpdate = true;
      const flow = 0.25 + 0.75 * open;
      co2.update(time, 0.07, flow);
      o2.update(time, 0.06, flow);
      vapour.update(time, 0.05, flow);
      beams.forEach((beam, k) => ((beam.material as THREE.MeshBasicMaterial).opacity = 0.22 + 0.05 * Math.sin(time * 0.7 + k)));
    },
  };
};

export default leafSection;
