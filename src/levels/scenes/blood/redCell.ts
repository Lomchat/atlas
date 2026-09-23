/**
 * A red blood cell (1 unit = 0.78 µm): the biconcave disc (Evans–Fung
 * profile) lying flat, seen from above. A wedge is cut away at the front: the
 * cut faces show the dumbbell cross-section, packed with hemoglobin (drawn
 * as beads, much larger than scale). No nucleus, no organelles.
 * The `rbc-interior` level is anchored on the left cut face, just under the
 * upper membrane.
 */
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Kit } from "../../../engine/kit";
import { TIME, rng } from "../../../engine/kit";
import type { SceneBuilder } from "../types";
import { patchToon, disposeInstances } from "../body/skinShaders";
import { beadsMaterial, biconcaveProfile, halfThickness } from "./redCellShape";

const RADIUS = 5;
/** Opening of the wedge cut out at the front (+Z). */
export const WEDGE = (70 * Math.PI) / 180;

/** The membrane: soft coral red, with a faint shimmer of thermal "flicker". */
function membraneMaterial(kit: Kit) {
  return patchToon(kit.toon("#ff4458", { rim: 0.55, rimColor: "#ffb0b8", gloss: 0.5, shadow: "#a3123f", soft: 0.3 }) as THREE.ShaderMaterial, {
    uniforms: { uTime: TIME },
    vertexDecl: "uniform float uTime;",
    vertexTransform: `
  float flick = sin(position.x * 2.1 + uTime * 1.7) * sin(position.z * 1.7 - uTime * 1.3) * sin(position.y * 3.0 + uTime);
  transformed += normal * flick * 0.035;`,
  });
}

