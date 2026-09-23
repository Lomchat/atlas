/**
 * A nucleosome (11 nm; 1 unit = 1.1 nm): eight histones (two each of H2A,
 * H2B, H3 and H4) with 147 bp of DNA wrapped 1.65 turns around them in a
 * left-handed superhelix. The DNA is drawn from the same base-pair frames as
 * the atomic `dna` child, which is anchored on the front gyre at the top.
 * Surroundings: linker DNA leading to the neighbouring nucleosomes.
 */
import * as THREE from "three";
import type { Kit } from "../../../engine/kit";
import { rng } from "../../../engine/kit";
import type { SceneBuilder } from "../types";
import { instances, merge, smoothPath, sweepGeometry, type Placement } from "./cell-shapes";
import { BASE_COLORS, basePair, sequence, type Frame } from "./dna-model";
import {
  HISTONE_COLORS,
  NEIGHBOURS,
  NUC,
  linkerPaths,
  octamerLobes,
  superhelixFrame,
  transportFrames,
  type Histone,
} from "./nucleosome-layout";

function octamer(kit: Kit, env: boolean) {
  const group = new THREE.Group();
  const random = rng(3);
  const blobs: Placement[] = octamerLobes().map((lobe) => ({
    position: lobe.position,
    quaternion: new THREE.Quaternion().setFromEuler(new THREE.Euler(random() * 6, random() * 6, random() * 6)),
    scale: new THREE.Vector3(1.5, 1.42, 1.28),
    color: HISTONE_COLORS[lobe.histone],
  }));
  group.add(
    instances(
      kit.blob(1, { detail: env ? 2 : 3, noise: 0.2, frequency: 2.6, seed: 13 }),
      kit.toon("#ffffff", { rim: 0.4, rimColor: "#fff4f8", gloss: 0.28, soft: 0.3, shadow: "#2b1a66", env }),
      blobs,
    ),
  );
  return group;
}

/** Cartoon double helix through a list of base-pair frames (index k → frame). */
function helixCartoon(kit: Kit, frames: { k: number; frame: Frame }[], env: boolean) {
  const strand1: THREE.Vector3[] = [];
  const strand2: THREE.Vector3[] = [];
  const rungs: Placement[] = [];
  const up = new THREE.Vector3(0, 1, 0);
  for (const { k, frame } of frames) {
    const base = sequence(k);
    const pair = basePair(base, k, frame, NUC.scale);
    strand1.push(pair.p1);
    strand2.push(pair.p2);
    const mid = pair.c1.clone().lerp(pair.c2, 0.5);
    for (const [from, color] of [
      [pair.c1, BASE_COLORS[base]],
      [pair.c2, BASE_COLORS[({ A: "T", T: "A", G: "C", C: "G" } as const)[base]]],
    ] as const) {
      const d = mid.clone().sub(from);
      rungs.push({
        position: from.clone().lerp(mid, 0.5),
        quaternion: new THREE.Quaternion().setFromUnitVectors(up, d.clone().normalize()),
        scale: new THREE.Vector3(0.13, d.length(), 0.13),
        color,
      });
    }
  }
  const group = new THREE.Group();
  const tubes = [strand1, strand2].map((points) =>
    sweepGeometry(smoothPath(points, points.length * 3), { ra: 0.2, radial: 8, caps: true }),
  );
  group.add(
    new THREE.Mesh(merge(kit, tubes), kit.toon("#ffa62b", { rim: 0.4, rimColor: "#ffe2a8", gloss: 0.4, shadow: "#c2453a", env })),
    instances(
      kit.geometry(new THREE.CylinderGeometry(1, 1, 1, 8)),
      kit.toon("#ffffff", { rim: 0.2, gloss: 0.25, shadow: "#4a3a9a", env }),
      rungs,
    ),
  );
  return group;
}

/** Octamer + wrapped DNA (bp 0–146), used for this nucleosome and its neighbours. */
function core(kit: Kit, env: boolean) {
  const group = octamer(kit, env);
  const frames = Array.from({ length: NUC.bp }, (_, k) => ({ k, frame: superhelixFrame(k) }));
  group.add(helixCartoon(kit, frames, env));
  return group;
}

