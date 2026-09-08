/** Original bilingual educational content; scientific references are attached to every node. */
export type Bilingual = { en: string; fr: string };
export type WorldCategory =
  | "world"
  | "human"
  | "tree"
  | "water"
  | "cloud"
  | "rock"
  | "mushroom";
export type WorldRelation = "contains" | "madeOf" | "sample";
export interface WorldSource {
  title: string;
  url: string;
}
export interface WorldNode {
  id: string;
  parent?: string;
  name: Bilingual;
  description: Bilingual;
  category: WorldCategory;
  model: string;
  color: string;
  sizeMeters: number | null;
  sizeNote: Bilingual;
  relation: WorldRelation;
  children: string[];
  defaultChild?: string;
  /** Available at a material hit; not a positioned constituent or default locator. */
  spatialOnly?: boolean;
  facts: Bilingual[];
  question: Bilingual;
  answer: Bilingual;
  sources: WorldSource[];
  molecule?: "water" | "methane" | "co2";
  element?: "H" | "C" | "N" | "O" | "Mg" | "Si" | "Fe" | "Ca" | "P";
  atomic?: { atomicNumber: number; massNumber: number; charge: number };
  quarkFlavor?: "up" | "down";
}
export interface WorldJourney {
  id: string;
  title: Bilingual;
  question: Bilingual;
  path: string[];
  answer: Bilingual;
}
export interface WorldQuiz {
  id: string;
  node: string;
  question: Bilingual;
  options: Bilingual[];
  correct: number;
  explanation: Bilingual;
}
export interface WorldMechanism {
  id: string;
  node: string;
  title: Bilingual;
  steps: { title: Bilingual; description: Bilingual }[];
}

type Pair = readonly [string, string];
const b = (pair: Pair): Bilingual => ({ en: pair[0], fr: pair[1] });
const src = (title: string, url: string): WorldSource => ({ title, url });
const AP = "https://openstax.org/books/anatomy-and-physiology-2e/pages/";
const BIO = "https://openstax.org/books/biology-2e/pages/";
const S = {
  body: src(
    "OpenStax · Structural organization",
    AP + "1-2-structural-organization-of-the-human-body",
  ),
  heart: src("OpenStax · Heart anatomy", AP + "19-1-heart-anatomy"),
  vessels: src(
    "OpenStax · Blood vessels",
    AP + "20-1-structure-and-function-of-blood-vessels",
  ),
  blood: src("OpenStax · Blood", AP + "18-1-an-overview-of-blood"),
  red: src("OpenStax · Erythrocytes", AP + "18-3-erythrocytes"),
  white: src(
    "OpenStax · Leukocytes and platelets",
    AP + "18-4-leukocytes-and-platelets",
  ),
  hemoglobin: src(
    "RCSB PDB-101 · Hemoglobin",
    "https://pdb101.rcsb.org/motm/41",
  ),
  pdb: src(
    "RCSB PDB · Human hemoglobin 4HHB",
    "https://www.rcsb.org/structure/4HHB",
  ),
  cells: src("OpenStax · Eukaryotic cells", BIO + "4-3-eukaryotic-cells"),
  membrane: src(
    "NCBI Bookshelf · Membrane structure",
    "https://www.ncbi.nlm.nih.gov/books/NBK21055/",
  ),
  lipids: src(
    "NCBI Bookshelf · The lipid bilayer",
    "https://www.ncbi.nlm.nih.gov/books/NBK26871/",
  ),
  nucleus: src(
    "OpenStax · The nucleus and DNA replication",
    AP + "3-3-the-nucleus-and-dna-replication",
  ),
  chromatin: src(
    "NCBI Bookshelf · DNA packaging",
    "https://www.ncbi.nlm.nih.gov/books/NBK534207/",
  ),
  nucleosome: src(
    "NCBI Bookshelf · Nucleosome structural studies",
    "https://pmc.ncbi.nlm.nih.gov/articles/PMC3052702/",
  ),
  dna: src(
    "NIH NHGRI · DNA fact sheet",
    "https://www.genome.gov/about-genomics/fact-sheets/Deoxyribonucleic-Acid-Fact-Sheet",
  ),
  nucleotide: src("OpenStax · Nucleic acids", BIO + "3-5-nucleic-acids"),
  mitochondria: src(
    "NCBI Bookshelf · The mitochondrion",
    "https://www.ncbi.nlm.nih.gov/books/NBK26894/",
  ),
  ribosome: src(
    "NCBI Bookshelf · Synthesis of the proteome",
    "https://www.ncbi.nlm.nih.gov/books/NBK21111/",
  ),
  lungs: src(
    "OpenStax · Respiratory structures",
    AP + "22-1-organs-and-structures-of-the-respiratory-system",
  ),
  gas: src("OpenStax · Gas exchange", AP + "22-4-gas-exchange"),
  muscle: src("OpenStax · Skeletal muscle", AP + "10-2-skeletal-muscle"),
  contraction: src(
    "OpenStax · Muscle contraction",
    AP + "10-3-muscle-fiber-contraction-and-relaxation",
  ),
  skin: src("OpenStax · Layers of the skin", AP + "5-1-layers-of-the-skin"),
  hair: src(
    "OpenStax · Accessory structures of the skin",
    AP + "5-2-accessory-structures-of-the-skin",
  ),
  neurons: src("OpenStax · Nervous tissue", AP + "12-2-nervous-tissue"),
  synapse: src(
    "OpenStax · Communication between neurons",
    AP + "12-5-communication-between-neurons",
  ),
  wood: src(
    "USDA Forest Products Laboratory · Wood Handbook, chapter 3",
    "https://www.fpl.fs.usda.gov/documnts/fplgtr/fplgtr282/fpl_gtr282.pdf",
  ),
  plant: src("OpenStax · The plant body", BIO + "30-1-the-plant-body"),
  stems: src("OpenStax · Stems", BIO + "30-2-stems"),
  leaf: src("OpenStax · Leaves", BIO + "30-4-leaves"),
  roots: src("OpenStax · Roots", BIO + "30-3-roots"),
  cellulose: src(
    "USDA FPL · Wood cell-wall nanostructure",
    "https://www.fpl.fs.usda.gov/documnts/pdf2016/fpl_2016_jakes001.pdf",
  ),
  sugars: src("OpenStax · Carbohydrates", BIO + "3-2-carbohydrates"),
  photo: src(
    "OpenStax · Photosynthesis",
    BIO + "8-1-overview-of-photosynthesis",
  ),
  thylakoid: src(
    "OpenStax · Light-dependent reactions",
    BIO + "8-2-the-light-dependent-reactions-of-photosynthesis",
  ),
  water: src(
    "USGS · Water properties",
    "https://www.usgs.gov/special-topics/water-science-school/science/water-properties-information-topic",
  ),
  waterBond: src(
    "NIST CCCBDB · Experimental geometry of water",
    "https://cccbdb.nist.gov/exp2x.asp?casno=7732185&charge=0",
  ),
  clouds: src(
    "NOAA NESDIS · Clouds",
    "https://www.nesdis.noaa.gov/our-environment/clouds",
  ),
  droplets: src(
    "NOAA AOML · Cloud-physics instruments and drop sizes",
    "https://www.aoml.noaa.gov/hrd/HRD-P3_cloud.html",
  ),
  ice: src(
    "NOAA NESDIS · How snowflakes form",
    "https://www.nesdis.noaa.gov/about/k-12-education/ice-snow/how-do-snowflakes-form",
  ),
  air: src(
    "UCAR Center for Science Education · What's in the air?",
    "https://scied.ucar.edu/learning-zone/air-quality/whats-in-the-air",
  ),
  rocks: src(
    "USGS · Rocks and minerals",
    "https://www.usgs.gov/faqs/what-difference-between-rock-and-mineral",
  ),
  quartz: src(
    "OpenStax · The solid state of matter",
    "https://openstax.org/books/chemistry-2e/pages/10-5-the-solid-state-of-matter",
  ),
  fungi: src(
    "OpenStax · Characteristics of fungi",
    BIO + "24-1-characteristics-of-fungi",
  ),
  atom: src(
    "OpenStax · Atomic structure and symbolism",
    "https://openstax.org/books/chemistry-2e/pages/2-3-atomic-structure-and-symbolism",
  ),
  nuclear: src(
    "OpenStax · Properties of nuclei",
    "https://openstax.org/books/university-physics-volume-3/pages/10-1-properties-of-nuclei",
  ),
  proton: src(
    "Particle Data Group · Proton charge radius",
    "https://pdgprod.lbl.gov/pdgprod/pdgLive/DataBlock.action?node=S016CR",
  ),
  particles: src(
    "CERN · The Standard Model",
    "https://home.cern/science/physics/standard-model",
  ),
};

export const WORLD_NODES: Record<string, WorldNode> = {};
export const WORLD_ROOTS = [
  "human",
  "tree",
  "water",
  "cloud",
  "rock",
  "mushroom",
];

function add(
  id: string,
  parent: string | undefined,
  model: string,
  sizeMeters: number | null,
  color: string,
  name: Pair,
  description: Pair,
  sizeNote: Pair,
  fact: Pair,
  question: Pair,
  answer: Pair,
  sources: WorldSource[],
  relation: WorldRelation = "contains",
  element?: WorldNode["element"],
) {
  const node: WorldNode = {
    id,
    parent,
    model,
    sizeMeters,
    color,
    name: b(name),
    description: b(description),
    sizeNote: b(sizeNote),
    category: id.split("/")[0] as WorldCategory,
    relation,
    children: [],
    facts: [b(fact)],
    question: b(question),
    answer: b(answer),
    sources,
    element,
  };
  WORLD_NODES[id] = node;
  if (parent) {
    const p = WORLD_NODES[parent];
    if (!p) throw new Error(`Missing world parent: ${parent}`);
    p.children.push(id);
    p.defaultChild ??= id;
  }
}

// CONTENT_START
add(
  "world",
  undefined,
  "world",
  null,
  "#86b7b9",
  ["A world within a world", "Un monde dans chaque monde"],
  [
    "Choose a familiar object, then follow its structures down to cells, molecules and particles. Each branch answers a different question.",
    "Choisissez un objet familier, puis suivez ses structures jusqu’aux cellules, molécules et particules. Chaque branche répond à une question différente.",
  ],
  [
    "An illustrative landscape, not a single measured object. The distant cloud and nearby objects have different distances.",
    "Un paysage illustratif, pas un objet mesuré. Le nuage lointain et les objets proches sont à des distances différentes.",
  ],
  [
    "Colors, positions and displayed counts help identify structures; they are not a microscope image or a complete inventory.",
    "Couleurs, positions et quantités affichées facilitent l’identification ; ce n’est ni une image de microscope ni un inventaire complet.",
  ],
  [
    "How can the same atoms form such different things?",
    "Comment les mêmes atomes forment-ils des choses si différentes ?",
  ],
  [
    "Their bonds and organization create molecules, materials, cells and living systems with different properties.",
    "Leurs liaisons et leur organisation créent molécules, matériaux, cellules et êtres vivants aux propriétés différentes.",
  ],
  [S.body, S.atom],
);

add(
  "human",
  "world",
  "human",
  1.7,
  "#d99a79",
  ["Human body", "Corps humain"],
  [
    "Organs work together inside one body. Follow the blood to a red cell, or take the white-cell branch to find DNA.",
    "Les organes coopèrent dans un même corps. Suivez le sang jusqu’à un globule rouge, ou la branche du globule blanc pour trouver l’ADN.",
  ],
  [
    "Example adult height: 1.70 m; people vary.",
    "Taille d’un adulte d’exemple : 1,70 m ; elle varie selon les personnes.",
  ],
  [
    "Organs contain several tissue types, not one uniform kind of cell.",
    "Un organe contient plusieurs tissus, pas un seul type de cellule uniforme.",
  ],
  [
    "Where should we look for a red blood cell?",
    "Où chercher un globule rouge ?",
  ],
  [
    "Enter a blood vessel and explore its blood. Red cells normally circulate inside the vascular system.",
    "Entrez dans un vaisseau et explorez son sang. Les globules rouges circulent normalement dans le système vasculaire.",
  ],
  [S.body, S.red],
);

add(
  "human/heart",
  "human",
  "heart",
  0.12,
  "#d75166",
  ["Heart", "Cœur"],
  [
    "A muscular pump links two circuits: the lungs and the rest of the body. Its four chambers keep blood moving in the right direction.",
    "Cette pompe musculaire relie deux circuits : les poumons et le reste du corps. Ses quatre cavités font circuler le sang dans le bon sens.",
  ],
  [
    "Typical adult length: about 12 cm.",
    "Longueur adulte typique : environ 12 cm.",
  ],
  [
    "Valves open and close with pressure differences; they do not actively pull blood.",
    "Les valves s’ouvrent et se ferment selon les différences de pression ; elles ne tirent pas le sang.",
  ],
  [
    "Does the heart send all blood straight to the body?",
    "Le cœur envoie-t-il tout le sang directement au corps ?",
  ],
  [
    "The right ventricle sends blood to the lungs; the left ventricle sends it into the systemic circulation.",
    "Le ventricule droit envoie le sang aux poumons ; le gauche l’envoie dans la circulation générale.",
  ],
  [S.heart],
);

add(
  "human/vein",
  "human",
  "vein",
  0.04,
  "#858ee3",
  ["Vein", "Veine"],
  [
    "This short vein segment returns blood toward the heart. Its wall surrounds a blood-filled space called the lumen.",
    "Ce court segment de veine ramène le sang vers le cœur. Sa paroi entoure un espace rempli de sang : la lumière du vaisseau.",
  ],
  [
    "An illustrative 4 cm segment, not the length of a whole vein.",
    "Un segment illustratif de 4 cm, pas la longueur d’une veine entière.",
  ],
  [
    "Blue is a diagram convention. Venous blood is dark red, never blue.",
    "Le bleu est une convention de schéma. Le sang veineux est rouge sombre, jamais bleu.",
  ],
  [
    "Are veins defined by carrying little oxygen?",
    "Définit-on une veine par un sang pauvre en oxygène ?",
  ],
  [
    "No. A vein carries blood toward the heart; pulmonary veins carry oxygen-rich blood.",
    "Non. Une veine conduit le sang vers le cœur ; les veines pulmonaires transportent un sang riche en oxygène.",
  ],
  [S.vessels],
);

add(
  "human/vein/blood",
  "human/vein",
  "blood",
  80e-6,
  "#cf425d",
  ["Blood sample", "Échantillon de sang"],
  [
    "Cells and platelets travel in plasma. Choose a red cell for oxygen transport, or a white cell for its nucleus and DNA.",
    "Cellules et plaquettes circulent dans le plasma. Choisissez un globule rouge pour le transport d’oxygène, ou un globule blanc pour son noyau et son ADN.",
  ],
  [
    "An 80 µm window into the blood; displayed cell numbers are sampled.",
    "Une fenêtre de 80 µm dans le sang ; les cellules affichées forment un échantillon.",
  ],
  [
    "Plasma is the liquid part, containing water, dissolved substances and proteins.",
    "Le plasma est la partie liquide : eau, substances dissoutes et protéines.",
  ],
  ["Is blood only red cells?", "Le sang se limite-t-il aux globules rouges ?"],
  [
    "No. It also contains plasma, white cells and platelets, with very different functions.",
    "Non. Il contient aussi du plasma, des globules blancs et des plaquettes, aux fonctions très différentes.",
  ],
  [S.blood],
  "sample",
);

const RBC = "human/vein/blood/red-cell";
add(
  RBC,
  "human/vein/blood",
  "redBloodCell",
  7.5e-6,
  "#ed4961",
  ["Mature red blood cell", "Globule rouge mature"],
  [
    "This flexible, biconcave cell carries oxygen using hemoglobin. A mature human red cell has no nucleus or mitochondria.",
    "Cette cellule souple et biconcave transporte l’oxygène grâce à l’hémoglobine. Un globule rouge humain mature n’a ni noyau ni mitochondries.",
  ],
  [
    "Typical diameter: 7–8 µm; this example is 7.5 µm.",
    "Diamètre typique : 7 à 8 µm ; cet exemple mesure 7,5 µm.",
  ],
  [
    "It has no nuclear or mitochondrial DNA. Its shape helps it pass through narrow capillaries.",
    "Il ne possède ni ADN nucléaire ni ADN mitochondrial. Sa forme l’aide à franchir les capillaires étroits.",
  ],
  ["Can we zoom into its nucleus?", "Peut-on entrer dans son noyau ?"],
  [
    "No nucleus remains here. To explore human DNA, choose the neighboring white-cell branch.",
    "Il n’y a plus de noyau ici. Pour explorer l’ADN humain, choisissez la branche du globule blanc voisin.",
  ],
  [S.red],
);

add(
  RBC + "/hemoglobin",
  RBC,
  "hemoglobin",
  6e-9,
  "#dd6473",
  ["Hemoglobin", "Hémoglobine"],
  [
    "Four folded protein chains assemble into an oxygen carrier. Adult hemoglobin A has two alpha and two beta chains, each carrying one heme.",
    "Quatre chaînes protéiques repliées forment un transporteur d’oxygène. L’hémoglobine A adulte comprend deux chaînes alpha et deux bêta, chacune portant un hème.",
  ],
  [
    "About 6 nm across; a schematic of the 4HHB molecular assembly.",
    "Environ 6 nm de large ; schéma de l’assemblage moléculaire 4HHB.",
  ],
  [
    "One hemoglobin can bind up to four O₂ molecules reversibly.",
    "Une hémoglobine peut fixer réversiblement jusqu’à quatre molécules O₂.",
  ],
  ["What actually holds the oxygen?", "Qu’est-ce qui retient l’oxygène ?"],
  [
    "An iron center in each of the four hemes binds one O₂ molecule within its surrounding protein pocket.",
    "Le fer de chacun des quatre hèmes fixe une molécule O₂ dans la poche formée par la protéine.",
  ],
  [S.hemoglobin, S.pdb],
  "madeOf",
);

add(
  RBC + "/hemoglobin/heme",
  RBC + "/hemoglobin",
  "heme",
  1.2e-9,
  "#efb456",
  ["Heme group", "Groupe hème"],
  [
    "An organic ring holds an iron center. In functional hemoglobin, this iron is conventionally described as ferrous, Fe²⁺.",
    "Un anneau organique maintient un centre de fer. Dans l’hémoglobine fonctionnelle, ce fer est décrit conventionnellement comme ferreux, Fe²⁺.",
  ],
  [
    "Approximately 1.2 nm across the heme group; side groups are simplified.",
    "Environ 1,2 nm de large pour le groupe hème ; les groupes latéraux sont simplifiés.",
  ],
  [
    "The iron is coordinated by four ring nitrogens and a protein histidine; oxygen can occupy another coordination site.",
    "Le fer est coordonné à quatre azotes de l’anneau et à une histidine de la protéine ; l’oxygène peut occuper un autre site de coordination.",
  ],
  [
    "Is the iron a tiny piece of metal?",
    "Le fer est-il un minuscule morceau de métal ?",
  ],
  [
    "No. It is a chemically bound ion in a molecular environment, not a metal fragment.",
    "Non. C’est un ion lié chimiquement dans un environnement moléculaire, pas un fragment métallique.",
  ],
  [S.pdb],
  "madeOf",
);

add(
  RBC + "/membrane",
  RBC,
  "membrane",
  20e-9,
  "#f0aa83",
  ["Cell membrane patch", "Fragment de membrane"],
  [
    "A lipid bilayer and embedded proteins form a flexible boundary. A protein skeleton supports the red cell just beneath this membrane.",
    "Une bicouche lipidique et des protéines insérées forment une frontière souple. Un squelette protéique soutient le globule rouge juste sous cette membrane.",
  ],
  [
    "A 20 nm-wide patch; the lipid bilayer is about 5 nm thick.",
    "Fragment de 20 nm de large ; la bicouche lipidique mesure environ 5 nm d’épaisseur.",
  ],
  [
    "The membrane is selective, not a sealed plastic bag.",
    "La membrane est sélective, pas un sac plastique hermétique.",
  ],
  [
    "Why are the lipid tails hidden inside?",
    "Pourquoi les queues lipidiques sont-elles cachées à l’intérieur ?",
  ],
  [
    "They interact poorly with water, while the polar heads face the watery fluids on both sides.",
    "Elles interagissent peu avec l’eau, tandis que les têtes polaires font face aux liquides aqueux des deux côtés.",
  ],
  [S.membrane],
);

add(
  RBC + "/membrane/lipid",
  RBC + "/membrane",
  "phospholipid",
  2.5e-9,
  "#eac973",
  ["Phospholipid", "Phospholipide"],
  [
    "A representative membrane lipid has a polar head and two hydrophobic tails. Many lipid species share the membrane with cholesterol and proteins.",
    "Un lipide membranaire représentatif possède une tête polaire et deux queues hydrophobes. De nombreuses espèces lipidiques côtoient cholestérol et protéines.",
  ],
  [
    "Representative extended length: about 2.5 nm; chain length and conformation vary.",
    "Longueur étendue représentative : environ 2,5 nm ; les chaînes et leur conformation varient.",
  ],
  [
    "A membrane is a dynamic mixture, not one repeated identical molecule.",
    "Une membrane est un mélange dynamique, pas une seule molécule répétée à l’identique.",
  ],
  [
    "Could one layer protect both watery sides?",
    "Une seule couche protégerait-elle les deux milieux aqueux ?",
  ],
  [
    "A bilayer keeps hydrophobic tails sheltered between two surfaces of polar heads.",
    "La bicouche abrite les queues hydrophobes entre deux surfaces de têtes polaires.",
  ],
  [S.lipids],
  "madeOf",
);

const WBC = "human/vein/blood/white-cell";
add(
  WBC,
  "human/vein/blood",
  "whiteBloodCell",
  12e-6,
  "#c1b2ea",
  ["White blood cell", "Globule blanc"],
  [
    "This simplified lymphocyte represents a nucleated immune cell. Unlike a mature red cell, it retains a nucleus and many organelles.",
    "Ce lymphocyte simplifié représente une cellule immunitaire nucléée. Contrairement au globule rouge mature, il garde un noyau et de nombreux organites.",
  ],
  [
    "Example diameter: 12 µm; white-cell types and activation states differ.",
    "Diamètre d’exemple : 12 µm ; il varie selon le type et l’état d’activation.",
  ],
  [
    "White cells include several families with different immune roles.",
    "Les globules blancs comprennent plusieurs familles aux rôles immunitaires différents.",
  ],
  [
    "Where is most of this cell’s genetic information?",
    "Où se trouve l’essentiel de l’information génétique de cette cellule ?",
  ],
  [
    "In the nucleus, packaged with proteins as chromatin. A small separate genome is present in mitochondria.",
    "Dans le noyau, associée à des protéines sous forme de chromatine. Un petit génome distinct se trouve dans les mitochondries.",
  ],
  [S.white, S.nucleus],
);

