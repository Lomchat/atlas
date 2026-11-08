import type { LessonData } from "../types.ts";

/**
 * Chapter 5: neural networks, for young readers, with whole numbers.
 * Checked (see logic/neurons.ts): 8 × 1 + 1 × 5 = 13 > 10; 8 × 1 + 1 × 1 = 9;
 * learning 1 → 2 → 3 points gives 9, 10, 11; a 784 → 128 → 10 network has
 * 101,770 weights; GPT-3 has 175 billion (≈ 1.7 million times more);
 * MNIST has 60,000 training images and simple networks get ≈ 98 % right;
 * the perceptron dates from 1958.
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
    en: "A machine that learns from its mistakes, little by little.",
    fr: "Une machine qui apprend de ses erreurs, petit à petit.",
  },
  source: { label: "Wikipedia — Perceptron", url: "https://en.wikipedia.org/wiki/Perceptron" },
  steps: [
    {
      id: "neuron",
      title: { en: "An artificial neuron", fr: "Un neurone artificiel" },
      text: {
        en: "An artificial neuron is a tiny decision machine. It gives points to clues, adds them up, and says yes if the total is more than a threshold.",
        fr: "Un neurone artificiel est une toute petite machine à décider. Il donne des points à des indices, les additionne, et répond oui si le total dépasse un seuil.",
      },
      example: {
        en: "Take an umbrella? Each cloud counts 1 point, a rain forecast counts 5. Sky 8 out of 10 cloudy and rain forecast: 8 × 1 + 1 × 5 = 13 points. More than 10: take the umbrella!",
        fr: "Prendre son parapluie ? Chaque nuage vaut 1 point, la pluie annoncée vaut 5 points. Ciel couvert à 8 sur 10 et pluie annoncée : 8 × 1 + 1 × 5 = 13 points. C’est plus que 10 : on prend le parapluie !",
      },
      try: { en: "Change the clouds and the forecast.", fr: "Change les nuages et la météo." },
      facts: [
        {
          en: "One of the first artificial neurons, the perceptron, was built in 1958.",
          fr: "L’un des premiers neurones artificiels, le perceptron, a été construit en 1958.",
        },
      ],
    },
    {
      id: "weights",
      title: { en: "Weights are importance", fr: "Les poids, c’est l’importance" },
      text: {
        en: "The points given to each clue are called weights. They say what matters most. With other weights, the same sky leads to another decision.",
        fr: "Les points donnés à chaque indice s’appellent des poids. Ils disent ce qui compte le plus. Avec d’autres poids, le même ciel donne une autre décision.",
      },
      example: {
        en: "If the forecast only counts 1 point: 8 × 1 + 1 × 1 = 9. That is not more than 10: no umbrella.",
        fr: "Si la météo ne vaut plus que 1 point : 8 × 1 + 1 × 1 = 9. Ce n’est pas plus que 10 : pas de parapluie.",
      },
      try: { en: "Change the points of the forecast.", fr: "Change les points de la météo." },
      facts: [
        {
          en: "Nobody sets these weights by hand: the network finds them by itself, by practising.",
          fr: "Personne ne règle ces poids à la main : le réseau les trouve tout seul, en s’entraînant.",
        },
      ],
    },
    {
      id: "learn",
      title: { en: "Learning from a mistake", fr: "Apprendre d’une erreur" },
      text: {
        en: "It rained, but the neuron said no: it got it wrong! To learn, we give a little more weight to the clue that should have counted more: the forecast.",
        fr: "Il a plu, mais le neurone a dit non : il s’est trompé ! Pour apprendre, on donne un peu plus de poids à l’indice qui aurait dû compter plus : la météo.",
      },
      example: {
        en: "The forecast goes from 1 to 2 points: 8 + 2 = 10, still not more than 10. Once more: 3 points, 8 + 3 = 11. This time, yes!",
        fr: "La météo passe de 1 à 2 points : 8 + 2 = 10, toujours pas plus que 10. Encore une fois : 3 points, 8 + 3 = 11. Cette fois, c’est oui !",
      },
      try: { en: "Let the neuron learn from its mistakes.", fr: "Laisse le neurone apprendre de ses erreurs." },
      facts: [
        {
          en: "Real networks learn like this, but they adjust millions of weights, a tiny bit each time.",
          fr: "Les vrais réseaux apprennent comme ça, mais ils ajustent des millions de poids, un tout petit peu à chaque fois.",
        },
      ],
    },
    {
      id: "network",
      title: { en: "Neurons in layers", fr: "Des neurones en couches" },
      text: {
        en: "Connect lots of neurons in layers and you get a neural network. The first layer looks at the picture; the last one gives the answer.",
        fr: "En reliant beaucoup de neurones en couches, on obtient un réseau de neurones. La première couche regarde l’image, la dernière donne la réponse.",
      },
      example: {
        en: "To recognise a handwritten digit, the network looks at each little square of the picture and lights up the output of the digit it recognises: here, 7.",
        fr: "Pour reconnaître un chiffre écrit à la main, le réseau regarde chaque petit carré de l’image et allume la sortie du chiffre qu’il reconnaît : ici, le 7.",
      },
      try: { en: "Show it another digit.", fr: "Montre-lui un autre chiffre." },
      facts: [
        {
          en: "Here the picture has 7 × 7 squares to stay readable; real ones have 28 × 28, that is 784 squares.",
          fr: "Ici, l’image fait 7 × 7 carrés pour rester lisible ; les vraies en font 28 × 28, soit 784 carrés.",
        },
      ],
      labels: [{ anchor: "pixels", place: "below", text: { en: "The picture", fr: "L’image" } }],
    },
    {
      id: "training",
      title: { en: "Thousands of examples", fr: "Des milliers d’exemples" },
      text: {
        en: "At first the network answers at random. We show it thousands of examples, and after each mistake its weights move a little. Little by little, it gets it wrong less and less.",
        fr: "Au début, le réseau répond au hasard. On lui montre des milliers d’exemples, et à chaque erreur ses poids bougent un peu. Petit à petit, il se trompe de moins en moins.",
      },
      example: {
        en: "After seeing 60,000 handwritten digits, a small network recognises about 98 out of 100 digits it has never seen before.",
        fr: "Après avoir vu 60 000 chiffres écrits à la main, un petit réseau en reconnaît environ 98 sur 100 qu’il n’avait jamais vus.",
      },
      facts: [
        {
          en: "It is a bit like learning to read: at first you make lots of mistakes, then fewer and fewer.",
          fr: "C’est un peu comme apprendre à lire : au début on se trompe souvent, puis de moins en moins.",
        },
      ],
      labels: [
        { anchor: "axis-error", place: "left", text: { en: "Mistakes", fr: "Erreurs" } },
        { anchor: "axis-examples", place: "below", text: { en: "Examples seen", fr: "Exemples vus" } },
      ],
      source: { label: "Wikipedia — MNIST database", url: "https://en.wikipedia.org/wiki/MNIST_database" },
    },
    {
      id: "scale",
      title: { en: "From a hundred thousand to billions", fr: "De cent mille à des milliards" },
      text: {
        en: "Our digit reader has about 100,000 weights. The AIs that write text work the same way, but with billions of weights!",
        fr: "Notre lecteur de chiffres a environ 100 000 poids. Les intelligences artificielles qui écrivent du texte fonctionnent pareil, mais avec des milliards de poids !",
      },
      example: {
        en: "100,000 weights to read digits; 175 billion for GPT-3, an AI that writes: almost 2 million times more.",
        fr: "100 000 poids pour lire des chiffres ; 175 milliards pour GPT-3, une IA qui écrit : presque 2 millions de fois plus.",
      },
      facts: [
        {
          en: "Training such a big AI takes thousands of computers working for weeks.",
          fr: "Pour entraîner une IA aussi grande, il faut des milliers d’ordinateurs pendant des semaines.",
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
