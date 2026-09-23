/**
 * The inside of the basal keratinocyte, in cell units (1 unit = 1.2 µm).
 *
 * Built once by the `cell` scene (its subject) and again by the `nucleus`
 * scene (its surroundings, scaled ×2 around the nucleus), so the melanin cap,
 * mitochondria, ER and keratin stay in place while you dive into the nucleus.
 * The nucleus itself is the child level: nothing here is drawn inside its
 * radius, and nothing sits in front of it.
 */
import * as THREE from "three";
import type { Kit } from "../../../engine/kit";
import { fbm3, rng } from "../../../engine/kit";
import {
  instances,
  merge,
  randomDirection,
  randomQuaternion,
  smoothPath,
  sweepGeometry,
  type Placement,
} from "./cell-shapes";

export const CELL = {
  radius: 4.6,
  stretch: new THREE.Vector3(1.0, 1.06, 0.88),
  /** The front of the cell is cut away in front of this plane. */
  cutZ: 1.85,
  nucleusRadius: 2.5,
};

export const COLORS = {
  membrane: "#f25fae",
  membraneShade: "#9a2f8e",
  cytoplasm: "#ffc4e4",
  cytoplasmShade: "#d98ad0",
  lip: "#ff8fcf",
  mito: "#ff8a3d",
  er: "#79c9ff",
  erRibosome: "#3a4fd0",
  golgi: "#ffd23f",
  keratin: "#6ff0c8",
  desmosome: "#7b35d8",
  ribosome: "#9b5cf0",
  melanin: ["#5b2c1c", "#74391f", "#8f4b27", "#4a2216"],
};

/** Radial bumpiness of the membrane in direction `n` (unit vector). */
export function membraneScale(n: THREE.Vector3) {
  const base = 1 + 0.05 * fbm3(n.x * 1.5 + 3.1, n.y * 1.5 + 0.7, n.z * 1.5, 3, 11);
  // Basal cells sit flat on the basement membrane.
  const flat = n.y < -0.55 ? 1 - (-(n.y) - 0.55) * 0.18 : 1;
  return base * flat;
}

/** A point of the membrane in direction `n`, moved inwards by `inset`. */
export function membranePoint(n: THREE.Vector3, inset = 0, target = new THREE.Vector3()) {
  const r = CELL.radius * membraneScale(n) - inset;
  return target.set(n.x * r * CELL.stretch.x, n.y * r * CELL.stretch.y, n.z * r * CELL.stretch.z);
}

export function insideCell(p: THREE.Vector3, margin = 0) {
  const q = new THREE.Vector3(p.x / CELL.stretch.x, p.y / CELL.stretch.y, p.z / CELL.stretch.z);
  const n = q.clone().normalize();
  return q.length() < CELL.radius * membraneScale(n) - margin;
}

/** Painted cut face of a mitochondrion: outer membrane, matrix and folded cristae. */
function cristaeTexture(kit: Kit) {
  return kit.canvasTexture(512, 192, (g, w, h) => {
    const stadium = (inset: number) => {
      const r = h / 2 - inset;
      g.beginPath();
      g.moveTo(h / 2, inset);
      g.lineTo(w - h / 2, inset);
      g.arc(w - h / 2, h / 2, r, -Math.PI / 2, Math.PI / 2);
      g.lineTo(h / 2, h - inset);
      g.arc(h / 2, h / 2, r, Math.PI / 2, (3 * Math.PI) / 2);
      g.closePath();
    };
    g.clearRect(0, 0, w, h);
    stadium(2);
    g.fillStyle = "#ffb070";
    g.fill();
    stadium(14);
    g.fillStyle = "#e85a2c";
    g.fill();
    // Cristae: rounded folds of the inner membrane, alternating from each side.
    g.save();
    stadium(14);
    g.clip();
    g.strokeStyle = "#ffe2b8";
    g.lineCap = "round";
    g.lineWidth = 15;
    const folds = 9;
    for (let k = 0; k < folds; k++) {
      const x = h * 0.45 + ((w - h * 0.9) * (k + 0.5)) / folds;
      const top = k % 2 === 0;
      const depth = h * (0.5 + 0.14 * Math.sin(k * 2.3));
      g.beginPath();
      g.moveTo(x, top ? 0 : h);
      g.bezierCurveTo(x + 12, top ? depth * 0.4 : h - depth * 0.4, x - 12, top ? depth * 0.7 : h - depth * 0.7, x + 4, top ? depth : h - depth);
      g.stroke();
    }
    g.restore();
    stadium(14);
    g.strokeStyle = "#ffe2b8";
    g.lineWidth = 7;
    g.stroke();
    // A few matrix granules.
    g.fillStyle = "#ffcf8a";
    for (let k = 0; k < 7; k++) {
      g.beginPath();
      g.arc(h * 0.6 + ((w - h * 1.2) * k) / 6, h / 2 + (k % 2 ? 14 : -12), 5, 0, Math.PI * 2);
      g.fill();
    }
  });
}

