import type { SceneBuilder } from "./types";

type Loader = () => Promise<{ default: SceneBuilder }>;

/**
 * Scene modules are loaded lazily and independently: a failing module only
 * affects its own level, which then falls back to the placeholder.
 */
export const SCENES: Record<string, Loader> = {
  // Cosmos
  universe: () => import("./cosmos/universe"),
  laniakea: () => import("./cosmos/laniakea"),
  localGroup: () => import("./cosmos/localGroup"),
  milkyWay: () => import("./cosmos/milkyWay"),
  stellarNeighborhood: () => import("./cosmos/stellarNeighborhood"),
  solarSystem: () => import("./cosmos/solarSystem"),
  innerSolarSystem: () => import("./earth/innerSolarSystem"),
  earthMoon: () => import("./earth/earthMoon"),
  earth: () => import("./earth/earth"),
  region: () => import("./earth/region"),
  landscape: () => import("./earth/landscape"),
  // Home
  park: () => import("./home/park"),
  // Body
  person: () => import("./body/person"),
  hand: () => import("./body/hand"),
  fingertip: () => import("./body/fingertip"),
  skin: () => import("./body/skin"),
  epidermis: () => import("./body/epidermis"),
  cell: () => import("./body/cell"),
  cellNucleus: () => import("./body/cellNucleus"),
  chromatin: () => import("./body/chromatin"),
  nucleosome: () => import("./body/nucleosome"),
  dna: () => import("./body/dna"),
  capillary: () => import("./blood/capillary"),
  redCell: () => import("./blood/redCell"),
  rbcInterior: () => import("./blood/rbcInterior"),
  hemoglobin: () => import("./blood/hemoglobin"),
  heme: () => import("./blood/heme"),
  // Tree
  tree: () => import("./tree/tree"),
  leaf: () => import("./tree/leaf"),
  leafSection: () => import("./tree/leafSection"),
  leafCell: () => import("./tree/leafCell"),
  chloroplast: () => import("./tree/chloroplast"),
  thylakoid: () => import("./tree/thylakoid"),
  photosystem: () => import("./tree/photosystem"),
  chlorophyll: () => import("./tree/chlorophyll"),
  // Water
  pond: () => import("./water/pond"),
  lilyPad: () => import("./water/lilyPad"),
  drop: () => import("./water/drop"),
  microZoo: () => import("./water/microZoo"),
  bacteria: () => import("./water/bacteria"),
  virus: () => import("./water/virus"),
  waterMolecules: () => import("./water/waterMolecules"),
  // Matter
  atom: () => import("./matter/atom"),
  core: () => import("./matter/core"),
  nucleus: () => import("./matter/nucleus"),
  proton: () => import("./matter/proton"),
  quark: () => import("./matter/quark"),
};
