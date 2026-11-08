import { t, tr, useLocale } from "../../i18n";
import type { LessonData } from "../types";

interface Props {
  lesson: LessonData;
  index: number;
  seen: ReadonlySet<string>;
  onStep(index: number): void;
}

/** The steps of the chapter, top to bottom, on the right edge (like the scale ruler). */
export default function StepRail({ lesson, index, seen, onStep }: Props) {
  useLocale();
  return (
    <nav className="cs-rail" aria-label={t("Steps of the chapter")}>
      <ol>
        {lesson.steps.map((step, k) => (
          <li key={step.id}>
            <button
              type="button"
              className="cs-rail-stop"
              data-step-stop={step.id}
              data-current={k === index || undefined}
              data-seen={seen.has(`${lesson.id}:${step.id}`) || undefined}
              aria-current={k === index ? "step" : undefined}
              aria-label={t("Go to step {k}: {name}", { k: k + 1, name: tr(step.title) })}
              onClick={() => onStep(k)}
            >
              <span className="cs-rail-number" aria-hidden="true">
                {k + 1}
              </span>
              <span className="cs-rail-name" aria-hidden="true">
                {tr(step.title)}
              </span>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}