export interface CellContents {
  group: THREE.Group;
  /** Stable places for hotspots and labels (cell units). */
  landmarks: Record<"melanin" | "mitochondrion" | "keratin" | "golgi" | "er", THREE.Vector3>;
  update(time: number): void;
}

/** Organelles, filaments and pigment of the cell, around a nucleus at `nucleusAt`. */
export function cellContents(
  kit: Kit,
  nucleusAt: THREE.Vector3,
  options: { env?: boolean; keratin?: boolean; vesicles?: boolean } = {},
): CellContents {
  const env = options.env ?? false;
  const withKeratin = options.keratin ?? true;
  const withVesicles = options.vesicles ?? true;
  const group = new THREE.Group();
  const N = nucleusAt.clone();
  const RN = CELL.nucleusRadius;
  const cutZ = CELL.cutZ;
  const capAxis = new THREE.Vector3(0.1, 1, 0.12).normalize();
  const golgiDir = new THREE.Vector3(1, 0.55, -0.25).normalize();
  const golgiCentre = N.clone().addScaledVector(golgiDir, RN + 0.95);
  const clearOfNucleus = (p: THREE.Vector3, margin: number) => p.distanceTo(N) > RN + margin;
  // Keep the space in front of the nucleus open (it is drawn on top of this level).
  const clearOfView = (p: THREE.Vector3, margin: number) => {
    const dx = p.x - N.x;
    const dy = p.y - N.y;
    return !(p.z > N.z - 0.6 && Math.hypot(dx, dy) < RN + margin);
  };

  /* ---------------- Melanin cap ---------------- */
  const random = rng(101);
  const granules: Placement[] = [];
  const side = new THREE.Vector3();
  const granuleCount = kit.count(78, 44);
  for (let tries = 0; granules.length < granuleCount && tries < 2000; tries++) {
    const alpha = 1.05 * Math.pow(random(), 0.85);
    const beta = random() * Math.PI * 2;
    side.set(Math.cos(beta), 0, Math.sin(beta)).cross(capAxis).normalize();
    const dir = capAxis.clone().applyAxisAngle(side, alpha);
    const rho = RN + 0.2 + random() * 0.55 * (1 - alpha * 0.4);
    const p = N.clone().addScaledVector(dir, rho);
    if (!insideCell(p, 0.35) || p.z > N.z + 1.1) continue;
    const s = 0.8 + random() * 0.45;
    granules.push({
      position: p,
      quaternion: randomQuaternion(random),
      scale: new THREE.Vector3(0.27 * s, 0.17 * s, 0.18 * s),
      color: COLORS.melanin[Math.floor(random() * COLORS.melanin.length)],
    });
  }
  const granuleMesh = instances(
    kit.blob(1, { detail: 2, noise: 0.1, seed: 4 }),
    kit.toon("#ffffff", { rim: 0.45, rimColor: "#ffb48a", gloss: 0.35, shadow: "#2a1030", env }),
    granules,
  );
  group.add(granuleMesh);

  /* ---------------- Mitochondria (cut open to show their cristae) ---------------- */
  const capsule = new THREE.CapsuleGeometry(0.5, 1.6, 6, 18);
  capsule.rotateZ(Math.PI / 2);
  const shell = capsule.toNonIndexed();
  capsule.dispose();
  {
    const pos = shell.getAttribute("position");
    const keep: number[] = [];
    const nor = shell.getAttribute("normal");
    const kept: number[] = [];
    for (let t = 0; t < pos.count; t += 3) {
      const z = (pos.getZ(t) + pos.getZ(t + 1) + pos.getZ(t + 2)) / 3;
      if (z > 0.01) continue;
      for (let k = 0; k < 3; k++) {
        keep.push(pos.getX(t + k), pos.getY(t + k), pos.getZ(t + k));
        kept.push(nor.getX(t + k), nor.getY(t + k), nor.getZ(t + k));
      }
    }
    shell.setAttribute("position", new THREE.Float32BufferAttribute(keep, 3));
    shell.setAttribute("normal", new THREE.Float32BufferAttribute(kept, 3));
    shell.deleteAttribute("uv");
  }
  kit.geometry(shell);
  const faceShape = new THREE.Shape();
  faceShape.absarc(0.8, 0, 0.5, -Math.PI / 2, Math.PI / 2, false);
  faceShape.absarc(-0.8, 0, 0.5, Math.PI / 2, (3 * Math.PI) / 2, false);
  const face = kit.geometry(new THREE.ShapeGeometry(faceShape, 16));
  {
    const pos = face.getAttribute("position");
    const uv = face.getAttribute("uv");
    for (let k = 0; k < pos.count; k++) uv.setXY(k, (pos.getX(k) + 1.3) / 2.6, (pos.getY(k) + 0.5) / 1.0);
  }
  const mitos: { position: THREE.Vector3; base: THREE.Quaternion; scale: THREE.Vector3; phase: number }[] = [];
  const mitoRandom = rng(202);
  const mitoCount = kit.count(12, 8);
  for (let tries = 0; mitos.length < mitoCount && tries < 3000; tries++) {
    const p = new THREE.Vector3(
      (mitoRandom() * 2 - 1) * 4.2,
      (mitoRandom() * 2 - 1) * 4.4,
      -3.4 + mitoRandom() * (cutZ + 3.0),
    );
    if (!insideCell(p, 0.85) || !clearOfNucleus(p, 0.85) || !clearOfView(p, 0.9)) continue;
    if (p.distanceTo(golgiCentre) < 1.9) continue;
    if (N.clone().sub(p).normalize().negate().dot(capAxis) > 0.55 && p.distanceTo(N) < RN + 1.4) continue;
    if (mitos.some((m) => m.position.distanceTo(p) < 1.45)) continue;
    const spin = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), mitoRandom() * Math.PI);
    const tilt = new THREE.Quaternion().setFromEuler(
      new THREE.Euler((mitoRandom() - 0.5) * 0.7, (mitoRandom() - 0.5) * 0.7, 0),
    );
    const length = 0.62 + mitoRandom() * 0.3;
    const width = 0.46 + mitoRandom() * 0.1;
    mitos.push({
      position: p,
      base: tilt.multiply(spin),
      scale: new THREE.Vector3(length, width, width),
      phase: mitoRandom() * Math.PI * 2,
    });
  }
  const mitoShell = instances(
    shell,
    kit.toon(COLORS.mito, { rim: 0.35, rimColor: "#ffd0a0", gloss: 0.3, shadow: "#b23b3a", side: THREE.DoubleSide, env }),
    mitos.map((m) => ({ position: m.position, quaternion: m.base, scale: m.scale })),
  );
  const mitoFace = instances(
    face,
    kit.textured(cristaeTexture(kit), { alphaTest: 0.5, side: THREE.DoubleSide, rim: 0, gloss: 0, flat: 0.35, env }),
    mitos.map((m) => ({ position: m.position, quaternion: m.base, scale: m.scale })),
  );
  group.add(mitoShell, mitoFace);

  /* ---------------- Rough endoplasmic reticulum around the nucleus ---------------- */
  const erGeometries: THREE.BufferGeometry[] = [];
  const erDots: number[] = [];
  const erRandom = rng(303);
  const e1 = new THREE.Vector3(1, 0, 0);
  const e2 = new THREE.Vector3(0, 1, 0);
  const e3 = new THREE.Vector3(0, 0, 1);
  const sacs = [
    { rho: RN + 0.36, from: 2.75, to: 4.1 },
    { rho: RN + 0.36, from: 4.35, to: 6.05 },
    { rho: RN + 0.36, from: -0.35, to: 0.55 },
    { rho: RN + 0.68, from: 2.6, to: 3.75 },
    { rho: RN + 0.68, from: 3.95, to: 5.3 },
    { rho: RN + 0.68, from: 5.55, to: 6.75 },
    { rho: RN + 1.0, from: 3.0, to: 4.6 },
    { rho: RN + 1.0, from: 4.85, to: 6.1 },
    { rho: RN + 1.32, from: 3.5, to: 4.9 },
  ];
  sacs.forEach((sac, k) => {
    const points: THREE.Vector3[] = [];
    const normals: THREE.Vector3[] = [];
    const n = 48;
    for (let i = 0; i <= n; i++) {
      const theta = sac.from + ((sac.to - sac.from) * i) / n;
      const radial = e1.clone().multiplyScalar(Math.cos(theta)).addScaledVector(e2, Math.sin(theta));
      const wobble = 0.09 * Math.sin(theta * 9 + k * 1.7);
      const p = N.clone()
        .addScaledVector(radial, sac.rho + wobble)
        .addScaledVector(e3, -0.45 + 0.25 * Math.sin(theta * 2.3 + k));
      points.push(p);
      normals.push(radial);
    }
    if (!points.every((p) => insideCell(p, 0.35))) return;
    const taper = (t: number) => Math.pow(Math.sin(Math.PI * t), 0.3);
    erGeometries.push(
      sweepGeometry(points, {
        normals,
        ra: (t) => 0.075 * taper(t) + 0.01,
        rb: (t) => (0.75 + 0.2 * Math.sin(t * 7 + k)) * taper(t) + 0.02,
        radial: 12,
        caps: true,
      }),
    );
    // Ribosomes studding the outer faces of the sac.
    for (let i = 2; i < n - 1; i += 1) {
      const t = i / n;
      const radial = normals[i];
      for (const sign of [-1, 1]) {
        if (erRandom() < 0.35) continue;
        const depth = (erRandom() * 2 - 1) * 0.7 * taper(t);
        const q = points[i].clone().addScaledVector(radial, sign * 0.11).addScaledVector(e3, depth);
        erDots.push(q.x, q.y, q.z);
      }
    }
  });
  const erMesh = new THREE.Mesh(
    merge(kit, erGeometries),
    kit.toon(COLORS.er, { rim: 0.4, rimColor: "#d8f2ff", gloss: 0.25, shadow: "#4e6fd6", side: THREE.DoubleSide, env }),
  );
  group.add(erMesh);
  group.add(kit.points(erDots, { size: 0.085, color: COLORS.erRibosome, env }));

  /* ---------------- Golgi apparatus ---------------- */
  const golgiGeometries: THREE.BufferGeometry[] = [];
  const golgiPlaneX = golgiDir.clone();
  const golgiPlaneY = new THREE.Vector3(0, 0, 1).cross(golgiDir).normalize();
  const golgiOrigin = N.clone().addScaledVector(golgiDir, RN - 0.55);
  for (let k = 0; k < 5; k++) {
    const rho = 1.12 + k * 0.24;
    const span = 0.62 - k * 0.035;
    const points: THREE.Vector3[] = [];
    const normals: THREE.Vector3[] = [];
    const n = 28;
    for (let i = 0; i <= n; i++) {
      const a = -span + (2 * span * i) / n;
      const radial = golgiPlaneX.clone().multiplyScalar(Math.cos(a)).addScaledVector(golgiPlaneY, Math.sin(a));
      points.push(golgiOrigin.clone().addScaledVector(radial, rho).addScaledVector(e3, 0.1 * Math.sin(a * 3 + k)));
      normals.push(radial);
    }
    golgiGeometries.push(
      sweepGeometry(points, {
        normals,
        ra: (t) => 0.065 + 0.075 * Math.pow(Math.abs(2 * t - 1), 5),
        rb: (t) => 0.62 * Math.pow(Math.sin(Math.PI * t), 0.25) + 0.05,
        radial: 12,
        caps: true,
      }),
    );
  }
  const golgiMesh = new THREE.Mesh(
    merge(kit, golgiGeometries),
    kit.toon(COLORS.golgi, { rim: 0.4, rimColor: "#fff4c2", gloss: 0.3, shadow: "#d8762c", side: THREE.DoubleSide, env }),
  );
  group.add(golgiMesh);
  // Vesicles leaving the Golgi towards the membrane (animated).
  const vesicleRandom = rng(404);
  const vesicles: { from: THREE.Vector3; to: THREE.Vector3; phase: number; size: number }[] = [];
  for (let k = 0; k < kit.count(9, 5); k++) {
    const a = (vesicleRandom() * 2 - 1) * 0.8;
    const radial = golgiPlaneX.clone().multiplyScalar(Math.cos(a)).addScaledVector(golgiPlaneY, Math.sin(a));
    const from = golgiOrigin.clone().addScaledVector(radial, 2.2).addScaledVector(e3, (vesicleRandom() - 0.5) * 0.8);
    let to = from.clone().addScaledVector(radial, 1.4);
    for (let s = 0; s < 8 && !insideCell(to, 0.35); s++) to.lerp(from, 0.3);
    if (!insideCell(from, 0.3)) continue;
    vesicles.push({ from, to, phase: vesicleRandom(), size: 0.1 + vesicleRandom() * 0.06 });
  }
  const vesicleMesh = instances(
    kit.geometry(new THREE.SphereGeometry(1, 14, 10)),
    kit.toon("#ffe27a", { rim: 0.5, rimColor: "#ffffff", gloss: 0.4, shadow: "#e08a2c", env }),
    vesicles.map((v) => ({ position: v.from, scale: v.size })),
  );
  group.add(vesicleMesh);

  /* ---------------- Keratin filaments and desmosome plaques ---------------- */
  const keratinRandom = rng(505);
  const keratinGeometries: THREE.BufferGeometry[] = [];
  const plaques: Placement[] = [];
  const membraneDir = (angle: number, z: number) => {
    const n = new THREE.Vector3(Math.cos(angle), Math.sin(angle), z).normalize();
    return n;
  };
  const filamentCount = kit.count(16, 9);
  for (let k = 0; k < filamentCount; k++) {
    const a0 = keratinRandom() * Math.PI * 2;
    const turn = (keratinRandom() < 0.5 ? -1 : 1) * (1.4 + keratinRandom() * 1.2);
    const a1 = a0 + turn;
    // Every other filament ends at a desmosome on the cut rim, where it shows in section.
    const onRim = k % 2 === 0;
    const z0 = onRim ? 0.62 : -0.8 + keratinRandom() * 0.7;
    const z1 = -0.8 + keratinRandom() * 0.7;
    const n0 = membraneDir(a0, z0);
    const n1 = membraneDir(a1, z1);
    const p0 = membranePoint(n0, 0.14);
    const p1 = membranePoint(n1, 0.14);
    if (onRim) p0.z = Math.min(p0.z, cutZ - 0.12);
    if (p0.z > cutZ - 0.1 || p1.z > cutZ - 0.15) continue;
    const control: THREE.Vector3[] = [p0];
    const steps = 4;
    for (let s = 1; s < steps; s++) {
      const a = a0 + (turn * s) / steps;
      const radial = new THREE.Vector3(Math.cos(a), Math.sin(a), 0);
      const rho = RN + 0.55 + keratinRandom() * 0.7;
      const c = N.clone().addScaledVector(radial, rho);
      c.z = N.z - 1.0 - keratinRandom() * 1.1;
      control.push(c);
    }
    control.push(p1);
    const path = smoothPath(control, 64);
    if (!path.every((p) => insideCell(p, 0.08) && clearOfNucleus(p, 0.2) && p.z < cutZ)) continue;
    for (const offset of [0, 1]) {
      const shifted = path.map((p, i) =>
        p.clone().add(new THREE.Vector3(0, 0, offset * 0.09 * Math.sin((i / path.length) * Math.PI))),
      );
      keratinGeometries.push(sweepGeometry(shifted, { ra: 0.032, radial: 6 }));
      if (keratinRandom() < 0.4) break;
    }
    for (const [p, n] of [
      [p0, n0],
      [p1, n1],
    ] as const) {
      const normal = new THREE.Vector3(n.x / CELL.stretch.x, n.y / CELL.stretch.y, n.z / CELL.stretch.z).normalize();
      plaques.push({
        position: p.clone().addScaledVector(normal, 0.04),
        quaternion: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal),
        scale: new THREE.Vector3(0.2, 0.12, 0.2),
      });
    }
  }
  if (withKeratin) {
    const keratinMesh = new THREE.Mesh(
      merge(kit, keratinGeometries),
      kit.toon(COLORS.keratin, { rim: 0.3, gloss: 0.2, shadow: "#2c9d9a", env }),
    );
    const plaqueMesh = instances(
      kit.geometry(new THREE.CylinderGeometry(1, 1, 1, 18)),
      kit.toon(COLORS.desmosome, { rim: 0.5, rimColor: "#d7b8ff", gloss: 0.3, env }),
      plaques,
    );
    group.add(keratinMesh, plaqueMesh);
  } else for (const geometry of keratinGeometries) geometry.dispose();

  /* ---------------- Free ribosomes and small vesicles ---------------- */
  const dotRandom = rng(606);
  const dots: number[] = [];
  const dotSizes: number[] = [];
  const target = kit.count(520, 260);
  for (let tries = 0; dots.length / 3 < target && tries < 8000; tries++) {
    const p = new THREE.Vector3((dotRandom() * 2 - 1) * 4.6, (dotRandom() * 2 - 1) * 4.9, -4 + dotRandom() * (cutZ + 3.6));
    if (!insideCell(p, 0.2) || !clearOfNucleus(p, 0.2) || !clearOfView(p, 0.2)) continue;
    dots.push(p.x, p.y, p.z);
    dotSizes.push(0.6 + dotRandom() * 0.8);
  }
  group.add(kit.points(dots, { size: 0.075, sizes: dotSizes, color: COLORS.ribosome, twinkle: 0.25, env }));
  const bubbleRandom = rng(707);
  const bubbles: Placement[] = [];
  for (let tries = 0; bubbles.length < kit.count(9, 5) && tries < 2000; tries++) {
    const p = randomDirection(bubbleRandom).multiplyScalar(1.5 + bubbleRandom() * 3);
    p.z = -3 + bubbleRandom() * (cutZ + 2.2);
    if (!insideCell(p, 0.5) || !clearOfNucleus(p, 0.6) || !clearOfView(p, 0.5)) continue;
    if (mitos.some((m) => m.position.distanceTo(p) < 1)) continue;
    bubbles.push({ position: p, scale: 0.18 + bubbleRandom() * 0.14, color: bubbleRandom() < 0.5 ? "#c9b3ff" : "#ffd6f0" });
  }
  if (withVesicles)
    group.add(
      instances(
        kit.geometry(new THREE.SphereGeometry(1, 16, 12)),
        kit.toon("#ffffff", { rim: 0.5, rimColor: "#ffffff", gloss: 0.45, shadow: "#a07ad8", env }),
        bubbles,
      ),
    );

  const landmarks = {
    melanin: N.clone().addScaledVector(capAxis, RN + 0.55),
    mitochondrion: mitos.length
      ? mitos.reduce((best, m) => (m.position.z - Math.abs(m.position.x) * 0.1 > best.z ? m.position : best), mitos[0].position).clone()
      : N.clone().add(new THREE.Vector3(-3, -2, 0)),
    keratin: plaques.length ? plaques[0].position.clone() : N.clone().add(new THREE.Vector3(-3.5, 0, 0)),
    golgi: golgiOrigin.clone().addScaledVector(golgiDir, 1.6),
    er: N.clone().add(new THREE.Vector3(-(RN + 0.8) * 0.72, -(RN + 0.8) * 0.69, -0.2)),
  };

  const matrix = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const wobble = new THREE.Quaternion();
  const euler = new THREE.Euler();
  const p = new THREE.Vector3();
  const s = new THREE.Vector3();
  return {
    group,
    landmarks,
    update(time: number) {
      mitos.forEach((m, k) => {
        euler.set(Math.sin(time * 0.5 + m.phase) * 0.06, 0, Math.sin(time * 0.37 + m.phase) * 0.12);
        q.copy(m.base).multiply(wobble.setFromEuler(euler));
        p.copy(m.position);
        p.y += Math.sin(time * 0.45 + m.phase) * 0.05;
        matrix.compose(p, q, m.scale);
        mitoShell.setMatrixAt(k, matrix);
        mitoFace.setMatrixAt(k, matrix);
      });
      mitoShell.instanceMatrix.needsUpdate = true;
      mitoFace.instanceMatrix.needsUpdate = true;
      vesicles.forEach((v, k) => {
        const u = (time * 0.12 + v.phase) % 1;
        p.copy(v.from).lerp(v.to, u);
        const size = v.size * Math.min(1, u * 6, (1 - u) * 6);
        matrix.compose(p, q.identity(), s.setScalar(Math.max(0.001, size)));
        vesicleMesh.setMatrixAt(k, matrix);
      });
      vesicleMesh.instanceMatrix.needsUpdate = true;
    },
  };
}
