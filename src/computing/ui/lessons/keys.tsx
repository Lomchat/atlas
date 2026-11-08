import { Eye, LockKeyhole, RotateCcw, X } from "lucide-react";
import { useId } from "react";
import type { ReactNode } from "react";
import { t, useLocale } from "../../../i18n";
import { DH, KEYS_START, RSA, exchange, lock, powMod, sign } from "../../logic/keys";
import type { KeysState } from "../../logic/keys";
import { Store, useStore } from "../../store";
import { useAnchors } from "../anchors";
import type { ControlsProps, LessonUi, OverlayProps } from "./types";

const useKeys = (store: Store<object>) => {
  const typed = store as Store<KeysState>;
  return [useStore(typed), (patch: Partial<KeysState>) => typed.set(patch)] as const;
};

/** base^exponent → result, written with a superscript. */
function Power({ base, exponent, result }: { base: number; exponent: number; result: number }) {
  return (
    <span className="cs-power">
      {base}
      <sup>{exponent}</sup> → <b>{result}</b>
    </span>
  );
}

/** Numbers pinned on the people, the tokens, the clock and the box. */
function Overlay({ stage, step, store }: OverlayProps) {
  useLocale();
  const [s] = useKeys(store);
  const pin = useAnchors(stage);
  const chip = (key: string, anchor: string, content: ReactNode, extra: Record<string, string> = {}) => (
    <div key={key} ref={pin(key, anchor)} className="cs-anchor" data-visible="0">
      <span className="cs-readout cs-chip-readout" {...extra}>
        {content}
      </span>
    </div>
  );
  const secret = (who: "alice" | "bob", value: number) =>
    chip(`secret-${who}`, `secret-${who}`, (
      <>
        <LockKeyhole size={15} strokeWidth={2.6} aria-hidden="true" />
        {value}
      </>
    ), { "data-readout": `secret-${who}`, "data-secret": "" });

  if (step === "clock") {
    const hour = powMod(DH.g, s.power, DH.p);
    const visited = new Set([1, ...Array.from({ length: s.power }, (_, k) => powMod(DH.g, k + 1, DH.p))]);
    return (
      <>
        {Array.from({ length: DH.p }, (_, h) => (
          <div key={h} ref={pin(`tick-${h}`, `tick-${h}`)} className="cs-anchor" data-visible="0">
            <span className="cs-hour" data-visited={visited.has(h) || undefined} data-current={h === hour || undefined}>
              {h}
            </span>
          </div>
        ))}
        {chip("power", "power", <Power base={DH.g} exponent={s.power} result={hour} />, { "data-readout": "power" })}
      </>
    );
  }

  if (step === "exchange" || step === "shared") {
    const x = exchange(s.alice, s.bob);
    return (
      <>
        {secret("alice", s.alice)}
        {secret("bob", s.bob)}
        {chip("token-a", "token-a", x.fromAlice, { "data-readout": "token-a" })}
        {chip("token-b", "token-b", x.fromBob, { "data-readout": "token-b" })}
        {chip("eve-notes", "eve-notes", (
          <>
            <Eye size={15} strokeWidth={2.6} aria-hidden="true" />
            {[DH.p, DH.g, x.fromAlice, x.fromBob].join(" · ")}
            {step === "shared" && <X size={15} strokeWidth={2.8} aria-hidden="true" className="cs-eve-fail" />}
          </>
        ), { "data-readout": "eve" })}
        {step === "shared" && chip("key-alice", "key-alice", <Power base={x.fromBob} exponent={s.alice} result={x.aliceKey} />, { "data-readout": "key-alice", "data-key": "" })}
        {step === "shared" && chip("key-bob", "key-bob", <Power base={x.fromAlice} exponent={s.bob} result={x.bobKey} />, { "data-readout": "key-bob", "data-key": "" })}
      </>
    );
  }

  if (step === "padlock" || step === "signature") {
    const locking = step === "padlock";
    const sealed = locking ? lock(s.message) : sign(s.message);
    return (
      <>
        {chip("key-public", "key-public", t("Bob’s public key: {k}", { k: RSA.e }), { "data-readout": "key-public" })}
        {chip("key-private", "key-private", t("Bob’s private key: {k}", { k: RSA.d }), { "data-readout": "key-private" })}
        {chip("cipher", "cipher", <b>{sealed}</b>, { "data-readout": "cipher" })}
        {locking ? (
          <>
            {chip("plain-left", "plain-left", <Power base={s.message} exponent={RSA.e} result={sealed} />, { "data-readout": "lock" })}
            {chip("plain-right", "plain-right", <Power base={sealed} exponent={RSA.d} result={s.message} />, { "data-readout": "unlock" })}
          </>
        ) : (
          <>
            {chip("plain-right", "plain-right", <Power base={s.message} exponent={RSA.d} result={sealed} />, { "data-readout": "sign" })}
            {chip("plain-left", "plain-left", <Power base={sealed} exponent={RSA.e} result={s.message} />, { "data-readout": "verify" })}
          </>
        )}
      </>
    );
  }
  return null;
}

function Slider({ label, value, min, max, name, onChange }: { label: string; value: number; min: number; max: number; name: string; onChange(value: number): void }) {
  const id = useId();
  return (
    <label className="cs-slider" htmlFor={id}>
      <span>
        {label} <b>{value}</b>
      </span>
      <input id={id} type="range" min={min} max={max} value={value} data-input={name} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

/** Buttons and sliders inside the step card. */
function Controls({ step, store }: ControlsProps) {
  useLocale();
  const [s, set] = useKeys(store);

  if (step === "clock")
    return (
      <div className="cs-actions">
        <button type="button" className="cs-action" data-action="times-five" disabled={s.power >= DH.p - 1} onClick={() => set({ power: s.power + 1 })}>
          {t("Multiply by 5")}
        </button>
        <button type="button" className="cs-action" data-action="restart" onClick={() => set({ power: 1 })}>
          <RotateCcw size={15} strokeWidth={2.6} aria-hidden="true" />
          {t("Start again")}
        </button>
      </div>
    );

  if (step === "exchange" || step === "shared")
    return (
      <div className="cs-sliders">
        <Slider label={t("Alice’s secret")} name="alice" value={s.alice} min={1} max={DH.p - 1} onChange={(alice) => set({ alice })} />
        <Slider label={t("Bob’s secret")} name="bob" value={s.bob} min={1} max={DH.p - 1} onChange={(bob) => set({ bob })} />
      </div>
    );

  if (step === "padlock" || step === "signature")
    return (
      <div className="cs-sliders">
        <Slider label={t("Message")} name="message" value={s.message} min={2} max={RSA.n - 1} onChange={(message) => set({ message })} />
      </div>
    );

  return null;
}

export const keysUi: LessonUi = {
  createStore: () => new Store<KeysState>({ ...KEYS_START }),
  Overlay,
  Controls,
};
