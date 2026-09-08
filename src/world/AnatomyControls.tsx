import {
  ArrowRight,
  BicepsFlexed,
  Bone,
  ChevronDown,
  ExternalLink,
  HeartPulse,
  Info,
  Layers3,
  LoaderCircle,
  RotateCcw,
  UserRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { t, useLocale } from "../i18n";
import type { MessageKey } from "../i18n";
import { WORLD_NODES } from "./data";
import type { WorldNode } from "./data";
import { anatomyVersions } from "./anatomyModels";
import "./anatomy.css";

export type AnatomyMode = "organs" | "skeleton" | "muscles" | "surface";
export type AnatomyStatus = "loading" | "ready" | "error";

export interface AnatomyControlsProps {
  mode: AnatomyMode;
  onModeChange: (mode: AnatomyMode) => void;
  onNavigate: (id: string) => void;
  selectedId?: string;
  status: AnatomyStatus;
  onRetry?: () => void;
}

const modes: {
  id: AnatomyMode;
  label: MessageKey;
  accessibleLabel: MessageKey;
  description: MessageKey;
  icon: LucideIcon;
  routes: readonly string[];
}[] = [
  {
    id: "organs",
    label: "Organs",
    accessibleLabel: "Show the organs and vessels",
    description: "Reveal organs and vessels in their anatomical positions.",
    icon: HeartPulse,
    routes: [
      "heart",
      "lungs",
      "brain",
      "vein",
      "liver",
      "kidneys",
      "stomach",
      "intestines",
    ],
  },
  {
    id: "skeleton",
    label: "Skeleton",
    accessibleLabel: "Show the skeleton",
    description: "See the bones that support and protect the body.",
    icon: Bone,
    routes: ["femur", "bone", "skeleton", "skull", "ribs", "vertebra"],
  },
  {
    id: "muscles",
    label: "Muscles",
    accessibleLabel: "Show the muscles",
    description: "Reveal the muscles beneath the skin, around the skeleton.",
    icon: BicepsFlexed,
    routes: ["muscle", "muscles", "biceps"],
  },
  {
    id: "surface",
    label: "Surface",
    accessibleLabel: "Show the body surface",
    description: "Look at the body's outer surface, then explore the skin.",
    icon: UserRound,
    routes: ["skin", "hair", "surface"],
  },
];

const sourceUrl =
  "https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html";
const licenseUrl = "https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html";

/** The renderer owns the active layer and loading state. Translation never resets either. */
export function AnatomyControls({
  mode,
  onModeChange,
  onNavigate,
  selectedId = "human",
  status,
  onRetry,
}: AnatomyControlsProps) {
  const locale = useLocale();
  if (selectedId !== "human") return null;

  const selectedMode = modes.find((entry) => entry.id === mode)!;
  const available = WORLD_NODES.human.children
    .map((id) => WORLD_NODES[id])
    .filter((node): node is WorldNode => Boolean(node));
  const belongsToLayer = (node: WorldNode) =>
    selectedMode.routes.includes(node.id.slice("human/".length));
  const matching = available.filter(belongsToLayer);
  const other = available.filter((node) => !belongsToLayer(node));

  const routeButton = (node: WorldNode) => (
    <button
      key={node.id}
      type="button"
      className="anatomy-route"
      data-action="anatomy-enter"
      data-node={node.id}
      onClick={() => onNavigate(node.id)}
      aria-label={t("Explore {name}", { name: node.name[locale] })}
    >
      <i style={{ backgroundColor: node.color }} aria-hidden="true" />
      <span>{node.name[locale]}</span>
      <ArrowRight size={12} aria-hidden="true" />
    </button>
  );

  return (
    <section
      className="anatomy-controls"
      aria-label={t("Anatomical layers")}
      data-anatomy-mode={mode}
      data-anatomy-status={status}
    >
      <h2 className="anatomy-heading">
        <Layers3 size={13} aria-hidden="true" />
        {t("Anatomy")}
      </h2>
      <div
        className="anatomy-layer-buttons"
        role="group"
        aria-label={t("Choose an anatomical layer")}
      >
        {modes.map(({ id, label, accessibleLabel, icon: Icon }) => (
          <button
            key={id}
            type="button"
            data-action="anatomy-mode"
            data-mode={id}
            aria-pressed={mode === id}
            aria-label={t(accessibleLabel)}
            onClick={() => onModeChange(id)}
          >
            <Icon size={15} strokeWidth={1.7} aria-hidden="true" />
            <span>{t(label)}</span>
            <i aria-hidden="true" />
          </button>
        ))}
      </div>
      <p className="anatomy-mode-description">{t(selectedMode.description)}</p>

      <div className="anatomy-load-status" role="status" aria-live="polite">
        {status === "loading" && (
          <p>
            <LoaderCircle size={13} aria-hidden="true" />
            {t("Loading anatomical surfaces…")}
          </p>
        )}
        {status === "error" && (
          <>
            <p>
              <Info size={13} aria-hidden="true" />
              {t(
                "The anatomical model could not load. Exploration links remain available.",
              )}
            </p>
            {onRetry && (
              <button
                type="button"
                data-action="anatomy-retry"
                onClick={onRetry}
              >
                <RotateCcw size={12} aria-hidden="true" />
                {t("Retry anatomical download")}
              </button>
            )}
          </>
        )}
      </div>

      <div className="anatomy-route-heading">
        {matching.length
          ? t("Explore in this layer")
          : t("Explore another body structure")}
      </div>
      <div className="anatomy-routes">
        {(matching.length ? matching : available).map(routeButton)}
      </div>
      {matching.length > 0 && other.length > 0 && (
        <details className="anatomy-other-routes" key={mode}>
          <summary>
            <span>{t("Other body structures")}</span>
            <small>{other.length}</small>
            <ChevronDown size={12} aria-hidden="true" />
          </summary>
          <div className="anatomy-routes">{other.map(routeButton)}</div>
        </details>
      )}

      <details className="anatomy-attribution">
        <summary>
          <Info size={12} aria-hidden="true" />
          <span>{t("BodyParts3D · source & licenses")}</span>
          <ChevronDown size={12} aria-hidden="true" />
        </summary>
        <p>
          {t(
            "Anatomical reference surfaces from BodyParts3D. Colors distinguish structures.",
          )}
        </p>
        <div className="anatomy-source-links">
          <a href={sourceUrl} target="_blank" rel="noopener noreferrer">
            {t("Anatomical data source")}
            <ExternalLink size={11} aria-hidden="true" />
          </a>
          <a href={licenseUrl} target="_blank" rel="noopener noreferrer">
            {t("CC BY 4.0 license")}
            <ExternalLink size={11} aria-hidden="true" />
          </a>
        </div>
        <p className="anatomy-credit">
          {t(
            "BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International.",
          )}
        </p>
        {anatomyVersions.includes("4.3") && (
          <>
            <p>
              {t(
                "The lung surfaces supplement the 4.0 atlas with official 4.3 data. Their adaptation retains the source’s separate share-alike license.",
              )}
            </p>
            <div className="anatomy-source-links">
              <a
                href="https://lifesciencedb.jp/bp3d/info_en/index.html"
                target="_blank"
                rel="noopener noreferrer"
              >
                {t("4.3 source and CC BY-SA 2.1 Japan license")}
                <ExternalLink size={11} aria-hidden="true" />
              </a>
            </div>
            <p>
              {t(
                "BodyParts3D, © The Database Center for Life Science. Supplementary 4.3 surfaces: CC BY-SA 2.1 Japan; simplified and colored by Atlas.",
              )}
            </p>
          </>
        )}
      </details>
    </section>
  );
}

export default AnatomyControls;
