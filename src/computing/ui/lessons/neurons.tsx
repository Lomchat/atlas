import { CloudRain, GraduationCap, RotateCcw, Umbrella } from "lucide-react";
import { useId } from "react";
import type { CSSProperties, ReactNode } from "react";
import { getLocale, t, useLocale } from "../../../i18n";
import { NEURON, NEURONS_START, SCORES, learnState, neuron } from "../../logic/neurons";
import type { NeuronsState } from "../../logic/neurons";
import { Store, useStore } from "../../store";
import { useAnchors } from "../anchors";
import type { ControlsProps, LessonUi, OverlayProps } from "./types";

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
    let bias: number = NEURON.bias;
    let [clouds, forecast] = [s.clouds, s.forecast];
    if (step === "weights") (w2 = s.forecastWeight), (clouds = 0.8), (forecast = 1);
    if (step === "learn") {
      const l = learnState(s.learned);
      (w1 = l.w1), (w2 = l.w2), (bias = l.bias), (clouds = 0.8), (forecast = 1);
    }
    const { total, fires } = neuron(clouds, forecast, w1, w2, bias);
    return (
      <>
        {chip("in-clouds", <>{t("Clouds")} <b>{num(clouds)}</b></>)}
        {chip("in-forecast", <>{t("Rain forecast")} <b>{num(forecast)}</b></>)}
        {chip("w-clouds", <>× {num(w1)}</>, { "data-readout": "w-clouds" })}
        {chip("w-forecast", <>× {num(w2)}</>, { "data-readout": "w-forecast" })}
        {chip("bias", <>{num(bias)}</>, { "data-readout": "bias" })}
        {chip("total", <>{num(clouds)} × {num(w1)} + {num(forecast)} × {num(w2)} {bias < 0 ? "−" : "+"} {num(Math.abs(bias))} = <b>{num(total)}</b></>, { "data-readout": "total" })}
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
          <input id={clouds} type="range" min={0} max={1} step={0.1} value={s.clouds} data-input="clouds" onChange={(event) => set({ clouds: Number(event.target.value) })} />
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
            {t("Weight of the forecast")} <b>{num(s.forecastWeight)}</b>
          </span>
          <input id={weight} type="range" min={0} max={2} step={0.1} value={s.forecastWeight} data-input="forecast-weight" onChange={(event) => set({ forecastWeight: Number(event.target.value) })} />
        </label>
      </div>
    );

  if (step === "learn")
    return (
      <div className="cs-actions">
        <button type="button" className="cs-action" data-action="learn" disabled={s.learned} onClick={() => set({ learned: true })}>
          <GraduationCap size={16} strokeWidth={2.6} aria-hidden="true" />
          {t("Learn from the mistake")}
        </button>
        <button type="button" className="cs-action" data-action="restart" onClick={() => set({ learned: false })}>
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

export const neuronsUi: LessonUi = {
  createStore: () => new Store<NeuronsState>({ ...NEURONS_START }),
  Overlay,
  Controls,
};
