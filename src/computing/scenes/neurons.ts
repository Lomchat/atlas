/**
 * Chapter 5, neural networks. One neuron weighs a cloudy sky and a rain
 * forecast and opens an umbrella when its total is above 0; its wires get
 * thicker with their weights. Then a small network reads a 7 × 7 digit,
 * an error curve falls during training, and a hundred thousand weights meet
 * a cloud standing for billions.
 */
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { rng } from "../../engine/kit";
import type { Kit } from "../../engine/kit";
import { cloud } from "../../levels/scenes/common/props";
import { DIGITS, ERROR_CURVE, NEURON, NEURONS_START, NEURONS_STEPS, SCORES, learnState, neuron } from "../logic/neurons";
import type { NeuronsState, NeuronsStep } from "../logic/neurons";
import type { Store } from "../store";
import { Pop, approach } from "./fx";
import type { Shot, StageBuilder } from "./types";

const ONE: Shot = { target: [0.1, -0.1, 0], width: 11.6, height: 5.8, pitch: 4 };
const SHOTS: Record<NeuronsStep, Shot> = {
  neuron: ONE,
  weights: ONE,
  learn: ONE,
  network: { target: [0.3, 0, 0], width: 11.6, height: 5.8, pitch: 4, yaw: 4 },
  training: { target: [-0.2, 0.1, 0], width: 11.4, height: 5.4, pitch: 4 },
  scale: { target: [-0.4, -0.1, 0], width: 11.4, height: 6.6, pitch: 4 },
};

const BODY = new THREE.Vector3(0, 0, 0);
const IN_CLOUDS = new THREE.Vector3(-4.1, 1.15, 0);
const IN_FORECAST = new THREE.Vector3(-4.1, -1.15, 0);
const IN_BIAS = new THREE.Vector3(-1.5, -2.3, 0);
const UMBRELLA = new THREE.Vector3(4, -0.2, 0);

/** Links between two point sets, merged into one mesh. */
function linkMesh(kit: Kit, pairs: [THREE.Vector3, THREE.Vector3][], radius: number, color: string, opacity = 0.6) {
  const pieces = pairs.map(([a, b]) => {
    const g = new THREE.CylinderGeometry(radius, radius, a.distanceTo(b), 5, 1, true);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()));
    g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
    return g;
  });
  const merged = mergeGeometries(pieces);
  pieces.forEach((g) => g.dispose());
  return new THREE.Mesh(kit.geometry(merged), kit.toon(color, { flat: 0.6, opacity, depthWrite: false }));
}

