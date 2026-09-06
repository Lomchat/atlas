import type { Entry, MoleculeId } from "./data";
export const scaleIds = ["sample", "portion", "neighborhood"] as const;
export type ScaleId = (typeof scaleIds)[number];
export const isScale = (id: string | null | undefined): id is ScaleId =>
  scaleIds.includes(id as ScaleId);
export const matterSource =
  "https://openstax.org/books/chemistry-2e/pages/10-1-intermolecular-forces";
export const environments: Record<
  MoleculeId,
  {
    name: string;
    subtitle: string;
    portion: string;
    neighborhood: string;
    state: string;
    color: string;
    description: string;
    portionDescription: string;
  }
> = {
  water: {
    name: "A glass of water",
    subtitle: "From liquid water to the building blocks of H₂O.",
    portion: "A drop of water",
    neighborhood: "Neighboring molecules",
    state: "Liquid",
    color: "#9ebdd6",
    description:
      "This glass contains countless H₂O molecules. Zoom into a small volume of liquid, then into one molecule to reveal its atoms.",
    portionDescription:
      "Imagine selecting a drop-sized volume of water. Its boundary is a visual guide: there is no membrane at this point in the glass.",
  },
  co2: {
    name: "A glass of sparkling water",
    subtitle: "Inside a CO₂ bubble.",
    portion: "A CO₂ bubble",
    neighborhood: "CO₂ molecules",
    state: "Gas in a liquid",
    color: "#b5c7da",
    description:
      "We follow the CO₂ inside a bubble in sparkling water. The glass also contains water; this journey focuses on the gas in that bubble.",
    portionDescription:
      "This bubble is a pocket of gas surrounded by water. It contains many CO₂ molecules, spaced apart and in motion. Its surface separates the gas from the liquid.",
  },
  methane: {
    name: "A flask of methane",
    subtitle: "From a volume of gas to a CH₄ molecule.",
    portion: "A volume of methane",
    neighborhood: "CH₄ molecules",
    state: "Gas",
    color: "#b7b6d3",
    description:
      "In this sealed flask, methane fills the available space. The gas is invisible to the naked eye; colored markers guide you into a small volume, then a molecule.",
    portionDescription:
      "This reference volume is an imaginary sample of the gas. Its surface is not a wall: molecules move freely from one region to another.",
  },
};
export function scaleEntry(molecule: MoleculeId, id: ScaleId): Entry {
  const e = environments[molecule];
  const names = {
    sample: e.name,
    portion: e.portion,
    neighborhood: e.neighborhood,
  };
  const descriptions = {
    sample: e.description,
    portion: e.portionDescription,
    neighborhood:
      molecule === "water"
        ? "In liquid water, molecules stay close while changing neighbors. Attractions between them help hold the liquid together. The marked molecule at the center is the one you will explore."
        : "Gas molecules are spaced apart and move between collisions. One is marked at the center to guide your zoom; the others show its surroundings.",
  };
  return {
    id,
    name: names[id],
    symbol: id === "sample" ? "cm" : id === "portion" ? "mm" : "nm",
    color: e.color,
    category:
      id === "sample"
        ? "AT OUR SCALE"
        : id === "portion"
          ? "A SMALL VOLUME"
          : "BETWEEN MOLECULES",
    description: descriptions[id],
    note: "Zoom levels connect using adjusted dimensions. The molecules shown are an illustrative sample, not an actual count. The central marker keeps the scales connected.",
    facts: [
      [
        "Approximate scale",
        id === "sample"
          ? "Centimeter"
          : id === "portion"
            ? "Millimeter"
            : "Nanometer",
      ],
      [
        "Matter in focus",
        molecule === "water"
          ? "Liquid H₂O"
          : molecule === "co2"
            ? "Gaseous CO₂"
            : "Gaseous CH₄",
      ],
      [
        "Representation",
        id === "portion" && molecule === "co2"
          ? "Gas / water interface"
          : "Illustrative sample",
      ],
    ],
    source: matterSource,
  };
}
