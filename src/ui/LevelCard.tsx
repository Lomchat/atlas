import { ChevronDown, ChevronLeft, ChevronRight, ExternalLink, Lightbulb } from "lucide-react";
import { useEffect, useState } from "react";
import { t, tr, useLocale } from "../i18n";
import type { LevelData } from "../levels/types";
import { formatLength, magnitude } from "./format";
import { JourneyIcon } from "./icons";

interface Props {
  level: LevelData;
  compact: boolean;
}

export default function LevelCard({ level, compact }: Props) {
  useLocale();
  const [fact, setFact] = useState(0);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    setFact(0);
  }, [level.id]);
  const facts = level.facts;
  const size = level.sizeText ? tr(level.sizeText) : `≈ ${formatLength(level.size)}`;
  const expanded = !compact || open;

  return (
    <section className="card" data-journey={level.journey} aria-live="polite">
      <div className="card-body" key={level.id}>
        <p className="card-meta">
          <span className="card-power">{magnitude(level.size)}</span>
          <span className="card-size">{size}</span>
        </p>
        <h1 className="card-title">
          <JourneyIcon journey={level.journey} size={compact ? 18 : 22} />
          <span>{tr(level.title)}</span>
        </h1>
        <p className="card-compare">{tr(level.compare)}</p>
        <p className="card-hook">{tr(level.hook)}</p>
        {compact && (
          <button
            type="button"
            className="card-toggle"
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
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
                <button
                  type="button"
                  aria-label={t("Previous fact")}
                  onClick={() => setFact((fact + facts.length - 1) % facts.length)}
                >
                  <ChevronLeft size={16} aria-hidden="true" />
                </button>
                <span className="card-fact-dots" aria-hidden="true">
                  {facts.map((_, k) => (
                    <i key={k} data-active={k === fact % facts.length || undefined} />
                  ))}
                </span>
                <button
                  type="button"
                  aria-label={t("Next fact")}
                  onClick={() => setFact((fact + 1) % facts.length)}
                >
                  <ChevronRight size={16} aria-hidden="true" />
                </button>
              </div>
            )}
          </div>
        )}
        {expanded && (
          <a className="card-source" href={level.source.url} target="_blank" rel="noreferrer">
            {t("Source: {label}", { label: level.source.label })}
            <ExternalLink size={12} aria-hidden="true" />
          </a>
        )}
      </div>
    </section>
  );
}
