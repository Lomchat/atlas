import { ArrowRight, Mouse, Play } from "lucide-react";
import { useEffect, useRef } from "react";
import { t, useLocale } from "../i18n";
import type { MessageKey } from "../i18n";
import { HOME_ID } from "../levels";
import type { Journey } from "../levels/types";
import { JourneyIcon, LogoMark } from "./icons";

const CHOICES: { id: string; journey: Journey; name: MessageKey; hint: MessageKey }[] = [
  { id: "person", journey: "body", name: "You", hint: "Down to your DNA" },
  { id: "c-atom", journey: "matter", name: "An atom", hint: "Down to the quarks" },
  { id: "universe", journey: "cosmos", name: "The Universe", hint: "Out to the galaxies" },
];

interface Props {
  onStart(target: string | null, tour: boolean): void;
}

export default function Intro({ onStart }: Props) {
  useLocale();
  const first = useRef<HTMLButtonElement>(null);
  useEffect(() => first.current?.focus(), []);
  const touch = matchMedia("(pointer: coarse)").matches;
  return (
    <div
      className="intro"
      role="dialog"
      aria-modal="true"
      aria-labelledby="intro-title"
      onClick={(event) => event.target === event.currentTarget && onStart(null, false)}
    >
      <div className="intro-panel">
        <LogoMark size={52} />
        <p className="intro-kicker">{t("A journey through every power of ten")}</p>
        <h1 id="intro-title">{t("From quarks to the cosmos")}</h1>
        <p className="intro-lead">
          {t(
            "Everything around you is made of something smaller, and is part of something bigger. Zoom in or out, one power of ten at a time.",
          )}
        </p>
        <p className="intro-choose">{t("Where do you want to start?")}</p>
        <button
          ref={first}
          type="button"
          className="intro-featured"
          data-journey="home"
          data-level={HOME_ID}
          onClick={() => onStart(HOME_ID, false)}
        >
          <span className="intro-featured-image" aria-hidden="true" />
          <span className="intro-featured-text">
            <span className="intro-badge">{t("Recommended")}</span>
            <b>{t("The park")}</b>
            <small>{t("Start here, halfway between atoms and galaxies")}</small>
          </span>
          <ArrowRight className="intro-featured-arrow" size={24} strokeWidth={2.6} aria-hidden="true" />
        </button>
        <div className="intro-choices">
          {CHOICES.map((choice) => (
            <button
              key={choice.id}
              type="button"
              className="intro-choice"
              data-journey={choice.journey}
              data-level={choice.id}
              onClick={() => onStart(choice.id, false)}
            >
              <span className="intro-choice-icon">
                <JourneyIcon journey={choice.journey} size={26} />
              </span>
              <b>{t(choice.name)}</b>
              <small>{t(choice.hint)}</small>
            </button>
          ))}
        </div>
        <div className="intro-actions">
          <button type="button" className="intro-tour" data-action="intro-tour" onClick={() => onStart("person", true)}>
            <Play size={18} strokeWidth={2.6} aria-hidden="true" />
            {t("Take the guided tour")}
          </button>
          <button type="button" className="intro-free" data-action="intro-free" onClick={() => onStart(null, false)}>
            {t("Explore freely")}
          </button>
        </div>
        <p className="intro-hint">
          <Mouse size={16} aria-hidden="true" />
          {touch
            ? t("Pinch to zoom · Drag to look around · Tap a label to dive")
            : t("Scroll to zoom · Drag to look around · Click a label to dive")}
        </p>
      </div>
    </div>
  );
}
