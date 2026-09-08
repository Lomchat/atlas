import * as T from "three";
import { WORLD_NODES, WORLD_SAMPLE_REGIONS } from "./data";
import type { WorldNode } from "./data";

/** A material sample identifies a region, not a hidden enlarged constituent. */
export function sampleTarget(
  node: WorldNode,
  object: T.Object3D,
): string | undefined {
  const children = node.children.map((id) => WORLD_NODES[id]);
  for (let part: T.Object3D | null = object; part; part = part.parent) {
    const data = part.userData;
    const ids = data.worldSampleChildId;
    const models = data.worldSampleChildModel;
    const region = data.worldMaterialRegion as string | undefined;
    if (!ids && !models && !region) continue;
    const acceptedIds: string[] = Array.isArray(ids) ? ids : ids ? [ids] : [];
    const acceptedModels: readonly string[] = models
      ? Array.isArray(models)
        ? models
        : [models]
      : region
        ? WORLD_SAMPLE_REGIONS[region] || []
        : [];
    const matches = children.filter(
      (child) =>
        (acceptedIds.length
          ? acceptedIds.includes(child.id)
          : acceptedModels.includes(child.model)) &&
        (data.worldSampleAtomicNumber === undefined ||
          child.atomic?.atomicNumber === data.worldSampleAtomicNumber),
    );
    // An ambiguous region requires a better material annotation, never a random child.
    if (matches.length === 1) return matches[0].id;
    return undefined;
  }
}
