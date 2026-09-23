import * as THREE from "three";
import type { SceneBuilder } from "./types";

/** Shown while a scene is missing or failed to load, so navigation never breaks. */
const placeholder: SceneBuilder = ({ kit, level }) => {
  const root = new THREE.Group();
  const accent = level.theme.accent;
  const body = new THREE.Mesh(
    kit.blob(4, { noise: 0.1, seed: level.id.length }),
    kit.toon(accent, { rim: 0.6 }),
  );
  root.add(body, kit.glow(accent, 16, { opacity: 0.35 }));
  return {
    root,
    update({ time }) {
      body.rotation.y = time * 0.2;
    },
  };
};
export default placeholder;
