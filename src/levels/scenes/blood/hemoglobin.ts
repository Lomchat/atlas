/**
 * Hemoglobin (6.4 nm; 1 unit = 0.64 nm): four folded chains, two α (pink)
 * and two β (orange), each holding a heme disc in a pocket. O₂ molecules
 * arrive, bind and leave in turn (timing shared with the `heme` scene); as the
 * hemes fill, the α2β2 half turns slightly against α1β1 (the T → R change).
 * The child "heme" is anchored in the α1 pocket facing the viewer; that
 * subunit never moves. Surroundings: the crowd of neighbouring hemoglobins.
 */
import * as THREE from "three";
import type { Kit } from "../../../engine/kit";
import { fbm3, rng } from "../../../engine/kit";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { SceneBuilder } from "../types";
import { molecule } from "../common/molecules";
import { instances, type Placement } from "../body/cell-shapes";
import { loaded, o2State } from "./hemoglobin-cycle";

export const ALPHA = "#ff6f91";
export const BETA = "#ff9f6b";
const R = 2.75;

interface Subunit {
  name: "α1" | "β1" | "α2" | "β2";
  color: string;
  centre: THREE.Vector3;
  seed: number;
  /** Direction (from the centre) of the heme pocket. */
  pocket: THREE.Vector3;
  stretch: THREE.Vector3;
}

const SUBUNITS: Subunit[] = [
  { name: "α1", color: ALPHA, centre: new THREE.Vector3(-2.3, 2.0, 0.8), seed: 3, pocket: new THREE.Vector3(0.3, -0.15, 1), stretch: new THREE.Vector3(1.08, 0.94, 0.95) },
  { name: "β1", color: BETA, centre: new THREE.Vector3(2.1, 1.7, -0.7), seed: 5, pocket: new THREE.Vector3(0.75, 0.55, 0.45), stretch: new THREE.Vector3(1.1, 0.95, 0.92) },
  { name: "α2", color: ALPHA, centre: new THREE.Vector3(2.15, -1.85, 0.8), seed: 7, pocket: new THREE.Vector3(0.55, -0.35, 0.8), stretch: new THREE.Vector3(1.06, 0.97, 0.94) },
  { name: "β2", color: BETA, centre: new THREE.Vector3(-2.15, -1.7, -0.7), seed: 11, pocket: new THREE.Vector3(-0.8, -0.45, 0.45), stretch: new THREE.Vector3(1.08, 0.96, 0.95) },
];

/** A lumpy protein chain with a crater for its heme. */
function chainGeometry(kit: Kit, seed: number, pocket: THREE.Vector3, depth: number, stretch: THREE.Vector3) {
  const source = new THREE.IcosahedronGeometry(1, kit.quality === "high" ? 4 : 3);
  source.deleteAttribute("normal");
  source.deleteAttribute("uv");
  const geometry = mergeVertices(source);
  source.dispose();
  const position = geometry.getAttribute("position");
  const n = new THREE.Vector3();
  const axis = pocket.clone().normalize();
  for (let i = 0; i < position.count; i++) {
    n.fromBufferAttribute(position, i).normalize();
    let r = R * (1 + 0.2 * fbm3(n.x * 2.1 + seed, n.y * 2.1, n.z * 2.1, 3, seed) + 0.06 * fbm3(n.x * 5.5 + seed, n.y * 5.5, n.z * 5.5, 2, seed + 3));
    // Smooth crater: a raised lip around a hollow where the heme sits.
    const angle = n.angleTo(axis);
    const lip = Math.exp(-(((angle - 0.42) / 0.12) ** 2)) * 0.18;
    const hollow = angle < 0.36 ? (1 - (angle / 0.36) ** 2) * depth : 0;
    r = angle < 0.6 ? THREE.MathUtils.lerp(R * 1.02, r, Math.min(1, angle / 0.6) ** 3) + lip - hollow : r + lip;
    // Stretch the chain but keep the crater round and where it was.
    const keep = Math.min(1, angle / 0.7);
    const sx = THREE.MathUtils.lerp(1, stretch.x, keep);
    const sy = THREE.MathUtils.lerp(1, stretch.y, keep);
    const sz = THREE.MathUtils.lerp(1, stretch.z, keep);
    position.setXYZ(i, n.x * r * sx, n.y * r * sy, n.z * r * sz);
  }
  geometry.computeVertexNormals();
  return kit.geometry(geometry);
}

