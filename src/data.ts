import { t } from "./i18n";
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
    get name() {
      return t("Hydrogen");
    },
    z: 1,
    n: 0,
    get mass() {
      return t("1.008 u");
    },
    color: "#e3e6ed",
    config: "1s¹",
  },
  O: {
    get name() {
      return t("Oxygen");
    },
    z: 8,
    n: 8,
    get mass() {
      return t("15.999 u");
    },
    color: "#d36960",
    config: "1s² 2s² 2p⁴",
  },
  C: {
    get name() {
      return t("Carbon");
    },
    z: 6,
    n: 6,
    get mass() {
      return t("12.011 u");
    },
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
    get name() {
      return t("Water");
    },
    formula: "H₂O",
    get detail() {
      return t("A familiar molecule. A world to discover.");
    },
    atoms: [
      { element: "O", pos: [0, 0.5, 0] },
      { element: "H", pos: [-1.45, -0.62, 0] },
      { element: "H", pos: [1.45, -0.62, 0] },
    ],
    bonds: [
      [0, 1, 1],
      [0, 2, 1],
    ],
    get facts(): [string, string][] {
      return [
        [t("Geometry"), t("Bent")],
        [t("Angle H–O–H"), t("≈ 104.5°")],
        [t("O–H bond"), "≈ 96 pm"],
      ];
    },
    source: sources.water,
  },
  co2: {
    get name() {
      return t("Carbon dioxide");
    },
    formula: "CO₂",
    get detail() {
      return t("Three atoms. Two double bonds.");
    },
    atoms: [
      { element: "C", pos: [0, 0, 0] },
      { element: "O", pos: [-1.95, 0, 0] },
      { element: "O", pos: [1.95, 0, 0] },
    ],
    bonds: [
      [0, 1, 2],
      [0, 2, 2],
    ],
    get facts(): [string, string][] {
      return [
        [t("Geometry"), t("Linear")],
        [t("Angle O–C–O"), "180°"],
        [t("Bonds"), t("2 double bonds")],
      ];
    },
    source: "https://pubchem.ncbi.nlm.nih.gov/compound/Carbon-dioxide",
  },
  methane: {
    get name() {
      return t("Methane");
    },
    formula: "CH₄",
    get detail() {
      return t("One carbon atom. Four directions in space.");
    },
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
    get facts(): [string, string][] {
      return [
        [t("Geometry"), t("Tetrahedral")],
        [t("Angle H–C–H"), t("≈ 109.5°")],
        [t("Bonds"), t("4 single bonds")],
      ];
    },
    source: "https://pubchem.ncbi.nlm.nih.gov/compound/Methane",
  },
};
export const particles: Record<string, Entry> = {
  proton: {
    id: "proton",
    get name() {
      return t("Proton");
    },
    symbol: "p⁺",
    get category() {
      return t("NUCLEON · BARYON");
    },
    color: "#ce826e",
    get description() {
      return t(
        "The positive charge of the nucleus. The number of protons defines the element: eight protons always means oxygen.",
      );
    },
    get note() {
      return t(
        "Its structure includes three valence quarks (uud), gluons and a sea of quark–antiquark pairs.",
      );
    },
    get facts(): [string, string][] {
      return [
        [t("Charge"), "+1 e"],
        [t("Mass"), t("≈ 938.3 MeV/c²")],
        [t("Valence quarks"), "2 up · 1 down"],
      ];
    },
    source: sources.cern,
  },
  neutron: {
    id: "neutron",
    get name() {
      return t("Neutron");
    },
    symbol: "n⁰",
    get category() {
      return t("NUCLEON · BARYON");
    },
    color: "#a6b4c9",
    get description() {
      return t(
        "Electrically neutral, it forms part of the nucleus. The number of neutrons distinguishes isotopes of the same element.",
      );
    },
    get note() {
      return t(
        "The neutron contains three valence quarks (udd), along with gluons and a sea of quark–antiquark pairs.",
      );
    },
    get facts(): [string, string][] {
      return [
        [t("Charge"), "0"],
        [t("Mass"), t("≈ 939.6 MeV/c²")],
        [t("Valence quarks"), "1 up · 2 down"],
      ];
    },
    source: sources.cern,
  },
  electron: {
    id: "electron",
    get name() {
      return t("Electron");
    },
    symbol: "e⁻",
    get category() {
      return t("ELEMENTARY PARTICLE · LEPTON");
    },
    color: "#82b6f2",
    get description() {
      return t(
        "The electron carries a negative charge. In an atom, its quantum state is described by an orbital, which lets us calculate the probability of finding it in a given region.",
      );
    },
    get note() {
      return t(
        "The dots and clouds are visual guides. They are neither trajectories nor a photograph of the atom.",
      );
    },
    get facts(): [string, string][] {
      return [
        [t("Charge"), "−1 e"],
        [t("Mass"), t("≈ 0.511 MeV/c²")],
        [t("Spin"), "½"],
      ];
    },
    source: sources.atom,
  },
  up: {
    id: "up",
    get name() {
      return t("Up quark");
    },
    symbol: "u",
    get category() {
      return t("ELEMENTARY PARTICLE · QUARK");
    },
    color: "#deb778",
    get description() {
      return t(
        "One of the two types of valence quarks in ordinary matter. Two up quarks and one down quark give the proton its positive charge.",
      );
    },
    get note() {
      return t(
        "Quarks are confined: the exploded view illustrates their composition, not a physically possible separation into free quarks.",
      );
    },
    get facts(): [string, string][] {
      return [
        [t("Charge"), "+⅔ e"],
        [t("Spin"), "½"],
        [t("Generation"), t("First")],
      ];
    },
    source: sources.cern,
  },
  down: {
    id: "down",
    get name() {
      return t("Down quark");
    },
    symbol: "d",
    get category() {
      return t("ELEMENTARY PARTICLE · QUARK");
    },
    color: "#b499d4",
    get description() {
      return t(
        "Together with the up quark, it makes up the valence quarks of protons and neutrons. One up and two down quarks give the neutron zero net charge.",
      );
    },
    get note() {
      return t(
        "The colors identify particle types here. They do not represent the color charge of quantum chromodynamics.",
      );
    },
    get facts(): [string, string][] {
      return [
        [t("Charge"), "−⅓ e"],
        [t("Spin"), "½"],
        [t("Generation"), t("First")],
      ];
    },
    source: sources.cern,
  },
  photon: {
    id: "photon",
    get name() {
      return t("Photon");
    },
    symbol: "γ",
    get category() {
      return t("BOSON · ELECTROMAGNETIC INTERACTION");
    },
    color: "#deb778",
    get description() {
      return t(
        "A quantum of light. An atom can absorb a photon whose energy matches an allowed transition, then emit light as it returns to a lower-energy state.",
      );
    },
    get note() {
      return t(
        "The sequence illustrates a hydrogen transition between n = 1 and n = 2. Timing, sizes and the shape of the photon are schematic.",
      );
    },
    get facts(): [string, string][] {
      return [
        [t("Rest mass"), "0"],
        [t("Charge"), "0"],
        [t("Illustrated energy"), t("≈ 10.2 eV · 121.6 nm")],
      ];
    },
    source: sources.light,
  },
  gluon: {
    id: "gluon",
    get name() {
      return t("Gluon");
    },
    symbol: "g",
    get category() {
      return t("BOSON · STRONG INTERACTION");
    },
    color: "#a3bde7",
    get description() {
      return t(
        "Gluons mediate the strong interaction between quarks and also interact with one another. They contribute to the dynamics that keep quarks inside hadrons.",
      );
    },
    get note() {
      return t(
        "The curves symbolize interactions. A gluon is not a spring, and quarks are not connected by wires.",
      );
    },
    get facts(): [string, string][] {
      return [
        [t("Rest mass"), "0"],
        [t("Electric charge"), "0"],
        [t("Color states"), "8"],
      ];
    },
    source: sources.cern,
  },
  higgs: {
    id: "higgs",
    get name() {
      return t("Higgs boson");
    },
    symbol: "H⁰",
    get category() {
      return t("SCALAR BOSON · HIGGS FIELD");
    },
    color: "#bd9abc",
    get description() {
      return t(
        "The Higgs boson is an excitation of the Higgs field. Interaction with this field contributes to the mass of elementary particles that couple to it.",
      );
    },
    get note() {
      return t(
        "The field is depicted as a surface and its excitation as a pulse. Most of a proton’s mass comes from the dynamics of the strong interaction.",
      );
    },
    get facts(): [string, string][] {
      return [
        [t("Mass"), "≈ 125 GeV/c²"],
        [t("Spin"), "0"],
        [t("Discovery"), t("2012 · CERN")],
      ];
    },
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
    get name() {
      return e.name;
    },
    symbol: element,
    get category() {
      return t("ATOM · CHEMICAL ELEMENT");
    },
    color: e.color,
    get description() {
      return t(
        "A {element} atom contains {protons} {protonWord} and {electrons} {electronWord}. Here we explore isotope {isotope}, with {neutrons} {neutronWord}.",
        {
          element: e.name.toLowerCase(),
          protons: e.z,
          protonWord: t(e.z === 1 ? "proton" : "protons"),
          electrons: e.z,
          electronWord: t(e.z === 1 ? "electron" : "electrons"),
          isotope: e.z + e.n,
          neutrons: e.n,
          neutronWord: t(e.n === 1 ? "neutron" : "neutrons"),
        },
      );
    },
    get note() {
      return t(
        "The molecular model shows bonded atoms. Entering an atom switches to an isolated-atom model with adjusted scales.",
      );
    },
    get facts(): [string, string][] {
      return [
        [t("Atomic number"), String(e.z)],
        [t("Isotope shown"), `${element}-${e.z + e.n}`],
        [t("Configuration"), e.config],
      ];
    },
    source: sources.atom,

    element,
  };
}
export function nucleusEntry(element: ElementId): Entry {
  const e = elements[element];
  return {
    id: "nucleus",
    get name() {
      return t("{name} nucleus", { name: e.name });
    },
    symbol: isotopeSymbol(element),
    get category() {
      return t("ATOMIC STRUCTURE · NUCLEUS");
    },
    color: "#ce826e",
    get description() {
      return t(
        "This nucleus contains {protons} {protonWord}{neutrons}. It holds almost all the mass of the atom and is much smaller than the electron cloud.",
        {
          protons: e.z,
          protonWord: t(e.z === 1 ? "proton" : "protons"),
          neutrons: e.n ? t(" and {count} neutrons", { count: e.n }) : "",
        },
      );
    },
    get note() {
      return t(
        "The nucleus is greatly enlarged in the atomic view to keep it visible. Nucleons are represented by conventional spheres.",
      );
    },
    get facts(): [string, string][] {
      return [
        [t("Protons"), String(e.z)],
        [t("Neutrons"), String(e.n)],
        [t("Mass number"), String(e.z + e.n)],
      ];
    },
    source: sources.cern,

    element,
  };
}
