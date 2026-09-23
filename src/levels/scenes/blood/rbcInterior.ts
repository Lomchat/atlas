/**
 * Inside a red blood cell (1 unit = 20 nm), just under the membrane: a dense
 * crowd of hemoglobin molecules (6.4 nm; two α chains in pink, two β chains
 * in orange), jostling gently. Above them, the spectrin skeleton hangs under
 * the lipid bilayer; band 3 proteins cross it, and sugar chains stick out
 * into the plasma. The `hemoglobin` level is anchored on one molecule of the
 * front layer: it is left out here and never moves.
 */
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Kit } from "../../../engine/kit";
import { rng } from "../../../engine/kit";
import type { SceneBuilder } from "../types";
import { patchToon } from "../body/skinShaders";
import { type SphereSpec, sphereCloud } from "./rbcInteriorSpheres";
import { beadsMaterial } from "./redCellShape";

const ALPHA = new THREE.Color("#ff6f91");
const BETA = new THREE.Color("#ff9f6b");
/** Lobe layout of one hemoglobin (as in the hemoglobin level), in units of 20 nm. */
const LOBES: [THREE.Vector3, THREE.Color][] = [
  [new THREE.Vector3(-0.07, 0.064, 0.024), ALPHA],
  [new THREE.Vector3(0.067, 0.054, -0.022), BETA],
  [new THREE.Vector3(0.069, -0.059, 0.026), ALPHA],
  [new THREE.Vector3(-0.069, -0.054, -0.022), BETA],
];
const LOBE_R = 0.09;
const SPACING = 0.41;
/** Lipid bilayer (inner and outer surfaces) and the extent of the scene. */
const MEMBRANE_IN = 3.45;
const MEMBRANE_OUT = 3.72;
const HALF = 5;
const WIDE = 11;
const FRONT = 0.5;
const BACK = -1.7;
/** Top of the crowd: the spectrin net lies between it and the membrane. */
const CROWD_TOP = 2.55;

/** Bilayer: head groups on both faces, pale tails inside (shown on the cut front). */
function bilayerMaterial(kit: Kit, env: boolean) {
  return patchToon(kit.toon("#ffffff", { rim: 0.3, gloss: 0.2, soft: 0.35, env, flat: 0.8 }) as THREE.ShaderMaterial, {
    vertexDecl: "varying vec3 vMem;\nvarying vec3 vMemN;",
    vertexMain: "vMem = position; vMemN = normal;",
    fragmentDecl: "varying vec3 vMem;\nvarying vec3 vMemN;",
    fragmentNormal: `
  float t = (vMem.y - ${MEMBRANE_IN.toFixed(3)}) / ${(MEMBRANE_OUT - MEMBRANE_IN).toFixed(3)};
  vec3 heads = vec3(1.0, 0.8, 0.55);
  vec3 tails = vec3(1.0, 0.94, 0.86);
  float head = smoothstep(0.3, 0.2, t) + smoothstep(0.7, 0.8, t);
  // Individual heads along the cut and on the surfaces.
  vec2 hp = abs(vMemN.y) > 0.5 ? vMem.xz * 22.0 : vec2(vMem.x * 22.0, t * 3.0);
  float dots = 1.0 - smoothstep(0.28, 0.42, length(fract(hp) - 0.5));
  vec3 c = mix(tails, heads, clamp(head, 0.0, 1.0));
  c = mix(c, c * 0.88, dots * 0.5);
  // Seen from outside (the red cell level), the membrane keeps the cell's colour.
  c = mix(c, vec3(1.0, 0.3, 0.38), step(0.5, vMemN.y));
  base = c;`
  });
}

