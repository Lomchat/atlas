/**
 * The nucleus of the keratinocyte (6 µm; 1 unit = 0.6 µm), with a wedge cut
 * away towards the viewer: the double envelope studded with pores, the
 * nucleolus, and interphase chromatin, each chromosome in its own territory.
 * The child level "chromatin" sits on a violet territory at its anchor.
 * Surroundings: the cell's own organelles (shared layout, scaled ×2), so the
 * melanin cap, mitochondria and ER stay in place during the dive.
 */
import * as THREE from "three";
import { rng } from "../../../engine/kit";
import type { SceneBuilder } from "../types";
import { cellContents } from "./cell-layout";
import { instances, merge, sweepGeometry, type Placement } from "./cell-shapes";

const R_OUT = 5;
const R_IN = 4.7;
const SQUASH = 0.93;
/** The removed wedge, as azimuths measured from +Z towards +X (radians). */
const WEDGE_FROM = (-12 * Math.PI) / 180;
const WEDGE_TO = (84 * Math.PI) / 180;

const azimuth = (p: THREE.Vector3) => Math.atan2(p.x, p.z);
/** Directions from which the nucleus is seen (home view ± orbit), in its own frame. */
const VIEWS = [-45, -20, 5].flatMap((yaw) =>
  [0, 16, 32].map((pitch) => {
    const y = (yaw * Math.PI) / 180;
    const x = (pitch * Math.PI) / 180;
    return new THREE.Vector3(-Math.sin(y) * Math.cos(x), Math.sin(x), Math.cos(y) * Math.cos(x));
  }),
);
const inWedge = (p: THREE.Vector3, margin = 0) => {
  const a = azimuth(p);
  const rho = Math.hypot(p.x, p.z);
  const m = rho > 1e-3 ? margin / rho : 0;
  return a > WEDGE_FROM - m && a < WEDGE_TO + m;
};

const TERRITORY_COLORS = [
  "#7b61ff",
  "#3f9dff",
  "#b36bff",
  "#ff6fb1",
  "#2fc9c0",
  "#5b7bff",
  "#d27cff",
  "#43c3ff",
  "#9a57f2",
  "#ff8fc8",
  "#6fd0ff",
  "#8e7dff",
  "#4fe0b0",
];

/** Can a point inside the envelope be seen through the open wedge? */
function seenThroughWedge(p: THREE.Vector3) {
  for (const d of VIEWS) {
    const b = p.dot(d);
    const c = p.lengthSq() - R_IN * R_IN;
    const t = -b + Math.sqrt(Math.max(0, b * b - c));
    const exit = p.clone().addScaledVector(d, t);
    if (inWedge(exit, 0.6)) return true;
  }
  return false;
}