const CN = WBC + "/nucleus";
add(
  CN,
  WBC,
  "cellNucleus",
  6e-6,
  "#9d82d9",
  ["Cell nucleus", "Noyau cellulaire"],
  [
    "A double membrane surrounds chromatin and the nucleolus. This cell nucleus is entirely different from the atomic nucleus much farther down the scale.",
    "Une double membrane entoure la chromatine et le nucléole. Ce noyau cellulaire est très différent du noyau atomique, bien plus bas dans les échelles.",
  ],
  [
    "Example diameter: 6 µm; nuclear size varies with cell type.",
    "Diamètre d’exemple : 6 µm ; la taille varie selon les cellules.",
  ],
  [
    "Most nucleated human body cells carry 46 chromosomes, outside special cases such as gametes.",
    "La plupart des cellules humaines nucléées du corps portent 46 chromosomes, hors cas particuliers comme les gamètes.",
  ],
  [
    "Are chromosomes always shaped like an X?",
    "Les chromosomes ont-ils toujours la forme d’un X ?",
  ],
  [
    "No. The familiar X shows a replicated, condensed chromosome during division; interphase chromatin is much less compact.",
    "Non. Le X représente un chromosome répliqué et condensé pendant la division ; la chromatine d’interphase est bien moins compacte.",
  ],
  [S.nucleus],
);

add(
  CN + "/chromatin",
  CN,
  "chromatin",
  150e-9,
  "#ad91e6",
  ["Chromatin segment", "Segment de chromatine"],
  [
    "DNA associates with histones and other proteins. This irregular segment shows packaging without claiming that all chromatin forms one regular thick fiber.",
    "L’ADN s’associe aux histones et à d’autres protéines. Ce segment irrégulier montre l’empaquetage sans supposer que toute la chromatine forme une fibre épaisse régulière.",
  ],
  [
    "A selected 150 nm region; chromatin has no single universal fiber diameter.",
    "Région choisie de 150 nm ; la chromatine n’a pas un diamètre de fibre universel.",
  ],
  [
    "Packaging influences how accessible DNA is to cellular machinery.",
    "L’empaquetage influence l’accessibilité de l’ADN aux mécanismes cellulaires.",
  ],
  [
    "How is a very long DNA molecule packed?",
    "Comment empaqueter une très longue molécule d’ADN ?",
  ],
  [
    "DNA wraps around histone cores and folds into changing arrangements inside the nucleus.",
    "L’ADN s’enroule autour de cœurs d’histones et se replie en organisations variables dans le noyau.",
  ],
  [S.chromatin],
  "sample",
);

const NU = CN + "/chromatin/nucleosome";
add(
  NU,
  CN + "/chromatin",
  "nucleosome",
  11e-9,
  "#dbad70",
  ["Nucleosome", "Nucléosome"],
  [
    "A short length of DNA wraps around a core of eight histone proteins. Nucleosomes are one basic level of chromatin organization.",
    "Un court segment d’ADN s’enroule autour d’un cœur de huit histones. Les nucléosomes sont un premier niveau d’organisation de la chromatine.",
  ],
  [
    "Core particle about 11 nm across; linker DNA is outside this measurement.",
    "Particule centrale d’environ 11 nm de large ; l’ADN de liaison n’est pas inclus.",
  ],
  [
    "A typical core binds about 147 base pairs; exact wrapping and linker lengths vary.",
    "Un cœur typique lie environ 147 paires de bases ; l’enroulement et les liaisons varient.",
  ],
  [
    "Is a nucleosome made only of DNA?",
    "Un nucléosome est-il fait uniquement d’ADN ?",
  ],
  [
    "No. It is DNA plus histone proteins. The two kinds of molecule have different chemical structures.",
    "Non. Il associe ADN et histones, deux types de molécules aux structures chimiques différentes.",
  ],
  [S.nucleosome],
);

const DNA = NU + "/dna";
add(
  DNA,
  NU,
  "dna",
  10e-9,
  "#6abaca",
  ["DNA double helix", "Double hélice d’ADN"],
  [
    "Two strands pair through their bases. Their outer backbones alternate deoxyribose sugars and phosphate groups.",
    "Deux brins s’apparient par leurs bases. Leurs squelettes externes alternent sucres désoxyribose et groupes phosphate.",
  ],
  [
    "A 10 nm-long B-DNA excerpt, about 2 nm wide; not a whole chromosome.",
    "Extrait d’ADN B de 10 nm de long, environ 2 nm de large ; pas un chromosome entier.",
  ],
  [
    "A pairs with T; G pairs with C. The order of bases carries sequence information.",
    "A s’apparie avec T ; G avec C. L’ordre des bases porte l’information de séquence.",
  ],
  [
    "Is genetic information stored in the sugar or in the sequence?",
    "L’information génétique réside-t-elle dans le sucre ou dans la séquence ?",
  ],
  [
    "It is encoded in the order of bases along DNA; sugar and phosphate form the repeating backbone.",
    "Elle est codée par l’ordre des bases le long de l’ADN ; sucre et phosphate forment le squelette répétitif.",
  ],
  [S.dna],
  "sample",
);

add(
  DNA + "/nucleotide",
  DNA,
  "nucleotide",
  1e-9,
  "#d1b564",
  ["DNA nucleotide unit", "Unité nucléotidique d’ADN"],
  [
    "A nucleotide contributes a phosphate, a deoxyribose sugar and a base. Neighboring units are joined along the backbone by phosphodiester bonds.",
    "Un nucléotide apporte un phosphate, un désoxyribose et une base. Les unités voisines sont reliées dans le squelette par des liaisons phosphodiester.",
  ],
  [
    "An approximately 1 nm molecular fragment; boundaries are explanatory cuts through bonds.",
    "Fragment moléculaire d’environ 1 nm ; ses limites sont des coupes explicatives de liaisons.",
  ],
  [
    "A nucleotide in a chain is chemically linked, not a loose bead inside a tube.",
    "Un nucléotide du brin est lié chimiquement, pas une bille libre dans un tube.",
  ],
  [
    "How many parts make one DNA nucleotide?",
    "Combien de parties forment un nucléotide d’ADN ?",
  ],
  [
    "Three: phosphate, deoxyribose and one of the four bases A, T, G or C.",
    "Trois : phosphate, désoxyribose et l’une des quatre bases A, T, G ou C.",
  ],
  [S.nucleotide],
  "madeOf",
);

add(
  WBC + "/mitochondrion",
  WBC,
  "mitochondrion",
  2e-6,
  "#edaa6c",
  ["Mitochondrion", "Mitochondrie"],
  [
    "Its folded inner membrane supports reactions that help make ATP using energy from nutrients. Mitochondria change shape and can form connected networks.",
    "Sa membrane interne plissée porte des réactions qui contribuent à produire l’ATP grâce à l’énergie des nutriments. Les mitochondries changent de forme et peuvent former des réseaux.",
  ],
  [
    "A 2 µm-long example, not a fixed size for every mitochondrion.",
    "Exemple de 2 µm de long, pas une taille fixe pour toutes les mitochondries.",
  ],
  [
    "Oxygen accepts electrons at the end of the respiratory chain; it is not an energy source by itself.",
    "L’oxygène accepte les électrons à la fin de la chaîne respiratoire ; il n’est pas une source d’énergie à lui seul.",
  ],
  [
    "Does a red blood cell use this organelle?",
    "Un globule rouge utilise-t-il cet organite ?",
  ],
  [
    "A mature human red cell has none. This mitochondrion belongs to the white cell we selected.",
    "Le globule rouge humain mature n’en possède pas. Cette mitochondrie appartient au globule blanc sélectionné.",
  ],
  [S.mitochondria],
);

add(
  WBC + "/ribosome",
  WBC,
  "ribosome",
  30e-9,
  "#e9c87f",
  ["Ribosome", "Ribosome"],
  [
    "Two subunits made of RNA and proteins read messenger RNA and assemble an amino-acid chain.",
    "Deux sous-unités faites d’ARN et de protéines lisent un ARN messager et assemblent une chaîne d’acides aminés.",
  ],
  [
    "Representative eukaryotic ribosome extent: about 30 nm.",
    "Dimension représentative d’un ribosome eucaryote : environ 30 nm.",
  ],
  [
    "RNA is essential to the ribosome’s catalytic work, not just a message passed through it.",
    "L’ARN est essentiel au travail catalytique du ribosome, pas seulement un message qui le traverse.",
  ],
  [
    "Does a ribosome read DNA directly?",
    "Un ribosome lit-il directement l’ADN ?",
  ],
  [
    "No. It translates an RNA message into a protein sequence.",
    "Non. Il traduit un message d’ARN en séquence protéique.",
  ],
  [S.ribosome],
);

add(
  "human/vein/blood/platelet",
  "human/vein/blood",
  "platelet",
  2.5e-6,
  "#e1ba73",
  ["Platelet", "Plaquette"],
  [
    "A small fragment shed by a megakaryocyte helps seal damaged vessels. Platelets change shape when activated.",
    "Ce petit fragment issu d’un mégacaryocyte contribue à colmater les vaisseaux lésés. Les plaquettes changent de forme quand elles sont activées.",
  ],
  [
    "Example resting extent: 2.5 µm; shape changes during activation.",
    "Dimension d’exemple au repos : 2,5 µm ; la forme change lors de l’activation.",
  ],
  [
    "Platelets have no nucleus but retain organelles, including mitochondria.",
    "Les plaquettes n’ont pas de noyau mais gardent des organites, dont des mitochondries.",
  ],
  [
    "Is a platelet a miniature red cell?",
    "Une plaquette est-elle un globule rouge miniature ?",
  ],
  [
    "No. It is a different cell fragment, specialized in hemostasis rather than oxygen transport.",
    "Non. C’est un fragment cellulaire différent, spécialisé dans l’hémostase plutôt que dans le transport d’oxygène.",
  ],
  [S.white],
);

add(
  "human/vein/blood/plasma",
  "human/vein/blood",
  "droplet",
  15e-6,
  "#e7c57b",
  ["Plasma sample", "Échantillon de plasma"],
  [
    "The fluid between blood cells transports dissolved ions, nutrients, waste products and proteins such as albumin.",
    "Le liquide entre les cellules sanguines transporte ions dissous, nutriments, déchets et protéines comme l’albumine.",
  ],
  [
    "A selected 15 µm fluid region, not a natural spherical droplet in the vessel.",
    "Région liquide choisie de 15 µm, pas une goutte naturellement sphérique dans le vaisseau.",
  ],
  [
    "Plasma is mostly water, but its dissolved components are biologically essential.",
    "Le plasma est surtout composé d’eau, mais ses constituants dissous sont essentiels.",
  ],
  [
    "Is the liquid between red cells empty?",
    "Le liquide entre les globules rouges est-il vide ?",
  ],
  [
    "No. It is a crowded solution with water, ions and many kinds of molecules.",
    "Non. C’est une solution riche en eau, ions et molécules de nombreuses sortes.",
  ],
  [S.blood],
  "sample",
);

add(
  "human/lungs",
  "human",
  "lung",
  0.25,
  "#e78d9f",
  ["Lungs", "Poumons"],
  [
    "Branching airways bring air toward microscopic alveoli. Blood flows in nearby capillaries, separated from the air by a thin barrier.",
    "Des voies aériennes ramifiées conduisent l’air vers les alvéoles microscopiques. Le sang circule dans des capillaires voisins, séparé de l’air par une fine barrière.",
  ],
  [
    "Example lung height: about 25 cm; inflation and body size change it.",
    "Hauteur d’un poumon d’exemple : environ 25 cm ; elle varie avec le corps et l’inspiration.",
  ],
  [
    "An airway carries air; a blood vessel carries blood. These are separate branching networks.",
    "Une voie aérienne conduit l’air ; un vaisseau conduit le sang. Ce sont deux réseaux ramifiés distincts.",
  ],
  [
    "Do red cells float inside the air sacs?",
    "Les globules rouges flottent-ils dans les sacs d’air ?",
  ],
  [
    "Normally no. They remain in capillaries around the alveoli.",
    "Normalement non. Ils restent dans les capillaires qui entourent les alvéoles.",
  ],
  [S.lungs],
);

add(
  "human/lungs/alveolus",
  "human/lungs",
  "alveoli",
  200e-6,
  "#efb3af",
  ["Pulmonary alveolus", "Alvéole pulmonaire"],
  [
    "This tiny air space has a delicate wall. Oxygen diffuses across the air–blood barrier; carbon dioxide travels in the opposite direction.",
    "Cet espace aérien minuscule possède une paroi délicate. L’oxygène diffuse à travers la barrière air-sang ; le dioxyde de carbone circule dans l’autre sens.",
  ],
  [
    "Representative alveolar extent: about 200 µm; inflation changes its dimensions.",
    "Dimension alvéolaire représentative : environ 200 µm ; l’inspiration la modifie.",
  ],
  [
    "Surfactant helps reduce surface tension at the alveolar lining.",
    "Le surfactant contribue à réduire la tension superficielle du revêtement alvéolaire.",
  ],
  [
    "What drives oxygen into the blood?",
    "Qu’est-ce qui pousse l’oxygène vers le sang ?",
  ],
  [
    "A difference in oxygen partial pressure drives diffusion across the barrier.",
    "Une différence de pression partielle d’oxygène provoque sa diffusion à travers la barrière.",
  ],
  [S.gas],
);

add(
  "human/lungs/alveolus/capillary",
  "human/lungs/alveolus",
  "capillary",
  40e-6,
  "#cb628c",
  ["Adjacent capillary segment", "Segment capillaire voisin"],
  [
    "A narrow blood vessel runs along the outside of the alveolar wall. This branch samples the neighboring blood side of the barrier.",
    "Un vaisseau étroit longe l’extérieur de la paroi alvéolaire. Cette branche échantillonne le côté sanguin voisin de la barrière.",
  ],
  [
    "A 40 µm segment; the lumen is only several micrometers wide.",
    "Segment de 40 µm ; la lumière ne fait que quelques micromètres de large.",
  ],
  [
    "Its thin endothelial lining shortens the diffusion path.",
    "Son fin revêtement endothélial raccourcit le trajet de diffusion.",
  ],
  [
    "Why does a red cell need to bend?",
    "Pourquoi un globule rouge doit-il se déformer ?",
  ],
  [
    "Some capillaries are narrower than an undeformed red cell, so membrane flexibility matters.",
    "Certains capillaires sont plus étroits qu’un globule rouge non déformé : la souplesse de sa membrane est essentielle.",
  ],
  [S.vessels],
  "sample",
);

add(
  "human/muscle",
  "human",
  "muscle",
  0.2,
  "#d97877",
  ["Skeletal muscle", "Muscle squelettique"],
  [
    "Bundles of muscle fibers pull on tendons. A muscle fiber is itself a long, multinucleated cell.",
    "Des faisceaux de fibres musculaires tirent sur les tendons. Une fibre musculaire est elle-même une longue cellule multinucléée.",
  ],
  [
    "A 20 cm example muscle; real lengths depend on the muscle.",
    "Muscle d’exemple de 20 cm ; les longueurs dépendent du muscle.",
  ],
  [
    "The words fiber, cell and filament refer to different levels here.",
    "Les mots fibre, cellule et filament désignent ici des niveaux différents.",
  ],
  [
    "Is one muscle fiber a bundle of cells?",
    "Une fibre musculaire est-elle un faisceau de cellules ?",
  ],
  [
    "In skeletal muscle, one fiber is one cell; bundles group many such fibers.",
    "Dans le muscle squelettique, une fibre est une cellule ; les faisceaux regroupent plusieurs fibres.",
  ],
  [S.muscle],
);

add(
  "human/muscle/fiber",
  "human/muscle",
  "muscleFiber",
  120e-6,
  "#e49382",
  ["Muscle fiber segment", "Segment de fibre musculaire"],
  [
    "This cut section exposes parallel myofibrils inside one muscle cell. The full cell extends far beyond the selected segment.",
    "Cette coupe expose les myofibrilles parallèles d’une cellule musculaire. La cellule entière se prolonge bien au-delà du segment sélectionné.",
  ],
  [
    "A 120 µm-long segment; a fiber can extend for centimeters.",
    "Segment de 120 µm de long ; une fibre peut s’étendre sur des centimètres.",
  ],
  [
    "Many nuclei lie toward the edge of a skeletal muscle fiber.",
    "De nombreux noyaux se trouvent vers la périphérie d’une fibre musculaire squelettique.",
  ],
  [
    "What repeats along a myofibril?",
    "Qu’est-ce qui se répète le long d’une myofibrille ?",
  ],
  [
    "Sarcomeres repeat end to end and collectively shorten during contraction.",
    "Les sarcomères se répètent bout à bout et se raccourcissent collectivement pendant la contraction.",
  ],
  [S.muscle],
  "sample",
);

add(
  "human/muscle/fiber/sarcomere",
  "human/muscle/fiber",
  "sarcomere",
  2.5e-6,
  "#e3ac7c",
  ["Sarcomere", "Sarcomère"],
  [
    "Thin and thick protein filaments slide past each other. Their increased overlap shortens the sarcomere without shortening each filament.",
    "Les filaments protéiques fins et épais glissent les uns par rapport aux autres. Leur recouvrement raccourcit le sarcomère sans raccourcir chaque filament.",
  ],
  [
    "Representative relaxed length: 2.5 µm; it changes during contraction.",
    "Longueur représentative au repos : 2,5 µm ; elle change pendant la contraction.",
  ],
  [
    "ATP and regulated calcium signals are required for the contraction cycle.",
    "L’ATP et des signaux calciques régulés sont nécessaires au cycle de contraction.",
  ],
  [
    "Do the filaments themselves shrink?",
    "Les filaments eux-mêmes rétrécissent-ils ?",
  ],
  [
    "No. They slide, so their overlap changes.",
    "Non. Ils glissent : c’est leur recouvrement qui change.",
  ],
  [S.contraction],
);

add(
  "human/muscle/fiber/sarcomere/actin",
  "human/muscle/fiber/sarcomere",
  "protein",
  40e-9,
  "#70c1c1",
  ["Actin filament segment", "Segment de filament d’actine"],
  [
    "Actin proteins assemble into a thin filament. In muscle, associated regulatory proteins control access to myosin-binding sites.",
    "Des protéines d’actine s’assemblent en filament fin. Dans le muscle, des protéines régulatrices contrôlent l’accès aux sites de liaison de la myosine.",
  ],
  [
    "A selected 40 nm filament segment, not a whole muscle filament.",
    "Segment de filament choisi de 40 nm, pas un filament musculaire entier.",
  ],
  [
    "Myosin heads interact with actin during the sliding cycle.",
    "Les têtes de myosine interagissent avec l’actine pendant le cycle de glissement.",
  ],
  [
    "What is a protein filament made from?",
    "De quoi un filament protéique est-il fait ?",
  ],
  [
    "Many protein subunits; each protein is a folded chain of amino-acid residues.",
    "De nombreuses sous-unités protéiques ; chaque protéine est une chaîne repliée de résidus d’acides aminés.",
  ],
  [S.contraction],
  "sample",
);

add(
  "human/skin",
  "human",
  "skin",
  0.01,
  "#dba385",
  ["Skin section", "Coupe de peau"],
  [
    "The epidermis covers the dermis. Blood vessels, nerves and glands occupy deeper tissue; the epidermis itself has no blood vessels.",
    "L’épiderme recouvre le derme. Vaisseaux, nerfs et glandes occupent les tissus plus profonds ; l’épiderme lui-même ne contient pas de vaisseaux sanguins.",
  ],
  [
    "A 1 cm-wide section, not the thickness of all skin layers.",
    "Coupe de 1 cm de large, pas l’épaisseur de toutes les couches cutanées.",
  ],
  [
    "Outer surface cells differ from the living cells lower in the epidermis.",
    "Les cellules de surface diffèrent des cellules vivantes situées plus bas dans l’épiderme.",
  ],
  [
    "Are all the visible skin cells alive?",
    "Toutes les cellules visibles de la peau sont-elles vivantes ?",
  ],
  [
    "No. The outer cornified layer consists of specialized dead cells forming a protective barrier.",
    "Non. La couche cornée externe comprend des cellules mortes spécialisées qui forment une barrière protectrice.",
  ],
  [S.skin],
  "sample",
);

add(
  "human/skin/cell",
  "human/skin",
  "cell",
  25e-6,
  "#e9b99c",
  ["Living keratinocyte", "Kératinocyte vivant"],
  [
    "This living cell from a deeper epidermal layer makes keratin. It is not one of the flattened dead cells at the outermost surface.",
    "Cette cellule vivante d’une couche profonde de l’épiderme produit la kératine. Ce n’est pas une des cellules mortes aplaties de l’extrême surface.",
  ],
  [
    "Example cell extent: 25 µm; shape changes as cells differentiate.",
    "Dimension cellulaire d’exemple : 25 µm ; la forme évolue pendant la différenciation.",
  ],
  [
    "Keratin forms part of the cell’s internal filament network.",
    "La kératine participe au réseau de filaments interne de la cellule.",
  ],
  [
    "Does every skin layer contain the same kind of cell?",
    "Chaque couche cutanée contient-elle les mêmes cellules ?",
  ],
  [
    "No. Location and maturation state change their shape and contents.",
    "Non. Leur position et leur maturation modifient leur forme et leur contenu.",
  ],
  [S.skin],
);

add(
  "human/skin/hair",
  "human/skin",
  "hair",
  300e-6,
  "#694839",
  ["Hair shaft segment", "Segment de tige pilaire"],
  [
    "A hair shaft is built from keratinized cells. Its exposed length has no living nuclei actively making new hair.",
    "Une tige pilaire est formée de cellules kératinisées. Sa partie exposée n’a pas de noyaux vivants produisant de nouveaux cheveux.",
  ],
  [
    "A 300 µm-long segment, about 70 µm wide in this example; hair width varies.",
    "Segment de 300 µm de long, environ 70 µm de large ici ; l’épaisseur varie.",
  ],
  [
    "Growth occurs in the follicle at the base, not at the hair tip.",
    "La croissance a lieu dans le follicule, à la base, pas à la pointe du cheveu.",
  ],
  [
    "Why does cutting the shaft not stop growth?",
    "Pourquoi couper la tige n’arrête-t-il pas sa croissance ?",
  ],
  [
    "The living cells that produce it are deeper in the follicle.",
    "Les cellules vivantes qui la produisent se trouvent plus profondément dans le follicule.",
  ],
  [S.hair],
  "sample",
);

add(
  "human/brain",
  "human",
  "brain",
  0.16,
  "#d3a2b0",
  ["Brain", "Cerveau"],
  [
    "Networks of neurons communicate while glial cells support, protect and regulate their environment. Brain tissue is not made only of neurons.",
    "Des réseaux de neurones communiquent tandis que les cellules gliales soutiennent, protègent et régulent leur environnement. Le tissu cérébral n’est pas fait uniquement de neurones.",
  ],
  [
    "Example adult extent: about 16 cm; individual anatomy varies.",
    "Dimension adulte d’exemple : environ 16 cm ; l’anatomie varie.",
  ],
  [
    "Signals and their timing matter, not simply the number of connections.",
    "Les signaux et leur synchronisation comptent, pas seulement le nombre de connexions.",
  ],
  [
    "How can one neuron communicate with another?",
    "Comment un neurone communique-t-il avec un autre ?",
  ],
  [
    "Many communicate at chemical synapses using released neurotransmitter molecules.",
    "Beaucoup communiquent aux synapses chimiques grâce à des neurotransmetteurs libérés.",
  ],
  [S.neurons],
);

