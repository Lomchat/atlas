import { useEffect, useRef, useState } from "react";
import * as T from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { elements, molecules } from "./data";
import { ancestors, expansion } from "./continuum";
import type {
  ExplorerState,
  MatterGraph,
  MatterNode,
  SceneDetail,
} from "./continuum";

type Props = {
  state: ExplorerState;
  graph: MatterGraph;
  onPick: (id: string) => void;
  onFocus: (id: string) => void;
  onEvent: (text: string) => void;
  onDetail: (detail: SceneDetail) => void;
};
type View = {
  node: MatterNode;
  group: T.Group;
  skin: T.Mesh<T.SphereGeometry, T.MeshPhysicalMaterial>;
  wire: T.LineSegments;
  label: HTMLButtonElement;
  open: number;
  reveal: number;
  radius: number;
  closedRadius: number;
  openRadius: number;
  cloud?: T.Points;
  links: T.Line[];
  world: T.Vector3;
  screenSize: number;
  readable: boolean;
};
const v = (x = 0, y = 0, z = 0) => new T.Vector3(x, y, z);
const smooth = (a: number, b: number, x: number) =>
  T.MathUtils.smoothstep(x, a, b);
function cluster(count: number) {
  const list: T.Vector3[] = [];
  for (let x = -2; x <= 2; x++)
    for (let y = -2; y <= 2; y++)
      for (let z = -2; z <= 2; z++)
        if ((x + y + z) % 2 === 0) list.push(v(x * 0.47, y * 0.47, z * 0.47));
  list.sort((a, b) => a.lengthSq() - b.lengthSq() || a.x - b.x || a.y - b.y);
  const points = list.slice(0, count),
    center = points.reduce((sum, p) => sum.add(p), v()).divideScalar(count);
  return points.map((p) => p.sub(center));
}
function rng(seed: number) {
  return () => {
    seed = (Math.imul(1664525, seed) + 1013904223) | 0;
    return (seed >>> 0) / 4294967296;
  };
}

