import type { LevelData } from "../types.ts";
import { matterChain } from "./matter.ts";

/** Pond → drop → microscopic life → viruses → water molecules → oxygen. */
export const waterLevels: LevelData[] = [
  {
    id: "pond",
    parent: "park",
    journey: "water",
    scene: "pond",
    size: 6,
    frame: 1.1,
    view: { pitch: 35 },
    anchor: { at: [-1.9, 0.02, -0.9] },
    theme: { top: "#3aa8f0", bottom: "#a8e4ff", accent: "#4fd6ff", dust: "#ffffff" },
    title: { en: "A pond", fr: "Une mare" },
    short: { en: "Pond", fr: "Mare" },
    teaser: { en: "A calm pond, teeming with life you cannot see.", fr: "Une mare tranquille, grouillante d’une vie invisible." },
    compare: {
      en: "About three times your height, from bank to bank.",
      fr: "Environ trois fois ta taille, d’une rive à l’autre.",
    },
    hook: {
      en: "Calm water, full of life you cannot see. A single drop can hold tens of thousands of bacteria and dozens of single-celled creatures.",
      fr: "Une eau calme, pleine d’une vie invisible. Une seule goutte peut contenir des dizaines de milliers de bactéries et des dizaines d’êtres faits d’une seule cellule.",
    },
    facts: [
      {
        en: "Water lilies float thanks to air pockets in their leaves and stems.",
        fr: "Les nénuphars flottent grâce à des poches d’air dans leurs feuilles et leurs tiges.",
      },
      {
        en: "Pond skaters walk on water thanks to surface tension: the water behaves like a stretchy skin.",
        fr: "Les gerris marchent sur l’eau grâce à la tension de surface : l’eau se comporte comme une peau élastique.",
      },
    ],
    hotspots: [
      {
        id: "cattails",
        at: [-3.4, 2.4, -2.8],
        label: { en: "Cattails", fr: "Massettes" },
        text: {
          en: "Their brown “sausages” are packed with tiny seeds, each carried off by the wind on a fluffy parachute.",
          fr: "Leurs « saucisses » brunes sont bourrées de minuscules graines, que le vent emporte chacune sur un parachute duveteux.",
        },
      },
      {
        id: "water-lily",
        at: [-0.85, 0.12, -1.05],
        label: { en: "Water lily", fr: "Nénuphar" },
        text: {
          en: "Its leaves and flowers float, but its roots are anchored in the mud at the bottom.",
          fr: "Ses feuilles et ses fleurs flottent, mais ses racines sont ancrées dans la vase du fond.",
        },
      },
      {
        id: "pond-skater",
        at: [-1.7, 0.05, 1.55],
        label: { en: "Pond skater", fr: "Gerris" },
        text: {
          en: "It rows with its long middle legs and feels the ripples of insects that fall into the water.",
          fr: "Il rame avec ses longues pattes du milieu et sent les ondes des insectes tombés à l’eau.",
        },
      },
      {
        id: "deep-water",
        at: [0.9, 0, -0.4],
        label: { en: "Deep water", fr: "Eau profonde" },
        text: {
          en: "Water absorbs red light first, so the deeper the water, the bluer and darker it looks.",
          fr: "L’eau absorbe d’abord la lumière rouge : plus elle est profonde, plus elle paraît bleue et sombre.",
        },
      },
    ],
    source: { label: "Wikipedia — Pond", url: "https://en.wikipedia.org/wiki/Pond" },
  },
  {
    id: "lily-pad",
    parent: "pond",
    journey: "water",
    scene: "lilyPad",
    size: 0.3,
    frame: 1.2,
    view: { pitch: 40 },
    anchor: { at: [1.9, 0, 1.4] },
    theme: { top: "#1f6cc9", bottom: "#4fb6ee", accent: "#ffd86b", dust: "#e0ffff" },
    title: { en: "A lily pad", fr: "Une feuille de nénuphar" },
    short: { en: "Lily pad", fr: "Nénuphar" },
    teaser: { en: "A floating leaf where water beads up into droplets.", fr: "Une feuille flottante où l’eau perle en gouttelettes." },
    compare: {
      en: "About the size of a large dinner plate.",
      fr: "À peu près la taille d’une grande assiette.",
    },
    hook: {
      en: "A droplet beads up on its surface. Let’s get closer: the world inside it is surprising.",
      fr: "Une gouttelette perle à sa surface. Approchons-nous : le monde qu’elle contient est surprenant.",
    },
    facts: [
      {
        en: "The waxy surface of lily pads repels water, so drops roll across it like pearls.",
        fr: "La surface cireuse des feuilles de nénuphar repousse l’eau : les gouttes y roulent comme des perles.",
      },
      {
        en: "The leaves of the giant Amazon water lily can be more than 2 metres across.",
        fr: "Les feuilles du nénuphar géant d’Amazonie peuvent dépasser 2 mètres de diamètre.",
      },
    ],
    hotspots: [
      {
        id: "flower",
        at: [-2.7, 0.9, -2.7],
        label: { en: "Flower", fr: "Fleur" },
        text: {
          en: "It opens in the morning and closes in the afternoon, for three or four days in a row.",
          fr: "Elle s’ouvre le matin et se ferme l’après-midi, trois ou quatre jours de suite.",
        },
      },
      {
        id: "stomata",
        at: [-1.6, 0.07, 1.4],
        label: { en: "Pores on top", fr: "Pores sur le dessus" },
        text: {
          en: "Unlike most leaves, its breathing pores are on the upper side: the underside lies on the water.",
          fr: "Contrairement à la plupart des feuilles, ses pores sont sur le dessus : le dessous repose sur l’eau.",
        },
      },
      {
        id: "air-channels",
        at: [-0.4, 0.2, 4.25],
        label: { en: "Air inside", fr: "De l’air à l’intérieur" },
        text: {
          en: "Channels full of air run through the leaf and its stalk: they keep it afloat and bring air down to the roots.",
          fr: "Des canaux remplis d’air parcourent la feuille et sa tige : ils la font flotter et apportent de l’air jusqu’aux racines.",
        },
      },
    ],
    source: { label: "Wikipedia — Nymphaeaceae", url: "https://en.wikipedia.org/wiki/Nymphaeaceae" },
  },
  {
    id: "drop",
    parent: "lily-pad",
    journey: "water",
    scene: "drop",
    size: 4e-3,
    view: { pitch: 10 },
    anchor: { at: [1.2, 0.108, 1.5] },
    theme: { top: "#1a5fb4", bottom: "#62cdb8", accent: "#ffd86b", dust: "#e8ffff" },
    title: { en: "A drop of water", fr: "Une goutte d’eau" },
    short: { en: "Drop", fr: "Goutte" },
    teaser: { en: "A single drop of pond water: a whole world in miniature.", fr: "Une seule goutte d’eau de mare : tout un monde en miniature." },
    compare: {
      en: "About the size of a lentil.",
      fr: "À peu près la taille d’une lentille.",
    },
    hook: {
      en: "A drop like this holds almost a thousand billion billion water molecules… and plenty of living things.",
      fr: "Une goutte comme celle-ci contient près de mille milliards de milliards de molécules d’eau… et bien des êtres vivants.",
    },
    facts: [
      {
        en: "A drop is round because surface tension pulls all its molecules inwards.",
        fr: "Une goutte est ronde parce que la tension de surface tire toutes ses molécules vers l’intérieur.",
      },
      {
        en: "On a waxy leaf, drops roll off easily and carry dust away with them: the leaf keeps itself clean.",
        fr: "Sur une feuille cireuse, les gouttes roulent facilement et emportent la poussière : la feuille reste propre toute seule.",
      },
    ],
    hotspots: [
      {
        id: "lens",
        at: [-1.5, 2.3, 3.8],
        label: { en: "Upside-down world", fr: "Un monde à l’envers" },
        text: {
          en: "A drop acts as a tiny lens: through it, the leaf and the sky appear upside down.",
          fr: "Une goutte agit comme une minuscule loupe : à travers elle, la feuille et le ciel apparaissent à l’envers.",
        },
      },
      {
        id: "surface-tension",
        at: [1.8, 3.3, 2.0],
        label: { en: "Surface tension", fr: "Tension de surface" },
        text: {
          en: "The molecules at the surface pull on one another like a stretched skin, which keeps the drop round.",
          fr: "Les molécules de la surface se tirent les unes les autres comme une peau tendue, ce qui garde la goutte ronde.",
        },
      },
      {
        id: "wax",
        at: [-6, -3.6, 3.5],
        label: { en: "Waxy leaf", fr: "Feuille cireuse" },
        text: {
          en: "A layer of wax keeps water from spreading: the drop touches the leaf only on a small circle.",
          fr: "Une couche de cire empêche l’eau de s’étaler : la goutte ne touche la feuille que sur un petit cercle.",
        },
      },
    ],
    source: { label: "USGS Water Science School", url: "https://www.usgs.gov/special-topics/water-science-school" },
  },
  {
    id: "micro-zoo",
    parent: "drop",
    journey: "water",
    scene: "microZoo",
    size: 5e-4,
    view: { pitch: 5 },
    anchor: { at: [-0.3, -0.6, 2.2] },
    theme: { top: "#0a4763", bottom: "#128a94", accent: "#7ffff0", dust: "#b0fff4" },
    title: { en: "The microscopic zoo", fr: "Le zoo microscopique" },
    short: { en: "Micro-zoo", fr: "Micro-zoo" },
    teaser: { en: "The tiny creatures of the drop: tardigrades, paramecia, algae.", fr: "Les minuscules créatures de la goutte : tardigrades, paramécies, algues." },
    compare: {
      en: "About the size of a grain of sand.",
      fr: "À peu près la taille d’un grain de sable.",
    },
    hook: {
      en: "In pond water swim creatures invisible to the naked eye: paramecia, algae, and even tardigrades, some of the toughest animals in the world.",
      fr: "Dans l’eau de la mare nagent des créatures invisibles à l’œil nu : paramécies, algues, et même des tardigrades, parmi les animaux les plus résistants du monde.",
    },
    facts: [
      {
        en: "Tardigrades can survive the vacuum of space, freezing and drought by drying out almost completely.",
        fr: "Les tardigrades peuvent survivre au vide spatial, au gel et à la sécheresse en se desséchant presque entièrement.",
      },
      {
        en: "A paramecium swims with thousands of tiny hairs, the cilia, that beat like oars.",
        fr: "Une paramécie nage grâce à des milliers de petits cils qui battent comme des rames.",
      },
    ],
    hotspots: [
      {
        id: "tardigrade",
        at: [-0.4, 1.3, 0.9],
        label: { en: "Tardigrade", fr: "Tardigrade" },
        text: {
          en: "A real animal about 0.3 mm long, with a brain, a gut and eight stubby legs ending in claws.",
          fr: "Un vrai animal d’environ 0,3 mm, avec un cerveau, un intestin et huit pattes trapues terminées par des griffes.",
        },
      },
      {
        id: "paramecium",
        at: [5.2, 3.1, -0.6],
        label: { en: "Paramecium", fr: "Paramécie" },
        text: {
          en: "A single cell that swims, hunts bacteria and digests them in little bubbles called vacuoles.",
          fr: "Une seule cellule qui nage, chasse les bactéries et les digère dans de petites bulles, les vacuoles.",
        },
      },
      {
        id: "volvox",
        at: [-7.4, 3.6, -2.4],
        label: { en: "Volvox", fr: "Volvox" },
        text: {
          en: "A hollow ball of hundreds to thousands of tiny algal cells rowing together; the dark balls inside are its young.",
          fr: "Une boule creuse de centaines, voire de milliers de minuscules cellules d’algue qui rament ensemble ; les boules sombres dedans sont ses petits.",
        },
      },
      {
        id: "diatom",
        at: [4.8, 0.2, 0.8],
        label: { en: "Diatom", fr: "Diatomée" },
        text: {
          en: "An alga living inside a shell of glass (silica), engraved with a pattern unique to its species.",
          fr: "Une algue qui vit dans une coque de verre (de la silice), gravée d’un motif propre à son espèce.",
        },
      },
    ],
    source: { label: "Wikipedia — Tardigrade", url: "https://en.wikipedia.org/wiki/Tardigrade" },
  },
  {
    id: "bacteria",
    parent: "micro-zoo",
    journey: "water",
    scene: "bacteria",
    size: 1e-5,
    frame: 1.3,
    view: { pitch: 10 },
    anchor: { at: [3.7, -3.1, 1.6] },
    theme: { top: "#06344a", bottom: "#0d6470", accent: "#b5ff7a", dust: "#c8ffb0" },
    title: { en: "Bacteria", fr: "Des bactéries" },
    short: { en: "Bacteria", fr: "Bactéries" },
    teaser: { en: "Single cells without a nucleus, the most numerous life in the pond.", fr: "Des cellules seules et sans noyau, la vie la plus nombreuse de la mare." },
    compare: {
      en: "About 35 times narrower than a hair.",
      fr: "Environ 35 fois plus petites que l’épaisseur d’un cheveu.",
    },
    hook: {
      en: "The most numerous living things in the pond. A single cell without a nucleus, which can split in two every twenty minutes when conditions are good.",
      fr: "Les êtres vivants les plus nombreux de la mare. Une seule cellule, sans noyau, qui peut se diviser en deux toutes les vingt minutes quand tout va bien.",
    },
    facts: [
      {
        en: "Your body is home to roughly as many bacteria as human cells.",
        fr: "Ton corps abrite à peu près autant de bactéries que de cellules humaines.",
      },
      {
        en: "Some bacteria swim by spinning a flagellum like a propeller, at more than 10,000 turns a minute.",
        fr: "Certaines bactéries nagent en faisant tourner un flagelle comme une hélice, à plus de 10 000 tours par minute.",
      },
    ],
    hotspots: [
      {
        id: "nucleoid",
        at: [-0.6, 0.1, 0.6],
        label: { en: "No nucleus", fr: "Pas de noyau" },
        text: {
          en: "Its DNA floats freely inside the cell, in a tangle called the nucleoid.",
          fr: "Son ADN flotte librement dans la cellule, en une pelote appelée nucléoïde.",
        },
      },
      {
        id: "flagella",
        at: [-4.4, -0.3, 0.2],
        label: { en: "Flagella", fr: "Flagelles" },
        text: {
          en: "Each flagellum is a stiff corkscrew spun by a tiny rotary motor in the cell wall.",
          fr: "Chaque flagelle est un tire-bouchon rigide, tourné par un minuscule moteur rotatif logé dans la paroi.",
        },
      },
      {
        id: "division",
        at: [-4.4, -3.4, -0.2],
        label: { en: "Dividing", fr: "Division" },
        text: {
          en: "This one is splitting in two: each half leaves with a full copy of the DNA.",
          fr: "Celle-ci se coupe en deux : chaque moitié repart avec une copie complète de l’ADN.",
        },
      },
      {
        id: "cocci",
        at: [1.5, -5.3, -0.6],
        label: { en: "Round bacteria", fr: "Bactéries rondes" },
        text: {
          en: "Round bacteria are called cocci; some stay stuck together in pairs or chains after dividing.",
          fr: "Les bactéries rondes s’appellent des coques ; certaines restent collées en paires ou en chaînettes après s’être divisées.",
        },
      },
    ],
    source: { label: "Sender, Fuchs & Milo, PLOS Biology (2016)", url: "https://doi.org/10.1371/journal.pbio.1002533" },
  },
  {
    id: "virus",
    parent: "bacteria",
    journey: "water",
    scene: "virus",
    size: 2e-7,
    frame: 1.75,
    view: { pitch: 12 },
    // 100 nm above the rounded end of the hero bacterium; +Y is the wall's normal there.
    anchor: { at: [2.32, 0.525, 0.196], rotate: [12.82, -10.07, -37.53] },
    theme: { top: "#0d4474", bottom: "#2a93bf", accent: "#ff9f6b", dust: "#9fdcff" },
    title: { en: "Viruses", fr: "Des virus" },
    short: { en: "Viruses", fr: "Virus" },
    teaser: { en: "Viruses that attack bacteria by injecting their DNA.", fr: "Des virus qui attaquent les bactéries en leur injectant leur ADN." },
    compare: {
      en: "About ten times smaller than a bacterium.",
      fr: "Environ dix fois plus petits qu’une bactérie.",
    },
    hook: {
      en: "Even smaller than bacteria: viruses. In pond water they often outnumber bacteria ten to one.",
      fr: "Encore plus petits que les bactéries : les virus. Dans l’eau d’une mare, ils sont souvent dix fois plus nombreux qu’elles.",
    },
    facts: [
      {
        en: "Many of these viruses are bacteriophages: they only infect bacteria.",
        fr: "Beaucoup de ces virus sont des bactériophages : ils n’infectent que des bactéries.",
      },
      {
        en: "A virus has no metabolism: on its own it does nothing. It must enter a cell to multiply.",
        fr: "Un virus n’a pas de métabolisme : seul, il ne fait rien. Il doit entrer dans une cellule pour se multiplier.",
      },
    ],
    hotspots: [
      {
        id: "capsid",
        at: [-4.0, 3.3, 1.8],
        label: { en: "Head", fr: "Tête" },
        text: {
          en: "A hollow shell of proteins, packed tight with the virus’s DNA.",
          fr: "Une coque creuse de protéines, remplie à bloc de l’ADN du virus.",
        },
      },
      {
        id: "tail",
        at: [-3.6, -1.0, 0.9],
        label: { en: "Syringe", fr: "Seringue" },
        text: {
          en: "Once landed, the tail sheath contracts and pushes a tube through the wall to inject the DNA.",
          fr: "Une fois posé, le fourreau de la queue se contracte et enfonce un tube à travers la paroi pour injecter l’ADN.",
        },
      },
      {
        id: "tail-fibres",
        at: [5.6, -2.6, 2.2],
        label: { en: "Tail fibres", fr: "Fibres caudales" },
        text: {
          en: "Six long legs feel for the right molecules on the bacterium before the phage lands.",
          fr: "Six longues pattes tâtent la bactérie à la recherche des bonnes molécules avant que le phage ne se pose.",
        },
      },
      {
        id: "wall",
        at: [1.5, -5.4, 5],
        label: { en: "Bacterial wall", fr: "Paroi de la bactérie" },
        text: {
          en: "The rounded end of a bacterium, studded with proteins that the phage recognises.",
          fr: "Le bout arrondi d’une bactérie, hérissé de protéines que le phage reconnaît.",
        },
      },
    ],
    source: { label: "Suttle, Nature (2005)", url: "https://doi.org/10.1038/nature04160" },
  },
  {
    id: "water-molecules",
    parent: "virus",
    journey: "water",
    scene: "waterMolecules",
    size: 2e-9,
    frame: 1.05,
    anchor: { at: [0.6, 1.2, 2.6] },
    theme: { top: "#031d33", bottom: "#083c5c", accent: "#6fc8ff", dust: "#8fd8ff" },
    title: { en: "Water molecules", fr: "Des molécules d’eau" },
    short: { en: "Water molecules", fr: "Molécules d’eau" },
    teaser: { en: "Water itself: V-shaped molecules that never stop moving.", fr: "L’eau elle-même : des molécules en V qui ne cessent jamais de bouger." },
    compare: {
      en: "A water molecule is about 250,000 times smaller than the width of a hair.",
      fr: "Une molécule d’eau est environ 250 000 fois plus petite que l’épaisseur d’un cheveu.",
    },
    hook: {
      en: "Finally, water itself: V-shaped molecules that keep jostling their neighbours, linking and unlinking billions of times a second.",
      fr: "Enfin, l’eau elle-même : des molécules en forme de V qui bousculent sans cesse leurs voisines, s’accrochent et se décrochent des milliards de fois par seconde.",
    },
    facts: [
      {
        en: "At room temperature, a water molecule moves at about 600 m/s between two collisions.",
        fr: "À température ambiante, une molécule d’eau file à environ 600 m/s entre deux chocs.",
      },
      {
        en: "Ice floats because its molecules move apart when they line up into a crystal: it is less dense than liquid water.",
        fr: "La glace flotte, car ses molécules s’écartent en se rangeant en cristal : elle est moins dense que l’eau liquide.",
      },
    ],
    hotspots: [
      {
        id: "v-shape",
        at: [-1.13, 0.87, 1],
        label: { en: "Bent molecule", fr: "Molécule coudée" },
        text: {
          en: "Each molecule is one oxygen (red) and two hydrogens (white), bent at 104.5°.",
          fr: "Chaque molécule est un oxygène (rouge) et deux hydrogènes (blancs), en V ouvert à 104,5°.",
        },
      },
      {
        id: "hydrogen-bond",
        at: [0.75, 0.58, 1],
        label: { en: "Hydrogen bond", fr: "Liaison hydrogène" },
        text: {
          en: "The dashes: a slightly positive hydrogen is attracted by the slightly negative oxygen of a neighbour.",
          fr: "Les pointillés : un hydrogène un peu positif est attiré par l’oxygène un peu négatif d’une voisine.",
        },
      },
      {
        id: "motion",
        at: [4.2, -2.4, 0.8],
        label: { en: "Never still", fr: "Jamais immobiles" },
        text: {
          en: "Each hydrogen bond lasts only a few trillionths of a second before breaking and forming again.",
          fr: "Chaque liaison hydrogène ne dure que quelques billionièmes de seconde avant de se rompre et de se reformer.",
        },
      },
    ],
    source: { label: "USGS Water Science School", url: "https://www.usgs.gov/special-topics/water-science-school/science/water-density" },
  },
  ...matterChain("oxygen", {
    parent: "water-molecules",
    journey: "water",
    // The O of the central, motionless molecule (its H–O–H plane faces the camera, H above).
    anchor: { at: [0, 0, 1] },
    neighbors: [
      // O–H 0.96 Å and H–O–H 104.5°, in atom units (10 units = 3.04 Å).
      { symbol: "H", at: [2.5, 1.94, 0] },
      { symbol: "H", at: [-2.5, 1.94, 0] },
    ],
  }),
];
