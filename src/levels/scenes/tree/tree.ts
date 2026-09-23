/**
 * The hero tree of the park (1 unit = 80 cm, trunk base at y = −5).
 * Trunk and branches, a canopy of leafy clumps swaying in the wind, a small
 * twig of real-size leaves carrying the child level "leaf" (kept still), a
 * perched bird and a falling leaf. Surroundings: a cut-away of the soil with
 * roots spreading wider than the crown, a patch of lawn and the sky.
 */
import * as THREE from "three";
import { mergeGeometries, mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { PALETTE, rng } from "../../../engine/kit";
import type { Kit } from "../../../engine/kit";
import type { SceneBuilder } from "../types";
import { contactShadow } from "../common/props";
import {
  GREENS,
  LEAF_TWIG,
  NEIGHBOURS,
  SECOND_TWIG,
  addWind,
  leafCard,
  tintShadow,
  taperedTube,
  windUniforms,
} from "./treeShared";

const GROUND = -5;
const BARK = new THREE.Color("#8a5a3c");
const BARK_LIGHT = new THREE.Color("#a86d45");

/** Leafy clumps of the crown: centre, radius and tone (0 = deep … 4 = light). */
const CLUMPS: [number, number, number, number, number][] = [
  // back layer
  [-2.4, 1.2, -1.5, 1.6, 0],
  [2.3, 1.5, -1.4, 1.6, 0],
  [0.0, 2.6, -1.8, 1.8, 1],
  [-1.2, 3.7, -1.0, 1.3, 2],
  [1.2, 3.6, -1.1, 1.3, 2],
  // middle ring
  [-3.05, 0.35, -0.2, 1.3, 0],
  [3.05, 0.55, -0.1, 1.25, 1],
  [-2.65, 2.0, 0.4, 1.5, 2],
  [2.6, 2.2, 0.3, 1.45, 2],
  [-1.3, 3.25, 0.5, 1.45, 3],
  [1.3, 3.35, 0.3, 1.4, 3],
  [0.0, 3.85, -0.1, 1.15, 4],
  // front layer
  [-1.5, 0.2, 1.5, 1.35, 2],
  [0.1, 1.3, 1.9, 1.55, 3],
  [1.6, 0.0, 1.6, 1.3, 2],
  [-0.2, -0.75, 0.8, 1.15, 1],
  [2.3, 1.8, 1.3, 1.15, 3],
  [-2.3, 1.6, 1.4, 1.1, 3],
  [0.95, 2.65, 1.35, 1.2, 4],
  [-0.95, 2.6, 1.45, 1.2, 4],
];
/** The clump carrying the hero leaf's twig. */
const ANCHOR_CLUMP = 14;
const FOLIAGE_SHADE: [number, number, number] = [0.36, 0.6, 0.74];
const FOLIAGE_TINT: [number, number, number] = [0.05, 0.17, 0.3];
const TONES = [GREENS.deep, GREENS.dark, GREENS.mid, GREENS.bright, GREENS.light].map((c) => new THREE.Color(c));

/** A leafy clump: a sphere covered with soft pillow-like bumps. */
function clumpGeometry(seed: number, detail: number, tone: THREE.Color) {
  const random = rng(seed);
  const base = new THREE.IcosahedronGeometry(1, detail);
  base.deleteAttribute("normal");
  base.deleteAttribute("uv");
  const geometry = mergeVertices(base);
  base.dispose();
  const bumps: { d: THREE.Vector3; r: number; h: number }[] = [];
  for (let k = 0; k < 34; k++) {
    const u = random() * 2 - 1;
    const a = random() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    bumps.push({ d: new THREE.Vector3(Math.cos(a) * s, u, Math.sin(a) * s), r: 0.34 + random() * 0.24, h: 0.1 + random() * 0.09 });
  }
  const position = geometry.getAttribute("position") as THREE.BufferAttribute;
  const colors = new Float32Array(position.count * 3);
  const light = tone.clone().lerp(new THREE.Color("#e8ff9a"), 0.22);
  const shade = tone.clone().multiplyScalar(0.86);
  const v = new THREE.Vector3();
  const c = new THREE.Color();
  for (let i = 0; i < position.count; i++) {
    v.fromBufferAttribute(position, i).normalize();
    let bump = 0;
    for (const b of bumps) {
      const x = 1 - Math.acos(Math.min(1, v.dot(b.d))) / b.r;
      if (x > 0) bump = Math.max(bump, b.h * Math.sqrt(x * (2 - x)));
    }
    const r = 0.88 + bump;
    const y = v.y < 0 ? v.y * 0.8 : v.y;
    position.setXYZ(i, v.x * r, y * r, v.z * r);
    c.copy(shade).lerp(light, Math.min(1, bump / 0.16) * 0.5 + Math.max(0, v.y) * 0.4);
    colors.set([c.r, c.g, c.b], i * 3);
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}

/** Direction the home camera looks from (tree frame). */
const VIEW = new THREE.Vector3(0, 0.2, 1).normalize();

/**
 * Instance matrix for a leaf card on a clump surface with normal `n`: the
 * card faces between the normal and the viewer and points outwards, so the
 * crown's silhouette is scalloped by leaves rather than fringed by edges.
 */
function cardMatrix(p: THREE.Vector3, n: THREE.Vector3, size: number, spin: number, out: THREE.Matrix4) {
  const face = n.clone().multiplyScalar(0.55).addScaledVector(VIEW, 0.75).normalize();
  const outward = n.clone().addScaledVector(face, -n.dot(face));
  if (outward.lengthSq() < 1e-4) outward.set(0, 1, 0).addScaledVector(face, -face.y);
  const tip = outward.normalize().applyAxisAngle(face, spin);
  const side = tip.clone().cross(face).normalize();
  out.makeBasis(side, tip, face);
  out.scale(new THREE.Vector3(size, size, size));
  out.setPosition(p);
  return out;
}

const tree: SceneBuilder = ({ kit, children }) => {
  const root = new THREE.Group();
  const env = new THREE.Group();
  const random = rng(8);

  const leafChild = children.find((child) => child.id === "leaf");
  const anchor = new THREE.Vector3(...(leafChild?.at ?? [1.95, 0.35, 3.05]));
  const leafRotation = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(...((leafChild?.rotate ?? [40, 0, 0]).map((d) => (d * Math.PI) / 180) as [number, number, number])),
  );
  const leafRatio = leafChild?.ratio ?? 0.0125;
  const toTree = (p: THREE.Vector3) => p.clone().applyQuaternion(leafRotation).multiplyScalar(leafRatio).add(anchor);

  const wind = windUniforms(anchor, 0.55, 1.9, -2.2);

  /* ---------------- Trunk and branches (one merged geometry). ---------------- */
  const wood: THREE.BufferGeometry[] = [];
  const trunkPoints = [
    new THREE.Vector3(0, GROUND - 0.2, 0),
    new THREE.Vector3(0.05, GROUND + 1.0, 0.02),
    new THREE.Vector3(-0.07, -2.6, 0.04),
    new THREE.Vector3(0.0, -1.5, 0),
  ];
  const trunk = taperedTube(
    trunkPoints,
    (t) => 0.33 + 0.14 * (1 - t) + 0.36 * Math.pow(Math.max(0, 1 - t * 5), 2.4),
    { segments: 40, radial: 32, color: BARK, colorEnd: BARK_LIGHT },
  );
  // Soft vertical bark grooves.
  const trunkColors = trunk.getAttribute("color") as THREE.BufferAttribute;
  const trunkPositions = trunk.getAttribute("position") as THREE.BufferAttribute;
  for (let i = 0; i < trunkColors.count; i++) {
    const angle = ((i % 33) / 32) * Math.PI * 2;
    const y = trunkPositions.getY(i);
    const groove = Math.pow(0.5 + 0.5 * Math.sin(angle * 7 + Math.sin(y * 1.1 + angle * 3) * 0.9), 8);
    const k = 1 - 0.2 * groove;
    trunkColors.setXYZ(i, trunkColors.getX(i) * k, trunkColors.getY(i) * k, trunkColors.getZ(i) * k);
  }
  wood.push(trunk);
  const branch = (points: number[][], r0: number, r1: number) =>
    wood.push(
      taperedTube(
        points.map(([x, y, z]) => new THREE.Vector3(x, y, z)),
        (t) => r0 + (r1 - r0) * Math.pow(t, 0.8),
        { segments: 18, radial: 10, color: BARK, colorEnd: BARK_LIGHT, cap: true },
      ),
    );
  const fork = [0.0, -1.75, 0];
  branch([fork, [-0.8, -0.75, 0.25], [-1.9, 0.4, 0.5], [-2.8, 1.4, 0.4]], 0.26, 0.07);
  branch([fork, [0.8, -0.65, 0.15], [1.8, 0.4, 0.35], [2.7, 1.6, 0.2]], 0.26, 0.07);
  branch([fork, [0.05, -0.4, -0.3], [-0.25, 1.4, -0.4], [0.1, 3.3, -0.5]], 0.24, 0.06);
  branch([fork, [0.45, -1.1, 0.6], [1.1, -0.6, 1.2], [1.55, -0.35, 1.7]], 0.17, 0.05);
  branch([fork, [-0.45, -1.0, 0.6], [-1.1, -0.4, 1.1], [-1.5, 0.1, 1.5]], 0.16, 0.05);
  branch([fork, [-0.3, -0.7, -0.7], [-1.3, 0.3, -1.2], [-2.3, 1.1, -1.4]], 0.16, 0.05);
  branch([fork, [0.4, -0.7, -0.6], [1.4, 0.3, -1.1], [2.3, 1.3, -1.3]], 0.16, 0.05);
  branch([[-1.7, 0.2, 0.5], [-2.6, 0.35, 0.8], [-3.35, 0.2, 0.75]], 0.08, 0.035);
  branch([[1.6, 0.2, 0.35], [2.5, 0.3, 0.6], [3.2, 0.5, 0.55]], 0.08, 0.035);
  branch([[-0.2, 1.2, -0.4], [-1.0, 2.2, -0.1], [-1.5, 3.0, 0.2]], 0.09, 0.03);
  branch([[-0.1, 1.6, -0.4], [0.8, 2.4, -0.2], [1.3, 3.1, 0.1]], 0.09, 0.03);
  // A low side branch sticking out of the crown on the left: the bird's perch.
  branch([[0.0, -2.45, 0.1], [-0.8, -2.15, 0.45], [-1.8, -1.9, 0.7], [-2.7, -1.5, 0.8], [-3.1, -1.1, 0.75]], 0.12, 0.035);

  // Twigs of the hero spray (static): the hero twig continues in the leaf scene from LEAF_TWIG[0].
  const twigColor = new THREE.Color("#8a6a44");
  const twigTip = new THREE.Color("#7fa04a");
  const heroBase = toTree(LEAF_TWIG[0]);
  const secondBase = toTree(SECOND_TWIG[0]);
  const inside = anchor.clone().add(new THREE.Vector3(-0.45, 0.05, -0.8));
  wood.push(
    taperedTube([inside, inside.clone().lerp(heroBase, 0.55).add(new THREE.Vector3(0, 0.03, 0)), heroBase], (t) => 0.0075 - 0.0035 * t, {
      segments: 14,
      radial: 7,
      color: BARK_LIGHT,
      colorEnd: twigColor,
    }),
  );
  wood.push(
    taperedTube([inside, inside.clone().lerp(secondBase, 0.5).add(new THREE.Vector3(0, 0.02, 0)), secondBase], (t) => 0.0065 - 0.003 * t, {
      segments: 12,
      radial: 7,
      color: BARK_LIGHT,
      colorEnd: twigColor,
    }),
  );
  wood.push(
    taperedTube(SECOND_TWIG.map(toTree), (t) => (0.3 - 0.1 * t) * leafRatio, { segments: 16, radial: 7, color: twigColor, colorEnd: twigTip, cap: true }),
  );
  const woodGeometry = kit.geometry(mergeGeometries(wood)!);
  wood.forEach((g) => g.dispose());
  const woodMaterial = addWind(kit.toon("#ffffff", { vertexColors: true, rim: 0.25, rimColor: "#ffd2a8", soft: 0.3 }), wind);
  const woodMesh = new THREE.Mesh(woodGeometry, woodMaterial);
  root.add(woodMesh);

  /* ---------------- Crown: leafy clumps (one merged geometry). ---------------- */
  const clumpGeometries: THREE.BufferGeometry[] = [];
  CLUMPS.forEach(([x, y, z, r, tone], k) => {
    const g = clumpGeometry(100 + k * 7, z > 0.5 ? 10 : 7, TONES[tone]);
    g.scale(r, r, r);
    g.rotateY(k * 1.3);
    g.translate(x, y, z);
    clumpGeometries.push(g);
  });
  const crownGeometry = kit.geometry(mergeGeometries(clumpGeometries)!);
  clumpGeometries.forEach((g) => g.dispose());
  const crownMaterial = addWind(
    tintShadow(kit.toon("#ffffff", { vertexColors: true, rim: 0.34, rimColor: "#f2ffb8", soft: 0.16, gloss: 0.16 }), FOLIAGE_SHADE, FOLIAGE_TINT, 0.2),
    wind,
    0.018,
  );
  const crown = new THREE.Mesh(crownGeometry, crownMaterial);
  root.add(crown);

  /* ---------------- Leaf cards on the crown surface (instanced). ---------------- */
  const cardGeometry = kit.geometry(leafCard({ steps: 4 }));
  const insideOther = (p: THREE.Vector3, self: number) =>
    CLUMPS.some(([x, y, z, r], k) => k !== self && p.distanceTo(new THREE.Vector3(x, y, z)) < r * 0.93);
  const cardCount = kit.count(1500, 700);
  const cards = new THREE.InstancedMesh(
    cardGeometry,
    addWind(
      tintShadow(kit.toon("#ffffff", { rim: 0.25, rimColor: "#f0ffc0", soft: 0.3, gloss: 0.1, side: THREE.DoubleSide }), FOLIAGE_SHADE, FOLIAGE_TINT, 0.2),
      wind,
      0.022,
    ),
    cardCount + 1000,
  );
  const m = new THREE.Matrix4();
  const n = new THREE.Vector3();
  const p = new THREE.Vector3();
  const c = new THREE.Color();
  let placed = 0;
  for (let tries = 0; placed < cardCount && tries < cardCount * 6; tries++) {
    const k = Math.floor(random() * CLUMPS.length);
    const [x, y, z, r, tone] = CLUMPS[k];
    const u = random() * 2 - 1;
    const a = random() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    n.set(Math.cos(a) * s, u, Math.sin(a) * s);
    // Favour the visible (front and upper) faces.
    if (n.z < -0.1 && random() < 0.85) continue;
    p.set(x, y, z).addScaledVector(n, r * (0.94 + random() * 0.1));
    if (insideOther(p, k)) continue;
    if (p.distanceTo(anchor) < 1.2) continue;
    const size = 0.16 + random() * 0.08;
    cards.setMatrixAt(placed, cardMatrix(p, n, size, (random() - 0.5) * 2.2, m));
    c.copy(TONES[tone]).lerp(TONES[Math.min(4, tone + 1)], 0.3 + random() * 0.5);
    if (n.y > 0.3) c.lerp(TONES[4], 0.35);
    cards.setColorAt(placed++, c);
  }
  // Around the hero leaf: a denser patch of real-size leaves on its clump…
  const [ax, ay, az, ar] = CLUMPS[ANCHOR_CLUMP];
  const clumpCenter = new THREE.Vector3(ax, ay, az);
  for (let k = 0; k < kit.count(900, 450); k++) {
    n.set(random() * 2 - 1, random() * 2 - 1, random() * 2 - 1).normalize();
    p.copy(clumpCenter).addScaledVector(n, ar * (0.96 + random() * 0.08));
    const d = p.distanceTo(anchor);
    if (d > 1.5 || d < 0.16 || n.dot(VIEW) < -0.1 || insideOther(p, ANCHOR_CLUMP)) continue;
    cards.setMatrixAt(placed, cardMatrix(p, n, 0.11 + random() * 0.03, (random() - 0.5) * 2.4, m));
    cards.setColorAt(placed++, c.copy(TONES[2]).lerp(TONES[3 + Math.floor(random() * 2)], random()));
  }
  // …and the other leaves of its spray, placed exactly as in the leaf scene.
  const sprayQ = new THREE.Quaternion();
  for (const leafSpec of NEIGHBOURS) {
    const tip = new THREE.Vector3(...leafSpec.tip).normalize();
    const face = new THREE.Vector3(...leafSpec.face);
    face.addScaledVector(tip, -face.dot(tip)).normalize();
    const side = tip.clone().cross(face).normalize();
    m.makeBasis(side, tip, face);
    sprayQ.setFromRotationMatrix(m).premultiply(leafRotation);
    const length = leafSpec.length * leafRatio;
    const base = toTree(new THREE.Vector3(...leafSpec.node).addScaledVector(tip, leafSpec.length * 0.2));
    cards.setMatrixAt(placed, m.compose(base, sprayQ, new THREE.Vector3(length, length, length)));
    cards.setColorAt(placed++, c.copy(TONES[Math.min(4, leafSpec.tone + 2)]));
  }
  // A leafy tuft at the tip of the bird's branch.
  const tuft = new THREE.Vector3(-3.1, -1.1, 0.75);
  for (let k = 0; k < 26; k++) {
    n.set(random() * 2 - 1, random() * 1.6 - 0.5, random() * 2 - 1).normalize();
    p.copy(tuft).addScaledVector(n, 0.12 + random() * 0.2);
    cards.setMatrixAt(placed, cardMatrix(p, n, 0.15 + random() * 0.06, (random() - 0.5) * 2, m));
    cards.setColorAt(placed++, c.copy(TONES[2 + Math.floor(random() * 3)]));
  }
  cards.count = placed;
  root.add(cards);

  /* ---------------- A perched bird on the left branch. ---------------- */
  const bird = new THREE.Group();
  const birdBody = new THREE.Mesh(kit.geometry(new THREE.SphereGeometry(1, 18, 14)), kit.toon("#ff8a3d", { rim: 0.35, rimColor: "#ffd9a8" }));
  birdBody.scale.set(0.13, 0.11, 0.1);
  const birdBack = new THREE.Mesh(kit.geometry(new THREE.SphereGeometry(1, 18, 14)), kit.toon("#6b5b9a", { rim: 0.3 }));
  birdBack.scale.set(0.12, 0.1, 0.095);
  birdBack.position.set(-0.03, 0.03, -0.012);
  const head = new THREE.Group();
  head.position.set(0.09, 0.08, 0);
  const headBall = new THREE.Mesh(kit.geometry(new THREE.SphereGeometry(0.075, 16, 12)), kit.toon("#6b5b9a", { rim: 0.3 }));
  const face = new THREE.Mesh(kit.geometry(new THREE.SphereGeometry(0.058, 14, 10)), kit.toon("#ff8a3d", { rim: 0.2 }));
  face.position.set(0.03, -0.02, 0.02);
  const beak = new THREE.Mesh(kit.geometry(new THREE.ConeGeometry(0.018, 0.06, 8)), kit.toon(PALETTE.amber, { rim: 0.2 }));
  beak.rotation.z = -Math.PI / 2;
  beak.position.set(0.09, -0.005, 0.01);
  const eye = new THREE.Mesh(kit.geometry(new THREE.SphereGeometry(0.014, 8, 6)), kit.flat("#1d1440"));
  eye.position.set(0.045, 0.02, 0.055);
  head.add(headBall, face, beak, eye);
  const tail = new THREE.Mesh(kit.geometry(new THREE.ConeGeometry(0.04, 0.16, 6)), kit.toon("#5a4b88", { rim: 0.2 }));
  tail.rotation.z = Math.PI / 2 + 0.5;
  tail.scale.set(1, 1, 0.35);
  tail.position.set(-0.16, 0.0, 0);
  bird.add(birdBody, birdBack, head, tail);
  bird.position.set(-1.85, -1.73, 0.72);
  bird.scale.setScalar(1.3);
  bird.rotation.y = 0.35;
  root.add(bird);

  const shadow = contactShadow(kit, 3.6, { opacity: 0.22, stretch: 0.55 });
  shadow.position.y = GROUND + 0.01;
  root.add(shadow);

  /* ================= Surroundings ================= */
  buildGround(kit, env, random);

  // A falling leaf.
  const fallingLeaf = new THREE.Mesh(
    cardGeometry,
    kit.toon("#ffffff", { rim: 0.3, side: THREE.DoubleSide, env: true }),
  );
  // An old leaf turning yellow, as a few always do, drifting down against the sky.
  (fallingLeaf.material as THREE.ShaderMaterial).uniforms.uColor.value.set("#ffc23f");
  fallingLeaf.scale.setScalar(0.17);
  env.add(fallingLeaf);

  // Two birds circling high above the crown.
  const flyers: THREE.Group[] = [];
  const flyerMaterial = kit.flat("#2d2466", { side: THREE.DoubleSide, env: true });
  const wingGeometry = kit.geometry(new THREE.BufferGeometry());
  wingGeometry.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0, 0.42, 0.1, 0.04, 0.19, 0, -0.12], 3));
  wingGeometry.computeVertexNormals();
  for (let k = 0; k < 2; k++) {
    const flyer = new THREE.Group();
    const left = new THREE.Mesh(wingGeometry, flyerMaterial);
    const right = new THREE.Mesh(wingGeometry, flyerMaterial);
    right.scale.x = -1;
    flyer.add(left, right);
    flyer.userData = { left, right, phase: k * 2.4 };
    env.add(flyer);
    flyers.push(flyer);
  }

  // Sky: clouds (instanced puffs) and a warm sun.
  const puff = kit.geometry(new THREE.SphereGeometry(1, 20, 14));
  const cloudMesh = new THREE.InstancedMesh(
    puff,
    kit.toon("#ffffff", { shadow: "#b9c8f2", rim: 0.25, rimColor: "#ffffff", soft: 0.35, env: true }),
    30,
  );
  const cloudSpecs: [number, number, number, number][] = [
    [-9.5, 5.5, -12, 1.5],
    [8.5, 6.8, -13, 1.9],
    [11, 2.2, -9, 1.1],
  ];
  let puffs = 0;
  const cloudRandom = rng(31);
  const q = new THREE.Quaternion();
  const sc = new THREE.Vector3();
  for (const [x, y, z, size] of cloudSpecs) {
    for (let i = 0; i < 6; i++) {
      const t = i / 5 - 0.5;
      const r = size * (0.42 + 0.35 * Math.sin(Math.PI * (i / 5)) + cloudRandom() * 0.12);
      cloudMesh.setMatrixAt(
        puffs++,
        m.compose(p.set(x + t * size * 2.4, y + r * 0.35, z + (cloudRandom() - 0.5) * size * 0.5), q, sc.set(r, r * 0.92, r * 0.85)),
      );
    }
    cloudMesh.setMatrixAt(puffs++, m.compose(p.set(x, y, z), q, sc.set(size * 1.45, size * 0.28, size * 0.55)));
  }
  cloudMesh.count = puffs;
  env.add(cloudMesh);
  const sun = kit.glow("#fff3c4", 16, { opacity: 0.55, env: true });
  sun.position.set(-10, 10, -14);
  env.add(sun);

  const birdParts = { head, tail };
  return {
    root,
    env,
    update({ time }) {
      wind.uWindTime.value = time;
      // Bird: small head turns and an occasional tail flick.
      const beat = time % 4.2;
      birdParts.head.rotation.y = Math.sin(time * 0.9) * 0.35 + (beat > 3.6 ? 0.4 : 0);
      birdParts.head.rotation.z = beat > 2.0 && beat < 2.35 ? -0.35 : 0.05 * Math.sin(time * 2);
      birdParts.tail.rotation.z = Math.PI / 2 + 0.5 + (beat > 1.0 && beat < 1.2 ? 0.35 : 0);
      bird.position.y = -1.73 + (beat > 3.0 && beat < 3.25 ? Math.sin(((beat - 3.0) / 0.25) * Math.PI) * 0.08 : 0);
      // Falling leaf: a 9 s loop from under the crown to the lawn, swinging like a pendulum.
      const f = (time % 9) / 9;
      const fall = Math.min(1, f / 0.82);
      const swing = Math.sin(fall * 11);
      fallingLeaf.position.set(2.7 + swing * 0.4 + fall * 0.9, -1.2 + (GROUND + 0.06 + 1.2) * fall, 1.5 - fall * 1.1);
      fallingLeaf.rotation.set(fall < 1 ? 1.3 + swing * 0.7 : Math.PI / 2, fall * 5, fall < 1 ? Math.cos(fall * 11) * 0.8 : 0);
      fallingLeaf.visible = f < 0.97;
      flyers.forEach((flyer, k) => {
        const a = time * 0.3 + flyer.userData.phase;
        flyer.position.set(Math.cos(a) * (6.5 + k) + 1, 6.2 + k * 0.6 + Math.sin(time * 0.8 + k) * 0.2, Math.sin(a) * 3 - 4);
        flyer.rotation.y = -a;
        const flap = Math.sin(time * 7 + flyer.userData.phase) * 0.6;
        (flyer.userData.left as THREE.Mesh).rotation.z = flap;
        (flyer.userData.right as THREE.Mesh).rotation.z = -flap;
      });
    },
  };
};