const nucleus: SceneBuilder = ({ kit, level, children }) => {
  const root = new THREE.Group();
  const env = new THREE.Group();
  const chromatinChild = children.find((child) => child.id === "chromatin");
  const anchor = new THREE.Vector3(...(chromatinChild?.at ?? [2.2, -0.9, 0.5]));

  /* ---------------- Double envelope (open wedge towards the viewer) ---------------- */
  const phiStart = Math.PI / 2 + WEDGE_TO;
  const phiLength = Math.PI * 2 - (WEDGE_TO - WEDGE_FROM);
  const shell = (radius: number) => {
    const geometry = new THREE.SphereGeometry(radius, 96, 64, phiStart, phiLength);
    geometry.scale(1, SQUASH, 1);
    return kit.geometry(geometry);
  };
  const outer = new THREE.Mesh(
    shell(R_OUT),
    kit.toon("#8c5cff", { shadow: "#3d2491", rim: 0.55, rimColor: "#d9c7ff", gloss: 0.3, side: THREE.DoubleSide }),
  );
  const inner = new THREE.Mesh(
    shell(R_IN),
    kit.toon("#a484f5", { shadow: "#4f33a8", rim: 0.2, gloss: 0.1, soft: 0.5, side: THREE.DoubleSide }),
  );
  root.add(outer, inner);
  // The perinuclear space seen in section on both cut faces.
  const strips: THREE.BufferGeometry[] = [];
  for (const a of [WEDGE_FROM, WEDGE_TO]) {
    const shape = new THREE.RingGeometry(R_IN, R_OUT, 64, 1, -Math.PI / 2, Math.PI);
    // Ring lies in XY with x ≥ 0: rotate about Y so that +X points along azimuth a.
    shape.scale(1, SQUASH, 1);
    shape.rotateY(a - Math.PI / 2);
    strips.push(shape);
  }
  root.add(new THREE.Mesh(merge(kit, strips), kit.flat("#4a2aa8", { side: THREE.DoubleSide })));

  /* ---------------- Nuclear pores ---------------- */
  const poreRandom = rng(31);
  const pores: Placement[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  const poreCount = kit.count(380, 220);
  for (let i = 0; i < poreCount; i++) {
    const y = 1 - (2 * (i + 0.5)) / poreCount;
    const r = Math.sqrt(1 - y * y);
    const a = i * golden + poreRandom() * 0.3;
    const n = new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r);
    const p = n.clone().multiplyScalar(R_OUT + 0.01);
    p.y *= SQUASH;
    if (inWedge(p, 0.3)) continue;
    const normal = new THREE.Vector3(n.x, n.y / SQUASH, n.z).normalize();
    // Pores facing away from every viewpoint are never seen.
    if (!VIEWS.some((d) => normal.dot(d) > -0.15)) continue;
    pores.push({
      position: p,
      quaternion: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal),
      scale: 0.9 + poreRandom() * 0.25,
    });
  }
  const ring = kit.geometry(new THREE.TorusGeometry(0.17, 0.055, 5, 12));
  const hole = kit.geometry(new THREE.CircleGeometry(0.13, 10));
  root.add(
    instances(ring, kit.toon("#efe4ff", { rim: 0.3, gloss: 0.4, shadow: "#9a83e6" }), pores),
    instances(hole, kit.flat("#2e1470"), pores),
  );

  /* ---------------- Chromatin territories ---------------- */
  const random = rng(57);
  const centres: THREE.Vector3[] = [];
  // The territory carrying the child level starts right at its anchor.
  const anchorCentre = anchor.clone().multiplyScalar(0.8);
  centres.push(anchorCentre);
  for (let tries = 0; centres.length < 16 && tries < 6000; tries++) {
    const p = new THREE.Vector3((random() * 2 - 1) * 3.5, (random() * 2 - 1) * 3.2, (random() * 2 - 1) * 3.5);
    if (p.length() > 3.4) continue;
    if (inWedge(p, -0.9)) continue; // centres stay out of the deep wedge, territories spill into its faces
    if (centres.some((c) => c.distanceTo(p) < 1.9)) continue;
    centres.push(p);
  }
  const fibres: THREE.BufferGeometry[] = [];
  const walk = new THREE.Vector3();
  const heading = new THREE.Vector3();
  const tmp = new THREE.Vector3();
  centres.forEach((centre, k) => {
    const color = k === 0 ? "#7b61ff" : TERRITORY_COLORS[k % TERRITORY_COLORS.length];
    const steps = kit.count(480, 260);
    const radius = 1.35 + random() * 0.3;
    walk.copy(k === 0 ? anchor : centre);
    heading.set(random() - 0.5, random() - 0.5, random() - 0.5).normalize();
    let segment: THREE.Vector3[] = [];
    const flush = () => {
      if (segment.length > 3) fibres.push(sweepGeometry(segment, { ra: 0.1, radial: 4, color }));
      segment = [];
    };
    for (let s = 0; s < steps; s++) {
      tmp.set(random() - 0.5, random() - 0.5, random() - 0.5).multiplyScalar(0.9);
      heading.add(tmp).normalize();
      // Stay inside the territory and inside the nucleus.
      const pull = walk.clone().sub(centre);
      if (pull.length() > radius) heading.addScaledVector(pull.normalize(), -0.7).normalize();
      if (walk.length() > R_IN - 0.35) heading.addScaledVector(walk.clone().normalize(), -0.8).normalize();
      walk.addScaledVector(heading, 0.14);
      const keep =
        (!inWedge(walk, 0.02) && seenThroughWedge(walk)) || (k === 0 && walk.distanceTo(anchor) < 0.3);
      if (keep) segment.push(walk.clone());
      else flush();
    }
    flush();
  });
  const territories = new THREE.Mesh(
    merge(kit, fibres),
    kit.toon("#ffffff", { vertexColors: true, rim: 0.2, gloss: 0.2, soft: 0.28 }),
  );
  root.add(territories);

  /* ---------------- Nucleolus ---------------- */
  const nucleolusAt = new THREE.Vector3(-0.2, 1.05, 0.15);
  const nucleolus = new THREE.Mesh(
    kit.blob(1.3, { detail: 4, noise: 0.14, frequency: 2.2, seed: 9 }),
    kit.toon("#ff5fa2", { shadow: "#a3237a", rim: 0.5, rimColor: "#ffc3e0", gloss: 0.35 }),
  );
  nucleolus.position.copy(nucleolusAt);
  root.add(nucleolus);
  const centresRandom = rng(12);
  const fibrillar: Placement[] = [];
  for (let k = 0; k < 7; k++) {
    const d = new THREE.Vector3(centresRandom() - 0.3, centresRandom() - 0.2, centresRandom() + 0.2).normalize();
    fibrillar.push({ position: nucleolusAt.clone().addScaledVector(d, 1.12), scale: 0.2 + centresRandom() * 0.14 });
  }
  root.add(instances(kit.geometry(new THREE.SphereGeometry(1, 16, 12)), kit.toon("#ffd0e6", { rim: 0.3, gloss: 0.4 }), fibrillar));
  const subunits: number[] = [];
  for (let k = 0; k < 90; k++) {
    const d = new THREE.Vector3(centresRandom() - 0.5, centresRandom() - 0.5, centresRandom() - 0.5).normalize();
    const p = nucleolusAt.clone().addScaledVector(d, 1.3 + centresRandom() * 0.35);
    subunits.push(p.x, p.y, p.z);
  }
  root.add(kit.points(subunits, { size: 0.11, color: "#ffe066", twinkle: 0.3 }));
  const nucleoplasm = kit.glow("#b58cff", 9, { opacity: 0.35 });
  nucleoplasm.position.set(0.5, 0, -1.5);
  root.add(nucleoplasm);

  /* ---------------- Molecules leaving through the pores (animated) ---------------- */
  const exits = pores.filter((p) => p.position.z > 1.2 && Math.abs(p.position.y) < 4).slice(0, 36);
  const exitPositions = new Float32Array(exits.length * 3);
  const exitPoints = kit.points(exitPositions, { size: 0.14, color: "#ffd23f", soft: 0.3 });
  const exitAttribute = exitPoints.geometry.getAttribute("position") as THREE.BufferAttribute;
  root.add(exitPoints);

  /* ---------------- Surroundings: the rest of the cell ---------------- */
  const nucleusInCell = new THREE.Vector3(...(level.anchor?.at ?? [0, -0.55, 0.75]));
  const cellScale = 2; // 1 cell unit = 1.2 µm = 2 nucleus units
  const contents = cellContents(kit, nucleusInCell, { env: true, keratin: false, vesicles: false });
  contents.group.scale.setScalar(cellScale);
  contents.group.position.copy(nucleusInCell).multiplyScalar(-cellScale);
  env.add(contents.group);
  const haze = kit.glow("#ff8ad8", 30, { opacity: 0.2, env: true });
  haze.position.set(0, 0, -8);
  env.add(haze);

  return {
    root,
    env,
    update({ time }) {
      contents.update(time);
      exits.forEach((pore, k) => {
        const u = (time * 0.18 + k * 0.137) % 1;
        const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(pore.quaternion!);
        tmp.copy(pore.position).addScaledVector(normal, -0.25 + u * 1.4);
        exitAttribute.setXYZ(k, tmp.x, tmp.y, tmp.z);
      });
      exitAttribute.needsUpdate = true;
      nucleolus.rotation.y = Math.sin(time * 0.3) * 0.08;
    },
  };
};

export default nucleus;