/** A heme seen as a small disc: dark porphyrin with a glowing iron. */
function hemeDisc(kit: Kit) {
  const texture = kit.canvasTexture(128, 128, (g, w, h) => {
    const c = w / 2;
    g.clearRect(0, 0, w, h);
    g.fillStyle = "#8f1239";
    g.beginPath();
    g.arc(c, c, c - 2, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = "#ff5f7a";
    g.lineWidth = 7;
    for (let k = 0; k < 4; k++) {
      const a = Math.PI / 4 + (k * Math.PI) / 2;
      g.beginPath();
      g.arc(c + Math.cos(a) * 30, c + Math.sin(a) * 30, 15, 0, Math.PI * 2);
      g.stroke();
    }
    g.beginPath();
    g.arc(c, c, 44, 0, Math.PI * 2);
    g.stroke();
    const glow = g.createRadialGradient(c, c, 0, c, c, 22);
    glow.addColorStop(0, "#ffd08a");
    glow.addColorStop(0.5, "#ff8a3d");
    glow.addColorStop(1, "rgba(255,138,61,0)");
    g.fillStyle = glow;
    g.beginPath();
    g.arc(c, c, 22, 0, Math.PI * 2);
    g.fill();
  });
  return {
    geometry: kit.geometry(new THREE.CircleGeometry(0.72, 32)),
    material: kit.textured(texture, { alphaTest: 0.5, side: THREE.DoubleSide, rim: 0, gloss: 0.2, flat: 0.5 }),
  };
}

function oxygenMolecule(kit: Kit, env = false) {
  // O₂ at its van der Waals size (O radius 1.5 Å, O=O 1.21 Å).
  return molecule(
    kit,
    [
      { symbol: "O", position: new THREE.Vector3(-0.095, 0, 0) },
      { symbol: "O", position: new THREE.Vector3(0.095, 0, 0) },
    ],
    [],
    { atomScale: 0.3, env },
  );
}

const hemoglobin: SceneBuilder = ({ kit, children }) => {
  const root = new THREE.Group();
  const env = new THREE.Group();
  const hemeChild = children.find((child) => child.id === "heme");
  const anchorAt = new THREE.Vector3(...(hemeChild?.at ?? [-1.52, 1.6, 3.35]));

  /* ---------------- Four chains, in two αβ halves ---------------- */
  const fixedHalf = new THREE.Group(); // α1β1 (holds the child's heme)
  const movingHalf = new THREE.Group(); // α2β2 (turns during T → R)
  root.add(fixedHalf, movingHalf);
  const disc = hemeDisc(kit);
  const sites: { site: THREE.Vector3; normal: THREE.Vector3; half: THREE.Group; index: number }[] = [];
  SUBUNITS.forEach((unit, index) => {
    const half = unit.name.endsWith("1") ? fixedHalf : movingHalf;
    const axis = unit.pocket.clone().normalize();
    const chain = new THREE.Mesh(
      chainGeometry(kit, unit.seed, axis, index === 0 ? 0.55 : 0.4, unit.stretch),
      kit.toon(unit.color, { rim: 0.5, rimColor: "#ffe3ea", gloss: 0.3, soft: 0.28, shadow: index % 2 ? "#a8434f" : "#9a2f6e" }),
    );
    chain.position.copy(unit.centre);
    half.add(chain);
    // The heme sits in the hollow, facing out of its pocket.
    const site =
      index === 0 ? anchorAt.clone() : unit.centre.clone().addScaledVector(axis, R * 1.02 - 0.4 + 0.08);
    const heme = new THREE.Mesh(disc.geometry, disc.material);
    heme.position.copy(site);
    heme.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), axis);
    if (index === 0) heme.scale.setScalar(0.85);
    half.add(heme);
    sites.push({ site, normal: axis, half, index });
  });

  /* ---------------- O₂ arriving at the three other hemes (the child shows its own) ---------------- */
  const random = rng(19);
  const flights = sites
    .filter((s) => s.index !== 0)
    .map((s) => {
      const o2 = oxygenMolecule(kit);
      s.half.add(o2);
      const bound = s.site.clone().addScaledVector(s.normal, 0.42);
      const from = s.site.clone().addScaledVector(s.normal, 7).add(new THREE.Vector3(random() * 4 - 2, random() * 3, random() * 2));
      const to = s.site.clone().addScaledVector(s.normal, 7).add(new THREE.Vector3(random() * 4 - 2, -random() * 3, random() * 2));
      return { o2, bound, from, to, index: s.index, normal: s.normal };
    });

  /* ---------------- Surroundings: the crowd inside the red blood cell ---------------- */
  const crowd: Placement[] = [];
  const crowdRandom = rng(23);
  const neighbours = [
    new THREE.Vector3(-14, 5.5, -6),
    new THREE.Vector3(14.5, 6, -7),
    new THREE.Vector3(-13, -8, -5),
    new THREE.Vector3(13.5, -7.5, -4),
    new THREE.Vector3(0.5, 12.5, -10),
    new THREE.Vector3(1, -12.5, -8),
    new THREE.Vector3(-5, 2, -15),
    new THREE.Vector3(7, -1, -15),
  ];
  for (const at of neighbours) {
    const turn = new THREE.Quaternion().setFromEuler(new THREE.Euler(crowdRandom() * 6, crowdRandom() * 6, crowdRandom() * 6));
    SUBUNITS.forEach((unit) => {
      crowd.push({
        position: unit.centre.clone().applyQuaternion(turn).add(at),
        quaternion: turn,
        scale: 1,
        color: new THREE.Color(unit.color).lerp(new THREE.Color("#4a1760"), 0.34 + Math.max(0, -at.z) * 0.022),
      });
    });
  }
  const crowdGeometry = kit.blob(R, { detail: 3, noise: 0.18, frequency: 2.3, seed: 29 });
  env.add(
    instances(crowdGeometry, kit.toon("#ffffff", { rim: 0.4, rimColor: "#ffb3c8", gloss: 0.15, soft: 0.35, shadow: "#2c0f40", env: true }), crowd),
  );
  // Free oxygen and water between the proteins.
  const drift: { o2: THREE.Group; home: THREE.Vector3; phase: number }[] = [];
  for (let k = 0; k < kit.count(7, 4); k++) {
    const o2 = oxygenMolecule(kit, true);
    const home = new THREE.Vector3((crowdRandom() * 2 - 1) * 12, (crowdRandom() * 2 - 1) * 7, -2 + crowdRandom() * 6);
    if (home.length() < 7) home.setLength(7.5);
    o2.position.copy(home);
    env.add(o2);
    drift.push({ o2, home, phase: crowdRandom() * 6 });
  }
  const water: number[] = [];
  for (let k = 0; k < kit.count(160, 80); k++) {
    const p = new THREE.Vector3((crowdRandom() * 2 - 1) * 15, (crowdRandom() * 2 - 1) * 10, -10 + crowdRandom() * 16);
    if (p.length() < 6.5) continue;
    water.push(p.x, p.y, p.z);
  }
  const waterPoints = kit.points(water, { size: 0.16, color: "#bfe9ff", opacity: 0.45, soft: 0.5, twinkle: 0.4, env: true });
  env.add(waterPoints);
  const glow = kit.glow("#ff6fa0", 28, { opacity: 0.2, env: true });
  glow.position.set(0, 0, -8);
  env.add(glow);

  const pivot = new THREE.Vector3(0, 0, 0);
  const tmp = new THREE.Vector3();
  const xAxis = new THREE.Vector3(1, 0, 0);
  return {
    root,
    env,
    update({ time }) {
      // T → R: the α2β2 half turns a little as the hemes fill.
      const angle = THREE.MathUtils.degToRad(7) * loaded(time);
      movingHalf.quaternion.setFromAxisAngle(xAxis, angle);
      movingHalf.position.copy(pivot).sub(pivot.clone().applyQuaternion(movingHalf.quaternion));
      for (const f of flights) {
        const state = o2State(time, f.index);
        f.o2.visible = state.phase !== "away";
        if (state.phase === "arriving") {
          const u = state.u * state.u * (3 - 2 * state.u);
          tmp.copy(f.from).lerp(f.bound, u);
          tmp.addScaledVector(f.normal, Math.sin(u * Math.PI) * 1.2);
          f.o2.position.copy(tmp);
          f.o2.rotation.set(time * 2, time * 1.5, 0);
        } else if (state.phase === "bound") {
          f.o2.position.copy(f.bound);
          f.o2.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), f.normal.clone().add(new THREE.Vector3(0.6, 0.4, 0)).normalize());
        } else if (state.phase === "leaving") {
          const u = state.u * state.u;
          f.o2.position.copy(f.bound).lerp(f.to, u);
          f.o2.rotation.set(time * 2, time, 0);
        }
      }
      drift.forEach((d) => {
        d.o2.position.set(
          d.home.x + Math.sin(time * 0.35 + d.phase) * 1.4,
          d.home.y + Math.cos(time * 0.3 + d.phase) * 1.0,
          d.home.z + Math.sin(time * 0.2 + d.phase) * 0.6,
        );
        d.o2.rotation.set(time * 0.8 + d.phase, time * 0.6, 0);
      });
      waterPoints.position.y = Math.sin(time * 0.15) * 0.3;
    },
  };
};

export default hemoglobin;