const redCell: SceneBuilder = ({ kit }) => {
  const root = new THREE.Group();
  const env = new THREE.Group();
  const random = rng(3);

  /* The cell with a wedge removed, centred on +Z (the front). */
  const shell = new THREE.LatheGeometry(biconcaveProfile(48), 120, WEDGE / 2, Math.PI * 2 - WEDGE);
  shell.scale(RADIUS, RADIUS, RADIUS);
  const cell = new THREE.Mesh(kit.geometry(shell), membraneMaterial(kit));
  root.add(cell);
  // The missing wedge, shown only from afar: the cell opens as you dive in.
  const plug = new THREE.LatheGeometry(biconcaveProfile(48), 24, -WEDGE / 2, WEDGE);
  plug.scale(RADIUS, RADIUS, RADIUS);
  const plugMaterial = membraneMaterial(kit);
  plugMaterial.transparent = true;
  const plugMesh = new THREE.Mesh(kit.geometry(plug), plugMaterial);
  plugMesh.renderOrder = 3;
  root.add(plugMesh);

  // The two cut faces: the biconcave cross-section, filled with hemoglobin.
  const profile = biconcaveProfile(48).map((p) => new THREE.Vector2(p.x * RADIUS, p.y * RADIUS));
  const shape = new THREE.Shape(profile);
  const faces: THREE.BufferGeometry[] = [];
  const rims: THREE.BufferGeometry[] = [];
  for (const phi of [WEDGE / 2, -WEDGE / 2]) {
    // Shape x = distance from the axis, y = height; placed along the radial direction at angle phi.
    const face = new THREE.ShapeGeometry(shape, 24);
    const basis = new THREE.Matrix4().makeBasis(
      new THREE.Vector3(Math.sin(phi), 0, Math.cos(phi)),
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(Math.cos(phi), 0, -Math.sin(phi)),
    );
    face.applyMatrix4(basis);
    faces.push(face);
    const rimPoints = profile.map((p) => new THREE.Vector3(p.x * Math.sin(phi), p.y, p.x * Math.cos(phi)));
    const rim = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rimPoints), 200, 0.07, 6);
    rims.push(rim);
  }
  const faceMesh = new THREE.Mesh(kit.geometry(mergeGeometries(faces)!), beadsMaterial(kit, { perUnit: 2.9, side: THREE.DoubleSide }));
  root.add(faceMesh);
  const rimMaterial = kit.toon("#e0253f", { rim: 0.4, rimColor: "#ff9aa6", gloss: 0.4, transparent: true });
  root.add(new THREE.Mesh(kit.geometry(mergeGeometries(rims)!), rimMaterial));
  for (const g of [...faces, ...rims]) g.dispose();

  /* Surroundings: plasma with other red cells, platelets and oxygen. */
  const disc = kit.geometry(new THREE.LatheGeometry(biconcaveProfile(24), 40));
  const neighbours = new THREE.InstancedMesh(disc, kit.toon("#e8375a", { rim: 0.5, rimColor: "#ff9fb0", gloss: 0.35, shadow: "#7a1044", env: true }), 5);
  const others = Array.from({ length: neighbours.count }, (_, k) => {
    const a = (k / neighbours.count) * Math.PI * 2 + random() * 0.5 + 0.4;
    const r = 17 + random() * 4;
    return {
      p: new THREE.Vector3(Math.cos(a) * r, -4 + random() * 8, -16 - random() * 8),
      axis: new THREE.Vector3(random() - 0.5, random() - 0.5, random() - 0.5).normalize(),
      speed: 0.08 + random() * 0.1,
      phase: random() * 6,
    };
  });
  neighbours.frustumCulled = false;
  env.add(neighbours);
  const platelets = new THREE.InstancedMesh(kit.blob(1, { detail: 2, noise: 0.15, seed: 8 }), kit.toon("#ffd2a8", { rim: 0.5, env: true }), 5);
  const plateletSpots = Array.from({ length: platelets.count }, () => ({
    p: new THREE.Vector3((random() - 0.5) * 30, (random() - 0.5) * 14, -6 - random() * 6),
    phase: random() * 6,
  }));
  platelets.frustumCulled = false;
  env.add(platelets);
  const dust: number[] = [];
  for (let i = 0; i < kit.count(160); i++) dust.push((random() - 0.5) * 34, (random() - 0.5) * 20, -2 - random() * 12);
  env.add(kit.points(dust, { size: 0.14, color: "#ffc2cf", opacity: 0.5, soft: 1, twinkle: 0.4, env: true }));
  const glow = kit.glow("#ff6f8c", 30, { opacity: 0.25, env: true });
  glow.position.set(0, -2, -8);
  env.add(glow);
  // Oxygen molecules (symbolic) drifting towards the membrane.
  const oxygenCount = kit.count(24, 12);
  const oxygenSeeds = Array.from({ length: oxygenCount }, () => ({
    a: random() * Math.PI * 2,
    y: (random() - 0.5) * 2,
    phase: random(),
    speed: 0.05 + random() * 0.05,
  }));
  const oxygen = kit.points(new Float32Array(oxygenCount * 3), { size: 0.35, color: "#8ff4ff", opacity: 0.95, soft: 0.4, env: true });
  const oxygenPositions = oxygen.geometry.getAttribute("position") as THREE.BufferAttribute;
  env.add(oxygen);

  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3(RADIUS, RADIUS, RADIUS);
  const p = new THREE.Vector3();
  return {
    root,
    env,
    dispose: () => disposeInstances(root, env),
    update({ time, immersion }) {
      const closed = 1 - THREE.MathUtils.smoothstep(immersion, 0.15, 0.7);
      plugMaterial.uniforms.uOpacity.value = closed;
      plugMesh.visible = closed > 0.01;
      (rimMaterial as THREE.ShaderMaterial).uniforms.uOpacity.value = 1 - closed;
      others.forEach((o, k) => {
        q.setFromAxisAngle(o.axis, o.phase + time * o.speed);
        p.copy(o.p).setY(o.p.y + Math.sin(time * 0.2 + o.phase) * 0.6);
        neighbours.setMatrixAt(k, m.compose(p, q, s));
      });
      neighbours.instanceMatrix.needsUpdate = true;
      plateletSpots.forEach((o, k) => {
        q.setFromEuler(new THREE.Euler(time * 0.2 + o.phase, o.phase, 0));
        p.copy(o.p).setX(o.p.x + Math.sin(time * 0.15 + o.phase) * 0.8);
        platelets.setMatrixAt(k, m.compose(p, q, new THREE.Vector3(0.6, 0.2, 0.6)));
      });
      platelets.instanceMatrix.needsUpdate = true;
      oxygenSeeds.forEach((o, k) => {
        const life = (time * o.speed + o.phase) % 1;
        const r = 12 - life * 7;
        oxygenPositions.setXYZ(k, Math.cos(o.a) * r, o.y * (1 - life * 0.5) + halfThickness(0.8) * RADIUS * 0.5, Math.sin(o.a) * r);
      });
      oxygenPositions.needsUpdate = true;
    },
  };
};

export default redCell;
