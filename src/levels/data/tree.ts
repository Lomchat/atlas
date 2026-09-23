import type { LevelData } from "../types.ts";
import { matterChain } from "./matter.ts";

/** Tree → leaf → cell → chloroplast → chlorophyll → magnesium. */
export const treeLevels: LevelData[] = [
  {
    id: "tree",
    parent: "park",
    journey: "tree",
    scene: "tree",
    size: 8,
    frame: 1.35,
    view: { pitch: 6 },
    anchor: { at: [1.6, 1.0, -0.6] },
    hotspots: [
      {
        id: "crown",
        at: [-0.95, 2.9, 2.55],
        label: { en: "Crown", fr: "Houppier" },
        text: {
          en: "Its leaves overlap in layers so that as many as possible catch the sunlight.",
          fr: "Ses feuilles se chevauchent en couches pour capter un maximum de soleil.",
        },
      },
      {
        id: "trunk",
        at: [0.03, -3.6, 0.45],
        label: { en: "Trunk", fr: "Tronc" },
        text: {
          en: "Water climbs from the roots to the leaves through tiny pipes in the wood.",
          fr: "L’eau monte des racines jusqu’aux feuilles par de minuscules tuyaux dans le bois.",
        },
      },
      {
        id: "roots",
        at: [-4.6, -5.65, 1.02],
        label: { en: "Roots", fr: "Racines" },
        text: {
          en: "Fine roots take up water and minerals, often helped by fungi wrapped around them.",
          fr: "Les fines racines puisent l’eau et les minéraux, souvent aidées par des champignons enroulés autour d’elles.",
        },
      },
    ],
    theme: { top: "#4cb8f5", bottom: "#c8f0ff", accent: "#5fd35f", dust: "#ffffff" },
    title: { en: "A tree", fr: "Un arbre" },
    short: { en: "Tree", fr: "Arbre" },
    teaser: { en: "A tree that builds itself from air, water and light.", fr: "Un arbre qui se construit avec de l’air, de l’eau et de la lumière." },
    compare: {
      en: "About the height of a two-storey house.",
      fr: "Environ la hauteur d’une maison à deux étages.",
    },
    hook: {
      en: "A tree makes its own food from air, water and light. Most of its matter comes… from the air.",
      fr: "Un arbre fabrique sa propre nourriture avec de l’air, de l’eau et de la lumière. Sa matière vient surtout… de l’air.",
    },
    facts: [
      {
        en: "About half of the dry mass of wood is carbon, captured from the CO₂ in the air.",
        fr: "Environ la moitié de la masse sèche du bois est du carbone, capturé dans le CO₂ de l’air.",
      },
      {
        en: "A tree’s roots often spread wider than its crown.",
        fr: "Les racines d’un arbre s’étendent souvent plus loin que sa couronne.",
      },
    ],
    source: { label: "OpenStax Biology 2e", url: "https://openstax.org/books/biology-2e/pages/8-1-overview-of-photosynthesis" },
  },
  {
    id: "leaf",
    parent: "tree",
    journey: "tree",
    scene: "leaf",
    size: 0.1,
    frame: 1.25,
    view: { pitch: 60 },
    anchor: { at: [1.86, 0.48, 3.05], rotate: [50, 0, 0] },
    hotspots: [
      {
        id: "midrib",
        at: [-2.4, 0.15, -1.28],
        label: { en: "Veins", fr: "Nervures" },
        text: {
          en: "The main vein stiffens the blade and branches into a network that reaches every cell.",
          fr: "La nervure principale rigidifie le limbe et se ramifie en un réseau qui atteint chaque cellule.",
        },
      },
      {
        id: "petiole",
        at: [-4.4, 0.0, -2.5],
        label: { en: "Petiole", fr: "Pétiole" },
        text: {
          en: "This little stalk links the leaf to the twig and turns it towards the light.",
          fr: "Cette petite tige relie la feuille au rameau et l’oriente vers la lumière.",
        },
      },
      {
        id: "bud",
        at: [-6.06, -0.42, 1.27],
        label: { en: "Bud", fr: "Bourgeon" },
        text: {
          en: "Next year’s shoot is already waiting inside, folded up.",
          fr: "La pousse de l’année prochaine y attend déjà, toute repliée.",
        },
      },
    ],
    theme: { top: "#173a5e", bottom: "#2f6f8f", accent: "#9ef27a", dust: "#d8ffe0" },
    title: { en: "A leaf", fr: "Une feuille" },
    short: { en: "Leaf", fr: "Feuille" },
    teaser: { en: "A leaf: the tree’s solar panel.", fr: "Une feuille : le panneau solaire de l’arbre." },
    compare: {
      en: "About the length of your palm.",
      fr: "À peu près la longueur de ta paume.",
    },
    hook: {
      en: "A leaf is a living solar panel. Its veins bring in water and carry away the sugar it makes.",
      fr: "Une feuille est un panneau solaire vivant. Ses nervures apportent l’eau et emportent le sucre qu’elle fabrique.",
    },
    facts: [
      {
        en: "Under the leaf, thousands of tiny mouths called stomata let CO₂ in and water vapour out.",
        fr: "Sous la feuille, des milliers de minuscules bouches, les stomates, laissent entrer le CO₂ et sortir la vapeur d’eau.",
      },
      {
        en: "A large tree can carry more than 200,000 leaves.",
        fr: "Un grand arbre peut porter plus de 200 000 feuilles.",
      },
    ],
    source: { label: "OpenStax Biology 2e", url: "https://openstax.org/books/biology-2e/pages/30-4-leaves" },
  },
  {
    id: "leaf-section",
    parent: "leaf",
    journey: "tree",
    scene: "leafSection",
    size: 1e-3,
    frame: 0.78,
    view: { pitch: 18, yaw: -24 },
    anchor: { at: [0.607, 0.261, 1.278], rotate: [-6, 0, -4.4] },
    hotspots: [
      {
        id: "palisade",
        at: [-2.3, 0.6, 2.12],
        label: { en: "Palisade cells", fr: "Cellules palissadiques" },
        text: {
          en: "Tall cells packed with chloroplasts, lined up under the surface to catch most of the light.",
          fr: "Des cellules hautes, bourrées de chloroplastes, alignées sous la surface pour capter l’essentiel de la lumière.",
        },
      },
      {
        id: "air",
        at: [0.4, -0.45, 2.08],
        label: { en: "Air spaces", fr: "Espaces d’air" },
        text: {
          en: "Loose cells leave gaps where CO₂ spreads and water evaporates.",
          fr: "Des cellules lâches laissent des espaces où le CO₂ se répand et où l’eau s’évapore.",
        },
      },
      {
        id: "vein",
        at: [-1.55, -0.32, 2.12],
        label: { en: "Vein", fr: "Nervure" },
        text: {
          en: "Xylem (purple) brings water; phloem (orange) carries sugar to the rest of the tree.",
          fr: "Le xylème (violet) apporte l’eau ; le phloème (orange) emporte le sucre vers le reste de l’arbre.",
        },
      },
      {
        id: "stoma",
        at: [1.75, -1.08, 2.12],
        label: { en: "Stoma", fr: "Stomate" },
        text: {
          en: "Two guard cells open a pore: CO₂ (white) comes in, oxygen (pink) and water vapour (blue) go out.",
          fr: "Deux cellules de garde ouvrent un pore : le CO₂ (blanc) entre, l’oxygène (rose) et la vapeur d’eau (bleu) sortent.",
        },
      },
    ],
    theme: { top: "#0f2f2a", bottom: "#1f5c49", accent: "#b8f27a", dust: "#c8ffd8" },
    title: { en: "A leaf in cross-section", fr: "Une feuille en coupe" },
    short: { en: "Leaf section", fr: "Coupe de feuille" },
    teaser: { en: "A slice of leaf, with its light-catching cells and tiny pores.", fr: "Une tranche de feuille, avec ses cellules qui captent la lumière et ses pores." },
    compare: {
      en: "A leaf is only a few tenths of a millimetre thick.",
      fr: "Une feuille n’est épaisse que de quelques dixièmes de millimètre.",
    },
    hook: {
      en: "Under the leaf’s clear skin, column-shaped cells packed with green grains catch the light. Lower down, looser cells let air circulate.",
      fr: "Sous la peau transparente de la feuille, des cellules en colonnes, bourrées de grains verts, captent la lumière. Plus bas, des cellules plus lâches laissent circuler l’air.",
    },
    facts: [
      {
        en: "Stomata open and close thanks to two bean-shaped cells that swell with water.",
        fr: "Les stomates s’ouvrent et se ferment grâce à deux cellules en forme de haricot qui se gonflent d’eau.",
      },
      {
        en: "The cuticle, a thin layer of wax, stops the leaf from drying out.",
        fr: "La cuticule, une fine couche de cire, empêche la feuille de se dessécher.",
      },
    ],
    source: { label: "OpenStax Biology 2e", url: "https://openstax.org/books/biology-2e/pages/30-4-leaves" },
  },
  {
    id: "leaf-cell",
    parent: "leaf-section",
    journey: "tree",
    scene: "leafCell",
    size: 6e-5,
    frame: 1.3,
    view: { pitch: 16, yaw: -18 },
    anchor: { at: [0.62, 0.58, 1.98] },
    hotspots: [
      {
        id: "chloroplasts",
        at: [0.55, -1.9, 1.85],
        label: { en: "Chloroplasts", fr: "Chloroplastes" },
        text: {
          en: "Dozens of them ride the flowing cytoplasm around the vacuole.",
          fr: "Des dizaines d’entre eux sont emportés par le cytoplasme qui circule autour de la vacuole.",
        },
      },
      {
        id: "vacuole",
        at: [-0.25, 1.2, 1.45],
        label: { en: "Vacuole", fr: "Vacuole" },
        text: {
          en: "A bag of water that presses the cell against its wall, like air in a tyre.",
          fr: "Une poche d’eau qui plaque la cellule contre sa paroi, comme l’air dans un pneu.",
        },
      },
      {
        id: "nucleus",
        at: [-1.0, -1.2, -0.4],
        label: { en: "Nucleus", fr: "Noyau" },
        text: {
          en: "It holds the cell’s DNA, pushed against the wall by the vacuole.",
          fr: "Il contient l’ADN de la cellule, repoussé contre la paroi par la vacuole.",
        },
      },
      {
        id: "wall",
        at: [1.9, 2.4, 0.62],
        label: { en: "Cell wall", fr: "Paroi" },
        text: {
          en: "A stiff shell of cellulose, which animal cells do not have.",
          fr: "Une coque rigide de cellulose, que les cellules animales n’ont pas.",
        },
      },
    ],
    theme: { top: "#0c2a24", bottom: "#185241", accent: "#7af2a8", dust: "#a8ffcc" },
    title: { en: "A leaf cell", fr: "Une cellule de feuille" },
    short: { en: "Leaf cell", fr: "Cellule" },
    teaser: { en: "A plant cell full of green chloroplasts, inside a stiff wall.", fr: "Une cellule végétale pleine de chloroplastes verts, dans une paroi rigide." },
    compare: {
      en: "Almost as long as a hair is wide.",
      fr: "Presque aussi longue que l’épaisseur d’un cheveu.",
    },
    hook: {
      en: "A plant cell is wrapped in a stiff wall. Inside, dozens of green chloroplasts move around to follow the light.",
      fr: "Une cellule végétale est entourée d’une paroi rigide. À l’intérieur, des dizaines de chloroplastes verts se déplacent pour suivre la lumière.",
    },
    facts: [
      {
        en: "A big water pocket, the vacuole, often fills most of the cell and keeps it firm.",
        fr: "Une grande poche d’eau, la vacuole, occupe souvent la majeure partie de la cellule et la maintient gonflée.",
      },
      {
        en: "When the light is too strong, chloroplasts line up along the side walls to shade each other.",
        fr: "Quand la lumière est trop forte, les chloroplastes se rangent le long des parois pour se faire de l’ombre.",
      },
    ],
    source: { label: "OpenStax Biology 2e", url: "https://openstax.org/books/biology-2e/pages/4-3-eukaryotic-cells" },
  },
  {
    id: "chloroplast",
    parent: "leaf-cell",
    journey: "tree",
    scene: "chloroplast",
    size: 5e-6,
    frame: 1.3,
    view: { pitch: 24, yaw: -14 },
    anchor: { at: [0.07, 4.68, 0.23], rotate: [7.8, 3.8, -2.5] },
    theme: { top: "#0a2420", bottom: "#134838", accent: "#c8ff6b", dust: "#c8ffb0" },
    title: { en: "A chloroplast", fr: "Un chloroplaste" },
    short: { en: "Chloroplast", fr: "Chloroplaste" },
    teaser: { en: "The little green factory where photosynthesis happens.", fr: "La petite usine verte où se fait la photosynthèse." },
    compare: {
      en: "About 15 times narrower than a hair.",
      fr: "Environ 15 fois plus petit que l’épaisseur d’un cheveu.",
    },
    hook: {
      en: "The photosynthesis factory. These stacks of green discs capture light to turn CO₂ and water into sugar.",
      fr: "L’usine de la photosynthèse. Ces piles de disques verts captent la lumière pour transformer le CO₂ et l’eau en sucre.",
    },
    facts: [
      {
        en: "Like mitochondria, chloroplasts descend from ancient bacteria and still carry their own small DNA.",
        fr: "Comme les mitochondries, les chloroplastes descendent d’anciennes bactéries et possèdent encore leur propre petit ADN.",
      },
      {
        en: "Almost all the oxygen you breathe was released by photosynthesis, in plants, algae and plankton.",
        fr: "Presque tout l’oxygène que tu respires a été libéré par la photosynthèse, dans les plantes, les algues et le plancton.",
      },
    ],
    hotspots: [
      {
        id: "envelope",
        at: [-2.6, 0.05, 2.75],
        label: { en: "Double envelope", fr: "Double enveloppe" },
        text: {
          en: "Two membranes wrap the chloroplast: a trace of its origin, a bacterium swallowed over a billion years ago.",
          fr: "Deux membranes entourent le chloroplaste : une trace de son origine, une bactérie avalée il y a plus d’un milliard d’années.",
        },
      },
      {
        id: "starch",
        at: [2.75, -0.05, 0.75],
        label: { en: "Starch grain", fr: "Grain d’amidon" },
        text: {
          en: "Sugar made during the day is stored here as starch, then used at night.",
          fr: "Le sucre fabriqué le jour est stocké ici sous forme d’amidon, puis utilisé la nuit.",
        },
      },
      {
        id: "dna",
        at: [1.55, -0.15, -0.55],
        label: { en: "Its own DNA", fr: "Son propre ADN" },
        text: {
          en: "A small ring of DNA with about a hundred genes; most chloroplast proteins are now encoded in the cell’s nucleus.",
          fr: "Un petit anneau d’ADN d’une centaine de gènes ; la plupart des protéines du chloroplaste sont désormais codées dans le noyau.",
        },
      },
      {
        id: "stroma",
        at: [-3.4, -0.2, -0.6],
        label: { en: "Stroma", fr: "Stroma" },
        text: {
          en: "In this gel, the enzyme Rubisco fixes CO₂ from the air to build sugar.",
          fr: "Dans ce gel, l’enzyme Rubisco fixe le CO₂ de l’air pour construire du sucre.",
        },
      },
    ],
    source: { label: "OpenStax Biology 2e", url: "https://openstax.org/books/biology-2e/pages/8-1-overview-of-photosynthesis" },
  },
  {
    id: "thylakoid",
    parent: "chloroplast",
    journey: "tree",
    scene: "thylakoid",
    size: 5e-7,
    view: { pitch: 30, yaw: -14 },
    anchor: { at: [0.55, 0.1, 0.75] },
    theme: { top: "#081d1c", bottom: "#0f3c34", accent: "#6bffd1", dust: "#9fffe0" },
    title: { en: "Thylakoids", fr: "Les thylakoïdes" },
    short: { en: "Thylakoids", fr: "Thylakoïdes" },
    teaser: { en: "Stacked discs whose membranes capture light.", fr: "Des disques empilés dont les membranes captent la lumière." },
    compare: {
      en: "A stack of discs about ten times smaller than the chloroplast around it.",
      fr: "Une pile de disques environ dix fois plus petite que le chloroplaste qui l’entoure.",
    },
    hook: {
      en: "Flattened sacs stacked like coins. Their membrane is covered with machines that capture light.",
      fr: "Des sacs aplatis, empilés comme des pièces de monnaie. Leur membrane est couverte de machines qui captent la lumière.",
    },
    facts: [
      {
        en: "A stack is called a granum; one chloroplast can hold dozens of them.",
        fr: "Une pile s’appelle un granum ; un chloroplaste peut en contenir plusieurs dizaines.",
      },
      {
        en: "This is where water is split: the oxygen you breathe comes out of these membranes.",
        fr: "C’est ici que l’eau est cassée : l’oxygène que tu respires sort de ces membranes.",
      },
    ],
    hotspots: [
      {
        id: "lumen",
        at: [-0.5, 0.0, 2.6],
        label: { en: "Lumen", fr: "Lumen" },
        text: {
          en: "Inside each disc, protons pile up while light shines: a reserve of energy.",
          fr: "Dans chaque disque, des protons s’accumulent tant qu’il y a de la lumière : une réserve d’énergie.",
        },
      },
      {
        id: "atp-synthase",
        at: [1.6, 3.0, -2.77],
        label: { en: "ATP synthase", fr: "ATP synthase" },
        text: {
          en: "A rotary motor: protons flowing out of the lumen turn it, and it makes ATP, the cell’s fuel.",
          fr: "Un moteur rotatif : les protons qui sortent du lumen le font tourner, et il fabrique de l’ATP, le carburant de la cellule.",
        },
      },
      {
        id: "lamella",
        at: [-5.1, 0.95, 1.85],
        label: { en: "Stroma lamella", fr: "Lamelle stromale" },
        text: {
          en: "Flat sheets that link one stack to the next, so the thylakoids form a single network.",
          fr: "Des feuillets plats qui relient une pile à la suivante : les thylakoïdes forment un seul réseau.",
        },
      },
    ],
    source: { label: "OpenStax Biology 2e", url: "https://openstax.org/books/biology-2e/pages/8-2-the-light-dependent-reaction-of-photosynthesis" },
  },
  {
    id: "photosystem",
    parent: "thylakoid",
    journey: "tree",
    scene: "photosystem",
    size: 2.5e-8,
    view: { pitch: 25 },
    anchor: { at: [-1.3, 2.62, 1.9] },
    theme: { top: "#06161a", bottom: "#0c3032", accent: "#ffe36b", dust: "#fff2a8" },
    title: { en: "A photosystem", fr: "Un photosystème" },
    short: { en: "Photosystem", fr: "Photosystème" },
    teaser: { en: "A light-catching machine that turns a photon into a moving electron.", fr: "Une machine qui capte la lumière et transforme un photon en électron en mouvement." },
    compare: {
      en: "About 3,000 times narrower than a hair.",
      fr: "Environ 3 000 fois plus petit que l’épaisseur d’un cheveu.",
    },
    hook: {
      en: "An antenna of proteins and pigments. When a photon hits it, its energy hops from pigment to pigment to the centre, where an electron is set loose.",
      fr: "Une antenne de protéines et de pigments. Quand un photon la frappe, son énergie saute de pigment en pigment jusqu’au centre, où un électron est éjecté.",
    },
    facts: [
      {
        en: "Energy crosses the antenna in less than a billionth of a second.",
        fr: "L’énergie traverse l’antenne en moins d’un milliardième de seconde.",
      },
      {
        en: "Each photosystem holds hundreds of pigments: chlorophylls, and carotenoids that give autumn its colours.",
        fr: "Chaque photosystème contient des centaines de pigments : des chlorophylles, et des caroténoïdes qui donnent ses couleurs à l’automne.",
      },
      {
        en: "It takes four photons to split two water molecules and free one molecule of O₂.",
        fr: "Il faut quatre photons pour casser deux molécules d’eau et libérer une molécule d’O₂.",
      },
    ],
    hotspots: [
      {
        id: "antenna",
        at: [5.4, 0.7, 0.55],
        label: { en: "Light-harvesting antenna", fr: "Antenne collectrice" },
        text: {
          en: "Proteins packed with chlorophylls catch light and pass its energy on, in a few trillionths of a second per hop.",
          fr: "Des protéines bourrées de chlorophylles captent la lumière et en passent l’énergie, en quelques billionièmes de seconde par saut.",
        },
      },
      {
        id: "reaction-centre",
        at: [-1.75, -0.35, 0.85],
        label: { en: "Reaction centre", fr: "Centre réactionnel" },
        text: {
          en: "Here a special pair of chlorophylls, P680, uses the energy to hand an electron to the chain.",
          fr: "Ici, une paire spéciale de chlorophylles, P680, utilise l’énergie pour céder un électron à la chaîne.",
        },
      },
      {
        id: "water-splitting",
        at: [-1.85, -1.1, 1.2],
        label: { en: "Water splitting", fr: "Cassage de l’eau" },
        text: {
          en: "A cluster of manganese and calcium takes electrons from water, releasing protons and oxygen.",
          fr: "Un amas de manganèse et de calcium arrache des électrons à l’eau, ce qui libère des protons et de l’oxygène.",
        },
      },
      {
        id: "bilayer",
        at: [7.5, 0.3, 0.15],
        label: { en: "Lipid bilayer", fr: "Bicouche lipidique" },
        text: {
          en: "The membrane is two layers of lipids, heads out and tails in, only about 4 nm thick.",
          fr: "La membrane est faite de deux couches de lipides, têtes dehors et queues dedans, épaisse d’environ 4 nm.",
        },
      },
    ],
    source: { label: "Wikipedia — Photosystem II", url: "https://en.wikipedia.org/wiki/Photosystem_II" },
  },
  {
    id: "chlorophyll",
    parent: "photosystem",
    journey: "tree",
    scene: "chlorophyll",
    size: 2e-9,
    frame: 1.35,
    view: { pitch: 8, yaw: -14 },
    // Photosystem view (pitch 25) ∘ this rotation = this level's view: the ring faces the camera.
    anchor: { at: [-3.3, 0.4, 2.6], rotate: [-17, -14, 0] },
    theme: { top: "#071222", bottom: "#10294c", accent: "#7fffb0", dust: "#8fffc0" },
    title: { en: "A chlorophyll molecule", fr: "Une chlorophylle" },
    short: { en: "Chlorophyll", fr: "Chlorophylle" },
    teaser: { en: "The green pigment that absorbs light, with magnesium at its heart.", fr: "Le pigment vert qui absorbe la lumière, avec du magnésium en son cœur." },
    compare: {
      en: "About 35,000 times thinner than a hair.",
      fr: "Environ 35 000 fois plus fine qu’un cheveu.",
    },
    hook: {
      en: "A ring-shaped head that absorbs red and blue light, and a long tail that anchors it in the membrane. It reflects green: that is why leaves are green.",
      fr: "Une tête en anneau qui absorbe le rouge et le bleu, et une longue queue qui l’ancre dans la membrane. Elle renvoie le vert : c’est pour cela que les feuilles sont vertes.",
    },
    facts: [
      {
        en: "In autumn chlorophyll breaks down, and the yellow and orange pigments hidden until then appear.",
        fr: "À l’automne, la chlorophylle se dégrade : les pigments jaunes et orange, cachés jusque-là, apparaissent.",
      },
      {
        en: "At the centre of the ring sits a magnesium atom, held by four nitrogen atoms.",
        fr: "Au centre de l’anneau se trouve un atome de magnésium, tenu par quatre atomes d’azote.",
      },
    ],
    hotspots: [
      {
        id: "ring",
        at: [-2.85, 1.7, 0.3],
        label: { en: "Chlorin ring", fr: "Anneau chlorine" },
        text: {
          en: "Its alternating single and double bonds share electrons that absorb red and blue light.",
          fr: "Ses liaisons simples et doubles alternées partagent des électrons qui absorbent le rouge et le bleu.",
        },
      },
      {
        id: "tail",
        at: [0.15, -4.55, 0.3],
        label: { en: "Phytol tail", fr: "Queue de phytol" },
        text: {
          en: "A 20-carbon chain that anchors the molecule among the proteins and lipids of the membrane.",
          fr: "Une chaîne de 20 carbones qui ancre la molécule parmi les protéines et les lipides de la membrane.",
        },
      },
      {
        id: "atoms",
        at: [0.3, -1.2, 0.3],
        label: { en: "137 atoms", fr: "137 atomes" },
        text: {
          en: "Chlorophyll a is C₅₅H₇₂MgN₄O₅: carbon (dark), hydrogen (white), nitrogen (blue), oxygen (red) and one magnesium.",
          fr: "La chlorophylle a, c’est C₅₅H₇₂MgN₄O₅ : carbone (foncé), hydrogène (blanc), azote (bleu), oxygène (rouge) et un magnésium.",
        },
      },
    ],
    source: { label: "OpenStax Biology 2e", url: "https://openstax.org/books/biology-2e/pages/8-2-the-light-dependent-reaction-of-photosynthesis" },
  },
  ...matterChain("magnesium", {
    parent: "chlorophyll",
    journey: "tree",
    anchor: { at: [-1.1, 1.7, 0] },
    neighbors: [
      // The four ring nitrogens, Mg–N 2.05 Å, in atom units (10 units = 3.46 Å).
      { symbol: "N", at: [-4.19, 4.19, 0] },
      { symbol: "N", at: [4.19, 4.19, 0] },
      { symbol: "N", at: [4.19, -4.19, 0] },
      { symbol: "N", at: [-4.19, -4.19, 0] },
    ],
  }),
];
