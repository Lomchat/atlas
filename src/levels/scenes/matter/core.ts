/**
 * "Almost nothing": a 4.5 pm view at the heart of the atom. The nucleus
 * (about 5 fm) is a thousand times smaller than this view: it is only a
 * glowing marker here. Around it, the faint probability haze of the two
 * innermost electrons (their 1s cloud: tight for iron, wider than the view
 * for carbon), a few sparse "measurements" of where they could be, and the
 * nucleus's electric field radiating through the emptiness.
 *
 * Units: 10 = 3 pm. The nucleus child sits at the centre.
 */
import * as THREE from "three";
import { rng } from "../../../engine/kit";
import type { SceneBuilder } from "../types";
import {
  BOHR,
  Fader,
  direction,
  fizz,
  gamma,
  radialLines,
  ringStack,
  rgb,
  shellCharges,
  smoothstep,
  spark,
  unitsAcross,
} from "./fx";

const core: SceneBuilder = ({ kit, level, params }) => {
  const symbol = String(params.symbol ?? "C");
  const Z = Number(params.Z ?? 6);
  const shells = (params.shells as number[] | undefined) ?? [2, 4];
  const perBohr = BOHR / (level.size / 10);
  const z1s = shellCharges(symbol, Z, shells)[0];
  /** 1s density falls as e^(−2r/a): `a` in local units (≈ 7 for iron, 31 for carbon). */
  const a = perBohr / z1s;
  const random = rng(Z * 53 + 7);

  const root = new THREE.Group();
  const env = new THREE.Group();
  const v = new THREE.Vector3();

  /* ---------------- The innermost electrons' haze ---------------- */
  const envFader = new Fader();
  // The 1s cloud as posterized density levels at fixed radii: each step's
  // contrast follows the real falloff e^(−2r/a), so iron (tight cloud) shows
  // strong rings while carbon (a cloud wider than this view) is a gentle tint.
  const levels = [16, 11.5, 7.8, 4.8, 2.4];
  const hazeColors = ["#3b2a86", "#5a3a9c", "#8a4fa6", "#c26f8f", "#f29b6a"];
  const haze = ringStack(
    kit,
    levels.map((radius, k) => {
      const inner = levels[k + 1] ?? 0;
      const step = 1 - Math.exp((-2 * (radius - inner)) / a);
      const base = k === 0 ? 0.12 * Math.exp((-2 * radius) / a) + 0.04 : 0;
      return { radius, color: hazeColors[k], alpha: base + 0.02 + 0.24 * step };
    }),
    { feather: 0.6, order: 1 },
  );
  for (const sprite of haze.sprites) envFader.add(sprite.material);
  env.add(haze.group);
  const warmth = kit.glow("#ffb45c", Math.min(60, a * 3.2), { opacity: 0.16 });
  warmth.renderOrder = 2;
  envFader.add(warmth.material);
  env.add(warmth);

  // Sparse sparkles: places the two innermost electrons could turn up.
  {
    const positions: number[] = [];
    const colors: number[] = [];
    const sizes: number[] = [];
    const count = kit.count(240);
    for (let i = 0; i < count; i++) {
      let r = (gamma(random, 3) * a) / 2;
      for (let tries = 0; r > 16 && tries < 6; tries++) r = (gamma(random, 3) * a) / 2;
      if (r > 16) r = 16 * Math.cbrt(random());
      direction(random, v).multiplyScalar(r);
      positions.push(v.x, v.y, v.z);
      colors.push(...rgb("#ffd88a", "#ffffff", random() * 0.5));
      sizes.push(0.6 + random() * random() * 1.8);
    }
    const dots = fizz(kit, positions, { colors, sizes, size: 0.12, soft: 0.5, rate: 0.35, flicker: 0.95, hop: 0.35, maxPx: 18, opacity: 0.85, env: true, seed: Z });
    dots.renderOrder = 4;
    env.add(dots);
  }

  // Out-of-focus motes drifting at other depths: the emptiness has depth.
  const motes = new THREE.Group();
  {
    const positions: number[] = [];
    const sizes: number[] = [];
    const count = kit.count(42);
    for (let i = 0; i < count; i++) {
      direction(random, v).multiplyScalar(6 + random() * 9);
      positions.push(v.x, v.y, v.z);
      sizes.push(0.8 + random() * 2.2);
    }
    motes.add(fizz(kit, positions, { sizes, color: "#8f7bff", size: 0.5, soft: 1, rate: 0.12, flicker: 0.6, maxPx: 60, opacity: 0.22, env: true, seed: 3 }));
  }
  env.add(motes);

  // The nucleus's electric field, radiating through the emptiness.
  const field = radialLines(kit, { count: 46, inner: 0.35, outer: 18, fall: 2.6, color: "#c49bff", opacity: 0.75, env: true, seed: Z });
  field.renderOrder = 3;
  env.add(field);

  /* ---------------- The nucleus marker ---------------- */
  const nucleus = new THREE.Group();
  const glow = spark(kit, "#ff3d8e", { size: 3, maxPx: 30, soft: 1, opacity: 0.85 });
  const halo = spark(kit, "#b86cff", { size: 6, maxPx: 110, soft: 1, opacity: 0.35 });
  const point = spark(kit, "#ffe6f2", { size: 1, minPx: 4, maxPx: 6, soft: 0.15, core: 0.6 });
  const flares = [0, Math.PI / 2].map((angle) => {
    const flare = kit.glow("#ff9ccc", 1, { opacity: 0.85 });
    flare.material.rotation = angle;
    return flare;
  });
  nucleus.add(halo, glow, ...flares, point);
  for (const object of nucleus.children) {
    object.renderOrder = 6;
    ((object as THREE.Points | THREE.Sprite).material as THREE.Material).depthTest = false;
  }
  root.add(nucleus);
  const haloFader = new Fader();
  haloFader.add(halo.material);

  return {
    root,
    env,
    update({ time, immersion }) {
      // The haze is wider than the view once deep inside: let it go.
      const across = unitsAcross(root);
      envFader.set(immersion * smoothstep(0.7, 3.5, across));
      haloFader.set(immersion);
      haze.breathe(time, 0.03);
      field.rotation.set(time * 0.013, time * 0.021, 0);
      motes.rotation.set(Math.sin(time * 0.05) * 0.3, time * 0.02, 0);
      // The marker keeps its size on screen; it pulses gently.
      const pulse = 1 + 0.12 * Math.sin(time * 2.2);
      glow.scale.setScalar(pulse);
      const flare = Math.min(across, 16) * 0.075 * (1 + 0.12 * Math.sin(time * 1.7));
      flares.forEach((sprite, k) => sprite.scale.set(flare * (k ? 1 : 1.3), flare * 0.08, 1));
      // Hand over to the nucleus itself as it grows past the marker.
      nucleus.visible = smoothstep(0.02, 0.2, across) > 0.001;
    },
  };
};

export default core;
