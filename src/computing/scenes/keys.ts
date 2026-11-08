/**
 * Chapter 4, public and private keys, told with a real message. Alice and
 * Bob talk over a wire that Eve watches with her magnifying glass and copies
 * into her notebook. Letter tiles show the message and its scrambled
 * version; an 11-hour clock shows powers of 2; public keys travel as glowing
 * tokens; the shared key lights up a golden key on each side; finally a
 * browser and a server run the same three stages. Letters and numbers are
 * drawn by the interface at the anchors.
 */
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { rng } from "../../engine/kit";
import type { Kit } from "../../engine/kit";
import { tr } from "../../i18n";
import { CLOCK, EXAMPLE_MESSAGE, KEYS_START, KEYS_STEPS, MAX_LETTERS, START, clockTrail, onClock } from "../logic/keys";
import type { KeysState, KeysStep } from "../logic/keys";
import type { Store } from "../store";
import { Pop, approach } from "./fx";
import type { Shot, StageBuilder } from "./types";

const PEOPLE: Shot = { target: [0, -0.1, 0], width: 11.6, height: 6.4, pitch: 5 };
const SHOTS: Record<KeysStep, Shot> = {
  problem: PEOPLE,
  shift: { target: [-0.6, 0.2, 0], width: 10.2, height: 4.6, pitch: 4 },
  clock: { target: [0, 0.1, 0], width: 7.4, height: 7, pitch: 3 },
  exchange: PEOPLE,
  shared: PEOPLE,
  message: PEOPLE,
  https: { target: [0, 0.1, 0], width: 11.6, height: 4.8, pitch: 4 },
};

const ALICE_X = -4.3;
const BOB_X = 4.3;
const FEET = -1.75;
const WIRE_Y = -0.35;
const CLOCK_R = 2.2;
const TILE = 0.62;
const GAP = 0.72;

/** A friendly character: a pebble body, a round head, two eyes. */
function person(kit: Kit, color: string, scale = 1) {
  const group = new THREE.Group();
  const material = kit.toon(color, { rim: 0.45, gloss: 0.25 });
  const body = new THREE.Mesh(kit.geometry(new THREE.CapsuleGeometry(0.46, 0.5, 8, 20)), material);
  body.position.y = 0.72;
  const head = new THREE.Mesh(kit.geometry(new THREE.SphereGeometry(0.4, 28, 20)), material);
  head.position.y = 1.72;
  const eye = kit.geometry(new THREE.SphereGeometry(0.055, 12, 8));
  const dark = kit.flat("#1a1040");
  for (const x of [-0.13, 0.13]) {
    const e = new THREE.Mesh(eye, dark);
    e.position.set(x, 1.78, 0.36);
    group.add(e);
  }
  const base = new THREE.Mesh(kit.geometry(new THREE.CylinderGeometry(0.75, 0.82, 0.14, 36)), kit.toon("#2b1f6b", { rim: 0.4, rimColor: "#8f7bff" }));
  base.position.y = 0.07;
  group.add(base, body, head);
  group.scale.setScalar(scale);
  return group;
}

function keyMesh(kit: Kit) {
  const group = new THREE.Group();
  const gold = kit.toon("#ffd23f", { gloss: 0.55, rim: 0.4 });
  const bow = new THREE.Mesh(kit.geometry(new THREE.TorusGeometry(0.2, 0.07, 10, 28)), gold);
  bow.position.y = 0.36;
  const shaft = new THREE.Mesh(kit.geometry(new THREE.BoxGeometry(0.09, 0.62, 0.09)), gold);
  shaft.position.y = -0.1;
  group.add(bow, shaft);
  for (const y of [-0.34, -0.2]) {
    const tooth = new THREE.Mesh(kit.geometry(new THREE.BoxGeometry(0.16, 0.08, 0.08)), gold);
    tooth.position.set(0.11, y, 0);
    group.add(tooth);
  }
  return group;
}

