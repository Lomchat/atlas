import type { LessonData } from "../types.ts";

/**
 * Chapter 1: the bit, for young readers. Checked: A = 65, a = 97, m = 109,
 * i = 105, H = 72 (Unicode); 2^10 = 1 024; 8 bits count from 0 to 255;
 * red 255 + green 255 + blue 0 is yellow on a screen; a hard-disk bit is a
 * few tens of nanometres long (thousands across a 70 µm hair).
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
        en: "A bit is the smallest piece of information there is. It has only two values, 0 or 1, like a lamp that is off or on. A computer holds billions of these tiny switches.",
        fr: "Un bit, c’est la plus petite information qui existe. Il n’a que deux valeurs, 0 ou 1, comme une lampe éteinte ou allumée. Un ordinateur contient des milliards de ces minuscules interrupteurs.",
      },
      example: {
        en: "“Is it raining?” Yes or no: one bit is enough to answer. 1 means yes, 0 means no.",
        fr: "« Est-ce qu’il pleut ? » Oui ou non : un seul bit suffit pour répondre. 1 veut dire oui, 0 veut dire non.",
      },
      try: { en: "Flip the switch to change the bit.", fr: "Bascule l’interrupteur pour changer le bit." },
      facts: [
        {
          en: "The word “bit” comes from binary digit: a digit that can only be 0 or 1.",
          fr: "Le mot « bit » vient de l’anglais binary digit, « chiffre binaire » : un chiffre qui ne peut valoir que 0 ou 1.",
        },
        {
          en: "Look at the power button of your devices: its drawing mixes a 1 (a line) and a 0 (a circle).",
          fr: "Regarde le bouton marche/arrêt de tes appareils : son dessin mélange un 1 (un trait) et un 0 (un rond).",
        },
      ],
    },
    {
      id: "where",
      title: { en: "Where bits live", fr: "Où vivent les bits ?" },
      text: {
        en: "A bit can be stored anywhere you can tell two states apart: current or no current in a chip, a tiny magnet pointing up or down, a flash of light or darkness.",
        fr: "On peut ranger un bit partout où l’on distingue deux états : du courant ou pas de courant dans une puce, un minuscule aimant tourné vers le haut ou vers le bas, un éclair de lumière ou le noir.",
      },
      example: {
        en: "In a fibre-optic Internet cable, a flash means 1 and darkness means 0. Billions of flashes go through it every second.",
        fr: "Dans le câble de la fibre optique, un éclair veut dire 1 et le noir veut dire 0. Il y passe des milliards d’éclairs chaque seconde.",
      },
      facts: [
        {
          en: "The very first computers read cards punched with holes: a hole meant 1, no hole meant 0.",
          fr: "Les tout premiers ordinateurs lisaient des cartes percées de trous : un trou, c’était 1 ; pas de trou, c’était 0.",
        },
        {
          en: "On a hard disk, each bit is a magnet so small that thousands of them would fit across a hair.",
          fr: "Sur un disque dur, chaque bit est un aimant si petit qu’il en tiendrait des milliers sur l’épaisseur d’un cheveu.",
        },
      ],
      labels: [
        { anchor: "chip", place: "below", text: { en: "Chip: current", fr: "Puce : du courant" } },
        { anchor: "disk", place: "below", text: { en: "Hard disk: a magnet", fr: "Disque dur : un aimant" } },
        { anchor: "fibre", place: "below", text: { en: "Fibre: light", fr: "Fibre : la lumière" } },
      ],
    },
    {
      id: "double",
      title: { en: "More bits, more choices", fr: "Plus de bits, plus de choix" },
      text: {
        en: "With 1 bit you have 2 choices: 0 or 1. With 2 bits you have 4: 00, 01, 10 and 11. Every time you add a bit, the number of choices doubles.",
        fr: "Avec 1 bit, on a 2 choix : 0 ou 1. Avec 2 bits, on en a 4 : 00, 01, 10 et 11. Chaque fois qu’on ajoute un bit, le nombre de choix double.",
      },
      example: {
        en: "To pick a traffic-light colour (green, amber or red), 2 bits are enough: they give 4 choices, so one is even left over.",
        fr: "Pour choisir la couleur d’un feu (vert, orange ou rouge), 2 bits suffisent : ils offrent 4 choix, il en reste même un.",
      },
      facts: [
        {
          en: "With 10 bits you already have 1,024 choices: 2 × 2 × 2 × 2 × 2 × 2 × 2 × 2 × 2 × 2.",
          fr: "Avec 10 bits, on a déjà 1 024 choix : 2 × 2 × 2 × 2 × 2 × 2 × 2 × 2 × 2 × 2.",
        },
        {
          en: "It is like folding a sheet of paper again and again: each fold doubles the number of layers.",
          fr: "C’est comme plier une feuille en deux encore et encore : à chaque pli, le nombre de couches double.",
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
        en: "In binary you count with only 0 and 1. Each box is worth twice its neighbour on the right: 1, 2, 4, 8… To read the number, add up the boxes that are on.",
        fr: "En binaire, on compte seulement avec 0 et 1. Chaque case vaut le double de sa voisine de droite : 1, 2, 4, 8… Pour lire le nombre, on additionne les cases allumées.",
      },
      example: {
        en: "Boxes 8, 4 and 1 are on: 8 + 4 + 1 = 13. So 1101 in binary is 13.",
        fr: "Les cases 8, 4 et 1 sont allumées : 8 + 4 + 1 = 13. Donc 1101 en binaire, c’est 13.",
      },
      try: {
        en: "Click the bits to turn them on or off, or add 1.",
        fr: "Clique sur les bits pour les allumer ou les éteindre, ou ajoute 1.",
      },
      facts: [
        {
          en: "With 8 bits you can count from 0 to 255. Add 1 to 255 and everything goes back to 0, like a counter going round.",
          fr: "Avec 8 bits, on compte de 0 jusqu’à 255. Ajoute 1 à 255 et tout repasse à 0, comme un compteur qui fait le tour.",
        },
        {
          en: "We count in tens because we have ten fingers. A computer counts in twos because a switch has only two positions.",
          fr: "On compte par dix parce qu’on a dix doigts. Un ordinateur compte par deux parce qu’un interrupteur n’a que deux positions.",
        },
      ],
    },
    {
      id: "letter",
      title: { en: "A letter is a number", fr: "Une lettre, c’est un nombre" },
      text: {
        en: "To write text, every letter was given a number. Capital A is number 65. The computer stores this number as bits, then the screen draws the letter with tiny squares: pixels.",
        fr: "Pour écrire du texte, on a donné un numéro à chaque lettre. Le A majuscule porte le numéro 65. L’ordinateur range ce numéro en bits, puis l’écran dessine la lettre avec de petits carrés : les pixels.",
      },
      example: {
        en: "A is number 65 and a is number 97. When you type “Hi”, the computer really stores 72 and 105.",
        fr: "A porte le numéro 65 et a le numéro 97. Quand tu tapes « Ami », l’ordinateur range en fait 65, 109 et 105.",
      },
      try: { en: "Type a letter to see its number and its bits.", fr: "Tape une lettre pour voir son numéro et ses bits." },
      facts: [
        {
          en: "Emoji have numbers too, just like letters.",
          fr: "Les émojis aussi ont un numéro, comme les lettres.",
        },
        {
          en: "Letters with accents, like é, take a few more bits than the others.",
          fr: "Les lettres avec un accent, comme é, prennent un peu plus de bits que les autres.",
        },
      ],
      source: { label: "Unicode Consortium", url: "https://www.unicode.org/charts/PDF/U0000.pdf" },
    },
    {
      id: "color",
      title: { en: "A colour is three numbers", fr: "Une couleur, c’est trois nombres" },
      text: {
        en: "Each pixel of your screen is made of three tiny lights: red, green and blue. Mixing them more or less brightly gives every colour. Each light goes from 0 (off) to 255 (full).",
        fr: "Chaque pixel de ton écran est fait de trois petites lumières : rouge, verte et bleue. En les mélangeant plus ou moins fort, on obtient toutes les couleurs. Chaque lumière va de 0 (éteinte) à 255 (à fond).",
      },
      example: {
        en: "Full red + full green + no blue makes yellow! And all three at full make white.",
        fr: "Rouge à fond + vert à fond + bleu éteint, ça donne du jaune ! Et les trois à fond donnent du blanc.",
      },
      try: {
        en: "Switch the bits of each light, or pick a colour, and watch the pixel.",
        fr: "Change les bits de chaque lumière, ou choisis une couleur, et regarde le pixel.",
      },
      facts: [
        {
          en: "Look at a screen through a magnifying glass: you will see its tiny red, green and blue lights.",
          fr: "Regarde un écran à la loupe : tu verras ses minuscules lumières rouges, vertes et bleues.",
        },
        {
          en: "A phone screen has millions of pixels, which change colour dozens of times per second.",
          fr: "Un écran de téléphone compte des millions de pixels, qui changent de couleur des dizaines de fois par seconde.",
        },
      ],
      theme: { top: "#170a3f", bottom: "#4a1d78", accent: "#ff8a3d", dust: "#ffb3d9" },
    },
  ],
};
