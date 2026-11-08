/**
 * The keys chapter, with tiny numbers: a message scrambled by shifting its
 * letters, and a key agreed in public on an 11-hour clock (Diffie–Hellman
 * with 11 and 2). Shared by the scene and the overlay. Pure TypeScript.
 */
import type { Bilingual } from "../../levels/types.ts";

/** Step ids of the keys chapter, in order (checked against its data). */
export const KEYS_STEPS = ["problem", "shift", "clock", "exchange", "shared", "message", "https"] as const;
export type KeysStep = (typeof KEYS_STEPS)[number];

/** The public clock (11 hours, 0 to 10) and the public start (2). */
export const CLOCK = 11;
export const START = 2;

export interface KeysState {
  /** Alice's message (capital letters); null: the example of the current language. */
  message: string | null;
  /** Step "shift": how many places each letter moves (1–25). */
  shift: number;
  /** Step "clock": how many times 2 has been multiplied (1–10). */
  power: number;
  /** Alice's and Bob's secret numbers, their private keys (1–9). */
  alice: number;
  bob: number;
}

export const KEYS_START: KeysState = { message: null, shift: 3, power: 3, alice: 3, bob: 2 };
export const EXAMPLE_MESSAGE: Bilingual = { en: "HELLO", fr: "SALUT" };
export const MAX_LETTERS = 8;

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** Keeps capital letters only (accents removed), at most 8. */
export function cleanMessage(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, MAX_LETTERS);
}

/** Moves every letter `by` places in the alphabet (Z wraps round to A). */
export const shiftText = (text: string, by: number) =>
  [...text].map((c) => {
    const i = ALPHABET.indexOf(c);
    return i < 0 ? c : ALPHABET[(((i + by) % 26) + 26) % 26];
  }).join("");

/** base multiplied by itself `times` times on the clock, step by step. */
export function onClock(base: number, times: number, hours = CLOCK) {
  let value = 1;
  for (let k = 0; k < times; k++) value = (value * base) % hours;
  return value;
}

/** The plain power (small enough to show), or null when it gets too big. */
export const plainPower = (base: number, times: number) => {
  const value = Math.pow(base, times);
  return value <= 9999 ? value : null;
};

/** Hours visited by 1, 2, 2², 2³… on the clock. */
export const clockTrail = (power: number) => Array.from({ length: power + 1 }, (_, k) => onClock(START, k));

/** Everything Alice, Bob and Eve see in the exchange. */
export function exchange(alice: number, bob: number) {
  const fromAlice = onClock(START, alice);
  const fromBob = onClock(START, bob);
  return { fromAlice, fromBob, aliceKey: onClock(fromBob, alice), bobKey: onClock(fromAlice, bob) };
}
