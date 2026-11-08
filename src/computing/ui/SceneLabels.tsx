import { ArrowRight } from "lucide-react";
import type { CSSProperties } from "react";
import { t, tr, useLocale } from "../../i18n";
import { LESSONS, isReady } from "../index";
import type { LessonData, StepLabel } from "../types";
import type { Stage } from "../Stage";
import { useAnchors } from "./anchors";
import { LessonIcon } from "./icons";

/** One label per chapter above its station on the board. */
export function StationLabels({ stage, onOpen }: { stage: Stage | null; onOpen(lesson: LessonData): void }) {
  useLocale();
  const pin = useAnchors(stage);
  return (
    <div className="cs-layer">
      {LESSONS.map((lesson) => {
        const ready = isReady(lesson);
        return (
          <div
            key={lesson.id}
            ref={pin(lesson.id, `lesson-${lesson.id}`)}
            className="cs-anchor"
            data-visible="0"
            style={{ "--c": lesson.theme.accent } as CSSProperties}
          >
            {ready ? (
              <button
                type="button"
                className="cs-station"
                data-station={lesson.id}
                aria-label={t("Open the chapter {name}", { name: tr(lesson.title) })}
                onClick={() => onOpen(lesson)}
              >
                <span className="cs-station-number">{lesson.number}</span>
                <span>{tr(lesson.short)}</span>
                <ArrowRight size={14} strokeWidth={2.8} aria-hidden="true" />
              </button>
            ) : (
              <span className="cs-station" data-station={lesson.id} data-soon="">
                <LessonIcon icon={lesson.icon} size={13} />
                <span>{tr(lesson.short)}</span>
                <small>{t("Coming soon")}</small>
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Words of the current step, pinned where they belong in the scene. */
export function StepLabels({ stage, labels }: { stage: Stage | null; labels: readonly StepLabel[] }) {
  useLocale();
  const pin = useAnchors(stage);
  return (
    <div className="cs-layer">
      {labels.map((label) => (
        <div key={label.anchor} ref={pin(label.anchor, label.anchor)} className="cs-anchor" data-visible="0">
          <span className="cs-label" data-label={label.anchor} data-place={label.place ?? "above"}>
            {tr(label.text)}
          </span>
        </div>
      ))}
    </div>
  );
}
