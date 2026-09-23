/**
 * "Your hand" (1 unit = 1.9 cm): the open left hand raised by the person,
 * palm towards the camera, fingers up, wrist near y = −5. It continues the
 * person's forearm (see handShape.ts → FOREARM).
 *
 * An x-ray band sweeps slowly up and down the hand, revealing the 27 bones
 * and the flexor tendons. The middle finger carries the `fingertip` anchor
 * and never moves; the band stays below its last phalanx, which the
 * fingertip level redraws on top.
 */
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Kit } from "../../../engine/kit";
import { rng } from "../../../engine/kit";
import type { SceneBuilder } from "../types";
import { SKIN } from "./person";
import {
  FINGERS,
  FINGER_DEPTH,
  FOREARM,
  type FingerSpec,
  fingerGeometry,
  fingerRadius,
  fingerToHand,
} from "./handShape";
import { patchToon } from "./skinShaders";

const DEG = Math.PI / 180;
const PALM_CENTER = new THREE.Vector2(-0.3, -1.9);
const PALM_HALF_HEIGHT = 2.72;
/** Band sweep: centre range and half height (hand units). */
const BAND_LOW = -6.4;
const BAND_HIGH = 2.45;
const BAND_HALF = 0.95;

/** Uniforms shared by every x-ray material of this scene. */
function xrayUniforms() {
  return {
    uRootInv: { value: new THREE.Matrix4() },
    uBand: { value: new THREE.Vector4(-99, BAND_HALF, 0, 0) },
  };
}
type XrayUniforms = ReturnType<typeof xrayUniforms>;

const XRAY_VERTEX = {
  decl: "varying vec3 vRoot;\nuniform mat4 uRootInv;",
  main: `vec4 kitP = vec4(transformed, 1.0);
#ifdef USE_INSTANCING
  kitP = instanceMatrix * kitP;
#endif
  vRoot = (uRootInv * modelMatrix * kitP).xyz;`,
};
const XRAY_BAND = `
  float bandD = abs(vRoot.y - uBand.x);
  float inBand = (1.0 - smoothstep(uBand.y - 0.04, uBand.y + 0.04, bandD)) * uBand.z;`;

/** Skin: turns into an x-ray film inside the band, with bright scan lines at its edges. */
function xraySkin(kit: Kit, uniforms: XrayUniforms, color: THREE.ColorRepresentation, options: Parameters<Kit["toon"]>[1] = {}) {
  return patchToon(kit.toon(color, options) as THREE.ShaderMaterial, {
    uniforms,
    vertexDecl: XRAY_VERTEX.decl,
    vertexMain: XRAY_VERTEX.main,
    fragmentDecl: "varying vec3 vRoot;\nuniform vec4 uBand;",
    fragmentFinal: `${XRAY_BAND}
  float fresX = 1.0 - clamp(dot(n, v), 0.0, 1.0);
  vec3 film = mix(vec3(0.1, 0.17, 0.46), vec3(0.45, 0.82, 1.0), smoothstep(0.3, 1.0, fresX));
  col = mix(col, film, inBand * 0.94);
  float scan = (1.0 - smoothstep(0.0, 0.045, abs(bandD - uBand.y))) * uBand.z;
  col = mix(col, vec3(0.78, 0.98, 1.0), scan);`,
  });
}

/** Inner structures (bones, tendons): only drawn inside the band, on top of the skin. */
function xrayInner(kit: Kit, uniforms: XrayUniforms, color: THREE.ColorRepresentation, glow: THREE.ColorRepresentation, alpha = 1) {
  const material = patchToon(
    kit.toon(color, { rim: 0.55, rimColor: glow, gloss: 0.35, soft: 0.3, transparent: true, depthWrite: false }) as THREE.ShaderMaterial,
    {
      uniforms: { ...uniforms, uInnerAlpha: { value: alpha } },
      vertexDecl: XRAY_VERTEX.decl,
      vertexMain: XRAY_VERTEX.main,
      fragmentDecl: "varying vec3 vRoot;\nuniform vec4 uBand;\nuniform float uInnerAlpha;",
      fragmentFinal: `${XRAY_BAND}
  if (inBand < 0.01) discard;
  outAlpha *= inBand * uInnerAlpha;`,
    },
  );
  material.depthTest = false;
  return material;
}

