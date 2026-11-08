/**
 * The chapter map: a floating circuit board, like the park diorama of the
 * Atlas. Bits run as light along its gold traces from the central processor
 * to one small station per chapter: a lamp (the bit), a logic gate, a
 * magnifier over the processor (inside a computer), a padlock and its key,
 * a small neural network and a speech bubble (language models). Little bars
 * and rings, the 1 and the 0 of the power symbol, float up from the board.
 *
 * Anchors `lesson-<id>` sit above each station for the chapter labels.
 */
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { rng } from "../../engine/kit";
import type { Kit } from "../../engine/kit";
import { contactShadow } from "../../levels/scenes/common/props";
import { approach } from "./fx";
import type { StageBuilder } from "./types";

type XZ = [number, number];

const TOP = 0.42;
const STATIONS: Record<string, XZ> = {
  bits: [-3.9, -1.3],
  gates: [-1.4, -2.55],
  inside: [0, 0],
  keys: [2.5, -2.3],
  neurons: [4, 0.95],
  llm: [-3, 2.05],
};

function roundedSlab(kit: Kit, width: number, depth: number, radius: number, height: number, bevel = 0.08) {
  const shape = new THREE.Shape();
  const w = width / 2 - radius;
  const d = depth / 2 - radius;
  shape.moveTo(-w, -d - radius);
  shape.lineTo(w, -d - radius);
  shape.absarc(w, -d, radius, -Math.PI / 2, 0, false);
  shape.lineTo(w + radius, d);
  shape.absarc(w, d, radius, 0, Math.PI / 2, false);
  shape.lineTo(-w, d + radius);
  shape.absarc(-w, d, radius, Math.PI / 2, Math.PI, false);
  shape.lineTo(-w - radius, -d);
  shape.absarc(-w, -d, radius, Math.PI, Math.PI * 1.5, false);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: height - bevel * 2,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 3,
    curveSegments: 10,
  });
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, bevel, 0);
  geometry.computeVertexNormals();
  return kit.geometry(geometry);
}

