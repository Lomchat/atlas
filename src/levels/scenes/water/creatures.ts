/**
 * Microscopic pond life for the micro-zoo (1 unit = 50 µm): a tardigrade,
 * paramecia, a Volvox colony, diatoms and a Closterium desmid.
 * Each builder returns a group and an `update(time)` animating it in place.
 */
import * as THREE from "three";
import type { Kit } from "../../../engine/kit";
import { rng } from "../../../engine/kit";

const m = new THREE.Matrix4();
const q = new THREE.Quaternion();
const s = new THREE.Vector3();
const p = new THREE.Vector3();
const e = new THREE.Euler();
const UP = new THREE.Vector3(0, 1, 0);

/**
 * A closed body of revolution along a spine (x axis), radius profile
 * `radius(t)` (t = 0 tail → 1 head), with an optional belly flattening.
 */
function spineBody(
  kit: Kit,
  length: number,
  radius: (t: number) => number,
  options: { rings?: number; sides?: number; arch?: number; belly?: number } = {},
) {
  const rings = options.rings ?? 64;
  const sides = options.sides ?? 28;
  const positions: number[] = [];
  const index: number[] = [];
  for (let i = 0; i <= rings; i++) {
    const t = i / rings;
    const x = (t - 0.5) * length;
    const y0 = (options.arch ?? 0) * Math.sin(Math.PI * t);
    const r = Math.max(radius(t), 1e-4);
    for (let j = 0; j <= sides; j++) {
      const a = (j / sides) * Math.PI * 2;
      const cy = Math.cos(a);
      const flatten = cy < 0 ? 1 - (options.belly ?? 0) : 1;
      positions.push(x, y0 + cy * r * flatten, Math.sin(a) * r);
    }
  }
  for (let i = 0; i < rings; i++)
    for (let j = 0; j < sides; j++) {
      const a = i * (sides + 1) + j;
      const b = a + sides + 1;
      index.push(a, a + 1, b, a + 1, b + 1, b);
    }
  const geometry = kit.geometry(new THREE.BufferGeometry());
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return geometry;
}

/** A tube along `points` whose radius follows `radius(t)`. */
export function taperedTube(
  kit: Kit,
  points: THREE.Vector3[],
  radius: (t: number) => number,
  options: { segments?: number; radial?: number } = {},
) {
  const segments = options.segments ?? 64;
  const radial = options.radial ?? 16;
  const curve = new THREE.CatmullRomCurve3(points);
  const geometry = new THREE.TubeGeometry(curve, segments, 1, radial, false);
  const position = geometry.getAttribute("position") as THREE.BufferAttribute;
  const c = new THREE.Vector3();
  const v = new THREE.Vector3();
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    curve.getPointAt(t, c);
    const r = Math.max(radius(t), 1e-4);
    for (let j = 0; j <= radial; j++) {
      const k = i * (radial + 1) + j;
      v.fromBufferAttribute(position, k).sub(c).multiplyScalar(r).add(c);
      position.setXYZ(k, v.x, v.y, v.z);
    }
  }
  geometry.computeVertexNormals();
  return kit.geometry(geometry);
}

/* ------------------------------------------------------------------ */
/* Tardigrade                                                          */
/* ------------------------------------------------------------------ */