export default function Scene({
  state,
  graph,
  onPick,
  onFocus,
  onEvent,
  onDetail,
}: Props) {
  const host = useRef<HTMLDivElement>(null),
    current = useRef(state),
    pick = useRef(onPick),
    focus = useRef(onFocus),
    event = useRef(onEvent),
    detail = useRef(onDetail);
  current.current = state;
  pick.current = onPick;
  focus.current = onFocus;
  event.current = onEvent;
  detail.current = onDetail;
  const [error, setError] = useState(false);
  useEffect(() => {
    const el = host.current!;
    let renderer: T.WebGLRenderer;
    try {
      renderer = new T.WebGLRenderer({
        antialias: true,
        powerPreference: "high-performance",
      });
    } catch {
      setError(true);
      return;
    }
    setError(false);
    let disposed = false,
      raf = 0;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    renderer.setPixelRatio(
      Math.min(devicePixelRatio, el.clientWidth < 768 ? 1.5 : 1.75),
    );
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    const canvas = renderer.domElement;
    canvas.setAttribute(
      "aria-label",
      "Molécule et constituants imbriqués en 3D",
    );
    canvas.dataset.sceneId = crypto.randomUUID();
    el.appendChild(canvas);
    const scene = new T.Scene();
    scene.background = new T.Color("#111318");
    const camera = new T.PerspectiveCamera(36, 1, 0.015, 180);
    camera.position.set(0.5, 2.9, 12);
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.075;
    // Let the camera approach even the smallest nested constituents.
    controls.minDistance = 0.00001;
    controls.maxDistance = 90;
    controls.zoomToCursor = true;
    let controlsDirty = true;
    controls.addEventListener("change", () => {
      controlsDirty = true;
    });
    controls.autoRotateSpeed = 0.5;
    controls.maxPolarAngle = Math.PI * 0.87;
    const room = new RoomEnvironment(),
      pmrem = new T.PMREMGenerator(renderer),
      environment = pmrem.fromScene(room, 0.03);
    scene.environment = environment.texture;
    scene.environmentIntensity = 0.65;
    room.dispose();
    pmrem.dispose();
    const hemi = new T.HemisphereLight(0xf5f7ff, 0x343744, 1);
    scene.add(hemi);
    const keyLight = new T.DirectionalLight(0xffffff, 2.8);
    keyLight.position.set(-4, 7, 6);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    Object.assign(keyLight.shadow.camera, {
      left: -8,
      right: 8,
      top: 8,
      bottom: -8,
    });
    keyLight.shadow.normalBias = 0.025;
    keyLight.shadow.bias = -0.0006;
    scene.add(keyLight);
    const fill = new T.DirectionalLight(0xc1d0ed, 1.5);
    fill.position.set(5, 3, -5);
    scene.add(fill);
    const world = new T.Group();
    scene.add(world);
    const views = new Map<string, View>(),
      pickers: T.Mesh[] = [];
    const sphere = new T.SphereGeometry(1, 32, 24),
      materials = new Set<T.Material>(),
      geometries = new Set<T.BufferGeometry>([sphere]);
    const labelRoot = document.createElement("div");
    labelRoot.className = "scene-labels";
    el.appendChild(labelRoot);
    const tooltip = document.createElement("div");
    tooltip.className = "hover-card";
    tooltip.hidden = true;
    el.appendChild(tooltip);
    const circles: number[] = [];
    for (let axis = 0; axis < 3; axis++)
      for (let i = 0; i < 80; i++) {
        for (const a of [
          (i / 80) * Math.PI * 2,
          ((i + 1) / 80) * Math.PI * 2,
        ]) {
          const x = Math.cos(a),
            y = Math.sin(a);
          circles.push(
            ...(axis === 0 ? [x, y, 0] : axis === 1 ? [x, 0, y] : [0, x, y]),
          );
        }
      }
    const wireGeo = new T.BufferGeometry();
    wireGeo.setAttribute("position", new T.Float32BufferAttribute(circles, 3));
    geometries.add(wireGeo);
    function points(
      radius: number,
      count: number,
      color: string,
      seed: number,
    ) {
      const random = rng(seed),
        a = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        const az = random() * Math.PI * 2,
          cos = random() * 2 - 1,
          r = radius * Math.pow(random(), 0.55),
          sin = Math.sqrt(1 - cos * cos);
        a.set([r * sin * Math.cos(az), r * cos, r * sin * Math.sin(az)], i * 3);
      }
      const geo = new T.BufferGeometry();
      geo.setAttribute("position", new T.BufferAttribute(a, 3));
      geometries.add(geo);
      const mat = new T.PointsMaterial({
        color,
        size: 0.023,
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
      });
      mat.onBeforeCompile = (shader) => {
        shader.fragmentShader = shader.fragmentShader.replace(
          "#include <clipping_planes_fragment>",
          "#include <clipping_planes_fragment>\nif(length(gl_PointCoord-vec2(.5))>.5) discard;",
        );
      };
      materials.add(mat);
      return new T.Points(geo, mat);
    }
    function makeLine(color: string, positions: T.Vector3[]) {
      const geo = new T.BufferGeometry().setFromPoints(positions);
      geometries.add(geo);
      const mat = new T.LineBasicMaterial({
        color,
        transparent: true,
        opacity: 0.5,
      });
      materials.add(mat);
      return new T.Line(geo, mat);
    }
    for (const node of graph.nodes.values()) {
      if (node.kind === "molecule") continue;
      const parent =
          node.parent === graph.root ? world : views.get(node.parent!)!.group,
        group = new T.Group();
      parent.add(group);
      const big = elements[node.element].z > 1;
      const closedRadius =
        node.kind === "atom"
          ? node.element === "H"
            ? 0.57
            : 0.87
          : node.kind === "nucleus"
            ? big
              ? 0.48
              : 0.24
            : node.kind === "proton" || node.kind === "neutron"
              ? big
                ? 0.22
                : 0.32
              : node.kind === "electron"
                ? 0.085
                : big
                  ? 0.073
                  : 0.105;
      const openRadius =
        node.kind === "atom"
          ? big
            ? 2.3
            : 1.65
          : node.kind === "nucleus"
            ? big
              ? 1.45
              : 0.77
            : node.children.length
              ? big
                ? 0.34
                : 0.52
              : closedRadius;
      const mat = new T.MeshPhysicalMaterial({
        color: node.entry.color,
        metalness: 0.25,
        roughness: 0.27,
        clearcoat: 0.8,
        clearcoatRoughness: 0.24,
        transparent: true,
        opacity: 1,
      });
      materials.add(mat);
      const skin = new T.Mesh(sphere, mat);
      skin.scale.setScalar(closedRadius);
      skin.castShadow = node.kind === "atom";
      skin.receiveShadow = true;
      skin.userData.nodeId = node.id;
      group.add(skin);
      pickers.push(skin);
      const wireMat = new T.LineBasicMaterial({
        color: node.entry.color,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      materials.add(wireMat);
      const wire = new T.LineSegments(wireGeo, wireMat);
      group.add(wire);
      const label = document.createElement("button");
      label.className = "atom-label";
      label.dataset.node = node.id;
      label.setAttribute("aria-label", `Inspecter ${node.entry.name}`);
      label.innerHTML = `<span class="label-symbol">${node.entry.symbol}</span><span class="label-name">${node.entry.name}</span>`;
      label.style.setProperty("--particle", node.entry.color);
      label.onclick = () => pick.current(node.id);
      label.ondblclick = (e) => {
        e.preventDefault();
        focus.current(node.id);
      };
      labelRoot.appendChild(label);
      const view: View = {
        node,
        group,
        skin,
        wire,
        label,
        open: 0,
        reveal: node.kind === "atom" ? 1 : 0,
        radius: closedRadius,
        closedRadius,
        openRadius,
        links: [],
        world: v(),
        screenSize: 0,
        readable: false,
      };
      if (node.kind === "atom") {
        view.cloud = points(
          openRadius * 0.94,
          big ? 1600 : 650,
          "#92acdc",
          node.atom + 4,
        );
        group.add(view.cloud);
      }
      views.set(node.id, view);
    }
    // Each child remains attached to its real parent throughout every animation.
    const nucleiPositions = new Map<string, T.Vector3[]>();
    for (const node of graph.nodes.values())
      if (node.kind === "nucleus")
        nucleiPositions.set(node.id, cluster(node.children.length));
    for (const view of views.values())
      if (view.node.kind === "proton" || view.node.kind === "neutron")
        for (let i = 0; i < 3; i++) {
          const curve = makeLine(
            "#a3bde7",
            Array.from({ length: 28 }, () => v()),
          );
          view.group.add(curve);
          view.links.push(curve);
        }
    const bonds = molecules[state.molecule].bonds.flatMap(([a, b, n]) =>
      Array.from({ length: n }, (_, i) => {
        const geo = new T.CylinderGeometry(0.105, 0.105, 1, 18),
          mat = new T.MeshStandardMaterial({
            color: "#8993a4",
            metalness: 0.6,
            roughness: 0.34,
            transparent: true,
          });
        geometries.add(geo);
        materials.add(mat);
        const mesh = new T.Mesh(geo, mat);
        world.add(mesh);
        return { mesh, a, b, offset: n === 2 ? (i - 0.5) * 0.32 : 0 };
      }),
    );
    const bondTraces = molecules[state.molecule].bonds.map(([a, b]) => {
      const line = makeLine("#7c8596", [v(), v()]);
      world.add(line);
      return { line, a, b };
    });
    const platformMat = new T.MeshStandardMaterial({
      color: "#1b1e26",
      metalness: 0.4,
      roughness: 0.65,
      transparent: true,
    });
    materials.add(platformMat);
    const platformGeo = new T.CylinderGeometry(2.8, 2.84, 0.09, 100);
    geometries.add(platformGeo);
    const platform = new T.Mesh(platformGeo, platformMat);
    platform.position.y = -1.8;
    platform.receiveShadow = true;
    scene.add(platform);
    const rim = makeLine(
      "#7a8497",
      Array.from({ length: 101 }, (_, i) =>
        v(
          Math.cos((i / 100) * Math.PI * 2) * 2.7,
          -1.75,
          Math.sin((i / 100) * Math.PI * 2) * 2.7,
        ),
      ),
    );
    scene.add(rim);
    const photon = new T.Group(),
      photonMat = new T.MeshBasicMaterial({ color: "#ffd58e" });
    materials.add(photonMat);
    const photonDot = new T.Mesh(sphere, photonMat);
    photonDot.scale.setScalar(0.08);
    photon.add(photonDot);
    photon.add(
      makeLine(
        "#f0ca81",
        Array.from({ length: 60 }, (_, i) =>
          v(
            (-i / 60) * 1.1,
            Math.sin(i * 0.5) * 0.13 * Math.sin((i / 60) * Math.PI),
            0,
          ),
        ),
      ),
    );
    scene.add(photon);
    photon.visible = false;
    const field = points(11, 5000, "#b49dcf", 12);
    const fieldAttr = field.geometry.getAttribute(
      "position",
    ) as T.BufferAttribute;
    for (let i = 0; i < fieldAttr.count; i++) fieldAttr.setY(i, -3);
    scene.add(field);
    field.visible = false;
    let width = 1,
      height = 1,
      availableW = 1,
      availableH = 1,
      fitTime = 1,
      lastFocus: string | null = null,
      lastReset = -1,
      lastZoom = 0,
      lastTheme: boolean | undefined,
      rootOpen = 0,
      lastDetail = "",
      detailContext: string | null = null,
      contextStrength = 0,
      oldState: ExplorerState | undefined;
    function resize() {
      width = el.clientWidth;
      height = el.clientHeight;
      const mobile = width < 768,
        landscape = height < 520 && width > height;
      const left = mobile ? 16 : landscape ? 215 : width < 1150 ? 260 : 300,
        right = mobile ? width - 52 : width - 325,
        top = landscape ? 135 : mobile ? 148 : 178,
        bottom = height - (landscape ? 116 : mobile ? 220 : 205);
      availableW = Math.max(180, right - left);
      availableH = Math.max(90, bottom - top);
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
      fitTime = 1;
    }
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    resize();
    controls.addEventListener("start", () => {
      fitTime = 0;
    });
    const raycaster = new T.Raycaster(),
      pointer = new T.Vector2();
    let down: { x: number; y: number; id: number } | null = null,
      multitouch = false,
      hover: string | null = null;
    const pointers = new Set<number>();
    let hoverTime = 0;
    function hit(x: number, y: number) {
      const box = canvas.getBoundingClientRect();
      pointer.set(
        ((x - box.left) / box.width) * 2 - 1,
        (-(y - box.top) / box.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointer, camera);
      return raycaster.intersectObjects(pickers, false).find((h) => {
        const view = views.get(h.object.userData.nodeId)!;
        const fid = current.current.focus;
        return (
          view.reveal > 0.2 &&
          (!fid ||
            view.node.id === fid ||
            view.node.id.startsWith(fid + "/")) &&
          (!view.node.children.length || view.open < 0.45)
        );
      })?.object.userData.nodeId as string | undefined;
    }
    function pointerDown(e: PointerEvent) {
      pointers.add(e.pointerId);
      if (pointers.size > 1) multitouch = true;
      else {
        multitouch = false;
        down = { x: e.clientX, y: e.clientY, id: e.pointerId };
      }
      tooltip.hidden = true;
    }
    function pointerUp(e: PointerEvent) {
      pointers.delete(e.pointerId);
      if (
        !multitouch &&
        down?.id === e.pointerId &&
        Math.hypot(e.clientX - down.x, e.clientY - down.y) < 7
      ) {
        const id = hit(e.clientX, e.clientY);
        if (id) pick.current(id);
      }
      down = null;
    }
    function pointerMove(e: PointerEvent) {
      if (
        down ||
        e.pointerType === "touch" ||
        performance.now() - hoverTime < 60
      )
        return;
      hoverTime = performance.now();
      hover = hit(e.clientX, e.clientY) || null;
      canvas.style.cursor = hover ? "pointer" : "grab";
      tooltip.hidden = !hover;
      if (hover) {
        const node = graph.nodes.get(hover)!;
        tooltip.textContent = `${node.entry.name} · ${node.children.length ? "cliquer pour ouvrir" : "particule élémentaire"}`;
        tooltip.style.left = Math.min(width - 245, e.clientX + 15) + "px";
        tooltip.style.top = Math.min(height - 110, e.clientY + 18) + "px";
      }
    }
    const cancel = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      down = null;
    };
    const dbl = (e: MouseEvent) => {
      const id = hit(e.clientX, e.clientY) || current.current.selected;
      if (id) focus.current(id);
    };
    const leave = () => {
      tooltip.hidden = true;
      hover = null;
    };
    canvas.addEventListener("pointerdown", pointerDown);
    canvas.addEventListener("pointerup", pointerUp);
    canvas.addEventListener("pointermove", pointerMove);
    canvas.addEventListener("pointercancel", cancel);
    canvas.addEventListener("pointerleave", leave);
    canvas.addEventListener("dblclick", dbl);
    const lost = (e: Event) => {
      e.preventDefault();
      setError(true);
    };
    canvas.addEventListener("webglcontextlost", lost);
    let clock = 0,
      last = performance.now(),
      labelTime = 0,
      lastPhoton = state.photon,
      photonTime = 7,
      photonAtom = graph.atoms[0],
      eventPhase = -1;
    const bounds = new T.Box3(),
      point = v(),
      size = v(),
      target = v(),
      direction = v(),
      center = v(),
      color = new T.Color();
    function frame(now: number) {
      if (disposed) return;
      raf = requestAnimationFrame(frame);
      const dt = Math.max(0, Math.min((now - last) / 1000, 0.05));
      last = now;
      if (document.hidden) return;
      clock += dt;
      const s = current.current;
      let moving = false;
      const nextRoot = expansion(graph.nodes.get(graph.root)!, s);
      rootOpen = reduced
        ? nextRoot
        : T.MathUtils.damp(rootOpen, nextRoot, 7, dt);
      if (Math.abs(rootOpen - nextRoot) > 0.0001) moving = true;
      if (lastTheme !== s.light) {
        lastTheme = s.light;
        scene.background = color.set(s.light ? "#edf0f5" : "#111318").clone();
        platformMat.color.set(s.light ? "#c8cdd7" : "#1b1e26");
        renderer.toneMappingExposure = s.light ? 1.05 : 1;
        fitTime = 1;
      }
      if (s.focus !== lastFocus || s.reset !== lastReset) {
        fitTime = 1;
        lastFocus = s.focus;
        if (s.reset !== lastReset) {
          lastReset = s.reset;
          camera.position.set(0.5, 2.9, 12);
          controls.target.set(0, 0, 0);
        }
      }
      if (s.zoom !== lastZoom) {
        camera.position
          .sub(controls.target)
          .multiplyScalar(Math.pow(0.8, s.zoom - lastZoom))
          .add(controls.target);
        lastZoom = s.zoom;
        fitTime = 0;
      }
      if (oldState?.depth !== s.depth || oldState?.overrides !== s.overrides)
        fitTime = 1;
      camera.updateMatrixWorld();
      const detailUnit = Math.max(120, Math.min(availableW, availableH));
      const aim = controls.target.clone().project(camera);
      for (const view of views.values()) {
        const n = view.node,
          parent = n.parent === graph.root ? null : views.get(n.parent!)!;
        // Place children inside their existing parent before measuring their
        // projected size. Opening a shell must not inflate its own LOD metric.
        if (n.kind === "atom") {
          const home = molecules[s.molecule].atoms[n.atom].pos;
          view.group.position.set(...home).multiplyScalar(1 + 2.35 * rootOpen);
        } else if (n.kind === "nucleus") {
          view.group.position.set(0, 0, 0);
          view.group.scale.setScalar(T.MathUtils.lerp(0.3, 1, parent!.open));
        } else if (n.kind === "electron") {
          const count = elements[n.element].z,
            angle = n.index * 2.39996,
            r = parent!.openRadius * (n.index < 2 && count > 2 ? 0.62 : 0.89);
          view.group.position.set(
            Math.cos(angle) * r,
            Math.sin(angle) * r * 0.88,
            Math.sin(angle * 1.9) * r * 0.42,
          );
        } else if (n.kind === "proton" || n.kind === "neutron") {
          view.group.position
            .copy(nucleiPositions.get(n.parent!)![n.index])
            .multiplyScalar(T.MathUtils.lerp(0.28, 1, parent!.open));
        } else {
          const angle = (n.index / 3) * Math.PI * 2 + Math.PI / 2,
            r = parent!.openRadius * 0.58;
          view.group.position
            .set(Math.cos(angle) * r, Math.sin(angle) * r, 0)
            .multiplyScalar(0.4 + parent!.open * 0.6);
        }
        view.group.updateWorldMatrix(true, false);
        view.group.getWorldPosition(view.world);
        const worldRadius =
          view.closedRadius * view.group.getWorldScale(point).x;
        point.copy(view.world).applyMatrix4(camera.matrixWorldInverse);
        const cameraDepth = -point.z;
        view.screenSize =
          cameraDepth > 0 ||
          camera.position.distanceTo(view.world) < worldRadius
            ? (height * worldRadius) /
              (Math.tan(T.MathUtils.degToRad(camera.fov / 2)) *
                Math.max(camera.near, cameraDepth))
            : 0;
        point.copy(view.world).project(camera);
        const offset = Math.hypot(
            ((point.x - aim.x) * width) / 2,
            ((point.y - aim.y) * height) / 2,
          ),
          attention =
            1 - smooth(0.5, 1.25, offset / Math.max(1, view.screenSize / 2)),
          sizeRatio = view.screenSize / detailUnit,
          atom = n.kind === "atom",
          nucleus = n.kind === "nucleus",
          readableStart = atom ? 0.06 : nucleus ? 0.12 : 0.14,
          readableEnd = atom ? 0.14 : nucleus ? 0.25 : 0.3,
          requested = expansion(n, s),
          automatic = smooth(
            atom ? 0.7 : nucleus ? 0.6 : 0.45,
            atom ? 1.25 : nucleus ? 1.05 : 0.85,
            sizeRatio,
          ),
          goal =
            !n.children.length || s.overrides[n.id] === 0
              ? 0
              : Math.max(requested, automatic * attention) *
                smooth(readableStart, readableEnd, sizeRatio);
        view.readable = sizeRatio >= readableEnd;
        const previousOpen = view.open,
          previousReveal = view.reveal;
        view.open = reduced ? goal : T.MathUtils.damp(view.open, goal, 8, dt);
        if (Math.abs(view.open - goal) > 0.0002) moving = true;
        view.reveal = parent
          ? parent.reveal * smooth(0.08, 0.65, parent.open)
          : 1;
        if (
          Math.abs(view.open - previousOpen) > 0.0001 ||
          Math.abs(view.reveal - previousReveal) > 0.0001
        )
          moving = true;
        view.group.visible = view.reveal > 0.004;
        view.radius = T.MathUtils.lerp(
          view.closedRadius,
          view.openRadius,
          view.open,
        );
        view.skin.scale.setScalar(view.radius);
        view.wire.scale.setScalar(view.radius * 1.01);
        const inFocus =
            !s.focus || n.id === s.focus || n.id.startsWith(s.focus + "/"),
          context = inFocus ? 1 : 0.025;
        view.skin.material.opacity =
          view.reveal * (1 - smooth(0.05, 0.7, view.open) * 0.975) * context;
        view.skin.material.depthWrite = view.skin.material.opacity > 0.95;
        const selected = s.selected === n.id,
          related = s.selected
            ? ancestors(graph, s.selected).some((a) => a.id === n.id)
            : false;
        view.skin.material.emissive.set(n.entry.color);
        view.skin.material.emissiveIntensity = selected
          ? 0.14
          : hover === n.id
            ? 0.09
            : 0;
        (view.wire.material as T.LineBasicMaterial).opacity =
          view.reveal *
          (selected ? 0.55 : related ? 0.32 : 0.13) *
          view.open *
          (inFocus || related ? 1 : 0.12);
        view.wire.visible = view.open > 0.01 && s.cloud;
        if (view.cloud) {
          view.cloud.visible =
            s.cloud && view.open > 0.05 && (!s.focus || s.focus === n.id);
          (view.cloud.material as T.PointsMaterial).opacity = view.open * 0.2;
        }
        for (let i = 0; i < view.links.length; i++) {
          const line = view.links[i],
            a = views.get(n.children[i])!.group.position,
            b = views.get(n.children[(i + 1) % 3])!.group.position,
            attr = line.geometry.getAttribute("position") as T.BufferAttribute;
          for (let j = 0; j < attr.count; j++) {
            const t = j / (attr.count - 1);
            point.copy(a).lerp(b, t);
            point.z +=
              Math.sin(t * Math.PI * 12) * 0.028 * Math.sin(t * Math.PI);
            attr.setXYZ(j, point.x, point.y, point.z);
          }
          attr.needsUpdate = true;
          line.geometry.computeBoundingSphere();
          line.visible = s.cloud && view.open > 0.15;
          (line.material as T.LineBasicMaterial).opacity =
            view.reveal * view.open * 0.65 * context;
        }
      }
      world.updateMatrixWorld(true);
      views.forEach((view) => view.group.getWorldPosition(view.world));
      // As a container fills the view, keep its surroundings as faint context.
      // Follow the branch nearest the orbit target without moving the camera.
      const previousContext = detailContext,
        previousStrength = contextStrength;
      detailContext = null;
      contextStrength = 0;
      let candidates = s.focus ? [s.focus] : graph.atoms;
      while (candidates.length) {
        let closest: View | undefined,
          best = Infinity;
        for (const id of candidates) {
          const candidate = views.get(id)!;
          if (!candidate.node.children.length || candidate.reveal < 0.5)
            continue;
          point.copy(candidate.world).project(camera);
          if (point.z > 1) continue;
          const distance =
            ((point.x - aim.x) * width) ** 2 +
            ((point.y - aim.y) * height) ** 2;
          if (distance < best) {
            best = distance;
            closest = candidate;
          }
        }
        if (!closest) break;
        const strength =
          smooth(0.3, 0.6, closest.screenSize / detailUnit) *
          smooth(0.1, 0.35, closest.open);
        if (strength < 0.01) break;
        detailContext = closest.node.id;
        contextStrength = strength;
        candidates = closest.node.children;
      }
      if (
        previousContext !== detailContext ||
        Math.abs(previousStrength - contextStrength) > 0.001
      )
        moving = true;
      if (detailContext) {
        for (const view of views.values()) {
          const inside =
              view.node.id === detailContext ||
              view.node.id.startsWith(detailContext + "/"),
            ancestor = detailContext.startsWith(view.node.id + "/");
          if (!inside) {
            view.skin.material.opacity *= 1 - contextStrength * 0.975;
            view.skin.material.depthWrite = view.skin.material.opacity > 0.95;
            (view.wire.material as T.LineBasicMaterial).opacity *=
              1 - contextStrength * (ancestor ? 0.4 : 0.9);
            if (view.cloud)
              (view.cloud.material as T.PointsMaterial).opacity *=
                1 - contextStrength * 0.95;
            for (const line of view.links)
              (line.material as T.LineBasicMaterial).opacity *=
                1 - contextStrength * 0.975;
          }
        }
      }
      const atomOpening = Math.max(
        ...graph.atoms.map((id) => views.get(id)!.open),
      );
      bonds.forEach(({ mesh, a, b, offset }) => {
        const p = views.get(graph.atoms[a])!.world,
          q = views.get(graph.atoms[b])!.world;
        mesh.position.copy(p).add(q).multiplyScalar(0.5);
        mesh.position.z += offset;
        direction.copy(q).sub(p);
        mesh.scale.y = direction.length();
        mesh.quaternion.setFromUnitVectors(v(0, 1, 0), direction.normalize());
        mesh.material.opacity =
          (1 - smooth(0, 0.65, rootOpen)) *
          (1 - atomOpening) *
          (1 - contextStrength * 0.97);
        mesh.visible = mesh.material.opacity > 0.01;
      });
      bondTraces.forEach(({ line, a, b }) => {
        const attr = line.geometry.getAttribute(
            "position",
          ) as T.BufferAttribute,
          p = views.get(graph.atoms[a])!.world,
          q = views.get(graph.atoms[b])!.world;
        attr.setXYZ(0, p.x, p.y, p.z);
        attr.setXYZ(1, q.x, q.y, q.z);
        attr.needsUpdate = true;
        line.geometry.computeBoundingSphere();
        (line.material as T.LineBasicMaterial).opacity = rootOpen * 0.18;
        line.visible = s.cloud;
      });
      platform.visible = rim.visible =
        rootOpen < 0.45 && atomOpening < 0.45 && !s.focus;
      platformMat.opacity =
        1 - smooth(0, 0.45, Math.max(rootOpen, atomOpening));
      (rim.material as T.LineBasicMaterial).opacity =
        platformMat.opacity * 0.25;
      if (s.photon !== lastPhoton) {
        lastPhoton = s.photon;
        photonTime = s.photon > 0 ? 0 : 7;
        eventPhase = -1;
        const selected = graph.nodes.get(s.selected || "");
        photonAtom =
          selected && selected.atom >= 0
            ? graph.atoms[selected.atom]
            : graph.atoms.find((id) => graph.nodes.get(id)!.element === "H") ||
              graph.atoms[0];
      }
      if (photonTime < 7) {
        photonTime += dt;
        const atom = views.get(photonAtom)!,
          t = photonTime,
          phase = t < 2 ? 0 : t < 4 ? 1 : t < 6.8 ? 2 : 3;
        photon.visible = phase === 0 || phase === 2;
        photon.position
          .copy(atom.world)
          .add(v(t < 2 ? -4 + t * 2 : ((t - 4) / 2.8) * 4, 0.25, 0));
        if (atom.cloud)
          atom.cloud.scale.setScalar(
            1 + (phase === 1 ? 0.18 * Math.sin(((t - 2) / 2) * Math.PI) : 0),
          );
        if (phase !== eventPhase) {
          eventPhase = phase;
          event.current(
            [
              `Photon incident · ${atom.node.entry.name}`,
              `Énergie absorbée · ${atom.node.entry.name}`,
              `Émission d’un photon · ${atom.node.entry.name}`,
              "Transition terminée",
            ][phase],
          );
        }
      } else photon.visible = false;
      field.visible = s.higgs;
      if (s.higgs) {
        for (let i = 0; i < fieldAttr.count; i++) {
          const r = Math.hypot(fieldAttr.getX(i), fieldAttr.getZ(i));
          fieldAttr.setY(
            i,
            -3 + Math.cos(r * 3 - (reduced ? 0 : clock * 1.5)) * 0.15,
          );
        }
        fieldAttr.needsUpdate = true;
      }
      if (fitTime > 0) {
        bounds.makeEmpty();
        const focused = s.focus ? views.get(s.focus) : undefined;
        if (focused) {
          center.copy(focused.world);
          const worldScale = focused.group.getWorldScale(point).x,
            r = Math.max(
              0.16,
              (focused.node.children.length
                ? focused.openRadius
                : focused.closedRadius) * worldScale,
            );
          size.setScalar(r * 2.65);
          target.copy(center);
        } else {
          for (const id of graph.atoms) {
            const a = views.get(id)!;
            const radius = T.MathUtils.lerp(
              a.closedRadius,
              a.openRadius,
              expansion(a.node, s),
            );
            bounds.expandByPoint(a.world.clone().addScalar(radius));
            bounds.expandByPoint(a.world.clone().addScalar(-radius));
          }
          bounds.getSize(size);
          bounds.getCenter(target);
          size.x += 1.2;
          size.y += 1.2;
        }
        const tan = Math.tan(T.MathUtils.degToRad(camera.fov / 2)),
          distance = Math.max(
            ((size.y / (2 * tan)) * height) / availableH,
            ((size.x / (2 * tan * camera.aspect)) * width) / availableW,
            size.z * 1.2,
          );
        direction.copy(camera.position).sub(controls.target).normalize();
        controls.target.lerp(target, reduced ? 1 : 1 - Math.exp(-dt * 6));
        camera.position.lerp(
          target.clone().addScaledVector(direction, distance),
          reduced ? 1 : 1 - Math.exp(-dt * 6),
        );
        fitTime = reduced ? 0 : Math.max(0, fitTime - dt * 0.8);
      }
      controls.autoRotate = s.rotate && !reduced;
      const cameraChanged = controls.update(dt);
      // Keep close details visible without sacrificing depth precision at overview scale.
      const near = T.MathUtils.clamp(
        controls.getDistance() * 0.01,
        1e-7,
        0.015,
      );
      const projectionChanged = Math.abs(camera.near - near) > near * 0.001;
      if (projectionChanged) {
        camera.near = near;
        camera.updateProjectionMatrix();
      }
      if (now - labelTime > 50) {
        labelTime = now;
        let count = 0;
        let layer = 0;
        const opened: string[] = [],
          readable: string[] = [];
        const focusId = detailContext || s.focus;
        const focused = focusId ? graph.nodes.get(focusId) : null;
        views.forEach((view) => {
          point.copy(view.world).project(camera);
          view.label.dataset.anchorX = String(((point.x + 1) * width) / 2);
          view.label.dataset.anchorY = String(((1 - point.y) * height) / 2);
          view.label.dataset.open = view.open.toFixed(3);
          view.label.dataset.reveal = view.reveal.toFixed(3);
          view.label.dataset.screenSize = view.screenSize.toFixed(1);
          if (view.open > 0.5) opened.push(view.node.id);
          if (view.readable) readable.push(view.node.id);
          if (
            view.reveal > 0.5 &&
            view.screenSize > detailUnit * 0.035 &&
            point.z < 1 &&
            Math.abs(point.x) < 1 &&
            Math.abs(point.y) < 1
          ) {
            const k = view.node.kind;
            layer = Math.max(
              layer,
              k === "up" || k === "down"
                ? 3
                : k === "proton" || k === "neutron"
                  ? 2
                  : k === "nucleus" || k === "electron"
                    ? 1
                    : 0,
            );
          }
          const direct =
            focused &&
            (view.node.parent === focused.id || view.node.id === focused.id);
          const selected = s.selected === view.node.id;
          let eligible =
            selected ||
            direct ||
            (!s.focus &&
              (view.node.kind === "atom" ||
                (view.node.kind === "nucleus" &&
                  views.get(view.node.parent!)!.open > 0.4)));
          if (view.node.kind === "electron" && !selected && !direct)
            eligible = false;
          point.copy(view.world);
          const scale = view.group.getWorldScale(v()).x;
          point.y += view.radius * scale + 0.1 * scale;
          point.project(camera);
          const x = ((point.x + 1) * width) / 2,
            y = ((1 - point.y) * height) / 2;
          const show =
            s.labels &&
            view.reveal > 0.45 &&
            eligible &&
            point.z < 1 &&
            y > (height < 650 ? 150 : width < 768 ? 205 : 220) &&
            y < height - 165 &&
            x > 12 &&
            x < width - 30;
          view.label.hidden = !show;
          view.label.classList.toggle("selected", selected);
          view.label.style.transform = `translate(${x}px,${y}px) translate(-50%,-100%)`;
          if (view.reveal > 0.45) count++;
        });
        canvas.dataset.visibleNodes = String(count);
        canvas.dataset.depth = s.depth.toFixed(2);
        canvas.dataset.focus = s.focus || "";
        const snapshot: SceneDetail = {
          molecule: s.molecule,
          open: opened,
          readable,
          count,
          layer: ["Atomes", "Noyaux & électrons", "Nucléons", "Quarks"][layer],
          context: detailContext,
        };
        const signature = JSON.stringify(snapshot);
        canvas.dataset.detailLayer = snapshot.layer;
        canvas.dataset.detailContext = detailContext || "";
        if (signature !== lastDetail) {
          lastDetail = signature;
          detail.current(snapshot);
        }
      }
      if (
        cameraChanged ||
        controlsDirty ||
        projectionChanged ||
        moving ||
        fitTime > 0 ||
        oldState !== s ||
        photonTime < 7 ||
        s.higgs ||
        clock < 0.5
      ) {
        renderer.render(scene, camera);
        controlsDirty = false;
      }
      oldState = s;
    }
    raf = requestAnimationFrame(frame);
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
      controls.dispose();
      canvas.removeEventListener("pointerdown", pointerDown);
      canvas.removeEventListener("pointerup", pointerUp);
      canvas.removeEventListener("pointermove", pointerMove);
      canvas.removeEventListener("pointercancel", cancel);
      canvas.removeEventListener("pointerleave", leave);
      canvas.removeEventListener("dblclick", dbl);
      canvas.removeEventListener("webglcontextlost", lost);
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      environment.dispose();
      keyLight.shadow.map?.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
      labelRoot.remove();
      tooltip.remove();
    };
  }, [state.molecule, graph]);
  return (
    <div className="scene" ref={host}>
      {error && (
        <div className="scene-error">
          <strong>La scène 3D est en pause.</strong>
          <p>Rechargez l’atlas avec l’accélération graphique activée.</p>
          <button onClick={() => location.reload()}>Recharger</button>
        </div>
      )}
    </div>
  );
}
