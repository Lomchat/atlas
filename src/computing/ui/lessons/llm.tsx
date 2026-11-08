import { Plus, RotateCcw } from "lucide-react";
import { useId } from "react";
import { getLocale, t, tr, useLocale } from "../../../i18n";
import { CANDIDATES, EXAMPLE_SENTENCE, GENERATED, GENERATE_PROMPT, LLM_START, PRONOUN, PROMPT, SENTENCE, SMALL, attention, tokenize, withTemperature } from "../../logic/llm";
import type { LlmState } from "../../logic/llm";
import { Store, useStore } from "../../store";
import { useAnchors } from "../anchors";
import type { ControlsProps, LessonUi, OverlayProps } from "./types";

const useLlm = (store: Store<object>) => {
  const typed = store as Store<LlmState>;
  return [useStore(typed), (patch: Partial<LlmState>) => typed.set(patch)] as const;
};
const percent = (p: number) => Math.round(p * 100).toLocaleString(getLocale());

/** Words, numbers and percentages pinned on the scene. */
function Overlay({ stage, step, store }: OverlayProps) {
  useLocale();
  const [s] = useLlm(store);
  const pin = useAnchors(stage);

  if (step === "tokens")
    return (
      <>
        {tokenize(s.text ?? tr(EXAMPLE_SENTENCE)).map((token, i) => (
          <div key={`${i}:${token.text}`} ref={pin(`token-${i}`, `token-${i}`)} className="cs-anchor" data-visible="0">
            <span className="cs-token" data-token={i}>
              <b>{token.text.replace(/^ /, "␣")}</b>
              <small>{token.id}</small>
            </span>
          </div>
        ))}
      </>
    );

  if (step === "next") {
    const probabilities = withTemperature(s.temperature);
    return (
      <>
        <div ref={pin("prompt", "prompt")} className="cs-anchor" data-visible="0">
          <span className="cs-word cs-word-dark">{tr(PROMPT)}</span>
        </div>
        {CANDIDATES.map((candidate, i) => (
          <div key={i} ref={pin(`bar-${i}`, `bar-${i}`)} className="cs-anchor" data-visible="0">
            <span className="cs-bar-label" data-bar={i}>
              <b>{tr(candidate.word)}</b>
              <small>{t("{n}%", { n: percent(probabilities[i]) })}</small>
            </span>
          </div>
        ))}
      </>
    );
  }

  if (step === "attention") {
    const weights = attention(s.big);
    return (
      <>
        {SENTENCE.map((word, i) => (
          <div key={i} ref={pin(`word-${i}`, `word-${i}`)} className="cs-anchor" data-visible="0">
            <span className="cs-word" data-word={i} data-pronoun={i === PRONOUN || undefined}>
              {tr(i === SENTENCE.length - 1 && !s.big ? SMALL : word)}
              {weights[i] >= 0.1 && <small data-weight={i}>{t("{n}%", { n: percent(weights[i]) })}</small>}
            </span>
          </div>
        ))}
      </>
    );
  }

  if (step === "generate")
    return (
      <>
        <div ref={pin("gen-prompt", "gen-prompt")} className="cs-anchor" data-visible="0">
          <span className="cs-word cs-word-dark">{tr(GENERATE_PROMPT)}</span>
        </div>
        {GENERATED.map((token, i) => (
          <div key={i} ref={pin(`gen-${i}`, `gen-${i}`)} className="cs-anchor" data-visible="0">
            <span className="cs-word" data-generated={i}>
              {tr(token.word)}
              <small>{t("{n}%", { n: percent(token.p) })}</small>
            </span>
          </div>
        ))}
      </>
    );

  return null;
}

/** Fields, sliders and buttons inside the step card. */
function Controls({ step, store }: ControlsProps) {
  useLocale();
  const [s, set] = useLlm(store);
  const input = useId();
  const slider = useId();

  if (step === "tokens")
    return (
      <div className="cs-actions">
        <label className="cs-field cs-field-wide" htmlFor={input}>
          <span>{t("Type a sentence")}</span>
          <input
            id={input}
            data-input="sentence"
            value={s.text ?? tr(EXAMPLE_SENTENCE)}
            maxLength={80}
            autoComplete="off"
            spellCheck={false}
            onChange={(event) => set({ text: event.target.value })}
          />
        </label>
        <button type="button" className="cs-action" data-action="example" onClick={() => set({ text: null })}>
          <RotateCcw size={15} strokeWidth={2.6} aria-hidden="true" />
          {t("Example")}
        </button>
      </div>
    );

  if (step === "next")
    return (
      <div className="cs-sliders">
        <label className="cs-slider" htmlFor={slider}>
          <span>
            {t("Temperature")} <b>{s.temperature.toLocaleString(getLocale(), { minimumFractionDigits: 1 })}</b>
          </span>
          <input id={slider} type="range" min={0.1} max={2} step={0.1} value={s.temperature} data-input="temperature" onChange={(event) => set({ temperature: Number(event.target.value) })} />
        </label>
      </div>
    );

  if (step === "attention")
    return (
      <div className="cs-presets" role="group" aria-label={t("Examples")}>
        {[true, false].map((big) => (
          <button key={String(big)} type="button" className="cs-chip cs-chip-wide" data-preset={big ? "big" : "small"} aria-pressed={s.big === big} onClick={() => set({ big })}>
            {tr(big ? SENTENCE[SENTENCE.length - 1] : SMALL)}
          </button>
        ))}
      </div>
    );

  if (step === "generate")
    return (
      <div className="cs-actions">
        <button type="button" className="cs-action" data-action="next-token" disabled={s.generated >= GENERATED.length} onClick={() => set({ generated: s.generated + 1 })}>
          <Plus size={16} strokeWidth={2.8} aria-hidden="true" />
          {t("Next word")}
        </button>
        <button type="button" className="cs-action" data-action="restart" onClick={() => set({ generated: 0 })}>
          <RotateCcw size={15} strokeWidth={2.6} aria-hidden="true" />
          {t("Start again")}
        </button>
      </div>
    );

  return null;
}

export const llmUi: LessonUi = {
  createStore: () => new Store<LlmState>({ ...LLM_START }),
  Overlay,
  Controls,
};
