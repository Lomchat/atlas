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

/** The interactive part of a lesson, next to its scene builder. */
export interface LessonUi {
  createStore(): Store<object>;
  /** Controls and readouts pinned on the scene's anchors. */
  Overlay: ComponentType<OverlayProps>;
  /** Controls inside the step card ("Try it"), or null. */
  Controls: ComponentType<ControlsProps>;
}