/** A water bear about `length` units long, head towards +X, belly down. */
export function tardigrade(kit: Kit, length = 6.4) {
  const group = new THREE.Group();
  const skin = kit.toon("#ffc394", { shadow: "#c9707f", rim: 0.55, rimColor: "#fff0da", gloss: 0.22, soft: 0.32 });
  const body = new THREE.Mesh(
    spineBody(
      kit,
      length,
      (t) => {
        const tail = Math.pow(Math.sin(Math.PI * Math.min(0.5, t)), 0.42);
        const nose = Math.pow(Math.max(0, 1 - Math.pow(Math.max(0, t - 0.62) / 0.38, 2.4)), 0.5);
        const segments = 1 + 0.075 * Math.cos(t * Math.PI * 2 * 4.5 + 0.6);
        const head = 1 - 0.1 * THREE.MathUtils.smoothstep(t, 0.72, 0.85);
        return 1.08 * tail * nose * segments * head;
      },
      { arch: 0.35, belly: 0.18, rings: 80 },
    ),
    skin,
  );
  group.add(body);

  // Face: eyespots and a round mouth at the tip of the snout.
  const dark = kit.flat("#2b1747");
  const eyeGeometry = kit.geometry(new THREE.SphereGeometry(1, 12, 10));
  // Eyespots and their tiny highlights (instanced: one draw call each).
  const eyes = new THREE.InstancedMesh(eyeGeometry, dark, 2);
  const shines = new THREE.InstancedMesh(eyeGeometry, kit.flat("#ffffff"), 2);
  const eyeAt = [-1, 1].map((side) => new THREE.Vector3(length * 0.42, 0.55, side * 0.5));
  const poseEyes = (open: number) => {
    eyeAt.forEach((at, i) => {
      eyes.setMatrixAt(i, m.compose(at, q.identity(), s.set(0.12, 0.12 * open, 0.12)));
      shines.setMatrixAt(i, m.compose(p.copy(at).add(s.set(0.05, 0.07, Math.sign(at.z) * 0.06)), q, s.setScalar(open > 0.5 ? 0.04 : 0)));
    });
    eyes.instanceMatrix.needsUpdate = true;
    shines.instanceMatrix.needsUpdate = true;
  };
  poseEyes(1);
  group.add(eyes, shines);
  const mouth = new THREE.Mesh(
    kit.geometry(new THREE.TorusGeometry(0.11, 0.045, 8, 20)),
    kit.toon("#f0a07f", { rim: 0.2 }),
  );
  mouth.rotation.set(0, Math.PI / 2 + 0.2, 0.5);
  mouth.position.set(length * 0.5 - 0.02, 0.02, 0);
  const mouthHole = new THREE.Mesh(eyeGeometry, dark);
  mouthHole.scale.set(0.04, 0.08, 0.08);
  mouthHole.rotation.z = 0.5;
  mouthHole.position.set(length * 0.5 + 0.01, 0.03, 0);
  group.add(mouth, mouthHole);

  // Eight stubby legs: three pairs under the trunk, the fourth pair pointing backwards.
  const legGeometry = kit.geometry(new THREE.CapsuleGeometry(0.33, 0.55, 6, 14));
  legGeometry.translate(0, -0.35, 0);
  const footGeometry = kit.geometry(new THREE.SphereGeometry(0.26, 12, 8));
  const legs = new THREE.InstancedMesh(legGeometry, skin, 8);
  const hook: THREE.Vector3[] = [];
  for (let i = 0; i <= 8; i++) {
    const a = (i / 8) * 1.7;
    hook.push(new THREE.Vector3(Math.sin(a) * 0.2, -Math.sin(a * 0.9) * 0.22 - i * 0.012, 0));
  }
  const clawGeometry = taperedTube(kit, hook, (t) => 0.045 * (1 - t * 0.85), { segments: 16, radial: 6 });
  const claws = new THREE.InstancedMesh(clawGeometry, kit.toon("#3d2350", { rim: 0.35, rimColor: "#9d7cff", gloss: 0.3 }), 32);
  const feet = new THREE.InstancedMesh(footGeometry, skin, 8);
  const legSpecs = [
    { t: 0.72, back: false },
    { t: 0.54, back: false },
    { t: 0.36, back: false },
    { t: 0.1, back: true },
  ];
  const legBases: { base: THREE.Vector3; side: number; back: boolean; phase: number }[] = [];
  legSpecs.forEach((spec, k) => {
    for (const side of [-1, 1]) {
      const x = (spec.t - 0.5) * length;
      legBases.push({
        base: new THREE.Vector3(spec.back ? x + 0.2 : x, spec.back ? -0.1 : -0.25, side * (spec.back ? 0.42 : 0.58)),
        side,
        back: spec.back,
        phase: k * 1.1 + (side > 0 ? Math.PI : 0),
      });
    }
  });
  group.add(legs, feet, claws);
  const foot = new THREE.Vector3();
  const legQ = new THREE.Quaternion();
  const clawQ = new THREE.Quaternion();
  const poseLegs = (time: number) => {
    legBases.forEach((leg, i) => {
      const swing = Math.sin(time * 3.2 + leg.phase) * 0.4;
      if (leg.back) e.set(leg.side * 0.5, 0, -1.25 + swing * 0.35, "XYZ");
      else e.set(-leg.side * 0.55, 0, swing, "XYZ");
      legQ.setFromEuler(e);
      legs.setMatrixAt(i, m.compose(leg.base, legQ, s.set(1, 1, 1)));
      foot.set(0, -0.95, 0).applyQuaternion(legQ).add(leg.base);
      feet.setMatrixAt(i, m.compose(foot, legQ, s.set(1, 0.8, 1)));
      for (let c = 0; c < 4; c++) {
        // Claws fan out forward from the foot, hooking downwards.
        e.set(0, (c - 1.5) * 0.45 + (leg.back ? Math.PI : 0), 0, "XYZ");
        clawQ.setFromEuler(e).premultiply(legQ);
        p.set(0, -0.16, 0).applyQuaternion(legQ).add(foot);
        claws.setMatrixAt(i * 4 + c, m.compose(p, clawQ, s.set(1.3, 1.3, 1.3)));
      }
    });
    legs.instanceMatrix.needsUpdate = true;
    feet.instanceMatrix.needsUpdate = true;
    claws.instanceMatrix.needsUpdate = true;
  };
  poseLegs(0);
  // A soft translucent glow around the body.
  const glow = new THREE.Mesh(body.geometry, kit.halo("#ffe2c4", { opacity: 0.45, power: 2.6 }));
  glow.scale.setScalar(1.03);
  group.add(glow);

  return {
    group,
    update(time: number) {
      poseLegs(time);
      body.rotation.x = Math.sin(time * 1.6) * 0.03;
      poseEyes((time % 4.3) < 0.12 ? 0.15 : 1);
    },
  };
}

