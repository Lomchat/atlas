import type { LessonData } from "../types.ts";

/**
 * Chapter 6: AIs that write, for young readers. Toy numbers are labelled as
 * examples. Checked: word vectors (Mikolov et al., 2013) put king − man +
 * woman next to queen; attention was published in 2017 (Vaswani et al.);
 * GPT-3 (2020) read about 300 billion tokens (≈ 225 billion words: over
 * 5,000 years of reading 8 hours a day at 250 words a minute); a 300-word
 * English answer is about 400 tokens.
 */
export const llmLesson: LessonData = {
  id: "llm",
  number: 6,
  status: "ready",
  scene: "llm",
  icon: "llm",
  theme: { top: "#0b1038", bottom: "#28358f", accent: "#a78bff", dust: "#c9b3ff" },
  title: { en: "Large language models", fr: "Les grands modèles de langage" },
  short: { en: "LLMs", fr: "LLM" },
  teaser: {
    en: "How an AI picks the next word, with real examples.",
    fr: "Comment une IA choisit le mot suivant, exemples à l’appui.",
  },
  source: { label: "Hugging Face — LLM Course", url: "https://huggingface.co/learn/llm-course/chapter2/4" },
  steps: [
    {
      id: "tokens",
      title: { en: "Text cut into pieces", fr: "Du texte en morceaux" },
      text: {
        en: "An AI that writes, like a chatbot, does not read letter by letter. It cuts the text into small pieces called tokens and gives each one a number.",
        fr: "Une IA qui écrit, comme un chatbot, ne lit pas les lettres une par une. Elle découpe le texte en petits morceaux appelés tokens, et donne un numéro à chacun.",
      },
      example: {
        en: "“The cat sleeps.” gives 4 tokens: The, cat, sleeps and the full stop. A very long word like “unbelievably” is cut into several pieces.",
        fr: "« Le chat dort. » donne 4 tokens : Le, chat, dort et le point. Un mot très long, comme « anticonstitutionnellement », est coupé en plusieurs morceaux.",
      },
      try: { en: "Type a sentence and watch it being cut.", fr: "Tape une phrase et regarde-la se découper." },
      facts: [
        {
          en: "The numbers shown here are made up: every AI has its own dictionary of pieces.",
          fr: "Les numéros affichés ici sont inventés : chaque IA a son propre dictionnaire de morceaux.",
        },
      ],
    },
    {
      id: "vectors",
      title: { en: "Words as points", fr: "Des mots comme des points" },
      text: {
        en: "Then each word becomes a point in a big space. Words that mean similar things end up close together: animals with animals, fruit with fruit.",
        fr: "Ensuite, chaque mot devient un point dans un grand espace. Les mots qui veulent dire des choses proches se retrouvent ensemble : les animaux d’un côté, les fruits de l’autre.",
      },
      example: {
        en: "The path from “man” to “king” is the same as the path from “woman” to “queen”. The AI learned this all by itself, just by reading.",
        fr: "Le chemin qui va de « homme » à « roi » est le même que celui qui va de « femme » à « reine ». L’IA l’a appris toute seule, rien qu’en lisant.",
      },
      facts: [
        {
          en: "In reality this space does not have 3 directions but thousands! The picture is simplified.",
          fr: "En vrai, cet espace n’a pas 3 directions mais des milliers ! L’image est simplifiée.",
        },
      ],
      labels: [
        { anchor: "word-cat", text: { en: "cat", fr: "chat" } },
        { anchor: "word-dog", text: { en: "dog", fr: "chien" } },
        { anchor: "word-lion", text: { en: "lion", fr: "lion" } },
        { anchor: "word-apple", text: { en: "apple", fr: "pomme" } },
        { anchor: "word-banana", text: { en: "banana", fr: "banane" } },
        { anchor: "word-cherry", text: { en: "cherry", fr: "cerise" } },
        { anchor: "word-king", text: { en: "king", fr: "roi" } },
        { anchor: "word-queen", text: { en: "queen", fr: "reine" } },
        { anchor: "word-man", text: { en: "man", fr: "homme" } },
        { anchor: "word-woman", text: { en: "woman", fr: "femme" } },
      ],
      source: { label: "Mikolov et al., 2013", url: "https://arxiv.org/abs/1301.3781" },
    },
    {
      id: "next",
      title: { en: "Guessing the next word", fr: "Deviner le mot suivant" },
      text: {
        en: "To write, the AI guesses the word that comes next. It gives each possible word a chance, then picks one, usually among the most likely.",
        fr: "Pour écrire, l’IA devine le mot qui vient ensuite. Elle donne une chance à chaque mot possible, puis en choisit un, souvent parmi les plus probables.",
      },
      example: {
        en: "“The cat is sleeping on the…”: sofa has 46 chances out of 100, bed 27, mat 13… (example numbers).",
        fr: "« Le chat dort sur le… » : canapé a 46 chances sur 100, lit 27, tapis 13… (chiffres d’exemple).",
      },
      try: {
        en: "Change the temperature: low, the AI almost always picks the most likely word; high, it tries more surprising ones.",
        fr: "Change la température : basse, l’IA prend presque toujours le mot le plus probable ; haute, elle tente des mots plus surprenants.",
      },
      facts: [
        {
          en: "Temperature is a real setting of these AIs. At zero, they always take the most likely word.",
          fr: "La température est un vrai réglage de ces IA. À zéro, elles prennent toujours le mot le plus probable.",
        },
      ],
    },
    {
      id: "attention",
      title: { en: "Who is “it”?", fr: "Qui est « il » ?" },
      text: {
        en: "To understand a sentence, the AI looks at how the words are linked to each other: this is called attention. For example, it works out who “it” is.",
        fr: "Pour comprendre une phrase, l’IA regarde comment les mots sont liés entre eux : on appelle ça l’attention. Par exemple, elle cherche qui est « il ».",
      },
      example: {
        en: "“The trophy does not fit in the suitcase because it is too big”: “it” is the trophy. Change “big” to “small”, and “it” becomes the suitcase!",
        fr: "« Le trophée ne rentre pas dans la valise car il est trop grand » : « il », c’est le trophée. Remplace « grand » par « petit », et « il » devient la valise !",
      },
      try: { en: "Switch between big and small.", fr: "Passe de grand à petit." },
      facts: [
        {
          en: "This idea of attention, published in 2017, is at the heart of today’s writing AIs.",
          fr: "Cette idée d’attention, publiée en 2017, est au cœur des IA qui écrivent aujourd’hui.",
        },
        {
          en: "The numbers shown are examples: a real AI does this calculation many, many times for each sentence.",
          fr: "Les nombres affichés sont des exemples : une vraie IA refait ce calcul de très nombreuses fois pour chaque phrase.",
        },
      ],
      source: { label: "Vaswani et al., 2017", url: "https://arxiv.org/abs/1706.03762" },
    },
    {
      id: "generate",
      title: { en: "One word after another", fr: "Un mot après l’autre" },
      text: {
        en: "The AI writes a word, adds it to the text, then guesses the next one, and so on. A long answer is this little loop repeated hundreds of times.",
        fr: "L’IA écrit un mot, l’ajoute au texte, puis devine le suivant, et ainsi de suite. Une longue réponse, c’est cette petite boucle répétée des centaines de fois.",
      },
      example: {
        en: "“The cat is sleeping on the” → sofa → near → the → fire. Each time, the AI picked the most likely word.",
        fr: "« Le chat dort sur le » → canapé → près → du → feu. À chaque tour, l’IA a choisi le mot le plus probable.",
      },
      try: { en: "Add the next word, or start again.", fr: "Ajoute le mot suivant, ou recommence." },
      facts: [
        {
          en: "A 300-word answer in English takes about 400 turns of this loop.",
          fr: "Une réponse de 300 mots en anglais demande environ 400 tours de cette boucle.",
        },
      ],
    },
    {
      id: "training",
      title: { en: "Learning by reading", fr: "Apprendre en lisant" },
      text: {
        en: "Before it can answer, the AI has read an enormous amount of text. We hide the next word, it guesses, and its settings are corrected a little after each mistake.",
        fr: "Avant de savoir répondre, l’IA a lu une quantité énorme de textes. On cache le mot suivant, elle devine, et on corrige un peu ses réglages à chaque erreur.",
      },
      example: {
        en: "GPT-3, an AI from 2020, read about 300 billion tokens: a person reading 8 hours a day would need more than 5,000 years!",
        fr: "GPT-3, une IA de 2020, a lu environ 300 milliards de tokens : une personne qui lirait 8 heures par jour mettrait plus de 5 000 ans !",
      },
      facts: [
        {
          en: "An AI predicts what sounds right, not always what is true: it can make things up with great confidence. Always check!",
          fr: "Une IA prédit ce qui a l’air juste, pas forcément ce qui est vrai : elle peut inventer des choses avec beaucoup d’assurance. Il faut toujours vérifier !",
        },
      ],
      labels: [
        { anchor: "texts", place: "below", text: { en: "Billions of sentences", fr: "Des milliards de phrases" } },
        { anchor: "model", place: "below", text: { en: "The AI", fr: "L’IA" } },
      ],
      source: { label: "Brown et al., 2020", url: "https://arxiv.org/abs/2005.14165" },
    },
  ],
};
