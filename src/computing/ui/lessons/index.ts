import { bitsUi } from "./bits";
import { gatesUi } from "./gates";
import { insideUi } from "./inside";
import { keysUi } from "./keys";
import { llmUi } from "./llm";
import { neuronsUi } from "./neurons";
import type { LessonUi } from "./types";

/** Interactive layer of each lesson, by lesson id. */
export const LESSON_UI: Record<string, LessonUi> = {
  bits: bitsUi,
  gates: gatesUi,
  inside: insideUi,
  keys: keysUi,
  llm: llmUi,
  neurons: neuronsUi,
};
