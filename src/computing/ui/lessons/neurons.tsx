import { CloudRain, GraduationCap, RotateCcw, Umbrella } from "lucide-react";
import { useId } from "react";
import type { CSSProperties, ReactNode } from "react";
import { getLocale, t, useLocale } from "../../../i18n";
import { LEARN, NEURON, NEURONS_START, SCORES, THRESHOLD, learnState, neuron } from "../../logic/neurons";
import type { NeuronsState } from "../../logic/neurons";
import { Store, useStore } from "../../store";
import { useAnchors } from "../anchors";
import type { ControlsProps, LessonUi, OverlayProps, Vars } from "./types";

const useNeurons = (store: Store<object>) => {
  const typed = store as Store<NeuronsState>;
  return [useStore(typed), (patch: Partial<NeuronsState>) => typed.set(patch)] as const;
};
/** A decimal in the visitor's language, at most three decimals (0,98 / 0.98). */
const num = (x: number) => Number(x.toFixed(3)).toLocaleString(getLocale());

/** The neuron's numbers pinned on the scene. */
function Overlay({ stage, step, store }: OverlayProps) {
  useLocale();
  const [s] = useNeurons(store);
  const pin = useAnchors(stage);
  const chip = (key: string, content: ReactNode, extra: Record<string, string | undefined> = {}) => (
    <div key={key} ref={pin(key, key)} className="cs-anchor" data-visible="0">
      <span className="cs-readout cs-chip-readout" {...extra}>
        {content}
      </span>
    </div>
  );

  if (step === "neuron" || step === "weights" || step === "learn") {
    let w1: number = NEURON.cloudsWeight;
    let w2: number = NEURON.forecastWeight;
    let [clouds, forecast]: number[] = [s.clouds, s.forecast];
    if (step === "weights") (w2 = s.forecastWeight), (clouds = LEARN.clouds), (forecast = LEARN.forecast);
    if (step === "learn") {
      const l = learnState(s.lessons);
      (w1 = l.w1), (w2 = l.w2), (clouds = LEARN.clouds), (forecast = LEARN.forecast);
    }
    const { total, fires } = neuron(clouds, forecast, w1, w2);
    return (
      <>
        {chip("in-clouds", <>{t("Clouds")} <b>{num(clouds)}</b></>)}
        {chip("in-forecast", <>{t("Rain forecast")} <b>{num(forecast)}</b></>)}
        {chip("w-clouds", <>× {num(w1)}</>, { "data-readout": "w-clouds" })}
        {chip("w-forecast", <>× {num(w2)}</>, { "data-readout": "w-forecast" })}
        {chip("threshold", <>{t("More than {n}?", { n: THRESHOLD })}</>, { "data-readout": "threshold" })}
        {chip("total", <>{num(clouds)} × {num(w1)} + {num(forecast)} × {num(w2)} = <b>{num(total)}</b></>, { "data-readout": "total" })}
        {chip("umbrella", <><Umbrella size={16} strokeWidth={2.6} aria-hidden="true" />{fires ? t("Yes") : t("No")}</>, { "data-readout": "umbrella", "data-on": fires ? "" : undefined })}
      </>
    );
  }

  if (step === "network") {
    const scores = SCORES[s.digit];
    return (
      <>
        {scores.map((score, k) => (
          <div key={k} ref={pin(`out-${k}`, `out-${k}`)} className="cs-anchor" data-visible="0">
            <span className="cs-digit" data-digit={k} data-best={score === Math.max(...scores) || undefined}>
              {k}
            </span>
            {score >= 0.05 && (
              <span className="cs-score" data-score={k} style={{ "--length": score } as CSSProperties}>
                {t("{n}%", { n: Math.round(score * 100) })}
              </span>
            )}
          </div>
        ))}
      </>
    );
  }
  return null;
}

/** Sliders and buttons inside the step card. */
function Controls({ step, store }: ControlsProps) {
  useLocale();
  const [s, set] = useNeurons(store);
  const clouds = useId();
  const weight = useId();

  if (step === "neuron")
    return (
      <div className="cs-sliders">
        <label className="cs-slider" htmlFor={clouds}>
          <span>
            {t("Clouds")} <b>{num(s.clouds)}</b>
          </span>
          <input id={clouds} type="range" min={0} max={10} step={1} value={s.clouds} data-input="clouds" onChange={(event) => set({ clouds: Number(event.target.value) })} />
        </label>
        <button type="button" className="cs-action" data-action="forecast" aria-pressed={s.forecast === 1} onClick={() => set({ forecast: s.forecast ? 0 : 1 })}>
          <CloudRain size={16} strokeWidth={2.6} aria-hidden="true" />
          {t("Rain forecast")}
        </button>
      </div>
    );

  if (step === "weights")
    return (
      <div className="cs-sliders">
        <label className="cs-slider" htmlFor={weight}>
          <span>
            {t("Points for the forecast")} <b>{num(s.forecastWeight)}</b>
          </span>
          <input id={weight} type="range" min={0} max={10} step={1} value={s.forecastWeight} data-input="forecast-weight" onChange={(event) => set({ forecastWeight: Number(event.target.value) })} />
        </label>
      </div>
    );

  if (step === "learn")
    return (
      <div className="cs-actions">
        <button type="button" className="cs-action" data-action="learn" disabled={learnState(s.lessons).fires} onClick={() => set({ lessons: s.lessons + 1 })}>
          <GraduationCap size={16} strokeWidth={2.6} aria-hidden="true" />
          {t("Learn from the mistake")}
        </button>
        <button type="button" className="cs-action" data-action="restart" onClick={() => set({ lessons: 0 })}>
          <RotateCcw size={15} strokeWidth={2.6} aria-hidden="true" />
          {t("Start again")}
        </button>
      </div>
    );

  if (step === "network")
    return (
      <div className="cs-presets" role="group" aria-label={t("Examples")}>
        {([1, 4, 7] as const).map((digit) => (
          <button key={digit} type="button" className="cs-chip" data-preset={digit} aria-pressed={s.digit === digit} onClick={() => set({ digit })}>
            {digit}
          </button>
        ))}
      </div>
    );

  return null;
}

/** Live values of the worked examples. */
function vars(step: string, state: object): Vars {
  const s = state as NeuronsState;
  const decision = (fires: boolean) => (fires ? t("More than 10: take the umbrella!") : t("Not more than 10: no umbrella."));
  if (step === "neuron") {
    const { total, fires } = neuron(s.clouds, s.forecast, NEURON.cloudsWeight, NEURON.forecastWeight);
    return { clouds: s.clouds, forecast: s.forecast, total, decision: decision(fires) };
  }
  if (step === "weights") {
    const { total, fires } = neuron(LEARN.clouds, LEARN.forecast, NEURON.cloudsWeight, s.forecastWeight);
    return { weight: s.forecastWeight, total, decision: decision(fires) };
  }
  if (step === "learn") {
    const l = learnState(s.lessons);
    return { lessons: s.lessons, weight: l.w2, total: l.total, decision: decision(l.fires) };
  }
  if (step === "network") return { digit: s.digit, score: t("{n}%", { n: Math.round(Math.max(...SCORES[s.digit]) * 100) }) };
  return null;
}

export const neuronsUi: LessonUi = {
  createStore: () => new Store<NeuronsState>({ ...NEURONS_START }),
  Overlay,
  Controls,
  vars,
};
