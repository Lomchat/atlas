import { Eye, KeyRound, LockKeyhole, RotateCcw, X } from "lucide-react";
import { useId } from "react";
import type { ReactNode } from "react";
import { t, tr, useLocale } from "../../../i18n";
import { CLOCK, EXAMPLE_MESSAGE, KEYS_START, MAX_LETTERS, START, cleanMessage, clockTrail, exchange, onClock, plainPower, shiftText } from "../../logic/keys";
import type { KeysState } from "../../logic/keys";
import { Store, useStore } from "../../store";
import { useAnchors } from "../anchors";
import type { ControlsProps, LessonUi, OverlayProps, Vars } from "./types";

const SUP: Record<string, string> = { "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹" };
/** "2³" */
const pow = (base: number, exponent: number) => `${base}${String(exponent).replace(/\d/g, (d) => SUP[d])}`;
/** "2⁴ = 16 → 5" on the 11-hour clock (the plain power is left out when it gets big). */
const calc = (base: number, exponent: number) => {
  const plain = plainPower(base, exponent);
  const result = onClock(base, exponent);
  return plain === null ? `${pow(base, exponent)} → ${result}` : plain === result ? `${pow(base, exponent)} = ${result}` : `${pow(base, exponent)} = ${plain} → ${result}`;
};

const useKeys = (store: Store<object>) => {
  const typed = store as Store<KeysState>;
  return [useStore(typed), (patch: Partial<KeysState>) => typed.set(patch)] as const;
};
const messageOf = (s: KeysState) => s.message ?? tr(EXAMPLE_MESSAGE);
const sharedKey = (s: KeysState) => exchange(s.alice, s.bob).aliceKey;

