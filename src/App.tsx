import { useEffect, useRef, useState } from "react";
import {
  Atom,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Box,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Crosshair,
  Expand,
  FlaskConical,
  Layers3,
  Maximize2,
  Minus,
  Moon,
  Pause,
  Play,
  Plus,
  RotateCcw,
  RotateCw,
  Search,
  Share2,
  Sun,
  X,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Scene from "./Scene";
import {
  atomEntry,
  elementOf,
  isotopeSymbol,
  elements,
  entriesFor,
  initialState,
  levels,
  molecules,
  nucleusEntry,
  particles,
  sources,
} from "./data";
import type {
  BosonId,
  ElementId,
  Entry,
  Level,
  ModelState,
  MoleculeId,
} from "./data";
const icons: LucideIcon[] = [FlaskConical, Atom, Crosshair, Box, Zap];
function readInitial(): ModelState {
  const p = new URLSearchParams(location.search);
  const s = { ...initialState };
  if (levels.some((l) => l.id === p.get("level")))
    s.level = p.get("level") as Level;
  if (p.get("molecule") && Object.hasOwn(molecules, p.get("molecule")!))
    s.molecule = p.get("molecule") as MoleculeId;
  if (p.get("element") && Object.hasOwn(elements, p.get("element")!))
    s.element = p.get("element") as ElementId;
  if (p.get("boson") && ["photon", "gluon", "higgs"].includes(p.get("boson")!))
    s.boson = p.get("boson") as BosonId;
  if (p.get("nucleon") === "neutron") s.nucleon = "neutron";
  try {
    s.light = localStorage.getItem("atlas-theme") === "light";
  } catch {}
  return s;
}
function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      className="toggle-row"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
    >
      <span>{label}</span>
      <span className={"switch " + (checked ? "on" : "")}>
        <i />
      </span>
    </button>
  );
}
function IconButton({
  label,
  Icon,
  onClick,
  active = false,
}: {
  label: string;
  Icon: LucideIcon;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      className={"icon-button " + (active ? "active" : "")}
      title={label}
      aria-label={label}
      onClick={onClick}
    >
      <Icon size={17} strokeWidth={1.5} />
    </button>
  );
}
export default function App() {
  const [state, setState] = useState<ModelState>(readInitial),
    [leftOpen, setLeftOpen] = useState(false),
    [mobileDetails, setMobileDetails] = useState(false),
    [detailVisible, setDetailVisible] = useState(true),
    [modal, setModal] = useState<"search" | "about" | null>(null),
    [query, setQuery] = useState(""),
    [toast, setToast] = useState(""),
    [phase, setPhase] = useState(0),
    [ready, setReady] = useState(false),
    [fullscreen, setFullscreen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null),
    searchInput = useRef<HTMLInputElement>(null),
    toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mol = molecules[state.molecule],
    el = elements[state.element],
    levelIndex = levels.findIndex((l) => l.id === state.level),
    level = levels[levelIndex],
    entries = entriesFor(state),
    chosen = entries.find((e) => e.id === state.selected);
  function update(patch: Partial<ModelState>) {
    setState((s) => ({ ...s, ...patch }));
  }
  function go(id: Level, patch: Partial<ModelState> = {}) {
    setState((s) => ({
      ...s,
      level: id,
      selected: null,
      isolated: false,
      explode: 0,
      rotate: false,
      playing: false,
      play: s.play + 1,
      reset: s.reset + 1,
      zoom: 0,
      ...patch,
    }));
    setLeftOpen(false);
    setMobileDetails(false);
    setDetailVisible(true);
    setPhase(0);
  }
  function choose(id: string) {
    setDetailVisible(true);
    update({ selected: id, isolated: false });
    setMobileDetails(true);
    setLeftOpen(false);
  }
  function next(entry?: Entry) {
    if (entry?.id.startsWith("neutron")) go("quarks", { nucleon: "neutron" });
    else if (entry?.id.startsWith("proton"))
      go("quarks", { nucleon: "proton" });
    else if (entry?.next)
      go(entry.next, entry.element ? { element: entry.element } : {});
    else if (state.level === "molecule")
      go("atom", { element: mol.atoms[0].element });
    else if (state.level === "atom") go("nucleus");
    else if (state.level === "nucleus") go("quarks", { nucleon: "proton" });
    else if (state.level === "quarks") go("interaction");
  }
  function reset() {
    setState((s) => ({
      ...s,
      explode: 0,
      selected: null,
      isolated: false,
      rotate: false,
      reset: s.reset + 1,
      zoom: 0,
      playing: false,
      play: s.play + 1,
    }));
    setPhase(0);
    setMobileDetails(false);
  }
  function notify(message: string) {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 3200);
  }
  async function share() {
    try {
      await navigator.clipboard.writeText(location.href);
      notify("Lien de cette vue copié");
    } catch {
      notify("Le lien de cette vue est dans la barre d’adresse");
    }
  }
  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      notify("Le plein écran est indisponible sur ce navigateur");
    }
  }
  useEffect(() => {
    const onChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = state.light ? "light" : "dark";
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", state.light ? "#e9ece7" : "#101413");
    try {
      localStorage.setItem("atlas-theme", state.light ? "light" : "dark");
    } catch {}
  }, [state.light]);
  useEffect(() => {
    const p = new URLSearchParams();
    if (state.level !== "molecule") p.set("level", state.level);
    if (state.molecule !== "water") p.set("molecule", state.molecule);
    if (state.element !== "O") p.set("element", state.element);
    if (state.nucleon !== "proton") p.set("nucleon", state.nucleon);
    if (state.boson !== "photon") p.set("boson", state.boson);
    history.replaceState(
      null,
      "",
      location.pathname + (p.size ? "?" + p.toString() : ""),
    );
  }, [state.level, state.molecule, state.element, state.nucleon, state.boson]);
  useEffect(() => {
    const d = dialog.current;
    if (modal && !d?.open) {
      d?.showModal();
      if (modal === "search")
        setTimeout(() => searchInput.current?.focus(), 50);
    } else if (!modal && d?.open) d.close();
  }, [modal]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLSelectElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      if (modal) return;
      if (e.key === "/") {
        e.preventDefault();
        setQuery("");
        setModal("search");
      }
      if (e.key.toLowerCase() === "r") reset();
      if (e.key.toLowerCase() === "l")
        setState((s) => ({ ...s, labels: !s.labels }));
      if (["1", "2", "3", "4", "5"].includes(e.key))
        go(levels[Number(e.key) - 1].id);
      if (e.key === "Escape") {
        update({ selected: null, isolated: false });
        setLeftOpen(false);
        setMobileDetails(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });
  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );
  function onPhase(n: number) {
    setPhase(n);
    if (n === 4) setState((s) => ({ ...s, playing: false }));
  }
  const overview: Entry =
    state.level === "molecule"
      ? {
          id: "overview",
          name: mol.name,
          symbol: mol.formula,
          category: "STRUCTURE MOLÉCULAIRE",
          color: "#a5bfa9",
          description:
            state.molecule === "water"
              ? "Deux atomes d’hydrogène liés à un atome d’oxygène. Une structure simple, à l’origine d’une substance essentielle à la vie."
              : state.molecule === "co2"
                ? "Un atome de carbone lié à deux atomes d’oxygène. Ses deux doubles liaisons s’alignent pour former une molécule linéaire."
                : "Quatre atomes d’hydrogène entourent un carbone. Leur disposition en tétraèdre révèle toute la dimension spatiale de la chimie.",
          note: "Les sphères et les liaisons sont une représentation conventionnelle. La décomposition permet d’inspecter les constituants ; elle ne simule pas une réaction chimique.",
          facts: mol.facts,
          source: mol.source,
          next: "atom",
        }
      : state.level === "atom"
        ? { ...atomEntry(state.element), next: "nucleus" }
        : state.level === "nucleus"
          ? { ...nucleusEntry(state.element), next: "quarks" }
          : state.level === "quarks"
            ? { ...particles[state.nucleon], next: "interaction" }
            : particles[state.boson];
  const detail = chosen || overview;
  const heroSymbol =
    state.level === "molecule"
      ? mol.formula
      : state.level === "atom"
        ? state.element
        : state.level === "nucleus"
          ? isotopeSymbol(state.element)
          : state.level === "quarks"
            ? state.nucleon === "proton"
              ? "uud"
              : "udd"
            : particles[state.boson].symbol;
  const heroName =
    state.level === "molecule"
      ? mol.name
      : state.level === "atom"
        ? `Atome ${elementOf(state.element)}`
        : state.level === "nucleus"
          ? `Noyau ${elementOf(state.element)}`
          : state.level === "quarks"
            ? `Structure du ${state.nucleon}`
            : particles[state.boson].name;
  const nextLabel = chosen?.next
    ? chosen.next === "atom"
      ? "Explorer cet atome"
      : chosen.next === "nucleus"
        ? "Entrer dans le noyau"
        : "Voir les quarks"
    : state.level === "molecule"
      ? "Explorer un atome"
      : state.level === "atom"
        ? "Entrer dans le noyau"
        : state.level === "nucleus"
          ? "Explorer un proton"
          : "Découvrir les interactions";
  const searchItems = [
    ...Object.entries(molecules).map(([id, m]) => ({
      id: `m-${id}`,
      name: m.name,
      symbol: m.formula,
      type: "Molécule",
      run: () => go("molecule", { molecule: id as MoleculeId }),
    })),
    ...Object.keys(elements).map((id) => ({
      id: `a-${id}`,
      name: elements[id as ElementId].name,
      symbol: id,
      type: "Atome",
      run: () => go("atom", { element: id as ElementId }),
    })),
    ...Object.entries(particles).map(([id, p]) => ({
      id: `p-${id}`,
      name: p.name,
      symbol: p.symbol,
      type: p.category.split(" · ")[0].toLowerCase(),
      run: () => {
        if (["photon", "gluon", "higgs"].includes(id))
          go("interaction", { boson: id as BosonId });
        else if (id === "electron") go("atom", { selected: "electron-0" });
        else if (id === "proton" || id === "neutron")
          go("quarks", { nucleon: id });
        else go("quarks", { selected: id === "up" ? "up-0" : "down-2" });
      },
    })),
  ];
  const normal = (v: string) =>
    v
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase();
  const results = searchItems.filter((item) =>
    normal(item.name + " " + item.symbol + " " + item.type).includes(
      normal(query),
    ),
  );
  return (
    <main
      data-level={state.level}
      className={"studio " + (state.light ? "light" : "dark")}
    >
      <Scene
        state={state}
        onSelect={choose}
        onPhase={onPhase}
        onReady={() => setReady(true)}
      />
      <div className="vignette" />
      <header className="identity">
        <div className="eyebrow">
          <span className="status-dot" /> EXPLORER L’INVISIBLE
        </div>
        <h1>
          Matière <em>Atlas</em>
          <sup>01</sup>
        </h1>
        <div className="identity-meta">Un voyage vers l’infiniment petit</div>
      </header>
      <div className="top-actions">
        <button
          aria-label="Rechercher"
          className="search-trigger"
          onClick={() => {
            setQuery("");
            setModal("search");
          }}
        >
          <Search size={16} />
          <span>Rechercher</span>
          <kbd>/</kbd>
        </button>
        <i />
        <IconButton
          label={state.light ? "Passer en mode sombre" : "Passer en mode clair"}
          Icon={state.light ? Moon : Sun}
          onClick={() => update({ light: !state.light })}
        />
        <IconButton label="Partager cette vue" Icon={Share2} onClick={share} />
        <IconButton
          label="À propos de l’atlas"
          Icon={CircleHelp}
          onClick={() => setModal("about")}
        />
      </div>
      <aside
        className={"navigation-panel glass " + (leftOpen ? "mobile-open" : "")}
        aria-label="Navigation dans la matière"
      >
        <div className="panel-heading">
          <span>Échelles de la matière</span>
          <span className="small-number">05</span>
          <button
            className="mobile-only icon-button"
            aria-label="Fermer les échelles"
            onClick={() => setLeftOpen(false)}
          >
            <X size={16} />
          </button>
        </div>
        <div className="level-list">
          {levels.map((l, i) => {
            const Icon = icons[i];
            return (
              <button
                key={l.id}
                className={
                  "level-row " + (state.level === l.id ? "selected" : "")
                }
                onClick={() => go(l.id)}
                aria-current={state.level === l.id ? "step" : undefined}
              >
                <span className="level-index">0{i + 1}</span>
                <Icon size={17} strokeWidth={1.4} />
                <span className="level-copy">
                  <strong>{l.name}</strong>
                  <small>{l.subtitle}</small>
                </span>
                <ChevronRight size={13} />
              </button>
            );
          })}
        </div>
        <div className="navigation-foot">
          <span className="tiny-dot" />
          <span>Du visible à l’élémentaire</span>
        </div>
      </aside>
      <aside
        className={"contents-panel glass " + (leftOpen ? "mobile-open" : "")}
        aria-label="Constituants et affichage"
      >
        <div className="panel-heading">
          <span>
            {state.level === "interaction"
              ? "Bosons à explorer"
              : "Constituants"}
          </span>
          <span className="small-number">
            {state.level === "interaction"
              ? "03"
              : String(entries.length).padStart(2, "0")}
          </span>
        </div>
        <div className="constituent-list">
          {state.level === "interaction"
            ? (["photon", "gluon", "higgs"] as BosonId[]).map((b) => (
                <button
                  key={b}
                  className={
                    "constituent " + (state.boson === b ? "selected" : "")
                  }
                  onClick={() => go("interaction", { boson: b })}
                >
                  <span
                    className="particle-dot"
                    style={{ background: particles[b].color }}
                  />
                  <span>{particles[b].name}</span>
                  <span className="constituent-symbol">
                    {particles[b].symbol}
                  </span>
                </button>
              ))
            : entries.map((e) => (
                <button
                  key={e.id}
                  className={
                    "constituent " + (chosen?.id === e.id ? "selected" : "")
                  }
                  onClick={() => choose(e.id)}
                >
                  <span
                    className="particle-dot"
                    style={{ background: e.color }}
                  />
                  <span>{e.name}</span>
                  <span className="constituent-symbol">{e.symbol}</span>
                </button>
              ))}
        </div>
        <div className="display-options">
          <Toggle
            label="Annotations"
            checked={state.labels}
            onChange={() => update({ labels: !state.labels })}
          />
          {state.level !== "nucleus" && (
            <Toggle
              label={
                state.level === "molecule"
                  ? "Liaisons"
                  : state.level === "atom" ||
                      (state.boson === "photon" &&
                        state.level === "interaction")
                    ? "Nuage électronique"
                    : state.level === "interaction" && state.boson === "higgs"
                      ? "Champ de Higgs"
                      : "Nuage & échanges"
              }
              checked={state.cloud}
              onChange={() => update({ cloud: !state.cloud })}
            />
          )}
        </div>
      </aside>
      <div className="subject-selector">
        <div className="section-kicker">
          0{levelIndex + 1} <span>/</span> {level.name.toUpperCase()}
        </div>
        <label className="subject-select">
          <span className="sr-only">
            {state.level === "molecule"
              ? "Choisir une molécule"
              : state.level === "quarks"
                ? "Choisir un nucléon"
                : state.level === "interaction"
                  ? "Choisir un boson"
                  : "Choisir un élément"}
          </span>
          <select
            value={
              state.level === "molecule"
                ? state.molecule
                : state.level === "quarks"
                  ? state.nucleon
                  : state.level === "interaction"
                    ? state.boson
                    : state.element
            }
            onChange={(e) => {
              const v = e.target.value;
              if (state.level === "molecule")
                go("molecule", { molecule: v as MoleculeId });
              else if (state.level === "quarks")
                go("quarks", { nucleon: v as "proton" | "neutron" });
              else if (state.level === "interaction")
                go("interaction", { boson: v as BosonId });
              else go(state.level, { element: v as ElementId });
            }}
          >
            {state.level === "molecule" ? (
              Object.entries(molecules).map(([id, m]) => (
                <option value={id} key={id}>
                  {m.name} · {m.formula}
                </option>
              ))
            ) : state.level === "quarks" ? (
              <>
                <option value="proton">Proton · uud</option>
                <option value="neutron">Neutron · udd</option>
              </>
            ) : state.level === "interaction" ? (
              (["photon", "gluon", "higgs"] as BosonId[]).map((b) => (
                <option value={b} key={b}>
                  {particles[b].name}
                </option>
              ))
            ) : (
              Object.entries(elements).map(([id, e]) => (
                <option value={id} key={id}>
                  {e.name} · {id}-{e.z + e.n}
                </option>
              ))
            )}
          </select>
          <ChevronDown size={13} />
        </label>
      </div>
      <nav className="view-controls glass" aria-label="Commandes de la vue">
        <IconButton
          label="Zoomer"
          Icon={Plus}
          onClick={() => update({ zoom: state.zoom + 1 })}
        />
        <IconButton
          label="Dézoomer"
          Icon={Minus}
          onClick={() => update({ zoom: state.zoom - 1 })}
        />
        <i />
        <IconButton
          label={state.rotate ? "Arrêter la rotation" : "Rotation automatique"}
          Icon={state.rotate ? Pause : RotateCw}
          active={state.rotate}
          onClick={() => update({ rotate: !state.rotate })}
        />
        <IconButton
          label="Recentrer la vue"
          Icon={Crosshair}
          onClick={() => update({ reset: state.reset + 1, zoom: 0 })}
        />
        {document.fullscreenEnabled && (
          <>
            <i />
            <IconButton
              label={fullscreen ? "Quitter le plein écran" : "Plein écran"}
              Icon={Maximize2}
              onClick={toggleFullscreen}
            />
          </>
        )}
      </nav>
      <aside
        className={
          "detail-panel glass " +
          (mobileDetails ? "mobile-open" : "") +
          (detailVisible ? "" : " is-hidden")
        }
        aria-label="Détails de la sélection"
      >
        <div className="detail-top">
          <span className="detail-kicker">
            {chosen ? "SÉLECTION" : "À LA LOUPE"}
          </span>
          <button
            className="icon-button detail-close"
            aria-label="Fermer les détails"
            onClick={() => {
              update({ selected: null, isolated: false });
              setMobileDetails(false);
              setDetailVisible(false);
            }}
          >
            <X size={15} />
          </button>
        </div>
        <div
          className="element-tile"
          style={{ "--particle": detail.color } as React.CSSProperties}
        >
          <span className="tile-number">
            {chosen?.element
              ? String(elements[chosen.element].z).padStart(2, "0")
              : state.level === "molecule"
                ? String(mol.atoms.length).padStart(2, "0")
                : state.level === "atom"
                  ? String(el.z).padStart(2, "0")
                  : ""}
          </span>
          <span>{detail.symbol}</span>
          <small>
            {state.level === "molecule" && !chosen
              ? "MOLÉCULE"
              : detail.category.split(" · ")[0]}
          </small>
        </div>
        <div className="detail-title-row">
          <h2>{detail.name}</h2>
          <span className="detail-color" style={{ background: detail.color }} />
        </div>
        <p className="detail-description">{detail.description}</p>
        <dl className="facts">
          {detail.facts.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
        <div className="detail-actions">
          {chosen && state.level !== "interaction" && (
            <button
              className={"isolate-button " + (state.isolated ? "active" : "")}
              onClick={() => update({ isolated: !state.isolated })}
            >
              {state.isolated ? <Layers3 size={15} /> : <Crosshair size={15} />}{" "}
              {state.isolated
                ? "Revenir à l’ensemble"
                : "Isoler ce constituant"}
            </button>
          )}
          {(chosen ? !!chosen.next : state.level !== "interaction") && (
            <button className="primary-action" onClick={() => next(chosen)}>
              <span>{nextLabel}</span>
              <ArrowRight size={16} />
            </button>
          )}
          {state.level === "interaction" && state.boson === "photon" && (
            <button
              className="primary-action"
              onClick={() => {
                if (phase === 4)
                  update({ play: state.play + 1, playing: true });
                else update({ playing: !state.playing });
              }}
            >
              {state.playing ? <Pause size={15} /> : <Play size={15} />}
              <span>
                {state.playing
                  ? "Mettre en pause"
                  : phase === 4
                    ? "Rejouer la transition"
                    : "Jouer la transition"}
              </span>
            </button>
          )}
        </div>
        <a
          href={detail.source}
          target="_blank"
          rel="noreferrer"
          className="source-link"
        >
          Source scientifique <ArrowUpRight size={12} />
        </a>
      </aside>
      <div className="scene-caption">
        <span className="caption-rule" />
        <span>
          {state.isolated
            ? "CONSTITUANT ISOLÉ"
            : state.explode > 95
              ? "VUE ÉCLATÉE"
              : state.explode > 5
                ? "DÉCOMPOSITION"
                : state.level === "interaction"
                  ? "OBSERVER LES INTERACTIONS"
                  : "LA MATIÈRE, RÉVÉLÉE"}
        </span>
        <span className="caption-rule" />
      </div>
      <div className="subject-caption">
        <strong>{heroSymbol}</strong>
        <span>{heroName}</span>
        <button
          aria-label="Afficher les détails"
          title="Afficher les détails"
          onClick={() => {
            setDetailVisible(true);
            setMobileDetails(true);
            setLeftOpen(false);
          }}
        >
          <CircleHelp size={15} />
        </button>
      </div>
      {state.level === "interaction" && state.boson === "photon" && (
        <div className="photon-status" role="status">
          <span className={phase === 1 || phase === 3 ? "live" : ""} />
          {
            [
              "Photon incident",
              "Absorption du photon",
              "Atome excité · n = 2",
              "Émission d’un photon",
              "État fondamental · n = 1",
            ][phase]
          }
        </div>
      )}
      <div className="bottom-dock glass">
        <button
          className="dock-mode mobile-only"
          onClick={() => {
            setLeftOpen(!leftOpen);
            setMobileDetails(false);
          }}
          aria-label="Ouvrir les échelles"
        >
          <Layers3 size={19} />
          <span>Explorer</span>
        </button>
        {state.level !== "interaction" ? (
          <>
            <button
              className={
                "dock-mode desktop-only " +
                (state.explode === 0 ? "active" : "")
              }
              onClick={reset}
              title="Rassembler"
            >
              <Box size={20} strokeWidth={1.4} />
              <span>Assemblé</span>
            </button>
            <div className="explode-control">
              <div className="explode-label">
                <label htmlFor="explode">Décomposer la matière</label>
                <output htmlFor="explode">
                  {state.explode}
                  <span>%</span>
                </output>
              </div>
              <input
                id="explode"
                type="range"
                min="0"
                max="100"
                step="1"
                value={state.explode}
                onChange={(e) =>
                  update({
                    explode: Number(e.target.value),
                    isolated: false,
                    rotate: false,
                  })
                }
                style={
                  { "--progress": state.explode + "%" } as React.CSSProperties
                }
              />
              <div className="slider-endpoints">
                <span>Assemblé</span>
                <span>Constituants séparés</span>
              </div>
            </div>
            <button
              className={"dock-mode " + (state.explode === 100 ? "active" : "")}
              aria-label="Séparer tous les constituants"
              onClick={() =>
                update({ explode: 100, isolated: false, rotate: false })
              }
            >
              <Expand size={19} strokeWidth={1.4} />
              <span>Éclaté</span>
            </button>
          </>
        ) : (
          <div className="interaction-dock">
            <Zap size={20} />
            <div>
              <strong>
                {state.boson === "photon"
                  ? "Un quantum de lumière"
                  : state.boson === "gluon"
                    ? "L’interaction forte"
                    : "Le champ de Higgs"}
              </strong>
              <span>
                {state.boson === "photon"
                  ? "Absorption → excitation → émission"
                  : state.boson === "gluon"
                    ? "Des échanges au cœur du proton"
                    : "Une excitation du champ, représentée en 3D"}
              </span>
            </div>
            {state.boson === "photon" && (
              <button
                className="play-button"
                aria-label={
                  state.playing
                    ? "Mettre la transition en pause"
                    : "Jouer la transition photonique"
                }
                onClick={() => {
                  if (phase === 4)
                    update({ play: state.play + 1, playing: true });
                  else update({ playing: !state.playing });
                }}
              >
                {state.playing ? <Pause size={20} /> : <Play size={20} />}
              </button>
            )}
          </div>
        )}
        <span className="dock-divider" />
        <button
          className="dock-mode"
          onClick={reset}
          aria-label="Réinitialiser"
        >
          <RotateCcw size={17} />
          <span>Réinitialiser</span>
        </button>
      </div>
      <div className="scale-indicator">
        <div className="scale-bar">
          <i />
          <i />
          <i />
        </div>
        <strong>{level.power}</strong>
        <span>{level.scale}</span>
      </div>
      <button
        className="next-level desktop-only"
        onClick={() =>
          state.level === "interaction" ? go("molecule") : next()
        }
      >
        <span>
          {state.level === "interaction"
            ? "Revenir à la molécule"
            : "Poursuivre l’exploration"}
        </span>
        {state.level === "interaction" ? (
          <ArrowLeft size={14} />
        ) : (
          <ArrowDown size={14} />
        )}
      </button>
      <footer className="studio-footer">
        <span>
          Glisser pour tourner <b>·</b> Défiler pour zoomer <b>·</b> Cliquer
          pour inspecter
        </span>
        <button onClick={() => setModal("about")}>
          <span className="tiny-dot" />{" "}
          {state.level === "atom"
            ? "Nuage illustratif · Noyau agrandi"
            : state.level === "quarks"
              ? "Schéma de composition · Quarks confinés"
              : "Modèle pédagogique · Échelles adaptées"}{" "}
          <ArrowUpRight size={11} />
        </button>
      </footer>
      {!ready && (
        <div className="loading glass">
          <Atom size={28} />
          <span>Préparation de la matière…</span>
        </div>
      )}
      {toast && (
        <div className="toast glass" role="status">
          <Check size={15} />
          {toast}
        </div>
      )}
      <dialog
        ref={dialog}
        className={
          "atlas-dialog " + (modal === "search" ? "search-dialog" : "")
        }
        onCancel={() => setModal(null)}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            const r = e.currentTarget.getBoundingClientRect();
            if (
              e.clientX < r.left ||
              e.clientX > r.right ||
              e.clientY < r.top ||
              e.clientY > r.bottom
            )
              setModal(null);
          }
        }}
        aria-labelledby="dialog-title"
      >
        <div className="dialog-head">
          <span className="eyebrow">MATIÈRE ATLAS</span>
          <IconButton
            label="Fermer la fenêtre"
            Icon={X}
            onClick={() => setModal(null)}
          />
        </div>
        {modal === "search" ? (
          <>
            <h2 id="dialog-title">Que voulez-vous explorer ?</h2>
            <div className="search-input">
              <Search size={19} />
              <input
                ref={searchInput}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Molécule, atome, particule…"
                aria-label="Rechercher dans l’atlas"
              />
            </div>
            <div className="search-results">
              {results.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    item.run();
                    setModal(null);
                  }}
                >
                  <span className="search-symbol">{item.symbol}</span>
                  <span>
                    <strong>{item.name}</strong>
                    <small>{item.type}</small>
                  </span>
                  <ArrowUpRight size={15} />
                </button>
              ))}
              {!results.length && (
                <p className="empty-result">
                  Aucun résultat. Essayez « oxygène », « quark » ou « photon ».
                </p>
              )}
            </div>
            <div className="search-foot">
              <span>{results.length} résultats</span>
              <span>Échap pour fermer</span>
            </div>
          </>
        ) : (
          <>
            <h2 id="dialog-title">Un monde dans chaque détail.</h2>
            <p className="about-intro">
              De la molécule familière aux particules élémentaires : un atlas
              pour regarder la matière autrement.
            </p>
            <div className="about-section">
              <h3>Ce que vous regardez</h3>
              <p>{detail.note}</p>
              <p>
                Les tailles, les distances, les couleurs et les durées sont
                adaptées pour l’exploration. Les nuages sont des illustrations
                de la distribution électronique, pas des calculs d’orbitales.
                Les électrons visibles servent de repères de sélection, sans
                trajectoire physique.
              </p>
              <p>
                Le photon et le gluon sont déjà des bosons. Les interactions
                complètent le parcours de composition : elles ne sont pas une
                nouvelle couche à l’intérieur de l’électron.
              </p>
            </div>
            <div className="about-section">
              <h3>Prendre l’atlas en main</h3>
              <p>
                Glissez pour tourner, pincez ou défilez pour zoomer. Cliquez sur
                un constituant, puis isolez-le ou entrez à l’intérieur. Le
                curseur sépare les éléments de chaque vue.
              </p>
              <div className="shortcuts">
                <span>
                  <kbd>1–5</kbd> Échelles
                </span>
                <span>
                  <kbd>R</kbd> Réinitialiser
                </span>
                <span>
                  <kbd>L</kbd> Annotations
                </span>
                <span>
                  <kbd>/</kbd> Rechercher
                </span>
              </div>
            </div>
            <div className="about-section">
              <h3>Sources & inspirations</h3>
              <a href={sources.cern} target="_blank" rel="noreferrer">
                CERN · Particules et interactions <ArrowUpRight size={13} />
              </a>
              <a href={sources.atom} target="_blank" rel="noreferrer">
                OpenStax · Structure atomique <ArrowUpRight size={13} />
              </a>
              <a href={sources.water} target="_blank" rel="noreferrer">
                PubChem · Données moléculaires <ArrowUpRight size={13} />
              </a>
              <p>
                Interface et principe d’exploration inspirés de{" "}
                <a
                  href="https://github.com/ashemag/human-atlas"
                  target="_blank"
                  rel="noreferrer"
                >
                  Human Atlas
                </a>{" "}
                et{" "}
                <a
                  href="https://github.com/ashemag/model-x-studio"
                  target="_blank"
                  rel="noreferrer"
                >
                  Model X Studio
                </a>
                , par ashemag. Adaptation de principes de mise en page et de
                caméra de Human Atlas, sous{" "}
                <a
                  href="/licenses/human-atlas.txt"
                  target="_blank"
                  rel="noreferrer"
                >
                  licence MIT
                </a>
                . Modèles de matière créés pour cet atlas.
              </p>
            </div>
          </>
        )}
      </dialog>
    </main>
  );
}
