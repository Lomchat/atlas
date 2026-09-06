import {
  atomEntry,
  elements,
  isotopeSymbol,
  molecules,
  nucleusEntry,
  particles,
} from "./data";
import type { ElementId, Entry, MoleculeId } from "./data";
export type Kind =
  | "molecule"
  | "atom"
  | "nucleus"
  | "proton"
  | "neutron"
  | "electron"
  | "up"
  | "down";
export interface MatterNode {
  id: string;
  parent: string | null;
  kind: Kind;
  entry: Entry;
  children: string[];
  atom: number;
  element: ElementId;
  index: number;
}
export interface MatterGraph {
  nodes: Map<string, MatterNode>;
  root: string;
  atoms: string[];
  totals: {
    atoms: number;
    electrons: number;
    nucleons: number;
    quarks: number;
  };
}
export interface ExplorerState {
  molecule: MoleculeId;
  depth: number;
  overrides: Record<string, number>;
  selected: string | null;
  focus: string | null;
  labels: boolean;
  cloud: boolean;
  light: boolean;
  rotate: boolean;
  reset: number;
  zoom: number;
  photon: number;
  higgs: boolean;
}
export const defaultState: ExplorerState = {
  molecule: "water",
  depth: 0,
  overrides: {},
  selected: null,
  focus: null,
  labels: true,
  cloud: true,
  light: false,
  rotate: false,
  reset: 0,
  zoom: 0,
  photon: 0,
  higgs: false,
};
export function createGraph(molecule: MoleculeId): MatterGraph {
  const m = molecules[molecule],
    nodes = new Map<string, MatterNode>(),
    root = "molecule",
    atoms: string[] = [];
  const totals = {
    atoms: m.atoms.length,
    electrons: 0,
    nucleons: 0,
    quarks: 0,
  };
  const add = (n: MatterNode) => {
    nodes.set(n.id, n);
    if (n.parent) nodes.get(n.parent)!.children.push(n.id);
  };
  add({
    id: root,
    parent: null,
    kind: "molecule",
    atom: -1,
    index: 0,
    element: m.atoms[0].element,
    children: [],
    entry: {
      id: root,
      name: m.name,
      symbol: m.formula,
      color: "#c6cbd4",
      category: "MOLÉCULE",
      description: `${m.name} est composée de ${m.atoms.length} atomes liés. Ouvrez un atome pour voir son noyau et ses électrons, puis un nucléon pour révéler ses quarks. Tout reste dans cette même molécule.`,
      note: "La décomposition est une vue pédagogique de la composition, pas une réaction chimique. Les dimensions sont adaptées pour rendre visibles les structures imbriquées.",
      facts: m.facts,
      source: m.source,
    },
  });
  m.atoms.forEach((a, i) => {
    const e = elements[a.element],
      id = `atom-${i}`;
    atoms.push(id);
    add({
      id,
      parent: root,
      kind: "atom",
      atom: i,
      index: i,
      element: a.element,
      children: [],
      entry: {
        ...atomEntry(a.element, id),
        name: `${e.name} ${i + 1}`,
        color: e.color,
      },
    });
    const nucleus = `${id}/nucleus`;
    add({
      id: nucleus,
      parent: id,
      kind: "nucleus",
      atom: i,
      index: 0,
      element: a.element,
      children: [],
      entry: {
        ...nucleusEntry(a.element),
        id: nucleus,
        name: `Noyau ${isotopeSymbol(a.element)}`,
      },
    });
    for (let j = 0; j < e.z + e.n; j++) {
      const kind = j < e.z ? "proton" : "neutron",
        index = j < e.z ? j : j - e.z,
        nid = `${nucleus}/${kind}-${index}`;
      add({
        id: nid,
        parent: nucleus,
        kind,
        atom: i,
        index: j,
        element: a.element,
        children: [],
        entry: {
          ...particles[kind],
          id: nid,
          name: `${kind === "proton" ? "Proton" : "Neutron"} ${index + 1}`,
        },
      });
      (kind === "proton"
        ? ["up", "up", "down"]
        : ["up", "down", "down"]
      ).forEach((q, k) => {
        const qid = `${nid}/${q}-${k}`;
        add({
          id: qid,
          parent: nid,
          kind: q as Kind,
          atom: i,
          index: k,
          element: a.element,
          children: [],
          entry: { ...particles[q], id: qid },
        });
        totals.quarks++;
      });
      totals.nucleons++;
    }
    for (let j = 0; j < e.z; j++) {
      const eid = `${id}/electron-${j}`;
      add({
        id: eid,
        parent: id,
        kind: "electron",
        atom: i,
        index: j,
        element: a.element,
        children: [],
        entry: { ...particles.electron, id: eid, name: `Électron ${j + 1}` },
      });
      totals.electrons++;
    }
  });
  return { nodes, root, atoms, totals };
}
export function ancestors(graph: MatterGraph, id: string): MatterNode[] {
  const result: MatterNode[] = [];
  let n = graph.nodes.get(id);
  while (n) {
    result.unshift(n);
    n = n.parent ? graph.nodes.get(n.parent) : undefined;
  }
  return result;
}
export function expansion(node: MatterNode, state: ExplorerState): number {
  if (!node.children.length) return 0;
  if (Object.hasOwn(state.overrides, node.id)) return state.overrides[node.id];
  const [start, end] =
    node.kind === "molecule"
      ? [0, 24]
      : node.kind === "atom"
        ? [15, 50]
        : node.kind === "nucleus"
          ? [45, 78]
          : [72, 100];
  const x = Math.min(1, Math.max(0, (state.depth - start) / (end - start)));
  return x * x * (3 - 2 * x);
}
export function openBranch(
  graph: MatterGraph,
  state: ExplorerState,
  id: string,
): Record<string, number> {
  const overrides = { ...state.overrides };
  for (const n of ancestors(graph, id))
    if (n.children.length) overrides[n.id] = 1;
  return overrides;
}
export function descendants(graph: MatterGraph, id: string): string[] {
  const result: string[] = [];
  const visit = (nid: string) => {
    result.push(nid);
    graph.nodes.get(nid)?.children.forEach(visit);
  };
  visit(id);
  return result;
}
export const kindNames: Record<Kind, string> = {
  molecule: "molécule",
  atom: "atome",
  nucleus: "noyau",
  proton: "proton",
  neutron: "neutron",
  electron: "électron",
  up: "quark up",
  down: "quark down",
};