/** A bone: a slightly waisted shaft with rounded heads. */
function boneGeometry(a: THREE.Vector3, b: THREE.Vector3, radius: number, head = 1.45) {
  const length = a.distanceTo(b);
  const parts: THREE.BufferGeometry[] = [];
  const profile: THREE.Vector2[] = [];
  const steps = 14;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const y = -length / 2 + t * length;
    const flare = Math.pow(Math.abs(t - 0.5) * 2, 3);
    profile.push(new THREE.Vector2(radius * (0.82 + 0.5 * flare), y));
  }
  parts.push(new THREE.LatheGeometry(profile, 12));
  for (const end of [-1, 1]) {
    const knob = new THREE.SphereGeometry(radius * head, 14, 10);
    knob.scale(1, 0.8, 0.9);
    knob.translate(0, (end * length) / 2, 0);
    parts.push(knob);
  }
  const merged = mergeGeometries(parts.map((p) => (p.index ? p.toNonIndexed() : p)))!;
  for (const p of parts) p.dispose();
  merged.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()));
  merged.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
  return merged;
}

/** A closed tube with an elliptical, varying cross-section along +Y. */
function loft(rings: { y: number; rx: number; rz: number }[], segments = 36) {
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  rings.forEach((ring, i) => {
    const prev = rings[Math.max(0, i - 1)];
    const next = rings[Math.min(rings.length - 1, i + 1)];
    const slope = (next.rx - prev.rx) / Math.max(1e-4, next.y - prev.y);
    for (let s = 0; s <= segments; s++) {
      const a = (s / segments) * Math.PI * 2 + Math.PI;
      const c = Math.sin(a);
      const d = Math.cos(a);
      positions.push(ring.rx * c, ring.y, ring.rz * d);
      const n = new THREE.Vector3(c / ring.rx, -slope / Math.max(ring.rx, 0.1), d / ring.rz).normalize();
      normals.push(n.x, n.y, n.z);
    }
  });
  const stride = segments + 1;
  for (let i = 0; i < rings.length - 1; i++)
    for (let s = 0; s < segments; s++) {
      const a = i * stride + s;
      indices.push(a, a + 1, a + stride, a + 1, a + stride + 1, a + stride);
    }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geometry.setIndex(indices);
  return geometry;
}

/** The palm: a softened box, wider at the knuckles, with a shallow hollow. */
function palmGeometry(kit: Kit) {
  const geometry = kit.blob(1, { detail: 5, noise: 0 });
  const position = geometry.getAttribute("position") as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  const colors: number[] = [];
  for (let i = 0; i < position.count; i++) {
    v.fromBufferAttribute(position, i).normalize();
    const px = Math.sign(v.x) * Math.pow(Math.abs(v.x), 0.5);
    const py = Math.sign(v.y) * Math.pow(Math.abs(v.y), 0.58);
    const pz = Math.sign(v.z) * Math.pow(Math.abs(v.z), 0.85);
    const up = (py + 1) / 2;
    const halfWidth = 2.02 + 0.4 * Math.pow(up, 0.8);
    const x = PALM_CENTER.x + px * halfWidth;
    let y = PALM_CENTER.y + py * PALM_HALF_HEIGHT;
    // The knuckle line droops towards the index and little finger.
    if (py > 0) y -= 0.1 * Math.pow(x - PALM_CENTER.x + 0.15, 2) * py;
    const thickness = 0.98 - 0.2 * up;
    let z = pz * thickness;
    if (pz > 0) z -= 0.2 * (1 - px * px) * (1 - py * py) * pz;
    position.setXYZ(i, x, y, z);
    // A warmer, rosier hollow in the middle of the palm.
    const blush = pz > 0 ? Math.pow((1 - px * px) * (1 - py * py), 1.5) * pz : 0;
    colors.push(1 - 0.02 * blush, 1 - 0.12 * blush, 1 - 0.08 * blush);
  }
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}

