import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import {
  ArrowDownRight,
  ArrowRight,
  Atom,
  BookOpen,
  Bookmark,
  Check,
  ChevronDown,
  ChevronRight,
  Compass,
  Droplets,
  ExternalLink,
  FlaskConical,
  Focus,
  Globe2,
  HelpCircle,
  Leaf,
  Map,
  Maximize2,
  Microscope,
  Minus,
  Mountain,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Search,
  Share2,
  Sparkles,
  TreePine,
  UserRound,
  Waves,
  X,
} from "lucide-react";
import LanguagePicker from "../LanguagePicker";
import { getLocale, t, useLocale } from "../i18n";
import type { MessageKey } from "../i18n";
import {
  WORLD_NODES,
  WORLD_ROOTS,
  WORLD_JOURNEYS,
  WORLD_QUIZZES,
  WORLD_MECHANISMS,
} from "./data";
import type { WorldNode } from "./data";
import { anatomyVisible } from "./anatomyModels";
import type { AnatomyMode } from "./anatomyModels";
import "./world.css";

export interface WorldUIProps {
  selectedId: string;
  preferredChildId?: string;
  onNextTargetChange?: (parentId: string, childId: string | undefined) => void;
  onNavigate: (id: string) => void;
  onBack: () => void;
  onHome: () => void;
  sceneInfo: {
    metersPerPixel: number;
    transitioning: boolean;
    visibleIds: string[];
    anatomyStatus?: "loading" | "ready" | "error";
  };
  rotating: boolean;
  onRotate: () => void;
  onFocusMode: (value: boolean) => void;
  focusMode: boolean;
  onOpenMatter: () => void;
  onResetView?: () => void;
  comparison?: ReactNode;
  anatomyControls?: ReactNode;
  anatomyMode: AnatomyMode;
  onRetryAnatomy?: () => void;
  mechanismVisual?: ReactNode;
  onMechanismChange?: (
    id: string | null,
    phase: number,
    playing: boolean,
  ) => void;
}

type Modal = "discover" | "quiz" | "share" | null;
type DiscoverTab = "worlds" | "journeys" | "notebook";
type Journal = { visited: string[]; saved: string[]; understood: string[] };
const emptyJournal: Journal = { visited: [], saved: [], understood: [] };
const journalKey = "atlas-world-notebook-v1";
const sizeFormatters = {
  en: new Intl.NumberFormat("en", { maximumSignificantDigits: 3 }),
  fr: new Intl.NumberFormat("fr", { maximumSignificantDigits: 3 }),
};
// Question words must not hide an exact concept such as "a red blood cell".
const searchStopwords = new Set(
  "what how why where is are does do the a an of inside made make makes from contain contains composed in de du des quoi comment pourquoi ou est sont un une le la les l d en dans fait faite compose composee composes composition constitue constituee constituents contient qu ce que il elle".split(
    " ",
  ),
);

function readJournal(): Journal {
  try {
    const parsed: unknown = JSON.parse(
      localStorage.getItem(journalKey) || "null",
    );
    if (!parsed || typeof parsed !== "object") return emptyJournal;
    const value = parsed as Record<string, unknown>;
    const list = (key: string) =>
      Array.isArray(value[key])
        ? (value[key] as unknown[])
            .filter((id): id is string => typeof id === "string")
            .slice(-500)
        : [];
    return {
      visited: list("visited"),
      saved: list("saved"),
      understood: list("understood"),
    };
  } catch {
    return emptyJournal;
  }
}

function pathTo(id: string): WorldNode[] {
  const path: WorldNode[] = [];
  const seen = new Set<string>();
  let current = WORLD_NODES[id];
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    path.unshift(current);
    current = current.parent ? WORLD_NODES[current.parent] : undefined!;
  }
  return path;
}

export function formatWorldSize(meters: number): string {
  if (!Number.isFinite(meters) || meters <= 0) return "—";
  const units: [number, string][] = [
    [1e3, "km"],
    [1, "m"],
    [1e-2, "cm"],
    [1e-3, "mm"],
    [1e-6, "µm"],
    [1e-9, "nm"],
    [1e-12, "pm"],
    [1e-15, "fm"],
  ];
  const unit =
    units.find(([size]) => meters >= size) || units[units.length - 1];
  return `${sizeFormatters[getLocale()].format(meters / unit[0])} ${unit[1]}`;
}

function NodeIcon({ node, size = 20 }: { node: WorldNode; size?: number }) {
  const Icon =
    node.category === "human"
      ? UserRound
      : node.category === "tree"
        ? TreePine
        : node.category === "water"
          ? Droplets
          : node.category === "cloud"
            ? Waves
            : node.category === "rock"
              ? Mountain
              : node.category === "mushroom"
                ? Leaf
                : Globe2;
  return <Icon size={size} aria-hidden="true" />;
}

function Dialog({
  title,
  onClose,
  children,
  className = "",
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const initial =
      ref.current?.querySelector<HTMLElement>("[data-autofocus]") ||
      ref.current?.querySelector<HTMLElement>("button, input, a[href]");
    initial?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        closeRef.current();
      }
      if (event.key !== "Tab") return;
      const items = Array.from(
        ref.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input, a[href], [tabindex="0"]',
        ) || [],
      ).filter((item) => item.getClientRects().length > 0);
      const first = items[0],
        last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      }
      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", key, true);
    return () => {
      document.removeEventListener("keydown", key, true);
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="world-modal-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        className={`world-modal ${className}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <button
          className="world-icon-button world-modal-close"
          data-action="world-close-modal"
          onClick={onClose}
          aria-label={t("Close this window")}
        >
          <X size={20} />
        </button>
        {children}
      </div>
    </div>
  );
}

