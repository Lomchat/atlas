import { ArrowDown, ArrowUp, House, Pause, Play } from "lucide-react";
import { t, tr, useLocale } from "../i18n";
import { HOME_ID, childrenOf } from "../levels";
import type { LevelData } from "../levels/types";
import { useLevelTip } from "./LevelTip";
import { JourneyIcon } from "./icons";

interface Props {
  path: readonly LevelData[];
  nearest: LevelData;
  touring: boolean;
  onFly(id: string): void;
  onTour(): void;
}

function BranchChip({ child, active, onFly }: { child: LevelData; active: boolean; onFly(id: string): void }) {
  const tip = useLevelTip(child.id);
  return (
    <button
      type="button"
      className="branch"
      data-level={child.id}
      aria-pressed={active}
      onClick={() => onFly(child.id)}
      {...tip}
    >
      <JourneyIcon journey={child.journey} />
      <span>{tr(child.short)}</span>
    </button>
  );
}

/** Zoom out, guided tour, dive — plus the choice of branch when there is one. */
export default function Controls({ path, nearest, touring, onFly, onTour }: Props) {
  useLocale();
  const index = path.findIndex((level) => level.id === nearest.id);
  const outward = index > 0 ? path[index - 1] : undefined;
  const inward = index >= 0 ? path[index + 1] : undefined;
  const branches = childrenOf(nearest.id);
  const outTip = useLevelTip(outward?.id);
  const inTip = useLevelTip(inward?.id ?? HOME_ID);

  return (
    <div className="controls">
      {branches.length > 1 && (
        <div className="branches" role="group" aria-label={t("Choose where to dive")}>
          <span className="branches-label">{t("Dive into")}</span>
          {branches.map((child) => (
            <BranchChip key={child.id} child={child} active={child.id === inward?.id} onFly={onFly} />
          ))}
        </div>
      )}
      <div className="controls-row">
        <button
          type="button"
          className="control control-out"
          data-action="out"
          disabled={!outward}
          aria-label={
            outward ? t("Zoom out to {name}", { name: tr(outward.short) }) : t("Zoom out")
          }
          onClick={() => outward && onFly(outward.id)}
          {...outTip}
        >
          <ArrowUp size={20} strokeWidth={2.6} aria-hidden="true" />
          <span className="control-text">
            <small>{t("Zoom out")}</small>
            <b>{outward ? tr(outward.short) : "—"}</b>
          </span>
        </button>
        <button
          type="button"
          className="control control-tour"
          data-action="tour"
          aria-pressed={touring}
          aria-label={touring ? t("Pause the guided tour") : t("Start the guided tour")}
          title={touring ? t("Pause the guided tour") : t("Start the guided tour")}
          onClick={onTour}
        >
          {touring ? (
            <Pause size={22} strokeWidth={2.6} aria-hidden="true" />
          ) : (
            <Play size={22} strokeWidth={2.6} aria-hidden="true" />
          )}
        </button>
        {inward ? (
          <button
            type="button"
            className="control control-in"
            data-action="in"
            aria-label={t("Dive into {name}", { name: tr(inward.short) })}
            onClick={() => onFly(inward.id)}
            {...inTip}
          >
            <span className="control-text">
              <small>{t("Dive")}</small>
              <b>{tr(inward.short)}</b>
            </span>
            <ArrowDown size={20} strokeWidth={2.6} aria-hidden="true" />
          </button>
        ) : (
          <button
            type="button"
            className="control control-in"
            data-action="restart"
            aria-label={t("End of this journey: back to the park")}
            onClick={() => onFly(HOME_ID)}
            {...inTip}
          >
            <span className="control-text">
              <small>{t("The end… for now")}</small>
              <b>{t("Back to the park")}</b>
            </span>
            <House size={20} strokeWidth={2.6} aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
