/**
 * A quark: the known end of the journey. It is drawn as a glowing point with
 * no surface (no size has ever been measured). Its gluon field does not spread
 * out like an electric field: the field lines fan out briefly, then squeeze
 * into two flux tubes that run off-screen towards its two partners. Around it,
 * short-lived gluons and quark–antiquark pairs keep flickering.
 *
 * Units: 10 = 2 × 10⁻¹⁶ m (a view frame, not a size). Seen from the proton
 * (immersion 0) the quark looks exactly like the proton's other up quark.
 */
import * as THREE from "three";
import { rng } from "../../../engine/kit";
import type { SceneBuilder } from "../types";
import {
  Fader,
  direction,
  fizz,
  flavorColor,
  fluxTubes,
  quarkGlyph,
  quarkPairs,
  rgb,
  ringStack,
  smoothstep,
  unitsAcross,
  type Flavor,
  type V3,
} from "./fx";

const quark: SceneBuilder = ({ kit, params }) => {
  const flavor = (params.flavor as Flavor | undefined) ?? "up";
  const partners = (params.partners as { flavor: Flavor; at: V3 }[] | undefined) ?? [];
  /** Quark units per proton unit (the glyph's size as seen in the proton). */
  const glyphUnit = Number(params.glyph ?? 8.4);
  const [fadeNear, fadeFar] = (params.glyphFade as [number, number] | undefined) ?? [190, 240];
  const random = rng(97);
  const color = flavorColor(flavor);

  const root = new THREE.Group();
  const env = new THREE.Group();
  const v = new THREE.Vector3();

  /* ---------------- The point ---------------- */
  const glyph = quarkGlyph(kit, flavor);
  glyph.group.traverse((object) => {
    object.renderOrder = 8;
    const material = (object as THREE.Mesh).material as THREE.Material | undefined;
    if (material) material.depthTest = false;
  });
  root.add(glyph.group);

  // The glow around the point, posterized like every glow in this journey.
  const aura = ringStack(
    kit,
    [
      { radius: 5.4, color: "#4a1d6e", alpha: 0.35 },
      { radius: 3.8, color: "#7c2a78", alpha: 0.35 },
      { radius: 2.5, color: "#c8466e", alpha: 0.38 },
      { radius: 1.5, color: "#ff9440", alpha: 0.42 },
      { radius: 0.8, color: color, alpha: 0.45 },
      { radius: 0.38, color: "#fff6d8", alpha: 0.6 },
    ],
    { feather: 0.8, order: 2 },
  );
  const auraFader = new Fader();
  for (const sprite of aura.sprites) auraFader.add(sprite.material);
  root.add(aura.group);
  // A star flare: light, not a surface.
  const flares = [0, Math.PI / 2, Math.PI / 4, -Math.PI / 4].map((angle) => {
    const flare = kit.glow("#fff0b8", 1, { opacity: angle % (Math.PI / 2) ? 0.35 : 0.8 });
    flare.material.rotation = angle;
    flare.material.depthTest = false;
    flare.renderOrder = 9;
    auraFader.add(flare.material);
    root.add(flare);
    return flare;
  });

  /* ---------------- Surroundings ---------------- */
  // Gluon field lines: a short fan around the point, then two tight tubes.
  const tubes = fluxTubes(kit, {
    arms: Math.max(1, partners.length),
    strands: 6,
    segments: 110,
    radius: 0.09,
    bundle: 0.5,
    sheath: 1.35,
    fan: 1.05,
    fanLength: 1.5,
    fanEnds: [true, false],
    wobble: 0.26,
    wave: 0.2,
    twist: 0.22,
    spin: 0.35,
    pulse: 0.8,
    color: "#ff6fd0",
    hot: "#fff3fc",
    sheathOpacity: 0.3,
    env: true,
  });
  tubes.mesh.renderOrder = 5;
  tubes.material.depthTest = false;
  const origin = new THREE.Vector3();
  partners.forEach((partner, k) => tubes.setArm(k, origin, new THREE.Vector3(...partner.at)));
  env.add(tubes.mesh);

  // The partners themselves are far off-screen: only their light reaches here.
  for (const partner of partners) {
    const light = kit.glow(flavorColor(partner.flavor), 70, { opacity: 0.4, env: true });
    light.position.set(...partner.at);
    light.frustumCulled = false;
    light.renderOrder = 1;
    env.add(light);
  }

  // Virtual pairs and gluons flickering around the quark.
  const pairs = quarkPairs(kit, { count: kit.count(14, 8), radius: 7.5, inner: 1.6, separation: 0.8, size: 0.42, rate: 0.55, env: true, seed: 21 });
  pairs.renderOrder = 6;
  (pairs.material as THREE.ShaderMaterial).depthTest = false;
  env.add(pairs);
  {
    const positions: number[] = [];
    const colors: number[] = [];
    const sizes: number[] = [];
    for (let i = 0; i < kit.count(460); i++) {
      direction(random, v).multiplyScalar(1 + 11 * Math.pow(random(), 0.8));
      positions.push(v.x, v.y, v.z);
      colors.push(...rgb("#ff7ad9", "#ffe39a", random() * 0.6));
      sizes.push(0.5 + random() * 1.2);
    }
    const sparks = fizz(kit, positions, { colors, sizes, size: 0.12, soft: 0.5, rate: 1.2, flicker: 1, hop: 0.45, maxPx: 12, opacity: 0.8, env: true, depthTest: false, seed: 23 });
    sparks.renderOrder = 4;
    env.add(sparks);
  }

  return {
    root,
    env,
    update({ time, immersion }) {
      // Seen from the nucleus the proton is still a solid ball: stay hidden
      // until it dissolves, then look like the proton's other up quark.
      const across = unitsAcross(root);
      const shown = 1 - smoothstep(fadeNear, fadeFar, across);
      root.visible = shown > 0.002;
      const inside = smoothstep(0.1, 0.9, immersion);
      glyph.fader.set(shown);
      auraFader.set(inside);
      // From the proton's glyph to a point: the glow tightens, the body shrinks.
      const unit = glyphUnit + (1.7 - glyphUnit) * inside;
      glyph.setSize(unit, 1 - 0.55 * inside);
      glyph.setBody((1 - inside) * shown, 1 - 0.55 * inside);
      glyph.pulse(time, 0);
      aura.breathe(time, 0.04);
      const flare = Math.min(across, 16) * 0.16 * (1 + 0.1 * Math.sin(time * 1.9));
      flares.forEach((sprite, k) => {
        const long = k < 2 ? (k ? 1 : 1.25) : 0.45;
        sprite.scale.set(flare * long, flare * 0.045, 1);
      });
    },
  };
};

export default quark;
