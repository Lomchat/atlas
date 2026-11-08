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
];
