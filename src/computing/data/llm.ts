import type { LessonData } from "../types.ts";

/**
 * Chapter 6: large language models. Toy numbers are labelled as
 * illustrative. Checked facts: word2vec (Mikolov et al., 2013) reports
 * king − man + woman ≈ queen; the Transformer and its attention date from
 * 2017 (Vaswani et al.); GPT-3 (Brown et al., 2020) has 175 billion
 * parameters and was trained on about 300 billion tokens; GPT-2's
 * vocabulary has 50,257 tokens.
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
      title: { en: "Text cut into tokens", fr: "Du texte en morceaux" },
      text: {
        en: "A language model reads neither letters nor whole words, but tokens: frequent pieces of words, each with a number. Common words are one token; rare words are cut into several.",
        fr: "Un modèle de langage ne lit ni des lettres ni des mots entiers, mais des tokens : des morceaux de mots fréquents, chacun avec un numéro. Les mots courants font un token ; les mots rares sont coupés en plusieurs.",
      },
      example: {
        en: "“The cat sleeps.” gives 4 tokens: [The] [ cat] [ sleeps] [.]. A long word like “unbelievably” is cut into pieces, for example [un] [believ] [ably].",
        fr: "« Le chat dort. » donne 4 tokens : [Le] [ chat] [ dort] [.]. Un mot long comme « anticonstitutionnellement » est coupé en morceaux, par exemple [anti] [constitution] [nelle] [ment].",
      },
      try: { en: "Type a sentence and watch it being cut.", fr: "Tape une phrase et regarde-la se découper." },
      facts: [
        {
          en: "In English, a token is about 4 characters on average, roughly three quarters of a word.",
          fr: "En anglais, un token fait en moyenne environ 4 caractères, à peu près trois quarts de mot. En français, il en faut souvent un peu plus par mot.",
        },
        {
          en: "The numbers shown here are made up: each model has its own vocabulary, from about 50,000 tokens (GPT-2) to a few hundred thousand.",
          fr: "Les numéros affichés ici sont inventés : chaque modèle a son propre vocabulaire, d’environ 50 000 tokens (GPT-2) à quelques centaines de milliers.",
        },
      ],
    },
    {
      id: "vectors",
      title: { en: "Words as points in space", fr: "Des mots comme des points" },
      text: {
        en: "Each token then becomes a list of numbers: a point in a space with thousands of dimensions. During training, words used in similar ways end up close together.",
        fr: "Chaque token devient ensuite une liste de nombres : un point dans un espace à des milliers de dimensions. Pendant l’entraînement, les mots employés de façon semblable se retrouvent proches.",
      },
      example: {
        en: "Directions carry meaning: king − man + woman lands next to queen. Researchers reported it in 2013 with such word vectors.",
        fr: "Les directions ont un sens : roi − homme + femme tombe à côté de reine. Des chercheurs l’ont observé en 2013 avec ces vecteurs de mots.",
      },
      facts: [
        {
          en: "This picture squeezes thousands of dimensions into three, so its distances are only a rough idea.",
          fr: "Cette image écrase des milliers de dimensions en trois : ses distances ne donnent qu’une idée approximative.",
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
      title: { en: "Guessing the next token", fr: "Deviner le token suivant" },
      text: {
        en: "Given a text, the model computes, for every token of its vocabulary, the probability that it comes next. Then it picks one, usually among the most likely.",
        fr: "Devant un texte, le modèle calcule pour chaque token de son vocabulaire la probabilité qu’il vienne ensuite. Puis il en choisit un, en général parmi les plus probables.",
      },
      example: {
        en: "“The cat is sleeping on the…”: sofa 46%, bed 27%, mat 13%, roof 6%… (illustrative figures).",
        fr: "« Le chat dort sur le… » : canapé 46 %, lit 27 %, tapis 13 %, toit 6 %… (chiffres d’illustration).",
      },
      try: {
        en: "Change the temperature: low, the model plays safe; high, it takes risks.",
        fr: "Change la température : basse, le modèle joue la sécurité ; haute, il prend des risques.",
      },
      facts: [
        {
          en: "Temperature is a real setting of these models. At zero, they always take the most likely token.",
          fr: "La température est un vrai réglage de ces modèles. À zéro, ils prennent toujours le token le plus probable.",
        },
      ],
    },
    {
      id: "attention",
      title: { en: "Who is “it”?", fr: "Qui est « il » ?" },
      text: {
        en: "To understand a token, the model looks at all the others: this is attention. Each token weighs how much every other one matters for its meaning.",
        fr: "Pour comprendre un token, le modèle regarde tous les autres : c’est l’attention. Chaque token pèse l’importance de chacun des autres pour son sens.",
      },
      example: {
        en: "“The trophy does not fit in the suitcase because it is too big”: “it” looks mostly at “trophy”. Change “big” to “small”, and it looks at “suitcase”.",
        fr: "« Le trophée ne rentre pas dans la valise car il est trop grand » : « il » regarde surtout « trophée ». Remplace « grand » par « petit », et il regarde « valise ».",
      },
      try: { en: "Switch between big and small.", fr: "Passe de grand à petit." },
      facts: [
        {
          en: "Attention is the heart of the Transformer, the design published in 2017 that today’s language models are built on.",
          fr: "L’attention est le cœur du Transformer, l’architecture publiée en 2017 sur laquelle reposent les modèles de langage actuels.",
        },
        {
          en: "The weights drawn here are illustrative: a real model has dozens of attention layers, each with several heads.",
          fr: "Les poids dessinés ici sont une illustration : un vrai modèle a des dizaines de couches d’attention, chacune avec plusieurs têtes.",
        },
      ],
      source: { label: "Vaswani et al., 2017", url: "https://arxiv.org/abs/1706.03762" },
    },
    {
      id: "generate",
      title: { en: "One token after another", fr: "Un token après l’autre" },
      text: {
        en: "To write, the model adds the chosen token to the text and starts again: new probabilities, new choice. A long answer is this loop repeated hundreds of times.",
        fr: "Pour écrire, le modèle ajoute le token choisi au texte, puis recommence : nouvelles probabilités, nouveau choix. Une longue réponse, c’est cette boucle répétée des centaines de fois.",
      },
      example: {
        en: "“The cat is sleeping on the” → sofa → near → the → fire. Each word was the most likely choice at its turn.",
        fr: "« Le chat dort sur le » → canapé → près → du → feu. Chaque mot était le choix le plus probable à son tour.",
      },
      try: { en: "Add the next token, or start again.", fr: "Ajoute le token suivant, ou recommence." },
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
        en: "Before answering anything, the model was trained on huge amounts of text: hide the next token, let it guess, and adjust its billions of numbers a little after each mistake.",
        fr: "Avant de répondre quoi que ce soit, le modèle a été entraîné sur d’énormes quantités de texte : on cache le token suivant, il devine, et on ajuste un peu ses milliards de nombres après chaque erreur.",
      },
      example: {
        en: "GPT-3 (2020) has 175 billion of these numbers and was trained on about 300 billion tokens.",
        fr: "GPT-3 (2020) compte 175 milliards de ces nombres et a été entraîné sur environ 300 milliards de tokens.",
      },
      facts: [
        {
          en: "The model predicts what is plausible, not what is true: it can invent a fact or a reference with confidence. This is called a hallucination.",
          fr: "Le modèle prédit ce qui est plausible, pas ce qui est vrai : il peut inventer un fait ou une référence avec aplomb. On appelle ça une hallucination.",
        },
      ],
      labels: [
        { anchor: "texts", place: "below", text: { en: "Billions of sentences", fr: "Des milliards de phrases" } },
        { anchor: "model", place: "below", text: { en: "The model", fr: "Le modèle" } },
      ],
      source: { label: "Brown et al., 2020", url: "https://arxiv.org/abs/2005.14165" },
    },
  ],
};
