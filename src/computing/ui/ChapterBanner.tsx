import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { t, tr, useLocale } from "../../i18n";
import type { LessonData } from "../types";
import { LessonIcon } from "./icons";

interface Props {
  lesson: LessonData;
  /** The chapter just finished, if the visitor came from one. */
  previous: LessonData | null;
  onDone(): void;
}

/**
 * A short title card between chapters, so that moving on to a new chapter
 * never looks like just another step. It leaves by itself, on a click or on
 * any key.
 */
export default function ChapterBanner({ lesson, previous, onDone }: Props) {
  useLocale();
  const [leaving, setLeaving] = useState(false);
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const stay = reduced ? 1400 : 2900;

  useEffect(() => {
    if (leaving) {
      const timer = setTimeout(onDone, reduced ? 150 : 420);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => setLeaving(true), stay);
    const skip = () => setLeaving(true);
    window.addEventListener("keydown", skip);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", skip);
    };
  }, [leaving, onDone, reduced, stay]);

  return (
    <div
      className="cs-banner"
      role="status"
      aria-live="polite"
      data-banner={lesson.id}
      data-leaving={leaving || undefined}
      style={{ "--c": lesson.theme.accent, "--stay": `${stay}ms` } as CSSProperties}
      onClick={() => setLeaving(true)}
    >
      <div className="cs-banner-card">
        {previous && (
          <p className="cs-banner-done">
            <Check size={16} strokeWidth={3} aria-hidden="true" />
            {t("Chapter {n} complete", { n: previous.number })}
          </p>
        )}
        <span className="cs-banner-icon">
          <LessonIcon icon={lesson.icon} size={46} />
          <span className="cs-banner-number">{lesson.number}</span>
        </span>
        <p className="cs-banner-kicker">{t("Chapter {n}", { n: lesson.number })}</p>
        <h2 className="cs-banner-title">{tr(lesson.title)}</h2>
        <p className="cs-banner-teaser">{tr(lesson.teaser)}</p>
        <p className="cs-banner-steps">{t("{n} steps", { n: lesson.steps.length })}</p>
        <span className="cs-banner-progress" aria-hidden="true" />
      </div>
    </div>
  );
}