const hand: SceneBuilder = ({ kit }) => {
  const root = new THREE.Group();
  const env = new THREE.Group();
  const random = rng(19);
  const uniforms = xrayUniforms();

  const skin = xraySkin(kit, uniforms, SKIN, { rim: 0.3, rimColor: "#ffd9c2" });
  const crease = xraySkin(kit, uniforms, "#d47d63", { rim: 0, gloss: 0, soft: 0.4 });
  const nail = xraySkin(kit, uniforms, "#ffd7cf", { rim: 0.45, rimColor: "#ffffff", gloss: 0.5 });
  const bone = xrayInner(kit, uniforms, "#eefcff", "#7fe8ff");
  const tendon = xrayInner(kit, uniforms, "#ffd66b", "#fff4d6", 0.8);

  /* ---------------------------- skin ---------------------------- */
  const palmGroup = new THREE.Group();
  root.add(palmGroup);
  const palm = new THREE.Mesh(palmGeometry(kit), xraySkin(kit, uniforms, SKIN, { rim: 0.3, rimColor: "#ffd9c2", vertexColors: true }));
  palmGroup.add(palm);

  // Thenar (thumb) and hypothenar (little finger) pads.
  const padParts: THREE.BufferGeometry[] = [];
  const pad = (x: number, y: number, z: number, sx: number, sy: number, sz: number, rz: number) => {
    const g = new THREE.SphereGeometry(1, 36, 24);
    g.scale(sx, sy, sz);
    g.rotateZ(rz);
    g.translate(x, y, z);
    padParts.push(g);
  };
  pad(-1.5, -2.95, 0.16, 1.12, 1.7, 0.72, -0.42);
  pad(1.25, -2.7, 0.14, 0.9, 1.85, 0.68, 0.06);
  const pads = new THREE.Mesh(kit.geometry(mergeGeometries(padParts)!), skin);
  for (const p of padParts) p.dispose();
  palmGroup.add(pads);

  // Wrist and forearm, continuing the person's arm. Seen from the person, only
  // the part near the wrist is drawn over their forearm (which has the same
  // radius there); the rest appears once you are at the hand.
  const forearmPart = (from: number, to: number) => {
    const rings: { y: number; rx: number; rz: number }[] = [];
    const steps = Math.max(4, Math.round((to - from) * 2.4));
    for (let i = 0; i <= steps; i++) {
      const y = from + (i / steps) * (to - from);
      const t = THREE.MathUtils.smoothstep(y, -6.2, 0.2);
      rings.push({ y, rx: THREE.MathUtils.lerp(FOREARM.radius, 2.28, t), rz: THREE.MathUtils.lerp(FOREARM.radius * 0.92, 0.84, t) });
    }
    const geometry = kit.geometry(loft(rings));
    geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), FOREARM.direction));
    geometry.translate(FOREARM.wrist.x, FOREARM.wrist.y, FOREARM.wrist.z);
    return geometry;
  };
  palmGroup.add(new THREE.Mesh(forearmPart(-6.5, 1.2), skin));
  env.add(new THREE.Mesh(forearmPart(-16, -6.45), kit.toon(SKIN, { rim: 0.3, rimColor: "#ffd9c2", env: true })));

  // Palm creases: projected onto the skin by ray casting.
  palmGroup.updateMatrixWorld(true);
  const raycaster = new THREE.Raycaster();
  const down = new THREE.Vector3(0, 0, -1);
  const surface = (x: number, y: number) => {
    raycaster.set(new THREE.Vector3(x, y, 5), down);
    const hit = raycaster.intersectObjects([palm, pads], false)[0];
    return hit ? hit.point.clone().add(hit.face!.normal.clone().multiplyScalar(0.012)) : new THREE.Vector3(x, y, 0.7);
  };
  const creaseLine = (points: [number, number][], radius: number) => {
    const curve = new THREE.CatmullRomCurve3(points.map(([x, y]) => new THREE.Vector3(x, y, 0)));
    const projected = curve.getSpacedPoints(40).map((p) => surface(p.x, p.y));
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(projected), 60, radius, 5, false);
  };
  const creaseGeometry = mergeGeometries([
    // Heart line.
    creaseLine([[2.05, -0.05], [1.2, 0.02], [0.2, -0.02], [-0.7, 0.18], [-1.25, 0.42]], 0.034),
    // Head line.
    creaseLine([[-2.05, -0.95], [-1.3, -1.02], [-0.2, -1.25], [0.9, -1.55], [1.55, -1.85]], 0.032),
    // Life line around the thumb pad.
    creaseLine([[-2.05, -0.85], [-1.45, -1.55], [-1.05, -2.45], [-0.92, -3.35], [-1.02, -4.05]], 0.034),
    // Wrist crease.
    creaseLine([[-2.0, -4.5], [-1.0, -4.62], [0.2, -4.62], [1.3, -4.5]], 0.028),
  ])!;
  palmGroup.add(new THREE.Mesh(kit.geometry(creaseGeometry), crease));

  /* --------------------------- fingers --------------------------- */
  interface Finger {
    spec: FingerSpec;
    group: THREE.Group;
    phase: number;
  }
  const fingers: Finger[] = [];
  const bonesPalm: THREE.BufferGeometry[] = [];
  const tendonsPalm: THREE.BufferGeometry[] = [];
  const carpalCenter = new THREE.Vector3(-0.45, -4.05, 0);
  for (const spec of FINGERS) {
    const group = new THREE.Group();
    group.position.set(...spec.base);
    group.rotation.z = spec.angle * DEG;
    root.add(group);
    const L = spec.length;
    const R = spec.radius;
    group.add(new THREE.Mesh(kit.geometry(fingerGeometry(spec)), skin));

    // Nail on the back, its free edge peeking above the tip.
    const nailGeometry = kit.geometry(new THREE.SphereGeometry(1, 20, 14));
    const nailMesh = new THREE.Mesh(nailGeometry, nail);
    nailMesh.scale.set(R * 0.72, R * 1.25, R * 0.26);
    nailMesh.position.set(0, L - R * 1.22, -R * FINGER_DEPTH * 0.72);
    nailMesh.rotation.x = 0.38;
    group.add(nailMesh);

    // Flexion creases at the finger joints (front half only).
    const creaseParts: THREE.BufferGeometry[] = [];
    const creaseAt = spec.id === "thumb" ? [spec.joints[1] * L] : [0.08, spec.joints[1] * L, spec.joints[2] * L];
    for (const y of creaseAt) {
      if (spec.id === "middle" && y > 3.3) continue; // drawn by the fingertip level
      const r = fingerRadius(spec, y) + 0.004;
      const g = new THREE.TorusGeometry(r, 0.02, 5, 24, Math.PI * 0.6);
      g.rotateZ(Math.PI * 0.2);
      g.rotateX(Math.PI / 2);
      g.scale(1, 1, FINGER_DEPTH);
      g.translate(0, y, 0);
      creaseParts.push(g);
    }
    group.add(new THREE.Mesh(kit.geometry(mergeGeometries(creaseParts)!), crease));
    for (const p of creaseParts) p.dispose();

    // Bones: phalanges in the finger frame; metacarpals in the palm.
    const jointsY = spec.joints.map((j) => j * L);
    const tipBone = L - R * 0.55;
    const phalanges: THREE.BufferGeometry[] = [];
    const radius = R * 0.4;
    const ends = [...jointsY, tipBone];
    for (let k = 0; k < ends.length - 1; k++) {
      const a = new THREE.Vector3(0, ends[k] + 0.12, 0);
      const b = new THREE.Vector3(0, ends[k + 1] - 0.12, 0);
      const last = k === ends.length - 2;
      phalanges.push(boneGeometry(a, b, radius * (1 - k * 0.12), last ? 1.15 : 1.35));
    }
    const boneMesh = new THREE.Mesh(kit.geometry(mergeGeometries(phalanges)!), bone);
    boneMesh.renderOrder = 4;
    group.add(boneMesh);
    for (const p of phalanges) p.dispose();
    // Flexor tendon along the front of the finger.
    const tendonFinger = new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, -1.0, R * 0.42),
        new THREE.Vector3(0, jointsY[1], R * 0.5),
        new THREE.Vector3(0, (jointsY[jointsY.length - 1] + tipBone) / 2, R * 0.4),
      ]),
      24,
      R * 0.09,
      6,
    );
    const tendonMesh = new THREE.Mesh(kit.geometry(tendonFinger), tendon);
    tendonMesh.renderOrder = 5;
    group.add(tendonMesh);

    // Metacarpal from the carpals to the knuckle.
    const knuckle = fingerToHand(spec, new THREE.Vector3(0, jointsY[0], 0));
    const wristEnd =
      spec.id === "thumb"
        ? new THREE.Vector3(-1.42, -3.55, 0.12)
        : new THREE.Vector3(carpalCenter.x + (knuckle.x - carpalCenter.x) * 0.42, -3.35, 0);
    const shaftStart = wristEnd.clone().lerp(knuckle, 0.06);
    const shaftEnd = knuckle.clone().lerp(wristEnd, spec.id === "thumb" ? 0.1 : 0.05);
    bonesPalm.push(boneGeometry(shaftStart, shaftEnd, spec.id === "thumb" ? 0.19 : 0.175, 1.4));
    // Palm part of the tendon, converging to the carpal tunnel.
    const entry = fingerToHand(spec, new THREE.Vector3(0, -1.0, R * 0.42));
    tendonsPalm.push(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3([
          entry,
          entry.clone().lerp(carpalCenter, 0.45).setZ(0.42),
          new THREE.Vector3(carpalCenter.x + (entry.x - carpalCenter.x) * 0.18, -4.35, 0.4),
          new THREE.Vector3(carpalCenter.x + (entry.x - carpalCenter.x) * 0.2, -7.2, 0.5),
        ]),
        40,
        spec.radius * 0.09,
        6,
      ),
    );
    fingers.push({ spec, group, phase: random() * Math.PI * 2 });
  }

  // Eight carpal bones in two rows, and the ends of the radius and ulna.
  const carpals: [number, number, number][] = [
    [-1.28, -4.52, 0.26], // scaphoid
    [-0.52, -4.62, 0.3], // lunate
    [0.22, -4.55, 0.28], // triquetrum
    [0.58, -4.28, 0.2], // pisiform
    [-1.38, -3.78, 0.25], // trapezium
    [-0.85, -3.72, 0.22], // trapezoid
    [-0.3, -3.82, 0.3], // capitate
    [0.36, -3.78, 0.3], // hamate
  ];
  for (const [x, y, s] of carpals) {
    const g = new THREE.SphereGeometry(s, 16, 12);
    g.scale(1, 0.85, 0.8);
    g.translate(x, y, 0);
    bonesPalm.push(g.toNonIndexed());
    g.dispose();
  }
  const along = (t: number, side: number) =>
    FOREARM.wrist.clone().addScaledVector(FOREARM.direction, t).add(new THREE.Vector3(side, 0, 0));
  bonesPalm.push(boneGeometry(along(-9, -1.0), along(-0.62, -0.72), 0.36, 1.35)); // radius
  bonesPalm.push(boneGeometry(along(-9, 0.95), along(-0.86, 0.72), 0.26, 1.25)); // ulna
  const palmBones = new THREE.Mesh(kit.geometry(mergeGeometries(bonesPalm.map((g) => (g.index ? g.toNonIndexed() : g)))!), bone);
  palmBones.renderOrder = 4;
  palmGroup.add(palmBones);
  for (const g of bonesPalm) g.dispose();
  const palmTendons = new THREE.Mesh(kit.geometry(mergeGeometries(tendonsPalm)!), tendon);
  palmTendons.renderOrder = 5;
  palmGroup.add(palmTendons);
  for (const g of tendonsPalm) g.dispose();

  /* ------------------------ surroundings ------------------------ */
  const backGlow = kit.glow("#7fb6ff", 26, { opacity: 0.32, env: true });
  backGlow.position.set(0, -0.5, -4);
  env.add(backGlow);
  const warm = kit.glow("#ffb58a", 12, { opacity: 0.22, env: true });
  warm.position.set(-0.5, 0.5, -3);
  env.add(warm);
  // Scanner beams at the edges of the band.
  const beams = [0, 1].map(() => {
    const beam = kit.glow("#8fe6ff", 1, { opacity: 0.8, env: true });
    beam.scale.set(15, 0.34, 1);
    env.add(beam);
    return beam;
  });
  const motes: number[] = [];
  const moteSizes: number[] = [];
  for (let i = 0; i < kit.count(70); i++) {
    const a = random() * Math.PI * 2;
    const r = 5 + random() * 7;
    motes.push(Math.cos(a) * r, Math.sin(a) * r * 0.75, -2 - random() * 6);
    moteSizes.push(0.5 + random());
  }
  const moteCloud = kit.points(motes, { size: 0.16, color: "#cfe4ff", opacity: 0.55, soft: 1, twinkle: 0.6, env: true, sizes: moteSizes });
  env.add(moteCloud);

  return {
    root,
    env,
    update({ time, immersion }) {
      root.updateWorldMatrix(true, false);
      uniforms.uRootInv.value.copy(root.matrixWorld).invert();
      const s = 0.5 - 0.5 * Math.cos(time * 0.42 + 1.04);
      const center = BAND_LOW + (BAND_HIGH - BAND_LOW) * s;
      const strength = THREE.MathUtils.smoothstep(immersion, 0.55, 1);
      uniforms.uBand.value.set(center, BAND_HALF, strength, 0);
      beams[0].position.set(0, center + BAND_HALF, 1.5);
      beams[1].position.set(0, center - BAND_HALF, 1.5);
      for (const beam of beams) beam.material.opacity = 0.75 * strength;
      for (const finger of fingers) {
        if (!finger.spec.wiggle) continue;
        const w = Math.sin(time * 0.9 + finger.phase) * 0.6 + Math.sin(time * 0.37 + finger.phase * 2) * 0.4;
        finger.group.rotation.z = (finger.spec.angle + finger.spec.wiggle * w) * DEG;
      }
      moteCloud.rotation.z = time * 0.01;
    },
  };
};

export default hand;
