/**
 * An atom: a probability cloud of electrons around a nucleus far too small to
 * see (drawn as a spark). The cloud is painted as a flat, posterized glow
 * whose rings are real probability contours: each disc is the sphere that
 * encloses a given share of the electrons (Slater-type shells with
 * Clementi–Raimondi effective charges). Heavy atoms therefore show a small,
 * bright core of inner electrons inside a faint halo. Blinking, hopping dots
 * add the quantum fizz: every blink is one more place an electron could be.
 *
 * Seen from the parent molecule (immersion 0) the atom is a plain ball of its
 * element colour; it dissolves into the cloud as the visitor dives in.
 *
 * Units: 10 = van der Waals diameter. The "almost nothing" child sits at the
 * centre, on the nucleus spark.
 */
import * as THREE from "three";
import { PALETTE, rng } from "../../../engine/kit";
import { ELEMENT_COLORS } from "../common/molecules";
import type { SceneBuilder } from "../types";
import {
  BOHR,
  Fader,
  VDW,
  direction,
  dissolvable,
  enclosingRadii,
  fizz,
  gamma,
  gaussian,
  rgb,
  ringStack,
  shellCharges,
  shellRadius,
  smoothstep,
  spark,
  unitsAcross,
} from "./fx";

/**
 * Ball radius seen from the molecule, as a fraction of the van der Waals
 * radius, matching each parent's ball-and-stick atom: water draws O at 0.42 ×
 * vdW; DNA C ≈ 0.68 Å, chlorophyll Mg ≈ 0.66 Å and heme Fe ≈ 0.54 Å.
 */
const BALL: Record<string, number> = { O: 0.42, C: 0.4, Mg: 0.38, Fe: 0.27 };

/** Probability contours of the cloud, from the outermost ring inwards. */
const FRACTIONS = [0.995, 0.97, 0.9, 0.75, 0.55, 0.35, 0.18, 0.07];
const CLOUD_COLORS = ["#2f2aa0", "#3434cf", "#3a58f6", "#3a8eff", "#40c6ff", "#6ef0ff", "#b8fff0", "#ffc65a"];
const CLOUD_ALPHAS = [0.5, 0.5, 0.55, 0.6, 0.66, 0.74, 0.82, 0.92];
const HYDROGEN_COLORS = ["#3a3593", "#5a55c8", "#8c86ec", "#bdb8ff", "#e6e3ff"];

interface Neighbor {
  symbol: string;
  at: [number, number, number];
}

