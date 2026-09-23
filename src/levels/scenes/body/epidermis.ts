/**
 * The epidermis (1 unit = 20 µm): a cut-away block from the dermal papilla up
 * to the surface. Keratinocytes are born in the stratum basale (columnar
 * cells on the basement membrane), rise through the stratum spinosum,
 * flatten and fill with granules in the stratum granulosum, cross the thin
 * stratum lucidum of thick (glabrous) skin, and end as flat dead squames in
 * the stratum corneum, which peel off. Below, a dermal papilla holds a
 * capillary loop with red blood cells.
 *
 * Children: `cell` (a basal keratinocyte, left gap in the basal row) and
 * `capillary` (the flat top of the capillary loop).
 */
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Kit } from "../../../engine/kit";
import { TIME, rng } from "../../../engine/kit";
import type { SceneBuilder } from "../types";
import { redCellGeometry } from "../blood/redCellShape";
import { patchToon, disposeInstances } from "./skinShaders";
import { slab, strataMaterial } from "./skinSlab";

const X0 = -5;
const X1 = 5;
const Z0 = -2.5;
const Z1 = 2.5;
const BOTTOM = -5;
const BOUNDS = { x0: X0, x1: X1, z0: Z0, z1: Z1 };
/** Stratum boundaries (depth below the surface / height above the junction). */
const CORNEUM = 1.55;
const LUCIDUM = 1.72;
const GRANULOSUM = 2.35;
const BASALE = 0.62;
/** Dermal papilla and its capillary loop. */
const PAPILLA = { x: 0.9, height: 1.32, rx: 2.55, rz: 2.4 };
const LOOP_Z = 2.24;
const LOOP_TOP = -3.3;
const LOOP_RADIUS = 0.235;
/** A basal cell shown in mitosis. */
const DIVIDING_X = 3.35;

function junction(x: number, z: number) {
  const dx = (x - PAPILLA.x) / PAPILLA.rx;
  const dz = (z - Z1) / PAPILLA.rz;
  const d = dx * dx + dz * dz;
  return -3.95 + 0.1 * Math.sin(0.9 * x + 0.3) + (d < 1 ? PAPILLA.height * Math.pow(1 - d, 0.8) : 0);
}
function surface(x: number, z: number) {
  return 4.4 + 0.18 * Math.cos(0.3 * x + 0.6) + 0.05 * Math.sin(1.1 * z);
}

/** Cells: blobs with a nucleus painted on their outward side (+Z in the instance frame). */
function cellMaterial(kit: Kit) {
  return patchToon(kit.toon("#ffffff", { rim: 0.45, rimColor: "#ffe3f0", gloss: 0.3, soft: 0.3 }) as THREE.ShaderMaterial, {
    uniforms: { uTime: TIME },
    vertexDecl: "attribute vec4 aNuc;\nattribute vec2 aCell;\nuniform float uTime;\nvarying vec3 vLocalN;\nvarying vec3 vLocalP;\nvarying vec4 vNuc;\nvarying float vGran;",
    vertexTransform: "transformed *= 1.0 + 0.035 * sin(uTime * 1.4 + aCell.x * 6.2831853);",
    vertexMain: "vLocalN = normal; vLocalP = position; vNuc = aNuc; vGran = aCell.y;",
    fragmentDecl: "varying vec3 vLocalN;\nvarying vec3 vLocalP;\nvarying vec4 vNuc;\nvarying float vGran;",
    fragmentNormal: `
  vec3 ln = normalize(vLocalN);
  if (vNuc.a > 0.0) {
    float edge = 1.0 - vNuc.a;
    float nuc = smoothstep(edge - 0.02, edge + 0.015, ln.z);
    float ring = smoothstep(edge - 0.07, edge - 0.02, ln.z) * (1.0 - nuc);
    base = mix(base, base * vec3(0.86, 0.8, 0.92), ring);
    base = mix(base, vNuc.rgb, nuc);
    float nucleolus = smoothstep(0.985, 0.995, dot(ln, normalize(vec3(0.12, 0.16, 1.0))));
    base = mix(base, vNuc.rgb * 0.6, nucleolus * nuc * step(0.2, vNuc.a));
  }
  if (vGran > 0.5) {
    vec3 cellP = vLocalP * 6.0;
    vec3 id = floor(cellP);
    float h = fract(sin(dot(id, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
    float dots = step(0.55, h) * (1.0 - smoothstep(0.18, 0.3, length(fract(cellP) - 0.5)));
    base = mix(base, vec3(0.42, 0.18, 0.5), dots * 0.85);
  }`,
  });
}

