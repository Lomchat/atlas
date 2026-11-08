import { bitsUi } from "./bits";
import { gatesUi } from "./gates";
import type { LessonUi } from "./types";

/** Interactive layer of each lesson, by lesson id. */
export const LESSON_UI: Record<string, LessonUi> = {
  bits: bitsUi,
  gates: gatesUi,
};