add(
  "human/brain/neuron",
  "human/brain",
  "neuron",
  100e-6,
  "#e2b869",
  ["Neuron region", "Région d’un neurone"],
  [
    "Dendrites receive many inputs; an axon carries signals toward other cells. Only a small local portion of the neuron is shown.",
    "Les dendrites reçoivent de nombreux signaux ; un axone conduit les signaux vers d’autres cellules. Seule une petite portion locale du neurone est montrée.",
  ],
  [
    "A 100 µm field around the cell body, not the full axon length.",
    "Champ de 100 µm autour du corps cellulaire, pas la longueur de l’axone entier.",
  ],
  [
    "An axon can extend far beyond the cell body’s dimensions.",
    "Un axone peut largement dépasser les dimensions du corps cellulaire.",
  ],
  [
    "Is a nerve signal an electron traveling down a wire?",
    "Un signal nerveux est-il un électron parcourant un fil ?",
  ],
  [
    "No. Action potentials propagate through changes in membrane voltage driven by ion flow.",
    "Non. Les potentiels d’action se propagent par des variations de tension membranaire liées aux flux d’ions.",
  ],
  [S.neurons],
  "sample",
);

add(
  "human/brain/neuron/synapse",
  "human/brain/neuron",
  "synapse",
  600e-9,
  "#b7a0db",
  ["Chemical synapse", "Synapse chimique"],
  [
    "Vesicles release neurotransmitters into a narrow gap. Molecules bind receptors on the receiving cell’s membrane.",
    "Des vésicules libèrent des neurotransmetteurs dans un interstice étroit. Ces molécules se lient aux récepteurs de la membrane réceptrice.",
  ],
  [
    "A selected 600 nm junction region; the cleft itself is only tens of nanometers wide.",
    "Région de jonction choisie de 600 nm ; la fente elle-même ne mesure que quelques dizaines de nanomètres.",
  ],
  [
    "The transmitting and receiving membranes remain separate.",
    "Les membranes émettrice et réceptrice restent distinctes.",
  ],
  [
    "Do the two neurons physically merge to communicate?",
    "Les deux neurones fusionnent-ils pour communiquer ?",
  ],
  [
    "No. Chemical messengers cross the cleft between them.",
    "Non. Des messagers chimiques traversent la fente qui les sépare.",
  ],
  [S.synapse],
);

add(
  "tree",
  "world",
  "tree",
  5,
  "#79aa68",
  ["Living tree", "Arbre vivant"],
  [
    "Follow the trunk into wood, a leaf into photosynthesis, or a root toward its absorbing surface. Different tissues solve different problems.",
    "Suivez le tronc vers le bois, une feuille vers la photosynthèse, ou une racine vers sa surface absorbante. Différents tissus remplissent différentes fonctions.",
  ],
  [
    "An example young tree 5 m tall; species and age change tree size enormously.",
    "Jeune arbre d’exemple de 5 m ; espèce et âge font énormément varier sa taille.",
  ],
  [
    "Much of a tree’s dry mass comes from carbon dioxide fixed through photosynthesis.",
    "Une grande part de la masse sèche d’un arbre vient du dioxyde de carbone fixé par photosynthèse.",
  ],
  [
    "Is a tree mainly built from soil?",
    "Un arbre est-il surtout construit à partir du sol ?",
  ],
  [
    "Soil supplies water and mineral nutrients; much of the carbon in wood came from the air.",
    "Le sol fournit eau et nutriments minéraux ; une grande partie du carbone du bois vient de l’air.",
  ],
  [S.plant, S.photo],
);

add(
  "tree/wood",
  "tree",
  "wood",
  0.12,
  "#b58853",
  ["Wood section", "Coupe de bois"],
  [
    "Wood is secondary xylem, a tissue that supports the tree and conducts water in its functional outer region. Its cell walls remain after many cells die.",
    "Le bois est le xylème secondaire : il soutient l’arbre et conduit l’eau dans sa région externe fonctionnelle. Les parois subsistent après la mort de nombreuses cellules.",
  ],
  [
    "A 12 cm-wide sample from a trunk, not a complete trunk.",
    "Échantillon de tronc de 12 cm de large, pas un tronc entier.",
  ],
  [
    "Wood is a cellular composite, not one solid block of cellulose.",
    "Le bois est un composite cellulaire, pas un bloc plein de cellulose.",
  ],
  [
    "What makes wood both light and strong?",
    "Qu’est-ce qui rend le bois à la fois léger et solide ?",
  ],
  [
    "Hollow cellular spaces combine with reinforced walls whose organization gives wood direction-dependent properties.",
    "Des espaces cellulaires creux s’associent à des parois renforcées dont l’organisation donne au bois des propriétés selon la direction.",
  ],
  [S.wood],
  "sample",
);

add(
  "tree/wood/xylem",
  "tree/wood",
  "xylem",
  200e-6,
  "#c59b60",
  ["Xylem vessel segment", "Segment de vaisseau du xylème"],
  [
    "In this flowering-tree example, vessel elements form water-conducting tubes. Other woody plants rely mainly on narrower tracheids.",
    "Dans cet exemple d’arbre à fleurs, les éléments de vaisseaux forment des tubes conducteurs d’eau. D’autres plantes ligneuses utilisent surtout des trachéides plus étroites.",
  ],
  [
    "A 200 µm-long tissue segment; vessel widths and lengths differ by species.",
    "Segment tissulaire de 200 µm ; dimensions et diamètres varient selon les espèces.",
  ],
  [
    "Mature water-conducting vessel elements are dead; their walls remain functional.",
    "Les éléments de vaisseaux conducteurs matures sont morts ; leurs parois restent fonctionnelles.",
  ],
  [
    "Do these tubes pump water like a heart?",
    "Ces tubes pompent-ils l’eau comme un cœur ?",
  ],
  [
    "No. Evaporation from leaves helps generate tension that draws a cohesive water column through xylem.",
    "Non. L’évaporation des feuilles contribue à créer une tension qui attire une colonne d’eau cohésive dans le xylème.",
  ],
  [S.stems],
);

add(
  "tree/wood/xylem/wall",
  "tree/wood/xylem",
  "cellWall",
  5e-6,
  "#c9a16b",
  ["Wood cell-wall patch", "Fragment de paroi du bois"],
  [
    "Cellulose reinforcement sits in a matrix that includes hemicelluloses and lignin. Layer orientation helps shape the wall’s mechanical behavior.",
    "Les renforts de cellulose se trouvent dans une matrice comprenant hémicelluloses et lignine. L’orientation des couches influence le comportement mécanique de la paroi.",
  ],
  [
    "A 5 µm-wide patch; thickness varies between cells and wall layers.",
    "Fragment de 5 µm de large ; l’épaisseur varie selon les cellules et les couches.",
  ],
  [
    "A plant cell wall lies outside the cell membrane; they are different structures.",
    "Une paroi végétale est extérieure à la membrane cellulaire ; ce sont deux structures différentes.",
  ],
  [
    "Is the wall a bag of free sugar?",
    "La paroi est-elle un sac de sucre libre ?",
  ],
  [
    "No. Its carbohydrates are mostly organized into chemically linked polymers.",
    "Non. Ses glucides sont surtout organisés en polymères liés chimiquement.",
  ],
  [S.wood],
  "sample",
);

add(
  "tree/wood/xylem/wall/microfibril",
  "tree/wood/xylem/wall",
  "celluloseMicrofibril",
  30e-9,
  "#d6ba7d",
  ["Cellulose microfibril segment", "Segment de microfibrille de cellulose"],
  [
    "Several cellulose chains align into a nanoscale reinforcement. Their packing and interactions help resist stretching.",
    "Plusieurs chaînes de cellulose s’alignent en renfort nanométrique. Leur organisation et leurs interactions aident à résister à l’étirement.",
  ],
  [
    "A 30 nm-long segment; an elementary fibril is only a few nanometers wide.",
    "Segment de 30 nm de long ; une fibrille élémentaire ne fait que quelques nanomètres de large.",
  ],
  [
    "Reported fibril widths depend on species, preparation and the definition of a fibril or bundle.",
    "Les largeurs dépendent de l’espèce, de la préparation et de la définition d’une fibrille ou d’un faisceau.",
  ],
  [
    "What is inside this tiny reinforcing cable?",
    "Que contient ce minuscule câble de renfort ?",
  ],
  [
    "Aligned cellulose chains, rather than miniature plant cells.",
    "Des chaînes de cellulose alignées, pas de minuscules cellules végétales.",
  ],
  [S.cellulose],
  "sample",
);

const CELLULOSE = "tree/wood/xylem/wall/microfibril/cellulose";
add(
  CELLULOSE,
  "tree/wood/xylem/wall/microfibril",
  "cellulose",
  8e-9,
  "#e4cda2",
  ["Cellulose chain segment", "Segment de chaîne de cellulose"],
  [
    "Glucose-derived units join through β(1→4) glycosidic bonds to form an unbranched polymer. Only a short excerpt is displayed.",
    "Des unités dérivées du glucose sont reliées par des liaisons glycosidiques β(1→4) en polymère non ramifié. Seul un court extrait est affiché.",
  ],
  [
    "A selected 8 nm-long chain segment; whole cellulose chains are much longer.",
    "Segment de chaîne choisi de 8 nm ; les chaînes entières sont bien plus longues.",
  ],
  [
    "Cellulose and starch differ in bonding geometry, even though both are built from glucose-derived units.",
    "Cellulose et amidon diffèrent par la géométrie de leurs liaisons, bien qu’ils dérivent tous deux du glucose.",
  ],
  [
    "Why can humans digest starch but not cellulose directly?",
    "Pourquoi l’humain digère-t-il l’amidon mais pas directement la cellulose ?",
  ],
  [
    "Human digestive enzymes do not cleave cellulose’s β(1→4) links efficiently; bond geometry matters.",
    "Les enzymes digestives humaines ne coupent pas efficacement les liaisons β(1→4) de la cellulose : leur géométrie compte.",
  ],
  [S.sugars],
  "sample",
);

add(
  CELLULOSE + "/residue",
  CELLULOSE,
  "glucoseResidue",
  0.7e-9,
  "#ebdcb3",
  ["Glucose-derived residue", "Résidu dérivé du glucose"],
  [
    "This unit is part of the cellulose chain. The repeat composition is C₆H₁₀O₅, distinct from a free glucose molecule, C₆H₁₂O₆.",
    "Cette unité appartient à la chaîne de cellulose. La composition du motif est C₆H₁₀O₅, différente du glucose libre C₆H₁₂O₆.",
  ],
  [
    "Approximately 0.7 nm across a selected residue; cut bonds indicate continuation of the chain.",
    "Environ 0,7 nm pour un résidu sélectionné ; les liaisons coupées indiquent la suite de la chaîne.",
  ],
  [
    "Breaking the polymer chemically is different from merely zooming in.",
    "Rompre chimiquement le polymère est différent du simple fait de zoomer.",
  ],
  [
    "Is this a free sugar molecule trapped in wood?",
    "Est-ce une molécule de sucre libre piégée dans le bois ?",
  ],
  [
    "No. It is a chemically connected residue of the polymer.",
    "Non. C’est un résidu chimiquement lié au polymère.",
  ],
  [S.sugars],
  "madeOf",
);

add(
  "tree/wood/xylem/wall/lignin",
  "tree/wood/xylem/wall",
  "protein",
  5e-9,
  "#ad855a",
  ["Lignin network fragment", "Fragment de réseau de lignine"],
  [
    "Lignin is a chemically varied aromatic polymer that helps stiffen and waterproof wood walls. This branching model represents connectivity, not a unique molecule.",
    "La lignine est un polymère aromatique chimiquement varié qui contribue à rigidifier et imperméabiliser les parois. Ce modèle ramifié représente des connexions, pas une molécule unique.",
  ],
  [
    "A selected 5 nm network region; lignin has no single molecular size or sequence.",
    "Région de réseau choisie de 5 nm ; la lignine n’a ni taille ni séquence moléculaire unique.",
  ],
  [
    "Lignin is not a protein, despite the deliberately schematic branching representation.",
    "La lignine n’est pas une protéine, malgré cette représentation ramifiée volontairement schématique.",
  ],
  [
    "Does every lignin molecule have the same formula?",
    "Toutes les molécules de lignine ont-elles la même formule ?",
  ],
  [
    "No. Its composition and network vary among plants and cell-wall regions.",
    "Non. Sa composition et son réseau varient selon les plantes et les régions de la paroi.",
  ],
  [S.wood],
  "sample",
);

add(
  "tree/leaf",
  "tree",
  "leaf",
  0.1,
  "#77b466",
  ["Leaf", "Feuille"],
  [
    "Light reaches photosynthetic cells inside the leaf. Veins transport fluids, while pores called stomata regulate exchange with the air.",
    "La lumière atteint les cellules photosynthétiques de la feuille. Les nervures transportent les liquides, tandis que les stomates régulent les échanges avec l’air.",
  ],
  [
    "An example leaf 10 cm long; species differ greatly.",
    "Feuille d’exemple de 10 cm de long ; les espèces diffèrent fortement.",
  ],
  [
    "A leaf contains several cell types; not every cell has the same number of chloroplasts.",
    "Une feuille contient plusieurs types de cellules ; toutes n’ont pas le même nombre de chloroplastes.",
  ],
  [
    "Where does the green machinery live?",
    "Où se trouve la machinerie verte ?",
  ],
  [
    "In chloroplasts, especially abundant in photosynthetic mesophyll cells.",
    "Dans les chloroplastes, particulièrement nombreux dans les cellules photosynthétiques du mésophylle.",
  ],
  [S.leaf],
);

add(
  "tree/leaf/cell",
  "tree/leaf",
  "plantCell",
  40e-6,
  "#a1c17a",
  ["Leaf mesophyll cell", "Cellule du mésophylle"],
  [
    "A wall surrounds the membrane. Chloroplasts occupy the cytoplasm around a large vacuole; a nucleus contains the nuclear genome.",
    "Une paroi entoure la membrane. Les chloroplastes occupent le cytoplasme autour d’une grande vacuole ; un noyau contient le génome nucléaire.",
  ],
  [
    "Example cell extent: 40 µm; form depends on tissue and species.",
    "Dimension cellulaire d’exemple : 40 µm ; la forme dépend du tissu et de l’espèce.",
  ],
  [
    "Plant cells also contain mitochondria; photosynthesis does not replace cellular respiration.",
    "Les cellules végétales contiennent aussi des mitochondries ; la photosynthèse ne remplace pas la respiration cellulaire.",
  ],
  [
    "Is the large empty-looking center really empty?",
    "Le grand centre apparemment vide est-il vraiment vide ?",
  ],
  [
    "No. The vacuole contains an aqueous solution and contributes to cell pressure and storage.",
    "Non. La vacuole contient une solution aqueuse et contribue à la pression cellulaire et au stockage.",
  ],
  [S.cells],
);

add(
  "tree/leaf/cell/chloroplast",
  "tree/leaf/cell",
  "chloroplast",
  5e-6,
  "#78b974",
  ["Chloroplast", "Chloroplaste"],
  [
    "This organelle converts light energy into chemical processes that support carbon fixation. Its interior contains thylakoid membranes and the surrounding stroma.",
    "Cet organite convertit l’énergie lumineuse en processus chimiques permettant la fixation du carbone. Il contient des membranes thylakoïdiennes entourées de stroma.",
  ],
  [
    "Example long axis: 5 µm; chloroplast shapes and dimensions vary.",
    "Grand axe d’exemple : 5 µm ; formes et dimensions varient.",
  ],
  [
    "The chloroplast has its own small genome, alongside the much larger nuclear genome.",
    "Le chloroplaste possède son petit génome, à côté du génome nucléaire bien plus grand.",
  ],
  [
    "Does sunlight become matter inside the leaf?",
    "La lumière devient-elle de la matière dans la feuille ?",
  ],
  [
    "Light supplies energy; carbon dioxide and water provide matter for photosynthesis.",
    "La lumière fournit de l’énergie ; le dioxyde de carbone et l’eau fournissent la matière à la photosynthèse.",
  ],
  [S.photo],
);

add(
  "tree/leaf/cell/chloroplast/thylakoid",
  "tree/leaf/cell/chloroplast",
  "thylakoid",
  500e-9,
  "#579d62",
  ["Thylakoid membrane region", "Région membranaire thylakoïdienne"],
  [
    "Pigment–protein complexes capture light in this membrane. Electron transfer and a proton gradient help generate ATP and NADPH.",
    "Des complexes pigments-protéines captent la lumière dans cette membrane. Le transfert d’électrons et un gradient de protons contribuent à produire ATP et NADPH.",
  ],
  [
    "A selected 500 nm membrane-and-stack region, not membrane thickness.",
    "Région de membrane et d’empilement choisie de 500 nm, pas l’épaisseur membranaire.",
  ],
  [
    "Oxygen released by photosynthesis comes from water molecules.",
    "L’oxygène libéré par photosynthèse provient de molécules d’eau.",
  ],
  [
    "Are pigments floating freely in the whole chloroplast?",
    "Les pigments flottent-ils librement dans tout le chloroplaste ?",
  ],
  [
    "Most light-harvesting chlorophyll is organized with proteins in thylakoid membranes.",
    "L’essentiel de la chlorophylle collectrice de lumière est organisé avec des protéines dans les membranes thylakoïdiennes.",
  ],
  [S.thylakoid],
  "sample",
);

const CHLOROPHYLL = "tree/leaf/cell/chloroplast/thylakoid/chlorophyll";
add(
  CHLOROPHYLL,
  "tree/leaf/cell/chloroplast/thylakoid",
  "chlorophyll",
  3e-9,
  "#83c978",
  ["Chlorophyll a", "Chlorophylle a"],
  [
    "A light-absorbing ring coordinates magnesium and connects to a long hydrophobic tail. The pigment functions within a protein environment.",
    "Un anneau absorbant la lumière coordonne un magnésium et porte une longue queue hydrophobe. Le pigment fonctionne dans un environnement protéique.",
  ],
  [
    "Approximate extended molecular extent including its tail: 3 nm; conformation varies.",
    "Dimension moléculaire étendue approximative avec sa queue : 3 nm ; la conformation varie.",
  ],
  [
    "The central metal here is magnesium, not the iron found in hemoglobin’s heme.",
    "Le métal central est ici le magnésium, pas le fer de l’hème de l’hémoglobine.",
  ],
  [
    "Does chlorophyll absorb all visible colors equally?",
    "La chlorophylle absorbe-t-elle toutes les couleurs visibles pareillement ?",
  ],
  [
    "No. Its absorption favors particular wavelengths; leaf color also depends on other pigments and light scattering.",
    "Non. Elle absorbe préférentiellement certaines longueurs d’onde ; la couleur des feuilles dépend aussi des autres pigments et de la diffusion.",
  ],
  [S.thylakoid],
  "madeOf",
);

add(
  "tree/root",
  "tree",
  "root",
  0.2,
  "#ba956e",
  ["Root branch", "Ramification de racine"],
  [
    "Roots anchor the plant and absorb water and mineral nutrients. Fine branches explore the soil around them.",
    "Les racines ancrent la plante et absorbent eau et nutriments minéraux. Les fines ramifications explorent le sol.",
  ],
  [
    "A selected 20 cm root branch, not the whole root system.",
    "Ramification choisie de 20 cm, pas le système racinaire entier.",
  ],
  [
    "Roots need cellular respiration; soil air supplies oxygen for many root cells.",
    "Les racines ont besoin de respiration cellulaire ; l’air du sol apporte de l’oxygène à de nombreuses cellules.",
  ],
  [
    "How does a root increase its contact with soil water?",
    "Comment une racine augmente-t-elle son contact avec l’eau du sol ?",
  ],
  [
    "Root hairs extend the surface of individual epidermal cells into the surrounding soil.",
    "Les poils absorbants prolongent la surface de cellules épidermiques individuelles dans le sol.",
  ],
  [S.roots],
  "sample",
);

add(
  "tree/root/hair",
  "tree/root",
  "hypha",
  500e-6,
  "#d8bd83",
  ["Root hair", "Poil absorbant"],
  [
    "A root hair is an extension of one living root epidermal cell. Its thin surface increases contact with water and dissolved ions.",
    "Un poil absorbant est le prolongement d’une cellule épidermique racinaire vivante. Sa surface fine augmente le contact avec l’eau et les ions dissous.",
  ],
  [
    "Example extension length: 500 µm; root hairs vary considerably.",
    "Longueur d’exemple : 500 µm ; les poils absorbants varient beaucoup.",
  ],
  [
    "A root hair is a plant cell extension, not a fungal hypha.",
    "Un poil absorbant est un prolongement de cellule végétale, pas une hyphe de champignon.",
  ],
  [
    "Is one root hair a tiny complete root?",
    "Un poil absorbant est-il une petite racine complète ?",
  ],
  [
    "No. It is part of a single cell on a root’s surface.",
    "Non. Il fait partie d’une seule cellule à la surface de la racine.",
  ],
  [S.roots],
);

add(
  "water",
  "world",
  "water",
  0.12,
  "#74c6de",
  ["Glass of water", "Verre d’eau"],
  [
    "A familiar drink hides an immense number of moving molecules. This branch follows the liquid, not the glass material around it.",
    "Une boisson familière cache un nombre immense de molécules mobiles. Cette branche suit le liquide, pas le matériau du verre qui l’entoure.",
  ],
  [
    "Example vessel height: 12 cm; the contents occupy only part of it.",
    "Hauteur du récipient d’exemple : 12 cm ; le liquide n’en occupe qu’une partie.",
  ],
  [
    "Real drinking water also contains dissolved ions and gases; this route focuses on H₂O.",
    "L’eau potable contient aussi ions et gaz dissous ; ce parcours se concentre sur H₂O.",
  ],
  [
    "Is liquid water continuous all the way down?",
    "L’eau liquide reste-t-elle continue à toutes les échelles ?",
  ],
  [
    "At molecular scale, individual H₂O molecules interact in a constantly changing arrangement.",
    "À l’échelle moléculaire, des molécules H₂O interagissent dans une organisation constamment changeante.",
  ],
  [S.water],
);

