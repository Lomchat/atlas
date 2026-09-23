/**
 * Helpers shared by the water journey: animated water surfaces, the lily pad
 * look (so the pond, the lily pad and the drop agree), water lily flowers and
 * glassy droplet materials. Everything is created through the scene's Kit.
 */
import * as THREE from "three";
import type { ColorLike, Kit } from "../../../engine/kit";
import { LIGHT_DIR, TIME, rng } from "../../../engine/kit";

export const POND_COLORS = {
  deep: "#1e5fc4",
  mid: "#2f86e3",
  shallow: "#43b2f0",
  edge: "#6fd9ea",
  foam: "#e9fbff",
  sky: "#9fe3ff",
};

/**
 * The hero bacterium of the bacteria level (µm, centred on its origin, axis
 * along X). The virus level lands on its right end cap and rebuilds this very
 * capsule as its wall, so both scenes agree while diving.
 */
export const HERO = { radius: 0.6, half: 1.9 };

/** Lily pad greens, shared by the pond, the lily pad and the drop. */
export const PAD = {
  light: "#8fe36e",
  base: "#4fc45a",
  dark: "#2f9a4a",
  vein: "#b6f59a",
  under: "#c2456f",
};

const rippleChunk = /* glsl */ `
uniform vec4 uRip[RIPPLES];
uniform float uRipPhase[RIPPLES];
uniform float uRipWidth;
float ripples(vec2 p) {
  float sum = 0.0;
  for (int i = 0; i < RIPPLES; i++) {
    vec4 r = uRip[i];
    if (r.z <= 0.0) continue;
    float age = fract(uTime / r.z + uRipPhase[i]);
    float d = length(p - r.xy);
    for (int k = 0; k < 2; k++) {
      float a = age - float(k) * 0.16;
      if (a <= 0.0) continue;
      float rad = a * r.w;
      float w = uRipWidth * (0.6 + a);
      float edge = abs(d - rad);
      float ring = 1.0 - smoothstep(w * 0.35, w, edge);
      sum += ring * (1.0 - a) * (1.0 - a) * (k == 0 ? 1.0 : 0.6);
    }
  }
  return clamp(sum, 0.0, 1.0);
}`;

/** Restart ripple `index` of a water material now, at (x, z). */
export function emitRipple(material: THREE.ShaderMaterial, index: number, x: number, z: number, time: number) {
  const rip = material.uniforms.uRip.value as THREE.Vector4[];
  const phase = material.uniforms.uRipPhase.value as number[];
  rip[index].x = x;
  rip[index].y = z;
  const period = rip[index].z || 1;
  phase[index] = 1 - (((time / period) % 1) + 1) % 1;
}

export interface RippleSource {
  x: number;
  z: number;
  /** Seconds per ripple cycle; 0 disables the source. */
  period: number;
  /** Largest ring radius (local units). */
  radius: number;
}

/**
 * Banded pond water: four depth bands keyed on the `aF` attribute
 * (0 = middle, 1 = shore), wobbling band edges, expanding ripple rings and a
 * soft sky reflection towards the back.
 */
