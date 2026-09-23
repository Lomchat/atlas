/**
 * Liquid water (1 unit = 2 Å = 0.2 nm): V-shaped H₂O molecules (O–H 0.96 Å,
 * H–O–H 104.5°) about 2.8 Å apart, jostling and rotating, with hydrogen
 * bonds flickering between neighbours. The central molecule carries the
 * child level "o-atom" at its oxygen: it stays still, its H–O–H plane facing
 * the camera with both hydrogens above, exactly as the atom scene expects.
 * Atom balls use the atom scene's ball size (0.42 × the van der Waals radius).
 */
import * as THREE from "three";
import { rng } from "../../../engine/kit";
import type { SceneBuilder } from "../types";
import { ELEMENT_COLORS, ELEMENT_RADII } from "../common/molecules";
import { sphereImpostors } from "./shared";

const ANGSTROM = 0.5;
const OH = 0.96 * ANGSTROM;
const HALF_ANGLE = ((104.5 / 2) * Math.PI) / 180;
/** Ball radii matching the atom level's "ball seen from the molecule". */
const ATOM_SCALE = 0.42 * (1.52 * ANGSTROM) / ELEMENT_RADII.O;
const R_O = ELEMENT_RADII.O * ATOM_SCALE;
const R_H = ELEMENT_RADII.H * ATOM_SCALE;
/** Typical O···O distance between hydrogen-bonded neighbours (2.8 Å). */
const OO = 2.85 * ANGSTROM;

interface Molecule {
  o: THREE.Vector3;
  /** Rest orientation: local H positions are (±sin, cos, 0) × OH. */
  q: THREE.Quaternion;
  still: boolean;
  phase: number;
  /** Axis of the gentle libration. */
  axis: THREE.Vector3;
  env: boolean;
  fade: number;
}

const LOCAL_H = [
  new THREE.Vector3(Math.sin(HALF_ANGLE) * OH, Math.cos(HALF_ANGLE) * OH, 0),
  new THREE.Vector3(-Math.sin(HALF_ANGLE) * OH, Math.cos(HALF_ANGLE) * OH, 0),
];

/** Orientation whose two O–H bonds point as closely as possible along a and b. */
function orientTowards(a: THREE.Vector3, b: THREE.Vector3) {
  const bisector = a.clone().normalize().add(b.clone().normalize()).normalize();
  let normal = a.clone().cross(b);
  if (normal.lengthSq() < 1e-6) normal = new THREE.Vector3(0, 0, 1).cross(bisector);
  normal.normalize();
  const xAxis = bisector.clone().cross(normal).normalize();
  // Local frame: y = bisector, z = plane normal, x completes it; make x point towards a.
  if (xAxis.dot(a) < 0) {
    xAxis.negate();
    normal.negate();
  }
  const basis = new THREE.Matrix4().makeBasis(xAxis, bisector, normal);
  return new THREE.Quaternion().setFromRotationMatrix(basis);
}