add(
  "water/liquid",
  "water",
  "droplet",
  20e-6,
  "#8cd3e1",
  ["Liquid-water region", "Région d’eau liquide"],
  [
    "Choose a tiny region inside the liquid. Its spherical outline marks a selected volume, not a separate droplet floating inside water.",
    "Choisissez une petite région du liquide. Son contour sphérique indique un volume sélectionné, pas une goutte séparée flottant dans l’eau.",
  ],
  [
    "A selected region 20 µm across, not a new molecular size.",
    "Région sélectionnée de 20 µm de large, pas une nouvelle taille moléculaire.",
  ],
  [
    "The few displayed molecular markers sample an enormous population.",
    "Les quelques marqueurs moléculaires affichés échantillonnent une population immense.",
  ],
  [
    "Do the molecules have to break to move past one another?",
    "Les molécules doivent-elles se casser pour glisser les unes entre les autres ?",
  ],
  [
    "No. Their intermolecular neighbors change while each H₂O molecule usually stays chemically intact.",
    "Non. Leurs voisins intermoléculaires changent tandis que chaque molécule H₂O reste généralement chimiquement intacte.",
  ],
  [S.water],
  "sample",
);

function waterMolecule(id: string, parent: string) {
  add(
    id,
    parent,
    "waterMolecule",
    0.3e-9,
    "#73c7e2",
    ["Water molecule", "Molécule d’eau"],
    [
      "Two hydrogen atoms are covalently bonded to oxygen in a bent arrangement. The molecule is not a miniature wet droplet.",
      "Deux atomes d’hydrogène sont liés à l’oxygène par des liaisons covalentes dans une disposition coudée. La molécule n’est pas une petite goutte mouillée.",
    ],
    [
      "Characteristic molecular extent: about 0.3 nm; atomic boundaries are conventional, not hard surfaces.",
      "Dimension moléculaire caractéristique : environ 0,3 nm ; les limites atomiques sont conventionnelles, pas des surfaces dures.",
    ],
    [
      "For isolated H₂O, the O–H bond is about 0.0958 nm and the bond angle about 104.5°.",
      "Pour H₂O isolée, la liaison O–H mesure environ 0,0958 nm et l’angle environ 104,5°.",
    ],
    [
      "Are hydrogen bonds the same as the O–H bonds inside water?",
      "Les liaisons hydrogène sont-elles les liaisons O–H internes ?",
    ],
    [
      "No. O–H bonds hold each molecule together; hydrogen bonds can connect different water molecules.",
      "Non. Les liaisons O–H maintiennent chaque molécule ; les liaisons hydrogène peuvent relier des molécules d’eau différentes.",
    ],
    [S.waterBond],
    "madeOf",
  );
  WORLD_NODES[id].molecule = "water";
}
waterMolecule("water/liquid/molecule", "water/liquid");

add(
  "cloud",
  "world",
  "cloud",
  500,
  "#d8e6f0",
  ["Cloud", "Nuage"],
  [
    "A cloud contains tiny liquid droplets, ice crystals, or both, suspended in air. Invisible water vapor surrounds these visible particles.",
    "Un nuage contient de petites gouttelettes, des cristaux de glace, ou les deux, en suspension dans l’air. De la vapeur d’eau invisible entoure ces particules visibles.",
  ],
  [
    "Example extent: 500 m. It is distant in the landscape, not a small cloud next to the glass.",
    "Dimension d’exemple : 500 m. Il est lointain dans le paysage, pas petit à côté du verre.",
  ],
  [
    "The white cloud is not water vapor made visible; droplets and ice scatter the light.",
    "Le nuage blanc n’est pas de la vapeur rendue visible ; gouttes et glace diffusent la lumière.",
  ],
  [
    "Is a cloud a giant balloon full of liquid?",
    "Un nuage est-il un ballon géant rempli de liquide ?",
  ],
  [
    "No. Its water particles are dispersed through a much larger volume of air.",
    "Non. Ses particules d’eau sont dispersées dans un volume d’air bien plus grand.",
  ],
  [S.clouds],
);

add(
  "cloud/droplet",
  "cloud",
  "droplet",
  20e-6,
  "#acd6ea",
  ["Cloud droplet", "Gouttelette de nuage"],
  [
    "A tiny liquid droplet scatters incoming light. Cloud droplets often grow on aerosol particles acting as condensation nuclei.",
    "Une petite goutte liquide diffuse la lumière reçue. Les gouttelettes croissent souvent sur des aérosols jouant le rôle de noyaux de condensation.",
  ],
  [
    "Example diameter: 20 µm; cloud droplets have a size distribution, unlike a uniform bead collection.",
    "Diamètre d’exemple : 20 µm ; les gouttelettes ont une distribution de tailles, pas une taille unique.",
  ],
  [
    "A condensation nucleus is an aerosol seed, not an atomic or cellular nucleus.",
    "Un noyau de condensation est un germe d’aérosol, pas un noyau atomique ou cellulaire.",
  ],
  [
    "Is one cloud droplet already a raindrop?",
    "Une gouttelette de nuage est-elle déjà une goutte de pluie ?",
  ],
  [
    "Typical cloud droplets are much smaller; additional growth is needed to produce falling rain.",
    "Les gouttelettes typiques sont bien plus petites ; elles doivent encore croître pour produire de la pluie.",
  ],
  [S.droplets],
  "sample",
);
waterMolecule("cloud/droplet/molecule", "cloud/droplet");

add(
  "cloud/ice",
  "cloud",
  "ice",
  100e-6,
  "#b3d6e8",
  ["Ice crystal", "Cristal de glace"],
  [
    "This small crystal represents one possible ice particle in a cold cloud. Crystal form depends on temperature, humidity and growth history.",
    "Ce petit cristal représente une particule de glace possible dans un nuage froid. Sa forme dépend de la température, de l’humidité et de son histoire.",
  ],
  [
    "Example maximum extent: 100 µm; natural ice particles span many sizes.",
    "Dimension maximale d’exemple : 100 µm ; les particules naturelles ont des tailles très variées.",
  ],
  [
    "Not all ice particles are beautiful six-branched snowflakes.",
    "Toutes les particules de glace ne sont pas de beaux flocons à six branches.",
  ],
  [
    "Where does the familiar sixfold symmetry come from?",
    "D’où vient la symétrie familière à six directions ?",
  ],
  [
    "It reflects the arrangement of water molecules in ordinary hexagonal ice, modified by crystal growth.",
    "Elle reflète l’organisation des molécules d’eau dans la glace hexagonale ordinaire, modulée par la croissance.",
  ],
  [S.ice],
  "sample",
);

add(
  "cloud/ice/lattice",
  "cloud/ice",
  "iceLattice",
  2e-9,
  "#a4d1e6",
  ["Ice molecular network", "Réseau moléculaire de glace"],
  [
    "Water molecules form an ordered hydrogen-bonded network. Open spaces in this network help explain why ordinary ice is less dense than liquid water.",
    "Les molécules d’eau forment un réseau ordonné de liaisons hydrogène. Ses espaces ouverts aident à comprendre pourquoi la glace ordinaire est moins dense que l’eau liquide.",
  ],
  [
    "A selected 2 nm network region, not a whole crystal.",
    "Région de réseau choisie de 2 nm, pas un cristal entier.",
  ],
  [
    "The solid still consists of H₂O molecules; freezing changes their organization.",
    "Le solide reste constitué de molécules H₂O ; la solidification change leur organisation.",
  ],
  [
    "Do water molecules turn into another chemical element when frozen?",
    "Les molécules d’eau deviennent-elles un autre élément en gelant ?",
  ],
  [
    "No. Their molecular identity remains H₂O.",
    "Non. Leur identité moléculaire reste H₂O.",
  ],
  [S.water, S.ice],
  "sample",
);
waterMolecule("cloud/ice/lattice/molecule", "cloud/ice/lattice");

add(
  "cloud/air",
  "cloud",
  "air",
  10e-9,
  "#becbdc",
  ["Air between droplets", "Air entre les gouttelettes"],
  [
    "The gas is mostly nitrogen and oxygen, with argon and other trace gases. Water-vapor abundance changes strongly with conditions.",
    "Le gaz contient surtout du diazote et du dioxygène, avec de l’argon et d’autres gaz traces. La quantité de vapeur d’eau varie fortement avec les conditions.",
  ],
  [
    "A selected 10 nm gas region; spacing and counts are illustrative.",
    "Région gazeuse choisie de 10 nm ; espacements et quantités sont illustratifs.",
  ],
  [
    "Dry air is approximately 78% N₂ and 21% O₂ by volume.",
    "L’air sec contient environ 78 % de N₂ et 21 % de O₂ en volume.",
  ],
  ["Do we breathe pure oxygen?", "Respirons-nous de l’oxygène pur ?"],
  [
    "No. Nitrogen is the largest component of ordinary air.",
    "Non. Le diazote est le constituant principal de l’air ordinaire.",
  ],
  [S.air],
  "sample",
);

add(
  "cloud/air/nitrogen",
  "cloud/air",
  "nitrogen",
  0.3e-9,
  "#9cb4ec",
  ["Nitrogen molecule · N₂", "Molécule de diazote · N₂"],
  [
    "Two nitrogen atoms share a strong triple bond. Most atmospheric nitrogen occurs as these molecules, not isolated nitrogen atoms.",
    "Deux atomes d’azote partagent une forte liaison triple. L’azote atmosphérique est surtout sous cette forme moléculaire, pas en atomes isolés.",
  ],
  [
    "Characteristic molecular extent: about 0.3 nm, using conventional atomic extents.",
    "Dimension moléculaire caractéristique : environ 0,3 nm selon des limites atomiques conventionnelles.",
  ],
  [
    "N₂ is chemically different from nitrates dissolved in soil water.",
    "N₂ est chimiquement différent des nitrates dissous dans l’eau du sol.",
  ],
  [
    "Can a plant simply build proteins from all the N₂ around it?",
    "Une plante peut-elle fabriquer ses protéines avec tout le N₂ ambiant ?",
  ],
  [
    "Most plants rely on biologically available nitrogen compounds; nitrogen fixation changes N₂ into usable forms.",
    "La plupart dépendent de composés azotés assimilables ; la fixation transforme N₂ en formes utilisables.",
  ],
  [S.air, S.roots],
  "madeOf",
);

add(
  "cloud/air/oxygen",
  "cloud/air",
  "oxygen",
  0.3e-9,
  "#e89797",
  ["Oxygen molecule · O₂", "Molécule de dioxygène · O₂"],
  [
    "Two bonded oxygen atoms form O₂. This is the molecule hemoglobin transports, distinct from oxygen chemically bound in water.",
    "Deux atomes d’oxygène liés forment O₂. C’est la molécule transportée par l’hémoglobine, distincte de l’oxygène chimiquement lié dans l’eau.",
  ],
  [
    "Characteristic molecular extent: about 0.3 nm, not a hard-sphere diameter.",
    "Dimension moléculaire caractéristique : environ 0,3 nm, pas le diamètre d’une sphère dure.",
  ],
  [
    "O₂ contains two oxygen atoms; H₂O contains one.",
    "O₂ contient deux atomes d’oxygène ; H₂O en contient un.",
  ],
  [
    "Is the oxygen in a glass of water all available to breathe?",
    "Tout l’oxygène d’un verre d’eau est-il disponible pour respirer ?",
  ],
  [
    "No. Chemically bound oxygen in H₂O is different from dissolved O₂ used by aquatic animals.",
    "Non. L’oxygène lié chimiquement dans H₂O diffère de l’O₂ dissous utilisé par les animaux aquatiques.",
  ],
  [S.air, S.gas],
  "madeOf",
);

add(
  "rock",
  "world",
  "rock",
  0.25,
  "#a5a0a0",
  ["Rock", "Roche"],
  [
    "This illustrative rock contains mineral grains. The route selects quartz; real rocks may contain several minerals and textures.",
    "Cette roche illustrative contient des grains minéraux. Le parcours sélectionne du quartz ; les roches réelles peuvent contenir plusieurs minéraux et textures.",
  ],
  ["Example maximum extent: 25 cm.", "Dimension maximale d’exemple : 25 cm."],
  [
    "A rock is not the same category as a mineral species.",
    "Une roche et une espèce minérale ne désignent pas la même catégorie.",
  ],
  [
    "Is every grain in a rock necessarily the same substance?",
    "Tous les grains d’une roche sont-ils forcément la même substance ?",
  ],
  [
    "No. Many rocks combine different minerals; this branch follows one selected quartz grain.",
    "Non. Beaucoup de roches associent différents minéraux ; cette branche suit un grain de quartz choisi.",
  ],
  [S.rocks],
);

add(
  "rock/quartz",
  "rock",
  "quartz",
  0.008,
  "#d0bedb",
  ["Quartz grain", "Grain de quartz"],
  [
    "Quartz is a crystalline form of silicon dioxide. Its atoms join in an extended network throughout the crystal.",
    "Le quartz est une forme cristalline du dioxyde de silicium. Ses atomes sont reliés en réseau continu dans le cristal.",
  ],
  [
    "An 8 mm grain, not a universal quartz-crystal size.",
    "Grain de 8 mm, pas une taille universelle de cristal de quartz.",
  ],
  [
    "SiO₂ expresses the silicon-to-oxygen ratio; it is not a collection of separate little SiO₂ molecules.",
    "SiO₂ exprime le rapport silicium-oxygène ; ce n’est pas une collection de petites molécules SiO₂ séparées.",
  ],
  [
    "Can we pick out one isolated SiO₂ molecule in quartz?",
    "Peut-on isoler une petite molécule SiO₂ dans le quartz ?",
  ],
  [
    "No. The bonded network continues beyond any small region we draw.",
    "Non. Le réseau lié continue au-delà de toute petite région dessinée.",
  ],
  [S.quartz],
  "madeOf",
);

add(
  "rock/quartz/network",
  "rock/quartz",
  "crystalLattice",
  1.7411510169506073e-9,
  "#c0b5dd",
  ["Quartz atomic network", "Réseau atomique du quartz"],
  [
    "Each silicon is surrounded by four oxygens in a tetrahedral arrangement. Oxygen atoms connect neighboring silicon centers in the network.",
    "Chaque silicium est entouré de quatre oxygènes disposés en tétraèdre. Les oxygènes relient des centres de silicium voisins dans le réseau.",
  ],
  [
    "A ≈1.74 nm excerpt from measured α-quartz coordinates at 298 K. Atom markers are illustrative; boundary oxygens continue beyond this cut.",
    "Extrait d’environ 1,74 nm issu des coordonnées mesurées du quartz α à 298 K. Les marqueurs atomiques sont illustratifs ; les oxygènes du bord se prolongent hors de cette coupe.",
  ],
  [
    "Tetrahedra share oxygen atoms; counting each shared atom once gives SiO₂ overall.",
    "Les tétraèdres partagent leurs oxygènes ; en comptant chaque atome une seule fois, on obtient globalement SiO₂.",
  ],
  [
    "Why four neighboring oxygens but only O₂ in the formula?",
    "Pourquoi quatre oxygènes voisins mais seulement O₂ dans la formule ?",
  ],
  [
    "Each oxygen is shared between silicon centers, so the total ratio is two oxygen atoms per silicon.",
    "Chaque oxygène est partagé entre des centres de silicium : le rapport total est de deux oxygènes par silicium.",
  ],
  [S.quartz],
  "sample",
);

add(
  "mushroom",
  "world",
  "mushroom",
  0.1,
  "#cd907a",
  ["Mushroom", "Champignon"],
  [
    "The visible mushroom is a reproductive structure of a fungus. Much of the organism can extend through the substrate as a network of hyphae.",
    "Le champignon visible est une structure reproductrice d’un organisme fongique. Une grande partie peut s’étendre dans le substrat en réseau d’hyphes.",
  ],
  [
    "A fruiting body 10 cm tall; species and developmental stage vary.",
    "Structure fructifère de 10 cm de haut ; espèce et stade de développement varient.",
  ],
  [
    "Fungi are not plants and do not photosynthesize.",
    "Les champignons ne sont pas des plantes et ne font pas de photosynthèse.",
  ],
  [
    "Is the mushroom cap the entire organism?",
    "Le chapeau est-il l’organisme entier ?",
  ],
  [
    "Often no. The mycelium extends into the surrounding material beyond the visible fruiting body.",
    "Souvent non. Le mycélium s’étend dans le matériau environnant au-delà de la partie visible.",
  ],
  [S.fungi],
);

add(
  "mushroom/hypha",
  "mushroom",
  "hypha",
  60e-6,
  "#d4bba3",
  ["Fungal hypha segment", "Segment d’hyphe fongique"],
  [
    "A microscopic filament absorbs nutrients after enzymes break down material outside it. Hyphae form the network called mycelium.",
    "Ce filament microscopique absorbe les nutriments après leur dégradation extérieure par des enzymes. Les hyphes forment le réseau appelé mycélium.",
  ],
  [
    "A 60 µm-long segment, only a few micrometers wide in this example.",
    "Segment de 60 µm de long, de quelques micromètres de large dans cet exemple.",
  ],
  [
    "Many hyphae have internal cross-walls with pores; fungal organization varies among groups.",
    "De nombreuses hyphes ont des cloisons internes percées de pores ; l’organisation varie selon les groupes.",
  ],
  [
    "Does a fungus swallow food like an animal?",
    "Un champignon avale-t-il sa nourriture comme un animal ?",
  ],
  [
    "It commonly digests material externally and absorbs dissolved products.",
    "Il digère généralement la matière à l’extérieur puis absorbe les produits dissous.",
  ],
  [S.fungi],
  "sample",
);

add(
  "mushroom/hypha/wall",
  "mushroom/hypha",
  "cellWall",
  300e-9,
  "#c7ac8c",
  ["Fungal wall patch", "Fragment de paroi fongique"],
  [
    "The wall supports the cell outside its membrane. Fungal walls commonly contain chitin and glucans rather than the cellulose framework typical of plants.",
    "La paroi soutient la cellule à l’extérieur de sa membrane. Les parois fongiques contiennent souvent chitine et glucanes plutôt que la trame de cellulose typique des plantes.",
  ],
  [
    "A selected 300 nm-wide patch, not a universal wall thickness.",
    "Fragment choisi de 300 nm de large, pas une épaisseur de paroi universelle.",
  ],
  [
    "Sharing a structural role does not make fungal and plant walls chemically identical.",
    "Un rôle structurel similaire ne rend pas les parois fongiques et végétales chimiquement identiques.",
  ],
  [
    "Is this wall the same material as wood?",
    "Cette paroi est-elle faite du même matériau que le bois ?",
  ],
  [
    "No. It uses a different mixture of structural polymers.",
    "Non. Elle utilise un mélange différent de polymères structuraux.",
  ],
  [S.fungi],
  "sample",
);

add(
  "mushroom/hypha/wall/chitin",
  "mushroom/hypha/wall",
  "chitin",
  8e-9,
  "#e5cfab",
  ["Chitin chain segment", "Segment de chaîne de chitine"],
  [
    "Chitin is a chain of linked N-acetylglucosamine residues. Its nitrogen-containing groups distinguish it chemically from cellulose.",
    "La chitine est une chaîne de résidus de N-acétylglucosamine liés. Ses groupes contenant de l’azote la distinguent chimiquement de la cellulose.",
  ],
  [
    "A selected 8 nm polymer segment; the full chain is longer.",
    "Segment de polymère choisi de 8 nm ; la chaîne entière est plus longue.",
  ],
  [
    "Chitin also occurs in arthropod exoskeletons, combined with other materials.",
    "La chitine se trouve aussi dans l’exosquelette des arthropodes, associée à d’autres matériaux.",
  ],
  [
    "Do fungi and insects share a structural molecule?",
    "Champignons et insectes partagent-ils une molécule structurale ?",
  ],
  [
    "Yes. Both can use chitin, organized differently for different biological roles.",
    "Oui. Tous deux peuvent utiliser la chitine, organisée différemment selon les rôles biologiques.",
  ],
  [S.sugars],
  "sample",
);

type AtomSpec = {
  element: NonNullable<WorldNode["element"]>;
  name: Pair;
  z: number;
  a: number;
  charge: number;
  extent: number;
  color: string;
  note: Pair;
};
const ATOMS = {
  N: {
    element: "N",
    name: ["Nitrogen atom", "Atome d’azote"],
    z: 7,
    a: 14,
    charge: 0,
    extent: 0.142e-9,
    color: "#819edf",
    note: [
      "Covalent diameter convention about 0.142 nm; not a hard spherical boundary.",
      "Convention de diamètre covalent d’environ 0,142 nm ; pas une limite sphérique dure.",
    ],
  },
  Ca: {
    element: "Ca",
    name: ["Calcium atom", "Atome de calcium"],
    z: 20,
    a: 40,
    charge: 0,
    extent: 0.348e-9,
    color: "#95bba0",
    note: [
      "Neutral-atom covalent diameter convention about 0.348 nm. Calcium in bone mineral is bonded and has ionic character; this is not the radius of Ca²⁺ in the lattice.",
      "Convention de diamètre covalent de l’atome neutre d’environ 0,348 nm. Le calcium minéral osseux est lié et présente un caractère ionique ; ce n’est pas le rayon du Ca²⁺ dans le réseau.",
    ],
  },
  P: {
    element: "P",
    name: ["Phosphorus atom", "Atome de phosphore"],
    z: 15,
    a: 31,
    charge: 0,
    extent: 0.218e-9,
    color: "#d9b566",
    note: [
      "Neutral-atom covalent diameter convention about 0.218 nm; phosphorus in phosphate participates in chemical bonding.",
      "Convention de diamètre covalent de l’atome neutre d’environ 0,218 nm ; le phosphore du phosphate participe à des liaisons chimiques.",
    ],
  },
  Fe: {
    element: "Fe",
    name: ["Iron center · Fe²⁺", "Centre de fer · Fe²⁺"],
    z: 26,
    a: 56,
    charge: 2,
    extent: 0.15e-9,
    color: "#e7b36d",
    note: [
      "Illustrative ionic extent about 0.15 nm; coordination and spin state affect ionic radius.",
      "Dimension ionique illustrative d’environ 0,15 nm ; coordination et état de spin influencent le rayon ionique.",
    ],
  },
  Mg: {
    element: "Mg",
    name: ["Magnesium center · Mg²⁺", "Centre de magnésium · Mg²⁺"],
    z: 12,
    a: 24,
    charge: 2,
    extent: 0.14e-9,
    color: "#b9ca71",
    note: [
      "Illustrative ionic extent about 0.14 nm; its value depends on coordination.",
      "Dimension ionique illustrative d’environ 0,14 nm ; sa valeur dépend de la coordination.",
    ],
  },
  C: {
    element: "C",
    name: ["Carbon atom", "Atome de carbone"],
    z: 6,
    a: 12,
    charge: 0,
    extent: 0.15e-9,
    color: "#9baab8",
    note: [
      "Covalent diameter convention: about 0.15 nm; an atom has no hard edge.",
      "Convention de diamètre covalent : environ 0,15 nm ; un atome n’a pas de bord dur.",
    ],
  },
  O: {
    element: "O",
    name: ["Oxygen atom", "Atome d’oxygène"],
    z: 8,
    a: 16,
    charge: 0,
    extent: 0.128e-9,
    color: "#eb8992",
    note: [
      "Covalent diameter convention: about 0.128 nm; its electron density extends beyond any drawn boundary.",
      "Convention de diamètre covalent : environ 0,128 nm ; sa densité électronique dépasse toute limite dessinée.",
    ],
  },
  H: {
    element: "H",
    name: ["Hydrogen atom", "Atome d’hydrogène"],
    z: 1,
    a: 1,
    charge: 0,
    extent: 0.064e-9,
    color: "#dbe5ef",
    note: [
      "Covalent diameter convention: about 0.064 nm; hydrogen in a bond is not an isolated sphere.",
      "Convention de diamètre covalent : environ 0,064 nm ; l’hydrogène lié n’est pas une sphère isolée.",
    ],
  },
  Si: {
    element: "Si",
    name: ["Silicon atom", "Atome de silicium"],
    z: 14,
    a: 28,
    charge: 0,
    extent: 0.228e-9,
    color: "#c7a5c7",
    note: [
      "Covalent diameter convention: about 0.228 nm; electron density belongs to the bonded crystal.",
      "Convention de diamètre covalent : environ 0,228 nm ; la densité électronique appartient au cristal lié.",
    ],
  },
} satisfies Record<string, AtomSpec>;

