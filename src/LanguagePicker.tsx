import { setLocale, t, useLocale } from "./i18n";
import type { Locale } from "./i18n";

function Flag({ locale }: { locale: Locale }) {
  return (
    <svg
      viewBox="0 0 30 20"
      width="21"
      height="14"
      aria-hidden="true"
      data-language-flag={locale}
    >
      {locale === "fr" ? (
        <>
          <path fill="#002395" d="M0 0h10v20H0z" />
          <path fill="#fff" d="M10 0h10v20H10z" />
          <path fill="#ed2939" d="M20 0h10v20H20z" />
        </>
      ) : (
        <>
          <path fill="#012169" d="M0 0h30v20H0z" />
          <path stroke="#fff" strokeWidth="5" d="m0 0 30 20M30 0 0 20" />
          <path stroke="#c8102e" strokeWidth="2" d="m0 0 30 20M30 0 0 20" />
          <path stroke="#fff" strokeWidth="7" d="M15 0v20M0 10h30" />
          <path stroke="#c8102e" strokeWidth="4" d="M15 0v20M0 10h30" />
        </>
      )}
    </svg>
  );
}
export default function LanguagePicker() {
  const locale = useLocale();
  return (
    <label className="language-picker">
      <Flag locale={locale} />
      <select
        data-language-switch
        aria-label={t("Choose language")}
        value={locale}
        onChange={(event) => setLocale(event.target.value as Locale)}
      >
        <option value="en" lang="en">
          English
        </option>
        <option value="fr" lang="fr">
          Français
        </option>
      </select>
    </label>
  );
}
