/**
 * Shared look of the photosynthetic membranes, so that a granum drawn inside
 * the chloroplast matches the `thylakoid` level drawn on top of it, and the
 * membrane patch of the `photosystem` level matches the thylakoid membrane.
 */
import * as THREE from "three";
import type { Kit } from "../../../engine/kit";

export const PHOTO_COLORS = {
  /** Thylakoid membrane seen from the stroma (grana discs). */
  disc: "#2fae55",
  discShadow: "#15604a",
  discRim: "#b8ff7a",
  /** Top face of a granum (the end membrane). */
  discTop: "#46c45e",
  /** Inside of a thylakoid. */
  lumen: "#0f5a58",
  lumenGlow: "#3fe0c0",
  /** Membrane cross-sections. */
  section: "#9cf07a",
  lamella: "#56c95a",
  /** Chloroplast envelope. */
  envelope: "#63d655",
  envelopeShadow: "#2c8a4c",
  envelopeInside: "#dff6a4",
  envelopeInsideShadow: "#9dc97a",
  stroma: "#e9f9b8",
  starch: "#fff4d6",
  plastoglobule: "#ffc53d",
  ribosome: "#7b4fe0",
  dna: "#ff5fa8",
  /** Photosystem: lipid heads and tails. */
  lipidHead: "#ffe9a8",
  lipidTail: "#f3c46a",
  chlorophyll: "#7dff6b",
  antenna: "#2fc46a",
  core: "#1fa7a0",
  photon: "#ffe36b",
} as const;

/**
 * The granum entered from the chloroplast (thylakoid level, 10 units = 500 nm).
 * The chloroplast draws the same granum at 1/10 scale (see GRANUM there).
 */
export const GRANUM = {
  discs: 12,
  radius: 4.4,
  /** Distance between successive discs (22.5 nm). */
  repeat: 0.45,
  /** Half thickness of one thylakoid (19 nm thick). */
  half: 0.19,
  /** Membrane thickness (≈ 4.5 nm). */
  membrane: 0.09,
  /** The cut-away wedge, in lathe angles (from +Z towards +X), radians. */
  wedgeCenter: (40 * Math.PI) / 180,
  wedgeHalf: (52 * Math.PI) / 180,
};

/** Height (thylakoid units) of disc `k`, counted from the bottom. */
export const discY = (k: number) => (k - (GRANUM.discs - 1) / 2) * GRANUM.repeat;

/**
 * Stroma lamellae leaving the entered granum: lathe angle (degrees), disc
 * index, rise per unit of length and width (thylakoid units). The chloroplast
 * uses the same directions so that the two levels line up.
 */
export const HERO_LAMELLAE = [
  { phi: 128, disc: 9, slope: -0.1, width: 1.7 },
  { phi: 205, disc: 5, slope: 0.12, width: 1.9 },
  { phi: -72, disc: 7, slope: 0.08, width: 1.5 },
  { phi: 168, disc: 1, slope: 0.05, width: 1.4 },
  { phi: -120, disc: 2, slope: -0.1, width: 1.6 },
] as const;

/**
 * A flattened thylakoid sac: a disc with rounded edges, revolved around +Y.
 * `phiStart`/`phiLength` (radians, three.js lathe convention) leave a wedge open.
 */
export function discGeometry(
  kit: Kit,
  radius: number,
  halfThickness: number,
  options: { segments?: number; phiStart?: number; phiLength?: number; bevel?: number; steps?: number } = {},
) {
  const t = halfThickness;
  const bevel = Math.min(options.bevel ?? t, t);
  const points: THREE.Vector2[] = [];
  points.push(new THREE.Vector2(0, -t));
  points.push(new THREE.Vector2(radius - bevel, -t));
  const steps = options.steps ?? 8;
  for (let i = 1; i < steps; i++) {
    const a = -Math.PI / 2 + (i / steps) * Math.PI;
    points.push(new THREE.Vector2(radius - bevel + Math.cos(a) * bevel, Math.sin(a) * t));
  }
  points.push(new THREE.Vector2(radius - bevel, t));
  points.push(new THREE.Vector2(0, t));
  return kit.geometry(
    new THREE.LatheGeometry(
      points,
      options.segments ?? 48,
      options.phiStart ?? 0,
      options.phiLength ?? Math.PI * 2,
    ),
  );
}

