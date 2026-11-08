/**
 * Chapter 3, inside a computer: a Powers of Ten dive in seven views, from a
 * laptop to silicon atoms. Each view sits inside the previous one at its
 * focus point; moving between steps scales the views continuously, so a jump
 * of several steps is one long dive. Real sizes are given by the scale bar
 * drawn by the interface (see logic/inside.ts).
 */
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { rng } from "../../engine/kit";
import type { Kit } from "../../engine/kit";
import { INSIDE_STEPS, barUnits } from "../logic/inside";
import type { Shot, StageBuilder } from "./types";

const SHOT: Shot = { target: [0, 0.3, 0.3], width: 10.4, height: 6.6, pitch: 30, yaw: -14 };

interface View {
  group: THREE.Group;
  /** Where the next view lies, in this view's units. */
  focus: THREE.Vector3;
  /** How much the dive magnifies between this view and the next. */
  zoom: number;
}

const rounded = (kit: Kit, w: number, h: number, d: number, r: number, s = 3) => kit.geometry(new RoundedBoxGeometry(w, h, d, s, r));

function slab(kit: Kit, w: number, d: number, h: number, color: string, y = 0) {
  const mesh = new THREE.Mesh(rounded(kit, w, h, d, Math.min(0.25, h / 2)), kit.toon(color, { rim: 0.4, gloss: 0.15 }));
  mesh.position.y = y - h / 2;
  return mesh;
}

/** Instanced boxes (one draw call) from a list of [x, z, w, d, h, colour]. */
function boxes(kit: Kit, list: [number, number, number, number, number, string][], y = 0, radius = 0.06) {
  const mesh = new THREE.InstancedMesh(rounded(kit, 1, 1, 1, radius, 1), kit.toon("#ffffff", { rim: 0.35, gloss: 0.2 }), list.length);
  const m = new THREE.Matrix4();
  const c = new THREE.Color();
  list.forEach(([x, z, w, d, h, color], k) => {
    m.compose(new THREE.Vector3(x, y + h / 2, z), new THREE.Quaternion(), new THREE.Vector3(w, h, d));
    mesh.setMatrixAt(k, m);
    mesh.setColorAt(k, c.set(color));
  });
  return mesh;
}

