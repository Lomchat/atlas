import type { ReactNode } from "react";
import { getLocale, useLocale } from "../../i18n";
import { Store, useStore } from "../store";
import type { LessonUi } from "./lessons/types";

const NONE = new Store<object>({});

/** Fills `{name}` placeholders with values drawn as coloured variables. */
export function fill(text: string, vars: Record<string, string | number> | null): ReactNode[] {
  return text.split(/(\{\w+\})/g).map((part, k) => {
    const name = /^\{(\w+)\}$/.exec(part)?.[1];
    if (!name || !vars || !(name in vars)) return part;
    const value = String(vars[name]);
    return (
      <span key={`${k}:${value}`} className="cs-var" data-var={name}>
        {value}
      </span>
    );
  });
}

/**
 * A step's worked example, following the visitor's changes: the parts they
 * can change are coloured like the controls of the "Your turn!" panel.
 */
export function LiveText({ text, ui, step, store }: { text: string; ui: LessonUi | undefined; step: string; store: Store<object> | null }) {
  useLocale();
  const state = useStore(store ?? NONE);
  const vars = ui?.vars && store ? ui.vars(step, state, getLocale()) : null;
  return <>{fill(text, vars)}</>;
}
