import type { ComponentType } from "react";
import type { Stage } from "../../Stage";
import type { Store } from "../../store";

export interface OverlayProps {
  stage: Stage | null;
  /** Current step id. */
  step: string;
  store: Store<object>;
}

export interface ControlsProps {
  step: string;
  store: Store<object>;
}

/** Values for the `{name}` placeholders of a step's example. */
export type Vars = Record<string, string | number> | null;

/** The interactive part of a lesson, next to its scene builder. */
export interface LessonUi {
  createStore(): Store<object>;
  /** Controls and readouts pinned on the scene's anchors. */
  Overlay: ComponentType<OverlayProps>;
  /** Controls of the "Your turn!" panel, or null. */
  Controls: ComponentType<ControlsProps>;
  /** Values for the `{name}` placeholders of a step's example, from the lesson state. */
  vars?(step: string, state: object, locale: string): Vars;
}