const rbcInterior: SceneBuilder = ({ kit, children }) => {
  const root = new THREE.Group();
  const env = new THREE.Group();
  const random = rng(17);
  const hb = children.find((child) => child.id === "hemoglobin");
  const hole = hb ? new THREE.Vector3(...hb.at) : new THREE.Vector3(0.3, -0.8, 0.5);

  /* ------------------------ hemoglobin crowd ------------------------ */
  const near: SphereSpec[] = [];
  const far: SphereSpec[] = [];
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  for (let z = FRONT; z >= BACK; z -= SPACING * 0.92) {
    const shiftX = random() * SPACING;
    const shiftY = random() * SPACING;
    for (let y = -11 + shiftY; y < CROWD_TOP; y += SPACING)
      for (let x = -WIDE - 5 + shiftX; x < WIDE + 5; x += SPACING) {
        const p = new THREE.Vector3(
          x + (random() - 0.5) * 0.18 + (Math.round(y / SPACING) % 2) * SPACING * 0.5,
          y + (random() - 0.5) * 0.16,
          z + (random() - 0.5) * 0.14,
        );
        if (p.distanceTo(hole) < 0.36) continue;
        // Thin the crowd in the far background (it only shows through the gaps).
        if (z < BACK + 0.7 && random() < 0.35) continue;
        // Only the front layers far from the centre (they are rarely seen).
        if ((Math.abs(p.x) > WIDE + 1 || p.y < -9) && z < FRONT - 0.8) continue;
        q.setFromEuler(e.set(random() * 6.3, random() * 6.3, random() * 6.3));
        const phase = random();
        const target = Math.abs(p.x) < HALF && Math.abs(p.y) < HALF ? near : far;
        // The crowd thins out softly at its outer edges.
        const edge = (1 - THREE.MathUtils.smoothstep(Math.abs(p.x), WIDE + 1, WIDE + 5)) * THREE.MathUtils.smoothstep(p.y, -11, -8.5);
        if (edge < 0.25) continue;
        for (const [offset, color] of LOBES)
          target.push({ p: offset.clone().applyQuaternion(q).add(p), r: LOBE_R * (0.95 + random() * 0.1) * edge, color, phase });
      }
  }
  root.add(sphereCloud(kit, near, { jiggle: 0.025, cue: [BACK, FRONT] }));
  env.add(sphereCloud(kit, far, { jiggle: 0.025, env: true, cue: [BACK, FRONT] }));
  // Deep crowd backdrop behind the modelled layers.
  const backdropGeometry = new THREE.PlaneGeometry(80, 40);
  backdropGeometry.translate(0, CROWD_TOP - 20, BACK - 0.3);
  const backdrop = new THREE.Mesh(kit.geometry(backdropGeometry), beadsMaterial(kit, { perUnit: 2.9, fromPosition: true, dim: 0.62, env: true, flat: 0.6 }));
  env.add(backdrop);

  /* ---------------------------- membrane ---------------------------- */
  const membraneGeometry = (from: number, to: number, front: number, back: number) => {
    const g = new THREE.BoxGeometry(to - from, MEMBRANE_OUT - MEMBRANE_IN, front - back, 60, 2, 30);
    g.translate((from + to) / 2, (MEMBRANE_IN + MEMBRANE_OUT) / 2, (front + back) / 2);
    return kit.geometry(g);
  };
  const MEMBRANE_FRONT = FRONT + 0.2;
  const MEMBRANE_BACK = -10;
  root.add(new THREE.Mesh(membraneGeometry(-HALF, HALF, MEMBRANE_FRONT, BACK), bilayerMaterial(kit, false)));
  const envMembrane = bilayerMaterial(kit, true);
  env.add(new THREE.Mesh(membraneGeometry(-HALF, HALF, BACK, MEMBRANE_BACK), envMembrane));
  env.add(new THREE.Mesh(membraneGeometry(-WIDE - 6, -HALF, MEMBRANE_FRONT, MEMBRANE_BACK), envMembrane));
  env.add(new THREE.Mesh(membraneGeometry(HALF, WIDE + 6, MEMBRANE_FRONT, MEMBRANE_BACK), envMembrane));

  // Band 3 proteins crossing the bilayer, glycophorins with sugar chains above.
  const proteins: SphereSpec[] = [];
  const beadColors = ["#7fe3c8", "#b6f08a", "#ffe07a"].map((c) => new THREE.Color(c));
  for (let i = 0; i < 70; i++) {
    const x = -WIDE - 4 + random() * (2 * WIDE + 8);
    const z = FRONT - 0.2 - random() * 9;
    const cx = x + random() * 0.5;
    // Band 3 dimer: a cluster of lobes through the membrane.
    for (let k = 0; k < 7; k++)
      proteins.push({
        p: new THREE.Vector3(cx + (random() - 0.5) * 0.45, (MEMBRANE_IN + MEMBRANE_OUT) / 2 + (random() - 0.5) * 0.5, z + (random() - 0.5) * 0.35),
        r: 0.13 + random() * 0.05,
        color: new THREE.Color("#9d86ff"),
        phase: 0.2,
      });
    // A sugar chain (glycocalyx) branching into the plasma.
    let p = new THREE.Vector3(cx + 0.8, MEMBRANE_OUT, z + 0.2);
    for (let k = 0; k < 6; k++) {
      proteins.push({ p: p.clone(), r: 0.055, color: beadColors[k % 3], phase: 0.5 });
      p = p.clone().add(new THREE.Vector3((random() - 0.5) * 0.18, 0.11, (random() - 0.5) * 0.1));
      if (k === 3)
        for (let j = 1; j <= 3; j++)
          proteins.push({ p: p.clone().add(new THREE.Vector3(0.09 * j, 0.06 * j, 0)), r: 0.05, color: beadColors[(k + j) % 3], phase: 0.5 });
    }
  }
  root.add(sphereCloud(kit, proteins.filter((s) => Math.abs(s.p.x) < HALF), { rim: 0.5 }));
  env.add(sphereCloud(kit, proteins.filter((s) => Math.abs(s.p.x) >= HALF), { rim: 0.5, env: true }));

  // Spectrin skeleton: a net of two-stranded ropes joined at junctional complexes, under the membrane.
  const strands: THREE.BufferGeometry[] = [];
  const junctions: SphereSpec[] = [];
  const mesh = 3.6;
  const nodes = new Map<string, THREE.Vector3>();
  const node = (i: number, j: number) => {
    const key = `${i},${j}`;
    let n = nodes.get(key);
    if (!n) {
      const r = rng(i * 131 + j * 17 + 999);
      n = new THREE.Vector3(i * mesh + (j % 2) * mesh * 0.5 + (r() - 0.5) * 0.9, MEMBRANE_IN - 0.22 - r() * 0.1, FRONT - 0.1 - j * mesh * 0.87 + (r() - 0.5) * 0.6);
      nodes.set(key, n);
    }
    return n;
  };
  const rope = (a: THREE.Vector3, b: THREE.Vector3, seed: number) => {
    const points: THREE.Vector3[] = [];
    for (let k = 0; k <= 16; k++) {
      const t = k / 16;
      const sag = Math.sin(t * Math.PI) * 0.4;
      points.push(a.clone().lerp(b, t).add(new THREE.Vector3(Math.sin(t * 9 + seed) * 0.18, -sag, Math.cos(t * 7 + seed) * 0.18)));
    }
    strands.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 64, 0.04, 5));
    const twin = points.map((p, k) => p.clone().add(new THREE.Vector3(0.06 * Math.sin(k * 2.2), 0.06 * Math.cos(k * 2.2), 0)));
    strands.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(twin), 64, 0.035, 5));
  };
  for (let j = 0; j < 3; j++)
    for (let i = -5; i <= 5; i++) {
      const a = node(i, j);
      rope(a, node(i + 1, j), i * 3 + j);
      rope(a, node(i + (j % 2), j + 1), i * 5 + j);
      rope(a, node(i + (j % 2) - 1, j + 1), i * 7 + j);
      for (let k = 0; k < 4; k++)
        junctions.push({ p: a.clone().add(new THREE.Vector3((k - 1.5) * 0.09, (k % 2) * 0.06, 0)), r: 0.08, color: new THREE.Color("#3fc8ff"), phase: 0 });
    }
  env.add(new THREE.Mesh(kit.geometry(mergeGeometries(strands)!), kit.toon("#6fe0ff", { rim: 0.5, rimColor: "#e0faff", gloss: 0.35, env: true })));
  env.add(sphereCloud(kit, junctions, { env: true, rim: 0.5 }));
  for (const g of strands) g.dispose();

  /* ----------------------- plasma above the cell ----------------------- */
  const glow = kit.glow("#ff8fb0", 30, { opacity: 0.2, env: true });
  glow.position.set(0, 6, -6);
  env.add(glow);
  const plasma: number[] = [];
  for (let i = 0; i < kit.count(80); i++) plasma.push((random() - 0.5) * 30, MEMBRANE_OUT + 0.8 + random() * 8, -1 - random() * 6);
  env.add(kit.points(plasma, { size: 0.12, color: "#ffd6e2", opacity: 0.6, soft: 1, twinkle: 0.5, env: true }));

  return {
    root,
    env,
    update() {
      // The crowd jostles on the GPU (see sphereCloud's jiggle).
    },
  };
};

export default rbcInterior;
