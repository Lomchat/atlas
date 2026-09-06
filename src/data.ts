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
    name: "Hydrogène",
    z: 1,
    n: 0,
    mass: "1,008 u",
    color: "#e3e6ed",
    config: "1s¹",
  },
  O: {
    name: "Oxygène",
    z: 8,
    n: 8,
    mass: "15,999 u",
    color: "#d36960",
    config: "1s² 2s² 2p⁴",
  },
  C: {
    name: "Carbone",
    z: 6,
    n: 6,
    mass: "12,011 u",
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
    name: "Eau",
    formula: "H₂O",
    detail: "Une molécule familière. Un monde à découvrir.",
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
      ["Géométrie", "Coudée"],
      ["Angle H–O–H", "≈ 104,5°"],
      ["Liaison O–H", "≈ 96 pm"],
    ],
    source: sources.water,
  },
  co2: {
    name: "Dioxyde de carbone",
    formula: "CO₂",
    detail: "Trois atomes. Deux doubles liaisons.",
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
      ["Géométrie", "Linéaire"],
      ["Angle O–C–O", "180°"],
      ["Liaisons", "2 doubles"],
    ],
    source: "https://pubchem.ncbi.nlm.nih.gov/compound/Carbon-dioxide",
  },
  methane: {
    name: "Méthane",
    formula: "CH₄",
    detail: "Un carbone. Quatre directions dans l’espace.",
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
      ["Géométrie", "Tétraédrique"],
      ["Angle H–C–H", "≈ 109,5°"],
      ["Liaisons", "4 simples"],
    ],
    source: "https://pubchem.ncbi.nlm.nih.gov/compound/Methane",
  },
};
export const particles: Record<string, Entry> = {
  proton: {
    id: "proton",
    name: "Proton",
    symbol: "p⁺",
    category: "NUCLÉON · BARYON",
    color: "#ce826e",
    description:
      "La charge positive du noyau. Le nombre de protons définit l’élément : huit protons, c’est toujours de l’oxygène.",
    note: "Trois quarks de valence (uud), des gluons et une mer de paires quark–antiquark composent sa structure.",
    facts: [
      ["Charge", "+1 e"],
      ["Masse", "≈ 938,3 MeV/c²"],
      ["Quarks de valence", "2 up · 1 down"],
    ],
    source: sources.cern,
  },
  neutron: {
    id: "neutron",
    name: "Neutron",
    symbol: "n⁰",
    category: "NUCLÉON · BARYON",
    color: "#a6b4c9",
    description:
      "Électriquement neutre, il participe à la structure du noyau. Le nombre de neutrons distingue les isotopes d’un même élément.",
    note: "Le neutron contient trois quarks de valence (udd), ainsi que des gluons et une mer de paires quark–antiquark.",
    facts: [
      ["Charge", "0"],
      ["Masse", "≈ 939,6 MeV/c²"],
      ["Quarks de valence", "1 up · 2 down"],
    ],
    source: sources.cern,
  },
  electron: {
    id: "electron",
    name: "Électron",
    symbol: "e⁻",
    category: "PARTICULE ÉLÉMENTAIRE · LEPTON",
    color: "#82b6f2",
    description:
      "L’électron porte une charge négative. Dans un atome, son état quantique est décrit par une orbitale, qui permet de calculer des probabilités de présence.",
    note: "Les points et les nuages sont des repères pédagogiques. Ils ne représentent pas des trajectoires ni une photographie de l’atome.",
    facts: [
      ["Charge", "−1 e"],
      ["Masse", "≈ 0,511 MeV/c²"],
      ["Spin", "½"],
    ],
    source: sources.atom,
  },
  up: {
    id: "up",
    name: "Quark up",
    symbol: "u",
    category: "PARTICULE ÉLÉMENTAIRE · QUARK",
    color: "#deb778",
    description:
      "Un des deux types de quarks de valence de la matière ordinaire. Deux quarks up et un down donnent au proton sa charge positive.",
    note: "Les quarks sont confinés : la vue éclatée est un schéma de leur composition, pas une séparation physiquement réalisable en quarks libres.",
    facts: [
      ["Charge", "+⅔ e"],
      ["Spin", "½"],
      ["Génération", "Première"],
    ],
    source: sources.cern,
  },
  down: {
    id: "down",
    name: "Quark down",
    symbol: "d",
    category: "PARTICULE ÉLÉMENTAIRE · QUARK",
    color: "#b499d4",
    description:
      "Avec le quark up, il compose les quarks de valence des protons et des neutrons. Un up et deux down donnent un neutron de charge nulle.",
    note: "Les teintes identifient ici les types de particules. Elles ne représentent pas la charge de couleur de la chromodynamique quantique.",
    facts: [
      ["Charge", "−⅓ e"],
      ["Spin", "½"],
      ["Génération", "Première"],
    ],
    source: sources.cern,
  },
  photon: {
    id: "photon",
    name: "Photon",
    symbol: "γ",
    category: "BOSON · INTERACTION ÉLECTROMAGNÉTIQUE",
    color: "#deb778",
    description:
      "Le quantum de lumière. Un atome peut absorber un photon dont l’énergie correspond à une transition permise, puis émettre de la lumière en revenant vers un état de plus basse énergie.",
    note: "La séquence illustre une transition de l’hydrogène entre n = 1 et n = 2. Temps, tailles et forme du photon sont schématiques.",
    facts: [
      ["Masse au repos", "0"],
      ["Charge", "0"],
      ["Énergie illustrée", "≈ 10,2 eV · 121,6 nm"],
    ],
    source: sources.light,
  },
  gluon: {
    id: "gluon",
    name: "Gluon",
    symbol: "g",
    category: "BOSON · INTERACTION FORTE",
    color: "#a3bde7",
    description:
      "Les gluons transmettent l’interaction forte entre les quarks et interagissent aussi entre eux. Ils participent à la dynamique qui maintient les quarks dans les hadrons.",
    note: "Les courbes sont un symbole des interactions. Un gluon n’est pas un ressort et les quarks ne sont pas reliés par des fils.",
    facts: [
      ["Masse au repos", "0"],
      ["Charge électrique", "0"],
      ["États de couleur", "8"],
    ],
    source: sources.cern,
  },
  higgs: {
    id: "higgs",
    name: "Boson de Higgs",
    symbol: "H⁰",
    category: "BOSON SCALAIRE · CHAMP DE HIGGS",
    color: "#bd9abc",
    description:
      "Le boson de Higgs est une excitation du champ de Higgs. L’interaction avec ce champ contribue à la masse des particules élémentaires qui y sont couplées.",
    note: "Le champ est figuré par une surface et son excitation par une impulsion. La majeure partie de la masse d’un proton vient de la dynamique de l’interaction forte.",
    facts: [
      ["Masse", "≈ 125 GeV/c²"],
      ["Spin", "0"],
      ["Découverte", "2012 · CERN"],
    ],
    source: sources.higgs,
  },
};
export const elementOf = (element: ElementId) =>
  element === "C" ? "de carbone" : `d’${elements[element].name.toLowerCase()}`;
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
    category: "ATOME · ÉLÉMENT CHIMIQUE",
    color: e.color,
    description: `Un atome neutre ${elementOf(element)} contient ${e.z} proton${e.z > 1 ? "s" : ""} et ${e.z} électron${e.z > 1 ? "s" : ""}. Nous explorons ici l’isotope ${e.z + e.n}, avec ${e.n} neutron${e.n > 1 ? "s" : ""}.`,
    note: "Le modèle moléculaire montre des atomes liés. En entrant dans un atome, on passe à un modèle d’atome isolé ; les échelles sont réajustées.",
    facts: [
      ["Numéro atomique", String(e.z)],
      ["Isotope représenté", `${element}-${e.z + e.n}`],
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
    name: `Noyau ${elementOf(element)}`,
    symbol: isotopeSymbol(element),
    category: "STRUCTURE ATOMIQUE · NOYAU",
    color: "#ce826e",
    description: `${e.z} proton${e.z > 1 ? "s" : ""}${e.n ? ` et ${e.n} neutrons` : ""} concentrent presque toute la masse de cet atome. Le noyau est beaucoup plus petit que le nuage électronique.`,
    note: "Le noyau est fortement agrandi dans la vue atomique pour rester visible. Les nucléons sont représentés par des sphères conventionnelles.",
    facts: [
      ["Protons", String(e.z)],
      ["Neutrons", String(e.n)],
      ["Nombre de masse", String(e.z + e.n)],
    ],
    source: sources.cern,

    element,
  };
}
