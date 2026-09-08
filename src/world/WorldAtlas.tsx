import { useCallback, useEffect, useRef, useState } from "react";
import { pathTo } from "./layout";
import { WORLD_NODES } from "./data";
import { WorldUI } from "./WorldUI";
import WorldMechanismVisual from "./WorldMechanismVisual";
import { WorldComparison } from "./WorldComparison";
import { WorldScene } from "./WorldScene";
import type { WorldSceneInfo } from "./WorldScene";
import { t, useLocale } from "../i18n";
import { AnatomyControls } from "./AnatomyControls";
import { anatomyModeFor } from "./anatomyModels";
import type { AnatomyMode } from "./anatomyModels";
import {
  EMPTY_SPATIAL_CONTEXT,
  readSampleAddress,
  writeSampleAddress,
} from "./sample-address";
import type { SpatialContext } from "./sample-address";

function initialNode() {
  const id = new URLSearchParams(location.search).get("world") || "world";
  return WORLD_NODES[id] ? id : "world";
}

/** Descendants identify their system through ancestry. A shared body view
 * identifies it through its latest selected anatomical location. */
function anatomicalBranch(
  id: string,
  context: SpatialContext,
): string | undefined {
  const branch = pathTo(id).find(
    (part) => WORLD_NODES[part].parent === "human",
  );
  if (branch || id !== "human") return branch;
  return [...context.entries]
    .reverse()
    .find(
      (entry) =>
        entry.parentId === "human" &&
        WORLD_NODES[entry.childId]?.parent === "human",
    )?.childId;
}

function navigationPreferences(
  id: string,
  context: SpatialContext,
  previous: Record<string, string> = {},
): Record<string, string> {
  const next = { ...previous };
  const path = pathTo(id);
  for (let i = 1; i < path.length; i++) next[path[i - 1]] = path[i];
  const branch = anatomicalBranch(id, context);
  if (branch) next.human = branch;
  return next;
}

function returningAddress(
  id: string,
  from: string,
  context: SpatialContext,
): SpatialContext {
  const path = pathTo(from);
  const index = path.indexOf(id);
  const child = index >= 0 ? path[index + 1] : undefined;
  if (!child) return context;
  const entry = context.entries.find(
    (entry) => entry.parentId === id && entry.childId === child,
  );
  if (!entry) {
    // Named navigation has no picked origin. Keep the branch just left, but
    // remove stale sibling locations so they cannot restore a different view.
    const entries = context.entries.filter((item) => {
      const ancestry = pathTo(item.childId);
      const parentIndex = ancestry.indexOf(id);
      const branch = parentIndex >= 0 ? ancestry[parentIndex + 1] : undefined;
      return !branch || branch === child;
    });
    return entries.length === context.entries.length
      ? context
      : { v: 1, entries };
  }
  if (context.entries.at(-1) === entry) return context;
  // Revisit the actual branch just left without changing its selected origins.
  return {
    v: 1,
    entries: [...context.entries.filter((item) => item !== entry), entry],
  };
}

