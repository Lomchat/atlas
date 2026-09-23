/**
 * A basal keratinocyte (12 µm; 1 unit = 1.2 µm), cut open at the front.
 * The nucleus is the child level "nucleus", drawn at its anchor: this scene
 * leaves its space empty and gathers the melanin cap above it. Surroundings:
 * neighbouring keratinocytes joined by desmosomes, the upper layer and the
 * basement membrane underneath.
 */
import * as THREE from "three";
import type { Kit } from "../../../engine/kit";
import { rng } from "../../../engine/kit";
import type { SceneBuilder } from "../types";
import { CELL, COLORS, cellContents, membranePoint, membraneScale } from "./cell-layout";
import { instances, sweepGeometry, type Placement } from "./cell-shapes";

/** The membrane behind the cutting plane z = cutZ (a deep bowl), with its rim. */
function membraneBowl(kit: Kit, inset: number, shade?: [string, string]) {
  const thetaCut = Math.acos(Math.min(0.99, CELL.cutZ / (CELL.radius * CELL.stretch.z)));
  const geometry = new THREE.SphereGeometry(1, 96, 56, 0, Math.PI * 2, thetaCut, Math.PI - thetaCut);
  geometry.rotateX(Math.PI / 2);
  const position = geometry.getAttribute("position");
  const n = new THREE.Vector3();
  const p = new THREE.Vector3();
  const colors: number[] = [];
  const deep = new THREE.Color(shade?.[0] ?? "#ffffff");
  const light = new THREE.Color(shade?.[1] ?? "#ffffff");
  const c = new THREE.Color();
  for (let i = 0; i < position.count; i++) {
    n.fromBufferAttribute(position, i).normalize();
    membranePoint(n, inset, p);
    position.setXYZ(i, p.x, p.y, p.z);
    // Deeper inside the bowl, richer colour: a cue for depth.
    const t = Math.min(1, Math.max(0, (p.z + 4) / (CELL.cutZ + 4)));
    c.copy(deep).lerp(light, Math.pow(t, 1.4));
    colors.push(c.r, c.g, c.b);
  }
  if (shade) geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  // The first ring of vertices is the rim.
  const rim: THREE.Vector3[] = [];
  for (let i = 0; i <= 96; i++) rim.push(new THREE.Vector3().fromBufferAttribute(position, i));
  return { geometry: kit.geometry(geometry), rim };
}

/** A closed, whole keratinocyte for the surroundings. */
function neighbourGeometry(kit: Kit) {
  const geometry = new THREE.SphereGeometry(1, 40, 28);
  const position = geometry.getAttribute("position");
  const n = new THREE.Vector3();
  const p = new THREE.Vector3();
  for (let i = 0; i < position.count; i++) {
    n.fromBufferAttribute(position, i).normalize();
    const r = CELL.radius * membraneScale(n.clone().set(n.z, n.y, -n.x));
    p.set(n.x * r, n.y * r, n.z * r);
    position.setXYZ(i, p.x, p.y, p.z);
  }
  geometry.computeVertexNormals();
  return kit.geometry(geometry);
}

