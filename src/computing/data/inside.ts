import type { LessonData } from "../types.ts";

/**
 * Chapter 3: a dive into a computer, for young readers, one view per scale
 * with real sizes on the scale bar (see logic/inside.ts). Checked: 0.3 m /
 * 0.235 nm ≈ 1.3 × 10⁹; 16 GB = 128 × 10⁹ bits ≈ 16 bits per person on
 * Earth; light covers 10 cm in 1/3 ns; A17 Pro ≈ 19 billion transistors
 * (more than the 8 billion people); Osborne 1 (1981) 10.7 kg; 2 µm × 40 ≈ a
 * hair; about 50 nm between transistors; about 200 atoms across 50 nm.
 */
export const insideLesson: LessonData = {
  id: "inside",
  number: 3,
  status: "ready",
  scene: "inside",
  icon: "chip",
  theme: { top: "#082a2a", bottom: "#146b5c", accent: "#3ff2b5", dust: "#9cf5d8" },
  title: { en: "Inside a computer", fr: "Au cœur d’un ordinateur" },
  short: { en: "Inside a computer", fr: "Dans l’ordinateur" },
  teaser: {
    en: "Zoom from a laptop down to a transistor, then to a silicon atom.",
    fr: "Zoome d’un ordinateur portable jusqu’au transistor, puis jusqu’à l’atome de silicium.",
  },
  source: { label: "Wikipedia — Semiconductor device fabrication", url: "https://en.wikipedia.org/wiki/Semiconductor_device_fabrication" },
  steps: [
    {
      id: "laptop",
      title: { en: "A laptop", fr: "Un ordinateur portable" },
      text: {
        en: "Let’s dive inside a laptop! Under the keyboard hides a board full of chips. The most important one, the processor, does all the calculations.",
        fr: "Plongeons à l’intérieur d’un ordinateur portable ! Sous le clavier se cache une carte pleine de puces. La plus importante, le processeur, fait tous les calculs.",
      },
      example: {
        en: "This laptop is about 30 cm wide. At the end of the dive, you will see atoms more than a billion times smaller.",
        fr: "Ce portable fait environ 30 cm de large. À la fin de la plongée, tu verras des atomes plus d’un milliard de fois plus petits.",
      },
      facts: [
        {
          en: "One of the very first portable computers, in 1981, weighed more than 10 kg: as much as a big suitcase.",
          fr: "L’un des tout premiers ordinateurs portables, en 1981, pesait plus de 10 kg : autant qu’une grosse valise.",
        },
      ],
    },
    {
      id: "board",
      title: { en: "The motherboard", fr: "La carte mère" },
      text: {
        en: "The motherboard connects everything. Copper paths carry bits between the memory, which keeps the information, and the processor, which uses it.",
        fr: "La carte mère relie tout. Des chemins de cuivre transportent les bits entre la mémoire, qui garde les informations, et le processeur, qui les utilise.",
      },
      example: {
        en: "A 16-gigabyte memory keeps 128 billion bits: about 16 bits for every person on Earth.",
        fr: "Une mémoire de 16 gigaoctets garde 128 milliards de bits : environ 16 bits pour chaque être humain sur Terre.",
      },
      facts: [
        {
          en: "The copper paths are drawn with light, a bit like printing a photo.",
          fr: "Les chemins de cuivre sont dessinés avec de la lumière, un peu comme on imprime une photo.",
        },
      ],
      labels: [
        { anchor: "processor", text: { en: "Processor", fr: "Processeur" } },
        { anchor: "memory", text: { en: "Memory", fr: "Mémoire" } },
      ],
    },
    {
      id: "chip",
      title: { en: "The silicon chip", fr: "La puce de silicium" },
      text: {
        en: "The processor is a silicon chip about the size of a fingernail. Up close it looks like a city with districts: cores that calculate, a part for pictures, and fast memories.",
        fr: "Le processeur est une puce de silicium grande comme un ongle. De près, on dirait une ville avec ses quartiers : des cœurs qui calculent, une partie pour les images, et des mémoires rapides.",
      },
      example: {
        en: "The chip of an iPhone 15 Pro holds about 19 billion transistors: more than the number of people on Earth.",
        fr: "La puce d’un iPhone 15 Pro contient environ 19 milliards de transistors : plus que le nombre d’humains sur Terre.",
      },
      facts: [
        {
          en: "Chips are made by the hundred on a big silicon disc, then cut apart like biscuits.",
          fr: "Les puces sont fabriquées par centaines sur un grand disque de silicium, puis découpées comme des biscuits.",
        },
      ],
      labels: [
        { anchor: "cores", text: { en: "Cores", fr: "Cœurs" } },
        { anchor: "gpu", text: { en: "Pictures", fr: "Images" } },
        { anchor: "cache", text: { en: "Fast memory", fr: "Mémoire rapide" } },
      ],
      source: { label: "Wikipedia — Transistor count", url: "https://en.wikipedia.org/wiki/Transistor_count" },
    },
    {
      id: "core",
      title: { en: "One core", fr: "Un cœur" },
      text: {
        en: "A core follows instructions one by one: take this number, add, compare, put it away. To calculate, it uses adders like the ones in chapter 2.",
        fr: "Un cœur suit des instructions une par une : prends ce nombre, ajoute, compare, range. Pour calculer, il utilise des additionneurs comme ceux du chapitre 2.",
      },
      example: {
        en: "A processor’s clock ticks about 3 billion times per second. Between two ticks, light only has time to travel 10 cm!",
        fr: "L’horloge d’un processeur bat environ 3 milliards de fois par seconde. Entre deux battements, la lumière n’a le temps de parcourir que 10 cm !",
      },
      facts: [
        {
          en: "A computer often has several cores: they work at the same time, like a team.",
          fr: "Un ordinateur a souvent plusieurs cœurs : ils travaillent en même temps, comme une équipe.",
        },
      ],
      labels: [
        { anchor: "alu", text: { en: "Calculating", fr: "Calcul" } },
        { anchor: "registers", text: { en: "Small memories", fr: "Petites mémoires" } },
        { anchor: "control", text: { en: "Instructions", fr: "Instructions" } },
      ],
    },
    {
      id: "cells",
      title: { en: "Rows of gates", fr: "Des rangées de portes" },
      text: {
        en: "In the part that calculates, there are rows of small blocks. Each block is a logic gate like those in chapter 2, joined to the others by metal wires.",
        fr: "Dans la partie qui calcule, on trouve des rangées de petits blocs. Chaque bloc est une porte logique, comme celles du chapitre 2, reliée aux autres par des fils de métal.",
      },
      example: {
        en: "This view is about 2 micrometres wide, 40 times thinner than a hair. Yet it already shows dozens of gates.",
        fr: "Cette vue fait environ 2 micromètres de large, 40 fois moins que l’épaisseur d’un cheveu. Et on y voit déjà des dizaines de portes.",
      },
      facts: [
        {
          en: "Above the gates, the wires are stacked on more than ten floors, like the roads of a giant interchange.",
          fr: "Au-dessus des portes, les fils sont empilés sur plus de dix étages, comme les routes d’un échangeur géant.",
        },
      ],
      labels: [{ anchor: "cell", text: { en: "One gate", fr: "Une porte" } }],
    },
    {
      id: "transistor",
      title: { en: "A transistor up close", fr: "Un transistor de près" },
      text: {
        en: "Each gate is made of a few transistors. The current flows through a thin blade of silicon, and the gate, wrapped around it, lets it through or stops it.",
        fr: "Chaque porte est faite de quelques transistors. Le courant passe dans une fine lame de silicium, et la grille, enroulée autour, le laisse passer ou l’arrête.",
      },
      example: {
        en: "Two neighbouring transistors are about 50 nanometres apart: more than 1,000 times less than the thickness of a hair.",
        fr: "Deux transistors voisins sont à environ 50 nanomètres l’un de l’autre : plus de 1 000 fois moins que l’épaisseur d’un cheveu.",
      },
      facts: [
        {
          en: "To make transistors this small, factories draw them with ultraviolet light, in rooms cleaner than an operating theatre.",
          fr: "Pour fabriquer des transistors aussi petits, les usines les dessinent avec de la lumière ultraviolette, dans des salles plus propres qu’un bloc opératoire.",
        },
      ],
      labels: [
        { anchor: "gate", text: { en: "Gate", fr: "Grille" } },
        { anchor: "fin", text: { en: "Silicon blade", fr: "Lame de silicium" } },
      ],
    },
    {
      id: "atoms",
      title: { en: "Silicon atoms", fr: "Des atomes de silicium" },
      text: {
        en: "At the very bottom, silicon is a crystal: neatly stacked atoms, each holding hands with four neighbours. Across one transistor, about 200 atoms line up.",
        fr: "Tout au fond, le silicium est un cristal : des atomes bien rangés, chacun accroché à quatre voisins. Sur la largeur d’un transistor, environ 200 atomes s’alignent.",
      },
      example: {
        en: "Two neighbouring silicon atoms are less than a billionth of a metre apart. Since the laptop, we have zoomed more than a billion times!",
        fr: "Deux atomes de silicium voisins sont à moins d’un milliardième de mètre l’un de l’autre. Depuis le portable, on a zoomé plus d’un milliard de fois !",
      },
      facts: [
        {
          en: "Silicon comes from sand! It is purified a great deal before chips are made from it.",
          fr: "Le silicium vient du sable ! On le purifie énormément avant d’en faire des puces.",
        },
      ],
      labels: [{ anchor: "atom", text: { en: "Silicon atom", fr: "Atome de silicium" } }],
      source: { label: "Wikipedia — Silicon", url: "https://en.wikipedia.org/wiki/Silicon" },
    },
  ],
};
