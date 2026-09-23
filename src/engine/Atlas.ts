/**
 * The infinite-zoom engine.
 *
 * The visitor's position is a single number, z = log10(view extent in metres),
 * plus the chosen branch (a root-to-leaf path through the level tree). Levels
 * are drawn in the local frame of the current level (a floating origin), so
 * 45 orders of magnitude never reach the GPU at once. Each level has its own
 * Three.js scene; levels are stacked from the largest to the smallest and
 * cross-faded through render targets when partially transparent.
 */
import * as THREE from "three";
import {
  childrenOf,
  homeZ,
  level as levelById,
  pathThrough,
} from "../levels";
import type { LevelData } from "../levels/types";
import { SCENES } from "../levels/scenes";
import placeholder from "../levels/scenes/placeholder";
import type {
  SceneBuilder,
  SceneChild,
  SceneInstance,
} from "../levels/scenes/types";
import {
  Kit,
  PX_SCALE,
  TIME,
  rng,
  setKitResolution,
} from "./kit";
import {
  Similarity,
  anchorTransform,
  clamp01,
  easeInOut,
  homeRotation,
  smoothstep,
  smootherstep,
} from "./math";

THREE.ColorManagement.enabled = false;

/** World units across the smaller side of the free viewport, at the focus plane. */
const SPAN = 10;
/** Camera distance from the focus plane. */
const DISTANCE = 30;
/** Maximum half-depth (world units) of a magnified level before it is flattened. */
const MAX_DEPTH = 11;
const DEG = Math.PI / 180;

export interface ScreenTarget {
  kind: "child" | "hotspot";
  /** Level id (child) or hotspot id. */
  id: string;
  x: number;
  y: number;
  /** Radius in CSS pixels. */
  r: number;
  visible: boolean;
}

export interface FrameState {
  z: number;
  /** Index in the path of the level being left when zooming in. */
  index: number;
  /** Progress (0–1) from path[index] to path[index + 1]. */
  u: number;
  nearest: LevelData;
  moving: boolean;
  targets: ScreenTarget[];
  hovered: string | null;
  /** Current accent colour (hex). */
  accent: string;
  ready: boolean;
}

export interface SafeArea {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

interface Instance {
  level: LevelData;
  kit: Kit;
  scene: THREE.Scene;
  holder: THREE.Group;
  content: SceneInstance;
  env: THREE.Object3D | undefined;
  lastSeen: number;
  failed: boolean;
  /** Drawn by the placeholder (missing or failed scene). */
  fallback: boolean;
}

interface Layer {
  level: LevelData;
  transform: Similarity;
  alpha: number;
  immersion: number;
  current: boolean;
}

interface Flight {
  from: number;
  to: number;
  start: number;
  duration: number;
  resolve: (arrived: boolean) => void;
}

export interface AtlasOptions {
  startAt: string;
  reducedMotion: boolean;
  /** Freeze scene animation at this time (screenshots and tests). */
  freezeTime?: number;
  quality?: "high" | "low";
  /** Offset from the start level's home view, in decades. */
  startOffset?: number;
}

type Listener<T> = (value: T) => void;

export class Atlas {
  readonly canvas: HTMLCanvasElement;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly camera = new THREE.PerspectiveCamera(20, 1, 0.5, 400);
  private readonly quality: "high" | "low";
  private reducedMotion: boolean;
  private readonly freezeTime: number | undefined;

  // Navigation state
  private path: LevelData[] = [];
  private homes: number[] = [];
  private anchors: Similarity[] = [];
  private rotations: THREE.Quaternion[] = [];
  z = 0;
  private impulse = 0;
  private lastInput = 0;
  private lastDirection = 0;
  private flights: Flight[] = [];
  private flight: Flight | null = null;
  private sequence = 0;
  /** Resting on the nearest level is disabled for off-home screenshot views until input. */
  private settleEnabled = true;

  // Orbit (user drag) and idle sway
  private yaw = 0;
  private pitch = 0;
  private yawVelocity = 0;
  private pitchVelocity = 0;
  /** Gentle parallax following the mouse (−1…1), smoothed. */
  private parallax = new THREE.Vector2();
  private parallaxTarget = new THREE.Vector2();

  // Scenes
  private readonly builders = new Map<string, SceneBuilder>();
  private readonly loading = new Set<string>();
  private readonly instances = new Map<string, Instance>();
  private buildBudget = 0;

  // Rendering helpers
  private readonly background: Background;
  private readonly dust: Dust;
  private readonly targets: RenderTargetPool;
  private readonly compositor: Compositor;
  private safe: SafeArea = { left: 0, right: 0, top: 0, bottom: 0 };
  private width = 1;
  private height = 1;
  private center = new THREE.Vector2(0.5, 0.5);

  // Frame state
  private frameHandle = 0;
  private lastTime = 0;
  private startTime = performance.now();
  private layers: Layer[] = [];
  private index = 0;
  private u = 0;
  private nearest!: LevelData;
  private readonly screenTargets: ScreenTarget[] = [];
  private hovered: string | null = null;
  private ready = false;
  private fallback = false;
  private disposed = false;
  private frames = 0;
  /** Adaptive resolution: device pixel ratio actually used, and frame-time average. */
  private pixelRatio = 0;
  private frameTime = 1 / 60;
  private slowSince = 0;
  private fastSince = 0;

  private readonly changeListeners = new Set<Listener<Atlas>>();
  private readonly frameListeners = new Set<Listener<FrameState>>();
  private readonly interruptListeners = new Set<() => void>();
  private readonly resizeObserver: ResizeObserver;

