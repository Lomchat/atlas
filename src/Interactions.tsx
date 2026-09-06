import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  RotateCcw,
  Pause,
  Play,
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
    title: "What holds liquid water together?",
    question: "Observe the attractions",
    steps: [
      [
        "Molecules close together",
        "H₂O molecules remain distinct. The sticks inside each one connect its own atoms.",
      ],
      [
        "Neighbors that attract",
        "The gold dotted lines symbolize attractions between molecules. Hydrogen bonds play a major role in water.",
      ],
      [
        "A liquid that can flow",
        "These attractions help hold the liquid together while allowing molecules to change neighbors. They do not form one giant molecule.",
      ],
    ],
    legend:
      "Gold dotted lines: attractions between molecules. Gray sticks: bonds within a molecule.",
    note: "Positions and movements are illustrative. The lines are neither wires nor a calculated map of hydrogen bonds.",
    source: matterSource,
  },
  motion: {
    title: "Why does gas fill its container?",
    question: "Observe gas motion",
    steps: [
      [
        "Molecules spaced apart",
        "Gas consists of separate molecules. The one at the center is our navigation marker.",
      ],
      [
        "They move around",
        "The other molecules travel through the volume in different directions. They keep moving even when the container appears still.",
      ],
      [
        "They hit the walls",
        "The frame represents a small, schematic container. The rebounds illustrate collisions with its walls; these impacts contribute to gas pressure.",
      ],
    ],
    legend:
      "Connected spheres: whole molecules. Frame: walls of the illustrative container.",
    note: "Motion is slowed down and paths are simplified. The frame belongs to this demonstration; it does not represent a membrane within the gas.",
    source:
      "https://openstax.org/books/chemistry-2e/pages/9-5-the-kinetic-molecular-theory",
  },
  bonds: {
    title: "What connects atoms?",
    question: "Understand chemical bonds",
    steps: [
      [
        "Atoms in a molecule",
        "Each sphere represents an atom. The sticks show which pairs of atoms are bonded.",
      ],
      [
        "Shared electrons",
        "The bonds highlighted in gold are covalent: the atoms share electrons. The sticks are symbols, not tiny physical rods.",
      ],
      [
        "A molecule that stays whole",
        "Zooming inside does not break these bonds. You are exploring composition, not triggering a chemical reaction.",
      ],
    ],
    legend: "Gold: a highlighted covalent bond. Two sticks: a double bond.",
    note: "The bright dots highlight sharing; they are not electron trajectories. The clouds do not calculate molecular orbitals.",
    source:
      "https://openstax.org/books/chemistry-2e/pages/7-2-covalent-bonding",
  },
  nuclear: {
    title: "What holds the nucleus together?",
    question: "Understand nuclear cohesion",
    steps: [
      [
        "Protons and neutrons",
        "The nucleus is a collection of nucleons. Positively charged protons repel one another electrically.",
      ],
      [
        "A very short-range attraction",
        "The gold lines symbolize the nuclear interaction that binds nearby nucleons. It is related to the strong interaction between their quarks.",
      ],
      [
        "A bound nucleus",
        "This stable nucleus stays bound. The effect depends on distance and composition; it does not bind two distant nuclei in the same way.",
      ],
    ],
    legend:
      "Gold lines: a schematic interaction between nucleons, not chemical bonds.",
    note: "The hydrogen nucleus shown here is a single proton: zoom inside to explore its quarks.",
    source: "https://home.cern/science/physics/standard-model/",
  },
  strong: {
    title: "What keeps quarks together?",
    question: "Understand the strong interaction",
    steps: [
      [
        "Three valence quarks",
        "The three markers show the valence composition of a proton or neutron. They do not show its entire dynamic content.",
      ],
      [
        "Gluon exchange",
        "The gold curves suggest the strong interaction, carried by gluons. A gluon is a mediator of this interaction.",
      ],
      [
        "Confined quarks",
        "Moving these points apart does not produce a free quark. The zoom illustrates composition, not a physical separation of quarks.",
      ],
    ],
    legend:
      "Gold curves: a visual suggestion of gluon exchange. They are not measured trajectories.",
    note: "The model omits quark–antiquark pairs and the full dynamics of gluons.",
    source: sources.cern,
  },
  photon: {
    title: "How does a photon affect an atom?",
    question: "Light and energy",
    steps: [
      [
        "Before: a photon arrives",
        "The gold marker represents a photon, a quantum of light. In this example, it has the energy needed for a transition in the atom.",
      ],
      [
        "Absorption: the atom gains energy",
        "The photon is absorbed. The electronic state changes: the gold halo represents an excited state. The photon is not stored inside the electron.",
      ],
      [
        "Emission: the atom releases energy",
        "During a transition to a lower-energy state, the atom can emit a photon. In this two-level diagram, it returns to its initial state.",
      ],
    ],
    legend:
      "Gold marker: a photon. Gold halo: the energy of the excited state, not the atom’s actual size.",
    note: "An example of an isolated atom with two levels. Energy states differ in a molecule; not every photon is absorbed.",
    source: sources.atom,
  },
  higgs: {
    title: "What is the Higgs field?",
    question: "The Higgs field and mass",
    steps: [
      [
        "An electron has mass",
        "The Higgs field helps explain the origin of the mass of elementary particles such as the electron. It is not an object hidden inside them.",
      ],
      [
        "A field throughout space",
        "The purple volume symbolizes a field present everywhere. The electron’s coupling to this field is associated with its mass.",
      ],
      [
        "Not a fluid that slows things down",
        "This field does not slow particles through friction. The photon remains massless; most of the proton’s mass comes from the dynamics of the strong interaction.",
      ],
    ],
    legend:
      "Purple dots: a symbolic representation of the field, not individual Higgs bosons.",
    note: "The pulse helps you identify the field; it does not show a moving fluid. The dots are not bosons produced in the scene.",
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
  paused,
  onPause,
  onReplay,
}: {
  type: Interaction;
  phase: number;
  onPhase: (phase: number) => void;
  onClose: () => void;
  paused: boolean;
  onPause: () => void;
  onReplay: () => void;
}) {
  const lesson = lessons[type];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  return (
    <aside
      className="lesson-panel glass"
      aria-label="Understand the interaction"
    >
      <div className="lesson-header">
        <span className="eyebrow">OBSERVE & UNDERSTAND</span>
        <button
          className="icon-button"
          aria-label="Close explanation"
          onClick={onClose}
        >
          <X size={16} />
        </button>
      </div>
      <h2>{lesson.title}</h2>
      <div className="lesson-steps" aria-label="Stages of the demonstration">
        {lesson.steps.map(([title], i) => (
          <button
            key={i}
            onClick={() => onPhase(i)}
            aria-pressed={phase === i}
            aria-label={`Step ${i + 1}: ${title}`}
          >
            {i + 1}
            <span>
              {i === 0 ? "Before" : i === 1 ? "Observe" : "Understand"}
            </span>
          </button>
        ))}
      </div>
      <div className="lesson-playback">
        <button
          onClick={onPause}
          disabled={reduced}
          aria-label={paused ? "Resume animation" : "Pause animation"}
        >
          {paused || reduced ? <Play size={15} /> : <Pause size={15} />}
          <span>
            {reduced ? "Reduced motion" : paused ? "Resume" : "Pause"}
          </span>
        </button>
        <button
          onClick={onReplay}
          disabled={reduced}
          aria-label="Replay animation"
        >
          <RotateCcw size={14} />
          <span>Replay</span>
        </button>
        <small>
          {reduced ? "Static diagram" : paused ? "Paused" : "Slow-motion loop"}
        </small>
      </div>
      <div className="lesson-copy" aria-live="polite">
        <h3>{lesson.steps[phase][0]}</h3>
        <p>{lesson.steps[phase][1]}</p>
      </div>
      {type === "photon" && (
        <div className="energy-diagram" data-excited={phase === 1}>
          <span>Atom energy</span>
          <div>
            <i className={phase === 1 ? "occupied" : ""} />
            Excited state
          </div>
          <b>
            {phase === 1
              ? "↑ Energy absorbed"
              : phase === 2
                ? "↓ Energy emitted"
                : "A photon arrives →"}
          </b>
          <div>
            <i className={phase !== 1 ? "occupied" : ""} />
            Initial state
          </div>
        </div>
      )}
      <div className="lesson-legend">{lesson.legend}</div>
      <p className="lesson-note">{lesson.note}</p>
      <div className="lesson-actions">
        <button
          onClick={() => onPhase(Math.max(0, phase - 1))}
          disabled={phase === 0}
          aria-label="Previous stage"
        >
          <ArrowLeft size={16} />
        </button>
        <button onClick={() => onPhase(phase === 2 ? 0 : phase + 1)}>
          {phase === 2 ? <RotateCcw size={15} /> : null}
          {phase === 2 ? "Restart from the beginning" : "Continue"}
          {phase < 2 ? <ArrowRight size={16} /> : null}
        </button>
      </div>
      <a
        className="source-link"
        href={lesson.source}
        target="_blank"
        rel="noreferrer"
      >
        Why? Read the scientific source <ArrowUpRight size={11} />
      </a>
    </aside>
  );
}