function atomicBranch(id: string, parent: string, a: AtomSpec) {
  const radiusSource = src(
    "Royal Society of Chemistry · " + a.element,
    `https://periodic-table.rsc.org/element/${a.z}/${({ Fe: "iron", Mg: "magnesium", C: "carbon", O: "oxygen", H: "hydrogen", Si: "silicon", N: "nitrogen", Ca: "calcium", P: "phosphorus" } as const)[a.element]}`,
  );
  const ionic = a.charge !== 0;
  add(
    id,
    parent,
    "atom",
    a.extent,
    a.color,
    a.name,
    ionic
      ? [
          "This metal center is chemically bound in its surrounding molecule. We use a simplified ion picture to explore its nucleus and electrons.",
          "Ce centre métallique est lié chimiquement dans sa molécule. Une représentation ionique simplifiée permet d’explorer son noyau et ses électrons.",
        ]
      : [
          "A nucleus and electrons make this atom. In the surrounding substance, electron density participates in chemical bonds; it is not a set of planetary tracks.",
          "Un noyau et des électrons forment cet atome. Dans la substance environnante, la densité électronique participe aux liaisons ; ce ne sont pas des trajectoires planétaires.",
        ],
    a.note,
    [
      `The selected isotope is ${a.element}-${a.a}: ${a.z} protons and ${a.a - a.z} neutrons. Other isotopes may also occur.`,
      `L’isotope choisi est ${a.element}-${a.a} : ${a.z} protons et ${a.a - a.z} neutrons. D’autres isotopes peuvent aussi être présents.`,
    ],
    [
      "What determines which element this is?",
      "Qu’est-ce qui détermine cet élément ?",
    ],
    [
      "The number of protons. Changing the number of neutrons changes the isotope, not the element.",
      "Le nombre de protons. Modifier le nombre de neutrons change l’isotope, pas l’élément.",
    ],
    [
      S.atom,
      radiusSource,
      ...(ionic
        ? [
            src(
              "University of Sheffield · Ionic radius conventions",
              `https://winter.group.shef.ac.uk/webelements/${a.element === "Fe" ? "iron" : "magnesium"}/atom_sizes.html`,
            ),
          ]
        : []),
    ],
    "madeOf",
    a.element,
  );
  WORLD_NODES[id].atomic = {
    atomicNumber: a.z,
    massNumber: a.a,
    charge: a.charge,
  };
  const nucleus = id + "/nucleus";
  const nucleusExtent = a.a === 1 ? 1.68e-15 : 2.4e-15 * Math.cbrt(a.a);
  add(
    nucleus,
    id,
    "atomicNucleus",
    nucleusExtent,
    "#e0a08e",
    [
      `${a.element}-${a.a} atomic nucleus`,
      `Noyau atomique ${a.element}-${a.a}`,
    ],
    a.a === 1
      ? [
          "Ordinary hydrogen’s nucleus is one proton. It contains no neutron in this selected isotope.",
          "Le noyau de l’hydrogène ordinaire est un proton. L’isotope sélectionné ne contient aucun neutron.",
        ]
      : [
          "Protons and neutrons occupy a region far smaller than the atom. These nucleons are quantum objects, not stationary hard marbles.",
          "Protons et neutrons occupent une région bien plus petite que l’atome. Ces nucléons sont des objets quantiques, pas des billes dures immobiles.",
        ],
    a.a === 1
      ? [
          "About 1.68 fm using twice the proton charge radius; this is a size convention, not a sharp boundary.",
          "Environ 1,68 fm selon le double du rayon de charge du proton ; c’est une convention, pas une frontière nette.",
        ]
      : [
          "Approximate nuclear diameter from 2 × 1.2 fm × A⅓; real charge and matter radii are not identical.",
          "Diamètre nucléaire approximatif selon 2 × 1,2 fm × A⅓ ; les rayons de charge et de matière diffèrent.",
        ],
    [
      `This example contains ${a.z} protons and ${a.a - a.z} neutrons; the menu samples their types.`,
      `Cet exemple contient ${a.z} protons et ${a.a - a.z} neutrons ; le menu échantillonne leurs types.`,
    ],
    [
      "Are electrons inside this nucleus?",
      "Les électrons sont-ils dans ce noyau ?",
    ],
    [
      "No. Atomic electrons occupy quantum states extending outside the nucleus.",
      "Non. Les électrons atomiques occupent des états quantiques qui s’étendent hors du noyau.",
    ],
    a.a === 1 ? [S.nuclear, S.proton] : [S.nuclear],
  );
  WORLD_NODES[nucleus].atomic = {
    atomicNumber: a.z,
    massNumber: a.a,
    charge: a.z,
  };
  for (const neutron of a.a > a.z ? [false, true] : [false]) {
    const nucleon = nucleus + (neutron ? "/neutron" : "/proton");
    add(
      nucleon,
      nucleus,
      "nucleon",
      1.68e-15,
      neutron ? "#89b3de" : "#e98591",
      neutron ? ["Neutron", "Neutron"] : ["Proton", "Proton"],
      neutron
        ? [
            "Its valence-quark content is one up and two down quarks. Gluons and quark–antiquark fluctuations are also essential to its quantum structure.",
            "Il contient comme quarks de valence un up et deux down. Gluons et fluctuations quark-antiquark sont aussi essentiels à sa structure quantique.",
          ]
        : [
            "Its valence-quark content is two up and one down quark. Gluons and quark–antiquark fluctuations are also essential; three little balls are only a teaching diagram.",
            "Il contient comme quarks de valence deux up et un down. Gluons et fluctuations quark-antiquark sont aussi essentiels ; trois billes ne sont qu’un schéma pédagogique.",
          ],
      neutron
        ? [
            "Illustrative nucleon extent near 1.7 fm; a neutron has no sharp surface and this is not its charge radius.",
            "Dimension illustrative du nucléon proche de 1,7 fm ; le neutron n’a pas de surface nette et ce n’est pas son rayon de charge.",
          ]
        : [
            "About 1.68 fm from twice the proton charge radius; not a hard-sphere diameter.",
            "Environ 1,68 fm selon le double du rayon de charge du proton ; pas un diamètre de sphère dure.",
          ],
      neutron
        ? [
            "Its total electric charge is zero despite its charged quarks.",
            "Sa charge électrique totale est nulle malgré ses quarks chargés.",
          ]
        : [
            "Its total electric charge is +e.",
            "Sa charge électrique totale est +e.",
          ],
      [
        "Can we pull one quark out and keep it alone?",
        "Peut-on extraire un quark et le conserver seul ?",
      ],
      [
        "Quarks are confined: ordinary isolated free quarks are not observed.",
        "Les quarks sont confinés : on n’observe pas de quarks libres isolés ordinaires.",
      ],
      [S.particles, S.nuclear, S.proton],
      "sample",
    );
    WORLD_NODES[nucleon].atomic = {
      atomicNumber: neutron ? 0 : 1,
      massNumber: 1,
      charge: neutron ? 0 : 1,
    };
    for (const down of [neutron, !neutron]) {
      const quarkId = nucleon + (down === neutron ? "/quark" : "/other-quark");
      add(
        quarkId,
        nucleon,
        "quark",
        null,
        down ? "#82d1b2" : "#e9c368",
        down ? ["Down quark", "Quark down"] : ["Up quark", "Quark up"],
        [
          "A quark is elementary in the Standard Model: no smaller internal constituents are established. The visible marker has no measured particle diameter.",
          "Un quark est élémentaire dans le modèle standard : aucun constituant interne plus petit n’est établi. Le marqueur visible n’a pas de diamètre particulaire mesuré.",
        ],
        [
          "No assigned diameter. This is an illustrative marker, not a measured surface.",
          "Aucun diamètre attribué. C’est un marqueur illustratif, pas une surface mesurée.",
        ],
        down
          ? [
              "A down quark has electric charge −⅓e; its diagram color is not a visible color.",
              "Un quark down a une charge électrique de −⅓e ; sa couleur de schéma n’est pas une couleur visible.",
            ]
          : [
              "An up quark has electric charge +⅔e; its diagram color is not a visible color.",
              "Un quark up a une charge électrique de +⅔e ; sa couleur de schéma n’est pas une couleur visible.",
            ],
        [
          "What will we find by opening the quark?",
          "Que trouve-t-on en ouvrant le quark ?",
        ],
        [
          "No confirmed smaller structure. This is a boundary of current knowledge, not a hidden level of the app.",
          "Aucune structure plus petite confirmée. C’est une limite des connaissances actuelles, pas un niveau caché de l’application.",
        ],
        [S.particles],
        "sample",
      );
      WORLD_NODES[quarkId].quarkFlavor = down ? "down" : "up";
    }
  }
  add(
    id + "/electron",
    id,
    "electron",
    null,
    "#8dcae7",
    ["Electron", "Électron"],
    [
      "An electron is an elementary particle with charge −e. This marker identifies one electron, not a tiny orbiting planet.",
      "Un électron est une particule élémentaire de charge −e. Ce marqueur identifie un électron, pas une petite planète en orbite.",
    ],
    [
      "No assigned diameter. A probability cloud describes position statistics, not the electron’s physical surface.",
      "Aucun diamètre attribué. Un nuage de probabilité décrit des statistiques de position, pas sa surface physique.",
    ],
    ionic
      ? [
          `The formal ${a.element}²⁺ ion has ${a.z - 2} electrons; bonding redistributes electron density.`,
          `L’ion formel ${a.element}²⁺ possède ${a.z - 2} électrons ; les liaisons redistribuent la densité électronique.`,
        ]
      : [
          `A neutral isolated ${a.element} atom has ${a.z} electrons; the bonded-atom picture is more complex.`,
          `Un atome ${a.element} neutre isolé possède ${a.z} électrons ; la représentation de l’atome lié est plus complexe.`,
        ],
    ["Is an electron made of quarks?", "Un électron est-il fait de quarks ?"],
    [
      "No. Electrons are leptons; no internal constituents are established.",
      "Non. Les électrons sont des leptons ; aucun constituant interne n’est établi.",
    ],
    [S.particles],
    "sample",
  );
}

atomicBranch(RBC + "/hemoglobin/heme/iron", RBC + "/hemoglobin/heme", ATOMS.Fe);
atomicBranch(DNA + "/nucleotide/carbon", DNA + "/nucleotide", ATOMS.C);
atomicBranch(CELLULOSE + "/residue/carbon", CELLULOSE + "/residue", ATOMS.C);
atomicBranch(CHLOROPHYLL + "/magnesium", CHLOROPHYLL, ATOMS.Mg);
atomicBranch("water/liquid/molecule/oxygen", "water/liquid/molecule", ATOMS.O);
atomicBranch(
  "water/liquid/molecule/hydrogen",
  "water/liquid/molecule",
  ATOMS.H,
);
atomicBranch(
  "cloud/droplet/molecule/oxygen",
  "cloud/droplet/molecule",
  ATOMS.O,
);
atomicBranch(
  "cloud/ice/lattice/molecule/oxygen",
  "cloud/ice/lattice/molecule",
  ATOMS.O,
);
atomicBranch("rock/quartz/network/silicon", "rock/quartz/network", ATOMS.Si);
atomicBranch("rock/quartz/network/oxygen", "rock/quartz/network", ATOMS.O);
atomicBranch(
  "mushroom/hypha/wall/chitin/carbon",
  "mushroom/hypha/wall/chitin",
  ATOMS.C,
);

// Context-specific branches keep their own ancestry while reusing reviewed explanations.
function copyNode(id: string, parent: string, sourceId: string) {
  const source = WORLD_NODES[sourceId];
  WORLD_NODES[id] = {
    ...source,
    id,
    parent,
    children: [],
    defaultChild: undefined,
  };
  const p = WORLD_NODES[parent];
  p.children.push(id);
  p.defaultChild ??= id;
}

add(
  "human/heart/cell",
  "human/heart",
  "muscleFiber",
  100e-6,
  "#da8578",
  ["Cardiac muscle cell", "Cellule musculaire cardiaque"],
  [
    "A cardiomyocyte contains contractile myofibrils and many mitochondria. Neighboring cells connect at intercalated discs, coordinating the heart’s work.",
    "Un cardiomyocyte contient des myofibrilles contractiles et de nombreuses mitochondries. Les cellules voisines sont reliées par des disques intercalaires qui coordonnent leur travail.",
  ],
  [
    "A representative 100 µm-long cell; cardiac cells branch and vary in size.",
    "Cellule représentative de 100 µm de long ; les cellules cardiaques se ramifient et varient en taille.",
  ],
  [
    "A cardiac muscle cell usually has one central nucleus, sometimes two; this differs from a skeletal muscle fiber.",
    "Une cellule cardiaque possède généralement un noyau central, parfois deux ; elle diffère d’une fibre musculaire squelettique.",
  ],
  [
    "Does the heart use the same sliding-filament principle as skeletal muscle?",
    "Le cœur utilise-t-il le même principe de glissement que les muscles squelettiques ?",
  ],
  [
    "Yes. Its sarcomeres also use actin and myosin, but cellular organization and regulation differ.",
    "Oui. Ses sarcomères utilisent aussi actine et myosine, mais l’organisation cellulaire et la régulation diffèrent.",
  ],
  [
    src("OpenStax · Cardiac muscle tissue", AP + "10-7-cardiac-muscle-tissue"),
    S.heart,
  ],
);
copyNode(
  "human/heart/cell/sarcomere",
  "human/heart/cell",
  "human/muscle/fiber/sarcomere",
);
WORLD_NODES["human/heart/cell/sarcomere"].sizeMeters = 2.2e-6;
WORLD_NODES["human/heart/cell/sarcomere"].sizeNote = b([
  "Representative cardiac sarcomere length: 2.2 µm; length changes during the heartbeat.",
  "Longueur représentative d’un sarcomère cardiaque : 2,2 µm ; elle change au cours du battement.",
]);
copyNode(
  "human/heart/cell/mitochondrion",
  "human/heart/cell",
  WBC + "/mitochondrion",
);
WORLD_NODES["human/heart/cell/mitochondrion"].answer = b([
  "A mature human red cell has none. This mitochondrion belongs to the cardiac muscle cell we selected.",
  "Le globule rouge humain mature n’en possède pas. Cette mitochondrie appartient à la cellule cardiaque sélectionnée.",
]);
copyNode("human/skin/cell/nucleus", "human/skin/cell", CN);
copyNode(
  "human/skin/cell/nucleus/chromatin",
  "human/skin/cell/nucleus",
  CN + "/chromatin",
);
copyNode(
  "human/skin/cell/nucleus/chromatin/nucleosome",
  "human/skin/cell/nucleus/chromatin",
  NU,
);
copyNode(
  "human/skin/cell/nucleus/chromatin/nucleosome/dna",
  "human/skin/cell/nucleus/chromatin/nucleosome",
  DNA,
);
copyNode(
  "human/skin/cell/nucleus/chromatin/nucleosome/dna/nucleotide",
  "human/skin/cell/nucleus/chromatin/nucleosome/dna",
  DNA + "/nucleotide",
);
atomicBranch(
  "human/skin/cell/nucleus/chromatin/nucleosome/dna/nucleotide/carbon",
  "human/skin/cell/nucleus/chromatin/nucleosome/dna/nucleotide",
  ATOMS.C,
);
copyNode(
  "human/skin/cell/mitochondrion",
  "human/skin/cell",
  WBC + "/mitochondrion",
);
WORLD_NODES["human/skin/cell/mitochondrion"].answer = b([
  "A mature human red cell has none. This mitochondrion belongs to the living skin cell we selected.",
  "Le globule rouge humain mature n’en possède pas. Cette mitochondrie appartient à la cellule cutanée vivante sélectionnée.",
]);
copyNode("human/skin/cell/ribosome", "human/skin/cell", WBC + "/ribosome");

// A leaf cell is eukaryotic, but it does not inherit human chromosome counts.
const PLANT_NUCLEUS = "tree/leaf/cell/nucleus";
copyNode(PLANT_NUCLEUS, "tree/leaf/cell", CN);
WORLD_NODES[PLANT_NUCLEUS].category = "tree";
WORLD_NODES[PLANT_NUCLEUS].facts = [
  b([
    "Chromosome number depends on the tree species and ploidy; a plant nucleus must not inherit the human count of 46.",
    "Le nombre de chromosomes dépend de l’espèce d’arbre et de la ploïdie ; un noyau végétal ne reprend pas le nombre humain de 46.",
  ]),
];
WORLD_NODES[PLANT_NUCLEUS].sources = [S.cells, S.plant];
for (const [suffix, original] of [
  ["/chromatin", CN + "/chromatin"],
  ["/chromatin/nucleosome", NU],
  ["/chromatin/nucleosome/dna", DNA],
  ["/chromatin/nucleosome/dna/nucleotide", DNA + "/nucleotide"],
]) {
  const id = PLANT_NUCLEUS + suffix;
  copyNode(id, id.slice(0, id.lastIndexOf("/")), original);
  WORLD_NODES[id].category = "tree";
}
atomicBranch(
  PLANT_NUCLEUS + "/chromatin/nucleosome/dna/nucleotide/carbon",
  PLANT_NUCLEUS + "/chromatin/nucleosome/dna/nucleotide",
  ATOMS.C,
);
copyNode(
  "tree/leaf/cell/mitochondrion",
  "tree/leaf/cell",
  WBC + "/mitochondrion",
);
WORLD_NODES["tree/leaf/cell/mitochondrion"].category = "tree";
WORLD_NODES["tree/leaf/cell/mitochondrion"].answer = b([
  "A mature human red cell has none. This mitochondrion belongs to the leaf cell: plants carry out cellular respiration too.",
  "Le globule rouge humain mature n’en possède pas. Cette mitochondrie appartient à la cellule de feuille : les plantes font aussi de la respiration cellulaire.",
]);
copyNode("tree/leaf/cell/ribosome", "tree/leaf/cell", WBC + "/ribosome");
WORLD_NODES["tree/leaf/cell/ribosome"].category = "tree";

WORLD_NODES["rock/quartz"].sources.push(
  src(
    "Handbook of Mineralogy · Quartz",
    "https://www.handbookofmineralogy.org/pdfs/quartz.pdf",
  ),
);
WORLD_NODES["rock/quartz/network"].sources.push(
  src(
    "IUCr · α-quartz structure at 298 K",
    "https://journals.iucr.org/j/issues/2022/04/00/te5094/",
  ),
);

// Keep existing blood-cell URLs while distinguishing the complete anatomical
// vein from the short explanatory vessel-wall specimen.
const VEIN_SAMPLE = "human/vein/segment";
copyNode(VEIN_SAMPLE, "human/vein", "human/vein");
WORLD_NODES[VEIN_SAMPLE].name = b([
  "Vein wall segment",
  "Segment de paroi veineuse",
]);
WORLD_NODES[VEIN_SAMPLE].relation = "sample";
WORLD_NODES[VEIN_SAMPLE].sizeNote = b([
  "A schematic 4 cm wall segment, about 3 mm across. The red interior represents blood as a volume; individual cells resolve at the next scale.",
  "Segment schématique de paroi de 4 cm, large d’environ 3 mm. L’intérieur rouge représente un volume de sang ; les cellules individuelles apparaissent à l’échelle suivante.",
]);
WORLD_NODES[VEIN_SAMPLE].children = ["human/vein/blood"];
WORLD_NODES[VEIN_SAMPLE].defaultChild = "human/vein/blood";
WORLD_NODES["human/vein/blood"].parent = VEIN_SAMPLE;
WORLD_NODES["human/vein"].children = [VEIN_SAMPLE];
WORLD_NODES["human/vein"].defaultChild = VEIN_SAMPLE;