  constructor(canvas: HTMLCanvasElement, options: AtlasOptions) {
    this.canvas = canvas;
    this.reducedMotion = options.reducedMotion;
    this.freezeTime = options.freezeTime;
    this.quality =
      options.quality ??
      (matchMedia("(pointer: coarse)").matches || (navigator.hardwareConcurrency ?? 8) <= 4
        ? "low"
        : "high");
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
      preserveDrawingBuffer: options.freezeTime !== undefined,
    });
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    additiveLightOnly(this.renderer.getContext());
    this.renderer.autoClear = false;
    this.renderer.setClearColor(0x000000, 1);
    this.camera.position.set(0, 0, DISTANCE);
    this.camera.lookAt(0, 0, 0);
    this.background = new Background();
    this.dust = new Dust(this.quality);
    this.targets = new RenderTargetPool();
    this.compositor = new Compositor();

    this.setPath(pathThrough(options.startAt));
    const start = levelById(options.startAt);
    this.z = homeZ(start) + (options.startOffset ?? 0);
    this.settleEnabled = !options.startOffset;
    this.nearest = start;

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.resize();
    this.bindInput();
    canvas.addEventListener("webglcontextlost", this.onContextLost);
    this.frameHandle = requestAnimationFrame(this.frame);
  }

  /* ---------------------------------------------------------------- */
  /* Public API                                                        */
  /* ---------------------------------------------------------------- */

  get currentPath(): readonly LevelData[] {
    return this.path;
  }
  get homeZs(): readonly number[] {
    return this.homes;
  }
  get nearestLevel() {
    return this.nearest;
  }

  onChange(listener: Listener<Atlas>) {
    this.changeListeners.add(listener);
    return () => void this.changeListeners.delete(listener);
  }
  onFrame(listener: Listener<FrameState>) {
    this.frameListeners.add(listener);
    return () => void this.frameListeners.delete(listener);
  }
  /** Called whenever the visitor takes over (wheel, drag, pinch). */
  onInterrupt(listener: () => void) {
    this.interruptListeners.add(listener);
    return () => void this.interruptListeners.delete(listener);
  }

  setReducedMotion(value: boolean) {
    this.reducedMotion = value;
  }

  /** Reserve screen space used by overlaid panels (CSS pixels). */
  setSafeArea(area: SafeArea) {
    this.safe = area;
    this.resize();
  }

  /** Fly to the home view of any level, switching branch if necessary. */
  async flyTo(id: string): Promise<boolean> {
    const target = levelById(id);
    const sequence = ++this.sequence;
    this.cancelFlights();
    const onPath = this.path.some((level) => level.id === id);
    if (!onPath) {
      const next = pathThrough(id);
      let common = 0;
      while (
        common < Math.min(next.length, this.path.length) &&
        next[common].id === this.path[common].id
      )
        common++;
      const ancestorZ = this.homes[common - 1];
      // Deeper than the common ancestor: travel back out first.
      if (this.index >= common || (this.index === common - 1 && this.u > 0.01)) {
        const arrived = await this.flyToZ(ancestorZ);
        if (!arrived || sequence !== this.sequence) return false;
      }
      this.setPath(next);
    }
    return this.flyToZ(homeZ(target));
  }

  /** One level deeper (+1) or one level out (−1) along the current path. */
  step(direction: 1 | -1) {
    const z = this.flight ? this.flight.to : this.z;
    const homes = this.homes;
    if (direction > 0) {
      const next = homes.findIndex((h) => h < z - 0.02);
      if (next >= 0) void this.flyTo(this.path[next].id);
    } else {
      for (let k = homes.length - 1; k >= 0; k--)
        if (homes[k] > z + 0.02) return void this.flyTo(this.path[k].id);
    }
  }

  /** Continuous zoom, in decades (negative zooms in). */
  zoomBy(decades: number) {
    this.interrupt();
    this.impulse += decades;
    this.lastDirection = Math.sign(decades);
    this.lastInput = performance.now();
  }

  /** Jump the view extent directly (scale ruler scrubbing). */
  scrubTo(z: number) {
    this.interrupt();
    const top = this.homes[0] + 0.35;
    const bottom = this.homes[this.homes.length - 1] - 0.35;
    const next = Math.max(bottom, Math.min(top, z));
    this.lastDirection = Math.sign(next - this.z) || this.lastDirection;
    this.impulse = 0;
    this.z = next;
    this.lastInput = performance.now();
  }

  /** Neighbouring levels on the path (for the UI). */
  neighbours() {
    const z = this.nearestZ();
    const inward = this.path.find((_, k) => this.homes[k] < z - 0.02);
    let outward: LevelData | undefined;
    for (let k = this.homes.length - 1; k >= 0; k--)
      if (this.homes[k] > z + 0.02) {
        outward = this.path[k];
        break;
      }
    return { inward, outward };
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frameHandle);
    this.cancelFlights();
    this.resizeObserver.disconnect();
    this.unbindInput();
    this.canvas.removeEventListener("webglcontextlost", this.onContextLost);
    for (const instance of this.instances.values()) this.disposeInstance(instance);
    this.instances.clear();
    this.background.dispose();
    this.dust.dispose();
    this.targets.dispose();
    this.compositor.dispose();
    this.renderer.dispose();
  }

  /* ---------------------------------------------------------------- */
  /* Path                                                              */
  /* ---------------------------------------------------------------- */

  private setPath(path: LevelData[]) {
    this.path = path;
    this.homes = path.map(homeZ);
    this.anchors = path.map((level, k) =>
      k === 0 ? new Similarity() : anchorTransform(level, path[k - 1]),
    );
    this.rotations = path.map(homeRotation);
    this.emitChange();
  }

  private nearestZ() {
    return this.flight ? this.flight.to : this.z;
  }

  /* ---------------------------------------------------------------- */
  /* Flights                                                           */
  /* ---------------------------------------------------------------- */

  private flyToZ(to: number, duration?: number): Promise<boolean> {
    this.impulse = 0;
    const distance = Math.abs(to - this.z);
    const time =
      duration ??
      (this.reducedMotion
        ? 0.35
        : Math.min(7, 0.7 + 0.55 * Math.pow(distance, 0.85)));
    return new Promise((resolve) => {
      const flight: Flight = {
        from: this.z,
        to,
        start: performance.now(),
        duration: time * 1000,
        resolve,
      };
      if (this.flight) this.flight.resolve(false);
      this.flight = flight;
    });
  }

  private cancelFlights() {
    if (this.flight) this.flight.resolve(false);
    this.flight = null;
    for (const flight of this.flights) flight.resolve(false);
    this.flights = [];
  }

  private interrupt() {
    this.settleEnabled = true;
    this.sequence++;
    this.cancelFlights();
    for (const listener of this.interruptListeners) listener();
  }

  /** Where to rest after free zooming: the next level in the direction of travel. */
  private settleTarget() {
    const homes = this.homes;
    const z = this.z;
    const last = homes.length - 1;
    if (z >= homes[0]) return homes[0];
    if (z <= homes[last]) return homes[last];
    let i = 0;
    while (i + 1 < homes.length && homes[i + 1] >= z) i++;
    const u = (homes[i] - z) / (homes[i] - homes[i + 1]);
    if (this.lastDirection < 0) return u > 0.06 ? homes[i + 1] : homes[i];
    if (this.lastDirection > 0) return u < 0.94 ? homes[i] : homes[i + 1];
    return u < 0.5 ? homes[i] : homes[i + 1];
  }

  private updateZoom(now: number, dt: number) {
    if (this.flight) {
      const f = this.flight;
      const t = clamp01((now - f.start) / f.duration);
      this.z = f.from + (f.to - f.from) * easeInOut(t);
      if (t >= 1) {
        this.flight = null;
        f.resolve(true);
      }
    } else if (Math.abs(this.impulse) > 1e-5) {
      const step = this.impulse * (1 - Math.exp(-dt * 14));
      this.z += step;
      this.impulse -= step;
      const top = this.homes[0] + 0.35;
      const bottom = this.homes[this.homes.length - 1] - 0.35;
      if (this.z > top) (this.z = top), (this.impulse = 0);
      if (this.z < bottom) (this.z = bottom), (this.impulse = 0);
    } else if (this.settleEnabled && !this.pointers.size && now - this.lastInput > 240) {
      const target = this.settleTarget();
      if (Math.abs(target - this.z) > 1e-4) {
        const distance = Math.abs(target - this.z);
        void this.flyToZ(
          target,
          this.reducedMotion ? 0.3 : Math.min(1.6, 0.45 + 0.5 * distance),
        );
      }
      this.lastDirection = 0;
    }
  }

  /* ---------------------------------------------------------------- */
  /* Input                                                             */
  /* ---------------------------------------------------------------- */

  private pointers = new Map<number, { x: number; y: number; startX: number; startY: number; time: number }>();
  private pinchDistance = 0;

  private bindInput() {
    const c = this.canvas;
    c.addEventListener("wheel", this.onWheel, { passive: false });
    c.addEventListener("pointerdown", this.onPointerDown);
    c.addEventListener("pointermove", this.onPointerMove);
    c.addEventListener("pointerup", this.onPointerUp);
    c.addEventListener("pointercancel", this.onPointerUp);
    c.addEventListener("pointerleave", this.onPointerLeave);
  }
  private unbindInput() {
    const c = this.canvas;
    c.removeEventListener("wheel", this.onWheel);
    c.removeEventListener("pointerdown", this.onPointerDown);
    c.removeEventListener("pointermove", this.onPointerMove);
    c.removeEventListener("pointerup", this.onPointerUp);
    c.removeEventListener("pointercancel", this.onPointerUp);
    c.removeEventListener("pointerleave", this.onPointerLeave);
  }

  private onWheel = (event: WheelEvent) => {
    event.preventDefault();
    let delta = event.deltaY;
    if (event.deltaMode === 1) delta *= 33;
    if (event.deltaMode === 2) delta *= this.height;
    // Trackpad pinch arrives as ctrl+wheel with small deltas.
    const rate = event.ctrlKey ? 0.012 : 0.0024;
    this.zoomBy(Math.max(-1.2, Math.min(1.2, delta * rate)));
  };

  private onPointerDown = (event: PointerEvent) => {
    this.canvas.setPointerCapture(event.pointerId);
    this.pointers.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
      startX: event.clientX,
      startY: event.clientY,
      time: performance.now(),
    });
    if (this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()];
      this.pinchDistance = Math.hypot(a.x - b.x, a.y - b.y);
      this.interrupt();
    }
    this.lastInput = performance.now();
  };

  private onPointerMove = (event: PointerEvent) => {
    const pointer = this.pointers.get(event.pointerId);
    if (!pointer) {
      this.updateHover(event.clientX, event.clientY);
      if (event.pointerType === "mouse") {
        const rect = this.canvas.getBoundingClientRect();
        this.parallaxTarget.set(
          ((event.clientX - rect.left) / rect.width) * 2 - 1,
          ((event.clientY - rect.top) / rect.height) * 2 - 1,
        );
      }
      return;
    }
    const dx = event.clientX - pointer.x;
    const dy = event.clientY - pointer.y;
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    this.lastInput = performance.now();
    if (this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      if (this.pinchDistance > 0 && distance > 0) {
        const decades = Math.log10(this.pinchDistance / distance) * 1.6;
        this.z = Math.max(
          this.homes[this.homes.length - 1] - 0.35,
          Math.min(this.homes[0] + 0.35, this.z + decades),
        );
        this.lastDirection = Math.sign(decades) || this.lastDirection;
      }
      this.pinchDistance = distance;
      return;
    }
    const moved = Math.hypot(event.clientX - pointer.startX, event.clientY - pointer.startY);
    if (moved > 6) {
      if (moved < 12) this.interrupt();
      this.yawVelocity = dx * 0.28;
      this.pitchVelocity = dy * 0.22;
      this.yaw = Math.max(-40, Math.min(40, this.yaw + dx * 0.28));
      this.pitch = Math.max(-28, Math.min(28, this.pitch + dy * 0.22));
    }
  };

  private onPointerUp = (event: PointerEvent) => {
    const pointer = this.pointers.get(event.pointerId);
    this.pointers.delete(event.pointerId);
    if (this.pointers.size < 2) this.pinchDistance = 0;
    if (!pointer || event.type === "pointercancel") return;
    const moved = Math.hypot(event.clientX - pointer.startX, event.clientY - pointer.startY);
    if (moved < 8 && performance.now() - pointer.time < 500) {
      const hit = this.hitChild(event.clientX, event.clientY);
      if (hit) void this.flyTo(hit);
    }
  };

  private onPointerLeave = () => {
    this.parallaxTarget.set(0, 0);
    if (this.hovered) this.hovered = null;
    this.canvas.style.cursor = "";
  };

  private updateHover(clientX: number, clientY: number) {
    const hit = this.hitChild(clientX, clientY);
    if (hit !== this.hovered) {
      this.hovered = hit;
      this.canvas.style.cursor = hit ? "pointer" : "";
    }
  }

  private hitChild(clientX: number, clientY: number) {
    const rect = this.canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    let best: string | null = null;
    let bestScore = Infinity;
    for (const target of this.screenTargets) {
      if (target.kind !== "child" || !target.visible) continue;
      const d = Math.hypot(target.x - x, target.y - y);
      const radius = Math.max(target.r, 22);
      if (d <= radius && d / radius < bestScore) {
        bestScore = d / radius;
        best = target.id;
      }
    }
    return best;
  }

  /* ---------------------------------------------------------------- */
  /* Frame                                                             */
  /* ---------------------------------------------------------------- */

  private frame = (now: number) => {
    if (this.disposed) return;
    this.frameHandle = requestAnimationFrame(this.frame);
    const dt = Math.min(0.05, this.lastTime ? (now - this.lastTime) / 1000 : 0);
    this.lastTime = now;
    const time =
      this.freezeTime ?? (now - this.startTime) / 1000;
    TIME.value = time;
    const previousZ = this.z;
    this.updateZoom(now, dt);
    const zoomRate = dt > 0 ? Math.abs(this.z - previousZ) / dt : 0;
    this.updateOrbit(dt, zoomRate);
    this.adaptResolution(now, dt);
    this.computeLayers();
    this.buildBudget = 2;
    this.prepare(now);
    this.render(time, this.freezeTime !== undefined ? 0 : dt);
    this.computeTargets();
    this.emitFrame(zoomRate > 0.02 || !!this.flight);
    if (++this.frames % 90 === 0) this.collect(now);
  };

  private updateOrbit(dt: number, zoomRate: number) {
    this.parallax.lerp(this.parallaxTarget, 1 - Math.exp(-dt * 2.5));
    if (!this.pointers.size) {
      // Gentle inertia after a drag.
      this.yaw = Math.max(-40, Math.min(40, this.yaw + this.yawVelocity));
      this.pitch = Math.max(-28, Math.min(28, this.pitch + this.pitchVelocity));
      this.yawVelocity *= Math.exp(-dt * 7);
      this.pitchVelocity *= Math.exp(-dt * 7);
    }
    if (zoomRate > 0.05) {
      const decay = Math.exp(-dt * 3.5);
      this.yaw *= decay;
      this.pitch *= decay;
    }
  }

  private orbitQuaternion(time: number) {
    const sway = this.reducedMotion || this.freezeTime !== undefined ? 0 : 1;
    const yaw = (this.yaw + sway * (Math.sin(time * 0.13) * 2.2 + this.parallax.x * 3)) * DEG;
    const pitch = (this.pitch + sway * (Math.sin(time * 0.1 + 1) * 1.1 + this.parallax.y * 1.8)) * DEG;
    return new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch, yaw, 0, "YXZ"));
  }

  /** Decide which levels are visible, with which transform, opacity and immersion. */
  private computeLayers() {
    const P = this.path;
    const H = this.homes;
    const n = P.length;
    const z = this.z;
    let i = 0;
    while (i + 1 < n && H[i + 1] >= z) i++;
    const u = i + 1 < n ? clamp01((H[i] - z) / (H[i] - H[i + 1])) : 0;
    this.index = i;
    this.u = u;
    const view = Math.pow(10, z);
    const layers: Layer[] = [];
    const presence = (size: number) => smoothstep(0.004, 0.02, size / view);

    let transform = new Similarity();
    for (let k = i; k < Math.min(n, i + 4); k++) {
      if (k > i) transform = transform.compose(this.anchors[k]);
      const level = P[k];
      let alpha = k === i ? 1 : presence(level.size);
      if (k + 1 < n) {
        const uk = clamp01((H[k] - z) / (H[k] - H[k + 1]));
        alpha *= 1 - smoothstep(0.45, 0.86, uk);
      }
      const immersion = k === i ? 1 : k === i + 1 ? smoothstep(0.35, 0.95, u) : 0;
      layers.push({ level, transform, alpha, immersion, current: false });
      if (k <= i + 1) {
        for (const child of childrenOf(level.id)) {
          if (child.id === P[k + 1]?.id) continue;
          let a = presence(child.size);
          if (k === i) a *= 1 - smoothstep(0.12, 0.45, u);
          else a *= alpha;
          layers.push({
            level: child,
            transform: transform.compose(anchorTransform(child, level)),
            alpha: a,
            immersion: 0,
            current: false,
          });
        }
      }
    }
    layers.sort((a, b) => b.level.size - a.level.size);
    const nearest = u < 0.5 || i + 1 >= n ? P[i] : P[i + 1];
    for (const layer of layers) layer.current = layer.level === nearest;
    this.layers = layers.filter((layer) => layer.alpha > 0.004);
    if (nearest !== this.nearest) {
      this.nearest = nearest;
      this.emitChange();
    }
  }

  /** The similarity mapping the current level's local frame to world space. */
  private worldTransform(time: number) {
    const P = this.path;
    const i = this.index;
    const u = this.u;
    const level = P[i];
    const focus = new THREE.Vector3();
    let rotation = this.rotations[i].clone();
    if (i + 1 < P.length && u > 0) {
      const anchor = this.anchors[i + 1];
      const g = smootherstep(u);
      const rho = Math.pow(10, this.homes[i + 1] - this.homes[i]);
      const h = 1 - (1 - g) * Math.pow(rho, u);
      focus.copy(anchor.pos).multiplyScalar(h);
      const childRotation = this.rotations[i + 1]
        .clone()
        .multiply(anchor.rot.clone().invert());
      rotation = rotation.slerp(childRotation, g);
    }
    const orbit = this.orbitQuaternion(time);
    const rot = orbit.multiply(rotation);
    const scale = (SPAN * level.size) / (10 * Math.pow(10, this.z));
    const pos = focus.clone().applyQuaternion(rot).multiplyScalar(-scale);
    return { world: new Similarity().set(pos, rot, scale), orbit: rot };
  }

  private prepare(now: number) {
    // Load modules around the visitor, build visible scenes first.
    const P = this.path;
    const i = this.index;
    for (let k = Math.max(0, i - 2); k < Math.min(P.length, i + 5); k++) {
      this.load(P[k].scene);
      if (k <= i + 1) for (const child of childrenOf(P[k].id)) this.load(child.scene);
    }
    for (const layer of this.layers) this.ensure(layer.level, now);
    for (let k = i + 1; k < Math.min(P.length, i + 3); k++) this.ensure(P[k], now);
  }

  private matrix = new THREE.Matrix4();
  private squash = new THREE.Matrix4();

  private render(time: number, dt: number) {
    const renderer = this.renderer;
    const { world, orbit } = this.worldTransform(time);
    // Background: interpolate the theme between the current level and the next.
    const P = this.path;
    const i = this.index;
    const next = P[Math.min(P.length - 1, i + 1)];
    const t = smoothstep(0.3, 0.85, this.u);
    this.background.update(P[i].theme, next.theme, t, this.center, this.width / this.height, time);
    this.dust.update(this.z, orbit, P[i].theme.dust, next.theme.dust, t, this.reducedMotion);

    renderer.setRenderTarget(null);
    renderer.clear(true, true, true);
    renderer.render(this.background.scene, this.background.camera);
    renderer.clearDepth();
    renderer.render(this.dust.scene, this.camera);

    let ready = true;
    let fallback = false;
    let pooled = 0;
    for (const layer of this.layers) {
      const instance = this.instances.get(layer.level.id);
      if (!instance) {
        ready = false;
        continue;
      }
      instance.lastSeen = performance.now();
      if (instance.fallback || instance.failed) fallback = true;
      const m = world.compose(layer.transform);
      const scale = m.scale;
      this.matrix.compose(m.pos, m.rot, new THREE.Vector3(scale, scale, scale));
      const depth = scale * 7;
      const squash = depth > MAX_DEPTH ? MAX_DEPTH / depth : 1;
      if (squash < 1) this.matrix.premultiply(this.squash.makeScale(1, 1, squash));
      instance.holder.matrix.copy(this.matrix);
      instance.holder.matrixWorldNeedsUpdate = true;
      instance.kit.setEnv(layer.immersion);
      if (instance.env) instance.env.visible = layer.immersion > 0.004;
      try {
        instance.content.update?.({
          time,
          dt,
          immersion: layer.immersion,
          alpha: layer.alpha,
          current: layer.current,
          extent: (10 * Math.pow(10, this.z)) / layer.level.size,
          reducedMotion: this.reducedMotion,
        });
      } catch (error) {
        if (!instance.failed) console.warn(`Scene ${layer.level.id} update failed`, error);
        instance.failed = true;
      }
      if (layer.alpha >= 0.995) {
        renderer.clearDepth();
        renderer.render(instance.scene, this.camera);
      } else {
        const target = this.targets.get(pooled++, renderer);
        renderer.setRenderTarget(target);
        renderer.setClearColor(0x000000, 0);
        renderer.clear(true, true, true);
        renderer.render(instance.scene, this.camera);
        renderer.setRenderTarget(null);
        renderer.setClearColor(0x000000, 1);
        this.compositor.draw(renderer, target.texture, layer.alpha);
      }
    }
    this.ready = ready;
    this.fallback = fallback;
  }

  private tmp = new THREE.Vector3();
  private tmp2 = new THREE.Vector3();

  /** Screen positions of dive targets (children) and hotspots of the current level. */
  private computeTargets() {
    const list = this.screenTargets;
    list.length = 0;
    const i = this.index;
    const level = this.path[i];
    const layer = this.layers.find((l) => l.level === level);
    const atHome =
      this.u < 0.14 && this.z < this.homes[i] + 0.2 && (layer?.alpha ?? 0) > 0.6;
    const { world } = this.worldTransform(TIME.value);
    const rect = { w: this.width, h: this.height };
    const pixelsPerUnit = (distance: number) =>
      rect.h / (2 * Math.tan((this.camera.fov * DEG) / 2) * distance);
    const project = (local: THREE.Vector3, transform: Similarity) => {
      const worldPoint = world.compose(transform).apply(local, this.tmp);
      const depth = worldPoint.z;
      this.tmp2.copy(worldPoint).project(this.camera);
      return {
        x: (this.tmp2.x * 0.5 + 0.5) * rect.w,
        y: (-this.tmp2.y * 0.5 + 0.5) * rect.h,
        depth,
        scale: pixelsPerUnit(DISTANCE - depth),
      };
    };
    const identity = new Similarity();
    const origin = new THREE.Vector3();
    const levelCenter = project(origin, identity);
    for (const child of childrenOf(level.id)) {
      const transform = anchorTransform(child, level);
      const p = project(origin, transform);
      const radius = 5 * transform.scale * world.scale * p.scale;
      list.push({
        kind: "child",
        id: child.id,
        x: p.x,
        y: p.y,
        r: radius,
        visible:
          atHome &&
          p.x > -20 &&
          p.x < rect.w + 20 &&
          p.y > -20 &&
          p.y < rect.h + 20,
      });
    }
    for (const hotspot of level.hotspots ?? []) {
      const p = project(new THREE.Vector3(...hotspot.at), identity);
      list.push({
        kind: "hotspot",
        id: hotspot.id,
        x: p.x,
        y: p.y,
        r: 0,
        visible:
          atHome &&
          p.depth > levelCenter.depth - 2.5 * world.scale &&
          p.x > 0 &&
          p.x < rect.w &&
          p.y > 0 &&
          p.y < rect.h,
      });
    }
  }

  private emitFrame(moving: boolean) {
    const state: FrameState = {
      z: this.z,
      index: this.index,
      u: this.u,
      nearest: this.nearest,
      moving,
      targets: this.screenTargets,
      hovered: this.hovered,
      accent: this.nearest.theme.accent,
      ready: this.ready,
    };
    const canvas = this.canvas;
    canvas.dataset.level = this.nearest.id;
    canvas.dataset.z = this.z.toFixed(3);
    canvas.dataset.moving = moving ? "1" : "0";
    canvas.dataset.ready = this.ready ? "1" : "0";
    canvas.dataset.fallback = this.fallback ? "1" : "0";
    for (const listener of this.frameListeners) listener(state);
  }

  private emitChange() {
    for (const listener of this.changeListeners) listener(this);
  }

  /* ---------------------------------------------------------------- */
  /* Scene instances                                                   */
  /* ---------------------------------------------------------------- */

  private load(key: string) {
    if (this.builders.has(key) || this.loading.has(key)) return;
    this.loading.add(key);
    const loader = SCENES[key];
    if (!loader) {
      this.builders.set(key, placeholder);
      return;
    }
    loader()
      .then((module) => this.builders.set(key, module.default))
      .catch((error) => {
        console.warn(`Scene module ${key} failed to load`, error);
        this.builders.set(key, placeholder);
      })
      .finally(() => this.loading.delete(key));
  }

  private ensure(level: LevelData, now: number) {
    const existing = this.instances.get(level.id);
    if (existing) {
      existing.lastSeen = now;
      return existing;
    }
    const builder = this.builders.get(level.scene);
    if (!builder) {
      this.load(level.scene);
      return null;
    }
    if (this.buildBudget <= 0) return null;
    this.buildBudget--;
    const kit = new Kit(this.quality);
    const children: SceneChild[] = childrenOf(level.id).map((child) => {
      const ratio = child.size / level.size;
      return {
        id: child.id,
        at: child.anchor?.at ?? [0, 0, 0],
        rotate: child.anchor?.rotate,
        ratio,
        radius: 5 * ratio,
      };
    });
    const context = {
      kit,
      level,
      params: level.params ?? {},
      children,
      quality: this.quality,
    };
    let content: SceneInstance;
    let failed = false;
    try {
      content = builder(context);
    } catch (error) {
      console.warn(`Scene ${level.id} failed to build`, error);
      kit.dispose();
      failed = true;
      context.kit = new Kit(this.quality);
      content = placeholder(context);
    }
    const scene = new THREE.Scene();
    const holder = new THREE.Group();
    holder.matrixAutoUpdate = false;
    holder.add(content.root);
    if (content.env) holder.add(content.env);
    scene.add(holder);
    const instance: Instance = {
      level,
      kit: context.kit,
      scene,
      holder,
      content,
      env: content.env,
      lastSeen: now,
      failed,
      fallback: failed || builder === placeholder,
    };
    this.instances.set(level.id, instance);
    return instance;
  }

  /** Dispose scenes that are far from the visitor. */
  private collect(now: number) {
    const keep = new Set<string>();
    const P = this.path;
    for (let k = Math.max(0, this.index - 1); k < Math.min(P.length, this.index + 4); k++) {
      keep.add(P[k].id);
      for (const child of childrenOf(P[k].id)) keep.add(child.id);
    }
    for (const [id, instance] of this.instances) {
      if (keep.has(id) || now - instance.lastSeen < 8000) continue;
      this.disposeInstance(instance);
      this.instances.delete(id);
    }
  }

  private disposeInstance(instance: Instance) {
    try {
      instance.content.dispose?.();
    } catch (error) {
      console.warn(error);
    }
    instance.kit.dispose();
    instance.scene.traverse((object) => {
      if ((object as THREE.InstancedMesh).isInstancedMesh) (object as THREE.InstancedMesh).dispose();
      const mesh = object as THREE.Mesh;
      mesh.geometry?.dispose?.();
      const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(material)) material.forEach((m) => m.dispose());
      else material?.dispose?.();
    });
    instance.scene.clear();
  }

  /* ---------------------------------------------------------------- */
  /* Viewport                                                          */
  /* ---------------------------------------------------------------- */

  private maxPixelRatio() {
    return Math.min(window.devicePixelRatio || 1, this.quality === "high" ? 2 : 1.6);
  }

  /** Lower the resolution when frames are slow, raise it again when there is headroom. */
  private adaptResolution(now: number, dt: number) {
    if (this.freezeTime !== undefined || dt <= 0 || document.hidden) return;
    this.frameTime += (dt - this.frameTime) * 0.05;
    const max = this.maxPixelRatio();
    if (this.frameTime > 1 / 38) {
      this.fastSince = 0;
      this.slowSince ||= now;
      if (now - this.slowSince > 1500 && this.pixelRatio > 1) {
        this.pixelRatio = Math.max(1, this.pixelRatio - 0.25);
        this.slowSince = now;
        this.resize();
      }
    } else if (this.frameTime < 1 / 57) {
      this.slowSince = 0;
      this.fastSince ||= now;
      if (now - this.fastSince > 6000 && this.pixelRatio < max) {
        this.pixelRatio = Math.min(max, this.pixelRatio + 0.25);
        this.fastSince = now;
        this.resize();
      }
    } else {
      this.slowSince = 0;
      this.fastSince = 0;
    }
  }

  private resize() {
    const rect = this.canvas.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    this.width = width;
    this.height = height;
    const ratio = Math.min(this.maxPixelRatio(), this.pixelRatio || Infinity);
    this.pixelRatio = ratio;
    this.renderer.setPixelRatio(ratio);
    this.renderer.setSize(width, height, false);
    const free = {
      x: this.safe.left,
      y: this.safe.top,
      w: Math.max(80, width - this.safe.left - this.safe.right),
      h: Math.max(80, height - this.safe.top - this.safe.bottom),
    };
    const cx = free.x + free.w / 2;
    const cy = free.y + free.h / 2;
    this.center.set(cx / width, 1 - cy / height);
    const pixelsPerUnit = Math.min(free.w, free.h) / SPAN;
    const visibleHeight = height / pixelsPerUnit;
    this.camera.fov = (2 * Math.atan(visibleHeight / 2 / DISTANCE)) / DEG;
    this.camera.aspect = width / height;
    this.camera.setViewOffset(width, height, width / 2 - cx, height / 2 - cy, width, height);
    this.camera.updateProjectionMatrix();
    const buffer = this.renderer.getDrawingBufferSize(new THREE.Vector2());
    PX_SCALE.value = buffer.y / (2 * Math.tan((this.camera.fov * DEG) / 2));
    setKitResolution(buffer.x, buffer.y);
    this.targets.resize(buffer.x, buffer.y);
  }

  private onContextLost = (event: Event) => {
    event.preventDefault();
    console.warn("WebGL context lost");
  };
}

