import type { Bilingual, Hotspot, Journey, LevelData, Vec3 } from "../types.ts";

/**
 * The shared end of every inward journey: atom → almost nothing → nucleus →
 * proton → quark. One chain is generated per element so that each journey
 * keeps its own context and URL.
 */
export type Element = "carbon" | "iron" | "magnesium" | "oxygen";

/** Proton rms charge radius (CODATA 2018 ≈ 0.841 fm), metres. */
const PROTON_RADIUS = 0.84e-15;
const PROTON_SIZE = 2 * PROTON_RADIUS;
/** View frame of the quark level (a quark has no measured size). */
const QUARK_FRAME = 2e-16;
/** Proton units per quark unit, so a quark looks the same at both levels. */
const QUARK_SCALE = PROTON_SIZE / QUARK_FRAME;
/** Home view extents (÷ size) of the nucleus and proton levels. */
const NUCLEUS_FRAME = 1.75;
const PROTON_FRAME = 1.6;

/**
 * Valence quarks in the proton (proton units, ±5 = 0.84 fm): the up quark the
 * visitor dives into (anchor of the quark level), the other up and the down.
 */
const QUARKS = {
  anchor: [0.4, 2.3, 1.5] as Vec3,
  up: [2.5, -1.3, -0.7] as Vec3,
  down: [-2.2, -1.1, 0.5] as Vec3,
};

const round = (v: number) => Math.round(v * 1000) / 1000;
const add = (a: Vec3, b: Vec3): Vec3 => [round(a[0] + b[0]), round(a[1] + b[1]), round(a[2] + b[2])];
const scale = (a: Vec3, k: number): Vec3 => [round(a[0] * k), round(a[1] * k), round(a[2] * k)];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const unit = (a: Vec3): Vec3 => scale(a, 1 / Math.hypot(...a));

/**
 * Where nucleons sit in the nucleus (nucleus units, 10 = 2 × rms charge
 * radius): nucleon radius 0.84 fm, centres within R = 1.2 fm · A^⅓ minus one
 * nucleon radius, and three camera-facing surface nucleons (the proton to
 * dive into and the two pointed at by hotspots). The nucleus scene packs the
 * others around them.
 */
function nucleusLayout(info: { Z: number; N: number; nucleusSize: number }) {
  const u = info.nucleusSize / 10;
  const radius = round(PROTON_RADIUS / u);
  const extent = round((1.2e-15 * Math.cbrt(info.Z + info.N) - PROTON_RADIUS) / u);
  const on = (d: Vec3) => scale(unit(d), extent);
  const anchor = unit([0.18, 0.3, 0.94]);
  // The hotspot neutron touches the anchored proton: turn from the anchor
  // towards the lower right by exactly one nucleon diameter.
  const towards = unit([0.6, -0.42, 0.68]);
  const angle = 2 * Math.asin(Math.min(1, radius / extent));
  const between = Math.acos(anchor[0] * towards[0] + anchor[1] * towards[1] + anchor[2] * towards[2]);
  const k = Math.sin(angle) / Math.sin(between);
  const neighbour: Vec3 = [0, 1, 2].map(
    (i) => anchor[i] * (Math.sin(between - angle) / Math.sin(between)) + towards[i] * k,
  ) as Vec3;
  return {
    radius,
    extent,
    anchor: on(anchor),
    proton: on([-0.62, 0.42, 0.66]),
    neutron: on(neighbour),
  };
}

/** A decimal number in the visitor's language. */
const decimal = (value: number, locale: "en" | "fr") =>
  locale === "fr" ? String(value).replace(".", ",") : String(value);

interface ElementInfo {
  prefix: string;
  symbol: string;
  Z: number;
  /** Neutrons of the most common isotope shown. */
  N: number;
  /** Electrons per shell (ground state). */
  shells: number[];
  /** Van der Waals diameter, metres. */
  atomSize: number;
  /** Nuclear charge diameter, metres (2 × rms charge radius). */
  nucleusSize: number;
  atom: {
    title: Bilingual;
    short: Bilingual;
    teaser: Bilingual;
    compare: Bilingual;
    hook: Bilingual;
    facts: Bilingual[];
  };
  nucleus: { title: Bilingual; compare: Bilingual; hook: Bilingual };
  /** Element-specific hotspot texts (atom and empty core). */
  spots: {
    outer: { label: Bilingual; text: Bilingual };
    inner: Bilingual;
    haze: Bilingual;
    bond?: Bilingual;
  };
}

