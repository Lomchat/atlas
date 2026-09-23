/**
 * Shared timing of oxygen loading, so the `hemoglobin` scene and its `heme`
 * child (drawn on top of it) show the same molecule at the same moment.
 * The four hemes load one after the other, each faster than the previous
 * one (cooperativity), stay loaded, then release in turn.
 */
export const O2_PERIOD = 14;

const WINDOWS = [
  { arrive: 0.04, bind: 0.16, release: 0.7, gone: 0.8 },
  { arrive: 0.14, bind: 0.25, release: 0.74, gone: 0.84 },
  { arrive: 0.22, bind: 0.31, release: 0.78, gone: 0.88 },
  { arrive: 0.27, bind: 0.35, release: 0.82, gone: 0.92 },
];

export type O2Phase = "away" | "arriving" | "bound" | "leaving";

export interface O2State {
  phase: O2Phase;
  /** Progress within the phase, 0–1. */
  u: number;
  /** 0 = empty heme, 1 = oxygen bound (smooth). */
  bound: number;
}

const smooth = (x: number) => {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
};

/** Oxygen state of heme `index` (0–3) at `time` seconds. */
export function o2State(time: number, index: number): O2State {
  const w = WINDOWS[index % WINDOWS.length];
  const c = (((time / O2_PERIOD + 0.17) % 1) + 1) % 1;
  if (c < w.arrive || c >= w.gone) return { phase: "away", u: 0, bound: 0 };
  if (c < w.bind) {
    const u = (c - w.arrive) / (w.bind - w.arrive);
    return { phase: "arriving", u, bound: smooth((u - 0.8) / 0.2) };
  }
  if (c < w.release) return { phase: "bound", u: (c - w.bind) / (w.release - w.bind), bound: 1 };
  const u = (c - w.release) / (w.gone - w.release);
  return { phase: "leaving", u, bound: 1 - smooth(u / 0.25) };
}

/** Fraction of the four hemes carrying oxygen (drives the T → R shape change). */
export function loaded(time: number) {
  let sum = 0;
  for (let i = 0; i < 4; i++) sum += o2State(time, i).bound;
  return sum / 4;
}
