import { Vector3 } from "three";
import { WORLD_NODES } from "./data";
import type { WorldNode } from "./data";

/** SI lengths describe the largest extent of the depicted specimen, not the
 * diameter of every constituent. Elementary-particle symbols have no diameter. */
export function frameMeters(node: WorldNode): number {
  if (node.sizeMeters) return node.sizeMeters;
  if (node.id === "world") return 24;
  return node.parent ? frameMeters(WORLD_NODES[node.parent]) * 0.16 : 1;
}
export function pathTo(id: string): string[] {
  const path: string[] = [];
  for (
    let node: WorldNode | undefined = WORLD_NODES[id];
    node;
    node = node.parent ? WORLD_NODES[node.parent] : undefined
  )
    path.unshift(node.id);
  return path;
}
const modelAnchors = new Map<string, Vector3>();
// A picked specimen is a navigation choice, not a factory-generated landmark.
// Rebuilding a parent must not replace that choice with its first instance.
const selectedAnchors = new Map<string, Vector3>();
export function setSelectedAnchor(
  parent: string,
  child: string,
  point: Vector3,
) {
  if ([point.x, point.y, point.z].every(Number.isFinite))
    selectedAnchors.set(parent + ">" + child, point.clone());
}
export function selectedAnchorEntries(): Record<string, number[]> {
  return Object.fromEntries(
    Array.from(selectedAnchors, ([key, point]) => [key, point.toArray()]),
  );
}
export function setModelAnchor(parent: string, child: string, point: Vector3) {
  modelAnchors.set(parent + ">" + child, point.clone());
}
export function childPosition(
  parent: WorldNode,
  child: WorldNode,
  index = parent.children.indexOf(child.id),
): Vector3 {
  const selected = selectedAnchors.get(parent.id + ">" + child.id);
  if (selected) return selected.clone();
  const modeled = modelAnchors.get(parent.id + ">" + child.id);
  if (modeled) return modeled.clone();
  if (parent.id === "world") {
    const h = frameMeters(child);
    const sites: Record<string, number[]> = {
      human: [2.7, h / 2, -0.1],
      tree: [-4.2, h / 2, -3],
      water: [0.22, 0.98, 3.6],
      cloud: [250, 150, -2500],
      rock: [5.5, h * 0.5, 1.3],
      mushroom: [-3.3, h * 0.5, 3.7],
    };
    return new Vector3(
      ...((sites[child.id] || [0, 0, 0]) as [number, number, number]),
    ).divideScalar(24);
  }
  const kind = child.model;
  if (parent.model === "human") {
    const organ: Record<string, number[]> = {
      heart: [0.045, 0.13, 0.025],
      lungs: [0, 0.15, -0.004],
      lung: [0, 0.15, -0.004],
      brain: [0, 0.395, 0],
      liver: [-0.045, 0.045, 0.04],
      vein: [0.15, -0.06, 0.035],
      vessel: [0.15, -0.06, 0.035],
      muscle: [-0.095, -0.2, 0.035],
      skin: [-0.15, -0.025, 0.04],
    };
    return new Vector3(
      ...((organ[kind] || [
        0.07 * (index % 2 ? 1 : -1),
        0.18 - index * 0.09,
        0.04,
      ]) as [number, number, number]),
    );
  }
  if (parent.model === "tree") {
    const sites: Record<string, number[]> = {
      wood: [0, -0.21, 0.04],
      leaf: [0.2, 0.22, 0.12],
      root: [-0.035, -0.41, 0.03],
    };
    return new Vector3(
      ...((sites[kind] || [0, -0.18, 0]) as [number, number, number]),
    );
  }
  if (parent.model === "glass" || parent.id === "water")
    return new Vector3(0, -0.07, 0.06);
  if (parent.model === "atom")
    return kind === "electron"
      ? new Vector3(0.24, 0.1, 0.16)
      : new Vector3(0, 0, 0);
  if (parent.children.length === 1) return new Vector3(0, 0, 0.055);
  if (kind === "nucleus" || kind === "cellNucleus")
    return new Vector3(-0.08, 0.06, 0.05);
  if (kind === "membrane" || kind === "cellWall")
    return new Vector3(0.26, -0.13, 0.03);
  const angle = index * 2.399963 + 0.55;
  const radius = parent.children.length > 3 ? 0.21 : 0.17;
  return new Vector3(
    Math.cos(angle) * radius,
    Math.sin(angle) * radius * 0.8,
    0.09 + (index % 2) * 0.025,
  );
}
/** Destination's origin expressed in the current frame. Work from the closest
 * common ancestor so nanometre offsets never get added to world coordinates. */
export function relativeFrame(
  from: string,
  to: string,
): { origin: Vector3; ratio: number } {
  const a = pathTo(from),
    b = pathTo(to);
  let i = 0;
  while (i < a.length && a[i] === b[i]) i++;
  const common = WORLD_NODES[a[Math.max(0, i - 1)]];
  const position = (path: string[]) => {
    const p = new Vector3();
    for (let j = i; j < path.length; j++) {
      const parent = WORLD_NODES[path[j - 1]],
        child = WORLD_NODES[path[j]];
      p.add(
        childPosition(parent, child).multiplyScalar(
          frameMeters(parent) / frameMeters(common),
        ),
      );
    }
    return p;
  };
  return {
    origin: position(b)
      .sub(position(a))
      .multiplyScalar(frameMeters(common) / frameMeters(WORLD_NODES[from])),
    ratio: frameMeters(WORLD_NODES[from]) / frameMeters(WORLD_NODES[to]),
  };
}