const BP3D = src(
  "BodyParts3D 4.0 · DBCLS · CC BY 4.0",
  "https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html",
);
add(
  "human/liver",
  "human",
  "anatomyLiver",
  0.25,
  "#9a5058",
  ["Liver", "Foie"],
  [
    "The liver processes nutrients arriving from the intestine, makes many blood proteins and produces bile. It lies mainly beneath the right side of the diaphragm.",
    "Le foie transforme les nutriments arrivant de l’intestin, fabrique de nombreuses protéines sanguines et produit la bile. Il se situe surtout sous la partie droite du diaphragme.",
  ],
  [
    "Largest extent of the selected BodyParts3D specimen; this is not a universal adult measurement.",
    "Plus grande dimension du spécimen BodyParts3D choisi ; ce n’est pas une mesure adulte universelle.",
  ],
  [
    "Bile helps disperse dietary fats. The gallbladder stores and concentrates bile; the liver produces it.",
    "La bile aide à disperser les graisses alimentaires. La vésicule biliaire la stocke et la concentre ; le foie la produit.",
  ],
  [
    "Does the gallbladder make bile?",
    "La vésicule biliaire fabrique-t-elle la bile ?",
  ],
  [
    "No. Liver cells produce bile, which can be stored in the gallbladder before reaching the intestine.",
    "Non. Les cellules du foie produisent la bile, qui peut être stockée dans la vésicule avant de rejoindre l’intestin.",
  ],
  [
    BP3D,
    src(
      "OpenStax · Liver and accessory digestive organs",
      AP +
        "23-6-accessory-organs-in-digestion-the-liver-pancreas-and-gallbladder",
    ),
  ],
);
add(
  "human/kidneys",
  "human",
  "anatomyKidneys",
  0.26,
  "#b56265",
  ["Kidneys", "Reins"],
  [
    "The kidneys filter blood plasma and adjust water, ions and waste excretion. They lie behind the abdominal lining, on either side of the spine.",
    "Les reins filtrent le plasma sanguin et ajustent l’élimination d’eau, d’ions et de déchets. Ils se situent derrière le revêtement abdominal, de part et d’autre de la colonne.",
  ],
  [
    "Extent of the positioned pair in this specimen, including the space between them; not the length of one kidney.",
    "Dimension de la paire en place dans ce spécimen, espace intermédiaire compris ; pas la longueur d’un seul rein.",
  ],
  [
    "Most filtered water and useful solutes return to the blood. Urine is the fluid remaining after filtration, reabsorption and secretion.",
    "La plupart de l’eau filtrée et des solutés utiles retournent au sang. L’urine résulte de la filtration, de la réabsorption et de la sécrétion.",
  ],
  [
    "Does everything filtered by the kidneys become urine?",
    "Tout ce que filtrent les reins devient-il de l’urine ?",
  ],
  [
    "No. Renal tubules reabsorb most filtered fluid and many useful substances.",
    "Non. Les tubules rénaux réabsorbent la majorité du liquide filtré et de nombreuses substances utiles.",
  ],
  [
    BP3D,
    src("OpenStax · Kidney anatomy", AP + "25-3-gross-anatomy-of-the-kidney"),
  ],
);
add(
  "human/stomach",
  "human",
  "anatomyStomach",
  0.22,
  "#d99b8c",
  ["Stomach", "Estomac"],
  [
    "This muscular chamber stores and mixes a meal with acidic secretions. It releases the resulting mixture gradually into the small intestine.",
    "Cette poche musculaire stocke et mélange le repas avec des sécrétions acides. Elle libère progressivement le mélange obtenu vers l’intestin grêle.",
  ],
  [
    "Extent of one modeled stomach. Its shape and volume change with filling and muscular activity.",
    "Dimension d’un estomac modélisé. Sa forme et son volume changent avec le remplissage et l’activité musculaire.",
  ],
  [
    "A mucus and bicarbonate barrier helps protect the lining from acid and digestive enzymes.",
    "Une barrière de mucus et de bicarbonate aide à protéger la paroi contre l’acide et les enzymes digestives.",
  ],
  [
    "Is the stomach where most nutrients enter the blood?",
    "L’estomac est-il le principal lieu de passage des nutriments vers le sang ?",
  ],
  [
    "No. Most nutrient absorption takes place in the small intestine.",
    "Non. L’absorption de la plupart des nutriments se déroule dans l’intestin grêle.",
  ],
  [BP3D, src("OpenStax · Stomach", AP + "23-4-the-stomach")],
);
add(
  "human/intestines",
  "human",
  "anatomyIntestines",
  0.4,
  "#c795ad",
  ["Intestines", "Intestins"],
  [
    "The small intestine completes much digestion and absorbs nutrients. The large intestine recovers water and electrolytes and helps form feces.",
    "L’intestin grêle réalise une grande partie de la digestion et absorbe les nutriments. Le gros intestin récupère de l’eau et des électrolytes et participe à la formation des selles.",
  ],
  [
    "Extent of the folded organs in the abdomen, not their much greater length if unfolded.",
    "Dimension des organes repliés dans l’abdomen, pas leur longueur bien supérieure s’ils étaient dépliés.",
  ],
  [
    "The word small describes the intestine’s diameter relative to the large intestine, not its total length.",
    "Le mot grêle désigne son diamètre inférieur à celui du gros intestin, pas sa longueur totale.",
  ],
  [
    "Why does a long intestine fit inside the abdomen?",
    "Pourquoi un intestin aussi long tient-il dans l’abdomen ?",
  ],
  [
    "Its flexible tube forms many loops. The 3D model preserves their positions in this specimen.",
    "Son tube souple forme de nombreuses anses. Le modèle 3D conserve leurs positions dans ce spécimen.",
  ],
  [
    BP3D,
    src(
      "OpenStax · Small and large intestines",
      AP + "23-5-the-small-and-large-intestines",
    ),
  ],
);
add(
  "human/femur",
  "human",
  "anatomyFemur",
  0.45,
  "#e6d9be",
  ["Left femur", "Fémur gauche"],
  [
    "The femur is the thigh bone. Its rounded head articulates with the pelvis, while its lower end participates in the knee joint.",
    "Le fémur est l’os de la cuisse. Sa tête arrondie s’articule avec le bassin, tandis que son extrémité inférieure participe à l’articulation du genou.",
  ],
  [
    "Largest extent of the left femur in this specimen. Bone dimensions vary between people.",
    "Plus grande dimension du fémur gauche de ce spécimen. Les dimensions osseuses varient selon les personnes.",
  ],
  [
    "Bone is living tissue containing cells, blood vessels and a mineralized collagen matrix.",
    "L’os est un tissu vivant contenant des cellules, des vaisseaux sanguins et une matrice de collagène minéralisée.",
  ],
  [
    "Is a bone just an inert mineral rod?",
    "Un os est-il simplement une tige minérale inerte ?",
  ],
  [
    "No. Bone tissue is continually maintained and remodeled by living cells.",
    "Non. Le tissu osseux est entretenu et remodelé en permanence par des cellules vivantes.",
  ],
  [
    BP3D,
    src(
      "OpenStax · Bones of the lower limb",
      AP + "8-4-bones-of-the-lower-limb",
    ),
  ],
);

// Source geometry is kept in the same millimetre coordinate system before a
// shared axis rotation and normalization. Values match the adapted GLB manifest.
const ANATOMICAL_EXTENTS: Record<string, number> = {
  "human/heart": 0.115552906,
  "human/lungs": 0.255124382,
  "human/brain": 0.1806502769,
  "human/vein": 0.5523504166,
  "human/muscle": 0.3453480056,
  "human/liver": 0.2092812765,
  "human/kidneys": 0.1779584044,
  "human/stomach": 0.134475602,
  "human/intestines": 0.3196657898,
  "human/femur": 0.4661829912,
};
WORLD_NODES.human.sizeMeters = 1.7194712;
WORLD_NODES.human.sizeNote = b([
  "The source adult body frame is about 1.72 m high. Organs retain their original relative sizes and positions; individual anatomy varies.",
  "Le repère du corps adulte source mesure environ 1,72 m de haut. Les organes gardent leurs proportions et positions d’origine ; l’anatomie varie selon les personnes.",
]);
WORLD_NODES.human.sources.push(BP3D);
for (const [id, extent] of Object.entries(ANATOMICAL_EXTENTS)) {
  WORLD_NODES[id].sizeMeters = extent;
  WORLD_NODES[id].sizeNote = b([
    "Largest extent of this BodyParts3D surface, measured in its common source frame. This reference specimen does not represent every adult.",
    "Plus grande dimension de cette surface BodyParts3D, mesurée dans le repère commun de la source. Ce spécimen de référence ne représente pas tous les adultes.",
  ]);
  if (!WORLD_NODES[id].sources.some((source) => source.url === BP3D.url))
    WORLD_NODES[id].sources.push(BP3D);
}
WORLD_NODES["human/lungs"].sizeNote = b([
  "Extent of both positioned lungs in this BodyParts3D specimen, not the height of a single lung. Inflation and anatomy vary.",
  "Dimension des deux poumons en place dans ce spécimen BodyParts3D, pas la hauteur d’un seul poumon. Le gonflement et l’anatomie varient.",
]);
WORLD_NODES["human/kidneys"].sizeNote = b([
  "Extent of the positioned kidney pair, including the space between them; not the length of one kidney.",
  "Dimension de la paire de reins en place, espace intermédiaire compris ; pas la longueur d’un seul rein.",
]);
WORLD_NODES["human/intestines"].sizeNote = b([
  "Extent of the folded organs in the abdomen, not their much greater length if unfolded.",
  "Dimension des organes repliés dans l’abdomen, pas leur longueur bien supérieure s’ils étaient dépliés.",
]);
WORLD_NODES["human/vein"].name = b([
  "Left cephalic vein",
  "Veine céphalique gauche",
]);
WORLD_NODES["human/vein"].description = b([
  "This superficial vein follows the lateral side of the left upper limb. The anatomical surface shows its course; the next step samples a short wall segment before entering the blood.",
  "Cette veine superficielle suit le côté latéral du membre supérieur gauche. La surface anatomique montre son trajet ; l’étape suivante prélève un court segment de paroi avant d’entrer dans le sang.",
]);
WORLD_NODES["human/muscle"].name = b([
  "Left biceps brachii",
  "Biceps brachial gauche",
]);
const BP3D_LUNGS = src(
  "BodyParts3D 4.3 · Lung parenchyma · DBCLS · CC BY-SA 2.1 Japan",
  "https://lifesciencedb.jp/bp3d/info_en/index.html",
);
WORLD_NODES.human.sources.push(BP3D_LUNGS);
WORLD_NODES["human/lungs"].sources = WORLD_NODES["human/lungs"].sources.filter(
  (source) => source.url !== BP3D.url,
);
WORLD_NODES["human/lungs"].sources.push(BP3D_LUNGS);

// The default route serves the original question: body → vein → red cell → heme iron.
WORLD_NODES.human.defaultChild = "human/vein";
WORLD_NODES["human/vein/blood"].defaultChild = RBC;
WORLD_NODES["tree/wood/xylem/wall/lignin"].model = "polymer";

/** Material hits choose a local sample, never a pre-positioned mini-object.
 * A sample target resolves only among the current node's direct children. */
export const WORLD_SAMPLE_REGIONS: Readonly<Record<string, readonly string[]>> =
  {
    soil: ["soil"],
    "rock-matrix": ["mineralGrains"],
    rock: ["rock"],
    quartz: ["quartz", "crystalLattice"],
    "silicate-glass": ["glassNetwork"],
    glass: ["glassSample"],
    "liquid-water": ["droplet"],
    "aqueous-sample": ["waterMolecule"],
    "cloud-condensate": ["droplet"],
    air: ["air"],
    "woody-stem": ["wood"],
    wood: ["xylem"],
    foliage: ["leaf"],
    root: ["root"],
    "root-epidermis": ["plantCell", "rootCell"],
    "leaf-lamina": ["plantCell"],
    "plant-cell-wall": ["cellWall"],
    "cell-wall": ["cellWall"],
    "cell-wall-fiber": ["celluloseMicrofibril", "chitin"],
    "cell-wall-matrix": ["polymer"],
    "fungal-tissue": ["hypha"],
    "soil-organic-matter": ["polymer"],
    blood: ["blood"],
    "blood-plasma": ["droplet"],
    "vessel-wall": ["tissue"],
    "living-tissue": ["cell"],
    "bone-matrix": ["boneMatrix"],
    "bone-mineral": ["apatite"],
    "bone-canal": ["blood"],
    collagen: ["protein"],
    keratin: ["protein"],
    "cell-membrane": ["membrane"],
    "membrane-protein": ["protein"],
    cytoplasm: ["cytoplasm"],
    "nuclear-envelope": ["membrane"],
    nucleoplasm: ["nucleoplasm"],
    vacuole: ["droplet"],
    protein: ["aminoAcidResidue"],
    phospholipid: ["phospholipid"],
    dna: ["nucleotide"],
    "thylakoid-membrane": ["chlorophyll"],
    ice: ["iceLattice"],
    // Probability clouds and symbolic links do not locate another hidden object.
    "electron-cloud": [],
    "atomic-nucleus": [],
    nucleon: [],
    "elementary-particle": [],
    "peptide-continuation": [],
    nucleolus: [],
    grass: ["leaf"],
    "lipid-tail": ["hydrocarbon"],
    "phospholipid-head": [],
    "mitochondrial-membrane": ["membrane"],
    "mitochondrial-dna": ["dna"],
    endomembrane: ["membrane"],
    "nascent-protein": ["protein"],
    "ribosomal-complex": [],
    "phosphate-group": [],
    "nucleotide-base": [],
    "nucleotide-diagram": [],
    "chitin-diagram": [],
    "porphyrin-ring": [],
    "chlorin-ring": [],
    "carbon-rich-polymer": ["atom"],
  };

const SPATIAL_SOURCES = {
  plantWallMatrix: src(
    "Plant Physiology · Native primary-wall cellulose–pectin contacts",
    "https://academic.oup.com/plphys/article/168/3/871/6113743",
  ),
  fungalWallMatrix: src(
    "Nature Communications · Fungal wall polysaccharides by solid-state NMR",
    "https://www.nature.com/articles/s41467-021-26749-z",
  ),
  soil: src(
    "USGS · What's in my soil?",
    "https://www.usgs.gov/educational-resources/whats-my-soil",
  ),
  soilCarbon: src(
    "USGS · Soil organic carbon",
    "https://pubs.usgs.gov/sir/2017/5118/elements/C_Org/C_Org_txt.html",
  ),
  bone: src(
    "NCBI Endotext · Anatomy and ultrastructure of bone",
    "https://www.ncbi.nlm.nih.gov/books/NBK279149/",
  ),
  apatite: src(
    "NCBI Bookshelf · Osteoblasts and mineralized matrix",
    "https://www.ncbi.nlm.nih.gov/books/NBK557792/",
  ),
  glass: src(
    "NIST · Noncrystal ionic model for silica glass",
    "https://nvlpubs.nist.gov/nistpubs/jres/59/jresv59n2p139_A1b.pdf",
  ),
  proteins: src(
    "NCBI Bookshelf · The shape and structure of proteins",
    "https://www.ncbi.nlm.nih.gov/books/NBK26830/",
  ),
  cytosol: src(
    "NCBI Bookshelf · The compartmentalization of cells",
    "https://www.ncbi.nlm.nih.gov/books/NBK26907/",
  ),
  liver: src(
    "NIDDK · Your digestive system and how it works",
    "https://www.niddk.nih.gov/health-information/digestive-diseases/digestive-system-how-it-works",
  ),
  kidneys: src(
    "NIDDK · Your kidneys and how they work",
    "https://www.niddk.nih.gov/health-information/kidney-disease/kidneys-how-they-work",
  ),
};

function selectedFieldNote(size: number): Pair {
  const scale =
    size >= 0.001
      ? [size * 1e3, "mm"]
      : size >= 1e-6
        ? [size * 1e6, "µm"]
        : [size * 1e9, "nm"];
  const value = Number(Number(scale[0]).toPrecision(4));
  return [
    `Selected field extent: ${value} ${scale[1]}. This is an illustrative sample window, not the size of the whole material or organ.`,
    `Dimension du champ choisi : ${String(value).replace(".", ",")} ${scale[1]}. C’est une fenêtre d’échantillonnage illustrative, pas la taille de toute la matière ou de l’organe.`,
  ];
}
function spatialRecord(
  id: string,
  parent: string,
  model: string,
  size: number,
  color: string,
  name: Pair,
  description: Pair,
  fact: Pair,
  sources: WorldSource[],
  spatialOnly = false,
) {
  add(
    id,
    parent,
    model,
    size,
    color,
    name,
    description,
    selectedFieldNote(size),
    fact,
    [
      "What does this closer view represent?",
      "Que représente cette vue rapprochée ?",
    ],
    description,
    sources,
    "sample",
  );
  if (spatialOnly) WORLD_NODES[id].spatialOnly = true;
}
function cloneContextTree(
  sourceId: string,
  id: string,
  parent: string,
): WorldNode {
  const source = WORLD_NODES[sourceId];
  const sourceChildren = [...source.children];
  copyNode(id, parent, sourceId);
  const copied = WORLD_NODES[id];
  copied.category = WORLD_NODES[parent].category;
  copied.spatialOnly = source.spatialOnly;
  copied.sources = [...source.sources];
  copied.facts = [...source.facts];
  for (const child of sourceChildren)
    cloneContextTree(child, id + "/" + child.split("/").pop(), id);
  if (source.defaultChild)
    copied.defaultChild = id + "/" + source.defaultChild.split("/").pop();
  return copied;
}
function waterContents(parent: string) {
  if (
    WORLD_NODES[parent].children.some(
      (id) => WORLD_NODES[id].model === "waterMolecule",
    )
  )
    return;
  cloneContextTree("water/liquid/molecule", parent + "/water", parent);
  WORLD_NODES[parent + "/water"].relation = "madeOf";
}
function proteinSample(
  parent: string,
  id = parent + "/protein",
  name: Pair = ["Protein fragment", "Fragment de protéine"],
  size = 8e-9,
) {
  if (WORLD_NODES[id]) return;
  spatialRecord(
    id,
    parent,
    "protein",
    size,
    "#b9a6ce",
    name,
    [
      "This selected polypeptide fragment illustrates a chain of amino-acid residues. Its fold and sequence are schematic; it does not identify a measured protein at this point.",
      "Ce fragment de polypeptide choisi illustre une chaîne de résidus d’acides aminés. Son repliement et sa séquence sont schématiques ; il n’identifie pas une protéine mesurée à cet endroit.",
    ],
    [
      "A protein is chemically bonded matter, not a miniature cell.",
      "Une protéine est de la matière liée chimiquement, pas une cellule miniature.",
    ],
    [SPATIAL_SOURCES.proteins],
  );
}
function livingCellSample(
  parent: string,
  id: string,
  name: Pair,
  description: Pair,
) {
  // These are generic teaching cells with their own biological ancestry, not
  // keratinocytes transplanted into every organ. The original DNA links survive.
  cloneContextTree("human/skin/cell", id, parent);
  const cell = WORLD_NODES[id];
  cell.name = b(name);
  cell.description = b(description);
  cell.sizeMeters = 20e-6;
  cell.sizeNote = b(selectedFieldNote(20e-6));
  cell.relation = "sample";
  cell.question = b([
    "Is every cell here identical?",
    "Toutes les cellules présentes ici sont-elles identiques ?",
  ]);
  cell.answer = b([
    "No. This is one selected living-cell example; real tissues contain several cell types and variable shapes.",
    "Non. C’est un exemple choisi de cellule vivante ; les tissus réels contiennent plusieurs types cellulaires et des formes variables.",
  ]);
  cell.facts = [
    b([
      "A living nucleated human cell contains DNA and organelles; this does not describe a mature red blood cell.",
      "Une cellule humaine vivante nucléée contient de l’ADN et des organites ; cela ne décrit pas un globule rouge mature.",
    ]),
  ];
  cell.sources = [S.cells, SPATIAL_SOURCES.cytosol];
}

// First fill existing molecular endpoints, so subsequent contextual clones
// inherit the same chemistry rather than ending at arbitrary model boundaries.
for (const node of Object.values(WORLD_NODES)) {
  if (node.model === "protein" || node.model === "ribosome") {
    if (node.model === "ribosome") {
      proteinSample(node.id);
      continue;
    }
    spatialRecord(
      node.id + "/residue",
      node.id,
      "aminoAcidResidue",
      0.7e-9,
      "#c9b7d4",
      ["Glycine residue example", "Exemple de résidu de glycine"],
      [
        "A glycine residue provides a simple example of a peptide backbone. Other amino-acid residues have different side chains; this is not a sequence assignment for the schematic parent protein.",
        "Un résidu de glycine fournit un exemple simple de squelette peptidique. Les autres résidus ont des chaînes latérales différentes ; ce n’est pas l’attribution d’une séquence à la protéine schématique parente.",
      ],
      [
        "A residue within a polypeptide differs from a free amino acid: peptide links continue beyond this sample.",
        "Un résidu dans un polypeptide diffère d’un acide aminé libre : les liaisons peptidiques continuent au-delà de cet échantillon.",
      ],
      [SPATIAL_SOURCES.proteins],
    );
    for (const element of ["C", "H", "N", "O"] as const)
      atomicBranch(
        node.id + "/residue/" + element.toLowerCase(),
        node.id + "/residue",
        ATOMS[element],
      );
  }
}

// Sparse phase/material samples are selectable by hits but do not add a row
// of fake miniature objects to the initial landscape or body.
spatialRecord(
  "world/soil",
  "world",
  "soil",
  0.035,
  "#8e7053",
  ["Soil sample", "Échantillon de sol"],
  [
    "This selected soil field contains a quartz-rich mineral fraction, organic material and water-filled or air-filled pores. Real soil composition varies greatly.",
    "Ce champ de sol choisi contient une fraction minérale riche en quartz, de la matière organique et des pores remplis d’eau ou d’air. La composition réelle du sol varie beaucoup.",
  ],
  [
    "Soil is a mixture and a habitat; it is not one giant molecule.",
    "Le sol est un mélange et un habitat ; ce n’est pas une molécule géante.",
  ],
  [SPATIAL_SOURCES.soil],
  true,
);
cloneContextTree("rock/quartz", "world/soil/quartz", "world/soil");
spatialRecord(
  "world/soil/organic",
  "world/soil",
  "polymer",
  5e-9,
  "#917757",
  ["Soil organic fragment", "Fragment organique du sol"],
  [
    "Soil organic matter contains many compounds from organisms and their transformations. This carbon-containing network is an example, not a unique humus molecule.",
    "La matière organique du sol contient de nombreux composés issus d’organismes et de leurs transformations. Ce réseau carboné est un exemple, pas une molécule unique d’humus.",
  ],
  [
    "Organic carbon abundance changes with soil conditions and land use.",
    "La quantité de carbone organique varie avec les conditions du sol et son usage.",
  ],
  [SPATIAL_SOURCES.soilCarbon],
);
atomicBranch("world/soil/organic/carbon", "world/soil/organic", ATOMS.C);
cloneContextTree("water/liquid", "world/soil/water", "world/soil");
cloneContextTree("cloud/air", "world/soil/air", "world/soil");
WORLD_NODES["world/soil/air"].name = b([
  "Air in soil pores",
  "Air dans les pores du sol",
]);
cloneContextTree("cloud/air", "world/air", "world").spatialOnly = true;
WORLD_NODES["world/air"].name = b([
  "Ambient air sample",
  "Échantillon d’air ambiant",
]);
cloneContextTree("water/liquid", "world/liquid-sample", "world").spatialOnly =
  true;
WORLD_NODES["world/liquid-sample"].name = b([
  "Local water sample",
  "Échantillon d’eau local",
]);
cloneContextTree("tree/wood", "world/table-wood", "world").spatialOnly = true;
WORLD_NODES["world/table-wood"].name = b([
  "Table wood sample",
  "Échantillon de bois de la table",
]);
WORLD_NODES["world/table-wood"].description = b([
  "A selected piece of worked wood retains plant cell-wall structure. This route explores the table material, independently of the living tree.",
  "Un morceau de bois travaillé conserve la structure des parois végétales. Ce parcours explore la matière de la table, indépendamment de l’arbre vivant.",
]);

spatialRecord(
  "rock/grains",
  "rock",
  "mineralGrains",
  0.02,
  "#bdb3a1",
  ["Quartz-rich grain field", "Champ de grains riche en quartz"],
  [
    "This selected field follows quartz grains in the example rock. It does not assert that every mineral in the whole rock is quartz.",
    "Ce champ choisi suit des grains de quartz dans la roche d’exemple. Il ne suppose pas que tous les minéraux de la roche entière sont du quartz.",
  ],
  [
    "A material sample and a complete inventory of minerals are different things.",
    "Un échantillon de matière et un inventaire complet des minéraux sont deux choses différentes.",
  ],
  [S.rocks, S.quartz],
  true,
);
cloneContextTree("rock/quartz", "rock/grains/quartz", "rock/grains");

