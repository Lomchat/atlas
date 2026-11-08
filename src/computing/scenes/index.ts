import type { StageBuilder } from "./types";

type Loader = () => Promise<{ default: StageBuilder }>;

/** Lesson scenes, loaded lazily and independently (see `Stage`). */
export const STAGE_SCENES: Record<string, Loader> = {
  board: () => import("./board"),
  bits: () => import("./bits"),
  gates: () => import("./gates"),
  inside: () => import("./inside"),
  keys: () => import("./keys"),
  llm: () => import("./llm"),
  neurons: () => import("./neurons"),
};
