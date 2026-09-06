export type ElementId = "H" | "O" | "C";
export type MoleculeId = "water" | "co2" | "methane";
export type Vec3 = [number, number, number];
export interface Entry {
  id: string;
  name: string;
  symbol: string;
  category: string;
  color: string;
  description: string;
  note: string;
  facts: [string, string][];
  source: string;
  element?: ElementId;
}
export const sources = {
  cern: "https://home.cern/science/physics/standard-model/",
  higgs: "https://home.cern/science/physics/higgs-boson",
  water: "https://pubchem.ncbi.nlm.nih.gov/compound/Water",
  atom: "https://openstax.org/books/chemistry-2e/pages/6-3-development-of-quantum-theory",
  light: "https://openstax.org/books/chemistry-2e/pages/6-2-the-bohr-model",
};
export const elements: Record<
  ElementId,
  {
    name: string;
    z: number;
    n: number;
    mass: string;
    color: string;
    config: string;
  }
> = {
  H: {
    name: "Hydrogen",
    z: 1,
    n: 0,
    mass: "1.008 u",
    color: "#e3e6ed",
    config: "1s¹",
  },
  O: {
    name: "Oxygen",
    z: 8,
    n: 8,
    mass: "15.999 u",
    color: "#d36960",
    config: "1s² 2s² 2p⁴",
  },
  C: {
    name: "Carbon",
    z: 6,
    n: 6,
    mass: "12.011 u",
    color: "#798494",
    config: "1s² 2s² 2p²",
  },
};
export const molecules: Record<
  MoleculeId,
  {
    name: string;
    formula: string;
    detail: string;
    atoms: { element: ElementId; pos: Vec3 }[];
    bonds: [number, number, number][];
    facts: [string, string][];
    source: string;
  }
> = {
  water: {
    name: "Water",
    formula: "H₂O",
    detail: "A familiar molecule. A world to discover.",
    atoms: [
      { element: "O", pos: [0, 0.5, 0] },
      { element: "H", pos: [-1.45, -0.62, 0] },
      { element: "H", pos: [1.45, -0.62, 0] },
    ],
    bonds: [
      [0, 1, 1],
      [0, 2, 1],
    ],
    facts: [
      ["Geometry", "Bent"],
      ["Angle H–O–H", "≈ 104.5°"],
      ["O–H bond", "≈ 96 pm"],
    ],
    source: sources.water,
  },
  co2: {
    name: "Carbon dioxide",
    formula: "CO₂",
    detail: "Three atoms. Two double bonds.",
    atoms: [
      { element: "C", pos: [0, 0, 0] },
      { element: "O", pos: [-1.95, 0, 0] },
      { element: "O", pos: [1.95, 0, 0] },
    ],
    bonds: [
      [0, 1, 2],
      [0, 2, 2],
    ],
    facts: [
      ["Geometry", "Linear"],
      ["Angle O–C–O", "180°"],
      ["Bonds", "2 double bonds"],
    ],
    source: "https://pubchem.ncbi.nlm.nih.gov/compound/Carbon-dioxide",
  },
  methane: {
    name: "Methane",
    formula: "CH₄",
    detail: "One carbon atom. Four directions in space.",
    atoms: [
      { element: "C", pos: [0, 0, 0] },
      { element: "H", pos: [1.12, 1.12, 1.12] },
      { element: "H", pos: [-1.12, -1.12, 1.12] },
      { element: "H", pos: [-1.12, 1.12, -1.12] },
      { element: "H", pos: [1.12, -1.12, -1.12] },
    ],
    bonds: [
      [0, 1, 1],
      [0, 2, 1],
      [0, 3, 1],
      [0, 4, 1],
    ],
    facts: [
      ["Geometry", "Tetrahedral"],
      ["Angle H–C–H", "≈ 109.5°"],
      ["Bonds", "4 single bonds"],
    ],
    source: "https://pubchem.ncbi.nlm.nih.gov/compound/Methane",
  },
};
export const particles: Record<string, Entry> = {
  proton: {
    id: "proton",
    name: "Proton",
    symbol: "p⁺",
    category: "NUCLEON · BARYON",
    color: "#ce826e",
    description:
      "The positive charge of the nucleus. The number of protons defines the element: eight protons always means oxygen.",
    note: "Its structure includes three valence quarks (uud), gluons and a sea of quark–antiquark pairs.",
    facts: [
      ["Charge", "+1 e"],
      ["Mass", "≈ 938.3 MeV/c²"],
      ["Valence quarks", "2 up · 1 down"],
    ],
    source: sources.cern,
  },
  neutron: {
    id: "neutron",
    name: "Neutron",
    symbol: "n⁰",
    category: "NUCLEON · BARYON",
    color: "#a6b4c9",
    description:
      "Electrically neutral, it forms part of the nucleus. The number of neutrons distinguishes isotopes of the same element.",
    note: "The neutron contains three valence quarks (udd), along with gluons and a sea of quark–antiquark pairs.",
    facts: [
      ["Charge", "0"],
      ["Mass", "≈ 939.6 MeV/c²"],
      ["Valence quarks", "1 up · 2 down"],
    ],
    source: sources.cern,
  },
  electron: {
    id: "electron",
    name: "Electron",
    symbol: "e⁻",
    category: "ELEMENTARY PARTICLE · LEPTON",
    color: "#82b6f2",
    description:
      "The electron carries a negative charge. In an atom, its quantum state is described by an orbital, which lets us calculate the probability of finding it in a given region.",
    note: "The dots and clouds are visual guides. They are neither trajectories nor a photograph of the atom.",
    facts: [
      ["Charge", "−1 e"],
      ["Mass", "≈ 0.511 MeV/c²"],
      ["Spin", "½"],
    ],
    source: sources.atom,
  },
  up: {
    id: "up",
    name: "Up quark",
    symbol: "u",
    category: "ELEMENTARY PARTICLE · QUARK",
    color: "#deb778",
    description:
      "One of the two types of valence quarks in ordinary matter. Two up quarks and one down quark give the proton its positive charge.",
    note: "Quarks are confined: the exploded view illustrates their composition, not a physically possible separation into free quarks.",
    facts: [
      ["Charge", "+⅔ e"],
      ["Spin", "½"],
      ["Generation", "First"],
    ],
    source: sources.cern,
  },
  down: {
    id: "down",
    name: "Down quark",
    symbol: "d",
    category: "ELEMENTARY PARTICLE · QUARK",
    color: "#b499d4",
    description:
      "Together with the up quark, it makes up the valence quarks of protons and neutrons. One up and two down quarks give the neutron zero net charge.",
    note: "The colors identify particle types here. They do not represent the color charge of quantum chromodynamics.",
    facts: [
      ["Charge", "−⅓ e"],
      ["Spin", "½"],
      ["Generation", "First"],
    ],
    source: sources.cern,
  },
  photon: {
    id: "photon",
    name: "Photon",
    symbol: "γ",
    category: "BOSON · ELECTROMAGNETIC INTERACTION",
    color: "#deb778",
    description:
      "A quantum of light. An atom can absorb a photon whose energy matches an allowed transition, then emit light as it returns to a lower-energy state.",
    note: "The sequence illustrates a hydrogen transition between n = 1 and n = 2. Timing, sizes and the shape of the photon are schematic.",
    facts: [
      ["Rest mass", "0"],
      ["Charge", "0"],
      ["Illustrated energy", "≈ 10.2 eV · 121.6 nm"],
    ],
    source: sources.light,
  },
  gluon: {
    id: "gluon",
    name: "Gluon",
    symbol: "g",
    category: "BOSON · STRONG INTERACTION",
    color: "#a3bde7",
    description:
      "Gluons mediate the strong interaction between quarks and also interact with one another. They contribute to the dynamics that keep quarks inside hadrons.",
    note: "The curves symbolize interactions. A gluon is not a spring, and quarks are not connected by wires.",
    facts: [
      ["Rest mass", "0"],
      ["Electric charge", "0"],
      ["Color states", "8"],
    ],
    source: sources.cern,
  },
  higgs: {
    id: "higgs",
    name: "Higgs boson",
    symbol: "H⁰",
    category: "SCALAR BOSON · HIGGS FIELD",
    color: "#bd9abc",
    description:
      "The Higgs boson is an excitation of the Higgs field. Interaction with this field contributes to the mass of elementary particles that couple to it.",
    note: "The field is depicted as a surface and its excitation as a pulse. Most of a proton’s mass comes from the dynamics of the strong interaction.",
    facts: [
      ["Mass", "≈ 125 GeV/c²"],
      ["Spin", "0"],
      ["Discovery", "2012 · CERN"],
    ],
    source: sources.higgs,
  },
};
export const elementOf = (element: ElementId) =>
  elements[element].name.toLowerCase();
