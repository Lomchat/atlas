/**
 * Shared pieces of the computing scenes: smooth transitions and the "lamp
 * field", a pool of glowing bits that glide from one step's layout to the
 * next (three draw calls for any number of bits).
 */
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { ColorLike, Kit } from "../../engine/kit";
import type { StageFrame } from "./types";

/** Exponential approach of `current` towards `target` (instant when snapping). */
export function approach(current: number, target: number, rate: number, frame: Pick<StageFrame, "dt" | "snap">) {
  if (frame.snap) return target;
  return current + (target - current) * (1 - Math.exp(-frame.dt * rate));
}

/** Pops a group in and out with a soft overshoot. */
export class Pop {
  value = 0;
  private velocity = 0;
  constructor(readonly object: THREE.Object3D, private readonly base = 1) {
    object.scale.setScalar(0);
    object.visible = false;
  }
  update(show: boolean, frame: Pick<StageFrame, "dt" | "snap" | "reducedMotion">) {
    const target = show ? 1 : 0;
    if (frame.snap || frame.reducedMotion) {
      this.value = frame.snap ? target : approach(this.value, target, 12, frame);
      this.velocity = 0;
    } else {
      // Under-damped spring (a little bounce when appearing), integrated in
      // small sub-steps so slow frames stay stable.
      const stiffness = 90;
      const damping = show ? 11 : 16;
      for (let left = frame.dt; left > 1e-6; left -= 1 / 60) {
        const h = Math.min(left, 1 / 60);
        this.velocity += (stiffness * (target - this.value) - damping * this.velocity) * h;
        this.value += this.velocity * h;
      }
      if (!show && this.value < 0.002) (this.value = 0), (this.velocity = 0);
    }
    const s = Math.max(0, this.value) * this.base;
    this.object.scale.setScalar(s);
    this.object.visible = s > 0.002;
    return this.value;
  }
}

/* ------------------------------------------------------------------ */
/* Lamp field                                                          */
/* ------------------------------------------------------------------ */

export interface LampTarget {
  x: number;
  y: number;
  z?: number;
  /** Tile width in local units. */
  size: number;
  /** 0 = off, 1 = on. */
  on: number;
  /** Colour when on (default: yellow). */
  color?: ColorLike;
  /** Seconds after the step begins before this lamp appears. */
  delay?: number;
}

const OFF = new THREE.Color("#3b2c86");
const YELLOW = new THREE.Color("#ffd23f");

interface Slot {
  pos: THREE.Vector3;
  size: number;
  on: number;
  color: THREE.Color;
  target: LampTarget | null;
  targetColor: THREE.Color;
}

export class LampField {
  readonly group = new THREE.Group();
  /** One empty object per lamp, centred on its bulb and scaled with it. */
  readonly anchors: THREE.Object3D[] = [];
  private readonly slots: Slot[] = [];
  private readonly tiles: THREE.InstancedMesh;
  private readonly bulbs: THREE.InstancedMesh;
  private readonly glow: THREE.Points;
  private readonly matrix = new THREE.Matrix4();
  private readonly quaternion = new THREE.Quaternion();
  private readonly scale = new THREE.Vector3();
  private readonly position = new THREE.Vector3();
  private readonly color = new THREE.Color();

  constructor(kit: Kit, readonly capacity: number) {
    this.tiles = new THREE.InstancedMesh(
      kit.geometry(new RoundedBoxGeometry(1, 1, 0.34, 3, 0.16)),
      kit.toon("#2b1f6b", { rim: 0.5, rimColor: "#8f7bff", gloss: 0.15 }),
      capacity,
    );
    const bulb = kit.geometry(new THREE.SphereGeometry(0.33, 28, 18));
    bulb.scale(1, 1, 0.62);
    this.bulbs = new THREE.InstancedMesh(bulb, kit.toon("#ffffff", { rim: 0.45, gloss: 0.55, soft: 0.3 }), capacity);
    for (const mesh of [this.tiles, this.bulbs]) {
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.frustumCulled = false;
    }
    for (let i = 0; i < capacity; i++) this.bulbs.setColorAt(i, OFF);
    this.glow = kit.points(new Float32Array(capacity * 3), {
      colors: new Float32Array(capacity * 3),
      sizes: new Float32Array(capacity),
      size: 1,
      soft: 1,
      additive: true,
      maxPx: 420,
    });
    this.glow.renderOrder = 2;
    this.group.add(this.tiles, this.bulbs, this.glow);
    for (let i = 0; i < capacity; i++) {
      this.slots.push({
        pos: new THREE.Vector3(),
        size: 0,
        on: 0,
        color: YELLOW.clone(),
        target: null,
        targetColor: YELLOW.clone(),
      });
      const anchor = new THREE.Object3D();
      anchor.visible = false;
      this.anchors.push(anchor);
      this.group.add(anchor);
    }
  }

