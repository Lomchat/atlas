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
    name: "Un verre d’eau",
    subtitle: "Du liquide aux constituants de H₂O.",
    portion: "Une goutte d’eau",
    neighborhood: "Molécules voisines",
    state: "Liquide",
    color: "#9ebdd6",
    description:
      "Ce verre contient une multitude de molécules H₂O. Approchez une petite portion du liquide, puis une molécule : ses atomes deviennent visibles.",
    portionDescription:
      "On isole par la pensée un volume d’eau de la taille d’une goutte. Sa limite est un repère de lecture : il n’y a pas de membrane à cet endroit dans le verre.",
  },
  co2: {
    name: "Un verre d’eau pétillante",
    subtitle: "À l’intérieur d’une bulle de CO₂.",
    portion: "Une bulle de CO₂",
    neighborhood: "Molécules de CO₂",
    state: "Gaz dans un liquide",
    color: "#b5c7da",
    description:
      "Nous suivons le CO₂ d’une bulle dans l’eau pétillante. Le verre contient aussi de l’eau : le parcours se concentre sur le gaz de cette bulle.",
    portionDescription:
      "Cette bulle est une poche de gaz entourée d’eau. Elle contient de nombreuses molécules de CO₂, espacées et en mouvement. Sa surface sépare le gaz du liquide.",
  },
  methane: {
    name: "Un flacon de méthane",
    subtitle: "Du volume de gaz à la molécule CH₄.",
    portion: "Un volume de méthane",
    neighborhood: "Molécules de CH₄",
    state: "Gaz",
    color: "#b7b6d3",
    description:
      "Dans ce flacon fermé, le méthane occupe l’espace disponible. Le gaz est invisible à l’œil nu ; les repères colorés permettent de suivre une portion puis une molécule.",
    portionDescription:
      "Ce volume repère est prélevé par la pensée dans le gaz. Sa surface ne constitue pas une paroi : les molécules passent librement d’une région à l’autre.",
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
        ? "Dans l’eau liquide, les molécules restent proches et changent de voisines. Les attractions entre elles contribuent à la cohésion du liquide. La molécule repérée au centre est celle que vous allez explorer."
        : "Les molécules du gaz sont séparées et se déplacent entre leurs collisions. Une seule est repérée au centre pour garder le fil du zoom ; les autres montrent son voisinage.",
  };
  return {
    id,
    name: names[id],
    symbol: id === "sample" ? "cm" : id === "portion" ? "mm" : "nm",
    color: e.color,
    category:
      id === "sample"
        ? "À NOTRE ÉCHELLE"
        : id === "portion"
          ? "UN PETIT VOLUME"
          : "ENTRE LES MOLÉCULES",
    description: descriptions[id],
    note: "Les niveaux de zoom sont raccordés avec des dimensions adaptées. Les molécules dessinées sont un échantillon illustratif, pas un décompte réel. Le repère central conserve le lien entre les échelles.",
    facts: [
      [
        "Échelle indicative",
        id === "sample"
          ? "Centimètre"
          : id === "portion"
            ? "Millimètre"
            : "Nanomètre",
      ],
      [
        "Matière suivie",
        molecule === "water"
          ? "H₂O liquide"
          : molecule === "co2"
            ? "CO₂ gazeux"
            : "CH₄ gazeux",
      ],
      [
        "Représentation",
        id === "portion" && molecule === "co2"
          ? "Interface gaz / eau"
          : "Échantillon pédagogique",
      ],
    ],
    source: matterSource,
  };
}
