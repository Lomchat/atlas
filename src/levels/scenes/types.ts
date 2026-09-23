import type * as THREE from "three";
import type { Kit } from "../../engine/kit";
import type { LevelData, Vec3 } from "../types";

/**
 * Scene builders turn a level into illustrated 3D content.
 *
 * Conventions (see AGENTS.md → "Writing a scene"):
 * - Local units: the subject spans about 10 units (radius ≈ 5), centred on the origin.
 * - +Y is up, the camera looks along −Z from +Z. Home orientation comes from `level.view`.
 * - Keep subject depth within ±6 units and surroundings within ±15 units.
 * - Put surroundings that should only appear once you are "inside" the level in `env`,
 *   and create their materials with `{ env: true }`.
 * - Children are drawn by their own scenes at their anchors: do not draw a second copy.
 * - Create every material, geometry and texture through `kit` so it is disposed.
 */
export interface SceneChild {
  id: string;
  at: Vec3;
  rotate?: Vec3;
  /** Child size divided by this level's size. */
  ratio: number;
  /** Radius of the child's subject in this level's units (≈ 5 × ratio). */
  radius: number;
}

export interface SceneContext {
  kit: Kit;
  level: LevelData;
  params: Record<string, unknown>;
  children: SceneChild[];
  quality: "high" | "low";
}

export interface SceneFrame {
  /** Seconds since start. */
  time: number;
  /** Seconds since the previous frame (0 when frozen). */
  dt: number;
  /** 0 when seen from the parent, 1 once you are inside this level. */
  immersion: number;
  /** Opacity of this level's layer. */
  alpha: number;
  /** True when this is the level the visitor is looking at. */
  current: boolean;
  /** Current view extent in this level's local units (≈ 10 × frame at the home view). */
  extent: number;
  /** The visitor prefers reduced motion: keep animation calm. */
  reducedMotion: boolean;
}

export interface SceneInstance {
  /** The subject and anything that belongs to it. */
  root: THREE.Object3D;
  /** Surroundings that fade in with immersion (optional). */
  env?: THREE.Object3D;
  update?(frame: SceneFrame): void;
  dispose?(): void;
}

export type SceneBuilder = (context: SceneContext) => SceneInstance;