const neurons: StageBuilder = ({ kit, store }) => {
  const shared = store as Store<NeuronsState> | null;
  const state = () => shared?.get() ?? NEURONS_START;
  const random = rng(5150);
  const root = new THREE.Group();
  const anchors: Record<string, THREE.Object3D> = {};
  const anchor = (name: string, parent: THREE.Object3D, at: THREE.Vector3 | [number, number, number], z?: number) => {
    const object = new THREE.Object3D();
    if (Array.isArray(at)) object.position.set(...at);
    else object.position.copy(at);
    if (z !== undefined) object.position.z = z;
    anchors[name] = object;
    parent.add(object);
    return object;
  };
  const color = (material: THREE.Material) => (material as THREE.ShaderMaterial).uniforms.uColor.value as THREE.Color;
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const v = new THREE.Vector3();
  const sc = new THREE.Vector3();

  /* ---------------- One neuron and its umbrella ---------------- */
  const single = new THREE.Group();
  root.add(single);
  const singlePop = new Pop(single);
  const sky = cloud(kit, { size: 0.9, seed: 3, color: "#f4f0ff", shadow: "#b9a8f0" });
  sky.position.copy(IN_CLOUDS);
  single.add(sky);
  const drop = new THREE.Group();
  drop.position.copy(IN_FORECAST);
  {
    const blue = kit.toon("#3fd0ff", { gloss: 0.5, rim: 0.5 });
    const ball = new THREE.Mesh(kit.geometry(new THREE.SphereGeometry(0.42, 24, 18)), blue);
    const tip = new THREE.Mesh(kit.geometry(new THREE.ConeGeometry(0.36, 0.55, 24)), blue);
    tip.position.y = 0.42;
    drop.add(ball, tip);
  }
  single.add(drop);
  const biasBall = new THREE.Mesh(kit.geometry(new THREE.SphereGeometry(0.28, 20, 14)), kit.toon("#6a5bb5", { rim: 0.4 }));
  biasBall.position.copy(IN_BIAS);
  single.add(biasBall);

  const wire = (from: THREE.Vector3, to: THREE.Vector3, colour: string) => {
    const dir = to.clone().sub(from);
    const mesh = new THREE.Mesh(kit.geometry(new THREE.CylinderGeometry(1, 1, dir.length(), 16)), kit.toon(colour, { rim: 0.3, gloss: 0.3 }));
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    mesh.position.copy(from).addScaledVector(dir, 0.5);
    single.add(mesh);
    return mesh;
  };
  const wClouds = wire(IN_CLOUDS.clone().add(new THREE.Vector3(0.9, 0, 0)), BODY, "#ffd23f");
  const wForecast = wire(IN_FORECAST.clone().add(new THREE.Vector3(0.6, 0, 0)), BODY, "#ffd23f");
  const wBias = wire(IN_BIAS, BODY, "#ff6fb1");
  const wOut = wire(BODY, UMBRELLA.clone().add(new THREE.Vector3(-0.8, 0.2, 0)), "#ffd23f");
  const bodyMaterial = kit.toon("#ff8a3d", { rim: 0.5, gloss: 0.4 });
  const body = new THREE.Mesh(kit.geometry(new THREE.SphereGeometry(0.95, 40, 28)), bodyMaterial);
  body.position.copy(BODY);
  const bodyGlow = kit.glow("#ffd23f", 4, { opacity: 0 });
  single.add(body, bodyGlow);

  const umbrella = new THREE.Group();
  umbrella.position.copy(UMBRELLA);
  const canopy = new THREE.Group();
  canopy.position.y = 1.0;
  {
    const sectors = 8;
    for (let k = 0; k < sectors; k++) {
      const panel = new THREE.Mesh(
        kit.geometry(new THREE.SphereGeometry(1.15, 8, 8, (k / sectors) * Math.PI * 2, (Math.PI * 2) / sectors, 0, Math.PI / 2)),
        kit.toon(k % 2 ? "#ff6fb1" : "#3ff2b5", { rim: 0.35, side: THREE.DoubleSide }),
      );
      panel.scale.y = 0.55;
      canopy.add(panel);
    }
    const tip = new THREE.Mesh(kit.geometry(new THREE.SphereGeometry(0.08, 10, 8)), kit.toon("#2b1f6b"));
    tip.position.y = 0.66;
    canopy.add(tip);
  }
  const shaft = new THREE.Mesh(kit.geometry(new THREE.CylinderGeometry(0.05, 0.05, 1.9, 10)), kit.toon("#2b1f6b", { rim: 0.3 }));
  shaft.position.y = 0.4;
  const hook = new THREE.Mesh(kit.geometry(new THREE.TorusGeometry(0.2, 0.05, 10, 20, Math.PI)), kit.toon("#2b1f6b", { rim: 0.3 }));
  hook.position.set(0.2, -0.55, 0);
  hook.rotation.z = Math.PI;
  umbrella.add(canopy, shaft, hook);
  single.add(umbrella);
  const rainCount = kit.count(60, 30);
  const rainPhase = Array.from({ length: rainCount }, () => [random() * 4.2 - 2.1, random(), random() * 1.2 - 0.6]);
  const rain = kit.points(new Float32Array(rainCount * 3), { color: "#8fe3ff", size: 0.11, soft: 0.3, opacity: 0.9 });
  single.add(rain);
  anchor("in-clouds", single, [IN_CLOUDS.x + 0.6, IN_CLOUDS.y + 1.0, 0.4]);
  anchor("in-forecast", single, [IN_FORECAST.x + 0.6, IN_FORECAST.y - 0.85, 0.4]);
  anchor("w-clouds", single, [-2.05, 0.75, 0.5]);
  anchor("w-forecast", single, [-2.05, -0.75, 0.5]);
  anchor("bias", single, [IN_BIAS.x + 0.7, IN_BIAS.y - 0.2, 0.4]);
  anchor("total", single, [1.7, -1.5, 0.6]);
  anchor("umbrella", single, [UMBRELLA.x, UMBRELLA.y + 2.2, 0.4]);
  let fire = 1;
  let open = 1;

  /* ---------------- A network reading a digit ---------------- */
  const net = new THREE.Group();
  root.add(net);
  const netPop = new Pop(net);
  const CELL = 0.36;
  const GRID_X = -4.1;
  const pixels = new THREE.InstancedMesh(kit.geometry(new RoundedBoxGeometry(0.9, 0.9, 0.4, 1, 0.18)), kit.toon("#ffffff", { rim: 0.3 }), 49);
  pixels.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  net.add(pixels);
  const pixelOn = new Float32Array(49);
  anchor("pixels", net, [GRID_X, -1.45, 0.3]);
  const layerX = [-1.9, 0.1, 2.3];
  const hidden1 = Array.from({ length: 6 }, (_, k) => new THREE.Vector3(layerX[0], (2.5 - k) * 0.62, 0));
  const hidden2 = Array.from({ length: 6 }, (_, k) => new THREE.Vector3(layerX[1], (2.5 - k) * 0.62, 0));
  const outputs = Array.from({ length: 10 }, (_, k) => new THREE.Vector3(layerX[2], (4.5 - k) * 0.46, 0));
  const gridEdge = Array.from({ length: 7 }, (_, r) => new THREE.Vector3(GRID_X + 3.5 * CELL, (3 - r) * CELL, 0));
  const pairs: [THREE.Vector3, THREE.Vector3][] = [];
  for (const a of gridEdge) for (const b of hidden1) pairs.push([a, b]);
  for (const a of hidden1) for (const b of hidden2) pairs.push([a, b]);
  for (const a of hidden2) for (const b of outputs) pairs.push([a, b]);
  net.add(linkMesh(kit, pairs, 0.016, "#ffc08f", 0.45));
  const hiddenBalls = new THREE.InstancedMesh(kit.geometry(new THREE.SphereGeometry(0.17, 18, 12)), kit.toon("#ff8a3d", { rim: 0.5, gloss: 0.4 }), 12);
  [...hidden1, ...hidden2].forEach((p, k) => hiddenBalls.setMatrixAt(k, m.makeTranslation(p.x, p.y, p.z)));
  net.add(hiddenBalls);
  const outBalls = new THREE.InstancedMesh(kit.geometry(new THREE.SphereGeometry(0.17, 18, 12)), kit.toon("#ffffff", { rim: 0.5, gloss: 0.4 }), 10);
  outBalls.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const outBars = new THREE.InstancedMesh(kit.geometry(new RoundedBoxGeometry(1, 0.26, 0.2, 1, 0.08)), kit.toon("#ffd23f", { rim: 0.3 }), 10);
  outBars.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  net.add(outBalls, outBars);
  outputs.forEach((p, k) => anchor(`out-${k}`, net, [p.x - 0.35, p.y, 0.3]));
  const barLength = new Float32Array(10);
  const pulses = kit.points(new Float32Array(16 * 3), { color: "#fff2b0", size: 0.22, soft: 1, additive: true });
  net.add(pulses);
  const ON = new THREE.Color("#ffd23f");
  const DIM = new THREE.Color("#4a3a9a");
  const tmpColor = new THREE.Color();

  /* ---------------- Training: the error falls ---------------- */
  const train = new THREE.Group();
  root.add(train);
  const trainPop = new Pop(train);
  const X0 = -4.6;
  const X1 = 1.4;
  const Y0 = -1.8;
  const Y1 = 2.3;
  {
    const axisMaterial = kit.toon("#ffe2c9", { flat: 0.5 });
    const xAxis = new THREE.Mesh(kit.geometry(new RoundedBoxGeometry(X1 - X0 + 0.2, 0.07, 0.07, 1, 0.03)), axisMaterial);
    xAxis.position.set((X0 + X1) / 2, Y0, 0);
    const yAxis = new THREE.Mesh(kit.geometry(new RoundedBoxGeometry(0.07, Y1 - Y0 + 0.2, 0.07, 1, 0.03)), axisMaterial);
    yAxis.position.set(X0, (Y0 + Y1) / 2, 0);
    train.add(xAxis, yAxis);
    const points = ERROR_CURVE.map(([u, e]) => new THREE.Vector3(X0 + u * (X1 - X0), Y0 + (e / 0.9) * (Y1 - Y0 - 0.3), 0.05));
    const curve = new THREE.CatmullRomCurve3(points);
    train.add(kit.line(curve.getPoints(80), { color: "#ffd23f", width: 4 }));
    train.userData.curve = curve;
  }
  const marker = kit.glow("#ffd23f", 0.9, { opacity: 0.95 });
  train.add(marker);
  anchor("axis-error", train, [X0 - 0.25, (Y0 + Y1) / 2, 0.2]);
  anchor("axis-examples", train, [(X0 + X1) / 2, Y0 - 0.25, 0.2]);
  const mini = new THREE.Group();
  mini.position.set(3.7, 0.2, 0);
  train.add(mini);
  const miniNodes = [3, 4, 3].map((n, l) => Array.from({ length: n }, (_, k) => new THREE.Vector3((l - 1) * 0.8, ((n - 1) / 2 - k) * 0.6, 0)));
  const miniPairs: [THREE.Vector3, THREE.Vector3][] = [];
  for (let l = 0; l < 2; l++) for (const a of miniNodes[l]) for (const b of miniNodes[l + 1]) miniPairs.push([a, b]);
  mini.add(linkMesh(kit, miniPairs, 0.02, "#ffc08f", 0.6));
  const miniBalls = new THREE.InstancedMesh(kit.geometry(new THREE.SphereGeometry(0.16, 16, 12)), kit.toon("#ff8a3d", { rim: 0.5, gloss: 0.4 }), 10);
  miniNodes.flat().forEach((p, k) => miniBalls.setMatrixAt(k, m.makeTranslation(p.x, p.y, p.z)));
  mini.add(miniBalls);
  const cardCount = 6;
  const cards = new THREE.InstancedMesh(kit.geometry(new RoundedBoxGeometry(0.5, 0.6, 0.06, 1, 0.06)), kit.toon("#fff4d6", { rim: 0.3 }), cardCount);
  cards.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  cards.frustumCulled = false;
  train.add(cards);

  /* ---------------- Scale: a hundred thousand and billions ---------------- */
  const scale = new THREE.Group();
  root.add(scale);
  const scalePop = new Pop(scale);
  const smallNet = new THREE.Group();
  smallNet.position.set(-3.7, 0.3, 0);
  scale.add(smallNet);
  {
    const nodes = [4, 5, 3].map((n, l) => Array.from({ length: n }, (_, k) => new THREE.Vector3((l - 1) * 0.55, ((n - 1) / 2 - k) * 0.42, 0)));
    const p: [THREE.Vector3, THREE.Vector3][] = [];
    for (let l = 0; l < 2; l++) for (const a of nodes[l]) for (const b of nodes[l + 1]) p.push([a, b]);
    smallNet.add(linkMesh(kit, p, 0.015, "#ffc08f", 0.7));
    const balls = new THREE.InstancedMesh(kit.geometry(new THREE.SphereGeometry(0.11, 14, 10)), kit.toon("#ff8a3d", { rim: 0.5 }), 12);
    nodes.flat().forEach((pt, k) => balls.setMatrixAt(k, m.makeTranslation(pt.x, pt.y, pt.z)));
    smallNet.add(balls);
  }
  const huge = new THREE.Group();
  huge.position.set(1.9, 0.2, 0);
  scale.add(huge);
  {
    const count = kit.count(2600, 1100);
    const positions: number[] = [];
    const colors: number[] = [];
    const a = new THREE.Color("#ff8a3d");
    const b = new THREE.Color("#ffd23f");
    const c = new THREE.Color();
    for (let i = 0; i < count; i++) {
      const r = 2.7 * Math.cbrt(random());
      const theta = random() * Math.PI * 2;
      const phi = Math.acos(2 * random() - 1);
      positions.push(r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi) * 0.85, r * Math.sin(phi) * Math.sin(theta));
      c.copy(a).lerp(b, random());
      colors.push(c.r, c.g, c.b);
    }
    huge.add(kit.points(positions, { colors, size: 0.07, soft: 0.5, twinkle: 0.5 }));
    huge.add(kit.glow("#ff8a3d", 7, { opacity: 0.35 }));
  }
  anchor("small", scale, [-3.7, -1.0, 0.3]);
  anchor("huge", scale, [1.9, -2.6, 0.3]);

  return {
    root,
    anchors,
    shot: (step) => SHOTS[NEURONS_STEPS[step] ?? "neuron"],
    update(frame) {
      const step = NEURONS_STEPS[frame.step] ?? "neuron";
      const s = state();
      const { time } = frame;
      const calm = frame.reducedMotion;

      // The neuron: wire thickness follows the weights, the umbrella the decision.
      const one = step === "neuron" || step === "weights" || step === "learn";
      singlePop.update(one, frame);
      let w1: number = NEURON.cloudsWeight;
      let w2: number = NEURON.forecastWeight;
      let bias: number = NEURON.bias;
      let inputs = [s.clouds, s.forecast];
      if (step === "weights") (w2 = s.forecastWeight), (inputs = [0.8, 1]);
      if (step === "learn") {
        const l = learnState(s.learned);
        (w1 = l.w1), (w2 = l.w2), (bias = l.bias), (inputs = [0.8, 1]);
      }
      const result = neuron(inputs[0], inputs[1], w1, w2, bias);
      const thick = (weight: number) => 0.03 + 0.07 * Math.abs(weight);
      for (const [mesh, weight] of [[wClouds, w1], [wForecast, w2], [wBias, bias], [wOut, result.fires ? 1 : 0.3]] as const) {
        const t = approach(mesh.scale.x, thick(weight), 8, frame);
        mesh.scale.set(t, 1, t);
      }
      fire = approach(fire, result.fires ? 1 : 0, 8, frame);
      open = approach(open, result.fires ? 1 : 0, 6, frame);
      color(bodyMaterial).set("#ff8a3d").lerp(ON, fire);
      bodyGlow.material.opacity = 0.75 * fire;
      canopy.scale.set(0.25 + 0.75 * open, 1.5 - 0.5 * open, 0.25 + 0.75 * open);
      sky.scale.setScalar(0.9 * (0.55 + 0.6 * inputs[0]));
      drop.scale.setScalar(0.45 + 0.6 * inputs[1]);
      sky.position.x = IN_CLOUDS.x + (calm ? 0 : Math.sin(time * 0.6) * 0.08);
      const rainPositions = rain.geometry.getAttribute("position") as THREE.BufferAttribute;
      const raining = inputs[1] > 0.5 ? 1 : 0;
      rainPhase.forEach(([x, phase, z], i) => {
        const u = ((phase + (calm ? 0 : time * 0.7)) % 1 + 1) % 1;
        rainPositions.setXYZ(i, UMBRELLA.x + x, raining ? UMBRELLA.y + 3.1 - u * 3.6 : -50, z);
      });
      rainPositions.needsUpdate = true;
      for (const name of ["in-clouds", "in-forecast", "w-clouds", "w-forecast", "bias", "total", "umbrella"])
        anchors[name].visible = single.visible && singlePop.value > 0.8;

      // The network: pixels of the digit, then outputs with their scores.
      netPop.update(step === "network", frame);
      if (net.visible) {
        const rows = DIGITS[s.digit];
        for (let r = 0; r < 7; r++)
          for (let c = 0; c < 7; c++) {
            const i = r * 7 + c;
            pixelOn[i] = approach(pixelOn[i], rows[r][c] === "#" ? 1 : 0, 10, frame);
            m.compose(v.set(GRID_X + (c - 3) * CELL, (3 - r) * CELL, 0.06 * pixelOn[i]), q, sc.setScalar(CELL * (0.55 + 0.45 * pixelOn[i])));
            pixels.setMatrixAt(i, m);
            pixels.setColorAt(i, tmpColor.copy(DIM).lerp(ON, pixelOn[i]));
          }
        pixels.instanceMatrix.needsUpdate = true;
        if (pixels.instanceColor) pixels.instanceColor.needsUpdate = true;
        const scores = SCORES[s.digit];
        outputs.forEach((p, k) => {
          barLength[k] = approach(barLength[k], scores[k], 6, frame);
          outBalls.setMatrixAt(k, m.makeTranslation(p.x, p.y, p.z));
          outBalls.setColorAt(k, tmpColor.copy(DIM).lerp(ON, Math.min(1, barLength[k] * 1.3)));
          const length = 0.05 + barLength[k] * 2.6;
          m.compose(v.set(p.x + 0.3 + length / 2, p.y, 0), q, sc.set(length, 1, 1));
          outBars.setMatrixAt(k, m);
        });
        outBalls.instanceMatrix.needsUpdate = outBars.instanceMatrix.needsUpdate = true;
        if (outBalls.instanceColor) outBalls.instanceColor.needsUpdate = true;
        const pulsePositions = pulses.geometry.getAttribute("position") as THREE.BufferAttribute;
        for (let k = 0; k < 16; k++) {
          const t = ((calm ? 0.5 : time * 0.7) + k / 16) % 1;
          const [a, b] = pairs[(k * 29 + Math.floor((calm ? 0 : time * 0.7) + k / 16) * 7) % pairs.length];
          v.copy(a).lerp(b, t);
          pulsePositions.setXYZ(k, v.x, v.y, 0.05);
        }
        pulsePositions.needsUpdate = true;
      }
      anchors.pixels.visible = net.visible && netPop.value > 0.8;
      for (let k = 0; k < 10; k++) anchors[`out-${k}`].visible = net.visible && netPop.value > 0.8;

      // Training: a marker runs down the error curve; digits fly into the network.
      trainPop.update(step === "training", frame);
      if (train.visible) {
        const u = calm ? 1 : Math.min(1, ((time / 7) % 1.15));
        marker.position.copy((train.userData.curve as THREE.CatmullRomCurve3).getPointAt(u)).setZ(0.15);
        for (let k = 0; k < cardCount; k++) {
          const p = ((k / cardCount + (calm ? 0 : time * 0.15)) % 1 + 1) % 1;
          m.compose(v.set(2.2 + p * 1.3, 2.3 - p * 2.1, 0.1), q.setFromEuler(new THREE.Euler(0, 0, 0.3 - p * 0.6)), sc.setScalar(Math.sin(Math.PI * p)));
          cards.setMatrixAt(k, m);
        }
        cards.instanceMatrix.needsUpdate = true;
      }
      anchors["axis-error"].visible = anchors["axis-examples"].visible = train.visible && trainPop.value > 0.8;

      // Scale.
      scalePop.update(step === "scale", frame);
      huge.rotation.y = calm ? 0.3 : time * 0.06;
      anchors.small.visible = anchors.huge.visible = scale.visible && scalePop.value > 0.8;
    },
  };
};

export default neurons;
