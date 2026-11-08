/**
 * The computing section: a chapter map (a floating circuit board) and
 * step-by-step lessons drawn in the same illustrated style as the Atlas.
 * Loaded on demand; it shares the app's canvas and renderer.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type * as THREE from "three";
import { t, tr, useLocale } from "../i18n";
import type { ComputingPlace } from "../ui/url";
import { writeLesson } from "../ui/url";
import { COMPUTING_HOME, isReady, lessonById, nextLesson, stepIndex, stepTheme } from "./index";
import type { LessonData } from "./types";
import { Stage } from "./Stage";
import type { Store } from "./store";
import ChapterBanner from "./ui/ChapterBanner";
import MapPanel from "./ui/MapPanel";
import { StationLabels, StepLabels } from "./ui/SceneLabels";
import StepPanel from "./ui/StepPanel";
import StepRail from "./ui/StepRail";
import { LESSON_UI } from "./ui/lessons";
import "./computing.css";

interface Props {
  active: boolean;
  renderer: THREE.WebGLRenderer | null;
  canvas: HTMLCanvasElement | null;
  freeze?: number;
  bare: boolean;
  compact: boolean;
  reducedMotion: boolean;
  /** A dialog is open over the section: keyboard shortcuts are off. */
  blocked: boolean;
  place: ComputingPlace;
  onNavigate(place: ComputingPlace): void;
  onTitle(title: string): void;
}

const SEEN_KEY = "atlas-computing-seen";

function readSeen() {
  try {
    return new Set<string>(JSON.parse(localStorage.getItem(SEEN_KEY) ?? "[]"));
  } catch {
    return new Set<string>();
  }
}

