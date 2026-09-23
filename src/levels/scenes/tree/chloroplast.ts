/**
 * A chloroplast (10 units = 5 µm): a lens wrapped in a double envelope, cut
 * open towards the camera. Inside, grana (stacks of thylakoid discs) linked by
 * stroma lamellae float in the pale stroma with starch grains, plastoglobuli,
 * ribosomes and a loop of the chloroplast's own DNA.
 *
 * The `thylakoid` child is one camera-facing granum drawn by its own scene:
 * this scene leaves its place empty and only brings lamellae to its edge.
 * Seen from the leaf cell (immersion 0) the envelope is closed and translucent,
 * like the other chloroplasts there; it opens as the visitor arrives.
 */
import * as THREE from "three";
import { rng } from "../../../engine/kit";
import type { Kit } from "../../../engine/kit";
import type { SceneBuilder } from "../types";
import { GRANUM, HERO_LAMELLAE, PHOTO_COLORS as C, discY, lightShafts } from "./chloroplastShared";

/** Semi-axes of the lens (units). */
const AXES = new THREE.Vector3(5, 2.3, 3.2);
/** Cut: in unit-sphere space, points with n·q > CUT_H are removed. */
const CUT_N = new THREE.Vector3(0.04, 1, 0.3).normalize();
const CUT_H = 0.3;
/** Granum dimensions (units): the thylakoid level at 1/10 scale. */
const TO_HERE = 0.1;
const GRANUM_RADIUS = GRANUM.radius * TO_HERE;
const DISC_REPEAT = GRANUM.repeat * TO_HERE;
const DISC_HALF = GRANUM.half * TO_HERE;
const DEG = Math.PI / 180;

const toUnit = (p: THREE.Vector3) => new THREE.Vector3(p.x / AXES.x, p.y / AXES.y, p.z / AXES.z);

/** Part of an ellipsoid shell below (or above) the cut plane. */
function shell(kit: Kit, scale: number, part: "kept" | "cap", width = 96, height = 48) {
  const theta = Math.acos(CUT_H);
  const geometry =
    part === "kept"
      ? new THREE.SphereGeometry(1, width, height, 0, Math.PI * 2, theta, Math.PI - theta)
      : new THREE.SphereGeometry(1, width, Math.round(height / 3), 0, Math.PI * 2, 0, theta);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), CUT_N);
  const m = new THREE.Matrix4()
    .makeScale(AXES.x * scale, AXES.y * scale, AXES.z * scale)
    .multiply(new THREE.Matrix4().makeRotationFromQuaternion(q));
  geometry.applyMatrix4(m);
  return kit.geometry(geometry);
}

/** Points along the cut edge of a shell of relative `scale`. */
function cutEdge(scale: number, count = 160) {
  const u = new THREE.Vector3(1, 0, 0).projectOnPlane(CUT_N).normalize();
  const v = new THREE.Vector3().crossVectors(CUT_N, u);
  const r = Math.sqrt(1 - CUT_H * CUT_H);
  const points: THREE.Vector3[] = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const q = CUT_N.clone()
      .multiplyScalar(CUT_H)
      .addScaledVector(u, Math.cos(a) * r)
      .addScaledVector(v, Math.sin(a) * r);
    points.push(new THREE.Vector3(q.x * AXES.x * scale, q.y * AXES.y * scale, q.z * AXES.z * scale));
  }
  return points;
}

/** Is a point inside the lens (with a margin in units) and below the cut? */
function inside(p: THREE.Vector3, margin: number, cutMargin = 0.06) {
  const q = new THREE.Vector3(
    p.x / (AXES.x - margin),
    p.y / (AXES.y - margin),
    p.z / (AXES.z - margin),
  );
  return q.lengthSq() < 1 && toUnit(p).dot(CUT_N) < CUT_H - cutMargin;
}

