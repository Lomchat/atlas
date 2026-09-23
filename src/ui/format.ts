import { getLocale, t } from "../i18n";

const LIGHT_YEAR = 9.4607e15;
const SUPERSCRIPT: Record<string, string> = {
  "-": "⁻",
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",
};

/** "10⁻⁵" for an exponent of −5. */
export const power = (exponent: number) =>
  "10" + String(exponent).replace(/[-0-9]/g, (c) => SUPERSCRIPT[c]);

/** Order of magnitude of a length, e.g. "10⁻⁵ m". */
export const magnitude = (meters: number) =>
  `${power(Math.round(Math.log10(meters)))} m`;

function number(value: number) {
  const digits = value >= 100 ? 0 : value >= 10 ? 0 : 1;
  const rounded =
    value >= 100
      ? Math.round(value / Math.pow(10, Math.floor(Math.log10(value)) - 1)) *
        Math.pow(10, Math.floor(Math.log10(value)) - 1)
      : value;
  return new Intl.NumberFormat(getLocale(), {
    maximumFractionDigits: digits,
  }).format(rounded);
}

/** A readable length with a sensible unit, in the active language. */
export function formatLength(meters: number): string {
  if (meters >= LIGHT_YEAR * 0.5) {
    const ly = meters / LIGHT_YEAR;
    if (ly >= 1e9) return t("{n} billion light-years", { n: number(ly / 1e9) });
    if (ly >= 1e6) return t("{n} million light-years", { n: number(ly / 1e6) });
    return t("{n} light-years", { n: number(ly) });
  }
  if (meters >= 1e9) return t("{n} million km", { n: number(meters / 1e9) });
  const units: [number, string][] = [
    [1e3, "km"],
    [1, "m"],
    [1e-2, "cm"],
    [1e-3, "mm"],
    [1e-6, "µm"],
    [1e-9, "nm"],
    [1e-12, "pm"],
    [1e-15, "fm"],
  ];
  for (const [scale, unit] of units)
    if (meters >= scale * 0.995) return `${number(meters / scale)} ${unit}`;
  return `${number(meters / 1e-15)} fm`;
}
