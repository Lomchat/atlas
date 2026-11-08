import type { LessonData } from "../types.ts";

/**
 * Chapter 2: logic gates. From one transistor to a 4-bit adder. Checked:
 * 0101 + 0011 = 1000 (5 + 3 = 8, carries in the three lowest columns),
 * 15 + 15 = 11110 (30), CMOS NOT = 2 transistors, NAND = 4, AND = 6,
 * Intel 4004 (1971) ≈ 2 250 transistors, Apple A17 Pro (2023) ≈ 19 billion on 103.8 mm².
 */
export const gatesLesson: LessonData = {
  id: "gates",
  number: 2,
  status: "ready",
  scene: "gates",
  icon: "gate",
  theme: { top: "#0b2050", bottom: "#1d4f96", accent: "#3fd0ff", dust: "#8fe3ff" },
  title: { en: "Logic gates", fr: "Les portes logiques" },
  short: { en: "Logic gates", fr: "Portes logiques" },
  teaser: {
    en: "Switches that calculate: how a circuit works out 1 + 1 = 10.",
    fr: "Des interrupteurs qui calculent : comment un circuit trouve 1 + 1 = 10.",
  },
  source: { label: "Wikipedia — Logic gate", url: "https://en.wikipedia.org/wiki/Logic_gate" },
  steps: [
    {
      id: "transistor",
      title: { en: "A switch without hands", fr: "Un interrupteur sans les mains" },
      text: {
        en: "A transistor is a switch controlled by electricity. When its gate receives a voltage (1), current flows from the source to the drain; without it (0), the way is blocked. One bit switches another.",
        fr: "Un transistor est un interrupteur commandé par l’électricité. Quand sa grille reçoit une tension (1), le courant passe de la source au drain ; sans tension (0), le passage est bloqué. Un bit en commande un autre.",
      },
      example: {
        en: "The first microprocessor, the Intel 4004 (1971), had about 2,250 transistors. The A17 Pro chip of an iPhone 15 Pro has about 19 billion, on one square centimetre.",
        fr: "Le premier microprocesseur, l’Intel 4004 (1971), comptait environ 2 250 transistors. La puce A17 Pro d’un iPhone 15 Pro en compte environ 19 milliards, sur un centimètre carré.",
      },
      try: { en: "Turn the gate on and off.", fr: "Allume et éteins la grille." },
      facts: [
        {
          en: "The first transistor was built in 1947 at Bell Labs by John Bardeen, Walter Brattain and William Shockley.",
          fr: "Le premier transistor a été construit en 1947 aux laboratoires Bell par John Bardeen, Walter Brattain et William Shockley.",
        },
        {
          en: "Before transistors, computers used vacuum tubes the size of a thumb: ENIAC (1945) had about 18,000 of them.",
          fr: "Avant les transistors, les ordinateurs utilisaient des tubes à vide gros comme un pouce : l’ENIAC (1945) en avait environ 18 000.",
        },
      ],
      labels: [
        { anchor: "gate", text: { en: "Gate", fr: "Grille" } },
        { anchor: "source", place: "below", text: { en: "Source", fr: "Source" } },
        { anchor: "drain", place: "below", text: { en: "Drain", fr: "Drain" } },
      ],
      source: { label: "Wikipedia — Transistor count", url: "https://en.wikipedia.org/wiki/Transistor_count" },
    },
    {
      id: "not",
      title: { en: "NOT: the opposite", fr: "NON : le contraire" },
      text: {
        en: "A logic gate is a small group of transistors that takes bits in and gives one bit out. The simplest, NOT, gives the opposite of its input: 1 becomes 0 and 0 becomes 1.",
        fr: "Une porte logique est un petit groupe de transistors : des bits entrent, un bit sort. La plus simple, NON, donne le contraire de son entrée : 1 devient 0, et 0 devient 1.",
      },
      example: {
        en: "A fridge light works like NOT: door closed (1), light off (0); door open (0), light on (1).",
        fr: "La lampe du frigo marche comme NON : porte fermée (1), lampe éteinte (0) ; porte ouverte (0), lampe allumée (1).",
      },
      try: { en: "Change the input and follow the truth table.", fr: "Change l’entrée et suis la table de vérité." },
      facts: [
        {
          en: "In today's chips, a NOT gate takes only two transistors.",
          fr: "Dans les puces d’aujourd’hui, une porte NON ne demande que deux transistors.",
        },
        {
          en: "Every other gate can be built from NAND gates alone: an AND followed by a NOT.",
          fr: "Toutes les autres portes peuvent être construites avec des portes NON-ET seulement : un ET suivi d’un NON.",
        },
      ],
    },
    {
      id: "and",
      title: { en: "AND: both at once", fr: "ET : les deux à la fois" },
      text: {
        en: "AND outputs 1 only when both of its inputs are 1. In every other case, the output is 0.",
        fr: "ET ne donne 1 que si ses deux entrées valent 1. Dans tous les autres cas, la sortie vaut 0.",
      },
      example: {
        en: "Some industrial presses only start if the worker presses two buttons at once: start = left button AND right button. Both hands are then away from the machine.",
        fr: "Certaines presses industrielles ne démarrent que si l’ouvrier appuie sur deux boutons à la fois : démarrage = bouton gauche ET bouton droit. Ses deux mains sont alors loin de la machine.",
      },
      try: { en: "Switch inputs A and B.", fr: "Bascule les entrées A et B." },
      facts: [
        {
          en: "An AND gate takes six transistors: a NAND gate (four) followed by a NOT (two).",
          fr: "Une porte ET demande six transistors : une porte NON-ET (quatre) suivie d’un NON (deux).",
        },
      ],
    },
    {
      id: "or",
      title: { en: "OR: at least one", fr: "OU : au moins une" },
      text: {
        en: "OR outputs 1 as soon as at least one input is 1. It only outputs 0 when both inputs are 0.",
        fr: "OU donne 1 dès qu’au moins une entrée vaut 1. Il ne donne 0 que si les deux entrées valent 0.",
      },
      example: {
        en: "A car's ceiling light comes on if the driver's door OR the passenger's door is open, or both.",
        fr: "Le plafonnier d’une voiture s’allume si la portière du conducteur OU celle du passager est ouverte, ou les deux.",
      },
      try: { en: "Switch inputs A and B.", fr: "Bascule les entrées A et B." },
      facts: [
        {
          en: "In everyday language, “or” often means one or the other, not both. In logic, OR also accepts both.",
          fr: "Dans la vie courante, « ou » veut souvent dire l’un ou l’autre, pas les deux (« fromage ou dessert »). En logique, OU accepte aussi les deux.",
        },
      ],
    },
    {
      id: "xor",
      title: { en: "XOR: one or the other", fr: "OU exclusif : l’un ou l’autre" },
      text: {
        en: "Exclusive OR (XOR) outputs 1 when its two inputs are different, and 0 when they are the same.",
        fr: "Le OU exclusif (XOR) donne 1 quand ses deux entrées sont différentes, et 0 quand elles sont pareilles.",
      },
      example: {
        en: "A staircase light with one switch at the top and one at the bottom: flipping either one changes the light. Light = top XOR bottom.",
        fr: "Une lampe d’escalier avec un interrupteur en haut et un en bas : basculer l’un ou l’autre change la lampe. Lampe = haut XOR bas.",
      },
      try: { en: "Switch inputs A and B.", fr: "Bascule les entrées A et B." },
      facts: [
        {
          en: "XOR is everywhere in encryption: mix a message with a secret key using XOR, apply the same key again, and the message comes back.",
          fr: "Le XOR est partout en chiffrement : on mélange un message à une clé secrète avec XOR, on réapplique la même clé, et le message réapparaît.",
        },
      ],
    },
    {
      id: "half",
      title: { en: "Adding with gates", fr: "Additionner avec des portes" },
      text: {
        en: "To add two bits, two gates are enough. XOR gives the digit of the result, AND gives the carry. This circuit is called a half adder.",
        fr: "Pour additionner deux bits, deux portes suffisent. XOR donne le chiffre du résultat, ET donne la retenue. Ce circuit s’appelle un demi-additionneur.",
      },
      example: {
        en: "1 + 1: XOR gives 0 and AND gives a carry of 1. The result is 10 in binary, which is 2.",
        fr: "1 + 1 : XOR donne 0 et ET donne une retenue de 1. Le résultat s’écrit 10 en binaire, c’est-à-dire 2.",
      },
      try: { en: "Switch A and B: the circuit adds them.", fr: "Bascule A et B : le circuit les additionne." },
      facts: [
        {
          en: "It is how you add by hand: 9 + 1 = 10, write 0 and carry 1. In binary, the carry already appears at 1 + 1.",
          fr: "C’est comme une addition posée : 9 + 1 = 10, je pose 0 et je retiens 1. En binaire, la retenue arrive dès 1 + 1.",
        },
      ],
      labels: [
        { anchor: "xor", place: "below", text: { en: "XOR", fr: "XOR" } },
        { anchor: "and", place: "below", text: { en: "AND", fr: "ET" } },
        { anchor: "sum", text: { en: "Sum", fr: "Somme" } },
        { anchor: "carry", text: { en: "Carry", fr: "Retenue" } },
      ],
    },
    {
      id: "adder",
      title: { en: "5 + 3 = 8, bit by bit", fr: "5 + 3 = 8, bit par bit" },
      text: {
        en: "Chain four adders and the carry travels from column to column, just like when you add by hand. The circuit can then add any two numbers from 0 to 15.",
        fr: "En enchaînant quatre additionneurs, la retenue passe de colonne en colonne, comme dans une addition posée. Le circuit additionne alors deux nombres de 0 à 15.",
      },
      example: {
        en: "0101 (5) + 0011 (3): 1 + 1 = 10, carry 1; 0 + 1 + 1 = 10, carry 1; 1 + 0 + 1 = 10, carry 1; 0 + 0 + 1 = 1. Result: 1000, which is 8.",
        fr: "0101 (5) + 0011 (3) : 1 + 1 = 10, je retiens 1 ; 0 + 1 + 1 = 10, je retiens 1 ; 1 + 0 + 1 = 10, je retiens 1 ; 0 + 0 + 1 = 1. Résultat : 1000, soit 8.",
      },
      try: { en: "Change the bits of both numbers.", fr: "Change les bits des deux nombres." },
      facts: [
        {
          en: "The result can need a fifth bit: 15 + 15 = 30, written 11110.",
          fr: "Le résultat peut demander un cinquième bit : 15 + 15 = 30, qui s’écrit 11110.",
        },
        {
          en: "A processor adds two 64-bit numbers in well under a nanosecond, billions of times per second.",
          fr: "Un processeur additionne deux nombres de 64 bits en bien moins d’une nanoseconde, des milliards de fois par seconde.",
        },
      ],
      labels: [
        { anchor: "number-a", place: "left", text: { en: "A", fr: "A" } },
        { anchor: "number-b", place: "left", text: { en: "B", fr: "B" } },
        { anchor: "result", place: "below", text: { en: "A + B", fr: "A + B" } },
      ],
    },
  ],
};
