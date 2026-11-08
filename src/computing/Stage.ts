/**
 * The computing section's engine.
 *
 * One illustrated scene per lesson (plus the chapter map). Each step of a
 * lesson is a camera shot and a state of the same objects, so changing step
 * is a continuous morph rather than a cut. The engine also projects the
 * scene's named anchors to the screen every frame, so the interface can draw
 * words and controls over the 3D picture in the visitor's language.
 *
 * It shares the app's renderer and canvas with the Atlas engine; only the
 * active one renders and listens to input.
 */
import * as THREE from "three";
import { Background, Compositor, RenderTargetPool } from "../engine/backdrop";
import { Kit, PX_SCALE, TIME, rng, setKitResolution } from "../engine/kit";
import type { LevelTheme } from "../levels/types";
import { STAGE_SCENES } from "./scenes";
import type { StageBuilder, StageScene } from "./scenes/types";
import type { Store } from "./store";

const FOV = 24;
const DEG = Math.PI / 180;
const TAN = Math.tan((FOV * DEG) / 2);

export interface AnchorState {
  /** CSS pixels from the canvas's top left corner. */
  x: number;
  y: number;
  /** CSS pixels per local unit of the anchor (follows its scale). */
  px: number;
  visible: boolean;
}

export interface StageState {
  anchors: ReadonlyMap<string, AnchorState>;
  /** The requested scene is built and fully faded in. */
  ready: boolean;
  /** The camera is still travelling to the step's shot. */
  moving: boolean;
}

export interface SafeArea {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface StageOptions {
  renderer: THREE.WebGLRenderer;
  reducedMotion: boolean;
  /** Freeze animation at this time and snap transitions (screenshots, tests). */
  freezeTime?: number;
  quality?: "high" | "low";
}

interface Instance {
  key: string;
  kit: Kit;
  scene: THREE.Scene;
  content: StageScene;
  store: Store<object> | null;
  alpha: number;
  failed: boolean;
}

interface CameraState {
  target: THREE.Vector3;
  span: number;
  yaw: number;
  pitch: number;
}

/** A soft orb shown when a scene module is missing or fails. */
const placeholder: StageBuilder = ({ kit }) => {
  const root = new THREE.Group();
  const orb = new THREE.Mesh(kit.geometry(new THREE.SphereGeometry(2.2, 48, 32)), kit.toon("#8c5cff", { rim: 0.6 }));
  root.add(orb, kit.glow("#c9b3ff", 9, { opacity: 0.35 }));
  return {
    root,
    shot: () => ({ target: [0, 0, 0], width: 10, height: 10 }),
    update: ({ time }) => orb.position.set(0, Math.sin(time * 1.2) * 0.25, 0),
  };
};

type Listener = (state: StageState) => void;

export class Stage {
  readonly canvas: HTMLCanvasElement;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly camera = new THREE.PerspectiveCamera(FOV, 1, 0.5, 600);
  private readonly quality: "high" | "low";
  private reducedMotion: boolean;
  private readonly freezeTime: number | undefined;

  private readonly builders = new Map<string, StageBuilder>();
  private readonly loading = new Set<string>();
  private wanted: { key: string; store: Store<object> | null } | null = null;
  private current: Instance | null = null;
  private leaving: Instance | null = null;
  private step = 0;
  private stepStart = performance.now();

  private readonly cam: CameraState = { target: new THREE.Vector3(), span: 12, yaw: 0, pitch: 0 };
  private placed = false;
  private userYaw = 0;
  private userPitch = 0;
  private yawVelocity = 0;
  private pitchVelocity = 0;
  private readonly parallax = new THREE.Vector2();
  private readonly parallaxTarget = new THREE.Vector2();
  private pointer: { id: number; x: number; y: number; startX: number; startY: number } | null = null;

  private readonly background = new Background();
  private readonly targets = new RenderTargetPool();
  private readonly compositor = new Compositor();
  private readonly dustKit: Kit;
  private readonly dust = new THREE.Scene();
  private readonly dustMaterial: THREE.ShaderMaterial;
  private readonly theme = {
    top: new THREE.Color(),
    bottom: new THREE.Color(),
    accent: new THREE.Color(),
    dust: new THREE.Color(),
  };
  private themeTarget: LevelTheme | null = null;

