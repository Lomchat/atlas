import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import { t, useLocale } from "../i18n";
import { LogoMark } from "./icons";

export default function About({ onClose }: { onClose(): void }) {
  useLocale();
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => close.current?.focus(), []);
  return (
    <div
      className="dialog-backdrop"
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="about-title">
        <button ref={close} type="button" className="dialog-close" aria-label={t("Close")} onClick={onClose}>
          <X size={18} aria-hidden="true" />
        </button>
        <header className="dialog-header">
          <LogoMark size={40} />
          <h2 id="about-title">{t("About Atlas")}</h2>
        </header>
        <p>
          {t(
            "Atlas is a journey through every scale of matter and space, from quarks to the observable Universe. It pays tribute to the film Powers of Ten by Charles and Ray Eames (1977).",
          )}
        </p>
        <h3>{t("How to explore")}</h3>
        <ul className="dialog-keys">
          <li>{t("Scroll, pinch or use the arrows to zoom through the scales.")}</li>
          <li>{t("Click or tap a floating label to dive into that object.")}</li>
          <li>{t("Drag to look around. The ruler on the right shows where you are and takes you anywhere.")}</li>
          <li>{t("Keyboard: ↓ or + to dive, ↑ or − to zoom out, Space for the guided tour, Home to return to the park.")}</li>
        </ul>
        <h3>{t("What the pictures show")}</h3>
        <p>
          {t(
            "The sizes are real. The shapes are simplified and the colours are chosen to be easy to read: at the smallest scales, objects do not have colours in the everyday sense. Electrons, quarks and gluons are drawn symbolically.",
          )}
        </p>
        <p>
          {t("When a view enlarges something to make it visible, such as the planets, its card says so.")}{" "}
          {t("Each place cites a source at the bottom of its card.")}
        </p>
        <h3>{t("Credits")}</h3>
        <p>
          {t(
            "Built with three.js and React. Icons by Lucide. Fonts: Fredoka and Nunito, under the SIL Open Font License.",
          )}{" "}
          <a href="/licenses/index.html" target="_blank" rel="noreferrer">
            {t("Licences")}
          </a>
        </p>
      </div>
    </div>
  );
}
