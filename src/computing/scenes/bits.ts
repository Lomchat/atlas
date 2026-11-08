/**
 * Chapter 1, the bit. One scene whose objects morph from step to step:
 * a switch and its lamp; the same bit as a voltage, a magnet and a flash of
 * light; every combination of 1, 2 and 3 bits; an 8-bit counter; a letter as
 * bytes and as screen pixels; a colour as three bytes.
 *
 * The lamps are one pool (see `LampField`): the 8 bits of the counter glide
 * into the first byte of the letter, then into the red byte of the colour.
 * Numbers and words are drawn by the interface at the exported anchors.
 */
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { BITS_START, BITS_STEPS, bitsOf, utf8 } from "../logic/bits";
import type { BitsState, BitsStep } from "../logic/bits";
import type { Store } from "../store";
import { LampField, Pop, approach, glyphPixels, row } from "./fx";
import type { LampTarget } from "./fx";
import type { Shot, StageBuilder } from "./types";

const SHOTS: Record<BitsStep, Shot> = {
  switch: { target: [-0.3, 0, 0], width: 8.6, height: 6.4, pitch: 5, yaw: -10 },
  where: { target: [0, 0.5, 0], width: 13.6, height: 7.6, pitch: 6 },
  double: { target: [-0.65, 0.4, 0], width: 10.8, height: 8.4, pitch: 4, yaw: 6 },
  count: { target: [0, -0.15, 0], width: 10.8, height: 4.8, pitch: 3 },
  letter: { target: [0.05, 0.1, 0], width: 14.2, height: 7.4, pitch: 4, yaw: -6 },
  color: { target: [0.3, 0, 0], width: 13.2, height: 5.6, pitch: 4, yaw: 6 },
};

/** The bit sent through the chip, the disk and the fibre, one every 0.8 s. */
const PATTERN = [1, 1, 0, 1, 0, 0, 1, 0];
const SLOT = 0.8;
const patternBit = (n: number) => PATTERN[((n % 8) + 8) % 8];

/** Lamp colours of the three light channels. */
export const CHANNELS = ["#ff4d5e", "#45e07a", "#4d86ff"] as const;

const GLYPH = { cols: 13, rows: 18, cell: 0.3, x: 3.9, y: 0 };
const COLUMNS = [-4.4, -1.3, 2.9];

