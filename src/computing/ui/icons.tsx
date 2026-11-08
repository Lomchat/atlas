import { Binary, BrainCircuit, CircuitBoard, KeyRound, MessageSquareText, Microchip } from "lucide-react";
import type { LessonIcon as Icon } from "../types";

const ICONS = {
  bit: Binary,
  gate: CircuitBoard,
  chip: Microchip,
  key: KeyRound,
  neuron: BrainCircuit,
  llm: MessageSquareText,
} as const;

export function LessonIcon({ icon, size = 16 }: { icon: Icon; size?: number }) {
  const Component = ICONS[icon];
  return <Component size={size} strokeWidth={2.4} aria-hidden="true" />;
}