  /** Lamps for the current step; slots beyond the list shrink away. */
  layout(targets: readonly LampTarget[]) {
    this.slots.forEach((slot, i) => {
      const target = targets[i] ?? null;
      if (target && !slot.target && slot.size < 0.01) slot.pos.set(target.x, target.y, target.z ?? 0);
      slot.target = target;
      if (target) slot.targetColor.set(target.color ?? YELLOW);
    });
  }

  update(frame: StageFrame) {
    const { time, since } = frame;
    const glowPositions = this.glow.geometry.getAttribute("position") as THREE.BufferAttribute;
    const glowColors = this.glow.geometry.getAttribute("color") as THREE.BufferAttribute;
    const glowSizes = this.glow.geometry.getAttribute("aSize") as THREE.BufferAttribute;
    this.slots.forEach((slot, i) => {
      const target = slot.target;
      const shown = !!target && since >= (target.delay ?? 0);
      const move = frame.reducedMotion ? 9 : 5.5;
      if (target) {
        slot.pos.x = approach(slot.pos.x, target.x, move, frame);
        slot.pos.y = approach(slot.pos.y, target.y, move, frame);
        slot.pos.z = approach(slot.pos.z, target.z ?? 0, move, frame);
      }
      slot.size = approach(slot.size, shown ? target.size : 0, shown ? 7 : 10, frame);
      slot.on = approach(slot.on, shown ? target.on : 0, 16, frame);
      if (frame.snap) slot.color.copy(slot.targetColor);
      else slot.color.lerp(slot.targetColor, 1 - Math.exp(-frame.dt * 8));
      const size = slot.size < 0.004 ? 0 : slot.size;

      this.scale.set(size, size, size);
      this.matrix.compose(slot.pos, this.quaternion, this.scale);
      this.tiles.setMatrixAt(i, this.matrix);
      this.position.set(slot.pos.x, slot.pos.y, slot.pos.z + 0.17 * size);
      this.matrix.compose(this.position, this.quaternion, this.scale);
      this.bulbs.setMatrixAt(i, this.matrix);
      this.color.copy(OFF).lerp(slot.color, slot.on);
      this.bulbs.setColorAt(i, this.color);

      const pulse = frame.reducedMotion ? 1 : 1 + 0.07 * Math.sin(time * 2.2 + i * 0.7);
      glowPositions.setXYZ(i, slot.pos.x, slot.pos.y, slot.pos.z + 0.4 * size);
      glowColors.setXYZ(i, slot.color.r * slot.on, slot.color.g * slot.on, slot.color.b * slot.on);
      glowSizes.setX(i, size * 2.3 * slot.on * pulse);

      const anchor = this.anchors[i];
      anchor.position.set(slot.pos.x, slot.pos.y, slot.pos.z + 0.25 * size);
      anchor.scale.setScalar(Math.max(size, 1e-3));
      anchor.visible = shown && size > target.size * 0.6;
    });
    this.tiles.instanceMatrix.needsUpdate = true;
    this.bulbs.instanceMatrix.needsUpdate = true;
    if (this.bulbs.instanceColor) this.bulbs.instanceColor.needsUpdate = true;
    glowPositions.needsUpdate = glowColors.needsUpdate = glowSizes.needsUpdate = true;
  }
}

/** A row of `n` lamps centred on (x, y), `gap` apart. */
export function row(n: number, x: number, y: number, gap: number, size: number, bits: readonly number[], extra: Partial<LampTarget> = {}) {
  return Array.from({ length: n }, (_, k): LampTarget => ({
    x: x + (k - (n - 1) / 2) * gap,
    y,
    size,
    on: bits[k] ?? 0,
    ...extra,
  }));
}

/**
 * A character drawn the way a screen does: a grid of pixels, on or off.
 * Uses the app's rounded font so accents and lowercase letters look right.
 */
export function glyphPixels(char: string, cols: number, rows: number): boolean[] {
  const scale = 8;
  const canvas = document.createElement("canvas");
  canvas.width = cols * scale;
  canvas.height = rows * scale;
  const g = canvas.getContext("2d", { willReadFrequently: true })!;
  g.fillStyle = "#fff";
  g.textAlign = "center";
  g.textBaseline = "alphabetic";
  // Cap height ≈ 11 of 18 rows, with room for accents above and descenders below.
  g.font = `700 ${Math.round(rows * (17 / 18) * scale)}px "Nunito Variable", "Nunito", system-ui, sans-serif`;
  g.fillText(char, (cols / 2) * scale, rows * (14 / 18) * scale);
  const data = g.getImageData(0, 0, canvas.width, canvas.height).data;
  const pixels: boolean[] = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      // Coverage of the cell: a pixel is on when the letter fills most of it.
      let sum = 0;
      for (let y = 0; y < scale; y++)
        for (let x = 0; x < scale; x++) sum += data[((r * scale + y) * canvas.width + c * scale + x) * 4 + 3];
      pixels.push(sum / (scale * scale * 255) > 0.5);
    }
  return pixels;
}

