/**
 * The biconcave disc of a red blood cell, from the Evans & Fung (1972)
 * thickness profile: T(x) = √(1 − x²)·(0.81 + 7.83x² − 4.39x⁴) µm for a
 * 7.82 µm cell, x = r/R. Thin (≈ 0.8 µm) in the middle, ≈ 2.6 µm near the rim.
 */
import * as THREE from "three";
import type { Kit } from "../../../engine/kit";
import { patchToon } from "../body/skinShaders";

const R_UM = 3.91;

/** Full thickness at relative radius x (0 centre → 1 rim), in µm. */
export function thicknessUm(x: number) {
  const x2 = x * x;
  return Math.sqrt(Math.max(0, 1 - x2)) * (0.81 + 7.83 * x2 - 4.39 * x2 * x2);
}

/** Half thickness at relative radius x, in units of the cell's radius. */
export function halfThickness(x: number) {
  return thicknessUm(x) / 2 / R_UM;
}

/**
 * Closed lathe profile (radius, height) of a cell of radius 1, from the
 * bottom centre round the rim to the top centre. `cut` (0–1) optionally
 * stops the profile at a given relative radius (for cut-away views).
 */
export function biconcaveProfile(steps = 28) {
  const lower: THREE.Vector2[] = [];
  for (let i = 0; i <= steps; i++) {
    const x = Math.sin((i / steps) * (Math.PI / 2));
    lower.push(new THREE.Vector2(Math.min(x, 0.9999), -halfThickness(Math.min(x, 0.9995))));
  }
  const upper = lower
    .slice(0, -1)
    .reverse()
    .map((p) => new THREE.Vector2(p.x, -p.y));
  const profile = [...lower, ...upper];
  profile[0].x = 0;
  profile[profile.length - 1].x = 0;
  return profile;
}

/** A biconcave disc of radius `radius`, lying in the XZ plane (axis along Y). */
export function redCellGeometry(radius: number, options: { segments?: number; steps?: number; phiStart?: number; phiLength?: number } = {}) {
  const geometry = new THREE.LatheGeometry(
    biconcaveProfile(options.steps ?? 28),
    options.segments ?? 40,
    options.phiStart ?? 0,
    options.phiLength ?? Math.PI * 2,
  );
  geometry.scale(radius, radius, radius);
  return geometry;
}

/**
 * A surface packed with hemoglobin "beads" (α pink, β orange), used on the
 * cut faces of the red cell and behind the crowd inside it. Coordinates come
 * from `uv` (ShapeGeometry) or from the object's x/y position (`fromPosition`).
 * The beads fade to an even tint when they become too small on screen.
 */
export function beadsMaterial(
  kit: Kit,
  options: { perUnit: number; side?: THREE.Side; fromPosition?: boolean; dim?: number; env?: boolean; flat?: number },
) {
  return patchToon(kit.toon("#ffffff", { rim: 0.2, gloss: 0.15, soft: 0.4, side: options.side, env: options.env, flat: options.flat }) as THREE.ShaderMaterial, {
    vertexDecl: "varying vec2 vFace;",
    vertexMain: options.fromPosition ? "vFace = position.xy;" : "vFace = uv;",
    fragmentDecl: `varying vec2 vFace;
vec2 beadHash(vec2 p) { return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453); }`,
    fragmentNormal: `
  vec2 bp = vFace * ${options.perUnit.toFixed(3)};
  vec2 cell = floor(bp);
  vec2 f = fract(bp);
  float best = 9.0;
  vec2 bestId = vec2(0.0);
  vec2 bestD = vec2(0.0);
  for (int y = -1; y <= 1; y++)
    for (int x = -1; x <= 1; x++) {
      vec2 g = vec2(float(x), float(y));
      vec2 o = beadHash(cell + g) * 0.55 + 0.22;
      vec2 d = g + o - f;
      float dd = dot(d, d);
      if (dd < best) { best = dd; bestId = cell + g; bestD = d; }
    }
  float r = sqrt(best);
  float bead = 1.0 - smoothstep(0.36, 0.44, r);
  float kind = step(0.5, beadHash(bestId + 7.0).x);
  vec3 beadColor = mix(vec3(1.0, 0.44, 0.57), vec3(1.0, 0.62, 0.42), kind);
  float light = clamp(0.8 + 0.9 * dot(-bestD, vec2(-0.5, 0.6)), 0.55, 1.2);
  vec3 gap = vec3(0.5, 0.1, 0.28);
  vec3 c = mix(gap, beadColor * light, bead);
  float footprint = length(fwidth(bp));
  base = mix(c, vec3(0.95, 0.42, 0.5), smoothstep(0.25, 0.7, footprint)) * ${(options.dim ?? 1).toFixed(3)};`,
  });
}
