/**
 * Chapter 6, large language models. Tokens as coloured blocks, words as
 * points in a space where king − man + woman ≈ queen, bars of next-token
 * probabilities that flatten or sharpen with the temperature, attention arcs
 * from "it" to the other words, a sentence growing one token at a time, and
 * pages of text flowing into a network. Words are drawn by the interface.
 */
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { rng } from "../../engine/kit";
import { tr } from "../../i18n";
import { CANDIDATES, EXAMPLE_SENTENCE, LLM_START, LLM_STEPS, PRONOUN, SENTENCE, attention, tokenize, withTemperature } from "../logic/llm";
import type { LlmState, LlmStep } from "../logic/llm";
import type { Store } from "../store";
import { Pop, approach } from "./fx";
import type { Shot, StageBuilder, StageFrame } from "./types";

const SHOTS: Record<LlmStep, Shot> = {
  tokens: { target: [0, 0, 0], width: 8.8, height: 4.2, pitch: 4 },
  vectors: { target: [0, 0.3, 0], width: 9, height: 6.4, pitch: 10, yaw: -12 },
  next: { target: [0, 0.1, 0], width: 11.8, height: 5.2, pitch: 5 },
  attention: { target: [0, 0.3, 0], width: 11.4, height: 5.6, pitch: 6 },
  generate: { target: [0.35, 0, 0], width: 12.2, height: 4.2, pitch: 4 },
  training: { target: [0, -0.1, 0], width: 11.6, height: 5.4, pitch: 6 },
};

const COLORS = ["#ff6fb1", "#3fd0ff", "#ffd23f", "#3ff2b5", "#ff8a3d", "#b58cff"].map((c) => new THREE.Color(c));

/** Toy 3D positions: king − man = queen − woman (a parallelogram). */
const WORDS: Record<string, { at: [number, number, number]; group: number }> = {
  cat: { at: [-2.6, 1.5, 0.4], group: 0 },
  dog: { at: [-2.0, 2.1, -0.4], group: 0 },
  lion: { at: [-3.2, 2.35, -0.2], group: 0 },
  apple: { at: [2.5, 2.0, 0.3], group: 1 },
  banana: { at: [3.1, 1.4, -0.4], group: 1 },
  cherry: { at: [2.1, 2.6, -0.2], group: 1 },
  man: { at: [-1.6, -1.7, 0.2], group: 2 },
  woman: { at: [0.6, -2.0, 0.3], group: 2 },
  king: { at: [-1.0, -0.3, -0.2], group: 2 },
  queen: { at: [1.2, -0.6, -0.1], group: 2 },
};
const GROUP_COLORS = ["#ff8a3d", "#3ff2b5", "#ffd23f"];

