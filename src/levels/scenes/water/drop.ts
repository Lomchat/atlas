/**
 * A 4 mm drop beading on the waxy lily pad (1 unit = 0.4 mm).
 * The bead is centred on the origin; the pad surface is at y = SURFACE.
 * The drop is drawn in layers: an inner back wall showing the refracted,
 * upside-down world (pad on top, sky below), faint swimmers, then a clear
 * front shell with a fresnel rim and highlights. The child level
 * "micro-zoo" (drawn by its own scene) floats inside at its anchor.
 */
import * as THREE from "three";
import { TIME, rng } from "../../../engine/kit";
import type { Kit } from "../../../engine/kit";
import type { SceneBuilder } from "../types";
import { glassMaterial, lensMaterial } from "./shared";

const RADIUS = 5;
const FLAT = 0.82;
export const SURFACE = -3.6;
/** Polar angle where the bead meets the pad. */
const CUT = Math.acos(SURFACE / (RADIUS * FLAT));

/** Painted waxy epidermis: rounded cells, lit from the upper left. */
function cellTexture(kit: Kit) {
  const texture = kit.canvasTexture(512, 512, (g, w, h) => {
    g.fillStyle = "#44b257";
    g.fillRect(0, 0, w, h);
    const random = rng(99);
    const cells: [number, number][] = [];
    const n = 11;
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++)
        cells.push([((i + 0.5 + (random() - 0.5) * 0.6) / n) * w, ((j + 0.5 + (random() - 0.5) * 0.6) / n) * h]);
    const size = w / n;
    for (const [x, y] of cells)
      for (const dx of [-w, 0, w])
        for (const dy of [-h, 0, h]) {
          const cx = x + dx;
          const cy = y + dy;
          const gradient = g.createRadialGradient(cx - size * 0.15, cy - size * 0.18, size * 0.05, cx, cy, size * 0.62);
          gradient.addColorStop(0, "#9ee67f");
          gradient.addColorStop(0.55, "#5ccc62");
          gradient.addColorStop(1, "#44b257");
          g.fillStyle = gradient;
          g.beginPath();
          g.ellipse(cx, cy, size * 0.47, size * 0.44, 0.3, 0, Math.PI * 2);
          g.fill();
        }
  });
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

