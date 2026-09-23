/**
 * Reusable illustrated props: soft shadows, puffy clouds, stylised trees.
 * Everything is built through the scene's Kit so it is disposed with it.
 */
import * as THREE from "three";
import type { ColorLike, Kit } from "../../../engine/kit";
import { rng } from "../../../engine/kit";

let shadowTexture: THREE.Texture | null = null;
function sharedShadowTexture() {
  if (shadowTexture) return shadowTexture;
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const g = canvas.getContext("2d")!;
  const gradient = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.55, "rgba(255,255,255,0.55)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gradient;
  g.fillRect(0, 0, size, size);
  shadowTexture = new THREE.CanvasTexture(canvas);
  return shadowTexture;
}

/** A soft contact shadow lying flat in the XZ plane. */
export function contactShadow(
  kit: Kit,
  radius: number,
  options: { opacity?: number; color?: ColorLike; stretch?: number; env?: boolean } = {},
) {
  const material = kit.track(
    new THREE.MeshBasicMaterial({
      map: sharedShadowTexture(),
      color: new THREE.Color(options.color ?? "#1d1650"),
      transparent: true,
      opacity: options.opacity ?? 0.28,
      depthWrite: false,
    }),
  );
  const mesh = new THREE.Mesh(kit.geometry(new THREE.PlaneGeometry(2, 2)), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.scale.set(radius, radius * (options.stretch ?? 1), 1);
  mesh.renderOrder = -1;
  return mesh;
}

/** A puffy illustrated cloud made of overlapping spheres. */
export function cloud(
  kit: Kit,
  options: { size?: number; seed?: number; color?: ColorLike; shadow?: ColorLike; env?: boolean; puffs?: number } = {},
) {
  const random = rng(options.seed ?? 7);
  const size = options.size ?? 1;
  const group = new THREE.Group();
  const material = kit.toon(options.color ?? "#ffffff", {
    shadow: options.shadow ?? "#b9c8f2",
    rim: 0.25,
    rimColor: "#ffffff",
    gloss: 0.1,
    soft: 0.35,
    env: options.env,
  });
  const sphere = kit.geometry(new THREE.SphereGeometry(1, 24, 16));
  const puffs = options.puffs ?? 6;
  for (let i = 0; i < puffs; i++) {
    const t = i / (puffs - 1) - 0.5;
    const r = size * (0.42 + 0.35 * Math.sin(Math.PI * (i / (puffs - 1))) + random() * 0.12);
    const puff = new THREE.Mesh(sphere, material);
    puff.position.set(t * size * 2.4, r * 0.35 + random() * size * 0.1, (random() - 0.5) * size * 0.5);
    puff.scale.set(r, r * 0.92, r * 0.85);
    group.add(puff);
  }
  // Flat bottom.
  const base = new THREE.Mesh(sphere, material);
  base.scale.set(size * 1.45, size * 0.28, size * 0.55);
  group.add(base);
  return group;
}

export interface TreeOptions {
  height?: number;
  seed?: number;
  trunk?: ColorLike;
  leaves?: ColorLike[];
  /** "round" (deciduous) or "cone" (conifer). */
  kind?: "round" | "cone";
  env?: boolean;
}

/** A stylised tree standing on y = 0, `height` units tall. */
export function stylizedTree(kit: Kit, options: TreeOptions = {}) {
  const random = rng(options.seed ?? 3);
  const height = options.height ?? 2;
  const group = new THREE.Group();
  const trunkMaterial = kit.toon(options.trunk ?? "#8a5a3c", { rim: 0.2, env: options.env });
  const leaves = options.leaves ?? ["#3fae4a", "#58c957", "#2f9446"];
  if (options.kind === "cone") {
    const trunk = new THREE.Mesh(
      kit.geometry(new THREE.CylinderGeometry(height * 0.035, height * 0.05, height * 0.3, 8)),
      trunkMaterial,
    );
    trunk.position.y = height * 0.15;
    group.add(trunk);
    for (let i = 0; i < 3; i++) {
      const r = height * (0.3 - i * 0.07);
      const cone = new THREE.Mesh(
        kit.geometry(new THREE.ConeGeometry(r, height * 0.42, 9)),
        kit.toon(leaves[i % leaves.length], { rim: 0.3, env: options.env }),
      );
      cone.position.y = height * (0.38 + i * 0.2);
      cone.rotation.y = random() * Math.PI;
      group.add(cone);
    }
    return group;
  }
  const trunk = new THREE.Mesh(
    kit.geometry(new THREE.CylinderGeometry(height * 0.04, height * 0.065, height * 0.55, 10)),
    trunkMaterial,
  );
  trunk.position.y = height * 0.275;
  group.add(trunk);
  const canopy = new THREE.Group();
  canopy.position.y = height * 0.66;
  const puffs = 5;
  for (let i = 0; i < puffs; i++) {
    const angle = (i / puffs) * Math.PI * 2 + random();
    const r = height * (0.2 + random() * 0.08);
    const blob = new THREE.Mesh(
      kit.blob(1, { detail: 2, noise: 0.08, seed: i + (options.seed ?? 0) }),
      kit.toon(leaves[i % leaves.length], { rim: 0.35, env: options.env }),
    );
    blob.scale.setScalar(r);
    blob.position.set(
      Math.cos(angle) * height * 0.17,
      (random() - 0.3) * height * 0.14,
      Math.sin(angle) * height * 0.14,
    );
    canopy.add(blob);
  }
  const top = new THREE.Mesh(
    kit.blob(1, { detail: 2, noise: 0.08, seed: 11 + (options.seed ?? 0) }),
    kit.toon(leaves[0], { rim: 0.35, env: options.env }),
  );
  top.scale.setScalar(height * 0.26);
  top.position.y = height * 0.12;
  canopy.add(top);
  group.add(canopy);
  group.userData.canopy = canopy;
  return group;
}