/* ------------------------------------------------------------------ */
/* Paramecium                                                          */
/* ------------------------------------------------------------------ */

/** Slipper-shaped surface: x ∈ [−1, 1] along the cell (front at +1), angle a around it. */
function slipper(x: number, a: number, target: THREE.Vector3) {
  const base = Math.sqrt(Math.max(0, 1 - x * x));
  const taper = 1 + 0.18 * x - 0.08 * x * x;
  let r = Math.pow(base, 0.85) * taper;
  // The oral groove: a shallow oblique dip on one side.
  const groove = Math.exp(-Math.pow((x - 0.15) / 0.35, 2)) * Math.max(0, Math.cos(a - 0.9 + x * 0.8));
  r *= 1 - 0.22 * groove * groove;
  return target.set(x, Math.cos(a) * r * 0.33, Math.sin(a) * r * 0.36);
}

export function paramecium(kit: Kit, options: { length?: number; seed?: number; cilia?: number; env?: boolean } = {}) {
  const env = options.env;
  const length = options.length ?? 4.2;
  const random = rng(options.seed ?? 3);
  const group = new THREE.Group();
  const scale = length / 2;

  // Organelles, seen through the translucent body.
  const organelles: { at: THREE.Vector3; size: THREE.Vector3; color: string }[] = [
    { at: new THREE.Vector3(0.05, 0.02, -0.02), size: new THREE.Vector3(0.28, 0.13, 0.13), color: "#a77dff" },
    { at: new THREE.Vector3(0.22, 0.05, 0.04), size: new THREE.Vector3(0.06, 0.05, 0.05), color: "#d6b8ff" },
    { at: new THREE.Vector3(0.55, 0.12, -0.05), size: new THREE.Vector3(0.07, 0.07, 0.07), color: "#8ff4ff" },
    { at: new THREE.Vector3(-0.55, 0.12, -0.05), size: new THREE.Vector3(0.07, 0.07, 0.07), color: "#8ff4ff" },
  ];
  const foodColors = ["#ffb347", "#8fe36e", "#ffd23f", "#ff9a6b"];
  for (let i = 0; i < 9; i++)
    organelles.push({
      at: new THREE.Vector3(-0.6 + random() * 1.1, (random() - 0.5) * 0.25, (random() - 0.5) * 0.3),
      size: new THREE.Vector3().setScalar(0.035 + random() * 0.035),
      color: foodColors[i % foodColors.length],
    });
  const sphere = kit.geometry(new THREE.SphereGeometry(1, 14, 10));
  const inner = new THREE.InstancedMesh(sphere, kit.toon("#ffffff", { rim: 0.3, gloss: 0.3, env }), organelles.length);
  const tint = new THREE.Color();
  organelles.forEach((o, i) => {
    inner.setMatrixAt(i, m.compose(o.at.clone().multiplyScalar(scale), q.identity(), s.copy(o.size).multiplyScalar(scale)));
    inner.setColorAt(i, tint.set(o.color));
  });
  group.add(inner);
  // Radiating canals of the two contractile vacuoles.
  const canals = new THREE.InstancedMesh(
    kit.geometry(new THREE.CapsuleGeometry(0.012, 0.16, 2, 5).translate(0, 0.09, 0)),
    kit.flat("#aef6ff", { env }),
    12,
  );
  let k = 0;
  for (const cx of [0.55, -0.55])
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      e.set(0, 0, 0);
      q.setFromAxisAngle(new THREE.Vector3(Math.cos(a) * 0.2, 0, Math.sin(a)).normalize(), Math.PI / 2);
      q.setFromUnitVectors(UP, new THREE.Vector3(Math.cos(a), 0.25, Math.sin(a)).normalize());
      canals.setMatrixAt(k++, m.compose(p.set(cx * scale, 0.12 * scale, -0.05 * scale), q, s.setScalar(scale)));
    }
  group.add(canals);

  // Translucent body.
  const bodyGeometry = new THREE.SphereGeometry(1, 48, 24);
  bodyGeometry.rotateZ(Math.PI / 2);
  const position = bodyGeometry.getAttribute("position") as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < position.count; i++) {
    v.fromBufferAttribute(position, i);
    const a = Math.atan2(v.z, v.y);
    slipper(v.x, a, v).multiplyScalar(scale);
    position.setXYZ(i, v.x, v.y, v.z);
  }
  bodyGeometry.computeVertexNormals();
  const body = new THREE.Mesh(
    kit.geometry(bodyGeometry),
    kit.toon("#9ff0d0", { opacity: 0.55, rim: 0.85, rimColor: "#eafff4", gloss: 0.3, soft: 0.4, depthWrite: false, env }),
  );
  body.renderOrder = 2;
  group.add(body);

  // Cilia all over the surface, beating in waves that run along the cell.
  const count = options.cilia ?? kit.count(360, 180);
  const ciliumGeometry = kit.geometry(new THREE.CylinderGeometry(0.008, 0.014, 1, 4).translate(0, 0.5, 0));
  const cilia = new THREE.InstancedMesh(ciliumGeometry, kit.flat("#dcfff0", { opacity: 0.6, env }), count);
  cilia.renderOrder = 3;
  const roots: { at: THREE.Vector3; normal: THREE.Vector3; tangent: THREE.Vector3; x: number; length: number }[] = [];
  const a1 = new THREE.Vector3();
  const a2 = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    const x = -0.97 + ((i * 0.618034) % 1) * 1.94;
    const a = (i / count) * Math.PI * 2 * 21;
    const at = slipper(x, a, new THREE.Vector3());
    slipper(x, a + 0.02, a1);
    slipper(Math.min(0.99, x + 0.02), a, a2);
    const along = a2.clone().sub(at).normalize();
    const normal = a1.clone().sub(at).cross(along).normalize();
    if (normal.dot(at.clone().setX(at.x * 0.3)) < 0) normal.negate();
    roots.push({
      at: at.multiplyScalar(scale),
      normal,
      tangent: along.negate(),
      x,
      length: (x < -0.85 ? 0.2 : 0.1) * (0.9 + ((i * 7) % 5) * 0.05),
    });
  }
  group.add(cilia);
  const dir = new THREE.Vector3();
  const poseCilia = (time: number) => {
    roots.forEach((root, i) => {
      const beat = Math.sin(time * 9 - root.x * 9);
      dir.copy(root.normal).multiplyScalar(0.75).addScaledVector(root.tangent, 0.55 + 0.45 * beat).normalize();
      q.setFromUnitVectors(UP, dir);
      cilia.setMatrixAt(i, m.compose(root.at, q, s.set(1, root.length * scale, 1)));
    });
    cilia.instanceMatrix.needsUpdate = true;
  };
  poseCilia(0);

  const halo = new THREE.Mesh(body.geometry, kit.halo("#b5ffd9", { opacity: 0.5, power: 2.2, env }));
  halo.scale.setScalar(1.06);
  group.add(halo);
  return { group, update: poseCilia };
}

