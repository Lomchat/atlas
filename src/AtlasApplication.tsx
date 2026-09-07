import { lazy, Suspense, useEffect, useState } from "react";
import { t } from "./i18n";
const App = lazy(() => import("./App"));
import WorldAtlas from "./world/WorldAtlas";
const laboratory = () =>
  location.pathname.startsWith("/lab") ||
  (!new URLSearchParams(location.search).has("world") &&
    /[?&](focus|molecule)=/.test(location.search));
export default function AtlasApplication() {
  const [lab, setLab] = useState(laboratory);
  useEffect(() => {
    const pop = () => setLab(laboratory());
    window.addEventListener("popstate", pop);
    return () => window.removeEventListener("popstate", pop);
  }, []);
  const open = (next: boolean) => {
    const url = new URL(location.href);
    url.pathname = next ? "/lab" : "/";
    const lang = url.searchParams.get("lang");
    url.search = "";
    if (lang) url.searchParams.set("lang", lang);
    if (!next) url.searchParams.set("world", "world");
    history.pushState(null, "", url);
    setLab(next);
  };
  return lab ? (
    <Suspense
      fallback={
        <div className="world-loading">
          {t("Opening the molecular laboratory…")}
        </div>
      }
    >
      <App onWorld={() => open(false)} />
    </Suspense>
  ) : (
    <WorldAtlas onOpenMatter={() => open(true)} />
  );
}
