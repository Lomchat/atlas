/**
 * Home: a small floating diorama of a park (1 unit = 4 m).
 * The person, the tree and the pond are separate levels drawn at their anchors.
 */
import * as THREE from "three";
import { PALETTE, rng } from "../../../engine/kit";
import type { SceneBuilder } from "../types";
import { cloud, contactShadow, stylizedTree } from "../common/props";

const RADIUS = 5;

const park: SceneBuilder = ({ kit, children }) => {
  const root = new THREE.Group();
  const env = new THREE.Group();
  const random = rng(42);

  // Keep decoration away from the children and the path.
  const keepOut = children.map((child) => ({
    x: child.at[0],
    z: child.at[2],
    r: child.id === "tree" ? 0.75 : child.id === "pond" ? 1.05 : 0.45,
  }));
  const pathCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(3.9, 0, 3.1),
    new THREE.Vector3(2.2, 0, 2.2),
    new THREE.Vector3(0.9, 0, 0.6),
    new THREE.Vector3(-0.2, 0, -0.9),
    new THREE.Vector3(-0.4, 0, -2.4),
    new THREE.Vector3(0.6, 0, -4.4),
  ]);
  const pathPoints = pathCurve.getSpacedPoints(80);
  const free = (x: number, z: number, margin = 0) => {
    if (Math.hypot(x, z) > RADIUS - 0.25) return false;
    for (const k of keepOut) if (Math.hypot(x - k.x, z - k.z) < k.r + margin) return false;
    for (const p of pathPoints) if (Math.hypot(x - p.x, z - p.z) < 0.32 + margin) return false;
    return true;
  };

  /* Grass top with painterly colour variation. */
  const grassGeometry = kit.geometry(new THREE.CircleGeometry(RADIUS, 96, 0, Math.PI * 2));
  grassGeometry.rotateX(-Math.PI / 2);
  const position = grassGeometry.getAttribute("position");
  const colors: number[] = [];
  const light = new THREE.Color("#6fd65f");
  const dark = new THREE.Color("#46b84f");
  const c = new THREE.Color();
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const z = position.getZ(i);
    const n = 0.5 + 0.5 * Math.sin(x * 1.3 + Math.cos(z * 1.1) * 1.6) * Math.cos(z * 0.9 - x * 0.4);
    c.copy(dark).lerp(light, n);
    colors.push(c.r, c.g, c.b);
  }
  grassGeometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  const grass = new THREE.Mesh(
    grassGeometry,
    kit.toon("#ffffff", { vertexColors: true, rim: 0, gloss: 0, soft: 0.5 }),
  );
  root.add(grass);

  // Rounded grassy lip around the edge.
  const lip = new THREE.Mesh(
    kit.geometry(new THREE.TorusGeometry(RADIUS - 0.02, 0.09, 10, 120)),
    kit.toon("#4cbf52", { rim: 0.3 }),
  );
  lip.rotation.x = Math.PI / 2;
  lip.position.y = -0.03;
  root.add(lip);

  /* Soil cut-away: appears only once you are in the park. */
  const soilTexture = kit.canvasTexture(1024, 128, (g, w, h) => {
    const bands = ["#9a6340", "#86532f", "#a8704a", "#744427", "#8b5733", "#5f361f"];
    let y = 0;
    let k = 0;
    while (y < h) {
      const band = 10 + ((k * 37) % 23);
      g.fillStyle = bands[k % bands.length];
      g.beginPath();
      g.moveTo(0, y);
      for (let x = 0; x <= w; x += 32) g.lineTo(x, y + Math.sin(x * 0.02 + k) * 3);
      g.lineTo(w, h);
      g.lineTo(0, h);
      g.fill();
      y += band;
      k++;
    }
    const pebbles = rng(9);
    for (let i = 0; i < 90; i++) {
      g.fillStyle = pebbles() > 0.5 ? "#c9a27c" : "#5a3a28";
      g.beginPath();
      g.ellipse(pebbles() * w, 18 + pebbles() * (h - 22), 2 + pebbles() * 5, 1.5 + pebbles() * 3, 0, 0, Math.PI * 2);
      g.fill();
    }
    g.strokeStyle = "#e7c9a0";
    g.lineWidth = 2;
    for (let i = 0; i < 14; i++) {
      const x = pebbles() * w;
      g.beginPath();
      g.moveTo(x, 0);
      g.bezierCurveTo(x + 10, 20, x - 12, 40, x + 6, 60 + pebbles() * 40);
      g.stroke();
    }
  });
  soilTexture.wrapS = THREE.RepeatWrapping;
  soilTexture.repeat.set(3, 1);
  const soil = new THREE.Mesh(
    kit.geometry(new THREE.CylinderGeometry(RADIUS, RADIUS - 0.55, 1.1, 96, 1, true)),
    kit.textured(soilTexture, { env: true, rim: 0.15, soft: 0.4 }),
  );
  soil.position.y = -0.56;
  env.add(soil);
  const bottom = new THREE.Mesh(
    kit.geometry(new THREE.CircleGeometry(RADIUS - 0.55, 64)),
    kit.flat("#4a2a18", { env: true }),
  );
  bottom.rotation.x = Math.PI / 2;
  bottom.position.y = -1.11;
  env.add(bottom);

  /* Path. */
  const pathShape: number[] = [];
  const pathIndex: number[] = [];
  const tangent = new THREE.Vector3();
  const side = new THREE.Vector3();
  pathPoints.forEach((p, i) => {
    pathCurve.getTangent(i / (pathPoints.length - 1), tangent);
    side.set(-tangent.z, 0, tangent.x).normalize();
    const width = 0.26 + 0.04 * Math.sin(i * 0.5);
    pathShape.push(p.x + side.x * width, 0.006, p.z + side.z * width);
    pathShape.push(p.x - side.x * width, 0.006, p.z - side.z * width);
    if (i > 0) {
      const a = (i - 1) * 2;
      pathIndex.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  });
  const pathGeometry = kit.geometry(new THREE.BufferGeometry());
  pathGeometry.setAttribute("position", new THREE.Float32BufferAttribute(pathShape, 3));
  pathGeometry.setIndex(pathIndex);
  pathGeometry.computeVertexNormals();
  const path = new THREE.Mesh(pathGeometry, kit.toon("#f4dcaa", { rim: 0, gloss: 0, side: THREE.DoubleSide }));
  root.add(path);

  /* Trees around the edge (decoration only: the child "tree" is its own level). */
  const decorations: THREE.Object3D[] = [];
  const treeSpecs = [
    { x: -3.3, z: -2.4, h: 2.5, leaves: ["#2f9e55", "#43b863", "#27864a"], kind: "round" as const },
    { x: 3.4, z: 1.2, h: 1.7, leaves: ["#ff9f43", "#ffb44f", "#f47c3c"], kind: "round" as const },
    { x: -1.4, z: -4.0, h: 2.9, leaves: ["#1f8a5c", "#2aa56b", "#177049"], kind: "cone" as const },
    { x: 3.2, z: -2.6, h: 2.1, leaves: ["#3fb9a0", "#4fd3b3", "#2f9c88"], kind: "round" as const },
    { x: -4.1, z: 0.8, h: 1.5, leaves: ["#56c24e", "#6fd65f", "#3fa947"], kind: "round" as const },
  ];
  treeSpecs.forEach((spec, k) => {
    const tree = stylizedTree(kit, { height: spec.h, seed: k * 13 + 5, leaves: spec.leaves, kind: spec.kind });
    tree.position.set(spec.x, 0, spec.z);
    tree.rotation.y = random() * Math.PI * 2;
    root.add(tree);
    const shadow = contactShadow(kit, spec.h * 0.32, { opacity: 0.22 });
    shadow.position.set(spec.x + 0.1, 0.01, spec.z + 0.1);
    root.add(shadow);
    decorations.push(tree);
  });

  /* Bushes. */
  const bushMaterials = ["#3fae4a", "#58c957", "#2e9a50"].map((color) => kit.toon(color, { rim: 0.35 }));
  for (let i = 0; i < 16; i++) {
    const angle = random() * Math.PI * 2;
    const radius = 3.6 + random() * 1.1;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    if (!free(x, z, 0.2)) continue;
    const r = 0.18 + random() * 0.22;
    for (let j = 0; j < 3; j++) {
      const bush = new THREE.Mesh(kit.blob(1, { detail: 2, noise: 0.1, seed: i * 3 + j }), bushMaterials[(i + j) % 3]);
      bush.scale.setScalar(r * (1 - j * 0.2));
      bush.position.set(x + (j - 1) * r * 0.7, r * 0.55 * (1 - j * 0.2), z + (random() - 0.5) * r);
      root.add(bush);
    }
  }

  /* Rocks near the pond. */
  const pond = children.find((child) => child.id === "pond");
  if (pond) {
    const rockMaterial = kit.toon("#a7a3c7", { rim: 0.3 });
    for (let i = 0; i < 7; i++) {
      const angle = 0.6 + i * 0.5;
      const r = 1.0 + random() * 0.15;
      const rock = new THREE.Mesh(kit.blob(1, { detail: 1, noise: 0.18, seed: 30 + i }), rockMaterial);
      const s = 0.07 + random() * 0.08;
      rock.scale.set(s * 1.3, s * 0.8, s);
      rock.position.set(pond.at[0] + Math.cos(angle) * r, s * 0.4, pond.at[2] + Math.sin(angle) * r);
      root.add(rock);
    }
  }

  /* Grass tufts and flowers (instanced). */
  const tuftGeometry = kit.geometry(new THREE.ConeGeometry(0.035, 0.14, 5));
  tuftGeometry.translate(0, 0.07, 0);
  const tufts = new THREE.InstancedMesh(tuftGeometry, kit.toon("#2f9a45", { rim: 0.2, soft: 0.4 }), kit.count(420));
  const flowerGeometry = kit.geometry(new THREE.IcosahedronGeometry(0.045, 1));
  const flowers = new THREE.InstancedMesh(flowerGeometry, kit.toon("#ffffff", { rim: 0.2, gloss: 0.3 }), kit.count(170));
  const flowerColors = [PALETTE.pink, PALETTE.yellow, "#ffffff", PALETTE.lavender, PALETTE.coral];
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();
  let placed = 0;
  for (let tries = 0; placed < tufts.count && tries < 4000; tries++) {
    const x = (random() * 2 - 1) * RADIUS;
    const z = (random() * 2 - 1) * RADIUS;
    if (!free(x, z)) continue;
    q.setFromEuler(new THREE.Euler((random() - 0.5) * 0.4, random() * 6, (random() - 0.5) * 0.4));
    s.setScalar(0.7 + random() * 0.8);
    tufts.setMatrixAt(placed++, m.compose(p.set(x, 0, z), q, s));
  }
  tufts.count = placed;
  placed = 0;
  for (let tries = 0; placed < flowers.count && tries < 4000; tries++) {
    const x = (random() * 2 - 1) * RADIUS;
    const z = (random() * 2 - 1) * RADIUS;
    if (!free(x, z, 0.05)) continue;
    s.setScalar(0.7 + random() * 0.7);
    flowers.setMatrixAt(placed, m.compose(p.set(x, 0.07, z), q.identity(), s));
    flowers.setColorAt(placed++, c.set(flowerColors[Math.floor(random() * flowerColors.length)]));
  }
  flowers.count = placed;
  root.add(tufts, flowers);

  /* Bench and picnic blanket. */
  const wood = kit.toon("#c07a44", { rim: 0.25 });
  const iron = kit.toon("#4b4a7a", { rim: 0.2 });
  const bench = new THREE.Group();
  const box = (w: number, h: number, d: number, x: number, y: number, z: number, material: THREE.Material) => {
    const mesh = new THREE.Mesh(kit.geometry(new THREE.BoxGeometry(w, h, d)), material);
    mesh.position.set(x, y, z);
    bench.add(mesh);
  };
  box(0.5, 0.03, 0.13, 0, 0.12, 0, wood);
  box(0.5, 0.1, 0.025, 0, 0.21, -0.06, wood);
  box(0.03, 0.12, 0.12, -0.21, 0.06, 0, iron);
  box(0.03, 0.12, 0.12, 0.21, 0.06, 0, iron);
  bench.position.set(1.55, 0, 1.55);
  bench.rotation.y = -0.9;
  root.add(bench);
  const benchShadow = contactShadow(kit, 0.32, { opacity: 0.2, stretch: 0.5 });
  benchShadow.position.set(1.55, 0.01, 1.55);
  benchShadow.rotation.z = -0.9;
  root.add(benchShadow);

  const checker = kit.canvasTexture(128, 128, (g, w, h) => {
    g.fillStyle = "#ffffff";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#ff5a6e";
    const n = 6;
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) if ((i + j) % 2 === 0) g.fillRect((i * w) / n, (j * h) / n, w / n, h / n);
  });
  checker.magFilter = THREE.NearestFilter;
  const blanket = new THREE.Mesh(kit.geometry(new THREE.PlaneGeometry(0.62, 0.48)), kit.textured(checker, { rim: 0, gloss: 0 }));
  blanket.rotation.x = -Math.PI / 2;
  blanket.rotation.z = 0.35;
  const person = children.find((child) => child.id === "person");
  blanket.position.set((person?.at[0] ?? 0) + 0.55, 0.008, (person?.at[2] ?? 0) + 0.05);
  root.add(blanket);
  const basket = new THREE.Mesh(
    kit.geometry(new THREE.CylinderGeometry(0.07, 0.06, 0.08, 12)),
    kit.toon("#e0a45a", { rim: 0.3 }),
  );
  basket.position.set(blanket.position.x + 0.14, 0.05, blanket.position.z - 0.06);
  root.add(basket);

  /* Butterflies. */
  const butterflies: { group: THREE.Group; wings: THREE.Mesh[]; phase: number; center: THREE.Vector3 }[] = [];
  const wingGeometry = kit.geometry(new THREE.CircleGeometry(0.05, 12));
  wingGeometry.translate(0.045, 0, 0);
  ["#ffd23f", "#ff6fb1", "#6fc3ff"].forEach((color, k) => {
    const group = new THREE.Group();
    const material = kit.toon(color, { side: THREE.DoubleSide, rim: 0, flat: 0.4 });
    const left = new THREE.Mesh(wingGeometry, material);
    const right = new THREE.Mesh(wingGeometry, material);
    right.scale.x = -1;
    group.add(left, right);
    root.add(group);
    butterflies.push({
      group,
      wings: [left, right],
      phase: k * 2.1,
      center: new THREE.Vector3(-2 + k * 1.9, 0.35, 2.4 - k * 1.3),
    });
  });

  /* Sky: clouds, birds and a warm sun glow, part of the surroundings. */
  const clouds: THREE.Group[] = [];
  const cloudSpecs = [
    [-6.5, 4.2, -5, 1.3],
    [5.5, 5.4, -6.5, 1.6],
    [-2, 6.2, -9, 1.1],
    [7.5, 2.4, 1, 1.0],
    [-8, 1.8, 2, 0.9],
  ];
  cloudSpecs.forEach(([x, y, z, size], k) => {
    const puff = cloud(kit, { size, seed: 20 + k, env: true });
    puff.position.set(x, y, z);
    env.add(puff);
    clouds.push(puff);
  });
  const sun = kit.glow("#fff3c4", 14, { opacity: 0.55, env: true });
  sun.position.set(-9, 9, -12);
  env.add(sun);

  const birds: THREE.Group[] = [];
  const birdMaterial = kit.flat("#2d2466", { side: THREE.DoubleSide, env: true });
  const wing = kit.geometry(new THREE.BufferGeometry());
  wing.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0, 0.22, 0.05, 0.02, 0.1, 0, -0.06], 3));
  wing.computeVertexNormals();
  for (let k = 0; k < 3; k++) {
    const bird = new THREE.Group();
    const left = new THREE.Mesh(wing, birdMaterial);
    const right = new THREE.Mesh(wing, birdMaterial);
    right.scale.x = -1;
    bird.add(left, right);
    bird.userData = { left, right, phase: k * 1.7 };
    env.add(bird);
    birds.push(bird);
  }

  // Soft shadow under the whole island.
  const islandShadow = contactShadow(kit, 5.4, { opacity: 0.18, env: true });
  islandShadow.position.y = -2.4;
  env.add(islandShadow);

  return {
    root,
    env,
    update({ time }) {
      decorations.forEach((tree, k) => {
        const canopy = tree.userData.canopy as THREE.Object3D | undefined;
        if (canopy) canopy.rotation.z = Math.sin(time * 0.9 + k) * 0.025;
      });
      clouds.forEach((puff, k) => {
        puff.position.x = cloudSpecs[k][0] + Math.sin(time * 0.05 + k) * 0.8;
      });
      birds.forEach((bird, k) => {
        const a = time * 0.35 + k * 0.5;
        bird.position.set(Math.cos(a) * (4.2 + k * 0.4) - 1, 3.6 + k * 0.3 + Math.sin(time + k) * 0.1, Math.sin(a) * 3 - 1);
        bird.rotation.y = -a;
        const flap = Math.sin(time * 9 + bird.userData.phase) * 0.6;
        (bird.userData.left as THREE.Mesh).rotation.z = flap;
        (bird.userData.right as THREE.Mesh).rotation.z = -flap;
      });
      butterflies.forEach((b) => {
        const t = time * 0.6 + b.phase;
        b.group.position.set(
          b.center.x + Math.sin(t) * 0.35,
          b.center.y + Math.sin(t * 2.3) * 0.08,
          b.center.z + Math.cos(t * 0.8) * 0.3,
        );
        b.group.rotation.y = Math.atan2(Math.cos(t), -Math.sin(t * 0.8));
        const flap = 0.9 * Math.sin(time * 14 + b.phase);
        b.wings[0].rotation.y = flap;
        b.wings[1].rotation.y = -flap;
      });
    },
  };
};

export default park;