/* ------------------------------------------------------------------ */
/* Volvox                                                              */
/* ------------------------------------------------------------------ */

export function volvox(kit: Kit, radius = 2.3, env = false) {
  const group = new THREE.Group();
  const cells: number[] = [];
  const n = kit.count(900, 500);
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const a = i * golden;
    cells.push(Math.cos(a) * r * radius, y * radius, Math.sin(a) * r * radius);
  }
  const dots = kit.points(cells, { size: 0.1, color: "#6fe86a", soft: 0.2, env });
  group.add(dots);
  const shell = new THREE.Mesh(
    kit.geometry(new THREE.SphereGeometry(radius, 48, 32)),
    kit.toon("#8ff08f", { opacity: 0.22, rim: 0.9, rimColor: "#d8ffd0", gloss: 0.3, depthWrite: false, env }),
  );
  shell.renderOrder = 2;
  group.add(shell, new THREE.Mesh(shell.geometry, kit.halo("#9dff8f", { opacity: 0.6, power: 2.4, env })));
  // Daughter colonies inside.
  const random = rng(17);
  const daughters = new THREE.InstancedMesh(
    kit.blob(1, { detail: 3, noise: 0.05, seed: 2 }),
    kit.toon("#35b845", { rim: 0.6, rimColor: "#bfffb0", gloss: 0.35, env }),
    6,
  );
  for (let i = 0; i < 6; i++) {
    const dir = new THREE.Vector3(random() - 0.5, random() - 0.5, random() - 0.5).normalize();
    daughters.setMatrixAt(i, m.compose(dir.multiplyScalar(radius * (0.35 + random() * 0.25)), q.identity(), s.setScalar(radius * (0.14 + random() * 0.06))));
  }
  group.add(daughters);
  return {
    group,
    update(time: number) {
      group.rotation.set(0.4, time * 0.25, 0.2 + Math.sin(time * 0.3) * 0.1);
    },
  };
}

