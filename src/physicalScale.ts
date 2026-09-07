import { elements, molecules } from "./data";
import type { MoleculeId } from "./data";
import type { MatterNode } from "./continuum";

// SI throughout the scene. Bond lengths: NIST CCCBDB experimental geometries.
const bondMeters = { water: 95.8e-12, co2: 116.2e-12, methane: 108.7e-12 };
export function metersPerUnit(id: MoleculeId) {
  const [a, b] = molecules[id].atoms;
  return bondMeters[id] / Math.hypot(...a.pos.map((n, i) => n - b.pos[i]));
}
// A model unit in MacroModel represents 4 cm (a roughly 11 cm vessel).
export const macroUnitMeters = 0.04;
export const macroFactor = (id: MoleculeId) =>
  macroUnitMeters / metersPerUnit(id) / 900;
export const protonRadiusMeters = 0.84075e-15;
const covalentRadius = { H: 31e-12, C: 76e-12, O: 66e-12 };
export function physicalRadius(node: MatterNode, id: MoleculeId) {
  const unit = metersPerUnit(id);
  const a = elements[node.element].z + elements[node.element].n;
  switch (node.kind) {
    case "atom":
      return covalentRadius[node.element] / unit;
    case "nucleus":
      return (a === 1 ? protonRadiusMeters : 1.2e-15 * Math.cbrt(a)) / unit;
    case "proton":
    case "neutron":
      return protonRadiusMeters / unit;
    // Elementary particles have no known finite diameter. These are UI markers.
    case "electron":
      return (covalentRadius[node.element] / unit) * 0.055;
    default:
      return (protonRadiusMeters / unit) * 0.17;
  }
}
export const sizeReferences = [
  { id: "ruler", label: "A 10 cm ruler", meters: 0.1, shape: "ruler" },
  { id: "rice", label: "A grain of rice", meters: 0.006, shape: "rice" },
  { id: "hair", label: "Width of a human hair", meters: 90e-6, shape: "hair" },
  { id: "dna", label: "Width of a DNA strand", meters: 2.5e-9, shape: "dna" },
  { id: "atom", label: "A carbon atom", meters: 152e-12, shape: "atom" },
  {
    id: "nucleus",
    label: "A carbon nucleus",
    meters: 2 * 1.2e-15 * Math.cbrt(12),
    shape: "nucleus",
  },
  {
    id: "proton",
    label: "A proton",
    meters: 2 * protonRadiusMeters,
    shape: "proton",
  },
] as const;
export function referenceAt(metersPerPixel: number) {
  const target = Math.max(1e-30, metersPerPixel * 90);
  return sizeReferences.reduce((best, item) =>
    Math.abs(Math.log(item.meters / target)) <
    Math.abs(Math.log(best.meters / target))
      ? item
      : best,
  );
}
export function rulerAt(metersPerPixel: number) {
  const desired = Math.max(1e-30, metersPerPixel * 85);
  const decade = 10 ** Math.floor(Math.log10(desired));
  return [1, 2, 5, 10]
    .map((n) => n * decade)
    .reduce((a, b) => (Math.abs(a - desired) < Math.abs(b - desired) ? a : b));
}
