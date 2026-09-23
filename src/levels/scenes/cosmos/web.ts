/**
 * A procedural cosmic web: clusters (nodes) scattered with a minimum spacing
 * and linked to their nearest neighbours by gently curved filaments of
 * galaxies. Used by the observable Universe and around Laniakea.
 */
import * as THREE from "three";
import { gauss, mixColor, randomDirection } from "./fx";

export interface Web {
  nodes: THREE.Vector3[];
  weights: number[];
  edges: [number, number][];
}

export interface WebOptions {
  /** Nodes are placed in a ball of this radius around `centre`... */
  radius: number;
  centre?: THREE.Vector3;
  /** ...or in a box of these half-extents (overrides the ball). */
  box?: THREE.Vector3;
  spacing: number;
  link: number;
  maxLinks: number;
  tries: number;
  /** Nodes that must exist (heavy clusters). */
  seeds?: THREE.Vector3[];
  /** Keep nodes out of these regions. */
  avoid?: (p: THREE.Vector3) => boolean;
}

/** Poisson-disc nodes linked to their nearest neighbours. */
export function buildWeb(random: () => number, options: WebOptions): Web {
  const nodes: THREE.Vector3[] = (options.seeds ?? []).map((p) => p.clone());
  const weights: number[] = nodes.map(() => 1.6);
  const p = new THREE.Vector3();
  const spacing2 = options.spacing * options.spacing;
  for (let t = 0; t < options.tries; t++) {
    if (options.box) p.set((random() * 2 - 1) * options.box.x, (random() * 2 - 1) * options.box.y, (random() * 2 - 1) * options.box.z);
    else randomDirection(random, p).multiplyScalar(options.radius * Math.cbrt(random()));
    if (options.centre) p.add(options.centre);
    if (options.avoid?.(p)) continue;
    if (nodes.some((n) => n.distanceToSquared(p) < spacing2)) continue;
    nodes.push(p.clone());
    weights.push(0.35 + Math.pow(random(), 3) * 1.3);
  }
  const edges: [number, number][] = [];
  const seen = new Set<number>();
  nodes.forEach((a, i) => {
    const near = nodes
      .map((b, j) => ({ j, d: a.distanceTo(b) }))
      .filter((e) => e.j !== i && e.d < options.link)
      .sort((x, y) => x.d - y.d)
      .slice(0, options.maxLinks);
    for (const { j } of near) {
      const key = Math.min(i, j) * 100000 + Math.max(i, j);
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push([i, j]);
    }
  });
  return { nodes, weights, edges };
}

export interface WebCloud {
  positions: number[];
  colors: number[];
  sizes: number[];
}

/** Scatter galaxies along the filaments and around the nodes of a web. */
export function scatterWeb(
  random: () => number,
  web: Web,
  options: {
    perUnit: number;
    thickness: number;
    bend: number;
    nodeCount: number;
    nodeSpread: number;
    colors: [string, string];
    nodeColors: [string, string];
    intensity?: number;
    skip?: (p: THREE.Vector3) => boolean;
  },
): WebCloud {
  const out: WebCloud = { positions: [], colors: [], sizes: [] };
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const q = new THREE.Vector3();
  const intensity = options.intensity ?? 1;
  for (const [i, j] of web.edges) {
    a.copy(web.nodes[i]);
    b.copy(web.nodes[j]);
    const length = a.distanceTo(b);
    c.copy(a).add(b).multiplyScalar(0.5);
    c.x += gauss(random) * options.bend * length;
    c.y += gauss(random) * options.bend * length;
    c.z += gauss(random) * options.bend * length;
    const strength = 0.3 + 0.7 * Math.min(web.weights[i], web.weights[j]) * (0.4 + random());
    const count = Math.round(length * options.perUnit * strength);
    for (let k = 0; k < count; k++) {
      const t = 0.5 - 0.5 * Math.cos(Math.PI * random());
      q.copy(a)
        .multiplyScalar((1 - t) * (1 - t))
        .addScaledVector(c, 2 * t * (1 - t))
        .addScaledVector(b, t * t);
      const spread = options.thickness * (0.4 + Math.sin(Math.PI * t) * random());
      q.x += gauss(random) * spread;
      q.y += gauss(random) * spread;
      q.z += gauss(random) * spread;
      if (options.skip?.(q)) continue;
      out.positions.push(q.x, q.y, q.z);
      mixColor(out.colors, options.colors[0], options.colors[1], random(), intensity * (0.5 + 0.5 * random()));
      out.sizes.push(0.4 + Math.pow(random(), 4) * 1.5);
    }
  }
  web.nodes.forEach((node, i) => {
    const count = Math.round(options.nodeCount * web.weights[i]);
    const sigma = options.nodeSpread * (0.5 + web.weights[i] * 0.5);
    for (let k = 0; k < count; k++) {
      q.set(node.x + gauss(random) * sigma, node.y + gauss(random) * sigma, node.z + gauss(random) * sigma);
      if (options.skip?.(q)) continue;
      out.positions.push(q.x, q.y, q.z);
      mixColor(out.colors, options.nodeColors[0], options.nodeColors[1], random(), intensity * 0.85);
      out.sizes.push(0.4 + random() * 0.9);
    }
  });
  return out;
}
