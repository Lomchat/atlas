import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Atom,
  Box,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Crosshair,
  Expand,
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
  Sparkles,
  Sun,
  X,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Scene from "./Scene";
import { molecules, particles, sources } from "./data";
import type { MoleculeId } from "./data";
import {
  ancestors,
  createGraph,
  defaultState,
  descendants,
  expansion,
  kindNames,
  openBranch,
} from "./continuum";
import type { ExplorerState, MatterNode } from "./continuum";
function initial(): ExplorerState {
  const p = new URLSearchParams(location.search),
    s: ExplorerState = { ...defaultState, overrides: {} };
  if (p.get("molecule") && Object.hasOwn(molecules, p.get("molecule")!))
    s.molecule = p.get("molecule") as MoleculeId;
  const old = p.get("level"),
    d = p.get("depth")
      ? Number(p.get("depth"))
      : old === "atom"
        ? 50
        : old === "nucleus"
          ? 78
          : old === "quarks"
            ? 100
            : 0;
  s.depth = Number.isFinite(d) ? Math.max(0, Math.min(100, d)) : 0;
  const g = createGraph(s.molecule);
  for (const [key, value] of [
    ["open", 1],
    ["closed", 0],
  ] as const)
    for (const id of (p.get(key) || "").split(",").slice(0, 180))
      if (g.nodes.get(id)?.children.length) s.overrides[id] = value;
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
    [modal, setModal] = useState<"about" | "search" | null>(null),
    [query, setQuery] = useState(""),
    [message, setMessage] = useState(""),
    [eventText, setEventText] = useState(""),
    [automatic, setAutomatic] = useState(false);
  const graph = useMemo(() => createGraph(state.molecule), [state.molecule]),
    mol = molecules[state.molecule],
    node = graph.nodes.get(state.selected || graph.root)!,
    path = ancestors(graph, node.id),
    isOpen = expansion(node, state) > 0.5,
    local = Object.keys(state.overrides).length > 0;
  const dialog = useRef<HTMLDialogElement>(null),
    searchRef = useRef<HTMLInputElement>(null),
    noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const update = (patch: Partial<ExplorerState>) =>
    setState((s) => ({ ...s, ...patch }));
  function inspect(id: string, open = true) {
    const n = graph.nodes.get(id);
    if (!n) return;
    setAutomatic(false);
    setInspector(true);
    setPanel(n.children.length ? null : "details");
    setState((s) => ({
      ...s,
      selected: id,
      focus:
        s.focus && id !== s.focus && !id.startsWith(s.focus + "/")
          ? id === graph.root
            ? null
            : id
          : s.focus,
      overrides:
        open && n.children.length ? openBranch(graph, s, id) : s.overrides,
    }));
  }
  function toggleNode(id: string) {
    setAutomatic(false);
    const n = graph.nodes.get(id)!;
    setState((s) => {
      const overrides = { ...s.overrides };
      if (expansion(n, s) > 0.5) {
        overrides[id] = 0;
        return {
          ...s,
          overrides,
          selected: id,
          focus:
            s.focus && descendants(graph, id).includes(s.focus) ? id : s.focus,
        };
      }
      return { ...s, selected: id, overrides: openBranch(graph, s, id) };
    });
  }
  function approach(id: string) {
    setInspector(true);
    setPanel(null);
    if (id === graph.root) {
      update({ focus: null, selected: null, zoom: 0 });
      return;
    }
    const n = graph.nodes.get(id)!;
    setState((s) => ({
      ...s,
      focus: id,
      selected: id,
      zoom: 0,
      overrides: n.parent ? openBranch(graph, s, n.parent) : s.overrides,
    }));
  }
  function overview() {
    update({ focus: null, selected: null, zoom: 0, reset: state.reset + 1 });
    setPanel(null);
  }
  function reset() {
    setAutomatic(false);
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
    setAutomatic(false);
    setEventText("");
    setState((s) => ({
      ...defaultState,
      molecule: id,
      light: s.light,
      reset: s.reset + 1,
    }));
    setPanel(null);
  }
  function globalDepth(depth: number) {
    setAutomatic(false);
    update({ depth, overrides: {}, focus: null, zoom: 0 });
  }
  function photon() {
    const target =
      node.atom >= 0
        ? graph.atoms[node.atom]
        : graph.atoms.find((id) => graph.nodes.get(id)!.element === "H") ||
          graph.atoms[0];
    setAutomatic(false);
    setState((s) => ({
      ...s,
      selected: target,
      focus: target,
      zoom: 0,
      overrides: openBranch(graph, s, target),
      photon: s.photon + 1,
    }));
    setEventText("Photon incident");
  }
  function notify(text: string) {
    setMessage(text);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setMessage(""), 3000);
  }
  async function share() {
    try {
      await navigator.clipboard.writeText(location.href);
      notify("Lien de cette exploration copié");
    } catch {
      notify("Cette exploration est conservée dans l’adresse de la page");
    }
  }
  async function fullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      notify("Plein écran indisponible sur ce navigateur");
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
    if (state.depth) p.set("depth", String(Math.round(state.depth)));
    const open = Object.entries(state.overrides)
        .filter(([, v]) => v === 1)
        .map(([k]) => k),
      closed = Object.entries(state.overrides)
        .filter(([, v]) => v === 0)
        .map(([k]) => k);
    if (open.length) p.set("open", open.join(","));
    if (closed.length) p.set("closed", closed.join(","));
    if (state.selected) p.set("node", state.selected);
    if (state.focus) p.set("focus", state.focus);
    history.replaceState(
      null,
      "",
      location.pathname + (p.size ? "?" + p.toString() : ""),
    );
  }, [
    state.molecule,
    state.depth,
    state.overrides,
    state.selected,
    state.focus,
  ]);
  useEffect(() => {
    if (modal) {
      dialog.current?.showModal();
      if (modal === "search") setTimeout(() => searchRef.current?.focus(), 50);
    } else dialog.current?.close();
  }, [modal]);
  useEffect(() => {
    if (!automatic) return;
    let frame = 0,
      last = performance.now();
    const run = (now: number) => {
      if (now - last > 30) {
        const dt = Math.max(0, Math.min((now - last) / 1000, 0.1));
        last = now;
        setState((s) => ({
          ...s,
          depth: Math.min(100, s.depth + dt * 9),
          overrides: {},
          focus: null,
        }));
      }
      frame = requestAnimationFrame(run);
    };
    frame = requestAnimationFrame(run);
    return () => cancelAnimationFrame(frame);
  }, [automatic]);
  useEffect(() => {
    if (automatic && state.depth >= 100) setAutomatic(false);
  }, [state.depth, automatic]);
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
        overview();
        setPanel(null);
      }
      if (e.key === " ") {
        e.preventDefault();
        setAutomatic((a) => !a);
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
  const visibleCount = [...graph.nodes.values()].filter(
    (n) =>
      n.kind !== "molecule" &&
      ancestors(graph, n.id)
        .slice(1, -1)
        .every((a) => expansion(a, state) > 0.35),
  ).length;
  function row(n: MatterNode, depth = 0): React.ReactNode {
    const expanded = n.kind === "molecule" || expansion(n, state) > 0.25;
    return (
      <div key={n.id} className="tree-branch">
        <div
          className={"tree-row " + (state.selected === n.id ? "selected" : "")}
          style={{ "--indent": Math.min(depth, 4) } as React.CSSProperties}
          data-tree-node={n.id}
        >
          <button
            className={"tree-caret " + (expanded ? "expanded" : "")}
            onClick={() =>
              n.children.length ? toggleNode(n.id) : inspect(n.id, false)
            }
            aria-label={`${expanded ? "Refermer" : "Ouvrir"} ${n.entry.name}`}
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
    <main className={"studio " + (state.light ? "light" : "dark")}>
      <Scene
        state={state}
        graph={graph}
        onPick={inspect}
        onFocus={approach}
        onEvent={setEventText}
      />
      <div className="vignette" />
      <header className="identity">
        <div className="eyebrow">
          <span /> EXPLORER LA MATIÈRE
        </div>
        <h1>
          Matière <em>Atlas</em>
          <sup>02</sup>
        </h1>
        <p>Un monde à l’intérieur de chaque atome.</p>
      </header>
      <nav className="top-actions" aria-label="Outils de l’atlas">
        <button
          className="search-trigger"
          aria-label="Rechercher"
          onClick={() => {
            setQuery("");
            setModal("search");
          }}
        >
          <Search size={15} />
          <span>Rechercher</span>
          <kbd>/</kbd>
        </button>
        <IconButton
          label={state.light ? "Mode sombre" : "Mode clair"}
          icon={state.light ? Moon : Sun}
          onClick={() => update({ light: !state.light })}
        />
        <IconButton
          label="Partager cette exploration"
          icon={Share2}
          onClick={share}
        />
        <IconButton
          label="À propos"
          icon={CircleHelp}
          onClick={() => setModal("about")}
        />
      </nav>
      <div className="subject-selector">
        <label>
          <span className="sr-only">Choisir une molécule</span>
          <select
            value={state.molecule}
            onChange={(e) => changeMolecule(e.target.value as MoleculeId)}
          >
            {Object.entries(molecules).map(([id, m]) => (
              <option value={id} key={id}>
                {m.name} · {m.formula}
              </option>
            ))}
          </select>
          <ChevronDown size={13} />
        </label>
        <div className="breadcrumb" aria-label="Appartenance dans la molécule">
          {path.map((n, i) => (
            <span key={n.id}>
              {i > 0 && <ChevronRight size={10} />}
              <button onClick={() => approach(n.id)} title={n.entry.name}>
                {i === 0
                  ? mol.formula
                  : n.kind === "atom"
                    ? n.entry.name
                    : n.kind === "nucleus"
                      ? "Noyau"
                      : n.entry.name}
              </button>
            </span>
          ))}
        </div>
      </div>
      <aside
        className={
          "tree-panel glass " + (panel === "tree" ? "mobile-open" : "")
        }
        aria-label="Composition imbriquée"
      >
        <div className="panel-heading">
          <span>Dans cette molécule</span>
          <button
            className="mobile-only icon-button"
            aria-label="Fermer la composition"
            onClick={() => setPanel(null)}
          >
            <X size={15} />
          </button>
          <span className="desktop-only counter">
            {graph.totals.atoms} atomes
          </span>
        </div>
        <p className="panel-hint">Cliquez sur un constituant pour l’ouvrir.</p>
        <div className="tree-scroll">{row(graph.nodes.get(graph.root)!)}</div>
        <div className="composition-summary">
          <span>
            <b>{graph.totals.electrons}</b> électrons
          </span>
          <span>
            <b>{graph.totals.nucleons}</b> nucléons
          </span>
          <span>
            <b>{graph.totals.quarks}</b> quarks de valence
          </span>
        </div>
        <div className="display-options">
          <Switch
            label="Annotations"
            value={state.labels}
            toggle={() => update({ labels: !state.labels })}
          />
          <Switch
            label="Enveloppes & nuages"
            value={state.cloud}
            toggle={() => update({ cloud: !state.cloud })}
          />
        </div>
        <div className="tree-foot">
          <span className="tiny-dot" />
          {visibleCount} constituants révélés
        </div>
      </aside>
      <div className="view-controls glass">
        <IconButton
          label="Zoomer"
          icon={Plus}
          onClick={() => update({ zoom: state.zoom + 1 })}
        />
        <IconButton
          label="Dézoomer"
          icon={Minus}
          onClick={() => update({ zoom: state.zoom - 1 })}
        />
        <i />
        <IconButton
          label={state.rotate ? "Arrêter la rotation" : "Rotation automatique"}
          icon={state.rotate ? Pause : RotateCw}
          active={state.rotate}
          onClick={() => update({ rotate: !state.rotate })}
        />
        <IconButton
          label="Revoir toute la molécule"
          icon={Crosshair}
          onClick={overview}
        />
        {document.fullscreenEnabled && (
          <IconButton
            label="Plein écran"
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
        aria-label="Constituant sélectionné"
      >
        <div className="detail-top">
          <span className="eyebrow">
            {node.kind === "molecule"
              ? "VUE D’ENSEMBLE"
              : kindNames[node.kind].toUpperCase()}
          </span>
          <IconButton
            label="Fermer les détails"
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
              Dans {graph.nodes.get(node.parent)!.entry.name.toLowerCase()}
            </span>
          </button>
        )}
        <p className="description">{node.entry.description}</p>
        {node.children.length > 0 && (
          <div className="contains">
            <Layers3 size={14} />
            <span>
              Contient <strong>{node.children.length}</strong>{" "}
              {node.kind === "molecule"
                ? "atomes"
                : node.kind === "atom"
                  ? "constituants"
                  : node.kind === "nucleus"
                    ? "nucléons"
                    : "quarks de valence"}
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
          {node.children.length > 0 && (
            <button
              className="primary-action"
              onClick={() => toggleNode(node.id)}
            >
              {isOpen ? <Box size={15} /> : <Expand size={15} />}
              <span>
                {isOpen ? "Refermer ce constituant" : "Ouvrir ce constituant"}
              </span>
              <ChevronRight size={13} />
            </button>
          )}
          {node.kind !== "molecule" && (
            <button
              className="secondary-action"
              onClick={() => approach(node.id)}
            >
              <Crosshair size={14} /> Approcher sans perdre le contexte
            </button>
          )}
        </div>
        <a
          className="source-link"
          href={node.entry.source}
          target="_blank"
          rel="noreferrer"
        >
          Source scientifique <ArrowUpRight size={11} />
        </a>
      </aside>
      <div className="interaction-controls glass">
        <span className="interaction-title">Observer une interaction</span>
        <button onClick={photon} aria-label="Envoyer un photon">
          <Zap size={15} />
          <span>Photon</span>
        </button>
        <button
          className={state.higgs ? "active" : ""}
          onClick={() => update({ higgs: !state.higgs })}
          aria-pressed={state.higgs}
          aria-label="Afficher le champ de Higgs"
        >
          <Sparkles size={15} />
          <span>Champ de Higgs</span>
        </button>
      </div>
      {eventText && (
        <div className="event-status" role="status">
          <span />
          {eventText}
          <button
            aria-label="Masquer le message"
            onClick={() => setEventText("")}
          >
            <X size={10} />
          </button>
        </div>
      )}
      <div className="scene-hint">
        {state.focus ? (
          <button onClick={overview}>
            <ArrowLeft size={13} /> Revoir toute la molécule
          </button>
        ) : (
          <>
            <span className="hint-line" />
            <span>
              {local
                ? "EXPLORATION LIBRE"
                : state.depth > 90
                  ? "TOUT EST LÀ, IMBRIQUÉ"
                  : state.depth > 0
                    ? "LA MOLÉCULE SE DÉPLIE"
                    : "CLIQUEZ SUR UN ATOME POUR L’OUVRIR"}
            </span>
            <span className="hint-line" />
          </>
        )}
      </div>
      <div className="bottom-dock glass">
        <button
          className="dock-button mobile-only"
          aria-label="Afficher la composition"
          onClick={() => {
            setPanel(panel === "tree" ? null : "tree");
            setInspector(true);
          }}
        >
          <Layers3 size={19} />
          <span>Composition</span>
        </button>
        <button
          className={"dock-button play " + (automatic ? "active" : "")}
          aria-label={
            automatic
              ? "Mettre le dépliage en pause"
              : "Déplier automatiquement"
          }
          onClick={() => {
            if (state.depth >= 100) update({ depth: 0, overrides: {} });
            setAutomatic((a) => !a);
          }}
        >
          {automatic ? <Pause size={18} /> : <Play size={18} />}
          <span className="desktop-only">{automatic ? "Pause" : "Animer"}</span>
        </button>
        <div className="depth-control">
          <div className="depth-label">
            <label htmlFor="depth">Déplier l’ensemble</label>
            <output htmlFor="depth">
              {local ? "Libre" : `${Math.round(state.depth)} %`}
            </output>
          </div>
          <input
            id="depth"
            type="range"
            min="0"
            max="100"
            step="1"
            value={state.depth}
            style={{ "--progress": `${state.depth}%` } as React.CSSProperties}
            onChange={(e) => globalDepth(Number(e.target.value))}
          />
          <div className="range-labels">
            <span>Molécule liée</span>
            <span>Tous les constituants</span>
          </div>
        </div>
        <button
          className="dock-button"
          aria-label="Tout déplier"
          onClick={() => globalDepth(100)}
        >
          <Expand size={18} />
          <span className="desktop-only">Déplier</span>
        </button>
        <i />
        <button
          className="dock-button"
          aria-label="Tout rassembler"
          onClick={reset}
        >
          <RotateCcw size={17} />
          <span className="desktop-only">Rassembler</span>
        </button>
      </div>
      <div className="lower-left">
        <span className="mini-formula">{mol.formula}</span>
        <span>
          Une seule molécule.
          <br />
          Tous ses constituants.
        </span>
      </div>
      <button
        className="detail-reopen"
        onClick={() => {
          setInspector(true);
          setPanel("details");
        }}
        aria-label="Afficher les détails"
      >
        <CircleHelp size={15} />
        <span>{node.kind === "molecule" ? "À la loupe" : node.entry.name}</span>
      </button>
      <footer>
        <span>
          Glisser : tourner <b>·</b> Molette : zoomer <b>·</b> Double clic :
          approcher
        </span>
        <button onClick={() => setModal("about")}>
          Schéma pédagogique · Échelles adaptées <ArrowUpRight size={11} />
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
        className="atlas-dialog"
        aria-labelledby="dialog-title"
      >
        <div className="dialog-heading">
          <span className="eyebrow">MATIÈRE ATLAS</span>
          <IconButton
            label="Fermer la fenêtre"
            icon={X}
            onClick={() => setModal(null)}
          />
        </div>
        {modal === "search" ? (
          <>
            <h2 id="dialog-title">À l’intérieur de {mol.formula}</h2>
            <div className="search-box">
              <Search size={18} />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Oxygène, noyau, proton, électron…"
                aria-label="Rechercher un constituant"
              />
            </div>
            <div className="search-results">
              {results.map((n) => (
                <button
                  key={n.id}
                  onClick={() => {
                    setState((s) => ({
                      ...s,
                      selected: n.id,
                      focus: n.kind === "molecule" ? null : n.id,
                      overrides: n.parent
                        ? openBranch(graph, s, n.parent)
                        : s.overrides,
                    }));
                    setInspector(true);
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
                        .join(" › ") || "La molécule entière"}
                    </small>
                  </span>
                  <Crosshair size={14} />
                </button>
              ))}
              {!results.length && (
                <p>Aucun constituant trouvé dans cette molécule.</p>
              )}
            </div>
          </>
        ) : (
          <>
            <h2 id="dialog-title">Tout est lié.</h2>
            <p>
              La même molécule reste à l’écran. Ses atomes contiennent leurs
              noyaux et leurs électrons ; les noyaux contiennent leurs nucléons
              ; les protons et les neutrons révèlent leurs trois quarks de
              valence.
            </p>
            <h3>Explorez directement</h3>
            <p>
              Cliquez sur un constituant pour l’ouvrir sur place. Double-cliquez
              pour vous en approcher. Les enveloppes transparentes et l’arbre de
              composition gardent le lien avec ses parents. Le curseur agit sur
              toute la molécule ; chaque branche peut aussi être ouverte ou
              refermée librement.
            </p>
            <h3>Ce que représente la scène</h3>
            <p>{node.entry.note}</p>
            <p>
              Les sphères et leurs enveloppes ne sont pas des parois physiques.
              Les tailles sont adaptées, les nuages électroniques sont
              illustratifs et les électrons marqués servent à la sélection. Les
              quarks restent confinés : leur représentation séparée est un
              schéma de composition. Les gluons sont figurés par les courbes
              entre quarks.
            </p>
            <p>
              Le photon et le boson de Higgs ne sont pas des morceaux cachés
              dans un électron. Le photon illustre un échange d’énergie avec un
              atome. La surface du champ de Higgs est une représentation
              conceptuelle. Les temps et les trajectoires de ces animations sont
              schématiques.
            </p>
            <h3>Sources & inspirations</h3>
            <a href={sources.cern} target="_blank" rel="noreferrer">
              CERN · Particules et interactions <ArrowUpRight size={12} />
            </a>
            <a href={sources.atom} target="_blank" rel="noreferrer">
              OpenStax · Structure atomique <ArrowUpRight size={12} />
            </a>
            <p>
              Interface inspirée de{" "}
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
              , par ashemag.{" "}
              <a href="/licenses/human-atlas.txt">Licence MIT de Human Atlas</a>
              .
            </p>
            <p className="shortcuts">
              R : rassembler · L : annotations · Espace : animer · / :
              rechercher
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
