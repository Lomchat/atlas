/**
 * A fingerprint (1 unit = 1.6 mm): the pad of the middle finger seen from the
 * palm side, redrawn from the same lathe as in the hand scene so that it
 * sits exactly on it. Ridges are shaded procedurally (fingertipPrint.ts),
 * with sweat pores along their crests and a few glistening droplets.
 * The `skin` level is a 2 mm block cut out at SKIN_SPOT.
 */
import * as THREE from "three";
import type { Kit } from "../../../engine/kit";
import { rng } from "../../../engine/kit";
import type { SceneBuilder } from "../types";
import { SKIN } from "./person";
import { FINGERTIP_PAD_Y, FINGERTIP_SCALE, FINGER_DEPTH, MIDDLE, fingerGeometry, fingerRadius } from "./handShape";
import { PAD_Z, PORE_SPACING, PRINT_GLSL, SPACING, SKIN_SPOT, padSurfaceZ, printField } from "./fingertipPrint";
import { patchToon } from "./skinShaders";

const S = FINGERTIP_SCALE;
/** Lowest point of the finger drawn in `root` (finger coordinates, hand units). */
const ROOT_FROM = 2.7;

/** Distance from (x, y) to the nearest pore centre, and that ridge's phase offset. */
function poreDistance(x: number, y: number) {
  const { f, along } = printField(x, y);
  const phase = f / SPACING;
  const index = Math.round(phase);
  const across = (phase - index) * SPACING;
  const a = along / PORE_SPACING + index * 0.37;
  const alongD = (a - Math.floor(a) - 0.5) * PORE_SPACING;
  return Math.hypot(across, alongD);
}

/**
 * Skin with the fingerprint shaded in. `seam` (0–1) fades the ridges out
 * towards the lower edge of the part drawn over the hand (seen from there).
 */
function printMaterial(kit: Kit, color: THREE.ColorRepresentation, env: boolean, seam: THREE.IUniform<number>, seamY: number) {
  return patchToon(
    kit.toon(color, { rim: 0.3, rimColor: "#ffd9c2", env }) as THREE.ShaderMaterial,
    {
      uniforms: { uSeam: seam },
      vertexDecl: "varying vec3 vObj;\nvarying vec3 vObjN;",
      vertexMain: "vObj = transformed; vObjN = objectNormal;",
      fragmentDecl: `varying vec3 vObj;\nvarying vec3 vObjN;\nuniform mat3 normalMatrix;\nuniform float uSeam;\n${PRINT_GLSL}`,
      fragmentNormal: `
  vec3 N0 = normalize(vObjN);
  float palmar = smoothstep(-0.2, 0.5, N0.z);
  float footprint = length(fwidth(vObj.xy));
  float amp = palmar * (1.0 - smoothstep(0.16, 0.4, footprint / PRINT_SPACING));
  amp *= mix(1.0, smoothstep(${(seamY + 0.4).toFixed(2)}, ${(seamY + 3.4).toFixed(2)}, vObj.y), uSeam);
  if (amp > 0.001) {
    float pore; float dummy;
    float h0 = printHeight(vObj.xy, pore);
    float hx = printHeight(vObj.xy + vec2(0.015, 0.0), dummy);
    float hy = printHeight(vObj.xy + vec2(0.0, 0.015), dummy);
    vec3 g = vec3(hx - h0, hy - h0, 0.0) / 0.015;
    g -= N0 * dot(g, N0);
    n = normalize(normalMatrix * normalize(N0 - amp * 0.05 * g));
    if (!gl_FrontFacing) n = -n;
    base *= mix(vec3(1.0), mix(vec3(0.86, 0.76, 0.8), vec3(1.08, 1.08, 1.05), h0), amp);
    base = mix(base, vec3(0.62, 0.3, 0.36), pore * amp * 0.6);
  }`,
    },
  );
}