const ELEMENTS: Record<Element, ElementInfo> = {
  carbon: {
    prefix: "c",
    symbol: "C",
    Z: 6,
    N: 6,
    shells: [2, 4],
    atomSize: 3.4e-10,
    nucleusSize: 4.94e-15,
    atom: {
      title: { en: "A carbon atom", fr: "Un atome de carbone" },
      short: { en: "Carbon atom", fr: "Atome de carbone" },
      teaser: { en: "One carbon atom: a cloud of 6 electrons around a tiny nucleus.", fr: "Un atome de carbone : un nuage de 6 électrons autour d’un noyau minuscule." },
      compare: {
        en: "About 200,000 carbon atoms in a row would span the width of a hair.",
        fr: "Environ 200 000 atomes de carbone alignés feraient l’épaisseur d’un cheveu.",
      },
      hook: {
        en: "This is an atom: a cloud of electrons around a tiny nucleus. Carbon forms the backbone of every molecule of life.",
        fr: "Voici un atome : un nuage d’électrons autour d’un noyau minuscule. Le carbone forme la charpente de toutes les molécules du vivant.",
      },
      facts: [
        {
          en: "The carbon in your DNA was made inside stars, billions of years ago.",
          fr: "Le carbone de ton ADN a été fabriqué au cœur d’étoiles, il y a des milliards d’années.",
        },
        {
          en: "Electrons are not little balls going round. We can only describe the probability of finding them here or there: hence the cloud.",
          fr: "Les électrons ne sont pas des billes qui tournent. On peut seulement décrire la probabilité de les trouver ici ou là : d’où ce nuage.",
        },
      ],
    },
    nucleus: {
      title: { en: "A carbon nucleus", fr: "Le noyau du carbone" },
      compare: {
        en: "It is about 70,000 times smaller than the atom around it.",
        fr: "Il est environ 70 000 fois plus petit que l’atome qui l’entoure.",
      },
      hook: {
        en: "6 protons and 6 neutrons packed tightly together. Almost all of the atom’s mass is here.",
        fr: "6 protons et 6 neutrons serrés les uns contre les autres. Presque toute la masse de l’atome se trouve ici.",
      },
    },
    spots: {
      outer: {
        label: { en: "Four to share", fr: "Quatre à partager" },
        text: {
          en: "Carbon has 4 outer electrons to share, so it can make 4 bonds: perfect for building chains and rings.",
          fr: "Le carbone a 4 électrons externes à partager : il peut donc former 4 liaisons, idéal pour construire des chaînes et des cycles.",
        },
      },
      inner: {
        en: "2 of carbon’s 6 electrons stay very close to the nucleus, in a small bright cloud.",
        fr: "2 des 6 électrons du carbone restent tout près du noyau, dans un petit nuage lumineux.",
      },
      haze: {
        en: "This faint haze is where carbon’s 2 innermost electrons can be found. Their cloud is far wider than this view.",
        fr: "Cette brume légère montre où peuvent se trouver les 2 électrons les plus internes du carbone. Leur nuage est bien plus large que cette vue.",
      },
    },
  },
  iron: {
    prefix: "fe",
    symbol: "Fe",
    Z: 26,
    N: 30,
    shells: [2, 8, 14, 2],
    atomSize: 4.0e-10,
    nucleusSize: 7.47e-15,
    atom: {
      title: { en: "An iron atom", fr: "Un atome de fer" },
      short: { en: "Iron atom", fr: "Atome de fer" },
      teaser: { en: "One iron atom: a cloud of 26 electrons around a tiny nucleus.", fr: "Un atome de fer : un nuage de 26 électrons autour d’un noyau minuscule." },
      compare: {
        en: "About 175,000 iron atoms in a row would span the width of a hair.",
        fr: "Environ 175 000 atomes de fer alignés feraient l’épaisseur d’un cheveu.",
      },
      hook: {
        en: "At the centre of every heme sits one iron atom. It is the part that holds on to oxygen.",
        fr: "Au centre de chaque hème se trouve un atome de fer. C’est lui qui s’accroche à l’oxygène.",
      },
      facts: [
        {
          en: "The iron in your blood was forged in stars that later exploded.",
          fr: "Le fer de ton sang a été forgé dans des étoiles qui ont ensuite explosé.",
        },
        {
          en: "Your body contains about 4 grams of iron, mostly in hemoglobin.",
          fr: "Ton corps contient environ 4 grammes de fer, surtout dans l’hémoglobine.",
        },
      ],
    },
    nucleus: {
      title: { en: "An iron nucleus", fr: "Le noyau du fer" },
      compare: {
        en: "It is about 50,000 times smaller than the atom around it.",
        fr: "Il est environ 50 000 fois plus petit que l’atome qui l’entoure.",
      },
      hook: {
        en: "26 protons and 30 neutrons. Iron nuclei are among the most tightly bound in nature, which is why stars cannot gain energy by fusing beyond iron.",
        fr: "26 protons et 30 neutrons. Le noyau du fer est l’un des plus solidement liés de la nature : les étoiles ne gagnent plus d’énergie en fusionnant au-delà du fer.",
      },
    },
    spots: {
      outer: {
        label: { en: "An ion in your blood", fr: "Un ion dans ton sang" },
        text: {
          en: "In heme, iron has given away 2 of its electrons: it is an Fe²⁺ ion. This picture shows the complete, neutral atom with all 26.",
          fr: "Dans l’hème, le fer a cédé 2 de ses électrons : c’est un ion Fe²⁺. Cette image montre l’atome neutre complet, avec ses 26 électrons.",
        },
      },
      inner: {
        en: "Iron’s 26 protons pull hard: its 10 innermost electrons are packed into a tiny, dense core.",
        fr: "Les 26 protons du fer attirent fort : ses 10 électrons les plus internes sont tassés dans un cœur minuscule et dense.",
      },
      haze: {
        en: "Iron’s 26 protons squeeze its 2 innermost electrons into a small cloud: you can see its glow fade towards the edges.",
        fr: "Les 26 protons du fer serrent ses 2 électrons les plus internes dans un petit nuage : tu vois sa lueur s’estomper vers les bords.",
      },
    },
  },
  magnesium: {
    prefix: "mg",
    symbol: "Mg",
    Z: 12,
    N: 12,
    shells: [2, 8, 2],
    atomSize: 3.46e-10,
    nucleusSize: 6.11e-15,
    atom: {
      title: { en: "A magnesium atom", fr: "Un atome de magnésium" },
      short: { en: "Magnesium atom", fr: "Atome de magnésium" },
      teaser: { en: "One magnesium atom: a cloud of 12 electrons around a tiny nucleus.", fr: "Un atome de magnésium : un nuage de 12 électrons autour d’un noyau minuscule." },
      compare: {
        en: "About 200,000 magnesium atoms in a row would span the width of a hair.",
        fr: "Environ 200 000 atomes de magnésium alignés feraient l’épaisseur d’un cheveu.",
      },
      hook: {
        en: "One magnesium atom sits at the heart of every chlorophyll. It holds the centre of the molecule that captures light.",
        fr: "Un atome de magnésium trône au cœur de chaque chlorophylle. Il tient le centre de la molécule qui capte la lumière.",
      },
      facts: [
        {
          en: "Magnesium burns with a blinding white light: early photographers used it for their flashes.",
          fr: "Le magnésium brûle avec une lumière blanche aveuglante : les premiers photographes s’en servaient comme flash.",
        },
        {
          en: "Your body needs magnesium too: it takes part in hundreds of chemical reactions.",
          fr: "Ton corps a aussi besoin de magnésium : il participe à des centaines de réactions chimiques.",
        },
      ],
    },
    nucleus: {
      title: { en: "A magnesium nucleus", fr: "Le noyau du magnésium" },
      compare: {
        en: "It is about 57,000 times smaller than the atom around it.",
        fr: "Il est environ 57 000 fois plus petit que l’atome qui l’entoure.",
      },
      hook: {
        en: "12 protons and 12 neutrons packed tightly together. Almost all of the atom’s mass is here.",
        fr: "12 protons et 12 neutrons serrés les uns contre les autres. Presque toute la masse de l’atome se trouve ici.",
      },
    },
    spots: {
      outer: {
        label: { en: "An ion in chlorophyll", fr: "Un ion dans la chlorophylle" },
        text: {
          en: "In chlorophyll, magnesium has given away its 2 outer electrons: it is an Mg²⁺ ion. This picture shows the complete, neutral atom with all 12.",
          fr: "Dans la chlorophylle, le magnésium a cédé ses 2 électrons externes : c’est un ion Mg²⁺. Cette image montre l’atome neutre complet, avec ses 12 électrons.",
        },
      },
      inner: {
        en: "10 of magnesium’s 12 electrons crowd close to the nucleus. The last 2 roam much further out.",
        fr: "10 des 12 électrons du magnésium se serrent près du noyau. Les 2 derniers s’aventurent bien plus loin.",
      },
      haze: {
        en: "This faint haze is where magnesium’s 2 innermost electrons can be found. Their cloud is about as wide as this view.",
        fr: "Cette brume légère montre où peuvent se trouver les 2 électrons les plus internes du magnésium. Leur nuage est à peu près aussi large que cette vue.",
      },
    },
  },
  oxygen: {
    prefix: "o",
    symbol: "O",
    Z: 8,
    N: 8,
    shells: [2, 6],
    atomSize: 3.04e-10,
    nucleusSize: 5.4e-15,
    atom: {
      title: { en: "An oxygen atom", fr: "Un atome d’oxygène" },
      short: { en: "Oxygen atom", fr: "Atome d’oxygène" },
      teaser: { en: "One oxygen atom: a cloud of 8 electrons around a tiny nucleus.", fr: "Un atome d’oxygène : un nuage de 8 électrons autour d’un noyau minuscule." },
      compare: {
        en: "About 230,000 oxygen atoms in a row would span the width of a hair.",
        fr: "Environ 230 000 atomes d’oxygène alignés feraient l’épaisseur d’un cheveu.",
      },
      hook: {
        en: "In every water molecule, one oxygen atom holds two hydrogens. It pulls their electrons towards itself, and that is what makes water so special.",
        fr: "Dans chaque molécule d’eau, un atome d’oxygène tient deux hydrogènes. Il attire leurs électrons vers lui, et c’est ce qui rend l’eau si spéciale.",
      },
      facts: [
        {
          en: "Oxygen is the most abundant element in your body: about 65% of your mass, mostly in water.",
          fr: "L’oxygène est l’élément le plus abondant de ton corps : environ 65 % de ta masse, surtout sous forme d’eau.",
        },
        {
          en: "The hydrogen nuclei in this water date back to the Big Bang.",
          fr: "Les noyaux d’hydrogène de cette eau datent du Big Bang.",
        },
      ],
    },
    nucleus: {
      title: { en: "An oxygen nucleus", fr: "Le noyau de l’oxygène" },
      compare: {
        en: "It is about 56,000 times smaller than the atom around it.",
        fr: "Il est environ 56 000 fois plus petit que l’atome qui l’entoure.",
      },
      hook: {
        en: "8 protons and 8 neutrons packed tightly together. Almost all of the atom’s mass is here.",
        fr: "8 protons et 8 neutrons serrés les uns contre les autres. Presque toute la masse de l’atome se trouve ici.",
      },
    },
    spots: {
      outer: {
        label: { en: "Lone pairs", fr: "Doublets libres" },
        text: {
          en: "Oxygen keeps two pairs of electrons to itself, on the side away from the hydrogens. That side is slightly negative, which lets water molecules cling to each other.",
          fr: "L’oxygène garde deux paires d’électrons pour lui, du côté opposé aux hydrogènes. Ce côté est légèrement négatif : c’est ce qui permet aux molécules d’eau de s’accrocher entre elles.",
        },
      },
      inner: {
        en: "2 of oxygen’s 8 electrons stay very close to the nucleus, in a small bright cloud.",
        fr: "2 des 8 électrons de l’oxygène restent tout près du noyau, dans un petit nuage lumineux.",
      },
      haze: {
        en: "This faint haze is where oxygen’s 2 innermost electrons can be found. Their cloud is wider than this view.",
        fr: "Cette brume légère montre où peuvent se trouver les 2 électrons les plus internes de l’oxygène. Leur nuage est plus large que cette vue.",
      },
      bond: {
        en: "Each O–H bond is a pair of electrons shared by two atoms. Oxygen pulls them closer to itself, so the hydrogens end up slightly positive.",
        fr: "Chaque liaison O–H est une paire d’électrons partagée par deux atomes. L’oxygène les attire vers lui : les hydrogènes deviennent légèrement positifs.",
      },
    },
  },
};