const board: StageBuilder = ({ kit }) => {
  const random = rng(2024);
  const root = new THREE.Group();
  const island = new THREE.Group();
  root.add(island);
  const anchors: Record<string, THREE.Object3D> = {};
  const rounded = (w: number, h: number, d: number, r: number) => kit.geometry(new RoundedBoxGeometry(w, h, d, 4, r));
  const color = (material: THREE.Material) => (material as THREE.ShaderMaterial).uniforms.uColor.value as THREE.Color;

  /* ---------------- The board ---------------- */
  const pcb = new THREE.Mesh(roundedSlab(kit, 11.4, 7.8, 0.9, 0.42), kit.toon("#18a88b", { shadow: "#0d5f63", rim: 0.4, rimColor: "#8ff5d6", gloss: 0.12 }));
  const base = new THREE.Mesh(roundedSlab(kit, 11, 7.4, 0.85, 0.7), kit.toon("#4a2d9c", { shadow: "#26145e", rim: 0.3 }));
  base.position.y = -0.62;
  const keel = new THREE.Mesh(roundedSlab(kit, 9.6, 6.2, 0.8, 0.5), kit.toon("#2e1a6e", { shadow: "#180b42", rim: 0.25 }));
  keel.position.y = -1.05;
  island.add(pcb, base, keel);
  const shadow = contactShadow(kit, 6.6, { opacity: 0.35, stretch: 0.68, color: "#0c0628" });
  shadow.position.y = -2.4;
  root.add(shadow);

  /* ---------------- Gold traces with travelling bits ---------------- */
  const cpuEdge = 1.25;
  const routes: XZ[][] = [
    [[-cpuEdge, -0.35], [-2.6, -0.35], [-2.6, -1.3], [-3.3, -1.3]],
    [[-0.5, -cpuEdge], [-0.5, -1.9], [-1.4, -1.9], [-1.4, -2.05]],
    [[0.5, -cpuEdge], [0.5, -1.7], [1.9, -1.7], [1.9, -2.3]],
    [[cpuEdge, 0.4], [2.6, 0.4], [2.6, 0.95], [3.3, 0.95]],
    [[-cpuEdge, 0.45], [-2.2, 0.45], [-2.2, 2.05], [-2.4, 2.05]],
    [[0.35, cpuEdge], [0.35, 2.6], [3.6, 2.6]],
    [[cpuEdge, -0.45], [3.9, -0.45], [3.9, -2.9]],
    [[-0.35, cpuEdge], [-0.35, 3.2], [-4.6, 3.2], [-4.6, 0.2]],
  ];
  const paths = routes.map((route) => {
    const points = route.map(([x, z]) => new THREE.Vector3(x, TOP + 0.012, z));
    island.add(kit.line(points, { color: "#f2c14e", width: 3.2 }));
    const lengths = [0];
    for (let k = 1; k < points.length; k++) lengths.push(lengths[k - 1] + points[k].distanceTo(points[k - 1]));
    const pad = new THREE.Mesh(kit.geometry(new THREE.CylinderGeometry(0.11, 0.11, 0.04, 16)), kit.flat("#f2c14e"));
    pad.position.copy(points[points.length - 1]);
    island.add(pad);
    return { points, lengths, total: lengths[lengths.length - 1] };
  });
  const pulsesPerPath = 2;
  const pulses = kit.points(new Float32Array(paths.length * pulsesPerPath * 3), { color: "#fff2b0", size: 0.36, soft: 1, additive: true });
  island.add(pulses);
  const along = (path: (typeof paths)[number], u: number, out: THREE.Vector3) => {
    const s = u * path.total;
    let k = 1;
    while (k < path.lengths.length - 1 && path.lengths[k] < s) k++;
    const t = (s - path.lengths[k - 1]) / Math.max(1e-6, path.lengths[k] - path.lengths[k - 1]);
    return out.copy(path.points[k - 1]).lerp(path.points[k], t);
  };

  /* ---------------- Small parts for texture ---------------- */
  {
    const parts = new THREE.InstancedMesh(rounded(1, 1, 1, 0.2), kit.toon("#2a2152", { rim: 0.4, rimColor: "#8f7bff" }), 12);
    const spots: [number, number, number, number][] = [
      [1.6, 1.2, 0.5, 0.3], [2.1, 1.2, 0.5, 0.3], [-1.9, 1.3, 0.3, 0.5], [-1.9, 1.85, 0.3, 0.5],
      [4.6, -1.6, 0.4, 0.7], [4.6, -2.5, 0.4, 0.7], [-4.6, -2.8, 0.6, 0.35], [-3.8, -2.8, 0.6, 0.35],
      [1.2, 3.2, 0.7, 0.35], [2.1, 3.2, 0.7, 0.35], [-0.9, -3.2, 0.35, 0.35], [4.7, 2.7, 0.5, 0.5],
    ];
    const m = new THREE.Matrix4();
    spots.forEach(([x, z, w, d], k) => {
      m.compose(new THREE.Vector3(x, TOP + 0.08, z), new THREE.Quaternion(), new THREE.Vector3(w, 0.16, d));
      parts.setMatrixAt(k, m);
    });
    island.add(parts);
    const capacitor = (x: number, z: number, h: number) => {
      const body = new THREE.Mesh(kit.geometry(new THREE.CylinderGeometry(0.28, 0.28, h, 28)), kit.toon("#3f7bff", { gloss: 0.4, rim: 0.4 }));
      body.position.set(x, TOP + h / 2, z);
      const lid = new THREE.Mesh(kit.geometry(new THREE.CylinderGeometry(0.26, 0.26, 0.04, 28)), kit.toon("#c9d6ff", { gloss: 0.5 }));
      lid.position.set(x, TOP + h + 0.02, z);
      island.add(body, lid);
    };
    capacitor(1.5, 2.1, 0.7);
    capacitor(2.15, 2.0, 0.55);
    capacitor(-4.7, -1.0, 0.6);
  }

  /* ---------------- Stations ---------------- */
  const station = (id: string, height: number) => {
    const [x, z] = STATIONS[id];
    const group = new THREE.Group();
    group.position.set(x, TOP, z);
    island.add(group);
    const socket = new THREE.Mesh(kit.geometry(new THREE.CylinderGeometry(0.85, 0.92, 0.12, 40)), kit.toon("#241c4f", { rim: 0.4, rimColor: "#8f7bff" }));
    socket.position.y = 0.06;
    const rim = kit.circle(0.86, { color: "#f2c14e", width: 2.2 });
    rim.position.y = 0.125;
    if (id !== "inside") group.add(socket, rim);
    const label = new THREE.Object3D();
    label.position.set(x, TOP + height, z);
    island.add(label);
    anchors[`lesson-${id}`] = label;
    return group;
  };

  // The bit: a lamp blinking 0, 1, 0, 1…
  const lampStation = station("bits", 1.9);
  const lampTile = new THREE.Mesh(rounded(1.05, 1.05, 0.3, 0.15), kit.toon("#2b1f6b", { rim: 0.5, rimColor: "#8f7bff" }));
  lampTile.position.y = 0.75;
  const bulbGeometry = kit.geometry(new THREE.SphereGeometry(0.33, 28, 18));
  bulbGeometry.scale(1, 1, 0.62);
  const bulbMaterial = kit.toon("#ffd23f", { gloss: 0.55, rim: 0.45 });
  const bulb = new THREE.Mesh(bulbGeometry, bulbMaterial);
  bulb.position.set(0, 0.75, 0.17);
  const bulbGlow = kit.glow("#ffd23f", 2.2, { opacity: 0.9 });
  bulbGlow.position.set(0, 0.75, 0.45);
  const foot = new THREE.Mesh(rounded(0.4, 0.3, 0.25, 0.08), kit.toon("#2b1f6b"));
  foot.position.y = 0.2;
  lampStation.add(foot, lampTile, bulb, bulbGlow);

  // Logic gate (AND): two inputs, one output.
  const gateStation = station("gates", 1.85);
  {
    const shape = new THREE.Shape();
    shape.moveTo(-0.55, -0.45);
    shape.lineTo(0, -0.45);
    shape.absarc(0, 0, 0.45, -Math.PI / 2, Math.PI / 2, false);
    shape.lineTo(-0.55, 0.45);
    shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.22, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 3, curveSegments: 16 });
    geometry.translate(0.05, 0, -0.11);
    const gate = new THREE.Mesh(kit.geometry(geometry), kit.toon("#3fd0ff", { rim: 0.45, gloss: 0.3 }));
    gate.position.y = 0.75;
    gateStation.add(gate);
  }
  const wireMaterial = kit.toon("#2b1f6b", { rim: 0.3 });
  const legs: { light: THREE.Mesh; material: THREE.ShaderMaterial }[] = [];
  for (const [x0, y, x1] of [
    [-1.0, 0.95, -0.55],
    [-1.0, 0.55, -0.55],
    [0.5, 0.75, 0.95],
  ]) {
    const wire = new THREE.Mesh(kit.geometry(new THREE.CylinderGeometry(0.035, 0.035, x1 - x0, 10)), wireMaterial);
    wire.rotation.z = Math.PI / 2;
    wire.position.set((x0 + x1) / 2, y, 0);
    const material = kit.toon("#ffd23f", { gloss: 0.5, rim: 0.4 }) as THREE.ShaderMaterial;
    const light = new THREE.Mesh(kit.geometry(new THREE.SphereGeometry(0.11, 16, 12)), material);
    light.position.set(x1 > 0 ? x1 : x0, y, 0);
    gateStation.add(wire, light);
    legs.push({ light, material });
  }
  const gatePost = new THREE.Mesh(rounded(0.3, 0.5, 0.2, 0.06), kit.toon("#241c4f"));
  gatePost.position.y = 0.25;
  gateStation.add(gatePost);

  // Inside a computer: the processor, under a magnifying glass.
  const cpuStation = station("inside", 2.45);
  const cpu = new THREE.Mesh(rounded(2.3, 0.36, 2.3, 0.12), kit.toon("#241c4f", { rim: 0.45, rimColor: "#8f7bff" }));
  cpu.position.y = 0.18;
  const cpuTop = new THREE.Mesh(rounded(1.4, 0.08, 1.4, 0.04), kit.toon("#4a3d9e", { gloss: 0.3 }));
  cpuTop.position.y = 0.38;
  cpuStation.add(cpu, cpuTop);
  {
    const pins = new THREE.InstancedMesh(kit.geometry(new THREE.BoxGeometry(0.12, 0.06, 0.32)), kit.toon("#f2c14e", { gloss: 0.5 }), 28);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    let k = 0;
    for (let side = 0; side < 4; side++)
      for (let i = 0; i < 7; i++) {
        q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), (side * Math.PI) / 2);
        const p = new THREE.Vector3((i - 3) * 0.3, 0.05, 1.28).applyQuaternion(q);
        m.compose(p, q, new THREE.Vector3(1, 1, 1));
        pins.setMatrixAt(k++, m);
      }
    cpuStation.add(pins);
  }
  const magnifier = new THREE.Group();
  magnifier.position.set(0.15, 1.45, 0.1);
  magnifier.rotation.set(-0.55, 0, -0.3);
  const lens = new THREE.Mesh(kit.geometry(new THREE.CircleGeometry(0.58, 40)), kit.toon("#bff4ff", { opacity: 0.3, rim: 0, flat: 0.6, depthWrite: false, side: THREE.DoubleSide }));
  const lensRing = new THREE.Mesh(kit.geometry(new THREE.TorusGeometry(0.6, 0.09, 14, 48)), kit.toon("#3ff2b5", { rim: 0.4, gloss: 0.4 }));
  const handle = new THREE.Mesh(kit.geometry(new THREE.CapsuleGeometry(0.09, 0.6, 6, 12)), kit.toon("#3ff2b5", { rim: 0.4 }));
  handle.position.set(0.62, -0.62, 0);
  handle.rotation.z = Math.PI / 4;
  magnifier.add(lens, lensRing, handle);
  cpuStation.add(magnifier);

  // Public and private keys: a padlock and its key.
  const lockStation = station("keys", 2);
  const lockBody = new THREE.Mesh(rounded(0.95, 0.8, 0.42, 0.14), kit.toon("#ff6fb1", { rim: 0.45, gloss: 0.35 }));
  lockBody.position.y = 0.6;
  const shackle = new THREE.Mesh(kit.geometry(new THREE.TorusGeometry(0.3, 0.075, 12, 32, Math.PI)), kit.toon("#e8e2ff", { gloss: 0.6, rim: 0.4 }));
  shackle.position.y = 1.0;
  const legGeometry = kit.geometry(new THREE.CylinderGeometry(0.075, 0.075, 0.2, 12));
  const shackleMaterial = kit.toon("#e8e2ff", { gloss: 0.6 });
  for (const x of [-0.3, 0.3]) {
    const leg = new THREE.Mesh(legGeometry, shackleMaterial);
    leg.position.set(x, 0.95, 0);
    lockStation.add(leg);
  }
  const keyhole = new THREE.Mesh(kit.geometry(new THREE.CircleGeometry(0.09, 20)), kit.flat("#3a0d2e"));
  keyhole.position.set(0, 0.64, 0.215);
  const slot = new THREE.Mesh(kit.geometry(new THREE.PlaneGeometry(0.06, 0.18)), kit.flat("#3a0d2e"));
  slot.position.set(0, 0.52, 0.215);
  lockStation.add(lockBody, shackle, keyhole, slot);
  const key = new THREE.Group();
  key.position.set(0.95, 0.95, 0.2);
  {
    const gold = kit.toon("#ffd23f", { gloss: 0.55, rim: 0.4 });
    const bow = new THREE.Mesh(kit.geometry(new THREE.TorusGeometry(0.17, 0.06, 10, 28)), gold);
    bow.position.y = 0.3;
    const shaft = new THREE.Mesh(kit.geometry(new THREE.BoxGeometry(0.08, 0.55, 0.08)), gold);
    shaft.position.y = -0.1;
    const tooth = kit.geometry(new THREE.BoxGeometry(0.14, 0.07, 0.07));
    for (const y of [-0.3, -0.18]) {
      const t = new THREE.Mesh(tooth, gold);
      t.position.set(0.1, y, 0);
      key.add(t);
    }
    key.add(bow, shaft);
  }
  lockStation.add(key);

  // A small neural network.
  const neuronStation = station("neurons", 2.1);
  const layers = [3, 4, 2];
  const nodes: THREE.Vector3[][] = layers.map((count, l) =>
    Array.from({ length: count }, (_, k) => new THREE.Vector3((l - 1) * 0.62, 0.95 + ((count - 1) / 2 - k) * 0.36, 0)),
  );
  const links: [THREE.Vector3, THREE.Vector3][] = [];
  for (let l = 0; l + 1 < nodes.length; l++) for (const a of nodes[l]) for (const b of nodes[l + 1]) links.push([a, b]);
  {
    const pieces = links.map(([a, b]) => {
      const g = new THREE.CylinderGeometry(0.022, 0.022, a.distanceTo(b), 6, 1, true);
      g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()));
      g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
      return g;
    });
    const merged = mergeGeometries(pieces);
    pieces.forEach((g) => g.dispose());
    neuronStation.add(new THREE.Mesh(kit.geometry(merged), kit.toon("#ffc08f", { flat: 0.5 })));
    const balls = new THREE.InstancedMesh(kit.geometry(new THREE.SphereGeometry(0.13, 20, 14)), kit.toon("#ff8a3d", { rim: 0.45, gloss: 0.4 }), 9);
    const m = new THREE.Matrix4();
    nodes.flat().forEach((p, k) => balls.setMatrixAt(k, m.makeTranslation(p.x, p.y, p.z)));
    neuronStation.add(balls);
    const post = new THREE.Mesh(rounded(0.24, 0.45, 0.2, 0.06), kit.toon("#241c4f"));
    post.position.y = 0.22;
    neuronStation.add(post);
  }
  const signals = kit.points(new Float32Array(6 * 3), { color: "#fff2b0", size: 0.28, soft: 1, additive: true });
  neuronStation.add(signals);
  const signalLinks = Array.from({ length: 6 }, () => Math.floor(random() * links.length));

  // A language model: a speech bubble whose dots say "thinking".
  const bubbleStation = station("llm", 2.05);
  const bubbleMaterial = kit.toon("#f4f0ff", { shadow: "#b9a8f0", rim: 0.4, gloss: 0.25 });
  const bubble = new THREE.Mesh(rounded(1.5, 0.95, 0.36, 0.3), bubbleMaterial);
  bubble.position.y = 0.95;
  const tail = new THREE.Mesh(kit.geometry(new THREE.ConeGeometry(0.17, 0.4, 16)), bubbleMaterial);
  tail.position.set(-0.4, 0.38, 0);
  tail.rotation.z = -0.5;
  tail.rotation.x = Math.PI;
  bubbleStation.add(bubble, tail);
  const dots = [-0.38, 0, 0.38].map((x) => {
    const dot = new THREE.Mesh(kit.geometry(new THREE.SphereGeometry(0.11, 18, 12)), kit.toon("#8c5cff", { rim: 0.3 }));
    dot.position.set(x, 0.95, 0.2);
    bubbleStation.add(dot);
    return dot;
  });

  /* ---------------- 1s and 0s floating up ---------------- */
  const floatCount = kit.count(18, 10);
  const ones = new THREE.InstancedMesh(rounded(0.09, 0.42, 0.09, 0.04), kit.flat("#ffd23f", { opacity: 0.85 }), floatCount);
  const zeros = new THREE.InstancedMesh(kit.geometry(new THREE.TorusGeometry(0.15, 0.045, 10, 28)), kit.flat("#c9b3ff", { opacity: 0.85 }), floatCount);
  const floaters = [ones, zeros].map((mesh) => {
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false;
    root.add(mesh);
    return Array.from({ length: floatCount }, () => ({
      x: (random() * 2 - 1) * 6.2,
      z: (random() * 2 - 1) * 4,
      phase: random(),
      speed: 0.07 + random() * 0.05,
      spin: random() * Math.PI,
    }));
  });

  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const p = new THREE.Vector3();
  const s = new THREE.Vector3();
  const yellow = new THREE.Color("#ffd23f");
  const dim = new THREE.Color("#4a3a9a");
  let lampOn = 1;

  return {
    root,
    anchors,
    shot: () => ({ target: [0, 0.2, 0.3], width: 12.6, height: 9.2, pitch: 34, yaw: -10 }),
    update(frame) {
      const { time } = frame;
      const calm = frame.reducedMotion;
      island.position.y = calm ? 0 : Math.sin(time * 0.6) * 0.07;

      // Bits travelling along the traces.
      const positions = pulses.geometry.getAttribute("position") as THREE.BufferAttribute;
      paths.forEach((path, k) => {
        for (let j = 0; j < pulsesPerPath; j++) {
          const u = (((calm ? 0.3 : time * 0.16) + j / pulsesPerPath + k * 0.37) % 1 + 1) % 1;
          along(path, u, p);
          positions.setXYZ(k * pulsesPerPath + j, p.x, p.y + 0.03, p.z);
        }
      });
      positions.needsUpdate = true;

      // The lamp blinks; the gate computes A AND B.
      lampOn = approach(lampOn, Math.floor(time / 1.1) % 2 === 1 ? 1 : 0, 12, frame);
      color(bulbMaterial).copy(dim).lerp(yellow, lampOn);
      bulbGlow.material.opacity = 0.9 * lampOn;
      const a = Math.floor(time / 1.2) % 2;
      const b = Math.floor(time / 2.4) % 2;
      [a, b, a & b].forEach((value, k) => color(legs[k].material).copy(dim).lerp(yellow, value));

      magnifier.position.y = 1.45 + (calm ? 0 : Math.sin(time * 1.1) * 0.08);
      key.rotation.y = calm ? 0.4 : time * 0.8;
      dots.forEach((dot, k) => (dot.position.y = 0.95 + (calm ? 0 : Math.max(0, Math.sin(time * 4 - k * 0.7)) * 0.12)));

      // Signals hop through the network.
      const signalPositions = signals.geometry.getAttribute("position") as THREE.BufferAttribute;
      signalLinks.forEach((link, k) => {
        const t = ((calm ? 0.5 : time * 0.9) + k * 0.31) % 1;
        const [from, to] = links[(link + Math.floor((calm ? 0 : time * 0.9) + k * 0.31) * 5) % links.length];
        p.copy(from).lerp(to, t);
        signalPositions.setXYZ(k, p.x, p.y, p.z + 0.05);
      });
      signalPositions.needsUpdate = true;

      // 1s and 0s rise and fade.
      [ones, zeros].forEach((mesh, kind) => {
        floaters[kind].forEach((f, k) => {
          const life = (((calm ? 0.5 : time * f.speed) + f.phase) % 1 + 1) % 1;
          const size = Math.sin(Math.PI * life);
          p.set(f.x, 0.8 + life * 4.2, f.z);
          e.set(0, f.spin + (calm ? 0 : time * 0.5), kind ? 0 : 0.2);
          q.setFromEuler(e);
          s.setScalar(size * size);
          m.compose(p, q, s);
          mesh.setMatrixAt(k, m);
        });
        mesh.instanceMatrix.needsUpdate = true;
      });
    },
  };
};

export default board;