export function WorldUI({
  selectedId,
  preferredChildId,
  onNextTargetChange,
  onNavigate,
  onBack,
  onHome,
  sceneInfo,
  rotating,
  onRotate,
  onFocusMode,
  focusMode,
  onOpenMatter,
  onResetView,
  comparison,
  anatomyControls,
  anatomyMode,
  onRetryAnatomy,
  mechanismVisual,
  onMechanismChange,
}: WorldUIProps) {
  const locale = useLocale();
  const node = WORLD_NODES[selectedId] || WORLD_NODES.world;
  const path = useMemo(() => pathTo(node.id), [node.id]);
  const children = node.children.map((id) => WORLD_NODES[id]).filter(Boolean);
  const parent = node.parent ? WORLD_NODES[node.parent] : undefined;
  const isWorld = node.id === "world";
  const [inspector, setInspector] = useState(() => window.innerWidth >= 980);
  const [mapOpen, setMapOpen] = useState(false);
  const [modal, setModal] = useState<Modal>(null);
  const [tab, setTab] = useState<DiscoverTab>("worlds");
  const [query, setQuery] = useState("");
  const [journal, setJournal] = useState<Journal>(readJournal);
  const [activeTrail, setActiveTrail] = useState<string | null>(null);
  const [answerOpen, setAnswerOpen] = useState(false);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizAnswer, setQuizAnswer] = useState<number | null>(null);
  const [toast, setToast] = useState<MessageKey | "">("");
  const [mechanismId, setMechanismId] = useState<string | null>(null);
  const [mechanismPhase, setMechanismPhase] = useState(0);
  const [mechanismPlaying, setMechanismPlaying] = useState(false);
  const mechanismRef = useRef<HTMLDivElement>(null);
  const mechanism = WORLD_MECHANISMS.find((item) => item.id === mechanismId);
  const nearbyMechanisms = WORLD_MECHANISMS.filter(
    (item) =>
      item.node === node.id ||
      item.node.startsWith(`${node.id}/`) ||
      node.id.startsWith(`${item.node}/`),
  );
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const breadcrumbRef = useRef<HTMLElement>(null);
  const trail = WORLD_JOURNEYS.find((journey) => journey.id === activeTrail);
  const trailIndex = trail?.path.indexOf(node.id) ?? -1;
  const trailNext =
    trail && trailIndex >= 0
      ? WORLD_NODES[trail.path[trailIndex + 1]]
      : undefined;
  const next =
    (trailNext &&
    (node.id !== "human" || anatomyVisible(trailNext.id, anatomyMode))
      ? trailNext
      : undefined) ||
    WORLD_NODES[preferredChildId || node.defaultChild || node.children[0]];
  const quiz = WORLD_QUIZZES[quizIndex % Math.max(1, WORLD_QUIZZES.length)];
  const saved = journal.saved.includes(node.id);
  const completedTrail = Boolean(trail && trailIndex === trail.path.length - 1);
  const located = journal.visited.filter(
    (id) => id !== "world" && WORLD_NODES[id],
  );
  const results = useMemo(() => {
    const needle = query
      .trim()
      .toLocaleLowerCase(locale)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    if (!needle) return [];
    const words = needle
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .split(/\s+/)
      .filter(Boolean);
    if (!words.length) return [];
    const meaningful = words.filter((word) => !searchStopwords.has(word));
    const terms = meaningful.length ? meaningful : words;
    return Object.values(WORLD_NODES)
      .filter((item) => item.id !== "world")
      .map((item) => {
        const title = item.name[locale]
          .toLocaleLowerCase(locale)
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");
        const haystack =
          `${title} ${item.question[locale]} ${item.description[locale]} ${item.name.en} ${item.name.fr}`
            .toLocaleLowerCase(locale)
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
        return {
          item,
          score: terms.every((term) => haystack.includes(term))
            ? title.includes(needle)
              ? 10
              : terms.every((term) => title.includes(term))
                ? 8
                : 1
            : 0,
        };
      })
      .filter((result) => result.score)
      .sort((a, b) => b.score - a.score)
      .slice(0, 24)
      .map(({ item }) => item);
  }, [query, locale]);

  useEffect(() => {
    setAnswerOpen(false);
    setJournal((previous) => ({
      ...previous,
      visited: [
        ...previous.visited.filter((id) => id !== selectedId),
        selectedId,
      ],
    }));
  }, [selectedId]);
  useEffect(() => {
    if (breadcrumbRef.current)
      breadcrumbRef.current.scrollLeft = breadcrumbRef.current.scrollWidth;
  }, [selectedId, locale]);
  useEffect(() => {
    try {
      localStorage.setItem(journalKey, JSON.stringify(journal));
    } catch {
      /* Discovering never requires storage. */
    }
  }, [journal]);
  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );
  useEffect(() => {
    onNextTargetChange?.(node.id, next?.id);
  }, [node.id, next?.id, onNextTargetChange]);
  useEffect(() => {
    if (focusMode) setMechanismPlaying(false);
  }, [focusMode]);
  useEffect(() => {
    onMechanismChange?.(mechanismId, mechanismPhase, mechanismPlaying);
  }, [mechanismId, mechanismPhase, mechanismPlaying, onMechanismChange]);
  useEffect(() => {
    if (!mechanism || !mechanismPlaying || focusMode) return;
    const timer = setTimeout(() => {
      if (mechanismPhase < mechanism.steps.length - 1)
        setMechanismPhase((phase) => phase + 1);
      else setMechanismPlaying(false);
    }, 10500);
    return () => clearTimeout(timer);
  }, [mechanismId, mechanismPlaying, mechanismPhase, focusMode]);
  useEffect(() => {
    mechanismRef.current?.scrollTo({ top: 0 });
  }, [mechanismPhase, mechanismId]);
  useEffect(() => {
    if (mechanism && selectedId !== mechanism.node) {
      setMechanismId(null);
      setMechanismPlaying(false);
    }
  }, [selectedId, mechanismId]);

  const go = (id: string) => {
    setMechanismId(null);
    setMechanismPlaying(false);
    onNavigate(id);
    setMapOpen(false);
    setModal(null);
  };
  const openDiscover = (nextTab: DiscoverTab = "worlds") => {
    setTab(nextTab);
    setQuery("");
    setModal("discover");
    setMapOpen(false);
  };
  const notify = (message: MessageKey) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2400);
  };
  const save = () =>
    setJournal((previous) => ({
      ...previous,
      saved: previous.saved.includes(node.id)
        ? previous.saved.filter((id) => id !== node.id)
        : [...previous.saved, node.id],
    }));
  const share = async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      notify("Link copied");
    } catch {
      setModal("share");
    }
  };
  const openQuiz = () => {
    const matched = WORLD_QUIZZES.findIndex((item) =>
      path.some((ancestor) => ancestor.id === item.node),
    );
    setQuizIndex(matched >= 0 ? matched : 0);
    setQuizAnswer(null);
    setModal("quiz");
  };
  const startTrail = (id: string) => {
    const journey = WORLD_JOURNEYS.find((item) => item.id === id);
    if (!journey) return;
    setActiveTrail(id);
    go(journey.path[0]);
  };
  const startMechanism = (id: string) => {
    const item = WORLD_MECHANISMS.find((entry) => entry.id === id);
    if (!item) return;
    onNavigate(item.node);
    setMechanismId(id);
    setMechanismPhase(0);
    setMechanismPlaying(
      !matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
    setModal(null);
    setInspector(true);
    setMapOpen(false);
  };
  const baseRuler = Math.max(1e-20, sceneInfo.metersPerPixel * 112);
  const exponent = 10 ** Math.floor(Math.log10(baseRuler));
  const rulerMeters =
    ([1, 2, 5].filter((step) => step * exponent <= baseRuler).at(-1) || 1) *
    exponent;
  const rulerPixels =
    sceneInfo.metersPerPixel > 0
      ? Math.min(140, rulerMeters / sceneInfo.metersPerPixel)
      : 100;
  const relationLabel =
    node.relation === "madeOf"
      ? t("Made of")
      : node.relation === "sample"
        ? t("A representative sample")
        : t("Contains");
  const relationDescription =
    node.relation === "madeOf"
      ? t(
          "These are constituents of this object. The displayed numbers are illustrative.",
        )
      : node.relation === "sample"
        ? t(
            "This view follows one representative example; it does not show every object present.",
          )
        : t(
            "These structures are found inside this object; they are not necessarily its building blocks.",
          );

  const placeCard = (
    item: WorldNode,
    compact = false,
    showQuestion = false,
  ) => (
    <button
      key={item.id}
      className={`world-place-card ${compact ? "compact" : ""}`}
      data-node={item.id}
      data-action="world-discover-place"
      onClick={() => go(item.id)}
      style={{ "--place-color": item.color } as CSSProperties}
    >
      <span className="world-place-symbol">
        <NodeIcon node={item} size={compact ? 19 : 29} />
      </span>
      <span>
        <strong>{item.name[locale]}</strong>
        <small>
          {compact
            ? pathTo(item.id)
                .slice(1, -1)
                .map((ancestor) => ancestor.name[locale])
                .join(" › ")
            : item.question[locale]}
        </small>
        {showQuestion && (
          <p className="world-result-question">{item.question[locale]}</p>
        )}
      </span>
      <ArrowUpRightIcon />
    </button>
  );

  const mapRow = (item: WorldNode, depth = 0): ReactNode => {
    const expanded = path.some((ancestor) => ancestor.id === item.id);
    return (
      <div key={item.id}>
        <button
          className={`world-map-row ${item.id === node.id ? "current" : ""}`}
          data-action="world-map-place"
          data-node={item.id}
          aria-current={item.id === node.id ? "location" : undefined}
          style={
            { "--depth": depth, "--place-color": item.color } as CSSProperties
          }
          onClick={() => go(item.id)}
        >
          <i />
          <span>{item.name[locale]}</span>
          {item.children.length > 0 && <ChevronRight size={13} />}
        </button>
        {expanded &&
          item.children
            .map((id) => WORLD_NODES[id])
            .filter(Boolean)
            .map((child) => mapRow(child, depth + 1))}
      </div>
    );
  };

  return (
    <div
      className={`world-ui ${focusMode ? "world-focus" : ""} ${isWorld ? "is-world" : "is-detail"}`}
      data-inspector-open={!isWorld && inspector && !focusMode}
      data-map-open={mapOpen && !focusMode}
      data-modal-open={Boolean(modal)}
    >
      <header className="world-topbar">
        <div className="world-brand-group">
          <LanguagePicker />
          <button
            className="world-brand"
            data-action="world-home"
            onClick={onHome}
            aria-label={t("Back to the world")}
          >
            <Globe2 size={26} strokeWidth={1.4} />
            <span>
              {t("Matter")}
              <strong>{t("Atlas")}</strong>
            </span>
            <i />
          </button>
        </div>
        <nav
          ref={breadcrumbRef}
          className="world-breadcrumb"
          aria-label={t("Exploration path")}
        >
          {path.map((item, index) => (
            <span key={item.id}>
              {index > 0 && <ChevronRight size={12} />}
              <button
                data-action="world-breadcrumb"
                data-node={item.id}
                aria-current={item.id === node.id ? "location" : undefined}
                onClick={() => go(item.id)}
                title={item.name[locale]}
              >
                {index === 0 ? <Globe2 size={15} /> : item.name[locale]}
              </button>
            </span>
          ))}
        </nav>
        <div className="world-top-actions">
          <button
            className="world-search-trigger"
            data-action="world-search"
            onClick={() => openDiscover()}
            aria-label={t("Find something to explore")}
          >
            <Search size={17} />
            <span>{t("Explore the world")}</span>
            <kbd>⌕</kbd>
          </button>
          <button
            className="world-icon-button world-notebook-trigger"
            data-action="world-notebook"
            onClick={() => openDiscover("notebook")}
            aria-label={t("My discoveries")}
            title={t("My discoveries")}
          >
            <BookOpen size={19} />
            {located.length > 0 && <i />}
          </button>
        </div>
      </header>

      <aside className="world-scale" aria-label={t("Size & scale")}>
        <div className="world-scale-heading">
          <span>{t("View scale")}</span>
          <span
            className={sceneInfo.transitioning ? "travelling" : ""}
            aria-label={
              sceneInfo.transitioning ? t("Entering…") : t("Stable view")
            }
          >
            <i />
          </span>
        </div>
        <div
          className="world-ruler"
          data-meters={rulerMeters}
          data-pixels={rulerPixels}
        >
          <strong>{formatWorldSize(rulerMeters)}</strong>
          <svg
            width="144"
            height="15"
            aria-label={t("Camera ruler")}
            role="img"
          >
            <path
              d={`M1 3v8M1 7.5h${rulerPixels}M${1 + rulerPixels} 3v8`}
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
            />
          </svg>
          <p className="world-ruler-plane">
            {t("At the camera’s focus plane")}
          </p>
        </div>
        {!isWorld && comparison && (
          <div className="world-comparison-slot">{comparison}</div>
        )}
        {!isWorld && (
          <div className="world-object-size">
            <span>{t("Object size")}</span>
            <strong>
              {node.sizeMeters
                ? `≈ ${formatWorldSize(node.sizeMeters)}`
                : t("No measured particle diameter")}
            </strong>
          </div>
        )}
        <p className="world-model-notice">
          {t("Schematic 3D · colours and counts are illustrative")}
        </p>
        <details className="world-scale-info">
          <summary aria-label={t("What this model shows")}>
            <HelpCircle size={14} />
          </summary>
          <p>
            {t(
              "This ruler follows the camera. Each scene is reframed; compare the labelled physical sizes.",
            )}
          </p>
        </details>
      </aside>

      {isWorld && !focusMode && (
        <section className="world-welcome">
          <span className="world-eyebrow">
            <i />
            {t("Everything is connected")}
          </span>
          <h1>{t("A world of things. A universe inside.")}</h1>
          <p>
            {t(
              "Start with something familiar. Follow what it contains, all the way down.",
            )}
          </p>
          <button
            className="world-primary"
            data-action="world-start-journey"
            onClick={() => openDiscover("journeys")}
          >
            <Compass size={18} />
            {t("Follow a question")}
            <ArrowRight size={17} />
          </button>
          <button
            className="world-text-button"
            data-action="world-browse"
            onClick={() => openDiscover()}
          >
            {t("Six starting points. Countless questions.")}
            <ArrowDownRight size={16} />
          </button>
          <a
            className="world-anatomy-credit"
            href="/models/bodyparts3d/README.md"
            target="_blank"
            rel="noreferrer"
            title={t(
              "BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International.",
            )}
          >
            {t("BodyParts3D · source & licenses")}
          </a>
        </section>
      )}

      {mapOpen && !focusMode && (
        <aside className="world-map" aria-label={t("Exploration map")}>
          <div className="world-panel-top">
            <span>
              <Map size={16} />
              {t("Exploration map")}
            </span>
            <button
              className="world-icon-button"
              onClick={() => setMapOpen(false)}
              aria-label={t("Close this window")}
            >
              <X size={17} />
            </button>
          </div>
          <div className="world-map-scroll">{mapRow(WORLD_NODES.world)}</div>
          <div className="world-map-caption">
            <i />
            {t("You are here")}
            <span>{node.name[locale]}</span>
          </div>
        </aside>
      )}

      {!isWorld && !focusMode && (
        <>
          <button
            className={`world-inspector-toggle ${inspector ? "open" : ""}`}
            data-action="world-toggle-inspector"
            onClick={() => setInspector(!inspector)}
            aria-expanded={inspector}
            aria-controls="world-explanation"
            aria-label={
              inspector ? t("Fold the explanation") : t("Open the explanation")
            }
          >
            <BookOpen size={18} />
            <span>{t("A closer look")}</span>
            <ChevronDown size={14} />
          </button>
          {inspector && !mechanism && (
            <aside
              className="world-inspector"
              id="world-explanation"
              aria-label={t("A closer look")}
            >
              <div className="world-panel-top">
                <span>
                  <i style={{ background: node.color }} />
                  {t("A closer look")}
                </span>
                <button
                  className="world-icon-button"
                  data-action="world-fold-inspector"
                  onClick={() => setInspector(false)}
                  aria-label={t("Fold the explanation")}
                >
                  <X size={18} />
                </button>
              </div>
              <div className="world-inspector-scroll" key={node.id}>
                <div className="world-object-title">
                  <span
                    className="world-object-icon"
                    style={{ "--place-color": node.color } as CSSProperties}
                  >
                    <NodeIcon node={node} size={24} />
                  </span>
                  <div>
                    <small>{parent?.name[locale]}</small>
                    <h1>{node.name[locale]}</h1>
                  </div>
                </div>
                {anatomyControls}
                {!anatomyControls &&
                  sceneInfo.anatomyStatus &&
                  sceneInfo.anatomyStatus !== "ready" && (
                    <div className="anatomy-load-status" role="status">
                      <p>
                        {sceneInfo.anatomyStatus === "loading"
                          ? t("Loading anatomical surfaces…")
                          : t(
                              "The anatomical model could not load. Exploration links remain available.",
                            )}
                      </p>
                      {sceneInfo.anatomyStatus === "error" && (
                        <button type="button" onClick={onRetryAnatomy}>
                          {t("Retry anatomical download")}
                        </button>
                      )}
                    </div>
                  )}
                <p className="world-description">{node.description[locale]}</p>
                <div className="world-science-size">
                  <Microscope size={16} />
                  <div>
                    <strong>
                      {node.sizeMeters
                        ? `≈ ${formatWorldSize(node.sizeMeters)}`
                        : t("No measured particle diameter")}
                    </strong>
                    <span>{node.sizeNote[locale]}</span>
                  </div>
                </div>
                {children.length > 0 && !anatomyControls && (
                  <section className="world-inside-section">
                    <h2>
                      {t("What's inside?")}
                      <span>{children.length}</span>
                    </h2>
                    <p className="world-relation">
                      <span>{relationLabel}</span>
                      {relationDescription}
                    </p>
                    <div className="world-child-list">
                      {children.map((child) => (
                        <button
                          key={child.id}
                          data-action="world-enter-child"
                          data-node={child.id}
                          onClick={() => go(child.id)}
                          style={
                            { "--place-color": child.color } as CSSProperties
                          }
                        >
                          <span className="world-child-dot" />
                          <span>
                            <strong>{child.name[locale]}</strong>
                            <small>
                              {child.sizeMeters
                                ? formatWorldSize(child.sizeMeters)
                                : t("The smallest scale in this branch")}
                            </small>
                          </span>
                          <ArrowRight size={15} />
                        </button>
                      ))}
                    </div>
                  </section>
                )}
                <section className="world-question-card">
                  <span className="world-eyebrow">
                    <Sparkles size={13} />
                    {t("A good question")}
                  </span>
                  <h2>{node.question[locale]}</h2>
                  <button
                    data-action="world-reveal-answer"
                    aria-expanded={answerOpen}
                    onClick={() => setAnswerOpen(!answerOpen)}
                  >
                    {answerOpen ? t("Hide the answer") : t("Reveal the answer")}
                    <ChevronDown size={14} />
                  </button>
                  {answerOpen && <p>{node.answer[locale]}</p>}
                </section>
                {node.facts.length > 0 && (
                  <details className="world-facts">
                    <summary>
                      {t("The idea to remember")}
                      <Plus size={14} />
                    </summary>
                    {node.facts.map((fact, index) => (
                      <p key={index}>{fact[locale]}</p>
                    ))}
                  </details>
                )}
                <details className="world-sources">
                  <summary>
                    <BookOpen size={14} />
                    {t("Scientific sources")}
                    <ChevronDown size={14} />
                  </summary>
                  <ul>
                    {node.sources.map((source) => (
                      <li key={source.url}>
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {source.title}
                          <ExternalLink size={12} />
                        </a>
                      </li>
                    ))}
                  </ul>
                </details>
                <button
                  className="world-challenge-link"
                  data-action="world-open-quiz"
                  onClick={openQuiz}
                >
                  <Sparkles size={16} />
                  {t("A little challenge")}
                  <ArrowRight size={16} />
                </button>
                {nearbyMechanisms.map((item) => (
                  <button
                    key={item.id}
                    className="world-mechanism-trigger"
                    data-action="world-open-mechanism"
                    data-mechanism={item.id}
                    onClick={() => startMechanism(item.id)}
                  >
                    <Play size={15} />
                    <span>
                      <small>{t("See it happen")}</small>
                      <strong>{item.title[locale]}</strong>
                    </span>
                    <ArrowRight size={15} />
                  </button>
                ))}
              </div>
              <div className="world-inspector-footer">
                <button
                  data-action="world-save-place"
                  aria-pressed={saved}
                  onClick={save}
                  title={saved ? t("Remove saved place") : t("Save this place")}
                >
                  <Bookmark size={16} fill={saved ? "currentColor" : "none"} />
                  {saved ? t("Place saved") : t("Save this place")}
                </button>
                <button
                  className="world-icon-button"
                  data-action="world-share"
                  onClick={share}
                  aria-label={t("Share this place")}
                >
                  <Share2 size={17} />
                </button>
              </div>
            </aside>
          )}
        </>
      )}

      {mechanism && !focusMode && (
        <aside
          className="world-inspector world-mechanism-panel"
          aria-label={t("Animated explanations")}
          data-mechanism={mechanism.id}
          data-phase={mechanismPhase}
          data-playing={mechanismPlaying}
        >
          <div className="world-panel-top">
            <span>
              <Play size={13} />
              {t("See it happen")}
            </span>
            <button
              className="world-icon-button"
              data-action="world-close-mechanism"
              aria-label={t("Close the explanation")}
              onClick={() => {
                setMechanismId(null);
                setMechanismPlaying(false);
              }}
            >
              <X size={18} />
            </button>
          </div>
          <div className="world-mechanism-scroll" ref={mechanismRef}>
            <h2>{mechanism.title[locale]}</h2>
            <nav
              className="world-mechanism-steps"
              aria-label={t("Animated explanations")}
            >
              {mechanism.steps.map((step, index) => (
                <button
                  key={index}
                  data-action="world-mechanism-step"
                  data-step={index}
                  aria-current={index === mechanismPhase ? "step" : undefined}
                  onClick={() => {
                    setMechanismPhase(index);
                    setMechanismPlaying(false);
                  }}
                >
                  <i>{index + 1}</i>
                  <span>{step.title[locale]}</span>
                </button>
              ))}
            </nav>
            <div className="world-mechanism-explanation" key={mechanismPhase}>
              <span>
                {t("Step {current} of {total}", {
                  current: mechanismPhase + 1,
                  total: mechanism.steps.length,
                })}
              </span>
              <h3>{mechanism.steps[mechanismPhase].title[locale]}</h3>
              <p>{mechanism.steps[mechanismPhase].description[locale]}</p>
            </div>
            {mechanismVisual && (
              <div className="world-inline-mechanism">{mechanismVisual}</div>
            )}
            <div className="world-mechanism-controls">
              <button
                className="world-primary"
                data-action="world-mechanism-play"
                aria-pressed={mechanismPlaying}
                onClick={() => setMechanismPlaying(!mechanismPlaying)}
              >
                {mechanismPlaying ? <Pause size={16} /> : <Play size={16} />}
                {mechanismPlaying
                  ? t("Pause the explanation")
                  : t("Play the explanation")}
              </button>
              <button
                className="world-icon-button"
                data-action="world-mechanism-replay"
                aria-label={t("Replay the explanation")}
                onClick={() => {
                  setMechanismPhase(0);
                  setMechanismPlaying(true);
                }}
              >
                <RotateCcw size={18} />
              </button>
            </div>
            <p className="world-mechanism-notice">
              {t("Explanatory diagram · motion and timing are illustrative")}
            </p>
            <button
              className="world-text-button"
              data-action="world-mechanism-explore"
              onClick={() => {
                setMechanismId(null);
                setMechanismPlaying(false);
              }}
            >
              {t("Explore this structure")}
              <ArrowRight size={15} />
            </button>
          </div>
        </aside>
      )}

      {trail && !focusMode && (
        <section
          className={`world-trail ${completedTrail ? "complete" : ""}`}
          aria-label={t("Curiosity trails")}
        >
          <Compass size={18} />
          <div>
            <small>
              {completedTrail
                ? t("Trail completed")
                : t("Stop {current} of {total}", {
                    current: Math.max(1, trailIndex + 1),
                    total: trail.path.length,
                  })}
            </small>
            <strong>{trail.title[locale]}</strong>
            {completedTrail && <p>{trail.answer[locale]}</p>}
          </div>
          {completedTrail ? (
            <button
              className="world-icon-button"
              data-action="world-next-trail"
              onClick={() => openDiscover("journeys")}
              aria-label={t("Choose another trail")}
            >
              <ArrowRight size={17} />
            </button>
          ) : (
            <span className="world-trail-dots" aria-hidden="true">
              {trail.path.map((id, index) => (
                <i key={id} className={index <= trailIndex ? "visited" : ""} />
              ))}
            </span>
          )}
          <button
            className="world-icon-button"
            data-action="world-leave-trail"
            onClick={() => setActiveTrail(null)}
            aria-label={t("Leave this trail")}
          >
            <X size={15} />
          </button>
        </section>
      )}

      <nav className="world-navigation" aria-label={t("World navigation")}>
        <button
          data-action="world-out"
          data-target={parent?.id || "world"}
          disabled={!parent}
          onClick={onBack}
          aria-label={t("Zoom out to {name}", {
            name: parent?.name[locale] || WORLD_NODES.world.name[locale],
          })}
        >
          <Minus size={17} />
          <span>
            <small>{t("Parent scale")}</small>
            <strong>{parent?.name[locale] || t("Look around")}</strong>
          </span>
        </button>
        <i />
        <button
          data-action="world-in"
          data-target={next?.id || "discover"}
          onClick={() => (next ? go(next.id) : openDiscover("journeys"))}
          aria-label={
            next
              ? t("Zoom in to {name}", { name: next.name[locale] })
              : t("More to discover")
          }
        >
          <span>
            <small>{next ? t("Go inside") : t("Your next question")}</small>
            <strong>{next?.name[locale] || t("More to discover")}</strong>
          </span>
          <Plus size={17} />
        </button>
      </nav>

      <div className="world-tools" role="group" aria-label={t("World tools")}>
        <button
          className="world-icon-button"
          data-action="world-toggle-map"
          onClick={() => setMapOpen(!mapOpen)}
          aria-pressed={mapOpen}
          aria-label={t("Open the exploration map")}
          title={t("Exploration map")}
        >
          <Map size={19} />
        </button>
        <button
          className="world-icon-button"
          data-action="world-rotate"
          onClick={onRotate}
          aria-pressed={rotating}
          aria-label={
            rotating ? t("Pause gentle rotation") : t("Start gentle rotation")
          }
          title={
            rotating ? t("Pause gentle rotation") : t("Start gentle rotation")
          }
        >
          {rotating ? <Pause size={17} /> : <Play size={17} />}
        </button>
        <button
          className="world-icon-button"
          data-action="world-focus"
          onClick={() => onFocusMode(!focusMode)}
          aria-pressed={focusMode}
          aria-label={
            focusMode ? t("Show exploration panels") : t("Focus on the scene")
          }
          title={
            focusMode ? t("Show exploration panels") : t("Focus on the scene")
          }
        >
          {focusMode ? <Maximize2 size={18} /> : <Focus size={18} />}
        </button>
        {onResetView && (
          <button
            className="world-icon-button world-reset"
            data-action="world-reset"
            onClick={onResetView}
            aria-label={t("Overview")}
            title={t("Overview")}
          >
            <Compass size={18} />
          </button>
        )}
      </div>
      {!focusMode && (
        <div className="world-bottom-right">
          <button
            className="world-lab-button"
            data-action="world-laboratory"
            onClick={onOpenMatter}
            aria-label={t("Open the molecular laboratory")}
            title={t(
              "Explore molecules, atoms and interactions in the detailed laboratory.",
            )}
          >
            <FlaskConical size={17} />
            <span>{t("Molecular laboratory")}</span>
            <ArrowRight size={14} />
          </button>
        </div>
      )}
      {!trail && !focusMode && (
        <p className="world-gesture-hint">
          {isWorld
            ? t("Select an object to look inside.")
            : t("Drag to orbit · scroll or pinch to explore")}
        </p>
      )}
      <div className="world-toast" role="status" aria-live="polite">
        {toast && (
          <span>
            <Check size={16} />
            {t(toast)}
          </span>
        )}
      </div>

      {modal === "discover" && (
        <Dialog
          title={t("Search the atlas")}
          onClose={() => setModal(null)}
          className="world-discover-modal"
        >
          <div className="world-discover-heading">
            <span className="world-eyebrow">
              <Compass size={14} />
              {t("Everything is connected")}
            </span>
            <h2>{t("Explore the world")}</h2>
          </div>
          <label className="world-search-box">
            <Search size={20} />
            <input
              data-autofocus
              data-action="world-search-input"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("Search a question, an object, a cell…")}
              aria-label={t("Search the atlas")}
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                aria-label={t("Clear search")}
              >
                <X size={16} />
              </button>
            )}
          </label>
          {!query && (
            <nav
              className="world-discover-tabs"
              aria-label={t("Choose a starting point")}
            >
              <button
                aria-pressed={tab === "worlds"}
                data-action="world-tab-worlds"
                onClick={() => setTab("worlds")}
              >
                <Globe2 size={15} />
                {t("All worlds")}
              </button>
              <button
                aria-pressed={tab === "journeys"}
                data-action="world-tab-journeys"
                onClick={() => setTab("journeys")}
              >
                <Compass size={15} />
                {t("Curiosity trails")}
              </button>
              <button
                aria-pressed={tab === "notebook"}
                data-action="world-tab-notebook"
                onClick={() => setTab("notebook")}
              >
                <BookOpen size={15} />
                {t("My discoveries")}
              </button>
            </nav>
          )}
          <div className="world-discover-scroll">
            {query ? (
              <section className="world-search-results">
                <h3>{t("{count} places found", { count: results.length })}</h3>
                {results.length ? (
                  results.map((item) => placeCard(item, true, true))
                ) : (
                  <div className="world-empty">
                    <Search size={32} />
                    <h3>{t("No matching places yet.")}</h3>
                    <p>
                      {t(
                        "Try a shorter word, or choose one of the worlds below.",
                      )}
                    </p>
                    {WORLD_ROOTS.map((id) => placeCard(WORLD_NODES[id], true))}
                  </div>
                )}
              </section>
            ) : tab === "worlds" ? (
              <>
                <p className="world-section-intro">
                  {t("Six starting points. Countless questions.")}
                </p>
                <div className="world-places-grid">
                  {WORLD_ROOTS.map((id) => placeCard(WORLD_NODES[id]))}
                </div>
                <div className="world-classroom">
                  <BookOpen size={21} />
                  <div>
                    <strong>{t("A shared route for your classroom")}</strong>
                    <p>
                      {t(
                        "Share any place or follow a guided question together. Sources and model limits stay attached to every stop.",
                      )}
                    </p>
                  </div>
                </div>
              </>
            ) : tab === "journeys" ? (
              <>
                <p className="world-section-intro">
                  {t("A question worth going deeper for.")}
                </p>
                <div className="world-journey-grid">
                  {WORLD_JOURNEYS.map((journey, index) => (
                    <button
                      key={journey.id}
                      className="world-journey-card"
                      data-action="world-choose-trail"
                      data-trail={journey.id}
                      onClick={() => startTrail(journey.id)}
                    >
                      <span className="world-journey-number">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <small>
                        {t("{count} stops", { count: journey.path.length })}
                      </small>
                      <h3>{journey.title[locale]}</h3>
                      <p>{journey.question[locale]}</p>
                      <span className="world-journey-route">
                        {journey.path
                          .slice(0, 3)
                          .map((id) => WORLD_NODES[id]?.name[locale])
                          .join(" → ")}
                        <span>…</span>
                      </span>
                      <span className="world-journey-start">
                        {t("Follow this trail")}
                        <ArrowRight size={16} />
                      </span>
                    </button>
                  ))}
                </div>
                <h3 className="world-section-title">
                  <Play size={16} />
                  {t("Animated explanations")}
                </h3>
                <p className="world-section-intro">
                  {t("Watch a process unfold, one idea at a time.")}
                </p>
                <div className="world-mechanisms-grid">
                  {WORLD_MECHANISMS.map((item) => (
                    <button
                      key={item.id}
                      className="world-mechanism-trigger"
                      data-action="world-open-mechanism"
                      data-mechanism={item.id}
                      onClick={() => startMechanism(item.id)}
                    >
                      <Play size={16} />
                      <span>
                        <strong>{item.title[locale]}</strong>
                        <small>{WORLD_NODES[item.node].name[locale]}</small>
                      </span>
                      <ArrowRight size={15} />
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="world-journal-summary">
                  <span>
                    <strong>{located.length}</strong>
                    {t("{count} places discovered", { count: located.length })}
                  </span>
                  <span>
                    <strong>{journal.understood.length}</strong>
                    {t("{count} ideas understood", {
                      count: journal.understood.length,
                    })}
                  </span>
                </div>
                <p className="world-section-intro">
                  {t(
                    "Your discoveries stay on this device. No account needed.",
                  )}
                </p>
                <button
                  className="world-challenge-link"
                  data-action="world-notebook-quiz"
                  onClick={openQuiz}
                >
                  <Sparkles size={16} />
                  {t("Test your understanding")}
                  <ArrowRight size={16} />
                </button>
                <h3 className="world-section-title">
                  <Bookmark size={16} />
                  {t("Saved places")}
                </h3>
                {journal.saved.filter((id) => WORLD_NODES[id]).length ? (
                  <div className="world-notebook-list">
                    {journal.saved
                      .filter((id) => WORLD_NODES[id])
                      .map((id) => placeCard(WORLD_NODES[id], true))}
                  </div>
                ) : (
                  <p className="world-empty-line">
                    {t("Save a place to find it here later.")}
                  </p>
                )}
                <h3 className="world-section-title">
                  <Compass size={16} />
                  {t("Recently explored")}
                </h3>
                {located.length ? (
                  <div className="world-notebook-list">
                    {located
                      .slice(-15)
                      .reverse()
                      .map((id) => placeCard(WORLD_NODES[id], true))}
                  </div>
                ) : (
                  <p className="world-empty-line">
                    {t("Your first discovery is waiting.")}
                  </p>
                )}
              </>
            )}
          </div>
          <div className="world-discover-footer">
            <span>{t("Try red blood cell, wood or DNA.")}</span>
            <button
              onClick={() => {
                setModal(null);
                onOpenMatter();
              }}
              data-action="world-modal-laboratory"
            >
              <Atom size={15} />
              {t("Molecular laboratory")}
              <ArrowRight size={14} />
            </button>
          </div>
        </Dialog>
      )}

      {modal === "quiz" && quiz && (
        <Dialog
          title={t("A little challenge")}
          onClose={() => setModal(null)}
          className="world-quiz-modal"
        >
          <span className="world-eyebrow">
            <Sparkles size={15} />
            {t("A little challenge")}
          </span>
          <h2>{quiz.question[locale]}</h2>
          <p className="world-quiz-intro">
            {t("Choose an answer. Then discover why.")}
          </p>
          <div className="world-quiz-options">
            {quiz.options.map((option, index) => (
              <button
                key={index}
                data-action="world-quiz-answer"
                data-answer={index}
                className={
                  quizAnswer !== null
                    ? index === quiz.correct
                      ? "correct"
                      : index === quizAnswer
                        ? "incorrect"
                        : ""
                    : ""
                }
                disabled={quizAnswer !== null}
                aria-pressed={quizAnswer === index}
                onClick={() => {
                  setQuizAnswer(index);
                  if (index === quiz.correct)
                    setJournal((previous) => ({
                      ...previous,
                      understood: previous.understood.includes(quiz.id)
                        ? previous.understood
                        : [...previous.understood, quiz.id],
                    }));
                }}
              >
                <i>{String.fromCharCode(65 + index)}</i>
                <span>{option[locale]}</span>
                {quizAnswer !== null && index === quiz.correct && (
                  <Check size={19} />
                )}
              </button>
            ))}
          </div>
          {quizAnswer !== null && (
            <div className="world-quiz-feedback" role="status">
              <strong>
                {quizAnswer === quiz.correct
                  ? t("Exactly!")
                  : t("A useful discovery")}
              </strong>
              {quizAnswer !== quiz.correct && (
                <p>
                  {t("The correct answer is {answer}.", {
                    answer: quiz.options[quiz.correct][locale],
                  })}
                </p>
              )}
              <p>{quiz.explanation[locale]}</p>
              <button
                className="world-text-button"
                data-action="world-quiz-explore"
                onClick={() => go(quiz.node)}
              >
                {t("Explore the answer in 3D")}
                <ArrowRight size={16} />
              </button>
            </div>
          )}
          <div className="world-quiz-footer">
            <span>{t("The point is to understand, not to race.")}</span>
            {quizAnswer !== null && (
              <button
                className="world-primary"
                data-action="world-next-quiz"
                onClick={() => {
                  setQuizIndex((index) => index + 1);
                  setQuizAnswer(null);
                }}
              >
                {t("Next challenge")}
                <ArrowRight size={16} />
              </button>
            )}
          </div>
        </Dialog>
      )}

      {modal === "share" && (
        <Dialog
          title={t("Share this place")}
          onClose={() => setModal(null)}
          className="world-share-modal"
        >
          <Share2 size={25} />
          <h2>{t("Share this place")}</h2>
          <p>{t("Copy this address to share your place.")}</p>
          <input
            aria-label={t("Share this place")}
            value={location.href}
            readOnly
            onFocus={(event) => event.currentTarget.select()}
          />
        </Dialog>
      )}
    </div>
  );
}

function ArrowUpRightIcon() {
  return (
    <ArrowRight size={17} className="world-place-arrow" aria-hidden="true" />
  );
}

export default WorldUI;