const bits: StageBuilder = ({ kit, store }) => {
  const shared = store as Store<BitsState> | null;
  const state = () => shared?.get() ?? BITS_START;
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
  const uniformColor = (material: THREE.Material) => (material as THREE.ShaderMaterial).uniforms.uColor.value as THREE.Color;
  const yellow = new THREE.Color("#ffd23f");
  const lilac = new THREE.Color("#7c6bd6");

  /* ---------------- Lamps (all steps) ---------------- */
  const lamps = new LampField(kit, 34);
  root.add(lamps.group);
  lamps.anchors.forEach((object, k) => (anchors[`lamp-${k}`] = object));

  /* ---------------- Step "switch": a slider and a wire ---------------- */
  const switchGroup = new THREE.Group();
  switchGroup.position.set(-2.4, 0.2, 0);
  const plate = new THREE.Mesh(rounded(1.9, 3.2, 0.45, 0.22), kit.toon("#2b1f6b", { rim: 0.5, rimColor: "#8f7bff" }));
  const track = new THREE.Mesh(rounded(0.62, 2.3, 0.2, 0.1), kit.toon("#150d3a", { rim: 0.2 }));
  track.position.z = 0.18;
  const knobMaterial = kit.toon("#ffd23f", { rim: 0.45, gloss: 0.4 });
  const knob = new THREE.Mesh(rounded(1.05, 0.95, 0.5, 0.2), knobMaterial);
  knob.position.z = 0.32;
  // The power symbol's two halves: a bar for 1, a ring for 0.
  const markOn = kit.flat("#ffd23f");
  const markOff = kit.flat("#6a5bb5");
  const bar = new THREE.Mesh(rounded(0.13, 0.56, 0.08, 0.04), markOn);
  bar.position.set(0.74, 0.6, 0.24);
  const ring = new THREE.Mesh(kit.geometry(new THREE.TorusGeometry(0.2, 0.055, 12, 36)), markOff);
  ring.position.set(0.74, -0.6, 0.24);
  switchGroup.add(plate, track, knob, bar, ring);
  const switchPop = new Pop(switchGroup);
  root.add(switchGroup);
  anchor("switch", -2.4, 0.2, 0.35);
  anchor("readout", 1.8, 1.95, 0.2);

  const wireGroup = new THREE.Group();
  const wireCurve = new THREE.CatmullRomCurve3(
    [
      [-2.4, -1.3, -0.1],
      [-2.0, -2.05, -0.15],
      [0.9, -2.0, -0.15],
      [1.8, -0.95, -0.1],
    ].map(([x, y, z]) => new THREE.Vector3(x, y, z)),
  );
  wireGroup.add(new THREE.Mesh(kit.tube(wireCurve.getPoints(12), 0.08), kit.toon("#5a4ab8", { rim: 0.4 })));
  const sparkCount = 12;
  const sparks = kit.points(new Float32Array(sparkCount * 3), { color: "#ffe680", size: 0.32, soft: 1, additive: true });
  const sparkMaterial = sparks.material as THREE.ShaderMaterial;
  wireGroup.add(sparks);
  const wirePop = new Pop(wireGroup);
  root.add(wireGroup);
  let current = 1;

  /* ---------------- Step "where": chip, disk, fibre ---------------- */
  const where = new THREE.Group();
  root.add(where);
  const wherePop = new Pop(where);
  const vignette = (x: number) => {
    const group = new THREE.Group();
    group.position.set(x, -0.6, 0);
    where.add(group);
    return group;
  };

  // A chip: the bit is the voltage on its central contact.
  const chip = vignette(-4.3);
  chip.add(new THREE.Mesh(rounded(2.1, 2.1, 0.4, 0.12), kit.toon("#272052", { rim: 0.5, rimColor: "#8f7bff" })));
  const pins = new THREE.InstancedMesh(kit.geometry(new THREE.BoxGeometry(0.16, 0.4, 0.07)), kit.toon("#f2c14e", { gloss: 0.5 }), 20);
  {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    let k = 0;
    for (let side = 0; side < 4; side++)
      for (let i = 0; i < 5; i++) {
        const along = (i - 2) * 0.38;
        const angle = (side * Math.PI) / 2;
        const out = 1.2;
        q.setFromAxisAngle(new THREE.Vector3(0, 0, 1), angle);
        const p = new THREE.Vector3(along, out, 0).applyQuaternion(q);
        m.compose(p, q, new THREE.Vector3(1, 1, 1));
        pins.setMatrixAt(k++, m);
      }
  }
  chip.add(pins);
  const die = new THREE.Mesh(rounded(1.1, 1.1, 0.12, 0.05), kit.toon("#4a3d9e", { rim: 0.3 }));
  die.position.z = 0.22;
  const coreMaterial = kit.toon("#ffd23f", { gloss: 0.5, rim: 0.4 });
  const core = new THREE.Mesh(kit.geometry(new THREE.SphereGeometry(0.3, 24, 16)), coreMaterial);
  core.scale.z = 0.5;
  core.position.z = 0.32;
  const coreGlow = kit.glow("#ffd23f", 2.4, { opacity: 0.8 });
  coreGlow.position.z = 0.5;
  chip.add(die, core, coreGlow);
  anchor("chip", -4.3, -2.05, 0.4);

  // A hard disk: the bit is a magnet pointing up (1) or down (0).
  const disk = vignette(0);
  const platter = new THREE.Group();
  platter.rotation.x = 1.05;
  platter.add(
    new THREE.Mesh(kit.geometry(new THREE.CylinderGeometry(1.6, 1.6, 0.14, 64)), kit.toon("#c9b3ff", { gloss: 0.6, rim: 0.5 })),
    new THREE.Mesh(kit.geometry(new THREE.CylinderGeometry(0.32, 0.32, 0.22, 32)), kit.toon("#8c5cff", { gloss: 0.4 })),
  );
  for (const radius of [0.75, 1.05, 1.35]) {
    const track = kit.circle(radius, { color: "#8f7bff", width: 1.5, opacity: 0.8 });
    track.position.y = 0.075;
    platter.add(track);
  }
  const spot = kit.glow("#ffffff", 0.9, { opacity: 0.7 });
  spot.position.set(0, 0.12, 1.05);
  platter.add(spot);
  disk.add(platter);
  const magnet = new THREE.Group();
  magnet.position.set(0, 1.15, 0.9);
  {
    const half = kit.geometry(new THREE.CylinderGeometry(0.22, 0.22, 0.42, 24));
    const cap = kit.geometry(new THREE.SphereGeometry(0.22, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2));
    const north = kit.toon("#ff5e6c", { rim: 0.4, gloss: 0.3 });
    const south = kit.toon("#3f7bff", { rim: 0.4, gloss: 0.3 });
    const top = new THREE.Mesh(half, north);
    top.position.y = 0.21;
    const topCap = new THREE.Mesh(cap, north);
    topCap.position.y = 0.42;
    const bottom = new THREE.Mesh(half, south);
    bottom.position.y = -0.21;
    const bottomCap = new THREE.Mesh(cap, south);
    bottomCap.position.y = -0.42;
    bottomCap.rotation.x = Math.PI;
    const arrow = new THREE.Mesh(kit.geometry(new THREE.ConeGeometry(0.2, 0.36, 24)), kit.flat("#fff4d6"));
    arrow.position.y = 0.84;
    magnet.add(top, topCap, bottom, bottomCap, arrow);
  }
  disk.add(magnet);
  anchor("disk", 0, -2.05, 0.4);

  // An optical fibre: the bit is a flash of light (1) or darkness (0).
  const fibre = vignette(4.3);
  const fibreCurve = new THREE.CatmullRomCurve3(
    [
      [-1.5, -0.8, 0],
      [-0.6, 0.45, 0.1],
      [0.6, -0.45, 0.1],
      [1.5, 0.8, 0],
    ].map(([x, y, z]) => new THREE.Vector3(x, y, z)),
  );
  const fibrePoints = fibreCurve.getPoints(24);
  const glass = new THREE.Mesh(kit.tube(fibrePoints, 0.3), kit.toon("#3fd0ff", { opacity: 0.32, rim: 0.8, rimColor: "#e9fdff", depthWrite: false }));
  const sheen = new THREE.Mesh(kit.tube(fibrePoints, 0.32), kit.halo("#8fe8ff", { power: 2.2, opacity: 0.7 }));
  const fibreCore = new THREE.Mesh(kit.tube(fibrePoints, 0.07), kit.toon("#bff4ff", { flat: 0.4 }));
  fibre.add(fibreCore, glass, sheen);
  for (const end of [0, 1]) {
    const p = fibreCurve.getPointAt(end);
    const plug = new THREE.Mesh(kit.geometry(new THREE.CylinderGeometry(0.4, 0.4, 0.5, 24)), kit.toon("#2b1f6b", { rim: 0.5 }));
    plug.position.copy(p);
    plug.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), fibreCurve.getTangentAt(end));
    fibre.add(plug);
  }
  const flashes = kit.points(new Float32Array(8 * 3), { sizes: new Float32Array(8), color: "#f2fdff", size: 1, soft: 1, additive: true });
  fibre.add(flashes);
  anchor("fibre", 4.3, -2.05, 0.4);

  /* ---------------- Step "letter": the character's pixels ---------------- */
  const glyphGroup = new THREE.Group();
  glyphGroup.position.set(GLYPH.x, GLYPH.y, 0);
  const cellCount = GLYPH.cols * GLYPH.rows;
  // Low-poly rounded cubes: there are 234 of them.
  const cells = new THREE.InstancedMesh(
    kit.geometry(new RoundedBoxGeometry(0.88, 0.88, 0.5, 1, 0.22)),
    kit.toon("#ffffff", { rim: 0.35, gloss: 0.3 }),
    cellCount,
  );
  cells.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  cells.frustumCulled = false;
  const cellScale = new Float32Array(cellCount).fill(0.4);
  const cellOn = new Float32Array(cellCount);
  for (let i = 0; i < cellCount; i++) cells.setColorAt(i, lilac);
  glyphGroup.add(cells);
  const screenBack = new THREE.Mesh(
    rounded(GLYPH.cols * GLYPH.cell + 0.5, GLYPH.rows * GLYPH.cell + 0.5, 0.3, 0.25),
    kit.toon("#1b1248", { rim: 0.5, rimColor: "#8f7bff" }),
  );
  screenBack.position.z = -0.3;
  glyphGroup.add(screenBack);
  const glyphPop = new Pop(glyphGroup);
  root.add(glyphGroup);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const v = new THREE.Vector3();
  const sc = new THREE.Vector3();
  const c = new THREE.Color();
  let glyphChar = "";
  let glyph: boolean[] = [];
  let glyphClock = 0;
  let fontsReady = false;
  document.fonts
    .load('800 52px "Nunito Variable"')
    .catch(() => undefined)
    .finally(() => {
      fontsReady = true;
      glyphChar = "";
    });

  /* ---------------- Step "color": the pixel ---------------- */
  const pixelGroup = new THREE.Group();
  pixelGroup.position.set(3.7, 0, 0);
  const pixelMaterial = kit.toon("#ff8a3d", { rim: 0.35, gloss: 0.35, soft: 0.35 });
  const pixel = new THREE.Mesh(rounded(3, 3, 0.5, 0.4), pixelMaterial);
  const frame = new THREE.Mesh(rounded(3.4, 3.4, 0.3, 0.45), kit.toon("#1b1248", { rim: 0.5, rimColor: "#8f7bff" }));
  frame.position.z = -0.25;
  const halo = kit.glow("#ff8a3d", 7.5, { opacity: 0.5 });
  halo.position.z = -0.6;
  pixelGroup.add(halo, frame, pixel);
  const pixelPop = new Pop(pixelGroup);
  root.add(pixelGroup);
  const mixed = new THREE.Color("#ff8a3d");
  const target = new THREE.Color();
  ["red", "green", "blue"].forEach((name, k) => anchor(name, 0.05, 0.95 - k * 0.95, 0.3));

  /* ---------------- Other anchors ---------------- */
  COLUMNS.forEach((x, k) => anchor(`column-${k + 1}`, x, 3.65, 0.2));
  anchor("sum", 0, -1.3, 0.3);
  const code = anchor("code", -3.8, 1.4, 0.3);

  /* ---------------- Layouts ---------------- */
  function layout(step: BitsStep, s: BitsState, time: number): LampTarget[] {
    switch (step) {
      case "switch":
        return [{ x: 1.8, y: 0.3, size: 2.4, on: s.single ? 1 : 0 }];
      case "where":
        return [{ x: 0, y: 3.3, size: 1.5, on: patternBit(Math.floor(time / SLOT)) }];
      case "double": {
        const list: LampTarget[] = [];
        COLUMNS.forEach((x, c) => {
          const n = c + 1;
          const combos = 1 << n;
          for (let r = 0; r < combos; r++) {
            const bitsOfRow = Array.from({ length: n }, (_, j) => (r >> (n - 1 - j)) & 1);
            list.push(...row(n, x, ((combos - 1) / 2 - r) * 0.8, 0.8, 0.66, bitsOfRow, { delay: 0.2 + c * 0.45 + r * 0.06 }));
          }
        });
        return list;
      }
      case "count":
        return row(8, 0, 0, 1.2, 1, bitsOf(s.value));
      case "letter": {
        const bytes = utf8(s.char);
        return bytes.flatMap((byte, k) => row(8, -3.8, ((bytes.length - 1) / 2 - k) * 0.85, 0.68, 0.6, bitsOf(byte)));
      }
      case "color":
        return s.rgb.flatMap((byte, k) => row(8, -3.4, 0.95 - k * 0.95, 0.68, 0.6, bitsOf(byte), { color: CHANNELS[k] }));
    }
  }

  return {
    root,
    anchors,
    shot: (step) => SHOTS[BITS_STEPS[step] ?? "switch"],
    ready: () => fontsReady,
    update(frame) {
      const step = BITS_STEPS[frame.step] ?? "switch";
      const s = state();
      const { time, dt } = frame;
      lamps.layout(layout(step, s, time));
      lamps.update(frame);

      // Switch: the knob slides, the marks light up, current flows when on.
      switchPop.update(step === "switch", frame);
      wirePop.update(step === "switch", frame);
      current = approach(current, s.single ? 1 : 0, 10, frame);
      knob.position.y = approach(knob.position.y, s.single ? 0.6 : -0.6, 12, frame);
      uniformColor(knobMaterial).copy(lilac).lerp(yellow, current);
      uniformColor(markOn).copy(lilac).lerp(yellow, current);
      uniformColor(markOff).copy(yellow).lerp(lilac, current);
      anchors.switch.visible = switchGroup.visible && switchPop.value > 0.8;
      anchors.readout.visible = anchors.switch.visible;
      const positions = sparks.geometry.getAttribute("position") as THREE.BufferAttribute;
      for (let i = 0; i < sparkCount; i++) {
        const u = (i / sparkCount + (frame.reducedMotion ? 0 : time * 0.32)) % 1;
        const p = wireCurve.getPointAt(u);
        positions.setXYZ(i, p.x, p.y, p.z + 0.05);
      }
      positions.needsUpdate = true;
      sparkMaterial.uniforms.uOpacity.value = current;

      // Where: the same bit in three forms.
      wherePop.update(step === "where", frame);
      const slotNow = Math.floor(time / SLOT);
      const bit = patternBit(slotNow);
      uniformColor(coreMaterial).copy(lilac).lerp(yellow, bit);
      coreGlow.material.opacity = 0.85 * bit;
      platter.rotation.y = frame.reducedMotion ? 0 : time * 0.6;
      magnet.rotation.z = approach(magnet.rotation.z, bit ? 0 : Math.PI, 9, frame);
      const flashPositions = flashes.geometry.getAttribute("position") as THREE.BufferAttribute;
      const flashSizes = flashes.geometry.getAttribute("aSize") as THREE.BufferAttribute;
      for (let j = 0; j < 8; j++) {
        const n = slotNow - j;
        const u = (time / SLOT - n) / 8;
        const p = fibreCurve.getPointAt(Math.min(1, Math.max(0, u)));
        flashPositions.setXYZ(j, p.x, p.y, p.z);
        flashSizes.setX(j, patternBit(n) ? 1.1 : 0);
      }
      flashPositions.needsUpdate = flashSizes.needsUpdate = true;
      for (const name of ["chip", "disk", "fibre"]) anchors[name].visible = where.visible && wherePop.value > 0.8;

      // Letter: the character's pixels, redrawn line by line like a screen.
      glyphPop.update(step === "letter", frame);
      if (s.char !== glyphChar && fontsReady) {
        glyphChar = s.char;
        glyph = glyphPixels(s.char, GLYPH.cols, GLYPH.rows);
        glyphClock = 0;
      }
      glyphClock += dt;
      for (let i = 0; i < cellCount; i++) {
        const col = i % GLYPH.cols;
        const r = Math.floor(i / GLYPH.cols);
        const due = frame.snap || glyphClock > i * 0.0035;
        const on = due && glyph[i] ? 1 : due ? 0 : cellOn[i];
        cellOn[i] = approach(cellOn[i], on, 14, frame);
        cellScale[i] = 0.4 + 0.6 * cellOn[i];
        v.set((col - (GLYPH.cols - 1) / 2) * GLYPH.cell, ((GLYPH.rows - 1) / 2 - r) * GLYPH.cell, 0.1 * cellOn[i]);
        sc.setScalar(cellScale[i] * GLYPH.cell);
        m.compose(v, q, sc);
        cells.setMatrixAt(i, m);
        cells.setColorAt(i, c.set("#33277a").lerp(yellow, cellOn[i]));
      }
      cells.instanceMatrix.needsUpdate = true;
      if (cells.instanceColor) cells.instanceColor.needsUpdate = true;
      const rows = utf8(s.char).length;
      code.position.y = ((rows - 1) / 2) * 0.85 + 0.95;
      code.visible = glyphGroup.visible && glyphPop.value > 0.8;

      // Colour: three bytes mixed into one pixel.
      pixelPop.update(step === "color", frame);
      target.setRGB(s.rgb[0] / 255, s.rgb[1] / 255, s.rgb[2] / 255);
      if (frame.snap) mixed.copy(target);
      else mixed.lerp(target, 1 - Math.exp(-dt * 8));
      uniformColor(pixelMaterial).copy(mixed);
      halo.material.color.copy(mixed);
      for (const name of ["red", "green", "blue"]) anchors[name].visible = pixelGroup.visible && pixelPop.value > 0.8;

      for (let k = 1; k <= 3; k++) anchors[`column-${k}`].visible = step === "double" && frame.since > 0.3 + (k - 1) * 0.45;
      anchors.sum.visible = step === "count";
    },
  };
};

export default bits;
