import { useCallback, useEffect, useRef } from "react";
import type { Stage } from "../Stage";

interface Entry {
  node: HTMLElement;
  anchor: string;
}

/**
 * Pins HTML elements on named points of the 3D scene. Positions are written
 * every frame without React: `left/top` stay at 0 and the element is moved
 * with a transform; `--px` holds the CSS pixels per local unit of the anchor
 * (to size a hit area like the object below it) and `data-visible` follows
 * the anchor's visibility.
 *
 *   const pin = useAnchors(stage);
 *   <div ref={pin("bit-3", "lamp-3")} className="cs-anchor">…</div>
 */
export function useAnchors(stage: Stage | null) {
  const entries = useRef(new Map<string, Entry>());

  useEffect(() => {
    if (!stage) return;
    return stage.onFrame(({ anchors }) => {
      for (const { node, anchor } of entries.current.values()) {
        const state = anchors.get(anchor);
        const visible = state?.visible ? "1" : "0";
        if (state) {
          node.style.transform = `translate3d(${state.x.toFixed(1)}px, ${state.y.toFixed(1)}px, 0)`;
          node.style.setProperty("--px", `${state.px.toFixed(2)}px`);
        }
        if (node.dataset.visible !== visible) node.dataset.visible = visible;
      }
    });
  }, [stage]);

  return useCallback(
    (key: string, anchor: string) => (node: HTMLElement | null) => {
      if (node) entries.current.set(key, { node, anchor });
      else entries.current.delete(key);
    },
    [],
  );
}