/* ------------------------------------------------------------------ */
/* Diatoms                                                             */
/* ------------------------------------------------------------------ */

function pennateTexture(kit: Kit) {
  return kit.canvasTexture(128, 256, (g, w, h) => {
    const gradient = g.createLinearGradient(0, 0, w, 0);
    gradient.addColorStop(0, "#f7e6a0");
    gradient.addColorStop(0.3, "#e7b845");
    gradient.addColorStop(0.7, "#e7b845");
    gradient.addColorStop(1, "#f7e6a0");
    g.fillStyle = gradient;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "rgba(255, 250, 220, 0.85)";
    g.lineWidth = 2;
    for (let y = 6; y < h; y += 9) {
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(w, y);
      g.stroke();
    }
    g.fillStyle = "rgba(160, 110, 30, 0.8)";
    g.fillRect(0, h * 0.47, w, h * 0.06);
  });
}

function centricTexture(kit: Kit) {
  return kit.canvasTexture(256, 256, (g, w, h) => {
    const cx = w / 2;
    const cy = h / 2;
    const gradient = g.createRadialGradient(cx, cy, 0, cx, cy, w / 2);
    gradient.addColorStop(0, "#f2cf63");
    gradient.addColorStop(0.7, "#e2ab3f");
    gradient.addColorStop(0.92, "#fff2c2");
    gradient.addColorStop(1, "#fffbe8");
    g.fillStyle = gradient;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "rgba(255, 248, 215, 0.8)";
    g.lineWidth = 2;
    for (let i = 0; i < 36; i++) {
      const a = (i / 36) * Math.PI * 2;
      g.beginPath();
      g.moveTo(cx + Math.cos(a) * w * 0.12, cy + Math.sin(a) * h * 0.12);
      g.lineTo(cx + Math.cos(a) * w * 0.46, cy + Math.sin(a) * h * 0.46);
      g.stroke();
    }
    for (const r of [0.2, 0.32, 0.44]) {
      g.beginPath();
      g.arc(cx, cy, r * w, 0, Math.PI * 2);
      g.stroke();
    }
    g.fillStyle = "rgba(255, 250, 225, 0.9)";
    g.beginPath();
    g.arc(cx, cy, w * 0.07, 0, Math.PI * 2);
    g.fill();
  });
}

