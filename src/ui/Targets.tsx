import { ArrowDown, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Atlas } from "../engine/Atlas";
import { t, tr, useLocale } from "../i18n";
import { childrenOf } from "../levels";
import type { LevelData } from "../levels/types";
import { useLevelTip } from "./LevelTip";
import { JourneyIcon } from "./icons";

interface Props {
  atlas: Atlas | null;
  level: LevelData;
  onFly(id: string): void;
}

function ChildLabel({ child, onFly }: { child: LevelData; onFly(id: string): void }) {
  const tip = useLevelTip(child.id);
  return (
    <button
      type="button"
      className="target-label"
      data-level={child.id}
      aria-label={t("Dive into {name}", { name: tr(child.short) })}
      onClick={() => onFly(child.id)}
      {...tip}
    >
      <JourneyIcon journey={child.journey} size={14} />
      <span>{tr(child.short)}</span>
      <ArrowDown size={14} strokeWidth={2.8} aria-hidden="true" />
    </button>
  );
}

/**
 * Labels floating over the 3D scene: what you can dive into (children) and
 * small points of curiosity (hotspots). Positioned every frame without React.
 */
export default function Targets({ atlas, level, onFly }: Props) {
  useLocale();
  const nodes = useRef(new Map<string, HTMLElement>());
  const [open, setOpen] = useState<string | null>(null);
  // Open the popover towards the middle of the screen.
  const [flip, setFlip] = useState({ x: false, y: false });
  const children = childrenOf(level.id);
  const hotspots = level.hotspots ?? [];

  useEffect(() => setOpen(null), [level.id]);

  useEffect(() => {
    if (!atlas) return;
    return atlas.onFrame(({ targets, hovered }) => {
      for (const target of targets) {
        const node = nodes.current.get(`${target.kind}:${target.id}`);
        if (!node) continue;
        node.style.transform = `translate3d(${target.x.toFixed(1)}px, ${target.y.toFixed(1)}px, 0)`;
        node.style.setProperty("--r", `${Math.min(target.r, 400).toFixed(1)}px`);
        const visible = target.visible ? "1" : "0";
        if (node.dataset.visible !== visible) node.dataset.visible = visible;
        const hover = hovered === target.id ? "1" : "0";
        if (node.dataset.hover !== hover) node.dataset.hover = hover;
      }
    });
  }, [atlas]);

  const register = (key: string) => (node: HTMLElement | null) => {
    if (node) nodes.current.set(key, node);
    else nodes.current.delete(key);
  };

  return (
    <div className="targets" key={level.id}>
      {children.map((child) => (
        <div
          key={child.id}
          ref={register(`child:${child.id}`)}
          className="target target-child"
          data-visible="0"
          data-small={child.size / level.size < 0.08 || undefined}
        >
          <span className="target-ring" aria-hidden="true" />
          <ChildLabel child={child} onFly={onFly} />
        </div>
      ))}
      {hotspots.map((hotspot) => (
        <div
          key={hotspot.id}
          ref={register(`hotspot:${hotspot.id}`)}
          className="target target-hotspot"
          data-visible="0"
          data-open={open === hotspot.id || undefined}
          data-flip-x={(open === hotspot.id && flip.x) || undefined}
          data-flip-y={(open === hotspot.id && flip.y) || undefined}
        >
          <button
            type="button"
            className="hotspot-dot"
            data-hotspot={hotspot.id}
            aria-expanded={open === hotspot.id}
            aria-label={tr(hotspot.label)}
            onClick={(event) => {
              const rect = event.currentTarget.getBoundingClientRect();
              setFlip({ x: rect.left > window.innerWidth * 0.5, y: rect.top > window.innerHeight * 0.5 });
              setOpen(open === hotspot.id ? null : hotspot.id);
            }}
          >
            <span aria-hidden="true">+</span>
          </button>
          {open === hotspot.id && (
            <div className="hotspot-popover" role="dialog" aria-label={tr(hotspot.label)}>
              <button
                type="button"
                className="hotspot-close"
                aria-label={t("Close")}
                onClick={() => setOpen(null)}
              >
                <X size={14} aria-hidden="true" />
              </button>
              <strong>{tr(hotspot.label)}</strong>
              <p>{tr(hotspot.text)}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
