/**
 * Pure lesson data for the computing section. Like `src/levels/`, this file
 * and everything under `src/computing/data/` stay free of Three.js and DOM
 * imports so Node test scripts can load the registry directly.
 */
import type { Bilingual, LevelTheme } from "../levels/types.ts";

/** Icon of a chapter (see `ui/icons.tsx`). */
export type LessonIcon = "bit" | "gate" | "chip" | "key" | "neuron" | "llm";

/** A word or short phrase floating next to a named point of the 3D scene. */
export interface StepLabel {
  /** Anchor name exported by the lesson scene. */
  anchor: string;
  text: Bilingual;
  /** Draw the label above the anchor (default), below it like a caption, or to its left. */
  place?: "above" | "below" | "left";
}

export interface StepData {
  /** Stable URL identifier within its lesson (`&step=`). */
  id: string;
  title: Bilingual;
  /** Two or three short sentences: the idea itself. */
  text: Bilingual;
  /** A concrete worked example, with real numbers. */
  example: Bilingual;
  /** What the visitor can do with the scene at this step. */
  try?: Bilingual;
  /** "Did you know?" facts. */
  facts: Bilingual[];
  /** Words drawn over the scene at this step. */
  labels?: StepLabel[];
  /** Colours for this step (default: the lesson's). */
  theme?: LevelTheme;
  /** Reference for this step (default: the lesson's). */
  source?: { label: string; url: string };
}

export interface LessonData {
  /** Stable URL identifier (`&lesson=`). */
  id: string;
  /** Order on the chapter map, from 1. */
  number: number;
  /** `soon` chapters appear on the map but cannot be opened yet. */
  status: "ready" | "soon";
  /** Scene builder key in `src/computing/scenes/index.ts`. */
  scene: string;
  icon: LessonIcon;
  theme: LevelTheme;
  title: Bilingual;
  /** Compact name for buttons and map labels. */
  short: Bilingual;
  /** One line saying what the chapter shows. */
  teaser: Bilingual;
  /** Empty while the chapter is `soon`. */
  steps: StepData[];
  /** Required once the chapter is `ready`. */
  source?: { label: string; url: string };
}

/** The chapter map: the section's welcome screen. */
export interface ComputingHome {
  scene: string;
  theme: LevelTheme;
}
