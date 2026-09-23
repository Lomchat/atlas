/**
 * A nucleus: Z protons (red) and N neutrons (blue), packed as tightly as in a
 * real nucleus (radius ≈ 1.2 fm · A^⅓, nucleons of radius 0.84 fm), gently
 * jiggling. The strong force shows as soft pink glows where nucleons touch and
 * as little sparks hopping between neighbours (the pions they exchange).
 *
 * Units: 10 = 2 × rms charge radius. The proton child is anchored on a
 * camera-facing surface proton, which this scene does not draw and never moves.
 */
import * as THREE from "three";
import { rng } from "../../../engine/kit";
import type { SceneBuilder } from "../types";
import {
  Fader,
  direction,
  fizz,
  jiggle,
  nucleonColor,
  nucleonGeometry,
  nucleonOptions,
  packNucleus,
  radialLines,
  smoothstep,
  spark,
  unitsAcross,
  type NucleusLayout,
} from "./fx";

const nucleus: SceneBuilder = ({ kit, params, children }) => {
  const Z = Number(params.Z ?? 6);
  const N = Number(params.N ?? 6);
  const given = params.layout as NucleusLayout;
  const child = children.find((c) => c.id.endsWith("-proton"));
  const layout: NucleusLayout = {
    ...given,
    anchor: child ? [...child.at] : given.anchor,
    radius: child?.radius ?? given.radius,
  };
  const r = layout.radius;
  const outer = layout.extent + r;
  const { positions: base, protons } = packNucleus(Z, N, layout);
  const count = base.length;
  const random = rng(Z * 17 + N);

  const root = new THREE.Group();
  const env = new THREE.Group();

  /* ---------------- Glow behind and around the cluster ---------------- */
  const backGlow = kit.glow("#ff3f8f", outer * 4, { opacity: 0.45 });
  backGlow.renderOrder = -2;
  const warm = kit.glow("#ff9a5c", outer * 2.3, { opacity: 0.35 });
  warm.renderOrder = -1;
  root.add(backGlow, warm);

  /* ---------------- Nucleons (two instanced meshes) ---------------- */
  const geometry = nucleonGeometry(kit);
  const make = (type: "proton" | "neutron", indices: number[]) => {
    const mesh = new THREE.InstancedMesh(geometry, kit.toon(nucleonColor(type), nucleonOptions(type)), Math.max(1, indices.length));
    mesh.count = indices.length;
    mesh.frustumCulled = false;
    root.add(mesh);
    return { mesh, indices };
  };
  // Index 0 is the anchored proton: drawn by the proton level itself.
  const protonSet = make("proton", base.map((_, i) => i).filter((i) => i !== 0 && protons[i]));
  const neutronSet = make("neutron", base.map((_, i) => i).filter((i) => !protons[i]));

  /* ---------------- The strong force ---------------- */
  // Contacts between neighbours: soft pink glows in the crevices.
  const pairs: [number, number][] = [];
  for (let i = 0; i < count; i++)
    for (let j = i + 1; j < count; j++) if (base[i].distanceTo(base[j]) < 2 * r * 1.16) pairs.push([i, j]);
  const contacts = fizz(kit, new Float32Array(pairs.length * 3), {
    color: "#ff4fc0",
    size: r * 0.9,
    soft: 1,
    rate: 0.9,
    flicker: 0.7,
    maxPx: 80,
    opacity: 0.7,
    seed: 11,
  });
  const contactPositions = contacts.geometry.attributes.position.array as Float32Array;
  contacts.renderOrder = 2;
  root.add(contacts);

  // Pions hopping between surface neighbours, as little comets.
  const surfacePairs = pairs.filter(([i, j]) => base[i].z + base[j].z > 0 && i !== 0 && j !== 0);
  const hops = Math.min(kit.count(14, 8), surfacePairs.length);
  const trail = 4;
  const hopColors: number[] = [];
  const hopSizes: number[] = [];
  for (let h = 0; h < hops; h++)
    for (let k = 0; k < trail; k++) {
      const fade = 1 - k / trail;
      hopColors.push(1 * fade, 0.85 * fade, 0.95 * fade);
      hopSizes.push(1 - k * 0.18);
    }
  const pions = fizz(kit, new Float32Array(hops * trail * 3), {
    colors: hopColors,
    sizes: hopSizes,
    size: r * 0.32,
    soft: 0.8,
    core: 0.6,
    maxPx: 26,
    opacity: 1,
    seed: 12,
  });
  pions.renderOrder = 3;
  root.add(pions);
  const hopPositions = pions.geometry.attributes.position.array as Float32Array;

  /* ---------------- Surroundings ---------------- */
  const field = radialLines(kit, { count: 40, inner: outer + 0.6, outer: 20, fall: 6, color: "#c49bff", opacity: 0.55, env: true, seed: Z + 1 });
  env.add(field);
  {
    const haze: number[] = [];
    const v = new THREE.Vector3();
    for (let i = 0; i < kit.count(160); i++) {
      direction(random, v).multiplyScalar(outer + 1 + random() * 12);
      haze.push(v.x, v.y, v.z);
    }
    env.add(fizz(kit, haze, { color: "#b9a6ff", size: 0.12, soft: 0.6, rate: 0.3, flicker: 0.95, hop: 0.4, maxPx: 12, opacity: 0.45, env: true, seed: 9 }));
  }

  // Seen from far away (the "almost nothing" level), the nucleus is a spark.
  const beacon = spark(kit, "#ffd0e6", { size: outer * 1.4, minPx: 3, maxPx: 16, soft: 0.8, core: 0.6 });
  beacon.material.depthTest = false;
  beacon.renderOrder = 5;
  root.add(beacon);
  const beaconFader = new Fader();
  beaconFader.add(beacon.material);

  /* ---------------- Animation ---------------- */
  const current = base.map((p) => p.clone());
  const offset = new THREE.Vector3();
  const matrix = new THREE.Matrix4();
  const scale = new THREE.Vector3(r, r, r);
  const identity = new THREE.Quaternion();
  const mid = new THREE.Vector3();
  const lift = new THREE.Vector3();

  return {
    root,
    env,
    update({ time }) {
      for (let i = 1; i < count; i++) current[i].copy(base[i]).add(jiggle(i, time, r * 0.055, offset));
      for (const set of [protonSet, neutronSet]) {
        set.indices.forEach((i, k) => set.mesh.setMatrixAt(k, matrix.compose(current[i], identity, scale)));
        set.mesh.instanceMatrix.needsUpdate = true;
      }
      pairs.forEach(([i, j], k) => {
        mid.addVectors(current[i], current[j]).multiplyScalar(0.5);
        // Sit in the crevice on the outside, where it can be seen.
        mid.addScaledVector(lift.copy(mid).normalize(), r * 0.62);
        contactPositions[k * 3] = mid.x;
        contactPositions[k * 3 + 1] = mid.y;
        contactPositions[k * 3 + 2] = mid.z;
      });
      contacts.geometry.attributes.position.needsUpdate = true;
      // Each pion hops from one nucleon to a neighbour, then another pair.
      for (let h = 0; h < hops; h++) {
        const period = 1.3 + (h % 5) * 0.23;
        const phase = time / period + h * 0.37;
        const cycle = Math.floor(phase);
        const t = phase - cycle;
        const [a, b] = surfacePairs[(cycle * 7 + h * 13) % surfacePairs.length];
        const forward = (cycle + h) % 2 === 0;
        const from = forward ? current[a] : current[b];
        const to = forward ? current[b] : current[a];
        mid.addVectors(from, to).normalize();
        for (let k = 0; k < trail; k++) {
          const s = Math.max(0, Math.min(1, t * 1.25 - k * 0.07));
          lift.copy(from).lerp(to, s).addScaledVector(mid, r * (1.02 + 0.45 * Math.sin(Math.PI * s)));
          const o = (h * trail + k) * 3;
          const visible = t < 0.85 ? 1 : 0;
          hopPositions[o] = lift.x;
          hopPositions[o + 1] = lift.y;
          hopPositions[o + 2] = visible ? lift.z : -1e4;
        }
      }
      pions.geometry.attributes.position.needsUpdate = true;
      backGlow.material.opacity = 0.32 * (1 + 0.1 * Math.sin(time * 1.3));
      // Hand the "almost nothing" marker over to the real nucleus as it grows.
      // (fraction of the view covered by the nucleus: ~0.03 is a few dozen pixels).
      beaconFader.set(1 - smoothstep(0.02, 0.07, (outer * 2) / Math.max(unitsAcross(root), 1e-6)));
    },
    dispose() {
      // Instance buffers are not freed by disposing geometry and materials.
      protonSet.mesh.dispose();
      neutronSet.mesh.dispose();
    },
  };
};

export default nucleus;
