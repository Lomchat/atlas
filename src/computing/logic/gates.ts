/**
 * State and logic of the logic-gates chapter, shared by its scene and
 * overlay. Pure TypeScript: no Three.js, no DOM.
 */

/** Step ids of the gates chapter, in order (checked against its data). */
export const GATES_STEPS = ["transistor", "not", "and", "or", "xor", "half", "adder"] as const;
export type GatesStep = (typeof GATES_STEPS)[number];
export type GateKind = "not" | "and" | "or" | "xor";

export interface GatesState {
  /** Step "transistor": voltage on the gate. */
  gate: boolean;
  /** Inputs of the single gates and of the half adder. */
  a: boolean;
  b: boolean;
  /** Step "adder": two 4-bit numbers. */
  x: number;
  y: number;
}

/** The worked examples quoted in the lesson text. */
export const GATES_START: GatesState = { gate: true, a: true, b: true, x: 5, y: 3 };

export function gate(kind: GateKind, a: boolean, b: boolean) {
  switch (kind) {
    case "not":
      return !a;
    case "and":
      return a && b;
    case "or":
      return a || b;
    case "xor":
      return a !== b;
  }
}

export const isGate = (step: string): step is GateKind => step === "not" || step === "and" || step === "or" || step === "xor";

/**
 * A 4-bit ripple-carry adder, column by column from the right.
 * `carries[i]` is the carry out of bit i (into bit i + 1); `sum` has 5 bits.
 */
export function add4(x: number, y: number) {
  const carries: number[] = [];
  let carry = 0;
  let sum = 0;
  for (let i = 0; i < 4; i++) {
    const a = (x >> i) & 1;
    const b = (y >> i) & 1;
    sum |= (a ^ b ^ carry) << i;
    carry = (a & b) | (carry & (a ^ b));
    carries.push(carry);
  }
  return { sum: sum | (carry << 4), carries };
}

/** Presets offered for the adder. */
export const ADDER_PRESETS: [number, number][] = [
  [5, 3],
  [7, 1],
  [15, 15],
];
