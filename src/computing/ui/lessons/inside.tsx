import type { CSSProperties } from "react";
import { useLocale } from "../../../i18n";
import { formatLength } from "../../../ui/format";
import { INSIDE_STEPS, VIEWS, barUnits } from "../../logic/inside";
import type { InsideStep } from "../../logic/inside";
import { Store } from "../../store";
import { useAnchors } from "../anchors";
import type { LessonUi, OverlayProps } from "./types";

/** A scale bar with the real length it stands for, at every step of the dive. */
function Overlay({ stage, step }: OverlayProps) {
  useLocale();
  const pin = useAnchors(stage);
  if (!INSIDE_STEPS.includes(step as InsideStep)) return null;
  const view = VIEWS[step as InsideStep];
  return (
    <div ref={pin("scale", "scale")} className="cs-anchor" data-visible="0">
      <span className="cs-scale" data-readout="scale" style={{ "--units": barUnits(step as InsideStep) } as CSSProperties}>
        <i aria-hidden="true" />
        <b>{formatLength(view.bar)}</b>
      </span>
    </div>
  );
}

export const insideUi: LessonUi = {
  createStore: () => new Store({}),
  Overlay,
  Controls: () => null,
};
