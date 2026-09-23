/**
 * Chlorophyll a (10 units = 2 nm; 1 unit = 2 Å), ball-and-stick with the
 * shared element colours: the chlorin ring faces the camera, four nitrogens
 * hold the central magnesium (the `mg-atom` child, drawn by its own scene at
 * the anchor), and the phytyl tail curls below.
 *
 * Light show: red and blue photons are absorbed (the ring lights up), a green
 * photon bounces off. The ring never moves; only the tail sways a little.
 * Seen from the photosystem, a soft green glow makes it read like the other
 * glowing pigments there.
 */
import * as THREE from "three";
import { rng } from "../../../engine/kit";
import type { Kit } from "../../../engine/kit";
import type { SceneBuilder } from "../types";
import { ELEMENT_RADII, molecule } from "../common/molecules";
import { chlorophyllA } from "./chlorophyllModel";
import { chlorophyllTileTexture } from "./chloroplastShared";

/** Units per ångström. */
const SCALE = 0.5;
const ATOM_SCALE = 0.3;
const BOND_RADIUS = 0.075;
const PERIOD = 6.6;

interface Photon {
  color: string;
  from: THREE.Vector3;
  /** Where it meets the ring (relative to Mg). */
  hit: THREE.Vector3;
  phase: number;
  absorbed: boolean;
  wavelength: number;
}

function wave(kit: Kit, color: string, wavelength: number) {
  const points: number[] = [];
  const length = 4.5;
  const steps = 90;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const envelope = Math.sin(Math.PI * Math.min(1, t * 1.15));
    points.push(Math.sin((t * length * Math.PI * 2) / wavelength) * 0.32 * envelope, 0, -t * length);
  }
  const line = kit.line(points, { color, width: 3.5, opacity: 0 });
  line.renderOrder = 9;
  return line;
}