/** Closed outline of the rounded disc profile (x = radius, y = height). */
export function discProfile(radius: number, halfThickness: number, bevel = halfThickness) {
  const t = halfThickness;
  const b = Math.min(bevel, t);
  const shape: THREE.Vector2[] = [];
  shape.push(new THREE.Vector2(0, -t));
  shape.push(new THREE.Vector2(radius - b, -t));
  const steps = 8;
  for (let i = 1; i < steps; i++) {
    const a = -Math.PI / 2 + (i / steps) * Math.PI;
    shape.push(new THREE.Vector2(radius - b + Math.cos(a) * b, Math.sin(a) * t));
  }
  shape.push(new THREE.Vector2(radius - b, t));
  shape.push(new THREE.Vector2(0, t));
  return shape;
}

/**
 * A chlorophyll seen from afar: a green disc with the chlorin ring and its
 * magnesium centre sketched on it. Used for the antenna pigments of the
 * photosystem and by the chlorophyll level when seen from there.
 */
export function chlorophyllTileTexture(kit: Kit) {
  return kit.canvasTexture(64, 64, (g, w, h) => {
    const c = w / 2;
    g.clearRect(0, 0, w, h);
    const body = g.createRadialGradient(c, c, 2, c, c, c);
    body.addColorStop(0, "#d8ffb0");
    body.addColorStop(0.55, "#8dff6e");
    body.addColorStop(0.92, "#4fd35a");
    body.addColorStop(1, "rgba(79,211,90,0)");
    g.fillStyle = body;
    g.beginPath();
    g.arc(c, c, c, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = "#2f9a45";
    g.lineWidth = 4;
    g.beginPath();
    g.arc(c, c, c * 0.56, 0, Math.PI * 2);
    g.stroke();
    g.fillStyle = "#ffffff";
    g.beginPath();
    g.arc(c, c, c * 0.18, 0, Math.PI * 2);
    g.fill();
  });
}

export interface ShaftSpec {
  /** Top end of the shaft. */
  at: [number, number, number];
  width: number;
  length: number;
  opacity: number;
}

/**
 * Soft beams of sunlight (additive, fading downwards) for the surroundings.
 * Call `update(time, immersion)` every frame: they follow the immersion like
 * the other surroundings and shimmer gently.
 */
export function lightShafts(kit: Kit, specs: ShaftSpec[], options: { color?: string; tilt?: number } = {}) {
  const texture = kit.canvasTexture(64, 256, (g, w, h) => {
    const across = g.createLinearGradient(0, 0, w, 0);
    across.addColorStop(0, "rgba(255,255,255,0)");
    across.addColorStop(0.5, "rgba(255,255,255,1)");
    across.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = across;
    g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = "destination-in";
    const down = g.createLinearGradient(0, 0, 0, h);
    down.addColorStop(0, "rgba(255,255,255,1)");
    down.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = down;
    g.fillRect(0, 0, w, h);
  });
  const geometry = kit.geometry(new THREE.PlaneGeometry(1, 1));
  geometry.translate(0, -0.5, 0);
  const group = new THREE.Group();
  const materials: { material: THREE.MeshBasicMaterial; base: number }[] = [];
  for (const spec of specs) {
    const material = kit.track(
      new THREE.MeshBasicMaterial({
        map: texture,
        color: options.color ?? "#fff2b0",
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    const shaft = new THREE.Mesh(geometry, material);
    shaft.position.set(...spec.at);
    shaft.rotation.z = options.tilt ?? 0.5;
    shaft.scale.set(spec.width, spec.length, 1);
    group.add(shaft);
    materials.push({ material, base: spec.opacity });
  }
  return {
    group,
    update(time: number, immersion: number) {
      materials.forEach(({ material, base }, i) => {
        material.opacity = base * immersion * (0.75 + 0.25 * Math.sin(time * 0.6 + i * 1.7));
      });
    },
  };
}
