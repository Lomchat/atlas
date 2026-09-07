import { useCallback, useEffect, useRef, useState } from "react";
import { pathTo } from "./layout";
import { WORLD_NODES } from "./data";
import { WorldUI } from "./WorldUI";
import WorldMechanismVisual from "./WorldMechanismVisual";
import { WorldComparison } from "./WorldComparison";
import { WorldScene } from "./WorldScene";
import type { WorldSceneInfo } from "./WorldScene";
import { t, useLocale } from "../i18n";

function initialNode() {
  const id = new URLSearchParams(location.search).get("world") || "world";
  return WORLD_NODES[id] ? id : "world";
}
export default function WorldAtlas({
  onOpenMatter,
}: {
  onOpenMatter: () => void;
}) {
  const locale = useLocale();
  const [selectedId, setSelectedId] = useState(initialNode);
  const selectedRef = useRef(selectedId);
  selectedRef.current = selectedId;
  const [preferred, setPreferred] = useState<Record<string, string>>(() => {
    const path = pathTo(selectedId);
    return Object.fromEntries(
      path.slice(1).map((id, index) => [path[index], id]),
    );
  });
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
  const navigate = useCallback((id: string) => {
    if (!WORLD_NODES[id]) return;
    if (selectedRef.current === id) return;
    selectedRef.current = id;
    const path = pathTo(id);
    setPreferred((previous) => {
      const next = { ...previous };
      for (let i = 1; i < path.length; i++) next[path[i - 1]] = path[i];
      return next;
    });
    const url = new URL(location.href);
    url.searchParams.set("world", id);
    history.pushState({ world: id }, "", url);
    setSelectedId(id);
  }, []);
  useEffect(() => {
    const pop = () => {
      const id = initialNode();
      selectedRef.current = id;
      const path = pathTo(id);
      setPreferred((previous) => {
        const next = { ...previous };
        for (let i = 1; i < path.length; i++) next[path[i - 1]] = path[i];
        return next;
      });
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
        preferredChildId={
          navigationTarget.parentId === selectedId
            ? navigationTarget.childId
            : preferred[selectedId]
        }
        rotating={rotating}
        focusMode={focusMode}
        resetToken={resetToken}
        onNavigate={navigate}
        onInfo={setSceneInfo}
      />
      {!focusMode && <WorldMechanismVisual {...mechanism} />}
      <WorldUI
        preferredChildId={preferred[selectedId]}
        onNextTargetChange={onNextTargetChange}
        onMechanismChange={onMechanismChange}
        mechanismVisual={<WorldMechanismVisual {...mechanism} />}
        selectedId={selectedId}
        onNavigate={navigate}
        onBack={() => navigate(WORLD_NODES[selectedId].parent || "world")}
        onHome={() => navigate("world")}
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