export const isotopeSymbol = (element: ElementId) =>
  String(elements[element].z + elements[element].n).replace(
    /[0-9]/g,
    (n) => "⁰¹²³⁴⁵⁶⁷⁸⁹"[Number(n)],
  ) + element;
export function atomEntry(element: ElementId, id = "atom"): Entry {
  const e = elements[element];
  return {
    id,
    name: e.name,
    symbol: element,
    category: "ATOM · CHEMICAL ELEMENT",
    color: e.color,
    description: `A neutral ${elementOf(element)} atom contains ${e.z} proton${e.z !== 1 ? "s" : ""} and ${e.z} electron${e.z !== 1 ? "s" : ""}. Here we explore isotope ${e.z + e.n}, with ${e.n} neutron${e.n !== 1 ? "s" : ""}.`,
    note: "The molecular model shows bonded atoms. Entering an atom switches to an isolated-atom model with adjusted scales.",
    facts: [
      ["Atomic number", String(e.z)],
      ["Isotope shown", `${element}-${e.z + e.n}`],
      ["Configuration", e.config],
    ],
    source: sources.atom,

    element,
  };
}
export function nucleusEntry(element: ElementId): Entry {
  const e = elements[element];
  return {
    id: "nucleus",
    name: `${e.name} nucleus`,
    symbol: isotopeSymbol(element),
    category: "ATOMIC STRUCTURE · NUCLEUS",
    color: "#ce826e",
    description: `${e.z} proton${e.z !== 1 ? "s" : ""}${e.n ? ` and ${e.n} neutrons` : ""} ${e.z + e.n === 1 ? "holds" : "hold"} almost all the mass of this atom. The nucleus is much smaller than the electron cloud.`,
    note: "The nucleus is greatly enlarged in the atomic view to keep it visible. Nucleons are represented by conventional spheres.",
    facts: [
      ["Protons", String(e.z)],
      ["Neutrons", String(e.n)],
      ["Mass number", String(e.z + e.n)],
    ],
    source: sources.cern,

    element,
  };
}
