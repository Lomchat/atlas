/**
 * Heme b (1.3 nm; 1 unit = 1.3 Å), ball and stick: a porphyrin ring of four
 * pyrroles whose nitrogens hold one iron atom (the child level "fe-atom",
 * anchored at the origin). An O₂ molecule binds end-on above the iron and
 * leaves again, in step with the hemoglobin scene; as it binds, the iron slips
 * into the plane of the ring (here the ring moves, the iron stays put). The
 * proximal histidine that ties the heme to the protein is drawn faintly below.
 */
import * as THREE from "three";
import type { Kit } from "../../../engine/kit";
import { rng } from "../../../engine/kit";
import type { SceneBuilder } from "../types";
import { bondsByDistance, molecule, type MoleculeAtom } from "../common/molecules";
import { merge, sweepGeometry } from "../body/cell-shapes";
import { o2State } from "./hemoglobin-cycle";

const U = 1 / 1.3; // scene units per ångström
const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z).multiplyScalar(U);
const Y = new THREE.Vector3(0, 1, 0);

/** Heme b without its iron, in ångströms, porphyrin in the XZ plane. */
function hemeAtoms() {
  const atoms: MoleculeAtom[] = [];
  const add = (symbol: string, p: THREE.Vector3) => {
    atoms.push({ symbol, position: p.clone() });
    return p.clone();
  };
  const tetraH = (c: THREE.Vector3, bond: THREE.Vector3, count: number, spin = 0) => {
    // Hydrogens around an sp3 carbon bonded along −bond.
    const d = bond.clone().normalize();
    const u = Math.abs(d.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : Y.clone();
    const a = u.clone().sub(d.clone().multiplyScalar(u.dot(d))).normalize();
    const b = new THREE.Vector3().crossVectors(d, a);
    for (let k = 0; k < count; k++) {
      const t = spin + (k * 2 * Math.PI) / 3;
      add("H", c.clone().addScaledVector(d, 1.09 * 0.334).addScaledVector(a, 1.09 * 0.943 * Math.cos(t)).addScaledVector(b, 1.09 * 0.943 * Math.sin(t)));
    }
  };
  // Fischer positions 1–8 on the β carbons: methyl, vinyl, methyl, vinyl, methyl, propionate, propionate, methyl.
  const substituents = ["methyl", "vinyl", "methyl", "vinyl", "methyl", "propionate", "propionate", "methyl"];
  for (let i = 0; i < 4; i++) {
    const phi = Math.PI / 4 + (i * Math.PI) / 2;
    const r = new THREE.Vector3(Math.cos(phi), 0, Math.sin(phi));
    const t = new THREE.Vector3(-Math.sin(phi), 0, Math.cos(phi));
    add("N", r.clone().multiplyScalar(2.0));
    for (const sign of [-1, 1]) {
      add("C", r.clone().multiplyScalar(2.82).addScaledVector(t, sign * 1.13));
      const beta = add("C", r.clone().multiplyScalar(4.15).addScaledVector(t, sign * 0.7));
      const d = r.clone().multiplyScalar(0.96).addScaledVector(t, sign * 0.7).normalize();
      const side = t.clone().multiplyScalar(sign);
      const kind = substituents[i * 2 + (sign > 0 ? 1 : 0)];
      if (kind === "methyl") {
        const c = add("C", beta.clone().addScaledVector(d, 1.5));
        tetraH(c, d, 3, i);
      } else if (kind === "vinyl") {
        const ca = add("C", beta.clone().addScaledVector(d, 1.47));
        add("H", ca.clone().addScaledVector(d, 0.54).addScaledVector(side, -0.94));
        const e = d.clone().multiplyScalar(0.5).addScaledVector(side, 0.866);
        const cb = add("C", ca.clone().addScaledVector(e, 1.34));
        add("H", cb.clone().addScaledVector(d, 1.08));
        add("H", cb.clone().addScaledVector(e, 0.54).addScaledVector(d.clone().multiplyScalar(-0.5).addScaledVector(side, 0.866), 0.94));
      } else {
        // Propionates bend down and away, towards the protein surface.
        const c1 = add("C", beta.clone().addScaledVector(d, 1.5));
        const d2 = d.clone().multiplyScalar(0.55).addScaledVector(Y, -0.83).normalize();
        const c2 = add("C", c1.clone().addScaledVector(d2, 1.53));
        const d3 = d.clone().multiplyScalar(0.85).addScaledVector(Y, -0.3).addScaledVector(side, 0.3).normalize();
        const c3 = add("C", c2.clone().addScaledVector(d3, 1.52));
        add("O", c3.clone().addScaledVector(d3.clone().multiplyScalar(0.5).addScaledVector(Y, 0.866).normalize(), 1.25));
        add("O", c3.clone().addScaledVector(d3.clone().multiplyScalar(0.5).addScaledVector(Y, -0.866).normalize(), 1.25));
        for (const [c, next] of [
          [c1, d2],
          [c2, d3],
        ] as const) {
          const n = new THREE.Vector3().crossVectors(next, side).normalize();
          add("H", c.clone().addScaledVector(n, 0.9).addScaledVector(side, 0.55));
          add("H", c.clone().addScaledVector(n, -0.9).addScaledVector(side, 0.55));
        }
      }
    }
    // Meso carbon (and its hydrogen) between pyrrole i and i + 1.
    const m = new THREE.Vector3(Math.cos(phi + Math.PI / 4), 0, Math.sin(phi + Math.PI / 4));
    add("C", m.clone().multiplyScalar(3.5));
    add("H", m.clone().multiplyScalar(4.58));
  }
  return atoms;
}

/** Proximal histidine below the iron (imidazole ring, side chain and a bit of backbone). */
function histidineAtoms() {
  const atoms: MoleculeAtom[] = [];
  const h = new THREE.Vector3(1, 0, -1).normalize();
  const radius = 1.36 / (2 * Math.sin(Math.PI / 5));
  const centre = new THREE.Vector3(0, -2.1 - radius, 0);
  const vertex = (deg: number) => {
    const a = (deg * Math.PI) / 180;
    return centre.clone().addScaledVector(Y, radius * Math.cos(a)).addScaledVector(h, radius * Math.sin(a));
  };
  atoms.push({ symbol: "N", position: vertex(0) });
  atoms.push({ symbol: "C", position: vertex(72) });
  atoms.push({ symbol: "N", position: vertex(144) });
  const cg = vertex(-144);
  atoms.push({ symbol: "C", position: cg });
  atoms.push({ symbol: "C", position: vertex(-72) });
  const cb = cg.clone().addScaledVector(cg.clone().sub(centre).normalize(), 1.5);
  atoms.push({ symbol: "C", position: cb });
  const ca = cb.clone().add(new THREE.Vector3(0.4, -1.3, 0.6).normalize().multiplyScalar(1.53));
  atoms.push({ symbol: "C", position: ca });
  atoms.push({ symbol: "N", position: ca.clone().add(new THREE.Vector3(-1.2, -0.6, 0.6).normalize().multiplyScalar(1.46)) });
  const c = ca.clone().add(new THREE.Vector3(1.0, -0.8, -0.6).normalize().multiplyScalar(1.52));
  atoms.push({ symbol: "C", position: c });
  atoms.push({ symbol: "O", position: c.clone().add(new THREE.Vector3(0.7, 0.9, -0.3).normalize().multiplyScalar(1.23)) });
  return atoms;
}

/** Make a molecule group translucent (faint context). */
function fade(group: THREE.Object3D, opacity: number) {
  group.traverse((object) => {
    const mesh = object as THREE.Mesh;
    const material = mesh.material as THREE.ShaderMaterial | undefined;
    if (!material?.uniforms?.uOpacity) return;
    material.uniforms.uOpacity.value = opacity;
    material.transparent = true;
    material.depthWrite = false;
  });
}

const scaled = (atoms: MoleculeAtom[]) => atoms.map((a) => ({ symbol: a.symbol, position: a.position.clone().multiplyScalar(U) }));

/** An α helix as a coiled tube (Cα trace: 2.3 Å radius, 1.5 Å rise, 3.6 residues per turn). */
function helixPath(from: THREE.Vector3, to: THREE.Vector3) {
  const axis = to.clone().sub(from);
  const length = axis.length();
  axis.normalize();
  const a = new THREE.Vector3(0, 1, 0).cross(axis);
  if (a.lengthSq() < 1e-4) a.set(1, 0, 0);
  a.normalize();
  const b = new THREE.Vector3().crossVectors(axis, a);
  const residues = Math.round(length / (1.5 * U));
  const points: THREE.Vector3[] = [];
  for (let k = 0; k <= residues * 4; k++) {
    const s = k / 4;
    const angle = (s * 2 * Math.PI) / 3.6;
    points.push(
      from
        .clone()
        .addScaledVector(axis, s * 1.5 * U)
        .addScaledVector(a, Math.cos(angle) * 2.3 * U)
        .addScaledVector(b, Math.sin(angle) * 2.3 * U),
    );
  }
  return points;
}

function oxygen(kit: Kit, env = false) {
  // O₂ at van der Waals size would hide the ring; ball-and-stick like the rest.
  const group = molecule(
    kit,
    [
      { symbol: "O", position: new THREE.Vector3(0, 0, 0) },
      { symbol: "O", position: new THREE.Vector3(0, 1.21 * U, 0) },
    ],
    [[0, 1]],
    { atomScale: 0.55, bondRadius: 0.16, env },
  );
  return group;
}

const heme: SceneBuilder = ({ kit }) => {
  const root = new THREE.Group();
  const env = new THREE.Group();

  /* ---------------- Porphyrin ring (moves 0.4 Å relative to the iron) ---------------- */
  const ring = new THREE.Group();
  const porphyrin = scaled(hemeAtoms());
  ring.add(molecule(kit, porphyrin, bondsByDistance(porphyrin, 1.75 * U), { atomScale: 0.36, bondRadius: 0.11 }));
  // A warm red glow in the plane of the ring: heme is what makes blood red.
  const stain = kit.canvasTexture(256, 256, (g, w, h) => {
    const gradient = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    gradient.addColorStop(0, "rgba(255, 90, 110, 0.85)");
    gradient.addColorStop(0.55, "rgba(230, 40, 80, 0.45)");
    gradient.addColorStop(1, "rgba(200, 20, 70, 0)");
    g.fillStyle = gradient;
    g.fillRect(0, 0, w, h);
  });
  const disc = new THREE.Mesh(
    kit.geometry(new THREE.CircleGeometry(5.2, 64)),
    kit.textured(stain, { side: THREE.DoubleSide, rim: 0, gloss: 0, flat: 1, transparent: true, depthWrite: false }),
  );
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = -0.02;
  ring.add(disc);
  root.add(ring);

  // The iron itself (the child atom is drawn on top of it).
  const iron = molecule(kit, [{ symbol: "Fe", position: new THREE.Vector3() }], [], { atomScale: 0.36 });
  root.add(iron);
  // Iron–nitrogen bonds follow the ring.
  const ironBonds = new THREE.Group();
  const bondMaterial = kit.toon("#d9d4ff", { rim: 0.2 });
  const bondGeometry = kit.geometry(new THREE.CylinderGeometry(0.1, 0.1, 1, 10, 1, true));
  for (let i = 0; i < 4; i++) {
    const phi = Math.PI / 4 + (i * Math.PI) / 2;
    const bond = new THREE.Mesh(bondGeometry, bondMaterial);
    bond.userData.dir = new THREE.Vector3(Math.cos(phi), 0, Math.sin(phi)).multiplyScalar(2.0 * U);
    ironBonds.add(bond);
  }
  root.add(ironBonds);

  /* ---------------- Proximal histidine, faint ---------------- */
  const his = scaled(histidineAtoms());
  const histidine = molecule(kit, his, bondsByDistance(his, 1.7 * U), { atomScale: 0.3, bondRadius: 0.09 });
  fade(histidine, 0.45);
  root.add(histidine);
  const hisBond = new THREE.Mesh(bondGeometry, kit.toon("#d9d4ff", { rim: 0.2, opacity: 0.5, depthWrite: false }));
  hisBond.position.set(0, -1.05 * U, 0);
  hisBond.scale.set(1, 2.1 * U, 1);
  root.add(hisBond);

  /* ---------------- O₂: arrives, binds end-on, leaves ---------------- */
  const o2 = oxygen(kit);
  root.add(o2);
  const boundAt = v(0, 1.8, 0);
  // Fe–O–O is bent (about 120°); the far oxygen leans towards the viewer.
  const boundDir = new THREE.Vector3(0.8, 0.5, 0.33).normalize();
  const arriveFrom = new THREE.Vector3(7, 8, 5);
  const leaveTo = new THREE.Vector3(-8, 7.5, 3);

  /* ---------------- Surroundings: the globin pocket ---------------- */
  const helices = [
    [v(-13, -6, -6), v(-7, 10, -9)],
    [v(9, -9, -8), v(13, 8, -5)],
    [v(-12, 8, -12), v(8, 11, -13)],
    [v(-6, -12, -4), v(9, -11, -10)],
  ].map(([a, b]) => sweepGeometry(helixPath(a, b), { ra: 0.34, radial: 10, caps: true }));
  env.add(
    new THREE.Mesh(
      merge(kit, helices),
      kit.toon("#ff6f91", { rim: 0.5, rimColor: "#ffd0dc", gloss: 0.3, shadow: "#8a2a6a", opacity: 0.7, env: true }),
    ),
  );
  // Distal histidine above the oxygen site, faint.
  const distalAtoms = scaled(histidineAtoms()).map((a) => ({
    symbol: a.symbol,
    position: a.position.clone().multiplyScalar(-1).add(v(3.4, 1.2, -3.4)),
  }));
  const distal = molecule(kit, distalAtoms, bondsByDistance(distalAtoms, 1.7 * U), { atomScale: 0.3, bondRadius: 0.09, env: true });
  fade(distal, 0.35);
  env.add(distal);
  const halo = kit.glow("#ff5f8f", 26, { opacity: 0.22, env: true });
  halo.position.set(0, 0, -6);
  env.add(halo);
  // Water and a few more O₂ molecules drifting in the pocket.
  const dustRandom = rng(17);
  const water: number[] = [];
  for (let k = 0; k < kit.count(90, 40); k++) {
    const p = new THREE.Vector3((dustRandom() * 2 - 1) * 14, (dustRandom() * 2 - 1) * 9, -8 + dustRandom() * 14);
    if (p.length() < 6.5) continue;
    water.push(p.x, p.y, p.z);
  }
  const waterPoints = kit.points(water, { size: 0.35, color: "#9fe6ff", opacity: 0.4, soft: 0.6, twinkle: 0.3, env: true });
  env.add(waterPoints);
  const drifting: THREE.Group[] = [];
  for (let k = 0; k < 3; k++) {
    const molecule2 = oxygen(kit, true);
    molecule2.position.set(-9 + k * 8, 5 - k * 4.5, -4 + k * 2);
    molecule2.userData.home = molecule2.position.clone();
    env.add(molecule2);
    drifting.push(molecule2);
  }

  // Lighter spheres for the atoms: the shared builder's are made for a handful of atoms.
  const nearSphere = kit.geometry(new THREE.SphereGeometry(1, 18, 12));
  const farSphere = kit.geometry(new THREE.SphereGeometry(1, 8, 6));
  const atomMeshes: THREE.InstancedMesh[] = [];
  root.traverse((object) => {
    const mesh = object as THREE.InstancedMesh;
    if (mesh.isInstancedMesh && mesh.userData.symbol) atomMeshes.push(mesh);
  });

  const q = new THREE.Quaternion();
  const tmp = new THREE.Vector3();
  const curve = (from: THREE.Vector3, to: THREE.Vector3, u: number, lift: number) =>
    tmp.copy(from).lerp(to, u).addScaledVector(Y, Math.sin(u * Math.PI) * lift);
  return {
    root,
    env,
    update({ time, immersion, current }) {
      const sphere = immersion < 0.05 && !current ? farSphere : nearSphere;
      for (const mesh of atomMeshes) mesh.geometry = sphere;
      const state = o2State(time, 0);
      // Deoxy: iron 0.4 Å below the ring plane. Oxy: in the plane.
      ring.position.y = 0.4 * U * (1 - state.bound);
      ironBonds.children.forEach((bond) => {
        const target = (bond.userData.dir as THREE.Vector3).clone().setY(ring.position.y);
        bond.position.copy(target).multiplyScalar(0.5);
        bond.quaternion.setFromUnitVectors(Y, target.clone().normalize());
        bond.scale.set(1, target.length(), 1);
      });
      o2.visible = state.phase !== "away";
      if (state.phase === "arriving") {
        const u = state.u * state.u * (3 - 2 * state.u);
        o2.position.copy(curve(arriveFrom, boundAt, u, 1.5));
        o2.quaternion.setFromUnitVectors(Y, boundDir).multiply(q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), (1 - u) * 5));
      } else if (state.phase === "bound") {
        o2.position.copy(boundAt);
        // The bent O–O swings around the Fe–O axis.
        o2.quaternion.setFromAxisAngle(Y, Math.sin(time * 0.8) * 0.35).multiply(q.setFromUnitVectors(Y, boundDir));
      } else if (state.phase === "leaving") {
        const u = state.u * state.u;
        o2.position.copy(curve(boundAt, leaveTo, u, 1.2));
        o2.quaternion.setFromUnitVectors(Y, boundDir).multiply(q.setFromAxisAngle(new THREE.Vector3(0, 0, 1), u * 4));
      }
      drifting.forEach((m, k) => {
        const home = m.userData.home as THREE.Vector3;
        m.position.set(home.x + Math.sin(time * 0.3 + k) * 1.2, home.y + Math.cos(time * 0.25 + k * 2) * 0.8, home.z);
        m.rotation.set(time * 0.4 + k, time * 0.3, 0);
      });
      waterPoints.position.y = Math.sin(time * 0.2) * 0.3;
    },
  };
};

export default heme;
