import type { LessonData } from "../types.ts";

/**
 * Chapter 5: neural networks. Checked: 0.8 × 0.6 + 1 × 1.5 − 1 = 0.98;
 * 0.8 × 0.6 + 1 × 0.3 − 1 = −0.22; one perceptron step with rate 0.1 gives
 * 0.68, 0.4, −0.9 and a total of 0.044; a 784 → 128 → 10 network has
 * 101,770 weights and biases; GPT-3 has 175 billion (≈ 1.7 million times
 * more); MNIST has 60,000 training and 10,000 test images; the perceptron
 * dates from 1958 (Rosenblatt).
 */
export const neuronsLesson: LessonData = {
  id: "neurons",
  number: 5,
  status: "ready",
  scene: "neurons",
  icon: "neuron",
  theme: { top: "#2a1106", bottom: "#86370f", accent: "#ff8a3d", dust: "#ffc08f" },
  title: { en: "Neural networks", fr: "Les réseaux de neurones" },
  short: { en: "Neurons", fr: "Neurones" },
  teaser: {
    en: "A machine that learns from its mistakes, one weight at a time.",
    fr: "Une machine qui apprend de ses erreurs, un poids à la fois.",
  },
  source: { label: "Wikipedia — Perceptron", url: "https://en.wikipedia.org/wiki/Perceptron" },
  steps: [
    {
      id: "neuron",
      title: { en: "An artificial neuron", fr: "Un neurone artificiel" },
      text: {
        en: "An artificial neuron multiplies each input by a weight, adds everything up with a bias, and fires (1) if the total is above 0. Otherwise it stays at 0.",
        fr: "Un neurone artificiel multiplie chaque entrée par un poids, additionne le tout avec un biais, et s’active (1) si le total dépasse 0. Sinon, il reste à 0.",
      },
      example: {
        en: "Take an umbrella? Clouds 0.8 × 0.6 + rain forecast 1 × 1.5 − 1 = 0.98. That is above 0: yes.",
        fr: "Prendre son parapluie ? Nuages 0,8 × 0,6 + pluie annoncée 1 × 1,5 − 1 = 0,98. C’est plus que 0 : oui.",
      },
      try: { en: "Change the clouds and the forecast.", fr: "Change les nuages et la météo." },
      facts: [
        {
          en: "This model, the perceptron, was built by Frank Rosenblatt in 1958.",
          fr: "Ce modèle, le perceptron, a été construit par Frank Rosenblatt en 1958.",
        },
      ],
    },
    {
      id: "weights",
      title: { en: "Weights are importance", fr: "Les poids, c’est l’importance" },
      text: {
        en: "The weights say how much each input counts. Same sky, same forecast: other weights give another decision.",
        fr: "Les poids disent combien compte chaque entrée. Même ciel, même météo : d’autres poids donnent une autre décision.",
      },
      example: {
        en: "If the forecast only weighs 0.3: 0.8 × 0.6 + 1 × 0.3 − 1 = −0.22. Below 0: no umbrella.",
        fr: "Si la météo ne pèse que 0,3 : 0,8 × 0,6 + 1 × 0,3 − 1 = −0,22. En dessous de 0 : pas de parapluie.",
      },
      try: { en: "Change the weight of the forecast.", fr: "Change le poids de la météo." },
      facts: [
        {
          en: "Nobody sets these weights by hand: the network finds them by itself, as the next step shows.",
          fr: "Personne ne règle ces poids à la main : le réseau les trouve tout seul, comme le montre l’étape suivante.",
        },
      ],
    },
    {
      id: "learn",
      title: { en: "Learning from a mistake", fr: "Apprendre d’une erreur" },
      text: {
        en: "It rained, but the neuron said no: the error is 1 − 0 = 1. Each weight then moves a little, in proportion to the error and to its input: weight + 0.1 × error × input.",
        fr: "Il a plu, mais le neurone a dit non : l’erreur vaut 1 − 0 = 1. Chaque poids bouge alors un peu, en proportion de l’erreur et de son entrée : poids + 0,1 × erreur × entrée.",
      },
      example: {
        en: "Clouds: 0.6 + 0.1 × 1 × 0.8 = 0.68. Forecast: 0.3 + 0.1 × 1 × 1 = 0.4. Bias: −1 + 0.1 = −0.9. New total: 0.044, above 0: this time, yes.",
        fr: "Nuages : 0,6 + 0,1 × 1 × 0,8 = 0,68. Météo : 0,3 + 0,1 × 1 × 1 = 0,4. Biais : −1 + 0,1 = −0,9. Nouveau total : 0,044, plus que 0 : cette fois, oui.",
      },
      try: { en: "Let the neuron learn.", fr: "Laisse le neurone apprendre." },
      facts: [
        {
          en: "Today’s networks use a smoother version of this rule, gradient descent, repeated over millions of examples.",
          fr: "Les réseaux actuels utilisent une version plus fine de cette règle, la descente de gradient, répétée sur des millions d’exemples.",
        },
      ],
    },
    {
      id: "network",
      title: { en: "Neurons in layers", fr: "Des neurones en couches" },
      text: {
        en: "Put neurons in layers, each layer connected to the next: this is a neural network. The first layer reads the input; the last one gives the answer.",
        fr: "Place des neurones en couches, chaque couche reliée à la suivante : c’est un réseau de neurones. La première couche lit l’entrée ; la dernière donne la réponse.",
      },
      example: {
        en: "To read handwritten digits: 784 inputs, one per pixel of a 28 × 28 image, and 10 outputs, one per digit. The strongest output is the answer.",
        fr: "Pour lire des chiffres écrits à la main : 784 entrées, une par pixel d’une image de 28 × 28, et 10 sorties, une par chiffre. La sortie la plus forte donne la réponse.",
      },
      try: { en: "Show it another digit.", fr: "Montre-lui un autre chiffre." },
      facts: [
        {
          en: "The picture uses a 7 × 7 grid to stay readable, and its scores are illustrative.",
          fr: "L’image utilise une grille de 7 × 7 pour rester lisible, et ses scores sont une illustration.",
        },
      ],
      labels: [{ anchor: "pixels", place: "below", text: { en: "Pixels in", fr: "Pixels en entrée" } }],
    },
    {
      id: "training",
      title: { en: "Thousands of examples", fr: "Des milliers d’exemples" },
      text: {
        en: "At first the weights are random and the network answers at random. After each example, every weight moves a little to reduce the error. Little by little, mistakes become rare.",
        fr: "Au départ, les poids sont tirés au hasard et le réseau répond n’importe quoi. Après chaque exemple, chaque poids bouge un peu pour réduire l’erreur. Peu à peu, les erreurs deviennent rares.",
      },
      example: {
        en: "The classic MNIST collection has 60,000 handwritten digits for training. A simple network trained on it reads about 98 out of 100 new digits correctly.",
        fr: "La collection classique MNIST compte 60 000 chiffres écrits à la main pour l’entraînement. Un réseau simple entraîné dessus lit correctement environ 98 chiffres nouveaux sur 100.",
      },
      facts: [
        {
          en: "MNIST keeps 10,000 other digits apart: the network never sees them while learning, so the score is honest.",
          fr: "MNIST garde 10 000 autres chiffres à part : le réseau ne les voit jamais pendant l’apprentissage, le score est donc honnête.",
        },
      ],
      labels: [
        { anchor: "axis-error", place: "left", text: { en: "Errors", fr: "Erreurs" } },
        { anchor: "axis-examples", place: "below", text: { en: "Examples seen", fr: "Exemples vus" } },
      ],
      source: { label: "Wikipedia — MNIST database", url: "https://en.wikipedia.org/wiki/MNIST_database" },
    },
    {
      id: "scale",
      title: { en: "From a hundred thousand to billions", fr: "De cent mille à des milliards" },
      text: {
        en: "The digit reader has about a hundred thousand weights. Language models work the same way, on a gigantic scale: billions of weights, adjusted on billions of sentences.",
        fr: "Le lecteur de chiffres a environ cent mille poids. Les modèles de langage fonctionnent pareil, à une échelle gigantesque : des milliards de poids, ajustés sur des milliards de phrases.",
      },
      example: {
        en: "784 × 128 + 128 × 10 weights, plus the biases: 101,770 numbers. GPT-3 has 175 billion, about 1.7 million times more.",
        fr: "784 × 128 + 128 × 10 poids, plus les biais : 101 770 nombres. GPT-3 en a 175 milliards, environ 1,7 million de fois plus.",
      },
      facts: [
        {
          en: "Training a model of that size takes weeks on thousands of specialised chips.",
          fr: "Entraîner un modèle de cette taille demande des semaines sur des milliers de puces spécialisées.",
        },
      ],
      labels: [
        { anchor: "small", place: "below", text: { en: "≈ 100,000 weights", fr: "≈ 100 000 poids" } },
        { anchor: "huge", place: "below", text: { en: "175 billion (GPT-3)", fr: "175 milliards (GPT-3)" } },
      ],
      source: { label: "Brown et al., 2020", url: "https://arxiv.org/abs/2005.14165" },
    },
  ],
};
