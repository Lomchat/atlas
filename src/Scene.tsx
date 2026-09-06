import { useEffect, useRef, useState } from "react";
import * as T from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { elements, molecules, entriesFor, particles } from "./data";
import type { ModelState, Entry } from "./data";

type Props = {
  state: ModelState;
  onSelect: (id: string) => void;
  onPhase: (phase: number) => void;
  onReady: () => void;
};
type Piece = {
  id: string;
  object: T.Object3D;
  home: T.Vector3;
  away: T.Vector3;
  radius: number;
  label: HTMLButtonElement;
  material?: T.MeshPhysicalMaterial;
};
type Link = {
  mesh: T.Mesh<T.CylinderGeometry, T.MeshStandardMaterial>;
  a: number;
  b: number;
  offset: number;
};
const vec = (x = 0, y = 0, z = 0) => new T.Vector3(x, y, z);
function seeded(seed: number) {
  return () => {
    seed = (Math.imul(1664525, seed) + 1013904223) | 0;
    return (seed >>> 0) / 4294967296;
  };
}

export default function Scene({ state, onSelect, onPhase, onReady }: Props) {
  const host = useRef<HTMLDivElement>(null),
    latest = useRef(state),
    selectRef = useRef(onSelect),
    phaseRef = useRef(onPhase),
    readyRef = useRef(onReady);
  latest.current = state;
  selectRef.current = onSelect;
  phaseRef.current = onPhase;
  readyRef.current = onReady;
  const [error, setError] = useState(false);
  const key = [
    state.level,
    state.molecule,
    state.element,
    state.nucleon,
    state.boson,
    state.light,
  ].join(":");
  useEffect(() => {
    const container = host.current!;
    let disposed = false,
      frame = 0;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let renderer: T.WebGLRenderer;
    try {
      renderer = new T.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
      });
    } catch {
      setError(true);
      return;
    }
    setError(false);
    const mobile = container.clientWidth < 768;
    renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.5 : 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = state.light ? 1.0 : 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    renderer.domElement.setAttribute(
      "aria-label",
      "Modèle 3D interactif de la matière",
    );
    container.appendChild(renderer.domElement);
    const scene = new T.Scene();
    scene.background = new T.Color(state.light ? "#e9ece7" : "#101413");
    scene.fog = new T.Fog(state.light ? "#e9ece7" : "#101413", 22, 65);
    const camera = new T.PerspectiveCamera(34, 1, 0.05, 150);
    camera.position.set(0.2, 3.2, 12);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.target.set(0, 0, 0);
    controls.minDistance = 2;
    controls.maxDistance = 45;
    controls.autoRotateSpeed = 0.45;
    controls.enablePan = true;
    controls.maxPolarAngle = Math.PI * 0.89;
    const pmrem = new T.PMREMGenerator(renderer),
      room = new RoomEnvironment();
    const env = pmrem.fromScene(room, 0.03);
    scene.environment = env.texture;
    scene.environmentIntensity = 0.65;
    room.dispose();
    pmrem.dispose();
    scene.add(
      new T.HemisphereLight(state.light ? 0xf7ffff : 0xdfe8d8, 0x324039, 0.9),
    );
    const keyLight = new T.DirectionalLight(0xffeee0, 2.7);
    keyLight.position.set(-4, 7, 5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.left = -8;
    keyLight.shadow.camera.right = 8;
    keyLight.shadow.camera.top = 8;
    keyLight.shadow.camera.bottom = -8;
    keyLight.shadow.bias = -0.001;
    keyLight.shadow.normalBias = 0.035;
    keyLight.shadow.radius = 5;
    scene.add(keyLight);
    const fill = new T.DirectionalLight(0xb3d8d0, 1.7);
    fill.position.set(5, 2, -5);
    scene.add(fill);
    const model = new T.Group();
    scene.add(model);
    const sphereGeo = new T.SphereGeometry(1, 48, 32);
    const pieces: Piece[] = [],
      links: Link[] = [],
      clouds: T.Object3D[] = [],
      pickers: T.Object3D[] = [];
    const labels = document.createElement("div");
    labels.className = "scene-labels";
    container.appendChild(labels);
    const entries = entriesFor(state);
    const materials: T.Material[] = [];
    function material(color: string, glow = 0) {
      const m = new T.MeshPhysicalMaterial({
        color,
        metalness: 0.22,
        roughness: 0.26,
        clearcoat: 1,
        clearcoatRoughness: 0.22,
        emissive: color,
        emissiveIntensity: glow,
      });
      materials.push(m);
      return m;
    }
    function ball(
      parent: T.Object3D,
      color: string,
      radius: number,
      pos = vec(),
      glow = 0,
    ) {
      const m = material(color, glow),
        mesh = new T.Mesh(sphereGeo, m);
      mesh.scale.setScalar(radius);
      mesh.position.copy(pos);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    }
    function labelFor(entry: Entry) {
      const button = document.createElement("button");
      button.className = "atom-label";
      button.dataset.piece = entry.id;
      button.setAttribute("aria-label", `Inspecter ${entry.name}`);
      button.innerHTML = `<span class="label-symbol">${entry.symbol}</span><span class="label-name">${entry.name}</span><span class="label-line"></span>`;
      button.style.setProperty("--particle", entry.color);
      button.addEventListener("pointerdown", (e) => e.stopPropagation());
      button.addEventListener("click", () => selectRef.current(entry.id));
      labels.appendChild(button);
      return button;
    }
    function register(
      object: T.Object3D,
      entry: Entry,
      home: T.Vector3,
      away: T.Vector3,
      radius: number,
      mat?: T.MeshPhysicalMaterial,
    ) {
      object.position.copy(home);
      object.userData.pieceId = entry.id;
      object.traverse((child) => {
        if (child instanceof T.Mesh) {
          child.userData.pieceId = entry.id;
          pickers.push(child);
        }
      });
      const piece = {
        id: entry.id,
        object,
        home,
        away,
        radius,
        label: labelFor(entry),
        material: mat,
      };
      pieces.push(piece);
      return piece;
    }
    function cloud(
      parent: T.Object3D,
      radius: number,
      count: number,
      color: string,
      shape: "sphere" | "p" = "sphere",
      seed = 1,
    ) {
      const rng = seeded(seed),
        positions = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        const az = rng() * Math.PI * 2,
          cos = 2 * rng() - 1,
          sin = Math.sqrt(1 - cos * cos),
          r = radius * Math.pow(rng(), 0.6);
        let x = r * sin * Math.cos(az),
          y = r * cos,
          z = r * sin * Math.sin(az);
        if (shape === "p") {
          x *= 0.47;
          z *= 0.47;
          y = (y < 0 ? -1 : 1) * (0.25 + Math.abs(y));
        }
        positions.set([x, y, z], i * 3);
      }
      const geometry = new T.BufferGeometry();
      geometry.setAttribute("position", new T.BufferAttribute(positions, 3));
      const mat = new T.PointsMaterial({
        color,
        size: mobile ? 0.028 : 0.019,
        transparent: true,
        opacity: state.light ? 0.24 : 0.35,
        depthWrite: false,
        blending: state.light ? T.NormalBlending : T.AdditiveBlending,
      });
      mat.onBeforeCompile = (shader) => {
        shader.fragmentShader = shader.fragmentShader
          .replace(
            "#include <clipping_planes_fragment>",
            "#include <clipping_planes_fragment>\nfloat d=length(gl_PointCoord-vec2(0.5)); if(d>0.5) discard;",
          )
          .replace(
            "vec4 diffuseColor = vec4( diffuse, opacity );",
            "vec4 diffuseColor = vec4( diffuse, opacity * (1.0-smoothstep(0.1,0.5,length(gl_PointCoord-vec2(0.5)))) );",
          );
      };
      materials.push(mat);
      const obj = new T.Points(geometry, mat);
      parent.add(obj);
      clouds.push(obj);
      return obj;
    }
    function line(points: T.Vector3[], color: string, opacity = 0.3) {
      const geo = new T.BufferGeometry().setFromPoints(points),
        mat = new T.LineBasicMaterial({ color, transparent: true, opacity });
      materials.push(mat);
      const obj = new T.Line(geo, mat);
      model.add(obj);
      return obj;
    }
    function ring(radius: number, y: number, color: string, opacity = 0.25) {
      const pts = Array.from({ length: 129 }, (_, i) =>
        vec(
          Math.cos((i / 128) * Math.PI * 2) * radius,
          y,
          Math.sin((i / 128) * Math.PI * 2) * radius,
        ),
      );
      return line(pts, color, opacity);
    }
    function positionsNucleus(count: number, spacing = 0.62) {
      const pts: T.Vector3[] = [];
      for (let x = -2; x <= 2; x++)
        for (let y = -2; y <= 2; y++)
          for (let z = -2; z <= 2; z++)
            if ((x + y + z) % 2 === 0)
              pts.push(vec(x * spacing, y * spacing, z * spacing));
      pts.sort((a, b) => a.lengthSq() - b.lengthSq() || a.x - b.x || a.z - b.z);
      return pts.slice(0, count);
    }
    function makeNucleus(
      parent: T.Object3D,
      z: number,
      n: number,
      radius: number,
    ) {
      const pts = positionsNucleus(z + n, 0.62);
      const g = new T.Group();
      pts.forEach((p, i) =>
        ball(
          g,
          i < z ? particles.proton.color : particles.neutron.color,
          0.44,
          p,
        ),
      );
      const box = new T.Box3().setFromObject(g),
        c = box.getCenter(vec());
      g.children.forEach((o) => o.position.sub(c));
      const max = box.getSize(vec()).length() / 2;
      g.scale.setScalar(radius / Math.max(0.5, max));
      parent.add(g);
      return g;
    }
    function coil(a: T.Vector3, b: T.Vector3, phase = 0) {
      const direction = b.clone().sub(a),
        normal = vec(0, 0, 1),
        side = vec().crossVectors(direction, normal).normalize();
      return Array.from({ length: 100 }, (_, i) => {
        const t = i / 99,
          envelope = Math.sin(t * Math.PI) * 0.14;
        return a
          .clone()
          .lerp(b, t)
          .addScaledVector(normal, Math.cos(t * 40 + phase) * envelope)
          .addScaledVector(side, Math.sin(t * 40 + phase) * envelope);
      });
    }
    let photon: T.Group | undefined,
      hydrogenCloud: T.Points | undefined,
      electron: T.Mesh | undefined,
      higgsSurface: T.Points | undefined;
    let interactionClock = 0,
      phase = -1,
      lastPlay = state.play;
    const gluonLines: T.Line[] = [];
    if (state.level === "molecule") {
      const mol = molecules[state.molecule];
      mol.atoms.forEach((a, i) => {
        const radius = a.element === "H" ? 0.57 : 0.87,
          home = vec(...a.pos);
        const away = home.clone().multiplyScalar(1.85);
        if (i === 0) away.y += 0.55;
        const mesh = ball(model, elements[a.element].color, radius);
        register(mesh, entries[i], home, away, radius, mesh.material);
      });
      mol.bonds.forEach(([a, b, count]) => {
        for (let i = 0; i < count; i++) {
          const m = new T.MeshStandardMaterial({
            color: state.light ? "#a8b3a9" : "#708279",
            metalness: 0.65,
            roughness: 0.3,
            transparent: true,
          });
          materials.push(m);
          const mesh = new T.Mesh(new T.CylinderGeometry(0.12, 0.12, 1, 24), m);
          mesh.castShadow = true;
          model.add(mesh);
          links.push({
            mesh,
            a,
            b,
            offset: count === 2 ? (i - 0.5) * 0.34 : 0,
          });
        }
      });
    } else if (state.level === "atom") {
      const e = elements[state.element],
        g = new T.Group();
      model.add(g);
      makeNucleus(g, e.z, e.n, 0.55);
      register(g, entries[0], vec(), vec(0, 0.2, 0), 0.65);
      const inner = cloud(model, 0.94, 2400, "#9ecbd2");
      inner.userData.cloud = true;
      if (e.z > 2) {
        const outer = cloud(model, 2.1, 5200, "#91bbaa");
        outer.userData.cloud = true;
        for (let a = 0; a < 3; a++) {
          const p = cloud(model, 1.65, 1100, "#91bbaa", "p", a + 3);
          p.rotation.z = (a * Math.PI) / 3;
        }
      }
      for (let i = 0; i < e.z; i++) {
        const r = i < 2 ? 0.85 : 1.92,
          angle = i * 2.39996,
          home = vec(
            Math.cos(angle) * r,
            Math.sin(angle) * r * 0.83,
            Math.sin(angle * 1.7) * r * 0.45,
          );
        const away = vec(((i % 4) - 1.5) * 1.35, (i < 4 ? 1 : -1) * 1.9, 0.3);
        const mesh = ball(model, particles.electron.color, 0.115, vec(), 0.25);
        register(mesh, entries[i + 1], home, away, 0.16, mesh.material);
      }
    } else if (state.level === "nucleus") {
      const e = elements[state.element],
        pts = positionsNucleus(e.z + e.n, 0.75),
        center = pts.reduce((a, p) => a.add(p), vec()).divideScalar(pts.length);
      entries.forEach((entry, i) => {
        const home = pts[i].clone().sub(center),
          cols = 4,
          rows = Math.ceil(entries.length / cols),
          away = vec(
            ((i % cols) - 1.5) * 1.25,
            ((rows - 1) / 2 - Math.floor(i / cols)) * 1.25,
            0,
          );
        if (entries.length === 1) away.set(0, 0, 0);
        const mesh = ball(model, entry.color, 0.51);
        register(mesh, entry, home, away, 0.51, mesh.material);
      });
    } else if (
      state.level === "quarks" ||
      (state.level === "interaction" && state.boson === "gluon")
    ) {
      const quarks =
        state.level === "quarks"
          ? entries.slice(0, 3)
          : [particles.up, particles.up, particles.down];
      quarks.forEach((entry, i) => {
        const a = (i / 3) * Math.PI * 2 + Math.PI / 2,
          home = vec(
            Math.cos(a) * 1.05,
            Math.sin(a) * 1.05,
            Math.sin(i * 3) * 0.25,
          ),
          mesh = ball(model, entry.color, 0.51);
        if (state.level === "quarks")
          register(
            mesh,
            entry,
            home,
            home.clone().multiplyScalar(2.0),
            0.51,
            mesh.material,
          );
        else mesh.position.copy(home);
      });
      cloud(model, 1.65, 4000, "#a3ba9f");
      for (let i = 0; i < 3; i++) {
        const a =
            state.level === "quarks"
              ? pieces[i].home
              : vec(
                  Math.cos((i / 3) * Math.PI * 2 + Math.PI / 2) * 1.05,
                  Math.sin((i / 3) * Math.PI * 2 + Math.PI / 2) * 1.05,
                  0,
                ),
          j = (i + 1) % 3,
          b =
            state.level === "quarks"
              ? pieces[j].home
              : vec(
                  Math.cos((j / 3) * Math.PI * 2 + Math.PI / 2) * 1.05,
                  Math.sin((j / 3) * Math.PI * 2 + Math.PI / 2) * 1.05,
                  0,
                );
        gluonLines.push(line(coil(a, b), "#a5c5ae", 0.8));
      }
      if (state.level === "quarks") {
        const anchor = new T.Group();
        model.add(anchor);
        register(anchor, entries[3], vec(1.6, 0.5, 0), vec(2.3, 1, 0), 0.2);
      }
    } else if (state.boson === "photon") {
      ball(model, particles.proton.color, 0.3);
      hydrogenCloud = cloud(model, 1.13, 4300, "#9ecbd2");
      electron = ball(
        model,
        particles.electron.color,
        0.13,
        vec(0.95, 0.3, 0),
        0.35,
      );
      // These circles are energy-level guides, not paths followed by an electron.
      const r1 = ring(1.12, 0, "#74969c", 0.3),
        r2 = ring(2.1, 0, "#74969c", 0.15);
      r1.rotation.x = Math.PI / 2;
      r2.rotation.x = Math.PI / 2;
      photon = new T.Group();
      model.add(photon);
      ball(photon, "#e7c77e", 0.11, vec(), 1);
      const wave = Array.from({ length: 100 }, (_, i) => {
        const x = (i / 99) * 1.5 - 1.5;
        return vec(
          x,
          Math.sin(x * 17) * 0.22 * Math.sin((i / 99) * Math.PI),
          0,
        );
      });
      const beam = line(wave, "#e7c77e", 0.95);
      model.remove(beam);
      photon.add(beam);
      photon.position.set(-3.5, 0.3, 0);
      const anchor = new T.Group();
      model.add(anchor);
      register(anchor, entries[0], vec(-3.5, 0.3, 0), vec(-3.5, 0.3, 0), 0.2);
    } else {
      const count = 80,
        coords = new Float32Array(count * count * 3);
      for (let x = 0; x < count; x++)
        for (let y = 0; y < count; y++)
          coords.set(
            [(x / (count - 1) - 0.5) * 6, -0.5, (y / (count - 1) - 0.5) * 6],
            (x * count + y) * 3,
          );
      const g = new T.BufferGeometry();
      g.setAttribute("position", new T.BufferAttribute(coords, 3));
      const m = new T.PointsMaterial({
        color: particles.higgs.color,
        size: 0.029,
        transparent: true,
        opacity: 0.55,
      });
      materials.push(m);
      higgsSurface = new T.Points(g, m);
      model.add(higgsSurface);
      cloud(model, 0.8, 2000, particles.higgs.color);
      const orb = ball(
        model,
        particles.higgs.color,
        0.32,
        vec(0, 0.5, 0),
        0.25,
      );
      register(
        orb,
        entries[0],
        vec(0, 0.5, 0),
        vec(0, 0.5, 0),
        0.5,
        orb.material,
      );
    }
    const stage = new T.Group();
    scene.add(stage);
    const stageMat = new T.MeshStandardMaterial({
      color: state.light ? "#c2cdc0" : "#0b120e",
      roughness: 0.7,
      metalness: 0.22,
    });
    materials.push(stageMat);
    const platform = new T.Mesh(
      new T.CylinderGeometry(2.75, 2.79, 0.1, 128),
      stageMat,
    );
    platform.position.y = -1.85;
    platform.receiveShadow = true;
    stage.add(platform);
    const groundMat = new T.ShadowMaterial({
      opacity: state.light ? 0.12 : 0.23,
    });
    materials.push(groundMat);
    const ground = new T.Mesh(new T.PlaneGeometry(30, 30), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1.79;
    ground.receiveShadow = true;
    stage.add(ground);
    const rim = ring(2.65, -1.79, state.light ? "#9aab9f" : "#7e9584", 0.35);
    model.remove(rim);
    stage.add(rim);
    const innerRim = ring(
      2.46,
      -1.79,
      state.light ? "#9aab9f" : "#7e9584",
      0.14,
    );
    model.remove(innerRim);
    stage.add(innerRim);
    const ticks: T.Vector3[] = [];
    for (let i = 0; i < 96; i++) {
      const a = (i / 96) * Math.PI * 2;
      const r = i % 8 === 0 ? 2.5 : 2.58;
      ticks.push(
        vec(Math.cos(a) * r, -1.787, Math.sin(a) * r),
        vec(Math.cos(a) * 2.64, -1.787, Math.sin(a) * 2.64),
      );
    }
    const tickGeo = new T.BufferGeometry().setFromPoints(ticks),
      tickMat = new T.LineBasicMaterial({
        color: state.light ? "#9aab9f" : "#7e9584",
        transparent: true,
        opacity: 0.3,
      });
    materials.push(tickMat);
    stage.add(new T.LineSegments(tickGeo, tickMat));
    let width = 1,
      height = 1,
      viewWidth = 1,
      viewHeight = 1;
    function resize() {
      width = container.clientWidth;
      height = container.clientHeight;
      const small = width < 768,
        landscape = height < 520 && width > height;
      const left = landscape ? 205 : small ? 16 : width < 1100 ? 245 : 310,
        right = landscape ? width - 280 : small ? width - 55 : width - 320,
        top = landscape ? 150 : small ? 185 : 205,
        bottom = height - (landscape ? 105 : small ? 240 : 225);
      viewWidth = Math.max(180, right - left);
      viewHeight = Math.max(landscape ? 90 : 160, bottom - top);
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.setViewOffset(
        width,
        height,
        width / 2 - (left + right) / 2,
        height / 2 - (top + bottom) / 2,
        width,
        height,
      );
      camera.updateProjectionMatrix();
      needsFit = 1;
    }
    let needsFit = 1,
      amount = 0,
      oldReset = -1,
      oldZoom = 0,
      oldIsolate = "",
      oldExplode = -1;
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();
    controls.addEventListener("start", () => {
      needsFit = 0;
    });
    const ray = new T.Raycaster(),
      mouse = new T.Vector2();
    let start: { x: number; y: number; id: number } | null = null,
      multi = false;
    const active = new Set<number>();
    const down = (e: PointerEvent) => {
      active.add(e.pointerId);
      if (active.size > 1) multi = true;
      else {
        multi = false;
        start = { x: e.clientX, y: e.clientY, id: e.pointerId };
      }
    };
    const up = (e: PointerEvent) => {
      active.delete(e.pointerId);
      if (
        !multi &&
        start?.id === e.pointerId &&
        Math.hypot(e.clientX - start.x, e.clientY - start.y) < 7
      ) {
        const bounds = renderer.domElement.getBoundingClientRect();
        mouse.set(
          ((e.clientX - bounds.left) / bounds.width) * 2 - 1,
          (-(e.clientY - bounds.top) / bounds.height) * 2 + 1,
        );
        ray.setFromCamera(mouse, camera);
        const hit = ray.intersectObjects(pickers, false).find((h) => {
          let o: T.Object3D | null = h.object;
          while (o) {
            if (!o.visible) return false;
            o = o.parent;
          }
          return true;
        });
        if (hit?.object.userData.pieceId)
          selectRef.current(hit.object.userData.pieceId);
      }
      start = null;
    };
    const cancel = (e: PointerEvent) => {
      active.delete(e.pointerId);
      start = null;
    };
    renderer.domElement.addEventListener("pointerdown", down);
    renderer.domElement.addEventListener("pointerup", up);
    renderer.domElement.addEventListener("pointercancel", cancel);
    const lost = (e: Event) => {
      e.preventDefault();
      setError(true);
    };
    renderer.domElement.addEventListener("webglcontextlost", lost);
    let time = 0,
      last = performance.now(),
      labelTime = 0,
      lastRenderedState: ModelState | undefined;
    const projected = vec(),
      direction = vec(),
      target = vec(),
      quat = new T.Quaternion();
    function animate(now: number) {
      if (disposed) return;
      frame = requestAnimationFrame(animate);
      const dt = Math.max(0, Math.min((now - last) / 1000, 0.05));
      last = now;
      if (document.hidden) return;
      const s = latest.current;
      time += dt;
      const goal = s.explode / 100;
      amount = reduced ? goal : T.MathUtils.damp(amount, goal, 7, dt);
      model.scale.setScalar(reduced ? 1 : Math.min(1, 0.86 + time * 0.35));
      if (s.explode !== oldExplode) {
        needsFit = 1;
        oldExplode = s.explode;
      }
      const isolateKey = s.isolated ? s.selected || "" : "";
      if (isolateKey !== oldIsolate) {
        needsFit = 1;
        oldIsolate = isolateKey;
      }
      if (s.reset !== oldReset) {
        needsFit = 1;
        oldReset = s.reset;
        camera.position.set(0.2, 3.2, 12);
        controls.target.set(0, 0, 0);
      }
      if (s.zoom !== oldZoom) {
        camera.position
          .sub(controls.target)
          .multiplyScalar(Math.pow(0.8, s.zoom - oldZoom))
          .add(controls.target);
        oldZoom = s.zoom;
        needsFit = 0;
      }
      pieces.forEach((p) => {
        p.object.position.copy(p.home).lerp(p.away, amount);
        p.object.visible = !s.isolated || p.id === s.selected;
        const chosen = s.selected === p.id;
        if (p.material) {
          p.material.emissiveIntensity = chosen
            ? 0.16
            : p.id.startsWith("electron")
              ? 0.22
              : 0;
          p.material.roughness = chosen ? 0.18 : 0.26;
        }
      });
      links.forEach((l) => {
        const a = pieces[l.a].object.position.clone(),
          b = pieces[l.b].object.position.clone();
        a.z += l.offset;
        b.z += l.offset;
        direction.copy(b).sub(a);
        l.mesh.position.copy(a).add(b).multiplyScalar(0.5);
        l.mesh.scale.y = direction.length();
        l.mesh.quaternion.setFromUnitVectors(
          vec(0, 1, 0),
          direction.normalize(),
        );
        l.mesh.material.opacity = 1 - T.MathUtils.smoothstep(amount, 0, 0.7);
        l.mesh.visible = s.cloud && !s.isolated && amount < 0.7;
      });
      clouds.forEach((c) => {
        c.visible = s.cloud && !s.isolated;
        if (c !== hydrogenCloud) c.scale.setScalar(1 + amount * 0.1);
      });
      stage.visible = !s.isolated && amount < 0.45 && s.level === "molecule";
      if (gluonLines.length) {
        gluonLines.forEach((line, i) => {
          line.visible = s.cloud && (!s.isolated || s.selected === "gluon");
          if (s.level === "quarks") {
            const a = pieces[i].object.position,
              b = pieces[(i + 1) % 3].object.position;
            const pts = coil(a, b, reduced ? 0 : time * 1.2);
            const attr = line.geometry.getAttribute(
              "position",
            ) as T.BufferAttribute;
            pts.forEach((p, j) => attr.setXYZ(j, p.x, p.y, p.z));
            attr.needsUpdate = true;
            line.geometry.computeBoundingSphere();
          }
        });
      }
      if (s.play !== lastPlay) {
        interactionClock = 0;
        lastPlay = s.play;
      }
      if (s.playing) interactionClock = Math.min(9, interactionClock + dt);
      if (photon && electron && hydrogenCloud) {
        const t = interactionClock;
        const current = t < 2.7 ? 0 : t < 3.3 ? 1 : t < 6 ? 2 : t < 9 ? 3 : 4;
        const excited = t >= 3 && t < 6;
        hydrogenCloud.scale.setScalar(
          T.MathUtils.damp(hydrogenCloud.scale.x, excited ? 1.85 : 1, 6, dt),
        );
        electron.position.lerp(
          vec(excited ? 1.8 : 0.95, excited ? 0.65 : 0.3, 0),
          1 - Math.exp(-dt * 6),
        );
        photon.visible = t < 3 || t >= 6;
        photon.position.set(
          t < 3 ? -3.5 + (t / 3) * 4.45 : 0.95 + ((t - 6) / 3) * 4.45,
          0.3,
          0,
        );
        if (t === 0) photon.position.x = -3.5;
        if (pieces[0]) {
          pieces[0].object.position.copy(photon.position);
          pieces[0].object.visible = photon.visible;
        }
        if (current !== phase) {
          phase = current;
          phaseRef.current(current);
        }
      }
      if (higgsSurface) {
        higgsSurface.visible = s.cloud;
        const attr = higgsSurface.geometry.getAttribute(
          "position",
        ) as T.BufferAttribute;
        for (let i = 0; i < attr.count; i++) {
          const x = attr.getX(i),
            z = attr.getZ(i),
            r = Math.hypot(x, z);
          attr.setY(
            i,
            -0.5 +
              Math.cos(r * 5 - (reduced ? 0 : time * 1.5)) *
                Math.exp(-r * 0.5) *
                0.2,
          );
        }
        attr.needsUpdate = true;
      }
      if (needsFit > 0) {
        target.set(0, 0, 0);
        let objectWidth = s.level === "molecule" ? 5.0 : 5.5,
          objectHeight = s.level === "molecule" ? 3.9 : 4.9;
        objectWidth += amount * 1.6;
        objectHeight += amount * 0.6;
        if (s.level === "molecule") {
          const xs = pieces.map((p) => p.object.position.x),
            ys = pieces.map((p) => p.object.position.y);
          objectWidth = Math.max(
            5,
            Math.max(...pieces.map((p, i) => xs[i] + p.radius)) -
              Math.min(...pieces.map((p, i) => xs[i] - p.radius)) +
              1.1,
          );
          objectHeight = Math.max(
            3.9,
            Math.max(...pieces.map((p, i) => ys[i] + p.radius)) -
              Math.min(...pieces.map((p, i) => ys[i] - p.radius)) +
              1.1,
          );
        }
        if (s.level === "interaction") {
          objectWidth = 9.5;
          objectHeight = 5;
        }
        if (s.isolated && s.selected && s.selected !== "gluon") {
          const p = pieces.find((p) => p.id === s.selected);
          if (p) {
            target.copy(p.object.position);
            objectWidth = objectHeight = Math.max(1.8, p.radius * 3.6);
          }
        }
        const tan = Math.tan(T.MathUtils.degToRad(camera.fov / 2)),
          distance = Math.max(
            ((objectHeight / (2 * tan)) * height) / viewHeight,
            ((objectWidth / (2 * tan * camera.aspect)) * width) / viewWidth,
          );
        direction.copy(camera.position).sub(controls.target).normalize();
        controls.target.lerp(target, reduced ? 1 : 1 - Math.exp(-dt * 6));
        const dest = target.clone().addScaledVector(direction, distance);
        camera.position.lerp(dest, reduced ? 1 : 1 - Math.exp(-dt * 6));
        needsFit = reduced ? 0 : Math.max(0, needsFit - dt * 0.6);
      }
      controls.autoRotate = s.rotate && !reduced;
      const cameraChanged = controls.update(dt);
      if (now - labelTime > 40) {
        labelTime = now;
        camera.getWorldQuaternion(quat);
        pieces.forEach((p) => {
          p.object.getWorldPosition(projected);
          const anchor = projected.clone().project(camera);
          p.label.dataset.anchorX = String(((anchor.x + 1) * width) / 2);
          p.label.dataset.anchorY = String(((1 - anchor.y) * height) / 2);
          projected.y += p.radius + 0.12;
          projected.project(camera);
          const x = ((projected.x + 1) * width) / 2,
            y = ((1 - projected.y) * height) / 2;
          let visible =
            s.labels &&
            p.object.visible &&
            projected.z < 1 &&
            x > 15 &&
            x < width - 15 &&
            y > 100 &&
            y < height - 140;
          if (
            s.level === "atom" &&
            amount < 0.25 &&
            p.id.startsWith("electron") &&
            p.id !== "electron-0" &&
            p.id !== s.selected
          )
            visible = false;
          if (
            s.level === "nucleus" &&
            amount < 0.15 &&
            p.id !== "proton-0" &&
            p.id !== "neutron-0" &&
            p.id !== s.selected
          )
            visible = false;
          p.label.style.display = visible ? "" : "none";
          p.label.style.transform = `translate(${x}px,${y}px) translate(-50%,-100%)`;
          p.label.classList.toggle("selected", s.selected === p.id);
        });
      }

      const moving = Math.abs(amount - goal) > 0.0001;
      const animated =
        s.playing ||
        (!reduced && (s.level === "quarks" || s.level === "interaction"));
      if (
        cameraChanged ||
        needsFit > 0 ||
        time < 0.7 ||
        moving ||
        lastRenderedState !== s ||
        animated
      ) {
        renderer.render(scene, camera);
        lastRenderedState = s;
      }
    }
    frame = requestAnimationFrame(animate);
    readyRef.current();
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      renderer.domElement.removeEventListener("pointerdown", down);
      renderer.domElement.removeEventListener("pointerup", up);
      renderer.domElement.removeEventListener("pointercancel", cancel);
      renderer.domElement.removeEventListener("webglcontextlost", lost);
      const geometries = new Set<T.BufferGeometry>();
      scene.traverse((o) => {
        if (
          o instanceof T.Mesh ||
          o instanceof T.Points ||
          o instanceof T.Line
        ) {
          geometries.add(o.geometry);
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          mats.forEach((m) => materials.push(m));
        }
      });
      geometries.add(sphereGeo);
      geometries.forEach((g) => g.dispose());
      new Set(materials).forEach((m) => m.dispose());
      env.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      labels.remove();
    };
    // The scene rebuilds only when the physical subject or lighting changes; controls use refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return (
    <div className="scene" ref={host}>
      {error && (
        <div className="scene-error">
          <strong>La scène 3D est en pause</strong>
          <p>
            Activez l’accélération graphique de votre navigateur, puis rechargez
            l’atlas.
          </p>
          <button onClick={() => location.reload()}>Recharger</button>
        </div>
      )}
    </div>
  );
}