const atomTheme = {
  top: "#05061c",
  bottom: "#141046",
  accent: "#6fd2ff",
  dust: "#7c8cff",
};

export function matterChain(
  element: Element,
  options: {
    parent: string;
    journey: Journey;
    anchor: { at: Vec3; rotate?: Vec3 };
    /** Bonded neighbours drawn around the atom for context (symbol, position in atom units). */
    neighbors?: { symbol: string; at: Vec3 }[];
  },
): LevelData[] {
  const info = ELEMENTS[element];
  const id = (name: string) => `${info.prefix}-${name}`;
  const journey = options.journey;
  const params = {
    element,
    symbol: info.symbol,
    Z: info.Z,
    N: info.N,
    shells: info.shells,
  };
  const neighbors = options.neighbors ?? [];
  const spots = info.spots;

  // Atom: the cloud, the inner electrons, one element-specific spot and a bond
  // (or the fuzzy edge), spread over free slots so they never crowd together.
  const flat = (a: Vec3, b: [number, number]) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  // The bond spot sits on the most camera-facing bond that is not hidden behind the centre.
  const bonded = [...neighbors]
    .filter((n) => Math.hypot(n.at[0], n.at[1]) > 2)
    .sort((a, b) => b.at[2] - 0.5 * Math.abs(Math.hypot(b.at[0], b.at[1]) - 3.5) - (a.at[2] - 0.5 * Math.abs(Math.hypot(a.at[0], a.at[1]) - 3.5)))[0];
  const bondAt: Vec3 | null = bonded ? [round(bonded.at[0] * 0.6), round(bonded.at[1] * 0.6), round(bonded.at[2] * 0.6 + 1.6)] : null;
  const taken: Vec3[] = bondAt ? [bondAt] : [];
  const free = (slots: [number, number][], z: number): Vec3 => {
    const slot = slots.find((p) => taken.every((t) => flat(t, p) > 2.4)) ?? slots[0];
    const at: Vec3 = [slot[0], slot[1], z];
    taken.push(at);
    return at;
  };
  const inner = [[1.0, -0.9], [-1.0, -0.9]].sort(
    (a, b) => (bondAt ? flat(bondAt, b as [number, number]) - flat(bondAt, a as [number, number]) : 0),
  )[0] as [number, number];
  const around: [number, number][] = [[3.3, 2.6], [3.8, -2.6], [-3.2, 2.4], [-3.5, -2.3], [0.3, -3.6], [0.2, 3.8]];
  const cloudAt = free(around, 1.6);
  const outerAt = free(element === "oxygen" && neighbors.length ? [[0.3, -3.6], ...around] : around, 1.6);
  const atomHotspots: Hotspot[] = [
    {
      id: "cloud",
      at: cloudAt,
      label: { en: "Electron cloud", fr: "Nuage d’électrons" },
      text: {
        en: `Each dot is a place where one of the ${info.Z} electrons could turn up. Where the fog is thick, you would find one more often.`,
        fr: `Chaque point est un endroit où l’un des ${info.Z} électrons pourrait se trouver. Là où le brouillard est épais, tu en trouverais un plus souvent.`,
      },
    },
    {
      id: "inner",
      at: [inner[0], inner[1], 1.4],
      label: { en: "Inner electrons", fr: "Électrons internes" },
      text: spots.inner,
    },
    {
      id: "outer",
      at: outerAt,
      label: spots.outer.label,
      text: spots.outer.text,
    },
  ];
  if (bondAt)
    atomHotspots.push({
      id: "bond",
      at: bondAt,
      label: { en: "Shared electrons", fr: "Électrons partagés" },
      text: spots.bond ?? {
        en: "A chemical bond is a pair of electrons shared by two atoms: their clouds merge.",
        fr: "Une liaison chimique est une paire d’électrons partagée par deux atomes : leurs nuages se fondent l’un dans l’autre.",
      },
    });
  else
    atomHotspots.push({
      id: "edge",
      at: free(around, 1.2),
      label: { en: "No hard edge", fr: "Pas de bord net" },
      text: {
        en: "An atom has no surface: its cloud just thins out. Its size is set by how close other atoms can come.",
        fr: "Un atome n’a pas de surface : son nuage s’estompe peu à peu. Sa taille dépend de la distance à laquelle les autres atomes peuvent l’approcher.",
      },
    });

  // Almost nothing: sizes if this 4.5 pm view were one metre wide.
  const coreSize = 3e-12;
  const coreView = coreSize * 1.5;
  const atomMetres = Math.round(info.atomSize / coreView / 5) * 5;
  const nucleusMm = Math.round((info.nucleusSize / coreView) * 1000 * 10) / 10;
  const coreHotspots: Hotspot[] = [
    {
      id: "haze",
      at: [4.3, 2.6, 0.5],
      label: { en: "Innermost electrons", fr: "Électrons les plus internes" },
      text: spots.haze,
    },
    {
      id: "field",
      at: [-4.4, -2.4, 0.5],
      label: { en: "Electric field", fr: "Champ électrique" },
      text: {
        en: "The nucleus’s electric field reaches through this emptiness. It is what keeps the electrons around it.",
        fr: "Le champ électrique du noyau traverse ce vide. C’est lui qui retient les électrons autour de lui.",
      },
    },
    {
      id: "scale",
      at: [3.2, -3.7, 0.5],
      label: { en: "To scale", fr: "À l’échelle" },
      text: {
        en: `If this view were one metre wide, the whole atom would be about ${atomMetres} m across and its nucleus about ${decimal(nucleusMm, "en")} mm: a grain of sand in a stadium.`,
        fr: `Si cette vue faisait un mètre de large, l’atome entier mesurerait environ ${atomMetres} m et son noyau environ ${decimal(nucleusMm, "fr")} mm : un grain de sable dans un stade.`,
      },
    },
  ];

  // Nucleus: nucleon layout shared with the proton's surroundings.
  const layout = nucleusLayout(info);
  const front = (p: Vec3, k = 1): Vec3 => add(p, [0, 0, layout.radius * k]);
  const contact = scale(unit(add(layout.anchor, layout.neutron)), layout.extent + layout.radius * 0.55);
  const nucleusHotspots: Hotspot[] = [
    {
      id: "proton",
      at: front(layout.proton),
      label: { en: "Proton", fr: "Proton" },
      text: {
        en: `Protons (red) are positively charged, so they push each other away. This nucleus has ${info.Z}.`,
        fr: `Les protons (en rouge) sont chargés positivement : ils se repoussent. Ce noyau en compte ${info.Z}.`,
      },
    },
    {
      id: "neutron",
      // On the far side of the neutron from the dive target, away from the "strong" spot.
      at: add(front(layout.neutron, 0.8), scale(unit(sub(layout.neutron, layout.anchor)), layout.radius * 0.5)),
      label: { en: "Neutron", fr: "Neutron" },
      text: {
        en: `Neutrons (blue) have no charge. They add to the strong-force glue without adding repulsion. This nucleus has ${info.N}.`,
        fr: `Les neutrons (en bleu) n’ont pas de charge. Ils renforcent la colle de l’interaction forte sans ajouter de répulsion. Ce noyau en compte ${info.N}.`,
      },
    },
    {
      id: "strong",
      at: contact,
      label: { en: "Strong force", fr: "Interaction forte" },
      text: {
        en: "Neighbouring nucleons hold on to each other by constantly swapping particles called pions. This pull beats the electric repulsion by far, but only reaches next-door neighbours.",
        fr: "Les nucléons voisins se tiennent en échangeant sans cesse des particules appelées pions. Cette attraction l’emporte largement sur la répulsion électrique, mais ne porte qu’aux plus proches voisins.",
      },
    },
  ];

  // Proton: the valence quarks, the gluon field and the sea.
  const protonHotspots: Hotspot[] = [
    {
      id: "up",
      at: add(QUARKS.up, [0.8, 0.7, 0.6]),
      label: { en: "Up quark", fr: "Quark up" },
      text: {
        en: "Two “up” quarks (yellow), each with a charge of +2/3. The colour only marks their type: quarks have no colour you could see.",
        fr: "Deux quarks « up » (en jaune), chacun de charge +2/3. La couleur indique seulement leur type : les quarks n’ont pas de couleur visible.",
      },
    },
    {
      id: "down",
      at: add(QUARKS.down, [-0.8, 0.7, 0.6]),
      label: { en: "Down quark", fr: "Quark down" },
      text: {
        en: "One “down” quark (green), with a charge of −1/3. Add them up: 2/3 + 2/3 − 1/3 = +1, the proton’s charge.",
        fr: "Un quark « down » (en vert), de charge −1/3. Fais le compte : 2/3 + 2/3 − 1/3 = +1, la charge du proton.",
      },
    },
    {
      id: "gluons",
      at: add(scale(add(QUARKS.up, QUARKS.down), 0.5), [0, 0, 0.6]),
      label: { en: "Gluon field", fr: "Champ de gluons" },
      text: {
        en: "Gluons carry the strong force. Their field is squeezed into tubes that keep pulling however far the quarks move apart: the further they go, the more energy the tube stores.",
        fr: "Les gluons transmettent l’interaction forte. Leur champ se resserre en tubes qui tirent toujours, quelle que soit la distance entre les quarks : plus ils s’éloignent, plus le tube stocke d’énergie.",
      },
    },
    {
      id: "sea",
      at: [-3.1, 2.3, 2.3],
      label: { en: "Sea quarks", fr: "Quarks de la mer" },
      text: {
        en: "Quark–antiquark pairs keep popping out of the gluon field and vanishing again. Dots are quarks, rings are antiquarks.",
        fr: "Des paires quark–antiquark surgissent sans cesse du champ de gluons puis disparaissent. Les points sont des quarks, les anneaux des antiquarks.",
      },
    },
  ];

  // Quark: its two partners, in quark units, lie far off-screen. The quark
  // level is already drawn when the visitor looks at the nucleus; its glyph
  // appears only while the proton's ball dissolves, between these view widths
  // (in quark units: 10 = QUARK_FRAME), reached 50 % and 70 % of the way
  // from the nucleus to the proton.
  const nucleusView = info.nucleusSize * NUCLEUS_FRAME;
  const protonView = PROTON_SIZE * PROTON_FRAME;
  const acrossAt = (u: number) => round((nucleusView * Math.pow(protonView / nucleusView, u)) / (QUARK_FRAME / 10));
  const glyphFade = [acrossAt(0.7), acrossAt(0.5)];
  const partners = [
    { flavor: "up", at: scale(sub(QUARKS.up, QUARKS.anchor), QUARK_SCALE) },
    { flavor: "down", at: scale(sub(QUARKS.down, QUARKS.anchor), QUARK_SCALE) },
  ];
  const quarkHotspots: Hotspot[] = [
    {
      id: "point",
      at: [1.1, 0.9, 0.5],
      label: { en: "A point", fr: "Un point" },
      text: {
        en: "No size has ever been measured: if a quark has one, it is under 10⁻¹⁸ m. The glow only marks where it is.",
        fr: "Aucune taille n’a jamais été mesurée : si un quark en a une, elle est inférieure à 10⁻¹⁸ m. La lueur indique seulement où il se trouve.",
      },
    },
    {
      id: "tube",
      at: scale(unit(partners[0].at), 3.8),
      label: { en: "Flux tube", fr: "Tube de flux" },
      text: {
        en: "The gluon field does not spread out like an electric field: it squeezes into tubes towards the two other quarks. Pull a quark away and the tube just grows longer, storing more and more energy.",
        fr: "Le champ de gluons ne s’étale pas comme un champ électrique : il se resserre en tubes vers les deux autres quarks. Si tu éloignes un quark, le tube s’allonge et stocke de plus en plus d’énergie.",
      },
    },
    {
      id: "vacuum",
      at: [-3.3, 2.6, 1.0],
      label: { en: "Fizzing vacuum", fr: "Le vide bouillonne" },
      text: {
        en: "Around the quark, short-lived gluons and quark–antiquark pairs keep flickering in and out of existence.",
        fr: "Autour du quark, des gluons et des paires quark–antiquark éphémères ne cessent d’apparaître et de disparaître.",
      },
    },
  ];

  return [
    {
      id: id("atom"),
      parent: options.parent,
      journey,
      scene: "atom",
      params: { ...params, neighbors },
      size: info.atomSize,
      frame: 1.6,
      anchor: options.anchor,
      theme: atomTheme,
      ...info.atom,
      hotspots: atomHotspots,
      source: {
        label: "PubChem",
        url: "https://pubchem.ncbi.nlm.nih.gov/periodic-table/",
      },
    },
    {
      id: id("core"),
      parent: id("atom"),
      journey: "matter",
      scene: "core",
      params,
      size: coreSize,
      anchor: { at: [0, 0, 0] },
      hotspots: coreHotspots,
      theme: { top: "#030312", bottom: "#0b0828", accent: "#a58cff", dust: "#6a5cff" },
      title: { en: "Almost nothing", fr: "Presque rien" },
      short: { en: "Empty space", fr: "Le vide" },
      teaser: {
        en: "The inside of the atom: almost entirely empty space.",
        fr: "L’intérieur de l’atome : un espace presque entièrement vide.",
      },
      compare: {
        en: "If the atom were as big as a stadium, its nucleus would be a peppercorn in the middle.",
        fr: "Si l’atome était aussi grand qu’un stade, son noyau serait un grain de poivre au centre.",
      },
      hook: {
        en: "Between the electrons and the nucleus there is almost nothing. An atom is more than 99.9999999% empty space.",
        fr: "Entre les électrons et le noyau, il n’y a presque rien. Un atome est vide à plus de 99,9999999 %.",
      },
      facts: [
        {
          en: "Remove the empty space from the atoms of every human alive, and all of humanity would fit in a sugar cube.",
          fr: "Si l’on retirait le vide des atomes de tous les humains, l’humanité entière tiendrait dans un morceau de sucre.",
        },
        {
          en: "So why doesn’t your hand pass through a table? The electrons of both surfaces push each other away.",
          fr: "Alors pourquoi ta main ne traverse-t-elle pas la table ? Parce que les électrons des deux surfaces se repoussent.",
        },
      ],
      source: {
        label: "OpenStax Chemistry 2e",
        url: "https://openstax.org/books/chemistry-2e/pages/2-2-evolution-of-atomic-theory",
      },
    },
    {
      id: id("nucleus"),
      parent: id("core"),
      journey: "matter",
      scene: "nucleus",
      params: { ...params, layout },
      size: info.nucleusSize,
      frame: NUCLEUS_FRAME,
      anchor: { at: [0, 0, 0] },
      hotspots: nucleusHotspots,
      theme: { top: "#0b0418", bottom: "#270a40", accent: "#ff6f91", dust: "#ff7fb0" },
      title: info.nucleus.title,
      short: { en: "Nucleus", fr: "Noyau" },
      teaser: {
        en: `The heart of the atom: ${info.Z} protons and ${info.N} neutrons squeezed together.`,
        fr: `Le cœur de l’atome : ${info.Z} protons et ${info.N} neutrons serrés les uns contre les autres.`,
      },
      compare: info.nucleus.compare,
      hook: info.nucleus.hook,
      facts: [
        {
          en: "Protons repel each other because they are all positive. A far stronger force, the strong interaction, still binds them together.",
          fr: "Les protons se repoussent, car ils sont tous positifs. Une force bien plus puissante, l’interaction forte, les colle quand même ensemble.",
        },
        {
          en: "A teaspoon of nuclear matter would weigh more than a billion tonnes.",
          fr: "Une cuillère à café de matière nucléaire pèserait plus d’un milliard de tonnes.",
        },
      ],
      source: {
        label: "Angeli & Marinova (2013)",
        url: "https://doi.org/10.1016/j.adt.2011.12.006",
      },
    },
    {
      id: id("proton"),
      parent: id("nucleus"),
      journey: "matter",
      scene: "proton",
      params: { ...params, layout, quarks: { up: QUARKS.up, down: QUARKS.down } },
      size: PROTON_SIZE,
      frame: PROTON_FRAME,
      // The camera-facing surface proton of the nucleus (see nucleusLayout).
      anchor: { at: layout.anchor },
      hotspots: protonHotspots,
      theme: { top: "#0a0316", bottom: "#2a0b40", accent: "#ff9f43", dust: "#ffb36b" },
      title: { en: "A proton", fr: "Un proton" },
      short: { en: "Proton", fr: "Proton" },
      teaser: {
        en: "A proton: three quarks bound together by the strong force.",
        fr: "Un proton : trois quarks liés entre eux par l’interaction forte.",
      },
      compare: {
        en: "It would take about 600 billion protons in a row to make one millimetre.",
        fr: "Il faudrait en aligner environ 600 milliards pour faire un millimètre.",
      },
      hook: {
        en: "A proton is not a marble. It is a seething mix of quarks and gluons, bound so strongly that they can never be pulled apart.",
        fr: "Un proton n’est pas une bille. C’est un bouillonnement de quarks et de gluons, liés si fort qu’on ne peut jamais les séparer.",
      },
      facts: [
        {
          en: "The three quarks of a proton account for only about 1% of its mass. The rest is energy: the quarks’ frantic motion and the gluon field that binds them.",
          fr: "Les trois quarks d’un proton ne font qu’environ 1 % de sa masse. Le reste, c’est de l’énergie : l’agitation des quarks et le champ de gluons qui les lie.",
        },
        {
          en: "A neutron is almost the same: two “down” quarks and one “up”, instead of two “up” and one “down”.",
          fr: "Un neutron, c’est presque pareil : deux quarks « down » et un « up », au lieu de deux « up » et un « down ».",
        },
      ],
      source: {
        label: "CERN",
        url: "https://home.cern/science/physics/standard-model",
      },
    },
    {
      id: id("quark"),
      parent: id("proton"),
      journey: "matter",
      scene: "quark",
      params: { ...params, flavor: "up", partners, glyph: QUARK_SCALE, glyphFade },
      size: QUARK_FRAME,
      frame: 1.5,
      // One of the two up quarks of the proton.
      anchor: { at: QUARKS.anchor },
      hotspots: quarkHotspots,
      theme: { top: "#06020f", bottom: "#1d0734", accent: "#ffe066", dust: "#ffd35c" },
      title: { en: "A quark", fr: "Un quark" },
      short: { en: "Quark", fr: "Quark" },
      teaser: {
        en: "A quark: one of the elementary building blocks of matter.",
        fr: "Un quark : l’une des briques élémentaires de la matière.",
      },
      sizeText: {
        en: "No measured size: smaller than 10⁻¹⁸ m",
        fr: "Aucune taille mesurée : moins de 10⁻¹⁸ m",
      },
      compare: {
        en: "To physicists it is a point. If it has a size at all, it is more than 1,000 times smaller than a proton.",
        fr: "Pour les physiciens, c’est un point. S’il a une taille, elle est plus de 1 000 fois plus petite qu’un proton.",
      },
      hook: {
        en: "This is the known end of the journey. As far as we know, quarks and electrons are not made of anything smaller.",
        fr: "Voici la fin connue du voyage. À notre connaissance, les quarks et les électrons ne sont faits de rien de plus petit.",
      },
      facts: [
        {
          en: "A quark is never alone. Pull on one, and the energy creates new quarks instead of setting it free.",
          fr: "Un quark n’est jamais seul. Si tu tires dessus, l’énergie crée de nouveaux quarks au lieu de le libérer.",
        },
        {
          en: "There are six kinds of quark, but ordinary matter uses only “up” and “down”.",
          fr: "Il existe six sortes de quarks, mais la matière ordinaire n’utilise que les « up » et les « down ».",
        },
      ],
      source: {
        label: "CERN",
        url: "https://home.cern/science/physics/standard-model",
      },
    },
  ];
}
