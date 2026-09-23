import { ArrowDown, ArrowUp, MapPin } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useSyncExternalStore } from "react";
import type React from "react";
import { getLocale, t, tr, useLocale } from "../i18n";
import { byId } from "../levels";
import type { LevelData } from "../levels/types";
import { formatLength, magnitude, power } from "./format";
import { JourneyIcon } from "./icons";

/**
 * A small preview of where a zoom control leads: what the place is, what it
 * does there, how big it is and how far the zoom goes. Shown on mouse hover,
 * keyboard focus, or a long press on touch screens.
 */

type Side = "top" | "left";
interface Tip {
  id: string;
  anchor: HTMLElement;
  side: Side;
  /** Increases with every new preview, so each one plays its entrance. */
  serial: number;
}

let current: Tip | null = null;
let serial = 0;
const listeners = new Set<() => void>();
function show(next: Omit<Tip, "serial"> | null) {
  if (!next && !current) return;
  if (next && current && next.id === current.id && next.anchor === current.anchor) return;
  current = next ? { ...next, serial: ++serial } : null;
  listeners.forEach((listener) => listener());
}
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => void listeners.delete(listener);
};
const snapshot = () => current;
export const hideLevelTip = () => show(null);

const TIP_ID = "level-tip";

/** Props to spread on a button that zooms to `id`. */
export function useLevelTip(id: string | undefined, side: Side = "top") {
  const tip = useSyncExternalStore(subscribe, snapshot);
  const self = useRef<HTMLElement | null>(null);
  const pressTimer = useRef(0);
  const longPressed = useRef(false);
  useEffect(
    () => () => {
      window.clearTimeout(pressTimer.current);
      if (current && current.anchor === self.current) show(null);
    },
    [],
  );
  if (!id) return {};
  const open = (anchor: HTMLElement) => {
    self.current = anchor;
    show({ id, anchor, side });
  };
  const close = () => {
    if (current && current.anchor === self.current) show(null);
  };
  return {
    "aria-describedby": tip && tip.id === id && tip.anchor === self.current ? TIP_ID : undefined,
    onPointerEnter(event: React.PointerEvent<HTMLElement>) {
      if (event.pointerType === "mouse") open(event.currentTarget);
    },
    onPointerLeave: close,
    onFocus(event: React.FocusEvent<HTMLElement>) {
      if (event.currentTarget.matches(":focus-visible")) open(event.currentTarget);
    },
    onBlur: close,
    onPointerDown(event: React.PointerEvent<HTMLElement>) {
      if (event.pointerType === "mouse") return;
      longPressed.current = false;
      const anchor = event.currentTarget;
      window.clearTimeout(pressTimer.current);
      pressTimer.current = window.setTimeout(() => {
        longPressed.current = true;
        open(anchor);
      }, 450);
    },
    onPointerUp: () => window.clearTimeout(pressTimer.current),
    onPointerCancel: () => window.clearTimeout(pressTimer.current),
    onClickCapture(event: React.MouseEvent<HTMLElement>) {
      // A long press only previews: it must not also zoom.
      if (longPressed.current) {
        longPressed.current = false;
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      close();
    },
    onContextMenu(event: React.MouseEvent<HTMLElement>) {
      if (event.nativeEvent instanceof PointerEvent && event.nativeEvent.pointerType === "mouse") return;
      event.preventDefault();
    },
  };
}

function factorText(factor: number) {
  if (factor < 9999.5) {
    const digits = Math.max(0, Math.floor(Math.log10(factor)) - 1);
    const rounded = Math.round(factor / 10 ** digits) * 10 ** digits;
    return `×${new Intl.NumberFormat(getLocale()).format(rounded)}`;
  }
  return `×${power(Math.round(Math.log10(factor)))}`;
}

/** The single tooltip element, positioned next to its anchor. */
export function LevelTip({ nearest }: { nearest: LevelData }) {
  useLocale();
  const tip = useSyncExternalStore(subscribe, snapshot);
  const ref = useRef<HTMLDivElement>(null);

  // A new place on screen makes every preview obsolete.
  useEffect(() => hideLevelTip(), [nearest.id]);

  // Follow the anchor (floating labels move with the scene).
  useLayoutEffect(() => {
    if (!tip) return;
    let frame = 0;
    const place = () => {
      const node = ref.current;
      if (!node) return;
      if (!tip.anchor.isConnected) return hideLevelTip();
      const a = tip.anchor.getBoundingClientRect();
      const w = node.offsetWidth;
      const h = node.offsetHeight;
      const margin = 10;
      let x: number;
      let y: number;
      let side: string = tip.side;
      if (side === "left" && a.left - w - 14 < margin) side = "top";
      if (side === "left") {
        x = a.left - w - 14;
        y = a.top + a.height / 2 - h / 2;
      } else {
        x = a.left + a.width / 2 - w / 2;
        y = a.top - h - 12;
        if (y < margin) {
          y = a.bottom + 12;
          side = "bottom";
        }
      }
      x = Math.max(margin, Math.min(window.innerWidth - w - margin, x));
      y = Math.max(margin, Math.min(window.innerHeight - h - margin, y));
      node.style.left = `${Math.round(x)}px`;
      node.style.top = `${Math.round(y)}px`;
      const arrow = Math.round(side === "left" ? a.top + a.height / 2 - y : a.left + a.width / 2 - x);
      node.style.setProperty("--arrow", `${arrow}px`);
      if (!node.dataset.placed) {
        // Grow out of the control: scale from the tip of the arrow, which touches it.
        node.dataset.side = side;
        node.style.setProperty(
          "--origin",
          side === "left" ? `calc(100% + 8px) ${arrow}px` : side === "bottom" ? `${arrow}px -8px` : `${arrow}px calc(100% + 8px)`,
        );
        node.dataset.placed = "1";
      }
      frame = requestAnimationFrame(place);
    };
    place();
    return () => cancelAnimationFrame(frame);
  }, [tip]);

  // Touch previews close on the next touch elsewhere, or by themselves.
  useEffect(() => {
    if (!tip) return;
    const away = (event: PointerEvent) => {
      if (!tip.anchor.contains(event.target as Node)) hideLevelTip();
    };
    const timer = window.setTimeout(hideLevelTip, 6000);
    window.addEventListener("pointerdown", away, true);
    window.addEventListener("keydown", hideLevelTip, true);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointerdown", away, true);
      window.removeEventListener("keydown", hideLevelTip, true);
    };
  }, [tip]);

  if (!tip) return null;
  const level = byId.get(tip.id);
  if (!level) return null;
  const factor = nearest.size / level.size;
  const here = level.id === nearest.id;
  const inward = factor > 1;
  const size = level.sizeText ? tr(level.sizeText) : `≈ ${formatLength(level.size)}`;
  return (
    <div
      ref={ref}
      id={TIP_ID}
      role="tooltip"
      className="level-tip"
      key={tip.serial}
      style={{ "--tip": level.theme.accent } as React.CSSProperties}
    >
      <p className="level-tip-head">
        <JourneyIcon journey={level.journey} size={16} />
        <b>{tr(level.title)}</b>
        <span className="level-tip-power">{magnitude(level.size)}</span>
      </p>
      <p className="level-tip-teaser">{tr(level.teaser)}</p>
      <p className="level-tip-zoom">
        {here ? (
          <MapPin size={14} strokeWidth={2.6} aria-hidden="true" />
        ) : inward ? (
          <ArrowDown size={14} strokeWidth={2.6} aria-hidden="true" />
        ) : (
          <ArrowUp size={14} strokeWidth={2.6} aria-hidden="true" />
        )}
        <span>
          {here
            ? t("You are here")
            : inward
              ? t("Zoom in {factor}", { factor: factorText(factor) })
              : t("Zoom out {factor}", { factor: factorText(1 / factor) })}
          {" · "}
          {size}
        </span>
      </p>
    </div>
  );
}
