/**
 * A painter for illustrated spiral galaxies seen face-on, drawn on a canvas
 * and used as a texture on a flat disc (see `paintedDisc` in fx.ts).
 *
 * Canvas x maps to local +X and canvas y to local +Z, so the painting is seen
 * from above (+Y) as drawn. Angles θ are measured counter-clockwise as seen
 * from above: a point is (r cos θ, −r sin θ) in (X, Z). Trailing arms of a
 * galaxy turning clockwise (seen from above) have θ increasing with r.
 */
import * as THREE from "three";
import type { Kit } from "../../../engine/kit";
import { rng } from "../../../engine/kit";

export interface Arm {
  /** Angle (radians) where the arm starts, at radius `r0`. */
  theta: number;
  /** Start and end radius (fraction of the disc radius, 0–1). */
  r0: number;
  r1: number;
  /** Half-width of the arm (fraction of the disc radius). */
  width: number;
  color: string;
  /** Brightness multiplier. */
  strength?: number;
  /** Pitch angle in degrees (overrides the galaxy's). */
  pitch?: number;
  /** Dust lane strength along the inner edge (0–1). */
  dust?: number;
}

export interface SpiralSpec {
  /** Canvas size in pixels. */
  size: number;
  seed: number;
  /** Radius of the disc as a fraction of half the canvas. */
  extent?: number;
  pitch: number;
  arms: Arm[];
  disc: { inner: string; outer: string; alpha: number };
  bulge: { radius: number; color: string; core: string; stretch?: number; angle?: number };
  bar?: { length: number; width: number; angle: number; color: string };
  /** Bright ring (fraction of radius), e.g. Andromeda's star-forming ring. */
  ring?: { radius: number; width: number; color: string; strength: number };
  knots?: { count: number; color: string };
  stars?: number;
  /** Flocculent patches (many short arm pieces), for galaxies like M33. */
  flocculence?: number;
}

type Ctx = CanvasRenderingContext2D;

function blob(g: Ctx, x: number, y: number, r: number, color: string, alpha: number) {
  if (r <= 0.3 || alpha <= 0.002) return;
  const gradient = g.createRadialGradient(x, y, 0, x, y, r);
  gradient.addColorStop(0, withAlpha(color, alpha));
  gradient.addColorStop(0.45, withAlpha(color, alpha * 0.45));
  gradient.addColorStop(1, withAlpha(color, 0));
  g.fillStyle = gradient;
  g.fillRect(x - r, y - r, r * 2, r * 2);
}