const chlorophyll: SceneBuilder = ({ kit, children }) => {
  const root = new THREE.Group();
  const env = new THREE.Group();
  const random = rng(5572);
  const mgChild = children.find((child) => child.id.endsWith("atom"));
  const mg = new THREE.Vector3(...(mgChild?.at ?? [-1.1, 1.7, 0]));

  /* ---------------- The molecule ---------------- */
  const model = chlorophyllA();
  const base = model.atoms.map((atom) => atom.position.clone().multiplyScalar(SCALE).add(mg));
  const mol = molecule(
    kit,
    model.atoms.map((atom, i) => ({ symbol: atom.symbol, position: base[i].clone() })),
    model.bonds,
    { atomScale: ATOM_SCALE, bondRadius: BOND_RADIUS },
  );
  root.add(mol);

  // Instance bookkeeping, to let the tail sway (molecule() groups atoms by element).
  const meshes = new Map<string, THREE.InstancedMesh>();
  let bondMesh: THREE.InstancedMesh | null = null;
  for (const child of mol.children) {
    const mesh = child as THREE.InstancedMesh;
    if (mesh.userData.symbol) meshes.set(mesh.userData.symbol as string, mesh);
    else bondMesh = mesh;
  }
  const rank: number[] = [];
  const seen = new Map<string, number>();
  for (const atom of model.atoms) {
    const k = seen.get(atom.symbol) ?? 0;
    rank.push(k);
    seen.set(atom.symbol, k + 1);
  }
  const tailAtoms = model.atoms.map((atom, i) => (atom.tail >= 0 ? i : -1)).filter((i) => i >= 0);
  const tailBonds = model.bonds
    .map((bond, k) => (model.atoms[bond[0]].tail >= 0 || model.atoms[bond[1]].tail >= 0 ? k : -1))
    .filter((k) => k >= 0);
  const current = base.map((p) => p.clone());

  /* ---------------- Seen from the photosystem: a glowing green pigment ---------------- */
  // Same tile as the other antenna pigments there (radius 0.21 photosystem units).
  const tileMaterial = kit.textured(chlorophyllTileTexture(kit), {
    rim: 0,
    gloss: 0.2,
    soft: 0.6,
    flat: 0.45,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  }) as THREE.ShaderMaterial;
  const tileDisc = new THREE.Mesh(kit.geometry(new THREE.CircleGeometry(2.8, 40)), tileMaterial);
  // In front of the ring: from afar the pigment reads as a green tile, then clears.
  tileDisc.position.copy(mg).setZ(mg.z + 0.9);
  tileDisc.renderOrder = 5;
  root.add(tileDisc);
  const pigmentGlow = kit.glow("#9dff7a", 9, { opacity: 0 });
  pigmentGlow.position.copy(mg).setZ(mg.z - 0.6);
  root.add(pigmentGlow);

  /* ---------------- Excitation: the ring lights up ---------------- */
  // A luminous ring behind the chlorin while it is excited.
  const ringTexture = kit.canvasTexture(128, 128, (g, w, h) => {
    const gradient = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    gradient.addColorStop(0, "rgba(255,255,255,0.25)");
    gradient.addColorStop(0.42, "rgba(255,255,255,0.55)");
    gradient.addColorStop(0.6, "rgba(255,255,255,1)");
    gradient.addColorStop(0.78, "rgba(255,255,255,0.35)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gradient;
    g.fillRect(0, 0, w, h);
  });
  const ringGlowMaterial = kit.track(
    new THREE.MeshBasicMaterial({
      map: ringTexture,
      color: "#d8ff6b",
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  const ringGlow = new THREE.Mesh(kit.geometry(new THREE.PlaneGeometry(8.4, 8.4)), ringGlowMaterial);
  ringGlow.position.copy(mg).setZ(mg.z - 1.2);
  ringGlow.visible = false;
  root.add(ringGlow);
  const flash = kit.glow("#f4ffb0", 10, { opacity: 0 });
  flash.position.copy(mg).setZ(mg.z - 1.4);
  root.add(flash);

  /* ---------------- Photons ---------------- */
  const photons: Photon[] = [
    // Red (~680 nm) and blue (~430 nm) are absorbed; green (~550 nm) bounces off.
    { color: "#ff5a4f", from: new THREE.Vector3(-14, 7.5, 6), hit: new THREE.Vector3(-0.8, 0.9, 0.4), phase: 0.7, absorbed: true, wavelength: 1.25 },
    { color: "#4f8dff", from: new THREE.Vector3(-13, -6.5, 7), hit: new THREE.Vector3(0.6, -0.9, 0.4), phase: 3.1, absorbed: true, wavelength: 0.78 },
    { color: "#5dff6e", from: new THREE.Vector3(13, 8, 6), hit: new THREE.Vector3(1.3, 1.4, 0.6), phase: 5.4, absorbed: false, wavelength: 1.0 },
  ];
  const fx = photons.map((photon) => {
    const head = kit.glow(photon.color, 1.3, { opacity: 0 });
    const core = kit.glow("#ffffff", 0.45, { opacity: 0 });
    const line = wave(kit, photon.color, photon.wavelength);
    const group = new THREE.Group();
    group.add(line, head, core);
    root.add(group);
    const hit = photon.hit.clone().add(mg);
    const dir = hit.clone().sub(photon.from).normalize();
    // Mirror the incoming direction about the ring's normal (+Z).
    const out = dir.clone().setZ(-dir.z).add(new THREE.Vector3(0.25, -0.15, 0)).normalize();
    return { photon, head, core, line, group, hit, dir, out };
  });

  /* ---------------- Surroundings: the protein pocket and neighbours ---------------- */
  // Soft backlight so the dark carbons stand out.
  const backlight = kit.glow("#2f8fd0", 26, { opacity: 0.4, env: true });
  backlight.position.set(0.5, -0.5, -6);
  env.add(backlight);
  // The protein pocket around the pigment: soft, out-of-focus shapes.
  const pocket = [
    { p: [-11, 4.5, -8], r: 4.2, c: "#27b889" },
    { p: [11.5, -3.5, -9], r: 5, c: "#1fa3a0" },
    { p: [8, 9, -10], r: 3.6, c: "#2fbf78" },
    { p: [-9.5, -8, -9], r: 4, c: "#1fa3a0" },
  ];
  for (const b of pocket) {
    const blob = new THREE.Mesh(
      kit.blob(1, { detail: 3, noise: 0.14, seed: b.r * 10 }),
      kit.halo(b.c, { inner: 1, power: 1.4, opacity: 0.35, env: true }),
    );
    blob.position.set(b.p[0], b.p[1], b.p[2]);
    blob.scale.setScalar(b.r);
    env.add(blob);
  }
  // Neighbouring chlorophylls in the same protein (heads only), further back.
  const headAtoms = model.atoms
    .map((atom, i) => ({ atom, i }))
    .filter(({ atom }) => atom.tail < 0 && atom.symbol !== "H");
  const headIndex = new Map(headAtoms.map(({ i }, k) => [i, k]));
  const headBonds = model.bonds
    .filter(([a, b]) => headIndex.has(a) && headIndex.has(b))
    .map(([a, b]) => [headIndex.get(a)!, headIndex.get(b)!] as [number, number]);
  for (const [x, y, zz, rx, ry, rz] of [[-12.5, 3.8, -12, 0.5, 1.0, 0.3]]) {
    const placement = new THREE.Matrix4().compose(
      new THREE.Vector3(x, y, zz),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)),
      new THREE.Vector3(1, 1, 1),
    );
    const neighbour = molecule(
      kit,
      headAtoms.map(({ atom }) => ({
        symbol: atom.symbol,
        position: atom.position.clone().multiplyScalar(SCALE).applyMatrix4(placement),
      })),
      headBonds,
      { atomScale: ATOM_SCALE, bondRadius: BOND_RADIUS, env: true },
    );
    env.add(neighbour);
    const glow = kit.glow("#7dff6b", 7, { opacity: 0.3, env: true });
    glow.position.set(x, y, zz - 1);
    env.add(glow);
  }
  // Depth haze: everything behind this veil recedes into the blue.
  const veil = new THREE.Mesh(
    kit.geometry(new THREE.PlaneGeometry(60, 40)),
    kit.flat("#0d2244", { env: true, opacity: 0.5, depthWrite: false }),
  );
  veil.position.z = -6.5;
  env.add(veil);
  const carotenoidPoints: THREE.Vector3[] = [];
  for (let i = 0; i <= 18; i++) carotenoidPoints.push(new THREE.Vector3(6.4 + i * 0.6, 6.6 - i * 0.16 + (i % 2) * 0.28, -8 - i * 0.08));
  const carotenoid = new THREE.Mesh(
    kit.tube(carotenoidPoints, 0.13, { segments: 120, radial: 8 }),
    kit.toon("#ff9a2e", { rim: 0.5, rimColor: "#ffe0a0", env: true, opacity: 0.75 }),
  );
  env.add(carotenoid);
  const carotenoidGlow = kit.glow("#ffb13b", 9, { opacity: 0.2, env: true });
  carotenoidGlow.position.set(11, 5, -7);
  env.add(carotenoidGlow);
  // Drifting motes.
  const motes: number[] = [];
  for (let i = 0; i < 80; i++) motes.push((random() * 2 - 1) * 15, (random() * 2 - 1) * 10, -3 - random() * 8);
  const motePoints = kit.points(motes, { size: 0.14, color: "#8fffc0", soft: 0.8, twinkle: 0.5, opacity: 0.5, env: true });
  env.add(motePoints);

  /* ---------------- Animation ---------------- */
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  const d = new THREE.Vector3();
  const midpoint = new THREE.Vector3();
  const setOpacity = (object: THREE.Object3D, value: number) => {
    ((object as THREE.Mesh).material as THREE.Material & { opacity: number }).opacity = value;
    object.visible = value > 0.003;
  };

  return {
    root,
    env,
    update({ time, immersion }) {
      const far = 1 - THREE.MathUtils.smoothstep(immersion, 0.05, 0.6);
      setOpacity(pigmentGlow, 0.85 * far);
      tileMaterial.uniforms.uOpacity.value = 0.95 * far;
      tileDisc.visible = far > 0.003;

      // The tail sways gently; its first atoms stay attached to the ring.
      for (const i of tailAtoms) {
        const k = model.atoms[i].tail;
        const w = Math.min(1, k / 8) * 0.28;
        current[i].copy(base[i]).add(
          d.set(Math.sin(time * 0.9 + k * 0.35) * w * 0.6, Math.sin(time * 0.7 + k * 0.28) * w * 0.4, Math.cos(time * 0.8 + k * 0.3) * w),
        );
        const symbol = model.atoms[i].symbol;
        s.setScalar((ELEMENT_RADII[symbol] ?? 0.8) * ATOM_SCALE);
        meshes.get(symbol)!.setMatrixAt(rank[i], m4.compose(current[i], q.identity(), s));
      }
      for (const mesh of meshes.values()) mesh.instanceMatrix.needsUpdate = true;
      if (bondMesh) {
        for (const k of tailBonds) {
          const [a, b] = model.bonds[k];
          d.subVectors(current[b], current[a]);
          midpoint.addVectors(current[a], current[b]).multiplyScalar(0.5);
          q.setFromUnitVectors(up, d.clone().normalize());
          s.set(BOND_RADIUS, d.length(), BOND_RADIUS);
          bondMesh.setMatrixAt(k, m4.compose(midpoint, q, s));
        }
        bondMesh.instanceMatrix.needsUpdate = true;
      }

      // Photons.
      let excite = 0;
      for (const f of fx) {
        const t = (((time - f.photon.phase) % PERIOD) + PERIOD) % PERIOD;
        const travel = 1.2;
        const incoming = f.hit.distanceTo(f.photon.from);
        if (t < travel) {
          const u = t / travel;
          f.group.position.copy(f.photon.from).addScaledVector(f.dir, incoming * u);
          f.group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), f.dir);
          const fade = Math.min(1, u * 5);
          setOpacity(f.head, fade);
          setOpacity(f.core, fade);
          setOpacity(f.line, fade * 0.95);
        } else if (!f.photon.absorbed && t < travel * 2.2) {
          const u = (t - travel) / (travel * 1.2);
          f.group.position.copy(f.hit).addScaledVector(f.out, incoming * 1.1 * u);
          f.group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), f.out);
          const fade = 1 - Math.max(0, (u - 0.7) / 0.3);
          setOpacity(f.head, fade);
          setOpacity(f.core, fade);
          setOpacity(f.line, fade * 0.95);
        } else {
          setOpacity(f.head, 0);
          setOpacity(f.core, 0);
          setOpacity(f.line, 0);
        }
        if (f.photon.absorbed && t >= travel) excite = Math.max(excite, Math.exp(-(t - travel) * 2.2));
      }
      setOpacity(flash, 0.5 * excite);
      flash.scale.setScalar(8 + 4 * excite);
      ringGlowMaterial.opacity = 0.9 * excite;
      ringGlow.visible = excite > 0.01;
      ringGlow.scale.setScalar(1 + 0.15 * (1 - excite));
      motePoints.rotation.z = time * 0.01;
    },
  };
};

export default chlorophyll;
