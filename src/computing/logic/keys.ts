/**
 * Clock arithmetic for the keys chapter, shared by its scene and overlay.
 * Pure TypeScript: no Three.js, no DOM. Numbers are tiny on purpose; the
 * real ones have hundreds of digits.
 */

/** Step ids of the keys chapter, in order (checked against its data). */
export const KEYS_STEPS = ["problem", "clock", "exchange", "shared", "padlock", "signature", "https"] as const;
export type KeysStep = (typeof KEYS_STEPS)[number];

/** Diffie–Hellman: a 23-hour clock and the start 5 (a generator modulo 23). */
export const DH = { p: 23, g: 5 } as const;
/** RSA: n = 5 × 11 = 55, public exponent 3, private exponent 27 (3 × 27 = 81 = 2 × 40 + 1). */
export const RSA = { n: 55, e: 3, d: 27 } as const;

export interface KeysState {
  /** Step "clock": the exponent of 5 shown on the clock (1–22). */
  power: number;
  /** Alice's and Bob's secret numbers (1–22). */
  alice: number;
  bob: number;
  /** The message locked with RSA (2–54). */
  message: number;
}

/** The worked examples quoted in the lesson text. */
export const KEYS_START: KeysState = { power: 6, alice: 6, bob: 15, message: 7 };

/** base^exponent on a clock with `modulus` hours (exact, with BigInt). */
export function powMod(base: number, exponent: number, modulus: number) {
  let result = 1n;
  let b = BigInt(base) % BigInt(modulus);
  let e = BigInt(exponent);
  const m = BigInt(modulus);
  while (e > 0n) {
    if (e & 1n) result = (result * b) % m;
    b = (b * b) % m;
    e >>= 1n;
  }
  return Number(result);
}

/** Positions visited by 5, 5², 5³… up to 5^power on the 23-hour clock. */
export const clockTrail = (power: number) => Array.from({ length: power }, (_, k) => powMod(DH.g, k + 1, DH.p));

/** Everything Alice, Bob and Eve see in the exchange. */
export function exchange(alice: number, bob: number) {
  const fromAlice = powMod(DH.g, alice, DH.p);
  const fromBob = powMod(DH.g, bob, DH.p);
  return { fromAlice, fromBob, aliceKey: powMod(fromBob, alice, DH.p), bobKey: powMod(fromAlice, bob, DH.p) };
}

export const lock = (message: number) => powMod(message, RSA.e, RSA.n);
export const unlock = (cipher: number) => powMod(cipher, RSA.d, RSA.n);
export const sign = (message: number) => powMod(message, RSA.d, RSA.n);
export const verify = (signature: number) => powMod(signature, RSA.e, RSA.n);
