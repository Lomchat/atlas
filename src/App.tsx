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
    [modal, setModal] = useState<"about" | "search" | null>(null),
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
  function photon() {
    const target =
      node.atom >= 0
        ? graph.atoms[node.atom]
        : graph.atoms.find((id) => graph.nodes.get(id)!.element === "H") ||
          graph.atoms[0];
    setState((s) => ({
      ...s,
      selected: target,
      focus: target,
      navigation: s.navigation + 1,
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
  function row(n: MatterNode, depth = 0): React.ReactNode {
    const expanded =
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
            aria-label={`Explorer ${n.entry.name}`}
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
        onDetail={setDetail}
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
      <nav
        className="zoom-navigation glass"
        aria-label="Naviguer dans la matière"
      >
        <button
          data-direction="out"
          data-target={parent?.id || ""}
          disabled={!parent}
          onClick={() => step("out")}
          aria-label={
            parent
              ? `Zoom arrière vers ${parent.entry.name}`
              : "Zoom arrière · Vue d’ensemble"
          }
        >
          <Minus size={18} />
          <span>
            <small>ZOOM ARRIÈRE</small>
            <strong>{parent?.entry.name || "Vue d’ensemble"}</strong>
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
              ? `Zoom avant vers ${next.entry.name}`
              : `Zoom avant · ${node.entry.name}, particule élémentaire`
          }
        >
          <span>
            <small>{next ? "ZOOM AVANT" : "PARTICULE ÉLÉMENTAIRE"}</small>
            <strong>{next?.entry.name || node.entry.name}</strong>
          </span>
          <Plus size={18} />
        </button>
      </nav>
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
        <p className="panel-hint">
          Pointez ou cliquez sur un constituant à explorer.
        </p>
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
          {visibleCount} constituants affichés · Détail adaptatif
        </div>
      </aside>
      <div className="view-controls glass">
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
          {next && (
            <button className="primary-action" onClick={() => step("in")}>
              <Plus size={15} />
              <span>Explorer {next.entry.name}</span>
              <ChevronRight size={13} />
            </button>
          )}
          {parent && (
            <button className="secondary-action" onClick={() => step("out")}>
              <ArrowLeft size={14} />
              <span>Revenir à {parent.entry.name}</span>
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
      <button
        className="composition-trigger glass mobile-only"
        aria-label="Afficher la composition"
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
          Glisser : tourner <b>·</b> Molette : explorer les couches <b>·</b>{" "}
          Clic : se rapprocher
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
              Utilisez les deux boutons du haut : chacun indique la destination
              du rapprochement ou du retour. La molette et le pincement
              permettent aussi de progresser. Cliquez sur un constituant pour
              centrer le zoom sur lui ; les boutons, la fiche et le fil
              d’appartenance suivent votre position dans la matière. En
              reculant, les détails se regroupent dans leur enveloppe.
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
