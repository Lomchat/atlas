import { useEffect, useMemo, useRef } from "react";
import type { Atlas } from "../engine/Atlas";
import { t } from "../i18n";
import { LEVELS, homeZ } from "../levels";
import type { LevelData } from "../levels/types";
import { tr } from "../i18n";
import { formatLength, power } from "./format";
import { useLevelTip } from "./LevelTip";

interface Props {
  atlas: Atlas | null;
  path: readonly LevelData[];
  nearest: LevelData;
  visited: Set<string>;
  onSelect(id: string): void;
}

interface StopProps {
  level: LevelData;
  top: number;
  current: boolean;
  visited: boolean;
  onSelect(id: string): void;
}

function RulerStop({ level, top, current, visited, onSelect }: StopProps) {
  const tip = useLevelTip(level.id, "left");
  return (
    <button
      type="button"
      className="ruler-stop"
      data-level={level.id}
      data-current={current || undefined}
      data-visited={visited || undefined}
      style={{ top: `${top}%`, "--stop": level.theme.accent } as React.CSSProperties}
      aria-label={t("Go to {name}", { name: tr(level.short) })}
      onClick={() => onSelect(level.id)}
      {...tip}
    />
  );
}

/**
 * The permanent orientation device: every power of ten on the current path,
 * from the observable Universe at the top to the quark at the bottom.
 */
export default function ScaleRuler({ atlas, path, nearest, visited, onSelect }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<HTMLDivElement>(null);
  const bubbleRef = useRef<HTMLSpanElement>(null);
  const powerRef = useRef<HTMLSpanElement>(null);
  const homes = useMemo(() => path.map(homeZ), [path]);
  const top = homes[0] + 0.3;
  const bottom = homes[homes.length - 1] - 0.3;
  const position = (z: number) => ((top - z) / (top - bottom)) * 100;

  useEffect(() => {
    if (!atlas) return;
    let lastText = "";
    return atlas.onFrame(({ z }) => {
      const marker = markerRef.current;
      if (!marker) return;
      marker.style.top = `${Math.max(0, Math.min(100, position(z)))}%`;
      const text = formatLength(Math.pow(10, z));
      if (text !== lastText) {
        lastText = text;
        if (bubbleRef.current) bubbleRef.current.textContent = `≈ ${text}`;
        if (powerRef.current) powerRef.current.textContent = `${power(Math.round(z))} m`;
        trackRef.current?.setAttribute("aria-valuenow", String(Math.round(z)));
        trackRef.current?.setAttribute("aria-valuetext", text);
      }
    });
  }, [atlas, top, bottom]);

  const ticks = [];
  for (let e = Math.ceil(bottom); e <= Math.floor(top); e++) ticks.push(e);

  const gradient = path
    .map((level, k) => `${level.theme.accent} ${position(homes[k]).toFixed(2)}%`)
    .join(", ");

  const scrub = (event: React.PointerEvent<HTMLDivElement>) => {
    const track = trackRef.current;
    if (!track || !atlas) return;
    const rect = track.getBoundingClientRect();
    const fraction = (event.clientY - rect.top) / rect.height;
    atlas.scrubTo(top - fraction * (top - bottom));
  };

  const found = LEVELS.filter((level) => visited.has(level.id)).length;

  return (
    <nav className="ruler" aria-label={t("Scale of the view")}>
      <div
        ref={trackRef}
        className="ruler-track"
        role="slider"
        tabIndex={0}
        aria-label={t("Scale of the view")}
        aria-orientation="vertical"
        aria-valuemin={Math.round(bottom)}
        aria-valuemax={Math.round(top)}
        onPointerDown={(event) => {
          if ((event.target as HTMLElement).closest("button")) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          scrub(event);
        }}
        onPointerMove={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) scrub(event);
        }}
        onKeyDown={(event) => {
          // Keys on the stops themselves are handled globally.
          if (!atlas || event.target !== event.currentTarget) return;
          if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
            event.preventDefault();
            atlas.step(-1);
          } else if (event.key === "ArrowDown" || event.key === "ArrowRight") {
            event.preventDefault();
            atlas.step(1);
          }
        }}
      >
        <div className="ruler-line" style={{ background: `linear-gradient(to bottom, ${gradient})` }} />
        {ticks.map((e) => (
          <div
            key={e}
            className={e % 3 === 0 ? "ruler-tick major" : "ruler-tick"}
            style={{ top: `${position(e)}%` }}
          >
            {e % 3 === 0 && <span>{power(e)}</span>}
          </div>
        ))}
        {path.map((level, k) => (
          <RulerStop
            key={level.id}
            level={level}
            top={position(homes[k])}
            current={level.id === nearest.id}
            visited={visited.has(level.id)}
            onSelect={onSelect}
          />
        ))}
        <div ref={markerRef} className="ruler-marker" aria-hidden="true">
          <span className="ruler-bubble">
            <span ref={powerRef} className="ruler-power" />
            <span ref={bubbleRef} className="ruler-size" />
          </span>
        </div>
      </div>
      <p className="ruler-count" title={t("Places discovered")}>
        {t("{found}/{total}", { found, total: LEVELS.length })}
      </p>
    </nav>
  );
}
