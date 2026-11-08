/**
 * Chapter 2, logic gates. A transistor (a switch driven by a bit), the NOT,
 * AND, OR and XOR gates with their inputs and output, a half adder (XOR for
 * the digit, AND for the carry) and a 4-bit adder whose carries ripple from
 * column to column. Wires light up and carry sparks when they hold a 1.
 *
 * Lamp slots: transistor 0 = gate input, 1 = output; single gates 0 = A,
 * 1 = B, 2 = output; half adder 0 = A, 1 = B, 2 = sum, 3 = carry; adder
 * 0–3 = A (bits 3…0), 4–7 = B, 8–11 = sum, 12 = carry out.
 */
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { Kit } from "../../engine/kit";
import { GATES_START, GATES_STEPS, add4, gate, isGate } from "../logic/gates";
import type { GateKind, GatesState, GatesStep } from "../logic/gates";
import type { Store } from "../store";
import { LampField, Pop, WireSet, approach } from "./fx";
import type { LampTarget } from "./fx";
import type { Shot, StageBuilder } from "./types";

const SHOTS: Record<GatesStep, Shot> = {
  transistor: { target: [-0.3, 0.45, 0], width: 12.4, height: 5.8, pitch: 8, yaw: -5 },
  not: { target: [0, 0, 0], width: 9.6, height: 4.4, pitch: 4, yaw: -6 },
  and: { target: [0, 0, 0], width: 9.6, height: 4.4, pitch: 4, yaw: -6 },
  or: { target: [0, 0, 0], width: 9.6, height: 4.4, pitch: 4, yaw: -6 },
  xor: { target: [0, 0, 0], width: 9.6, height: 4.4, pitch: 4, yaw: -6 },
  half: { target: [-0.4, -0.3, 0], width: 10.2, height: 6.6, pitch: 4, yaw: 5 },
  adder: { target: [-0.45, 0.4, 0], width: 12.2, height: 5.4, pitch: 4, yaw: 4 },
};

const GATE_COLORS: Record<GateKind, string> = { not: "#ff8a3d", and: "#3fd0ff", or: "#ff6fb1", xor: "#b58cff" };
const COLUMNS = [-3, -1, 1, 3];

/** The classic gate symbols, 2.4 × 2 units, inputs on the left, output on the right. */
function gateShape(kind: GateKind) {
  const s = new THREE.Shape();
  if (kind === "and") {
    s.moveTo(-1.2, -1);
    s.lineTo(0.2, -1);
    s.absarc(0.2, 0, 1, -Math.PI / 2, Math.PI / 2, false);
    s.lineTo(-1.2, 1);
    s.closePath();
  } else if (kind === "not") {
    s.moveTo(-1.1, -0.95);
    s.lineTo(0.85, 0);
    s.lineTo(-1.1, 0.95);
    s.closePath();
  } else {
    const dx = kind === "xor" ? 0.15 : 0;
    s.moveTo(-1.2 + dx, -1);
    s.quadraticCurveTo(0.3 + dx, -1, 1.25, 0);
    s.quadraticCurveTo(0.3 + dx, 1, -1.2 + dx, 1);
    s.quadraticCurveTo(-0.7 + dx, 0, -1.2 + dx, -1);
  }
  return s;
}

function gateMesh(kit: Kit, kind: GateKind) {
  const group = new THREE.Group();
  const geometry = new THREE.ExtrudeGeometry(gateShape(kind), {
    depth: 0.42,
    bevelEnabled: true,
    bevelThickness: 0.1,
    bevelSize: 0.08,
    bevelSegments: 3,
    curveSegments: 24,
  });
  geometry.translate(0, 0, -0.21);
  const material = kit.toon(GATE_COLORS[kind], { rim: 0.45, gloss: 0.3 });
  group.add(new THREE.Mesh(kit.geometry(geometry), material));
  if (kind === "not") {
    const bubble = new THREE.Mesh(kit.geometry(new THREE.TorusGeometry(0.16, 0.08, 12, 28)), material);
    bubble.position.x = 1.06;
    group.add(bubble);
  }
  if (kind === "xor") {
    const back = new THREE.QuadraticBezierCurve3(new THREE.Vector3(-1.32, -1, 0), new THREE.Vector3(-0.82, 0, 0), new THREE.Vector3(-1.32, 1, 0));
    group.add(new THREE.Mesh(kit.geometry(new THREE.TubeGeometry(back, 24, 0.09, 10)), material));
  }
  return group;
}

