import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  LayoutGrid,
  Lightbulb,
  MousePointerClick,
  Pause,
  Play,
} from "lucide-react";
import { useEffect, useState } from "react";
import { t, tr, useLocale } from "../../i18n";
import { stepSource } from "../index";
import type { LessonData } from "../types";
import type { Store } from "../store";
import { LessonIcon } from "./icons";
import type { LessonUi } from "./lessons/types";

interface Props {
  lesson: LessonData;
  index: number;
  next: LessonData | undefined;
  compact: boolean;
  touring: boolean;
  ui: LessonUi | undefined;
  store: Store<object> | null;
  onStep(index: number): void;
  onNextLesson(lesson: LessonData): void;
  onMap(): void;
  onTour(): void;
}

/** The step card (text, worked example, things to try) and its navigation. */
export default function StepPanel({ lesson, index, next, compact, touring, ui, store, onStep, onNextLesson, onMap, onTour }: Props) {
  useLocale();
  const step = lesson.steps[index];
  const count = lesson.steps.length;
  const [fact, setFact] = useState(0);
  const [open, setOpen] = useState(false);
  useEffect(() => setFact(0), [lesson.id, step.id]);
  const facts = step.facts;
  const expanded = !compact || open;
  const source = stepSource(lesson, step);
  const previous = index > 0 ? lesson.steps[index - 1] : undefined;
  const following = index + 1 < count ? lesson.steps[index + 1] : undefined;
  const Controls = ui?.Controls;

  return (
    <>
      <section className="card cs-step" data-step={step.id} aria-live="polite">
        <div className="card-body" key={`${lesson.id}:${step.id}`}>
          <p className="card-meta">
            <span className="card-power">{t("Chapter {n}", { n: lesson.number })}</span>
            <span className="cs-step-count">{t("Step {k} of {n}", { k: index + 1, n: count })}</span>
          </p>
          <h1 className="card-title">
            <LessonIcon icon={lesson.icon} size={compact ? 18 : 22} />
            <span>{tr(step.title)}</span>
          </h1>
          <p className="card-hook">{tr(step.text)}</p>
          <div className="cs-example">
            <p className="cs-example-title">{t("Example")}</p>
            <p className="cs-example-text">{tr(step.example)}</p>
          </div>
          {step.try && (
            <div className="cs-try">
              <p className="cs-try-text">
                <MousePointerClick size={16} aria-hidden="true" />
                {tr(step.try)}
              </p>
              {Controls && store && <Controls step={step.id} store={store} />}
            </div>
          )}
          {compact && facts.length > 0 && (
            <button type="button" className="card-toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
              <Lightbulb size={16} aria-hidden="true" />
              <span>{t("Did you know?")}</span>
              <ChevronDown size={16} aria-hidden="true" className="card-toggle-chevron" />
            </button>
          )}
          {expanded && facts.length > 0 && (
            <div className="card-fact">
              {!compact && (
                <p className="card-fact-title">
                  <Lightbulb size={16} aria-hidden="true" />
                  {t("Did you know?")}
                </p>
              )}
              <p className="card-fact-text" key={fact}>
                {tr(facts[fact % facts.length])}
              </p>
              {facts.length > 1 && (
                <div className="card-fact-nav">
                  <button type="button" aria-label={t("Previous fact")} onClick={() => setFact((fact + facts.length - 1) % facts.length)}>
                    <ChevronLeft size={16} aria-hidden="true" />
                  </button>
                  <span className="card-fact-dots" aria-hidden="true">
                    {facts.map((_, k) => (
                      <i key={k} data-active={k === fact % facts.length || undefined} />
                    ))}
                  </span>
                  <button type="button" aria-label={t("Next fact")} onClick={() => setFact((fact + 1) % facts.length)}>
                    <ChevronRight size={16} aria-hidden="true" />
                  </button>
                </div>
              )}
            </div>
          )}
          {expanded && source && (
            <a className="card-source" href={source.url} target="_blank" rel="noreferrer">
              {t("Source: {label}", { label: source.label })}
              <ExternalLink size={12} aria-hidden="true" />
            </a>
          )}
        </div>
      </section>
      <div className="controls-row">
        {previous ? (
          <button
            type="button"
            className="control control-out"
            data-action="prev"
            aria-label={t("Previous step: {name}", { name: tr(previous.title) })}
            onClick={() => onStep(index - 1)}
          >
            <ArrowLeft size={20} strokeWidth={2.6} aria-hidden="true" />
            <span className="control-text">
              <small>{t("Back")}</small>
              <b>{tr(previous.title)}</b>
            </span>
          </button>
        ) : (
          <button type="button" className="control control-out" data-action="chapters" onClick={onMap}>
            <LayoutGrid size={19} strokeWidth={2.6} aria-hidden="true" />
            <span className="control-text">
              <small>{t("Back")}</small>
              <b>{t("Chapters")}</b>
            </span>
          </button>
        )}
        <button
          type="button"
          className="control control-tour"
          data-action="tour"
          aria-pressed={touring}
          aria-label={touring ? t("Pause the guided tour") : t("Start the guided tour")}
          title={touring ? t("Pause the guided tour") : t("Start the guided tour")}
          onClick={onTour}
        >
          {touring ? <Pause size={22} strokeWidth={2.6} aria-hidden="true" /> : <Play size={22} strokeWidth={2.6} aria-hidden="true" />}
        </button>
        {following ? (
          <button
            type="button"
            className="control control-in"
            data-action="next"
            aria-label={t("Next step: {name}", { name: tr(following.title) })}
            onClick={() => onStep(index + 1)}
          >
            <span className="control-text">
              <small>{t("Next")}</small>
              <b>{tr(following.title)}</b>
            </span>
            <ArrowRight size={20} strokeWidth={2.6} aria-hidden="true" />
          </button>
        ) : next ? (
          <button type="button" className="control control-in" data-action="next-lesson" onClick={() => onNextLesson(next)}>
            <span className="control-text">
              <small>{t("Next chapter")}</small>
              <b>{tr(next.title)}</b>
            </span>
            <ArrowRight size={20} strokeWidth={2.6} aria-hidden="true" />
          </button>
        ) : (
          <button type="button" className="control control-in" data-action="chapters-end" onClick={onMap}>
            <span className="control-text">
              <small>{t("Well done!")}</small>
              <b>{t("Chapters")}</b>
            </span>
            <LayoutGrid size={19} strokeWidth={2.6} aria-hidden="true" />
          </button>
        )}
      </div>
    </>
  );
}
