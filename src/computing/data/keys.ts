import type { LessonData } from "../types.ts";

/**
 * Chapter 4: public and private keys, with real (tiny) numbers. Checked:
 * powers of 5 on a 23-hour clock: 5, 2, 10, 4, 20, 8; 5^15 = 30 517 578 125 → 19;
 * 19^6 → 2 and 8^15 → 2 (= 5^90 → 2); RSA with n = 55 = 5 × 11, e = 3, d = 27:
 * 7^3 = 343 → 13, 13^27 → 7; signature 7^27 → 28, 28^3 → 7. RSA-2048 moduli have
 * 617 digits; X25519 works modulo 2^255 − 19 (77 digits).
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
        en: "Alice wants to send Bob a secret over the Internet. Her message goes through dozens of machines, and Eve can read everything that passes. Alice and Bob have never met to choose a password.",
        fr: "Alice veut envoyer un secret à Bob par Internet. Son message passe par des dizaines de machines, et Ève peut lire tout ce qui passe. Alice et Bob ne se sont jamais vus pour choisir un mot de passe.",
      },
      example: {
        en: "When you open a site in https, your browser and the server have never talked before. Yet they must agree on a secret key, in public, in a fraction of a second.",
        fr: "Quand tu ouvres un site en https, ton navigateur et le serveur ne se sont jamais parlé. Ils doivent pourtant se mettre d’accord sur une clé secrète, en public, en une fraction de seconde.",
      },
      facts: [
        {
          en: "Alice and Bob first appeared in 1978, in the paper describing RSA. Eve, the eavesdropper, joined them later.",
          fr: "Alice et Bob sont apparus en 1978, dans l’article qui décrit RSA. Ève, l’espionne (eavesdropper en anglais), les a rejoints plus tard.",
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
        en: "The trick uses clock arithmetic. On a clock with 23 hours, after 22 comes 0 again: you only keep the remainder of the division by 23. Going forward is easy; going back is hard.",
        fr: "L’astuce utilise le calcul sur une horloge. Sur une horloge à 23 heures, après 22 on revient à 0 : on ne garde que le reste de la division par 23. Avancer est facile ; revenir en arrière est difficile.",
      },
      example: {
        en: "Multiply by 5 again and again: 5, 25 → 2, 10, 50 → 4, 20, 100 → 8. So 5⁶ lands on 8. But knowing only 8, you must try the powers one by one to find 6.",
        fr: "Multiplie par 5 encore et encore : 5, 25 → 2, 10, 50 → 4, 20, 100 → 8. Donc 5⁶ tombe sur 8. Mais si tu ne connais que 8, il faut essayer les puissances une à une pour retrouver 6.",
      },
      try: { en: "Multiply by 5 and follow the hand.", fr: "Multiplie par 5 et suis l’aiguille." },
      facts: [
        {
          en: "You already do this with hours: 10 o’clock plus 5 hours is 3 o’clock on a 12-hour clock.",
          fr: "Tu le fais déjà avec les heures : 10 h plus 5 heures, ça fait 3 h sur une horloge à 12 heures.",
        },
      ],
    },
    {
      id: "exchange",
      title: { en: "Each keeps a secret number", fr: "Chacun garde un nombre secret" },
      text: {
        en: "Alice and Bob publicly agree on the clock (23) and the start (5). Alice secretly picks 6 and sends 5⁶, which is 8. Bob secretly picks 15 and sends 5¹⁵, which is 19. Eve sees 23, 5, 8 and 19.",
        fr: "Alice et Bob choisissent en public l’horloge (23) et le départ (5). Alice choisit en secret 6 et envoie 5⁶, soit 8. Bob choisit en secret 15 et envoie 5¹⁵, soit 19. Ève voit passer 23, 5, 8 et 19.",
      },
      example: {
        en: "Bob’s calculation: 5¹⁵ = 30,517,578,125, which lands on 19 on the 23-hour clock.",
        fr: "Le calcul de Bob : 5¹⁵ = 30 517 578 125, qui tombe sur 19 sur l’horloge à 23 heures.",
      },
      try: { en: "Change Alice’s and Bob’s secret numbers.", fr: "Change les nombres secrets d’Alice et de Bob." },
      facts: [
        {
          en: "This method was published in 1976 by Whitfield Diffie and Martin Hellman.",
          fr: "Cette méthode a été publiée en 1976 par Whitfield Diffie et Martin Hellman.",
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
        en: "Alice takes Bob’s 19 and raises it to her secret 6. Bob takes Alice’s 8 and raises it to his secret 15. Both land on the same number, 2, which never travelled on the wire.",
        fr: "Alice prend le 19 de Bob et l’élève à son secret 6. Bob prend le 8 d’Alice et l’élève à son secret 15. Les deux tombent sur le même nombre, 2, qui n’a jamais circulé sur le fil.",
      },
      example: {
        en: "19⁶ → 2 and 8¹⁵ → 2 on the 23-hour clock. Both are 5⁶ˣ¹⁵ = 5⁹⁰ in disguise.",
        fr: "19⁶ → 2 et 8¹⁵ → 2 sur l’horloge à 23 heures. Les deux sont en fait 5⁶ˣ¹⁵ = 5⁹⁰, déguisé.",
      },
      try: { en: "Change the secrets: the two results always match.", fr: "Change les secrets : les deux résultats restent égaux." },
      facts: [
        {
          en: "Eve has 8 and 19, but neither 6 nor 15. With 23 hours she can try everything; with numbers of more than 600 digits, no known computer can do it in a reasonable time.",
          fr: "Ève a 8 et 19, mais ni 6 ni 15. Avec 23 heures, elle peut tout essayer ; avec des nombres de plus de 600 chiffres, aucun ordinateur connu n’y arrive en un temps raisonnable.",
        },
        {
          en: "This exchange is often explained with paint: mixing two colours is easy, separating them again is not.",
          fr: "On explique souvent cet échange avec de la peinture : mélanger deux couleurs est facile, les séparer ne l’est pas.",
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
        en: "Another method, RSA, works like a padlock. Bob hands out open padlocks to anyone: his public key. Only he has the key that opens them: his private key. Here, on a 55-hour clock, the public key is 3 and the private key 27.",
        fr: "Une autre méthode, RSA, marche comme un cadenas. Bob distribue des cadenas ouverts à qui veut : sa clé publique. Lui seul a la clé qui les ouvre : sa clé privée. Ici, sur une horloge à 55 heures, la clé publique vaut 3 et la clé privée 27.",
      },
      example: {
        en: "Alice locks the message 7: 7³ = 343, which lands on 13. Only Bob can open it: 13²⁷ lands back on 7.",
        fr: "Alice verrouille le message 7 : 7³ = 343, qui tombe sur 13. Seul Bob peut l’ouvrir : 13²⁷ retombe sur 7.",
      },
      try: { en: "Choose the message Alice locks.", fr: "Choisis le message qu’Alice verrouille." },
      facts: [
        {
          en: "Bob built his keys from 55 = 5 × 11. With a 617-digit number instead of 55, finding its two factors is out of reach today.",
          fr: "Bob a fabriqué ses clés à partir de 55 = 5 × 11. Avec un nombre de 617 chiffres à la place de 55, retrouver ses deux facteurs est aujourd’hui hors de portée.",
        },
        {
          en: "RSA is named after Ron Rivest, Adi Shamir and Leonard Adleman, who devised it in 1977.",
          fr: "RSA porte les initiales de Ron Rivest, Adi Shamir et Leonard Adleman, qui l’ont inventé en 1977.",
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
      title: { en: "Signing with the private key", fr: "Signer avec la clé privée" },
      text: {
        en: "The keys also work the other way round. Bob locks a message with his private key; anyone can open it with his public key, and only Bob could have locked it. That is a digital signature.",
        fr: "Les clés marchent aussi dans l’autre sens. Bob verrouille un message avec sa clé privée ; n’importe qui peut l’ouvrir avec sa clé publique, et seul Bob a pu le verrouiller. C’est une signature numérique.",
      },
      example: {
        en: "Bob signs 7: 7²⁷ lands on 28. Alice checks with the public key: 28³ lands back on 7. It really is Bob.",
        fr: "Bob signe 7 : 7²⁷ tombe sur 28. Alice vérifie avec la clé publique : 28³ retombe sur 7. C’est bien Bob.",
      },
      try: { en: "Choose the message Bob signs.", fr: "Choisis le message que Bob signe." },
      facts: [
        {
          en: "Before installing an update, your phone checks its signature: only the maker’s private key could have produced it.",
          fr: "Avant d’installer une mise à jour, ton téléphone vérifie sa signature : seule la clé privée du fabricant a pu la produire.",
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
      title: { en: "Behind your browser’s padlock", fr: "Derrière le cadenas de ton navigateur" },
      text: {
        en: "When you open a site in https, all of this happens in a fraction of a second. An exchange like Alice and Bob’s builds a shared key, the site proves who it is with a signature, then everything is encrypted with the shared key.",
        fr: "Quand tu ouvres un site en https, tout cela se passe en une fraction de seconde. Un échange comme celui d’Alice et Bob fabrique une clé commune, le site prouve son identité par une signature, puis tout est chiffré avec la clé commune.",
      },
      example: {
        en: "The shared key then drives a fast cipher such as AES, which can scramble billions of bytes per second.",
        fr: "La clé commune sert ensuite à un chiffrement rapide comme AES, qui peut brouiller des milliards d’octets par seconde.",
      },
      facts: [
        {
          en: "The numbers are huge: a common key exchange, X25519, computes on a clock of about 10⁷⁷ hours.",
          fr: "Les nombres sont énormes : un échange de clés courant, X25519, calcule sur une horloge d’environ 10⁷⁷ heures.",
        },
      ],
      labels: [
        { anchor: "lane-exchange", text: { en: "1. Shared key", fr: "1. Clé commune" } },
        { anchor: "lane-signature", text: { en: "2. Signature", fr: "2. Signature" } },
        { anchor: "lane-cipher", text: { en: "3. Encryption", fr: "3. Chiffrement" } },
      ],
      source: { label: "RFC 8446 — TLS 1.3", url: "https://www.rfc-editor.org/rfc/rfc8446" },
    },
  ],
};
