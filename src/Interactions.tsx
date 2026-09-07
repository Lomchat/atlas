import { useEffect, useRef } from "react";
import { t } from "./i18n";
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
    get title() {
      return t("What holds liquid water together?");
    },
    get question() {
      return t("Observe the attractions");
    },
    get steps(): [string, string][] {
      return [
        [
          t("Molecules close together"),
          t(
            "H₂O molecules remain distinct. The sticks inside each one connect its own atoms.",
          ),
        ],
        [
          t("Neighbors that attract"),
          t(
            "The gold dotted lines symbolize attractions between molecules. Hydrogen bonds play a major role in water.",
          ),
        ],
        [
          t("A liquid that can flow"),
          t(
            "These attractions help hold the liquid together while allowing molecules to change neighbors. They do not form one giant molecule.",
          ),
        ],
      ];
    },
    get legend() {
      return t(
        "Gold dotted lines: attractions between molecules. Gray sticks: bonds within a molecule.",
      );
    },
    get note() {
      return t(
        "Positions and movements are illustrative. The lines are neither wires nor a calculated map of hydrogen bonds.",
      );
    },
    source: matterSource,
  },
  motion: {
    get title() {
      return t("Why does gas fill its container?");
    },
    get question() {
      return t("Observe gas motion");
    },
    get steps(): [string, string][] {
      return [
        [
          t("Molecules spaced apart"),
          t(
            "Gas consists of separate molecules. The one at the center is our navigation marker.",
          ),
        ],
        [
          t("They move around"),
          t(
            "The other molecules travel through the volume in different directions. They keep moving even when the container appears still.",
          ),
        ],
        [
          t("They hit the walls"),
          t(
            "The frame represents a small, schematic container. The rebounds illustrate collisions with its walls; these impacts contribute to gas pressure.",
          ),
        ],
      ];
    },
    get legend() {
      return t(
        "Connected spheres: whole molecules. Frame: walls of the illustrative container.",
      );
    },
    get note() {
      return t(
        "Motion is slowed down and paths are simplified. The frame belongs to this demonstration; it does not represent a membrane within the gas.",
      );
    },
    source:
      "https://openstax.org/books/chemistry-2e/pages/9-5-the-kinetic-molecular-theory",
  },
  bonds: {
    get title() {
      return t("What connects atoms?");
    },
    get question() {
      return t("Understand chemical bonds");
    },
    get steps(): [string, string][] {
      return [
        [
          t("Atoms in a molecule"),
          t(
            "Each sphere represents an atom. The sticks show which pairs of atoms are bonded.",
          ),
        ],
        [
          t("Shared electrons"),
          t(
            "The bonds highlighted in gold are covalent: the atoms share electrons. The sticks are symbols, not tiny physical rods.",
          ),
        ],
        [
          t("A molecule that stays whole"),
          t(
            "Zooming inside does not break these bonds. You are exploring composition, not triggering a chemical reaction.",
          ),
        ],
      ];
    },
    get legend() {
      return t("Gold: a highlighted covalent bond. Two sticks: a double bond.");
    },
    get note() {
      return t(
        "The bright dots highlight sharing; they are not electron trajectories. The clouds do not calculate molecular orbitals.",
      );
    },
    source:
      "https://openstax.org/books/chemistry-2e/pages/7-2-covalent-bonding",
  },
  nuclear: {
    get title() {
      return t("What holds the nucleus together?");
    },
    get question() {
      return t("Understand nuclear cohesion");
    },
    get steps(): [string, string][] {
      return [
        [
          t("Protons and neutrons"),
          t(
            "The nucleus is a collection of nucleons. Positively charged protons repel one another electrically.",
          ),
        ],
        [
          t("A very short-range attraction"),
          t(
            "The gold lines symbolize the nuclear interaction that binds nearby nucleons. It is related to the strong interaction between their quarks.",
          ),
        ],
        [
          t("A bound nucleus"),
          t(
            "This stable nucleus stays bound. The effect depends on distance and composition; it does not bind two distant nuclei in the same way.",
          ),
        ],
      ];
    },
    get legend() {
      return t(
        "Gold lines: a schematic interaction between nucleons, not chemical bonds.",
      );
    },
    get note() {
      return t(
        "The hydrogen nucleus shown here is a single proton: zoom inside to explore its quarks.",
      );
    },
    source: "https://home.cern/science/physics/standard-model/",
  },
  strong: {
    get title() {
      return t("What keeps quarks together?");
    },
    get question() {
      return t("Understand the strong interaction");
    },
    get steps(): [string, string][] {
      return [
        [
          t("Three valence quarks"),
          t(
            "The three markers show the valence composition of a proton or neutron. They do not show its entire dynamic content.",
          ),
        ],
        [
          t("Gluon exchange"),
          t(
            "The gold curves suggest the strong interaction, carried by gluons. A gluon is a mediator of this interaction.",
          ),
        ],
        [
          t("Confined quarks"),
          t(
            "Moving these points apart does not produce a free quark. The zoom illustrates composition, not a physical separation of quarks.",
          ),
        ],
      ];
    },
    get legend() {
      return t(
        "Gold curves: a visual suggestion of gluon exchange. They are not measured trajectories.",
      );
    },
    get note() {
      return t(
        "The model omits quark–antiquark pairs and the full dynamics of gluons.",
      );
    },
    source: sources.cern,
  },
  photon: {
    get title() {
      return t("How does a photon affect an atom?");
    },
    get question() {
      return t("Light and energy");
    },
    get steps(): [string, string][] {
      return [
        [
          t("Before: a photon arrives"),
          t(
            "The gold marker represents a photon, a quantum of light. In this example, it has the energy needed for a transition in the atom.",
          ),
        ],
        [
          t("Absorption: the atom gains energy"),
          t(
            "The photon is absorbed. The electronic state changes: the gold halo represents an excited state. The photon is not stored inside the electron.",
          ),
        ],
        [
          t("Emission: the atom releases energy"),
          t(
            "During a transition to a lower-energy state, the atom can emit a photon. In this two-level diagram, it returns to its initial state.",
          ),
        ],
      ];
    },
    get legend() {
      return t(
        "Gold marker: a photon. Gold halo: the energy of the excited state, not the atom’s actual size.",
      );
    },
    get note() {
      return t(
        "An example of an isolated atom with two levels. Energy states differ in a molecule; not every photon is absorbed.",
      );
    },
    source: sources.atom,
  },
  higgs: {
    get title() {
      return t("What is the Higgs field?");
    },
    get question() {
      return t("The Higgs field and mass");
    },
    get steps(): [string, string][] {
      return [
        [
          t("An electron has mass"),
          t(
            "The Higgs field helps explain the origin of the mass of elementary particles such as the electron. It is not an object hidden inside them.",
          ),
        ],
        [
          t("A field throughout space"),
          t(
            "The purple volume symbolizes a field present everywhere. The electron’s coupling to this field is associated with its mass.",
          ),
        ],
        [
          t("Not a fluid that slows things down"),
          t(
            "This field does not slow particles through friction. The photon remains massless; most of the proton’s mass comes from the dynamics of the strong interaction.",
          ),
        ],
      ];
    },
    get legend() {
      return t(
        "Purple dots: a symbolic representation of the field, not individual Higgs bosons.",
      );
    },
    get note() {
      return t(
        "The pulse helps you identify the field; it does not show a moving fluid. The dots are not bosons produced in the scene.",
      );
    },
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
  const panel = useRef<HTMLElement>(null);
  useEffect(() => {
    if (panel.current) panel.current.scrollTop = 0;
  }, [type, phase]);
  const lesson = lessons[type];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  return (
    <aside
      ref={panel}
      className="lesson-panel glass"
      aria-label={t("Understand the interaction")}
    >
      <div className="lesson-header">
        <span className="eyebrow">{t("OBSERVE & UNDERSTAND")}</span>
        <button
          className="icon-button"
          aria-label={t("Close explanation")}
          onClick={onClose}
        >
          <X size={16} />
        </button>
      </div>
      <h2>{lesson.title}</h2>
      <div
        className="lesson-steps"
        aria-label={t("Stages of the demonstration")}
      >
        {lesson.steps.map(([title], i) => (
          <button
            key={i}
            onClick={() => onPhase(i)}
            aria-pressed={phase === i}
            aria-label={t("Step {number}: {title}", { number: i + 1, title })}
          >
            {i + 1}
            <span>
              {i === 0 ? t("Before") : i === 1 ? t("Observe") : t("Understand")}
            </span>
          </button>
        ))}
      </div>
      <div className="lesson-copy" aria-live="polite" key={`${type}:${phase}`}>
        <h3>{lesson.steps[phase][0]}</h3>
        <p>{lesson.steps[phase][1]}</p>
      </div>
      <div className="lesson-playback">
        <button
          onClick={onPause}
          disabled={reduced}
          aria-label={paused ? t("Resume animation") : t("Pause animation")}
        >
          {paused || reduced ? <Play size={15} /> : <Pause size={15} />}
          <span>
            {reduced ? t("Reduced motion") : paused ? t("Resume") : t("Pause")}
          </span>
        </button>
        <button
          onClick={onReplay}
          disabled={reduced}
          aria-label={t("Replay animation")}
        >
          <RotateCcw size={14} />
          <span>{t("Replay")}</span>
        </button>
        <small>
          {reduced
            ? t("Static diagram")
            : paused
              ? t("Paused")
              : t("Slow-motion loop")}
        </small>
      </div>
      {type === "photon" && (
        <div className="energy-diagram" data-excited={phase === 1}>
          <span>{t("Atom energy")}</span>
          <div>
            <i className={phase === 1 ? "occupied" : ""} />
            {t("Excited state")}{" "}
          </div>
          <b>
            {phase === 1
              ? t("↑ Energy absorbed")
              : phase === 2
                ? t("↓ Energy emitted")
                : t("A photon arrives →")}
          </b>
          <div>
            <i className={phase !== 1 ? "occupied" : ""} />
            {t("Initial state")}{" "}
          </div>
        </div>
      )}
      <div className="lesson-legend">{lesson.legend}</div>
      <p className="lesson-note">{lesson.note}</p>
      <div className="lesson-actions">
        <button
          onClick={() => onPhase(Math.max(0, phase - 1))}
          disabled={phase === 0}
          aria-label={t("Previous stage")}
        >
          <ArrowLeft size={16} />
        </button>
        <button onClick={() => onPhase(phase === 2 ? 0 : phase + 1)}>
          {phase === 2 ? <RotateCcw size={15} /> : null}
          {phase === 2 ? t("Restart from the beginning") : t("Continue")}
          {phase < 2 ? <ArrowRight size={16} /> : null}
        </button>
      </div>
      <a
        className="source-link"
        href={lesson.source}
        target="_blank"
        rel="noreferrer"
      >
        {t("Why? Read the scientific source")} <ArrowUpRight size={11} />
      </a>
    </aside>
  );
}
