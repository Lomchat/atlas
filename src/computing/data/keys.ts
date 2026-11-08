import type { LessonData } from "../types.ts";

/**
 * Chapter 4: public and private keys, for young readers, with real (tiny)
 * numbers. Checked: multiplying by 5 on a 23-hour clock gives 5, 2, 10, 4,
 * 20, 8; 5 multiplied 15 times lands on 19; 19 multiplied 6 times and 8
 * multiplied 15 times both land on 2; on a 55-hour clock with keys 3 and 27,
 * 7 → 13 → 7 and the signature 7 → 28 → 7. Real keys use numbers of hundreds
 * of digits (617 for RSA-2048).
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
      title: { en: "A secret in front of everyone", fr: "Un secret devant tout le monde" },
      text: {
        en: "Alice wants to send Bob a secret over the Internet. But her message passes through lots of machines, and Eve, a spy, can read everything. Alice and Bob have never met to choose a password.",
        fr: "Alice veut envoyer un secret à Bob par Internet. Mais son message passe par plein de machines, et Ève, une espionne, peut tout lire. Alice et Bob ne se sont jamais rencontrés pour choisir un mot de passe.",
      },
      example: {
        en: "When you open a website with a little padlock in the address bar, your computer and the site do exactly this: agree on a secret, in front of everyone.",
        fr: "Quand tu ouvres un site avec un petit cadenas dans la barre d’adresse, ton ordinateur et le site font exactement ça : se mettre d’accord sur un secret, devant tout le monde.",
      },
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
      id: "clock",
      title: { en: "A 23-hour clock", fr: "Une horloge à 23 heures" },
      text: {
        en: "The trick uses a clock with 23 hours. After 22 you go back to 0, just as a normal clock goes back to 1 after 12. Multiplying on this clock is easy, but going backwards is very hard.",
        fr: "L’astuce utilise une horloge à 23 heures. Après 22, on revient à 0, comme une horloge normale revient à 1 après 12. Multiplier sur cette horloge est facile, mais revenir en arrière est très difficile.",
      },
      example: {
        en: "Start from 1 and multiply by 5 again and again: 5, then 25 goes round and lands on 2, then 10, 4, 20, and 8. After 6 multiplications you are on 8 (written 5⁶ → 8). But if someone only tells you 8, finding the 6 means trying them one by one.",
        fr: "Pars de 1 et multiplie par 5 encore et encore : 5, puis 25 fait le tour et tombe sur 2, puis 10, 4, 20 et enfin 8. Après 6 multiplications, tu es sur 8 (on écrit 5⁶ → 8). Mais si on te dit seulement 8, pour retrouver le 6 il faut tout essayer un par un.",
      },
      try: { en: "Multiply by 5 and follow the hand.", fr: "Multiplie par 5 et suis l’aiguille." },
      facts: [
        {
          en: "You already do this with the time: 10 o’clock plus 5 hours makes 3 o’clock.",
          fr: "Tu fais déjà ce calcul avec l’heure : 10 h plus 5 heures, ça fait 3 h.",
        },
      ],
    },
    {
      id: "exchange",
      title: { en: "Each keeps a secret number", fr: "Chacun garde un nombre secret" },
      text: {
        en: "In front of everyone, Alice and Bob agree on the clock (23) and the start (5). Then each picks a secret number: Alice picks 6, Bob picks 15. Each multiplies by 5 as many times as their secret, and sends the result.",
        fr: "Devant tout le monde, Alice et Bob choisissent l’horloge (23) et le départ (5). Puis chacun choisit un nombre secret : Alice choisit 6, Bob choisit 15. Chacun multiplie par 5 autant de fois que son secret, et envoie le résultat.",
      },
      example: {
        en: "Alice sends 8 (5 multiplied 6 times). Bob sends 19 (5 multiplied 15 times). Eve sees 8 and 19 go by, but never the secrets 6 and 15.",
        fr: "Alice envoie 8 (5 multiplié 6 fois). Bob envoie 19 (5 multiplié 15 fois). Ève voit passer 8 et 19, mais jamais les secrets 6 et 15.",
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
      title: { en: "The same secret on both sides", fr: "Le même secret des deux côtés" },
      text: {
        en: "Now each takes the number they received and multiplies it as many times as their own secret. Surprise: Alice and Bob both land on 2! That number never travelled, so Eve does not know it.",
        fr: "Maintenant, chacun reprend le nombre reçu et le multiplie autant de fois que son propre secret. Surprise : Alice et Bob tombent tous les deux sur 2 ! Ce nombre n’a jamais voyagé : Ève ne le connaît pas.",
      },
      example: {
        en: "Alice multiplies 19 six times: she lands on 2. Bob multiplies 8 fifteen times: he lands on 2 as well. It works every time!",
        fr: "Alice multiplie 19 six fois : elle tombe sur 2. Bob multiplie 8 quinze fois : il tombe aussi sur 2. Ça marche à tous les coups !",
      },
      try: { en: "Change the secrets: the two results always match.", fr: "Change les secrets : les deux résultats restent égaux." },
      facts: [
        {
          en: "With 23 hours, Eve could try everything. But real computers use clocks with numbers more than 600 digits long: impossible to try them all.",
          fr: "Avec 23 heures, Ève pourrait tout essayer. Mais les vrais ordinateurs utilisent des horloges avec des nombres de plus de 600 chiffres : impossible de tout essayer.",
        },
        {
          en: "It is a bit like mixing paint: mixing two colours is easy, separating them again is impossible.",
          fr: "C’est un peu comme la peinture : mélanger deux couleurs est facile, les séparer ensuite est impossible.",
        },
      ],
      labels: [
        { anchor: "alice", place: "below", text: { en: "Alice", fr: "Alice" } },
        { anchor: "bob", place: "below", text: { en: "Bob", fr: "Bob" } },
        { anchor: "eve", place: "below", text: { en: "Eve", fr: "Ève" } },
      ],
    },
    {
      id: "padlock",
      title: { en: "The open padlock", fr: "Le cadenas ouvert" },
      text: {
        en: "Another method works like a padlock. Bob gives everyone open padlocks: that is his public key. But only he has the key that opens them: his private key.",
        fr: "Une autre méthode marche comme un cadenas. Bob donne à tout le monde des cadenas ouverts : c’est sa clé publique. Mais lui seul a la clé qui les ouvre : sa clé privée.",
      },
      example: {
        en: "Alice wants to send 7. She locks it with Bob’s padlock: on a 55-hour clock, 7 becomes 13. Only Bob, with his private key, can turn 13 back into 7.",
        fr: "Alice veut envoyer 7. Elle le verrouille avec le cadenas de Bob : sur une horloge à 55 heures, 7 devient 13. Seul Bob, avec sa clé privée, peut retransformer 13 en 7.",
      },
      try: { en: "Choose the message Alice locks.", fr: "Choisis le message qu’Alice verrouille." },
      facts: [
        {
          en: "Bob made his keys from 55 = 5 × 11. With a number more than 600 digits long, nobody knows how to find the two starting numbers.",
          fr: "Bob a fabriqué ses clés avec 55 = 5 × 11. Avec un nombre de plus de 600 chiffres, personne ne sait retrouver les deux nombres de départ.",
        },
      ],
      labels: [
        { anchor: "alice", place: "below", text: { en: "Alice", fr: "Alice" } },
        { anchor: "bob", place: "below", text: { en: "Bob", fr: "Bob" } },
      ],
      source: { label: "Wikipedia — RSA", url: "https://en.wikipedia.org/wiki/RSA_(cryptosystem)" },
    },
    {
      id: "signature",
      title: { en: "A signature", fr: "Une signature" },
      text: {
        en: "It also works the other way round! Bob locks a message with his private key. Anyone can open it with his public key… but only Bob could have locked it. That is his signature.",
        fr: "Ça marche aussi dans l’autre sens ! Bob verrouille un message avec sa clé privée. Tout le monde peut l’ouvrir avec sa clé publique… mais seul Bob a pu le fermer. C’est sa signature.",
      },
      example: {
        en: "Bob signs 7: with his private key it becomes 28. Alice opens 28 with the public key and finds 7 again: it really was Bob.",
        fr: "Bob signe 7 : avec sa clé privée, il devient 28. Alice ouvre 28 avec la clé publique et retrouve 7 : c’est bien Bob qui l’a envoyé.",
      },
      try: { en: "Choose the message Bob signs.", fr: "Choisis le message que Bob signe." },
      facts: [
        {
          en: "When your phone installs an update, it checks the signature to be sure the update really comes from its maker.",
          fr: "Quand ton téléphone installe une mise à jour, il vérifie la signature pour être sûr qu’elle vient bien du fabricant.",
        },
      ],
      labels: [
        { anchor: "alice", place: "below", text: { en: "Alice", fr: "Alice" } },
        { anchor: "bob", place: "below", text: { en: "Bob", fr: "Bob" } },
      ],
      source: { label: "Wikipedia — RSA", url: "https://en.wikipedia.org/wiki/RSA_(cryptosystem)" },
    },
    {
      id: "https",
      title: { en: "Behind the little padlock", fr: "Derrière le petit cadenas" },
      text: {
        en: "When you see the little padlock in your browser, all of this happens in a fraction of a second: a shared secret is made, the site proves who it is with its signature, then everything is scrambled with the secret.",
        fr: "Quand tu vois le petit cadenas dans ton navigateur, tout ça se passe en une fraction de seconde : un secret commun est fabriqué, le site prouve qui il est avec sa signature, puis tout est brouillé avec le secret.",
      },
      example: {
        en: "Once the secret is shared, your computer can scramble billions of letters per second: Eve only sees gibberish.",
        fr: "Une fois le secret partagé, ton ordinateur peut brouiller des milliards de lettres par seconde : Ève ne voit plus que du charabia.",
      },
      facts: [
        {
          en: "The real numbers have dozens, even hundreds of digits.",
          fr: "Les vrais nombres utilisés ont des dizaines, voire des centaines de chiffres.",
        },
      ],
      labels: [
        { anchor: "lane-exchange", text: { en: "1. Shared secret", fr: "1. Secret commun" } },
        { anchor: "lane-signature", text: { en: "2. Signature", fr: "2. Signature" } },
        { anchor: "lane-cipher", text: { en: "3. Scrambling", fr: "3. Brouillage" } },
      ],
      source: { label: "RFC 8446 — TLS 1.3", url: "https://www.rfc-editor.org/rfc/rfc8446" },
    },
  ],
};