const nucleosome: SceneBuilder = ({ kit }) => {
  const root = new THREE.Group();
  const env = new THREE.Group();

  root.add(core(kit, false));

  /* ---------------- Histone tails: flexible, wiggling ends ---------------- */
  const tailRandom = rng(5);
  const tails: { mesh: THREE.Mesh; phase: number; axis: THREE.Vector3 }[] = [];
  // N-terminal tails leave each histone outwards (the top-front one bends aside, clear of the DNA above).
  const tailSpecs: { histone: Histone; from: THREE.Vector3; to: THREE.Vector3 }[] = octamerLobes().map((lobe) => {
    const radial = new THREE.Vector3(lobe.position.x, lobe.position.y, 0).normalize();
    let out = radial.clone().multiplyScalar(0.55).add(new THREE.Vector3(0, 0, lobe.layer * 0.9)).normalize();
    if (lobe.histone === "H2B") out = new THREE.Vector3(lobe.layer * 0.9, 0.2, lobe.layer * 0.6).normalize();
    if (lobe.histone === "H3") out = new THREE.Vector3(lobe.layer * -0.55, -0.8, lobe.layer * 0.35).normalize();
    const from = lobe.position.clone().addScaledVector(out, 1.1);
    return { histone: lobe.histone, from, to: from.clone().addScaledVector(out, 3.2) };
  });
  for (const spec of tailSpecs) {
    const control: THREE.Vector3[] = [];
    const n = 6;
    const side = new THREE.Vector3().subVectors(spec.to, spec.from).cross(new THREE.Vector3(0, 0, 1)).normalize();
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      control.push(
        spec.from
          .clone()
          .lerp(spec.to, t)
          .addScaledVector(side, Math.sin(t * Math.PI * 2 + tailRandom() * 0.5) * 0.35 * t),
      );
    }
    // Build the tail around its base so it can sway as a whole.
    const local = smoothPath(control, 36).map((p) => p.sub(spec.from));
    const mesh = new THREE.Mesh(
      kit.geometry(sweepGeometry(local, { ra: (t) => 0.24 * (1 - t) + 0.09, radial: 8, caps: true })),
      kit.toon(new THREE.Color(HISTONE_COLORS[spec.histone]).lerp(new THREE.Color("#ffffff"), 0.12), {
        rim: 0.45,
        gloss: 0.3,
      }),
    );
    mesh.position.copy(spec.from);
    root.add(mesh);
    tails.push({ mesh, phase: tailRandom() * Math.PI * 2, axis: side.clone() });
  }

  /* ---------------- Linker DNA ---------------- */
  const paths = linkerPaths();
  const beforeFrames = transportFrames(paths.before, superhelixFrame(0), true).map((frame, i) => ({ k: -i, frame }));
  const afterFrames = transportFrames(paths.after, superhelixFrame(NUC.bp - 1)).map((frame, i) => ({
    k: NUC.bp - 1 + i,
    frame,
  }));
  const stub = 9;
  // Short stubs belong to the nucleosome; the rest of each linker is surroundings.
  root.add(helixCartoon(kit, beforeFrames.slice(0, stub).reverse(), false));
  root.add(helixCartoon(kit, afterFrames.slice(0, stub), false));
  env.add(helixCartoon(kit, beforeFrames.slice(stub - 1).reverse(), true));
  env.add(helixCartoon(kit, afterFrames.slice(stub - 1), true));

  /* ---------------- Neighbouring nucleosomes ---------------- */
  for (const neighbour of [NEIGHBOURS.before, NEIGHBOURS.after]) {
    const group = core(kit, true);
    group.position.copy(neighbour.position);
    group.quaternion.copy(neighbour.quaternion);
    env.add(group);
  }
  // Their other linkers run on out of view.
  const outward = (neighbour: typeof NEIGHBOURS.before, bp: number, direction: 1 | -1) => {
    const frame = superhelixFrame(bp);
    const points: THREE.Vector3[] = [];
    for (let i = 0; i < 34; i++)
      points.push(frame.origin.clone().addScaledVector(frame.T, direction * i * 3.38 * NUC.scale).add(new THREE.Vector3(0, -0.02 * i * i * 0.1, 0)));
    const frames = transportFrames(points, frame, direction < 0).map((f, i) => ({
      k: bp + direction * i,
      frame: {
        origin: f.origin.applyQuaternion(neighbour.quaternion).add(neighbour.position),
        T: f.T.applyQuaternion(neighbour.quaternion),
        U: f.U.applyQuaternion(neighbour.quaternion),
        W: f.W.applyQuaternion(neighbour.quaternion),
      },
    }));
    env.add(helixCartoon(kit, direction < 0 ? frames.reverse() : frames, true));
  };
  outward(NEIGHBOURS.before, 0, -1);
  outward(NEIGHBOURS.after, NUC.bp - 1, 1);

  // Nucleoplasm: water, ions and small proteins drifting by.
  const dustRandom = rng(21);
  const dust: number[] = [];
  const sizes: number[] = [];
  for (let k = 0; k < kit.count(150, 70); k++) {
    dust.push((dustRandom() * 2 - 1) * 14, (dustRandom() * 2 - 1) * 9, -9 + dustRandom() * 13);
    sizes.push(0.5 + dustRandom());
  }
  const dustPoints = kit.points(dust, { size: 0.13, sizes, color: "#a9c8ff", opacity: 0.45, soft: 0.6, twinkle: 0.4, env: true });
  env.add(dustPoints);
  const glow = kit.glow("#6f7bff", 24, { opacity: 0.22, env: true });
  glow.position.set(0, 0, -8);
  env.add(glow);

  const q = new THREE.Quaternion();
  return {
    root,
    env,
    update({ time }) {
      for (const tail of tails) {
        tail.mesh.quaternion.setFromAxisAngle(tail.axis, Math.sin(time * 1.3 + tail.phase) * 0.18);
        tail.mesh.quaternion.multiply(q.setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.sin(time * 0.9 + tail.phase * 2) * 0.1));
      }
      dustPoints.position.set(Math.sin(time * 0.1) * 0.4, Math.sin(time * 0.13) * 0.3, 0);
    },
  };
};

export default nucleosome;
