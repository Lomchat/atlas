/**
 * The computing lessons. Pure data utilities: no Three.js, no DOM.
 * Imported by the app and, through Node type stripping, by the test scripts.
 */
import type { ComputingHome, LessonData, StepData } from "./types.ts";
import { bitsLesson } from "./data/bits.ts";
import { gatesLesson } from "./data/gates.ts";
import { keysLesson } from "./data/keys.ts";
import { upcomingLessons } from "./data/upcoming.ts";

export const LESSONS: readonly LessonData[] = [bitsLesson, gatesLesson, keysLesson, ...upcomingLessons].sort(
  (a, b) => a.number - b.number,
);

export const lessonById = new Map(LESSONS.map((lesson) => [lesson.id, lesson]));

/** The chapter map shown when no lesson is open. */
export const COMPUTING_HOME: ComputingHome = {
  scene: "board",
  theme: { top: "#120a3d", bottom: "#3b1d86", accent: "#ffd23f", dust: "#8f7bff" },
};

export const isReady = (lesson: LessonData | undefined): boolean =>
  !!lesson && lesson.status === "ready" && lesson.steps.length > 0;

/** Index of a step id in its lesson (0 when unknown). */
export function stepIndex(lesson: LessonData, id: string | null | undefined) {
  const index = lesson.steps.findIndex((step) => step.id === id);
  return index < 0 ? 0 : index;
}

/** The next chapter that can be opened after `lesson`, if any. */
export function nextLesson(lesson: LessonData): LessonData | undefined {
  return LESSONS.find((other) => other.number > lesson.number && isReady(other));
}

export const stepTheme = (lesson: LessonData, step: StepData | undefined) => step?.theme ?? lesson.theme;
export const stepSource = (lesson: LessonData, step: StepData | undefined) => step?.source ?? lesson.source;
