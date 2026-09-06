import { scaleEntry, scaleIds } from "./scales";
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
  | "sample"
  | "portion"
  | "neighborhood"
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
  selected: string | null;
  focus: string | null;
  labels: boolean;
  cloud: boolean;
  light: boolean;
  rotate: boolean;
  reset: number;
  navigation: number;
  destinations: Record<string, string>;
  photon: number;
  higgs: boolean;
  interaction:
    | "none"
    | "cohesion"
    | "motion"
    | "bonds"
    | "nuclear"
    | "strong"
    | "photon"
    | "higgs";
  phase: number;
}
export interface SceneDetail {
  molecule: MoleculeId;
  open: string[];
  readable: string[];
  count: number;
  layer: string;
  context: string | null;
  viewpoint: string;
  next: string | null;
  navigation: number;
  transitioning: boolean;
}
export const defaultState: ExplorerState = {
  molecule: "water",
  selected: null,
  focus: null,
  labels: true,
  cloud: true,
  light: false,
  rotate: false,
  reset: 0,
  navigation: 0,
  destinations: {},
  photon: 0,
  higgs: false,
  interaction: "none",
  phase: 0,
};
export function createGraph(molecule: MoleculeId): MatterGraph {
  const m = molecules[molecule],
    nodes = new Map<string, MatterNode>(),
    root = "sample",
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
  scaleIds.forEach((id, i) =>
    add({
      id,
      parent: i ? scaleIds[i - 1] : null,
      kind: id,
      atom: -1,
      index: 0,
      element: m.atoms[0].element,
      children: [],
      entry: scaleEntry(molecule, id),
    }),
  );
  add({
    id: "molecule",
    parent: "neighborhood",
    kind: "molecule",
    atom: -1,
    index: 0,
    element: m.atoms[0].element,
    children: [],
    entry: {
      id: "molecule",
      name:
        molecule === "water"
          ? "Molécule d’eau"
          : molecule === "co2"
            ? "Molécule de CO₂"
            : "Molécule de méthane",
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
      parent: "molecule",
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
  return node.kind !== "molecule" &&
    node.children.length > 0 &&
    state.focus &&
    (state.focus === node.id || state.focus.startsWith(node.id + "/"))
    ? 1
    : 0;
}
export const kindNames: Record<Kind, string> = {
  sample: "objet",
  portion: "volume",
  neighborhood: "voisinage",
  molecule: "molécule",
  atom: "atome",
  nucleus: "noyau",
  proton: "proton",
  neutron: "neutron",
  electron: "électron",
  up: "quark up",
  down: "quark down",
};