const drop: SceneBuilder = ({ kit, children }) => {
  const root = new THREE.Group();
  const env = new THREE.Group();
  const random = rng(4);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();

  const zooChild = children.find((child) => child.id === "micro-zoo");
  const zooAt = new THREE.Vector3(...(zooChild?.at ?? [-0.3, -0.6, 2.2]));
  const zooRadius = zooChild?.radius ?? 0.625;

  const beadGeometry = kit.geometry(new THREE.SphereGeometry(1, 72, 48, 0, Math.PI * 2, 0, CUT));
  beadGeometry.scale(RADIUS, RADIUS * FLAT, RADIUS);

  /* Contact: a soft shadow cast away from the light, a focused caustic and a dark contact line. */
  const shadowTexture = kit.canvasTexture(256, 256, (g, w, h) => {
    const gradient = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.6, "rgba(255,255,255,0.5)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gradient;
    g.fillRect(0, 0, w, h);
  });
  const flatDisc = kit.geometry(new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2));
  const shadow = new THREE.Mesh(
    flatDisc,
    kit.track(new THREE.MeshBasicMaterial({ map: shadowTexture, color: "#0f4a3a", transparent: true, opacity: 0.45, depthWrite: false })),
  );
  shadow.scale.set(5.2, 1, 3.6);
  shadow.position.set(2.6, SURFACE + 0.02, -1.8);
  shadow.rotation.y = 0.5;
  shadow.renderOrder = 1;
  root.add(shadow);
  const caustic = new THREE.Mesh(
    flatDisc,
    kit.track(
      new THREE.MeshBasicMaterial({
        map: shadowTexture,
        color: "#f4ffd0",
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    ),
  );
  caustic.scale.set(2.2, 1, 1.3);
  caustic.position.set(3.4, SURFACE + 0.03, -2.4);
  caustic.rotation.y = 0.5;
  caustic.renderOrder = 2;
  root.add(caustic);
  const contactRadius = RADIUS * Math.sin(CUT);
  const contact = new THREE.Mesh(
    kit.geometry(new THREE.RingGeometry(contactRadius * 0.9, contactRadius * 1.04, 64).rotateX(-Math.PI / 2)),
    kit.flat("#155c3c", { opacity: 0.55, depthWrite: false }),
  );
  contact.position.y = SURFACE + 0.025;
  contact.renderOrder = 2;
  root.add(contact);

  /* The inner lens image. */
  const lens = new THREE.Mesh(beadGeometry, lensMaterial(kit));
  lens.renderOrder = 3;
  root.add(lens);

  /* Faint swimmers inside the drop (the micro-zoo child sits at its own anchor). */
  interface Swimmer {
    center: THREE.Vector3;
    radius: THREE.Vector3;
    speed: number;
    phase: number;
    size: number;
    kind: number;
  }
  const swimmers: Swimmer[] = [];
  for (let tries = 0; swimmers.length < kit.count(26, 16) && tries < 500; tries++) {
    const center = new THREE.Vector3((random() * 2 - 1) * 3.2, (random() * 2 - 1) * 2.2, (random() * 2 - 1) * 1.8 - 0.5);
    if (center.distanceTo(zooAt) < zooRadius + 1.4) continue;
    if (center.x * center.x + (center.y / FLAT) ** 2 + center.z * center.z > 3.4 * 3.4) continue;
    swimmers.push({
      center,
      radius: new THREE.Vector3(0.3 + random() * 0.6, 0.2 + random() * 0.3, 0.3 + random() * 0.5),
      speed: (0.15 + random() * 0.25) * (random() > 0.5 ? 1 : -1),
      phase: random() * 6,
      size: 0.05 + random() * 0.08,
      kind: Math.floor(random() * 3),
    });
  }
  const swimmerColors = ["#8fe0a8", "#e8d27a", "#a8f0c0"];
  const swimmerMesh = new THREE.InstancedMesh(
    kit.geometry(new THREE.SphereGeometry(1, 12, 8)),
    kit.toon("#ffffff", { rim: 0.2, gloss: 0, opacity: 0.55, depthWrite: false }),
    swimmers.length,
  );
  const tint = new THREE.Color();
  swimmers.forEach((swimmer, i) => swimmerMesh.setColorAt(i, tint.set(swimmerColors[swimmer.kind])));
  swimmerMesh.renderOrder = 4;
  root.add(swimmerMesh);
  const e = new THREE.Euler();
  const updateSwimmers = (time: number) => {
    swimmers.forEach((sw, i) => {
      const t = time * sw.speed + sw.phase;
      p.set(sw.center.x + Math.cos(t) * sw.radius.x, sw.center.y + Math.sin(t * 1.3) * sw.radius.y, sw.center.z + Math.sin(t) * sw.radius.z);
      e.set(0, -t, Math.sin(t * 2) * 0.3);
      const stretch = sw.kind === 0 ? 2.6 : sw.kind === 1 ? 1.8 : 1;
      swimmerMesh.setMatrixAt(i, m.compose(p, q.setFromEuler(e), s.set(sw.size * stretch, sw.size, sw.size)));
    });
    swimmerMesh.instanceMatrix.needsUpdate = true;
  };
  updateSwimmers(0);

  /* A soft light focused inside the bead, low on the far side from the sun. */
  const innerGlow = kit.glow("#e9fff4", 6, { opacity: 0.55 });
  innerGlow.position.set(1.6, -1.9, 1.2);
  innerGlow.renderOrder = 5;
  root.add(innerGlow);

  /* The clear front shell: fresnel rim, soft body colour. */
  const shell = new THREE.Mesh(
    beadGeometry,
    glassMaterial(kit, { top: "#c8fbff", bottom: "#9ff0ff", rim: "#ffffff", opacity: 0.16, rimPower: 2.6, spec: 0.9975 }),
  );
  shell.renderOrder = 6;
  root.add(shell);
  const rimGlow = new THREE.Mesh(beadGeometry, kit.halo("#b8f7ff", { opacity: 0.55, power: 3.2 }));
  rimGlow.scale.setScalar(1.015);
  rimGlow.renderOrder = 7;
  root.add(rimGlow);

  /* Highlights: a curved window reflection and a sparkle on the upper left. */
  const onBead = (theta: number, phi: number, lift = 1.01) =>
    new THREE.Vector3(
      Math.sin(theta) * Math.cos(phi) * RADIUS * lift,
      Math.cos(theta) * RADIUS * FLAT * lift,
      Math.sin(theta) * Math.sin(phi) * RADIUS * lift,
    );
  const highlightMaterial = kit.flat("#ffffff", { opacity: 0.92, depthWrite: false });
  const arc: THREE.Vector3[] = [];
  for (let i = 0; i <= 12; i++) arc.push(onBead(0.55 + i * 0.045, 2.05 + i * 0.07));
  const window1 = new THREE.Mesh(kit.tube(arc, 0.13, { radial: 8, segments: 48 }), highlightMaterial);
  window1.renderOrder = 8;
  const arc2: THREE.Vector3[] = [];
  for (let i = 0; i <= 6; i++) arc2.push(onBead(0.62 + i * 0.03, 2.62 + i * 0.07));
  const window2 = new THREE.Mesh(kit.tube(arc2, 0.1, { radial: 8, segments: 24 }), highlightMaterial);
  window2.renderOrder = 8;
  const dot = new THREE.Mesh(kit.geometry(new THREE.SphereGeometry(0.13, 12, 8)), highlightMaterial);
  dot.position.copy(onBead(1.0, 2.25));
  dot.renderOrder = 8;
  // A thin bright rim line along the lower front edge (light leaving the bead).
  const lower: THREE.Vector3[] = [];
  for (let i = 0; i <= 16; i++) lower.push(onBead(CUT - 0.28, 0.35 + i * 0.09, 1.005));
  const bottomLine = new THREE.Mesh(
    kit.tube(lower, 0.06, { radial: 6, segments: 48 }),
    kit.flat("#effeff", { opacity: 0.75, depthWrite: false }),
  );
  bottomLine.renderOrder = 8;
  const sparkle = kit.glow("#ffffff", 0.9, { opacity: 0.8 });
  sparkle.position.copy(onBead(1.0, 2.25, 1.04));
  sparkle.renderOrder = 9;
  root.add(window1, window2, dot, bottomLine, sparkle);

  /* ---------------- Surroundings: the waxy pad surface and other beads. ---------------- */
  // The leaf: a wide disc of waxy cells whose far edge melts into the haze.
  const cells = cellTexture(kit);
  const surface = new THREE.Mesh(
    kit.geometry(new THREE.CircleGeometry(46, 120).rotateX(-Math.PI / 2)),
    kit.track(
      new THREE.ShaderMaterial({
        uniforms: {
          map: { value: cells },
          uRepeat: { value: 2.2 },
          uFade: { value: new THREE.Vector2(13, 44) },
          uHaze: { value: new THREE.Color("#63c9b2") },
          uEnv: kit.envUniform,
          uTime: TIME,
        },
        vertexShader: /* glsl */ `
          varying vec2 vP;
          void main() { vP = position.xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: /* glsl */ `
          uniform sampler2D map;
          uniform float uRepeat, uEnv, uTime;
          uniform vec2 uFade;
          uniform vec3 uHaze;
          varying vec2 vP;
          void main() {
            vec3 col = texture2D(map, vP / uRepeat).rgb;
            float d = length(vP);
            // A soft sheen of sky reflected by the wax, and haze with distance.
            col = mix(col, vec3(0.85, 1.0, 0.9), 0.12 * smoothstep(-2.0, -14.0, vP.y));
            col = mix(col, uHaze, smoothstep(6.0, uFade.y, d) * 0.7);
            float alpha = 1.0 - smoothstep(uFade.x, uFade.y, d);
            gl_FragColor = vec4(col, alpha * uEnv);
          }`,
        transparent: true,
        depthWrite: true,
      }),
    ),
  );
  surface.position.y = SURFACE;
  surface.renderOrder = -2;
  env.add(surface);

  // Neighbouring beads, near and far.
  const others = [
    { x: -10.5, z: -5, r: 1.3 },
    { x: 9.5, z: -8, r: 2.1 },
    { x: -5, z: -15, r: 2.8 },
    { x: 12.5, z: 1.5, r: 0.7 },
    { x: -13.5, z: 2.5, r: 0.9 },
    { x: 4.5, z: -14, r: 1.1 },
  ];
  const otherShell = glassMaterial(kit, { top: "#c8fbff", bottom: "#9ff0ff", rim: "#ffffff", opacity: 0.16, rimPower: 2.6, env: true });
  const otherGeometry = kit.geometry(new THREE.SphereGeometry(1, 40, 28, 0, Math.PI * 2, 0, CUT));
  otherGeometry.scale(1, FLAT, 1);
  const otherLens = lensMaterial(kit, true);
  for (const other of others) {
    const bead = new THREE.Mesh(otherGeometry, otherShell);
    bead.scale.setScalar(other.r);
    bead.position.set(other.x, SURFACE - other.r * FLAT * Math.cos(CUT), other.z);
    bead.renderOrder = 3;
    const inner = new THREE.Mesh(otherGeometry, otherLens);
    inner.scale.copy(bead.scale);
    inner.position.copy(bead.position);
    inner.renderOrder = 2;
    env.add(inner, bead);
    const glint = kit.glow("#ffffff", other.r * 0.45, { opacity: 0.85, env: true });
    glint.position.set(other.x - other.r * 0.4, bead.position.y + other.r * 0.5, other.z + other.r * 0.7);
    env.add(glint);
  }

  // Out-of-focus light in the background (bokeh).
  const bokeh: number[] = [];
  const bokehColors: number[] = [];
  const bokehSizes: number[] = [];
  const palette = [new THREE.Color("#ffffff"), new THREE.Color("#ffc2e2"), new THREE.Color("#b8ffd8"), new THREE.Color("#bff4ff")];
  for (let i = 0; i < kit.count(34, 18); i++) {
    bokeh.push((random() * 2 - 1) * 20, -1 + random() * 11, -13 - random() * 2);
    const c = palette[Math.floor(random() * palette.length)];
    bokehColors.push(c.r, c.g, c.b);
    bokehSizes.push(0.6 + random() * 1.6);
  }
  env.add(kit.points(bokeh, { size: 1.6, colors: bokehColors, sizes: bokehSizes, soft: 0.85, opacity: 0.45, twinkle: 0.3, env: true }));

  return {
    root,
    env,
    update({ time }) {
      updateSwimmers(time);
      const pulse = 0.5 + 0.5 * Math.sin(time * 0.8);
      innerGlow.material.opacity = 0.45 + 0.15 * pulse;
      (caustic.material as THREE.MeshBasicMaterial).opacity = 0.7 + 0.2 * pulse;
      sparkle.scale.setScalar(0.8 + 0.25 * Math.sin(time * 2.1));
    },
  };
};

export default drop;
