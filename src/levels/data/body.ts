import type { LevelData } from "../types.ts";
import { matterChain } from "./matter.ts";

/** You → hand → skin → cell → DNA → carbon, with a branch into the blood. */
export const bodyLevels: LevelData[] = [
  {
    id: "person",
    parent: "park",
    journey: "body",
    scene: "person",
    size: 1.75,
    frame: 1.35,
    primary: true,
    view: { pitch: 4 },
    anchor: { at: [-0.9, 0.219, 1.6] },
    theme: { top: "#46b3f5", bottom: "#c4ecff", accent: "#ff6f61", dust: "#ffffff" },
    title: { en: "You", fr: "Toi" },
    short: { en: "You", fr: "Toi" },
    teaser: { en: "You! A body made of about 30 trillion cells.", fr: "Toi ! Un corps fait d’environ 30 000 milliards de cellules." },
    compare: {
      en: "In powers of ten, you sit roughly halfway between an atom and the Sun.",
      fr: "En puissances de dix, tu te trouves à peu près à mi-chemin entre un atome et le Soleil.",
    },
    hook: {
      en: "Your body is made of about 30 trillion cells. Let’s dive into your hand to see them.",
      fr: "Ton corps compte environ 30 000 milliards de cellules. Plongeons dans ta main pour les voir.",
    },
    facts: [
      {
        en: "You contain about 7 × 10²⁷ atoms: seven billion billion billion.",
        fr: "Tu contiens environ 7 × 10²⁷ atomes : sept milliards de milliards de milliards.",
      },
      {
        en: "About 60% of your body is water.",
        fr: "Ton corps est composé d’eau à environ 60 %.",
      },
    ],
    source: { label: "Sender, Fuchs & Milo, PLOS Biology (2016)", url: "https://doi.org/10.1371/journal.pbio.1002533" },
  },
  {
    id: "hand",
    parent: "person",
    journey: "body",
    scene: "hand",
    size: 0.19,
    frame: 1.28,
    view: { pitch: 2, yaw: -6 },
    anchor: { at: [2.7, 4.6, 0.3] },
    theme: { top: "#1e3a6e", bottom: "#3f78b8", accent: "#ffb86b", dust: "#cfe4ff" },
    title: { en: "Your hand", fr: "Ta main" },
    short: { en: "Hand", fr: "Main" },
    teaser: { en: "Your hand: bones, tendons and skin that feels everything.", fr: "Ta main : des os, des tendons et une peau qui sent tout." },
    compare: {
      en: "An adult hand is about 19 cm long, from the wrist to the tip of the middle finger.",
      fr: "Une main d’adulte mesure environ 19 cm, du poignet au bout du majeur.",
    },
    hook: {
      en: "27 bones, dozens of muscles and tendons… and skin covered in tiny ridges. Let’s get closer to a fingertip.",
      fr: "27 os, des dizaines de muscles et de tendons… et une peau couverte de minuscules sillons. Approchons-nous du bout d’un doigt.",
    },
    facts: [
      {
        en: "Each fingertip holds thousands of touch sensors.",
        fr: "Chaque bout de doigt contient des milliers de capteurs du toucher.",
      },
      {
        en: "Your fingernails grow about 3 mm a month.",
        fr: "Tes ongles poussent d’environ 3 mm par mois.",
      },
    ],
    hotspots: [
      {
        id: "bones",
        at: [-0.3, -1.9, 0.75],
        label: { en: "27 bones", fr: "27 os" },
        text: {
          en: "8 in the wrist, 5 in the palm and 14 in the fingers: the x-ray band reveals them.",
          fr: "8 dans le poignet, 5 dans la paume et 14 dans les doigts : la bande de rayons X les révèle.",
        },
      },
      {
        id: "tendons",
        at: [-1.68, 1.61, 0.4],
        label: { en: "Tendons", fr: "Tendons" },
        text: {
          en: "Your fingers contain no muscles: tendons pull them from muscles in your palm and forearm.",
          fr: "Tes doigts ne contiennent aucun muscle : des tendons les tirent depuis des muscles de ta paume et de ton avant-bras.",
        },
      },
      {
        id: "thumb",
        at: [-3.94, -0.26, 0.73],
        label: { en: "Opposable thumb", fr: "Pouce opposable" },
        text: {
          en: "Your thumb can swing across to touch each fingertip, which lets you grip precisely.",
          fr: "Ton pouce peut pivoter pour toucher le bout de chaque doigt : c’est ce qui te permet de saisir avec précision.",
        },
      },
      {
        id: "creases",
        at: [1.2, 0.0, 0.72],
        label: { en: "Palm lines", fr: "Lignes de la main" },
        text: {
          en: "Creases where the skin folds each time you close your hand.",
          fr: "Des plis là où la peau se replie chaque fois que tu fermes la main.",
        },
      },
    ],
    source: { label: "OpenStax Anatomy & Physiology 2e", url: "https://openstax.org/details/books/anatomy-and-physiology-2e" },
  },
  {
    id: "fingertip",
    parent: "hand",
    journey: "body",
    scene: "fingertip",
    size: 1.6e-2,
    anchor: { at: [-0.42, 4.55, 0.395] },
    theme: { top: "#25336e", bottom: "#4a5bb4", accent: "#ffa07a", dust: "#d8ddff" },
    title: { en: "A fingerprint", fr: "Une empreinte digitale" },
    short: { en: "Fingerprint", fr: "Empreinte" },
    teaser: { en: "The ridges of your fingertip, which help you grip and feel.", fr: "Les sillons du bout de ton doigt, qui t’aident à saisir et à sentir." },
    compare: {
      en: "Each ridge is about as wide as a grain of fine salt.",
      fr: "Chaque crête est à peu près aussi large qu’un grain de sel fin.",
    },
    hook: {
      en: "These ridges help you grip objects and feel textures. Their pattern is unique: even identical twins have different fingerprints.",
      fr: "Ces sillons t’aident à saisir les objets et à sentir les textures. Leur dessin est unique : même de vrais jumeaux ont des empreintes différentes.",
    },
    facts: [
      {
        en: "Fingerprints form before birth, around the fourth month of pregnancy, and never change afterwards.",
        fr: "Les empreintes se forment avant la naissance, vers le quatrième mois de grossesse, et ne changent plus ensuite.",
      },
      {
        en: "Pores open along the ridges: they are the outlets of your sweat glands.",
        fr: "Le long des crêtes s’ouvrent des pores : ce sont les sorties des glandes à sueur.",
      },
    ],
    hotspots: [
      {
        id: "whorl",
        at: [-1.05, 0.55, -0.13],
        label: { en: "A whorl", fr: "Un verticille" },
        text: {
          en: "Here the ridges circle around a centre. The other common patterns are loops and arches.",
          fr: "Ici, les crêtes tournent autour d’un centre. Les autres dessins courants sont les boucles et les arcs.",
        },
      },
      {
        id: "ridges",
        at: [-3.2, -3.0, -0.88],
        label: { en: "Friction ridges", fr: "Crêtes papillaires" },
        text: {
          en: "When your finger slides over a surface, these ridges make tiny vibrations that help you feel its texture.",
          fr: "Quand ton doigt glisse sur une surface, ces crêtes créent de minuscules vibrations qui t’aident à en sentir la texture.",
        },
      },
      {
        id: "pores",
        at: [2.6, -2.8, -0.55],
        label: { en: "Sweat pores", fr: "Pores de sueur" },
        text: {
          en: "Each ridge is dotted with pores: a little sweat keeps your fingertips supple and helps them grip.",
          fr: "Chaque crête est ponctuée de pores : un peu de sueur garde le bout de tes doigts souple et aide à bien saisir.",
        },
      },
    ],
    source: { label: "OpenStax Anatomy & Physiology 2e", url: "https://openstax.org/books/anatomy-and-physiology-2e/pages/5-1-layers-of-the-skin" },
  },
  {
    id: "skin",
    parent: "fingertip",
    journey: "body",
    scene: "skin",
    size: 2e-3,
    view: { pitch: 18, yaw: -24 },
    anchor: { at: [0.918, 0.489, -0.623], rotate: [83.33, 1.08, -9.12] },
    theme: { top: "#3a1640", bottom: "#7c2a5c", accent: "#ff8fa3", dust: "#ffb3c6" },
    title: { en: "Skin in cross-section", fr: "La peau en coupe" },
    short: { en: "Skin", fr: "Peau" },
    teaser: { en: "A slice of skin: its layers, vessels, nerves and sweat glands.", fr: "Une tranche de peau : ses couches, ses vaisseaux, ses nerfs et ses glandes à sueur." },
    compare: {
      en: "About as thick as a coin.",
      fr: "À peu près l’épaisseur d’une pièce de monnaie.",
    },
    hook: {
      en: "Your skin is an organ in its own right, built in layers: the epidermis on top, and below it the dermis with its vessels, nerves and glands.",
      fr: "Ta peau est un organe à part entière, construit en couches : l’épiderme en surface, puis le derme avec ses vaisseaux, ses nerfs et ses glandes.",
    },
    facts: [
      {
        en: "It is the largest organ of the body: about 2 m² and 4 kg in an adult.",
        fr: "C’est le plus grand organe du corps : environ 2 m² et 4 kg chez un adulte.",
      },
      {
        en: "Every minute you shed tens of thousands of dead skin cells.",
        fr: "Chaque minute, tu perds des dizaines de milliers de cellules mortes de ta peau.",
      },
    ],
    hotspots: [
      {
        id: "touch",
        at: [1.01, 2.71, 3.15],
        label: { en: "Touch sensor", fr: "Capteur du toucher" },
        text: {
          en: "A Meissner corpuscle, nestled in a papilla, senses the lightest touch and signals it along the yellow nerve.",
          fr: "Un corpuscule de Meissner, niché dans une papille, détecte le moindre effleurement et le signale par le nerf jaune.",
        },
      },
      {
        id: "sweat",
        at: [2.2, -1.72, 3.0],
        label: { en: "Sweat gland", fr: "Glande sudoripare" },
        text: {
          en: "A coiled tube that makes sweat; its duct spirals up to a pore on a ridge.",
          fr: "Un tube enroulé qui fabrique la sueur ; son canal monte en spirale jusqu’à un pore, sur une crête.",
        },
      },
      {
        id: "vessels",
        at: [-1.0, -1.8, 2.1],
        label: { en: "Blood vessels", fr: "Vaisseaux sanguins" },
        text: {
          en: "An arteriole brings blood in, capillary loops climb into the papillae, and a venule carries it away.",
          fr: "Une artériole apporte le sang, des boucles de capillaires montent dans les papilles, et une veinule le remporte.",
        },
      },
      {
        id: "deep",
        at: [-2.9, -3.45, 3.25],
        label: { en: "Fat and vibration", fr: "Graisse et vibrations" },
        text: {
          en: "Below the dermis, fat cells cushion and insulate, and the onion-like Pacinian corpuscle senses vibrations.",
          fr: "Sous le derme, les cellules de graisse amortissent et isolent, et le corpuscule de Pacini, en couches comme un oignon, capte les vibrations.",
        },
      },
    ],
    source: { label: "OpenStax Anatomy & Physiology 2e", url: "https://openstax.org/books/anatomy-and-physiology-2e/pages/5-1-layers-of-the-skin" },
  },
  {
    id: "epidermis",
    parent: "skin",
    journey: "body",
    scene: "epidermis",
    size: 2e-4,
    view: { pitch: 14, yaw: -22 },
    anchor: { at: [-1.16, 3.55, 2.95] },
    theme: { top: "#4a1245", bottom: "#8e2b62", accent: "#ffb3c6", dust: "#ffc2d6" },
    title: { en: "The epidermis", fr: "L’épiderme" },
    short: { en: "Epidermis", fr: "Épiderme" },
    teaser: { en: "The outer layer of skin, where new cells rise to the surface.", fr: "La couche externe de la peau, où les nouvelles cellules montent vers la surface." },
    compare: {
      en: "This block is about three times the width of a hair.",
      fr: "Ce bloc fait environ trois fois l’épaisseur d’un cheveu.",
    },
    hook: {
      en: "Cells are born at the bottom, divide, then rise towards the surface as they flatten. At the top they are dead and form a protective layer. Just below, tiny vessels bring oxygen.",
      fr: "Les cellules naissent tout en bas, se divisent, puis montent vers la surface en s’aplatissant. En haut, elles sont mortes et forment une couche protectrice. Juste en dessous, de minuscules vaisseaux apportent l’oxygène.",
    },
    facts: [
      {
        en: "A cell takes about a month to travel from the bottom of the epidermis to the surface.",
        fr: "Une cellule met environ un mois pour voyager du bas de l’épiderme jusqu’à la surface.",
      },
      {
        en: "The epidermis has no blood vessels: it is fed by those of the dermis just beneath it.",
        fr: "L’épiderme n’a pas de vaisseaux sanguins : il est nourri par ceux du derme, juste en dessous.",
      },
    ],
    hotspots: [
      {
        id: "basal",
        at: [3.0, -3.1, 2.6],
        label: { en: "Where cells are born", fr: "Là où naissent les cellules" },
        text: {
          en: "In the bottom layer, cells keep dividing, and each new cell is pushed upwards.",
          fr: "Dans la couche du bas, les cellules se divisent sans cesse, et chaque nouvelle cellule est poussée vers le haut.",
        },
      },
      {
        id: "granular",
        at: [-3.0, 2.5, 2.6],
        label: { en: "Waterproofing", fr: "Imperméable" },
        text: {
          en: "Here cells fill with grains of keratin and fats that make the skin waterproof, then they die.",
          fr: "Ici, les cellules se remplissent de grains de kératine et de graisses qui rendent la peau imperméable, puis elles meurent.",
        },
      },
      {
        id: "corneum",
        at: [2.2, 3.7, 2.6],
        label: { en: "Dead cells", fr: "Cellules mortes" },
        text: {
          en: "Flat, dead cells full of keratin, stacked like roof tiles, flake off one by one.",
          fr: "Des cellules mortes et plates, pleines de kératine, empilées comme des tuiles, se détachent une à une.",
        },
      },
    ],
    source: { label: "OpenStax Anatomy & Physiology 2e", url: "https://openstax.org/books/anatomy-and-physiology-2e/pages/5-1-layers-of-the-skin" },
  },
  {
    id: "cell",
    parent: "epidermis",
    journey: "body",
    scene: "cell",
    size: 1.2e-5,
    primary: true,
    frame: 1.45,
    view: { pitch: 14, yaw: -22 },
    anchor: { at: [-2.6, -3.73, 2.2] },
    theme: { top: "#2d0f45", bottom: "#611f72", accent: "#ff9de2", dust: "#e3a6ff" },
    title: { en: "A skin cell", fr: "Une cellule de peau" },
    short: { en: "Cell", fr: "Cellule" },
    teaser: { en: "One skin cell: a tiny factory with its nucleus and machines.", fr: "Une cellule de peau : une petite usine, avec son noyau et ses machines." },
    compare: {
      en: "About six times narrower than a hair.",
      fr: "Environ six fois plus petite que l’épaisseur d’un cheveu.",
    },
    hook: {
      en: "This keratinocyte, from the base of your epidermis, is a tiny factory: a membrane, a nucleus that keeps the blueprints, and hundreds of busy machines.",
      fr: "Ce kératinocyte, à la base de ton épiderme, est une petite usine : une membrane, un noyau qui garde les plans, et des centaines de machines qui s’activent.",
    },
    facts: [
      {
        en: "Your body makes about 3.8 million new cells every second.",
        fr: "Ton corps fabrique environ 3,8 millions de nouvelles cellules chaque seconde.",
      },
      {
        en: "Mitochondria, which power the cell, descend from ancient bacteria.",
        fr: "Les mitochondries, qui fournissent l’énergie de la cellule, descendent d’anciennes bactéries.",
      },
    ],
    hotspots: [
      {
        id: "melanin",
        at: [-1.67, 1.87, 1.51],
        label: { en: "Melanin cap", fr: "Parasol de mélanine" },
        text: {
          en: "Pigment grains, received from neighbouring melanocytes, gather above the nucleus like a parasol that shields its DNA from UV light.",
          fr: "Des grains de pigment, reçus des mélanocytes voisins, se rassemblent au-dessus du noyau comme un parasol qui protège son ADN des UV.",
        },
      },
      {
        id: "mitochondrion",
        at: [-3.36, -0.19, -0.9],
        label: { en: "Mitochondrion", fr: "Mitochondrie" },
        text: {
          en: "A power station: it burns sugar with oxygen to make ATP, the cell’s fuel. Its folded inner membrane gives it more room to work.",
          fr: "Une centrale énergétique : elle brûle du sucre avec de l’oxygène pour fabriquer l’ATP, le carburant de la cellule. Sa membrane intérieure plissée lui donne plus de place pour travailler.",
        },
      },
      {
        id: "reticulum",
        at: [-2.38, -2.83, 0.7],
        label: { en: "Endoplasmic reticulum", fr: "Réticulum endoplasmique" },
        text: {
          en: "Folded membranes dotted with ribosomes, the machines that assemble proteins.",
          fr: "Des membranes plissées, parsemées de ribosomes : les machines qui assemblent les protéines.",
        },
      },
      {
        id: "desmosome",
        at: [3.74, 1.05, 1.75],
        label: { en: "Desmosome", fr: "Desmosome" },
        text: {
          en: "A rivet between neighbouring cells. Tough keratin filaments (in green) are anchored to it, so your skin resists stretching and rubbing.",
          fr: "Un rivet entre cellules voisines. De solides filaments de kératine (en vert) s’y accrochent : ta peau résiste ainsi aux tiraillements et aux frottements.",
        },
      },
    ],
    source: { label: "OpenStax Biology 2e", url: "https://openstax.org/books/biology-2e/pages/4-3-eukaryotic-cells" },
  },
  {
    id: "nucleus",
    parent: "cell",
    journey: "body",
    scene: "cellNucleus",
    size: 6e-6,
    view: { pitch: 16, yaw: -20 },
    anchor: { at: [0, -0.55, 0.75] },
    theme: { top: "#1f0c3d", bottom: "#4c1b6e", accent: "#c39bff", dust: "#b596ff" },
    title: { en: "The nucleus", fr: "Le noyau" },
    short: { en: "Nucleus", fr: "Noyau" },
    teaser: { en: "The cell’s control room, where your DNA is kept.", fr: "Le centre de commande de la cellule, qui garde ton ADN." },
    compare: {
      en: "Roughly the size of a red blood cell.",
      fr: "À peu près la taille d’un globule rouge.",
    },
    hook: {
      en: "The nucleus protects your DNA: nearly two metres of molecule, folded into a ball a few thousandths of a millimetre wide.",
      fr: "Le noyau protège ton ADN : près de deux mètres de molécule, repliés dans une boule de quelques millièmes de millimètre.",
    },
    facts: [
      {
        en: "Thousands of pores pierce its envelope: they are the doors through which messages travel.",
        fr: "Des milliers de pores percent son enveloppe : ce sont les portes par lesquelles circulent les messages.",
      },
      {
        en: "Unrolled, all the DNA in your body would stretch dozens of times from Earth to the Sun and back.",
        fr: "Déroulé, tout l’ADN de ton corps ferait des dizaines d’allers-retours entre la Terre et le Soleil.",
      },
    ],
    hotspots: [
      {
        id: "pore",
        at: [-3.2, 0.47, 3.8],
        label: { en: "Nuclear pore", fr: "Pore nucléaire" },
        text: {
          en: "A gate made of hundreds of proteins. Messages copied from genes leave through it; the proteins the nucleus needs come in.",
          fr: "Une porte faite de centaines de protéines. Les messages copiés sur les gènes sortent par là ; les protéines dont le noyau a besoin y entrent.",
        },
      },
      {
        id: "nucleolus",
        at: [-0.9, 1.7, 1.0],
        label: { en: "Nucleolus", fr: "Nucléole" },
        text: {
          en: "The busiest spot in the nucleus: here the cell assembles its ribosomes, the machines that build proteins.",
          fr: "L’endroit le plus actif du noyau : la cellule y assemble ses ribosomes, les machines qui fabriquent les protéines.",
        },
      },
      {
        id: "territory",
        at: [0.3, -1.8, -1.0],
        label: { en: "Chromosome territory", fr: "Territoire chromosomique" },
        text: {
          en: "Between divisions, a chromosome is not an X but a loose tangle that keeps to its own region of the nucleus.",
          fr: "Entre deux divisions, un chromosome n’est pas un X mais une pelote lâche qui reste dans son coin du noyau.",
        },
      },
      {
        id: "envelope",
        at: [4.97, -1.0, 0.52],
        label: { en: "Double envelope", fr: "Double enveloppe" },
        text: {
          en: "Two membranes wrap the nucleus. The outer one is continuous with the endoplasmic reticulum.",
          fr: "Deux membranes enveloppent le noyau. L’externe se prolonge dans le réticulum endoplasmique.",
        },
      },
    ],
    source: { label: "OpenStax Biology 2e", url: "https://openstax.org/books/biology-2e/pages/4-3-eukaryotic-cells" },
  },
  {
    id: "chromatin",
    parent: "nucleus",
    journey: "body",
    scene: "chromatin",
    size: 5e-7,
    view: { pitch: 8, yaw: -8 },
    anchor: { at: [2.3, -0.9, 0.12] },
    theme: { top: "#170a35", bottom: "#3c1766", accent: "#b18cff", dust: "#a88cff" },
    title: { en: "Chromatin", fr: "La chromatine" },
    short: { en: "Chromatin", fr: "Chromatine" },
    teaser: { en: "DNA wound on protein spools, like a string of beads.", fr: "De l’ADN enroulé sur des bobines de protéines, comme un collier de perles." },
    compare: {
      en: "These fibres are thousands of times thinner than a hair.",
      fr: "Ces fibres sont des milliers de fois plus fines qu’un cheveu.",
    },
    hook: {
      en: "Up close, a chromosome territory reveals its DNA: it winds around small protein spools, like a string of beads, packed tight in some places and loose in others.",
      fr: "De près, un territoire chromosomique révèle son ADN : il s’enroule autour de petites bobines de protéines, comme un collier de perles, très serré par endroits, lâche ailleurs.",
    },
    facts: [
      {
        en: "How tightly DNA is packed partly decides which genes are read: a tightly packed region usually stays silent.",
        fr: "Le repliement de l’ADN décide en partie quels gènes sont lus : une zone bien serrée reste le plus souvent silencieuse.",
      },
      {
        en: "Only when it is about to divide does a cell pack its DNA into X-shaped chromosomes.",
        fr: "Ce n’est qu’au moment de se diviser que la cellule compacte son ADN en chromosomes en forme de X.",
      },
    ],
    hotspots: [
      {
        id: "beads",
        at: [1.9, -0.6, 0.9],
        label: { en: "Beads on a string", fr: "Collier de perles" },
        text: {
          en: "Each bead is a nucleosome: DNA wrapped around a spool of histone proteins. The thread between beads is bare DNA.",
          fr: "Chaque perle est un nucléosome : de l’ADN enroulé autour d’une bobine de protéines, les histones. Le fil entre les perles est de l’ADN nu.",
        },
      },
      {
        id: "compact",
        at: [-3.4, 1.4, 0.3],
        label: { en: "Tightly packed", fr: "Zone compacte" },
        text: {
          en: "Here the fibre is folded tightly. Genes in such regions are usually switched off.",
          fr: "Ici, la fibre est très serrée. Les gènes de ces zones sont le plus souvent éteints.",
        },
      },
      {
        id: "cohesin",
        at: [3.1, 0.75, 0.4],
        label: { en: "Cohesin ring", fr: "Anneau de cohésine" },
        text: {
          en: "A ring of proteins holds the base of a DNA loop and brings distant stretches of DNA close together.",
          fr: "Un anneau de protéines tient la base d’une boucle d’ADN et rapproche des passages éloignés.",
        },
      },
      {
        id: "transcription",
        at: [-1.2, -3.3, 1.1],
        label: { en: "Gene being read", fr: "Gène en lecture" },
        text: {
          en: "An RNA polymerase slides along open DNA and copies a gene into an RNA message (in orange).",
          fr: "Une ARN polymérase glisse le long de l’ADN ouvert et recopie un gène en un message d’ARN (en orange).",
        },
      },
    ],
    source: { label: "Nature Education — Scitable", url: "https://www.nature.com/scitable/topicpage/dna-packaging-nucleosomes-and-chromatin-310/" },
  },
  {
    id: "nucleosome",
    parent: "chromatin",
    journey: "body",
    scene: "nucleosome",
    size: 1.1e-8,
    view: { pitch: 14, yaw: -24 },
    anchor: { at: [0.5, -0.3, 1.3] },
    theme: { top: "#120a30", bottom: "#2f1662", accent: "#7fd8ff", dust: "#8fb8ff" },
    title: { en: "A nucleosome", fr: "Un nucléosome" },
    short: { en: "Nucleosome", fr: "Nucléosome" },
    teaser: { en: "A single spool: eight proteins with DNA wrapped around them.", fr: "Une seule bobine : huit protéines autour desquelles s’enroule l’ADN." },
    compare: {
      en: "About a thousand times smaller than the cell that holds it.",
      fr: "Environ 1 000 fois plus petit que la cellule qui le contient.",
    },
    hook: {
      en: "A spool of eight proteins, the histones, with DNA wrapped almost twice around it. Each of your cells holds about 30 million of them.",
      fr: "Une bobine de huit protéines, les histones, autour de laquelle l’ADN fait presque deux tours. Chacune de tes cellules en contient environ 30 millions.",
    },
    facts: [
      {
        en: "Histones are among the most conserved proteins in evolution: those of a pea and a cow are almost identical.",
        fr: "Les histones font partie des protéines les plus stables de l’évolution : celles d’un pois et d’une vache sont presque identiques.",
      },
      {
        en: "Each spool wraps about 147 base pairs of DNA.",
        fr: "Chaque bobine enroule environ 147 paires de bases d’ADN.",
      },
    ],
    hotspots: [
      {
        id: "histones",
        at: [0.3, 1.8, 2.4],
        label: { en: "Histones", fr: "Histones" },
        text: {
          en: "Eight proteins, two each of four kinds (H2A, H2B, H3, H4), form the spool. Their positive charges hold on to the negatively charged DNA.",
          fr: "Huit protéines, deux de chacune des quatre sortes (H2A, H2B, H3, H4), forment la bobine. Leurs charges positives retiennent l’ADN, chargé négativement.",
        },
      },
      {
        id: "wrap",
        at: [4.3, 0, 2.2],
        label: { en: "147 base pairs", fr: "147 paires de bases" },
        text: {
          en: "The DNA makes about 1.65 turns around the spool: 147 base pairs, some 50 nanometres of DNA.",
          fr: "L’ADN fait environ 1,65 tour de bobine : 147 paires de bases, soit une cinquantaine de nanomètres d’ADN.",
        },
      },
      {
        id: "tail",
        at: [-4.1, 0.1, 4.6],
        label: { en: "Histone tail", fr: "Queue d’histone" },
        text: {
          en: "Flexible tails stick out of the spool. Chemical tags added to them help decide whether nearby genes are read.",
          fr: "Des queues souples dépassent de la bobine. Les étiquettes chimiques qu’on y accroche aident à décider si les gènes voisins sont lus.",
        },
      },
      {
        id: "linker",
        at: [3.66, -5.53, 2.38],
        label: { en: "Linker DNA", fr: "ADN de liaison" },
        text: {
          en: "A short stretch of bare DNA leads on to the next spool, and so on, millions of times.",
          fr: "Un petit tronçon d’ADN nu mène à la bobine suivante, et ainsi de suite, des millions de fois.",
        },
      },
    ],
    source: { label: "Luger et al., Nature (1997)", url: "https://doi.org/10.1038/38444" },
  },
  {
    id: "dna",
    parent: "nucleosome",
    journey: "body",
    scene: "dna",
    size: 3.4e-9,
    frame: 1.3,
    view: { pitch: 8, yaw: -24 },
    anchor: { at: [0, 4.3, 1.144], rotate: [0, -4.87, 0] },
    theme: { top: "#0d0a2b", bottom: "#261b60", accent: "#7ff0c8", dust: "#7fd8ff" },
    title: { en: "The DNA double helix", fr: "La double hélice d’ADN" },
    short: { en: "DNA", fr: "ADN" },
    teaser: { en: "The double helix whose letters spell out the instructions for your body.", fr: "La double hélice dont les lettres écrivent les instructions de ton corps." },
    compare: {
      en: "It is 2 nanometres wide: 35,000 times thinner than a hair.",
      fr: "Elle mesure 2 nanomètres de large : 35 000 fois plus fine qu’un cheveu.",
    },
    hook: {
      en: "Two twisted strands joined by pairs of letters: A with T, C with G. The order of these letters holds the instructions for building your body.",
      fr: "Deux brins enroulés, reliés par des paires de lettres : A avec T, C avec G. L’ordre de ces lettres contient les instructions pour construire ton corps.",
    },
    facts: [
      {
        en: "Your genome has about 3 billion letter pairs, in two copies.",
        fr: "Ton génome compte environ 3 milliards de paires de lettres, en deux exemplaires.",
      },
      {
        en: "You share about 99.9% of your DNA with any other human.",
        fr: "Tu partages environ 99,9 % de ton ADN avec n’importe quel autre humain.",
      },
    ],
    hotspots: [
      {
        id: "backbone",
        at: [2.99, -1.62, 2.7],
        label: { en: "Sugar–phosphate backbone", fr: "Squelette sucre-phosphate" },
        text: {
          en: "Each strand is a chain of sugars linked by phosphates (orange phosphorus, red oxygen). The letters hang from it.",
          fr: "Chaque brin est une chaîne de sucres reliés par des phosphates (phosphore orange, oxygène rouge). Les lettres y sont accrochées.",
        },
      },
      {
        id: "pairs",
        at: [-2.85, -0.84, 0.6],
        label: { en: "Base pairs", fr: "Paires de bases" },
        text: {
          en: "A always pairs with T (green–pink) and G with C (yellow–blue), held by two or three weak hydrogen bonds (white dots).",
          fr: "A s’associe toujours à T (vert–rose) et G à C (jaune–bleu), grâce à deux ou trois liaisons hydrogène fragiles (points blancs).",
        },
      },
      {
        id: "histone",
        at: [0.3, -5.2, -0.6],
        label: { en: "On a nucleosome", fr: "Sur un nucléosome" },
        text: {
          en: "This stretch is wound around histones, which is why it curves: the spool’s positive charges hold the DNA.",
          fr: "Ce tronçon est enroulé autour des histones, d’où sa courbure : les charges positives de la bobine retiennent l’ADN.",
        },
      },
    ],
    source: { label: "NHGRI", url: "https://www.genome.gov/about-genomics/fact-sheets/Deoxyribonucleic-Acid-Fact-Sheet" },
  },
  ...matterChain("carbon", {
    parent: "dna",
    journey: "body",
    // C5′ of a deoxyribose, facing the viewer; bonded to O5′, C4′ and two hydrogens.
    anchor: { at: [-0.354, -0.743, 2.421] },
    neighbors: [
      { symbol: "O", at: [-1.55, -3.49, -1.55] },
      { symbol: "C", at: [-2.52, 3.2, -1.45] },
      { symbol: "H", at: [3.01, 0.42, -1.01] },
      { symbol: "H", at: [-0.05, -0.09, 3.2] },
    ],
  }),

  // The blood branch, from the capillaries under the epidermis.
  {
    id: "capillary",
    parent: "epidermis",
    journey: "body",
    scene: "capillary",
    size: 5e-5,
    frame: 0.7,
    view: { pitch: 12, yaw: -30 },
    anchor: { at: [0.9, -3.3, 2.24] },
    theme: { top: "#3d0a1f", bottom: "#7c1836", accent: "#ff5a6e", dust: "#ff8a9a" },
    title: { en: "A capillary", fr: "Un capillaire" },
    short: { en: "Capillary", fr: "Capillaire" },
    teaser: { en: "The thinnest blood vessel, where oxygen leaves the blood.", fr: "Le plus fin des vaisseaux sanguins, là où l’oxygène quitte le sang." },
    compare: {
      en: "This vessel is thinner than a hair: red blood cells have to pass through in single file.",
      fr: "Ce vaisseau est plus fin qu’un cheveu : les globules rouges doivent y passer en file indienne.",
    },
    hook: {
      en: "The smallest blood vessels. Their wall is so thin that oxygen passes straight through to feed the cells around them.",
      fr: "Les plus petits vaisseaux sanguins. Leur paroi est si fine que l’oxygène la traverse pour aller nourrir les cellules autour.",
    },
    facts: [
      {
        en: "A red blood cell makes a complete trip around your body in about a minute.",
        fr: "Un globule rouge fait le tour complet de ton corps en une minute environ.",
      },
      {
        en: "Red blood cells are wider than some capillaries: they fold to squeeze through.",
        fr: "Les globules rouges sont plus larges que certains capillaires : ils se plient pour passer.",
      },
    ],
    hotspots: [
      {
        id: "wall",
        at: [-2.8, 0.6, 0.72],
        label: { en: "A wall one cell thick", fr: "Une paroi d’une seule cellule" },
        text: {
          en: "The wall is made of flat cells less than a micrometre thick, so oxygen crosses it easily.",
          fr: "La paroi est faite de cellules plates, épaisses de moins d’un micromètre : l’oxygène la traverse facilement.",
        },
      },
      {
        id: "single-file",
        at: [2.15, 0.55, 0.35],
        label: { en: "Single file", fr: "En file indienne" },
        text: {
          en: "In the narrowest vessels, red blood cells bend into parachute shapes and move one behind the other.",
          fr: "Dans les vaisseaux les plus étroits, les globules rouges se plient en parachute et avancent l’un derrière l’autre.",
        },
      },
      {
        id: "oxygen",
        at: [1.4, -1.7, 0.9],
        label: { en: "Oxygen", fr: "Oxygène" },
        text: {
          en: "Oxygen (the blue dots) leaves the red blood cells, crosses the wall and reaches the nearby cells.",
          fr: "L’oxygène (les points bleus) quitte les globules rouges, traverse la paroi et rejoint les cellules voisines.",
        },
      },
    ],
    source: { label: "OpenStax Anatomy & Physiology 2e", url: "https://openstax.org/books/anatomy-and-physiology-2e/pages/20-1-structure-and-function-of-blood-vessels" },
  },
  {
    id: "red-cell",
    parent: "capillary",
    journey: "body",
    scene: "redCell",
    size: 7.8e-6,
    view: { pitch: 50, yaw: -12 },
    anchor: { at: [0, 0, 0], rotate: [44, 0, 0] },
    theme: { top: "#3a0a26", bottom: "#701742", accent: "#ff7a85", dust: "#ff9fb0" },
    title: { en: "A red blood cell", fr: "Un globule rouge" },
    short: { en: "Red blood cell", fr: "Globule rouge" },
    teaser: { en: "A red blood cell: a soft disc that carries oxygen.", fr: "Un globule rouge : un disque souple qui transporte l’oxygène." },
    compare: {
      en: "About ten times narrower than a hair.",
      fr: "Environ dix fois plus petit que l’épaisseur d’un cheveu.",
    },
    hook: {
      en: "A soft disc, dimpled in the middle and filled with hemoglobin. It has no nucleus and no DNA: all the room is kept for carrying oxygen.",
      fr: "Un disque souple, creusé au centre, rempli d’hémoglobine. Il n’a ni noyau ni ADN : toute la place sert à transporter l’oxygène.",
    },
    facts: [
      {
        en: "You make about 2 million of them every second.",
        fr: "Tu en fabriques environ 2 millions chaque seconde.",
      },
      {
        en: "You have about 25 trillion of them: most of your cells are red blood cells.",
        fr: "Tu en as environ 25 000 milliards : la plupart de tes cellules sont des globules rouges.",
      },
    ],
    hotspots: [
      {
        id: "shape",
        at: [0.6, 0.92, -1.2],
        label: { en: "Dimpled disc", fr: "Disque creusé" },
        text: {
          en: "Thin in the middle and thick at the rim: this shape gives a large surface for oxygen and lets the cell bend.",
          fr: "Mince au centre, épais au bord : cette forme offre une grande surface à l’oxygène et permet à la cellule de se plier.",
        },
      },
      {
        id: "inside",
        at: [-1.43, 0.0, 2.05],
        label: { en: "Full of hemoglobin", fr: "Plein d’hémoglobine" },
        text: {
          en: "No nucleus inside: the cell is packed with hemoglobin, drawn here as beads much bigger than the real molecules.",
          fr: "Pas de noyau à l’intérieur : le globule est bourré d’hémoglobine, dessinée ici en perles bien plus grosses que les vraies molécules.",
        },
      },
      {
        id: "membrane",
        at: [4.4, 0.9, -1.8],
        label: { en: "Supple membrane", fr: "Membrane souple" },
        text: {
          en: "A soft membrane lined with a protein net lets the cell squeeze through capillaries and spring back.",
          fr: "Une membrane souple, doublée d’un filet de protéines, lui permet de se faufiler dans les capillaires puis de reprendre sa forme.",
        },
      },
    ],
    source: { label: "Sender, Fuchs & Milo, PLOS Biology (2016)", url: "https://doi.org/10.1371/journal.pbio.1002533" },
  },
  {
    id: "rbc-interior",
    parent: "red-cell",
    journey: "body",
    scene: "rbcInterior",
    size: 2e-7,
    frame: 0.8,
    view: { pitch: -14, yaw: -10 },
    anchor: { at: [-2.065, 1.537, 2.95], rotate: [0, 55, 0] },
    theme: { top: "#2e0a2a", bottom: "#5a1448", accent: "#ff8fb0", dust: "#ff9fc0" },
    title: { en: "Inside a red blood cell", fr: "Dans un globule rouge" },
    short: { en: "Inside", fr: "Intérieur" },
    teaser: { en: "Inside a red blood cell: a crowd of hemoglobin molecules.", fr: "L’intérieur d’un globule rouge : une foule de molécules d’hémoglobine." },
    compare: {
      en: "This small region is about 40 times narrower than the whole cell.",
      fr: "Cette petite région est environ 40 fois plus étroite que le globule entier.",
    },
    hook: {
      en: "It is a crowd in here: about 270 million hemoglobin molecules, packed against one another.",
      fr: "Ici, c’est la foule : environ 270 millions de molécules d’hémoglobine, serrées les unes contre les autres.",
    },
    facts: [
      {
        en: "Hemoglobin makes up about a third of a red blood cell’s mass.",
        fr: "L’hémoglobine représente environ un tiers de la masse d’un globule rouge.",
      },
      {
        en: "Thanks to it, your blood carries about 70 times more oxygen than water alone could dissolve.",
        fr: "Grâce à elle, ton sang transporte environ 70 fois plus d’oxygène que l’eau seule ne pourrait en dissoudre.",
      },
    ],
    hotspots: [
      {
        id: "membrane",
        at: [-3.2, 3.6, 0.7],
        label: { en: "Membrane", fr: "Membrane" },
        text: {
          en: "A double layer of fat molecules, about 5 nanometres thick, wraps the whole cell.",
          fr: "Une double couche de molécules de graisse, épaisse d’environ 5 nanomètres, enveloppe toute la cellule.",
        },
      },
      {
        id: "spectrin",
        at: [0.0, 3.2, 0.4],
        label: { en: "Spectrin net", fr: "Filet de spectrine" },
        text: {
          en: "Under the membrane, a net of springy spectrin proteins keeps the cell supple and in shape.",
          fr: "Sous la membrane, un filet de protéines élastiques, la spectrine, garde la cellule souple et en forme.",
        },
      },
      {
        id: "sugars",
        at: [2.4, 3.86, 0.5],
        label: { en: "Sugar chains", fr: "Chaînes de sucres" },
        text: {
          en: "Short sugar chains bristle on the outside of the cell; some of them decide your blood group.",
          fr: "De courtes chaînes de sucres hérissent l’extérieur de la cellule ; certaines déterminent ton groupe sanguin.",
        },
      },
    ],
    source: { label: "RCSB PDB-101", url: "https://pdb101.rcsb.org/motm/41" },
  },
  {
    id: "hemoglobin",
    parent: "rbc-interior",
    journey: "body",
    scene: "hemoglobin",
    size: 6.4e-9,
    view: { pitch: 10, yaw: -14 },
    anchor: { at: [0.3, -0.8, 0.5] },
    theme: { top: "#230a2e", bottom: "#4c1454", accent: "#ff8fb0", dust: "#ff9fc8" },
    title: { en: "Hemoglobin", fr: "L’hémoglobine" },
    short: { en: "Hemoglobin", fr: "Hémoglobine" },
    teaser: { en: "The protein that picks up oxygen in your lungs and releases it in your body.", fr: "La protéine qui prend l’oxygène dans tes poumons et le libère dans ton corps." },
    compare: {
      en: "About a thousand times smaller than a red blood cell.",
      fr: "Environ 1 000 fois plus petite qu’un globule rouge.",
    },
    hook: {
      en: "A protein made of four folded chains, two alpha (pink) and two beta (orange). Each one holds a small ring, the heme, that can catch one oxygen molecule.",
      fr: "Une protéine faite de quatre chaînes repliées, deux alpha (roses) et deux bêta (orange). Chacune tient un petit anneau, l’hème, qui peut capturer une molécule d’oxygène.",
    },
    facts: [
      {
        en: "Each hemoglobin carries up to four oxygen molecules.",
        fr: "Chaque hémoglobine transporte jusqu’à quatre molécules d’oxygène.",
      },
      {
        en: "When one oxygen binds, the protein changes shape slightly, making it easier for the next ones to bind.",
        fr: "Quand une molécule d’oxygène s’accroche, la protéine change légèrement de forme et les suivantes s’accrochent plus facilement.",
      },
    ],
    hotspots: [
      {
        id: "alpha",
        at: [2.15, -2.3, 3.2],
        label: { en: "Alpha chain", fr: "Chaîne alpha" },
        text: {
          en: "141 amino acids folded into a bundle of helices, around a pocket for its heme.",
          fr: "141 acides aminés repliés en un faisceau d’hélices, autour d’une poche pour son hème.",
        },
      },
      {
        id: "beta",
        at: [2.8, 2.6, 1.3],
        label: { en: "Beta chain", fr: "Chaîne bêta" },
        text: {
          en: "146 amino acids, a close cousin of the alpha chain. Two of each make adult hemoglobin.",
          fr: "146 acides aminés, une proche cousine de la chaîne alpha. Deux de chaque forment l’hémoglobine de l’adulte.",
        },
      },
      {
        id: "oxygen",
        at: [3.89, 3.02, 0.6],
        label: { en: "Oxygen", fr: "Oxygène" },
        text: {
          en: "An O₂ molecule settles on the iron of a heme. Your lungs load it; your muscles unload it.",
          fr: "Une molécule d’O₂ se pose sur le fer d’un hème. Tes poumons la chargent, tes muscles la déchargent.",
        },
      },
    ],
    source: { label: "RCSB PDB-101", url: "https://pdb101.rcsb.org/motm/41" },
  },
  {
    id: "heme",
    parent: "hemoglobin",
    journey: "body",
    scene: "heme",
    size: 1.3e-9,
    view: { pitch: 28, yaw: -16 },
    // In the α1 pocket; rotated so that the heme plane faces the viewer (its O₂ side outwards).
    anchor: { at: [-1.633, 1.666, 3.028], rotate: [79.7, 0, -13.79] },
    theme: { top: "#150a2a", bottom: "#35155e", accent: "#ffb35c", dust: "#ffc58a" },
    title: { en: "Heme", fr: "L’hème" },
    short: { en: "Heme", fr: "Hème" },
    teaser: { en: "The small ring, with an iron atom, where oxygen docks.", fr: "Le petit anneau, avec un atome de fer, où l’oxygène vient s’accrocher." },
    compare: {
      en: "About 50,000 times smaller than the width of a hair.",
      fr: "Environ 50 000 fois plus petit que l’épaisseur d’un cheveu.",
    },
    hook: {
      en: "A ring of carbon and nitrogen atoms with one iron atom in the middle. It is what makes blood red.",
      fr: "Un anneau d’atomes de carbone et d’azote, avec un atome de fer au centre. C’est lui qui donne sa couleur rouge au sang.",
    },
    facts: [
      {
        en: "Blood is bright red when heme carries oxygen and darker red once it has delivered it, but never blue.",
        fr: "Le sang est rouge vif quand l’hème porte de l’oxygène, et rouge plus sombre quand il l’a livré, mais jamais bleu.",
      },
      {
        en: "Plant chlorophyll has a very similar ring, with magnesium instead of iron.",
        fr: "La chlorophylle des plantes possède un anneau très semblable, avec du magnésium à la place du fer.",
      },
    ],
    hotspots: [
      {
        id: "oxygen",
        at: [1.7, 2.1, 0.7],
        label: { en: "Oxygen docking", fr: "Arrimage de l’oxygène" },
        text: {
          en: "O₂ binds end-on to the iron. As it does, the iron slips into the plane of the ring and nudges the whole protein.",
          fr: "L’O₂ s’accroche au fer par une extrémité. Le fer glisse alors dans le plan de l’anneau et entraîne toute la protéine.",
        },
      },
      {
        id: "porphyrin",
        at: [0, 0.2, 2.9],
        label: { en: "Porphyrin ring", fr: "Anneau de porphyrine" },
        text: {
          en: "Four small rings joined into one big flat ring. Its alternating double bonds absorb blue and green light, so heme looks red.",
          fr: "Quatre petits cycles réunis en un grand anneau plat. Ses doubles liaisons alternées absorbent la lumière bleue et verte : l’hème paraît donc rouge.",
        },
      },
      {
        id: "histidine",
        at: [0.4, -3.2, 0.4],
        label: { en: "Histidine anchor", fr: "Ancre d’histidine" },
        text: {
          en: "Below, an amino acid of the protein, a histidine, holds the iron from the other side.",
          fr: "En dessous, un acide aminé de la protéine, une histidine, tient le fer de l’autre côté.",
        },
      },
    ],
    source: { label: "RCSB PDB-101", url: "https://pdb101.rcsb.org/motm/41" },
  },
  ...matterChain("iron", {
    parent: "heme",
    journey: "body",
    anchor: { at: [0, 0, 0] },
    // The four porphyrin nitrogens and the proximal histidine below.
    neighbors: [
      { symbol: "N", at: [3.54, 0, 3.54] },
      { symbol: "N", at: [-3.54, 0, 3.54] },
      { symbol: "N", at: [-3.54, 0, -3.54] },
      { symbol: "N", at: [3.54, 0, -3.54] },
      { symbol: "N", at: [0, -5.25, 0] },
    ],
  }),
];
