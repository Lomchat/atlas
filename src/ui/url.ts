import { HOME_ID, byId } from "../levels";
import { getLocale } from "../i18n";

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
  at: string;
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
    at,
    intro: introParam === "1" || (introParam !== "0" && !seen && !requested && at === HOME_ID),
    freeze: freeze !== null && Number.isFinite(Number(freeze)) ? Number(freeze) : undefined,
    offset: offset !== null && Number.isFinite(Number(offset)) ? Number(offset) : undefined,
    bare: params.get("ui") === "0",
  };
}

/** Keep the address bar in sync with the level being viewed. */
export function writeLevel(id: string) {
  const url = new URL(location.href);
  if (url.searchParams.get("at") === id && url.searchParams.get("lang") === getLocale())
    return;
  const keep = ["freeze", "ui", "offset"];
  const next = new URL(url.origin + (url.pathname.startsWith("/lab") ? "/" : url.pathname));
  next.searchParams.set("lang", getLocale());
  next.searchParams.set("at", id);
  for (const key of keep) {
    const value = url.searchParams.get(key);
    if (value !== null) next.searchParams.set(key, value);
  }
  history.replaceState(history.state, "", next);
}

export function shareUrl(id: string) {
  const url = new URL(location.origin + "/");
  url.searchParams.set("lang", getLocale());
  url.searchParams.set("at", id);
  return url.toString();
}
