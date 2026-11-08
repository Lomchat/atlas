import { Cpu, Orbit } from "lucide-react";
import { t, useLocale } from "../i18n";
import type { MessageKey } from "../i18n";
import type { Section } from "./url";

const SECTIONS: { id: Section; name: MessageKey; hint: MessageKey; Icon: typeof Orbit }[] = [
  { id: "atlas", name: "Universe", hint: "From quarks to the cosmos", Icon: Orbit },
  { id: "computing", name: "Computing", hint: "From bits to AI", Icon: Cpu },
];

/** The two sections of the app, side by side at the top left. */
export default function SectionSwitch({ section, onChange }: { section: Section; onChange(section: Section): void }) {
  useLocale();
  return (
    <nav className="section-switch" aria-label={t("Sections")}>
      {SECTIONS.map(({ id, name, hint, Icon }) => (
        <button
          key={id}
          type="button"
          data-section-switch={id}
          aria-pressed={section === id}
          aria-label={t(name)}
          title={t(hint)}
          onClick={() => onChange(id)}
        >
          <Icon size={17} strokeWidth={2.5} aria-hidden="true" />
          <span className="section-switch-text">{t(name)}</span>
        </button>
      ))}
    </nav>
  );
}
