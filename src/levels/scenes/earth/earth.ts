/**
 * Earth (1 unit = 1,274 km, radius 5): an illustrated globe painted from
 * hand-drawn continent outlines, with drifting clouds, a violet night side
 * dotted with city lights, a thin glowing atmosphere and the Space Station.
 *
 * The globe itself never turns: the `region` level is anchored on north-east
 * France (48.3° N, 4° E), facing the camera at the home view. Only the clouds
 * (which keep clear skies over the region) and the ISS move.
 */
import * as THREE from "three";
import type { SceneBuilder } from "../types";
import { LON0, REGION_LAT, REGION_LON, paintClouds, paintEarth, paintLights } from "./earthMap";
import { SUN_EARTH, atmosphereMaterial, planetMaterial } from "./shared";

const RADIUS = 5;
const DEG = Math.PI / 180;

const cloudVertex = /* glsl */ `
varying vec3 vObjN;
varying vec2 vUv;
void main() {
  vUv = uv;
  vObjN = normal;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const cloudFragment = /* glsl */ `
uniform sampler2D map;
uniform vec3 uSun;
uniform vec3 uClear;
uniform float uOffset;
uniform float uOpacity;
uniform float uShadow;
varying vec3 vObjN;
varying vec2 vUv;
void main() {
  vec4 t = texture2D(map, vec2(vUv.x - uOffset, vUv.y));
  vec3 n = normalize(vObjN);
  float ndl = dot(n, uSun);
  float day = smoothstep(-0.12, 0.2, ndl);
  vec3 lit = mix(vec3(0.8, 0.85, 1.0), vec3(1.0), smoothstep(0.02, 0.55, ndl));
  vec3 col = mix(vec3(0.3, 0.25, 0.58), lit, day);
  // Clear skies over the region below, so it is never hidden by a passing cloud.
  float clear = smoothstep(0.03, 0.085, distance(n, uClear));
  float a = t.a * clear * mix(0.35, 0.96, day);
  if (uShadow > 0.5) {
    col = vec3(0.1, 0.08, 0.32);
    a = t.a * clear * 0.2 * day;
  }
  gl_FragColor = vec4(col, a * uOpacity);
}`;

const earth: SceneBuilder = ({ kit, quality }) => {
  const root = new THREE.Group();
  const env = new THREE.Group();
  const high = quality === "high";

  /* The globe. */
  const mapSize = high ? 2048 : 1024;
  const map = kit.canvasTexture(mapSize, mapSize / 2, paintEarth);
  map.wrapS = THREE.RepeatWrapping;
  map.anisotropy = 8;
  const lights = kit.canvasTexture(1024, 512, paintLights);
  lights.wrapS = THREE.RepeatWrapping;
  const sphere = kit.geometry(new THREE.SphereGeometry(RADIUS, high ? 128 : 72, high ? 64 : 36));
  const globe = new THREE.Mesh(
    sphere,
    planetMaterial(kit, {
      map,
      lights,
      sun: SUN_EARTH,
      night: "#2b1f73",
      twilight: "#ff7f9e",
      rimColor: "#a6ddff",
      rim: 0.75,
      spec: 0,
    }),
  );
  root.add(globe);

  /* Clouds: a soft shadow on the ground, then the lit layer, both drifting east. */
  const cloudMap = kit.canvasTexture(high ? 2048 : 1024, high ? 1024 : 512, (g, w, h) => paintClouds(g, w, h, 5));
  cloudMap.wrapS = THREE.RepeatWrapping;
  const regionDir = new THREE.Vector3(
    Math.cos(REGION_LAT * DEG) * Math.sin((REGION_LON - LON0) * DEG),
    Math.sin(REGION_LAT * DEG),
    Math.cos(REGION_LAT * DEG) * Math.cos((REGION_LON - LON0) * DEG),
  );
  const cloudMaterial = (shadow: boolean) =>
    kit.track(
      new THREE.ShaderMaterial({
        vertexShader: cloudVertex,
        fragmentShader: cloudFragment,
        uniforms: {
          map: { value: cloudMap },
          uSun: { value: SUN_EARTH.clone() },
          uClear: { value: regionDir.clone().normalize() },
          uOffset: { value: 0 },
          uOpacity: { value: 1 },
          uShadow: { value: shadow ? 1 : 0 },
        },
        transparent: true,
        depthWrite: false,
      }),
    );
  const shadowMaterial = cloudMaterial(true);
  const cloudShadow = new THREE.Mesh(kit.geometry(new THREE.SphereGeometry(RADIUS * 1.004, 96, 48)), shadowMaterial);
  // Sun-facing offset so the shadow falls a little away from the Sun.
  cloudShadow.position.copy(SUN_EARTH).multiplyScalar(-0.06);
  root.add(cloudShadow);
  const cloudsMaterial = cloudMaterial(false);
  const clouds = new THREE.Mesh(kit.geometry(new THREE.SphereGeometry(RADIUS * 1.018, 96, 48)), cloudsMaterial);
  root.add(clouds);

  /* Atmosphere: a thin glow hugging the limb, brighter on the day side. */
  const shell = 1.075;
  const atmosphere = new THREE.Mesh(
    kit.geometry(new THREE.SphereGeometry(RADIUS * shell, 96, 48)),
    atmosphereMaterial(kit, { color: "#62b6ff", sun: SUN_EARTH, shell, opacity: 1, power: 1.6, nightFloor: 0.18 }),
  );
  root.add(atmosphere);
  const haze = new THREE.Mesh(
    kit.geometry(new THREE.SphereGeometry(RADIUS * 1.2, 64, 32)),
    atmosphereMaterial(kit, { color: "#4f7dff", sun: SUN_EARTH, shell: 1.2, opacity: 0.35, power: 3, nightFloor: 0.1 }),
  );
  root.add(haze);

  /* Surroundings: a hint of the distant Sun's glow, and the Space Station. */
  const sunGlow = kit.glow("#ffd9a0", 12, { opacity: 0.2, env: true });
  sunGlow.position.copy(SUN_EARTH).multiplyScalar(13);
  env.add(sunGlow);

  const issOrbit = new THREE.Group();
  issOrbit.rotation.z = -51.6 * DEG;
  const issRadius = RADIUS * (6771 / 6371);
  issOrbit.add(kit.circle(issRadius, { color: "#dff3ff", width: 1.2, opacity: 0.45, env: true, dashed: true, dashSize: 0.12, gapSize: 0.1 }));
  const iss = new THREE.Group();
  const issBody = new THREE.Mesh(kit.geometry(new THREE.BoxGeometry(0.05, 0.03, 0.03)), kit.toon("#ffffff", { env: true, rim: 0.3 }));
  const panels = new THREE.Mesh(kit.geometry(new THREE.BoxGeometry(0.2, 0.006, 0.07)), kit.toon("#ffd23f", { env: true, rim: 0.3 }));
  iss.add(issBody, panels, kit.glow("#bfe8ff", 0.35, { opacity: 0.8, env: true }));
  issOrbit.add(iss);
  env.add(issOrbit);

  return {
    root,
    env,
    update({ time }) {
      const drift = time * 0.0022;
      cloudsMaterial.uniforms.uOffset.value = drift;
      shadowMaterial.uniforms.uOffset.value = drift;
      const a = 2.2 + time * 0.12;
      iss.position.set(Math.cos(a) * issRadius, 0, Math.sin(a) * issRadius);
      iss.rotation.y = -a;
    },
  };
};

export default earth;
