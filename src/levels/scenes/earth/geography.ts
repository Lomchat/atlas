/**
 * Shared geography between the `region` (1 unit = 30 km) and the `landscape`
 * (1 unit = 500 m) levels, so their rivers, town and fields line up while
 * diving. Keep LANDSCAPE_ANCHOR equal to the landscape's anchor in cosmos.ts.
 */

/** Where the landscape sits in the region (region units, on the ground). */
export const LANDSCAPE_ANCHOR: [number, number, number] = [0.4, 0, 0.7];
/** Region units per landscape unit. */
export const LANDSCAPE_SCALE = 5e3 / 3e5;

/** General direction of the river through the landscape (x, z), shared by both levels. */
export const RIVER_HEADING: [number, number] = [0.874, 0.486];

/** The landscape's river centreline (landscape units, x/z control points). */
export const LANDSCAPE_RIVER: [number, number][] = [
  [-17, -9.6],
  [-13, -8.3],
  [-10.2, -5.6],
  [-7.4, -5.4],
  [-5.4, -3.4],
  [-3.2, -3.2],
  [-1.5, -1.3],
  [0.2, -0.95],
  [1.2, 0.4],
  [0.9, 2.1],
  [2.6, 3.2],
  [4.6, 2.6],
  [6.4, 3.6],
  [7.6, 5.6],
  [10.4, 6.3],
  [13.2, 7.4],
  [17, 9.4],
];

/** The small town of the landscape (centre and radius, landscape units). */
export const LANDSCAPE_TOWN = { x: 3.1, z: -1.2, r: 1.75 };
/** The park where the home `park` level sits (keep equal to the park anchor in home.ts). */
export const PARK_ANCHOR: [number, number, number] = [1.95, 0, 0.35];
/** The landscape's big forest (centre and radius, landscape units). */
export const LANDSCAPE_FOREST = { x: -4.6, z: -5.4, r: 3.2 };