const waterMolecules: SceneBuilder = ({ kit, children }) => {
  const root = new THREE.Group();
  const env = new THREE.Group();
  const random = rng(18);

  const atomChild = children.find((child) => child.id === "o-atom");
  const center = new THREE.Vector3(...(atomChild?.at ?? [0, 0, 1]));

  /* ---------------- Molecule positions ---------------- */
  const molecules: Molecule[] = [];
  const add = (o: THREE.Vector3, q: THREE.Quaternion, still = false) =>
    molecules.push({
      o,
      q,
      still,
      phase: random() * Math.PI * 2,
      axis: new THREE.Vector3(random() - 0.5, random() - 0.5, random() - 0.5).normalize(),
      env: false,
      fade: 0,
    });
  // The central molecule: plane facing the camera, both H above the O.
  add(center.clone(), new THREE.Quaternion(), true);
  // Its first shell: two neighbours receive its H, two give H to its lone pairs.
  const hDirs = LOCAL_H.map((h) => h.clone().normalize());
  const lone = [
    new THREE.Vector3(0.35, -0.577, 0.74).normalize(),
    new THREE.Vector3(-0.35, -0.577, -0.74).normalize(),
  ];
  for (const dir of hDirs) {
    const o = center.clone().addScaledVector(dir, OO);
    // Accepts the central H on one lone pair; its own H point onwards.
    const away = dir.clone();
    const a = away.clone().add(new THREE.Vector3(0.5, 0.2, 0.6)).normalize();
    const b = away.clone().add(new THREE.Vector3(-0.3, 0.3, -0.8)).normalize();
    add(o, orientTowards(a, b));
  }
  for (const dir of lone) {
    const o = center.clone().addScaledVector(dir, OO);
    // Donates one H back to the central O.
    const toCenter = dir.clone().negate();
    const other = toCenter.clone().applyAxisAngle(new THREE.Vector3(0.3, 0.2, 1).normalize(), 1.82);
    add(o, orientTowards(toCenter, other));
  }

  // The rest of the liquid: a dense random packing (about 33 molecules per nm³)
  // inside a soft-edged ellipse, so the patch has no hard outline when seen from afar.
  const ellipse = { x: 12.5, y: 8.8, zMin: -3.4, zMax: 1.9 };
  const cell = OO * 0.93;
  const grid = new Map<string, THREE.Vector3[]>();
  const key = (x: number, y: number, z: number) => `${x},${y},${z}`;
  const insert = (o: THREE.Vector3) => {
    const k = key(Math.floor(o.x / cell), Math.floor(o.y / cell), Math.floor(o.z / cell));
    const list = grid.get(k) ?? [];
    list.push(o);
    grid.set(k, list);
  };
  molecules.forEach((m) => insert(m.o));
  const tooClose = (o: THREE.Vector3) => {
    const cx = Math.floor(o.x / cell);
    const cy = Math.floor(o.y / cell);
    const cz = Math.floor(o.z / cell);
    for (let dx = -1; dx <= 1; dx++)
      for (let dy = -1; dy <= 1; dy++)
        for (let dz = -1; dz <= 1; dz++)
          for (const other of grid.get(key(cx + dx, cy + dy, cz + dz)) ?? [])
            if (other.distanceToSquared(o) < cell * cell) return true;
    return false;
  };
  const radial = (o: THREE.Vector3) => Math.hypot(o.x / ellipse.x, o.y / ellipse.y);
  const target = kit.count(430, 260);
  for (let tries = 0; molecules.length < target && tries < 40000; tries++) {
    const o = new THREE.Vector3(
      (random() * 2 - 1) * ellipse.x,
      (random() * 2 - 1) * ellipse.y,
      ellipse.zMin + random() * (ellipse.zMax - ellipse.zMin),
    );
    const r = radial(o);
    if (r > 1) continue;
    // Thinner towards the rim and in the back layer.
    if (r > 0.78 && random() < (r - 0.78) / 0.22) continue;
    if (o.z < -2 && random() > 0.45) continue;
    // Keep the central molecule and its four bonded neighbours easy to see.
    if (Math.hypot(o.x - center.x, o.y - center.y) < 1.95 && o.z > center.z - 2.4) continue;
    if (tooClose(o)) continue;
    add(o, new THREE.Quaternion());
    insert(o);
  }
  // Point each free molecule's hydrogens at two of its nearest neighbours.
  const others = (i: number) =>
    molecules
      .map((m, j) => ({ j, d: m.o.distanceTo(molecules[i].o) }))
      .filter((n) => n.j !== i && n.d < OO * 1.35)
      .sort((a, b) => a.d - b.d);
  for (let i = 5; i < molecules.length; i++) {
    const near = others(i);
    const m = molecules[i];
    if (near.length >= 2) {
      let best: [number, number] = [near[0].j, near[1].j];
      let bestScore = Infinity;
      for (let a = 0; a < Math.min(4, near.length); a++)
        for (let b = a + 1; b < Math.min(5, near.length); b++) {
          const da = molecules[near[a].j].o.clone().sub(m.o);
          const db = molecules[near[b].j].o.clone().sub(m.o);
          const score = Math.abs(da.angleTo(db) - HALF_ANGLE * 2 - 0.08) + (near[a].d + near[b].d) * 0.2;
          if (score < bestScore) {
            bestScore = score;
            best = [near[a].j, near[b].j];
          }
        }
      m.q = orientTowards(molecules[best[0]].o.clone().sub(m.o), molecules[best[1]].o.clone().sub(m.o));
    } else {
      m.q.setFromEuler(new THREE.Euler(random() * 6, random() * 6, random() * 6));
    }
    // The inner cluster belongs to the subject; the rest is the surrounding liquid.
    const d = m.o.distanceTo(center);
    m.env = d > 4.6 || m.o.z < -2;
    const depthFade = THREE.MathUtils.clamp((-m.o.z + 0.4) / 3.6, 0, 0.8);
    const rimFade = THREE.MathUtils.smoothstep(radial(m.o), 0.7, 1) * 0.9;
    m.fade = Math.max(depthFade, rimFade);
  }

  /* Hydrogen bonds: an H of one molecule pointing at the O of a neighbour. */
  interface Bond {
    donor: number;
    h: number;
    acceptor: number;
    phase: number;
    rate: number;
  }
  const bonds: Bond[] = [];
  const hWorld = new THREE.Vector3();
  molecules.forEach((m, i) => {
    for (let h = 0; h < 2; h++) {
      hWorld.copy(LOCAL_H[h]).applyQuaternion(m.q);
      const dir = hWorld.clone().normalize();
      let best = -1;
      let bestD = Infinity;
      molecules.forEach((n, j) => {
        if (j === i) return;
        const to = n.o.clone().sub(m.o);
        const d = to.length();
        if (d > OO * 1.3) return;
        if (to.normalize().dot(dir) < Math.cos(0.55)) return;
        if (d < bestD) {
          bestD = d;
          best = j;
        }
      });
      if (best >= 0) bonds.push({ donor: i, h, acceptor: best, phase: random() * Math.PI * 2, rate: 0.6 + random() * 1.4 });
    }
  });

  /* ---------------- Drawing: one instanced mesh per element and layer ---------------- */
  const inner = molecules.map((m, i) => ({ m, i })).filter(({ m }) => !m.env);
  const outer = molecules.map((m, i) => ({ m, i })).filter(({ m }) => m.env);
  const deep = new THREE.Color("#2d5f96");
  const makeLayer = (list: { m: Molecule; i: number }[], env: boolean) => {
    const oxygen = sphereImpostors(kit, ELEMENT_COLORS.O, list.length, { rim: 0.45, rimColor: "#ffc2c8", gloss: 0.35, shadow: "#8a2a5a", env });
    const hydrogen = sphereImpostors(kit, ELEMENT_COLORS.H, list.length * 2, { rim: 0.4, rimColor: "#ffffff", gloss: 0.4, shadow: "#8f8ac8", env });
    oxygen.count = list.length;
    hydrogen.count = list.length * 2;
    const tint = new THREE.Color();
    list.forEach(({ m }, k) => {
      tint.setRGB(1, 1, 1).lerp(deep, m.fade);
      oxygen.setColorAt(k, tint);
      hydrogen.setColorAt(k * 2, tint);
      hydrogen.setColorAt(k * 2 + 1, tint);
    });
    return { list, oxygen, hydrogen };
  };
  const innerLayer = makeLayer(inner, false);
  const outerLayer = makeLayer(outer, true);
  root.add(innerLayer.oxygen, innerLayer.hydrogen);
  env.add(outerLayer.oxygen, outerLayer.hydrogen);

  // Dashes: three short capsules per bond, all in one draw call per layer.
  const dashGeometry = kit.geometry(new THREE.CylinderGeometry(0.055, 0.055, 0.16, 6, 1));
  const makeDashes = (list: Bond[], env: boolean) => {
    const mesh = new THREE.InstancedMesh(
      dashGeometry,
      kit.flat("#9ff6ff", { opacity: 0.95, env }),
      Math.max(1, list.length * 3),
    );
    mesh.count = list.length * 3;
    return { list, mesh };
  };
  const innerBonds = makeDashes(bonds.filter((b) => !molecules[b.donor].env || !molecules[b.acceptor].env), false);
  const outerBonds = makeDashes(bonds.filter((b) => molecules[b.donor].env && molecules[b.acceptor].env), true);
  root.add(innerBonds.mesh);
  env.add(outerBonds.mesh);

  // A soft light behind the central molecule, and deep-water glows far behind.
  const halo = kit.glow("#6fdcff", 3.4, { opacity: 0.3 });
  halo.position.copy(center).add(new THREE.Vector3(0, 0.15, -0.6));
  root.add(halo);
  const glows: number[] = [];
  for (let i = 0; i < 10; i++) glows.push((random() * 2 - 1) * 14, (random() * 2 - 1) * 8, -9 - random() * 3);
  env.add(kit.points(glows, { size: 8, color: "#1f6fb0", soft: 1, opacity: 0.25, env: true }));

  /* ---------------- Animation ---------------- */
  const current = molecules.map((m) => ({ o: m.o.clone(), q: m.q.clone() }));
  const m4 = new THREE.Matrix4();
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();
  const wobble = new THREE.Quaternion();
  const place = (time: number) => {
    molecules.forEach((m, i) => {
      const c = current[i];
      if (m.still) return;
      const t = time + m.phase;
      c.o.set(
        m.o.x + Math.sin(t * 2.3) * 0.06 + Math.sin(t * 5.1) * 0.025,
        m.o.y + Math.sin(t * 1.9 + 1) * 0.06 + Math.sin(t * 4.3) * 0.025,
        m.o.z + Math.sin(t * 2.7 + 2) * 0.05,
      );
      wobble.setFromAxisAngle(m.axis, Math.sin(t * 1.7) * 0.28 + Math.sin(t * 4.1) * 0.08);
      c.q.copy(m.q).premultiply(wobble);
    });
    for (const layer of [innerLayer, outerLayer]) {
      layer.list.forEach(({ i }, k) => {
        const c = current[i];
        layer.oxygen.setMatrixAt(k, m4.compose(c.o, c.q, s.setScalar(R_O)));
        for (let h = 0; h < 2; h++) {
          p.copy(LOCAL_H[h]).applyQuaternion(c.q).add(c.o);
          layer.hydrogen.setMatrixAt(k * 2 + h, m4.compose(p, c.q, s.setScalar(R_H)));
        }
      });
      layer.oxygen.instanceMatrix.needsUpdate = true;
      layer.hydrogen.instanceMatrix.needsUpdate = true;
    }
  };
  const from = new THREE.Vector3();
  const to = new THREE.Vector3();
  const dir = new THREE.Vector3();
  const dq = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const updateBonds = (time: number) => {
    for (const layer of [innerBonds, outerBonds]) {
      layer.list.forEach((bond, k) => {
        const d = current[bond.donor];
        const a = current[bond.acceptor];
        from.copy(LOCAL_H[bond.h]).applyQuaternion(d.q).add(d.o);
        to.copy(a.o);
        dir.subVectors(to, from);
        const length = dir.length();
        dir.divideScalar(length);
        // Bonds break and re-form: each one fades in and out on its own rhythm.
        const life = Math.sin(time * bond.rate + bond.phase);
        // The central molecule's four bonds stay on: they are the story here.
        const on = bond.donor < 5 && bond.acceptor < 5 ? 1 : THREE.MathUtils.smoothstep(life, -0.75, -0.35);
        const stretch = length > OO * 0.85 ? 0.4 : 1;
        const visible = on * stretch;
        dq.setFromUnitVectors(up, dir);
        const start = R_H + 0.05;
        const span = length - R_O - start - 0.04;
        for (let j = 0; j < 3; j++) {
          const at = start + span * ((j + 0.5) / 3);
          p.copy(from).addScaledVector(dir, at);
          s.set(visible, visible * Math.min(1.4, (span / 3) * 6), visible);
          layer.mesh.setMatrixAt(k * 3 + j, m4.compose(p, dq, visible < 0.02 ? s.set(0, 0, 0) : s));
        }
      });
      layer.mesh.instanceMatrix.needsUpdate = true;
    }
  };
  place(0);
  updateBonds(0);

  return {
    root,
    env,
    update({ time }) {
      place(time);
      updateBonds(time);
      halo.material.opacity = 0.3 + 0.08 * Math.sin(time * 1.3);
    },
  };
};

export default waterMolecules;
