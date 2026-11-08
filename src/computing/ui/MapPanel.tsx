import { ArrowRight } from "lucide-react";
import type { CSSProperties } from "react";
import { t, tr, useLocale } from "../../i18n";
import { LESSONS, isReady } from "../index";
import type { LessonData } from "../types";
import { LessonIcon } from "./icons";

interface Props {
  compact: boolean;
  onOpen(lesson: LessonData): void;
}

/** The section's welcome screen: what it is about and every chapter. */
export default function MapPanel({ compact, onOpen }: Props) {
  useLocale();
  const first = LESSONS.find(isReady);
  return (
    <>
      <section className="card cs-map" aria-labelledby="cs-map-title">
        <div className="card-body">
          <p className="cs-kicker">{t("Computing")}</p>
          <h1 id="cs-map-title" className="cs-map-title">
            {t("From bits to AI")}
          </h1>
          {!compact && (
            <p className="cs-lead">
              {t(
                "How can a machine that only knows 0 and 1 write, calculate, keep a secret or answer you? Each chapter shows it step by step, with real examples.",
              )}
            </p>
          )}
          <ol className="cs-chapters" aria-label={t("Chapters")}>
            {LESSONS.map((lesson) => {
              const ready = isReady(lesson);
              return (
                <li key={lesson.id}>
                  <button
                    type="button"
                    className="cs-chapter"
                    data-lesson={lesson.id}
                    data-status={lesson.status}
                    disabled={!ready}
                    style={{ "--c": lesson.theme.accent } as CSSProperties}
                    onClick={() => onOpen(lesson)}
                  >
                    <span className="cs-chapter-icon">
                      <LessonIcon icon={lesson.icon} size={20} />
                    </span>
                    <span className="cs-chapter-text">
                      <b>
                        <span className="cs-chapter-number">{lesson.number}</span>
                        {tr(lesson.title)}
                      </b>
                      <small>{tr(lesson.teaser)}</small>
                    </span>
                    <span className="cs-chapter-badge">
                      {ready ? t("{n} steps", { n: lesson.steps.length }) : t("Coming soon")}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      </section>
      {first && (
        <div className="controls-row cs-start-row">
          <button type="button" className="control control-in cs-start" data-action="start" onClick={() => onOpen(first)}>
            <span className="control-text">
              <small>{t("Start")}</small>
              <b>{tr(first.title)}</b>
            </span>
            <ArrowRight size={20} strokeWidth={2.6} aria-hidden="true" />
          </button>
        </div>
      )}
    </>
  );
}
