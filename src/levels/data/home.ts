import type { LevelData } from "../types.ts";

/** The scene every visit starts from, between the cosmos and the three inward journeys. */
export const homeLevels: LevelData[] = [
  {
    id: "park",
    parent: "landscape",
    journey: "home",
    scene: "park",
    size: 40,
    frame: 1.25,
    view: { pitch: 28, yaw: -18 },
    // The town park by the river in the landscape (see scenes/earth/geography.ts).
    anchor: { at: [1.95, 0, 0.35] },
    theme: { top: "#3aa8f0", bottom: "#bfeaff", accent: "#ff8a3d", dust: "#ffffff" },
    title: { en: "A corner of a park", fr: "Un coin de parc" },
    short: { en: "Park", fr: "Parc" },
    teaser: { en: "Where it all starts: a person, a tree and a pond to dive into.", fr: "Là où tout commence : une personne, un arbre et une mare où plonger." },
    compare: {
      en: "About fifty steps from one side to the other.",
      fr: "Une cinquantaine de pas d’un bout à l’autre.",
    },
    hook: {
      en: "It all starts here: a person, a tree, a pond. Choose what to dive into… or zoom out to see the Universe.",
      fr: "Tout commence ici : une personne, un arbre, une mare. Choisis dans quoi plonger… ou recule pour voir l’Univers.",
    },
    facts: [
      {
        en: "Everything in this scene is made of the same ingredients: atoms, themselves made of quarks and electrons.",
        fr: "Tout, dans cette scène, est fait des mêmes ingrédients : des atomes, eux-mêmes faits de quarks et d’électrons.",
      },
      {
        en: "A handful of this park’s soil holds more bacteria than there are people on Earth.",
        fr: "Une poignée de terre de ce parc abrite plus de bactéries qu’il n’y a d’humains sur Terre.",
      },
    ],
    source: { label: "Powers of Ten — Eames Office (1977)", url: "https://www.eamesoffice.com/the-work/powers-of-ten/" },
  },
];