export function pondWaterMaterial(
  kit: Kit,
  options: {
    colors?: Partial<typeof POND_COLORS>;
    bands?: [number, number, number];
    ripples?: RippleSource[];
    rippleWidth?: number;
    env?: boolean;
  } = {},
) {
  const c = { ...POND_COLORS, ...options.colors };
  const count = Math.max(1, options.ripples?.length ?? 1);
  const rip = Array.from({ length: count }, (_, i) => {
    const r = options.ripples?.[i];
    return new THREE.Vector4(r?.x ?? 0, r?.z ?? 0, r?.period ?? 0, r?.radius ?? 1);
  });
  const bands = options.bands ?? [0.42, 0.7, 0.9];
  const material = new THREE.ShaderMaterial({
    defines: { RIPPLES: count },
    uniforms: {
      uTime: TIME,
      uEnv: options.env ? kit.envUniform : { value: 1 },
      uC0: { value: new THREE.Color(c.deep) },
      uC1: { value: new THREE.Color(c.mid) },
      uC2: { value: new THREE.Color(c.shallow) },
      uC3: { value: new THREE.Color(c.edge) },
      uFoam: { value: new THREE.Color(c.foam) },
      uSky: { value: new THREE.Color(c.sky) },
      uBands: { value: new THREE.Vector3(...bands) },
      uRip: { value: rip },
      uRipPhase: { value: rip.map((_, i) => (i * 0.37) % 1) },
      uRipWidth: { value: options.rippleWidth ?? 0.09 },
    },
    vertexShader: /* glsl */ `
      attribute float aF;
      varying float vF;
      varying vec2 vP;
      void main() {
        vF = aF;
        vP = position.xz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uEnv;
      uniform vec3 uC0, uC1, uC2, uC3, uFoam, uSky;
      uniform vec3 uBands;
      varying float vF;
      varying vec2 vP;
      ${rippleChunk}
      void main() {
        float w = 0.035 * sin(vP.x * 2.1 + uTime * 0.35 + sin(vP.y * 1.6))
                + 0.03 * sin(vP.y * 2.7 - uTime * 0.28 + vP.x * 0.6);
        float f = vF + w * (0.25 + vF);
        float aa = fwidth(f) * 1.1 + 1e-4;
        vec3 col = uC0;
        col = mix(col, uC1, smoothstep(uBands.x - aa, uBands.x + aa, f));
        col = mix(col, uC2, smoothstep(uBands.y - aa, uBands.y + aa, f));
        col = mix(col, uC3, smoothstep(uBands.z - aa, uBands.z + aa, f));
        // Brighter sky reflection towards the far bank.
        col = mix(col, uSky, clamp(-vP.y * 0.05 - 0.02, 0.0, 0.22));
        float r = ripples(vP);
        col = mix(col, uFoam, r * 0.6);
        gl_FragColor = vec4(col, uEnv);
      }`,
    transparent: !!options.env,
  });
  return kit.track(material);
}

/**
 * Open water seen close up (lily pad scale): a soft two-tone surface with
 * slow caustic-like light bands, ripple rings and an alpha fade at `fade`.
 */
