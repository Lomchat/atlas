import { Check, House, Info, Share2 } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Atlas } from "./engine/Atlas";
import { t, tr, useLocale } from "./i18n";
import { HOME_ID, level as levelById, pathThrough } from "./levels";
import type { LevelData } from "./levels/types";
import About from "./ui/About";
import Controls from "./ui/Controls";
import Intro from "./ui/Intro";
import LanguagePicker from "./ui/LanguagePicker";
import LevelCard from "./ui/LevelCard";
import ScaleRuler from "./ui/ScaleRuler";
import Targets from "./ui/Targets";
import { LevelTip } from "./ui/LevelTip";
import { LogoMark } from "./ui/icons";
import { readStart, shareUrl, writeLevel } from "./ui/url";
import { markVisited, useVisited } from "./ui/visited";

const COMPACT = "(max-width: 760px), (max-height: 520px)";

function useMedia(query: string) {
  const [matches, setMatches] = useState(() => matchMedia(query).matches);
  useEffect(() => {
    const list = matchMedia(query);
    const change = () => setMatches(list.matches);
    list.addEventListener("change", change);
    return () => list.removeEventListener("change", change);
  }, [query]);
  return matches;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default function App() {
  const locale = useLocale();
  const start = useMemo(readStart, []);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [atlas, setAtlas] = useState<Atlas | null>(null);
  const [nearest, setNearest] = useState<LevelData>(() => levelById(start.at));
  const [path, setPath] = useState<readonly LevelData[]>(() => pathThrough(start.at));
  const [intro, setIntro] = useState(start.intro);
  const [about, setAbout] = useState(false);
  const [touring, setTouring] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const visited = useVisited();
  const compact = useMedia(COMPACT);
  const reducedMotion = useMedia("(prefers-reduced-motion: reduce)");
  const tour = useRef(0);

  /* Engine lifecycle: one renderer for the whole visit. */
  useEffect(() => {
    const canvas = canvasRef.current!;
    let engine: Atlas;
    try {
      engine = new Atlas(canvas, {
        startAt: start.at,
        reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
        freezeTime: start.freeze,
        startOffset: start.offset,
      });
    } catch (error) {
      console.error(error);
      setFailed(true);
      return;
    }
    setAtlas(engine);
    const offChange = engine.onChange((state) => {
      setNearest(state.nearestLevel);
      setPath([...state.currentPath]);
    });
    const offInterrupt = engine.onInterrupt(() => {
      tour.current++;
      setTouring(false);
    });
    return () => {
      offChange();
      offInterrupt();
      engine.dispose();
      setAtlas(null);
    };
  }, [start]);

  useEffect(() => atlas?.setReducedMotion(reducedMotion), [atlas, reducedMotion]);

  /* Address bar, discoveries and theme follow the level being viewed. */
  useEffect(() => {
    writeLevel(nearest.id);
    markVisited(nearest.id);
    const root = document.documentElement.style;
    root.setProperty("--accent", nearest.theme.accent);
    root.setProperty("--theme-top", nearest.theme.top);
    root.setProperty("--theme-bottom", nearest.theme.bottom);
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", nearest.theme.top);
  }, [nearest, locale]);

  /* Keep the subject clear of the panels. */
  useLayoutEffect(() => {
    if (!atlas) return;
    const update = () => {
      const card = cardRef.current?.getBoundingClientRect();
      const width = window.innerWidth;
      if (start.bare || !card) {
        atlas.setSafeArea({ left: 0, right: 0, top: 0, bottom: 0 });
      } else if (compact) {
        const dock = window.innerHeight - card.top;
        document.documentElement.style.setProperty("--dock-height", `${dock}px`);
        const landscape = window.innerWidth > window.innerHeight && window.innerHeight <= 520;
        atlas.setSafeArea(
          landscape
            ? { left: card.right + 8, right: 44, top: 56, bottom: 8 }
            : { left: 0, right: 44, top: 60, bottom: dock + 8 },
        );
      } else {
        atlas.setSafeArea({
          left: Math.min(card.right + 12, width * 0.4),
          right: 96,
          top: 72,
          bottom: 112,
        });
      }
    };
    update();
    const observer = new ResizeObserver(update);
    if (cardRef.current) observer.observe(cardRef.current);
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [atlas, compact, start.bare]);

  const stopTour = useCallback(() => {
    tour.current++;
    setTouring(false);
  }, []);

  const fly = useCallback(
    (id: string) => {
      stopTour();
      setIntro(false);
      void atlas?.flyTo(id);
    },
    [atlas, stopTour],
  );

  const runTour = useCallback(async () => {
    if (!atlas) return;
    const token = ++tour.current;
    setTouring(true);
    const current = atlas.currentPath;
    let index = current.findIndex((level) => level.id === atlas.nearestLevel.id);
    const direction = index < current.length - 1 ? 1 : -1;
    while (token === tour.current) {
      const next = current[index + direction];
      if (!next) break;
      const arrived = await atlas.flyTo(next.id);
      if (!arrived || token !== tour.current) break;
      index += direction;
      const words = tr(next.hook).length + tr(next.compare).length;
      const dwell = Math.min(13000, Math.max(5500, 2500 + words * 38));
      for (let waited = 0; waited < dwell && token === tour.current; waited += 100)
        await sleep(100);
    }
    if (token === tour.current) setTouring(false);
  }, [atlas]);

  const toggleTour = useCallback(() => {
    if (touring) stopTour();
    else void runTour();
  }, [touring, stopTour, runTour]);

  /* Keyboard shortcuts. */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (event.defaultPrevented || target.closest("input, textarea, select") || event.metaKey || event.ctrlKey || event.altKey)
        return;
      // The scale ruler handles its own arrow keys.
      if (target.getAttribute("role") === "slider" && event.key.startsWith("Arrow")) return;
      if (event.key === "Escape") {
        if (about) setAbout(false);
        else if (intro) setIntro(false);
        else stopTour();
        return;
      }
      if (about || intro || !atlas) return;
      if (["ArrowDown", "+", "=", "PageDown"].includes(event.key)) {
        event.preventDefault();
        stopTour();
        atlas.step(1);
      } else if (["ArrowUp", "-", "PageUp"].includes(event.key)) {
        event.preventDefault();
        stopTour();
        atlas.step(-1);
      } else if (event.key === " " && !target.closest("button, a")) {
        event.preventDefault();
        toggleTour();
      } else if (event.key === "Home") {
        event.preventDefault();
        fly(HOME_ID);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [atlas, about, intro, stopTour, toggleTour, fly]);

  const share = async () => {
    const url = shareUrl(nearest.id);
    try {
      if (navigator.share && compact) {
        await navigator.share({ title: tr(nearest.title), url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setToast(t("Link copied"));
    } catch {
      setToast(url);
    }
  };
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(timer);
  }, [toast]);

  const startFromIntro = (target: string | null, withTour: boolean) => {
    setIntro(false);
    try {
      localStorage.setItem("atlas-intro-seen", "1");
    } catch {
      /* Optional persistence. */
    }
    if (!atlas || !target) return;
    if (withTour) {
      void atlas.flyTo(target).then((arrived) => {
        if (arrived) void runTour();
      });
    } else void atlas.flyTo(target);
  };

  return (
    <div className="app" data-compact={compact || undefined} data-bare={start.bare || undefined}>
      <canvas
        ref={canvasRef}
        className="scene"
        data-atlas-scene=""
        role="img"
        aria-label={t("Interactive 3D view: {title}", { title: tr(nearest.title) })}
      />
      {failed && (
        <div className="fallback" role="alert">
          <LogoMark size={48} />
          <p>{t("Your browser cannot display 3D graphics, which this atlas needs.")}</p>
        </div>
      )}
      {!start.bare && (
        <>
          <Targets atlas={atlas} level={nearest} onFly={fly} />
          <header className="topbar">
            <button
              type="button"
              className="brand"
              data-action="intro"
              onClick={() => {
                stopTour();
                setIntro(true);
              }}
              aria-label={t("Show the introduction")}
              title={t("Show the introduction")}
            >
              <LogoMark size={compact ? 28 : 34} />
              <span className="brand-text">
                <b>Atlas</b>
                {!compact && <small>{t("From quarks to the cosmos")}</small>}
              </span>
            </button>
            <div className="topbar-actions">
              <LanguagePicker />
              {nearest.id !== HOME_ID && (
                <button type="button" className="icon-button" data-action="go-home" onClick={() => fly(HOME_ID)} aria-label={t("Back to the park")} title={t("Back to the park")}>
                  <House size={18} aria-hidden="true" />
                </button>
              )}
              <button type="button" className="icon-button" data-action="share" onClick={share} aria-label={t("Share this view")} title={t("Share this view")}>
                <Share2 size={18} aria-hidden="true" />
              </button>
              <button type="button" className="icon-button" data-action="about" onClick={() => setAbout(true)} aria-label={t("About Atlas")} title={t("About Atlas")}>
                <Info size={18} aria-hidden="true" />
              </button>
            </div>
          </header>
          <ScaleRuler atlas={atlas} path={path} nearest={nearest} visited={visited} onSelect={fly} />
          <LevelTip nearest={nearest} />
          <div className="dock" ref={cardRef}>
            <LevelCard level={nearest} compact={compact} />
            <Controls path={path} nearest={nearest} touring={touring} onFly={fly} onTour={toggleTour} />
          </div>
          {toast && (
            <div className="toast" role="status">
              <Check size={16} aria-hidden="true" />
              {toast}
            </div>
          )}
          {intro && <Intro onStart={startFromIntro} />}
          {about && <About onClose={() => setAbout(false)} />}
        </>
      )}
    </div>
  );
}
