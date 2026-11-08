import type { LessonData } from "../types.ts";

/**
 * Chapter 1: the bit. From one switch to letters and colours. Every number
 * quoted here is exact: A = 65 (ASCII/Unicode), é = U+00E9 = C3 A9 in UTF-8,
 * the grinning face = U+1F600 = 128 512, 2^32 = 4 294 967 296,
 * 2^64 ≈ 1.8 × 10^19, 2^24 = 16 777 216, 12 Mpx × 3 bytes = 36 MB.
 */
export const bitsLesson: LessonData = {
  id: "bits",
  number: 1,
  status: "ready",
  scene: "bits",
  icon: "bit",
  theme: { top: "#140a45", bottom: "#3c1f8c", accent: "#ffd23f", dust: "#9d8cff" },
  title: { en: "The bit", fr: "Le bit" },
  short: { en: "The bit", fr: "Le bit" },
  teaser: {
    en: "0 or 1: the smallest piece of information, and how it encodes everything.",
    fr: "0 ou 1 : la plus petite information possible, et comment elle code tout.",
  },
  source: {
    label: "Computer Science Field Guide",
    url: "https://www.csfieldguide.org.nz/en/chapters/data-representation/",
  },
  steps: [
    {
      id: "switch",
      title: { en: "A bit: yes or no", fr: "Un bit : oui ou non" },
      text: {
        en: "A bit is the smallest possible piece of information: just two states, written 0 and 1. Off or on, no or yes. Inside a computer, a bit is a voltage on a tiny wire: high means 1, low means 0.",
        fr: "Un bit, c’est la plus petite information possible : deux états seulement, notés 0 et 1. Éteint ou allumé, non ou oui. Dans un ordinateur, un bit est une tension sur un minuscule fil : haute pour 1, basse pour 0.",
      },
      example: {
        en: "“Is it raining?” fits in one bit: 1 for yes, 0 for no.",
        fr: "« Est-ce qu’il pleut ? » tient dans un bit : 1 pour oui, 0 pour non.",
      },
      try: { en: "Flip the switch to change the bit.", fr: "Bascule l’interrupteur pour changer le bit." },
      facts: [
        {
          en: "“Bit” is short for binary digit. Claude Shannon made the word famous in 1948, in the paper that founded information theory.",
          fr: "« Bit » est la contraction de l’anglais binary digit, « chiffre binaire ». Claude Shannon a rendu le mot célèbre en 1948, dans l’article qui a fondé la théorie de l’information.",
        },
        {
          en: "The power symbol on your devices merges a 1 and a 0: a line inside a circle, on and off.",
          fr: "Le symbole marche/arrêt de tes appareils mélange un 1 et un 0 : un trait dans un cercle, allumé et éteint.",
        },
      ],
    },
    {
      id: "where",
      title: { en: "Where bits live", fr: "Où vivent les bits ?" },
      text: {
        en: "A bit is not a thing but a state. It can be stored wherever two states are easy to tell apart: a voltage in a chip, a tiny magnet pointing up or down on a hard disk, a flash of light in an optical fibre.",
        fr: "Un bit n’est pas un objet, c’est un état. On peut le ranger partout où deux états se distinguent bien : une tension dans une puce, un minuscule aimant tourné vers le haut ou vers le bas sur un disque dur, un éclair de lumière dans une fibre optique.",
      },
      example: {
        en: "In an optical fibre, a flash means 1 and darkness means 0. Billions of flashes go through every second.",
        fr: "Dans une fibre optique, un éclair vaut 1 et le noir vaut 0. Des milliards d’éclairs y passent chaque seconde.",
      },
      facts: [
        {
          en: "On a modern hard disk, one bit is a magnetised patch a few tens of nanometres wide, far smaller than a bacterium.",
          fr: "Sur un disque dur récent, un bit est une zone aimantée de quelques dizaines de nanomètres de large, bien plus petite qu’une bactérie.",
        },
        {
          en: "Early computers read their programs from punched cards: at each position, a hole or no hole.",
          fr: "Les premiers ordinateurs lisaient leurs programmes sur des cartes perforées : à chaque position, un trou ou pas de trou.",
        },
      ],
      labels: [
        { anchor: "chip", place: "below", text: { en: "Chip: a voltage", fr: "Puce : une tension" } },
        { anchor: "disk", place: "below", text: { en: "Hard disk: a magnet", fr: "Disque dur : un aimant" } },
        { anchor: "fibre", place: "below", text: { en: "Optical fibre: light", fr: "Fibre optique : la lumière" } },
      ],
    },
    {
      id: "double",
      title: { en: "Each bit doubles the choices", fr: "Chaque bit double les possibilités" },
      text: {
        en: "With 1 bit there are 2 possibilities. With 2 bits, 00, 01, 10 and 11: that makes 4. Each extra bit doubles the count: 3 bits give 8 possibilities, and 8 bits give 256.",
        fr: "Avec 1 bit, il y a 2 possibilités. Avec 2 bits, 00, 01, 10 et 11 : ça fait 4. Chaque bit en plus double le compte : 3 bits donnent 8 possibilités, et 8 bits en donnent 256.",
      },
      example: {
        en: "To name one square of a chessboard, 6 bits are enough: 2 × 2 × 2 × 2 × 2 × 2 = 64 squares.",
        fr: "Pour désigner une case d’un échiquier, 6 bits suffisent : 2 × 2 × 2 × 2 × 2 × 2 = 64 cases.",
      },
      facts: [
        {
          en: "With 32 bits you can count past 4 billion. That is why the old Internet addresses (IPv4), 32 bits long, have nearly all been handed out.",
          fr: "Avec 32 bits, on dépasse les 4 milliards de possibilités. C’est pour ça que les anciennes adresses Internet (IPv4), longues de 32 bits, sont presque toutes attribuées.",
        },
        {
          en: "Since each bit doubles the possibilities, 64 bits offer more than 18 billion billion.",
          fr: "Comme chaque bit double les possibilités, 64 bits en offrent plus de 18 milliards de milliards.",
        },
      ],
      labels: [
        { anchor: "column-1", text: { en: "1 bit → 2", fr: "1 bit → 2" } },
        { anchor: "column-2", text: { en: "2 bits → 4", fr: "2 bits → 4" } },
        { anchor: "column-3", text: { en: "3 bits → 8", fr: "3 bits → 8" } },
      ],
    },
    {
      id: "count",
      title: { en: "Counting with 0 and 1", fr: "Compter avec des 0 et des 1" },
      text: {
        en: "In binary, each position is worth twice the one on its right: 1, 2, 4, 8, 16… To read a number, add up the values of the bits that are on.",
        fr: "En binaire, chaque position vaut le double de sa voisine de droite : 1, 2, 4, 8, 16… Pour lire un nombre, on additionne les valeurs des bits allumés.",
      },
      example: {
        en: "Bits on at 8, 4 and 1: 00001101 = 8 + 4 + 1 = 13.",
        fr: "Bits allumés en 8, 4 et 1 : 00001101 = 8 + 4 + 1 = 13.",
      },
      try: {
        en: "Click the bits to turn them on or off, or add 1 and watch the carries.",
        fr: "Clique sur les bits pour les allumer ou les éteindre, ou ajoute 1 et observe les retenues.",
      },
      facts: [
        {
          en: "The largest number on 8 bits is 11111111, or 255. Add 1 and everything falls back to 0, like a car's odometer rolling over.",
          fr: "Le plus grand nombre sur 8 bits est 11111111, soit 255. Ajoute 1 et tout retombe à 0, comme un compteur kilométrique qui fait le tour.",
        },
        {
          en: "We count in tens because we have ten fingers. Computers count in twos because a circuit easily tells two states apart.",
          fr: "On compte par dizaines parce qu’on a dix doigts. Un ordinateur compte par deux parce qu’un circuit distingue facilement deux états.",
        },
      ],
    },
    {
      id: "letter",
      title: { en: "A letter is a number", fr: "Une lettre, c’est un nombre" },
      text: {
        en: "To store text, every character was given a number. Capital A is number 65, written 01000001 in 8 bits: one byte. The screen then draws the letter with pixels.",
        fr: "Pour écrire du texte, on a donné un numéro à chaque caractère. Le A majuscule porte le numéro 65, qui s’écrit 01000001 sur 8 bits : un octet. L’écran dessine ensuite la lettre avec des pixels.",
      },
      example: {
        en: "A = 65 = 01000001 and a = 97 = 01100001: between the capital and the small letter, a single bit changes.",
        fr: "A = 65 = 01000001 et a = 97 = 01100001 : entre la majuscule et la minuscule, un seul bit change.",
      },
      try: { en: "Type a character to see its number and its bits.", fr: "Tape un caractère pour voir son numéro et ses bits." },
      facts: [
        {
          en: "The é was not in ASCII, the original code designed for English. In UTF-8, the most common encoding on the Web, it takes 2 bytes: 11000011 10101001.",
          fr: "Le é ne faisait pas partie de l’ASCII, le code d’origine pensé pour l’anglais. En UTF-8, le codage le plus courant du Web, il prend 2 octets : 11000011 10101001.",
        },
        {
          en: "Emoji have numbers too. The grinning face is number 128,512 and takes 4 bytes in UTF-8.",
          fr: "Les émojis aussi ont un numéro. Le visage souriant porte le numéro 128 512 et prend 4 octets en UTF-8.",
        },
      ],
      source: { label: "Unicode Consortium", url: "https://www.unicode.org/charts/PDF/U0000.pdf" },
    },
    {
      id: "color",
      title: { en: "A colour is three bytes", fr: "Une couleur, c’est trois octets" },
      text: {
        en: "Each pixel of a screen mixes three lights: red, green and blue. Each one gets a byte, from 0 (off) to 255 (full power). Three bytes, 24 bits, describe one colour.",
        fr: "Chaque pixel d’un écran mélange trois lumières : rouge, vert et bleu. Chacune reçoit un octet, de 0 (éteinte) à 255 (à fond). Trois octets, soit 24 bits, décrivent une couleur.",
      },
      example: {
        en: "This orange is red 255, green 138, blue 61. A 12-megapixel photo therefore holds 36 million bytes before compression.",
        fr: "Cet orange, c’est rouge 255, vert 138, bleu 61. Une photo de 12 millions de pixels contient donc 36 millions d’octets avant compression.",
      },
      try: {
        en: "Switch the bits of each light, or pick a colour, and watch the pixel.",
        fr: "Change les bits de chaque lumière, ou choisis une couleur, et regarde le pixel.",
      },
      facts: [
        {
          en: "With 24 bits you can describe 16,777,216 different colours.",
          fr: "Avec 24 bits, on peut décrire 16 777 216 couleurs différentes.",
        },
        {
          en: "Look at a screen through a magnifying glass: you will see its tiny red, green and blue lights.",
          fr: "Regarde un écran à la loupe : tu verras ses minuscules lumières rouges, vertes et bleues.",
        },
      ],
      theme: { top: "#170a3f", bottom: "#4a1d78", accent: "#ff8a3d", dust: "#ffb3d9" },
    },
  ],
};
