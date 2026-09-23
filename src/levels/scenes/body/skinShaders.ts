/**
 * Small shader extensions of the kit's toon material, shared by the hand →
 * red blood cell scenes. Each helper patches a material returned by
 * `kit.toon()` (so it keeps the illustrated lighting and is disposed by the
 * kit) before it is first compiled.
 */
import * as THREE from "three";
import type { Kit, ToonOptions } from "../../../engine/kit";
import { TIME } from "../../../engine/kit";

export interface ToonPatch {
  uniforms?: Record<string, THREE.IUniform>;
  /** Declarations added to the vertex shader. */
  vertexDecl?: string;
  /** Code run right after `#include <begin_vertex>`: may displace `transformed` (object space). */
  vertexTransform?: string;
  /** Code appended at the end of the vertex main(); `transformed` is the object-space position. */
  vertexMain?: string;
  /** Declarations added to the fragment shader. */
  fragmentDecl?: string;
  /** Code run after `n` (view-space normal) is set; may change `base` and `n`. */
  fragmentNormal?: string;
  /** Code run at the end; may change `col` (vec3) and `outAlpha` (float). */
  fragmentFinal?: string;
}

/** Patch a toon material in place. */
export function patchToon(material: THREE.ShaderMaterial, patch: ToonPatch) {
  Object.assign(material.uniforms, patch.uniforms ?? {});
  material.vertexShader = material.vertexShader
    .replace("varying vec3 vView;", `varying vec3 vView;\n${patch.vertexDecl ?? ""}`)
    .replace("#include <begin_vertex>", `#include <begin_vertex>\n${patch.vertexTransform ?? ""}`)
    .replace("vView = -mvPosition.xyz;", `vView = -mvPosition.xyz;\n${patch.vertexMain ?? ""}`);
  material.fragmentShader = material.fragmentShader
    .replace("varying vec3 vView;", `varying vec3 vView;\n${patch.fragmentDecl ?? ""}`)
    .replace("if (!gl_FrontFacing) n = -n;", `if (!gl_FrontFacing) n = -n;\n${patch.fragmentNormal ?? ""}`)
    .replace(
      "gl_FragColor = vec4(col, uOpacity * uEnv);",
      `float outAlpha = uOpacity * uEnv;\n${patch.fragmentFinal ?? ""}\ngl_FragColor = vec4(col, outAlpha);`,
    );
  material.needsUpdate = true;
  return material;
}

/** A toon material with a patch applied. */
export function patchedToon(kit: Kit, color: THREE.ColorRepresentation, options: ToonOptions, patch: ToonPatch) {
  return patchToon(kit.toon(color, options) as THREE.ShaderMaterial, patch);
}

/** Vertex code giving `vObj`, the object-space position (instancing aware). */
export const OBJECT_POSITION = {
  decl: "varying vec3 vObj;",
  main: `vec4 kitObj = vec4(transformed, 1.0);
#ifdef USE_INSTANCING
  kitObj = instanceMatrix * kitObj;
#endif
  vObj = kitObj.xyz;`,
};

/**
 * Tubes whose brightness flows along their length (blood, nerve impulses).
 * Uses the geometry's `uv.x` (0 → 1 along a kit.tube).
 */
export function flowToon(
  kit: Kit,
  color: THREE.ColorRepresentation,
  options: ToonOptions & { speed?: number; stripes?: number; strength?: number; pulse?: THREE.ColorRepresentation } = {},
) {
  return patchedToon(kit, color, options, {
    uniforms: {
      uTime: TIME,
      uSpeed: { value: options.speed ?? 0.4 },
      uStripes: { value: options.stripes ?? 6 },
      uStrength: { value: options.strength ?? 0.18 },
      uPulse: { value: new THREE.Color(options.pulse ?? "#ffffff") },
    },
    vertexDecl: "varying vec2 vFlowUv;",
    vertexMain: "vFlowUv = uv;",
    fragmentDecl: "varying vec2 vFlowUv;\nuniform float uTime;\nuniform float uSpeed;\nuniform float uStripes;\nuniform float uStrength;\nuniform vec3 uPulse;",
    fragmentFinal: `float kitFlow = 0.5 + 0.5 * sin((vFlowUv.x * uStripes - uTime * uSpeed) * 6.2831853);
    col = mix(col, uPulse, uStrength * smoothstep(0.55, 1.0, kitFlow));`,
  });
}

/** Release per-instance buffers of every InstancedMesh (the engine frees geometries and materials). */
export function disposeInstances(...groups: THREE.Object3D[]) {
  for (const group of groups)
    group.traverse((object) => {
      if (object instanceof THREE.InstancedMesh) object.dispose();
    });
}
