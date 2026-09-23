import * as THREE from "three";
import type { LevelData } from "../levels/types";

export const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export const smootherstep = (x: number) => {
  const t = clamp01(x);
  return t * t * t * (t * (t * 6 - 15) + 10);
};
export const easeInOut = (x: number) => {
  const t = clamp01(x);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

const DEG = Math.PI / 180;

/**
 * A similarity transform in double precision: x ↦ pos + scale · rot · x.
 * Used to express every level in the local frame of the current level.
 */
export class Similarity {
  pos = new THREE.Vector3();
  rot = new THREE.Quaternion();
  scale = 1;

  set(pos: THREE.Vector3, rot: THREE.Quaternion, scale: number) {
    this.pos.copy(pos);
    this.rot.copy(rot);
    this.scale = scale;
    return this;
  }
  copy(other: Similarity) {
    return this.set(other.pos, other.rot, other.scale);
  }
  identity() {
    this.pos.set(0, 0, 0);
    this.rot.identity();
    this.scale = 1;
    return this;
  }
  /** this ∘ other */
  compose(other: Similarity, target = new Similarity()) {
    const pos = other.pos
      .clone()
      .applyQuaternion(this.rot)
      .multiplyScalar(this.scale)
      .add(this.pos);
    const rot = this.rot.clone().multiply(other.rot);
    return target.set(pos, rot, this.scale * other.scale);
  }
  inverse(target = new Similarity()) {
    const rot = this.rot.clone().invert();
    const pos = this.pos
      .clone()
      .negate()
      .applyQuaternion(rot)
      .multiplyScalar(1 / this.scale);
    return target.set(pos, rot, 1 / this.scale);
  }
  apply(point: THREE.Vector3, target = new THREE.Vector3()) {
    return target
      .copy(point)
      .applyQuaternion(this.rot)
      .multiplyScalar(this.scale)
      .add(this.pos);
  }
}

/** Child local → parent local, from the child's anchor. */
export function anchorTransform(child: LevelData, parent: LevelData) {
  const t = new Similarity();
  const at = child.anchor?.at ?? [0, 0, 0];
  const r = child.anchor?.rotate ?? [0, 0, 0];
  t.pos.set(at[0], at[1], at[2]);
  t.rot.setFromEuler(new THREE.Euler(r[0] * DEG, r[1] * DEG, r[2] * DEG, "XYZ"));
  t.scale = child.size / parent.size;
  return t;
}

/** World rotation of a level at its home view. */
export function homeRotation(level: LevelData) {
  const pitch = (level.view?.pitch ?? 0) * DEG;
  const yaw = (level.view?.yaw ?? 0) * DEG;
  return new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch, yaw, 0, "XYZ"));
}