spatialRecord(
  "water/glass",
  "water",
  "glassSample",
  0.002,
  "#b7d9df",
  ["Glass wall sample", "Échantillon de paroi de verre"],
  [
    "This is the solid glass wall, separate from the liquid water. Ordinary drinking glasses are commonly modified silicate glasses; the next diagram focuses on their silicon–oxygen framework.",
    "Il s’agit de la paroi solide en verre, distincte de l’eau liquide. Les verres à boire sont souvent des verres silicatés modifiés ; le schéma suivant se concentre sur leur réseau silicium-oxygène.",
  ],
  [
    "Glass is not a liquid-water layer. Its solid network has no quartz-like long-range periodicity.",
    "Le verre n’est pas une couche d’eau liquide. Son réseau solide n’a pas la périodicité à longue distance du quartz.",
  ],
  [SPATIAL_SOURCES.glass],
  true,
);
spatialRecord(
  "water/glass/network",
  "water/glass",
  "glassNetwork",
  1.8e-9,
  "#bac9dd",
  ["Silicate-glass connectivity", "Connexions du verre silicaté"],
  [
    "This distorted Si–O scaffold illustrates local network connectivity without crystalline repetition. Positions are explanatory, not a measured amorphous structure; modifier ions and defects are omitted.",
    "Cet assemblage Si–O déformé illustre les connexions locales sans répétition cristalline. Les positions sont explicatives, pas une structure amorphe mesurée ; les ions modificateurs et défauts sont omis.",
  ],
  [
    "A silicon–oxygen framework does not make glass a collection of free SiO₂ molecules.",
    "Un réseau silicium-oxygène ne fait pas du verre une collection de molécules SiO₂ libres.",
  ],
  [SPATIAL_SOURCES.glass],
);
atomicBranch("water/glass/network/silicon", "water/glass/network", ATOMS.Si);
atomicBranch("water/glass/network/oxygen", "water/glass/network", ATOMS.O);

// Region-selected vessel examples intentionally do not claim the clicked
// background vessel is the named cephalic specimen.
for (const [id, model, name] of [
  [
    "human/vein-sample",
    "vein",
    ["Venous wall sample", "Échantillon de paroi veineuse"],
  ],
  [
    "human/artery-sample",
    "artery",
    ["Arterial wall sample", "Échantillon de paroi artérielle"],
  ],
] as const) {
  spatialRecord(
    id,
    "human",
    model,
    0.04,
    model === "artery" ? "#b96e73" : "#7287b2",
    name,
    [
      "A schematic four-centimeter vessel section samples this region. The lumen contains blood; the vessel wall contains living tissue. This is not the identification of a named individual vessel.",
      "Un segment vasculaire schématique de quatre centimètres échantillonne cette région. La lumière contient du sang ; la paroi contient des tissus vivants. Ce n’est pas l’identification d’un vaisseau individuel nommé.",
    ],
    model === "artery"
      ? [
          "Arteries carry blood away from the heart; this does not always mean oxygen-rich blood.",
          "Les artères conduisent le sang depuis le cœur ; cela ne signifie pas toujours un sang riche en oxygène.",
        ]
      : [
          "Veins return blood toward the heart; venous blood is red, not blue.",
          "Les veines ramènent le sang vers le cœur ; le sang veineux est rouge, pas bleu.",
        ],
    [S.vessels],
    true,
  );
  cloneContextTree("human/vein/blood", id + "/blood", id);
}
cloneContextTree("human/muscle", "human/muscle-sample", "human").spatialOnly =
  true;
WORLD_NODES["human/muscle-sample"].model = "muscle";
WORLD_NODES["human/muscle-sample"].sizeMeters = 0.01;
WORLD_NODES["human/muscle-sample"].sizeNote = b(selectedFieldNote(0.01));
WORLD_NODES["human/muscle-sample"].name = b([
  "Skeletal muscle sample",
  "Échantillon de muscle squelettique",
]);
WORLD_NODES["human/muscle-sample"].description = b([
  "A selected local muscle sample leads to a fiber and its contractile structures. Its procedural shape is not a reconstruction of an identified named muscle.",
  "Un échantillon musculaire local choisi mène à une fibre et à ses structures contractiles. Sa forme procédurale ne reconstruit pas un muscle nommé identifié.",
]);
WORLD_NODES["human/muscle-sample"].sources = [S.muscle, S.contraction];

for (const [organ, name, cellName, description] of [
  [
    "liver",
    ["Liver tissue sample", "Échantillon de tissu hépatique"],
    ["Hepatocyte example", "Exemple d’hépatocyte"],
    [
      "This selected liver-cell example represents living hepatocyte material. Liver tissue also contains vessels, ducts and other cell types.",
      "Cet exemple de cellule hépatique représente la matière vivante d’un hépatocyte. Le foie contient aussi des vaisseaux, des canaux et d’autres types cellulaires.",
    ],
  ],
  [
    "kidneys",
    ["Renal tissue sample", "Échantillon de tissu rénal"],
    ["Renal tubular cell example", "Exemple de cellule tubulaire rénale"],
    [
      "This example selects a living renal tubular epithelial cell. It is not a whole nephron or a spatial claim that every point of a kidney belongs to one tubule.",
      "Cet exemple sélectionne une cellule épithéliale tubulaire rénale vivante. Ce n’est pas un néphron entier ni l’affirmation que chaque point d’un rein appartient à un tubule.",
    ],
  ],
  [
    "stomach",
    ["Stomach lining sample", "Échantillon de muqueuse gastrique"],
    [
      "Gastric epithelial cell example",
      "Exemple de cellule épithéliale gastrique",
    ],
    [
      "This selected living epithelial cell belongs to a teaching sample of the stomach lining. The model does not resolve a measured gland or assign acid production to every epithelial cell.",
      "Cette cellule épithéliale vivante choisie appartient à un échantillon pédagogique de muqueuse gastrique. Le modèle ne résout pas une glande mesurée et n’attribue pas la production d’acide à toutes les cellules épithéliales.",
    ],
  ],
  [
    "intestines",
    ["Intestinal lining sample", "Échantillon de muqueuse intestinale"],
    [
      "Intestinal epithelial cell example",
      "Exemple de cellule épithéliale intestinale",
    ],
    [
      "This selected epithelial-cell example introduces living intestinal material. Cell types and their functions differ between the small intestine and colon.",
      "Cet exemple de cellule épithéliale introduit la matière intestinale vivante. Les types cellulaires et leurs fonctions diffèrent entre intestin grêle et côlon.",
    ],
  ],
] as const) {
  const id = "human/" + organ + "/tissue";
  spatialRecord(
    id,
    "human/" + organ,
    "tissue",
    0.00015,
    "#caa0a0",
    name,
    description,
    [
      "This microscopic field is a separate teaching sample, not histology reconstructed from the outer anatomical mesh.",
      "Ce champ microscopique est un échantillon pédagogique distinct, pas une histologie reconstruite depuis le maillage anatomique externe.",
    ],
    [
      S.cells,
      organ === "kidneys" ? SPATIAL_SOURCES.kidneys : SPATIAL_SOURCES.liver,
    ],
  );
  livingCellSample(id, id + "/cell", cellName, description);
}

spatialRecord(
  "human/bone-sample",
  "human",
  "boneTissue",
  0.0003,
  "#d9c7a5",
  ["Cortical bone tissue sample", "Échantillon de tissu osseux cortical"],
  [
    "A selected cortical field shows concentric matrix lamellae around a canal and small osteocyte locations. It does not depict every bone region; spongy bone is organized differently.",
    "Un champ cortical choisi montre des lamelles matricielles concentriques autour d’un canal et de petits emplacements d’ostéocytes. Il ne représente pas toutes les régions osseuses ; l’os spongieux est organisé autrement.",
  ],
  [
    "Bone combines living cells, collagen-rich organic matrix and mineral.",
    "L’os associe cellules vivantes, matrice organique riche en collagène et minéral.",
  ],
  [SPATIAL_SOURCES.bone],
  true,
);
livingCellSample(
  "human/bone-sample",
  "human/bone-sample/cell",
  ["Osteocyte cell-body example", "Exemple de corps cellulaire d’ostéocyte"],
  [
    "This selected living bone-cell body contains a nucleus and organelles. Real osteocytes extend long processes through canaliculi, omitted from this generic cell view.",
    "Ce corps cellulaire osseux vivant choisi contient un noyau et des organites. Les vrais ostéocytes étendent de longs prolongements dans des canalicules, omis de cette vue cellulaire générique.",
  ],
);
spatialRecord(
  "human/bone-sample/matrix",
  "human/bone-sample",
  "boneMatrix",
  100e-9,
  "#c6b792",
  ["Mineralized bone matrix", "Matrice osseuse minéralisée"],
  [
    "This selected nanoscale field separates collagen-rich organic strands and calcium-phosphate mineral plates. Their packing and colors are schematic.",
    "Ce champ nanométrique choisi distingue des filaments organiques riches en collagène et des plaquettes minérales de phosphate de calcium. Leur organisation et leurs couleurs sont schématiques.",
  ],
  [
    "Bone mineral is not quartz. Biological apatite also contains substitutions and imperfections.",
    "Le minéral osseux n’est pas du quartz. L’apatite biologique contient aussi des substitutions et imperfections.",
  ],
  [SPATIAL_SOURCES.bone, SPATIAL_SOURCES.apatite],
);
proteinSample("human/bone-sample/matrix", "human/bone-sample/matrix/collagen", [
  "Collagen peptide fragment",
  "Fragment peptidique de collagène",
]);
spatialRecord(
  "human/bone-sample/matrix/apatite",
  "human/bone-sample/matrix",
  "apatite",
  1e-9,
  "#a9bec7",
  ["Hydroxyapatite composition motif", "Motif de composition d’hydroxyapatite"],
  [
    "The diagram counts a Ca₁₀(PO₄)₆(OH)₂ composition motif. Its positions are illustrative, not an experimental crystal unit cell or a free molecule; biological bone apatite is chemically less ideal.",
    "Le schéma compte un motif de composition Ca₁₀(PO₄)₆(OH)₂. Ses positions sont illustratives, pas une maille cristalline expérimentale ni une molécule libre ; l’apatite osseuse biologique est chimiquement moins idéale.",
  ],
  [
    "Calcium and phosphate help mineralize a collagen-containing matrix.",
    "Le calcium et le phosphate contribuent à minéraliser une matrice contenant du collagène.",
  ],
  [SPATIAL_SOURCES.apatite],
);
for (const e of ["Ca", "P", "O", "H"] as const)
  atomicBranch(
    "human/bone-sample/matrix/apatite/" + e.toLowerCase(),
    "human/bone-sample/matrix/apatite",
    ATOMS[e],
  );
cloneContextTree(
  "human/vein/blood",
  "human/bone-sample/blood",
  "human/bone-sample",
).spatialOnly = true;
cloneContextTree(
  "human/bone-sample",
  "human/femur/tissue",
  "human/femur",
).spatialOnly = false;

// Vessel walls select an endothelial-tissue example only when their surface
// is hit; the lumen retains its independent blood sample.
for (const node of Object.values(WORLD_NODES))
  if (
    ["vein", "artery", "capillary"].includes(node.model) &&
    node.id !== "human/vein"
  ) {
    const id = node.id + "/wall";
    if (node.model === "capillary") {
      cloneContextTree(RBC + "/membrane", id, node.id).spatialOnly = true;
      WORLD_NODES[id].name = b([
        "Endothelial membrane patch",
        "Fragment de membrane endothéliale",
      ]);
      WORLD_NODES[id].description = b([
        "This molecular patch samples an endothelial cell membrane beside the capillary lumen; it does not depict a complete endothelial cell or the entire capillary wall.",
        "Ce fragment moléculaire échantillonne une membrane de cellule endothéliale près de la lumière capillaire ; il ne représente ni une cellule endothéliale complète ni toute la paroi capillaire.",
      ]);
      continue;
    }
    spatialRecord(
      id,
      node.id,
      "tissue",
      0.0001,
      "#ccaaa5",
      ["Vessel wall tissue sample", "Échantillon de tissu de paroi vasculaire"],
      [
        "This selected field approaches the living endothelial lining. Larger vessel walls also contain connective tissue and variable amounts of smooth muscle.",
        "Ce champ choisi approche le revêtement endothélial vivant. Les parois des gros vaisseaux contiennent aussi du tissu conjonctif et une quantité variable de muscle lisse.",
      ],
      [
        "Endothelium is the cell lining; blood occupies the lumen beside it.",
        "L’endothélium est le revêtement cellulaire ; le sang occupe la lumière à côté.",
      ],
      [S.vessels],
      true,
    );
    livingCellSample(
      id,
      id + "/cell",
      ["Endothelial cell example", "Exemple de cellule endothéliale"],
      [
        "A living endothelial cell lines a blood vessel. This generic organelle diagram does not reproduce its thin, flattened shape.",
        "Une cellule endothéliale vivante borde un vaisseau sanguin. Ce schéma générique d’organites ne reproduit pas sa forme fine et aplatie.",
      ],
    );
  }

// Add a root epidermal sample without turning a plant root hair into a fungus.
cloneContextTree("tree/leaf/cell", "tree/root/cell", "tree/root").spatialOnly =
  true;
const rootCell = WORLD_NODES["tree/root/cell"];
rootCell.model = "rootCell";
rootCell.question = b([
  "Does this root cell photosynthesize?",
  "Cette cellule racinaire photosynthétise-t-elle ?",
]);
rootCell.answer = b([
  "This selected non-photosynthetic root epidermal cell has no chloroplasts. It still respires using mitochondria.",
  "Cette cellule épidermique racinaire non photosynthétique ne possède pas de chloroplastes. Elle respire néanmoins grâce aux mitochondries.",
]);
rootCell.name = b([
  "Root epidermal cell example",
  "Exemple de cellule épidermique racinaire",
]);
rootCell.description = b([
  "A living root epidermal cell has a wall, nucleus, mitochondria and a vacuole. This non-photosynthetic example has no chloroplast branch.",
  "Une cellule épidermique racinaire vivante possède une paroi, un noyau, des mitochondries et une vacuole. Cet exemple non photosynthétique n’a pas de branche chloroplaste.",
]);
// Remove the copied photosynthetic branch completely, not just its menu row.
for (const id of [...rootCell.children])
  if (WORLD_NODES[id].model === "chloroplast") {
    const remove = (part: string) => {
      for (const child of WORLD_NODES[part].children) remove(child);
      delete WORLD_NODES[part];
    };
    remove(id);
    rootCell.children = rootCell.children.filter((child) => child !== id);
  }
rootCell.defaultChild = rootCell.children.find(
  (id) => WORLD_NODES[id].model === "cellNucleus",
);
rootCell.facts = [
  b([
    "Root cells can respire without photosynthesizing.",
    "Les cellules racinaires peuvent respirer sans photosynthétiser.",
  ]),
];
rootCell.sources = [S.roots, S.cells];

// A ground grass blade is its own botanical context, not a sample of the tree.
cloneContextTree("tree/leaf", "world/grass", "world").spatialOnly = true;
WORLD_NODES["world/grass"].name = b([
  "Grass leaf sample",
  "Échantillon de feuille d’herbe",
]);
WORLD_NODES["world/grass"].sizeMeters = 0.035;
WORLD_NODES["world/grass"].sizeNote = b(selectedFieldNote(0.035));
WORLD_NODES["world/grass"].description = b([
  "A selected leaf sample represents living grass tissue. The stylized blade is a teaching surface, not an identified grass species or a leaf from the tree.",
  "Un échantillon de feuille représente un tissu d’herbe vivant. Le limbe stylisé est une surface pédagogique, pas une espèce de graminée identifiée ni une feuille de l’arbre.",
]);
WORLD_NODES["world/grass"].sources = [S.plant];

// Enrich all living-cell contexts after cloning, keeping their own local IDs.
for (const node of Object.values(WORLD_NODES)) {
  if (
    ["cell", "whiteBloodCell", "plantCell", "rootCell", "platelet"].includes(
      node.model,
    )
  ) {
    if (!node.children.some((id) => WORLD_NODES[id].model === "membrane"))
      cloneContextTree(
        RBC + "/membrane",
        node.id + "/membrane",
        node.id,
      ).spatialOnly = true;
    spatialRecord(
      node.id + "/cytoplasm",
      node.id,
      "cytoplasm",
      60e-9,
      "#9dc5ca",
      ["Cytosolic sample", "Échantillon cytosolique"],
      [
        "A selected region of the aqueous cytosol contains dissolved substances and proteins. This is the fluid phase between organelles, not a sample that turns every location into a nucleus.",
        "Une région choisie du cytosol aqueux contient des substances dissoutes et des protéines. Il s’agit de la phase fluide entre les organites, pas d’un échantillon qui transforme chaque endroit en noyau.",
      ],
      [
        "Cytoplasm includes cytosol and cellular structures outside the nucleus.",
        "Le cytoplasme comprend le cytosol et les structures cellulaires hors du noyau.",
      ],
      [SPATIAL_SOURCES.cytosol],
      true,
    );
    waterContents(node.id + "/cytoplasm");
    proteinSample(node.id + "/cytoplasm");
    if (node.model === "plantCell" || node.model === "rootCell") {
      cloneContextTree(
        "tree/wood/xylem/wall",
        node.id + "/wall",
        node.id,
      ).spatialOnly = true;
      WORLD_NODES[node.id + "/wall"].name = b([
        "Plant wall material sample",
        "Échantillon de matière de paroi végétale",
      ]);
      WORLD_NODES[node.id + "/wall"].description = b([
        "This cellulose-rich wall sample illustrates a plant wall. Primary walls of living cells are not assumed to have the same lignification as wood.",
        "Cet échantillon de paroi riche en cellulose illustre une paroi végétale. Les parois primaires des cellules vivantes ne sont pas supposées avoir la même lignification que le bois.",
      ]);
      const lignin = node.id + "/wall/lignin";
      if (WORLD_NODES[lignin]) {
        WORLD_NODES[node.id + "/wall"].children = WORLD_NODES[
          node.id + "/wall"
        ].children.filter((id) => id !== lignin);
        delete WORLD_NODES[lignin];
      }
      cloneContextTree(
        "water/liquid",
        node.id + "/vacuole",
        node.id,
      ).spatialOnly = true;
      WORLD_NODES[node.id + "/vacuole"].name = b([
        "Vacuolar fluid sample",
        "Échantillon de liquide vacuolaire",
      ]);
      WORLD_NODES[node.id + "/vacuole"].description = b([
        "A selected aqueous sample inside a plant vacuole. Vacuolar sap contains solutes; this route follows its water component.",
        "Un échantillon aqueux choisi dans une vacuole végétale. Le suc vacuolaire contient des solutés ; ce parcours suit sa composante eau.",
      ]);
    }
  }
  if (node.model === "cellNucleus") {
    cloneContextTree(
      RBC + "/membrane",
      node.id + "/envelope",
      node.id,
    ).spatialOnly = true;
    WORLD_NODES[node.id + "/envelope"].name = b([
      "Nuclear membrane patch",
      "Fragment de membrane nucléaire",
    ]);
    WORLD_NODES[node.id + "/envelope"].description = b([
      "This selects one membrane of the double nuclear envelope. The diagram does not claim that the envelope is only one bilayer.",
      "Ce fragment sélectionne une membrane de la double enveloppe nucléaire. Le schéma ne prétend pas que cette enveloppe ne contient qu’une bicouche.",
    ]);
    spatialRecord(
      node.id + "/fluid",
      node.id,
      "nucleoplasm",
      60e-9,
      "#a6b7cc",
      ["Nucleoplasmic fluid sample", "Échantillon de liquide nucléoplasmique"],
      [
        "This aqueous region between nuclear structures contains proteins and solutes. Chromatin is explored through its own visible strands.",
        "Cette région aqueuse entre les structures nucléaires contient des protéines et des solutés. La chromatine s’explore par ses propres filaments visibles.",
      ],
      [
        "Nucleoplasm is not an atomic nucleus.",
        "Le nucléoplasme n’est pas un noyau atomique.",
      ],
      [SPATIAL_SOURCES.cytosol],
      true,
    );
    waterContents(node.id + "/fluid");
    proteinSample(node.id + "/fluid");
  }
  if (node.model === "droplet") waterContents(node.id);
  if (node.model === "nitrogen" && !node.children.length)
    atomicBranch(node.id + "/nitrogen", node.id, ATOMS.N);
  if (node.model === "oxygen" && !node.children.length)
    atomicBranch(node.id + "/oxygen", node.id, ATOMS.O);
}

// Finish visible biological and chemical regions before filling peptide endpoints.
for (const node of Object.values(WORLD_NODES)) {
  if (node.model === "hemoglobin")
    proteinSample(
      node.id,
      node.id + "/globin",
      ["Globin-chain sample", "Échantillon de chaîne de globine"],
      4e-9,
    );
  if (node.model === "membrane") {
    if (!node.children.some((id) => WORLD_NODES[id].model === "protein"))
      proteinSample(node.id);
    if (
      WORLD_NODES[node.parent || ""]?.model !== "redBloodCell" &&
      !node.id.endsWith("/envelope") &&
      !node.id.endsWith("/wall")
    )
      node.description = b([
        "A selected lipid bilayer patch contains embedded proteins. Lipid and protein composition vary with the cell and membrane; this is not a red-cell-specific protein skeleton.",
        "Un fragment choisi de bicouche lipidique contient des protéines insérées. La composition lipidique et protéique dépend de la cellule et de la membrane ; il ne s’agit pas d’un squelette protéique propre au globule rouge.",
      ]);
  }
  if (node.model === "hair")
    proteinSample(node.id, node.id + "/keratin", [
      "Keratin peptide fragment",
      "Fragment peptidique de kératine",
    ]);
  if (node.model === "mitochondrion") {
    node.answer = b([
      "This mitochondrion belongs to the selected living eukaryotic cell. Mature human red blood cells contain no mitochondria.",
      "Cette mitochondrie appartient à la cellule eucaryote vivante sélectionnée. Les globules rouges humains matures ne contiennent pas de mitochondries.",
    ]);
    cloneContextTree(
      RBC + "/membrane",
      node.id + "/membrane",
      node.id,
    ).spatialOnly = true;
    WORLD_NODES[node.id + "/membrane"].description = b([
      "This patch samples one mitochondrial membrane. The inner membrane folds into cristae; the outer membrane is distinct.",
      "Ce fragment échantillonne une membrane mitochondriale. La membrane interne se replie en crêtes ; la membrane externe est distincte.",
    ]);
    proteinSample(node.id + "/membrane");
    cloneContextTree(DNA, node.id + "/dna", node.id).spatialOnly = true;
    WORLD_NODES[node.id + "/dna"].name = b([
      "Mitochondrial DNA segment",
      "Segment d’ADN mitochondrial",
    ]);
    WORLD_NODES[node.id + "/dna"].description = b([
      "A short double-helix segment samples mitochondrial DNA. It is not a complete mitochondrial genome or a nuclear chromosome; its illustrative sequence is unspecified.",
      "Un court segment de double hélice échantillonne l’ADN mitochondrial. Ce n’est ni un génome mitochondrial complet ni un chromosome nucléaire ; sa séquence illustrative n’est pas spécifiée.",
    ]);
  }
  if (
    node.model === "nucleotide" &&
    !node.children.some((id) => WORLD_NODES[id].atomic?.atomicNumber === 8)
  )
    atomicBranch(node.id + "/oxygen", node.id, ATOMS.O);
  if (node.model === "polymer" && !node.children.length)
    atomicBranch(node.id + "/carbon", node.id, ATOMS.C);
}
// Generic skeletal tissue must not inherit the named biceps specimen's answer.
const muscleSample = WORLD_NODES["human/muscle-sample"];
muscleSample.question = b([
  "Is this a named muscle reconstruction?",
  "Est-ce la reconstruction d’un muscle nommé ?",
]);
muscleSample.answer = muscleSample.description;
muscleSample.facts = [
  b([
    "Skeletal muscle contains long multinucleated fibers with repeating contractile units.",
    "Le muscle squelettique contient de longues fibres multinucléées et des unités contractiles répétées.",
  ]),
];