  private safe: SafeArea = { left: 0, right: 0, top: 0, bottom: 0 };
  private width = 1;
  private height = 1;
  private readonly center = new THREE.Vector2(0.5, 0.5);
  private active = false;
  private disposed = false;
  private frameHandle = 0;
  private lastTime = 0;
  private readonly startTime = performance.now();
  private readonly anchors = new Map<string, AnchorState>();
  private readonly listeners = new Set<Listener>();
  private readonly resizeObserver: ResizeObserver;
  private readonly tmp = new THREE.Vector3();
  private readonly offset = new THREE.Vector3();
  private readonly forward = new THREE.Vector3();

  constructor(canvas: HTMLCanvasElement, options: StageOptions) {
    this.canvas = canvas;
    this.renderer = options.renderer;
    this.reducedMotion = options.reducedMotion;
    this.freezeTime = options.freezeTime;
    this.quality =
      options.quality ??
      (matchMedia("(pointer: coarse)").matches || (navigator.hardwareConcurrency ?? 8) <= 4 ? "low" : "high");

    // Slow sparkles around the scene, in the theme's dust colour.
    this.dustKit = new Kit(this.quality);
    const random = rng(4242);
    const count = this.quality === "high" ? 220 : 110;
    const positions: number[] = [];
    const sizes: number[] = [];
    for (let i = 0; i < count; i++) {
      positions.push((random() * 2 - 1) * 26, (random() * 2 - 1) * 16, (random() * 2 - 1) * 14 - 4);
      sizes.push(0.4 + random() * random() * 1.8);
    }
    const dust = this.dustKit.points(positions, { size: 0.14, sizes, soft: 0.6, twinkle: 0.45, opacity: 0.5 });
    this.dustMaterial = dust.material as THREE.ShaderMaterial;
    this.dust.add(dust);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
  }

  /* ---------------------------------------------------------------- */
  /* Public API                                                        */
  /* ---------------------------------------------------------------- */

  /** Show a scene (the chapter map or a lesson). */
  show(key: string, store: Store<object> | null = null) {
    if (this.wanted?.key === key && this.wanted.store === store) return;
    this.wanted = { key, store };
    this.load(key);
  }

  /** Go to a step of the current scene, with its colours. */
  setStep(step: number, theme: LevelTheme) {
    if (step !== this.step) {
      this.step = step;
      this.stepStart = performance.now();
    }
    this.themeTarget = theme;
    if (!this.placed) this.applyTheme(1);
  }

  setActive(active: boolean) {
    if (active === this.active || this.disposed) return;
    this.active = active;
    if (active) {
      this.renderer.setRenderTarget(null);
      this.renderer.setClearColor(0x000000, 1);
      this.resize();
      this.bind();
      this.lastTime = 0;
      this.frameHandle = requestAnimationFrame(this.frame);
    } else {
      cancelAnimationFrame(this.frameHandle);
      this.unbind();
      this.pointer = null;
      this.canvas.style.cursor = "";
    }
  }

  setReducedMotion(value: boolean) {
    this.reducedMotion = value;
  }

  /** Reserve screen space used by overlaid panels (CSS pixels). */
  setSafeArea(area: SafeArea) {
    this.safe = area;
    this.resize();
  }

  onFrame(listener: Listener) {
    this.listeners.add(listener);
    return () => void this.listeners.delete(listener);
  }

  dispose() {
    this.setActive(false);
    this.disposed = true;
    this.resizeObserver.disconnect();
    for (const instance of [this.current, this.leaving]) if (instance) this.disposeInstance(instance);
    this.current = this.leaving = null;
    this.background.dispose();
    this.targets.dispose();
    this.compositor.dispose();
    this.dustKit.dispose();
  }

  /* ---------------------------------------------------------------- */
  /* Scenes                                                            */
  /* ---------------------------------------------------------------- */