/**
 * Additive light must not add coverage: otherwise a glow drawn into a
 * transparent render target darkens whatever lies behind it once the layer is
 * composited. Additive blending keeps adding colour but leaves alpha alone.
 */
function additiveLightOnly(gl: WebGLRenderingContext | WebGL2RenderingContext) {
  const separate = gl.blendFuncSeparate.bind(gl);
  const single = gl.blendFunc.bind(gl);
  gl.blendFuncSeparate = (srcRGB: number, dstRGB: number, srcAlpha: number, dstAlpha: number) =>
    dstRGB === gl.ONE && srcAlpha === gl.ONE && dstAlpha === gl.ONE && (srcRGB === gl.SRC_ALPHA || srcRGB === gl.ONE)
      ? separate(srcRGB, dstRGB, gl.ZERO, gl.ONE)
      : separate(srcRGB, dstRGB, srcAlpha, dstAlpha);
  gl.blendFunc = (src: number, dst: number) =>
    src === gl.ONE && dst === gl.ONE ? separate(gl.ONE, gl.ONE, gl.ZERO, gl.ONE) : single(src, dst);
}

/* -------------------------------------------------------------------- */
/* Background gradient                                                   */
/* -------------------------------------------------------------------- */

class Background {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly material: THREE.ShaderMaterial;
  private readonly geometry = new THREE.PlaneGeometry(2, 2);
  private readonly a = new THREE.Color();
  private readonly b = new THREE.Color();

