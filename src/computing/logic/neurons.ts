/**
 * The neural-network chapter's arithmetic, shared by its scene and overlay:
 * one neuron deciding whether to take an umbrella, a perceptron learning
 * step, and a small digit reader with illustrative scores. Pure TypeScript.
 */

/** Step ids of the neurons chapter, in order (checked against its data). */
export const NEURONS_STEPS = ["neuron", "weights", "learn", "network", "training", "scale"] as const;
export type NeuronsStep = (typeof NEURONS_STEPS)[number];

export interface NeuronsState {
  /** Step "neuron": how cloudy it is (0–1) and whether rain is forecast (0 or 1). */
  clouds: number;
  forecast: number;
  /** Step "weights": the weight given to the forecast. */
  forecastWeight: number;
  /** Step "learn": the neuron has learned from its mistake. */
  learned: boolean;
  /** Step "network": the digit shown to the network. */
  digit: 1 | 4 | 7;
}

export const NEURONS_START: NeuronsState = { clouds: 0.8, forecast: 1, forecastWeight: 0.3, learned: false, digit: 7 };

/** The neuron of the first step. */
export const NEURON = { cloudsWeight: 0.6, forecastWeight: 1.5, bias: -1 } as const;

/** total = clouds × w1 + forecast × w2 + bias; the neuron fires when total > 0. */
export function neuron(clouds: number, forecast: number, w1: number, w2: number, bias: number) {
  const total = clouds * w1 + forecast * w2 + bias;
  return { total, fires: total > 0 };
}

/** One perceptron step: weight += rate × error × input, bias += rate × error. */
export const RATE = 0.1;
export function learnStep(w1: number, w2: number, bias: number, clouds: number, forecast: number, target: number) {
  const output = neuron(clouds, forecast, w1, w2, bias).fires ? 1 : 0;
  const error = target - output;
  return { error, w1: w1 + RATE * error * clouds, w2: w2 + RATE * error * forecast, bias: bias + RATE * error };
}

/** The learning example: it rained (target 1), clouds 0.8, forecast 1, weights 0.6 and 0.3, bias −1. */
export const LEARN = { clouds: 0.8, forecast: 1, w1: 0.6, w2: 0.3, bias: -1, target: 1 } as const;

export function learnState(learned: boolean) {
  const { clouds, forecast, w1, w2, bias, target } = LEARN;
  const after = learnStep(w1, w2, bias, clouds, forecast, target);
  const weights = learned ? after : { error: after.error, w1, w2, bias };
  return { ...weights, error: after.error, ...neuron(clouds, forecast, weights.w1, weights.w2, weights.bias) };
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
