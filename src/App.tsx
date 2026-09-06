import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Atom,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Crosshair,
  Layers3,
  Maximize2,
  Minus,
  Moon,
  Pause,
  Plus,
  RotateCw,
  Search,
  Share2,
  Sparkles,
  Sun,
  X,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Scene from "./Scene";
import MoleculePicker from "./MoleculePicker";
import Interactions, { contextualInteraction, lessons } from "./Interactions";
import type { Interaction } from "./Interactions";
import { environments, isScale } from "./scales";
import { molecules, particles, sources } from "./data";
import type { MoleculeId } from "./data";
import {
  ancestors,
  createGraph,
  defaultState,
  expansion,
  kindNames,
} from "./continuum";
import type { ExplorerState, MatterNode, SceneDetail } from "./continuum";
function initial(): ExplorerState {
  const p = new URLSearchParams(location.search),
    s: ExplorerState = { ...defaultState };
  if (p.get("molecule") && Object.hasOwn(molecules, p.get("molecule")!))
    s.molecule = p.get("molecule") as MoleculeId;
  const g = createGraph(s.molecule);
  if (g.nodes.has(p.get("node") || "")) s.selected = p.get("node");
  if (g.nodes.has(p.get("focus") || "")) s.focus = p.get("focus");
  try {
    s.light = localStorage.getItem("atlas-theme") === "light";
  } catch {}
  return s;
}
function IconButton({
  label,
  icon: Icon,
  onClick,
  active = false,
}: {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      className={"icon-button " + (active ? "active" : "")}
      onClick={onClick}
      title={label}
      aria-label={label}
    >
      <Icon size={17} strokeWidth={1.5} />
    </button>
  );
}
function Switch({
  label,
  value,
  toggle,
}: {
  label: string;
  value: boolean;
  toggle: () => void;
}) {
  return (
    <button
      className="toggle"
      role="switch"
      aria-checked={value}
      onClick={toggle}
    >
      <span>{label}</span>
      <span className={"switch " + (value ? "on" : "")}>
        <i />
      </span>
    </button>
  );
}
export default function App() {
  const [state, setState] = useState<ExplorerState>(initial),
    [panel, setPanel] = useState<"tree" | "details" | null>(null),
    [inspector, setInspector] = useState(true),
    [modal, setModal] = useState<"about" | "search" | "molecules" | null>(null),
    [query, setQuery] = useState(""),
    [message, setMessage] = useState(""),
    [eventText, setEventText] = useState(""),
    [detail, setDetail] = useState<SceneDetail | null>(null);
  const graph = useMemo(() => createGraph(state.molecule), [state.molecule]),
    mol = molecules[state.molecule],
    sceneDetail = detail?.molecule === state.molecule ? detail : null,
    navigating =
      !sceneDetail ||
      sceneDetail.navigation !== state.navigation ||
      sceneDetail.transitioning,
    viewpoint = graph.nodes.get(
      navigating ? state.focus || graph.root : sceneDetail.viewpoint,
    )!,
    node = viewpoint,
    path = ancestors(graph, node.id),
    nextId =
      sceneDetail?.navigation === state.navigation &&
      sceneDetail.viewpoint === node.id
        ? sceneDetail.next
        : state.destinations[node.id] || node.children[0] || null,
    next = nextId ? graph.nodes.get(nextId)! : null,
    parent = node.parent ? graph.nodes.get(node.parent)! : null;
  const dialog = useRef<HTMLDialogElement>(null),
    searchRef = useRef<HTMLInputElement>(null),
    noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const update = (patch: Partial<ExplorerState>) =>
    setState((s) => ({ ...s, ...patch }));
  function destinationState(
    s: ExplorerState,
    id: string,
    from = s.focus || graph.root,
  ): ExplorerState {
    const destinations = { ...s.destinations };
    for (const n of ancestors(graph, from))
      if (n.parent) destinations[n.parent] = n.id;
    for (const n of ancestors(graph, id))
      if (n.parent) destinations[n.parent] = n.id;
    return {
      ...s,
      focus: id === graph.root ? null : id,
      selected: id === graph.root ? null : id,
      destinations,
      navigation: s.navigation + 1,
      interaction: "none",
      phase: 0,
      higgs: false,
    };
  }
  function step(direction: "in" | "out") {
    setInspector(true);
    setPanel(null);
    setState((s) => {
      // Resolve each click against the latest requested destination, including
      // clicks React batches before the renderer receives another frame.
      const currentDetail =
        sceneDetail?.molecule === s.molecule ? sceneDetail : null;
      const pending =
        !currentDetail ||
        currentDetail.navigation !== s.navigation ||
        currentDetail.transitioning;
      const currentNode = graph.nodes.get(
        pending ? s.focus || graph.root : currentDetail.viewpoint,
      )!;
      const child =
        currentDetail?.navigation === s.navigation &&
        currentDetail.viewpoint === currentNode.id
          ? currentDetail.next
          : s.destinations[currentNode.id] || currentNode.children[0];
      const target = direction === "out" ? currentNode.parent : child;
      return target ? destinationState(s, target, currentNode.id) : s;
    });
  }
  function approach(id: string) {
    if (!graph.nodes.has(id)) return;
    setInspector(true);
    setPanel(null);
    setState((s) => destinationState(s, id));
  }
  const inspect = approach;
  function overview() {
    approach(graph.root);
  }
  function reset() {
    setEventText("");
    setState((s) => ({
      ...defaultState,
      molecule: s.molecule,
      light: s.light,
      reset: s.reset + 1,
    }));
    setPanel(null);
  }
  function changeMolecule(id: MoleculeId) {
    setEventText("");
    setState((s) => ({
      ...defaultState,
      molecule: id,
      light: s.light,
      reset: s.reset + 1,
    }));
    setPanel(null);
  }
  function startInteraction(type: Interaction) {
    let target = node.id;
    if (type === "cohesion" || type === "motion") target = "neighborhood";
    if (type === "bonds") target = "molecule";
    if (type === "photon")
      target =
        node.atom >= 0
          ? graph.atoms[node.atom]
          : graph.atoms.find((id) => graph.nodes.get(id)!.element === "H") ||
            graph.atoms[0];
    if (type === "higgs")
      target =
        node.kind === "electron"
          ? node.id
          : `${graph.atoms[Math.max(0, node.atom)]}/electron-0`;
    if (type === "strong") {
      if (node.kind === "nucleus") target = node.children[0];
      else if (node.kind === "up" || node.kind === "down")
        target = node.parent!;
    }
    setInspector(false);
    setPanel(null);
    setEventText("");
    setState((s) => ({
      ...destinationState(s, target),
      interaction: type,
      phase: 0,
      interactionPaused: false,
      interactionReplay: s.interactionReplay + 1,
      higgs: type === "higgs",
    }));
  }
  function notify(text: string) {
    setMessage(text);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setMessage(""), 3000);
  }
  async function share() {
    try {
      await navigator.clipboard.writeText(location.href);
      notify("Exploration link copied");
    } catch {
      notify("This exploration is saved in the page address");
    }
  }
  async function fullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      notify("Fullscreen is unavailable in this browser");
    }
  }
  useEffect(() => {
    document.documentElement.dataset.theme = state.light ? "light" : "dark";
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", state.light ? "#edf0f5" : "#111318");
    try {
      localStorage.setItem("atlas-theme", state.light ? "light" : "dark");
    } catch {}
  }, [state.light]);
  useEffect(() => {
    const p = new URLSearchParams();
    if (state.molecule !== "water") p.set("molecule", state.molecule);
    if (state.selected) p.set("node", state.selected);
    if (state.focus) p.set("focus", state.focus);
    history.replaceState(
      null,
      "",
      location.pathname + (p.size ? "?" + p.toString() : ""),
    );
  }, [state.molecule, state.selected, state.focus]);
  useEffect(() => {
    if (modal) {
      dialog.current?.showModal();
      if (modal === "search") setTimeout(() => searchRef.current?.focus(), 50);
    } else dialog.current?.close();
  }, [modal]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (
        modal ||
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLSelectElement
      )
        return;
      if (e.key === "/") {
        e.preventDefault();
        setQuery("");
        setModal("search");
      }
      if (e.key.toLowerCase() === "r") reset();
      if (e.key.toLowerCase() === "l") update({ labels: !state.labels });
      if (e.key === "Escape") {
        if (state.interaction !== "none") {
          update({ interaction: "none", phase: 0, higgs: false });
          setInspector(true);
          return;
        }
        overview();
        setPanel(null);
      }
      if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        step("in");
      }
      if (e.key === "-") {
        e.preventDefault();
        step("out");
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });
  useEffect(
    () => () => {
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    },
    [],
  );
  const visibleCount = sceneDetail?.count ?? graph.atoms.length;
  const contextInteraction = contextualInteraction(node, state.molecule);
  function row(n: MatterNode, depth = 0): React.ReactNode {
    const expanded =
      isScale(n.id) ||
      n.kind === "molecule" ||
      expansion(n, state) > 0.25 ||
      sceneDetail?.open.includes(n.id);
    return (
      <div key={n.id} className="tree-branch">
        <div
          className={"tree-row " + (node.id === n.id ? "selected" : "")}
          style={{ "--indent": Math.min(depth, 4) } as React.CSSProperties}
          data-tree-node={n.id}
        >
          <button
            className={"tree-caret " + (expanded ? "expanded" : "")}
            onClick={() => approach(n.id)}
            aria-label={`Explore ${n.entry.name}`}
            disabled={!n.children.length}
          >
            {n.children.length ? <ChevronRight size={12} /> : <span />}
          </button>
          <button className="tree-name" onClick={() => inspect(n.id)}>
            <span
              className="particle-dot"
              style={{ background: n.entry.color }}
            />
            <span>{n.entry.name}</span>
            <small>{n.entry.symbol}</small>
          </button>
        </div>
        {expanded &&
          n.children.map((id) => row(graph.nodes.get(id)!, depth + 1))}
      </div>
    );
  }
  const normalized = (s: string) =>
    s
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase();
  const results = [...graph.nodes.values()]
    .filter((n) =>
      normalized(
        n.entry.name +
          " " +
          n.entry.symbol +
          " " +
          ancestors(graph, n.id)
            .map((a) => a.entry.name)
            .join(" "),
      ).includes(normalized(query)),
    )
    .slice(0, 35);
  return (
    <main
      className={
        "studio " +
        (state.light ? "light" : "dark") +
        (state.interaction !== "none" ? " has-lesson" : "")
      }
    >
      <Scene
        state={state}
        graph={graph}
        onPick={inspect}
        onFocus={approach}
        onAdvance={() => step("in")}
        onEvent={setEventText}
        onDetail={setDetail}
      />
      <div className="vignette" />
      <header className="identity">
        <div className="eyebrow">
          <span /> EXPLORE MATTER
        </div>
        <h1>
          Matter <em>Atlas</em>
          <sup>02</sup>
        </h1>
        <p>From the visible world to the inside of atoms.</p>
      </header>
      <nav className="top-actions" aria-label="Atlas tools">
        <button
          className="search-trigger"
          aria-label="Search"
          onClick={() => {
            setQuery("");
            setModal("search");
          }}
        >
          <Search size={15} />
          <span>Search</span>
          <kbd>/</kbd>
        </button>
        <IconButton
          label={state.light ? "Dark mode" : "Light mode"}
          icon={state.light ? Moon : Sun}
          onClick={() => update({ light: !state.light })}
        />
        <IconButton
          label="Share this exploration"
          icon={Share2}
          onClick={share}
        />
        <IconButton
          label="About"
          icon={CircleHelp}
          onClick={() => setModal("about")}
        />
      </nav>
      <div className="subject-selector">
        <button
          className="molecule-trigger"
          aria-label="Choose a molecule"
          aria-haspopup="dialog"
          onClick={() => setModal("molecules")}
        >
          <span>{environments[state.molecule].name}</span>
          <small>{mol.formula}</small>
          <ChevronDown size={13} />
        </button>
        <div className="breadcrumb" aria-label="Path through matter">
          {path.map((n, i) => (
            <span key={n.id}>
              {i > 0 && <ChevronRight size={10} />}
              <button onClick={() => approach(n.id)} title={n.entry.name}>
                {isScale(n.id)
                  ? n.id === "sample"
                    ? "Object"
                    : n.id === "portion"
                      ? "Volume"
                      : "Neighborhood"
                  : n.kind === "molecule"
                    ? mol.formula
                    : n.kind === "atom"
                      ? n.entry.name
                      : n.kind === "nucleus"
                        ? "Nucleus"
                        : n.entry.name}
              </button>
            </span>
          ))}
        </div>
      </div>
      <nav
        className="zoom-navigation glass"
        aria-label="Navigate through matter"
      >
        <button
          data-direction="out"
          data-target={parent?.id || ""}
          disabled={!parent}
          onClick={() => step("out")}
          aria-label={
            parent ? `Zoom out to ${parent.entry.name}` : "Zoom out · Overview"
          }
        >
          <Minus size={18} />
          <span>
            <small>ZOOM OUT</small>
            <strong>{parent?.entry.name || "Overview"}</strong>
          </span>
        </button>
        <i />
        <button
          data-direction="in"
          data-target={next?.id || ""}
          disabled={!next}
          onClick={() => step("in")}
          aria-label={
            next
              ? `Zoom in to ${next.entry.name}`
              : `Zoom in · ${node.entry.name}, elementary particle`
          }
        >
          <span>
            <small>{next ? "ZOOM IN" : "ELEMENTARY PARTICLE"}</small>
            <strong>{next?.entry.name || node.entry.name}</strong>
          </span>
          <Plus size={18} />
        </button>
      </nav>
      <aside
        className={
          "tree-panel glass " + (panel === "tree" ? "mobile-open" : "")
        }
        aria-label="Nested composition"
      >
        <div className="panel-heading">
          <span>From the visible to the subatomic</span>
          <button
            className="mobile-only icon-button"
            aria-label="Close composition"
            onClick={() => setPanel(null)}
          >
            <X size={15} />
          </button>
        </div>
        <p className="panel-hint">
          Follow a volume, a molecule, then its building blocks.
        </p>
        <div className="tree-scroll">{row(graph.nodes.get(graph.root)!)}</div>
        <div className="composition-summary">
          <span className="composition-caption">
            In one molecule of {mol.formula}
          </span>
          <span>
            <b>{graph.totals.electrons}</b> electrons
          </span>
          <span>
            <b>{graph.totals.nucleons}</b> nucleons
          </span>
          <span>
            <b>{graph.totals.quarks}</b> valence quarks
          </span>
        </div>
        <div className="display-options">
          <Switch
            label="Annotations"
            value={state.labels}
            toggle={() => update({ labels: !state.labels })}
          />
          <Switch
            label="Shells & clouds"
            value={state.cloud}
            toggle={() => update({ cloud: !state.cloud })}
          />
        </div>
        <div className="tree-foot">
          <span className="tiny-dot" />
          {isScale(node.id)
            ? "Reference volume · illustrative molecules"
            : `${visibleCount} constituents shown · Adaptive detail`}
        </div>
      </aside>
      <div className="view-controls glass">
        <IconButton
          label={state.rotate ? "Stop rotation" : "Auto-rotate"}
          icon={state.rotate ? Pause : RotateCw}
          active={state.rotate}
          onClick={() => update({ rotate: !state.rotate })}
        />
        <IconButton
          label="Return to the whole object"
          icon={Crosshair}
          onClick={overview}
        />
        {document.fullscreenEnabled && (
          <IconButton
            label="Fullscreen"
            icon={Maximize2}
            onClick={fullscreen}
          />
        )}
      </div>
      <aside
        className={
          "detail-panel glass " +
          (panel === "details" ? "mobile-open" : "") +
          (!inspector ? " dismissed" : "")
        }
        aria-label="Selected constituent"
      >
        <div className="detail-top">
          <span className="eyebrow">
            {node.kind === "molecule"
              ? "OVERVIEW"
              : kindNames[node.kind].toUpperCase()}
          </span>
          <IconButton
            label="Close details"
            icon={X}
            onClick={() => {
              setInspector(false);
              setPanel(null);
            }}
          />
        </div>
        <div
          className="symbol-tile"
          style={{ "--particle": node.entry.color } as React.CSSProperties}
        >
          {node.entry.symbol}
        </div>
        <h2>{node.entry.name}</h2>
        {node.parent && (
          <button className="belongs-to" onClick={() => approach(node.parent!)}>
            <ArrowLeft size={11} />
            <span>
              Inside {graph.nodes.get(node.parent)!.entry.name.toLowerCase()}
            </span>
          </button>
        )}
        <p className="description">{node.entry.description}</p>
        {node.children.length > 0 && (
          <div className="contains">
            <Layers3 size={14} />
            <span>
              {isScale(node.id) ? (
                <>
                  Zoom into <strong>{next?.entry.name}</strong>
                </>
              ) : (
                <>
                  Contains <strong>{node.children.length}</strong>{" "}
                  {node.kind === "molecule"
                    ? "atoms"
                    : node.kind === "atom"
                      ? "constituents"
                      : node.kind === "nucleus"
                        ? node.children.length === 1
                          ? "nucleon"
                          : "nucleons"
                        : "valence quarks"}
                </>
              )}
            </span>
          </div>
        )}
        <dl className="facts">
          {node.entry.facts.map(([name, value]) => (
            <div key={name}>
              <dt>{name}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        <div className="detail-actions">
          {next && (
            <button className="primary-action" onClick={() => step("in")}>
              <Plus size={15} />
              <span>Explore {next.entry.name}</span>
              <ChevronRight size={13} />
            </button>
          )}
          {parent && (
            <button className="secondary-action" onClick={() => step("out")}>
              <ArrowLeft size={14} />
              <span>Return to {parent.entry.name}</span>
            </button>
          )}
        </div>
        <a
          className="source-link"
          href={node.entry.source}
          target="_blank"
          rel="noreferrer"
        >
          Scientific source <ArrowUpRight size={11} />
        </a>
      </aside>
      <div className="interaction-controls glass">
        <button
          className="context-interaction"
          onClick={() => startInteraction(contextInteraction)}
          aria-label={lessons[contextInteraction].question}
        >
          <Zap size={15} />
          <span>{lessons[contextInteraction].question}</span>
          <CircleHelp size={14} />
        </button>
        <button
          onClick={() => startInteraction("photon")}
          aria-label="Understand the photon"
        >
          <span>Light</span>
        </button>
        <button
          onClick={() => startInteraction("higgs")}
          aria-label="Understand the Higgs field"
        >
          <Sparkles size={14} />
          <span>Higgs</span>
        </button>
      </div>
      {state.interaction !== "none" && (
        <Interactions
          type={state.interaction}
          phase={state.phase}
          onPhase={(phase) => update({ phase })}
          paused={state.interactionPaused}
          onPause={() =>
            update({ interactionPaused: !state.interactionPaused })
          }
          onReplay={() =>
            setState((s) => ({
              ...s,
              interactionPaused: false,
              interactionReplay: s.interactionReplay + 1,
            }))
          }
          onClose={() => {
            update({ interaction: "none", phase: 0, higgs: false });
            setInspector(true);
          }}
        />
      )}
      {eventText && (
        <div className="event-status" role="status">
          <span />
          {eventText}
          <button aria-label="Dismiss message" onClick={() => setEventText("")}>
            <X size={10} />
          </button>
        </div>
      )}
      <button
        className="composition-trigger glass mobile-only"
        aria-label="Show composition"
        onClick={() => {
          setPanel(panel === "tree" ? null : "tree");
          setInspector(true);
        }}
      >
        <Layers3 size={17} />
        <span>Composition</span>
      </button>
      <div className="lower-left">
        <span className="mini-formula">{mol.formula}</span>
        <span>
          {isScale(node.id) ? node.entry.category : "One molecule in focus."}
          <br />
          {isScale(node.id)
            ? "Connected scales · illustrative sample"
            : "All its building blocks."}
        </span>
      </div>
      <button
        className="detail-reopen"
        onClick={() => {
          setInspector(true);
          setPanel("details");
        }}
        aria-label="Show details"
      >
        <CircleHelp size={15} />
        <span>
          {node.kind === "molecule" ? "A closer look" : node.entry.name}
        </span>
      </button>
      <footer>
        <span>
          Drag: rotate <b>·</b> Scroll: explore layers <b>·</b> Click: zoom in
        </span>
        <button onClick={() => setModal("about")}>
          Illustrative model · Adjusted scales <ArrowUpRight size={11} />
        </button>
      </footer>
      {message && (
        <div className="toast glass" role="status">
          <Check size={14} />
          {message}
        </div>
      )}
      <dialog
        ref={dialog}
        onCancel={() => setModal(null)}
        className={
          "atlas-dialog" + (modal === "molecules" ? " molecule-dialog" : "")
        }
        onClick={(e) => {
          if (e.target !== e.currentTarget) return;
          const r = e.currentTarget.getBoundingClientRect();
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            setModal(null);
        }}
        aria-labelledby="dialog-title"
      >
        <div className="dialog-heading">
          <span className="eyebrow">MATTER ATLAS</span>
          <IconButton
            label="Close dialog"
            icon={X}
            onClick={() => setModal(null)}
          />
        </div>
        {modal === "molecules" ? (
          <MoleculePicker
            current={state.molecule}
            light={state.light}
            onChoose={(id) => {
              if (id !== state.molecule) changeMolecule(id);
              setModal(null);
            }}
          />
        ) : modal === "search" ? (
          <>
            <h2 id="dialog-title">Inside {mol.formula}</h2>
            <div className="search-box">
              <Search size={18} />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Oxygen, nucleus, proton, electron…"
                aria-label="Search for a constituent"
              />
            </div>
            <div className="search-results">
              {results.map((n) => (
                <button
                  key={n.id}
                  onClick={() => {
                    approach(n.id);
                    setModal(null);
                  }}
                >
                  <span
                    className="search-symbol"
                    style={{ color: n.entry.color }}
                  >
                    {n.entry.symbol}
                  </span>
                  <span>
                    <strong>{n.entry.name}</strong>
                    <small>
                      {ancestors(graph, n.id)
                        .slice(0, -1)
                        .map((a) => a.entry.name)
                        .join(" › ") || "The whole molecule"}
                    </small>
                  </span>
                  <Crosshair size={14} />
                </button>
              ))}
              {!results.length && (
                <p>No constituents found in this molecule.</p>
              )}
            </div>
          </>
        ) : (
          <>
            <h2 id="dialog-title">Everything is connected.</h2>
            <p>
              The zoom starts with an object, passes through a reference volume
              and its molecular neighborhood, then follows a single molecule.
              Scale changes are adjusted; the visible molecules are an
              illustrative sample. Atoms contain nuclei and electrons; nuclei
              contain nucleons; protons and neutrons reveal their three valence
              quarks.
            </p>
            <h3>Explore freely</h3>
            <p>
              Use the two buttons at the top: each names the destination you
              will reach by zooming in or out. You can also scroll or pinch to
              explore. Click a constituent to center the zoom on it; the
              buttons, information panel and breadcrumb follow your position
              within the matter. As you zoom out, details merge back into their
              enclosing structure.
            </p>
            <h3>What the scene represents</h3>
            <p>{node.entry.note}</p>
            <p>
              The spheres and their shells are not physical walls. Sizes are
              adjusted, electron clouds are illustrative and marked electrons
              are selection aids. Quarks remain confined: showing them
              separately is a diagram of composition. Curves between quarks
              represent gluons.
            </p>
            <p>
              Photons and Higgs bosons are not hidden pieces inside an electron.
              The photon illustrates an exchange of energy with an atom. The
              Higgs field volume is a conceptual representation. Paths and
              movements are schematic.
            </p>
            <h3>Sources & inspiration</h3>
            <a href={sources.cern} target="_blank" rel="noreferrer">
              CERN · Particles and interactions <ArrowUpRight size={12} />
            </a>
            <a href={sources.atom} target="_blank" rel="noreferrer">
              OpenStax · Atomic structure <ArrowUpRight size={12} />
            </a>
            <p>
              Interface inspired by{" "}
              <a
                href="https://github.com/ashemag/human-atlas"
                target="_blank"
                rel="noreferrer"
              >
                Human Atlas
              </a>{" "}
              and{" "}
              <a
                href="https://github.com/ashemag/model-x-studio"
                target="_blank"
                rel="noreferrer"
              >
                Model X Studio
              </a>
              , by ashemag.{" "}
              <a href="/licenses/human-atlas.txt">Human Atlas MIT license</a>.
            </p>
            <p className="shortcuts">
              R: reset · L: labels · + / −: zoom · /: search
            </p>
            <div className="particle-reference">
              <Atom size={16} />
              <span>
                {particles.photon.name} · {particles.gluon.name} ·{" "}
                {particles.higgs.name}
              </span>
            </div>
          </>
        )}
      </dialog>
    </main>
  );
}
