import { WORLD_NODES, WORLD_SAMPLE_REGIONS } from "./data";
import partMetadata from "../../public/models/bodyparts3d/parts.json";

export interface SpatialSource {
  assetId?: string;
  partId?: string;
  region?: string;
  category?: string;
}

export interface SpatialEntry {
  parentId: string;
  childId: string;
  point: [number, number, number];
  kind: "sample" | "instance" | "surface";
  source?: SpatialSource;
}

export interface SpatialContext {
  v: 1;
  entries: SpatialEntry[];
}

export const EMPTY_SPATIAL_CONTEXT: SpatialContext = { v: 1, entries: [] };
const MAX_ENTRIES = 32;
const MAX_ADDRESS_LENGTH = 24576;
const partTable = partMetadata as unknown as {
  assetIds: string[];
  categories: string[];
  regions: string[];
  parts: Record<
    string,
    [number, string | null, string | null, number, number, number[], number]
  >;
};

function validSource(
  value: unknown,
  entry: SpatialEntry,
): SpatialSource | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return;
  const source = value as Record<string, unknown>;
  const text = (key: string) =>
    typeof source[key] === "string" && source[key].length <= 160
      ? source[key].trim()
      : undefined;
  const assetId = text("assetId"),
    partId = text("partId");
  if (assetId || partId) {
    if (!assetId || !partId || !Object.hasOwn(partTable.parts, partId)) return;
    if (
      entry.parentId !== "human" &&
      !entry.parentId.startsWith("human/") &&
      entry.childId !== "human"
    )
      return;
    const row = partTable.parts[partId];
    if (partTable.assetIds[row[0]] !== assetId) return;
    const category = partTable.categories[row[3]];
    let region = partTable.regions[row[4]];
    // The source skin is one part. Its region is a navigation hint calculated
    // from the actual point in the normalized body frame, not a URL assertion.
    if (category === "surface") {
      if (entry.parentId === "human") {
        const [x, y] = entry.point;
        region =
          y > 0.3
            ? "head"
            : y < -0.12
              ? x >= 0
                ? "left-leg"
                : "right-leg"
              : Math.abs(x) > 0.095
                ? x >= 0
                  ? "left-arm"
                  : "right-arm"
                : "trunk";
      } else region = "unknown";
    }
    return { assetId, partId, category, region };
  }
  // Material-region identities are registered by the reviewed scientific graph.
  // Unrecognized labels from a URL never become anatomical region claims.
  const region = text("region"),
    category = text("category");
  const result: SpatialSource = {};
  if (region && Object.hasOwn(WORLD_SAMPLE_REGIONS, region))
    result.region = region;
  if (category && Object.hasOwn(WORLD_SAMPLE_REGIONS, category))
    result.category = category;
  return Object.keys(result).length ? result : undefined;
}

function validEntry(value: unknown): SpatialEntry | undefined {
  if (!value || typeof value !== "object") return;
  const entry = value as Record<string, unknown>;
  if (typeof entry.parentId !== "string" || typeof entry.childId !== "string")
    return;
  if (
    !Object.hasOwn(WORLD_NODES, entry.parentId) ||
    !Object.hasOwn(WORLD_NODES, entry.childId)
  )
    return;
  const parent = WORLD_NODES[entry.parentId];
  const child = WORLD_NODES[entry.childId];
  if (
    !parent ||
    !child ||
    child.parent !== parent.id ||
    !parent.children.includes(child.id)
  )
    return;
  if (
    typeof entry.kind !== "string" ||
    !["sample", "instance", "surface"].includes(entry.kind)
  )
    return;
  // Coordinates stay in their parent's local frame, including distant scenery.
  // Do not round them: microscopic child positions must survive a shared URL.
  const bound = parent.id === "world" ? 1e6 : 16;
  if (
    !Array.isArray(entry.point) ||
    entry.point.length !== 3 ||
    !entry.point.every(
      (value) =>
        typeof value === "number" &&
        Number.isFinite(value) &&
        Math.abs(value) <= bound,
    )
  )
    return;
  const result: SpatialEntry = {
    parentId: parent.id,
    childId: child.id,
    point: [...entry.point] as [number, number, number],
    kind: entry.kind as SpatialEntry["kind"],
  };
  const source = validSource(entry.source, result);
  const expectedCategories: Record<string, string> = {
    "human/vein-sample": "vein",
    "human/artery-sample": "artery",
    "human/bone-sample": "bone",
    "human/muscle-sample": "muscle",
    "human/skin": "surface",
  };
  if (
    source?.assetId &&
    expectedCategories[result.childId] &&
    source.category !== expectedCategories[result.childId]
  )
    return;
  if (source) result.source = source;
  return result;
}

/** Untrusted links and saved notebooks may contain obsolete or malformed entries. */
export function validateSampleAddress(value: unknown): SpatialContext {
  if (!value || typeof value !== "object") return { v: 1, entries: [] };
  const context = value as Record<string, unknown>;
  if (context.v !== 1 || !Array.isArray(context.entries))
    return { v: 1, entries: [] };
  const entries = new Map<string, SpatialEntry>();
  // Bound work as well as the returned address. Last selection wins for an edge.
  for (const candidate of context.entries.slice(-MAX_ENTRIES)) {
    const entry = validEntry(candidate);
    if (!entry) continue;
    const key = `${entry.parentId}>${entry.childId}`;
    entries.delete(key);
    entries.set(key, entry);
  }
  return { v: 1, entries: [...entries.values()] };
}

export function readSampleAddress(search: string): SpatialContext {
  try {
    if (search.length > MAX_ADDRESS_LENGTH * 3 + 4096)
      return { v: 1, entries: [] };
    const encoded = new URLSearchParams(search).get("sites");
    if (!encoded || encoded.length > MAX_ADDRESS_LENGTH)
      return { v: 1, entries: [] };
    return validateSampleAddress(JSON.parse(encoded));
  } catch {
    return { v: 1, entries: [] };
  }
}

/** Mutates only the dedicated world parameter; laboratory site and locale stay intact. */
export function writeSampleAddress(url: URL, context: SpatialContext): void {
  const clean = validateSampleAddress(context);
  let encoded = JSON.stringify(clean);
  while (encoded.length > MAX_ADDRESS_LENGTH && clean.entries.length) {
    clean.entries.shift();
    encoded = JSON.stringify(clean);
  }
  if (clean.entries.length) url.searchParams.set("sites", encoded);
  else url.searchParams.delete("sites");
}

export function upsertSpatialEntry(
  context: SpatialContext,
  entry: SpatialEntry,
): SpatialContext {
  const clean = validateSampleAddress(context);
  const next = validEntry(entry);
  if (!next) return clean;
  const previous = clean.entries.find(
    (item) => item.parentId === next.parentId && item.childId === next.childId,
  );
  const changedSite =
    previous &&
    (JSON.stringify(previous.point) !== JSON.stringify(next.point) ||
      previous.source?.partId !== next.source?.partId);
  const belongsToSample = (id: string) => {
    let node = WORLD_NODES[id];
    while (node) {
      if (node.id === next.childId) return true;
      node = node.parent ? WORLD_NODES[node.parent] : undefined!;
    }
    return false;
  };
  return {
    v: 1,
    entries: [
      ...clean.entries.filter(
        (item) =>
          (item.parentId !== next.parentId || item.childId !== next.childId) &&
          !(changedSite && belongsToSample(item.parentId)),
      ),
      next,
    ].slice(-MAX_ENTRIES),
  };
}
