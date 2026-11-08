import { Check, House, Info, LayoutGrid, Share2 } from "lucide-react";
import { Suspense, lazy, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type * as THREE from "three";
import { Atlas } from "./engine/Atlas";
import { createRenderer } from "./engine/renderer";
import { setDocumentText, t, tr, useLocale } from "./i18n";
import { HOME_ID, level as levelById, pathThrough } from "./levels";
import type { LevelData } from "./levels/types";
import About from "./ui/About";
import Controls from "./ui/Controls";
import Intro from "./ui/Intro";
import LanguagePicker from "./ui/LanguagePicker";
import LevelCard from "./ui/LevelCard";
import ScaleRuler from "./ui/ScaleRuler";
import SectionSwitch from "./ui/SectionSwitch";
import Targets from "./ui/Targets";
import { LevelTip } from "./ui/LevelTip";
import { LogoMark } from "./ui/icons";
import { readStart, shareLessonUrl, shareUrl, writeLevel } from "./ui/url";
import type { ComputingPlace, Section } from "./ui/url";
import { markVisited, useVisited } from "./ui/visited";

/** The computing section is loaded the first time it is opened. */
const Computing = lazy(() => import("./computing/Computing"));

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
  const [section, setSection] = useState<Section>(start.section);
  const [computingOpened, setComputingOpened] = useState(start.section === "computing");
  const [place, setPlace] = useState<ComputingPlace>({ lesson: start.lesson, step: start.step });
  const [computingTitle, setComputingTitle] = useState("");
  const [renderer, setRenderer] = useState<THREE.WebGLRenderer | null>(null);
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

  /* Engine lifecycle: one renderer for the whole visit, shared by both sections. */
  useEffect(() => {
    const canvas = canvasRef.current!;
    let shared: THREE.WebGLRenderer;
    let engine: Atlas;
    try {
      shared = createRenderer(canvas, { preserveDrawingBuffer: start.freeze !== undefined });
      engine = new Atlas(canvas, {
        renderer: shared,
        active: start.section === "atlas",
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
    setRenderer(shared);
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
      shared.dispose();
      setAtlas(null);
      setRenderer(null);
    };
  }, [start]);

  useEffect(() => atlas?.setReducedMotion(reducedMotion), [atlas, reducedMotion]);
  useEffect(() => atlas?.setActive(section === "atlas"), [atlas, section]);
  useEffect(() => {
    if (section === "computing")
      setDocumentText(
        "Atlas — From bits to AI",
        "Step-by-step animated lessons on how computers work: bits, logic gates, secret keys, neural networks and language models.",
      );
    else
      setDocumentText(
        "Atlas — From quarks to the cosmos",
        "Zoom through every power of ten, from quarks to the observable Universe, in playful 3D.",
      );
  }, [section]);

  const switchSection = useCallback(
    (next: Section) => {
      if (next === section) return;
      tour.current++;
      setTouring(false);
      setIntro(false);
      if (next === "computing") setComputingOpened(true);
      setSection(next);
    },
    [section],
  );

  /* Address bar, discoveries and theme follow the level being viewed. */
  useEffect(() => {
    if (section !== "atlas") return;
    writeLevel(nearest.id);
    markVisited(nearest.id);
    const root = document.documentElement.style;
    root.setProperty("--accent", nearest.theme.accent);
    root.setProperty("--theme-top", nearest.theme.top);
    root.setProperty("--theme-bottom", nearest.theme.bottom);
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", nearest.theme.top);
  }, [nearest, locale, section]);

  /* Keep the subject clear of the panels. */
  useLayoutEffect(() => {
    if (!atlas || section !== "atlas") return;
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
  }, [atlas, compact, start.bare, section]);

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
      if (about || intro || !atlas || section !== "atlas") return;
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
  }, [atlas, about, intro, stopTour, toggleTour, fly, section]);

  const share = async () => {
    const url = section === "atlas" ? shareUrl(nearest.id) : shareLessonUrl(place.lesson, place.step);
    const title = section === "atlas" ? tr(nearest.title) : computingTitle;
    try {
      if (navigator.share && compact) {
        await navigator.share({ title, url });
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

  const inAtlas = section === "atlas";
  const sceneTitle = inAtlas ? tr(nearest.title) : computingTitle || t("From bits to AI");
  return (
    <div className="app" data-compact={compact || undefined} data-bare={start.bare || undefined} data-section={section}>
      <canvas
        ref={canvasRef}
        className="scene"
        data-atlas-scene=""
        data-section={section}
        role="img"
        aria-label={t("Interactive 3D view: {title}", { title: sceneTitle })}
      />
      {failed && (
        <div className="fallback" role="alert">
          <LogoMark size={48} />
          <p>{t("Your browser cannot display 3D graphics, which this atlas needs.")}</p>
        </div>
      )}
      {computingOpened && !failed && (
        <Suspense fallback={null}>
          <Computing
            active={!inAtlas}
            renderer={renderer}
            canvas={canvasRef.current}
            freeze={start.freeze}
            bare={start.bare}
            compact={compact}
            reducedMotion={reducedMotion}
            blocked={about}
            place={place}
            onNavigate={setPlace}
            onTitle={setComputingTitle}
          />
        </Suspense>
      )}
      {!start.bare && (
        <>
          {inAtlas && <Targets atlas={atlas} level={nearest} onFly={fly} />}
          <header className="topbar">
            <div className="topbar-start">
              <button
                type="button"
                className="brand"
                data-action="intro"
                onClick={() => {
                  stopTour();
                  if (inAtlas) setIntro(true);
                  else setPlace({ lesson: null, step: null });
                }}
                aria-label={inAtlas ? t("Show the introduction") : t("Back to the chapters")}
                title={inAtlas ? t("Show the introduction") : t("Back to the chapters")}
              >
                <LogoMark size={compact ? 28 : 34} />
                <span className="brand-text">
                  <b>Atlas</b>
                  {!compact && <small>{inAtlas ? t("From quarks to the cosmos") : t("From bits to AI")}</small>}
                </span>
              </button>
              <SectionSwitch section={section} onChange={switchSection} />
            </div>
            <div className="topbar-actions">
              <LanguagePicker />
              {inAtlas && nearest.id !== HOME_ID && (
                <button type="button" className="icon-button" data-action="go-home" onClick={() => fly(HOME_ID)} aria-label={t("Back to the park")} title={t("Back to the park")}>
                  <House size={18} aria-hidden="true" />
                </button>
              )}
              {!inAtlas && place.lesson && (
                <button
                  type="button"
                  className="icon-button"
                  data-action="go-chapters"
                  onClick={() => setPlace({ lesson: null, step: null })}
                  aria-label={t("Back to the chapters")}
                  title={t("Back to the chapters")}
                >
                  <LayoutGrid size={18} aria-hidden="true" />
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
          {inAtlas && (
            <>
              <ScaleRuler atlas={atlas} path={path} nearest={nearest} visited={visited} onSelect={fly} />
              <LevelTip nearest={nearest} />
              <div className="dock" ref={cardRef}>
                <LevelCard level={nearest} compact={compact} />
                <Controls path={path} nearest={nearest} touring={touring} onFly={fly} onTour={toggleTour} />
              </div>
            </>
          )}
          {toast && (
            <div className="toast" role="status">
              <Check size={16} aria-hidden="true" />
              {toast}
            </div>
          )}
          {intro && inAtlas && <Intro onStart={startFromIntro} />}
          {about && <About onClose={() => setAbout(false)} />}
        </>
      )}
    </div>
  );
}