export interface DiatomSpec {
  kind: "pennate" | "centric";
  at: THREE.Vector3;
  size: number;
  spin: number;
  phase: number;
  drift: number;
}

/** Golden glass diatoms: boat-shaped (pennate) and disc-shaped (centric). Two draw calls. */
export function diatoms(kit: Kit, specs: DiatomSpec[], options: { env?: boolean; star?: THREE.Vector3 } = {}) {
  const group = new THREE.Group();
  const pennate = specs.filter((d) => d.kind === "pennate");
  const centric = specs.filter((d) => d.kind === "centric");
  const starCells = options.star ? 8 : 0;
  const boatGeometry = kit.geometry(new THREE.CapsuleGeometry(0.3, 0.8, 8, 16));
  boatGeometry.scale(1, 1, 0.26);
  // Pointed ends like Navicula.
  const bp = boatGeometry.getAttribute("position") as THREE.BufferAttribute;
  for (let i = 0; i < bp.count; i++) {
    const y = bp.getY(i);
    const pinch = 1 - 0.55 * THREE.MathUtils.smoothstep(Math.abs(y), 0.2, 0.7);
    bp.setX(i, bp.getX(i) * pinch);
    bp.setZ(i, bp.getZ(i) * pinch);
  }
  boatGeometry.computeVertexNormals();
  const boats = new THREE.InstancedMesh(
    boatGeometry,
    kit.textured(pennateTexture(kit), { rim: 0.7, rimColor: "#fffbe6", gloss: 0.4, env: options.env }),
    Math.max(1, pennate.length + starCells),
  );
  const discGeometry = kit.geometry(new THREE.CylinderGeometry(0.5, 0.5, 0.22, 40, 1));
  const discs = new THREE.InstancedMesh(
    discGeometry,
    kit.textured(centricTexture(kit), { rim: 0.6, rimColor: "#fffbe6", gloss: 0.4, env: options.env }),
    Math.max(1, centric.length),
  );
  group.add(boats, discs);
  return {
    group,
    update(time: number) {
      pennate.forEach((d, i) => {
        const t = time * d.spin + d.phase;
        p.copy(d.at).add(s.set(Math.sin(t * 0.7) * d.drift, Math.sin(t * 0.5) * d.drift * 0.4, 0));
        e.set(0.15 + Math.sin(t) * 0.25, Math.sin(t * 0.4) * 0.5, 1.2 + t * 0.2);
        boats.setMatrixAt(i, m.compose(p, q.setFromEuler(e), s.setScalar(d.size)));
      });
      if (options.star) {
        const spin = time * 0.12;
        for (let k = 0; k < starCells; k++) {
          const a = (k / starCells) * Math.PI * 2 + spin;
          const dir = new THREE.Vector3(Math.cos(a), Math.sin(a), 0);
          q.setFromUnitVectors(UP, dir);
          p.copy(options.star).addScaledVector(dir, 0.72);
          boats.setMatrixAt(pennate.length + k, m.compose(p, q, s.set(0.4, 1.0, 0.5)));
        }
      }
      boats.instanceMatrix.needsUpdate = true;
      centric.forEach((d, i) => {
        const t = time * d.spin + d.phase;
        p.copy(d.at).add(s.set(Math.sin(t * 0.6) * d.drift, Math.cos(t * 0.4) * d.drift * 0.4, 0));
        e.set(1.1 + Math.sin(t * 0.7) * 0.25, t * 0.3, 0.3);
        discs.setMatrixAt(i, m.compose(p, q.setFromEuler(e), s.setScalar(d.size)));
      });
      discs.instanceMatrix.needsUpdate = true;
    },
  };
}