const gates: StageBuilder = ({ kit, store }) => {
  const shared = store as Store<GatesState> | null;
  const state = () => shared?.get() ?? GATES_START;
  const root = new THREE.Group();
  const anchors: Record<string, THREE.Object3D> = {};
  const anchor = (name: string, x: number, y: number, z = 0.3) => {
    const object = new THREE.Object3D();
    object.position.set(x, y, z);
    anchors[name] = object;
    root.add(object);
    return object;
  };
  const rounded = (w: number, h: number, d: number, r: number) => kit.geometry(new RoundedBoxGeometry(w, h, d, 4, r));
  const colorOf = (material: THREE.Material) => (material as THREE.ShaderMaterial).uniforms.uColor.value as THREE.Color;
  const on = new THREE.Color("#ffd23f");

  const lamps = new LampField(kit, 13);
  root.add(lamps.group);
  lamps.anchors.forEach((object, k) => (anchors[`lamp-${k}`] = object));

  /* ---------------- The transistor ---------------- */
  const transistor = new THREE.Group();
  root.add(transistor);
  const transistorPop = new Pop(transistor);
  {
    const substrate = new THREE.Mesh(rounded(6.4, 1.1, 1.8, 0.25), kit.toon("#3b2a8f", { rim: 0.4, rimColor: "#8f7bff" }));
    substrate.position.y = -0.95;
    transistor.add(substrate);
    for (const x of [-2.1, 2.1]) {
      const well = new THREE.Mesh(rounded(1.7, 0.75, 1.5, 0.2), kit.toon("#ff6fb1", { rim: 0.45, gloss: 0.3 }));
      well.position.set(x, -0.3, 0);
      transistor.add(well);
    }
    const oxide = new THREE.Mesh(rounded(2.7, 0.1, 1.5, 0.04), kit.toon("#e8e2ff", { gloss: 0.4 }));
    oxide.position.y = 0.12;
    const gateBlock = new THREE.Mesh(rounded(2.5, 0.5, 1.4, 0.15), kit.toon("#3fd0ff", { rim: 0.45, gloss: 0.3 }));
    gateBlock.position.y = 0.42;
    transistor.add(oxide, gateBlock);
    const battery = new THREE.Group();
    battery.position.set(-4.7, -0.3, 0);
    const cell = new THREE.Mesh(kit.geometry(new THREE.CapsuleGeometry(0.34, 0.8, 8, 20)), kit.toon("#ffb13b", { gloss: 0.4, rim: 0.4 }));
    cell.rotation.z = Math.PI / 2;
    const cap = new THREE.Mesh(kit.geometry(new THREE.CylinderGeometry(0.14, 0.14, 0.2, 16)), kit.toon("#e8e2ff", { gloss: 0.5 }));
    cap.rotation.z = Math.PI / 2;
    cap.position.x = 0.82;
    battery.add(cell, cap);
    transistor.add(battery);
  }
  const channelMaterial = kit.toon("#3b2a8f", { flat: 0.3, gloss: 0.2 });
  const channel = new THREE.Mesh(rounded(2.6, 0.16, 1.45, 0.05), channelMaterial);
  channel.position.y = -0.02;
  const channelGlow = kit.glow("#ffd23f", 3.2, { opacity: 0 });
  channelGlow.position.set(0, -0.02, 0.8);
  transistor.add(channel, channelGlow);
  const transistorWires = new WireSet(kit);
  const tGate = transistorWires.add([[0, 0.68, 0], [0, 2.1, 0]]);
  const tSource = transistorWires.add([[-3.9, -0.3, 0], [-2.95, -0.3, 0]]);
  const tChannel = transistorWires.add([[-1.25, -0.02, 0.78], [1.25, -0.02, 0.78]], { tube: false, sparks: 5 });
  const tDrain = transistorWires.add([[2.95, -0.3, 0], [3.95, -0.3, 0]]);
  transistor.add(transistorWires.finish().group);
  anchor("gate", -1.75, 0.75, 0.6);
  anchor("source", -2.1, -1.55, 0.9);
  anchor("drain", 2.1, -1.55, 0.9);

  /* ---------------- A single gate ---------------- */
  const single = new THREE.Group();
  root.add(single);
  const singlePop = new Pop(single);
  const shapes = {} as Record<GateKind, { group: THREE.Group; pop: Pop }>;
  for (const kind of ["not", "and", "or", "xor"] as GateKind[]) {
    const group = gateMesh(kit, kind);
    single.add(group);
    shapes[kind] = { group, pop: new Pop(group) };
  }
  const twoInputs = new WireSet(kit);
  const wA = twoInputs.add([[-3.15, 0.6, 0], [-0.8, 0.6, 0]]);
  const wB = twoInputs.add([[-3.15, -0.6, 0], [-0.8, -0.6, 0]]);
  const wOut = twoInputs.add([[1.0, 0, 0], [3.0, 0, 0]]);
  twoInputs.finish();
  const oneInput = new WireSet(kit);
  const nA = oneInput.add([[-3.15, 0, 0], [-0.8, 0, 0]]);
  const nOut = oneInput.add([[1.0, 0, 0], [3.0, 0, 0]]);
  oneInput.finish();
  single.add(twoInputs.group, oneInput.group);

  /* ---------------- The half adder ---------------- */
  const half = new THREE.Group();
  root.add(half);
  const halfPop = new Pop(half);
  const XOR_AT = [0.4, 1.35];
  const AND_AT = [0.4, -1.35];
  const k = 0.62;
  for (const [kind, [x, y]] of [["xor", XOR_AT], ["and", AND_AT]] as const) {
    const g = gateMesh(kit, kind);
    g.position.set(x, y, 0);
    g.scale.setScalar(k);
    half.add(g);
  }
  const halfWires = new WireSet(kit);
  const inX = XOR_AT[0] - 0.85 * k;
  const hA1 = halfWires.add([[-3.85, 1.72, 0], [inX, 1.72, 0]]);
  const hA2 = halfWires.add([[-2.6, 1.72, 0], [-2.6, -0.98, 0], [inX, -0.98, 0]]);
  const hB1 = halfWires.add([[-3.85, -1.72, -0.12], [inX, -1.72, -0.12]]);
  const hB2 = halfWires.add([[-1.9, -1.72, -0.12], [-1.9, 0.98, -0.12], [inX, 0.98, -0.12]]);
  const hSum = halfWires.add([[XOR_AT[0] + 0.62, XOR_AT[1], 0], [2.95, XOR_AT[1], 0]]);
  const hCarry = halfWires.add([[AND_AT[0] + 0.62, AND_AT[1], 0], [2.95, AND_AT[1], 0]]);
  halfWires.junction([-2.6, 1.72, 0]);
  halfWires.junction([-1.9, -1.72, -0.12]);
  half.add(halfWires.finish().group);
  anchor("xor", XOR_AT[0], XOR_AT[1] - 0.72, 0.4);
  anchor("and", AND_AT[0], AND_AT[1] - 0.72, 0.4);
  anchor("sum", 3.4, XOR_AT[1] + 0.62, 0.3);
  anchor("carry", 3.4, AND_AT[1] + 0.62, 0.3);
  anchor("equation", -0.2, -2.75, 0.3);

  /* ---------------- The 4-bit adder ---------------- */
  const adder = new THREE.Group();
  root.add(adder);
  const adderPop = new Pop(adder);
  const blockMaterial = kit.toon("#3fd0ff", { rim: 0.45, gloss: 0.3 });
  const plusMaterial = kit.flat("#0b2050");
  for (const x of COLUMNS) {
    const block = new THREE.Mesh(rounded(1.3, 0.9, 0.5, 0.2), blockMaterial);
    block.position.set(x, 0, 0);
    const bar = rounded(0.46, 0.11, 0.06, 0.04);
    const h = new THREE.Mesh(bar, plusMaterial);
    const v = new THREE.Mesh(bar, plusMaterial);
    v.rotation.z = Math.PI / 2;
    h.position.set(x, 0, 0.27);
    v.position.set(x, 0, 0.27);
    adder.add(block, h, v);
  }
  const adderWires = new WireSet(kit);
  const inA = COLUMNS.map((x) => adderWires.add([[x - 0.25, 2.1, -0.3], [x - 0.25, 0.45, -0.3]]));
  const inB = COLUMNS.map((x) => adderWires.add([[x + 0.25, 1.15, 0], [x + 0.25, 0.45, 0]]));
  const outS = COLUMNS.map((x) => adderWires.add([[x, -0.45, 0], [x, -1.15, 0]]));
  // carries[c] leaves column c (bit 3 - c) to the left.
  const carryWires = COLUMNS.map((x, c) =>
    c === 0
      ? adderWires.add([[x - 0.65, 0, 0], [-5, 0, 0], [-5, -1.15, 0]])
      : adderWires.add([[x - 0.65, 0, 0], [COLUMNS[c - 1] + 0.65, 0, 0]]),
  );
  adder.add(adderWires.finish().group);
  anchor("number-a", -4.25, 2.5, 0.2);
  anchor("number-b", -4.25, 1.55, 0.2);
  anchor("result", -1, -2.05, 0.3);
  anchor("value-a", 3.4, 2.5, 0.2);
  anchor("value-b", 3.4, 1.55, 0.2);
  anchor("value-sum", 3.4, -1.55, 0.2);
  let lastInputs = "";
  let conducting = 1;
  const channelOff = new THREE.Color("#3b2a8f");
  let rippleClock = 1e3;

  /* ---------------- Layouts ---------------- */
  function layout(step: GatesStep, s: GatesState, shown: { sum: number; carries: number[] }): LampTarget[] {
    if (step === "transistor")
      return [
        { x: 0, y: 2.55, size: 1, on: Number(s.gate) },
        { x: 4.6, y: -0.3, size: 1.2, on: Number(s.gate) },
      ];
    if (isGate(step)) {
      const out = Number(gate(step, s.a, s.b));
      return step === "not"
        ? [{ x: -3.6, y: 0, size: 0.9, on: Number(s.a) }, { x: -3.6, y: 0, size: 0, on: 0 }, { x: 3.6, y: 0, size: 1.2, on: out }]
        : [
            { x: -3.6, y: 0.6, size: 0.9, on: Number(s.a) },
            { x: -3.6, y: -0.6, size: 0.9, on: Number(s.b) },
            { x: 3.6, y: 0, size: 1.2, on: out },
          ];
    }
    if (step === "half")
      return [
        { x: -4.3, y: 1.72, size: 0.9, on: Number(s.a) },
        { x: -4.3, y: -1.72, size: 0.9, on: Number(s.b) },
        { x: 3.4, y: XOR_AT[1], size: 1, on: Number(s.a !== s.b) },
        { x: 3.4, y: AND_AT[1], size: 1, on: Number(s.a && s.b) },
      ];
    const bit = (n: number, i: number) => (n >> i) & 1;
    return [
      ...COLUMNS.map((x, c) => ({ x, y: 2.5, size: 0.8, on: bit(s.x, 3 - c) })),
      ...COLUMNS.map((x, c) => ({ x, y: 1.55, size: 0.8, on: bit(s.y, 3 - c) })),
      ...COLUMNS.map((x, c) => ({ x, y: -1.55, size: 0.8, on: bit(shown.sum, 3 - c), color: "#3ff2b5" })),
      { x: -5, y: -1.55, size: 0.8, on: bit(shown.sum, 4), color: "#3ff2b5" },
    ];
  }

  return {
    root,
    anchors,
    shot: (step) => SHOTS[GATES_STEPS[step] ?? "transistor"],
    update(frame) {
      const step = GATES_STEPS[frame.step] ?? "transistor";
      const s = state();

      // The adder's carries ripple from the right after each change.
      const inputs = `${s.x},${s.y}`;
      if (inputs !== lastInputs) {
        lastInputs = inputs;
        rippleClock = 0;
      }
      rippleClock += frame.dt;
      const clock = frame.snap || frame.reducedMotion ? 1e3 : rippleClock;
      const result = add4(s.x, s.y);
      const carriesShown = result.carries.map((c, i) => (clock > 0.35 * (i + 1) ? c : 0));
      let sumShown = 0;
      for (let i = 0; i < 5; i++) if (clock > 0.35 * i + 0.2) sumShown |= result.sum & (1 << i);

      lamps.layout(layout(step, s, { sum: sumShown, carries: carriesShown }));
      lamps.update(frame);

      // Transistor: the channel conducts when the gate holds a 1.
      transistorPop.update(step === "transistor", frame);
      conducting = approach(conducting, Number(s.gate), 10, frame);
      colorOf(channelMaterial).copy(channelOff).lerp(on, conducting);
      channelGlow.material.opacity = 0.9 * conducting;
      transistorWires.set(tGate, s.gate);
      for (const w of [tSource, tChannel, tDrain]) transistorWires.set(w, s.gate);
      transistorWires.update(frame);
      for (const name of ["gate", "source", "drain"]) anchors[name].visible = transistor.visible && transistorPop.value > 0.8;

      // One gate at a time.
      const gateStep = isGate(step) ? step : null;
      singlePop.update(!!gateStep, frame);
      for (const kind of ["not", "and", "or", "xor"] as GateKind[]) shapes[kind].pop.update(gateStep === kind, frame);
      twoInputs.group.visible = !!gateStep && gateStep !== "not";
      oneInput.group.visible = gateStep === "not";
      const out = gateStep ? gate(gateStep, s.a, s.b) : false;
      twoInputs.set(wA, s.a);
      twoInputs.set(wB, s.b);
      twoInputs.set(wOut, out);
      oneInput.set(nA, s.a);
      oneInput.set(nOut, out);
      twoInputs.update(frame);
      oneInput.update(frame);

      // Half adder.
      halfPop.update(step === "half", frame);
      for (const w of [hA1, hA2]) halfWires.set(w, s.a);
      for (const w of [hB1, hB2]) halfWires.set(w, s.b);
      halfWires.set(hSum, s.a !== s.b);
      halfWires.set(hCarry, s.a && s.b);
      halfWires.update(frame);
      for (const name of ["xor", "and", "sum", "carry", "equation"]) anchors[name].visible = half.visible && halfPop.value > 0.8;

      // 4-bit adder.
      adderPop.update(step === "adder", frame);
      COLUMNS.forEach((_, c) => {
        const i = 3 - c;
        adderWires.set(inA[c], (s.x >> i) & 1);
        adderWires.set(inB[c], (s.y >> i) & 1);
        adderWires.set(outS[c], (sumShown >> i) & 1);
        adderWires.set(carryWires[c], carriesShown[i]);
      });
      adderWires.update(frame);
      for (const name of ["number-a", "number-b", "result", "value-a", "value-b", "value-sum"])
        anchors[name].visible = adder.visible && adderPop.value > 0.8;
    },
  };
};

export default gates;