const fingertip: SceneBuilder = ({ kit }) => {
  const root = new THREE.Group();
  const env = new THREE.Group();
  const random = rng(7);

  const place = (geometry: THREE.BufferGeometry) => {
    geometry.scale(S, S, S);
    geometry.translate(0, -FINGERTIP_PAD_Y * S, -PAD_Z);
    return kit.geometry(geometry);
  };

  /* The end of the middle finger, ridged. */
  const seam = { value: 1 };
  const seamY = (ROOT_FROM - FINGERTIP_PAD_Y) * S;
  const pad = new THREE.Mesh(
    place(fingerGeometry(MIDDLE, { segments: 120, steps: 160, from: ROOT_FROM })),
    printMaterial(kit, SKIN, false, seam, seamY),
  );
  root.add(pad);
  // Its continuation towards the palm, only once inside.
  const rest = fingerGeometry(MIDDLE, { segments: 96, steps: 40, from: 0.6 });
  const restPositions = rest.getAttribute("position") as THREE.BufferAttribute;
  for (let i = 0; i < restPositions.count; i++)
    if (restPositions.getY(i) > ROOT_FROM + 0.02) restPositions.setY(i, ROOT_FROM + 0.02);
  const lower = new THREE.Mesh(place(rest), printMaterial(kit, SKIN, true, { value: 0 }, seamY));
  env.add(lower);

  // Crease of the last finger joint: as drawn in the hand scene when seen from
  // there, then a finer fold once you are here.
  const creaseY = MIDDLE.joints[2] * MIDDLE.length;
  const crease = (tube: number) => {
    const g = new THREE.TorusGeometry(fingerRadius(MIDDLE, creaseY) + 0.004, tube, 6, 64, Math.PI * 0.6);
    g.rotateZ(Math.PI * 0.2);
    g.rotateX(Math.PI / 2);
    g.scale(1, 1, FINGER_DEPTH);
    g.translate(0, creaseY, 0);
    return place(g);
  };
  const handCreaseMaterial = kit.toon("#d47d63", { rim: 0, gloss: 0, soft: 0.4, transparent: true });
  root.add(new THREE.Mesh(crease(0.02), handCreaseMaterial));
  env.add(new THREE.Mesh(crease(0.007), kit.toon("#c9705a", { rim: 0, gloss: 0, soft: 0.4, env: true })));

  // The nail's free edge peeks above the tip (same placement as in hand.ts).
  const R = MIDDLE.radius;
  const nail = new THREE.Mesh(kit.geometry(new THREE.SphereGeometry(1, 48, 32)), kit.toon("#ffd7cf", { rim: 0.45, rimColor: "#ffffff", gloss: 0.5 }));
  nail.scale.set(R * 0.72 * S, R * 1.25 * S, R * 0.26 * S);
  nail.position.set(0, (MIDDLE.length - R * 1.22 - FINGERTIP_PAD_Y) * S, -R * FINGER_DEPTH * 0.72 * S - PAD_Z);
  nail.rotation.x = 0.38;
  root.add(nail);

  /* Sweat droplets on a few pores. */
  const droplets: { mesh: THREE.Object3D; phase: number; size: number }[] = [];
  const dropletGeometry = kit.geometry(new THREE.SphereGeometry(1, 20, 14));
  dropletGeometry.scale(1, 0.75, 1);
  const dropletMaterial = kit.toon("#bff3ff", { rim: 0.8, rimColor: "#ffffff", gloss: 0.9, opacity: 0.8, soft: 0.2, env: true });
  const shine = kit.glowMaterial("#ffffff", { opacity: 0.9, env: true });
  const spots: [number, number][] = [];
  for (let tries = 0; spots.length < kit.count(14, 8) && tries < 60; tries++) {
    const x0 = (random() - 0.5) * 8.4;
    const y0 = -4.2 + random() * 8.4;
    if (Math.hypot(x0 - SKIN_SPOT.x, y0 - SKIN_SPOT.y) < 1.2) continue;
    if (Math.abs(x0) > 4.2 || y0 > 4.6) continue;
    let best = Infinity;
    let bx = x0;
    let by = y0;
    for (let i = 0; i <= 24; i++)
      for (let j = 0; j <= 24; j++) {
        const x = x0 + (i / 24 - 0.5) * 0.4;
        const y = y0 + (j / 24 - 0.5) * 0.4;
        const d = poreDistance(x, y);
        if (d < best) (best = d), (bx = x), (by = y);
      }
    if (best < 0.02 && spots.every(([x, y]) => Math.hypot(x - bx, y - by) > 1.1)) spots.push([bx, by]);
  }
  for (const [x, y] of spots) {
    const group = new THREE.Group();
    const size = 0.12 + random() * 0.09;
    group.position.set(x, y, padSurfaceZ(x, y));
    const drop = new THREE.Mesh(dropletGeometry, dropletMaterial);
    drop.rotation.x = Math.PI / 2;
    group.add(drop);
    const glint = new THREE.Sprite(shine);
    glint.position.set(-0.35, 0.35, 0.8);
    glint.scale.setScalar(0.7);
    group.add(glint);
    env.add(group);
    droplets.push({ mesh: group, phase: random() * Math.PI * 2, size });
  }

  /* Surroundings. */
  const glow = kit.glow("#8e9bff", 34, { opacity: 0.35, env: true });
  glow.position.set(0, 0, -8);
  env.add(glow);
  const motes: number[] = [];
  for (let i = 0; i < kit.count(50); i++)
    motes.push((random() - 0.5) * 30, (random() - 0.5) * 22, -3 - random() * 8);
  const moteCloud = kit.points(motes, { size: 0.14, color: "#d8ddff", opacity: 0.5, soft: 1, twinkle: 0.5, env: true });
  env.add(moteCloud);

  return {
    root,
    env,
    update({ time, immersion }) {
      (handCreaseMaterial as THREE.ShaderMaterial).uniforms.uOpacity.value = 1 - immersion;
      seam.value = 1 - immersion;
      for (const d of droplets) {
        const grow = 0.5 + 0.5 * Math.sin(time * 0.6 + d.phase);
        d.mesh.scale.setScalar(d.size * (0.35 + 0.65 * grow));
      }
      moteCloud.position.y = Math.sin(time * 0.2) * 0.2;
    },
  };
};

export default fingertip;
