import { t } from "./i18n";
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
    get name() {
      return t("A glass of water");
    },
    get subtitle() {
      return t("From liquid water to the building blocks of H₂O.");
    },
    get portion() {
      return t("A drop of water");
    },
    get neighborhood() {
      return t("Neighboring molecules");
    },
    get state() {
      return t("Liquid");
    },
    color: "#9ebdd6",
    get description() {
      return t(
        "This glass contains countless H₂O molecules. Zoom into a small volume of liquid, then into one molecule to reveal its atoms.",
      );
    },
    get portionDescription() {
      return t(
        "Imagine selecting a drop-sized volume of water. Its boundary is a visual guide: there is no membrane at this point in the glass.",
      );
    },
  },
  co2: {
    get name() {
      return t("A glass of sparkling water");
    },
    get subtitle() {
      return t("Inside a CO₂ bubble.");
    },
    get portion() {
      return t("A CO₂ bubble");
    },
    get neighborhood() {
      return t("CO₂ molecules");
    },
    get state() {
      return t("Gas in a liquid");
    },
    color: "#b5c7da",
    get description() {
      return t(
        "We follow the CO₂ inside a bubble in sparkling water. The glass also contains water; this journey focuses on the gas in that bubble.",
      );
    },
    get portionDescription() {
      return t(
        "This bubble is a pocket of gas surrounded by water. It contains many CO₂ molecules, spaced apart and in motion. Its surface separates the gas from the liquid.",
      );
    },
  },
  methane: {
    get name() {
      return t("A flask of methane");
    },
    get subtitle() {
      return t("From a volume of gas to a CH₄ molecule.");
    },
    get portion() {
      return t("A volume of methane");
    },
    get neighborhood() {
      return t("CH₄ molecules");
    },
    get state() {
      return t("Gas");
    },
    color: "#b7b6d3",
    get description() {
      return t(
        "In this sealed flask, methane fills the available space. The gas is invisible to the naked eye; colored markers guide you into a small volume, then a molecule.",
      );
    },
    get portionDescription() {
      return t(
        "This reference volume is an imaginary sample of the gas. Its surface is not a wall: molecules move freely from one region to another.",
      );
    },
  },
};
export function scaleEntry(molecule: MoleculeId, id: ScaleId): Entry {
  const e = environments[molecule];
  const names = {
    sample: e.name,
    get portion() {
      return e.portion;
    },
    get neighborhood() {
      return e.neighborhood;
    },
  };
  const descriptions = {
    sample: e.description,
    get portion() {
      return e.portionDescription;
    },
    get neighborhood() {
      return molecule === "water"
        ? t(
            "In liquid water, molecules stay close while changing neighbors. Attractions between them help hold the liquid together. The marked molecule at the center is the one you will explore.",
          )
        : t(
            "Gas molecules are spaced apart and move between collisions. One is marked at the center to guide your zoom; the others show its surroundings.",
          );
    },
  };
  return {
    id,
    get name() {
      return names[id];
    },
    symbol: id === "sample" ? "cm" : id === "portion" ? "mm" : "nm",
    color: e.color,
    get category() {
      return id === "sample"
        ? t("AT OUR SCALE")
        : id === "portion"
          ? t("A SMALL VOLUME")
          : t("BETWEEN MOLECULES");
    },
    get description() {
      return descriptions[id];
    },
    get note() {
      return t(
        "Zoom levels connect using adjusted dimensions. The molecules shown are an illustrative sample, not an actual count. The central marker keeps the scales connected.",
      );
    },
    get facts(): [string, string][] {
      return [
        [
          t("Approximate scale"),
          id === "sample"
            ? t("Centimeter")
            : id === "portion"
              ? t("Millimeter")
              : t("Nanometer"),
        ],
        [
          t("Matter in focus"),
          molecule === "water"
            ? t("Liquid H₂O")
            : molecule === "co2"
              ? t("Gaseous CO₂")
              : t("Gaseous CH₄"),
        ],
        [
          t("Representation"),
          id === "portion" && molecule === "co2"
            ? t("Gas / water interface")
            : t("Illustrative sample"),
        ],
      ];
    },
    source: matterSource,
  };
}