/** Lawn, soil cut-away and roots: a half island cut in front of the trunk. */
function buildGround(kit: Kit, env: THREE.Group, random: () => number) {
  const CUT = 0.95; // z of the vertical cut face
  const R = 9;
  const DEPTH = 3.4;
  const bottomAt = (x: number) => GROUND - 0.35 - DEPTH * Math.sqrt(Math.max(0, 1 - (x / R) ** 2));

  // Lawn: half disc behind the cut.
  const lawnGeometry = kit.geometry(new THREE.CircleGeometry(R, 72, 0, Math.PI));
  lawnGeometry.rotateX(-Math.PI / 2);
  lawnGeometry.translate(0, GROUND, CUT);
  const lp = lawnGeometry.getAttribute("position");
  const lawnColors: number[] = [];
  const light = new THREE.Color("#72d860");
  const dark = new THREE.Color("#46b84f");
  const c = new THREE.Color();
  for (let i = 0; i < lp.count; i++) {
    const x = lp.getX(i);
    const z = lp.getZ(i);
    const k = 0.5 + 0.5 * Math.sin(x * 0.9 + Math.cos(z * 0.8) * 1.6) * Math.cos(z * 0.7 - x * 0.3);
    c.copy(dark).lerp(light, k);
    lawnColors.push(c.r, c.g, c.b);
  }
  lawnGeometry.setAttribute("color", new THREE.Float32BufferAttribute(lawnColors, 3));
  const lawn = new THREE.Mesh(lawnGeometry, kit.toon("#ffffff", { vertexColors: true, rim: 0, gloss: 0, soft: 0.5, env: true, side: THREE.DoubleSide }));
  env.add(lawn);
  // Grassy lip along the cut edge and the rim.
  const lipCurve: THREE.Vector3[] = [];
  for (let i = 0; i <= 48; i++) {
    const a = Math.PI + (i / 48) * Math.PI;
    lipCurve.push(new THREE.Vector3(Math.cos(a) * R, GROUND - 0.02, CUT + Math.sin(a) * R));
  }
  const lipMaterial = kit.toon("#4cbf52", { rim: 0.3, env: true });
  env.add(new THREE.Mesh(kit.geometry(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(lipCurve), 96, 0.09, 8)), lipMaterial));
  const frontLip = new THREE.Mesh(kit.geometry(new THREE.CylinderGeometry(0.1, 0.1, 2 * R, 10, 1)), lipMaterial);
  frontLip.rotation.z = Math.PI / 2;
  frontLip.position.set(0, GROUND - 0.04, CUT);
  env.add(frontLip);

  // Soil: painted strata on the cut face.
  const soilTexture = kit.canvasTexture(1024, 256, (g, w, h) => {
    const bands = ["#5b3320", "#6e4029", "#7f4d30", "#8e5a37", "#9a6843", "#a8744c", "#94603c"];
    let y = 0;
    let k = 0;
    const band = [18, 26, 30, 34, 40, 48, 60];
    while (y < h) {
      g.fillStyle = bands[Math.min(k, bands.length - 1)];
      g.beginPath();
      g.moveTo(0, y);
      for (let x = 0; x <= w; x += 32) g.lineTo(x, y + Math.sin(x * 0.013 + k * 1.7) * 5);
      g.lineTo(w, h);
      g.lineTo(0, h);
      g.fill();
      y += band[Math.min(k, band.length - 1)];
      k++;
    }
    // Dark humus top band.
    const top = g.createLinearGradient(0, 0, 0, 30);
    top.addColorStop(0, "rgba(40, 22, 14, 0.9)");
    top.addColorStop(1, "rgba(40, 22, 14, 0)");
    g.fillStyle = top;
    g.fillRect(0, 0, w, 30);
    const pebbles = rng(19);
    for (let i = 0; i < 70; i++) {
      g.fillStyle = pebbles() > 0.5 ? "#c9a27c" : "#6a4630";
      g.beginPath();
      g.ellipse(pebbles() * w, 30 + pebbles() * (h - 34), 2 + pebbles() * 6, 1.5 + pebbles() * 3.5, pebbles(), 0, Math.PI * 2);
      g.fill();
    }
  });
  const faceSegments = 64;
  const facePositions: number[] = [];
  const faceUvs: number[] = [];
  const faceIndex: number[] = [];
  for (let i = 0; i <= faceSegments; i++) {
    const x = -R + (2 * R * i) / faceSegments;
    const yb = bottomAt(x);
    facePositions.push(x, GROUND, CUT, x, yb, CUT);
    faceUvs.push(i / faceSegments, 1, i / faceSegments, 1 - (GROUND - yb) / (DEPTH + 0.35));
    if (i > 0) {
      const a = (i - 1) * 2;
      faceIndex.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const faceGeometry = kit.geometry(new THREE.BufferGeometry());
  faceGeometry.setAttribute("position", new THREE.Float32BufferAttribute(facePositions, 3));
  faceGeometry.setAttribute("uv", new THREE.Float32BufferAttribute(faceUvs, 2));
  faceGeometry.setIndex(faceIndex);
  faceGeometry.computeVertexNormals();
  env.add(new THREE.Mesh(faceGeometry, kit.textured(soilTexture, { env: true, rim: 0.1, soft: 0.5, gloss: 0 })));
  // Rounded back of the island.
  const profile: THREE.Vector2[] = [];
  for (let i = 0; i <= 16; i++) {
    const x = R * (1 - i / 16);
    profile.push(new THREE.Vector2(Math.max(0.01, x), bottomAt(x)));
  }
  const back = new THREE.Mesh(
    kit.geometry(new THREE.LatheGeometry(profile, 48, Math.PI / 2, Math.PI)),
    kit.toon("#7a4a2c", { env: true, rim: 0.15, side: THREE.DoubleSide }),
  );
  back.position.z = CUT;
  env.add(back);

  // Roots: a shallow network in the cut face, spreading wider than the crown.
  const rootGeometries: THREE.BufferGeometry[] = [];
  const rootRandom = rng(55);
  const rootColor = new THREE.Color("#e2a36b");
  const rootTip = new THREE.Color("#f3c894");
  const tips: number[] = [];
  // Laterals stay shallow and bend back towards the horizontal; fine roots branch off.
  const grow = (start: THREE.Vector3, angle: number, length: number, radius: number, depth: number, target: number) => {
    const points = [start.clone()];
    let a = angle;
    const steps = 7;
    const step = length / steps;
    const pt = start.clone();
    for (let i = 0; i < steps; i++) {
      a += (target - a) * 0.28 + (rootRandom() - 0.5) * 0.45;
      pt.x += Math.cos(a) * step;
      pt.y += Math.sin(a) * step;
      pt.y = Math.min(pt.y, GROUND - 0.22);
      if (pt.y < bottomAt(pt.x) + 0.3) pt.y = bottomAt(pt.x) + 0.3;
      pt.z = CUT - 0.03 + (rootRandom() - 0.5) * 0.04;
      points.push(pt.clone());
    }
    rootGeometries.push(
      taperedTube(points, (t) => radius * (1 - t * 0.8), {
        segments: depth > 1 ? 28 : depth > 0 ? 16 : 10,
        radial: depth > 1 ? 8 : 5,
        color: rootColor,
        colorEnd: rootTip,
        cap: true,
      }),
    );
    const end = points[points.length - 1];
    tips.push(end.x, end.y, end.z + 0.05);
    if (depth > 0) {
      const branches = depth > 1 ? 4 : 3;
      for (let b = 0; b < branches; b++) {
        const t = 0.2 + ((b + rootRandom() * 0.8) / branches) * 0.75;
        const from = points[Math.max(1, Math.round(t * (points.length - 1)))];
        const dir = Math.cos(a) >= 0 ? 1 : -1;
        const down = rootRandom() < 0.55;
        const sub = down ? -Math.PI / 2 + dir * (0.35 + rootRandom() * 0.5) : (dir > 0 ? 0.1 : Math.PI - 0.1) + (rootRandom() - 0.5) * 0.5;
        grow(from, sub, length * (0.28 + rootRandom() * 0.18), radius * (1 - t * 0.8) * 0.6, depth - 1, down ? sub - dir * 0.1 : sub);
      }
    }
  };
  const collar = new THREE.Vector3(0, GROUND - 0.18, CUT);
  const laterals: [number, number, number, number, number][] = [
    // x offset, angle, length, radius, target angle
    [-0.35, Math.PI + 0.1, 7.6, 0.17, Math.PI + 0.06],
    [0.35, -0.08, 7.8, 0.17, -0.05],
    [-0.25, Math.PI + 0.45, 5.2, 0.14, Math.PI + 0.22],
    [0.25, -0.42, 5.4, 0.14, -0.2],
    [-0.12, Math.PI + 0.95, 3.0, 0.12, Math.PI + 0.7],
    [0.12, -0.95, 3.2, 0.12, -0.7],
  ];
  for (const [dx, angle, length, radius, target] of laterals)
    grow(collar.clone().setX(dx), angle, length, radius, 2, target);
  const rootsGeometry = kit.geometry(mergeGeometries(rootGeometries)!);
  rootGeometries.forEach((g) => g.dispose());
  env.add(
    new THREE.Mesh(rootsGeometry, kit.toon("#ffffff", { vertexColors: true, rim: 0.3, rimColor: "#ffe2bd", soft: 0.3, env: true })),
  );
  // Fungal threads glowing softly around the root tips (mycorrhizae).
  const hyphae: number[] = [];
  for (let i = 0; i < tips.length; i += 3)
    for (let k = 0; k < 4; k++)
      hyphae.push(tips[i] + (random() - 0.5) * 0.5, tips[i + 1] + (random() - 0.5) * 0.35, tips[i + 2] + 0.02);
  env.add(kit.points(hyphae, { size: 0.05, color: "#fff4d6", opacity: 0.75, soft: 0.5, twinkle: 0.5, env: true }));

  // Grass tufts and flowers on the lawn.
  const tuftGeometry = kit.geometry(new THREE.ConeGeometry(0.06, 0.28, 5));
  tuftGeometry.translate(0, 0.17, 0);
  const tufts = new THREE.InstancedMesh(tuftGeometry, kit.toon("#2f9a45", { rim: 0.2, soft: 0.4, env: true }), kit.count(200));
  const flowerGeometry = kit.geometry(new THREE.IcosahedronGeometry(0.09, 1));
  const flowers = new THREE.InstancedMesh(flowerGeometry, kit.toon("#ffffff", { rim: 0.2, gloss: 0.3, env: true }), kit.count(70));
  const flowerColors = [PALETTE.pink, PALETTE.yellow, "#ffffff", PALETTE.lavender, PALETTE.coral];
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();
  let placed = 0;
  const onLawn = () => {
    for (;;) {
      const x = (random() * 2 - 1) * R;
      const z = CUT - random() * R;
      if (Math.hypot(x, z - CUT) < R - 0.3 && Math.hypot(x, z) > 0.8) return [x, z];
    }
  };
  for (; placed < tufts.count; placed++) {
    const [x, z] = onLawn();
    q.setFromEuler(new THREE.Euler((random() - 0.5) * 0.4, random() * 6, (random() - 0.5) * 0.4));
    s.setScalar(0.6 + random() * 0.8);
    tufts.setMatrixAt(placed, m.compose(p.set(x, GROUND, z), q, s));
  }
  for (placed = 0; placed < flowers.count; placed++) {
    const [x, z] = onLawn();
    s.setScalar(0.7 + random() * 0.6);
    flowers.setMatrixAt(placed, m.compose(p.set(x, GROUND + 0.14, z), q.identity(), s));
    flowers.setColorAt(placed, c.set(flowerColors[Math.floor(random() * flowerColors.length)]));
  }
  env.add(tufts, flowers);
}

export default tree;