// Protein fragments introduced above receive the same peptide-residue route.
for (const node of Object.values(WORLD_NODES))
  if (node.model === "protein" && !node.children.length) {
    const template = "human/muscle/fiber/sarcomere/actin/residue";
    cloneContextTree(template, node.id + "/residue", node.id);
  }
for (const node of Object.values(WORLD_NODES))
  if (node.model === "phospholipid" && !node.children.length) {
    spatialRecord(
      node.id + "/tail",
      node.id,
      "hydrocarbon",
      1.2e-9,
      "#c9bb92",
      ["Hydrocarbon-tail segment", "Segment de queue hydrocarbonée"],
      [
        "This short saturated chain excerpt samples a phospholipid tail. Tail length and unsaturation vary, and the phosphate-containing head is a different region.",
        "Ce court extrait de chaîne saturée échantillonne une queue de phospholipide. La longueur et l’insaturation varient ; la tête contenant du phosphate est une autre région.",
      ],
      [
        "A tail excerpt does not represent all atoms in a complete phospholipid.",
        "Un extrait de queue ne représente pas tous les atomes d’un phospholipide complet.",
      ],
      [S.lipids],
    );
    atomicBranch(node.id + "/tail/carbon", node.id + "/tail", ATOMS.C);
    atomicBranch(node.id + "/tail/hydrogen", node.id + "/tail", ATOMS.H);
  }

// A wall's hydrated matrix is a separate material from its reinforcing fibers.
// This does not infer pectin in fungi or identify every plant matrix as lignin.
for (const wall of Object.values(WORLD_NODES)) {
  if (
    wall.model !== "cellWall" ||
    wall.children.some((id) => WORLD_NODES[id].model === "polymer")
  )
    continue;
  const fungal = wall.children.some((id) => WORLD_NODES[id].model === "chitin");
  const id = wall.id + "/matrix";
  spatialRecord(
    id,
    wall.id,
    "polymer",
    10e-9,
    fungal ? "#b7a47e" : "#b6be87",
    fungal
      ? [
          "Fungal wall matrix sample",
          "Échantillon de matrice de paroi fongique",
        ]
      : [
          "Plant wall matrix sample",
          "Échantillon de matrice de paroi végétale",
        ],
    fungal
      ? [
          "This selected heterogeneous wall matrix represents glucans and other non-chitin polymers, including mannose-containing components found in many fungi. Composition and organization vary by species; this is not a measured reconstruction of the displayed mushroom.",
          "Cette matrice hétérogène choisie représente des glucanes et d’autres polymères distincts de la chitine, dont des composants contenant du mannose présents chez de nombreux champignons. Composition et organisation varient selon l’espèce ; ce n’est pas une reconstruction mesurée du champignon affiché.",
        ]
      : [
          "This selected primary-wall matrix represents non-cellulosic polysaccharides, including pectins and hemicelluloses. Their proportions and structures vary among cells and plant groups, including grasses; it is not a pure cellulose fiber or a lignin sample.",
          "Cette matrice de paroi primaire choisie représente des polysaccharides non cellulosiques, dont des pectines et des hémicelluloses. Leurs proportions et structures varient selon les cellules et les groupes végétaux, dont les graminées ; ce n’est ni une fibre de cellulose pure ni un échantillon de lignine.",
        ],
    [
      "The schematic polymer network and its selected carbon and oxygen markers show elemental composition, not a measured sequence, stoichiometry, bond geometry or molecular inventory. Zooming does not chemically separate free atoms.",
      "Le réseau polymérique schématique et ses marqueurs choisis de carbone et d’oxygène montrent la composition élémentaire, pas une séquence, une stœchiométrie, une géométrie de liaison ou un inventaire moléculaire mesurés. Zoomer ne sépare pas chimiquement des atomes libres.",
    ],
    [
      fungal
        ? SPATIAL_SOURCES.fungalWallMatrix
        : SPATIAL_SOURCES.plantWallMatrix,
    ],
  );
  atomicBranch(id + "/carbon", id, ATOMS.C);
  atomicBranch(id + "/oxygen", id, ATOMS.O);
}
// Existing lignin/organic-polymer examples also contain oxygen; direct picks
// distinguish element identity instead of ambiguously selecting any atom child.
for (const node of Object.values(WORLD_NODES)) {
  if (node.model !== "polymer") continue;
  if (!node.children.some((id) => WORLD_NODES[id].atomic?.atomicNumber === 8))
    atomicBranch(node.id + "/oxygen", node.id, ATOMS.O);
}

export function worldPath(id: string): string[] {
  const path: string[] = [];
  for (
    let node = WORLD_NODES[id];
    node;
    node = node.parent ? WORLD_NODES[node.parent] : undefined!
  )
    path.unshift(node.id);
  return path;
}

export const WORLD_JOURNEYS: WorldJourney[] = [
  {
    id: "red-cell",
    title: b([
      "What is a red cell made of?",
      "De quoi est fait un globule rouge ?",
    ]),
    question: b([
      "Follow oxygen’s carrier to the iron at its center.",
      "Suivez le transporteur d’oxygène jusqu’à son fer central.",
    ]),
    path: worldPath(RBC + "/hemoglobin/heme/iron"),
    answer: b([
      "A mature red cell contains hemoglobin; each hemoglobin has four hemes with iron centers. It contains no nucleus or mitochondrial DNA.",
      "Un globule rouge mature contient de l’hémoglobine ; chacune possède quatre hèmes avec un centre de fer. Il n’a ni noyau ni ADN mitochondrial.",
    ]),
  },
  {
    id: "dna",
    title: b(["Find the body’s DNA", "Retrouvez l’ADN du corps"]),
    question: b([
      "Choose the right blood cell, then unwrap chromatin.",
      "Choisissez le bon globule, puis déroulez la chromatine.",
    ]),
    path: worldPath(DNA + "/nucleotide"),
    answer: b([
      "A white cell retains a nucleus. Chromatin contains nucleosomes, whose histones bind DNA made of linked nucleotides.",
      "Un globule blanc garde son noyau. Sa chromatine contient des nucléosomes dont les histones lient l’ADN formé de nucléotides reliés.",
    ]),
  },
  {
    id: "wood",
    title: b(["Inside a piece of wood", "À l’intérieur du bois"]),
    question: b([
      "What makes a tree stand upright?",
      "Qu’est-ce qui permet à l’arbre de tenir debout ?",
    ]),
    path: worldPath(CELLULOSE + "/residue/carbon"),
    answer: b([
      "Wood walls combine cellulose reinforcement with a matrix containing lignin and hemicelluloses; cellulose is made of linked glucose-derived residues.",
      "Les parois du bois associent des renforts de cellulose à une matrice de lignine et d’hémicelluloses ; la cellulose contient des résidus dérivés du glucose liés.",
    ]),
  },
  {
    id: "leaf",
    title: b(["Follow the green", "Suivez le vert"]),
    question: b([
      "Where does a leaf capture light?",
      "Où la feuille capte-t-elle la lumière ?",
    ]),
    path: worldPath(CHLOROPHYLL + "/magnesium"),
    answer: b([
      "Chlorophyll in thylakoid pigment–protein complexes absorbs light; chlorophyll’s ring coordinates magnesium.",
      "La chlorophylle des complexes pigments-protéines thylakoïdiens absorbe la lumière ; son anneau coordonne le magnésium.",
    ]),
  },
  {
    id: "water-quark",
    title: b(["A glass, all the way down", "Un verre, jusqu’au bout"]),
    question: b([
      "How far can we explore a water molecule?",
      "Jusqu’où explorer une molécule d’eau ?",
    ]),
    path: worldPath("water/liquid/molecule/oxygen/nucleus/proton/quark"),
    answer: b([
      "Water contains oxygen atoms; oxygen nuclei contain protons; their valence structure includes quarks. No smaller quark constituents are established.",
      "L’eau contient des atomes d’oxygène ; leurs noyaux contiennent des protons, dont la structure de valence comprend des quarks. Aucun constituant plus petit du quark n’est établi.",
    ]),
  },
  {
    id: "cloud",
    title: b(["Touch a cloud", "Touchez un nuage"]),
    question: b([
      "Is the white cloud made of invisible vapor?",
      "Le nuage blanc est-il fait de vapeur invisible ?",
    ]),
    path: worldPath("cloud/droplet/molecule"),
    answer: b([
      "The visible particles are droplets or ice, dispersed in air. Water vapor itself is invisible.",
      "Les particules visibles sont des gouttelettes ou de la glace dispersées dans l’air. La vapeur d’eau elle-même est invisible.",
    ]),
  },
  {
    id: "quartz",
    title: b([
      "A crystal without little molecules",
      "Un cristal sans petites molécules",
    ]),
    question: b([
      "Why is quartz different from water?",
      "Pourquoi le quartz diffère-t-il de l’eau ?",
    ]),
    path: worldPath("rock/quartz/network/silicon/nucleus"),
    answer: b([
      "Quartz is an extended silicon–oxygen network. SiO₂ gives its atom ratio, not a separate molecule inside the crystal.",
      "Le quartz est un réseau continu silicium-oxygène. SiO₂ donne son rapport atomique, pas une molécule séparée dans le cristal.",
    ]),
  },
  {
    id: "muscle",
    title: b(["What moves a muscle?", "Qu’est-ce qui fait bouger un muscle ?"]),
    question: b([
      "Watch the organization behind contraction.",
      "Découvrez l’organisation derrière la contraction.",
    ]),
    path: worldPath("human/muscle/fiber/sarcomere/actin"),
    answer: b([
      "Repeated sarcomeres shorten as protein filaments slide and overlap more. The filaments themselves do not shrink.",
      "Les sarcomères répétés se raccourcissent quand les filaments glissent et se recouvrent davantage. Les filaments eux-mêmes ne rétrécissent pas.",
    ]),
  },
  {
    id: "fungus",
    title: b(["The hidden fungal network", "Le réseau fongique caché"]),
    question: b([
      "What do a mushroom and an insect have in common?",
      "Quel point commun entre un champignon et un insecte ?",
    ]),
    path: worldPath("mushroom/hypha/wall/chitin"),
    answer: b([
      "Both can use chitin as a structural polymer, in different biological structures.",
      "Tous deux peuvent utiliser la chitine comme polymère structural, dans des structures biologiques différentes.",
    ]),
  },
];

export const WORLD_QUIZZES: WorldQuiz[] = [
  {
    id: "rbc-nucleus",
    node: RBC,
    question: b([
      "Where is this mature human red cell’s nucleus?",
      "Où est le noyau de ce globule rouge humain mature ?",
    ]),
    options: [
      b(["It no longer has one", "Il n’en a plus"]),
      b(["Inside a heme group", "Dans un groupe hème"]),
      b(["Inside every hemoglobin", "Dans chaque hémoglobine"]),
    ],
    correct: 0,
    explanation: b([
      "Its nucleus was expelled during maturation. Explore a white cell to find nuclear DNA.",
      "Son noyau a été expulsé pendant sa maturation. Explorez un globule blanc pour trouver l’ADN nucléaire.",
    ]),
  },
  {
    id: "vein-direction",
    node: "human/vein",
    question: b(["What defines a vein?", "Qu’est-ce qui définit une veine ?"]),
    options: [
      b([
        "It always contains blue blood",
        "Elle contient toujours du sang bleu",
      ]),
      b([
        "It carries blood toward the heart",
        "Elle conduit le sang vers le cœur",
      ]),
      b(["It always lacks oxygen", "Elle ne contient jamais d’oxygène"]),
    ],
    correct: 1,
    explanation: b([
      "Direction defines veins. Pulmonary veins carry oxygen-rich blood; blood is never naturally blue.",
      "Le sens de circulation définit les veines. Les veines pulmonaires transportent un sang riche en oxygène ; le sang n’est jamais naturellement bleu.",
    ]),
  },
  {
    id: "heme-metal",
    node: RBC + "/hemoglobin/heme",
    question: b([
      "Which metal center binds oxygen in heme?",
      "Quel centre métallique lie l’oxygène dans l’hème ?",
    ]),
    options: [
      b(["Magnesium", "Magnésium"]),
      b(["Silicon", "Silicium"]),
      b(["Iron", "Fer"]),
    ],
    correct: 2,
    explanation: b([
      "Heme contains iron. Chlorophyll’s central metal is magnesium, a useful comparison across the two branches.",
      "L’hème contient du fer. Le métal central de la chlorophylle est le magnésium : une comparaison utile entre ces branches.",
    ]),
  },
  {
    id: "dna-backbone",
    node: DNA,
    question: b([
      "What forms DNA’s repeating backbone?",
      "Qu’est-ce qui forme le squelette répétitif de l’ADN ?",
    ]),
    options: [
      b(["Sugar and phosphate", "Sucre et phosphate"]),
      b(["Iron and oxygen", "Fer et oxygène"]),
      b(["Only paired bases", "Seulement les bases appariées"]),
    ],
    correct: 0,
    explanation: b([
      "Deoxyribose and phosphate form the backbone; the bases project inward and pair between strands.",
      "Désoxyribose et phosphate forment le squelette ; les bases se dirigent vers l’intérieur et s’apparient entre les brins.",
    ]),
  },
  {
    id: "cellulose-residue",
    node: CELLULOSE + "/residue",
    question: b([
      "What is this unit inside cellulose?",
      "Qu’est cette unité dans la cellulose ?",
    ]),
    options: [
      b(["A free glucose molecule", "Une molécule de glucose libre"]),
      b([
        "A chemically linked glucose-derived residue",
        "Un résidu dérivé du glucose lié chimiquement",
      ]),
      b(["A tiny plant cell", "Une minuscule cellule végétale"]),
    ],
    correct: 1,
    explanation: b([
      "The unit belongs to a covalent chain. Separating it chemically is not the same as zooming in.",
      "L’unité appartient à une chaîne covalente. La séparer chimiquement n’est pas la même chose que zoomer.",
    ]),
  },
  {
    id: "cloud-state",
    node: "cloud",
    question: b([
      "What makes a cloud visible?",
      "Qu’est-ce qui rend un nuage visible ?",
    ]),
    options: [
      b([
        "Water vapor molecules glowing",
        "Des molécules de vapeur lumineuses",
      ]),
      b(["Only smoke", "Uniquement de la fumée"]),
      b([
        "Droplets or ice scattering light",
        "Des gouttelettes ou de la glace diffusant la lumière",
      ]),
    ],
    correct: 2,
    explanation: b([
      "Water vapor is invisible. Tiny liquid or solid particles scatter light toward our eyes.",
      "La vapeur d’eau est invisible. De petites particules liquides ou solides diffusent la lumière vers nos yeux.",
    ]),
  },
  {
    id: "quartz-network",
    node: "rock/quartz",
    question: b([
      "What does SiO₂ mean in quartz?",
      "Que signifie SiO₂ dans le quartz ?",
    ]),
    options: [
      b([
        "The atom ratio in an extended network",
        "Le rapport atomique d’un réseau continu",
      ]),
      b([
        "Each separate molecule in the grain",
        "Chaque molécule séparée du grain",
      ]),
      b(["Two silicon atoms for one oxygen", "Deux siliciums pour un oxygène"]),
    ],
    correct: 0,
    explanation: b([
      "Oxygen atoms are shared by neighboring silicon centers, giving two oxygens per silicon overall.",
      "Les oxygènes sont partagés entre des centres de silicium voisins : le rapport total est de deux oxygènes par silicium.",
    ]),
  },
  {
    id: "muscle-slide",
    node: "human/muscle/fiber/sarcomere",
    question: b([
      "What changes as a sarcomere contracts?",
      "Qu’est-ce qui change pendant la contraction d’un sarcomère ?",
    ]),
    options: [
      b([
        "Each actin filament becomes shorter",
        "Chaque filament d’actine raccourcit",
      ]),
      b([
        "The overlap of filaments increases",
        "Le recouvrement des filaments augmente",
      ]),
      b(["Atoms become smaller", "Les atomes deviennent plus petits"]),
    ],
    correct: 1,
    explanation: b([
      "Filaments slide relative to each other; their lengths are essentially conserved during this motion.",
      "Les filaments glissent les uns par rapport aux autres ; leurs longueurs sont essentiellement conservées pendant ce mouvement.",
    ]),
  },
  {
    id: "particle-limit",
    node: "water/liquid/molecule/oxygen/nucleus/proton/quark",
    question: b([
      "What is known to be inside an up quark?",
      "Que connaît-on à l’intérieur d’un quark up ?",
    ]),
    options: [
      b(["Three smaller electrons", "Trois électrons plus petits"]),
      b(["A tiny atomic nucleus", "Un petit noyau atomique"]),
      b([
        "No confirmed internal constituents",
        "Aucun constituant interne confirmé",
      ]),
    ],
    correct: 2,
    explanation: b([
      "The Standard Model treats quarks as elementary. The drawn marker is not a measured quark surface.",
      "Le modèle standard traite les quarks comme élémentaires. Le marqueur dessiné n’est pas une surface de quark mesurée.",
    ]),
  },
  {
    id: "fungus-plant",
    node: "mushroom",
    question: b([
      "How does this fungus obtain nutrients?",
      "Comment ce champignon obtient-il ses nutriments ?",
    ]),
    options: [
      b([
        "By photosynthesis in chloroplasts",
        "Par photosynthèse dans des chloroplastes",
      ]),
      b([
        "By absorbing products of external digestion",
        "En absorbant les produits d’une digestion externe",
      ]),
      b([
        "By turning light into atoms",
        "En transformant la lumière en atomes",
      ]),
    ],
    correct: 1,
    explanation: b([
      "Fungi secrete enzymes and absorb dissolved nutrients. They do not have the photosynthetic organization of leaves.",
      "Les champignons sécrètent des enzymes et absorbent les nutriments dissous. Ils n’ont pas l’organisation photosynthétique des feuilles.",
    ]),
  },
];

export const WORLD_MECHANISMS: WorldMechanism[] = [
  {
    id: "oxygen-transfer",
    node: RBC + "/hemoglobin",
    title: b(["Oxygen’s journey", "Le voyage de l’oxygène"]),
    steps: [
      {
        title: b(["Diffuse", "Diffuser"]),
        description: b([
          "O₂ crosses the thin alveolar barrier toward blood because partial pressures differ.",
          "O₂ traverse la fine barrière alvéolaire vers le sang grâce à une différence de pression partielle.",
        ]),
      },
      {
        title: b(["Bind reversibly", "Se lier réversiblement"]),
        description: b([
          "O₂ binds heme iron inside red-cell hemoglobin. The cell remains in the bloodstream.",
          "O₂ se lie au fer de l’hème dans l’hémoglobine. Le globule rouge reste dans la circulation.",
        ]),
      },
      {
        title: b(["Release in tissues", "Libérer dans les tissus"]),
        description: b([
          "Local conditions favor release; oxygen diffuses toward cells that consume it.",
          "Les conditions locales favorisent sa libération ; l’oxygène diffuse vers les cellules qui le consomment.",
        ]),
      },
    ],
  },
  {
    id: "chromatin-packing",
    node: CN + "/chromatin",
    title: b(["Packaging DNA", "Empaqueter l’ADN"]),
    steps: [
      {
        title: b(["Link nucleotides", "Relier les nucléotides"]),
        description: b([
          "Covalent backbones form two strands whose bases pair into a double helix.",
          "Des squelettes covalents forment deux brins dont les bases s’apparient en double hélice.",
        ]),
      },
      {
        title: b(["Wrap histones", "Entourer les histones"]),
        description: b([
          "DNA wraps around histone cores to form nucleosomes, without changing its sequence.",
          "L’ADN s’enroule autour des histones en nucléosomes, sans changer sa séquence.",
        ]),
      },
      {
        title: b(["Organize chromatin", "Organiser la chromatine"]),
        description: b([
          "Chromatin folds dynamically; accessibility changes without requiring all fibers to have one regular shape.",
          "La chromatine se replie dynamiquement ; son accessibilité varie sans imposer une forme régulière à toutes les fibres.",
        ]),
      },
    ],
  },
  {
    id: "muscle-sliding",
    node: "human/muscle/fiber/sarcomere",
    title: b(["Sliding filaments", "Glissement des filaments"]),
    steps: [
      {
        title: b(["Expose binding sites", "Exposer les sites"]),
        description: b([
          "Calcium-dependent regulation makes actin sites accessible to myosin heads.",
          "La régulation dépendante du calcium rend les sites d’actine accessibles aux têtes de myosine.",
        ]),
      },
      {
        title: b(["Pull", "Tirer"]),
        description: b([
          "Myosin’s cycle changes the relative position of actin and myosin filaments.",
          "Le cycle de la myosine change la position relative des filaments d’actine et de myosine.",
        ]),
      },
      {
        title: b(["Reset using ATP", "Recommencer grâce à l’ATP"]),
        description: b([
          "ATP binding permits detachment, and its hydrolysis prepares another cycle; the filaments do not shrink.",
          "La fixation d’ATP permet le détachement et son hydrolyse prépare un nouveau cycle ; les filaments ne rétrécissent pas.",
        ]),
      },
    ],
  },
  {
    id: "photosynthesis",
    node: "tree/leaf/cell/chloroplast",
    title: b([
      "From light to chemical energy",
      "De la lumière à l’énergie chimique",
    ]),
    steps: [
      {
        title: b(["Absorb light", "Absorber la lumière"]),
        description: b([
          "Pigment–protein complexes absorb photons in thylakoid membranes.",
          "Les complexes pigments-protéines absorbent des photons dans les membranes thylakoïdiennes.",
        ]),
      },
      {
        title: b(["Transfer energy", "Transférer l’énergie"]),
        description: b([
          "Electron transport and a proton gradient support production of ATP and NADPH; water supplies electrons and releases O₂.",
          "Le transfert d’électrons et un gradient de protons permettent de produire ATP et NADPH ; l’eau fournit des électrons et libère O₂.",
        ]),
      },
      {
        title: b(["Fix carbon", "Fixer le carbone"]),
        description: b([
          "Reactions in the stroma use these chemical resources to incorporate CO₂ into organic compounds.",
          "Des réactions dans le stroma utilisent ces ressources chimiques pour incorporer CO₂ à des composés organiques.",
        ]),
      },
    ],
  },
];
