/**
 * A capillary (1 unit = 5 µm), seen as if riding along with the blood: red
 * blood cells squeeze through in single file (folded into "parachutes"),
 * while the thin endothelial wall, its flattened nuclei, a pericyte and the
 * surrounding tissue stream past. Oxygen (symbolic dots) leaves the cells
 * and crosses the wall.
 *
 * The `red-cell` child is the cell at the anchor; the others keep their
 * places around it, so nothing ever passes through it.
 */
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Kit } from "../../../engine/kit";
import { TIME, rng } from "../../../engine/kit";
import type { SceneBuilder } from "../types";
import { patchToon, disposeInstances } from "../body/skinShaders";
import { redCellGeometry } from "./redCellShape";

/** Outer radius of the vessel (matches the loop in the epidermis) and of its lumen. */
const OUTER = 0.94;
const LUMEN = 0.84;
/** Root half-length (the subject), and the length of the looping surroundings. */
const HALF = 5;
const SPAN = 36;
/** Scroll speed of the surroundings (units per second). */
const SPEED = 0.55;

const wrap = (x: number) => ((((x + SPAN / 2) % SPAN) + SPAN) % SPAN) - SPAN / 2;

/** Endothelial wall: translucent, with scrolling cell borders. */
function wallMaterial(kit: Kit, side: THREE.Side, opacity: number) {
  const material = patchToon(
    kit.toon("#ffc4d6", { opacity, rim: 0.65, rimColor: "#ffffff", gloss: 0.3, side, depthWrite: false }) as THREE.ShaderMaterial,
    {
      uniforms: { uTime: TIME, uSpeed: { value: SPEED } },
      vertexDecl: "varying vec3 vWall;",
      vertexMain: "vWall = position;",
      fragmentDecl: "varying vec3 vWall;\nuniform float uTime;\nuniform float uSpeed;",
      fragmentFinal: `
  float along = (vWall.x + uTime * uSpeed) / 2.6;
  float around = atan(vWall.z, vWall.y) / 6.2831853 * 3.0;
  float row = floor(around);
  float u = along + 0.5 * row;
  float border = max(smoothstep(0.46, 0.49, abs(fract(u) - 0.5)), smoothstep(0.455, 0.49, abs(fract(around) - 0.5)));
  col = mix(col, vec3(1.0, 0.95, 0.98), border * 0.6);
  outAlpha = min(1.0, outAlpha + border * 0.16);`,
    },
  );
  return material;
}

/** Wrap a shape around the vessel: y is the radial offset, z the distance around it. */
function bendOnTube(geometry: THREE.BufferGeometry, radius: number) {
  const position = geometry.getAttribute("position") as THREE.BufferAttribute;
  for (let i = 0; i < position.count; i++) {
    const r = radius + position.getY(i);
    const a = position.getZ(i) / radius;
    position.setXYZ(i, position.getX(i), r * Math.cos(a), r * Math.sin(a));
  }
  geometry.computeVertexNormals();
  return geometry;
}

/** A red blood cell folded into a parachute, its rim trailing behind (−X). */
function parachuteGeometry(radius: number, cup: number) {
  const geometry = redCellGeometry(radius, { segments: 36, steps: 16 });
  const position = geometry.getAttribute("position") as THREE.BufferAttribute;
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const z = position.getZ(i);
    const r2 = (x * x + z * z) / (radius * radius);
    position.setY(i, position.getY(i) + cup * radius * r2);
    position.setX(i, x * 0.92);
    position.setZ(i, z * 0.92);
  }
  geometry.computeVertexNormals();
  geometry.rotateZ(Math.PI / 2);
  return geometry;
}

