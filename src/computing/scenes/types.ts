import type * as THREE from "three";
import type { Kit } from "../../engine/kit";
import type { Store } from "../store";

/**
 * Lesson scenes for the computing section (see AGENTS.md → "Computing
 * section"). One builder draws a whole lesson; its steps are camera shots and
 * states of the same objects, so every change of step is a smooth morph.
 *
 * - Units: the main subject spans about 10 units around the origin, +Y up,
 *   facing the camera on +Z.
 * - Words never go in 3D: name an anchor (an empty Object3D placed where the
 *   word belongs) and the UI draws the label there in the visitor's language.
 *   Hide an anchor (`visible = false`) when what it points at is hidden.
 * - Create every resource through `kit`; use `rng(seed)`, never Math.random.
 */
export interface Shot {
  /** Point the camera looks at. */
  target: [number, number, number];
  /** Region (local units) that must stay visible, whatever the screen's shape. */
  width: number;
  height: number;
  /** Degrees around the vertical axis (positive: from the right). */
  yaw?: number;
  /** Degrees above the horizon (positive: looking down). */
  pitch?: number;
}

export interface StageContext {
  kit: Kit;
  quality: "high" | "low";
  /** The lesson's shared state, also edited by its overlay. */
  store: Store<object> | null;
}

export interface StageFrame {
  /** Seconds since start (frozen in screenshots). */
  time: number;
  /** Seconds since the previous frame (0 when frozen). */
  dt: number;
  /** Index of the current step. */
  step: number;
  /** Seconds since the current step began (very large when frozen). */
  since: number;
  /** Jump to the final state of every transition (screenshots and tests). */
  snap: boolean;
  /** The visitor prefers reduced motion: keep animation calm. */
  reducedMotion: boolean;
}

export interface StageScene {
  root: THREE.Object3D;
  /** Camera framing of a step. */
  shot(step: number): Shot;
  /** Named points for labels and controls drawn over the scene. */
  anchors?: Record<string, THREE.Object3D>;
  update?(frame: StageFrame): void;
  /** False while something needed for a faithful picture is still loading. */
  ready?(): boolean;
  dispose?(): void;
}

export type StageBuilder = (context: StageContext) => StageScene;