/* ------------------------------------------------------------------ */
/* Wires carrying bits                                                  */
/* ------------------------------------------------------------------ */

type P = [number, number, number];

/** A polyline with softly rounded corners (circuit-style wiring). */
export function wirePath(points: readonly P[], radius = 0.22) {
  const v = points.map(([x, y, z]) => new THREE.Vector3(x, y, z));
  const path = new THREE.CurvePath<THREE.Vector3>();
  let from = v[0].clone();
  for (let k = 1; k < v.length; k++) {
    const corner = v[k];
    if (k === v.length - 1) {
      path.add(new THREE.LineCurve3(from, corner.clone()));
      break;
    }
    const next = v[k + 1];
    const r = Math.min(radius, corner.distanceTo(from) / 2, corner.distanceTo(next) / 2);
    const a = corner.clone().add(from.clone().sub(corner).normalize().multiplyScalar(r));
    const b = corner.clone().add(next.clone().sub(corner).normalize().multiplyScalar(r));
    if (a.distanceTo(from) > 1e-4) path.add(new THREE.LineCurve3(from, a));
    path.add(new THREE.QuadraticBezierCurve3(a, corner.clone(), b));
    from = b;
  }
  return path;
}

interface WireState {
  curve: THREE.Curve<THREE.Vector3>;
  material: THREE.ShaderMaterial | null;
  value: number;
  target: number;
  first: number;
  count: number;
  speed: number;
}

/**
 * A set of wires that light up and carry travelling sparks when they hold a
 * 1. All sparks of the set share one draw call; build the set with `add`,
 * then call `finish` once.
 */
export class WireSet {
  readonly group = new THREE.Group();
  private readonly wires: WireState[] = [];
  private total = 0;
  private sparks: THREE.Points | null = null;
  private static readonly OFF = new THREE.Color("#4a3a9a");
  private static readonly ON = new THREE.Color("#ffd23f");

  constructor(private readonly kit: Kit) {}

  /** Adds a wire; `tube: false` draws only its sparks (current inside a part). */
  add(points: readonly P[], options: { radius?: number; tube?: boolean; sparks?: number; speed?: number } = {}) {
    const curve = wirePath(points);
    let material: THREE.ShaderMaterial | null = null;
    if (options.tube !== false) {
      material = this.kit.toon("#4a3a9a", { rim: 0.35, gloss: 0.3 }) as THREE.ShaderMaterial;
      const mesh = new THREE.Mesh(this.kit.geometry(new THREE.TubeGeometry(curve, Math.max(8, Math.round(curve.getLength() * 10)), options.radius ?? 0.07, 10)), material);
      this.group.add(mesh);
    }
    const count = options.sparks ?? Math.max(2, Math.round(curve.getLength() * 1.4));
    this.wires.push({ curve, material, value: 0, target: 0, first: this.total, count, speed: options.speed ?? 0.9 });
    this.total += count;
    return this.wires.length - 1;
  }

  /** A small dot where wires join. */
  junction(at: P, radius = 0.12) {
    const dot = new THREE.Mesh(this.kit.geometry(new THREE.SphereGeometry(radius, 16, 12)), this.kit.toon("#4a3a9a"));
    dot.position.set(...at);
    this.group.add(dot);
  }

  finish() {
    this.sparks = this.kit.points(new Float32Array(Math.max(1, this.total) * 3), {
      sizes: new Float32Array(Math.max(1, this.total)),
      color: "#fff3b8",
      size: 1,
      soft: 1,
      additive: true,
      maxPx: 48,
    });
    this.sparks.renderOrder = 3;
    this.group.add(this.sparks);
    return this;
  }

  set(index: number, value: boolean | number) {
    this.wires[index].target = Number(value);
  }

  update(frame: Pick<StageFrame, "time" | "dt" | "snap" | "reducedMotion">) {
    if (!this.sparks || !this.group.visible) return;
    const positions = this.sparks.geometry.getAttribute("position") as THREE.BufferAttribute;
    const sizes = this.sparks.geometry.getAttribute("aSize") as THREE.BufferAttribute;
    const p = new THREE.Vector3();
    for (const wire of this.wires) {
      wire.value = approach(wire.value, wire.target, 12, frame);
      wire.material?.uniforms.uColor.value.copy(WireSet.OFF).lerp(WireSet.ON, wire.value);
      const length = wire.curve.getLength();
      for (let k = 0; k < wire.count; k++) {
        const u = (((frame.reducedMotion ? 0 : (frame.time * wire.speed) / length) + k / wire.count) % 1 + 1) % 1;
        wire.curve.getPointAt(u, p);
        positions.setXYZ(wire.first + k, p.x, p.y, p.z + 0.02);
        sizes.setX(wire.first + k, 0.34 * wire.value);
      }
    }
    positions.needsUpdate = sizes.needsUpdate = true;
  }
}