export function openWaterMaterial(
  kit: Kit,
  options: {
    deep: ColorLike;
    light: ColorLike;
    foam?: ColorLike;
    ripples?: RippleSource[];
    rippleWidth?: number;
    /** Radius where the surface starts to fade out, and radius where it is gone. */
    fade?: [number, number];
    scale?: number;
    env?: boolean;
  },
) {
  const count = Math.max(1, options.ripples?.length ?? 1);
  const rip = Array.from({ length: count }, (_, i) => {
    const r = options.ripples?.[i];
    return new THREE.Vector4(r?.x ?? 0, r?.z ?? 0, r?.period ?? 0, r?.radius ?? 1);
  });
  const material = new THREE.ShaderMaterial({
    defines: { RIPPLES: count },
    uniforms: {
      uTime: TIME,
      uEnv: options.env ? kit.envUniform : { value: 1 },
      uDeep: { value: new THREE.Color(options.deep) },
      uLight: { value: new THREE.Color(options.light) },
      uFoam: { value: new THREE.Color(options.foam ?? "#e9fbff") },
      uFade: { value: new THREE.Vector2(...(options.fade ?? [10, 15])) },
      uScale: { value: options.scale ?? 1 },
      uRip: { value: rip },
      uRipPhase: { value: rip.map((_, i) => (i * 0.37) % 1) },
      uRipWidth: { value: options.rippleWidth ?? 0.12 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vP;
      void main() {
        vP = position.xz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uEnv;
      uniform vec3 uDeep, uLight, uFoam;
      uniform vec2 uFade;
      uniform float uScale;
      varying vec2 vP;
      ${rippleChunk}
      void main() {
        vec2 q = vP * uScale;
        // Slow interfering waves: soft light bands like sky reflections.
        float a = sin(q.x * 0.55 + sin(q.y * 0.43 + uTime * 0.21) * 1.6 + uTime * 0.13);
        float b = sin(q.y * 0.61 - sin(q.x * 0.37 - uTime * 0.17) * 1.4 - uTime * 0.11);
        float band = smoothstep(0.35, 0.9, a * b);
        float aa = fwidth(a * b) + 1e-3;
        float streak = smoothstep(0.86 - aa, 0.86 + aa, a * b);
        vec3 col = mix(uDeep, uLight, band * 0.55 + (-vP.y / uFade.y) * 0.25 + 0.1);
        col = mix(col, uFoam, streak * 0.45);
        col = mix(col, uFoam, ripples(vP) * 0.5);
        float d = length(vP);
        float alpha = 1.0 - smoothstep(uFade.x, uFade.y, d);
        gl_FragColor = vec4(col, alpha * uEnv);
      }`,
    transparent: true,
    depthWrite: false,
  });
  return kit.track(material);
}

/** Painted top of a lily pad: radial veins, a lighter middle and a darker rim. */
export function padTexture(kit: Kit) {
  return kit.canvasTexture(512, 512, (g, w, h) => {
    const cx = w / 2;
    const cy = h / 2;
    const gradient = g.createRadialGradient(cx, cy, 0, cx, cy, w / 2);
    gradient.addColorStop(0, PAD.light);
    gradient.addColorStop(0.55, PAD.base);
    gradient.addColorStop(0.9, "#3fae52");
    gradient.addColorStop(0.97, PAD.dark);
    gradient.addColorStop(1, PAD.dark);
    g.fillStyle = gradient;
    g.fillRect(0, 0, w, h);
    // Gentle painterly patches.
    const random = rng(71);
    for (let i = 0; i < 26; i++) {
      const a = random() * Math.PI * 2;
      const r = (0.2 + random() * 0.65) * (w / 2);
      g.fillStyle = random() > 0.5 ? "rgba(140, 226, 110, 0.22)" : "rgba(40, 140, 70, 0.16)";
      g.beginPath();
      g.ellipse(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 18 + random() * 40, 10 + random() * 22, a, 0, Math.PI * 2);
      g.fill();
    }
    // Radial veins that fork near the edge.
    g.lineCap = "round";
    const veins = 22;
    for (let i = 0; i < veins; i++) {
      const a = (i / veins) * Math.PI * 2 + 0.07;
      const bend = (random() - 0.5) * 0.18;
      g.strokeStyle = "rgba(200, 250, 170, 0.75)";
      g.lineWidth = 5;
      g.beginPath();
      g.moveTo(cx, cy);
      const mid = 0.55 * (w / 2);
      const end = 0.9 * (w / 2);
      const mx = cx + Math.cos(a + bend) * mid;
      const my = cy + Math.sin(a + bend) * mid;
      g.quadraticCurveTo(cx + Math.cos(a) * mid * 0.5, cy + Math.sin(a) * mid * 0.5, mx, my);
      g.stroke();
      g.lineWidth = 3;
      for (const side of [-1, 1]) {
        g.beginPath();
        g.moveTo(mx, my);
        g.lineTo(cx + Math.cos(a + bend + side * 0.09) * end, cy + Math.sin(a + bend + side * 0.09) * end);
        g.stroke();
      }
    }
    // A soft centre where the stalk attaches.
    g.fillStyle = "rgba(210, 255, 180, 0.8)";
    g.beginPath();
    g.arc(cx, cy, 9, 0, Math.PI * 2);
    g.fill();
  });
}

/**
 * A flat notched lily pad of radius 1 lying in the XZ plane (top facing +Y).
 * The notch (sinus) opens towards +X; rotate the mesh to orient it.
 */
export function padGeometry(kit: Kit, notch = 0.34, segments = 48) {
  const geometry = new THREE.CircleGeometry(1, segments, notch / 2, Math.PI * 2 - notch);
  geometry.rotateX(-Math.PI / 2);
  return kit.geometry(geometry);
}

/** A pointed, slightly cupped petal from the origin along +X (length 1). */
export function petalGeometry(kit: Kit, width = 0.36, cup = 0.5) {
  const geometry = new THREE.SphereGeometry(1, 18, 12);
  const position = geometry.getAttribute("position") as THREE.BufferAttribute;
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const y = position.getY(i);
    const z = position.getZ(i);
    const t = (x + 1) / 2;
    const r = Math.sqrt(Math.max(1e-6, 1 - x * x));
    const shape = Math.pow(t, 0.5) * Math.pow(1 - t, 0.9) * 2.35;
    const half = width * shape;
    const nz = (z / r) * half;
    let ny = (y / r) * half * 0.16;
    ny += cup * (nz * nz) / Math.max(width, 1e-3) + 0.18 * t * t;
    position.setXYZ(i, t, ny, nz);
  }
  geometry.computeVertexNormals();
  return kit.geometry(geometry);
}

/**
 * A pink water lily (Nymphaea) about `size` units across, sitting on y = 0.
 * Three draw calls: petals, stamens, heart.
 */
export function waterLily(
  kit: Kit,
  options: { size?: number; seed?: number; open?: number; colors?: string[] } = {},
) {
  const size = options.size ?? 1;
  const random = rng(options.seed ?? 5);
  const group = new THREE.Group();
  const rings = [
    { n: 8, tilt: 0.12, length: 0.5, width: 0.34, color: options.colors?.[0] ?? "#ffe0ef" },
    { n: 8, tilt: 0.55, length: 0.46, width: 0.34, color: options.colors?.[1] ?? "#ff9fcd" },
    { n: 8, tilt: 0.95, length: 0.38, width: 0.32, color: options.colors?.[2] ?? "#ff6fb1" },
    { n: 6, tilt: 1.22, length: 0.28, width: 0.3, color: options.colors?.[3] ?? "#ff4f9a" },
  ];
  const total = rings.reduce((sum, ring) => sum + ring.n, 0);
  const petals = new THREE.InstancedMesh(
    petalGeometry(kit),
    kit.toon("#ffffff", { rim: 0.35, rimColor: "#fff0f8", gloss: 0.25, shadow: "#b7589a", side: THREE.DoubleSide }),
    total,
  );
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();
  const color = new THREE.Color();
  let k = 0;
  rings.forEach((ring, j) => {
    for (let i = 0; i < ring.n; i++) {
      const a = (i / ring.n) * Math.PI * 2 + j * 0.39 + (random() - 0.5) * 0.12;
      e.set(0, -a, ring.tilt + (random() - 0.5) * 0.1, "YXZ");
      q.setFromEuler(e);
      const l = ring.length * size * (0.92 + random() * 0.16);
      s.set(l, l, l * (ring.width / 0.36));
      p.set(0, size * 0.02 * j, 0);
      petals.setMatrixAt(k, m.compose(p, q, s));
      petals.setColorAt(k, color.set(ring.color));
      k++;
    }
  });
  group.add(petals);

  const stamenCount = 22;
  const stamenGeometry = kit.geometry(new THREE.CapsuleGeometry(0.018, 0.12, 3, 6));
  stamenGeometry.translate(0, 0.06, 0);
  const stamens = new THREE.InstancedMesh(stamenGeometry, kit.toon("#ffd23f", { rim: 0.3, gloss: 0.3 }), stamenCount);
  for (let i = 0; i < stamenCount; i++) {
    const a = (i / stamenCount) * Math.PI * 2;
    const r = size * 0.075;
    e.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5, "XYZ");
    q.setFromEuler(e);
    s.setScalar(size * (0.9 + random() * 0.3));
    p.set(Math.cos(a) * r, size * 0.07, Math.sin(a) * r);
    stamens.setMatrixAt(i, m.compose(p, q, s));
  }
  group.add(stamens);
  const heart = new THREE.Mesh(
    kit.geometry(new THREE.SphereGeometry(1, 16, 10)),
    kit.toon("#ffb13b", { rim: 0.3, gloss: 0.2 }),
  );
  heart.scale.set(size * 0.075, size * 0.04, size * 0.075);
  heart.position.y = size * 0.08;
  group.add(heart);
  return group;
}

/** Soft white highlight dashes lying on water (instanced, one draw call). */
export function waterGlints(
  kit: Kit,
  spots: { x: number; z: number; length: number; angle?: number }[],
  options: { y?: number; width?: number; opacity?: number; color?: ColorLike; env?: boolean } = {},
) {
  const geometry = kit.geometry(new THREE.CapsuleGeometry(0.5, 1, 2, 10));
  geometry.rotateZ(Math.PI / 2);
  geometry.scale(1, 0.02, 1);
  const mesh = new THREE.InstancedMesh(
    geometry,
    kit.flat(options.color ?? "#ffffff", { opacity: options.opacity ?? 0.7, env: options.env, depthWrite: false }),
    spots.length,
  );
  mesh.renderOrder = 1;
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();
  const axis = new THREE.Vector3(0, 1, 0);
  const width = options.width ?? 0.08;
  const y = options.y ?? 0.012;
  const update = (time: number) => {
    spots.forEach((spot, i) => {
      const wave = 0.5 + 0.5 * Math.sin(time * 0.9 + i * 1.7);
      q.setFromAxisAngle(axis, spot.angle ?? 0);
      s.set(spot.length * (0.55 + 0.6 * wave) / 2, 1, width * (0.6 + 0.4 * wave));
      p.set(spot.x + Math.sin(time * 0.3 + i) * 0.08, y, spot.z);
      mesh.setMatrixAt(i, m.compose(p, q, s));
    });
    mesh.instanceMatrix.needsUpdate = true;
  };
  update(0);
  return { mesh, update };
}

/**
 * A glassy water material: fresnel rim, a view-dependent inner gradient
 * (darker refracted ground at the top, bright sky at the bottom) and a
 * crisp specular highlight. Transparent, meant to be drawn after the
 * things seen "inside" it.
 */
export function glassMaterial(
  kit: Kit,
  options: {
    top: ColorLike;
    bottom: ColorLike;
    rim?: ColorLike;
    opacity?: number;
    rimPower?: number;
    /** Size of the sun's reflection: closer to 1 = smaller. */
    spec?: number;
    env?: boolean;
  },
) {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTop: { value: new THREE.Color(options.top) },
      uBottom: { value: new THREE.Color(options.bottom) },
      uRim: { value: new THREE.Color(options.rim ?? "#ffffff") },
      uOpacity: { value: options.opacity ?? 0.55 },
      uPower: { value: options.rimPower ?? 2.2 },
      uSpec: { value: options.spec ?? 0.994 },
      uEnv: options.env ? kit.envUniform : { value: 1 },
      uLightDir: LIGHT_DIR,
    },
    vertexShader: /* glsl */ `
      #include <common>
      varying vec3 vN;
      varying vec3 vView;
      void main() {
        #include <beginnormal_vertex>
        #include <defaultnormal_vertex>
        #include <begin_vertex>
        #include <project_vertex>
        vN = normalize(transformedNormal);
        vView = -mvPosition.xyz;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uTop, uBottom, uRim, uLightDir;
      uniform float uOpacity, uPower, uEnv, uSpec;
      varying vec3 vN;
      varying vec3 vView;
      void main() {
        vec3 n = normalize(vN);
        vec3 v = normalize(vView);
        float facing = clamp(dot(n, v), 0.0, 1.0);
        float fres = pow(1.0 - facing, uPower);
        // Refraction flips the world: ground colour on top, sky below.
        vec3 col = mix(uBottom, uTop, smoothstep(-0.7, 0.8, n.y));
        col = mix(col, uRim, fres * 0.85);
        vec3 h = normalize(uLightDir + v);
        float spec = smoothstep(uSpec - 0.004, uSpec, dot(n, h));
        col = mix(col, vec3(1.0), spec);
        float alpha = uOpacity * (0.55 + 0.45 * fres) + spec;
        gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0) * uEnv);
      }`,
    transparent: true,
    depthWrite: false,
  });
  return kit.track(material);
}

/**
 * Perfect spheres for crowds of atoms: each instance is a camera-facing quad
 * that ray-traces its sphere (correct silhouette, depth and intersections at
 * any magnification) and shades it like `kit.toon`. The instance matrix sets
 * the centre and radius (uniform scale); instance colours tint it.
 */
export function sphereImpostors(
  kit: Kit,
  color: ColorLike,
  count: number,
  options: { shadow?: ColorLike; rim?: number; rimColor?: ColorLike; gloss?: number; soft?: number; env?: boolean } = {},
) {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uShadow: { value: new THREE.Color(options.shadow ?? 0x000000) },
      uUseShadow: { value: options.shadow === undefined ? 0 : 1 },
      uRimColor: { value: new THREE.Color(options.rimColor ?? 0xffffff) },
      uRim: { value: options.rim ?? 0.35 },
      uGloss: { value: options.gloss ?? 0.2 },
      uSoft: { value: options.soft ?? 0.22 },
      uEnv: options.env ? kit.envUniform : { value: 1 },
      uLightDir: LIGHT_DIR,
    },
    vertexShader: /* glsl */ `
      varying vec3 vCenter;
      varying vec3 vRay;
      varying float vRadius;
      varying vec3 vTint;
      void main() {
        mat4 world = modelViewMatrix;
        #ifdef USE_INSTANCING
          world = modelViewMatrix * instanceMatrix;
        #endif
        vec4 center = world * vec4(0.0, 0.0, 0.0, 1.0);
        float radius = length((world * vec4(1.0, 0.0, 0.0, 0.0)).xyz);
        // A quad slightly larger than the sphere, facing the camera.
        vec3 side = normalize(cross(vec3(0.0, 1.0, 0.0), center.xyz));
        vec3 up = normalize(cross(center.xyz, side));
        vec3 corner = center.xyz + (side * position.x + up * position.y) * radius * 1.25;
        vCenter = center.xyz;
        vRay = corner;
        vRadius = radius;
        vTint = vec3(1.0);
        #ifdef USE_INSTANCING_COLOR
          vTint = instanceColor;
        #endif
        gl_Position = projectionMatrix * vec4(corner, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform mat4 projectionMatrix;
      uniform vec3 uColor, uShadow, uRimColor, uLightDir;
      uniform float uUseShadow, uRim, uGloss, uSoft, uEnv;
      varying vec3 vCenter;
      varying vec3 vRay;
      varying float vRadius;
      varying vec3 vTint;
      void main() {
        vec3 d = normalize(vRay);
        float b = dot(d, vCenter);
        float h = b * b - dot(vCenter, vCenter) + vRadius * vRadius;
        if (h < 0.0) discard;
        float t = b - sqrt(h);
        vec3 p = d * t;
        vec3 n = normalize(p - vCenter);
        vec4 clip = projectionMatrix * vec4(p, 1.0);
        gl_FragDepth = clamp((clip.z / clip.w) * 0.5 + 0.5, 0.0, 1.0);
        vec3 base = uColor * vTint;
        vec3 v = -d;
        float ndl = dot(n, uLightDir);
        float lit = smoothstep(-uSoft, uSoft, ndl + 0.08);
        vec3 shade = uUseShadow > 0.5 ? uShadow * vTint : mix(base * vec3(0.5, 0.48, 0.66), vec3(0.17, 0.1, 0.4), 0.3);
        vec3 col = mix(shade, base, lit);
        float hl = smoothstep(0.78 - uSoft * 0.4, 0.78 + uSoft * 0.4, ndl) * uGloss;
        col = mix(col, mix(base, vec3(1.0, 0.98, 0.92), 0.6), hl);
        float fres = 1.0 - clamp(dot(n, v), 0.0, 1.0);
        float rim = smoothstep(0.55, 0.95, fres) * uRim;
        col = mix(col, uRimColor * vTint, rim);
        gl_FragColor = vec4(col, uEnv);
      }`,
    transparent: !!options.env,
    side: THREE.DoubleSide,
  });
  kit.track(material);
  const mesh = new THREE.InstancedMesh(kit.geometry(new THREE.PlaneGeometry(2, 2)), material, Math.max(1, count));
  mesh.frustumCulled = false;
  return mesh;
}

/** The inner back wall: a tiny inverted image of the world (a lens effect). */
export function lensMaterial(kit: Kit, env = false) {
  return kit.track(
    new THREE.ShaderMaterial({
      uniforms: {
        uGround: { value: new THREE.Color("#3cbf6e") },
        uGroundFar: { value: new THREE.Color("#1f8a5a") },
        uSky: { value: new THREE.Color("#c4f3ff") },
        uSkyDeep: { value: new THREE.Color("#58bdf0") },
        uFlower: { value: new THREE.Color("#ff8fc7") },
        uEnv: env ? kit.envUniform : { value: 1 },
        uTime: TIME,
              },
      vertexShader: /* glsl */ `
        varying vec3 vN;
        void main() {
          mat4 model = modelViewMatrix;
          vec3 n = normal;
          #ifdef USE_INSTANCING
            model = modelViewMatrix * instanceMatrix;
            n = mat3(instanceMatrix) * n;
          #endif
          vN = normalize(normalMatrix * n);
          gl_Position = projectionMatrix * model * vec4(position, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uGround, uGroundFar, uSky, uSkyDeep, uFlower;
        uniform float uTime, uEnv;
        varying vec3 vN;
        void main() {
          vec3 n = normalize(vN);
          // Horizon of the inverted image, gently wobbling like a living lens.
          float wobble = 0.025 * sin(n.x * 9.0 + uTime * 0.6);
          // The lens bends the inverted horizon into an arc.
          float h = n.y + 0.02 - 0.45 * n.x * n.x + wobble;
          float aa = fwidth(h) * 1.5 + 0.04;
          float ground = smoothstep(-aa, aa, h);
          vec3 groundCol = mix(uGround, uGroundFar, smoothstep(0.0, 0.8, n.y));
          // Veins of the pad, inverted and squeezed by the lens.
          float veins = smoothstep(0.93, 0.99, sin(atan(n.x, n.y + 1.4) * 38.0));
          groundCol = mix(groundCol, vec3(0.75, 0.97, 0.62), veins * 0.35 * ground);
          vec3 skyCol = mix(uSky, uSkyDeep, smoothstep(0.0, -0.9, n.y));
          vec3 col = mix(skyCol, groundCol, ground);
          // The water lily behind the drop, upside down near the horizon.
          float flower = 1.0 - smoothstep(0.1, 0.16, length(vec2((n.x - 0.42) * 1.4, h - 0.1)));
          col = mix(col, uFlower, flower * 0.85);
          // A bright thin line where the image of the far edge of the pad sits.
          col = mix(col, vec3(1.0), (1.0 - smoothstep(0.0, 0.05, abs(h))) * 0.5);
          gl_FragColor = vec4(col, 0.9 * uEnv);
        }`,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
    }),
  );
}