/* ------------------------------------------------------------------ */
/* Closterium                                                          */
/* ------------------------------------------------------------------ */

/** A crescent-shaped green desmid with clear tips holding dancing crystals. */
export function closterium(kit: Kit, length = 4, env = false) {
  const group = new THREE.Group();
  const arc: THREE.Vector3[] = [];
  const bend = 1.9;
  for (let i = 0; i <= 12; i++) {
    const a = (i / 12 - 0.5) * 1.9;
    arc.push(new THREE.Vector3(Math.sin(a) * bend, (Math.cos(a) - 1) * bend + 0.9, 0));
  }
  const scaleL = length / 3.2;
  arc.forEach((point) => point.multiplyScalar(scaleL));
  const thickness = (t: number) => 0.42 * scaleL * Math.pow(Math.sin(Math.PI * t), 0.75);
  const green = new THREE.Mesh(
    taperedTube(kit, arc, (t) => thickness(t) * 0.86, { segments: 80, radial: 16 }),
    kit.toon("#55d24a", { rim: 0.5, rimColor: "#c9ffb0", gloss: 0.25, shadow: "#1f7a4a", env }),
  );
  // Clear outer wall, visible at the tips.
  const wall = new THREE.Mesh(
    taperedTube(kit, arc, (t) => thickness(t) + 0.03, { segments: 80, radial: 16 }),
    kit.toon("#dffff0", { opacity: 0.35, rim: 0.9, rimColor: "#ffffff", depthWrite: false, env }),
  );
  wall.renderOrder = 2;
  // The pale nucleus in the middle.
  const nucleus = new THREE.Mesh(
    kit.geometry(new THREE.SphereGeometry(1, 16, 12)),
    kit.toon("#e9ffe0", { rim: 0.4, env }),
  );
  nucleus.scale.set(0.16, 0.3, 0.3).multiplyScalar(scaleL);
  nucleus.position.copy(arc[6]);
  const crystals: number[] = [];
  for (const end of [arc[1], arc[11]]) for (let i = 0; i < 5; i++) crystals.push(end.x + (i - 2) * 0.03, end.y + (i % 2) * 0.04, 0.05);
  // Pyrenoids: a row of pale starch centres along each chloroplast.
  const curve = new THREE.CatmullRomCurve3(arc);
  for (let i = 0; i < 12; i++) {
    const t = 0.14 + (i / 11) * 0.72;
    if (Math.abs(t - 0.5) < 0.06) continue;
    const at = curve.getPointAt(t);
    crystals.push(at.x, at.y, thickness(t) * 0.7);
  }
  const dots = kit.points(crystals, { size: 0.12, color: "#f2ffe0", twinkle: 0.4, env });
  group.add(green, nucleus, wall, dots);
  return { group, update: (time: number) => void (dots.rotation.z = Math.sin(time * 3) * 0.02) };
}