export default function Computing({
  active,
  renderer,
  canvas,
  freeze,
  bare,
  compact,
  reducedMotion,
  blocked,
  place,
  onNavigate,
  onTitle,
}: Props) {
  const locale = useLocale();
  const [stage, setStage] = useState<Stage | null>(null);
  const [touring, setTouring] = useState(false);
  const [seen, setSeen] = useState(readSeen);
  const [banner, setBanner] = useState<{ lesson: LessonData; previous: LessonData | null } | null>(null);
  const shownLesson = useRef<string | null | undefined>(undefined);
  const dockRef = useRef<HTMLDivElement>(null);
  const stores = useRef(new Map<string, Store<object>>());

  const lesson = useMemo(() => {
    const found = lessonById.get(place.lesson ?? "");
    return found && isReady(found) ? found : null;
  }, [place.lesson]);
  const index = lesson ? stepIndex(lesson, place.step) : 0;
  const step = lesson?.steps[index];
  const ui = lesson ? LESSON_UI[lesson.id] : undefined;
  let store: Store<object> | null = null;
  if (lesson && ui) {
    store = stores.current.get(lesson.id) ?? ui.createStore();
    stores.current.set(lesson.id, store);
  }
  const theme = lesson ? stepTheme(lesson, step) : COMPUTING_HOME.theme;

  /* Engine: created once, paused while the other section is on screen. */
  useEffect(() => {
    if (!renderer || !canvas) return;
    const engine = new Stage(canvas, {
      renderer,
      reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
      freezeTime: freeze,
    });
    setStage(engine);
    return () => {
      engine.dispose();
      setStage(null);
    };
  }, [renderer, canvas, freeze]);
  useEffect(() => stage?.setActive(active), [stage, active]);
  useEffect(() => stage?.setReducedMotion(reducedMotion), [stage, reducedMotion]);
  useEffect(() => {
    if (!stage) return;
    stage.show(lesson ? lesson.scene : COMPUTING_HOME.scene, store);
    stage.setStep(index, theme);
  }, [stage, lesson, index, store, theme]);

  /* Address bar, title, colours and progress follow the step on screen. */
  useEffect(() => {
    if (!active) return;
    const lessonId = lesson?.id ?? null;
    const stepId = step?.id ?? null;
    if (lessonId !== place.lesson || stepId !== place.step) onNavigate({ lesson: lessonId, step: stepId });
    else writeLesson(lessonId, stepId);
  }, [active, lesson, step, place, onNavigate, locale]);
  useEffect(() => {
    if (!active) return;
    onTitle(lesson && step ? `${tr(lesson.title)} · ${tr(step.title)}` : t("From bits to AI"));
    const root = document.documentElement.style;
    root.setProperty("--accent", theme.accent);
    root.setProperty("--theme-top", theme.top);
    root.setProperty("--theme-bottom", theme.bottom);
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme.top);
  }, [active, lesson, step, theme, onTitle, locale]);
  useEffect(() => {
    if (!active || !lesson || !step) return;
    const key = `${lesson.id}:${step.id}`;
    setSeen((previous) => {
      if (previous.has(key)) return previous;
      const next = new Set(previous).add(key);
      try {
        localStorage.setItem(SEEN_KEY, JSON.stringify([...next]));
      } catch {
        /* Optional persistence. */
      }
      return next;
    });
  }, [active, lesson, step]);

  /* A title card whenever a new chapter opens, so it never looks like just another step. */
  useEffect(() => {
    if (!active) return setBanner(null);
    const id = lesson?.id ?? null;
    const before = shownLesson.current;
    shownLesson.current = id;
    if (!lesson || id === before || freeze !== undefined || bare) return;
    const previous = before ? (lessonById.get(before) ?? null) : null;
    setBanner({ lesson, previous: previous && previous.number < lesson.number ? previous : null });
  }, [active, lesson, freeze, bare]);
  const closeBanner = useCallback(() => setBanner(null), []);

  /* Keep the subject clear of the panels. */
  useLayoutEffect(() => {
    if (!stage || !active) return;
    const update = () => {
      const dock = dockRef.current?.getBoundingClientRect();
      const width = window.innerWidth;
      if (bare || !dock) stage.setSafeArea({ left: 0, right: 0, top: 0, bottom: 0 });
      else if (compact) {
        const height = window.innerHeight - dock.top;
        document.documentElement.style.setProperty("--dock-height", `${height}px`);
        const landscape = window.innerWidth > window.innerHeight && window.innerHeight <= 520;
        stage.setSafeArea(
          landscape
            ? { left: dock.right + 8, right: 12, top: 56, bottom: 8 }
            : { left: 8, right: 8, top: 64, bottom: height + 8 },
        );
      } else {
        stage.setSafeArea({
          left: Math.min(dock.right + 16, width * 0.42),
          right: lesson ? 72 : 24,
          top: 80,
          bottom: 28,
        });
      }
    };
    update();
    const observer = new ResizeObserver(update);
    if (dockRef.current) observer.observe(dockRef.current);
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [stage, active, compact, bare, lesson]);

  /* Navigation. */
  const stopTour = useCallback(() => setTouring(false), []);
  const openLesson = useCallback(
    (target: LessonData) => {
      setTouring(false);
      onNavigate({ lesson: target.id, step: target.steps[0]?.id ?? null });
    },
    [onNavigate],
  );
  const toMap = useCallback(() => {
    setTouring(false);
    onNavigate({ lesson: null, step: null });
  }, [onNavigate]);
  const goStep = useCallback(
    (k: number, fromTour = false) => {
      if (!lesson) return;
      if (!fromTour) setTouring(false);
      const clamped = Math.max(0, Math.min(lesson.steps.length - 1, k));
      onNavigate({ lesson: lesson.id, step: lesson.steps[clamped].id });
    },
    [lesson, onNavigate],
  );

  /* Guided reading: each step stays long enough to read it. */
  useEffect(() => {
    if (!touring || !active || !lesson || !step) return;
    const words = `${tr(step.text)} ${tr(step.example)}`.split(/\s+/).length;
    const dwell = Math.min(18000, Math.max(6000, 2000 + words * 230));
    const timer = setTimeout(() => {
      if (index + 1 < lesson.steps.length) goStep(index + 1, true);
      else setTouring(false);
    }, dwell);
    return () => clearTimeout(timer);
  }, [touring, active, lesson, step, index, goStep, locale]);
  useEffect(() => {
    if (!active) setTouring(false);
  }, [active]);

  /* Keyboard: arrows move between steps, Space plays, Home shows the map. */
  useEffect(() => {
    if (!active || blocked) return;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (event.defaultPrevented || target.closest("input, textarea, select") || event.metaKey || event.ctrlKey || event.altKey)
        return;
      if (event.key === "Escape") return stopTour();
      if (event.key === "Home" && lesson) {
        event.preventDefault();
        return toMap();
      }
      if (!lesson) return;
      if (["ArrowRight", "ArrowDown", "PageDown"].includes(event.key)) {
        event.preventDefault();
        if (index + 1 < lesson.steps.length) goStep(index + 1);
      } else if (["ArrowLeft", "ArrowUp", "PageUp"].includes(event.key)) {
        event.preventDefault();
        if (index > 0) goStep(index - 1);
      } else if (event.key === " " && !target.closest("button, a")) {
        event.preventDefault();
        setTouring((value) => !value);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, blocked, lesson, index, goStep, toMap, stopTour]);

  if (!active || bare) return null;
  return (
    <>
      {lesson && step ? (
        <>
          {step.labels && <StepLabels key={step.id} stage={stage} labels={step.labels} />}
          {ui && store && (
            <div className="cs-layer">
              <ui.Overlay stage={stage} step={step.id} store={store} />
            </div>
          )}
          {!compact && <StepRail lesson={lesson} index={index} seen={seen} onStep={goStep} />}
        </>
      ) : (
        <StationLabels stage={stage} onOpen={openLesson} />
      )}
      {banner && <ChapterBanner key={banner.lesson.id} lesson={banner.lesson} previous={banner.previous} onDone={closeBanner} />}
      <div className="dock cs-dock" ref={dockRef} data-view={lesson ? "lesson" : "map"}>
        {lesson ? (
          <StepPanel
            lesson={lesson}
            index={index}
            next={nextLesson(lesson)}
            compact={compact}
            touring={touring}
            ui={ui}
            store={store}
            onStep={goStep}
            onNextLesson={openLesson}
            onMap={toMap}
            onTour={() => setTouring((value) => !value)}
          />
        ) : (
          <MapPanel compact={compact} onOpen={openLesson} />
        )}
      </div>
    </>
  );
}