const atom: SceneBuilder = ({ kit, level, params }) => {
  const symbol = String(params.symbol ?? "C");
  const Z = Number(params.Z ?? 6);
  const shells = (params.shells as number[] | undefined) ?? [2, 4];
  const neighbors = (params.neighbors as Neighbor[] | undefined) ?? [];
  /** Local units per Bohr radius. */
  const perBohr = BOHR / (level.size / 10);
  const charges = shellCharges(symbol, Z, shells);
  const random = rng(Z * 97 + 13);
  const color = ELEMENT_COLORS[symbol] ?? "#9aa0ff";
  const last = shells.length - 1;

  const root = new THREE.Group();
  const env = new THREE.Group();
  const sphere = kit.geometry(new THREE.SphereGeometry(1, 48, 32));

  /* ---------------- The ball seen from the molecule ---------------- */
  const ballMaterial = dissolvable(kit, color, {
    rim: 0.4,
    gloss: 0.35,
    edge: PALETTE.electron,
    frequency: 1.05,
  });
  const ballRadius = 5 * (BALL[symbol] ?? 0.42);
  const ball = new THREE.Mesh(sphere, ballMaterial);
  ball.scale.setScalar(ballRadius);
  ball.renderOrder = 5;
  root.add(ball);

  /* ---------------- The electron cloud ---------------- */
  const cloud = new THREE.Group();
  root.add(cloud);
  const fader = new Fader();

  // Probability contours, capped so the faint outer halo stays in view.
  const radii = enclosingRadii(shells, charges, perBohr, FRACTIONS, Z).map((r, k) =>
    Math.min(r, 6.4 - k * 0.35),
  );
  for (let k = 1; k < radii.length; k++) radii[k] = Math.min(radii[k], radii[k - 1] - 0.12);
  const contours = ringStack(
    kit,
    radii.map((radius, k) => ({ radius: Math.max(0.06, radius), color: CLOUD_COLORS[k], alpha: CLOUD_ALPHAS[k] })),
    // Inner rings are drawn over the valence dots so the core stays readable.
    { feather: 0.7, order: (k) => (k < 5 ? 2 : 3.5) + k * 0.01 },
  );
  for (const sprite of contours.sprites) fader.add(sprite.material);
  cloud.add(contours.group);
  // Light spilling beyond the last ring (no hard edge) and a luminous heart.
  const bloom = kit.glow("#4146ff", radii[0] * 2.5, { opacity: 0.4 });
  bloom.renderOrder = 1;
  fader.add(bloom.material);
  const heartSize = Math.max(1.2, radii[5] * 2.6);
  const heart = kit.glow("#7ff6ff", heartSize, { opacity: 0.12 });
  heart.renderOrder = 3;
  fader.add(heart.material);
  cloud.add(bloom, heart);

  // The fizz: dots sampled shell by shell, blinking and hopping around.
  const total = kit.count(1300);
  const counts = shells.map((count, k) => (k === last ? total * 0.85 : Math.min(total * 0.1, 16 + 30 * count)));
  const outerDots = { positions: [] as number[], colors: [] as number[], sizes: [] as number[] };
  const innerDots = { positions: [] as number[], colors: [] as number[], sizes: [] as number[] };
  const v = new THREE.Vector3();
  const white = new THREE.Color("#ffffff");
  const cyan = new THREE.Color(PALETTE.electron);
  const lilac = new THREE.Color("#b7a8ff");
  const gold = new THREE.Color("#ffd27a");
  const c = new THREE.Color();
  shells.forEach((_, k) => {
    const valence = k === last;
    const target = valence ? outerDots : innerDots;
    for (let i = 0; i < Math.round(counts[k]); i++) {
      let r = shellRadius(random, k + 1, charges[k]) * perBohr;
      for (let tries = 0; r > 6.2 && tries < 8; tries++) r = shellRadius(random, k + 1, charges[k]) * perBohr;
      if (r > 6.2) r = 6.2 * random();
      direction(random, v).multiplyScalar(r);
      target.positions.push(v.x, v.y, v.z);
      if (valence) c.copy(white).lerp(cyan, 0.35 + random() * 0.4).lerp(lilac, smoothstep(2.5, 5.5, r) * 0.9);
      else c.copy(gold).lerp(white, random() * 0.4);
      target.colors.push(c.r, c.g, c.b);
      target.sizes.push(valence ? 0.5 + random() * 0.9 : 0.35 + random() * 0.35);
    }
  });
  const dotOptions = { size: 0.12, soft: 0.4, rate: 0.6, flicker: 0.9, hop: 0.25, maxPx: 16, opacity: 0.75, depthTest: false };
  const dots = fizz(kit, outerDots.positions, { ...dotOptions, colors: outerDots.colors, sizes: outerDots.sizes, seed: Z });
  dots.renderOrder = 3;
  fader.add(dots.material);
  cloud.add(dots);
  if (innerDots.positions.length) {
    const core = fizz(kit, innerDots.positions, { ...dotOptions, rate: 0.8, colors: innerDots.colors, sizes: innerDots.sizes, seed: Z + 1 });
    core.renderOrder = 4;
    fader.add(core.material);
    cloud.add(core);
  }

  // The nucleus: a spark with a small star flare, since at true scale it
  // would be invisible (tens of thousands of times smaller than the atom).
  const nucleus = new THREE.Group();
  const nucleusGlow = spark(kit, "#ff3d8e", { size: 0.7, maxPx: 30, soft: 1, opacity: 0.85 });
  const nucleusCore = spark(kit, "#ffe6f2", { size: 0.3, minPx: 4, maxPx: 6, soft: 0.15, core: 0.6 });
  const flares = [0, Math.PI / 2].map((angle) => {
    const flare = kit.glow("#ff9ccc", 1, { opacity: 0.85 });
    flare.material.rotation = angle;
    flare.material.depthTest = false;
    flare.renderOrder = 4.8;
    return flare;
  });
  // Drawn before the ball (order 5), so the ball hides it until it dissolves.
  for (const point of [nucleusGlow, nucleusCore]) {
    point.material.depthTest = false;
    point.renderOrder = 4.8;
  }
  nucleus.add(nucleusGlow, ...flares, nucleusCore);
  root.add(nucleus);
  const sparkFader = new Fader();
  sparkFader.add(nucleusGlow.material);
  sparkFader.add(nucleusCore.material);
  for (const flare of flares) sparkFader.add(flare.material);

  /* ---------------- Surroundings ---------------- */
  const envFader = new Fader();
  // The cloud has no edge: a few far dots show its thinning tail.
  {
    const far: number[] = [];
    const farColors: number[] = [];
    const count = kit.count(260);
    for (let i = 0; i < count; i++) {
      direction(random, v).multiplyScalar(5.2 + gamma(random, 1.6) * 2.4);
      far.push(v.x, v.y, v.z);
      farColors.push(...rgb(PALETTE.electron, "#8c7bff", random()));
    }
    env.add(fizz(kit, far, { colors: farColors, size: 0.11, soft: 0.6, rate: 0.4, hop: 0.3, flicker: 0.9, opacity: 0.5, env: true, seed: 5 }));
  }

  // Bonded neighbours: partial clouds, their own nuclei, and the shared
  // electrons (all neighbours share one draw call per kind of dots).
  const selfVdw = VDW[symbol] ?? 1.7;
  const partialStacks: ReturnType<typeof ringStack>[] = [];
  const shared = { cloud: [] as number[], cloudColors: [] as number[], bond: [] as number[], nuclei: [] as number[] };
  neighbors.forEach((neighbor, k) => {
    const at = new THREE.Vector3(...neighbor.at);
    const reach = ((VDW[neighbor.symbol] ?? 1.6) / selfVdw) * 5;
    const hydrogen = neighbor.symbol === "H";
    const nShells = hydrogen ? [1] : [2, 4];
    const nCharges = hydrogen ? [1.2] : [5.67, 3.18];
    const nRadii = enclosingRadii(nShells, nCharges, perBohr, [0.95, 0.6, 0.2], 7 + k).map((r) => Math.min(r, reach * 0.95));
    for (let j = 1; j < nRadii.length; j++) nRadii[j] = Math.min(nRadii[j], nRadii[j - 1] - 0.15);
    const tint = new THREE.Color(ELEMENT_COLORS[neighbor.symbol] ?? "#d0d0ff");
    const ramp = HYDROGEN_COLORS.map((h) => new THREE.Color(h).lerp(tint, hydrogen ? 0 : 0.5));
    const partial = ringStack(
      kit,
      nRadii.map((radius, j) => ({ radius: Math.max(0.05, radius), color: ramp[j * 2], alpha: [0.24, 0.32, 0.45][j] })),
      { feather: 0.7, order: 1 },
    );
    partial.group.position.copy(at);
    for (const sprite of partial.sprites) envFader.add(sprite.material);
    partialStacks.push(partial);
    env.add(partial.group);
    const dotColor = tint.clone().lerp(new THREE.Color("#ffffff"), hydrogen ? 0.2 : 0.55);
    for (let i = 0; i < kit.count(hydrogen ? 110 : 170); i++) {
      const r = Math.min(reach, shellRadius(random, hydrogen ? 1 : 2, hydrogen ? 1.2 : 3.2) * perBohr);
      direction(random, v).multiplyScalar(r).add(at);
      shared.cloud.push(v.x, v.y, v.z);
      shared.cloudColors.push(dotColor.r, dotColor.g, dotColor.b);
    }
    // The shared pair, pulled towards this atom.
    const axis = at.clone().normalize();
    const side = new THREE.Vector3(0, 0, 1).cross(axis);
    if (side.lengthSq() < 1e-4) side.set(1, 0, 0);
    side.normalize();
    const up = axis.clone().cross(side);
    for (let i = 0; i < kit.count(140); i++) {
      const t = Math.min(0.9, Math.max(0.08, 0.42 + gaussian(random) * 0.18));
      const spread = 0.3 + 0.45 * Math.sin(Math.PI * t);
      v.set(0, 0, 0)
        .lerp(at, t)
        .addScaledVector(side, gaussian(random) * spread)
        .addScaledVector(up, gaussian(random) * spread);
      shared.bond.push(v.x, v.y, v.z);
    }
    shared.nuclei.push(at.x, at.y, at.z);
  });
  if (neighbors.length) {
    const dotOptions = { size: 0.12, soft: 0.45, maxPx: 16, env: true, depthTest: false };
    const cloudDots = fizz(kit, shared.cloud, { ...dotOptions, colors: shared.cloudColors, rate: 0.55, flicker: 0.9, opacity: 0.55, seed: 40 });
    const bondDots = fizz(kit, shared.bond, { ...dotOptions, color: "#d8feff", rate: 0.75, flicker: 0.85, opacity: 0.8, seed: 60 });
    const nuclei = fizz(kit, shared.nuclei, { color: "#ffe0f0", size: 0.3, minPx: 3, maxPx: 5, soft: 0.3, core: 1, env: true, depthTest: false });
    cloudDots.renderOrder = 3;
    bondDots.renderOrder = 3;
    nuclei.renderOrder = 6;
    env.add(cloudDots, bondDots, nuclei);
  }

  // Two lone pairs on the far side when oxygen holds two partners (water).
  if (symbol === "O" && neighbors.length === 2) {
    const a = new THREE.Vector3(...neighbors[0].at);
    const b = new THREE.Vector3(...neighbors[1].at);
    const bisector = a.clone().add(b).normalize().negate();
    const normal = a.clone().cross(b).normalize();
    const lobes: number[] = [];
    const count = kit.count(200);
    for (const sign of [-1, 1]) {
      const dir = bisector.clone().multiplyScalar(Math.cos(0.96)).addScaledVector(normal, sign * Math.sin(0.96));
      for (let i = 0; i < count; i++) {
        const along = 1.4 + Math.abs(gaussian(random)) * 1.1;
        v.copy(dir)
          .multiplyScalar(along)
          .add(new THREE.Vector3(gaussian(random), gaussian(random), gaussian(random)).multiplyScalar(0.5));
        lobes.push(v.x, v.y, v.z);
      }
    }
    const lobeDots = fizz(kit, lobes, {
      color: "#b6f7ff",
      size: 0.12,
      soft: 0.5,
      rate: 0.6,
      flicker: 0.85,
      maxPx: 16,
      opacity: 0.7,
      env: true,
      depthTest: false,
      seed: 90,
    });
    lobeDots.renderOrder = 3;
    env.add(lobeDots);
  }

  return {
    root,
    env,
    update({ time, immersion }) {
      // Ball → cloud.
      const dissolve = smoothstep(0.05, 0.6, immersion);
      const reveal = smoothstep(0.04, 0.62, immersion);
      ballMaterial.uniforms.uDissolve.value = dissolve;
      ball.visible = dissolve < 0.995;
      ball.scale.setScalar(ballRadius * (1 + 0.22 * dissolve));
      // Deep inside (diving to the core) the flat rings fade before the layer does.
      const across = unitsAcross(root);
      const deep = smoothstep(0.3, 1.3, across);
      cloud.visible = reveal * deep > 0.003;
      fader.set(reveal * deep);
      envFader.set(immersion * deep);
      // A slow tumble and breathing: the cloud is never still.
      cloud.rotation.set(Math.sin(time * 0.17) * 0.18, time * 0.07, Math.sin(time * 0.11) * 0.1);
      contours.breathe(time);
      partialStacks.forEach((stack, k) => stack.breathe(time + k * 2.7, 0.02));
      heart.scale.setScalar(heartSize * (1 + 0.08 * Math.sin(time * 2.1)));
      // The spark hands over to the "almost nothing" level as the visitor dives in.
      nucleus.visible = reveal > 0.003;
      sparkFader.set(reveal * smoothstep(0.5, 2.2, across));
      nucleusGlow.scale.setScalar(1 + 0.1 * Math.sin(time * 2.6));
      // Flares keep a constant size on screen.
      const flare = Math.min(across, 16) * 0.075 * (1 + 0.12 * Math.sin(time * 1.7));
      flares.forEach((sprite, k) => sprite.scale.set(flare * (k ? 1 : 1.3), flare * 0.08, 1));
    },
  };
};

export default atom;