/* ------------------------------------------------------------------ */
/* Euglena                                                             */
/* ------------------------------------------------------------------ */

/**
 * Spindle-shaped green flagellates with a red eyespot and one whipping
 * flagellum, about `length` units long. Three draw calls for the whole swarm.
 */
export function euglenas(kit: Kit, spots: { at: THREE.Vector3; heading: number; phase: number }[], length = 1.1, env = false) {
  const group = new THREE.Group();
  const body = new THREE.SphereGeometry(1, 24, 14);
  const bp = body.getAttribute("position") as THREE.BufferAttribute;
  for (let i = 0; i < bp.count; i++) {
    const x = bp.getX(i);
    const t = (x + 1) / 2;
    // Rounded front (+X), pointed tail.
    const r = Math.pow(Math.max(0, Math.sin(Math.PI * Math.min(1, 0.08 + t * 0.95))), 0.75) * (0.75 + 0.25 * t);
    const scale = r / Math.max(1e-4, Math.sqrt(Math.max(0, 1 - x * x)));
    bp.setXYZ(i, x * length * 0.5, bp.getY(i) * scale * length * 0.19, bp.getZ(i) * scale * length * 0.19);
  }
  body.computeVertexNormals();
  const bodies = new THREE.InstancedMesh(
    kit.geometry(body),
    kit.toon("#6fe25a", { rim: 0.6, rimColor: "#e0ffc8", gloss: 0.3, shadow: "#1f8a5a", env }),
    spots.length,
  );
  const eyes = new THREE.InstancedMesh(kit.geometry(new THREE.SphereGeometry(1, 10, 8)), kit.toon("#ff3b4f", { rim: 0.3, gloss: 0.4, env }), spots.length);
  const whip: THREE.Vector3[] = [];
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    whip.push(new THREE.Vector3(t * length * 0.9, Math.sin(t * Math.PI * 2.5) * 0.06 * t * length, 0));
  }
  const flagella = new THREE.InstancedMesh(
    taperedTube(kit, whip, (t) => 0.018 * (1 - 0.6 * t), { segments: 40, radial: 5 }),
    kit.toon("#d8ffd0", { rim: 0.3, env }),
    spots.length,
  );
  group.add(bodies, eyes, flagella);
  const e2 = new THREE.Euler();
  const base = new THREE.Matrix4();
  const local = new THREE.Matrix4();
  return {
    group,
    update(time: number) {
      spots.forEach((spot, i) => {
        const t = time * 0.35 + spot.phase;
        p.copy(spot.at).add(s.set(Math.cos(spot.heading) * Math.sin(t) * 0.8, Math.sin(t * 1.3) * 0.2, Math.sin(spot.heading) * Math.sin(t) * -0.8));
        // Swims forward while rolling about its long axis.
        e2.set(time * 2 + spot.phase, 0, 0, "XYZ");
        q.setFromEuler(e2).premultiply(new THREE.Quaternion().setFromAxisAngle(UP, -spot.heading + (Math.cos(t) < 0 ? Math.PI : 0)));
        base.compose(p, q, s.set(1, 1, 1));
        bodies.setMatrixAt(i, base);
        eyes.setMatrixAt(i, local.compose(p.set(length * 0.33, length * 0.1, 0), q.identity(), s.setScalar(length * 0.055)).premultiply(base));
        const wave = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), time * 9 + spot.phase);
        flagella.setMatrixAt(i, local.compose(p.set(length * 0.48, 0, 0), wave, s.set(1, 1, 1)).premultiply(base));
      });
      bodies.instanceMatrix.needsUpdate = true;
      eyes.instanceMatrix.needsUpdate = true;
      flagella.instanceMatrix.needsUpdate = true;
    },
  };
}
