/**
 * Chapter 4, public and private keys. Alice and Bob talk over a wire that
 * Eve watches with her magnifying glass; a 23-hour clock shows powers of 5;
 * numbers travel as glowing tokens; a padlocked box (RSA) and a sealed box
 * (signature) cross the wire; finally a browser and a server run the three
 * stages of https on three lanes. Numbers are drawn by the interface at the
 * anchors, so they follow the visitor's choices.
 */
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { rng } from "../../engine/kit";
import type { Kit } from "../../engine/kit";
import { DH, KEYS_START, KEYS_STEPS, clockTrail, powMod } from "../logic/keys";
import type { KeysState, KeysStep } from "../logic/keys";
import type { Store } from "../store";
import { Pop, approach } from "./fx";
import type { Shot, StageBuilder } from "./types";

const PEOPLE: Shot = { target: [0, -0.35, 0], width: 11.2, height: 5.8, pitch: 5 };
const SHOTS: Record<KeysStep, Shot> = {
  problem: PEOPLE,
  clock: { target: [0, 0.1, 0], width: 7.6, height: 7.2, pitch: 3 },
  exchange: PEOPLE,
  shared: PEOPLE,
  padlock: { ...PEOPLE, height: 5.2 },
  signature: { ...PEOPLE, height: 5.2 },
  https: { target: [0, 0.1, 0], width: 11.6, height: 4.8, pitch: 4 },
};

const ALICE_X = -4.3;
const BOB_X = 4.3;
const FEET = -1.55;
const WIRE_Y = -0.15;
const CLOCK_R = 2.25;

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