  constructor() {
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTop: { value: new THREE.Color() },
        uBottom: { value: new THREE.Color() },
        uGlow: { value: new THREE.Color() },
        uCenter: { value: new THREE.Vector2(0.5, 0.5) },
        uAspect: { value: 1 },
        uTime: { value: 0 },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uTop; uniform vec3 uBottom; uniform vec3 uGlow;
        uniform vec2 uCenter; uniform float uAspect; uniform float uTime;
        varying vec2 vUv;
        void main() {
          vec3 col = mix(uBottom, uTop, smoothstep(0.0, 1.0, vUv.y));
          vec2 d = (vUv - uCenter) * vec2(uAspect, 1.0);
          col = mix(col, uGlow, exp(-dot(d, d) * 2.8) * 0.4);
          vec2 q = (vUv - 0.5) * vec2(uAspect, 1.0);
          col *= mix(0.8, 1.0, smoothstep(1.1, 0.25, length(q)));
          float n = fract(sin(dot(gl_FragCoord.xy + fract(uTime) * 91.0, vec2(12.9898, 78.233))) * 43758.5453);
          col += (n - 0.5) * 0.02;
          gl_FragColor = vec4(col, 1.0);
        }`,
      depthTest: false,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(this.geometry, this.material);
    mesh.frustumCulled = false;
    this.scene.add(mesh);
  }

  update(
    from: { top: string; bottom: string; accent: string },
    to: { top: string; bottom: string; accent: string },
    t: number,
    center: THREE.Vector2,
    aspect: number,
    time: number,
  ) {
    const u = this.material.uniforms;
    u.uTop.value.set(from.top).lerp(this.a.set(to.top), t);
    u.uBottom.value.set(from.bottom).lerp(this.a.set(to.bottom), t);
    const glowFrom = this.a.set(from.bottom).lerp(this.b.set(from.accent), 0.28);
    const glowTo = this.b.set(to.bottom).lerp(new THREE.Color(to.accent), 0.28);
    u.uGlow.value.copy(glowFrom).lerp(glowTo, t);
    u.uCenter.value.copy(center);
    u.uAspect.value = aspect;
    u.uTime.value = time;
  }

  dispose() {
    this.material.dispose();
    this.geometry.dispose();
  }
}

/* -------------------------------------------------------------------- */
/* Fractal dust: three octaves cycling every decade give a constant       */
/* sense of motion through scale.                                        */
/* -------------------------------------------------------------------- */

class Dust {
  readonly scene = new THREE.Scene();
  private readonly kit: Kit;
  private readonly groups: THREE.Group[] = [];
  private readonly materials: THREE.ShaderMaterial[] = [];
  private readonly color = new THREE.Color();

  constructor(quality: "high" | "low") {
    this.kit = new Kit(quality);
    const count = quality === "high" ? 140 : 70;
    for (let octave = 0; octave < 3; octave++) {
      const random = rng(97 + octave * 31);
      const positions: number[] = [];
      const sizes: number[] = [];
      for (let p = 0; p < count; p++) {
        positions.push(
          (random() * 2 - 1) * 1.6,
          (random() * 2 - 1) * 1.0,
          (random() * 2 - 1) * 0.9,
        );
        sizes.push(0.4 + random() * random() * 1.8);
      }
      const points = this.kit.points(positions, {
        size: 0.012,
        sizes,
        soft: 0.6,
        twinkle: 0.4,
        opacity: 0.5,
      });
      const group = new THREE.Group();
      group.add(points);
      this.groups.push(group);
      this.materials.push(points.material as THREE.ShaderMaterial);
      this.scene.add(group);
    }
  }

  update(
    z: number,
    orbit: THREE.Quaternion,
    from: string,
    to: string,
    t: number,
    reducedMotion: boolean,
  ) {
    this.color.set(from).lerp(new THREE.Color(to), t);
    const cycle = -z;
    this.groups.forEach((group, octave) => {
      const phase = (((cycle + octave / 3) % 1) + 1) % 1;
      const scale = 7 * Math.pow(10, phase);
      group.scale.setScalar(scale);
      group.quaternion.copy(orbit);
      const material = this.materials[octave];
      material.uniforms.uColor.value.copy(this.color);
      material.uniforms.uOpacity.value =
        (reducedMotion ? 0.3 : 0.55) * Math.pow(Math.sin(Math.PI * phase), 1.5);
    });
  }

  dispose() {
    this.kit.dispose();
  }
}

/* -------------------------------------------------------------------- */
/* Render targets and compositing                                        */
/* -------------------------------------------------------------------- */

class RenderTargetPool {
  private readonly pool: THREE.WebGLRenderTarget[] = [];
  private width = 1;
  private height = 1;

  get(index: number, renderer: THREE.WebGLRenderer) {
    while (this.pool.length <= index) {
      const samples = renderer.capabilities.isWebGL2 ? 4 : 0;
      this.pool.push(
        new THREE.WebGLRenderTarget(this.width, this.height, {
          samples,
          depthBuffer: true,
        }),
      );
    }
    return this.pool[index];
  }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    for (const target of this.pool) target.setSize(width, height);
  }

  dispose() {
    for (const target of this.pool) target.dispose();
    this.pool.length = 0;
  }
}

class Compositor {
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly material: THREE.ShaderMaterial;
  private readonly geometry = new THREE.PlaneGeometry(2, 2);

  constructor() {
    this.material = new THREE.ShaderMaterial({
      uniforms: { tMap: { value: null }, uAlpha: { value: 1 } },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D tMap; uniform float uAlpha; varying vec2 vUv;
        void main() { gl_FragColor = texture2D(tMap, vUv) * uAlpha; }`,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
      blendSrcAlpha: THREE.OneFactor,
      blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
    });
    const mesh = new THREE.Mesh(this.geometry, this.material);
    mesh.frustumCulled = false;
    this.scene.add(mesh);
  }

  draw(renderer: THREE.WebGLRenderer, texture: THREE.Texture, alpha: number) {
    this.material.uniforms.tMap.value = texture;
    this.material.uniforms.uAlpha.value = alpha;
    renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.material.dispose();
    this.geometry.dispose();
  }
}