const llm: StageBuilder = ({ kit, store }) => {
  const shared = store as Store<LlmState> | null;
  const state = () => shared?.get() ?? LLM_START;
  const random = rng(606);
  const root = new THREE.Group();
  const anchors: Record<string, THREE.Object3D> = {};
  const anchor = (name: string, parent: THREE.Object3D, x: number, y: number, z = 0.3) => {
    const object = new THREE.Object3D();
    object.position.set(x, y, z);
    anchors[name] = object;
    parent.add(object);
    return object;
  };
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const v = new THREE.Vector3();
  const sc = new THREE.Vector3();

  /** A pool of blocks drawn as one instanced mesh, each easing to its own box. */
  function blocks(count: number, depth = 0.45) {
    const mesh = new THREE.InstancedMesh(kit.geometry(new RoundedBoxGeometry(1, 1, 1, 3, 0.22)), kit.toon("#ffffff", { rim: 0.4, gloss: 0.3 }), count);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false;
    const state = Array.from({ length: count }, () => ({ x: 0, y: 0, w: 0, h: 0, tw: 0, th: 0, tx: 0, ty: 0, c: new THREE.Color("#ffffff") }));
    for (let i = 0; i < count; i++) mesh.setColorAt(i, state[i].c);
    return {
      mesh,
      state,
      set(i: number, x: number, y: number, w: number, h: number, color?: THREE.Color) {
        const b = state[i];
        if (b.w < 0.01 && w > 0) (b.x = x), (b.y = y);
        Object.assign(b, { tx: x, ty: y, tw: w, th: h });
        if (color) b.c.copy(color);
      },
      update(frame: StageFrame) {
        state.forEach((b, i) => {
          b.x = approach(b.x, b.tx, 7, frame);
          b.y = approach(b.y, b.ty, 7, frame);
          b.w = approach(b.w, b.tw, 8, frame);
          b.h = approach(b.h, b.th, 8, frame);
          const visible = b.w > 0.02;
          sc.set(visible ? b.w : 0, visible ? b.h : 0, visible ? depth : 0);
          m.compose(v.set(b.x, b.y, 0), q, sc);
          mesh.setMatrixAt(i, m);
          mesh.setColorAt(i, b.c);
        });
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      },
    };
  }

  /* ---------------- Tokens ---------------- */
  const tokenGroup = new THREE.Group();
  root.add(tokenGroup);
  const tokenPop = new Pop(tokenGroup);
  const tokenBlocks = blocks(24);
  tokenGroup.add(tokenBlocks.mesh);
  for (let i = 0; i < 24; i++) anchor(`token-${i}`, tokenGroup, 0, 0, 0.3);

  /* ---------------- Word vectors ---------------- */
  const space = new THREE.Group();
  root.add(space);
  const spacePop = new Pop(space);
  const cloud = new THREE.Group();
  space.add(cloud);
  {
    const ball = kit.geometry(new THREE.SphereGeometry(0.2, 20, 14));
    const materials = GROUP_COLORS.map((c) => kit.toon(c, { rim: 0.5, gloss: 0.4 }));
    for (const [name, word] of Object.entries(WORDS)) {
      const dot = new THREE.Mesh(ball, materials[word.group]);
      dot.position.set(...word.at);
      cloud.add(dot);
      const glow = kit.glow(GROUP_COLORS[word.group], 0.9, { opacity: 0.5 });
      glow.position.set(...word.at);
      cloud.add(glow);
      anchor(`word-${name}`, cloud, word.at[0], word.at[1] + 0.32, word.at[2]);
    }
    const arrow = (from: string, to: string) => {
      const a = new THREE.Vector3(...WORDS[from].at);
      const b = new THREE.Vector3(...WORDS[to].at);
      const dir = b.clone().sub(a);
      const length = dir.length() - 0.5;
      dir.normalize();
      const material = kit.toon("#ffd23f", { gloss: 0.4, rim: 0.3 });
      const shaft = new THREE.Mesh(kit.geometry(new THREE.CylinderGeometry(0.045, 0.045, length - 0.25, 10)), material);
      shaft.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      shaft.position.copy(a).addScaledVector(dir, 0.25 + (length - 0.25) / 2);
      const head = new THREE.Mesh(kit.geometry(new THREE.ConeGeometry(0.13, 0.3, 14)), material);
      head.quaternion.copy(shaft.quaternion);
      head.position.copy(a).addScaledVector(dir, length);
      cloud.add(shaft, head);
    };
    arrow("man", "king");
    arrow("woman", "queen");
    // A haze of other words.
    const haze: number[] = [];
    for (let i = 0; i < kit.count(180, 90); i++) haze.push((random() * 2 - 1) * 4, (random() * 2 - 1) * 3, (random() * 2 - 1) * 2);
    cloud.add(kit.points(haze, { color: "#c9b3ff", size: 0.09, soft: 0.6, opacity: 0.7 }));
  }

  /* ---------------- Next-token bars ---------------- */
  const bars = new THREE.Group();
  root.add(bars);
  const barsPop = new Pop(bars);
  const prompt = new THREE.Mesh(kit.geometry(new RoundedBoxGeometry(4.3, 0.95, 0.4, 3, 0.3)), kit.toon("#f4f0ff", { shadow: "#b9a8f0", rim: 0.4 }));
  prompt.position.set(-3.55, 0.9, 0);
  bars.add(prompt);
  anchor("prompt", bars, -3.55, 0.9, 0.3);
  const barBlocks = blocks(CANDIDATES.length, 0.55);
  bars.add(barBlocks.mesh);
  const BAR_X = (i: number) => -0.45 + i * 1.08;
  const BASE = -1.9;
  const barTops = CANDIDATES.map((_, i) => anchor(`bar-${i}`, bars, BAR_X(i), BASE, 0.4));
  const floor = new THREE.Mesh(kit.geometry(new RoundedBoxGeometry(6.8, 0.12, 1, 2, 0.05)), kit.toon("#2b1f6b", { rim: 0.3 }));
  floor.position.set(BAR_X(2.5), BASE - 0.08, 0);
  bars.add(floor);
  const barColor = new THREE.Color();

  /* ---------------- Attention ---------------- */
  const attn = new THREE.Group();
  root.add(attn);
  const attnPop = new Pop(attn);
  const WORD_W = 1.38;
  const slot = (i: number) => (i < 7 ? { x: (i - 3) * (WORD_W + 0.14), y: 1.05 } : { x: (i - 7 - 2.5) * (WORD_W + 0.14), y: -0.75 });
  const wordBlocks = blocks(SENTENCE.length);
  attn.add(wordBlocks.mesh);
  SENTENCE.forEach((_, i) => {
    const p = slot(i);
    wordBlocks.set(i, p.x, p.y, WORD_W, 0.78, i === PRONOUN ? new THREE.Color("#ffd23f") : new THREE.Color("#f4f0ff"));
    anchor(`word-${i}`, attn, p.x, p.y, 0.3);
  });
  const from = slot(PRONOUN);
  const arcs = SENTENCE.map((_, i) => {
    if (i === PRONOUN) return null;
    const to = slot(i);
    const lift = 0.9 + Math.abs(to.x - from.x) * 0.12 + (to.y > from.y ? 0 : 0.4);
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(from.x, from.y + 0.4, 0.45),
      new THREE.Vector3((from.x + to.x) / 2, Math.max(from.y, to.y) + lift, 0.6),
      new THREE.Vector3(to.x, to.y + 0.4, 0.45),
    );
    const material = kit.toon("#ffd23f", { flat: 0.5, opacity: 0.2, depthWrite: false });
    const mesh = new THREE.Mesh(kit.geometry(new THREE.TubeGeometry(curve, 40, 0.07, 8)), material);
    attn.add(mesh);
    return { mesh, material: material as THREE.ShaderMaterial, weight: 0 };
  });

  /* ---------------- Generation ---------------- */
  const gen = new THREE.Group();
  root.add(gen);
  const genPop = new Pop(gen);
  const genPrompt = new THREE.Mesh(kit.geometry(new RoundedBoxGeometry(4.8, 0.95, 0.4, 3, 0.3)), kit.toon("#f4f0ff", { shadow: "#b9a8f0", rim: 0.4 }));
  genPrompt.position.set(-2.9, 0, 0);
  gen.add(genPrompt);
  anchor("gen-prompt", gen, -2.9, 0, 0.3);
  const genBlocks = blocks(4);
  gen.add(genBlocks.mesh);
  const GEN_X = (i: number) => 0.4 + i * 1.62;
  for (let i = 0; i < 4; i++) anchor(`gen-${i}`, gen, GEN_X(i), 0, 0.3);
  const newest = kit.glow("#ffd23f", 2.2, { opacity: 0 });
  gen.add(newest);

  /* ---------------- Training ---------------- */
  const train = new THREE.Group();
  root.add(train);
  const trainPop = new Pop(train);
  const pageCount = kit.count(14, 8);
  const pages = new THREE.InstancedMesh(kit.geometry(new RoundedBoxGeometry(0.75, 1, 0.06, 1, 0.05)), kit.toon("#fff4d6", { rim: 0.3 }), pageCount);
  pages.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  pages.frustumCulled = false;
  train.add(pages);
  const pagePhase = Array.from({ length: pageCount }, () => ({ u: random(), y: (random() * 2 - 1) * 1.1, spin: random() * 6 }));
  const net = new THREE.Group();
  net.position.set(2.8, 0, 0);
  train.add(net);
  const layers = [4, 6, 6, 4];
  const nodes = layers.map((n, l) => Array.from({ length: n }, (_, k) => new THREE.Vector3((l - 1.5) * 1.05, ((n - 1) / 2 - k) * 0.55, 0)));
  const links: [THREE.Vector3, THREE.Vector3][] = [];
  for (let l = 0; l + 1 < nodes.length; l++) for (const a of nodes[l]) for (const b of nodes[l + 1]) links.push([a, b]);
  {
    const pieces = links.map(([a, b]) => {
      const g = new THREE.CylinderGeometry(0.018, 0.018, a.distanceTo(b), 5, 1, true);
      g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()));
      g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, 0);
      return g;
    });
    net.add(new THREE.Mesh(kit.geometry(mergeGeometries(pieces)), kit.toon("#c9b3ff", { flat: 0.6, opacity: 0.55, depthWrite: false })));
    pieces.forEach((g) => g.dispose());
    const balls = new THREE.InstancedMesh(kit.geometry(new THREE.SphereGeometry(0.16, 18, 12)), kit.toon("#a78bff", { rim: 0.5, gloss: 0.4 }), nodes.flat().length);
    nodes.flat().forEach((p, k) => balls.setMatrixAt(k, m.makeTranslation(p.x, p.y, p.z)));
    net.add(balls);
  }
  const sparkCount = 18;
  const sparks = kit.points(new Float32Array(sparkCount * 3), { color: "#fff2b0", size: 0.26, soft: 1, additive: true });
  net.add(sparks);
  anchor("texts", train, -3.2, -1.65, 0.3);
  anchor("model", train, 2.8, -1.85, 0.3);

  return {
    root,
    anchors,
    shot: (step) => SHOTS[LLM_STEPS[step] ?? "tokens"],
    update(frame) {
      const step = LLM_STEPS[frame.step] ?? "tokens";
      const s = state();
      const { time } = frame;
      const calm = frame.reducedMotion;

      // Tokens: blocks sized by their text, wrapped on lines of 11 units.
      tokenPop.update(step === "tokens", frame);
      const tokens = tokenize(s.text ?? tr(EXAMPLE_SENTENCE));
      const widths = tokens.map((t) => Math.min(3.4, 0.62 + 0.21 * t.text.trim().length));
      const lines: number[][] = [[]];
      let lineWidth = 0;
      widths.forEach((w, i) => {
        if (lineWidth + w > 8.2 && lines[lines.length - 1].length) (lines.push([]), (lineWidth = 0));
        lines[lines.length - 1].push(i);
        lineWidth += w + 0.12;
      });
      for (let i = 0; i < 24; i++) tokenBlocks.set(i, 0, 0, 0, 0);
      lines.forEach((line, row) => {
        const total = line.reduce((sum, i) => sum + widths[i] + 0.12, -0.12);
        let x = -total / 2;
        for (const i of line) {
          const y = ((lines.length - 1) / 2 - row) * 1.3;
          tokenBlocks.set(i, x + widths[i] / 2, y, widths[i], 0.95, COLORS[i % COLORS.length]);
          anchors[`token-${i}`].position.set(x + widths[i] / 2, y, 0.3);
          x += widths[i] + 0.12;
        }
      });
      tokenBlocks.update(frame);
      for (let i = 0; i < 24; i++) anchors[`token-${i}`].visible = tokenGroup.visible && tokenPop.value > 0.8 && i < tokens.length && tokenBlocks.state[i].w > 0.3;

      // Word vectors: the cloud turns slowly to show its depth.
      spacePop.update(step === "vectors", frame);
      cloud.rotation.y = calm ? 0.25 : 0.25 + Math.sin(time * 0.25) * 0.35;
      for (const name of Object.keys(WORDS)) anchors[`word-${name}`].visible = space.visible && spacePop.value > 0.8;

      // Next token: bar heights follow the probabilities at this temperature.
      barsPop.update(step === "next", frame);
      const probabilities = withTemperature(s.temperature);
      probabilities.forEach((p, i) => {
        const h = Math.max(0.06, p * 4.6);
        barBlocks.set(i, BAR_X(i), BASE + h / 2, 0.82, h, barColor.set("#a78bff").lerp(COLORS[2], Math.min(1, p * 2)));
        barTops[i].position.y = BASE + barBlocks.state[i].h + 0.35;
      });
      barBlocks.update(frame);
      for (let i = 0; i < CANDIDATES.length; i++) anchors[`bar-${i}`].visible = bars.visible && barsPop.value > 0.8;
      anchors.prompt.visible = bars.visible && barsPop.value > 0.8;

      // Attention: arcs from "it" get thicker and brighter with their weight.
      attnPop.update(step === "attention", frame);
      const weights = attention(s.big);
      const top = Math.max(...weights);
      arcs.forEach((arc, i) => {
        if (!arc) return;
        arc.weight = approach(arc.weight, weights[i] / top, 6, frame);
        arc.material.uniforms.uOpacity.value = 0.08 + 0.9 * arc.weight;
      });
      SENTENCE.forEach((_, i) => {
        if (i === PRONOUN) return;
        const p = slot(i);
        const lit = arcs[i]?.weight ?? 0;
        wordBlocks.set(i, p.x, p.y, WORD_W, 0.78, barColor.set("#f4f0ff").lerp(COLORS[0], Math.min(1, lit * 0.9)));
      });
      wordBlocks.update(frame);
      SENTENCE.forEach((_, i) => (anchors[`word-${i}`].visible = attn.visible && attnPop.value > 0.8));

      // Generation: blocks appear one by one; the newest glows.
      genPop.update(step === "generate", frame);
      for (let i = 0; i < 4; i++) genBlocks.set(i, GEN_X(i), 0, i < s.generated ? 1.45 : 0, 0.95, COLORS[(i + 1) % COLORS.length]);
      genBlocks.update(frame);
      newest.position.set(s.generated ? GEN_X(s.generated - 1) : -2.9, 0, -0.4);
      newest.material.opacity = approach(newest.material.opacity, s.generated ? 0.55 : 0, 6, frame);
      anchors["gen-prompt"].visible = gen.visible && genPop.value > 0.8;
      for (let i = 0; i < 4; i++) anchors[`gen-${i}`].visible = gen.visible && genPop.value > 0.8 && i < s.generated && genBlocks.state[i].w > 0.8;

      // Training: pages fly into the network; signals run through it.
      trainPop.update(step === "training", frame);
      if (train.visible) {
        pagePhase.forEach((page, i) => {
          const u = ((page.u + (calm ? 0 : time * 0.12)) % 1 + 1) % 1;
          const x = -5.2 + u * 6.4;
          const shrink = u > 0.82 ? Math.max(0, (1 - u) / 0.18) : Math.min(1, u * 6);
          m.compose(v.set(x, page.y * (1 - u * 0.7), 0), q.setFromEuler(new THREE.Euler(0.2, page.spin + (calm ? 0 : time * 0.6), 0.1)), sc.setScalar(shrink));
          pages.setMatrixAt(i, m);
        });
        pages.instanceMatrix.needsUpdate = true;
        const positions = sparks.geometry.getAttribute("position") as THREE.BufferAttribute;
        for (let k = 0; k < sparkCount; k++) {
          const t = ((calm ? 0.5 : time * 0.8) + k / sparkCount) % 1;
          const [a, b] = links[(k * 37 + Math.floor((calm ? 0 : time * 0.8) + k / sparkCount) * 11) % links.length];
          v.copy(a).lerp(b, t);
          positions.setXYZ(k, v.x, v.y, 0.05);
        }
        positions.needsUpdate = true;
      }
      anchors.texts.visible = anchors.model.visible = train.visible && trainPop.value > 0.8;
    },
  };
};

export default llm;
