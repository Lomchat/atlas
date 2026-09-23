/**
 * A proton: no hard surface but a fuzzy glow (its charge thins out smoothly),
 * three valence quarks (two up, one down, coloured by flavour: quark "colour
 * charge" is not a real colour) tied together by wobbling gluon flux tubes,
 * and quark–antiquark pairs popping in and out of the gluon field. Seen from
 * the nucleus (immersion 0) it is the same red ball as its neighbours and
 * dissolves as the visitor dives in; the neighbouring nucleons stay around as
 * soft glows.
 *
 * Units: 10 = 1.68 fm (twice the rms charge radius). The quark child is
 * anchored on one up quark, which this scene does not draw and never moves.
 */
import * as THREE from "three";
import { rng } from "../../../engine/kit";
import type { SceneBuilder } from "../types";
import {
  Fader,
  direction,
  dissolvable,
  fizz,
  fluxTubes,
  gaussian,
  jiggle,
  nucleonColor,
  nucleonGeometry,
  nucleonOptions,
  packNucleus,
  quarkGlyph,
  quarkPairs,
  rgb,
  ringStack,
  smoothstep,
  unitsAcross,
  type NucleusLayout,
  type V3,
} from "./fx";

/** Charge-density contours of the proton (exponential profile), outermost first. */
const RINGS = [
  { radius: 6.9, color: "#43105a", alpha: 0.5 },
  { radius: 5.7, color: "#65165f", alpha: 0.5 },
  { radius: 4.3, color: "#8c1d63", alpha: 0.55 },
  { radius: 3.1, color: "#b32462", alpha: 0.55 },
  { radius: 2.0, color: "#d8325e", alpha: 0.55 },
];

