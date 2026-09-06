import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  RotateCcw,
  X,
} from "lucide-react";
import type { ExplorerState, MatterNode } from "./continuum";
import type { MoleculeId } from "./data";
import { sources } from "./data";
import { matterSource, isScale } from "./scales";
export type Interaction = Exclude<ExplorerState["interaction"], "none">;
export type Lesson = {
  title: string;
  question: string;
  steps: [string, string][];
  legend: string;
  note: string;
  source: string;
};
export const lessons: Record<Interaction, Lesson> = {
  cohesion: {
    title: "Pourquoi l’eau reste-t-elle réunie ?",
    question: "Observer les attractions",
    steps: [
      [
        "Des molécules proches",
        "Les molécules H₂O restent distinctes. Les bâtonnets à l’intérieur de chacune relient ses propres atomes.",
      ],
      [
        "Des voisines qui s’attirent",
        "Les pointillés dorés symbolisent les attractions entre molécules. Dans l’eau, les liaisons hydrogène jouent un rôle majeur.",
      ],
      [
        "Un liquide qui peut couler",
        "Ces attractions contribuent à la cohésion, tout en laissant les molécules changer de voisines. Elles ne forment pas une seule grande molécule.",
      ],
    ],
    legend:
      "Pointillés dorés : attractions entre molécules. Bâtonnets gris : liaisons dans une molécule.",
    note: "Positions et mouvements illustratifs. Les traits ne sont ni des fils ni une carte calculée des liaisons hydrogène.",
    source: matterSource,
  },
  motion: {
    title: "Pourquoi le gaz occupe-t-il l’espace ?",
    question: "Observer le mouvement du gaz",
    steps: [
      [
        "Des molécules espacées",
        "Le gaz est constitué de molécules séparées. Celle au centre est notre repère pour la navigation.",
      ],
      [
        "Elles se déplacent",
        "Les autres molécules parcourent le volume dans différentes directions. Leur agitation existe même quand le récipient semble immobile.",
      ],
      [
        "Elles rencontrent des parois",
        "Le cadre montre un petit récipient schématique. Les rebonds illustrent des collisions avec ses parois ; ces chocs contribuent à la pression du gaz.",
      ],
    ],
    legend:
      "Sphères liées : molécules entières. Cadre : parois du récipient illustratif.",
    note: "Mouvement ralenti ; trajectoires simplifiées. Le cadre sert à cette expérience et ne représente pas une membrane dans le gaz.",
    source:
      "https://openstax.org/books/chemistry-2e/pages/9-5-the-kinetic-molecular-theory",
  },
  bonds: {
    title: "Qu’est-ce qui relie les atomes ?",
    question: "Comprendre les liaisons",
    steps: [
      [
        "Des atomes dans une molécule",
        "Chaque sphère représente un atome. Les bâtonnets montrent quelles paires d’atomes sont liées.",
      ],
      [
        "Des électrons partagés",
        "Les liaisons mises en doré sont covalentes : les atomes partagent des électrons. Les bâtonnets sont un symbole, pas de petites tiges matérielles.",
      ],
      [
        "Une molécule qui reste entière",
        "Zoomer à l’intérieur ne casse pas ces liaisons. Vous explorez la composition ; vous ne déclenchez pas une réaction chimique.",
      ],
    ],
    legend:
      "Doré : liaison covalente sélectionnée. Deux bâtonnets : liaison double.",
    note: "Les nuages détaillés de l’atlas servent à expliquer les constituants. Ils ne calculent pas les orbitales de la molécule.",
    source:
      "https://openstax.org/books/chemistry-2e/pages/7-2-covalent-bonding",
  },
  nuclear: {
    title: "Pourquoi le noyau tient-il ensemble ?",
    question: "Comprendre la cohésion du noyau",
    steps: [
      [
        "Des protons et des neutrons",
        "Le noyau est un assemblage de nucléons. Les protons, chargés positivement, se repoussent électriquement.",
      ],
      [
        "Une attraction à très courte portée",
        "Les traits dorés symbolisent l’interaction nucléaire qui lie les nucléons proches. Elle est liée à l’interaction forte entre leurs quarks.",
      ],
      [
        "Un noyau lié",
        "Dans ce noyau stable, l’ensemble reste lié. L’effet dépend de la distance et de la composition ; il ne relie pas de la même façon deux noyaux éloignés.",
      ],
    ],
    legend:
      "Traits dorés : schéma de l’interaction entre nucléons, pas des liaisons chimiques.",
    note: "Le noyau d’hydrogène représenté ici est un proton seul : zoomez dedans pour étudier ses quarks.",
    source: "https://home.cern/science/physics/standard-model/",
  },
  strong: {
    title: "Qu’est-ce qui retient les quarks ?",
    question: "Comprendre l’interaction forte",
    steps: [
      [
        "Trois quarks de valence",
        "Les trois repères donnent la composition de valence du proton ou du neutron. Ils ne montrent pas tout son contenu dynamique.",
      ],
      [
        "Des échanges de gluons",
        "Les courbes dorées évoquent l’interaction forte, transmise par les gluons. Un gluon est un médiateur de cette interaction.",
      ],
      [
        "Des quarks confinés",
        "On n’obtient pas un quark libre en écartant ces points. Le zoom est un schéma de composition, pas une séparation physique des quarks.",
      ],
    ],
    legend:
      "Courbes dorées : évocation des échanges de gluons. Elles ne sont pas des trajectoires mesurées.",
    note: "Le modèle omet les paires quark-antiquark et la dynamique complète des gluons.",
    source: sources.cern,
  },
  photon: {
    title: "Que fait un photon à un atome ?",
    question: "Lumière et énergie",
    steps: [
      [
        "Avant : un photon arrive",
        "Le repère doré représente un photon, un quantum de lumière. Dans cet exemple, il possède l’énergie nécessaire à une transition de l’atome.",
      ],
      [
        "Absorption : l’atome gagne de l’énergie",
        "Le photon est absorbé. L’état électronique change : le halo doré représente un état excité. Le photon ne reste pas rangé à l’intérieur de l’électron.",
      ],
      [
        "Émission : l’atome rend de l’énergie",
        "Lors d’une transition vers un état de plus basse énergie, l’atome peut émettre un photon. Dans ce schéma à deux niveaux, il revient à son état initial.",
      ],
    ],
    legend:
      "Repère doré : photon. Halo doré : énergie de l’état excité, pas la taille réelle de l’atome.",
    note: "Exemple d’un atome isolé, à deux niveaux. Dans une molécule, les états d’énergie sont différents ; tous les photons ne sont pas absorbés.",
    source: sources.atom,
  },
  higgs: {
    title: "Que signifie le champ de Higgs ?",
    question: "Champ de Higgs et masse",
    steps: [
      [
        "Un électron possède une masse",
        "Le champ de Higgs aide à expliquer l’origine de la masse des particules élémentaires comme l’électron. Ce n’est pas un objet caché dedans.",
      ],
      [
        "Un champ présent dans l’espace",
        "Le volume violet est un repère symbolique d’un champ présent partout. Le couplage de l’électron à ce champ est associé à sa masse.",
      ],
      [
        "Pas un fluide qui freine",
        "Ce champ ne ralentit pas les particules par frottement. Le photon reste sans masse ; l’essentiel de la masse du proton vient, lui, de la dynamique de l’interaction forte.",
      ],
    ],
    legend:
      "Points violets : représentation symbolique du champ, pas des bosons de Higgs individuels.",
    note: "Un boson de Higgs est une excitation du champ. Afficher ces points ne signifie pas produire des bosons.",
    source: sources.higgs,
  },
};
export function contextualInteraction(
  node: MatterNode,
  molecule: MoleculeId,
): Interaction {
  if (isScale(node.id)) return molecule === "water" ? "cohesion" : "motion";
  if (node.kind === "molecule") return "bonds";
  if (node.kind === "atom") return "photon";
  if (node.kind === "nucleus")
    return node.children.length > 1 ? "nuclear" : "strong";
  if (node.kind === "electron") return "higgs";
  return "strong";
}
export default function Interactions({
  type,
  phase,
  onPhase,
  onClose,
}: {
  type: Interaction;
  phase: number;
  onPhase: (phase: number) => void;
  onClose: () => void;
}) {
  const lesson = lessons[type];
  return (
    <aside className="lesson-panel glass" aria-label="Comprendre l’interaction">
      <div className="lesson-header">
        <span className="eyebrow">OBSERVER & COMPRENDRE</span>
        <button
          className="icon-button"
          aria-label="Fermer l’explication"
          onClick={onClose}
        >
          <X size={16} />
        </button>
      </div>
      <h2>{lesson.title}</h2>
      <div className="lesson-steps" aria-label="Moments de l’expérience">
        {lesson.steps.map(([title], i) => (
          <button
            key={i}
            onClick={() => onPhase(i)}
            aria-pressed={phase === i}
            aria-label={`Étape ${i + 1} : ${title}`}
          >
            {i + 1}
            <span>
              {i === 0 ? "Avant" : i === 1 ? "Observer" : "Comprendre"}
            </span>
          </button>
        ))}
      </div>
      <div className="lesson-copy" aria-live="polite">
        <h3>{lesson.steps[phase][0]}</h3>
        <p>{lesson.steps[phase][1]}</p>
      </div>
      {type === "photon" && (
        <div className="energy-diagram" data-excited={phase === 1}>
          <span>Énergie de l’atome</span>
          <div>
            <i className={phase === 1 ? "occupied" : ""} />
            État excité
          </div>
          <b>
            {phase === 1
              ? "↑ Énergie absorbée"
              : phase === 2
                ? "↓ Énergie émise"
                : "Un photon arrive →"}
          </b>
          <div>
            <i className={phase !== 1 ? "occupied" : ""} />
            État initial
          </div>
        </div>
      )}
      <div className="lesson-legend">{lesson.legend}</div>
      <p className="lesson-note">{lesson.note}</p>
      <div className="lesson-actions">
        <button
          onClick={() => onPhase(Math.max(0, phase - 1))}
          disabled={phase === 0}
          aria-label="Moment précédent"
        >
          <ArrowLeft size={16} />
        </button>
        <button onClick={() => onPhase(phase === 2 ? 0 : phase + 1)}>
          {phase === 2 ? <RotateCcw size={15} /> : null}
          {phase === 2 ? "Revoir depuis le début" : "Voir la suite"}
          {phase < 2 ? <ArrowRight size={16} /> : null}
        </button>
      </div>
      <a
        className="source-link"
        href={lesson.source}
        target="_blank"
        rel="noreferrer"
      >
        Pourquoi ? La source scientifique <ArrowUpRight size={11} />
      </a>
    </aside>
  );
}
