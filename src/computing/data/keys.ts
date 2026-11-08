import type { LessonData } from "../types.ts";

/**
 * Chapter 4: public and private keys, for young readers, with a real
 * message and tiny numbers (see logic/keys.ts). Checked: SALUT shifted by 3
 * is VDOXW; on an 11-hour clock the powers of 2 are 2, 4, 8, 5, 10, 9, 7, 3,
 * 6, 1; secrets 3 and 2 give public keys 8 and 4, and 4³ = 8² = 64 → 9 for
 * both; SALUT shifted by 9 is BJUDC. Real keys have hundreds of digits.
 */
export const keysLesson: LessonData = {
  id: "keys",
  number: 4,
  status: "ready",
  scene: "keys",
  icon: "key",
  theme: { top: "#2a0b2e", bottom: "#7a1f5c", accent: "#ff6fb1", dust: "#ffb3d9" },
  title: { en: "Public and private keys", fr: "Clés publiques et privées" },
  short: { en: "Secret keys", fr: "Clés secrètes" },
  teaser: {
    en: "Agree on a secret in front of a spy, with a real calculation.",
    fr: "Se mettre d’accord sur un secret sous les yeux d’un espion, avec un vrai calcul.",
  },
  source: { label: "Wikipedia — Diffie–Hellman key exchange", url: "https://en.wikipedia.org/wiki/Diffie%E2%80%93Hellman_key_exchange" },
  steps: [
    {
      id: "problem",
      title: { en: "A message everyone can read", fr: "Un message que tout le monde lit" },
      text: {
        en: "Alice wants to send a message to Bob over the Internet. On its way, it passes through lots of machines. Eve, a spy, sits on one of them and reads everything that goes by.",
        fr: "Alice veut envoyer un message à Bob par Internet. En chemin, il passe par plein de machines. Ève, une espionne, est installée sur l’une d’elles et lit tout ce qui passe.",
      },
      example: {
        en: "Alice sends “{message}”. Eve copies it into her notebook: she reads “{message}” without any trouble.",
        fr: "Alice envoie « {message} ». Ève le recopie dans son carnet : elle lit « {message} » sans aucun problème.",
      },
      try: { en: "Write Alice’s message.", fr: "Écris le message d’Alice." },
      facts: [
        {
          en: "Researchers have used the names Alice and Bob since 1978 to tell these stories about secrets.",
          fr: "Les chercheurs utilisent les prénoms Alice et Bob depuis 1978 pour raconter ces histoires de secrets.",
        },
      ],
      labels: [
        { anchor: "alice", place: "below", text: { en: "Alice", fr: "Alice" } },
        { anchor: "bob", place: "below", text: { en: "Bob", fr: "Bob" } },
        { anchor: "eve", place: "below", text: { en: "Eve", fr: "Ève" } },
      ],
    },
    {
      id: "shift",
      title: { en: "Scrambling with a key", fr: "Brouiller avec une clé" },
      text: {
        en: "To hide the message, Alice moves every letter forward in the alphabet by the same number of places: that number is the key. Bob, who knows the key, moves every letter back.",
        fr: "Pour cacher le message, Alice avance chaque lettre dans l’alphabet du même nombre de places : ce nombre, c’est la clé. Bob, qui connaît la clé, recule chaque lettre.",
      },
      example: {
        en: "With the key {key}, every letter moves {key} places: “{message}” becomes “{cipher}”. But how can Alice give the key {key} to Bob without Eve seeing it?",
        fr: "Avec la clé {key}, chaque lettre avance de {key} places : « {message} » devient « {cipher} ». Mais comment Alice peut-elle donner la clé {key} à Bob sans qu’Ève la voie ?",
      },
      try: { en: "Change the key or the message.", fr: "Change la clé ou le message." },
      facts: [
        {
          en: "Julius Caesar used this trick 2,000 years ago, with the key 3.",
          fr: "Jules César utilisait déjà cette astuce il y a 2 000 ans, avec la clé 3.",
        },
      ],
      labels: [
        { anchor: "row-plain", place: "left", text: { en: "Message", fr: "Message" } },
        { anchor: "row-cipher", place: "left", text: { en: "Scrambled", fr: "Brouillé" } },
      ],
    },
    {
      id: "clock",
      title: { en: "An 11-hour clock", fr: "Une horloge à 11 cases" },
      text: {
        en: "To agree on a key in public, Alice and Bob use a clock with 11 boxes, from 0 to 10. When a number goes past 10, you take 11 away until it fits. Going forward is easy; going back is hard.",
        fr: "Pour choisir une clé en public, Alice et Bob utilisent une horloge à 11 cases, de 0 à 10. Quand un nombre dépasse 10, on enlève 11 jusqu’à ce qu’il rentre. Avancer est facile ; revenir en arrière est difficile.",
      },
      example: {
        en: "Start from 1 and multiply by 2: 2, 4, 8, then 16, take away 11, that is 5. Right now: {calc}.",
        fr: "Pars de 1 et multiplie par 2 : 2, 4, 8, puis 16, on enlève 11, ça fait 5. En ce moment : {calc}.",
      },
      try: { en: "Multiply by 2 and follow the hand.", fr: "Multiplie par 2 et suis l’aiguille." },
      facts: [
        {
          en: "You already do this with the time: 10 o’clock plus 5 hours makes 3 o’clock.",
          fr: "Tu fais déjà ce calcul avec l’heure : 10 h plus 5 heures, ça fait 3 h.",
        },
      ],
    },
    {
      id: "exchange",
      title: { en: "Private keys, public keys", fr: "Clés privées, clés publiques" },
      text: {
        en: "Each chooses a secret number and never tells anyone: that is their private key. Then each multiplies 2 by itself that many times on the clock, and sends the result: that is their public key.",
        fr: "Chacun choisit un nombre secret et ne le dit à personne : c’est sa clé privée. Puis chacun multiplie 2 par lui-même autant de fois sur l’horloge, et envoie le résultat : c’est sa clé publique.",
      },
      example: {
        en: "Private keys: Alice {a}, Bob {b}. Public keys: Alice sends {aliceCalc}, Bob sends {bobCalc}. Eve sees {A} and {B} go by, but not {a} or {b}.",
        fr: "Clés privées : Alice {a}, Bob {b}. Clés publiques : Alice envoie {aliceCalc}, Bob envoie {bobCalc}. Ève voit passer {A} et {B}, mais pas {a} ni {b}.",
      },
      try: { en: "Change Alice’s and Bob’s secret numbers.", fr: "Change les nombres secrets d’Alice et de Bob." },
      facts: [
        {
          en: "This method was invented in 1976 by Whitfield Diffie and Martin Hellman.",
          fr: "Cette méthode a été inventée en 1976 par Whitfield Diffie et Martin Hellman.",
        },
      ],
      labels: [
        { anchor: "alice", place: "below", text: { en: "Alice", fr: "Alice" } },
        { anchor: "bob", place: "below", text: { en: "Bob", fr: "Bob" } },
        { anchor: "eve", place: "below", text: { en: "Eve", fr: "Ève" } },
      ],
    },
    {
      id: "shared",
      title: { en: "The same key on both sides", fr: "La même clé des deux côtés" },
      text: {
        en: "Now each takes the public key they received and multiplies it by itself as many times as their own secret. Alice and Bob land on the same number: their shared key. It never travelled!",
        fr: "Maintenant, chacun prend la clé publique reçue et la multiplie par elle-même autant de fois que son propre secret. Alice et Bob tombent sur le même nombre : leur clé commune. Elle n’a jamais voyagé !",
      },
      example: {
        en: "Alice computes {aliceCalc}. Bob computes {bobCalc}. Both find {key}. Eve only has {A} and {B}: she cannot work out {key}.",
        fr: "Alice calcule {aliceCalc}. Bob calcule {bobCalc}. Les deux trouvent {key}. Ève n’a que {A} et {B} : elle ne peut pas trouver {key}.",
      },
      try: { en: "Change the secrets: both always find the same key.", fr: "Change les secrets : les deux trouvent toujours la même clé." },
      facts: [
        {
          en: "With 11 boxes, Eve could try every possibility. Real computers use clocks with numbers hundreds of digits long: impossible to try them all.",
          fr: "Avec 11 cases, Ève pourrait tout essayer. Les vrais ordinateurs utilisent des horloges avec des nombres de plusieurs centaines de chiffres : impossible de tout essayer.",
        },
      ],
      labels: [
        { anchor: "alice", place: "below", text: { en: "Alice", fr: "Alice" } },
        { anchor: "bob", place: "below", text: { en: "Bob", fr: "Bob" } },
        { anchor: "eve", place: "below", text: { en: "Eve", fr: "Ève" } },
      ],
    },
    {
      id: "message",
      title: { en: "The secret message", fr: "Le message secret" },
      text: {
        en: "Now Alice scrambles her message with the shared key, and only the scrambled message travels. Bob unscrambles it with the same key. Eve sees everything go by, but cannot read it.",
        fr: "Alice brouille maintenant son message avec la clé commune, et seul le message brouillé voyage. Bob le débrouille avec la même clé. Ève voit tout passer, mais ne peut rien lire.",
      },
      example: {
        en: "Key {key}: “{message}” becomes “{cipher}”. Bob moves each letter back {key} places and reads “{message}”. Eve only sees “{cipher}”: gibberish!",
        fr: "Clé {key} : « {message} » devient « {cipher} ». Bob recule chaque lettre de {key} places et lit « {message} ». Ève ne voit que « {cipher} » : du charabia !",
      },
      try: { en: "Write another message.", fr: "Écris un autre message." },
      facts: [
        {
          en: "Real computers do the same, with keys so long that nobody could guess them.",
          fr: "Les vrais ordinateurs font pareil, avec des clés si longues que personne ne peut les deviner.",
        },
      ],
      labels: [
        { anchor: "alice", place: "below", text: { en: "Alice", fr: "Alice" } },
        { anchor: "bob", place: "below", text: { en: "Bob", fr: "Bob" } },
        { anchor: "eve", place: "below", text: { en: "Eve", fr: "Ève" } },
      ],
    },
    {
      id: "https",
      title: { en: "Behind the little padlock", fr: "Derrière le petit cadenas" },
      text: {
        en: "When you see the little padlock in your browser, your computer and the website do all of this in a fraction of a second, with numbers hundreds of digits long.",
        fr: "Quand tu vois le petit cadenas dans ton navigateur, ton ordinateur et le site font tout ça en une fraction de seconde, avec des nombres de plusieurs centaines de chiffres.",
      },
      example: {
        en: "1. They swap public keys. 2. Each computes the shared key. 3. Every message is scrambled with it: Eve only sees gibberish.",
        fr: "1. Ils s’échangent leurs clés publiques. 2. Chacun calcule la clé commune. 3. Chaque message est brouillé avec elle : Ève ne voit que du charabia.",
      },
      facts: [
        {
          en: "The site also signs what it sends, to prove it really is the site you wanted.",
          fr: "Le site signe aussi ce qu’il envoie, pour prouver que c’est bien le site que tu voulais.",
        },
      ],
      labels: [
        { anchor: "lane-exchange", text: { en: "1. Public keys", fr: "1. Clés publiques" } },
        { anchor: "lane-signature", text: { en: "2. Shared key", fr: "2. Clé commune" } },
        { anchor: "lane-cipher", text: { en: "3. Scrambled messages", fr: "3. Messages brouillés" } },
      ],
      source: { label: "RFC 8446 — TLS 1.3", url: "https://www.rfc-editor.org/rfc/rfc8446" },
    },
  ],
};