  private load(key: string) {
    if (this.builders.has(key) || this.loading.has(key)) return;
    const loader = STAGE_SCENES[key];
    if (!loader) {
      this.builders.set(key, placeholder);
      return;
    }
    this.loading.add(key);
    loader()
      .then((module) => this.builders.set(key, module.default))
      .catch((error) => {
        console.warn(`Stage scene ${key} failed to load`, error);
        this.builders.set(key, placeholder);
      })
      .finally(() => this.loading.delete(key));
  }

  /** Build the requested scene once its module is there, and fade it in. */
  private ensure() {
    const wanted = this.wanted;
    if (!wanted) return;
    if (this.current?.key === wanted.key && this.current.store === wanted.store) return;
    const builder = this.builders.get(wanted.key);
    if (!builder) return;
    let kit = new Kit(this.quality);
    let content: StageScene;
    let failed = false;
    try {
      content = builder({ kit, quality: this.quality, store: wanted.store });
    } catch (error) {
      console.warn(`Stage scene ${wanted.key} failed to build`, error);
      kit.dispose();
      failed = true;
      kit = new Kit(this.quality);
      content = placeholder({ kit, quality: this.quality, store: null });
    }
    const scene = new THREE.Scene();
    scene.add(content.root);
    if (this.leaving) this.disposeInstance(this.leaving);
    this.leaving = this.current;
    const first = !this.current;
    this.current = { key: wanted.key, kit, scene, content, store: wanted.store, alpha: first || this.snap ? 1 : 0, failed };
    if (first) this.placeCamera(true);
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
    });
    instance.scene.clear();
  }

  /* ---------------------------------------------------------------- */
  /* Frame                                                             */
  /* ---------------------------------------------------------------- */

  private get snap() {
    return this.freezeTime !== undefined;
  }

  private frame = (now: number) => {
    if (this.disposed || !this.active) return;
    this.frameHandle = requestAnimationFrame(this.frame);
    // Transitions follow real time even when frames are slow (software
    // rendering); every easing here is exponential, so large steps stay stable.
    const dt = Math.min(0.25, this.lastTime ? (now - this.lastTime) / 1000 : 0);
    this.lastTime = now;
    const time = this.freezeTime ?? (now - this.startTime) / 1000;
    TIME.value = time;
    this.ensure();

    // Cross-fade between scenes (about 0.4 s).
    const fade = this.snap ? 1 : dt * (this.reducedMotion ? 6 : 2.5);
    if (this.current) this.current.alpha = Math.min(1, this.current.alpha + fade);
    if (this.leaving) {
      this.leaving.alpha -= fade;
      if (this.leaving.alpha <= 0) {
        this.disposeInstance(this.leaving);
        this.leaving = null;
      }
    }

    const moving = this.placeCamera(false, dt);
    this.applyTheme(this.snap ? 1 : 1 - Math.exp(-dt * 2.5));
    this.render(time, dt, now);
    this.project();
    this.emit(moving);
  };

  /** Ease the camera towards the step's shot. Returns true while travelling. */
  private placeCamera(jump: boolean, dt = 0) {
    const content = this.current?.content;
    if (!content) return false;
    const shot = content.shot(this.step);
    const cam = this.cam;
    const target = this.tmp.set(...shot.target);
    const k = jump || this.snap ? 1 : 1 - Math.exp(-dt * (this.reducedMotion ? 6 : 2.4));
    const span = this.spanFor(shot.width, shot.height);
    const before = cam.target.distanceTo(target) + Math.abs(Math.log(cam.span / span)) * 4;
    cam.target.lerp(target, k);
    cam.span = Math.exp(Math.log(cam.span) + (Math.log(span) - Math.log(cam.span)) * k);
    cam.yaw += ((shot.yaw ?? 0) - cam.yaw) * k;
    cam.pitch += ((shot.pitch ?? 0) - cam.pitch) * k;
    this.placed = true;

    // Visitor's drag, with inertia, easing back to the shot.
    if (!this.pointer) {
      this.userYaw = clamp(this.userYaw + this.yawVelocity, -30, 30);
      this.userPitch = clamp(this.userPitch + this.pitchVelocity, -18, 18);
      this.yawVelocity *= Math.exp(-dt * 7);
      this.pitchVelocity *= Math.exp(-dt * 7);
      const back = Math.exp(-dt * 0.35);
      this.userYaw *= back;
      this.userPitch *= back;
    }
    this.parallax.lerp(this.parallaxTarget, 1 - Math.exp(-dt * 2.5));
    const time = TIME.value;
    const sway = this.reducedMotion || this.snap ? 0 : 1;
    const yaw = (cam.yaw + this.userYaw + sway * (Math.sin(time * 0.13) * 2 + this.parallax.x * 3)) * DEG;
    const pitch = (cam.pitch + this.userPitch + sway * (Math.sin(time * 0.1 + 1) * 1 + this.parallax.y * 1.8)) * DEG;
    const distance = this.distanceFor(cam.span);
    const camera = this.camera;
    camera.position.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
    camera.position.multiplyScalar(distance).add(cam.target);
    camera.up.set(0, 1, 0);
    camera.lookAt(cam.target);
    camera.near = Math.max(0.1, distance * 0.05);
    camera.far = distance + 400;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    return before > 0.02;
  }

  /** Units across the free viewport's smaller side so that width × height fits. */
  private spanFor(width: number, height: number) {
    const w = Math.max(80, this.width - this.safe.left - this.safe.right);
    const h = Math.max(80, this.height - this.safe.top - this.safe.bottom);
    const aspect = w / h;
    return aspect >= 1 ? Math.max(height, width / aspect) : Math.max(width, height * aspect);
  }

  /** Camera distance at which `span` units fit across the free viewport. */
  private distanceFor(span: number) {
    const free = Math.max(80, Math.min(this.width - this.safe.left - this.safe.right, this.height - this.safe.top - this.safe.bottom));
    return (this.height * span) / (2 * free * TAN);
  }

  private applyTheme(k: number) {
    const target = this.themeTarget;
    if (!target) return;
    const t = this.theme;
    t.top.lerp(this.colorTmp.set(target.top), k);
    t.bottom.lerp(this.colorTmp.set(target.bottom), k);
    t.accent.lerp(this.colorTmp.set(target.accent), k);
    t.dust.lerp(this.colorTmp.set(target.dust), k);
  }
  private readonly colorTmp = new THREE.Color();

  private render(time: number, dt: number, now: number) {
    const renderer = this.renderer;
    this.background.update(this.theme, this.theme, 0, this.center, this.width / this.height, time);
    this.dustMaterial.uniforms.uColor.value.copy(this.theme.dust);
    this.dust.position.copy(this.cam.target);
    this.dust.rotation.y = this.reducedMotion ? 0 : time * 0.01;

    renderer.setRenderTarget(null);
    renderer.clear(true, true, true);
    renderer.render(this.background.scene, this.background.camera);
    renderer.clearDepth();
    renderer.render(this.dust, this.camera);

    const since = this.snap ? 1e4 : (now - this.stepStart) / 1000;
    let pooled = 0;
    for (const instance of [this.leaving, this.current]) {
      if (!instance) continue;
      try {
        instance.content.update?.({
          time,
          dt,
          step: this.step,
          since,
          snap: this.snap,
          reducedMotion: this.reducedMotion,
        });
      } catch (error) {
        if (!instance.failed) console.warn(`Stage scene ${instance.key} update failed`, error);
        instance.failed = true;
      }
      if (instance.alpha >= 0.995) {
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
        this.compositor.draw(renderer, target.texture, instance.alpha);
      }
    }
  }

  /** Screen positions of the current scene's anchors. */
  private project() {
    this.anchors.clear();
    const content = this.current?.content;
    if (!content?.anchors) return;
    const camera = this.camera;
    camera.getWorldDirection(this.forward);
    const pxAtUnitDistance = this.height / (2 * TAN);
    for (const [name, object] of Object.entries(content.anchors)) {
      object.getWorldPosition(this.tmp);
      const depth = this.offset.copy(this.tmp).sub(camera.position).dot(this.forward);
      this.tmp.project(camera);
      const x = (this.tmp.x * 0.5 + 0.5) * this.width;
      const y = (-this.tmp.y * 0.5 + 0.5) * this.height;
      const px = depth > 0 ? (pxAtUnitDistance / depth) * object.matrixWorld.getMaxScaleOnAxis() : 0;
      let shown = depth > 0 && px > 0.5;
      for (let o: THREE.Object3D | null = object; o && shown; o = o.parent) shown = o.visible;
      this.anchors.set(name, {
        x,
        y,
        px,
        visible: shown && x > -10 && x < this.width + 10 && y > -10 && y < this.height + 10,
      });
    }
  }

  private emit(moving: boolean) {
    const current = this.current;
    const ready =
      !!current &&
      current.key === this.wanted?.key &&
      current.alpha >= 0.99 &&
      !this.leaving &&
      (current.content.ready?.() ?? true);
    const canvas = this.canvas;
    canvas.dataset.stage = current?.key ?? "";
    canvas.dataset.step = String(this.step);
    canvas.dataset.moving = moving ? "1" : "0";
    canvas.dataset.ready = ready ? "1" : "0";
    canvas.dataset.fallback = current?.failed || (current && this.builders.get(current.key) === placeholder) ? "1" : "0";
    const state: StageState = { anchors: this.anchors, ready, moving };
    for (const listener of this.listeners) listener(state);
  }

  /* ---------------------------------------------------------------- */
  /* Input: drag to look around, parallax with the mouse               */
  /* ---------------------------------------------------------------- */

  private bind() {
    const c = this.canvas;
    c.addEventListener("pointerdown", this.onDown);
    c.addEventListener("pointermove", this.onMove);
    c.addEventListener("pointerup", this.onUp);
    c.addEventListener("pointercancel", this.onUp);
    c.addEventListener("pointerleave", this.onLeave);
  }

  private unbind() {
    const c = this.canvas;
    c.removeEventListener("pointerdown", this.onDown);
    c.removeEventListener("pointermove", this.onMove);
    c.removeEventListener("pointerup", this.onUp);
    c.removeEventListener("pointercancel", this.onUp);
    c.removeEventListener("pointerleave", this.onLeave);
  }

  private onDown = (event: PointerEvent) => {
    if (this.pointer) return;
    this.canvas.setPointerCapture(event.pointerId);
    this.pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY };
  };

  private onMove = (event: PointerEvent) => {
    const pointer = this.pointer;
    if (!pointer || pointer.id !== event.pointerId) {
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
    if (Math.hypot(event.clientX - pointer.startX, event.clientY - pointer.startY) < 6) return;
    this.yawVelocity = -dx * 0.25;
    this.pitchVelocity = dy * 0.2;
    this.userYaw = clamp(this.userYaw - dx * 0.25, -30, 30);
    this.userPitch = clamp(this.userPitch + dy * 0.2, -18, 18);
  };

  private onUp = (event: PointerEvent) => {
    if (this.pointer?.id === event.pointerId) this.pointer = null;
  };

  private onLeave = () => {
    this.parallaxTarget.set(0, 0);
  };

  /* ---------------------------------------------------------------- */
  /* Viewport                                                          */
  /* ---------------------------------------------------------------- */

  private resize() {
    if (!this.active) return;
    const rect = this.canvas.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    this.width = width;
    this.height = height;
    const ratio = Math.min(window.devicePixelRatio || 1, this.quality === "high" ? 2 : 1.6);
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
    this.camera.fov = FOV;
    this.camera.aspect = width / height;
    this.camera.setViewOffset(width, height, width / 2 - cx, height / 2 - cy, width, height);
    this.camera.updateProjectionMatrix();
    const buffer = this.renderer.getDrawingBufferSize(new THREE.Vector2());
    PX_SCALE.value = buffer.y / (2 * TAN);
    setKitResolution(buffer.x, buffer.y);
    this.targets.resize(buffer.x, buffer.y);
  }
}

const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