function withAlpha(hex: string, alpha: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${Math.max(0, Math.min(1, alpha)).toFixed(4)})`;
}

/** Where an arm is at radius r (fraction), as an angle. */
export function armAngle(arm: Arm, r: number, pitch: number) {
  return arm.theta + Math.log(r / arm.r0) / Math.tan(((arm.pitch ?? pitch) * Math.PI) / 180);
}

/** Paint a face-on spiral galaxy. */
export function paintSpiral(g: Ctx, spec: SpiralSpec) {
  const size = spec.size;
  const c = size / 2;
  const R = c * (spec.extent ?? 0.96);
  const random = rng(spec.seed);
  const k = size / 1024;
  const at = (r: number, theta: number) => [c + r * R * Math.cos(theta), c - r * R * Math.sin(theta)] as const;

  g.clearRect(0, 0, size, size);
  g.globalCompositeOperation = "lighter";

  // Diffuse disc light.
  const disc = g.createRadialGradient(c, c, 0, c, c, R);
  disc.addColorStop(0, withAlpha(spec.disc.inner, spec.disc.alpha));
  disc.addColorStop(0.35, withAlpha(spec.disc.inner, spec.disc.alpha * 0.55));
  disc.addColorStop(0.7, withAlpha(spec.disc.outer, spec.disc.alpha * 0.3));
  disc.addColorStop(1, withAlpha(spec.disc.outer, 0));
  g.fillStyle = disc;
  g.fillRect(0, 0, size, size);

  // Arms: overlapping soft blobs along logarithmic spirals.
  for (const arm of spec.arms) {
    const strength = arm.strength ?? 1;
    const steps = Math.round(420 * (arm.r1 - arm.r0) * 2 + 60);
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const r = arm.r0 + (arm.r1 - arm.r0) * t;
      const theta = armAngle(arm, r, spec.pitch);
      const taper = Math.min(1, t * 6) * Math.min(1, (1 - t) * 3.5);
      const w = arm.width * R * (0.65 + 0.5 * r) * (0.8 + 0.4 * random());
      const [x, y] = at(r, theta);
      blob(g, x, y, w, arm.color, 0.065 * strength * taper);
      // Clumpy star clouds around the arm.
      if (random() < 0.55) {
        const off = (random() - 0.5) * w * 1.4;
        const [sx, sy] = at(r + off / R, theta + (random() - 0.5) * 0.05);
        blob(g, sx, sy, w * (0.25 + random() * 0.35), arm.color, 0.1 * strength * taper);
      }
    }
  }

  // Flocculent patches.
  for (let i = 0; i < (spec.flocculence ?? 0); i++) {
    const r = 0.15 + Math.sqrt(random()) * 0.8;
    const theta0 = random() * Math.PI * 2;
    const length = 0.1 + random() * 0.25;
    for (let j = 0; j < 14; j++) {
      const rr = r + (j / 14) * length * 0.4;
      const theta = theta0 + Math.log(rr / r) / Math.tan((spec.pitch * Math.PI) / 180);
      const [x, y] = at(rr, theta);
      blob(g, x, y, (6 + random() * 10) * k * (1 - rr * 0.4), spec.arms[0]?.color ?? "#9fc4ff", 0.1);
    }
  }

  // Ring.
  if (spec.ring) {
    for (let i = 0; i < 360; i++) {
      const theta = (i / 360) * Math.PI * 2;
      const r = spec.ring.radius * (1 + 0.06 * Math.sin(theta * 3 + 1) + (random() - 0.5) * 0.03);
      const [x, y] = at(r, theta);
      blob(g, x, y, spec.ring.width * R * (0.7 + random() * 0.6), spec.ring.color, 0.08 * spec.ring.strength);
    }
  }

  // Bar.
  if (spec.bar) {
    g.save();
    g.translate(c, c);
    g.rotate(-spec.bar.angle);
    g.scale(1, spec.bar.width / spec.bar.length);
    const bar = g.createRadialGradient(0, 0, 0, 0, 0, spec.bar.length * R);
    bar.addColorStop(0, withAlpha(spec.bar.color, 0.75));
    bar.addColorStop(0.5, withAlpha(spec.bar.color, 0.35));
    bar.addColorStop(1, withAlpha(spec.bar.color, 0));
    g.fillStyle = bar;
    g.beginPath();
    g.arc(0, 0, spec.bar.length * R, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }

  // Bulge.
  g.save();
  g.translate(c, c);
  g.rotate(-(spec.bulge.angle ?? 0));
  g.scale(1, spec.bulge.stretch ?? 1);
  const bulge = g.createRadialGradient(0, 0, 0, 0, 0, spec.bulge.radius * R);
  bulge.addColorStop(0, withAlpha(spec.bulge.core, 1));
  bulge.addColorStop(0.18, withAlpha(spec.bulge.core, 0.85));
  bulge.addColorStop(0.45, withAlpha(spec.bulge.color, 0.55));
  bulge.addColorStop(1, withAlpha(spec.bulge.color, 0));
  g.fillStyle = bulge;
  g.beginPath();
  g.arc(0, 0, spec.bulge.radius * R, 0, Math.PI * 2);
  g.fill();
  g.restore();

  // Dust lanes on the inner (concave) edge of the arms: many faint, soft,
  // overlapping dark blobs, so the lane stays smooth even when magnified.
  g.globalCompositeOperation = "source-over";
  for (const arm of spec.arms) {
    if (!arm.dust) continue;
    const steps = Math.round(1400 * (arm.r1 - arm.r0) + 60);
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const r = arm.r0 + (arm.r1 - arm.r0) * t;
      const theta = armAngle(arm, r, spec.pitch) - 0.07 - 0.05 * r;
      const [x, y] = at(r - arm.width * 0.35, theta);
      const taper = Math.min(1, t * 5) * Math.min(1, (1 - t) * 3);
      const w = arm.width * R * (0.22 + 0.1 * Math.sin(t * 37 + arm.theta * 5));
      const gradient = g.createRadialGradient(x, y, 0, x, y, w);
      gradient.addColorStop(0, withAlpha("#150b36", 0.14 * arm.dust * taper));
      gradient.addColorStop(1, withAlpha("#150b36", 0));
      g.fillStyle = gradient;
      g.fillRect(x - w, y - w, w * 2, w * 2);
    }
  }
  g.globalCompositeOperation = "lighter";

  // Star-forming knots (pink nebulae) along the arms.
  const knots = spec.knots;
  if (knots) {
    for (let i = 0; i < knots.count; i++) {
      const arm = spec.arms[Math.floor(random() * spec.arms.length)];
      const r = arm.r0 + (arm.r1 - arm.r0) * (0.15 + random() * 0.8);
      const theta = armAngle(arm, r, spec.pitch) + (random() - 0.5) * 0.12;
      const [x, y] = at(r + arm.width * 0.3 * (random() - 0.3), theta);
      const s = (3 + random() * 7) * k;
      blob(g, x, y, s * 2.4, knots.color, 0.35);
      blob(g, x, y, s * 0.7, "#ffe6f4", 0.5);
    }
  }

  // A sprinkle of individual bright stars.
  for (let i = 0; i < (spec.stars ?? 0); i++) {
    const arm = spec.arms[Math.floor(random() * spec.arms.length)];
    const onArm = random() < 0.7;
    const r = onArm ? arm.r0 + (arm.r1 - arm.r0) * random() : Math.sqrt(random()) * 0.95;
    const theta = onArm ? armAngle(arm, r, spec.pitch) + (random() - 0.5) * 0.25 : random() * Math.PI * 2;
    const [x, y] = at(r, theta);
    const s = (0.8 + random() * 1.6) * k;
    g.fillStyle = withAlpha(random() < 0.7 ? "#dfe9ff" : "#fff1d6", 0.5 + random() * 0.5);
    g.beginPath();
    g.arc(x, y, s, 0, Math.PI * 2);
    g.fill();
  }
  g.globalCompositeOperation = "source-over";
}

/** A texture of a painted spiral galaxy, with mipmaps for small on-screen sizes. */
export function spiralTexture(kit: Kit, spec: SpiralSpec) {
  return kit.canvasTexture(spec.size, spec.size, (g) => paintSpiral(g, spec));
}

/* ------------------------------------------------------------------ */
/* Distant galaxies: a single instanced draw call                       */
/* ------------------------------------------------------------------ */

const spriteVertex = /* glsl */ `
attribute vec2 aCell;
attribute vec3 aTint;
varying vec2 vUv;
varying vec3 vTint;
void main() {
  vUv = (uv + aCell) * 0.5;
  vTint = aTint;
  gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
}`;
const spriteFragment = /* glsl */ `
uniform sampler2D map;
uniform float uOpacity;
uniform float uEnv;
varying vec2 vUv;
varying vec3 vTint;
void main() {
  vec4 t = texture2D(map, vUv);
  gl_FragColor = vec4(t.rgb * vTint * uOpacity * uEnv, 1.0);
}`;

/**
 * Many small, randomly oriented galaxies (spirals, ellipticals, barred
 * spirals) as flat textured discs: one draw call, light only (additive).
 */
export function distantGalaxies(
  kit: Kit,
  items: { position: THREE.Vector3; size: number; tint: THREE.Color }[],
  options: { env?: boolean; opacity?: number; seed?: number } = {},
) {
  const random = rng(options.seed ?? 5);
  const atlas = kit.canvasTexture(512, 512, (g) => {
    const cell = (x: number, y: number, spec: SpiralSpec) => {
      g.save();
      g.beginPath();
      g.rect(x, y, 256, 256);
      g.clip();
      g.translate(x, y);
      paintSpiral(g, spec);
      g.restore();
    };
    const base = { size: 256, extent: 0.9, disc: { inner: "#fff0dc", outer: "#8f9cff", alpha: 0.6 }, stars: 60 };
    cell(0, 0, {
      ...base,
      seed: 1,
      pitch: 16,
      arms: [
        { theta: 0, r0: 0.15, r1: 0.95, width: 0.1, color: "#9fc0ff", strength: 1.4 },
        { theta: Math.PI, r0: 0.15, r1: 0.95, width: 0.1, color: "#b4b0ff", strength: 1.4 },
      ],
      bulge: { radius: 0.25, color: "#ffd8a0", core: "#fff8ec" },
      knots: { count: 14, color: "#ff7fbf" },
    });
    cell(256, 0, {
      ...base,
      seed: 2,
      pitch: 12,
      arms: [
        { theta: 0.5, r0: 0.35, r1: 0.95, width: 0.08, color: "#a8c4ff", strength: 1.2 },
        { theta: 0.5 + Math.PI, r0: 0.35, r1: 0.95, width: 0.08, color: "#a8c4ff", strength: 1.2 },
      ],
      bar: { length: 0.36, width: 0.1, angle: 0.5, color: "#ffc98a" },
      bulge: { radius: 0.2, color: "#ffc98a", core: "#fff4e0" },
    });
    // Elliptical: a soft warm glow.
    const e = g.createRadialGradient(128, 384, 0, 128, 384, 118);
    e.addColorStop(0, "rgba(255,244,224,1)");
    e.addColorStop(0.2, "rgba(255,214,160,0.7)");
    e.addColorStop(0.6, "rgba(255,180,120,0.18)");
    e.addColorStop(1, "rgba(255,160,110,0)");
    g.fillStyle = e;
    g.fillRect(0, 256, 256, 256);
    cell(256, 256, {
      ...base,
      seed: 4,
      pitch: 22,
      arms: [
        { theta: 1, r0: 0.1, r1: 0.9, width: 0.12, color: "#8fd0ff", strength: 1.3 },
        { theta: 1 + (Math.PI * 2) / 3, r0: 0.1, r1: 0.9, width: 0.12, color: "#b0a0ff", strength: 1.3 },
        { theta: 1 + (Math.PI * 4) / 3, r0: 0.1, r1: 0.9, width: 0.12, color: "#8fd0ff", strength: 1.3 },
      ],
      bulge: { radius: 0.15, color: "#ffe0b0", core: "#ffffff" },
      knots: { count: 18, color: "#ff7fbf" },
    });
  });
  atlas.premultiplyAlpha = true;
  const geometry = kit.geometry(new THREE.PlaneGeometry(1, 1));
  const cells = new Float32Array(items.length * 2);
  const tints = new Float32Array(items.length * 3);
  const material = kit.track(
    new THREE.ShaderMaterial({
      vertexShader: spriteVertex,
      fragmentShader: spriteFragment,
      uniforms: {
        map: { value: atlas },
        uOpacity: { value: options.opacity ?? 1 },
        uEnv: options.env ? kit.envUniform : { value: 1 },
      },
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneFactor,
      blendSrcAlpha: THREE.ZeroFactor,
      blendDstAlpha: THREE.OneFactor,
    }),
  );
  const mesh = new THREE.InstancedMesh(geometry, material, items.length);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const s = new THREE.Vector3();
  items.forEach((item, k) => {
    e.set(random() * Math.PI, random() * Math.PI, random() * Math.PI);
    const kind = Math.floor(random() * 4);
    // Ellipticals are round blobs seen from any side: keep them facing +Z.
    if (kind === 2) e.set(0, 0, random() * Math.PI);
    q.setFromEuler(e);
    s.set(item.size, item.size * (kind === 2 ? 0.6 + random() * 0.4 : 1), 1);
    mesh.setMatrixAt(k, m.compose(item.position, q, s));
    cells[k * 2] = kind % 2;
    cells[k * 2 + 1] = kind < 2 ? 1 : 0;
    tints[k * 3] = item.tint.r;
    tints[k * 3 + 1] = item.tint.g;
    tints[k * 3 + 2] = item.tint.b;
  });
  geometry.setAttribute("aCell", new THREE.InstancedBufferAttribute(cells, 2));
  geometry.setAttribute("aTint", new THREE.InstancedBufferAttribute(tints, 3));
  mesh.frustumCulled = false;
  return mesh;
}