export default function WorldAtlas({
  onOpenMatter,
}: {
  onOpenMatter: () => void;
}) {
  const locale = useLocale();
  const [selectedId, setSelectedId] = useState(initialNode);
  const [spatialContext, setSpatialContext] = useState(() =>
    readSampleAddress(location.search),
  );
  const spatialRef = useRef(spatialContext);
  spatialRef.current = spatialContext;
  const selectedRef = useRef(selectedId);
  selectedRef.current = selectedId;
  const [preferred, setPreferred] = useState<Record<string, string>>(() =>
    navigationPreferences(selectedId, spatialContext),
  );
  const [navigationTarget, setNavigationTarget] = useState<{
    parentId: string;
    childId: string | undefined;
  }>({ parentId: selectedId, childId: preferred[selectedId] });
  const onNextTargetChange = useCallback(
    (parentId: string, childId: string | undefined) => {
      setNavigationTarget((previous) =>
        previous.parentId === parentId && previous.childId === childId
          ? previous
          : { parentId, childId },
      );
    },
    [],
  );
  const [rotating, setRotating] = useState(false);
  const [anatomyMode, setAnatomyMode] = useState<AnatomyMode>(() => {
    const branch = anatomicalBranch(selectedId, spatialContext);
    return anatomyModeFor(branch || "human/vein");
  });
  const [anatomyRetryToken, setAnatomyRetryToken] = useState(0);
  const [mechanism, setMechanism] = useState<{
    id: string | null;
    phase: number;
    playing: boolean;
  }>({ id: null, phase: 0, playing: false });
  const onMechanismChange = useCallback(
    (id: string | null, phase: number, playing: boolean) =>
      setMechanism({ id, phase, playing }),
    [],
  );
  const [focusMode, setFocusMode] = useState(false);
  const [resetToken, setResetToken] = useState(0);
  const [sceneInfo, setSceneInfo] = useState<WorldSceneInfo>({
    metersPerPixel: 0.05,
    transitioning: false,
    visibleIds: [],
  });
  const navigate = useCallback((id: string, address?: SpatialContext) => {
    if (!WORLD_NODES[id]) return;
    const context =
      !address || address === spatialRef.current
        ? returningAddress(id, selectedRef.current, spatialRef.current)
        : address;
    if (selectedRef.current === id && context === spatialRef.current) return;
    selectedRef.current = id;
    spatialRef.current = context;
    setSpatialContext(context);
    const anatomyBranch = anatomicalBranch(id, context);
    if (anatomyBranch) setAnatomyMode(anatomyModeFor(anatomyBranch));
    setPreferred((previous) => navigationPreferences(id, context, previous));
    const url = new URL(location.href);
    url.searchParams.set("world", id);
    writeSampleAddress(url, context);
    history.pushState({ world: id, spatial: context }, "", url);
    setSelectedId(id);
  }, []);
  const goHome = useCallback(() => {
    // Home starts an overview address. Ordinary outward navigation keeps the
    // selected place, and Back can still restore the previous complete URL.
    navigate("world", EMPTY_SPATIAL_CONTEXT);
    setResetToken((token) => token + 1);
  }, [navigate]);
  useEffect(() => {
    const pop = () => {
      const id = initialNode();
      const context = readSampleAddress(location.search);
      spatialRef.current = context;
      setSpatialContext(context);
      selectedRef.current = id;
      const anatomyBranch = anatomicalBranch(id, context);
      if (anatomyBranch) setAnatomyMode(anatomyModeFor(anatomyBranch));
      setPreferred((previous) => navigationPreferences(id, context, previous));
      setSelectedId(id);
    };
    window.addEventListener("popstate", pop);
    return () => window.removeEventListener("popstate", pop);
  }, []);
  useEffect(() => {
    document.title = t("{name} · Atlas — A world within a world", {
      name: WORLD_NODES[selectedId].name[locale],
    });
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute("content", WORLD_NODES[selectedId].description[locale]);
  }, [selectedId, locale]);
  return (
    <main
      className="world-atlas"
      data-selected-world={selectedId}
      data-mechanism={Boolean(mechanism.id && !focusMode)}
    >
      <WorldScene
        selectedId={selectedId}
        onHome={goHome}
        spatialContext={spatialContext}
        preferredChildId={
          navigationTarget.parentId === selectedId
            ? navigationTarget.childId
            : preferred[selectedId]
        }
        rotating={rotating}
        focusMode={focusMode}
        resetToken={resetToken}
        anatomyMode={anatomyMode}
        anatomyRetryToken={anatomyRetryToken}
        onNavigate={navigate}
        onInfo={setSceneInfo}
      />
      {!focusMode && <WorldMechanismVisual {...mechanism} />}
      <WorldUI
        spatialContext={spatialContext}
        anatomyMode={anatomyMode}
        onRetryAnatomy={() => setAnatomyRetryToken((token) => token + 1)}
        anatomyControls={
          selectedId === "human" ? (
            <AnatomyControls
              selectedId={selectedId}
              mode={anatomyMode}
              status={sceneInfo.anatomyStatus || "loading"}
              onModeChange={(mode) => {
                setAnatomyMode(mode);
                const target =
                  mode === "skeleton"
                    ? "human/femur"
                    : mode === "muscles"
                      ? "human/muscle"
                      : mode === "surface"
                        ? "human/skin"
                        : "human/vein";
                setPreferred((previous) => ({ ...previous, human: target }));
              }}
              onNavigate={navigate}
              onRetry={() => setAnatomyRetryToken((token) => token + 1)}
            />
          ) : undefined
        }
        preferredChildId={preferred[selectedId]}
        onNextTargetChange={onNextTargetChange}
        onMechanismChange={onMechanismChange}
        mechanismVisual={<WorldMechanismVisual {...mechanism} />}
        selectedId={selectedId}
        onNavigate={navigate}
        onBack={() => navigate(WORLD_NODES[selectedId].parent || "world")}
        onHome={goHome}
        sceneInfo={sceneInfo}
        rotating={rotating}
        onRotate={() => setRotating((value) => !value)}
        focusMode={focusMode}
        onFocusMode={setFocusMode}
        comparison={<WorldComparison selectedId={selectedId} />}
        onOpenMatter={onOpenMatter}
        onResetView={() => setResetToken((value) => value + 1)}
      />
    </main>
  );
}
