/**
 * The neural-network chapter's arithmetic, shared by its scene and overlay:
 * one neuron counting points to decide whether to take an umbrella, learning
 * from its mistake, and a small digit reader with illustrative scores.
 * Whole numbers on purpose, for young readers. Pure TypeScript.
 */

/** Step ids of the neurons chapter, in order (checked against its data). */
export const NEURONS_STEPS = ["neuron", "weights", "learn", "network", "training", "scale"] as const;
export type NeuronsStep = (typeof NEURONS_STEPS)[number];

export interface NeuronsState {
  /** Step "neuron": how cloudy the sky is (0–10) and whether rain is forecast (0 or 1). */
  clouds: number;
  forecast: number;
  /** Step "weights": the points given to the forecast. */
  forecastWeight: number;
  /** Step "learn": how many times the neuron has learned from its mistake. */
  lessons: number;
  /** Step "network": the digit shown to the network. */
  digit: 1 | 4 | 7;
}

export const NEURONS_START: NeuronsState = { clouds: 8, forecast: 1, forecastWeight: 1, lessons: 0, digit: 7 };

/** The neuron of the first step: clouds give 1 point each, a rain forecast 5 points. */
export const NEURON = { cloudsWeight: 1, forecastWeight: 5 } as const;
/** It says yes (takes the umbrella) when the total is more than 10 points. */
export const THRESHOLD = 10;

/** total = clouds × w1 + forecast × w2; the neuron fires when total > THRESHOLD. */
export function neuron(clouds: number, forecast: number, w1: number, w2: number) {
  const total = clouds * w1 + forecast * w2;
  return { total, fires: total > THRESHOLD };
}

/**
 * Learning: it rained (clouds 8, forecast 1) but the neuron said no. After
 * each mistake the forecast, the clue that should have counted more, gains
 * one point: 1 → 2 (total 10, still no) → 3 (total 11, yes).
 */
export const LEARN = { clouds: 8, forecast: 1, w1: 1, w2: 1 } as const;

export function learnState(lessons: number) {
  const w2 = LEARN.w2 + lessons;
  return { w1: LEARN.w1, w2, ...neuron(LEARN.clouds, LEARN.forecast, LEARN.w1, w2) };
}

/** Digits drawn on a 7 × 7 grid (the real images have 28 × 28 pixels). */
export const DIGITS: Record<1 | 4 | 7, string[]> = {
  1: ["...#...", "..##...", "...#...", "...#...", "...#...", "...#...", "..###.."],
  4: ["...##..", "..#.#..", ".#..#..", "#...#..", "#######", "....#..", "....#.."],
  7: ["#######", ".....#.", "....#..", "...#...", "..#....", "..#....", "..#...."],
};

/** Illustrative output scores (0–9) of a trained network for each digit. */
export const SCORES: Record<1 | 4 | 7, number[]> = {
  1: [0.01, 0.89, 0.01, 0.01, 0.02, 0.01, 0.01, 0.03, 0.01, 0.0],
  4: [0.01, 0.03, 0.0, 0.0, 0.84, 0.01, 0.01, 0.01, 0.0, 0.09],
  7: [0.0, 0.06, 0.01, 0.01, 0.01, 0.0, 0.0, 0.88, 0.0, 0.03],
};

/** Illustrative test error while training on MNIST: from guessing (90 %) to about 2 %. */
export const ERROR_CURVE: [number, number][] = [
  [0, 0.9],
  [0.03, 0.55],
  [0.07, 0.3],
  [0.13, 0.16],
  [0.22, 0.09],
  [0.35, 0.055],
  [0.55, 0.035],
  [0.78, 0.025],
  [1, 0.02],
];

/** Weights of a 784 → 128 → 10 digit reader, biases included. */
export const DIGIT_READER_WEIGHTS = 784 * 128 + 128 + 128 * 10 + 10;