const keys: StageBuilder = ({ kit, store }) => {
  const shared = store as Store<KeysState> | null;
  const state = () => shared?.get() ?? KEYS_START;
  const random = rng(77);
  const root = new THREE.Group();
  const anchors: Record<string, THREE.Object3D> = {};
  const anchor = (name: string, parent: THREE.Object3D, x: number, y: number, z = 0.3) => {
    const object = new THREE.Object3D();
    object.position.set(x, y, z);
    anchors[name] = object;
    parent.add(object);
    return object;
  };
  const rounded = (w: number, h: number, d: number, r: number, s = 3) => kit.geometry(new RoundedBoxGeometry(w, h, d, s, r));
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const v = new THREE.Vector3();
  const sc = new THREE.Vector3();
  const show = (names: string[], visible: boolean) => names.forEach((name) => (anchors[name].visible = visible));

  /* ---------------- Alice, Bob, Eve, the wire and Eve's notebook ---------------- */
  const alice = person(kit, "#ff6fb1");
  alice.position.set(ALICE_X, FEET, 0);
  const bob = person(kit, "#3fd0ff");
  bob.position.set(BOB_X, FEET, 0);
  root.add(alice, bob);
  const alicePop = new Pop(alice);
  const bobPop = new Pop(bob);
  anchor("alice", root, ALICE_X, FEET - 0.05, 0.6);
  anchor("bob", root, BOB_X, FEET - 0.05, 0.6);
  // Thought bubbles: what each one knows (secret, message, key).
  anchor("know-alice", root, ALICE_X, FEET + 2.55, 0.3);
  anchor("know-bob", root, BOB_X, FEET + 2.55, 0.3);
  anchor("calc-alice", root, ALICE_X + 1.55, FEET + 1.55, 0.5);
  anchor("calc-bob", root, BOB_X - 1.55, FEET + 1.55, 0.5);

  const wire = new THREE.Group();
  root.add(wire);
  const wirePop = new Pop(wire);
  {
    const tube = new THREE.Mesh(kit.geometry(new THREE.CylinderGeometry(0.07, 0.07, BOB_X - ALICE_X - 1.6, 12)), kit.toon("#8f7bff", { rim: 0.4 }));
    tube.rotation.z = Math.PI / 2;
    tube.position.y = WIRE_Y;
    wire.add(tube);
    for (const x of [ALICE_X + 0.8, BOB_X - 0.8]) {
      const plug = new THREE.Mesh(kit.geometry(new THREE.SphereGeometry(0.16, 16, 12)), kit.toon("#2b1f6b", { rim: 0.4 }));
      plug.position.set(x, WIRE_Y, 0);
      wire.add(plug);
    }
  }

  const eve = person(kit, "#3ff2b5", 0.74);
  eve.position.set(-0.9, FEET - 0.45, -0.7);
  const glass = new THREE.Group();
  glass.position.set(0.55, 1.65, 0.25);
  glass.rotation.z = 0.5;
  glass.add(
    new THREE.Mesh(kit.geometry(new THREE.TorusGeometry(0.34, 0.06, 12, 36)), kit.toon("#ffd23f", { gloss: 0.5 })),
    new THREE.Mesh(kit.geometry(new THREE.CircleGeometry(0.32, 32)), kit.toon("#bff4ff", { opacity: 0.35, flat: 0.6, depthWrite: false, side: THREE.DoubleSide })),
  );
  const handle = new THREE.Mesh(kit.geometry(new THREE.CapsuleGeometry(0.05, 0.36, 6, 10)), kit.toon("#ffd23f"));
  handle.position.set(0, -0.55, 0);
  glass.add(handle);
  eve.add(glass);
  root.add(eve);
  const evePop = new Pop(eve);
  // Eve's notebook: everything that went by, copied down.
  const notebook = new THREE.Group();
  notebook.position.set(1.15, FEET + 0.55, 0.2);
  notebook.rotation.set(-0.15, -0.25, 0.05);
  notebook.add(new THREE.Mesh(rounded(1.9, 1.3, 0.12, 0.08, 2), kit.toon("#fff4d6", { rim: 0.3 })));
  const spine = new THREE.Mesh(rounded(0.16, 1.34, 0.18, 0.06, 2), kit.toon("#3ff2b5", { rim: 0.3 }));
  spine.position.x = -0.98;
  notebook.add(spine);
  root.add(notebook);
  const notebookPop = new Pop(notebook);
  anchor("eve", root, -0.9, FEET - 0.5, 0.4);
  anchor("eve-notes", notebook, 0.08, 0.05, 0.12);

  /* ---------------- Letter tiles: the message and its scrambled version ---------------- */
  const tileCount = MAX_LETTERS * 2;
  const tiles = new THREE.InstancedMesh(rounded(TILE, TILE, 0.22, 0.12), kit.toon("#ffffff", { rim: 0.35, gloss: 0.3 }), tileCount);
  tiles.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  tiles.frustumCulled = false;
  root.add(tiles);
  const tileState = Array.from({ length: tileCount }, () => ({ x: 0, y: 0, s: 0, c: new THREE.Color("#fff4d6") }));
  for (let i = 0; i < tileCount; i++) {
    anchor(`tile-${i}`, root, 0, 0, 0.2);
    tiles.setColorAt(i, tileState[i].c);
  }
  const PLAIN = new THREE.Color("#fff4d6");
  const CIPHER = new THREE.Color("#ff9ccc");
  // Arrows from each letter to its scrambled letter (step "shift").
  const arrows = new THREE.InstancedMesh(kit.geometry(new THREE.ConeGeometry(0.13, 0.32, 16)), kit.toon("#ffd23f", { gloss: 0.4 }), MAX_LETTERS);
  const shafts = new THREE.InstancedMesh(kit.geometry(new THREE.CylinderGeometry(0.035, 0.035, 0.7, 8)), kit.toon("#ffd23f"), MAX_LETTERS);
  for (const mesh of [arrows, shafts]) {
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false;
    root.add(mesh);
  }
  anchor("row-plain", root, -3.75, 1.25, 0.2);
  anchor("row-cipher", root, -3.75, -0.85, 0.2);
  anchor("shift-key", root, 2.75, 0.2, 0.3);

  /* ---------------- Public keys travelling, shared keys appearing ---------------- */
  const makeToken = (color: string) => {
    const token = new THREE.Group();
    token.add(new THREE.Mesh(kit.geometry(new THREE.SphereGeometry(0.36, 28, 20)), kit.toon(color, { gloss: 0.5, rim: 0.5 })));
    token.add(kit.glow(color, 1.6, { opacity: 0.55 }));
    root.add(token);
    return { group: token, pop: new Pop(token) };
  };
  const tokenA = makeToken("#ff9ccc");
  const tokenB = makeToken("#8fe3ff");
  anchors["token-a"] = tokenA.group;
  anchors["token-b"] = tokenB.group;
  const keyAlice = keyMesh(kit);
  keyAlice.position.set(ALICE_X + 1.0, FEET + 1.0, 0.4);
  keyAlice.rotation.z = -0.5;
  const keyBob = keyMesh(kit);
  keyBob.position.set(BOB_X - 1.0, FEET + 1.0, 0.4);
  keyBob.rotation.z = 0.5;
  root.add(keyAlice, keyBob);
  const keyPops = [new Pop(keyAlice), new Pop(keyBob)];

  /* ---------------- The 11-hour clock ---------------- */
  const clock = new THREE.Group();
  clock.position.set(0, 0.1, 0);
  root.add(clock);
  const clockPop = new Pop(clock);
  {
    const face = new THREE.Mesh(kit.geometry(new THREE.CylinderGeometry(CLOCK_R + 0.55, CLOCK_R + 0.55, 0.3, 64)), kit.toon("#3a1550", { rim: 0.4, rimColor: "#ff9ccc" }));
    face.rotation.x = Math.PI / 2;
    face.position.z = -0.2;
    const ring = new THREE.Mesh(kit.geometry(new THREE.TorusGeometry(CLOCK_R + 0.55, 0.11, 14, 96)), kit.toon("#ff6fb1", { gloss: 0.4, rim: 0.4 }));
    clock.add(face, ring);
  }
  const at = (hour: number, radius = CLOCK_R) => {
    const angle = Math.PI / 2 - (hour / CLOCK) * Math.PI * 2;
    return new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
  };
  const ticks = new THREE.InstancedMesh(kit.geometry(new THREE.SphereGeometry(0.17, 16, 12)), kit.toon("#ffffff", { rim: 0.3, gloss: 0.4 }), CLOCK);
  for (let h = 0; h < CLOCK; h++) {
    ticks.setMatrixAt(h, m.makeTranslation(at(h)));
    ticks.setColorAt(h, new THREE.Color("#7c6bd6"));
    const label = at(h, CLOCK_R + 0.9);
    anchor(`tick-${h}`, clock, label.x, label.y, 0.2);
  }
  clock.add(ticks);
  const trailPoints = clockTrail(CLOCK - 1);
  const chords = trailPoints.slice(1).map((hour, k) => {
    const line = kit.line([at(trailPoints[k], CLOCK_R - 0.05), at(hour, CLOCK_R - 0.05)], { color: "#ffd23f", width: 3, opacity: 0.85 });
    line.visible = false;
    clock.add(line);
    return line;
  });
  const hand = new THREE.Group();
  const handBar = new THREE.Mesh(rounded(0.16, CLOCK_R - 0.35, 0.12, 0.06, 2), kit.toon("#ffd23f", { gloss: 0.5 }));
  handBar.position.y = (CLOCK_R - 0.35) / 2;
  hand.add(handBar);
  hand.position.z = 0.12;
  const cap = new THREE.Mesh(kit.geometry(new THREE.SphereGeometry(0.22, 20, 14)), kit.toon("#ffd23f", { gloss: 0.5 }));
  cap.position.z = 0.12;
  clock.add(hand, cap);
  anchor("power", clock, 0, -0.95, 0.4);
  let handAngle = 0;
  let lastPower = -1;
  const visited = new THREE.Color("#ffd23f");
  const unvisited = new THREE.Color("#7c6bd6");

  /* ---------------- https: browser, server and three lanes ---------------- */
  const web = new THREE.Group();
  root.add(web);
  const webPop = new Pop(web);
  {
    const browser = new THREE.Group();
    browser.position.set(-4.3, 0, 0);
    browser.add(new THREE.Mesh(rounded(2.5, 2.1, 0.3, 0.2, 4), kit.toon("#f4f0ff", { shadow: "#b9a8f0", rim: 0.4 })));
    const bar = new THREE.Mesh(rounded(2.5, 0.42, 0.34, 0.15), kit.toon("#2b1f6b", { rim: 0.3 }));
    bar.position.y = 0.84;
    browser.add(bar);
    ["#ff5e6c", "#ffd23f", "#4fcf5f"].forEach((c, k) => {
      const dot = new THREE.Mesh(kit.geometry(new THREE.SphereGeometry(0.07, 12, 8)), kit.flat(c));
      dot.position.set(-1.0 + k * 0.22, 0.84, 0.19);
      browser.add(dot);
    });
    const tiny = new THREE.Group();
    tiny.position.set(-0.1, 0.84, 0.2);
    tiny.scale.setScalar(0.42);
    const tinyShackle = new THREE.Mesh(kit.geometry(new THREE.TorusGeometry(0.15, 0.05, 10, 24, Math.PI)), kit.toon("#e8e2ff"));
    tinyShackle.position.y = 0.19;
    tiny.add(new THREE.Mesh(rounded(0.46, 0.38, 0.2, 0.08), kit.toon("#4fcf5f", { gloss: 0.4 })), tinyShackle);
    browser.add(tiny);
    for (let k = 0; k < 3; k++) {
      const line = new THREE.Mesh(rounded(1.6 - k * 0.35, 0.14, 0.05, 0.06, 2), kit.flat("#c9b3ff"));
      line.position.set(-0.3 + k * 0.17, 0.25 - k * 0.38, 0.16);
      browser.add(line);
    }
    const server = new THREE.Group();
    server.position.set(4.3, 0, 0);
    server.add(new THREE.Mesh(rounded(1.5, 2.6, 1.0, 0.18), kit.toon("#2b1f6b", { rim: 0.5, rimColor: "#8f7bff" })));
    for (let k = 0; k < 4; k++) {
      const slot = new THREE.Mesh(rounded(1.15, 0.32, 0.06, 0.08, 2), kit.toon("#3b2c86", { rim: 0.2 }));
      slot.position.set(0, 0.9 - k * 0.55, 0.51);
      const led = new THREE.Mesh(kit.geometry(new THREE.SphereGeometry(0.06, 10, 8)), kit.flat(k % 2 ? "#3ff2b5" : "#ffd23f"));
      led.position.set(0.4, 0.9 - k * 0.55, 0.55);
      server.add(slot, led);
    }
    web.add(browser, server);
    for (const y of [1, 0, -1]) {
      const lane = new THREE.Mesh(kit.geometry(new THREE.CylinderGeometry(0.05, 0.05, 5.2, 10)), kit.toon("#8f7bff", { rim: 0.3 }));
      lane.rotation.z = Math.PI / 2;
      lane.position.y = y;
      web.add(lane);
    }
  }
  anchor("lane-exchange", web, 0, 1.3, 0.3);
  anchor("lane-signature", web, 0, 0.3, 0.3);
  anchor("lane-cipher", web, 0, -0.7, 0.3);
  const laneTokens = [makeToken("#ff9ccc"), makeToken("#8fe3ff")];
  for (const token of laneTokens) {
    token.group.removeFromParent();
    web.add(token.group);
  }
  const laneKeys = [keyMesh(kit), keyMesh(kit)];
  laneKeys.forEach((key, k) => {
    key.scale.setScalar(0.7);
    key.position.set(k ? 2.6 : -2.6, 0, 0.2);
    web.add(key);
  });
  const streamCount = kit.count(40, 22);
  const streamColors: number[] = [];
  const palette = ["#ff6fb1", "#3fd0ff", "#ffd23f", "#3ff2b5", "#b58cff"].map((c) => new THREE.Color(c));
  const streamPhase: number[] = [];
  for (let i = 0; i < streamCount; i++) {
    const c = palette[Math.floor(random() * palette.length)];
    streamColors.push(c.r, c.g, c.b);
    streamPhase.push(random());
  }
  const stream = kit.points(new Float32Array(streamCount * 3), { colors: streamColors, size: 0.26, soft: 0.5, maxPx: 30 });
  web.add(stream);

  /* ---------------- Motion ---------------- */
  const wirePoint = (u: number) => new THREE.Vector3(ALICE_X + 0.8 + u * (BOB_X - ALICE_X - 1.6), WIRE_Y, 0.15);

  return {
    root,
    anchors,
    shot: (step) => SHOTS[KEYS_STEPS[step] ?? "problem"],
    update(frame) {
      const step = KEYS_STEPS[frame.step] ?? "problem";
      const s = state();
      const { time } = frame;
      const calm = frame.reducedMotion;
      const message = s.message ?? tr(EXAMPLE_MESSAGE);
      const people = step === "problem" || step === "exchange" || step === "shared" || step === "message";
      alicePop.update(people, frame);
      bobPop.update(people, frame);
      wirePop.update(people, frame);
      evePop.update(people, frame);
      notebookPop.update(people, frame);
      const sway = calm ? 0 : Math.sin(time * 2) * 0.04;
      alice.position.y = FEET + sway;
      bob.position.y = FEET - sway;
      glass.rotation.z = 0.5 + (calm ? 0 : Math.sin(time * 1.3) * 0.15);
      const ready = people && alicePop.value > 0.8;
      show(["alice", "bob", "eve", "eve-notes", "know-alice", "know-bob"], ready);
      show(["calc-alice", "calc-bob"], ready && step === "shared");

      // Letter tiles: a train on the wire, or two rows (message and scrambled).
      const letters = Math.max(1, message.length);
      const train = step === "problem" || step === "message";
      const rows = step === "shift";
      const loop = calm ? 0.5 : (time / 6) % 1;
      for (let i = 0; i < tileCount; i++) {
        const t = tileState[i];
        const cipherRow = i >= MAX_LETTERS;
        const k = cipherRow ? i - MAX_LETTERS : i;
        let target = 0;
        let x = t.x;
        let y = t.y;
        if (k < letters && rows) {
          target = 1;
          x = -0.6 + (k - (letters - 1) / 2) * GAP;
          y = cipherRow ? -0.85 : 1.25;
        } else if (k < letters && train && !cipherRow) {
          // The train runs from Alice to Bob; letters outside the wire shrink away.
          // The last letter leads, so the train reads left to right.
          const u = loop * 1.5 - 0.25 - ((letters - 1 - k) * GAP) / (BOB_X - ALICE_X - 1.6);
          const inside = u > 0.02 && u < 0.98;
          target = inside ? 1 : 0;
          const p = wirePoint(Math.min(1, Math.max(0, u)));
          x = p.x;
          y = WIRE_Y + 0.6;
        }
        t.x = frame.snap || t.s < 0.05 ? x : approach(t.x, x, 7, frame);
        t.y = frame.snap || t.s < 0.05 ? y : approach(t.y, y, 7, frame);
        t.s = approach(t.s, target, 10, frame);
        t.c.copy(cipherRow || step === "message" ? CIPHER : PLAIN);
        m.compose(v.set(t.x, t.y, 0.2), q, sc.setScalar(Math.max(1e-4, t.s)));
        tiles.setMatrixAt(i, m);
        tiles.setColorAt(i, t.c);
        anchors[`tile-${i}`].position.set(t.x, t.y, 0.35);
        anchors[`tile-${i}`].visible = t.s > 0.7;
      }
      tiles.instanceMatrix.needsUpdate = true;
      if (tiles.instanceColor) tiles.instanceColor.needsUpdate = true;
      for (let k = 0; k < MAX_LETTERS; k++) {
        const on = rows && k < letters ? Math.min(tileState[k].s, tileState[k + MAX_LETTERS].s) : 0;
        const x = tileState[k].x;
        m.compose(v.set(x, -0.05, 0.2), q.set(1, 0, 0, 0), sc.setScalar(on));
        arrows.setMatrixAt(k, m);
        m.compose(v.set(x, 0.3, 0.2), q.identity(), sc.setScalar(on));
        shafts.setMatrixAt(k, m);
      }
      q.identity();
      arrows.instanceMatrix.needsUpdate = shafts.instanceMatrix.needsUpdate = true;
      show(["row-plain", "row-cipher", "shift-key"], rows && tileState[0].s > 0.7);

      // Public keys: sent in the exchange, held once received.
      const exchanging = step === "exchange";
      const holding = step === "shared";
      tokenA.pop.update(exchanging || holding, frame);
      tokenB.pop.update(exchanging || holding, frame);
      const travel = exchanging ? Math.min(1, (calm ? 0.5 : time / 3.2) % 1.25) : 1;
      tokenA.group.position.copy(wirePoint(holding ? 1 : travel)).add(v.set(holding ? 0.15 : 0, 0.6, 0));
      tokenB.group.position.copy(wirePoint(holding ? 0 : 1 - travel)).add(v.set(holding ? -0.15 : 0, -0.6, 0));
      anchors["token-a"].visible = tokenA.group.visible && tokenA.pop.value > 0.8;
      anchors["token-b"].visible = tokenB.group.visible && tokenB.pop.value > 0.8;

      // The shared key: a golden key appears on both sides.
      const keyed = step === "shared" || step === "message";
      keyPops.forEach((pop) => pop.update(keyed, frame));
      keyAlice.rotation.y = keyBob.rotation.y = calm ? 0.3 : time * 0.9;

      // The clock: the hand walks round to 2^power.
      clockPop.update(step === "clock", frame);
      const hour = onClock(START, s.power);
      if (s.power !== lastPower) {
        lastPower = s.power;
        const trail = new Set(clockTrail(s.power));
        for (let h = 0; h < CLOCK; h++) ticks.setColorAt(h, trail.has(h) ? visited : unvisited);
        if (ticks.instanceColor) ticks.instanceColor.needsUpdate = true;
        chords.forEach((line, k) => (line.visible = k < s.power));
      }
      const targetAngle = -(hour / CLOCK) * Math.PI * 2;
      let delta = targetAngle - handAngle;
      while (delta > 0.001) delta -= Math.PI * 2;
      handAngle = frame.snap ? targetAngle : handAngle + delta * (1 - Math.exp(-frame.dt * (calm ? 14 : 5)));
      hand.rotation.z = handAngle;
      const clockReady = clock.visible && clockPop.value > 0.8;
      for (let h = 0; h < CLOCK; h++) anchors[`tick-${h}`].visible = clockReady;
      anchors.power.visible = clockReady;

      // https: public keys cross on lane 1, keys appear on lane 2, scrambled letters flow on lane 3.
      webPop.update(step === "https", frame);
      if (web.visible) {
        const u = calm ? 0.5 : (time / 3) % 1;
        laneTokens.forEach((token, k) => {
          token.pop.update(true, frame);
          token.group.scale.multiplyScalar(0.55);
          token.group.position.set(k ? 2.6 - u * 5.2 : -2.6 + u * 5.2, 1, 0.1);
        });
        laneKeys.forEach((key) => (key.rotation.y = calm ? 0.3 : time * 0.9));
        const positions = stream.geometry.getAttribute("position") as THREE.BufferAttribute;
        for (let i = 0; i < streamCount; i++) {
          const dir = i % 2 ? 1 : -1;
          const w = ((streamPhase[i] + (calm ? 0 : time * 0.22 * dir)) % 1 + 1) % 1;
          positions.setXYZ(i, -2.6 + w * 5.2, -1 + (streamPhase[i] - 0.5) * 0.35, 0.1);
        }
        positions.needsUpdate = true;
      }
      show(["lane-exchange", "lane-signature", "lane-cipher"], web.visible && webPop.value > 0.8);
    },
  };
};

export default keys;
