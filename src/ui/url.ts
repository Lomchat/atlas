import { HOME_ID, byId } from "../levels";
import { getLocale } from "../i18n";

/** The two halves of the app: the scale journey and the computing lessons. */
export type Section = "atlas" | "computing";

/** Where the visitor is in the computing section (null lesson: the chapter map). */
export interface ComputingPlace {
  lesson: string | null;
  step: string | null;
}

/** Links from the previous version of the atlas keep opening a sensible place. */
function legacyTarget(url: URL): string | null {
  if (url.pathname.startsWith("/lab")) return "water-molecules";
  const params = url.searchParams;
  if (params.has("molecule") || params.has("focus")) return "water-molecules";
  const world = params.get("world");
  if (!world) return null;
  const root = world.split("/")[0];
  if (root === "human") return world.includes("blood") ? "red-cell" : "person";
  if (root === "tree") return "tree";
  if (root === "water" || root === "cloud") return "drop";
  return HOME_ID;
}

export interface StartOptions {
  section: Section;
  at: string;
  /** Computing lesson and step ids (validated by the computing section). */
  lesson: string | null;
  step: string | null;
  /** Show the welcome screen. */
  intro: boolean;
  /** Freeze animation time (screenshots and tests). */
  freeze?: number;
  /** Offset from the level's home view, in decades (screenshots). */
  offset?: number;
  /** Hide the interface (screenshots). */
  bare: boolean;
}

export function readStart(): StartOptions {
  const url = new URL(location.href);
  const params = url.searchParams;
  const section: Section = params.get("section") === "computing" ? "computing" : "atlas";
  const requested = params.get("at");
  const at =
    requested && byId.has(requested) ? requested : legacyTarget(url) ?? HOME_ID;
  let seen = false;
  try {
    seen = localStorage.getItem("atlas-intro-seen") === "1";
  } catch {
    /* Storage may be unavailable. */
  }
  const introParam = params.get("intro");
  const freeze = params.get("freeze");
  const offset = params.get("offset");
  return {
    section,
    at,
    lesson: params.get("lesson"),
    step: params.get("step"),
    intro:
      section === "atlas" &&
      (introParam === "1" || (introParam !== "0" && !seen && !requested && at === HOME_ID)),
    freeze: freeze !== null && Number.isFinite(Number(freeze)) ? Number(freeze) : undefined,
    offset: offset !== null && Number.isFinite(Number(offset)) ? Number(offset) : undefined,
    bare: params.get("ui") === "0",
  };
}

/** Screenshot and test parameters survive navigation. */
const KEEP = ["freeze", "ui", "offset"];

function replace(entries: [string, string][]) {
  const url = new URL(location.href);
  const next = new URL(url.origin + (url.pathname.startsWith("/lab") ? "/" : url.pathname));
  next.searchParams.set("lang", getLocale());
  for (const [key, value] of entries) next.searchParams.set(key, value);
  for (const key of KEEP) {
    const value = url.searchParams.get(key);
    if (value !== null) next.searchParams.set(key, value);
  }
  if (next.search !== url.search) history.replaceState(history.state, "", next);
}

/** Keep the address bar in sync with the level being viewed. */
export function writeLevel(id: string) {
  replace([["at", id]]);
}

/** Keep the address bar in sync with the computing lesson and step. */
export function writeLesson(lesson: string | null, step: string | null) {
  const entries: [string, string][] = [["section", "computing"]];
  if (lesson) entries.push(["lesson", lesson]);
  if (lesson && step) entries.push(["step", step]);
  replace(entries);
}

export function shareUrl(id: string) {
  const url = new URL(location.origin + "/");
  url.searchParams.set("lang", getLocale());
  url.searchParams.set("at", id);
  return url.toString();
}

export function shareLessonUrl(lesson: string | null, step: string | null) {
  const url = new URL(location.origin + "/");
  url.searchParams.set("lang", getLocale());
  url.searchParams.set("section", "computing");
  if (lesson) url.searchParams.set("lesson", lesson);
  if (lesson && step) url.searchParams.set("step", step);
  return url.toString();
}
