/**
 * The dive into a computer: real sizes of each view and of its scale bar,
 * shared by the scene (bar length in local units) and the overlay (label).
 * Pure TypeScript.
 */

/** Step ids of the inside chapter, in order (checked against its data). */
export const INSIDE_STEPS = ["laptop", "board", "chip", "core", "cells", "transistor", "atoms"] as const;
export type InsideStep = (typeof INSIDE_STEPS)[number];

/**
 * `size`: real width (metres) of the 10 local units of the view.
 * `bar`: real length of the scale bar drawn under it.
 */
export const VIEWS: Record<InsideStep, { size: number; bar: number }> = {
  laptop: { size: 0.32, bar: 0.1 },
  board: { size: 0.25, bar: 0.05 },
  chip: { size: 0.011, bar: 0.002 },
  core: { size: 0.002, bar: 0.0005 },
  cells: { size: 2e-6, bar: 5e-7 },
  transistor: { size: 1.5e-7, bar: 5e-8 },
  atoms: { size: 2.5e-9, bar: 5e-10 },
};

/** Length of the scale bar in local units. */
export const barUnits = (step: InsideStep) => (VIEWS[step].bar / VIEWS[step].size) * 10;
