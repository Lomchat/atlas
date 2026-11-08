/**
 * State and arithmetic of the bits chapter, shared by its scene and overlay.
 * Pure TypeScript: no Three.js, no DOM.
 */

/** Step ids of the bits chapter, in order (checked against its data). */
export const BITS_STEPS = ["switch", "where", "double", "count", "letter", "color"] as const;
export type BitsStep = (typeof BITS_STEPS)[number];

export interface BitsState {
  /** Step "switch": the single bit. */
  single: boolean;
  /** Step "count": an 8-bit number. */
  value: number;
  /** Step "letter": one character (a Unicode code point). */
  char: string;
  /** Step "color": red, green and blue bytes. */
  rgb: [number, number, number];
}

/** The worked examples quoted in the lesson text. */
export const BITS_START: BitsState = {
  single: true,
  value: 13,
  char: "A",
  rgb: [255, 138, 61],
};

/** Place values of an 8-bit byte, most significant first. */
export const PLACES = [128, 64, 32, 16, 8, 4, 2, 1] as const;

/** The 8 bits of a byte, most significant first. */
export const bitsOf = (byte: number) => PLACES.map((place) => (byte & place ? 1 : 0));

/** "00001101" */
export const binary = (byte: number) => bitsOf(byte).join("");

/** UTF-8 bytes of the first code point of `char`. */
export function utf8(char: string): number[] {
  const point = char.codePointAt(0);
  if (point === undefined) return [];
  if (point < 0x80) return [point];
  if (point < 0x800) return [0xc0 | (point >> 6), 0x80 | (point & 63)];
  if (point < 0x10000) return [0xe0 | (point >> 12), 0x80 | ((point >> 6) & 63), 0x80 | (point & 63)];
  return [0xf0 | (point >> 18), 0x80 | ((point >> 12) & 63), 0x80 | ((point >> 6) & 63), 0x80 | (point & 63)];
}

/** The last code point typed in a text field (handles emoji surrogate pairs). */
export function lastCharacter(text: string): string | null {
  const points = Array.from(text.trim());
  const last = points.at(-1);
  if (!last) return null;
  const code = last.codePointAt(0)!;
  // Control characters and invisible marks have nothing to draw.
  if (code < 0x20 || (code >= 0x7f && code < 0xa0) || (code >= 0x300 && code < 0x370) || code === 0xfe0f) return null;
  return last;
}

/** Colour presets offered next to the pixel. */
export const SWATCHES: { id: string; rgb: [number, number, number] }[] = [
  { id: "orange", rgb: [255, 138, 61] },
  { id: "violet", rgb: [140, 92, 255] },
  { id: "cyan", rgb: [63, 208, 255] },
  { id: "yellow", rgb: [255, 255, 0] },
  { id: "white", rgb: [255, 255, 255] },
  { id: "black", rgb: [0, 0, 0] },
];
