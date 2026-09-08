import { ArrowDownRight, CornerUpLeft, LocateFixed } from "lucide-react";
import { t, useLocale } from "../i18n";
import type { MessageKey } from "../i18n";
import { WORLD_NODES } from "./data";
import type { SpatialContext, SpatialEntry } from "./sample-address";
import "./local-sample.css";

const regionMessages: Record<string, MessageKey> = {
  "left-arm": "Left arm",
  "right-arm": "Right arm",
  "left-leg": "Left leg",
  "right-leg": "Right leg",
  head: "Head",
  trunk: "Trunk",
};

export function LocalSampleOrigin({
  entry,
  selectedId,
  context,
  onNavigate,
}: {
  entry: SpatialEntry;
  selectedId: string;
  context: SpatialContext;
  onNavigate: (id: string, context?: SpatialContext) => void;
}) {
  const locale = useLocale();
  const atOrigin = selectedId === entry.parentId;
  const parent = WORLD_NODES[entry.parentId];
  const region = entry.source?.region && regionMessages[entry.source.region];
  return (
    <section
      className="world-local-origin"
      aria-label={t("Selected point")}
      data-spatial-parent={entry.parentId}
      data-spatial-child={entry.childId}
      data-spatial-kind={entry.kind}
      data-spatial-region={entry.source?.region || ""}
      data-spatial-part={entry.source?.partId || ""}
    >
      <div className="world-local-origin-heading">
        <LocateFixed size={13} aria-hidden="true" />
        <strong>
          {entry.kind === "sample"
            ? t("Local sample")
            : entry.kind === "instance"
              ? t("Selected instance")
              : t("Selected point")}
        </strong>
        <span>{region ? t(region) : parent.name[locale]}</span>
      </div>
      <p>
        {entry.kind === "sample"
          ? t("This view is a representative sample at the point you selected.")
          : entry.kind === "instance"
            ? t("You selected this visible constituent.")
            : t("You selected a point on this object's surface.")}
      </p>
      <div className="world-local-origin-footer">
        <button
          type="button"
          data-action="world-return-to-origin"
          onClick={() =>
            onNavigate(atOrigin ? entry.childId : entry.parentId, context)
          }
        >
          {atOrigin ? (
            <ArrowDownRight size={12} aria-hidden="true" />
          ) : (
            <CornerUpLeft size={12} aria-hidden="true" />
          )}
          {atOrigin
            ? t("Explore {name}", {
                name: WORLD_NODES[entry.childId].name[locale],
              })
            : t("Return to the selected point")}
        </button>
        {entry.source?.partId && (
          <small title={entry.source.assetId}>
            {t("Source part {id}", { id: entry.source.partId })}
          </small>
        )}
      </div>
    </section>
  );
}
