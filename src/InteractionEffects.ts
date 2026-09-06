import * as T from "three";
import type { ExplorerState } from "./continuum";

/** Moving highlights guide the eye; they are not calculated particle trajectories. */
export function interactionEffects(scene: T.Scene) {
  const group = new T.Group();
  scene.add(group);
  const sphere = new T.SphereGeometry(1, 12, 8);
  const material = new T.MeshBasicMaterial({
    color: "#ffd59b",
    transparent: true,
    opacity: 0.9,
    depthTest: false,
  });
  const markers = Array.from({ length: 32 }, () => {
    const m = new T.Mesh(sphere, material);
    group.add(m);
    return m;
  });
  const haloGeo = new T.TorusGeometry(1, 0.012, 8, 80);
  const haloMat = new T.MeshBasicMaterial({
    color: "#eac386",
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
    depthTest: false,
  });
  const halos = Array.from({ length: 3 }, () => {
    const mesh = new T.Mesh(haloGeo, haloMat);
    group.add(mesh);
    return mesh;
  });
  function update(
    type: ExplorerState["interaction"],
    phase: number,
    time: number,
    center: T.Vector3,
    radius: number,
    paths: T.Vector3[][],
    quaternion: T.Quaternion,
  ) {
    group.visible = type !== "none";
    markers.forEach((m) => (m.visible = false));
    halos.forEach((m) => (m.visible = false));
    if (!group.visible) return;
    const pulse = 0.5 + 0.5 * Math.sin(time * 2.4);
    material.color.set(type === "higgs" ? "#c8b3e7" : "#ffd59b");
    haloMat.color.copy(material.color);
    if (
      phase > 0 &&
      ["photon", "nuclear", "higgs"].includes(type) &&
      (type !== "photon" || phase === 1)
    ) {
      for (let i = 0; i < halos.length; i++) {
        const h = halos[i];
        h.visible = true;
        h.position.copy(center);
        h.quaternion.copy(quaternion);
        h.scale.setScalar(
          radius * (1.07 + i * 0.1 + 0.035 * Math.sin(time * 2 + i)),
        );
      }
      haloMat.opacity = 0.14 + pulse * 0.2;
    }
    if (phase > 0 && paths.length) {
      for (let i = 0; i < Math.min(markers.length, paths.length * 2); i++) {
        const path = paths[Math.floor(i / 2) % paths.length];
        if (path.length < 2) continue;
        const u = ((time * 0.55 + i * 0.37) % 1) * (path.length - 1),
          index = Math.min(path.length - 2, Math.floor(u));
        const m = markers[i];
        m.visible = true;
        m.position.copy(path[index]).lerp(path[index + 1], u - index);
        m.scale.setScalar(
          radius * 0.035 * (0.8 + 0.2 * Math.sin(time * 3 + i)),
        );
      }
    }
  }
  return {
    update,
    dispose() {
      scene.remove(group);
      sphere.dispose();
      material.dispose();
      haloGeo.dispose();
      haloMat.dispose();
    },
  };
}
