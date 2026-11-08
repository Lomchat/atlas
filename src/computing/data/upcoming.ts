import type { LessonData } from "../types.ts";

/** Chapters shown on the map before they are written. */
export const upcomingLessons: LessonData[] = [
  {
    id: "inside",
    number: 3,
    status: "soon",
    scene: "inside",
    icon: "chip",
    theme: { top: "#0a2f2a", bottom: "#17705f", accent: "#3ff2b5", dust: "#9cf5d8" },
    title: { en: "Inside a computer", fr: "Au cœur d’un ordinateur" },
    short: { en: "Inside a computer", fr: "Dans l’ordinateur" },
    teaser: {
      en: "Zoom from a laptop down to a transistor, then to a silicon atom.",
      fr: "Zoome d’un ordinateur portable jusqu’au transistor, puis jusqu’à l’atome de silicium.",
    },
    steps: [],
  },
  {
    id: "keys",
    number: 4,
    status: "soon",
    scene: "keys",
    icon: "key",
    theme: { top: "#3a0d2e", bottom: "#8c2357", accent: "#ff6fb1", dust: "#ffb3d9" },
    title: { en: "Public and private keys", fr: "Clés publiques et privées" },
    short: { en: "Secret keys", fr: "Clés secrètes" },
    teaser: {
      en: "Agree on a secret in front of a spy, with a real calculation.",
      fr: "Se mettre d’accord sur un secret sous les yeux d’un espion, avec un vrai calcul.",
    },
    steps: [],
  },
  {
    id: "neurons",
    number: 5,
    status: "soon",
    scene: "neurons",
    icon: "neuron",
    theme: { top: "#2a1206", bottom: "#8c3d12", accent: "#ff8a3d", dust: "#ffc08f" },
    title: { en: "Neural networks", fr: "Les réseaux de neurones" },
    short: { en: "Neurons", fr: "Neurones" },
    teaser: {
      en: "A machine that learns from its mistakes, one weight at a time.",
      fr: "Une machine qui apprend de ses erreurs, un poids à la fois.",
    },
    steps: [],
  },
  {
    id: "llm",
    number: 6,
    status: "soon",
    scene: "llm",
    icon: "llm",
    theme: { top: "#0d1240", bottom: "#2b3aa0", accent: "#8c5cff", dust: "#c9b3ff" },
    title: { en: "Large language models", fr: "Les grands modèles de langage" },
    short: { en: "LLMs", fr: "LLM" },
    teaser: {
      en: "How an AI picks the next word, with real examples.",
      fr: "Comment une IA choisit le mot suivant, exemples à l’appui.",
    },
    steps: [],
  },
];