const epidermis: SceneBuilder = ({ kit, children }) => {
  const root = new THREE.Group();
  const env = new THREE.Group();
  const random = rng(11);
  const cellChild = children.find((child) => child.id === "cell");
  const gapX = cellChild?.at[0] ?? -2.6;

  /* --------------------- backing tissue (strata) --------------------- */
  const tissue = new THREE.Mesh(
    kit.geometry(slab(BOUNDS, surface, junction, { nx: 120, nz: 50, ny: 6, top: [40, 16], bottom: [80, 40], faces: ["top", "bottom", "front", "back", "left", "right"] })),
    strataMaterial(kit, { corneum: CORNEUM, lucidum: LUCIDUM, granulosum: GRANULOSUM, basale: BASALE, dim: 0.55, skinTop: false, squames: [2.1, 0.14] }),
  );
  root.add(tissue);

  /* ---------------------------- cells ---------------------------- */
  interface Cell {
    p: THREE.Vector3;
    q: THREE.Quaternion;
    s: THREE.Vector3;
    color: THREE.Color;
    nucleus: [number, number, number, number];
    granular: boolean;
  }
  const cells: Cell[] = [];
  let mitosis: THREE.Vector3[] | undefined;
  const front = new THREE.Quaternion();
  const side = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI / 2, 0));
  const violet = new THREE.Color("#8a5cff");
  const lavender = new THREE.Color("#a78cff");
  const nucleusOf = (c: THREE.Color, size: number): [number, number, number, number] => [c.r, c.g, c.b, size];
  const basalColor = new THREE.Color("#ea5c9c");
  const spinyLow = new THREE.Color("#f27aa8");
  const spinyHigh = new THREE.Color("#f9ab93");

  /** Place a layer along one visible face; `along` runs across the face. */
  const faces = [
    { id: "front", from: X0 + 0.25, to: X1 - 0.1, at: (a: number, y: number, inset: number) => new THREE.Vector3(a, y, Z1 - inset), q: front, j: (a: number) => junction(a, Z1), s: (a: number) => surface(a, Z1) },
    { id: "right", from: Z0 + 0.25, to: Z1 - 0.45, at: (a: number, y: number, inset: number) => new THREE.Vector3(X1 - inset, y, a), q: side, j: (a: number) => junction(X1, a), s: (a: number) => surface(X1, a) },
  ];
  for (const face of faces) {
    // Stratum basale: columnar cells standing on the basement membrane.
    const step = 0.012;
    let travelled = 0.22;
    let prev = face.from;
    for (let a = face.from; a <= face.to; a += step) {
      travelled += Math.hypot(step, face.j(a) - face.j(prev));
      prev = a;
      if (travelled < 0.47) continue;
      travelled = 0;
      if (face.id === "front" && Math.abs(a - gapX) < 0.52) continue;
      const dividing = face.id === "front" && Math.abs(a - DIVIDING_X) < 0.24 && !mitosis;
      const slope = (face.j(a + 0.02) - face.j(a - 0.02)) / 0.04;
      const tilt = Math.atan(slope);
      const normal = new THREE.Vector2(-Math.sin(tilt), Math.cos(tilt));
      const y = face.j(a) + normal.y * 0.31;
      const along = a + normal.x * 0.31;
      const q = face.q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), tilt));
      if (dividing) {
        // A cell caught dividing: pinched in two, each half with its set of chromosomes.
        const side = new THREE.Vector3(Math.cos(tilt), Math.sin(tilt), 0).multiplyScalar(0.17);
        for (const k of [-1, 1]) {
          const p = face.at(along, y, 0.04).addScaledVector(side, k);
          cells.push({ p, q, s: new THREE.Vector3(0.2, 0.3, 0.26), color: basalColor.clone().offsetHSL(0.01, 0, 0.04), nucleus: nucleusOf(violet, 0), granular: false });
          mitosis = mitosis ?? [];
          mitosis.push(p.clone().add(new THREE.Vector3(0, 0, 0.25)));
        }
        continue;
      }
      cells.push({
        p: face.at(along, y, 0.04),
        q,
        s: new THREE.Vector3(0.26, 0.33, 0.27),
        color: basalColor.clone().offsetHSL((random() - 0.5) * 0.03, 0, (random() - 0.5) * 0.05),
        nucleus: nucleusOf(violet, 0.3),
        granular: false,
      });
    }
    // Stratum spinosum: rows following the papilla at the bottom, flatter above.
    const rows = 7;
    for (let k = 0; k < rows; k++) {
      const t = (k + 0.5) / rows;
      const spacing = 0.6 + t * 0.08;
      for (let a = face.from + ((k % 2) * spacing) / 2; a <= face.to; a += spacing) {
        const low = face.j(a) + BASALE + 0.04;
        const high = face.s(a) - GRANULOSUM - 0.04;
        const y = low + (high - low) * t;
        const rowH = (high - low) / rows;
        const color = spinyLow.clone().lerp(spinyHigh, t).offsetHSL((random() - 0.5) * 0.02, 0, (random() - 0.5) * 0.04);
        cells.push({
          p: face.at(a + (random() - 0.5) * 0.05, y, 0.05),
          q: face.q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), (random() - 0.5) * 0.25)),
          s: new THREE.Vector3(spacing * 0.58, Math.min(0.36, rowH * 0.64) * (1 - t * 0.15), 0.34),
          color,
          nucleus: nucleusOf(color.clone().lerp(lavender, 0.7), 0.15 - t * 0.04),
          granular: false,
        });
      }
    }
    // Stratum granulosum: flattened cells full of keratohyalin granules.
    for (const [k, depth] of [1.95, 2.2].entries())
      for (let a = face.from + k * 0.42; a <= face.to; a += 0.86) {
        cells.push({
          p: face.at(a, face.s(a) - depth, 0.05),
          q: face.q,
          s: new THREE.Vector3(0.47, 0.15, 0.42),
          color: new THREE.Color("#ec95a5").offsetHSL(0, 0, (random() - 0.5) * 0.05),
          nucleus: nucleusOf(new THREE.Color("#5a2a8c"), 0.1),
          granular: true,
        });
      }
  }
  const cellGeometry = kit.blob(1, { detail: 2, noise: 0.07, seed: 3 });
  const nuc = new Float32Array(cells.length * 4);
  const cellAttr = new Float32Array(cells.length * 2);
  cells.forEach((cell, k) => {
    nuc.set(cell.nucleus, k * 4);
    cellAttr.set([random(), cell.granular ? 1 : 0], k * 2);
  });
  cellGeometry.setAttribute("aNuc", new THREE.InstancedBufferAttribute(nuc, 4));
  cellGeometry.setAttribute("aCell", new THREE.InstancedBufferAttribute(cellAttr, 2));
  const cellMesh = new THREE.InstancedMesh(cellGeometry, cellMaterial(kit), cells.length);
  const m = new THREE.Matrix4();
  cells.forEach((cell, k) => {
    cellMesh.setMatrixAt(k, m.compose(cell.p, cell.q, cell.s));
    cellMesh.setColorAt(k, cell.color);
  });
  root.add(cellMesh);
  // Condensed chromosomes of the dividing cell (two sets pulled apart).
  const chromosomes = new THREE.InstancedMesh(kit.geometry(new THREE.CapsuleGeometry(0.018, 0.09, 3, 6)), kit.toon("#5a24c9", { rim: 0.4, rimColor: "#b89cff" }), 12);
  (mitosis ?? []).forEach((center, k) => {
    for (let c = 0; c < 6; c++) {
      const a = (c / 6) * Math.PI * 2 + k;
      const p = center.clone().add(new THREE.Vector3(Math.cos(a) * 0.06, Math.sin(a) * 0.09, 0));
      chromosomes.setMatrixAt(k * 6 + c, m.compose(p, new THREE.Quaternion().setFromEuler(new THREE.Euler(0.4 * c, 0.3, a)), new THREE.Vector3(1, 1, 1)));
    }
  });
  chromosomes.count = (mitosis?.length ?? 0) * 6;
  root.add(chromosomes);

  /* ------------------ stratum corneum: dead squames ------------------ */
  const squameGeometry = kit.geometry(new THREE.CylinderGeometry(1, 1, 1, 6));
  const squameMaterial = kit.toon("#ffffff", { rim: 0.4, rimColor: "#fffaf2", gloss: 0.25, soft: 0.35 });
  const squameColors = ["#fff1e0", "#f9dfcc", "#fff7ec", "#f3d3c2", "#fde8d8"].map((c) => new THREE.Color(c));
  const squames: { p: THREE.Vector3; q: THREE.Quaternion; s: THREE.Vector3 }[] = [];
  // Top surface.
  for (let x = X0 + 0.8; x < X1 - 0.5; x += 1.15)
    for (let z = Z0 + 0.8; z < Z1 - 0.5; z += 1.1) {
      const px = x + (random() - 0.5) * 0.2 + (Math.round(z) % 2) * 0.35;
      const pz = z + (random() - 0.5) * 0.2;
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler((random() - 0.5) * 0.08, random() * 3, (random() - 0.5) * 0.08));
      squames.push({ p: new THREE.Vector3(Math.min(px, X1 - 0.75), surface(px, pz) - 0.01, pz), q, s: new THREE.Vector3(0.74, 0.04, 0.72) });
    }
  const squameMesh = new THREE.InstancedMesh(squameGeometry, squameMaterial, squames.length);
  squames.forEach((sq, k) => {
    squameMesh.setMatrixAt(k, m.compose(sq.p, sq.q, sq.s));
    squameMesh.setColorAt(k, squameColors[k % squameColors.length]);
  });
  root.add(squameMesh);

  // Squames peeling off the surface (animated).
  const peelCount = 6;
  const peel = new THREE.InstancedMesh(squameGeometry, squameMaterial, peelCount);
  const peelSpots = Array.from({ length: peelCount }, (_, k) => {
    const x = X0 + 1 + ((k * 1.37) % 8);
    const z = Z0 + 0.8 + ((k * 0.83) % 3.4);
    return { x, z, y: surface(x, z), phase: k / peelCount, spin: random() * 6 };
  });
  peelSpots.forEach((_, k) => peel.setColorAt(k, squameColors[(k + 1) % squameColors.length]));
  peel.frustumCulled = false;
  root.add(peel);

  /* ----------------------- dermal papilla ----------------------- */
  const dermisGeometry = kit.geometry(slab(BOUNDS, junction, () => BOTTOM, { nx: 100, nz: 40, ny: 4, bottom: [10, 6], faces: ["front", "back", "left", "right", "bottom"] }));
  const dermisInside = new THREE.Mesh(dermisGeometry, kit.toon("#c9416f", { side: THREE.BackSide, rim: 0, gloss: 0, soft: 0.6, shadow: "#7a1f55" }));
  const dermisFront = new THREE.Mesh(dermisGeometry, kit.toon("#ff8fb1", { opacity: 0.45, rim: 0.7, rimColor: "#ffd6e4", gloss: 0.25, depthWrite: false }));
  dermisFront.renderOrder = 2;
  root.add(dermisInside, dermisFront);
  // Basement membrane under the basal cells.
  const membranePoints = (f: (a: number) => THREE.Vector3, from: number, to: number) =>
    Array.from({ length: 80 }, (_, k) => f(from + ((to - from) * k) / 79));
  const membrane = mergeGeometries([
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(membranePoints((a) => new THREE.Vector3(a, junction(a, Z1) + 0.01, Z1 - 0.02), X0, X1)), 160, 0.035, 6),
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(membranePoints((a) => new THREE.Vector3(X1 - 0.02, junction(X1, a) + 0.01, a), Z0, Z1)), 80, 0.035, 6),
  ])!;
  root.add(new THREE.Mesh(kit.geometry(membrane), kit.toon("#ffd9e6", { rim: 0.5, gloss: 0.4 })));
  // Collagen fibres and a fibroblast in the dermis.
  const fibres: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 7; i++) {
    const y0 = -4.75 + random() * 0.6;
    const z0 = Z0 + 0.4 + random() * 3.4;
    const points = Array.from({ length: 7 }, (_, k) => new THREE.Vector3(X0 + 0.2 + k * 1.6, Math.min(y0 + Math.sin(k * 1.4 + i) * 0.2, junction(X0 + k * 1.6, z0) - 0.25), z0 + Math.cos(k * 1.1 + i) * 0.35));
    fibres.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 60, 0.07 + random() * 0.04, 6));
  }
  root.add(new THREE.Mesh(kit.geometry(mergeGeometries(fibres)!), kit.toon("#ffc2d4", { rim: 0.35, rimColor: "#ffe6ee", gloss: 0.25, shadow: "#b8487a" })));
  for (const g of fibres) g.dispose();
  const fibroblast = new THREE.Mesh(kit.blob(1, { detail: 3, noise: 0.1, seed: 9 }), kit.toon("#f7a1c4", { rim: 0.5, gloss: 0.3 }));
  fibroblast.scale.set(0.95, 0.17, 0.22);
  fibroblast.position.set(3.4, -4.45, 1.8);
  fibroblast.rotation.z = 0.15;
  const fibroNucleus = new THREE.Mesh(kit.geometry(new THREE.SphereGeometry(1, 16, 12)), kit.toon("#7b4dff", { rim: 0.3 }));
  fibroNucleus.scale.set(0.3, 0.1, 0.12);
  fibroNucleus.position.set(3.4, -4.43, 1.88);
  fibroNucleus.rotation.z = 0.15;
  root.add(fibroblast, fibroNucleus);

  /* -------------------------- capillary loop -------------------------- */
  const loopCurve = new THREE.CatmullRomCurve3(
    [
      [-0.8, BOTTOM + 0.01],
      [-0.75, -4.5],
      [-0.55, -3.7],
      [-0.25, LOOP_TOP - 0.02],
      [0.4, LOOP_TOP],
      [0.9, LOOP_TOP],
      [1.4, LOOP_TOP],
      [2.05, LOOP_TOP - 0.02],
      [2.35, -3.7],
      [2.55, -4.5],
      [2.6, BOTTOM + 0.01],
    ].map(([x, y]) => new THREE.Vector3(x, y, LOOP_Z)),
    false,
    "centripetal",
  );
  const wall = new THREE.Mesh(
    kit.geometry(new THREE.TubeGeometry(loopCurve, 160, LOOP_RADIUS, 16)),
    kit.toon("#ffd0dc", { opacity: 0.3, rim: 0.8, rimColor: "#ffffff", gloss: 0.4, depthWrite: false }),
  );
  wall.renderOrder = 3;
  root.add(wall);
  const bloodCount = 16;
  const blood = new THREE.InstancedMesh(
    kit.geometry(redCellGeometry(0.19, { segments: 24, steps: 12 })),
    kit.toon("#ff3d55", { rim: 0.45, rimColor: "#ffb0bb", gloss: 0.45, shadow: "#a0164a" }),
    bloodCount,
  );
  blood.frustumCulled = false;
  root.add(blood);
  const capillaryChild = children.find((child) => child.id === "capillary");
  const hidden = (p: THREE.Vector3) =>
    capillaryChild ? Math.abs(p.x - capillaryChild.at[0]) < 1.3 && Math.abs(p.y - capillaryChild.at[1]) < 0.35 : false;

  /* -------------------------- surroundings -------------------------- */
  const glow = kit.glow("#ff86c0", 30, { opacity: 0.25, env: true });
  glow.position.set(0, 0, -6);
  env.add(glow);
  const drifting = new THREE.InstancedMesh(squameGeometry, kit.toon("#ffd9e4", { rim: 0.5, env: true, soft: 0.4, opacity: 0.4 }), kit.count(8, 5));
  const drifters = Array.from({ length: drifting.count }, () => ({
    x: (random() - 0.5) * 22,
    y: 6 + random() * 7,
    z: -6 - random() * 8,
    spin: random() * 6,
    speed: 0.1 + random() * 0.15,
  }));
  drifting.frustumCulled = false;
  env.add(drifting);

  const tmpP = new THREE.Vector3();
  const tmpQ = new THREE.Quaternion();
  const tmpS = new THREE.Vector3();
  const tmpE = new THREE.Euler();
  const upright = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0));
  return {
    root,
    env,
    dispose: () => disposeInstances(root, env),
    update({ time }) {
      // Red blood cells along the loop, from the arterial to the venous limb.
      for (let k = 0; k < bloodCount; k++) {
        const u = (k / bloodCount + time * 0.035) % 1;
        loopCurve.getPointAt(u, tmpP);
        const visible = !hidden(tmpP);
        tmpQ.copy(upright).premultiply(new THREE.Quaternion().setFromEuler(tmpE.set(0.3 * Math.sin(time + k), 0.4 * Math.sin(time * 0.7 + k * 2), 0)));
        tmpS.setScalar(visible ? 1 : 0.0001);
        blood.setMatrixAt(k, m.compose(tmpP, tmpQ, tmpS));
      }
      blood.instanceMatrix.needsUpdate = true;
      // Squames lift at one edge, then float away and shrink.
      peelSpots.forEach((spot, k) => {
        const p = (time / 14 + spot.phase) % 1;
        const lift = THREE.MathUtils.smoothstep(p, 0, 0.3);
        const fly = THREE.MathUtils.smoothstep(p, 0.25, 1);
        tmpP.set(spot.x + fly * 1.6, spot.y + 0.02 + lift * 0.12 + fly * 3.2, spot.z + fly * 0.5);
        tmpQ.setFromEuler(tmpE.set(lift * 0.35 + fly * 0.8, spot.spin + fly * 1.5, lift * 0.25));
        tmpS.set(0.78, 0.045, 0.74).multiplyScalar(1 - THREE.MathUtils.smoothstep(p, 0.75, 1));
        peel.setMatrixAt(k, m.compose(tmpP, tmpQ, tmpS));
      });
      peel.instanceMatrix.needsUpdate = true;
      drifters.forEach((d, k) => {
        const y = d.y + ((time * d.speed) % 8);
        tmpP.set(d.x + Math.sin(time * 0.2 + k) * 0.5, y > 12.5 ? y - 8 : y, d.z);
        tmpQ.setFromEuler(tmpE.set(time * 0.2 + k, d.spin, time * 0.13));
        tmpS.set(0.45, 0.035, 0.42);
        drifting.setMatrixAt(k, m.compose(tmpP, tmpQ, tmpS));
      });
      drifting.instanceMatrix.needsUpdate = true;
    },
  };
};

export default epidermis;
