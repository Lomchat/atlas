import type { LessonData } from "../types.ts";

/**
 * Chapter 2: logic gates, for young readers. Checked: 0101 + 0011 = 1000
 * (5 + 3 = 8, carries in the three lowest columns); 15 + 15 = 30; a CMOS NOT
 * gate has 2 transistors; the first transistor dates from 1947; transistors
 * about 50 nm apart, so more than 1 000 across a 70 µm hair.
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
      title: { en: "A switch without a button", fr: "Un interrupteur sans bouton" },
      text: {
        en: "A transistor is a switch with no button: electricity turns it on. When its gate gets current (1), current flows through; otherwise (0), it is blocked. So one bit can switch another.",
        fr: "Un transistor est un interrupteur sans bouton : c’est l’électricité qui l’allume. Quand sa grille reçoit du courant (1), le courant passe ; sinon (0), il est bloqué. Un bit peut donc en allumer un autre.",
      },
      example: {
        en: "Right now the gate gets {gate}, so the current {flows}. Your phone holds billions of these switches, on a chip about the size of a fingernail.",
        fr: "En ce moment, la grille reçoit {gate}, donc le courant {flows}. Ton téléphone contient des milliards de ces interrupteurs, sur une puce grande comme un ongle.",
      },
      try: { en: "Turn the gate on and off.", fr: "Allume et éteins la grille." },
      facts: [
        {
          en: "The first transistor was built in 1947. Today, more than a thousand of them would fit side by side across a hair.",
          fr: "Le premier transistor a été construit en 1947. Aujourd’hui, plus de mille transistors tiendraient côte à côte sur l’épaisseur d’un cheveu.",
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
        en: "A logic gate is a small group of transistors: bits go in, one bit comes out. The simplest, NOT, does the opposite: 1 becomes 0, and 0 becomes 1.",
        fr: "Une porte logique est un petit groupe de transistors : des bits entrent, un bit sort. La plus simple, NON, fait le contraire : 1 devient 0, et 0 devient 1.",
      },
      example: {
        en: "Input {a}, so NOT gives {out}. Like a fridge light: door closed, light off; door open, light on.",
        fr: "L’entrée vaut {a}, donc NON donne {out}. Comme la lampe du frigo : porte fermée, lampe éteinte ; porte ouverte, lampe allumée.",
      },
      try: { en: "Change the input and follow the table.", fr: "Change l’entrée et suis le tableau." },
      facts: [
        {
          en: "A NOT gate needs only two transistors.",
          fr: "Une porte NON n’a besoin que de deux transistors.",
        },
        {
          en: "By combining gates, you can build any calculation at all.",
          fr: "En combinant des portes, on peut fabriquer n’importe quel calcul.",
        },
      ],
    },
    {
      id: "and",
      title: { en: "AND: both at once", fr: "ET : les deux à la fois" },
      text: {
        en: "AND gives 1 only when both inputs are 1. In every other case, it gives 0.",
        fr: "ET donne 1 seulement si les deux entrées valent 1. Dans tous les autres cas, il donne 0.",
      },
      example: {
        en: "A = {a} and B = {b}, so AND gives {out}. Like a machine that only starts when you press two buttons at once, one with each hand.",
        fr: "A = {a} et B = {b}, donc ET donne {out}. Comme une machine qui ne démarre que si on appuie sur deux boutons à la fois, un avec chaque main.",
      },
      try: { en: "Switch inputs A and B.", fr: "Bascule les entrées A et B." },
      facts: [
        {
          en: "An AND gate is built with only six transistors.",
          fr: "Une porte ET se fabrique avec seulement six transistors.",
        },
      ],
    },
    {
      id: "or",
      title: { en: "OR: at least one", fr: "OU : au moins une" },
      text: {
        en: "OR gives 1 as soon as at least one input is 1. It only gives 0 when both are 0.",
        fr: "OU donne 1 dès qu’au moins une entrée vaut 1. Il ne donne 0 que si les deux valent 0.",
      },
      example: {
        en: "A = {a} or B = {b}, so OR gives {out}. Like a car’s ceiling light: one open door is enough to turn it on.",
        fr: "A = {a} ou B = {b}, donc OU donne {out}. Comme le plafonnier d’une voiture : une seule portière ouverte suffit à l’allumer.",
      },
      try: { en: "Switch inputs A and B.", fr: "Bascule les entrées A et B." },
      facts: [
        {
          en: "In logic, OR also accepts both. In real life, “cheese or dessert” often means only one of them!",
          fr: "En logique, OU accepte aussi les deux. Dans la vie, « fromage ou dessert » veut souvent dire un seul des deux !",
        },
      ],
    },
    {
      id: "xor",
      title: { en: "XOR: one or the other", fr: "OU exclusif : l’un ou l’autre" },
      text: {
        en: "Exclusive OR (XOR) gives 1 when its two inputs are different, and 0 when they are the same.",
        fr: "Le OU exclusif (XOR) donne 1 quand ses deux entrées sont différentes, et 0 quand elles sont pareilles.",
      },
      example: {
        en: "A = {a} and B = {b}: the inputs are {same}, so XOR gives {out}. Like a staircase light with a switch at each end: flipping either one changes the light.",
        fr: "A = {a} et B = {b} : les entrées sont {same}, donc XOR donne {out}. Comme une lampe d’escalier avec un interrupteur à chaque bout : basculer l’un ou l’autre change la lampe.",
      },
      try: { en: "Switch inputs A and B.", fr: "Bascule les entrées A et B." },
      facts: [
        {
          en: "XOR also helps hide messages: you scramble a text with a secret key, and the same key brings it back.",
          fr: "XOR sert aussi à cacher des messages : on brouille un texte avec une clé secrète, et la même clé le fait réapparaître.",
        },
      ],
    },
    {
      id: "half",
      title: { en: "Adding with gates", fr: "Additionner avec des portes" },
      text: {
        en: "Two gates are enough to add two bits! XOR gives the digit of the result, AND gives the carry.",
        fr: "Deux portes suffisent pour additionner deux bits ! XOR donne le chiffre du résultat, ET donne la retenue.",
      },
      example: {
        en: "{a} + {b}: XOR writes {sum} and AND carries {carry}. Result: {result} in binary, which is {value}.",
        fr: "{a} + {b} : XOR pose {sum} et ET retient {carry}. Résultat : {result} en binaire, c’est-à-dire {value}.",
      },
      try: { en: "Switch A and B: the circuit adds them.", fr: "Bascule A et B : le circuit les additionne." },
      facts: [
        {
          en: "It is just like 9 + 1: you write 0 and carry 1. In binary, it already happens at 1 + 1.",
          fr: "C’est comme 9 + 1 : on pose 0 et on retient 1. En binaire, ça arrive dès 1 + 1.",
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
        en: "Put four adders side by side and the carry travels from column to column, just like when you add on paper. The circuit can then add numbers up to 15.",
        fr: "En mettant quatre additionneurs côte à côte, la retenue passe d’une colonne à l’autre, comme quand tu poses une addition. Le circuit additionne alors des nombres jusqu’à 15.",
      },
      example: {
        en: "{x} + {y} in binary: {xb} + {yb} = {sb}, which is {s}. Watch the carry jump from column to column!",
        fr: "{x} + {y} en binaire : {xb} + {yb} = {sb}, c’est-à-dire {s}. Regarde la retenue sauter de colonne en colonne !",
      },
      try: { en: "Change the bits of both numbers.", fr: "Change les bits des deux nombres." },
      facts: [
        {
          en: "Your computer adds much bigger numbers in the same way, billions of times per second.",
          fr: "Ton ordinateur additionne des nombres bien plus grands de la même façon, des milliards de fois par seconde.",
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
