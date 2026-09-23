/**
 * "You": a friendly illustrated character (1 unit = 17.5 cm, feet at y = −5).
 * The raised hand is the child level "hand", anchored at HAND_CENTER: this
 * scene draws the arm up to the wrist only.
 */
import * as THREE from "three";
import type { Kit } from "../../../engine/kit";
import { rng } from "../../../engine/kit";
import type { SceneBuilder } from "../types";
import { contactShadow } from "../common/props";

export const SKIN = "#e8a07a";
const SHIRT = "#ff7a59";
const PANTS = "#3d3f8f";
const HAIR = "#3b2417";

/** A capsule from `a` to `b`. */
function limb(kit: Kit, a: THREE.Vector3, b: THREE.Vector3, radius: number, material: THREE.Material) {
  const length = a.distanceTo(b);
  const mesh = new THREE.Mesh(kit.geometry(new THREE.CapsuleGeometry(radius, length, 6, 16)), material);
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  return mesh;
}

const person: SceneBuilder = ({ kit, children }) => {
  const root = new THREE.Group();
  const env = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const skin = kit.toon(SKIN, { rim: 0.3, rimColor: "#ffd9c2" });
  const shirt = kit.toon(SHIRT, { rim: 0.35, rimColor: "#ffc2a8" });
  const pants = kit.toon(PANTS, { rim: 0.35, rimColor: "#8f93ff" });
  const shoes = kit.toon("#f6f3ff", { rim: 0.2, shadow: "#a9a3d6" });
  const soles = kit.toon("#2d2466", { rim: 0.1 });
  const hair = kit.toon(HAIR, { rim: 0.35, rimColor: "#8a5a3c", gloss: 0.35 });
  const dark = kit.flat("#241a4a");

  // Legs and shoes.
  for (const side of [-1, 1]) {
    body.add(limb(kit, new THREE.Vector3(side * 0.55, -0.6, 0), new THREE.Vector3(side * 0.62, -4.25, 0), 0.5, pants));
    const shoe = new THREE.Mesh(kit.geometry(new THREE.CapsuleGeometry(0.42, 0.55, 6, 14)), shoes);
    shoe.rotation.x = Math.PI / 2;
    shoe.scale.set(1.05, 1, 0.85);
    shoe.position.set(side * 0.66, -4.62, 0.28);
    body.add(shoe);
    const sole = new THREE.Mesh(kit.geometry(new THREE.CylinderGeometry(0.44, 0.44, 0.14, 16)), soles);
    sole.scale.set(1.05, 1, 1.9);
    sole.position.set(side * 0.66, -4.93, 0.28);
    body.add(sole);
  }
  // Hips.
  const hips = new THREE.Mesh(kit.geometry(new THREE.CapsuleGeometry(1.08, 0.3, 6, 18)), pants);
  hips.rotation.z = Math.PI / 2;
  hips.scale.set(0.95, 1, 0.62);
  hips.position.y = -0.55;
  body.add(hips);

  // Torso (a rounded shirt).
  const torso = new THREE.Group();
  torso.position.y = -0.3;
  body.add(torso);
  const chest = new THREE.Mesh(kit.geometry(new THREE.CapsuleGeometry(1.22, 1.55, 8, 24)), shirt);
  chest.scale.set(1, 1, 0.64);
  chest.position.y = 1.55;
  torso.add(chest);
  // Collar and a small pocket stripe for character.
  const collar = new THREE.Mesh(kit.geometry(new THREE.TorusGeometry(0.42, 0.09, 8, 24)), kit.toon("#ffd23f", { rim: 0.2 }));
  collar.rotation.x = Math.PI / 2 - 0.25;
  collar.position.set(0, 3.08, 0.12);
  torso.add(collar);
  const pocket = new THREE.Mesh(kit.geometry(new THREE.CircleGeometry(0.28, 20)), kit.flat("#ffd23f"));
  pocket.position.set(-0.55, 2.05, 0.8);
  pocket.rotation.y = -0.15;
  torso.add(pocket);

  // Neck and head.
  const neck = new THREE.Mesh(kit.geometry(new THREE.CylinderGeometry(0.3, 0.34, 0.6, 14)), skin);
  neck.position.y = 3.05;
  body.add(neck);
  const head = new THREE.Group();
  head.position.y = 4.05;
  body.add(head);
  const skull = new THREE.Mesh(kit.geometry(new THREE.SphereGeometry(0.95, 32, 24)), skin);
  skull.scale.set(1, 1.02, 0.96);
  head.add(skull);
  const hairCap = new THREE.Mesh(kit.geometry(new THREE.SphereGeometry(1, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.55)), hair);
  hairCap.scale.set(1.0, 0.98, 1.0);
  hairCap.rotation.x = -0.28;
  hairCap.position.set(0, 0.06, -0.06);
  head.add(hairCap);
  const fringe = new THREE.Mesh(kit.blob(1, { detail: 2, noise: 0.12, seed: 5 }), hair);
  fringe.scale.set(0.62, 0.26, 0.4);
  fringe.position.set(0.25, 0.62, 0.62);
  fringe.rotation.z = -0.3;
  head.add(fringe);
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(kit.geometry(new THREE.SphereGeometry(0.2, 12, 10)), skin);
    ear.scale.set(0.6, 1, 0.8);
    ear.position.set(side * 0.93, -0.02, 0);
    head.add(ear);
  }
  const eyes: THREE.Mesh[] = [];
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(kit.geometry(new THREE.SphereGeometry(0.11, 12, 10)), dark);
    eye.scale.set(0.85, 1.25, 0.5);
    eye.position.set(side * 0.33, 0.08, 0.88);
    head.add(eye);
    eyes.push(eye);
    const cheek = new THREE.Mesh(kit.geometry(new THREE.CircleGeometry(0.15, 16)), kit.flat("#ff8f9a", { opacity: 0.8 }));
    cheek.position.set(side * 0.55, -0.2, 0.79);
    cheek.rotation.y = side * 0.55;
    head.add(cheek);
  }
  const smile = new THREE.Mesh(kit.geometry(new THREE.TorusGeometry(0.22, 0.045, 8, 20, Math.PI)), dark);
  smile.rotation.z = Math.PI;
  smile.position.set(0, -0.2, 0.9);
  head.add(smile);

  // Arms: the left one relaxed, the right one raised in a wave up to the wrist.
  const handAnchor = children.find((child) => child.id === "hand");
  const handCenter = new THREE.Vector3(...(handAnchor?.at ?? [2.7, 4.6, 0.3]));
  const handRadius = handAnchor?.radius ?? 0.54;
  const wrist = handCenter.clone().add(new THREE.Vector3(-0.08, -handRadius * 0.92, -0.02));
  const shoulderR = new THREE.Vector3(1.28, 2.45, 0);
  const elbowR = new THREE.Vector3(2.35, 2.95, 0.25);
  body.add(limb(kit, shoulderR, elbowR, 0.4, shirt));
  body.add(limb(kit, elbowR, wrist, 0.33, skin));
  const shoulderL = new THREE.Vector3(-1.28, 2.45, 0);
  const elbowL = new THREE.Vector3(-1.62, 0.75, 0.1);
  const wristL = new THREE.Vector3(-1.72, -0.75, 0.25);
  body.add(limb(kit, shoulderL, elbowL, 0.4, shirt));
  body.add(limb(kit, elbowL, wristL, 0.33, skin));
  const mitten = new THREE.Mesh(kit.blob(1, { detail: 2, noise: 0.05, seed: 8 }), skin);
  mitten.scale.set(0.34, 0.5, 0.26);
  mitten.position.set(-1.74, -1.15, 0.28);
  body.add(mitten);

  const shadow = contactShadow(kit, 2.2, { opacity: 0.25, stretch: 0.55 });
  shadow.position.y = -4.99;
  root.add(shadow);

  /* Surroundings: a patch of lawn and a few flowers under the feet. */
  const lawnTexture = kit.canvasTexture(256, 256, (g, w, h) => {
    const gradient = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    gradient.addColorStop(0, "rgba(98, 205, 92, 1)");
    gradient.addColorStop(0.6, "rgba(84, 190, 84, 0.9)");
    gradient.addColorStop(1, "rgba(84, 190, 84, 0)");
    g.fillStyle = gradient;
    g.fillRect(0, 0, w, h);
  });
  const lawn = new THREE.Mesh(kit.geometry(new THREE.CircleGeometry(9, 64)), kit.textured(lawnTexture, { env: true, rim: 0, gloss: 0, flat: 0.4, depthWrite: false }));
  lawn.rotation.x = -Math.PI / 2;
  lawn.position.y = -5.02;
  env.add(lawn);
  const random = rng(5);
  const flowerColors = ["#ffd23f", "#ff6fb1", "#ffffff", "#c9b3ff"];
  const tuft = kit.geometry(new THREE.ConeGeometry(0.09, 0.45, 5));
  const tuftMaterial = kit.toon("#2f9a45", { env: true, rim: 0.2 });
  for (let i = 0; i < 40; i++) {
    const angle = random() * Math.PI * 2;
    const radius = 1.6 + random() * 5.5;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius * 0.8;
    const blade = new THREE.Mesh(tuft, tuftMaterial);
    blade.position.set(x, -4.8, z);
    blade.rotation.z = (random() - 0.5) * 0.5;
    env.add(blade);
    if (i % 3 === 0) {
      const flower = new THREE.Mesh(
        kit.geometry(new THREE.IcosahedronGeometry(0.13, 1)),
        kit.toon(flowerColors[i % flowerColors.length], { env: true, rim: 0.2 }),
      );
      flower.position.set(x + 0.2, -4.72, z + 0.1);
      env.add(flower);
    }
  }

  let nextBlink = 2;
  return {
    root,
    env,
    update({ time }) {
      const breath = Math.sin(time * 1.6);
      torso.scale.set(1 + breath * 0.008, 1 + breath * 0.012, 1 + breath * 0.008);
      head.rotation.z = Math.sin(time * 0.7) * 0.04;
      head.rotation.y = Math.sin(time * 0.43) * 0.08;
      head.position.y = 4.05 + breath * 0.03;
      const blinkPhase = time - nextBlink;
      if (blinkPhase > 0.14) nextBlink = time + 2.5 + ((time * 7.3) % 2.2);
      const closed = blinkPhase > 0 && blinkPhase < 0.14;
      for (const eye of eyes) eye.scale.y = closed ? 0.15 : 1.25;
    },
  };
};

export default person;
