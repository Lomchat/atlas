/**
 * A leaf (1 unit = 1 cm): an ovate, gently serrated blade with its midrib,
 * veins and petiole, on a young twig. The blade lies in the XZ plane (upper
 * surface +Y) and is seen from above by the home view. The child level
 * "leaf-section" sits flush on a flat patch of the blade.
 * Surroundings: other leaves of the spray fluttering, a sunny bokeh.
 */
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { rng } from "../../../engine/kit";
import type { SceneBuilder } from "../types";
import {
  GREENS,
  LEAF_ANGLE,
  LEAF_BASE,
  LEAF_HALF_WIDTH,
  LEAF_NODE,
  LEAF_TIP,
  LEAF_TWIG,
  NEIGHBOURS,
  SECOND_TWIG,
  ovate,
  serration,
  taperedTube,
  tintShadow,
} from "./treeShared";

const LENGTH = LEAF_TIP - LEAF_BASE;
const TEETH = 21;
const SECONDARIES = 9;

/** Half-width of the blade at u (0 = base, 1 = tip), with serration. */
function halfWidth(u: number) {
  const teeth = serration(u, TEETH) * THREE.MathUtils.smoothstep(u, 0.12, 0.3) * (1 - THREE.MathUtils.smoothstep(u, 0.9, 0.99));
  return LEAF_HALF_WIDTH * ovate(u) * (1 - 0.055 * (1 - teeth));
}
/** Half-width without teeth (the teeth only move the very edge). */
function smoothWidth(u: number) {
  return LEAF_HALF_WIDTH * ovate(u) * 0.97;
}

/** Height of the blade surface in its own frame (a soft V along the midrib, a drooping tip). */
function bladeHeight(u: number, z: number) {
  const s = Math.abs(z) / LEAF_HALF_WIDTH;
  return (
    0.16 * Math.abs(z) -
    0.05 * s * s * Math.abs(z) +
    0.35 * Math.sin(Math.PI * u) * 0.4 -
    1.3 * Math.max(0, u - 0.6) ** 2 +
    0.07 * Math.sin(u * 17 + z * 0.6) * s ** 3
  );
}

/**
 * The blade in canonical space: base at the origin, tip at +X (LENGTH), upper surface +Y.
 * `flat` optionally flattens a small patch (canonical x, z, height, radius).
 */
function bladeGeometry(steps: number, across: number, flat?: [number, number, number, number]) {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const w = halfWidth(u);
    const w0 = smoothWidth(u);
    for (let j = 0; j <= across * 2; j++) {
      const s = j / across - 1;
      const x = u * LENGTH - 0.25 * w0 * s * s;
      const z = s * (w0 + (w - w0) * Math.abs(s) ** 8);
      let y = bladeHeight(u, z);
      if (flat) {
        const d = Math.hypot(x - flat[0], z - flat[2]);
        const k = 1 - THREE.MathUtils.smoothstep(d, flat[3] * 0.45, flat[3]);
        y += (flat[1] - y) * k;
      }
      positions.push(x, y, z);
      uvs.push(u, (s + 1) / 2);
    }
  }
  const row = across * 2 + 1;
  for (let i = 0; i < steps; i++)
    for (let j = 0; j < across * 2; j++) {
      const a = i * row + j;
      const b = a + row;
      indices.push(a, a + 1, b, b, a + 1, b + 1);
    }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** Leaf frame → canonical blade frame helpers. */
const BLADE_ORIGIN = new THREE.Vector3(Math.cos(LEAF_ANGLE), 0, Math.sin(LEAF_ANGLE)).multiplyScalar(LEAF_BASE);
const BLADE_ROTATION = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -LEAF_ANGLE);