const inside: StageBuilder = ({ kit }) => {
  const random = rng(303);
  const root = new THREE.Group();
  const anchors: Record<string, THREE.Object3D> = {};
  const anchor = (name: string, parent: THREE.Object3D, x: number, y: number, z: number) => {
    const object = new THREE.Object3D();
    object.position.set(x, y, z);
    anchors[name] = object;
    parent.add(object);
    return object;
  };
  const views: View[] = [];
  const view = (focus: [number, number, number], zoom: number) => {
    const group = new THREE.Group();
    root.add(group);
    views.push({ group, focus: new THREE.Vector3(...focus), zoom });
    return group;
  };

  /* 1. Laptop */
  {
    const g = view([0, 0.05, 0.2], 3);
    g.add(slab(kit, 8, 5.4, 0.36, "#d9d3f2", 0));
    const keys: [number, number, number, number, number, string][] = [];
    for (let r = 0; r < 5; r++) for (let c = 0; c < 13; c++) keys.push([-3.3 + c * 0.55, -2.15 + r * 0.55, 0.44, 0.44, 0.1, "#3b2c86"]);
    keys.push([0, 0.6, 3.2, 0.44, 0.1, "#3b2c86"]);
    g.add(boxes(kit, keys, 0));
    const pad = new THREE.Mesh(rounded(kit, 2.6, 0.04, 1.5, 0.02), kit.toon("#c4bde6", { gloss: 0.3 }));
    pad.position.set(0, 0.02, 1.75);
    g.add(pad);
    const lid = new THREE.Group();
    lid.position.set(0, 0, -2.7);
    lid.rotation.x = -1.78;
    const shell = new THREE.Mesh(rounded(kit, 8, 0.28, 5.2, 0.14), kit.toon("#d9d3f2", { rim: 0.4 }));
    shell.position.z = 2.6;
    const screen = new THREE.Mesh(rounded(kit, 7.4, 0.06, 4.6, 0.03, 1), kit.toon("#1d2a6b", { flat: 0.5 }));
    screen.position.set(0, -0.15, 2.6);
    lid.add(shell, screen);
    const ui: [number, number, number, number, number, string][] = [
      [-2.2, 1.4, 2.4, 1.2, 0.04, "#ff6fb1"],
      [1.1, 1.4, 3.4, 1.2, 0.04, "#3fd0ff"],
      [-1.6, 3.2, 3.6, 1.6, 0.04, "#ffd23f"],
      [2.0, 3.2, 2.4, 1.6, 0.04, "#3ff2b5"],
    ];
    const uiMesh = boxes(kit, ui, -0.22, 0.02);
    uiMesh.rotation.x = Math.PI;
    uiMesh.position.z = 4.6;
    uiMesh.scale.z = -1;
    lid.add(uiMesh);
    g.add(lid);
  }

  /* 2. Motherboard */
  {
    const g = view([0, 0.42, -0.3], 7);
    g.add(slab(kit, 8.4, 5.6, 0.22, "#18a88b"));
    const parts: [number, number, number, number, number, string][] = [
      [0, -0.3, 1.9, 1.9, 0.22, "#241c4f"],
      [-2.9, -1.4, 1.1, 0.8, 0.2, "#2a2152"],
      [-2.9, -0.4, 1.1, 0.8, 0.2, "#2a2152"],
      [2.9, -1.4, 1.1, 0.8, 0.2, "#2a2152"],
      [2.9, -0.4, 1.1, 0.8, 0.2, "#2a2152"],
      [0, 1.9, 3.6, 0.9, 0.14, "#2a2152"],
      [-2.9, 1.7, 0.5, 0.5, 0.35, "#3f7bff"],
      [2.9, 1.8, 0.7, 0.4, 0.12, "#ffb13b"],
    ];
    g.add(boxes(kit, parts, 0));
    const lidPlate = new THREE.Mesh(rounded(kit, 1.4, 0.08, 1.4, 0.05), kit.toon("#e8e2ff", { gloss: 0.6, rim: 0.4 }));
    lidPlate.position.set(0, 0.3, -0.3);
    g.add(lidPlate);
    const tracks = [
      [[-0.95, -0.6], [-2.35, -0.6], [-2.35, -1.4]],
      [[-0.95, -0.1], [-2.35, -0.1], [-2.35, -0.4]],
      [[0.95, -0.6], [2.35, -0.6], [2.35, -1.4]],
      [[0.95, -0.1], [2.35, -0.1], [2.35, -0.4]],
      [[0, 0.65], [0, 1.45]],
      [[-0.4, 0.65], [-0.4, 1.0], [-2.9, 1.0], [-2.9, 1.45]],
    ];
    for (const track of tracks) g.add(kit.line(track.map(([x, z]) => new THREE.Vector3(x, 0.01, z)), { color: "#f2c14e", width: 2.4 }));
    anchor("processor", g, 0, 0.6, -0.3);
    anchor("memory", g, -2.9, 0.5, -0.9);
  }

  /* 3. Die */
  {
    const g = view([-2.4, 0.18, -1.3], 6);
    g.add(slab(kit, 8, 8, 0.3, "#2a2152"));
    const tiles: [number, number, number, number, number, string][] = [];
    for (const [x, z] of [[-3.25, -2.1], [-1.55, -2.1], [-3.25, -0.4], [-1.55, -0.4]]) tiles.push([x, z, 1.5, 1.5, 0.16, "#ff8a3d"]);
    for (let r = 0; r < 6; r++) for (let c = 0; c < 6; c++) tiles.push([0.6 + c * 0.56, -2.8 + r * 0.56, 0.48, 0.48, 0.12, "#1fc8b8"]);
    for (let r = 0; r < 4; r++) for (let c = 0; c < 10; c++) tiles.push([-3.6 + c * 0.38, 1.1 + r * 0.38, 0.32, 0.32, 0.1, "#8c5cff"]);
    tiles.push([2.3, 1.6, 3.0, 1.4, 0.12, "#ffd23f"]);
    tiles.push([2.3, 3.2, 3.0, 0.9, 0.12, "#ff6fb1"]);
    g.add(boxes(kit, tiles, 0, 0.04));
    anchor("cores", g, -2.4, 0.5, -1.25);
    anchor("gpu", g, 2.0, 0.5, -1.4);
    anchor("cache", g, -1.9, 0.5, 1.6);
  }

  /* 4. Core */
  {
    const g = view([1.2, 0.2, 0.9], 9);
    g.add(slab(kit, 8, 8, 0.28, "#3b1d6e"));
    const blocks: [number, number, number, number, number, string][] = [
      [1.2, 0.9, 3.4, 2.6, 0.18, "#ffd23f"],
      [-2.2, -2.3, 3.2, 1.6, 0.18, "#3fd0ff"],
    ];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 8; c++) blocks.push([-3.2 + c * 0.42, 0.2 + r * 0.5, 0.34, 0.4, 0.12, "#ff6fb1"]);
    for (let r = 0; r < 4; r++) for (let c = 0; c < 9; c++) blocks.push([0.4 + c * 0.38, -3.3 + r * 0.38, 0.3, 0.3, 0.1, "#8c5cff"]);
    for (let k = 0; k < 6; k++) blocks.push([0.0 + (k % 3) * 1.1, 0.25 + Math.floor(k / 3) * 1.3, 0.9, 0.12, 0.05, "#f2a900"]);
    g.add(boxes(kit, blocks, 0, 0.04));
    anchor("alu", g, 1.2, 0.5, 2.4);
    anchor("registers", g, -2.0, 0.4, 0.0);
    anchor("control", g, -2.2, 0.5, -2.3);
  }

  /* 5. Standard cells */
  {
    const g = view([0.35, 0.25, 0.4], 9);
    g.add(slab(kit, 8, 8, 0.24, "#20154d"));
    const cells: [number, number, number, number, number, string][] = [];
    const palette = ["#ff8a3d", "#3fd0ff", "#ff6fb1", "#3ff2b5", "#b58cff"];
    for (let r = 0; r < 7; r++) {
      let x = -3.8;
      while (x < 3.6) {
        const w = 0.5 + Math.floor(random() * 4) * 0.25;
        const hit = r === 3 && x < 0.35 && x + w > 0.35;
        cells.push([x + w / 2, -3.3 + r * 1.1, w - 0.08, 0.86, hit ? 0.3 : 0.2, hit ? "#ffd23f" : palette[Math.floor(random() * palette.length)]]);
        x += w;
      }
    }
    g.add(boxes(kit, cells, 0, 0.05));
    for (let r = 0; r <= 7; r++) g.add(kit.line([new THREE.Vector3(-3.9, 0.02, -3.85 + r * 1.1), new THREE.Vector3(3.9, 0.02, -3.85 + r * 1.1)], { color: "#e8e2ff", width: 2, opacity: 0.7 }));
    for (let k = 0; k < 7; k++) {
      const x = -3.4 + random() * 6.8;
      const z0 = -3.6 + random() * 3;
      g.add(kit.line([new THREE.Vector3(x, 0.55, z0), new THREE.Vector3(x, 0.55, z0 + 2 + random() * 3)], { color: "#ffd23f", width: 3, opacity: 0.85 }));
    }
    anchor("cell", g, 0.35, 0.6, 0.0);
  }

  /* 6. FinFET transistors */
  {
    const g = view([1.1, 0.75, 0], 12);
    g.add(slab(kit, 8, 7, 0.4, "#3b2a8f"));
    const fins: [number, number, number, number, number, string][] = [];
    for (const z of [-1.6, 0, 1.6]) fins.push([0, z, 7.6, 0.34, 0.95, "#c9b3ff"]);
    for (const x of [-2.3, 0, 2.3]) fins.push([x, 0, 0.9, 5.6, 1.7, "#3fd0ff"]);
    for (const z of [-1.6, 0, 1.6]) for (const x of [-3.45, -1.15, 1.15, 3.45]) fins.push([x, z, 0.9, 0.7, 1.15, "#ff6fb1"]);
    g.add(boxes(kit, fins, 0, 0.08));
    anchor("gate", g, 0, 1.9, -2.4);
    anchor("fin", g, 1.1, 1.3, 2.3);
  }

  /* 7. Silicon crystal */
  const crystal = view([0, 0, 0], 1);
  {
    const a = 2.1;
    const basis = [[0, 0, 0], [0, 0.5, 0.5], [0.5, 0, 0.5], [0.5, 0.5, 0], [0.25, 0.25, 0.25], [0.25, 0.75, 0.75], [0.75, 0.25, 0.75], [0.75, 0.75, 0.25]];
    const atoms: THREE.Vector3[] = [];
    const seen = new Set<string>();
    for (let i = -2; i < 2; i++)
      for (let j = -1; j < 1; j++)
        for (let k = -2; k < 2; k++)
          for (const [bx, by, bz] of basis) {
            const p = new THREE.Vector3((i + bx) * a, (j + by) * a, (k + bz) * a);
            const key = p.toArray().map((n) => n.toFixed(2)).join();
            if (seen.has(key) || Math.abs(p.x) > 4.3 || Math.abs(p.z) > 4.3) continue;
            seen.add(key);
            atoms.push(p);
          }
    const ball = new THREE.InstancedMesh(kit.geometry(new THREE.SphereGeometry(0.34, 20, 14)), kit.toon("#9fd8ff", { rim: 0.5, gloss: 0.5, rimColor: "#ffffff" }), atoms.length);
    const m = new THREE.Matrix4();
    atoms.forEach((p, n) => ball.setMatrixAt(n, m.makeTranslation(p.x, p.y, p.z)));
    const bondLength = (a * Math.sqrt(3)) / 4;
    const pairs: [THREE.Vector3, THREE.Vector3][] = [];
    for (let i = 0; i < atoms.length; i++)
      for (let j = i + 1; j < atoms.length; j++) if (Math.abs(atoms[i].distanceTo(atoms[j]) - bondLength) < 0.05) pairs.push([atoms[i], atoms[j]]);
    const bonds = new THREE.InstancedMesh(kit.geometry(new THREE.CylinderGeometry(0.08, 0.08, bondLength, 8)), kit.toon("#e8e2ff", { rim: 0.3 }), pairs.length);
    const q = new THREE.Quaternion();
    pairs.forEach(([p, r], n) => {
      q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), r.clone().sub(p).normalize());
      m.compose(p.clone().lerp(r, 0.5), q, new THREE.Vector3(1, 1, 1));
      bonds.setMatrixAt(n, m);
    });
    const lattice = new THREE.Group();
    lattice.add(ball, bonds);
    lattice.position.y = 0.6;
    crystal.add(lattice);
    crystal.userData.lattice = lattice;
    const front = atoms.reduce((best, p) => (p.z > best.z && Math.abs(p.x) < 1.2 && p.y > 0 ? p : best), atoms[0]);
    anchor("atom", lattice, front.x, front.y + 0.45, front.z);
  }

  // The scale bar sits in front of every view, the same place each time.
  const bar = anchor("scale", root, -4.6, -0.2, 3.9);

  let z = 0;
  return {
    root,
    anchors,
    shot: () => SHOT,
    update(frame) {
      const step = Math.min(INSIDE_STEPS.length - 1, frame.step);
      z = frame.snap ? step : z + (step - z) * (1 - Math.exp(-frame.dt * (frame.reducedMotion ? 9 : 2.2)));
      if (Math.abs(step - z) < 1e-3) z = step;
      const ease = (t: number) => t * t * (3 - 2 * t);
      views.forEach((v, i) => {
        const t = z - i;
        let scale = 0;
        const position = new THREE.Vector3();
        if (t >= 0 && t <= 1) {
          scale = Math.pow(v.zoom, t);
          position.copy(v.focus).multiplyScalar(-scale * ease(t));
        } else if (t < 0 && t > -1) {
          const parent = views[i - 1];
          const u = t + 1;
          const parentScale = Math.pow(parent.zoom, u);
          scale = Math.pow(parent.zoom, u - 1);
          position.copy(parent.focus).multiplyScalar(parentScale * (1 - ease(u)));
        }
        // A view leaves once the next one has fully taken its place.
        const visible = t < 0.97 && scale > 0.16 && scale < 3.4;
        v.group.visible = visible;
        v.group.scale.setScalar(Math.max(scale, 1e-4));
        v.group.position.copy(position);
      });
      const lattice = crystal.userData.lattice as THREE.Group;
      lattice.rotation.y = frame.reducedMotion ? 0.35 : 0.35 + Math.sin(frame.time * 0.2) * 0.25;
      // Labels belong to the view at rest.
      const resting = Math.abs(z - step) < 0.05;
      for (const [name, object] of Object.entries(anchors)) {
        if (name === "scale") continue;
        let owner: THREE.Object3D | null = object;
        while (owner && !views.some((v) => v.group === owner)) owner = owner.parent;
        object.visible = resting && owner === views[step].group;
      }
      bar.visible = resting;
      bar.userData.units = barUnits(INSIDE_STEPS[step]);
    },
  };
};

export default inside;
