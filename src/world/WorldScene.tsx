import { useEffect, useRef } from "react";
import * as T from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { t, useLocale } from "../i18n";
import { WORLD_NODES } from "./data";
import type { WorldNode } from "./data";
import { createWorldModel } from "./models";
import type { WorldModel } from "./models";
import {
  childPosition,
  frameMeters,
  relativeFrame,
  setModelAnchor,
  setSelectedAnchor,
  selectedAnchorEntries,
} from "./layout";

export interface WorldSceneInfo {
  metersPerPixel: number;
  transitioning: boolean;
  visibleIds: string[];
}
interface Props {
  selectedId: string;
  preferredChildId?: string;
  rotating: boolean;
  focusMode: boolean;
  resetToken: number;
  onNavigate: (id: string) => void;
  onInfo: (info: WorldSceneInfo) => void;
}
type Item = {
  node: WorldNode;
  model: WorldModel;
  label?: HTMLButtonElement;
  leader?: SVGLineElement;
  base: Map<T.Material, number>;
};
type Frame = { id: string; group: T.Group; items: Item[]; dispose: () => void };
type Flight = {
  elapsed: number;
  duration: number;
  speed: number;
  start: T.Vector3;
  target: T.Vector3;
  end: T.Vector3;
};
const clamp = T.MathUtils.clamp;
const ease = (v: number) => v * v * (3 - 2 * v);
let serial = 0;