const proton: SceneBuilder = ({ kit, params, children }) => {
  const Z = Number(params.Z ?? 6);
  const N = Number(params.N ?? 6);
  const layout = params.layout as NucleusLayout | undefined;
  const quarks = params.quarks as { up: V3; down: V3 };
  const child = children.find((c) => c.id.endsWith("-quark"));
  const anchor = new THREE.Vector3(...(child?.at ?? [0.4, 2.3, 1.5]));
  const baseUp = new THREE.Vector3(...quarks.up);
  const baseDown = new THREE.Vector3(...quarks.down);
  const random = rng(29 + Z);

  const root = new THREE.Group();
  const env = new THREE.Group();
  const v = new THREE.Vector3();

  /* ---------------- The ball seen from the nucleus ---------------- */
  const ballMaterial = dissolvable(kit, nucleonColor("proton"), {
    ...nucleonOptions("proton"),
    edge: "#ffd166",
    frequency: 0.42,
  });
  const ball = new THREE.Mesh(nucleonGeometry(kit), ballMaterial);
  ball.scale.setScalar(5);
  ball.renderOrder = 8;
  root.add(ball);

  /* ---------------- Inside ---------------- */
  const inside = new THREE.Group();
  root.add(inside);
  const fader = new Fader();

  // The fuzzy glow of the proton's charge, posterized like an illustration.
  const glow = ringStack(kit, RINGS, { feather: 0.75, order: 1 });
  for (const sprite of glow.sprites) fader.add(sprite.material);
  const bloom = kit.glow("#ff4f7a", 17, { opacity: 0.35 });
  bloom.renderOrder = 0;
  fader.add(bloom.material);
  inside.add(bloom, glow.group);

  // Fuzz at the edge: the charge thins out, it does not stop.
  {
    const positions: number[] = [];
    const colors: number[] = [];
    for (let i = 0; i < kit.count(420); i++) {
      direction(random, v).multiplyScalar(5.4 + gaussian(random) * 0.9);
      positions.push(v.x, v.y, v.z);
      colors.push(...rgb("#ff9f6b", "#ff6fb1", random()));
    }
    const fuzz = fizz(kit, positions, { colors, size: 0.13, soft: 0.6, rate: 0.5, flicker: 0.9, hop: 0.06, maxPx: 14, opacity: 0.6, depthTest: false, seed: 4 });
    fuzz.renderOrder = 2;
    fader.add(fuzz.material);
    inside.add(fuzz);
  }

  // The gluon field fills the whole proton: pink sparks, never still.
  {
    const positions: number[] = [];
    const colors: number[] = [];
    const sizes: number[] = [];
    for (let i = 0; i < kit.count(300); i++) {
      direction(random, v).multiplyScalar(4.6 * Math.cbrt(random()));
      positions.push(v.x, v.y, v.z);
      colors.push(...rgb("#ff7ad9", "#ffffff", random() * 0.5));
      sizes.push(0.5 + random());
    }
    const sparks = fizz(kit, positions, { colors, sizes, size: 0.12, soft: 0.5, rate: 1.1, flicker: 1, hop: 0.4, maxPx: 12, opacity: 0.8, depthTest: false, seed: 6 });
    sparks.renderOrder = 3;
    fader.add(sparks.material);
    inside.add(sparks);
  }

  // Sea quarks: pairs popping out of the gluon field and vanishing again.
  const pairs = quarkPairs(kit, { count: kit.count(16, 9), radius: 4.3, separation: 0.55, size: 0.36, rate: 0.5, seed: 8 });
  pairs.renderOrder = 4;
  (pairs.material as THREE.ShaderMaterial).depthTest = false;
  fader.add(pairs.material);
  inside.add(pairs);

  // Gluon flux tubes between the three valence quarks.
  const tubes = fluxTubes(kit, {
    arms: 3,
    strands: 3,
    radius: 0.08,
    bundle: 0.15,
    sheath: 0.6,
    fan: 0.28,
    fanLength: 0.7,
    wobble: 0.13,
    wave: 0.9,
    twist: 1.1,
    spin: 0.8,
    pulse: 2.4,
    color: "#ff6fd0",
    hot: "#fff3fc",
    sheathOpacity: 0.38,
  });
  tubes.mesh.renderOrder = 5;
  tubes.material.depthTest = false;
  fader.add(tubes.material);
  inside.add(tubes.mesh);

  // The two valence quarks drawn here (the anchored up quark is the child level).
  const up = quarkGlyph(kit, "up");
  const down = quarkGlyph(kit, "down");
  for (const glyph of [up, down]) {
    glyph.setSize(1);
    glyph.group.traverse((object) => {
      object.renderOrder = 6;
      const material = (object as THREE.Mesh).material as THREE.Material | undefined;
      if (material) material.depthTest = false;
    });
    inside.add(glyph.group);
  }

  /* ---------------- Surroundings: the neighbouring nucleons ---------------- */
  type Neighbour = { index: number; proton: boolean; base: THREE.Vector3 };
  const neighbours: Neighbour[] = [];
  const toLocal = layout ? 5 / layout.radius : 1;
  const nucleusAnchor = layout ? new THREE.Vector3(...layout.anchor) : new THREE.Vector3();
  if (layout) {
    const { positions, protons } = packNucleus(Z, N, layout);
    positions.forEach((p, index) => {
      if (index === 0) return;
      // Only nearby nucleons beside or behind this one (none between it and us).
      const local = p.clone().sub(nucleusAnchor).multiplyScalar(toLocal);
      if (local.length() < 17 && local.z < 1.5) neighbours.push({ index, proton: protons[index], base: p.clone() });
    });
  }
  const sphere = kit.geometry(new THREE.SphereGeometry(1, 32, 20));
  const neighbourSets = (["proton", "neutron"] as const).map((type) => {
    const list = neighbours.filter((n) => n.proton === (type === "proton"));
    const color = nucleonColor(type);
    const body = new THREE.InstancedMesh(sphere, kit.halo(color, { inner: 1, power: 3, opacity: 0.2, env: true }), Math.max(1, list.length));
    body.count = list.length;
    body.frustumCulled = false;
    body.renderOrder = -1;
    env.add(body);
    return { list, body };
  });

  /* ---------------- Animation ---------------- */
  const upNow = new THREE.Vector3();
  const downNow = new THREE.Vector3();
  const matrix = new THREE.Matrix4();
  const identity = new THREE.Quaternion();
  const scale = new THREE.Vector3(5, 5, 5);
  const offset = new THREE.Vector3();
  const drift = (base: THREE.Vector3, time: number, seed: number, out: THREE.Vector3) =>
    out
      .copy(base)
      .add(
        offset.set(
          Math.sin(time * 0.71 + seed) * 0.35,
          Math.sin(time * 0.93 + seed * 2) * 0.3,
          Math.sin(time * 0.57 + seed * 3) * 0.25,
        ),
      );

  return {
    root,
    env,
    update({ time, immersion }) {
      const dissolve = smoothstep(0.08, 0.62, immersion);
      const reveal = smoothstep(0.05, 0.6, immersion);
      ballMaterial.uniforms.uDissolve.value = dissolve;
      ball.visible = dissolve < 0.995;
      // Diving on into the quark, the proton's own glow and tubes step aside.
      const deep = smoothstep(2.2, 7, unitsAcross(root));
      inside.visible = reveal * deep > 0.003;
      fader.set(reveal * deep);
      up.fader.set(reveal * deep);
      down.fader.set(reveal * deep);
      glow.breathe(time, 0.03);

      drift(baseUp, time, 1.3, upNow);
      drift(baseDown, time, 4.1, downNow);
      up.group.position.copy(upNow);
      down.group.position.copy(downNow);
      up.pulse(time, 1);
      down.pulse(time, 2);
      tubes.setArm(0, anchor, upNow);
      tubes.setArm(1, upNow, downNow);
      tubes.setArm(2, downNow, anchor);

      // Neighbouring nucleons jiggle exactly as in the nucleus.
      for (const set of neighbourSets) {
        set.list.forEach((n, k) => {
          v.copy(n.base).add(jiggle(n.index, time, (layout?.radius ?? 1) * 0.055, offset)).sub(nucleusAnchor).multiplyScalar(toLocal);
          matrix.compose(v, identity, scale);
          set.body.setMatrixAt(k, matrix);
        });
        set.body.instanceMatrix.needsUpdate = true;
      }
    },
    dispose() {
      // Instance buffers are not freed by disposing geometry and materials.
      for (const set of neighbourSets) set.body.dispose();
    },
  };
};

export default proton;