const cell: SceneBuilder = ({ kit, children }) => {
  const root = new THREE.Group();
  const env = new THREE.Group();
  const nucleus = children.find((child) => child.id === "nucleus");
  const nucleusAt = new THREE.Vector3(...(nucleus?.at ?? [0, -0.55, 0.75]));

  /* Membrane: outer surface, inner (cytoplasm) surface and the cut rim. */
  const outer = membraneBowl(kit, 0);
  const inner = membraneBowl(kit, 0.16, ["#e77cc6", "#ffd3ec"]);
  const outerMesh = new THREE.Mesh(
    outer.geometry,
    kit.toon(COLORS.membrane, {
      shadow: COLORS.membraneShade,
      rim: 0.6,
      rimColor: "#ffc6ea",
      gloss: 0.3,
      opacity: 0.62,
      depthWrite: false,
    }),
  );
  const innerMesh = new THREE.Mesh(
    inner.geometry,
    kit.toon("#ffffff", {
      vertexColors: true,
      rim: 0.2,
      rimColor: "#ffe6f5",
      gloss: 0.06,
      soft: 0.6,
      side: THREE.BackSide,
    }),
  );
  const rimPath = outer.rim.map((p, i) => p.clone().lerp(inner.rim[i], 0.5));
  const lip = new THREE.Mesh(
    kit.geometry(sweepGeometry(rimPath, { ra: 0.1, rb: 0.1, radial: 10 })),
    kit.toon(COLORS.lip, { rim: 0.4, rimColor: "#ffe1f3", gloss: 0.5, shadow: "#c0479c" }),
  );
  root.add(innerMesh, outerMesh, lip);
  // Translucent glow of the whole cell outline, including the missing front.
  const glowShell = new THREE.Mesh(
    kit.geometry(new THREE.SphereGeometry(CELL.radius * 1.03, 48, 32)),
    kit.halo("#ff7ccf", { opacity: 0.55, power: 2.2 }),
  );
  glowShell.scale.copy(CELL.stretch);
  root.add(glowShell);
  const warmth = kit.glow("#ff9ad8", 13, { opacity: 0.22 });
  warmth.position.set(nucleusAt.x, nucleusAt.y, nucleusAt.z - 2.5);
  root.add(warmth);

  /* Organelles, keratin and the melanin cap (shared with the nucleus surroundings). */
  const contents = cellContents(kit, nucleusAt);
  root.add(contents.group);

  /* ---------------- Surroundings ---------------- */
  const random = rng(77);
  const neighbours: Placement[] = [
    { position: new THREE.Vector3(-9.2, 0.1, -1.5), scale: new THREE.Vector3(1, 1.06, 0.92), color: "#9c3a86" },
    { position: new THREE.Vector3(9.2, -0.1, -1.4), scale: new THREE.Vector3(1, 1.08, 0.9), color: "#a03e8a" },
    { position: new THREE.Vector3(-4.7, 0.3, -9.6), scale: new THREE.Vector3(1, 1.04, 0.9), color: "#7c2f78" },
    { position: new THREE.Vector3(4.9, 0.2, -9.8), scale: new THREE.Vector3(1, 1.06, 0.9), color: "#80317b" },
    { position: new THREE.Vector3(-14.2, 0.3, -8), scale: new THREE.Vector3(1, 1.04, 0.92), color: "#6e2a70" },
    { position: new THREE.Vector3(14.3, 0.1, -7.6), scale: new THREE.Vector3(1, 1.05, 0.9), color: "#6e2a70" },
    // Stratum spinosum above: larger, flatter cells.
    { position: new THREE.Vector3(-5.4, 9.3, -2.2), scale: new THREE.Vector3(1.25, 0.78, 1.05), color: "#a8468f" },
    { position: new THREE.Vector3(5.6, 9.6, -2.6), scale: new THREE.Vector3(1.22, 0.76, 1.08), color: "#a4448d" },
    { position: new THREE.Vector3(0.2, 9.9, -10.5), scale: new THREE.Vector3(1.25, 0.76, 1.05), color: "#86387f" },
    { position: new THREE.Vector3(-15.5, 9.6, -6), scale: new THREE.Vector3(1.2, 0.76, 1.05), color: "#86387f" },
    { position: new THREE.Vector3(15.8, 9.8, -6.2), scale: new THREE.Vector3(1.2, 0.76, 1.05), color: "#86387f" },
  ];
  neighbours.forEach((n) => {
    n.quaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, random() * Math.PI * 2, (random() - 0.5) * 0.2));
  });
  const neighbourCells = instances(
    neighbourGeometry(kit),
    kit.toon("#ffffff", { shadow: "#3d1560", rim: 0.45, rimColor: "#ffa6dc", gloss: 0.12, soft: 0.4, opacity: 0.72, env: true }),
    neighbours,
  );
  neighbourCells.renderOrder = 2;
  // Their nuclei, glimpsed through the translucent membranes.
  const neighbourNuclei = instances(
    kit.blob(2.3, { detail: 3, noise: 0.06, seed: 21 }),
    kit.toon("#7a4fd8", { shadow: "#351a78", rim: 0.3, gloss: 0.15, env: true }),
    neighbours.map((n) => ({
      position: n.position.clone().add(new THREE.Vector3(0, -0.5, 0.6)),
      scale: (n.scale as THREE.Vector3).clone().multiplyScalar(0.95),
    })),
  );
  neighbourNuclei.renderOrder = 1;
  env.add(neighbourCells, neighbourNuclei);

  // Basement membrane: a soft wavy sheet under the basal layer, pinned by hemidesmosomes.
  const sheet = new THREE.PlaneGeometry(36, 22, 72, 44);
  sheet.rotateX(-Math.PI / 2);
  const sheetPos = sheet.getAttribute("position");
  for (let i = 0; i < sheetPos.count; i++) {
    const x = sheetPos.getX(i);
    const z = sheetPos.getZ(i);
    sheetPos.setY(i, 0.2 * Math.sin(x * 0.55 + 0.6) * Math.cos(z * 0.42) + 0.1 * Math.sin(z * 0.9 + x * 0.2));
  }
  sheet.computeVertexNormals();
  const sheetTexture = kit.canvasTexture(256, 160, (g, w, h) => {
    g.save();
    g.scale(1, h / w);
    const gradient = g.createRadialGradient(w / 2, w * 0.45, 0, w / 2, w * 0.45, w * 0.5);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.5, "rgba(255,255,255,0.8)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gradient;
    g.fillRect(0, 0, w, w);
    g.restore();
    // A few soft woven fibres of the basal lamina.
    g.globalCompositeOperation = "source-atop";
    g.strokeStyle = "rgba(90, 50, 170, 0.22)";
    g.lineWidth = 2;
    for (let k = 0; k < 14; k++) {
      g.beginPath();
      const y = ((k + 0.5) / 14) * h;
      g.moveTo(0, y);
      g.bezierCurveTo(w * 0.3, y + 10, w * 0.6, y - 10, w, y + 5);
      g.stroke();
    }
  });
  const basement = new THREE.Mesh(
    kit.geometry(sheet),
    kit.textured(sheetTexture, { rim: 0.2, gloss: 0.1, soft: 0.5, env: true, side: THREE.DoubleSide, depthWrite: false }),
  );
  (basement.material as THREE.ShaderMaterial).uniforms.uColor.value.set("#7a4fcf");
  basement.position.set(0, -4.85, -5);
  env.add(basement);
  const underside = kit.glow("#b04cff", 30, { opacity: 0.16, env: true });
  underside.position.set(0, -10, -6);
  env.add(underside);
  const hemi: Placement[] = [];
  for (let k = 0; k < 7; k++) {
    const x = -3 + k;
    const at = membranePoint(new THREE.Vector3(x / 4.6, -1, 0.1).normalize(), -0.02);
    if (at.z > CELL.cutZ) continue;
    hemi.push({ position: at, scale: new THREE.Vector3(0.26, 0.06, 0.26) });
  }
  env.add(instances(kit.geometry(new THREE.CylinderGeometry(1, 1, 1, 14)), kit.toon("#c7a4ff", { rim: 0.3, env: true }), hemi));

  // Drifting specks between the cells.
  const specks: number[] = [];
  const speckRandom = rng(99);
  for (let k = 0; k < kit.count(160, 80); k++)
    specks.push((speckRandom() * 2 - 1) * 14, (speckRandom() * 2 - 1) * 9, -10 + speckRandom() * 14);
  const speckPoints = kit.points(specks, { size: 0.09, color: "#ffc2ec", opacity: 0.55, soft: 0.8, twinkle: 0.5, env: true });
  env.add(speckPoints);

  return {
    root,
    env,
    update({ time }) {
      contents.update(time);
      const pulse = 1 + 0.004 * Math.sin(time * 1.3);
      glowShell.scale.set(CELL.stretch.x * pulse, CELL.stretch.y * pulse, CELL.stretch.z * pulse);
      speckPoints.position.y = Math.sin(time * 0.2) * 0.3;
    },
  };
};

export default cell;
