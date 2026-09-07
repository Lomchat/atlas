import { Info } from "lucide-react";
import { t, useLocale } from "./i18n";
import { referenceAt, rulerAt } from "./physicalScale";
import type { SceneDetail } from "./continuum";

export default function SizeReference({
  detail,
  elementary,
  markers,
  lesson,
}: {
  detail: SceneDetail | null;
  elementary: boolean;
  markers: boolean;
  lesson: boolean;
}) {
  const locale = useLocale();
  const mpp = detail?.metersPerPixel || 0.001;
  const reference = referenceAt(mpp);
  const ruler = rulerAt(mpp);
  const width = reference.meters / mpp;
  const format = (m: number) => {
    const unit = (
      [
        ["m", 1],
        ["cm", 1e-2],
        ["mm", 1e-3],
        ["µm", 1e-6],
        ["nm", 1e-9],
        ["pm", 1e-12],
        ["fm", 1e-15],
      ] as const
    ).find(([, size]) => m >= size) || ["fm", 1e-15];
    return `${new Intl.NumberFormat(locale, { maximumSignificantDigits: 3 }).format(m / unit[1])} ${unit[0]}`;
  };
  // Only the off-screen geometry is capped; its edges remain outside the clip.
  const drawingWidth = Math.min(width, 1e7);
  return (
    <aside
      className="size-reference glass"
      aria-label={t("Size reference")}
      data-meters-per-pixel={mpp}
      data-reference={reference.id}
      data-reference-meters={reference.meters}
    >
      <div className="reference-object">
        <span>
          {t(reference.label)} <b>≈ {format(reference.meters)}</b>
        </span>
        <svg
          className={`reference-art reference-${reference.shape}`}
          width="100"
          height="23"
          viewBox="0 0 100 23"
          aria-hidden="true"
          data-object-pixels={width}
        >
          {reference.shape === "ruler" ? (
            <g>
              <rect
                x={50 - drawingWidth / 2}
                y="3"
                width={drawingWidth}
                height="17"
                rx="1"
              />
              {Array.from({ length: 11 }, (_, i) => (
                <path
                  key={i}
                  d={`M ${50 - drawingWidth / 2 + (i * drawingWidth) / 10} 3 v ${i % 5 ? 5 : 10}`}
                />
              ))}
            </g>
          ) : reference.shape === "hair" || reference.shape === "dna" ? (
            <g>
              <rect
                x={50 - drawingWidth / 2}
                y="-5"
                width={drawingWidth}
                height="33"
              />
              {reference.shape === "dna" && (
                <path
                  d={`M ${50 - drawingWidth / 2} 0 Q ${50 + drawingWidth / 2} 6 50 12 T ${50 - drawingWidth / 2} 23`}
                />
              )}
            </g>
          ) : (
            <ellipse
              cx="50"
              cy="11.5"
              rx={drawingWidth / 2}
              ry={
                reference.shape === "rice" ? drawingWidth / 7 : drawingWidth / 2
              }
            />
          )}
        </svg>
      </div>
      <div className="reference-measure">
        <strong>{format(ruler)}</strong>
        <svg
          width="150"
          height="13"
          viewBox="0 0 150 13"
          aria-hidden="true"
          data-ruler-meters={ruler}
          data-ruler-pixels={ruler / mpp}
        >
          <path d={`M 1 1 v 10 M 1 6 h ${ruler / mpp} m 0 -5 v 10`} />
        </svg>
        <small>
          {width > 100 ||
          (["atom", "nucleus", "proton"].includes(reference.shape) &&
            width > 23)
            ? t("Reference extends beyond frame")
            : width < 1
              ? t("Reference smaller than 1 px")
              : t("Same scale at the center of view")}
        </small>
      </div>
      <details className="reference-info">
        <summary aria-label={t("How to read the scale")}>
          <Info size={16} aria-hidden="true" />
        </summary>
        <div className="glass">
          <strong>{t("A ruler that follows your zoom")}</strong>
          <p>
            {t(
              "The reference and ruler use the same meters per pixel as the 3D scene at the camera target. Perspective makes nearer objects appear larger. Opening an object only reveals its contents; its physical radius stays fixed.",
            )}
          </p>
          <p>
            {t(
              "Sizes are approximate: rice 6 mm, hair 90 µm (usually 80–100 µm), DNA width 2.5 nm. Atoms use covalent radii. Nuclear radii use 1.2 × A⅓ fm; the proton uses its 0.841 fm charge radius. These are size conventions, not hard surfaces.",
            )}
          </p>
          <p>
            {t(
              "Molecular positions and quantum clouds are illustrative. Electrons and quarks are point markers with no assigned physical diameter. Interaction highlights are explanatory graphics.",
            )}
          </p>
          <a
            href="https://www.nano.gov/about-nanotechnology/just-how-small-is-nano/"
            target="_blank"
            rel="noreferrer"
          >
            {t("Everyday size references")}
          </a>
          {" · "}
          <a
            href="https://openstax.org/books/university-physics-volume-3/pages/10-1-properties-of-nuclei"
            target="_blank"
            rel="noreferrer"
          >
            {t("Nuclear dimensions")}
          </a>
        </div>
      </details>
      {(elementary || markers || lesson) && (
        <small className="reference-symbol-note">
          {elementary
            ? t("Particle marker · no measured diameter")
            : markers
              ? t("Electron and quark dots are markers")
              : t("Interaction highlights are diagrams")}
        </small>
      )}
    </aside>
  );
}
