/**
 * Screen-space helpers shared by the engines: the theme gradient behind every
 * scene, a pool of render targets and the compositor that cross-fades them.
 */
import * as THREE from "three";

export interface GradientTheme {
  top: THREE.ColorRepresentation;
  bottom: THREE.ColorRepresentation;
  accent: THREE.ColorRepresentation;
}

/* -------------------------------------------------------------------- */
/* Background gradient                                                   */
/* -------------------------------------------------------------------- */

export class Background {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly material: THREE.ShaderMaterial;
  private readonly geometry = new THREE.PlaneGeometry(2, 2);
  private readonly a = new THREE.Color();
  private readonly b = new THREE.Color();

  constructor() {
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTop: { value: new THREE.Color() },
        uBottom: { value: new THREE.Color() },
        uGlow: { value: new THREE.Color() },
        uCenter: { value: new THREE.Vector2(0.5, 0.5) },
        uAspect: { value: 1 },
        uTime: { value: 0 },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uTop; uniform vec3 uBottom; uniform vec3 uGlow;
        uniform vec2 uCenter; uniform float uAspect; uniform float uTime;
        varying vec2 vUv;
        void main() {
          vec3 col = mix(uBottom, uTop, smoothstep(0.0, 1.0, vUv.y));
          vec2 d = (vUv - uCenter) * vec2(uAspect, 1.0);
          col = mix(col, uGlow, exp(-dot(d, d) * 2.8) * 0.4);
          vec2 q = (vUv - 0.5) * vec2(uAspect, 1.0);
          col *= mix(0.8, 1.0, smoothstep(1.1, 0.25, length(q)));
          float n = fract(sin(dot(gl_FragCoord.xy + fract(uTime) * 91.0, vec2(12.9898, 78.233))) * 43758.5453);
          col += (n - 0.5) * 0.02;
          gl_FragColor = vec4(col, 1.0);
        }`,
      depthTest: false,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(this.geometry, this.material);
    mesh.frustumCulled = false;
    this.scene.add(mesh);
  }

  update(
    from: GradientTheme,
    to: GradientTheme,
    t: number,
    center: THREE.Vector2,
    aspect: number,
    time: number,
  ) {
    const u = this.material.uniforms;
    u.uTop.value.set(from.top).lerp(this.a.set(to.top), t);
    u.uBottom.value.set(from.bottom).lerp(this.a.set(to.bottom), t);
    const glowFrom = this.a.set(from.bottom).lerp(this.b.set(from.accent), 0.28);
    const glowTo = this.b.set(to.bottom).lerp(new THREE.Color(to.accent), 0.28);
    u.uGlow.value.copy(glowFrom).lerp(glowTo, t);
    u.uCenter.value.copy(center);
    u.uAspect.value = aspect;
    u.uTime.value = time;
  }

  dispose() {
    this.material.dispose();
    this.geometry.dispose();
  }
}

/* -------------------------------------------------------------------- */
/* Render targets and compositing                                        */
/* -------------------------------------------------------------------- */

export class RenderTargetPool {
  private readonly pool: THREE.WebGLRenderTarget[] = [];
  private width = 1;
  private height = 1;

  get(index: number, renderer: THREE.WebGLRenderer) {
    while (this.pool.length <= index) {
      const samples = renderer.capabilities.isWebGL2 ? 4 : 0;
      this.pool.push(
        new THREE.WebGLRenderTarget(this.width, this.height, {
          samples,
          depthBuffer: true,
        }),
      );
    }
    return this.pool[index];
  }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    for (const target of this.pool) target.setSize(width, height);
  }

  dispose() {
    for (const target of this.pool) target.dispose();
    this.pool.length = 0;
  }
}

export class Compositor {
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly material: THREE.ShaderMaterial;
  private readonly geometry = new THREE.PlaneGeometry(2, 2);

  constructor() {
    this.material = new THREE.ShaderMaterial({
      uniforms: { tMap: { value: null }, uAlpha: { value: 1 } },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D tMap; uniform float uAlpha; varying vec2 vUv;
        void main() { gl_FragColor = texture2D(tMap, vUv) * uAlpha; }`,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
      blendSrcAlpha: THREE.OneFactor,
      blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
    });
    const mesh = new THREE.Mesh(this.geometry, this.material);
    mesh.frustumCulled = false;
    this.scene.add(mesh);
  }

  draw(renderer: THREE.WebGLRenderer, texture: THREE.Texture, alpha: number) {
    this.material.uniforms.tMap.value = texture;
    this.material.uniforms.uAlpha.value = alpha;
    renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.material.dispose();
    this.geometry.dispose();
  }
}