/** Letters, numbers and notes pinned on the scene. */
function Overlay({ stage, step, store }: OverlayProps) {
  useLocale();
  const [s] = useKeys(store);
  const pin = useAnchors(stage);
  const chip = (key: string, content: ReactNode, extra: Record<string, string> = {}, anchor = key) => (
    <div key={key} ref={pin(key, anchor)} className="cs-anchor" data-visible="0">
      <span className="cs-readout cs-chip-readout" {...extra}>
        {content}
      </span>
    </div>
  );
  const tile = (index: number, letter: string) => (
    <div key={`tile-${index}`} ref={pin(`tile-${index}`, `tile-${index}`)} className="cs-anchor" data-visible="0">
      <span className="cs-letter" data-tile={index}>
        {letter}
      </span>
    </div>
  );
  const notes = (seen: string, unreadable = false) =>
    chip("eve-notes", (
      <>
        <Eye size={14} strokeWidth={2.6} aria-hidden="true" />
        <b>{seen}</b>
        {unreadable && <X size={15} strokeWidth={2.8} aria-hidden="true" className="cs-eve-fail" />}
      </>
    ), { "data-readout": "eve", "data-notes": "" });
  const message = messageOf(s);

  if (step === "problem")
    return (
      <>
        {chip("know-alice", message, { "data-readout": "alice-message", "data-know": "" })}
        {[...message].map((letter, k) => tile(k, letter))}
        {notes(message)}
      </>
    );

  if (step === "shift") {
    const cipher = shiftText(message, s.shift);
    return (
      <>
        {[...message].map((letter, k) => tile(k, letter))}
        {[...cipher].map((letter, k) => tile(k + MAX_LETTERS, letter))}
        {chip("shift-key", <><KeyRound size={15} strokeWidth={2.6} aria-hidden="true" />+{s.shift}</>, { "data-readout": "shift", "data-key": "" })}
      </>
    );
  }

  if (step === "clock") {
    const trail = new Set(clockTrail(s.power));
    const hour = onClock(START, s.power);
    return (
      <>
        {Array.from({ length: CLOCK }, (_, h) => (
          <div key={h} ref={pin(`tick-${h}`, `tick-${h}`)} className="cs-anchor" data-visible="0">
            <span className="cs-hour" data-visited={trail.has(h) || undefined} data-current={h === hour || undefined}>
              {h}
            </span>
          </div>
        ))}
        {chip("power", calc(START, s.power), { "data-readout": "power" })}
      </>
    );
  }

  if (step === "exchange" || step === "shared") {
    const x = exchange(s.alice, s.bob);
    const secret = (who: "alice" | "bob", value: number) =>
      chip(`know-${who}`, <><LockKeyhole size={15} strokeWidth={2.6} aria-hidden="true" />{value}</>, { "data-readout": `secret-${who}`, "data-know": "" });
    return (
      <>
        {secret("alice", s.alice)}
        {secret("bob", s.bob)}
        {chip("token-a", x.fromAlice, { "data-readout": "token-a" })}
        {chip("token-b", x.fromBob, { "data-readout": "token-b" })}
        {notes([CLOCK, START, x.fromAlice, x.fromBob].join(" · "), step === "shared")}
        {step === "shared" && chip("calc-alice", <><KeyRound size={15} strokeWidth={2.6} aria-hidden="true" />{calc(x.fromBob, s.alice)}</>, { "data-readout": "key-alice", "data-key": "" })}
        {step === "shared" && chip("calc-bob", <><KeyRound size={15} strokeWidth={2.6} aria-hidden="true" />{calc(x.fromAlice, s.bob)}</>, { "data-readout": "key-bob", "data-key": "" })}
      </>
    );
  }

  if (step === "message") {
    const key = sharedKey(s);
    const cipher = shiftText(message, key);
    return (
      <>
        {chip("know-alice", <>{message} <KeyRound size={14} strokeWidth={2.6} aria-hidden="true" />{key}</>, { "data-readout": "alice-message", "data-know": "" })}
        {chip("know-bob", <>{shiftText(cipher, -key)} <KeyRound size={14} strokeWidth={2.6} aria-hidden="true" />{key}</>, { "data-readout": "bob-message", "data-know": "" })}
        {[...cipher].map((letter, k) => tile(k, letter))}
        {notes(cipher, true)}
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

function MessageField({ s, set }: { s: KeysState; set(patch: Partial<KeysState>): void }) {
  const id = useId();
  return (
    <label className="cs-field cs-field-wide" htmlFor={id}>
      <span>{t("Alice’s message")}</span>
      <input
        id={id}
        data-input="message"
        value={messageOf(s)}
        maxLength={MAX_LETTERS}
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        onChange={(event) => set({ message: cleanMessage(event.target.value) || null })}
      />
    </label>
  );
}

/** Controls of the "Your turn!" panel. */
function Controls({ step, store }: ControlsProps) {
  useLocale();
  const [s, set] = useKeys(store);

  if (step === "problem" || step === "message")
    return (
      <div className="cs-actions">
        <MessageField s={s} set={set} />
      </div>
    );

  if (step === "shift")
    return (
      <div className="cs-sliders">
        <MessageField s={s} set={set} />
        <Slider label={t("Key")} name="shift" value={s.shift} min={1} max={25} onChange={(shift) => set({ shift })} />
      </div>
    );

  if (step === "clock")
    return (
      <div className="cs-actions">
        <button type="button" className="cs-action" data-action="times-two" disabled={s.power >= CLOCK - 1} onClick={() => set({ power: s.power + 1 })}>
          {t("Multiply by 2")}
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
        <Slider label={t("Alice’s secret")} name="alice" value={s.alice} min={1} max={9} onChange={(alice) => set({ alice })} />
        <Slider label={t("Bob’s secret")} name="bob" value={s.bob} min={1} max={9} onChange={(bob) => set({ bob })} />
      </div>
    );

  return null;
}

/** Live values of the worked examples. */
function vars(step: string, state: object): Vars {
  const s = state as KeysState;
  const message = messageOf(s);
  if (step === "problem") return { message };
  if (step === "shift") return { key: s.shift, message, cipher: shiftText(message, s.shift) };
  if (step === "clock") return { calc: calc(START, s.power) };
  if (step === "exchange" || step === "shared") {
    const x = exchange(s.alice, s.bob);
    return step === "exchange"
      ? { a: s.alice, b: s.bob, A: x.fromAlice, B: x.fromBob, aliceCalc: calc(START, s.alice), bobCalc: calc(START, s.bob) }
      : { A: x.fromAlice, B: x.fromBob, key: x.aliceKey, aliceCalc: calc(x.fromBob, s.alice), bobCalc: calc(x.fromAlice, s.bob) };
  }
  if (step === "message") {
    const key = sharedKey(s);
    return { key, message, cipher: shiftText(message, key) };
  }
  return null;
}

export const keysUi: LessonUi = {
  createStore: () => new Store<KeysState>({ ...KEYS_START }),
  Overlay,
  Controls,
  vars,
};
