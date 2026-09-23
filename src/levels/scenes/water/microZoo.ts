/**
 * The microscopic zoo inside the drop (1 unit = 50 µm).
 * The tardigrade is the subject (it is what you can spot inside the drop);
 * paramecia, a Volvox colony, diatoms and a desmid swim around it once you
 * are inside. The child level "bacteria" is anchored on a crumb of organic
 * debris where bacteria cluster, drawn by its own scene.
 */
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { rng } from "../../../engine/kit";
import type { SceneBuilder } from "../types";
import { closterium, diatoms, euglenas, paramecium, tardigrade, volvox, type DiatomSpec } from "./creatures";

const microZoo: SceneBuilder = ({ kit, children }) => {
  const root = new THREE.Group();
  const env = new THREE.Group();
  const random = rng(77);

  const bacteriaChild = children.find((child) => child.id === "bacteria");
  const bacteriaAt = new THREE.Vector3(...(bacteriaChild?.at ?? [3.7, -3.1, 1.6]));

  /* The tardigrade, paddling in place. */
  const bear = tardigrade(kit, 6.4);
  const bearHolder = new THREE.Group();
  bearHolder.add(bear.group);
  bearHolder.position.set(-0.9, 0.2, 0);
  bearHolder.rotation.set(0.12, -0.42, 0.08);
  root.add(bearHolder);

  /* ---------------- Surroundings (fade in once inside) ---------------- */
  const paramA = paramecium(kit, { length: 4.2, seed: 3, env: true });
  const paramB = paramecium(kit, { length: 4.0, seed: 9, cilia: kit.count(260, 140), env: true });
  env.add(paramA.group, paramB.group);

  const colony = volvox(kit, 2.2, true);
  colony.group.position.set(-7.4, 3.6, -4.5);
  env.add(colony.group);

  const desmid = closterium(kit, 3.8, true);
  desmid.group.position.set(-2.6, 4.9, -2.5);
  desmid.group.rotation.set(0.3, 0.4, -0.35);
  env.add(desmid.group);

  const diatomSpecs: DiatomSpec[] = [
    { kind: "pennate", at: new THREE.Vector3(4.8, 0.2, 0.8), size: 1.25, spin: 0.35, phase: 0, drift: 0.25 },
    { kind: "pennate", at: new THREE.Vector3(-4.6, -1.9, 1.5), size: 1.0, spin: -0.3, phase: 2, drift: 0.2 },
    { kind: "pennate", at: new THREE.Vector3(1.6, 4.2, -3.5), size: 1.1, spin: 0.25, phase: 4, drift: 0.3 },
    { kind: "pennate", at: new THREE.Vector3(-9.5, -1.2, -3), size: 1.2, spin: 0.2, phase: 1, drift: 0.3 },
    { kind: "centric", at: new THREE.Vector3(1.4, -4.3, 1.2), size: 1.3, spin: 0.3, phase: 1, drift: 0.2 },
    { kind: "centric", at: new THREE.Vector3(-6.8, 0.9, 0.5), size: 0.9, spin: -0.25, phase: 3, drift: 0.2 },
    { kind: "centric", at: new THREE.Vector3(8.6, 2.6, -3), size: 1.1, spin: 0.2, phase: 5, drift: 0.25 },
    { kind: "centric", at: new THREE.Vector3(10.5, -4.8, -2), size: 0.8, spin: 0.35, phase: 2, drift: 0.2 },
  ];
  const glassy = diatoms(kit, diatomSpecs, { env: true, star: new THREE.Vector3(7.6, -2.2, -2.2) });
  env.add(glassy.group);

  const swimmers = euglenas(
    kit,
    [
      { at: new THREE.Vector3(-3.2, -4.6, -0.8), heading: 0.3, phase: 0 },
      { at: new THREE.Vector3(2.4, 2.3, -2.6), heading: 2.6, phase: 1.7 },
      { at: new THREE.Vector3(-9.2, -4.2, -2.2), heading: -0.5, phase: 3.1 },
      { at: new THREE.Vector3(9.6, 5.0, -3), heading: 3.5, phase: 4.4 },
      { at: new THREE.Vector3(-1.2, 5.6, -3.4), heading: 1.2, phase: 2.2 },
    ],
    1.15,
    true,
  );
  env.add(swimmers.group);

  /* A crumb of organic debris covered in bacteria: the way into the next level. */
  const crumb = new THREE.Mesh(
    kit.blob(1, { detail: 3, noise: 0.35, frequency: 2.2, seed: 12, stretch: [1.2, 0.75, 0.9] }),
    kit.toon("#b98a5a", { shadow: "#6a3f5a", rim: 0.45, rimColor: "#ffd9a8", gloss: 0.1, env: true }),
  );
  crumb.scale.setScalar(0.75);
  // The anchor floats in the cloud of bacteria just off the crumb, not on its face.
  crumb.position.copy(bacteriaAt).add(new THREE.Vector3(0.9, -0.55, -1.4));
  crumb.rotation.set(0.4, 0.8, 0.2);
  env.add(crumb);
  // Bacteria too small to see individually here: a fizz of tiny dots on and around the crumb.
  const fizz: number[] = [];
  const fizzColors: number[] = [];
  const lime = new THREE.Color("#c8ff7a");
  const pink = new THREE.Color("#ff9ad0");
  for (let i = 0; i < kit.count(260, 140); i++) {
    const dir = new THREE.Vector3(random() - 0.5, random() - 0.5, random() - 0.5).normalize();
    const d = 0.7 + Math.pow(random(), 2) * 1.6;
    const at = crumb.position.clone().addScaledVector(dir, d);
    if (at.distanceTo(bacteriaAt) < 0.18) continue;
    fizz.push(at.x, at.y, at.z);
    const c = random() > 0.8 ? pink : lime;
    fizzColors.push(c.r, c.g, c.b);
  }
  // Capped on screen: the real bacteria take over (next level) as you dive in.
  const bacteriaDots = kit.points(fizz, { size: 0.07, colors: fizzColors, twinkle: 0.5, env: true, maxPx: 5 });
  env.add(bacteriaDots);

  /* Drifting particles and soft light from above. */
  const dust: number[] = [];
  const dustSizes: number[] = [];
  for (let i = 0; i < kit.count(240, 120); i++) {
    dust.push((random() * 2 - 1) * 15, (random() * 2 - 1) * 9, -9 + random() * 13);
    dustSizes.push(0.4 + random() * 1.6);
  }
  const particles = kit.points(dust, { size: 0.12, sizes: dustSizes, color: "#bff8ee", soft: 0.7, opacity: 0.5, twinkle: 0.3, env: true, maxPx: 22 });
  env.add(particles);
  const blur: number[] = [];
  for (let i = 0; i < 9; i++) blur.push((random() * 2 - 1) * 12, (random() * 2 - 1) * 7, 5 + random() * 3);
  env.add(kit.points(blur, { size: 1.4, color: "#9ff6e0", soft: 1, opacity: 0.18, env: true }));

  const rayTexture = kit.canvasTexture(64, 256, (g, w, h) => {
    const gradient = g.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, "rgba(255,255,255,0.9)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gradient;
    g.fillRect(0, 0, w, h);
    const side = g.createLinearGradient(0, 0, w, 0);
    side.addColorStop(0, "rgba(0,0,0,1)");
    side.addColorStop(0.5, "rgba(0,0,0,0)");
    side.addColorStop(1, "rgba(0,0,0,1)");
    g.globalCompositeOperation = "destination-out";
    g.fillStyle = side;
    g.fillRect(0, 0, w, h);
  });
  // Five light shafts merged into one mesh.
  const shafts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 5; i++) {
    const shaft = new THREE.PlaneGeometry(2.2 + random() * 2.5, 24);
    shaft.rotateZ(-0.35 + random() * 0.1);
    shaft.translate(-10 + i * 5 + random() * 2, 4, -8 + random() * 3);
    shafts.push(shaft);
  }
  const merged = kit.geometry(mergeGeometries(shafts));
  shafts.forEach((shaft) => shaft.dispose());
  const rayMaterial = kit.track(
    new THREE.MeshBasicMaterial({
      map: rayTexture,
      color: "#bffff0",
      transparent: true,
      opacity: 0.1,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  const rays = new THREE.Mesh(merged, rayMaterial);
  env.add(rays);

  // Paramecium A swims slowly on the spot, so its hotspot stays on it.
  const pathA = (t: number) => new THREE.Vector3(5.2 - t * 0.8, 3.1 + Math.sin(t * 1.3) * 0.25, -1.2 + Math.sin(t * 0.9) * 0.3);
  const pathB = (t: number) => new THREE.Vector3(-6.2 + Math.cos(t) * 2.6, -4.3 + Math.sin(t * 1.5) * 0.5, -3.4 + Math.sin(t) * 0.4);
  const place = (group: THREE.Object3D, path: (t: number) => THREE.Vector3, t: number, roll: number) => {
    const at = path(t);
    const ahead = path(t + 0.02);
    group.position.copy(at);
    const dir = ahead.sub(at).normalize();
    group.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir);
    group.rotateX(roll);
  };

  return {
    root,
    env,
    update({ time, immersion }) {
      bear.update(time);
      bear.group.position.set(Math.sin(time * 0.4) * 0.15, Math.sin(time * 0.7) * 0.12, 0);
      bear.group.rotation.z = Math.sin(time * 0.5) * 0.04;
      if (immersion > 0.004) {
        // Back and forth over about 1.2 units: the cell reverses like real paramecia do.
        const tA = Math.sin(time * 0.12) * 0.75;
        const heading = Math.cos(time * 0.12) >= 0 ? 1 : -1;
        place(paramA.group, pathA, tA, time * 1.3);
        if (heading < 0) paramA.group.rotateY(Math.PI);
        paramA.update(time);
        place(paramB.group, pathB, time * 0.07 + 1.4, -time * 1.1);
        paramB.update(time + 1);
        colony.update(time);
        desmid.update(time);
        desmid.group.rotation.z = -0.35 + Math.sin(time * 0.2) * 0.08;
        glassy.update(time);
        swimmers.update(time);
        crumb.rotation.y = 0.8 + Math.sin(time * 0.15) * 0.05;
        particles.position.y = Math.sin(time * 0.1) * 0.3;
        particles.position.x = time * 0.05 - Math.floor(time * 0.05 / 2) * 2;
        rayMaterial.opacity = (0.09 + 0.03 * Math.sin(time * 0.3)) * immersion;
        rays.position.x = Math.sin(time * 0.07) * 0.6;
      }
    },
  };
};

export default microZoo;