const leaf: SceneBuilder = ({ kit, children }) => {
  const root = new THREE.Group();
  const env = new THREE.Group();
  const random = rng(12);

  /* ---------------- The vein pattern, painted once. ---------------- */
  const texture = kit.canvasTexture(2048, 1024, (g, w, h) => {
    const lamina = g.createLinearGradient(0, 0, w, 0);
    lamina.addColorStop(0, "#3a9f47");
    lamina.addColorStop(0.45, "#47b24d");
    lamina.addColorStop(1, "#58c052");
    g.fillStyle = lamina;
    g.fillRect(0, 0, w, h);
    // Lighter towards the margin, darker along the midrib.
    const across = g.createLinearGradient(0, 0, 0, h);
    across.addColorStop(0, "rgba(176, 232, 104, 0.4)");
    across.addColorStop(0.28, "rgba(176, 232, 104, 0)");
    across.addColorStop(0.5, "rgba(20, 90, 50, 0.16)");
    across.addColorStop(0.72, "rgba(176, 232, 104, 0)");
    across.addColorStop(1, "rgba(176, 232, 104, 0.4)");
    g.fillStyle = across;
    g.fillRect(0, 0, w, h);
    g.lineCap = "round";
    g.lineJoin = "round";
    type P = { x: number; y: number };
    /** A smooth vein as a filled, tapering ribbon. */
    const ribbon = (points: P[], w0: number, w1: number, color: string) => {
      const left: P[] = [];
      const right: P[] = [];
      points.forEach((p, i) => {
        const a = points[Math.max(0, i - 1)];
        const b = points[Math.min(points.length - 1, i + 1)];
        const tx = b.x - a.x;
        const ty = b.y - a.y;
        const l = Math.hypot(tx, ty) || 1;
        const hw = (w0 + (w1 - w0) * (i / (points.length - 1))) / 2;
        left.push({ x: p.x - (ty / l) * hw, y: p.y + (tx / l) * hw });
        right.push({ x: p.x + (ty / l) * hw, y: p.y - (tx / l) * hw });
      });
      g.fillStyle = color;
      g.beginPath();
      g.moveTo(left[0].x, left[0].y);
      for (const p of left) g.lineTo(p.x, p.y);
      for (let i = right.length - 1; i >= 0; i--) g.lineTo(right[i].x, right[i].y);
      g.closePath();
      g.fill();
      g.beginPath();
      g.arc(points[0].x, points[0].y, w0 / 2, 0, Math.PI * 2);
      g.fill();
    };
    const veins: P[][] = [];
    for (const side of [-1, 1]) {
      for (let k = 0; k < SECONDARIES; k++) {
        const u0 = 0.05 + k * 0.095 + (side > 0 ? 0.02 : 0);
        const reach = 0.13 + 0.05 * Math.sin((k / SECONDARIES) * Math.PI);
        const points: P[] = [];
        for (let i = 0; i <= 40; i++) {
          const t = i / 40;
          const u = u0 + reach * (t * 0.55 + 0.45 * t * t);
          const sv = side * 0.93 * Math.pow(t, 0.8);
          points.push({ x: u * w, y: ((1 - sv) / 2) * h });
        }
        veins.push(points);
      }
    }
    // Tertiary veins: gentle arcs linking neighbouring secondaries.
    g.strokeStyle = "rgba(196, 242, 128, 0.3)";
    g.lineWidth = 2.6;
    const net = rng(4);
    for (let v = 0; v < veins.length - 1; v++) {
      if (v === SECONDARIES - 1) continue;
      const a = veins[v];
      const b = veins[v + 1];
      for (let f = 0.1 + net() * 0.1; f < 0.92; f += 0.12 + net() * 0.08) {
        const p = a[Math.round(f * (a.length - 1))];
        const q = b[Math.round(Math.max(0, Math.min(1, f - 0.1 + net() * 0.06)) * (b.length - 1))];
        g.beginPath();
        g.moveTo(p.x, p.y);
        g.quadraticCurveTo((p.x + q.x) / 2 + 10, (p.y + q.y) / 2 + (net() - 0.5) * 14, q.x, q.y);
        g.stroke();
      }
    }
    // Secondary veins and the midrib.
    for (const points of veins) ribbon(points, 11, 2.5, "rgba(206, 246, 138, 0.9)");
    const midrib: P[] = [];
    for (let i = 0; i <= 60; i++) midrib.push({ x: (i / 60) * w * 0.985, y: h / 2 });
    ribbon(midrib, 30, 4, "rgba(222, 250, 152, 0.95)");
  });
  const shade: [number, number, number] = [0.4, 0.62, 0.72];
  const tint: [number, number, number] = [0.04, 0.16, 0.28];
  const bladeMaterial = tintShadow(
    kit.textured(texture, { rim: 0.35, rimColor: "#eaffb0", gloss: 0.22, soft: 0.28, side: THREE.DoubleSide }),
    shade,
    tint,
    0.2,
  );

  /* ---------------- The hero blade, flat under the section anchor. ---------------- */
  // The section anchor lies exactly on this surface (u = 0.6, s = 0.4), tilted like its normal.
  const section = children.find((child) => child.id === "leaf-section");
  const sectionAt = new THREE.Vector3(...(section?.at ?? [0.607, 0.261, 1.278]));
  const bladeGeom = kit.geometry(bladeGeometry(140, 16));
  const blade = new THREE.Mesh(bladeGeom, bladeMaterial);
  blade.position.copy(BLADE_ORIGIN);
  blade.quaternion.copy(BLADE_ROTATION);
  root.add(blade);

  /* ---------------- Midrib ridge, petiole and twig (one merged geometry). ---------------- */
  const woody: THREE.BufferGeometry[] = [];
  const midribPoints: THREE.Vector3[] = [];
  for (let i = 0; i <= 12; i++) {
    const u = (i / 12) * 0.96;
    const p = new THREE.Vector3(u * LENGTH, bladeHeight(u, 0) + 0.02, 0);
    midribPoints.push(p.applyQuaternion(BLADE_ROTATION).add(BLADE_ORIGIN));
  }
  const vein = new THREE.Color(GREENS.vein);
  const stalk = new THREE.Color("#8fcf5a");
  woody.push(taperedTube(midribPoints, (t) => 0.1 * (1 - t) + 0.015, { segments: 60, radial: 8, color: vein }));
  const baseMid = midribPoints[0];
  const petiole = [
    LEAF_NODE.clone(),
    LEAF_NODE.clone().lerp(baseMid, 0.35).add(new THREE.Vector3(0, 0.35, 0)),
    LEAF_NODE.clone().lerp(baseMid, 0.75).add(new THREE.Vector3(0, 0.2, 0)),
    baseMid.clone(),
  ];
  woody.push(taperedTube(petiole, (t) => 0.2 - 0.08 * t, { segments: 24, radial: 10, color: stalk, colorEnd: vein }));
  const twigColor = new THREE.Color("#8a6a44");
  const twigTip = new THREE.Color("#7fa04a");
  woody.push(taperedTube(LEAF_TWIG, (t) => 0.32 - 0.12 * t, { segments: 40, radial: 12, color: twigColor, colorEnd: twigTip, cap: true }));
  // Terminal bud.
  const bud = new THREE.SphereGeometry(1, 14, 10);
  bud.scale(0.28, 0.28, 0.55);
  const budAt = LEAF_TWIG[LEAF_TWIG.length - 1];
  const budDir = budAt.clone().sub(LEAF_TWIG[LEAF_TWIG.length - 2]).normalize();
  bud.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), budDir));
  bud.translate(budAt.x + budDir.x * 0.4, budAt.y + budDir.y * 0.4, budAt.z + budDir.z * 0.4);
  const budColors = new Float32Array(bud.getAttribute("position").count * 3);
  const budColor = new THREE.Color("#b0703c");
  for (let i = 0; i < budColors.length; i += 3) budColors.set([budColor.r, budColor.g, budColor.b], i);
  bud.setAttribute("color", new THREE.BufferAttribute(budColors, 3));
  bud.deleteAttribute("uv");
  woody.push(bud);
  const woodyGeometry = kit.geometry(mergeGeometries(woody)!);
  woody.forEach((g) => g.dispose());
  root.add(
    new THREE.Mesh(
      woodyGeometry,
      tintShadow(kit.toon("#ffffff", { vertexColors: true, rim: 0.3, rimColor: "#f4ffc8", gloss: 0.3, soft: 0.25 }), shade, tint, 0.2),
    ),
  );

  /* ---------------- A dew drop resting on the waxy surface. ---------------- */
  {
    const u = 0.8;
    const z = -0.32 * halfWidth(u);
    const surface = new THREE.Vector3(u * LENGTH, bladeHeight(u, z), z).applyQuaternion(BLADE_ROTATION).add(BLADE_ORIGIN);
    const drop = new THREE.Mesh(
      kit.geometry(new THREE.SphereGeometry(0.3, 32, 20)),
      kit.toon("#e6fff2", { opacity: 0.5, gloss: 0.9, rim: 0.95, rimColor: "#ffffff", soft: 0.15, depthWrite: false }),
    );
    drop.scale.set(1, 0.62, 1);
    drop.position.copy(surface).add(new THREE.Vector3(0, 0.15, 0));
    const shine = kit.glow("#ffffff", 0.32, { opacity: 0.95 });
    shine.position.copy(drop.position).add(new THREE.Vector3(-0.1, 0.14, -0.06));
    const lens = new THREE.Mesh(kit.geometry(new THREE.CircleGeometry(0.2, 24)), kit.flat("#1f7a3e", { opacity: 0.35, depthWrite: false }));
    lens.rotation.x = -Math.PI / 2;
    lens.position.copy(surface).add(new THREE.Vector3(0.05, 0.02, 0.06));
    root.add(lens, drop, shine);
  }

  /* ---------------- Light glints on the waxy surface. ---------------- */
  const glints: number[] = [];
  for (let k = 0; k < 9; k++) {
    const u = 0.15 + random() * 0.75;
    const z = (random() * 2 - 1) * halfWidth(u) * 0.8;
    const p = new THREE.Vector3(u * LENGTH, bladeHeight(u, z) + 0.06, z).applyQuaternion(BLADE_ROTATION).add(BLADE_ORIGIN);
    if (p.distanceTo(sectionAt) < 1) continue;
    glints.push(p.x, p.y, p.z);
  }
  root.add(kit.points(glints, { size: 0.3, color: "#fffbe0", soft: 1, twinkle: 1, additive: true, opacity: 0.8 }));

  /* ================= Surroundings ================= */
  // Other leaves of the spray (instanced, fluttering around their petiole).
  const neighbourGeometry = kit.geometry(bladeGeometry(48, 6));
  const neighbours = new THREE.InstancedMesh(
    neighbourGeometry,
    tintShadow(kit.textured(texture, { rim: 0.3, rimColor: "#dfffa8", gloss: 0.15, soft: 0.3, side: THREE.DoubleSide, env: true }), shade, tint, 0.2),
    NEIGHBOURS.length,
  );
  // Neighbours are a little darker and cooler than the hero leaf (they sit deeper in the shade).
  const tones = ["#6f9a8c", "#86ad8f", "#9cc39a", "#b3d5a4"].map((c) => new THREE.Color(c));
  const petioles: THREE.BufferGeometry[] = [];
  const bases = NEIGHBOURS.map((n, k) => {
    const tip = new THREE.Vector3(...n.tip).normalize();
    const face = new THREE.Vector3(...n.face);
    face.addScaledVector(tip, -face.dot(tip)).normalize();
    const side = new THREE.Vector3().crossVectors(tip, face).normalize();
    const basis = new THREE.Matrix4().makeBasis(tip, face, side);
    const scale = n.length / LENGTH;
    neighbours.setColorAt(k, tones[n.tone]);
    // The blade starts after a short petiole, as on the hero leaf.
    const node = new THREE.Vector3(...n.node);
    const bladeBase = node.clone().addScaledVector(tip, n.length * 0.2);
    petioles.push(
      taperedTube([node, node.clone().lerp(bladeBase, 0.5).add(new THREE.Vector3(0, 0.25, 0)), bladeBase], (t) => 0.17 - 0.06 * t, {
        segments: 10,
        radial: 7,
        color: stalk,
        colorEnd: vein,
      }),
    );
    return { basis, scale, node: bladeBase, phase: random() * 6, side };
  });
  env.add(neighbours);
  const neighbourStalks: THREE.BufferGeometry[] = [
    taperedTube(SECOND_TWIG, (t) => 0.3 - 0.1 * t, { segments: 30, radial: 10, color: twigColor, colorEnd: twigTip, cap: true }),
    ...petioles,
  ];
  const stalkMaterial = kit.toon("#ffffff", { vertexColors: true, rim: 0.3, gloss: 0.2, env: true });
  env.add(new THREE.Mesh(kit.geometry(mergeGeometries(neighbourStalks)!), stalkMaterial));
  neighbourStalks.forEach((g) => g.dispose());

  // Sunny bokeh through the canopy, far behind.
  const bokeh: number[] = [];
  const bokehColors: number[] = [];
  const bokehSizes: number[] = [];
  const palette = ["#ffe9a0", "#e8ff9a", "#b8f59a", "#fff6d8", "#ffd27a"].map((c) => new THREE.Color(c));
  for (let k = 0; k < 46; k++) {
    bokeh.push((random() * 2 - 1) * 24, -12 - random() * 8, (random() * 2 - 1) * 18);
    const color = palette[Math.floor(random() * palette.length)];
    bokehColors.push(color.r, color.g, color.b);
    bokehSizes.push(0.5 + random() * random() * 2.2);
  }
  const bokehPoints = kit.points(bokeh, { size: 1.6, colors: bokehColors, sizes: bokehSizes, soft: 0.5, opacity: 0.22, twinkle: 0.35, env: true });
  env.add(bokehPoints);
  // Soft sun glow at the top left.
  const sun = kit.glow("#fff1b8", 26, { opacity: 0.5, env: true });
  sun.position.set(-13, -9, -15);
  env.add(sun);

  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  return {
    root,
    env,
    update({ time }) {
      bases.forEach((b, k) => {
        const flutter = 0.06 * Math.sin(time * 1.3 + b.phase) + 0.03 * Math.sin(time * 2.9 + b.phase * 2);
        q.setFromAxisAngle(b.side, flutter);
        m.copy(b.basis).premultiply(new THREE.Matrix4().makeRotationFromQuaternion(q));
        m.scale(scale.setScalar(b.scale));
        m.setPosition(b.node);
        neighbours.setMatrixAt(k, m);
      });
      neighbours.instanceMatrix.needsUpdate = true;
      bokehPoints.rotation.y = Math.sin(time * 0.05) * 0.05;
    },
  };
};

export default leaf;
