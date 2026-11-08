import type { LessonData } from "../types.ts";

/**
 * Chapter 3: a dive into a computer, one view per scale, with real sizes on
 * the scale bar (see logic/inside.ts). Checked: 0.3 m / 0.235 nm ≈ 1.3 × 10⁹;
 * 16 GB = 128 × 10⁹ bits; light covers 10 cm in 1/3 ns; A17 Pro die 103.8 mm²
 * and ≈ 19 billion transistors; 50 nm / 0.235 nm ≈ 213; Osborne 1 (1981),
 * 10.7 kg; 300 mm wafers; Si–Si bond 0.235 nm.
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
        en: "Let’s dive into a laptop, as in the Atlas. Under the keyboard lies a board covered with chips; one of them, the processor, does the calculations.",
        fr: "Plongeons dans un ordinateur portable, comme dans l’Atlas. Sous le clavier se cache une carte couverte de puces ; l’une d’elles, le processeur, fait les calculs.",
      },
      example: {
        en: "This laptop is about 30 cm wide. At the bottom of the dive, silicon atoms sit about 0.24 nanometres apart: more than a billion times smaller.",
        fr: "Ce portable fait environ 30 cm de large. Au fond de la plongée, des atomes de silicium sont espacés d’environ 0,24 nanomètre : plus d’un milliard de fois plus petit.",
      },
      facts: [
        {
          en: "One of the first portable computers, the Osborne 1 (1981), weighed 10.7 kg.",
          fr: "L’un des premiers ordinateurs portables, l’Osborne 1 (1981), pesait 10,7 kg.",
        },
      ],
    },
    {
      id: "board",
      title: { en: "The motherboard", fr: "La carte mère" },
      text: {
        en: "Inside, a motherboard connects everything. Copper tracks carry bits between the memory, where data waits, and the processor, which works on it.",
        fr: "À l’intérieur, une carte mère relie tout. Des pistes de cuivre transportent les bits entre la mémoire, où les données attendent, et le processeur, qui les travaille.",
      },
      example: {
        en: "16 gigabytes of memory hold 128 billion bits, each kept as a tiny electric charge.",
        fr: "16 gigaoctets de mémoire retiennent 128 milliards de bits, chacun sous forme d’une minuscule charge électrique.",
      },
      facts: [
        {
          en: "The tracks are etched like a photograph: light hardens a coating, then a bath removes the copper it does not protect.",
          fr: "Les pistes sont gravées comme une photo : la lumière durcit un vernis, puis un bain retire le cuivre qu’il ne protège pas.",
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
        en: "The processor is a silicon chip about a centimetre across. Up close it looks like a city: computing cores, a graphics district and cache memories that keep data close at hand.",
        fr: "Le processeur est une puce de silicium d’environ un centimètre de côté. De près, on dirait une ville : des cœurs de calcul, un quartier graphique et des mémoires caches qui gardent les données à portée de main.",
      },
      example: {
        en: "The A17 Pro chip of an iPhone 15 Pro covers about 104 mm², roughly 1 cm × 1 cm, with about 19 billion transistors.",
        fr: "La puce A17 Pro d’un iPhone 15 Pro couvre environ 104 mm², à peu près 1 cm × 1 cm, avec environ 19 milliards de transistors.",
      },
      facts: [
        {
          en: "Chips are made by the hundred on a silicon disc 30 cm wide, called a wafer, then cut apart.",
          fr: "Les puces sont fabriquées par centaines sur un disque de silicium de 30 cm, appelé wafer (galette), puis découpées.",
        },
      ],
      labels: [
        { anchor: "cores", text: { en: "Computing cores", fr: "Cœurs de calcul" } },
        { anchor: "gpu", text: { en: "Graphics", fr: "Graphismes" } },
        { anchor: "cache", text: { en: "Cache memory", fr: "Mémoire cache" } },
      ],
      source: { label: "Wikipedia — Transistor count", url: "https://en.wikipedia.org/wiki/Transistor_count" },
    },
    {
      id: "core",
      title: { en: "One core", fr: "Un cœur" },
      text: {
        en: "A core reads instructions one after another: fetch a number, add, compare, store. Its arithmetic unit is built from adders like those of chapter 2.",
        fr: "Un cœur lit des instructions l’une après l’autre : chercher un nombre, additionner, comparer, ranger. Son unité de calcul est faite d’additionneurs comme ceux du chapitre 2.",
      },
      example: {
        en: "At 3 GHz, a core’s clock ticks 3 billion times per second. Between two ticks, light travels only 10 cm.",
        fr: "À 3 GHz, l’horloge d’un cœur bat 3 milliards de fois par seconde. Entre deux battements, la lumière ne parcourt que 10 cm.",
      },
      facts: [
        {
          en: "A modern core works on several instructions at once, like an assembly line.",
          fr: "Un cœur moderne travaille sur plusieurs instructions à la fois, comme une chaîne de montage.",
        },
      ],
      labels: [
        { anchor: "alu", text: { en: "Arithmetic unit", fr: "Unité de calcul" } },
        { anchor: "registers", text: { en: "Registers", fr: "Registres" } },
        { anchor: "control", text: { en: "Control", fr: "Contrôle" } },
      ],
    },
    {
      id: "cells",
      title: { en: "Rows of gates", fr: "Des rangées de portes" },
      text: {
        en: "Inside the arithmetic unit, rows of small blocks appear. Each block is a logic gate, like NOT, AND or XOR, wired to its neighbours by metal tracks stacked in layers above.",
        fr: "Dans l’unité de calcul apparaissent des rangées de petits blocs. Chaque bloc est une porte logique, comme NON, ET ou XOR, reliée à ses voisines par des pistes de métal empilées en étages au-dessus.",
      },
      example: {
        en: "This view is about 2 micrometres wide, some 40 times thinner than a hair, and it already holds dozens of gates.",
        fr: "Cette vue fait environ 2 micromètres de large, une quarantaine de fois moins qu’un cheveu, et on y compte déjà des dizaines de portes.",
      },
      facts: [
        {
          en: "A modern chip stacks more than a dozen layers of metal wiring above its transistors.",
          fr: "Une puce moderne empile plus d’une dizaine d’étages de fils de métal au-dessus de ses transistors.",
        },
      ],
      labels: [{ anchor: "cell", text: { en: "One gate", fr: "Une porte" } }],
    },
    {
      id: "transistor",
      title: { en: "A transistor up close", fr: "Un transistor de près" },
      text: {
        en: "Each gate is a few transistors. In today’s chips the channel is a thin fin of silicon, and the gate wraps around it to let the current through or stop it.",
        fr: "Chaque porte, c’est quelques transistors. Dans les puces actuelles, le canal est une fine nageoire de silicium, et la grille l’entoure pour laisser passer le courant ou le couper.",
      },
      example: {
        en: "Two neighbouring transistors are about 50 nanometres apart, more than 1,000 times less than the thickness of a hair.",
        fr: "Deux transistors voisins sont espacés d’environ 50 nanomètres, plus de 1 000 fois moins que l’épaisseur d’un cheveu.",
      },
      facts: [
        {
          en: "The “3 nm” of advertisements names a generation of chips, not the size of a part: neighbouring transistors are about 50 nm apart.",
          fr: "Le « 3 nm » des publicités désigne une génération de puces, pas la taille d’une pièce : les transistors voisins sont à environ 50 nm.",
        },
      ],
      labels: [
        { anchor: "gate", text: { en: "Gate", fr: "Grille" } },
        { anchor: "fin", text: { en: "Fin (channel)", fr: "Nageoire (canal)" } },
      ],
    },
    {
      id: "atoms",
      title: { en: "Silicon atoms", fr: "Des atomes de silicium" },
      text: {
        en: "At the very bottom, the fin is a crystal: silicon atoms neatly stacked, each bonded to four neighbours. Across 50 nanometres, about 200 of them line up.",
        fr: "Tout au fond, la nageoire est un cristal : des atomes de silicium bien rangés, chacun lié à quatre voisins. Sur 50 nanomètres, environ 200 d’entre eux s’alignent.",
      },
      example: {
        en: "Two bonded silicon atoms are 0.235 nanometres apart. Between the laptop and this view, the zoom is more than a billion.",
        fr: "Deux atomes de silicium liés sont à 0,235 nanomètre l’un de l’autre. Entre le portable et cette vue, le zoom dépasse le milliard.",
      },
      facts: [
        {
          en: "The silicon of chips is extracted from very pure silica, the mineral of sand and quartz.",
          fr: "Le silicium des puces est tiré de silice très pure, le minéral du sable et du quartz.",
        },
      ],
      labels: [{ anchor: "atom", text: { en: "Silicon atom", fr: "Atome de silicium" } }],
      source: { label: "Wikipedia — Silicon", url: "https://en.wikipedia.org/wiki/Silicon" },
    },
  ],
};
