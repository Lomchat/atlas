import { Plus, RotateCcw } from "lucide-react";
import { Fragment, useId } from "react";
import type { CSSProperties } from "react";
import { t, useLocale } from "../../../i18n";
import type { MessageKey } from "../../../i18n";
import { BITS_START, PLACES, SWATCHES, binary, bitsOf, lastCharacter, utf8 } from "../../logic/bits";
import type { BitsState } from "../../logic/bits";
import { Store, useStore } from "../../store";
import { useAnchors } from "../anchors";
import type { ControlsProps, LessonUi, OverlayProps } from "./types";

const CHANNELS: { name: MessageKey; anchor: string }[] = [
  { name: "Red", anchor: "red" },
  { name: "Green", anchor: "green" },
  { name: "Blue", anchor: "blue" },
];
const SWATCH_NAMES: Record<string, MessageKey> = {
  orange: "Orange",
  violet: "Violet",
  cyan: "Cyan",
  yellow: "Yellow",
  white: "White",
  black: "Black",
};
/** One, two and three bytes in UTF-8. */
const PRESETS = ["A", "a", "é", "€"];

const useBits = (store: Store<object>) => {
  const typed = store as Store<BitsState>;
  return [useStore(typed), (patch: Partial<BitsState>) => typed.set(patch)] as const;
};

/** Toggles and numbers pinned on the scene. */
function Overlay({ stage, step, store }: OverlayProps) {
  const locale = useLocale();
  const [s, set] = useBits(store);
  const pin = useAnchors(stage);

  if (step === "switch")
    return (
      <>
        <div ref={pin("switch", "switch")} className="cs-anchor" data-visible="0">
          <button
            type="button"
            className="cs-hit cs-switch"
            data-action="flip"
            aria-pressed={s.single}
            aria-label={t("Flip the switch")}
            title={t("Flip the switch")}
            onClick={() => set({ single: !s.single })}
          />
        </div>
        <div ref={pin("readout", "readout")} className="cs-anchor" data-visible="0">
          <span className="cs-readout cs-readout-big" data-readout="bit" data-on={s.single || undefined}>
            {s.single ? 1 : 0}
          </span>
        </div>
      </>
    );

  if (step === "count") {
    const bits = bitsOf(s.value);
    const terms = PLACES.filter((_, k) => bits[k]);
    const sum = terms.length > 1 ? `${terms.join(" + ")} = ${s.value}` : String(s.value);
    return (
      <>
        {PLACES.map((place, k) => (
          <div key={k} ref={pin(`bit-${k}`, `lamp-${k}`)} className="cs-anchor" data-visible="0">
            <span className="cs-place" aria-hidden="true">
              {place}
            </span>
            <button
              type="button"
              className="cs-hit cs-lamp"
              data-bit={k}
              aria-pressed={!!bits[k]}
              aria-label={t("Bit worth {value}", { value: place })}
              onClick={() => set({ value: s.value ^ place })}
            />
          </div>
        ))}
        <div ref={pin("sum", "sum")} className="cs-anchor" data-visible="0">
          <span className="cs-readout" data-readout="sum">
            <span className="cs-binary">{binary(s.value)}</span> = {sum}
          </span>
        </div>
      </>
    );
  }

  if (step === "letter") {
    const bytes = utf8(s.char);
    const point = s.char.codePointAt(0) ?? 0;
    return (
      <>
        <div ref={pin("code", "code")} className="cs-anchor" data-visible="0">
          <span className="cs-readout cs-code" data-readout="code">
            <span className="cs-char">{s.char}</span>
            <span className="cs-code-text">
              <b>{t("Number {n}", { n: point.toLocaleString(locale) })}</b>
              <small>{bytes.length === 1 ? t("1 byte") : t("{n} bytes", { n: bytes.length })}</small>
            </span>
          </span>
        </div>
        {bytes.map((byte, k) => (
          <div key={k} ref={pin(`byte-${k}`, `lamp-${k * 8 + 7}`)} className="cs-anchor" data-visible="0">
            <span className="cs-byte" data-byte={k}>
              {binary(byte)}
            </span>
          </div>
        ))}
      </>
    );
  }

  if (step === "color")
    return (
      <>
        {s.rgb.map((byte, c) => (
          <Fragment key={c}>
            {bitsOf(byte).map((bit, k) => (
              <div key={k} ref={pin(`c${c}-${k}`, `lamp-${c * 8 + k}`)} className="cs-anchor" data-visible="0">
                <button
                  type="button"
                  className="cs-hit cs-lamp"
                  data-bit={c * 8 + k}
                  aria-pressed={!!bit}
                  aria-label={t("{channel}: bit worth {value}", { channel: t(CHANNELS[c].name), value: PLACES[k] })}
                  onClick={() =>
                    set({ rgb: s.rgb.map((value, i) => (i === c ? value ^ PLACES[k] : value)) as BitsState["rgb"] })
                  }
                />
              </div>
            ))}
            <div ref={pin(`value-${c}`, CHANNELS[c].anchor)} className="cs-anchor" data-visible="0">
              <span className="cs-readout cs-channel" data-readout={CHANNELS[c].anchor} data-channel={c}>
                <small>{t(CHANNELS[c].name)}</small>
                <b>{byte}</b>
              </span>
            </div>
          </Fragment>
        ))}
      </>
    );

  return null;
}

/** Extra controls inside the step card. */
function Controls({ step, store }: ControlsProps) {
  useLocale();
  const [s, set] = useBits(store);
  const input = useId();

  if (step === "count")
    return (
      <div className="cs-actions">
        <button type="button" className="cs-action" data-action="add-one" onClick={() => set({ value: (s.value + 1) % 256 })}>
          <Plus size={16} strokeWidth={2.8} aria-hidden="true" />
          {t("Add 1")}
        </button>
        <button type="button" className="cs-action" data-action="reset" onClick={() => set({ value: 0 })}>
          <RotateCcw size={15} strokeWidth={2.6} aria-hidden="true" />
          {t("Back to 0")}
        </button>
      </div>
    );

  if (step === "letter")
    return (
      <div className="cs-actions">
        <label className="cs-field" htmlFor={input}>
          <span>{t("Type a character")}</span>
          <input
            id={input}
            data-input="char"
            value={s.char}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            onFocus={(event) => event.target.select()}
            onChange={(event) => {
              const char = lastCharacter(event.target.value);
              if (char) set({ char });
            }}
          />
        </label>
        <div className="cs-presets" role="group" aria-label={t("Examples")}>
          {PRESETS.map((char) => (
            <button key={char} type="button" className="cs-chip" data-preset={char} aria-pressed={s.char === char} onClick={() => set({ char })}>
              {char}
            </button>
          ))}
        </div>
      </div>
    );

  if (step === "color")
    return (
      <div className="cs-swatches" role="group" aria-label={t("Pick a colour")}>
        {SWATCHES.map((swatch) => (
          <button
            key={swatch.id}
            type="button"
            className="cs-swatch"
            data-swatch={swatch.id}
            style={{ "--swatch": `rgb(${swatch.rgb.join(", ")})` } as CSSProperties}
            aria-pressed={swatch.rgb.every((value, k) => value === s.rgb[k])}
            aria-label={t(SWATCH_NAMES[swatch.id])}
            title={t(SWATCH_NAMES[swatch.id])}
            onClick={() => set({ rgb: [...swatch.rgb] })}
          />
        ))}
      </div>
    );

  return null;
}

export const bitsUi: LessonUi = {
  createStore: () => new Store<BitsState>({ ...BITS_START, rgb: [...BITS_START.rgb] }),
  Overlay,
  Controls,
};