const capillary: SceneBuilder = ({ kit, children }) => {
  const root = new THREE.Group();
  const env = new THREE.Group();
  const random = rng(23);
  const anchor = children.find((child) => child.id === "red-cell");
  const anchorX = anchor?.at[0] ?? 0;

  /* ----------------------------- vessel ----------------------------- */
  const tubeGeometry = (from: number, to: number) => {
    const g = new THREE.CylinderGeometry(OUTER, OUTER, to - from, 48, 24, true);
    g.rotateZ(Math.PI / 2);
    g.translate((from + to) / 2, 0, 0);
    return kit.geometry(g);
  };
  const wallBack = wallMaterial(kit, THREE.BackSide, 0.2);
  const wallFront = wallMaterial(kit, THREE.FrontSide, 0.05);
  const addTube = (group: THREE.Group, from: number, to: number, envMaterials?: [THREE.Material, THREE.Material]) => {
    const g = tubeGeometry(from, to);
    const back = new THREE.Mesh(g, envMaterials?.[0] ?? wallBack);
    back.renderOrder = 1;
    const frontMesh = new THREE.Mesh(g, envMaterials?.[1] ?? wallFront);
    frontMesh.renderOrder = 4;
    group.add(back, frontMesh);
  };
  addTube(root, -HALF, HALF);
  const envBack = wallMaterial(kit, THREE.BackSide, 0.2);
  const envFront = wallMaterial(kit, THREE.FrontSide, 0.05);
  for (const m of [envBack, envFront]) m.uniforms.uEnv = kit.envUniform;
  addTube(env, -SPAN / 2, -HALF, [envBack, envFront]);
  addTube(env, HALF, SPAN / 2, [envBack, envFront]);
  // Plasma: a faint straw-coloured core.
  const plasma = new THREE.Mesh(tubeGeometry(-HALF, HALF), kit.toon("#ffd7a0", { opacity: 0.1, rim: 0, gloss: 0, depthWrite: false, side: THREE.BackSide }));
  plasma.scale.set(1, LUMEN / OUTER, LUMEN / OUTER);
  plasma.renderOrder = 2;
  root.add(plasma);

  /* ------------------------ red blood cells ------------------------ */
  const cellMaterial = kit.toon("#ff2446", { rim: 0.4, rimColor: "#ff7a82", gloss: 0.35, shadow: "#b0103c", soft: 0.35, flat: 0.15 });
  const envCellMaterial = kit.toon("#ff2446", { rim: 0.4, rimColor: "#ff7a82", gloss: 0.35, shadow: "#b0103c", soft: 0.35, flat: 0.15, env: true });
  const parachute = kit.geometry(parachuteGeometry(0.76, 0.42));
  interface Rbc {
    x: number;
    mesh: THREE.Mesh;
    phase: number;
    roll: number;
  }
  const cells: Rbc[] = [];
  for (let k = -8; k <= 8; k++) {
    if (k === 0) continue; // the anchored cell is the `red-cell` level
    const x = anchorX + k * 2.15 + (random() - 0.5) * 0.25;
    const inRoot = Math.abs(x) < HALF - 0.4;
    const mesh = new THREE.Mesh(parachute, inRoot ? cellMaterial : envCellMaterial);
    mesh.position.set(x, 0, 0);
    (inRoot ? root : env).add(mesh);
    cells.push({ x, mesh, phase: random() * Math.PI * 2, roll: random() * Math.PI * 2 });
  }

  /* ------------------ wall nuclei and pericytes (scrolling) ------------------ */
  const nucleusGeometry = kit.geometry(new THREE.SphereGeometry(1, 20, 12));
  const wallNucleus = new THREE.SphereGeometry(1, 24, 14);
  wallNucleus.scale(0.62, 0.15, 0.32);
  wallNucleus.translate(0, -0.01, 0);
  const bentNucleus = kit.geometry(bendOnTube(wallNucleus, OUTER));
  const nucleusMaterial = kit.toon("#c7a6ff", { rim: 0.6, rimColor: "#f6efff", gloss: 0.35, opacity: 0.6, depthWrite: false });
  const nucleusEnv = kit.toon("#c7a6ff", { rim: 0.6, rimColor: "#f6efff", gloss: 0.35, opacity: 0.6, env: true, depthWrite: false });
  const nuclei = Array.from({ length: 9 }, (_, k) => ({ x0: -SPAN / 2 + (k + random() * 0.5) * (SPAN / 9), angle: random() * Math.PI * 2 }));
  const nucleusRoot = new THREE.InstancedMesh(bentNucleus, nucleusMaterial, nuclei.length);
  const nucleusFar = new THREE.InstancedMesh(bentNucleus, nucleusEnv, nuclei.length);
  // Pericyte: a cell body whose processes wrap around the vessel.
  const pericyteParts: THREE.BufferGeometry[] = [];
  const body = new THREE.SphereGeometry(1, 24, 16);
  body.scale(0.55, 0.16, 0.42);
  body.translate(0, 0.08, 0);
  bendOnTube(body, OUTER);
  pericyteParts.push(body.toNonIndexed());
  body.dispose();
  for (const [dx, dir] of [[-0.5, -1], [0.5, 1], [-0.1, -1], [0.2, 1]] as const) {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 12; i++) {
      const a = Math.PI / 2 + dir * (i / 12) * Math.PI * 0.85;
      const r = OUTER + 0.04;
      pts.push(new THREE.Vector3(dx + dir * i * 0.07, Math.sin(a) * r, Math.cos(a) * r));
    }
    const tube = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.06, 6);
    pericyteParts.push(tube.toNonIndexed());
    tube.dispose();
  }
  const pericyteGeometry = kit.geometry(mergeGeometries(pericyteParts)!);
  for (const g of pericyteParts) g.dispose();
  const pericytes = [{ x0: -3.5, angle: 0.5 }, { x0: 12, angle: -0.4 }];
  const pericyteRoot = new THREE.InstancedMesh(pericyteGeometry, kit.toon("#6fe0b8", { rim: 0.5, rimColor: "#d8fff1", gloss: 0.35 }), pericytes.length);
  const pericyteFar = new THREE.InstancedMesh(pericyteGeometry, kit.toon("#6fe0b8", { rim: 0.5, rimColor: "#d8fff1", gloss: 0.35, env: true }), pericytes.length);
  for (const mesh of [nucleusRoot, nucleusFar, pericyteRoot, pericyteFar]) mesh.frustumCulled = false;
  root.add(nucleusRoot, pericyteRoot);
  env.add(nucleusFar, pericyteFar);

  /* ----------------------- oxygen leaving the cells ----------------------- */
  const oxygenCount = kit.count(70, 35);
  const oxygenSeeds = Array.from({ length: oxygenCount }, () => ({
    x: (random() - 0.5) * 11,
    a: random() * Math.PI * 2,
    phase: random(),
    speed: 0.12 + random() * 0.1,
    drift: (random() - 0.5) * 0.8,
  }));
  const oxygen = kit.points(new Float32Array(oxygenCount * 3), { size: 0.13, color: "#8ff4ff", opacity: 0.95, soft: 0.35 });
  const oxygenPositions = oxygen.geometry.getAttribute("position") as THREE.BufferAttribute;
  (oxygen.material as THREE.ShaderMaterial).uniforms.uEnv = kit.envUniform;
  env.add(oxygen);

  /* ---------------------------- tissue ---------------------------- */
  const tissue = new THREE.Group();
  env.add(tissue);
  const period = SPAN;
  const fibres: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 6; i++) {
    const y = [-2.5, 1.9, -1.7, -3.3, 2.4, 1.4][i];
    const z = [-2.6, -3.4, -4.2, -1.4, -2.2, -4.6][i];
    for (const shift of [0, -period]) {
      const points: THREE.Vector3[] = [];
      for (let k = 0; k <= 36; k++) {
        const x = -period / 2 + (k / 36) * period + shift + period / 2;
        const t = (k / 36) * Math.PI * 2;
        points.push(new THREE.Vector3(x, y + 0.35 * Math.sin(t * 3 + i) + 0.2 * Math.sin(t * 5 + i * 2), z + 0.4 * Math.cos(t * 2 + i)));
      }
      fibres.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 180, 0.08 + (i % 3) * 0.03, 7));
    }
  }
  tissue.add(new THREE.Mesh(kit.geometry(mergeGeometries(fibres)!), kit.toon("#e8779f", { rim: 0.35, rimColor: "#ffc4d8", gloss: 0.2, env: true, shadow: "#7e2352", opacity: 0.85 })));
  for (const g of fibres) g.dispose();
  // Basement membrane and basal keratinocytes above the papilla.
  const membraneGeometry = new THREE.PlaneGeometry(period * 2, 10, 60, 1);
  membraneGeometry.rotateX(-Math.PI / 2);
  const mp = membraneGeometry.getAttribute("position") as THREE.BufferAttribute;
  for (let i = 0; i < mp.count; i++) mp.setY(i, 3.2 + 0.12 * Math.sin((mp.getX(i) / period) * Math.PI * 8));
  membraneGeometry.computeVertexNormals();
  tissue.add(new THREE.Mesh(kit.geometry(membraneGeometry), kit.toon("#e27aa6", { env: true, rim: 0.3, side: THREE.DoubleSide, soft: 0.4, flat: 0.3, opacity: 0.55, depthWrite: false })));
  const basalSlots = 2 * Math.ceil(period / 2.2) * 2;
  const basal = new THREE.InstancedMesh(kit.blob(1, { detail: 2, noise: 0.08, seed: 5 }), kit.toon("#ea5c9c", { env: true, rim: 0.45, rimColor: "#ffc2dd", gloss: 0.3 }), basalSlots);
  const basalNuclei = new THREE.InstancedMesh(nucleusGeometry, kit.toon("#8a5cff", { env: true, rim: 0.3 }), basalSlots);
  let b = 0;
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  for (const shift of [0, -period])
    for (let x = 0; x < period - 0.01 && b < basalSlots - 1; x += 2.2)
      for (const z of [0.4, -1.8]) {
        const p = new THREE.Vector3(x + shift + (random() - 0.5) * 0.3, 4.55, z + (random() - 0.5) * 0.4);
        basal.setMatrixAt(b, m4.compose(p, q.identity(), new THREE.Vector3(1.05, 1.25, 1.05)));
        basalNuclei.setMatrixAt(b, m4.compose(p.clone().add(new THREE.Vector3(0, 0.1, 0.6)), q, new THREE.Vector3(0.55, 0.6, 0.5)));
        b++;
      }
  basal.count = b;
  basalNuclei.count = b;
  tissue.add(basal, basalNuclei);
  // Fibroblasts resting among the fibres.
  const fibroblasts = new THREE.InstancedMesh(kit.blob(1, { detail: 3, noise: 0.12, seed: 21 }), kit.toon("#f58fb8", { env: true, rim: 0.5, rimColor: "#ffd6e6", gloss: 0.3 }), 8);
  const fibroNuclei = new THREE.InstancedMesh(nucleusGeometry, kit.toon("#9b6cff", { env: true, rim: 0.3 }), 8);
  let f = 0;
  for (const shift of [0, -period])
    for (const [x, y, z, a] of [[3, -2.4, -1.8, 0.2], [11, 2.1, -2.6, -0.3], [19, -3.2, 1.4, 0.1], [28, 1.6, 1.9, -0.2]]) {
      const p = new THREE.Vector3(x + shift, y, z);
      const r = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.3, 0.4, a));
      fibroblasts.setMatrixAt(f, m4.compose(p, r, new THREE.Vector3(1.9, 0.36, 0.5)));
      fibroNuclei.setMatrixAt(f, m4.compose(p.clone().add(new THREE.Vector3(0, 0.05, 0.25)), r, new THREE.Vector3(0.6, 0.22, 0.3)));
      f++;
    }
  tissue.add(fibroblasts, fibroNuclei);
  const ground: number[] = [];
  for (let i = 0; i < kit.count(160); i++) ground.push((random() - 0.5) * period * 2, (random() - 0.5) * 10, -1 - random() * 5);
  tissue.add(kit.points(ground, { size: 0.1, color: "#ffc2d6", opacity: 0.5, soft: 1, twinkle: 0.4, env: true }));
  const glow = kit.glow("#ff5a7a", 26, { opacity: 0.25, env: true });
  glow.position.set(0, 0, -6);
  env.add(glow);

  const dummy = new THREE.Object3D();
  const hide = new THREE.Matrix4().makeScale(0, 0, 0);
  return {
    root,
    env,
    dispose: () => disposeInstances(root, env),
    update({ time }) {
      const scroll = time * SPEED;
      // Cells stay with the viewer, wobbling and rolling slightly as they squeeze.
      for (const cell of cells) {
        const w = Math.sin(time * 1.3 + cell.phase);
        cell.mesh.position.set(cell.x + 0.08 * w, 0.03 * Math.sin(time * 1.7 + cell.phase), 0.03 * Math.cos(time * 1.1 + cell.phase));
        cell.mesh.rotation.set(cell.roll + time * 0.25, 0, 0.05 * w);
        cell.mesh.scale.set(1 + 0.06 * w, 1 - 0.03 * w, 1 - 0.03 * w);
      }
      // Wall nuclei and pericytes stream past.
      nuclei.forEach((n, k) => {
        const x = wrap(n.x0 - scroll);
        dummy.position.set(x, 0, 0);
        dummy.rotation.set(n.angle, 0, 0);
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        const inside = Math.abs(x) < HALF - 0.6;
        nucleusRoot.setMatrixAt(k, inside ? dummy.matrix : hide);
        nucleusFar.setMatrixAt(k, inside ? hide : dummy.matrix);
      });
      pericytes.forEach((p, k) => {
        const x = wrap(p.x0 - scroll);
        dummy.position.set(x, 0, 0);
        dummy.rotation.set(p.angle, 0, 0);
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        const inside = Math.abs(x) < HALF - 1.1;
        pericyteRoot.setMatrixAt(k, inside ? dummy.matrix : hide);
        pericyteFar.setMatrixAt(k, inside ? hide : dummy.matrix);
      });
      for (const mesh of [nucleusRoot, nucleusFar, pericyteRoot, pericyteFar]) mesh.instanceMatrix.needsUpdate = true;
      tissue.position.x = -((scroll % period) + period) % period;
      // Oxygen: from the cells, through the wall, into the tissue.
      oxygenSeeds.forEach((o, k) => {
        const life = (time * o.speed + o.phase) % 1;
        const r = 0.35 + life * 3.2;
        const x = o.x + o.drift * life - (r > LUMEN ? (r - LUMEN) * 0.3 : 0);
        oxygenPositions.setXYZ(k, x, Math.cos(o.a) * r, Math.sin(o.a) * r);
      });
      oxygenPositions.needsUpdate = true;
    },
  };
};

export default capillary;
