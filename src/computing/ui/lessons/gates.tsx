import { t, useLocale } from "../../../i18n";
import { ADDER_PRESETS, GATES_START, add4, gate, isGate } from "../../logic/gates";
import type { GatesState } from "../../logic/gates";
import { Store, useStore } from "../../store";
import { useAnchors } from "../anchors";
import type { ControlsProps, LessonUi, OverlayProps, Vars } from "./types";

const useGates = (store: Store<object>) => {
  const typed = store as Store<GatesState>;
  return [useStore(typed), (patch: Partial<GatesState>) => typed.set(patch)] as const;
};
const bit = (value: boolean) => (value ? 1 : 0);
/** Input names: symbols, the same in every language. */
const A = "A";
const B = "B";

/** Inputs to click and values pinned on the scene. */
function Overlay({ stage, step, store }: OverlayProps) {
  useLocale();
  const [s, set] = useGates(store);
  const pin = useAnchors(stage);

  const input = (slot: number, name: string, value: boolean, toggle: () => void) => (
    <div key={name} ref={pin(`input-${name}`, `lamp-${slot}`)} className="cs-anchor" data-visible="0">
      <span className="cs-tag" data-side="left" aria-hidden="true">
        {name} = {bit(value)}
      </span>
      <button
        type="button"
        className="cs-hit cs-lamp"
        data-input={name}
        aria-pressed={value}
        aria-label={t("Input {name}", { name })}
        onClick={toggle}
      />
    </div>
  );
  const output = (slot: number, value: boolean | number) => (
    <div ref={pin("output", `lamp-${slot}`)} className="cs-anchor" data-visible="0">
      <span className="cs-tag" data-side="right" data-readout="output">
        = {Number(value)}
      </span>
    </div>
  );

  if (step === "transistor")
    return (
      <>
        <div ref={pin("gate-input", "lamp-0")} className="cs-anchor" data-visible="0">
          <span className="cs-tag" data-side="left" aria-hidden="true">
            {bit(s.gate)}
          </span>
          <button
            type="button"
            className="cs-hit cs-lamp"
            data-input="gate"
            aria-pressed={s.gate}
            aria-label={t("Turn the gate on or off")}
            onClick={() => set({ gate: !s.gate })}
          />
        </div>
        {output(1, s.gate)}
      </>
    );

  if (isGate(step))
    return (
      <>
        {input(0, A, s.a, () => set({ a: !s.a }))}
        {step !== "not" && input(1, B, s.b, () => set({ b: !s.b }))}
        {output(2, gate(step, s.a, s.b))}
      </>
    );

  if (step === "half")
    return (
      <>
        {input(0, A, s.a, () => set({ a: !s.a }))}
        {input(1, B, s.b, () => set({ b: !s.b }))}
        <div ref={pin("equation", "equation")} className="cs-anchor" data-visible="0">
          <span className="cs-readout" data-readout="equation">
            {bit(s.a)} + {bit(s.b)} = <span className="cs-binary">{`${bit(s.a && s.b)}${bit(s.a !== s.b)}`}</span>
          </span>
        </div>
      </>
    );

  if (step === "adder") {
    const { sum } = add4(s.x, s.y);
    const toggles = (key: "x" | "y", first: number) =>
      [8, 4, 2, 1].map((place, c) => (
        <div key={`${key}${c}`} ref={pin(`${key}-${c}`, `lamp-${first + c}`)} className="cs-anchor" data-visible="0">
          <button
            type="button"
            className="cs-hit cs-lamp"
            data-bit={first + c}
            aria-pressed={!!(s[key] & place)}
            aria-label={t("{channel}: bit worth {value}", { channel: key === "x" ? A : B, value: place })}
            onClick={() => set({ [key]: s[key] ^ place } as Partial<GatesState>)}
          />
        </div>
      ));
    return (
      <>
        {toggles("x", 0)}
        {toggles("y", 4)}
        {(
          [
            ["value-a", s.x],
            ["value-b", s.y],
            ["value-sum", sum],
          ] as const
        ).map(([name, value]) => (
          <div key={name} ref={pin(name, name)} className="cs-anchor" data-visible="0">
            <span className="cs-tag" data-side="right" data-readout={name}>
              = {value}
            </span>
          </div>
        ))}
      </>
    );
  }
  return null;
}