export function WorldScene(props: Props) {
  const locale = useLocale();
  const host = useRef<HTMLDivElement>(null);
  const latest = useRef({ ...props, locale });
  latest.current = { ...props, locale };
  const api = useRef<
    | {
        navigate: (id: string) => void;
        reset: () => void;
        language: () => void;
      }
    | undefined
  >(undefined);
  useEffect(() => {
    const element = host.current!;
    const diagnosticsEnabled =
      new URLSearchParams(location.search).get("diagnostics") === "1";
    let renderer: T.WebGLRenderer;
    try {
      renderer = new T.WebGLRenderer({
        antialias: true,
        alpha: false,
        logarithmicDepthBuffer: true,
        powerPreference: "high-performance",
      });
    } catch {
      element.dataset.failed = "true";
      return;
    }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
    renderer.setClearColor("#101722");
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    const canvas = renderer.domElement;
    canvas.dataset.worldScene = String(++serial);
    canvas.tabIndex = 0;
    canvas.setAttribute("role", "img");
    element.prepend(canvas);
    const labels = document.createElement("div");
    labels.className = "world-scene-labels";
    element.append(labels);
    const leaders = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg",
    );
    leaders.classList.add("world-label-leaders");
    labels.append(leaders);
    const scene = new T.Scene();
    scene.add(new T.HemisphereLight("#deedff", "#414357", 1.5));
    const key = new T.DirectionalLight("#fff0d6", 2.1);
    key.position.set(-3, 5, 6);
    scene.add(key);
    const rim = new T.DirectionalLight("#80bfff", 1.3);
    rim.position.set(4, 2, -4);
    scene.add(rim);
    const fill = new T.DirectionalLight("#e5bbc3", 0.4);
    fill.position.set(-4, -1, -3);
    scene.add(fill);
    const camera = new T.PerspectiveCamera(48, 1, 0.0001, 1e8);
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.13;
    controls.zoomSpeed = 0.8;
    controls.rotateSpeed = 0.65;
    controls.panSpeed = 0.55;
    controls.minDistance = 0.00001;
    controls.maxDistance = 1e30;
    controls.zoomToCursor = true;
    controls.enablePan = true;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let active: Frame,
      ghosts: Frame[] = [];
    let flight: Flight | null = null,
      current = props.selectedId;
    let width = 1,
      height = 1,
      unobstructedHeight = 1,
      compactReference = false,
      raf = 0,
      last = performance.now(),
      tick = 0;
    let lastWheel = 0,
      wheelDirection = 0,
      wheelChild: string | undefined;
    let pickedOrigin: { id: string; point: T.Vector3 } | null = null;
    let disposed = false,
      dragging = false,
      pointerStart = [0, 0];
    const touches = new Map<number, [number, number]>();
    const pressedPointers = new Set<number>();
    const pinchPointers = new Set<number>();
    let lastPickDiagnostics = -Infinity;
    const raycaster = new T.Raycaster(),
      pointer = new T.Vector2();
    const vector = new T.Vector3();
    const fitDistance = () =>
      Math.max(
        1.55,
        compactReference
          ? ((0.65 / Math.tan((camera.fov * Math.PI) / 360)) * height) /
              unobstructedHeight
          : 0,
        0.76 /
          Math.tan((camera.fov * Math.PI) / 360) /
          Math.min(1, width / height),
      ) *
      (current === "world"
        ? 0.78
        : WORLD_NODES[current].model === "waterMolecule"
          ? 1.85
          : 1);
    const fitPosition = () =>
      current === "world"
        ? new T.Vector3(0.1, 0.26, 1.03)
            .normalize()
            .multiplyScalar(fitDistance())
        : new T.Vector3(0.11, 0.09, 1)
            .normalize()
            .multiplyScalar(fitDistance());
    const materials = (group: T.Group) => {
      const map = new Map<T.Material, number>();
      group.traverse((o) => {
        if (o instanceof T.Mesh)
          for (const m of Array.isArray(o.material) ? o.material : [o.material])
            map.set(m, m.opacity);
      });
      return map;
    };
    function makeFrame(id: string): Frame {
      const node = WORLD_NODES[id],
        group = new T.Group();
      scene.add(group);
      const items: Item[] = [];
      const add = (child: WorldNode, isChild: boolean) => {
        const model = createWorldModel(
          child.model,
          child.color,
          child.id.length,
          child.atomic,
        );
        if (isChild) {
          model.group.position.copy(childPosition(node, child));
          model.group.scale.setScalar(frameMeters(child) / frameMeters(node));
        }
        model.group.userData.node = child.id;
        if (child.model === "atom")
          model.group.traverse((object) => {
            if (object.userData.nucleusMarker) object.visible = false;
          });
        if (child.id === "world")
          model.group.position.y = -Number(model.group.userData.groundY || 0);
        group.add(model.group);
        const item: Item = { node: child, model, base: materials(model.group) };
        if (isChild) {
          const label = document.createElement("button");
          label.className = "world-object-label";
          label.dataset.worldNode = child.id;
          label.style.setProperty("--object-color", child.color);
          const dot = document.createElement("i"),
            name = document.createElement("span");
          label.append(dot, name);
          label.addEventListener("click", (event) => {
            event.stopPropagation();
            latest.current.onNavigate(child.id);
          });
          label.addEventListener(
            "wheel",
            (event) => {
              event.preventDefault();
              event.stopPropagation();
              if (Math.abs(event.deltaY) > 1)
                latest.current.onNavigate(
                  event.deltaY < 0
                    ? child.id
                    : WORLD_NODES[current].parent || "world",
                );
            },
            { passive: false },
          );
          labels.append(label);
          item.label = label;
          const leader = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "line",
          );
          leader.setAttribute("stroke", child.color);
          leaders.append(leader);
          item.leader = leader;
        }
        items.push(item);
      };
      add(node, false);
      items[0].model.group.updateMatrixWorld(true);
      const embodied = new Set<string>();
      const anchors = items[0].model.group.userData.childAnchors as
        | Record<string, [number, number, number]>
        | undefined;
      for (const child of node.children.map((id) => WORLD_NODES[id]))
        if (anchors?.[child.model])
          setModelAnchor(
            node.id,
            child.id,
            new T.Vector3(...anchors[child.model]),
          );
      items[0].model.group.traverse((object) => {
        const kind = object.userData.worldChildModel;
        const constituent = object.userData.constituent;
        if (!kind && !constituent) return;
        const child = node.children
          .map((id) => WORLD_NODES[id])
          .find(
            (candidate) =>
              (constituent
                ? candidate.id.endsWith("/" + constituent)
                : candidate.model === kind) &&
              (!object.userData.worldChildAtomicNumber ||
                candidate.atomic?.atomicNumber ===
                  object.userData.worldChildAtomicNumber) &&
              (!object.userData.worldQuarkFlavor ||
                candidate.quarkFlavor === object.userData.worldQuarkFlavor),
          );
        if (!child || embodied.has(child.id)) return;
        // The parent already draws this constituent. Its locator selects that
        // representative, rather than adding a second nucleus or extra heme.
        let point = object.getWorldPosition(new T.Vector3());
        if (object instanceof T.InstancedMesh && object.count) {
          const matrix = new T.Matrix4();
          object.getMatrixAt(0, matrix);
          point.setFromMatrixPosition(matrix).applyMatrix4(object.matrixWorld);
        }
        const anchor = items[0].model.group.userData.childAnchors?.[
          child.model
        ] as [number, number, number] | undefined;
        setModelAnchor(
          node.id,
          child.id,
          anchor ? new T.Vector3(...anchor) : group.worldToLocal(point),
        );
        embodied.add(child.id);
      });
      node.children.forEach((id) => {
        add(WORLD_NODES[id], true);
        if (embodied.has(id))
          items[items.length - 1].model.group.visible = false;
      });
      if (node.model === "waterMolecule") {
        // A bounded local liquid sample, not an asserted molecular census.
        // Neighbour molecules keep the same physical size as the selected one.
        const prototype = items[0].model.group;
        prototype.updateMatrixWorld(true);
        const primitives: Array<{
          geometry: T.BufferGeometry;
          material: T.Material | T.Material[];
          transforms: T.Matrix4[];
          semantic: Record<string, unknown>;
        }> = [];
        prototype.traverse((object) => {
          if (!(object instanceof T.Mesh)) return;
          const transforms: T.Matrix4[] = [];
          if (object instanceof T.InstancedMesh) {
            for (let i = 0; i < object.count; i++) {
              const matrix = new T.Matrix4();
              object.getMatrixAt(i, matrix);
              transforms.push(matrix.premultiply(object.matrixWorld));
            }
          } else transforms.push(object.matrixWorld.clone());
          primitives.push({
            geometry: object.geometry,
            material: object.material,
            transforms,
            semantic: { ...object.userData },
          });
        });
        const positions: T.Vector3[] = [],
          transforms: T.Matrix4[] = [];
        let seed = 71;
        const random = () => {
          seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
          return seed / 4294967296;
        };
        for (let x = -4; x <= 4; x++)
          for (let y = -3; y <= 3; y++)
            for (let z = -1; z <= 0; z++) {
              if (x === 0 && y === 0 && z === 0) continue;
              const p = new T.Vector3(
                (x + (random() - 0.5) * 0.28) * 1.12,
                (y + (random() - 0.5) * 0.28) * 1.12,
                z * 1.1 + (random() - 0.5) * 0.3,
              );
              positions.push(p);
              transforms.push(
                new T.Matrix4().compose(
                  p,
                  new T.Quaternion().setFromEuler(
                    new T.Euler(random() * 6, random() * 6, random() * 6),
                  ),
                  new T.Vector3(1, 1, 1),
                ),
              );
            }
        const meshes: T.InstancedMesh[] = [],
          owned: T.Material[] = [];
        for (const primitive of primitives) {
          const clone = (material: T.Material) => {
            const cloned = material.clone();
            if (cloned instanceof T.MeshStandardMaterial)
              cloned.color.multiplyScalar(0.62);
            owned.push(cloned);
            return cloned;
          };
          const material = Array.isArray(primitive.material)
            ? primitive.material.map(clone)
            : clone(primitive.material);
          const mesh = new T.InstancedMesh(
            primitive.geometry,
            material,
            positions.length * primitive.transforms.length,
          );
          transforms.forEach((transform, i) =>
            primitive.transforms.forEach((part, j) =>
              mesh.setMatrixAt(
                i * primitive.transforms.length + j,
                transform.clone().multiply(part),
              ),
            ),
          );
          mesh.instanceMatrix.needsUpdate = true;
          mesh.computeBoundingSphere();
          Object.assign(mesh.userData, primitive.semantic);
          mesh.userData.worldReplica = true;
          mesh.userData.replicaPositions = positions;
          mesh.userData.partsPerReplica = primitive.transforms.length;
          prototype.add(mesh);
          meshes.push(mesh);
        }
        prototype.userData.replicaCount = positions.length;
        items[0].base = materials(prototype);
        const old = items[0].model.dispose;
        items[0].model.dispose = () => {
          meshes.forEach((m) => m.dispose());
          owned.forEach((m) => m.dispose());
          old();
        };
      }
      if (id === "world") {
        // A table gives the physically small glass a visible place in the world.
        const table = new T.Group(),
          geo = new T.BoxGeometry(1, 1, 1),
          mat = new T.MeshStandardMaterial({
            color: "#b8885c",
            roughness: 0.6,
          });
        const top = new T.Mesh(geo, mat);
        top.scale.set(1.1, 0.055, 0.62);
        top.position.set(0.22, 0.89, 3.6);
        table.add(top);
        for (const x of [-0.23, 0.23])
          for (const z of [-0.2, 0.2]) {
            const leg = new T.Mesh(geo, mat);
            leg.scale.set(0.045, 0.88, 0.045);
            leg.position.set(0.22 + x, 0.44, 3.6 + z);
            table.add(leg);
          }
        table.scale.setScalar(1 / 24);
        group.add(table);
        const old = items[0].model.dispose;
        items[0].model.dispose = () => {
          geo.dispose();
          mat.dispose();
          old();
        };
      }
      const frame = {
        id,
        group,
        items,
        dispose: () => {
          scene.remove(group);
          items.forEach((item) => {
            item.label?.remove();
            item.leader?.remove();
            item.model.dispose();
          });
          group.clear();
        },
      };
      return frame;
    }
    function language() {
      canvas.setAttribute(
        "aria-label",
        t("Interactive world. Select an object to explore its contents."),
      );
      for (const frame of [active, ...ghosts].filter(Boolean))
        for (const item of frame.items)
          if (item.label) {
            item.label.querySelector("span")!.textContent =
              item.node.name[latest.current.locale];
            item.label.setAttribute(
              "aria-label",
              t("Explore {name}", {
                name: item.node.name[latest.current.locale],
              }),
            );
          }
    }
    function resize() {
      width = element.clientWidth;
      height = element.clientHeight;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      const inspector = document.querySelector<HTMLElement>(".world-inspector");
      const rect = inspector?.getBoundingClientRect();
      const right =
        width >= 980 && rect && rect.left < width && rect.width > 100
          ? width - rect.left + 24
          : 24;
      const left = width >= 980 ? 50 : 12;
      const reference = document
        .querySelector(".world-scale")
        ?.getBoundingClientRect();
      compactReference =
        current !== "world" &&
        width <= 700 &&
        Boolean(reference && reference.width > width * 0.75);
      const top = compactReference && reference ? reference.bottom + 12 : 78;
      unobstructedHeight = Math.max(120, height - top - 100);
      camera.setViewOffset(
        width,
        height,
        (right - left) / 2,
        compactReference ? (100 - top) / 2 : 0,
        width,
        height,
      );
      canvas.dataset.viewport = JSON.stringify({
        left,
        top,
        width: width - left - right,
        height: unobstructedHeight,
      });
    }
    function reset() {
      flight = null;
      ghosts.forEach((f) => f.dispose());
      ghosts = [];
      controls.target.set(0, current === "world" ? 0.06 : 0, 0);
      camera.position.copy(fitPosition()).add(controls.target);
      controls.update();
    }
    function navigate(id: string) {
      if (id === current || !WORLD_NODES[id]) return;
      if (pickedOrigin?.id === id && WORLD_NODES[id].parent === current)
        setSelectedAnchor(current, id, pickedOrigin.point);
      // A direct link can start inside a parent that has never been built.
      // Register that destination's embodied landmarks before computing the
      // reverse transform; the newly built frame itself must not be rebased.
      const nextFrame = makeFrame(id);
      const transform = relativeFrame(current, id);
      pickedOrigin = null;
      canvas.dataset.pickTargets = "[]";
      lastPickDiagnostics = -Infinity;
      for (const frame of [active, ...ghosts]) {
        frame.group.position
          .sub(transform.origin)
          .multiplyScalar(transform.ratio);
        frame.group.scale.multiplyScalar(transform.ratio);
        frame.items.forEach((item) => {
          if (item.label) item.label.hidden = true;
          if (item.leader) item.leader.style.display = "none";
        });
      }
      camera.position.sub(transform.origin).multiplyScalar(transform.ratio);
      controls.target.sub(transform.origin).multiplyScalar(transform.ratio);
      // Clear OrbitControls' pending damping before recording the new flight.
      controls.enableDamping = false;
      controls.update();
      controls.enableDamping = true;
      ghosts.forEach((f) => f.dispose());
      ghosts = [active];
      // The identical destination model now belongs to the new reference frame.
      active.items
        .find((item) => item.node.id === id)
        ?.model.group.removeFromParent();
      current = id;
      active = nextFrame;
      language();
      resize();
      const end = fitPosition();
      flight = {
        elapsed: 0,
        duration: 1050,
        speed: 1,
        start: camera.position.clone(),
        target: controls.target.clone(),
        end,
      };
      if (reduced.matches) reset();
      lastWheel = 0;
    }
    function visibleObject(object: T.Object3D): boolean {
      for (let part: T.Object3D | null = object; part; part = part.parent)
        if (!part.visible) return false;
      return true;
    }
    function semanticTarget(object: T.Object3D): {
      id?: string;
      annotated: boolean;
      owner?: T.Object3D;
    } {
      // A world-level click on the heart drawn inside the human still selects
      // the human container. Only the current parent's embedded contents resolve
      // to semantic children at this scale.
      for (let part: T.Object3D | null = object; part; part = part.parent) {
        const ownerId = part.userData.node;
        if (
          ownerId &&
          ownerId !== current &&
          active.items.some((i) => i.node.id === ownerId)
        )
          return { id: String(ownerId), annotated: false, owner: part };
      }
      let annotated = false;
      for (let part: T.Object3D | null = object; part; part = part.parent) {
        const data = part.userData;
        if (!data.worldChildModel && !data.constituent) continue;
        annotated = true;
        const match = active.items
          .slice(1)
          .find(
            ({ node }) =>
              (data.constituent
                ? node.id.endsWith("/" + data.constituent)
                : node.model === data.worldChildModel) &&
              (data.worldChildAtomicNumber === undefined ||
                node.atomic?.atomicNumber === data.worldChildAtomicNumber) &&
              (!data.worldQuarkFlavor ||
                node.quarkFlavor === data.worldQuarkFlavor),
          );
        if (match) return { id: match.node.id, annotated: true };
        return { annotated: true };
      }
      return { annotated };
    }
    function hitCenter(hit: T.Intersection, owner?: T.Object3D): T.Vector3 {
      const object = owner || hit.object;
      const point = object.getWorldPosition(new T.Vector3());
      if (
        !owner &&
        hit.object instanceof T.InstancedMesh &&
        hit.instanceId !== undefined
      ) {
        const matrix = new T.Matrix4();
        hit.object.getMatrixAt(hit.instanceId, matrix);
        // The complete instance matrix already includes both the cell's rotation
        // and this oxygen/hydrogen's own offset inside that rotated molecule.
        point
          .setFromMatrixPosition(matrix)
          .applyMatrix4(hit.object.matrixWorld);
      }
      return active.group.worldToLocal(point);
    }
    function pick(
      x: number,
      y: number,
      commit = false,
      report?: { point?: T.Vector3; replica?: boolean },
    ) {
      const rect = canvas.getBoundingClientRect();
      pointer.set(
        ((x - rect.left) / rect.width) * 2 - 1,
        (-(y - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointer, camera);
      const roots = active.items
        .filter((item) => item.model.group.visible)
        .map((item) => item.model.group);
      const hits = raycaster.intersectObjects(roots, true);
      const remember = (id: string, point: T.Vector3, replica: boolean) => {
        if (commit) pickedOrigin = { id, point: point.clone() };
        if (report) {
          report.point = point.clone();
          report.replica = replica;
        }
        return id;
      };
      let translucent:
        | { id: string; point: T.Vector3; replica: boolean }
        | undefined;
      for (const hit of hits) {
        if (!visibleObject(hit.object)) continue;
        const target = semanticTarget(hit.object);
        const material =
          hit.object instanceof T.Mesh
            ? Array.isArray(hit.object.material)
              ? hit.object.material[hit.face?.materialIndex ?? 0]
              : hit.object.material
            : undefined;
        const seeThrough = Boolean(
          material?.transparent && material.opacity < 0.7,
        );
        if (target.id) {
          const point = hitCenter(hit, target.owner);
          const replica = Boolean(hit.object.userData.worldReplica);
          if (seeThrough) {
            translucent ??= { id: target.id, point, replica };
            continue;
          }
          return remember(target.id, point, replica);
        }
        // Never turn a click on an unsupported annotated structure into a
        // different nearby organelle through the screen-distance fallback.
        if (target.annotated) return undefined;
        if (seeThrough) continue;
        return undefined;
      }
      if (translucent)
        return remember(translucent.id, translucent.point, translucent.replica);
      let best: string | undefined,
        dist = 80;
      for (const item of active.items.slice(1)) {
        item.model.group.getWorldPosition(vector).project(camera);
        const d = Math.hypot(
          (vector.x * 0.5 + 0.5) * width - (x - rect.left),
          (-vector.y * 0.5 + 0.5) * height - (y - rect.top),
        );
        if (vector.z >= -1 && vector.z < 1 && d < dist) {
          best = item.node.id;
          dist = d;
        }
      }
      return best;
    }
    function updatePickDiagnostics() {
      if (flight) {
        canvas.dataset.pickTargets = "[]";
        return;
      }
      const rect = canvas.getBoundingClientRect();
      const bounds = JSON.parse(canvas.dataset.viewport || "{}");
      const buckets = new Map<
        string,
        Array<{ x: number; y: number; replica: boolean }>
      >();
      for (const item of active.items)
        item.model.group.traverseVisible((object) => {
          if (!(object instanceof T.Mesh)) return;
          const target = semanticTarget(object);
          if (!target.id) return;
          const candidates = buckets.get(target.id) || [];
          buckets.set(target.id, candidates);
          const count = object instanceof T.InstancedMesh ? object.count : 1;
          const samples = Math.min(count, 80);
          for (let n = 0; n < samples && candidates.length < 12; n++) {
            const instanceId =
              samples > 1 ? Math.floor((n * (count - 1)) / (samples - 1)) : 0;
            const point = object.getWorldPosition(new T.Vector3());
            if (object instanceof T.InstancedMesh) {
              const matrix = new T.Matrix4();
              object.getMatrixAt(instanceId, matrix);
              point
                .setFromMatrixPosition(matrix)
                .applyMatrix4(object.matrixWorld);
            }
            point.project(camera);
            const sx = (point.x * 0.5 + 0.5) * width,
              sy = (-point.y * 0.5 + 0.5) * height;
            if (
              point.z < -1 ||
              point.z > 1 ||
              sx < (bounds.left || 12) ||
              sx > (bounds.left || 0) + (bounds.width || width) ||
              sy < 90 ||
              sy > height - 100
            )
              continue;
            const x = sx + rect.left,
              y = sy + rect.top;
            if (document.elementFromPoint(x, y) !== canvas) continue;
            candidates.push({
              x,
              y,
              replica: Boolean(object.userData.worldReplica),
            });
          }
        });
      const targets: Array<{
        id: string;
        x: number;
        y: number;
        point: number[];
        replica: boolean;
      }> = [];
      let attempts = 0;
      while (
        targets.length < 16 &&
        attempts < 32 &&
        Array.from(buckets.values()).some((bucket) => bucket.length)
      ) {
        for (const [id, bucket] of buckets) {
          const candidate = bucket.shift();
          if (!candidate || targets.length >= 16 || attempts >= 32) continue;
          attempts++;
          const report: { point?: T.Vector3; replica?: boolean } = {};
          if (
            pick(candidate.x, candidate.y, false, report) === id &&
            report.point
          )
            targets.push({
              id,
              x: candidate.x,
              y: candidate.y,
              replica: Boolean(report.replica),
              point: report.point.toArray(),
            });
        }
      }
      canvas.dataset.pickTargets = JSON.stringify(targets);
    }
    function accelerateOrReverseFlight(direction: number): boolean {
      if (!flight) return false;
      lastWheel = 0;
      wheelChild = undefined;
      pickedOrigin = null;
      if (direction > 0 && WORLD_NODES[current].parent)
        latest.current.onNavigate(WORLD_NODES[current].parent!);
      else flight.speed = Math.min(3.5, flight.speed + 0.65);
      // Preserve both the logarithmic flight and departure geometry. Cancelling
      // here could strand the camera many orders of magnitude from the nucleus.
      return true;
    }
    const down = (event: PointerEvent) => {
      pressedPointers.add(event.pointerId);
      pointerStart = [event.clientX, event.clientY];
      dragging = false;
      if (event.pointerType === "touch") {
        touches.set(event.pointerId, [event.clientX, event.clientY]);
        if (touches.size > 1) touches.forEach((_, id) => pinchPointers.add(id));
      }
    };
    const move = (event: PointerEvent) => {
      if (event.pointerType === "touch" && touches.has(event.pointerId)) {
        const previous = Array.from(touches.values());
        touches.set(event.pointerId, [event.clientX, event.clientY]);
        if (touches.size === 2) {
          const points = Array.from(touches.values());
          const before = Math.hypot(
            previous[0][0] - previous[1][0],
            previous[0][1] - previous[1][1],
          );
          const after = Math.hypot(
            points[0][0] - points[1][0],
            points[0][1] - points[1][1],
          );
          if (Math.abs(after - before) > 0.2) {
            if (accelerateOrReverseFlight(after > before ? -1 : 1)) return;
            lastWheel = performance.now();
            wheelDirection = after > before ? -1 : 1;
            wheelChild = pick(
              (points[0][0] + points[1][0]) / 2,
              (points[0][1] + points[1][1]) / 2,
              true,
            );
          }
        }
      }
      if (
        event.buttons &&
        Math.hypot(
          event.clientX - pointerStart[0],
          event.clientY - pointerStart[1],
        ) > 5
      )
        dragging = true;
      canvas.style.cursor = event.buttons
        ? "grabbing"
        : pick(event.clientX, event.clientY)
          ? "pointer"
          : "grab";
    };
    const up = (event: PointerEvent) => {
      const pressedHere = pressedPointers.delete(event.pointerId);
      const pinching =
        pinchPointers.delete(event.pointerId) || touches.size > 1;
      touches.delete(event.pointerId);
      if (!pressedHere) return;
      if (!pinching && !dragging && event.button === 0) {
        const id = pick(event.clientX, event.clientY, true);
        if (id) latest.current.onNavigate(id);
      }
    };
    const cancelPointer = (event: PointerEvent) => {
      pressedPointers.delete(event.pointerId);
      pinchPointers.delete(event.pointerId);
      touches.delete(event.pointerId);
      if (!touches.size) dragging = false;
    };
    const wheel = (event: WheelEvent) => {
      if (!event.deltaY) return;
      if (accelerateOrReverseFlight(Math.sign(event.deltaY))) return;
      lastWheel = performance.now();
      wheelDirection = Math.sign(event.deltaY);
      wheelChild = pick(event.clientX, event.clientY, true);
    };
    const keyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter" || event.key === "+") {
        const id =
          latest.current.preferredChildId || WORLD_NODES[current].defaultChild;
        if (id) latest.current.onNavigate(id);
        event.preventDefault();
      }
      if (event.key === "-" || event.key === "Backspace") {
        latest.current.onNavigate(WORLD_NODES[current].parent || "world");
        event.preventDefault();
      }
      if (event.key === "Home") {
        latest.current.onNavigate("world");
        event.preventDefault();
      }
    };
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", cancelPointer);
    canvas.addEventListener("wheel", wheel, { passive: true });
    canvas.addEventListener("keydown", keyDown);
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    const uiObserver = new MutationObserver(resize);
    const ui = document.querySelector(".world-ui");
    if (ui)
      uiObserver.observe(ui, {
        attributes: true,
        attributeFilter: ["data-inspector-open", "data-focus"],
      });
    active = makeFrame(current);
    resize();
    reset();
    language();
    api.current = { navigate, reset, language };
    function animate(now: number) {
      if (disposed) return;
      raf = requestAnimationFrame(animate);
      const dt = Math.min(50, now - last);
      last = now;
      if (flight) {
        flight.elapsed += dt * flight.speed;
        const progress = clamp(flight.elapsed / flight.duration, 0, 1);
        const startDistance = Math.max(
            flight.start.distanceTo(flight.target),
            1e-12,
          ),
          endDistance = flight.end.length();
        const ratio = Math.abs(Math.log10(startDistance / endDistance));
        // Huge empty intervals are compressed, while both surfaces remain visible.
        const time =
          ratio > 3
            ? progress < 0.38
              ? (progress / 0.38) * 0.06
              : progress > 0.66
                ? 0.94 + ((progress - 0.66) / 0.34) * 0.06
                : 0.06 + ((progress - 0.38) / 0.28) * 0.88
            : progress;
        const a = ease(time),
          distance = Math.exp(
            T.MathUtils.lerp(Math.log(startDistance), Math.log(endDistance), a),
          );
        controls.target.copy(flight.target).multiplyScalar(1 - a);
        const direction = flight.start
          .clone()
          .sub(flight.target)
          .normalize()
          .lerp(flight.end.clone().normalize(), ease(progress))
          .normalize();
        camera.position
          .copy(controls.target)
          .addScaledVector(direction, distance);
        camera.lookAt(controls.target);
        if (progress === 1) {
          flight = null;
          ghosts.forEach((f) => f.dispose());
          ghosts = [];
          controls.update();
        }
      } else {
        controls.autoRotate = latest.current.rotating && !reduced.matches;
        controls.autoRotateSpeed = 0.35;
        controls.update();
        if (now - lastWheel < 500) {
          const distance = camera.position.distanceTo(controls.target),
            fit = fitDistance();
          if (wheelDirection < 0 && distance < fit * 0.76) {
            const id =
              wheelChild ||
              latest.current.preferredChildId ||
              WORLD_NODES[current].defaultChild;
            if (id) {
              lastWheel = 0;
              latest.current.onNavigate(id);
            }
          }
          if (
            wheelDirection > 0 &&
            distance > fit * 1.35 &&
            current !== "world"
          ) {
            lastWheel = 0;
            latest.current.onNavigate(WORLD_NODES[current].parent!);
          }
        }
      }
      const distance = camera.position.distanceTo(controls.target);
      camera.near = Math.max(1e-9, distance * 0.00002);
      camera.far = Math.max(2e4, distance * 100);
      camera.updateProjectionMatrix();
      const placed: Array<{ x: number; y: number; w: number; h: number }> = [];
      const contentRect = JSON.parse(canvas.dataset.viewport || "{}");
      const centerX =
        (contentRect.left || 0) + (contentRect.width || width) / 2;
      for (const frame of [active, ...ghosts]) {
        const outgoing = frame !== active;
        const fade =
          outgoing && flight
            ? 1 -
              ease(
                clamp((flight.elapsed / flight.duration - 0.24) / 0.58, 0, 1),
              )
            : 1;
        for (let index = 0; index < frame.items.length; index++) {
          const item = frame.items[index];
          // Restore opacities before applying model-specific cutaways each frame.
          item.base.forEach((opacity, material) => {
            material.opacity = opacity;
          });
          item.model.update(
            reduced.matches ? 0 : now * 0.001,
            index === 0 && item.node.children.length && current !== "world"
              ? 0.55
              : 0,
          );
          if (outgoing)
            item.base.forEach((_, material) => {
              material.transparent = true;
              material.depthWrite = false;
              material.opacity *= fade;
            });
          if (item.label && !outgoing) {
            item.model.group.getWorldPosition(vector);
            const worldPosition = vector.clone();
            vector.project(camera);
            const x = (vector.x * 0.5 + 0.5) * width,
              y = (-vector.y * 0.5 + 0.5) * height;
            const pixelSize =
              (frameMeters(item.node) /
                frameMeters(WORLD_NODES[current]) /
                Math.max(camera.position.distanceTo(worldPosition), 1e-9) /
                (2 * Math.tan((camera.fov * Math.PI) / 360))) *
              height;
            item.label.dataset.unresolved = String(pixelSize < 3);
            item.label.hidden =
              Boolean(flight) ||
              vector.z > 1 ||
              vector.z < -1 ||
              x < 10 ||
              x > width - 10 ||
              y < 65 ||
              y > height - 82;
            let lx = x,
              ly = y - clamp(pixelSize * 0.5, 32, 80);
            const lw = Math.min(
                width < 600 ? 142 : 186,
                item.label.offsetWidth || 160,
              ),
              lh = item.label.offsetHeight || 35;
            if (current !== "world") {
              const side = index % 2 ? -1 : 1;
              lx =
                centerX +
                side *
                  Math.min(
                    width < 600 ? 96 : 210,
                    (contentRect.width || width) * 0.31,
                  );
              ly = y + (index % 2 ? -20 : 20);
            }
            lx = clamp(lx, lw / 2 + 12, width - lw / 2 - 18);
            ly = clamp(ly, 108, height - 125);
            for (let pass = 0; pass < 10; pass++) {
              const overlap = placed.find(
                (p) =>
                  Math.abs(lx - p.x) < (lw + p.w) / 2 + 10 &&
                  Math.abs(ly - p.y) < (lh + p.h) / 2 + 10,
              );
              if (!overlap) break;
              ly = overlap.y + (overlap.h + lh) / 2 + 12;
              if (ly > height - 122) {
                ly = overlap.y - (overlap.h + lh) / 2 - 12;
                lx += lx < centerX ? -25 : 25;
              }
            }
            placed.push({ x: lx, y: ly, w: lw, h: lh });
            item.label.style.left = `${lx}px`;
            item.label.style.top = `${ly}px`;
            item.label.style.setProperty("--label-lift", "0px");
            if (item.leader) {
              item.leader.style.display = item.label.hidden ? "none" : "";
              item.leader.setAttribute("x1", String(x));
              item.leader.setAttribute("y1", String(y));
              item.leader.setAttribute("x2", String(lx));
              item.leader.setAttribute("y2", String(ly));
            }
          }
        }
      }
      renderer.render(scene, camera);
      if (now - tick > 100) {
        tick = now;
        const metersPerPixel =
          ((2 * distance * Math.tan((camera.fov * Math.PI) / 360)) / height) *
          frameMeters(WORLD_NODES[current]);
        const visibleIds = active.items.map((i) => i.node.id);
        canvas.dataset.selected = current;
        canvas.dataset.selectedAnchors = JSON.stringify(
          selectedAnchorEntries(),
        );
        if (diagnosticsEnabled && now - lastPickDiagnostics > 750) {
          lastPickDiagnostics = now;
          updatePickDiagnostics();
        }
        canvas.dataset.transitioning = String(Boolean(flight));
        canvas.dataset.visibleIds = JSON.stringify(visibleIds);
        canvas.dataset.unitMeters = String(frameMeters(WORLD_NODES[current]));
        canvas.dataset.metersPerPixel = String(metersPerPixel);
        canvas.dataset.cameraDistance = String(distance);
        canvas.dataset.departure = ghosts.map((f) => f.id).join(",");
        canvas.dataset.drawCalls = String(renderer.info.render.calls);
        canvas.dataset.geometryCount = String(renderer.info.memory.geometries);
        canvas.dataset.replicaCount = String(
          active.items[0].model.group.userData.replicaCount || 0,
        );
        canvas.dataset.childRatios = JSON.stringify(
          Object.fromEntries(
            active.items
              .slice(1)
              .map((i) => [i.node.id, i.model.group.scale.x]),
          ),
        );
        latest.current.onInfo({
          metersPerPixel,
          transitioning: Boolean(flight),
          visibleIds,
        });
      }
    }
    raf = requestAnimationFrame(animate);
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
      uiObserver.disconnect();
      controls.dispose();
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", cancelPointer);
      canvas.removeEventListener("wheel", wheel);
      canvas.removeEventListener("keydown", keyDown);
      pressedPointers.clear();
      pinchPointers.clear();
      touches.clear();
      active.dispose();
      ghosts.forEach((f) => f.dispose());
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
      labels.remove();
      api.current = undefined;
    };
  }, []);
  useEffect(() => {
    api.current?.navigate(props.selectedId);
  }, [props.selectedId]);
  useEffect(() => {
    api.current?.reset();
  }, [props.resetToken]);
  useEffect(() => {
    api.current?.language();
  }, [locale]);
  return (
    <div className="world-scene" ref={host}>
      <div className="world-webgl-error">
        {t(
          "Your browser could not start the 3D view. You can still explore every topic using the navigation and reading panels.",
        )}
      </div>
    </div>
  );
}
