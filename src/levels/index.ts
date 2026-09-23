/**
 * The level graph. Pure data utilities: no Three.js, no DOM.
 * Imported by the app and, through Node type stripping, by the test scripts.
 */
import type { LevelData } from "./types.ts";
import { cosmosLevels } from "./data/cosmos.ts";
import { homeLevels } from "./data/home.ts";
import { bodyLevels } from "./data/body.ts";
import { treeLevels } from "./data/tree.ts";
import { waterLevels } from "./data/water.ts";

export const LEVELS: readonly LevelData[] = [
  ...cosmosLevels,
  ...homeLevels,
  ...bodyLevels,
  ...treeLevels,
  ...waterLevels,
];

export const byId = new Map(LEVELS.map((level) => [level.id, level]));
export const ROOT = LEVELS.find((level) => level.parent === null)!;
/** The scene every visit starts from. */
export const HOME_ID = "park";

const childMap = new Map<string, LevelData[]>();
for (const level of LEVELS) {
  if (!level.parent) continue;
  const list = childMap.get(level.parent) ?? [];
  list.push(level);
  childMap.set(level.parent, list);
}
export const childrenOf = (id: string): readonly LevelData[] =>
  childMap.get(id) ?? [];

export function level(id: string): LevelData {
  const found = byId.get(id);
  if (!found) throw new Error(`Unknown level: ${id}`);
  return found;
}

/** Default child: the one marked `primary`, else the first declared. */
export function primaryChild(id: string): LevelData | undefined {
  const children = childrenOf(id);
  return children.find((child) => child.primary) ?? children[0];
}

/** Ancestors of `id`, from the root down to `id` itself. */
export function ancestry(id: string): LevelData[] {
  const chain: LevelData[] = [];
  for (let at: LevelData | undefined = level(id); at; )
    chain.unshift(at), (at = at.parent ? byId.get(at.parent) : undefined);
  return chain;
}

/** A complete root-to-leaf path through `id`, following primary children below it. */
export function pathThrough(id: string): LevelData[] {
  const chain = ancestry(id);
  for (let next = primaryChild(id); next; next = primaryChild(next.id))
    chain.push(next);
  return chain;
}

/** View extent (metres) at a level's home framing. */
export const homeExtent = (data: LevelData) => data.size * (data.frame ?? 1.5);
export const homeZ = (data: LevelData) => Math.log10(homeExtent(data));

/** Leaves reachable from the home scene: one per journey end. */
export const leaves = () => LEVELS.filter((l) => !childrenOf(l.id).length);
