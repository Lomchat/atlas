/**
 * The language-model chapter's toy machinery, shared by its scene and
 * overlay: a tiny tokenizer, next-token probabilities with a temperature,
 * illustrative attention weights and a short generated sentence. Pure
 * TypeScript: no Three.js, no DOM. Every number here is illustrative and the
 * lesson says so; the arithmetic (softmax with temperature) is exact.
 */
import type { Bilingual } from "../../levels/types.ts";

/** Step ids of the language-model chapter, in order (checked against its data). */
export const LLM_STEPS = ["tokens", "vectors", "next", "attention", "generate", "training"] as const;
export type LlmStep = (typeof LLM_STEPS)[number];

export interface LlmState {
  /** Step "tokens": the visitor's sentence (null: the example of the current language). */
  text: string | null;
  /** Step "next": sampling temperature (0.1–2). */
  temperature: number;
  /** Step "attention": the last word is "big" (true) or "small". */
  big: boolean;
  /** Step "generate": how many tokens have been added (0–4). */
  generated: number;
}

export const LLM_START: LlmState = { text: null, temperature: 1, big: true, generated: 4 };

export const EXAMPLE_SENTENCE: Bilingual = { en: "The cat sleeps.", fr: "Le chat dort." };

/* ------------------------------------------------------------------ */
/* A toy tokenizer                                                      */
/* ------------------------------------------------------------------ */

/** Whole words that are one token, in English and French (lowercase). */
const WORDS = new Set(
  (
    "the a an and or of to in on is are was it he she we you they i my your this that with for at by not no yes " +
    "cat dog sleeps sleeping sofa bed mat roof fire near hello world computer bit bits model language " +
    "le la les un une des du de et ou est sont il elle on nous vous ils je mon ton ce cette avec pour sur dans par pas non oui " +
    "chat chien dort canapé lit tapis toit feu près bonjour monde ordinateur bit bits modèle langue " +
    "très bien mal beau belle petit grand jour nuit"
  ).split(" "),
);

/** Frequent pieces of words, longest first when cutting. */
const PIECES = (
  "anti constitution nelle ment believ ably able un in re de con com pro pre tion sion ing ed er est ly ness ful less " +
  "ment eur euse ique isme iste ité able ible ais ait ons ez ent ant ance ence ation ateur " +
  "cro croy ord ina teur intel lig ence arti fici elle ordi nat"
)
  .split(" ")
  .sort((a, b) => b.length - a.length);

export interface Token {
  text: string;
  /** Illustrative token number (each real model has its own). */
  id: number;
}

function idOf(piece: string) {
  // FNV-1a: a stable, made-up number for each piece.
  let h = 0x811c9dc5;
  for (const char of piece) h = Math.imul(h ^ char.codePointAt(0)!, 0x01000193);
  return 256 + ((h >>> 0) % 49744);
}

function cutWord(word: string): string[] {
  if (WORDS.has(word.toLowerCase())) return [word];
  const pieces: string[] = [];
  let rest = word;
  while (rest) {
    const lower = rest.toLowerCase();
    const piece = PIECES.find((p) => lower.startsWith(p) && (lower.length === p.length || lower.length - p.length >= 2));
    const length = piece ? piece.length : Math.min(rest.length, rest.length > 4 ? 3 : rest.length);
    pieces.push(rest.slice(0, length));
    rest = rest.slice(length);
  }
  return pieces;
}

/** Cuts a text into tokens; a space before a word belongs to its first piece. */
export function tokenize(text: string, max = 24): Token[] {
  const tokens: Token[] = [];
  const parts = text.slice(0, 80).match(/\s*[\p{L}\p{N}’']+|\s*[^\s\p{L}\p{N}]/gu) ?? [];
  for (const part of parts) {
    const space = part.match(/^\s*/)![0] ? " " : "";
    const word = part.trim();
    cutWord(word).forEach((piece, k) => {
      const text = (k === 0 ? space : "") + piece;
      tokens.push({ text, id: idOf(text) });
    });
    if (tokens.length >= max) break;
  }
  return tokens.slice(0, max);
}

/* ------------------------------------------------------------------ */
/* The next token                                                       */
/* ------------------------------------------------------------------ */

export const PROMPT: Bilingual = { en: "The cat is sleeping on the…", fr: "Le chat dort sur le…" };

/** Candidates and their illustrative probabilities at temperature 1. */
export const CANDIDATES: { word: Bilingual; p: number }[] = [
  { word: { en: "sofa", fr: "canapé" }, p: 0.46 },
  { word: { en: "bed", fr: "lit" }, p: 0.27 },
  { word: { en: "mat", fr: "tapis" }, p: 0.13 },
  { word: { en: "roof", fr: "toit" }, p: 0.06 },
  { word: { en: "windowsill", fr: "rebord" }, p: 0.05 },
  { word: { en: "keyboard", fr: "clavier" }, p: 0.03 },
];

/** Probabilities after applying a temperature: p^(1/T), normalised (a softmax of log p / T). */
export function withTemperature(temperature: number) {
  const weights = CANDIDATES.map((c) => Math.pow(c.p, 1 / Math.max(0.05, temperature)));
  const total = weights.reduce((a, b) => a + b, 0);
  return weights.map((w) => w / total);
}

/* ------------------------------------------------------------------ */
/* Attention                                                            */
/* ------------------------------------------------------------------ */

/** 13 words in both languages, with the pronoun and both candidates at the same places. */
export const SENTENCE: Bilingual[] = [
  { en: "The", fr: "Le" },
  { en: "trophy", fr: "trophée" },
  { en: "does", fr: "ne" },
  { en: "not", fr: "rentre" },
  { en: "fit", fr: "pas" },
  { en: "in", fr: "dans" },
  { en: "the", fr: "la" },
  { en: "suitcase", fr: "valise" },
  { en: "because", fr: "car" },
  { en: "it", fr: "il" },
  { en: "is", fr: "est" },
  { en: "too", fr: "trop" },
  { en: "big", fr: "grand" },
];
export const SMALL: Bilingual = { en: "small", fr: "petit" };
export const PRONOUN = 9;
export const TROPHY = 1;
export const SUITCASE = 7;

/** Illustrative attention of the pronoun towards every word (sums to 1). */
export function attention(big: boolean) {
  const weights = SENTENCE.map(() => 0.02);
  weights[TROPHY] = big ? 0.62 : 0.16;
  weights[SUITCASE] = big ? 0.16 : 0.62;
  weights[12] = 0.06;
  weights[PRONOUN] = 0;
  const total = weights.reduce((a, b) => a + b, 0);
  return weights.map((w) => w / total);
}

/* ------------------------------------------------------------------ */
/* Generation                                                           */
/* ------------------------------------------------------------------ */

export const GENERATED: { word: Bilingual; p: number }[] = [
  { word: { en: "sofa", fr: "canapé" }, p: 0.46 },
  { word: { en: "near", fr: "près" }, p: 0.21 },
  { word: { en: "the", fr: "du" }, p: 0.64 },
  { word: { en: "fire", fr: "feu" }, p: 0.18 },
];
export const GENERATE_PROMPT: Bilingual = { en: "The cat is sleeping on the", fr: "Le chat dort sur le" };
