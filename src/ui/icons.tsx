import {
  Atom,
  Droplets,
  Orbit,
  PersonStanding,
  TreeDeciduous,
  Trees,
} from "lucide-react";
import type { Journey } from "../levels/types";

const ICONS = {
  cosmos: Orbit,
  home: Trees,
  body: PersonStanding,
  tree: TreeDeciduous,
  water: Droplets,
  matter: Atom,
} as const;

export function JourneyIcon({ journey, size = 16 }: { journey: Journey; size?: number }) {
  const Icon = ICONS[journey];
  return <Icon size={size} strokeWidth={2.4} aria-hidden="true" />;
}

/** The Atlas mark: nested circles, one inside the next. */
export function LogoMark({ size = 30 }: { size?: number }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true" className="logo-mark">
      <circle cx="16" cy="16" r="14" fill="#8c5cff" />
      <circle cx="19.5" cy="13" r="8.5" fill="#ff6fb1" />
      <circle cx="21.6" cy="11.2" r="4.4" fill="#ffd23f" />
      <circle cx="22.7" cy="10.3" r="1.7" fill="#fff" />
    </svg>
  );
}
