import { Gamepad2 } from "lucide-react";
import type { Ref } from "react";
import { t, tr, useLocale } from "../../i18n";
import type { StepData } from "../types";
import type { Store } from "../store";
import type { LessonUi } from "./lessons/types";

interface Props {
  step: StepData;
  ui: LessonUi | undefined;
  store: Store<object> | null;
  panelRef: Ref<HTMLElement>;
}

/**
 * "Your turn!": what the visitor can change at this step, above the scene
 * (top right on large screens), so it is clear the page is a toy to play with.
 */
export default function PlayPanel({ step, ui, store, panelRef }: Props) {
  useLocale();
  if (!step.try) return null;
  const Controls = ui?.Controls;
  return (
    <section className="cs-play" ref={panelRef} aria-labelledby="cs-play-title" data-step={step.id} key={step.id}>
      <p className="cs-play-title" id="cs-play-title">
        <Gamepad2 size={18} strokeWidth={2.6} aria-hidden="true" />
        {t("Your turn!")}
      </p>
      <p className="cs-play-text">{tr(step.try)}</p>
      {Controls && store && (
        <div className="cs-play-controls">
          <Controls step={step.id} store={store} />
        </div>
      )}
    </section>
  );
}
