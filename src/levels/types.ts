/**
 * Pure level data. This file and everything under `src/levels/data/` must stay
 * free of Three.js imports so Node test scripts can load the registry directly.
 */
export type Bilingual = { en: string; fr: string };
export type Vec3 = [number, number, number];

export type Journey = "cosmos" | "home" | "body" | "tree" | "water" | "matter";

export interface Hotspot {
  /** Stable identifier, unique within its level. */
  id: string;
  /** Position in the level's local units (the subject spans about 10 units). */
  at: Vec3;
  label: Bilingual;
  text: Bilingual;
}

export interface LevelTheme {
  /** Background gradient, top and bottom (sRGB hex). */
  top: string;
  bottom: string;
  /** UI accent and hotspot colour. */
  accent: string;
  /** Colour of the ambient drifting particles. */
  dust: string;
}

export interface LevelData {
  /** Stable URL identifier (`?at=`). */
  id: string;
  parent: string | null;
  journey: Journey;
  /** Scene builder key in `src/levels/scenes/index.ts`. */
  scene: string;
  /** Builder parameters (element, counts…). Must be plain JSON. */
  params?: Record<string, unknown>;
  /** Largest characteristic extent of the subject, in metres. */
  size: number;
  /** Home view extent divided by `size` (default 1.5). */
  frame?: number;
  /** Home orientation: pitch looks down from above, yaw turns around the vertical axis (degrees). */
  view?: { pitch?: number; yaw?: number };
  /**
   * Where this level sits inside its parent, in the parent's local units, and
   * how its axes are rotated there (Euler XYZ, degrees).
   */
  anchor?: { at: Vec3; rotate?: Vec3 };
  /** The default child followed when several children exist. */
  primary?: boolean;
  theme: LevelTheme;
  title: Bilingual;
  /** Compact name for buttons and the scale ruler. */
  short: Bilingual;
  /** One short line previewing the place: what it is and what it does there (tooltips). */
  teaser: Bilingual;
  /** Optional replacement for the automatic size label. */
  sizeText?: Bilingual;
  /** A relatable comparison, written as a full sentence. */
  compare: Bilingual;
  /** The one or two sentences that make a visitor curious. */
  hook: Bilingual;
  /** "Did you know?" facts. */
  facts: Bilingual[];
  hotspots?: Hotspot[];
  source: { label: string; url: string };
}