/** Truth tables and presets inside the step card. */
function Controls({ step, store }: ControlsProps) {
  useLocale();
  const [s, set] = useGates(store);

  if (step === "transistor")
    return (
      <div className="cs-actions">
        <button type="button" className="cs-action" data-action="gate-panel" aria-pressed={s.gate} onClick={() => set({ gate: !s.gate })}>
          {t("Turn the gate on or off")}
          <b className="cs-var">{bit(s.gate)}</b>
        </button>
      </div>
    );

  if (isGate(step) || step === "half") {
    const two = step !== "not";
    const rows = two ? [[false, false], [false, true], [true, false], [true, true]] : [[false, false], [true, false]];
    const toggle = (name: string, value: boolean, change: () => void) => (
      <button key={name} type="button" className="cs-chip cs-chip-wide" data-toggle={name} aria-pressed={value} onClick={change}>
        {name} = <b className="cs-var">{bit(value)}</b>
      </button>
    );
    return (
      <div className="cs-gate-play">
        <div className="cs-presets">
          {toggle(A, s.a, () => set({ a: !s.a }))}
          {two && toggle(B, s.b, () => set({ b: !s.b }))}
        </div>
      <table className="cs-table" data-table={step}>
        <caption>{t("Truth table")}</caption>
        <thead>
          <tr>
            <th scope="col">{A}</th>
            {two && <th scope="col">{B}</th>}
            {step === "half" ? (
              <>
                <th scope="col">{t("Carry")}</th>
                <th scope="col">{t("Sum")}</th>
              </>
            ) : (
              <th scope="col">{t("Output")}</th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map(([a, b]) => (
            <tr key={`${a}${b}`} data-current={(a === s.a && (!two || b === s.b)) || undefined} onClick={() => set(two ? { a, b } : { a })}>
              <td>{bit(a)}</td>
              {two && <td>{bit(b)}</td>}
              {step === "half" ? (
                <>
                  <td>{bit(a && b)}</td>
                  <td>{bit(a !== b)}</td>
                </>
              ) : (
                <td>{bit(gate(step as Exclude<typeof step, "half">, a, b))}</td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    );
  }

  if (step === "adder")
    return (
      <div className="cs-presets" role="group" aria-label={t("Examples")}>
        {ADDER_PRESETS.map(([x, y]) => (
          <button
            key={`${x}+${y}`}
            type="button"
            className="cs-chip cs-chip-wide"
            data-preset={`${x}+${y}`}
            aria-pressed={s.x === x && s.y === y}
            onClick={() => set({ x, y })}
          >
            {x} + {y}
          </button>
        ))}
      </div>
    );

  return null;
}

/** Live values of the worked examples. */
function vars(step: string, state: object): Vars {
  const s = state as GatesState;
  if (step === "transistor") return { gate: bit(s.gate), flows: s.gate ? t("flows") : t("is blocked") };
  if (isGate(step)) return { a: bit(s.a), b: bit(s.b), out: bit(gate(step, s.a, s.b)), same: s.a === s.b ? t("the same") : t("different") };
  if (step === "half") {
    const value = Number(s.a) + Number(s.b);
    return { a: bit(s.a), b: bit(s.b), sum: bit(s.a !== s.b), carry: bit(s.a && s.b), result: value.toString(2), value };
  }
  if (step === "adder") {
    const { sum } = add4(s.x, s.y);
    const four = (n: number) => n.toString(2).padStart(4, "0");
    return { x: s.x, y: s.y, xb: four(s.x), yb: four(s.y), sb: sum > 15 ? sum.toString(2) : four(sum), s: sum };
  }
  return null;
}

export const gatesUi: LessonUi = {
  createStore: () => new Store<GatesState>({ ...GATES_START }),
  Overlay,
  Controls,
  vars,
};
