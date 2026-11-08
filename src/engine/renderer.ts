/**
 * The one WebGL renderer of the app. Every section draws on the same canvas
 * with it (mobile browsers limit the number of live WebGL contexts), and only
 * the active section's engine renders frames.
 */
import * as THREE from "three";

THREE.ColorManagement.enabled = false;

export function createRenderer(canvas: HTMLCanvasElement, options: { preserveDrawingBuffer?: boolean } = {}) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
    preserveDrawingBuffer: options.preserveDrawingBuffer ?? false,
  });
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  additiveLightOnly(renderer.getContext());
  renderer.autoClear = false;
  renderer.setClearColor(0x000000, 1);
  return renderer;
}

/**
 * Additive light must not add coverage: otherwise a glow drawn into a
 * transparent render target darkens whatever lies behind it once the layer is
 * composited. Additive blending keeps adding colour but leaves alpha alone.
 */
function additiveLightOnly(gl: WebGLRenderingContext | WebGL2RenderingContext) {
  const separate = gl.blendFuncSeparate.bind(gl);
  const single = gl.blendFunc.bind(gl);
  gl.blendFuncSeparate = (srcRGB: number, dstRGB: number, srcAlpha: number, dstAlpha: number) =>
    dstRGB === gl.ONE && srcAlpha === gl.ONE && dstAlpha === gl.ONE && (srcRGB === gl.SRC_ALPHA || srcRGB === gl.ONE)
      ? separate(srcRGB, dstRGB, gl.ZERO, gl.ONE)
      : separate(srcRGB, dstRGB, srcAlpha, dstAlpha);
  gl.blendFunc = (src: number, dst: number) =>
    src === gl.ONE && dst === gl.ONE ? separate(gl.ONE, gl.ONE, gl.ZERO, gl.ONE) : single(src, dst);
}