const chloroplast: SceneBuilder = ({ kit, children }) => {
  const root = new THREE.Group();
  const env = new THREE.Group();
  const random = rng(515);
  const thylakoid = children.find((child) => child.id === "thylakoid");
  const anchor = new THREE.Vector3(...(thylakoid?.at ?? [0.55, 0.1, 0.75]));

  /* ---------------- Envelope: two membranes, cut open ---------------- */
  // Same painted skin as the chloroplasts of the leaf cell: grana show through.
  const skin = kit.canvasTexture(256, 128, (g, w, h) => {
    g.fillStyle = "#6ad85a";
    g.fillRect(0, 0, w, h);
    const spots = rng(8);
    for (let k = 0; k < 46; k++) {
      const x = spots() * w;
      const y = 14 + spots() * (h - 28);
      const r = 5 + spots() * 5;
      g.fillStyle = spots() < 0.5 ? "#2b9a45" : "#34a94a";
      g.beginPath();
      g.ellipse(x, y, r * 1.1, r, 0, 0, Math.PI * 2);
      g.fill();
    }
  });
  const outer = new THREE.Mesh(
    shell(kit, 1, "kept"),
    kit.textured(skin, { shadow: C.envelopeShadow, rim: 0.85, rimColor: "#eaffa8", gloss: 0.3, soft: 0.3 }),
  );
  const innerSide = new THREE.Mesh(
    shell(kit, 0.955, "kept"),
    kit.toon(C.envelopeInside, {
      shadow: C.envelopeInsideShadow,
      rim: 0.15,
      gloss: 0,
      soft: 0.6,
      side: THREE.BackSide,
    }),
  );
  root.add(outer, innerSide);

  // Cut edge: two bright membrane lips with the intermembrane space between.
  const outerEdge = cutEdge(1);
  const innerEdge = cutEdge(0.955);
  const band: number[] = [];
  const bandIndex: number[] = [];
  for (let i = 0; i < outerEdge.length; i++) {
    band.push(outerEdge[i].x, outerEdge[i].y, outerEdge[i].z, innerEdge[i].x, innerEdge[i].y, innerEdge[i].z);
    const a = i * 2;
    const b = ((i + 1) % outerEdge.length) * 2;
    bandIndex.push(a, a + 1, b, a + 1, b + 1, b);
  }
  const bandGeometry = kit.geometry(new THREE.BufferGeometry());
  bandGeometry.setAttribute("position", new THREE.Float32BufferAttribute(band, 3));
  bandGeometry.setIndex(bandIndex);
  bandGeometry.computeVertexNormals();
  root.add(new THREE.Mesh(bandGeometry, kit.flat("#1d6b3f", { side: THREE.DoubleSide })));
  const lip = kit.toon("#c9ff7e", { rim: 0.3, gloss: 0.4, shadow: "#5fae4f" });
  root.add(new THREE.Mesh(kit.tube(outerEdge, 0.05, { closed: true, segments: 220, radial: 8 }), lip));
  root.add(new THREE.Mesh(kit.tube(innerEdge, 0.04, { closed: true, segments: 220, radial: 8 }), lip));

  // The removed cap: closes the lens when seen from the leaf cell, then fades away.
  const capMaterial = kit.textured(skin, {
    shadow: C.envelopeShadow,
    rim: 0.7,
    rimColor: "#eaffa8",
    gloss: 0.3,
    opacity: 0.75,
    transparent: true,
    depthWrite: false,
  }) as THREE.ShaderMaterial;
  const cap = new THREE.Mesh(shell(kit, 1, "cap"), capMaterial);
  cap.renderOrder = 2;
  root.add(cap);

  /* ---------------- Grana ---------------- */
  interface Granum {
    p: THREE.Vector3;
    discs: number;
    r: number;
  }
  // Places kept free of grana: starch grains and the DNA loop.
  const starchSpots = [
    new THREE.Vector3(-2.8, -0.35, 0.55),
    new THREE.Vector3(2.75, -0.3, 0.75),
    new THREE.Vector3(-1.1, -0.45, -1.0),
  ];
  const dnaCenter = new THREE.Vector3(1.55, -0.25, -0.55);
  const keepOut = [
    ...starchSpots.map((p) => ({ p, r: 0.75 })),
    { p: dnaCenter, r: 0.7 },
  ];
  const grana: Granum[] = [];
  const anchorGranum: Granum = { p: anchor.clone(), discs: GRANUM.discs, r: GRANUM_RADIUS };
  grana.push(anchorGranum);
  // The entered granum's lamellae follow the same paths as in the thylakoid level.
  const heroPath = (l: (typeof HERO_LAMELLAE)[number], r: number) => {
    const phi = l.phi * DEG + (r - GRANUM.radius) * 0.035;
    return new THREE.Vector3(
      Math.sin(phi) * r,
      discY(l.disc) + (r - GRANUM.radius + 0.5) * l.slope,
      Math.cos(phi) * r,
    )
      .multiplyScalar(TO_HERE)
      .add(anchor);
  };
  const heroSegments: [THREE.Vector3, THREE.Vector3, number][] = [];
  for (const l of HERO_LAMELLAE) {
    const stops = [GRANUM.radius - 0.6, GRANUM.radius + 4, GRANUM.radius + 9, GRANUM.radius + 14];
    for (let i = 0; i + 1 < stops.length; i++)
      heroSegments.push([heroPath(l, stops[i]), heroPath(l, stops[i + 1]), l.width * TO_HERE]);
  }
  const nearHero = (p: THREE.Vector3, r: number, h: number) =>
    heroSegments.some(([a, b]) => {
      const ab = b.clone().sub(a);
      const t = THREE.MathUtils.clamp(p.clone().sub(a).dot(ab) / ab.lengthSq(), 0, 1);
      const c = a.clone().addScaledVector(ab, t);
      return Math.hypot(c.x - p.x, c.z - p.z) < r + 0.12 && Math.abs(c.y - p.y) < h / 2 + 0.06;
    });
  const height = (g: Granum) => g.discs * DISC_REPEAT;
  const fits = (p: THREE.Vector3, r: number, h: number) => {
    for (const dy of [-h / 2 - 0.04, h / 2 + 0.04])
      for (let a = 0; a < 8; a++) {
        const edge = p.clone().add(new THREE.Vector3(Math.cos(a * 0.785) * r, dy, Math.sin(a * 0.785) * r));
        if (!inside(edge, 0.12)) return false;
      }
    return true;
  };
  for (let tries = 0; grana.length < 46 && tries < 5000; tries++) {
    const discs = 9 + Math.floor(random() * 11);
    const r = 0.32 + random() * 0.12;
    const p = new THREE.Vector3((random() * 2 - 1) * 4.6, (random() * 2 - 1) * 1.8, (random() * 2 - 1) * 2.9);
    const candidate = { p, discs, r };
    const h = height(candidate);
    if (!fits(p, r, h)) continue;
    if (nearHero(p, r, h)) continue;
    if (keepOut.some((k) => Math.hypot(k.p.x - p.x, k.p.z - p.z) < k.r + r && Math.abs(k.p.y - p.y) < h / 2 + 0.45)) continue;
    // Favour stacks just under the cut, where the visitor sees them.
    const depth = CUT_H - toUnit(p.clone().add(new THREE.Vector3(0, h / 2, 0))).dot(CUT_N);
    if (depth > 0.45 && random() < 0.8) continue;
    if (
      grana.some(
        (g) =>
          Math.hypot(g.p.x - p.x, g.p.z - p.z) < g.r + r + 0.22 &&
          Math.abs(g.p.y - p.y) < (height(g) + h) / 2 + 0.2,
      )
    )
      continue;
    grana.push(candidate);
  }

  // At this scale a disc is a couple of pixels thick: a plain cylinder is enough.
  const discGeo = kit.geometry(new THREE.CylinderGeometry(1, 1, (DISC_HALF * 2) / 0.4, 18, 1));
  let discCount = 0;
  for (const g of grana) if (g !== anchorGranum) discCount += g.discs;
  const discMesh = new THREE.InstancedMesh(
    discGeo,
    kit.toon("#ffffff", { shadow: C.discShadow, rim: 0.45, rimColor: C.discRim, gloss: 0.2, soft: 0.3 }),
    discCount,
  );
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const color = new THREE.Color();
  const discA = new THREE.Color(C.disc);
  const discB = new THREE.Color(C.discTop);
  let k = 0;
  for (const g of grana) {
    if (g === anchorGranum) continue;
    const y0 = g.p.y - ((g.discs - 1) * DISC_REPEAT) / 2;
    const tilt = new THREE.Quaternion().setFromEuler(new THREE.Euler((random() - 0.5) * 0.12, 0, (random() - 0.5) * 0.12));
    for (let d = 0; d < g.discs; d++) {
      const r = g.r * (0.94 + random() * 0.1);
      const offset = new THREE.Vector3((random() - 0.5) * 0.03, y0 + d * DISC_REPEAT - g.p.y, (random() - 0.5) * 0.03).applyQuaternion(tilt);
      s.set(r, 0.4, r);
      discMesh.setMatrixAt(k, m4.compose(g.p.clone().add(offset), tilt, s));
      discMesh.setColorAt(k, color.copy(discA).lerp(discB, d / Math.max(1, g.discs - 1)).offsetHSL((random() - 0.5) * 0.02, 0, (random() - 0.5) * 0.05));
      k++;
    }
  }
  root.add(discMesh);

  /* ---------------- Stroma lamellae: flat sheets between grana ---------------- */
  const links: [Granum, Granum][] = [];
  for (const a of grana) {
    if (a === anchorGranum) continue;
    const near = grana
      .filter((b) => b !== a && b !== anchorGranum)
      .map((b) => ({ b, d: a.p.distanceTo(b.p) }))
      .sort((x, y) => x.d - y.d)
      .slice(0, 3);
    for (const { b, d } of near) {
      if (d > 2.3 || Math.abs(a.p.y - b.p.y) > 0.55) continue;
      if (links.some(([x, y]) => (x === a && y === b) || (x === b && y === a))) continue;
      links.push([a, b]);
    }
  }
  const sheet = kit.geometry(new THREE.BoxGeometry(1, 1, 1));
  const lamellae = new THREE.InstancedMesh(
    sheet,
    kit.toon(C.lamella, { shadow: C.discShadow, rim: 0.35, rimColor: C.discRim, soft: 0.4 }),
    links.length * 2 + heroSegments.length,
  );
  let l = 0;
  const up = new THREE.Vector3(0, 1, 0);
  const placeSheet = (start: THREE.Vector3, end: THREE.Vector3, thickness: number, width: number) => {
    const along = end.clone().sub(start);
    const x = along.clone().normalize();
    const zAxis = new THREE.Vector3().crossVectors(x, up).normalize();
    const yAxis = new THREE.Vector3().crossVectors(zAxis, x);
    q.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, yAxis, zAxis));
    s.set(along.length(), thickness, width);
    lamellae.setMatrixAt(l++, m4.compose(start.clone().add(end).multiplyScalar(0.5), q, s));
  };
  // The entered granum's lamellae, until they leave the stroma.
  for (const [a, b, width] of heroSegments) {
    if (!inside(a, 0.12, 0.02) || !inside(b, 0.12, 0.02)) continue;
    placeSheet(a, b, DISC_HALF * 2, width);
  }
  for (const [a, b] of links) {
    for (let j = 0; j < 2; j++) {
      const ha = (a.discs * DISC_REPEAT) / 2;
      const hb = (b.discs * DISC_REPEAT) / 2;
      const fa = j === 0 ? 0.55 : -0.35;
      const pa = a.p.clone().add(new THREE.Vector3(0, ha * fa, 0));
      const pb = b.p.clone().add(new THREE.Vector3(0, hb * (j === 0 ? -0.3 : 0.5), 0));
      const dir = pb.clone().sub(pa);
      const flat = new THREE.Vector3(dir.x, 0, dir.z).normalize();
      // Start and end at the edge of each stack.
      const start = pa.clone().addScaledVector(flat, a.r * 0.8);
      const end = pb.clone().addScaledVector(flat, -b.r * 0.8);
      placeSheet(start, end, 0.02, 0.14 + random() * 0.08);
    }
  }
  lamellae.count = l;
  root.add(lamellae);

  /* ---------------- Starch grains, plastoglobuli, ribosomes, DNA ---------------- */
  const starchMaterial = kit.toon(C.starch, { shadow: "#d9c49a", rim: 0.4, gloss: 0.35 });
  starchSpots.forEach((p, i) => {
    const grain = new THREE.Mesh(kit.blob(1, { detail: 3, noise: 0.08, seed: 40 + i }), starchMaterial);
    grain.scale.set(0.55 - i * 0.05, 0.3, 0.38);
    grain.position.copy(p);
    grain.rotation.y = i * 1.3;
    root.add(grain);
  });

  const globules: THREE.Vector3[] = [];
  for (let tries = 0; globules.length < 14 && tries < 400; tries++) {
    const p = new THREE.Vector3((random() * 2 - 1) * 4.2, -1.3 + random() * 1.4, (random() * 2 - 1) * 2.8);
    if (!inside(p, 0.35)) continue;
    if (grana.some((g) => Math.hypot(g.p.x - p.x, g.p.z - p.z) < g.r + 0.2 && Math.abs(g.p.y - p.y) < 0.5)) continue;
    globules.push(p);
  }
  const globuleMesh = new THREE.InstancedMesh(
    kit.geometry(new THREE.SphereGeometry(1, 16, 12)),
    kit.toon(C.plastoglobule, { rim: 0.4, gloss: 0.5, shadow: "#e0782f" }),
    globules.length,
  );
  const globuleSizes = globules.map(() => 0.09 + random() * 0.07);
  const placeGlobules = (time: number) => {
    globules.forEach((p, i) => {
      const bob = new THREE.Vector3(Math.sin(time * 0.5 + i) * 0.03, Math.sin(time * 0.7 + i * 2.1) * 0.04, 0);
      globuleMesh.setMatrixAt(i, m4.compose(bob.add(p), q.identity(), s.setScalar(globuleSizes[i])));
    });
    globuleMesh.instanceMatrix.needsUpdate = true;
  };
  placeGlobules(0);
  root.add(globuleMesh);

  const ribosomes: number[] = [];
  for (let tries = 0; ribosomes.length < kit.count(220) * 3 && tries < 6000; tries++) {
    const p = new THREE.Vector3((random() * 2 - 1) * 4.6, (random() * 2 - 1) * 1.6, (random() * 2 - 1) * 3);
    if (!inside(p, 0.18, 0.02)) continue;
    ribosomes.push(p.x, p.y, p.z);
  }
  const ribosomePoints = kit.points(ribosomes, { size: 0.055, color: C.ribosome, opacity: 0.75 });
  root.add(ribosomePoints);

  // A little loop of chloroplast DNA (a nucleoid), deliberately thick to be visible.
  const dnaPoints: THREE.Vector3[] = [];
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    const r = 0.36 + 0.07 * Math.sin(a * 5) + 0.03 * Math.cos(a * 9);
    dnaPoints.push(new THREE.Vector3(Math.cos(a) * r, 0.06 * Math.sin(a * 7), Math.sin(a) * r * 0.85));
  }
  const dna = new THREE.Mesh(
    kit.tube(dnaPoints, 0.035, { closed: true, segments: 160, radial: 8 }),
    kit.toon(C.dna, { rim: 0.4, gloss: 0.4, shadow: "#b0307a" }),
  );
  dna.position.copy(dnaCenter);
  root.add(dna);

  // Glints on the grana: light being caught.
  const glints: number[] = [];
  for (const g of grana) {
    if (g === anchorGranum) continue;
    glints.push(g.p.x, g.p.y + (g.discs * DISC_REPEAT) / 2 + 0.03, g.p.z);
  }
  const glintPoints = kit.points(glints, { size: 0.55, color: "#d9ff8a", soft: 1, twinkle: 0.9, additive: true, opacity: 0.55 });
  root.add(glintPoints);

  /* ---------------- Surroundings: cytoplasm and neighbouring chloroplasts ---------------- */
  // Neighbouring chloroplasts, closed, with grana showing through (as in the leaf cell).
  const spots = rng(77);
  const neighbourTexture = kit.canvasTexture(256, 128, (g, w, h) => {
    g.fillStyle = "#4dbd55";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 130; i++) {
      const x = spots() * w;
      const y = 10 + spots() * (h - 20);
      const r = 2.5 + spots() * 2.5;
      g.fillStyle = spots() < 0.5 ? "#339a4a" : "#2f9046";
      g.beginPath();
      g.ellipse(x, y, r * 1.3, r, 0, 0, Math.PI * 2);
      g.fill();
    }
  });
  const neighbourMaterial = kit.textured(neighbourTexture, { shadow: "#123f30", rim: 0.55, rimColor: "#9fe08a", env: true, opacity: 0.85, gloss: 0.05 });
  // Dimmed by distance, so the chloroplast in front stays the star.
  (neighbourMaterial.uniforms.uColor.value as THREE.Color).set("#9cc7a4");
  const neighbourGeometry = kit.geometry(new THREE.SphereGeometry(1, 48, 24));
  const neighbours = [
    { p: [-12.5, 4.5, -10], r: 0.62 },
    { p: [12.5, -4.2, -9], r: 0.7 },
    { p: [9.5, 7.2, -12], r: 0.5 },
    { p: [-10.5, -6.8, -11], r: 0.55 },
  ];
  for (const n of neighbours) {
    const lens = new THREE.Mesh(neighbourGeometry, neighbourMaterial);
    lens.scale.copy(AXES).multiplyScalar(n.r);
    lens.position.set(n.p[0], n.p[1], n.p[2]);
    lens.rotation.set(0.4 + random() * 0.6, random() * 3, random() * 0.8);
    env.add(lens);
  }
  const cytosol: number[] = [];
  for (let i = 0; i < kit.count(260); i++) {
    const p = new THREE.Vector3((random() * 2 - 1) * 14, (random() * 2 - 1) * 9, -3 - random() * 10);
    cytosol.push(p.x, p.y, p.z);
  }
  const cytosolPoints = kit.points(cytosol, { size: 0.12, color: "#b8ffb0", opacity: 0.5, soft: 0.7, twinkle: 0.3, env: true });
  env.add(cytosolPoints);

  // Sunlight falling on the chloroplast.
  const sun = kit.glow("#fff4c0", 18, { opacity: 0.3, env: true });
  sun.position.set(-10, 9, -8);
  env.add(sun);
  const shafts = lightShafts(kit, [
    { at: [-9, 10, -4], width: 2.4, length: 17, opacity: 0.13 },
    { at: [-5.5, 10, -4], width: 1.4, length: 15, opacity: 0.1 },
    { at: [-1.8, 10, -4], width: 3, length: 16, opacity: 0.08 },
    { at: [2.5, 10, -5], width: 1.8, length: 14, opacity: 0.07 },
  ]);
  env.add(shafts.group);

  return {
    root,
    env,
    update({ time, immersion }) {
      const open = THREE.MathUtils.smoothstep(immersion, 0.1, 0.7);
      capMaterial.uniforms.uOpacity.value = 0.75 * (1 - open);
      cap.visible = open < 0.995;
      dna.rotation.y = time * 0.15;
      placeGlobules(time);
      ribosomePoints.rotation.y = Math.sin(time * 0.1) * 0.02;
      cytosolPoints.rotation.z = time * 0.01;
      shafts.update(time, immersion);
    },
  };
};

export default chloroplast;