function keyMesh(kit: Kit, color = "#ffd23f") {
  const group = new THREE.Group();
  const gold = kit.toon(color, { gloss: 0.55, rim: 0.4 });
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
  const rounded = (w: number, h: number, d: number, r: number, s = 4) => kit.geometry(new RoundedBoxGeometry(w, h, d, s, r));

  /* ---------------- Alice, Bob, Eve and the wire ---------------- */
  const cast = new THREE.Group();
  root.add(cast);
  const alice = person(kit, "#ff6fb1");
  alice.position.set(ALICE_X, FEET, 0);
  const bob = person(kit, "#3fd0ff");
  bob.position.set(BOB_X, FEET, 0);
  cast.add(alice, bob);
  const alicePop = new Pop(alice);
  const bobPop = new Pop(bob);
  anchor("alice", root, ALICE_X, FEET - 0.05, 0.6);
  anchor("bob", root, BOB_X, FEET - 0.05, 0.6);
  anchor("secret-alice", root, ALICE_X, FEET + 2.45, 0.3);
  anchor("secret-bob", root, BOB_X, FEET + 2.45, 0.3);
  anchor("key-alice", root, ALICE_X + 1.25, FEET + 1.45, 0.4);
  anchor("key-bob", root, BOB_X - 1.25, FEET + 1.45, 0.4);

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

  const eve = person(kit, "#3ff2b5", 0.78);
  eve.position.set(0, FEET - 0.55, -0.6);
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
  anchor("eve", root, 0, FEET - 0.62, 0.4);
  anchor("eve-notes", root, 1.35, FEET + 0.5, 0.4);

  // Envelopes on the wire (the problem), number tokens (the exchange).
  const envelopes = new THREE.Group();
  root.add(envelopes);
  const envelopePop = new Pop(envelopes);
  const letters = [0, 1, 2].map(() => {
    const letter = new THREE.Group();
    const paper = new THREE.Mesh(rounded(0.78, 0.52, 0.08, 0.04, 2), kit.toon("#fff4d6", { rim: 0.3 }));
    const flap = new THREE.Mesh(kit.geometry(new THREE.CircleGeometry(0.42, 3)), kit.toon("#ffd9a8", { flat: 0.3, side: THREE.DoubleSide }));
    flap.rotation.z = -Math.PI / 2;
    flap.scale.set(0.58, 1, 1);
    flap.position.set(0, 0.07, 0.05);
    letter.add(paper, flap);
    envelopes.add(letter);
    return letter;
  });

  const tokenMaterial = (color: string) => kit.toon(color, { gloss: 0.5, rim: 0.5 });
  const makeToken = (color: string) => {
    const token = new THREE.Group();
    token.add(new THREE.Mesh(kit.geometry(new THREE.SphereGeometry(0.36, 28, 20)), tokenMaterial(color)));
    token.add(kit.glow(color, 1.6, { opacity: 0.55 }));
    root.add(token);
    return { group: token, pop: new Pop(token) };
  };
  const tokenA = makeToken("#ff9ccc");
  const tokenB = makeToken("#8fe3ff");
  anchors["token-a"] = tokenA.group;
  anchors["token-b"] = tokenB.group;

  /* ---------------- The 23-hour clock ---------------- */
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
    const angle = Math.PI / 2 - (hour / DH.p) * Math.PI * 2;
    return new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
  };
  const ticks = new THREE.InstancedMesh(kit.geometry(new THREE.SphereGeometry(0.13, 16, 12)), kit.toon("#ffffff", { rim: 0.3, gloss: 0.4 }), DH.p);
  {
    const m = new THREE.Matrix4();
    for (let h = 0; h < DH.p; h++) {
      ticks.setMatrixAt(h, m.makeTranslation(at(h)));
      ticks.setColorAt(h, new THREE.Color("#7c6bd6"));
      const label = at(h, CLOCK_R + 0.92);
      anchor(`tick-${h}`, clock, label.x, label.y, 0.2);
    }
  }
  clock.add(ticks);
  // The chords 1 → 5 → 5² → 5³…: always the same path round the clock.
  const trailPoints = [1, ...clockTrail(22)];
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

  /* ---------------- The box: padlock (RSA) or seal (signature) ---------------- */
  const box = new THREE.Group();
  root.add(box);
  const boxPop = new Pop(box);
  const crate = new THREE.Mesh(rounded(0.95, 0.72, 0.6, 0.12), kit.toon("#fff4d6", { rim: 0.35, gloss: 0.2 }));
  box.add(crate);
  const lockGroup = new THREE.Group();
  lockGroup.position.set(0, 0.05, 0.36);
  const lockBody = new THREE.Mesh(rounded(0.46, 0.38, 0.2, 0.08), kit.toon("#ff6fb1", { gloss: 0.4, rim: 0.4 }));
  const shackle = new THREE.Mesh(kit.geometry(new THREE.TorusGeometry(0.15, 0.045, 10, 24, Math.PI)), kit.toon("#e8e2ff", { gloss: 0.6 }));
  lockGroup.add(lockBody, shackle);
  const seal = new THREE.Mesh(kit.geometry(new THREE.CylinderGeometry(0.24, 0.24, 0.08, 24)), kit.toon("#ff5e6c", { gloss: 0.4, rim: 0.4 }));
  seal.rotation.x = Math.PI / 2;
  seal.position.set(0, 0, 0.34);
  box.add(lockGroup, seal);
  anchor("cipher", box, 0, 0.78, 0.2);
  const privateKey = keyMesh(kit);
  privateKey.position.set(BOB_X + 1.05, FEET + 1.4, 0.3);
  privateKey.rotation.z = -0.4;
  root.add(privateKey);
  const keyPop = new Pop(privateKey);
  anchor("key-private", root, BOB_X - 0.5, FEET + 2.45, 0.3);
  anchor("key-public", root, ALICE_X + 0.5, FEET + 2.45, 0.3);
  anchor("plain-left", root, ALICE_X + 1.35, FEET + 1.0, 0.5);
  anchor("plain-right", root, BOB_X - 1.35, FEET + 1.0, 0.5);

  /* ---------------- https: browser, server and three lanes ---------------- */
  const web = new THREE.Group();
  root.add(web);
  const webPop = new Pop(web);
  {
    const browser = new THREE.Group();
    browser.position.set(-4.3, 0, 0);
    browser.add(new THREE.Mesh(rounded(2.5, 2.1, 0.3, 0.2), kit.toon("#f4f0ff", { shadow: "#b9a8f0", rim: 0.4 })));
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
  for (const t of laneTokens) {
    t.group.removeFromParent();
    t.group.scale.setScalar(0);
    web.add(t.group);
  }
  const webSeal = new THREE.Mesh(kit.geometry(new THREE.CylinderGeometry(0.26, 0.26, 0.09, 24)), kit.toon("#ff5e6c", { gloss: 0.4, rim: 0.4 }));
  webSeal.rotation.x = Math.PI / 2;
  web.add(webSeal);
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
  const visited = new THREE.Color("#ffd23f");
  const unvisited = new THREE.Color("#7c6bd6");
  let lastPower = -1;

  return {
    root,
    anchors,
    shot: (step) => SHOTS[KEYS_STEPS[step] ?? "problem"],
    update(frame) {
      const step = KEYS_STEPS[frame.step] ?? "problem";
      const s = state();
      const { time } = frame;
      const calm = frame.reducedMotion;
      const people = step !== "clock" && step !== "https";
      const watched = step === "problem" || step === "exchange" || step === "shared";
      alicePop.update(people, frame);
      bobPop.update(people, frame);
      wirePop.update(people, frame);
      evePop.update(watched, frame);
      const bob2 = calm ? 0 : Math.sin(time * 2) * 0.04;
      alice.position.y = FEET + bob2;
      bob.position.y = FEET - bob2;
      for (const name of ["alice", "bob", "secret-alice", "secret-bob"]) anchors[name].visible = people && alicePop.value > 0.8;
      anchors.eve.visible = anchors["eve-notes"].visible = watched && evePop.value > 0.8;
      anchors["key-alice"].visible = anchors["key-bob"].visible = step === "shared" && alicePop.value > 0.8;

      // Eve's glass follows whatever crosses the wire.
      const loop = calm ? 0.45 : (time / 4.5) % 1;
      glass.rotation.z = 0.5 + (calm ? 0 : Math.sin(time * 1.3) * 0.15);

      // Envelopes in the open.
      envelopePop.update(step === "problem", frame);
      letters.forEach((letter, k) => {
        const u = (loop + k / letters.length) % 1;
        letter.position.copy(wirePoint(u)).add(new THREE.Vector3(0, 0.42, 0));
        letter.rotation.z = calm ? 0 : Math.sin(time * 3 + k) * 0.08;
      });

      // Number tokens: sent in the exchange, held once received.
      const exchanging = step === "exchange";
      const holding = step === "shared";
      tokenA.pop.update(exchanging || holding, frame);
      tokenB.pop.update(exchanging || holding, frame);
      const travel = exchanging ? Math.min(1, ((calm ? 0.5 : time / 3.2) % 1.25)) : 1;
      tokenA.group.position.copy(wirePoint(holding ? 1 : travel)).add(new THREE.Vector3(holding ? 0.1 : 0, 0.55, 0));
      tokenB.group.position.copy(wirePoint(holding ? 0 : 1 - travel)).add(new THREE.Vector3(holding ? -0.1 : 0, -0.55, 0));
      anchors["token-a"].visible = tokenA.group.visible && tokenA.pop.value > 0.8;
      anchors["token-b"].visible = tokenB.group.visible && tokenB.pop.value > 0.8;

      // The clock: the hand walks round to 5^power.
      clockPop.update(step === "clock", frame);
      const hour = powMod(DH.g, s.power, DH.p);
      const targetAngle = -(hour / DH.p) * Math.PI * 2;
      if (s.power !== lastPower) {
        lastPower = s.power;
        const trail = new Set([1, ...clockTrail(s.power)]);
        for (let h = 0; h < DH.p; h++) ticks.setColorAt(h, trail.has(h) ? visited : unvisited);
        if (ticks.instanceColor) ticks.instanceColor.needsUpdate = true;
        chords.forEach((line, k) => (line.visible = k < s.power));
      }
      // Always turn clockwise, like a real hand.
      let delta = targetAngle - handAngle;
      while (delta > 0.001) delta -= Math.PI * 2;
      handAngle = frame.snap ? targetAngle : handAngle + delta * (1 - Math.exp(-frame.dt * (calm ? 14 : 5)));
      hand.rotation.z = handAngle;
      for (let h = 0; h < DH.p; h++) anchors[`tick-${h}`].visible = clock.visible && clockPop.value > 0.8;
      anchors.power.visible = clock.visible && clockPop.value > 0.8;

      // The box crosses the wire: padlocked towards Bob, sealed towards Alice.
      const boxed = step === "padlock" || step === "signature";
      boxPop.update(boxed, frame);
      keyPop.update(boxed, frame);
      privateKey.rotation.y = calm ? 0.3 : time * 0.9;
      const phase = calm ? 0.5 : (time / 5) % 1;
      const along = THREE.MathUtils.smoothstep(phase, 0.2, 0.75);
      const towardsBob = step !== "signature";
      box.position.copy(wirePoint(towardsBob ? along : 1 - along)).add(new THREE.Vector3(0, 0.62, 0));
      lockGroup.visible = towardsBob;
      seal.visible = !towardsBob;
      const closed = phase > 0.12 && phase < 0.85 ? 1 : 0;
      shackle.position.y = approach(shackle.position.y, closed ? 0.19 : 0.36, 10, frame);
      for (const name of ["cipher", "key-private", "key-public", "plain-left", "plain-right"])
        anchors[name].visible = boxed && boxPop.value > 0.8;

      // https: tokens cross on lane 1, a seal comes from the server on lane 2,
      // scrambled bits flow both ways on lane 3.
      webPop.update(step === "https", frame);
      if (web.visible) {
        const u = calm ? 0.5 : (time / 3) % 1;
        laneTokens[0].pop.update(true, frame);
        laneTokens[1].pop.update(true, frame);
        laneTokens[0].group.scale.multiplyScalar(0.55);
        laneTokens[1].group.scale.multiplyScalar(0.55);
        laneTokens[0].group.position.set(-2.6 + u * 5.2, 1, 0.1);
        laneTokens[1].group.position.set(2.6 - u * 5.2, 1, 0.1);
        webSeal.position.set(2.6 - ((calm ? 0.5 : (time / 3.6) % 1) * 5.2), 0, 0.12);
        const positions = stream.geometry.getAttribute("position") as THREE.BufferAttribute;
        for (let i = 0; i < streamCount; i++) {
          const dir = i % 2 ? 1 : -1;
          const v = ((streamPhase[i] + (calm ? 0 : time * 0.22 * dir)) % 1 + 1) % 1;
          positions.setXYZ(i, -2.6 + v * 5.2, -1 + (streamPhase[i] - 0.5) * 0.35, 0.1);
        }
        positions.needsUpdate = true;
      }
      for (const name of ["lane-exchange", "lane-signature", "lane-cipher"]) anchors[name].visible = web.visible && webPop.value > 0.8;
    },
  };
};

export default keys;
