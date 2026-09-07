import { useState } from "react";
import ComparisonScene from "./ComparisonScene";
import { molecules } from "./data";
import type { MoleculeId } from "./data";
import type { MatterNode } from "./continuum";
import { Info } from "lucide-react";
import { t, useLocale } from "./i18n";
import {
  physicalRadius,
  metersPerUnit,
  sizeReferences,
  referenceAt,
  rulerAt,
} from "./physicalScale";
import type { SceneDetail } from "./continuum";

export default function SizeReference({
  detail,
  node,
  molecule,
  elementary,
  markers,
  lesson,
}: {
  detail: SceneDetail | null;
  node: MatterNode;
  molecule: MoleculeId;
  elementary: boolean;
  markers: boolean;
  lesson: boolean;
}) {
  const locale = useLocale();
  const mpp = detail?.metersPerPixel || 0.001;
  const [choice, setChoice] = useState<"auto" | "hair" | "dna" | "ruler">(
    "auto",
  );
  const ruler = rulerAt(mpp);
  const [sampleSizes, setSampleSizes] = useState<
    Partial<Record<MoleculeId, number>>
  >({});

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
  const subject = [
    "sample",
    "molecule",
    "atom",
    "nucleus",
    "proton",
    "neutron",
  ].includes(node.kind)
    ? node.kind
    : "viewport";
  let subjectMeters =
    subject === "sample"
      ? sampleSizes[molecule] || 0.112
      : subject === "viewport"
        ? mpp * 200
        : 2 * physicalRadius(node, molecule) * metersPerUnit(molecule);
  if (subject === "molecule") {
    const min = [Infinity, Infinity, Infinity],
      max = [-Infinity, -Infinity, -Infinity];
    molecules[molecule].atoms.forEach((a, i) => {
      const r = physicalRadius(
        { ...node, kind: "atom", atom: i, element: a.element },
        molecule,
      );
      a.pos.forEach((p, j) => {
        min[j] = Math.min(min[j], p - r);
        max[j] = Math.max(max[j], p + r);
      });
    });
    subjectMeters =
      Math.max(...max.map((p, j) => p - min[j])) * metersPerUnit(molecule);
  }
  const reference =
    choice === "auto"
      ? referenceAt(subjectMeters / 90)
      : sizeReferences.find((r) => r.id === choice)!;
  const ratio = reference.meters / subjectMeters;
  const ratioText = new Intl.NumberFormat(locale, {
    maximumSignificantDigits: 3,
    notation: ratio > 1e7 || ratio < 1e-4 ? "scientific" : "standard",
  }).format(ratio);
  return (
    <aside
      className="size-reference glass"
      aria-label={t("Size reference")}
      data-meters-per-pixel={mpp}
      data-reference={reference.id}
      data-reference-meters={reference.meters}
      data-subject-meters={subjectMeters}
    >
      <div className="comparison-heading">
        <strong>{t("Compare the sizes")}</strong>
        <span>{t("Same scale within this comparison")}</span>
      </div>
      <div className="comparison-captions">
        <span>
          {subject === "viewport" ? t("Your view (200 px)") : node.entry.name}
          <b>≈ {format(subjectMeters)}</b>
        </span>
        <span>
          {t(reference.label)}
          <b>≈ {format(reference.meters)}</b>
        </span>
      </div>
      <ComparisonScene
        reference={reference.shape}
        referenceMeters={reference.meters}
        subject={subject}
        subjectMeters={subjectMeters}
        node={node}
        molecule={molecule}
        onMeasure={(meters) =>
          setSampleSizes((old) =>
            old[molecule] === meters ? old : { ...old, [molecule]: meters },
          )
        }
      />
      <div className="comparison-footer">
        <span>
          {t("Size ratio")} <b>1 : {ratioText}</b>
        </span>
        <div
          className="comparison-choices"
          aria-label={t("Choose a size reference")}
        >
          {(["auto", "hair", "dna", "ruler"] as const).map((id) => (
            <button
              key={id}
              aria-pressed={choice === id}
              onClick={() => setChoice(id)}
            >
              {t(
                id === "auto"
                  ? "Auto"
                  : id === "hair"
                    ? "Hair"
                    : id === "dna"
                      ? "DNA"
                      : "Ruler",
              )}
            </button>
          ))}
        </div>
      </div>
      {(ratio > 150 || ratio < 1 / 150) && (
        <small className="comparison-unresolved">
          {t(
            "The smaller object may be below one pixel; the ratio gives its true size.",
          )}
        </small>
      )}
      <div className="reference-measure">
        <span>{t("Ruler in the main view")}</span>
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
      </div>
      <details className="reference-info">
        <summary aria-label={t("How to read the scale")}>
          <Info size={16} aria-hidden="true" />
        </summary>
        <div className="glass">
          <strong>{t("A ruler that follows your zoom")}</strong>
          <p>
            {t(
              "The two 3D objects share one comparison scale, so their size ratio is preserved. This panel frames them independently from the main camera. The separate ruler measures pixels in the main view. Point particles have no assigned diameter: for them, the frame represents 200 pixels of your view.",
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
