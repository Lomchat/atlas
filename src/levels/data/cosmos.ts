import type { LevelData } from "../types.ts";

/** From the observable Universe down to a landscape, outward from home. */
export const cosmosLevels: LevelData[] = [
  {
    id: "universe",
    parent: null,
    journey: "cosmos",
    scene: "universe",
    size: 8.8e26,
    frame: 1.3,
    theme: { top: "#05030f", bottom: "#140a33", accent: "#b58cff", dust: "#8f7bff" },
    title: { en: "The observable Universe", fr: "L’Univers observable" },
    short: { en: "Universe", fr: "Univers" },
    teaser: { en: "Everything we can see: galaxies strung along an immense cosmic web.", fr: "Tout ce que nous pouvons voir : des galaxies le long d’une immense toile cosmique." },
    compare: {
      en: "This is the farthest we can see: beyond it, light has not yet had time to reach us.",
      fr: "C’est le plus loin que l’on puisse voir : au-delà, la lumière n’a pas encore eu le temps de nous parvenir.",
    },
    hook: {
      en: "Everything we can observe fits inside this bubble: hundreds of billions of galaxies, strung along an immense cosmic web.",
      fr: "Tout ce que nous pouvons observer tient dans cette bulle : des centaines de milliards de galaxies, reliées par une immense toile cosmique.",
    },
    facts: [
      {
        en: "The observable Universe is a bubble centred on us, but we are not the centre of the Universe: every observer has their own bubble.",
        fr: "L’Univers observable est une bulle centrée sur nous, mais nous ne sommes pas le centre de l’Univers : chaque observateur a la sienne.",
      },
      {
        en: "The Universe is 13.8 billion years old, yet the bubble is 93 billion light-years across, because space kept stretching while the light travelled.",
        fr: "L’Univers a 13,8 milliards d’années, mais la bulle mesure 93 milliards d’années-lumière, car l’espace s’est étiré pendant que la lumière voyageait.",
      },
    ],
    hotspots: [
      {
        id: "cluster",
        at: [-2.3, 1.55, 2.1],
        label: { en: "Galaxy cluster", fr: "Amas de galaxies" },
        text: {
          en: "Where filaments cross, thousands of galaxies crowd together, held by gravity.",
          fr: "Là où les filaments se croisent, des milliers de galaxies se serrent, retenues par la gravité.",
        },
      },
      {
        id: "void",
        at: [1.75, -1.3, 2.3],
        label: { en: "Cosmic void", fr: "Vide cosmique" },
        text: {
          en: "Between the filaments lie huge voids with very few galaxies (drawn far larger here than they really are).",
          fr: "Entre les filaments s’étendent d’immenses vides presque sans galaxies (dessinés ici bien plus grands qu’en réalité).",
        },
      },
      {
        id: "edge",
        at: [3.6, 2.9, 1.8],
        label: { en: "The oldest light", fr: "La plus vieille lumière" },
        text: {
          en: "At the edge glows the cosmic microwave background, light released 380,000 years after the Big Bang.",
          fr: "Au bord brille le fond diffus cosmologique, une lumière émise 380 000 ans après le Big Bang.",
        },
      },
    ],
    source: { label: "ESA – Planck", url: "https://www.esa.int/Science_Exploration/Space_Science/Planck" },
  },
  {
    id: "laniakea",
    parent: "universe",
    journey: "cosmos",
    scene: "laniakea",
    size: 4.9e24,
    frame: 1.2,
    view: { pitch: 25 },
    // The Local Group (us) sits exactly at the centre of the observable Universe.
    anchor: { at: [0.0166, 0.0061, -0.0011], rotate: [25, 0, 0] },
    theme: { top: "#07051a", bottom: "#1b1042", accent: "#a08bff", dust: "#7d6cff" },
    title: { en: "Laniakea, our supercluster", fr: "Laniakea, notre superamas" },
    short: { en: "Laniakea", fr: "Laniakea" },
    teaser: { en: "Our supercluster: 100,000 galaxies flowing towards the same place.", fr: "Notre superamas : 100 000 galaxies qui s’écoulent vers un même endroit." },
    compare: {
      en: "You would need to line up 5,000 Milky Ways to cross it.",
      fr: "Il faudrait aligner 5 000 Voies lactées pour le traverser.",
    },
    hook: {
      en: "Our galaxy is one dot among about 100,000 in this supercluster. “Laniakea” means “immense heaven” in Hawaiian.",
      fr: "Notre galaxie n’est qu’un point parmi environ 100 000 dans ce superamas. « Laniakea » signifie « paradis immense » en hawaïen.",
    },
    facts: [
      {
        en: "All these galaxies are slowly flowing towards the same region, called the Great Attractor.",
        fr: "Toutes ces galaxies s’écoulent lentement vers une même région, appelée le Grand Attracteur.",
      },
      {
        en: "Laniakea was only mapped in 2014, by measuring how thousands of galaxies move.",
        fr: "Laniakea n’a été cartographié qu’en 2014, en mesurant le mouvement de milliers de galaxies.",
      },
    ],
    hotspots: [
      {
        id: "great-attractor",
        at: [0.5, 0.2, -0.6],
        label: { en: "Great Attractor", fr: "Grand Attracteur" },
        text: {
          en: "The flows converge on this dense region, about 200 million light-years from us.",
          fr: "Les flux convergent vers cette région très dense, à environ 200 millions d’années-lumière de nous.",
        },
      },
      {
        id: "virgo",
        at: [-1.72, -0.3, 1.3],
        label: { en: "Virgo Cluster", fr: "Amas de la Vierge" },
        text: {
          en: "More than a thousand galaxies, 54 million light-years away: the nearest big cluster.",
          fr: "Plus d’un millier de galaxies, à 54 millions d’années-lumière : le grand amas le plus proche.",
        },
      },
      {
        id: "boundary",
        at: [2.6, -1.3, 3.1],
        label: { en: "Edge of Laniakea", fr: "Frontière de Laniakea" },
        text: {
          en: "Beyond this border, galaxies drift towards other attractors instead.",
          fr: "Au-delà de cette frontière, les galaxies dérivent vers d’autres attracteurs.",
        },
      },
    ],
    source: { label: "Tully et al., Nature (2014)", url: "https://www.nature.com/articles/nature13674" },
  },
  {
    id: "local-group",
    parent: "laniakea",
    journey: "cosmos",
    scene: "localGroup",
    size: 9.5e22,
    frame: 0.3,
    view: { pitch: 20 },
    // About 200 million light-years from the Great Attractor, near Laniakea's edge.
    anchor: { at: [-2.981, -0.91, 0.65], rotate: [-5, 0, 0] },
    theme: { top: "#070722", bottom: "#17124c", accent: "#8fb0ff", dust: "#9aa8ff" },
    title: { en: "The Local Group", fr: "Le Groupe local" },
    short: { en: "Local Group", fr: "Groupe local" },
    teaser: { en: "Our neighbourhood of galaxies, led by the Milky Way and Andromeda.", fr: "Notre quartier de galaxies, mené par la Voie lactée et Andromède." },
    compare: {
      en: "Light takes about 10 million years to cross it.",
      fr: "La lumière met environ 10 millions d’années à le traverser.",
    },
    hook: {
      en: "Our galactic neighbourhood: the Milky Way, Andromeda and more than 80 smaller galaxies around them.",
      fr: "Notre voisinage galactique : la Voie lactée, Andromède et plus de 80 petites galaxies autour d’elles.",
    },
    facts: [
      {
        en: "Andromeda is heading towards us at about 110 km/s. The two galaxies may merge in a few billion years.",
        fr: "Andromède fonce vers nous à environ 110 km/s. Les deux galaxies pourraient fusionner dans quelques milliards d’années.",
      },
      {
        en: "On a very dark night you can see Andromeda with the naked eye: its light left 2.5 million years ago.",
        fr: "Par une nuit très noire, on voit Andromède à l’œil nu : sa lumière est partie il y a 2,5 millions d’années.",
      },
    ],
    hotspots: [
      {
        id: "andromeda",
        at: [-1.285, -0.4, -0.085],
        label: { en: "Andromeda (M31)", fr: "Andromède (M31)" },
        text: {
          en: "The largest galaxy of the group, 2.5 million light-years away; the dashes follow its light on the way to us.",
          fr: "La plus grande galaxie du groupe, à 2,5 millions d’années-lumière ; les pointillés suivent sa lumière jusqu’à nous.",
        },
      },
      {
        id: "triangulum",
        at: [-1.104, -1.15, 0.025],
        label: { en: "Triangulum (M33)", fr: "Galaxie du Triangle (M33)" },
        text: {
          en: "The third-largest member, a small spiral 2.7 million light-years away.",
          fr: "La troisième plus grande du groupe, une petite spirale à 2,7 millions d’années-lumière.",
        },
      },
      {
        id: "magellanic",
        at: [1.16, 0.36, 0],
        label: { en: "Magellanic Clouds", fr: "Nuages de Magellan" },
        text: {
          en: "Two dwarf galaxies close to the Milky Way, visible to the naked eye from the Southern Hemisphere.",
          fr: "Deux galaxies naines toutes proches de la Voie lactée, visibles à l’œil nu depuis l’hémisphère Sud.",
        },
      },
      {
        id: "halo",
        at: [0.67, 1.0, 0.37],
        label: { en: "Dark matter halo", fr: "Halo de matière noire" },
        text: {
          en: "Each big galaxy sits in an invisible halo of dark matter, much wider than its disc of stars; the soft glow stands for it.",
          fr: "Chaque grande galaxie baigne dans un halo invisible de matière noire, bien plus large que son disque d’étoiles ; la lueur diffuse le représente.",
        },
      },
    ],
    source: { label: "NASA", url: "https://science.nasa.gov/universe/galaxies/" },
  },
  {
    id: "milky-way",
    parent: "local-group",
    journey: "cosmos",
    scene: "milkyWay",
    size: 9.5e20,
    frame: 1.05,
    view: { pitch: 55 },
    // Andromeda lies 2.5 million light-years away in its real direction (l = 121°, b = −22°).
    anchor: { at: [1.021, 0.455, 0.068], rotate: [35, 0, 0] },
    theme: { top: "#080a26", bottom: "#1d1452", accent: "#ffc46b", dust: "#b9a8ff" },
    title: { en: "The Milky Way", fr: "La Voie lactée" },
    short: { en: "Milky Way", fr: "Voie lactée" },
    teaser: { en: "Our galaxy: a turning disc of billions of stars, the Sun among them.", fr: "Notre galaxie : un disque de milliards d’étoiles qui tourne, dont le Soleil." },
    sizeText: { en: "≈ 100,000 light-years", fr: "≈ 100 000 années-lumière" },
    compare: {
      en: "At the speed of light, it would take 100,000 years to cross it.",
      fr: "À la vitesse de la lumière, il faudrait 100 000 ans pour la traverser.",
    },
    hook: {
      en: "Our galaxy: a slowly turning disc of 100 to 400 billion stars. The Sun is one of them, out in a spiral arm.",
      fr: "Notre galaxie : un disque de 100 à 400 milliards d’étoiles qui tourne lentement. Le Soleil est l’une d’elles, dans un bras en périphérie.",
    },
    facts: [
      {
        en: "The Sun takes about 230 million years to go once around the galaxy.",
        fr: "Le Soleil met environ 230 millions d’années pour faire le tour de la galaxie.",
      },
      {
        en: "At the centre hides a black hole of 4 million solar masses, Sagittarius A*.",
        fr: "Au centre se cache un trou noir de 4 millions de masses solaires, Sagittarius A*.",
      },
    ],
    hotspots: [
      {
        id: "centre",
        at: [0, 0.35, 0],
        label: { en: "Galactic centre", fr: "Centre galactique" },
        text: {
          en: "A bar and a bulge of old, yellowish stars surround the black hole Sagittarius A*.",
          fr: "Une barre et un bulbe de vieilles étoiles jaunâtres entourent le trou noir Sagittarius A*.",
        },
      },
      {
        id: "perseus",
        at: [2.86, 0.05, 3.14],
        label: { en: "Perseus Arm", fr: "Bras de Persée" },
        text: {
          en: "In the spiral arms, gas piles up and young blue stars and pink nebulae are born.",
          fr: "Dans les bras spiraux, le gaz s’accumule : de jeunes étoiles bleues et des nébuleuses roses y naissent.",
        },
      },
      {
        id: "spur",
        at: [0.17, 0.05, 3.05],
        label: { en: "Orion Spur", fr: "Bras d’Orion" },
        text: {
          en: "The Sun sits in this small arm, about 26,000 light-years from the centre.",
          fr: "Le Soleil se trouve dans ce petit bras, à environ 26 000 années-lumière du centre.",
        },
      },
      {
        id: "globular",
        at: [-3.4, 2.6, 0.8],
        label: { en: "Globular clusters", fr: "Amas globulaires" },
        text: {
          en: "About 150 ancient balls of stars orbit in the halo around the disc.",
          fr: "Environ 150 vieilles boules d’étoiles tournent dans le halo, autour du disque.",
        },
      },
    ],
    source: { label: "NASA", url: "https://science.nasa.gov/universe/galaxies/" },
  },
  {
    id: "stellar-neighborhood",
    parent: "milky-way",
    journey: "cosmos",
    scene: "stellarNeighborhood",
    size: 1.9e17,
    frame: 1.3,
    view: { pitch: 25 },
    // The Sun, about 26,000 light-years from the centre; galactic north is +Y in both frames.
    anchor: { at: [-0.9, 0, 2.5] },
    theme: { top: "#060b24", bottom: "#121b4c", accent: "#7fd1ff", dust: "#cfe0ff" },
    title: { en: "Our neighbouring stars", fr: "Nos étoiles voisines" },
    short: { en: "Nearby stars", fr: "Étoiles voisines" },
    teaser: { en: "The Sun and the few stars nearest to us, light-years apart.", fr: "Le Soleil et les quelques étoiles les plus proches, à des années-lumière." },
    sizeText: { en: "≈ 20 light-years", fr: "≈ 20 années-lumière" },
    compare: {
      en: "The nearest star, Proxima Centauri, is 4.2 light-years away: 40 trillion kilometres.",
      fr: "L’étoile la plus proche, Proxima du Centaure, est à 4,2 années-lumière : 40 000 milliards de kilomètres.",
    },
    hook: {
      en: "Around the Sun, space is almost empty. The nearest stars are so far away that their light takes years to reach us.",
      fr: "Autour du Soleil, l’espace est presque vide. Les étoiles les plus proches sont si loin que leur lumière met des années à nous parvenir.",
    },
    facts: [
      {
        en: "Even aboard the fastest probe ever launched, the trip to Proxima would take thousands of years.",
        fr: "Même à bord de la sonde la plus rapide jamais lancée, il faudrait des milliers d’années pour atteindre Proxima.",
      },
      {
        en: "Proxima Centauri has at least one planet with roughly the mass of Earth, Proxima b.",
        fr: "Proxima du Centaure possède au moins une planète d’une masse proche de celle de la Terre, Proxima b.",
      },
    ],
    hotspots: [
      {
        id: "alpha-centauri",
        at: [1.95, 0.4, -0.95],
        label: { en: "Alpha Centauri", fr: "Alpha du Centaure" },
        text: {
          en: "Our nearest neighbours: two Sun-like stars and the small red dwarf Proxima, 4.2 to 4.4 light-years away.",
          fr: "Nos plus proches voisines : deux étoiles semblables au Soleil et la petite naine rouge Proxima, à 4,2 à 4,4 années-lumière.",
        },
      },
      {
        id: "sirius",
        at: [1.95, -0.2, 3.76],
        label: { en: "Sirius", fr: "Sirius" },
        text: {
          en: "The brightest star in our night sky, 8.6 light-years away, with a tiny white dwarf companion.",
          fr: "L’étoile la plus brillante de notre ciel nocturne, à 8,6 années-lumière, avec une minuscule naine blanche pour compagne.",
        },
      },
      {
        id: "red-dwarfs",
        at: [1.52, 3.6, 1.56],
        label: { en: "Red dwarfs", fr: "Naines rouges" },
        text: {
          en: "Most of our neighbours are small, cool red dwarfs, too faint to see with the naked eye.",
          fr: "La plupart de nos voisines sont de petites naines rouges, trop pâles pour être vues à l’œil nu.",
        },
      },
      {
        id: "oort",
        at: [0.6, -0.62, 0.5],
        label: { en: "Oort cloud", fr: "Nuage d’Oort" },
        text: {
          en: "Trillions of icy bodies are thought to surround the Sun out to a light-year or more.",
          fr: "Des milliers de milliards de corps glacés entoureraient le Soleil jusqu’à une année-lumière ou plus.",
        },
      },
    ],
    source: { label: "NASA", url: "https://science.nasa.gov/exoplanets/" },
  },
  {
    id: "solar-system",
    parent: "stellar-neighborhood",
    journey: "cosmos",
    scene: "solarSystem",
    size: 9.0e12,
    frame: 1.2,
    view: { pitch: 40 },
    // The planets' plane is tilted about 60° to the plane of the Milky Way.
    anchor: { at: [0, 0, 0], rotate: [-4.4, -10.9, 59.26] },
    theme: { top: "#070b22", bottom: "#111a44", accent: "#ffd23f", dust: "#9fb6ff" },
    title: { en: "The Solar System", fr: "Le Système solaire" },
    short: { en: "Solar System", fr: "Système solaire" },
    teaser: { en: "The Sun and its eight planets, held together by gravity.", fr: "Le Soleil et ses huit planètes, retenues par la gravité." },
    compare: {
      en: "Sunlight takes about 4 hours to reach Neptune.",
      fr: "La lumière du Soleil met environ 4 heures pour atteindre Neptune.",
    },
    hook: {
      en: "Eight planets orbit the Sun. The Sun alone holds 99.8% of all the mass in the system.",
      fr: "Huit planètes tournent autour du Soleil. Le Soleil à lui seul contient 99,8 % de toute la masse du système.",
    },
    facts: [
      {
        en: "Voyager 1, launched in 1977, has left the planets far behind and now travels through interstellar space.",
        fr: "Voyager 1, lancée en 1977, a laissé les planètes loin derrière et voyage aujourd’hui dans l’espace interstellaire.",
      },
      {
        en: "Neptune takes 165 years to go once around the Sun.",
        fr: "Neptune met 165 ans à faire le tour du Soleil.",
      },
      {
        en: "Here Jupiter, Saturn, Uranus and Neptune are drawn 3,600 times larger than they are: at true scale, even Jupiter would be far smaller than a pixel.",
        fr: "Ici, Jupiter, Saturne, Uranus et Neptune sont dessinées 3 600 fois plus grosses qu’en vrai : à l’échelle réelle, même Jupiter serait bien plus petite qu’un pixel.",
      },
      {
        en: "The planets’ orbits are tilted by about 60° to the plane of the Milky Way.",
        fr: "Les orbites des planètes sont inclinées d’environ 60° par rapport au plan de la Voie lactée.",
      },
    ],
    hotspots: [
      {
        id: "jupiter",
        at: [0.789, 0.42, 0.352],
        label: { en: "Jupiter", fr: "Jupiter" },
        text: {
          en: "The largest planet: more than twice as massive as all the others put together.",
          fr: "La plus grosse planète : plus de deux fois plus massive que toutes les autres réunies.",
        },
      },
      {
        id: "saturn",
        at: [-1.316, 0.48, -0.884],
        label: { en: "Saturn", fr: "Saturne" },
        text: {
          en: "Its rings of ice chunks are about 280,000 km across, yet mostly less than a kilometre thick.",
          fr: "Ses anneaux de blocs de glace font environ 280 000 km de large, mais le plus souvent moins d’un kilomètre d’épaisseur.",
        },
      },
      {
        id: "neptune",
        at: [-2.94, 0.3, 4.04],
        label: { en: "Neptune", fr: "Neptune" },
        text: {
          en: "The farthest planet, 30 times farther from the Sun than Earth; like the others, it is drawn thousands of times too big.",
          fr: "La planète la plus lointaine, 30 fois plus loin du Soleil que la Terre ; comme les autres, elle est dessinée des milliers de fois trop grosse.",
        },
      },
      {
        id: "kuiper",
        at: [2.53, 0, 6.5],
        label: { en: "Kuiper belt", fr: "Ceinture de Kuiper" },
        text: {
          en: "Beyond Neptune circle countless icy bodies, including the dwarf planet Pluto.",
          fr: "Au-delà de Neptune tournent d’innombrables corps glacés, dont la planète naine Pluton.",
        },
      },
    ],
    source: { label: "NASA", url: "https://science.nasa.gov/solar-system/" },
  },
  {
    id: "inner-solar-system",
    parent: "solar-system",
    journey: "cosmos",
    scene: "innerSolarSystem",
    size: 4.6e11,
    frame: 1.2,
    view: { pitch: 40 },
    anchor: { at: [0, 0, 0] },
    theme: { top: "#080c26", bottom: "#161c4a", accent: "#ffb03a", dust: "#aab8ff" },
    title: { en: "The rocky planets", fr: "Les planètes rocheuses" },
    short: { en: "Rocky planets", fr: "Planètes rocheuses" },
    teaser: { en: "Mercury, Venus, Earth and Mars: the rocky worlds close to the Sun.", fr: "Mercure, Vénus, la Terre et Mars : les mondes rocheux proches du Soleil." },
    compare: {
      en: "Sunlight takes 8 minutes and 20 seconds to reach Earth.",
      fr: "La lumière du Soleil met 8 minutes et 20 secondes pour atteindre la Terre.",
    },
    hook: {
      en: "Mercury, Venus, Earth and Mars: four rocky worlds huddled close to the Sun. Earth is the only one with liquid water flowing on its surface today.",
      fr: "Mercure, Vénus, la Terre et Mars : quatre mondes de roche serrés près du Soleil. La Terre est la seule où l’eau liquide coule en surface aujourd’hui.",
    },
    facts: [
      {
        en: "The orbits are to scale, but not the planets: they are drawn 1,500 times larger than life, or they would be invisible specks.",
        fr: "Les orbites sont à l’échelle, mais pas les planètes : elles sont dessinées 1 500 fois plus grandes, sinon ce seraient des points invisibles.",
      },
      {
        en: "Venus is the hottest planet, hotter than Mercury, because of its thick CO₂ atmosphere: about 465 °C.",
        fr: "Vénus est la planète la plus chaude, plus que Mercure, à cause de son épaisse atmosphère de CO₂ : environ 465 °C.",
      },
      {
        en: "Venus takes longer to spin once on itself (243 days) than to go around the Sun (225 days).",
        fr: "Vénus met plus de temps à tourner sur elle-même (243 jours) qu’à faire le tour du Soleil (225 jours).",
      },
    ],
    hotspots: [
      {
        id: "sun",
        at: [0, 1.0, 0],
        label: { en: "The Sun (not to scale)", fr: "Le Soleil (pas à l’échelle)" },
        text: {
          en: "109 times wider than Earth. Here the Sun is enlarged about 35 times and the planets 1,500 times, so you can see them.",
          fr: "109 fois plus large que la Terre. Ici, le Soleil est agrandi environ 35 fois et les planètes 1 500 fois, pour qu’on puisse les voir.",
        },
      },
      {
        id: "mercury",
        at: [0.38, 0.5, -1.43],
        label: { en: "Mercury", fr: "Mercure" },
        text: {
          en: "The smallest planet and the closest to the Sun. Its stretched orbit brings it from 46 to 70 million km from the Sun.",
          fr: "La plus petite planète et la plus proche du Soleil. Son orbite allongée la fait passer de 46 à 70 millions de km du Soleil.",
        },
      },
      {
        id: "venus",
        at: [-1.93, 0.6, -1.35],
        label: { en: "Venus", fr: "Vénus" },
        text: {
          en: "Almost Earth's twin in size, but hidden under thick clouds of sulfuric acid.",
          fr: "Presque la jumelle de la Terre par la taille, mais cachée sous d’épais nuages d’acide sulfurique.",
        },
      },
      {
        id: "mars",
        at: [-4.69, 0.52, -1.71],
        label: { en: "Mars", fr: "Mars" },
        text: {
          en: "Half as wide as Earth. Its red colour comes from iron oxide, rust, in its dust.",
          fr: "Deux fois moins large que la Terre. Sa couleur rouge vient de l’oxyde de fer, la rouille, de sa poussière.",
        },
      },
    ],
    source: { label: "NASA", url: "https://science.nasa.gov/solar-system/" },
  },
  {
    id: "earth-moon",
    parent: "inner-solar-system",
    journey: "cosmos",
    scene: "earthMoon",
    size: 7.7e8,
    frame: 1.15,
    view: { pitch: 20 },
    // Earth's place on its orbit in the inner Solar System (1 AU, sunlight from the front left).
    anchor: { at: [2.816, 0, -1.626] },
    theme: { top: "#050a1f", bottom: "#0f1a46", accent: "#6fd3ff", dust: "#b8c8ff" },
    title: { en: "Earth and the Moon", fr: "La Terre et la Lune" },
    short: { en: "Earth & Moon", fr: "Terre et Lune" },
    teaser: { en: "Our planet and its Moon, at their true sizes and distance.", fr: "Notre planète et sa Lune, à leur vraie taille et à leur vraie distance." },
    compare: {
      en: "When the Moon is at its farthest, all the other planets could fit side by side between it and Earth.",
      fr: "Quand la Lune est au plus loin, toutes les autres planètes tiendraient côte à côte entre elle et la Terre.",
    },
    hook: {
      en: "The Moon orbits Earth 384,000 km away. Here everything is drawn to true scale: our planet is a small marble, and the Moon a pebble.",
      fr: "La Lune tourne autour de la Terre à 384 000 km. Ici, tout est à la vraie échelle : notre planète est une petite bille, et la Lune un caillou.",
    },
    facts: [
      {
        en: "The Moon is drifting away from us by about 3.8 cm a year.",
        fr: "La Lune s’éloigne de nous d’environ 3,8 cm par an.",
      },
      {
        en: "We always see the same side of the Moon, because it spins exactly once per orbit.",
        fr: "On voit toujours la même face de la Lune, car elle fait exactement un tour sur elle-même à chaque orbite.",
      },
      {
        en: "Laser pulses fired at mirrors left on the Moon by Apollo astronauts come back after about 2.5 seconds.",
        fr: "Des impulsions laser tirées vers des miroirs laissés sur la Lune par les astronautes d’Apollo reviennent après environ 2,5 secondes.",
      },
    ],
    hotspots: [
      {
        id: "moon",
        at: [4.85, 0.07, 2.05],
        label: { en: "The Moon", fr: "La Lune" },
        text: {
          en: "3,474 km across, about a quarter of Earth's width, shown here at its farthest. Its glow is added so you can find it.",
          fr: "3 474 km de large, environ le quart de la Terre, montrée ici au plus loin. Son halo est ajouté pour la repérer.",
        },
      },
      {
        id: "planets",
        at: [1.3, 1.02, 0.55],
        label: { en: "All the planets fit", fr: "Toutes les planètes y tiennent" },
        text: {
          en: "Mercury, Venus, Mars, Jupiter, Saturn, Uranus and Neptune, at true scale: side by side, they fit in the gap when the Moon is farthest.",
          fr: "Mercure, Vénus, Mars, Jupiter, Saturne, Uranus et Neptune, à la vraie échelle : côte à côte, elles tiennent dans l’espace quand la Lune est au plus loin.",
        },
      },
      {
        id: "light",
        at: [3.9, 0.55, 1.65],
        label: { en: "Light, in real time", fr: "La lumière, en temps réel" },
        text: {
          en: "The glowing pulse travels at the true speed of light for this scale: about 1.3 seconds to reach the Moon.",
          fr: "L’impulsion lumineuse avance à la vraie vitesse de la lumière à cette échelle : environ 1,3 seconde pour atteindre la Lune.",
        },
      },
    ],
    source: { label: "NASA", url: "https://science.nasa.gov/moon/" },
  },
  {
    id: "earth",
    parent: "earth-moon",
    journey: "cosmos",
    scene: "earth",
    size: 1.2742e7,
    view: { pitch: 48.3 },
    // Axis tilted 23.4° towards the Sun (northern summer); see SUN_EARTH in scenes/earth/shared.ts.
    anchor: { at: [0, 0, 0], rotate: [11.48, 2.05, 20.16] },
    theme: { top: "#06102a", bottom: "#10285c", accent: "#4fc3ff", dust: "#cfe4ff" },
    title: { en: "Earth", fr: "La Terre" },
    short: { en: "Earth", fr: "Terre" },
    teaser: { en: "Our planet: oceans, continents, clouds and a thin layer of air.", fr: "Notre planète : océans, continents, nuages et une fine couche d’air." },
    compare: {
      en: "An airliner would need about two days to fly all the way around it, non-stop.",
      fr: "Un avion de ligne mettrait environ deux jours à en faire le tour sans escale.",
    },
    hook: {
      en: "Our planet from afar: oceans, clouds and a thin layer of air. Everything you know is here.",
      fr: "Notre planète vue de loin : des océans, des nuages et une fine couche d’air. Tout ce que tu connais se trouve ici.",
    },
    facts: [
      {
        en: "If Earth were an apple, the breathable air would be thinner than its skin.",
        fr: "Si la Terre était une pomme, l’air respirable serait moins épais que sa peau.",
      },
      {
        en: "Oceans cover 71% of the surface.",
        fr: "Les océans couvrent 71 % de la surface.",
      },
      {
        en: "Earth's axis is tilted by 23.4°: here it leans towards the Sun, so it is summer in Europe.",
        fr: "L’axe de la Terre est incliné de 23,4° : ici, il penche vers le Soleil, c’est donc l’été en Europe.",
      },
    ],
    hotspots: [
      {
        id: "atmosphere",
        at: [-3.75, 2.49, -2.8],
        label: { en: "The atmosphere", fr: "L’atmosphère" },
        text: {
          en: "This thin blue glow is all the air we breathe: most of it lies within 12 km of the ground.",
          fr: "Cette fine lueur bleue, c’est tout l’air que nous respirons : l’essentiel se trouve à moins de 12 km du sol.",
        },
      },
      {
        id: "sahara",
        at: [0.48, 1.95, 4.58],
        label: { en: "The Sahara", fr: "Le Sahara" },
        text: {
          en: "The largest hot desert, almost as big as the United States. Clouds rarely form above it.",
          fr: "Le plus grand désert chaud, presque aussi vaste que les États-Unis. Les nuages s’y forment rarement.",
        },
      },
      {
        id: "night",
        at: [4.46, 1.87, 1.28],
        label: { en: "Night side", fr: "Côté nuit" },
        text: {
          en: "Half of Earth is always in the dark. There, city lights reveal where people live.",
          fr: "La moitié de la Terre est toujours dans le noir. Là, les lumières des villes montrent où vivent les gens.",
        },
      },
      {
        id: "iss",
        at: [-2.33, 2.95, 3.76],
        label: { en: "Space Station", fr: "Station spatiale" },
        text: {
          en: "The International Space Station circles 400 km up, once every 90 minutes. Its path is shown dashed.",
          fr: "La Station spatiale internationale tourne à 400 km d’altitude, un tour toutes les 90 minutes. Sa trajectoire est en pointillés.",
        },
      },
    ],
    source: { label: "NASA", url: "https://science.nasa.gov/earth/" },
  },
  {
    id: "region",
    parent: "earth",
    journey: "cosmos",
    scene: "region",
    size: 3e5,
    view: { pitch: 70 },
    // North-east France (48.3° N, 4° E) on the globe, +Y along the surface normal, north up.
    anchor: { at: [0, 3.733, 3.326], rotate: [41.7, 0, 0] },
    theme: { top: "#0f3a78", bottom: "#2f7fc4", accent: "#7fe0ff", dust: "#ffffff" },
    title: { en: "A region seen from space", fr: "Une région vue de l’espace" },
    short: { en: "Region", fr: "Région" },
    teaser: { en: "A piece of Europe seen from high up: rivers, forests, towns and clouds.", fr: "Un morceau d’Europe vu de très haut : rivières, forêts, villes et nuages." },
    compare: {
      en: "Roughly the distance from Paris to Brussels.",
      fr: "À peu près la distance entre Paris et Bruxelles.",
    },
    hook: {
      en: "At this scale you can see rivers, forests and towns, but not a single person. The clouds cast their shadows on the fields.",
      fr: "À cette échelle, on voit des rivières, des forêts et des villes, mais pas une seule personne. Les nuages projettent leur ombre sur les champs.",
    },
    facts: [
      {
        en: "Clouds look weightless, yet a single cumulus can hold several hundred tonnes of water.",
        fr: "Les nuages paraissent légers, pourtant un seul cumulus peut contenir plusieurs centaines de tonnes d’eau.",
      },
      {
        en: "An airliner flying 10 km up, like the one drawing a contrail here, crosses this whole region in about 20 minutes.",
        fr: "Un avion de ligne à 10 km d’altitude, comme celui qui trace une traînée ici, traverse toute la région en 20 minutes environ.",
      },
    ],
    hotspots: [
      {
        id: "clouds",
        at: [2.2, 0.2, 1.7],
        label: { en: "Cumulus clouds", fr: "Des cumulus" },
        text: {
          en: "They float 1 to 3 km above the ground, and each drags its shadow across the fields.",
          fr: "Ils flottent entre 1 et 3 km au-dessus du sol, et chacun promène son ombre sur les champs.",
        },
      },
      {
        id: "river",
        at: [5.6, 0.05, 2.3],
        label: { en: "The river", fr: "La rivière" },
        text: {
          en: "From this high, a river is a thin thread. It is drawn wider than life here so you can follow it.",
          fr: "De si haut, une rivière n’est qu’un fil. Elle est dessinée plus large que nature pour qu’on puisse la suivre.",
        },
      },
      {
        id: "lake",
        at: [-3.3, 0.05, 1.9],
        label: { en: "A lake", fr: "Un lac" },
        text: {
          en: "About 50 km long: even a big lake looks like a puddle from here.",
          fr: "Environ 50 km de long : même un grand lac ressemble à une flaque, vu d’ici.",
        },
      },
      {
        id: "city",
        at: [3.7, 0.05, -2.0],
        label: { en: "A city", fr: "Une ville" },
        text: {
          en: "About 15 km across. Its streets and houses merge into a single pale patch.",
          fr: "Environ 15 km de large. Ses rues et ses maisons se fondent en une seule tache claire.",
        },
      },
    ],
    source: { label: "NASA Earth Observatory", url: "https://earthobservatory.nasa.gov/" },
  },
  {
    id: "landscape",
    parent: "region",
    journey: "cosmos",
    scene: "landscape",
    size: 5e3,
    frame: 1.2,
    view: { pitch: 55 },
    // On the region's river, where its small town is (see scenes/earth/geography.ts).
    anchor: { at: [0.4, 0, 0.7] },
    theme: { top: "#2b86c9", bottom: "#8fd3f2", accent: "#ffe066", dust: "#ffffff" },
    title: { en: "The landscape", fr: "Le paysage" },
    short: { en: "Landscape", fr: "Paysage" },
    teaser: { en: "Fields, a forest and a small riverside town, with a park inside.", fr: "Des champs, une forêt et une petite ville au bord de l’eau, avec un parc." },
    compare: {
      en: "About an hour’s walk from one side to the other.",
      fr: "Environ une heure de marche d’un bout à l’autre.",
    },
    hook: {
      en: "Fields, a forest, a river and a small town. Somewhere in there is a park… and you.",
      fr: "Des champs, une forêt, une rivière et une petite ville. Quelque part là-dedans, un parc… et toi.",
    },
    facts: [
      {
        en: "A square kilometre of forest can hold tens of thousands of trees.",
        fr: "Un kilomètre carré de forêt peut compter des dizaines de milliers d’arbres.",
      },
      {
        en: "Here trees and houses are drawn about three times larger than life so you can see them; the wind turbines are to scale.",
        fr: "Ici, les arbres et les maisons sont dessinés environ trois fois plus grands que nature pour qu’on les voie ; les éoliennes sont à l’échelle.",
      },
    ],
    hotspots: [
      {
        id: "meander",
        at: [0.95, 0.05, 2.1],
        label: { en: "A meander", fr: "Un méandre" },
        text: {
          en: "The river erodes the outside of each bend and drops sand on the inside: look for the pale sand bars.",
          fr: "La rivière creuse l’extérieur de chaque virage et dépose du sable à l’intérieur : regarde les bancs de sable clair.",
        },
      },
      {
        id: "forest",
        at: [-3.2, 0.12, -3.4],
        label: { en: "The forest", fr: "La forêt" },
        text: {
          en: "About 10 km² of woods: tens of thousands of trees, with conifers among the broadleaf trees.",
          fr: "Environ 10 km² de bois : des dizaines de milliers d’arbres, avec des conifères parmi les feuillus.",
        },
      },
      {
        id: "turbines",
        at: [7.0, 0.3, -2.35],
        label: { en: "Wind turbines", fr: "Des éoliennes" },
        text: {
          en: "About 160 m tall with their blades up: the tallest things in this landscape.",
          fr: "Environ 160 m de haut, pale levée : ce sont les objets les plus hauts de ce paysage.",
        },
      },
      {
        id: "town",
        at: [3.7, 0.1, -1.9],
        label: { en: "The town", fr: "La ville" },
        text: {
          en: "A small riverside town with its church, its railway station and, by the river, a park.",
          fr: "Une petite ville au bord de la rivière, avec son église, sa gare et, près de l’eau, un parc.",
        },
      },
    ],
    source: { label: "USGS Water Science School", url: "https://www.usgs.gov/special-topics/water-science-school" },
  },
];
