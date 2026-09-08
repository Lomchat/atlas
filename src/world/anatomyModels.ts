import * as T from "three";
import type { WorldNode } from "./data";
import { createWorldModel } from "./models";
import type { WorldModel } from "./models";
import metadata from "../../public/models/bodyparts3d/manifest.json";

export type AnatomyMode = "organs" | "skeleton" | "muscles" | "surface";
export type AnatomyStatus = "loading" | "ready" | "error";
type Point = [number, number, number];
type Asset = {
  file: string;
  center: Point;
  extent: number;
  system: string;
  sha256: string;
  version?: string;
};
const assets = metadata.assets as unknown as Record<string, Asset>;
export const anatomyVersions = [
  ...new Set(Object.values(assets).map((asset) => asset.version || "4.0")),
].sort();
const routes: Record<string, string> = {
  "human/heart": "heart",
  "human/lungs": "lungs",
  "human/brain": "brain",
  "human/vein": "vein",
  "human/muscle": "muscle",
  "human/liver": "liver",
  "human/kidneys": "kidneys",
  "human/stomach": "stomach",
  "human/intestines": "intestines",
  "human/femur": "femur",
};
const colors: Record<string, string> = {
  skin: "#cfa385",
  heart: "#b84e60",
  lungs: "#db8f9c",
  brain: "#c5a3b5",
  vein: "#657fc4",
  muscle: "#b96462",
  liver: "#9a5058",
  kidneys: "#b56265",
  stomach: "#d99b8c",
  intestines: "#c795ad",
  femur: "#e6d9be",
  "context-skeleton": "#dcd0b7",
  "context-muscles": "#ae6967",
  "context-vessels": "#7189c4",
};
const pending = new Map<string, Promise<ArrayBuffer>>();
function anatomyKeyForModel(kind: string): string | undefined {
  switch (kind) {
    case "anatomyLiver":
      return "liver";
    case "anatomyKidneys":
      return "kidneys";
    case "anatomyStomach":
      return "stomach";
    case "anatomyIntestines":
      return "intestines";
    case "anatomyFemur":
      return "femur";
  }
}

function bytes(key: string): Promise<ArrayBuffer> {
  if (!pending.has(key)) {
    const asset = assets[key];
    const promise = fetch(
      `/models/bodyparts3d/${asset.file}?v=${asset.sha256.slice(0, 12)}`,
    ).then((response) => {
      if (!response.ok) throw new Error(`BodyParts3D ${response.status}`);
      return response.arrayBuffer();
    });
    pending.set(key, promise);
    void promise.catch(() => pending.delete(key));
  }
  return pending.get(key)!;
}

export function anatomyVisible(id: string, mode: AnatomyMode): boolean {
  if (id === "human/skin") return mode === "surface";
  const key = routes[id];
  if (!key) return true;
  if (mode === "surface") return false;
  if (mode === "skeleton") return key === "femur";
  if (mode === "muscles") return key === "muscle";
  return !["femur", "muscle"].includes(key);
}

export function anatomyModeFor(id: string): AnatomyMode {
  if (id === "human/skin") return "surface";
  if (id === "human/femur") return "skeleton";
  if (id === "human/muscle") return "muscles";
  return "organs";
}

/** Assets keep one source coordinate frame. Isolating an organ changes only
 * its local origin; the atlas applies its source-derived SI extent. */
function anatomyModel(
  key: string,
  body: boolean,
  initialMode: AnatomyMode = "surface",
): WorldModel {
  const group = new T.Group();
  const version = body
    ? anatomyVersions.join(" + ")
    : assets[key].version || "4.0";
  group.name = `BodyParts3D:${version}:${key}`;
  group.userData.anatomyStatus = "loading";
  group.userData.anatomyRevision = 0;
  group.userData.modelKind = body ? "human" : key;
  group.userData.anatomySource = `BodyParts3D ${version}`;
  group.userData.normalizedExtent = 1;
  let disposed = false;
  let mode: AnatomyMode = initialMode;
  let hovered: string | undefined;
  const holders = new Map<string, T.Group>();
  const loaded = new Set<string>();
  const failed = new Set<string>();
  const loading = new Map<string, Promise<void>>();
  const owned: T.Object3D[] = [];
  const disposeObject = (root: T.Object3D) => {
    const geometries = new Set<T.BufferGeometry>();
    const materials = new Set<T.Material>();
    root.traverse((object) => {
      if (object instanceof T.Mesh) {
        geometries.add(object.geometry);
        (Array.isArray(object.material)
          ? object.material
          : [object.material]
        ).forEach((m) => materials.add(m));
      }
    });
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
    root.clear();
  };
  const keys = body ? Object.keys(assets) : [key];
  const required = () =>
    body
      ? keys.filter((assetKey) => {
          const system = assets[assetKey].system;
          return (
            assetKey === "skin" ||
            (mode === "organs" && ["organs", "vessels"].includes(system)) ||
            (mode === "skeleton" && system === "skeleton") ||
            (mode === "muscles" && ["muscles", "skeleton"].includes(system))
          );
        })
      : [key];
  const status = () => {
    if (disposed) return;
    const needed = required();
    group.userData.anatomyStatus = needed.some((part) => failed.has(part))
      ? "error"
      : needed.every((part) => loaded.has(part))
        ? "ready"
        : "loading";
  };
  if (body) {
    group.userData.childNodeAnchors = Object.fromEntries(
      Object.entries(routes).map(([id, assetKey]) => [
        id,
        assets[assetKey].center,
      ]),
    );
    // A skin section samples the clicked surface; this is the initial locator.
    group.userData.childNodeAnchors["human/skin"] =
      metadata.anchors.skinForearm.bodyPosition;
  }
  if (!body && key === "vein") {
    group.userData.childNodeAnchors = {
      "human/vein/segment": new T.Vector3(
        ...(metadata.anchors.veinSegment.bodyPosition as Point),
      )
        .sub(new T.Vector3(...assets.vein.center))
        .divideScalar(assets.vein.extent)
        .toArray(),
    };
  }
  for (const assetKey of keys) {
    const holder = new T.Group();
    const route = Object.keys(routes).find((id) => routes[id] === assetKey);
    holder.name = `anatomy:${assetKey}`;
    if (body) {
      holder.userData.worldChildId = assetKey === "skin" ? "human/skin" : route;
      if (!holder.userData.worldChildId) holder.userData.worldContext = true;
      holder.userData.worldAnatomyAnchor = assets[assetKey].center;
      holder.userData.worldAnatomySurface = assetKey === "skin";
    }
    holders.set(assetKey, holder);
    group.add(holder);
  }
  const applyMode = () => {
    if (!body) return;
    holders.forEach((holder, assetKey) => {
      const skin = assetKey === "skin";
      const system = assets[assetKey].system;
      holder.visible =
        skin ||
        (mode === "organs" && ["organs", "vessels"].includes(system)) ||
        (mode === "skeleton" && system === "skeleton") ||
        (mode === "muscles" && ["muscles", "skeleton"].includes(system));
      holder.traverse((object) => {
        if (!(object instanceof T.Mesh)) return;
        for (const material of Array.isArray(object.material)
          ? object.material
          : [object.material]) {
          if (skin) {
            material.opacity = mode === "surface" ? 1 : 0.065;
            material.transparent = mode !== "surface";
            material.depthWrite = mode === "surface";
            material.side = mode === "surface" ? T.FrontSide : T.BackSide;
          }
          if (assetKey === "lungs") {
            material.opacity = 0.58;
            material.transparent = true;
            material.depthWrite = false;
            material.side = T.FrontSide;
          }
          if (material instanceof T.MeshStandardMaterial) {
            material.emissive.set(
              holder.userData.worldChildId === hovered ? "#927350" : "#000000",
            );
            material.emissiveIntensity = 0.35;
          }
        }
      });
    });
  };
  group.userData.setAnatomyMode = (next: AnatomyMode) => {
    if (mode === next) return;
    mode = next;
    applyMode();
    void ensureRequired();
  };
  group.userData.setAnatomyHover = (next: string | undefined) => {
    if (hovered === next) return;
    hovered = next;
    applyMode();
  };
  const load = async (assetKey: string) => {
    const [buffer, { GLTFLoader }] = await Promise.all([
      bytes(assetKey),
      import("three/addons/loaders/GLTFLoader.js"),
    ]);
    if (disposed) return;
    const gltf = await new GLTFLoader().parseAsync(buffer, "");
    if (disposed) {
      disposeObject(gltf.scene);
      return;
    }
    const root = gltf.scene;
    const originalMaterials = new Set<T.Material>();
    root.traverse((object) => {
      if (!(object instanceof T.Mesh)) return;
      (Array.isArray(object.material)
        ? object.material
        : [object.material]
      ).forEach((m) => originalMaterials.add(m));
      object.material = new T.MeshStandardMaterial({
        color: colors[assetKey] || "#c39894",
        roughness: 0.52,
        metalness: 0.015,
      });
    });
    originalMaterials.forEach((material) => material.dispose());
    if (!body) {
      root.position.sub(new T.Vector3(...assets[assetKey].center));
      holders.get(assetKey)!.scale.setScalar(1 / assets[assetKey].extent);
    }
    holders.get(assetKey)!.add(root);
    owned.push(root);
    loaded.add(assetKey);
    group.userData.anatomyRevision++;
    applyMode();
    group.updateMatrixWorld(true);
  };
  function ensureRequired(): Promise<void> {
    status();
    return Promise.all(
      required().map((part) => {
        if (!loading.has(part))
          loading.set(
            part,
            load(part)
              .catch(() => {
                failed.add(part);
              })
              .finally(status),
          );
        return loading.get(part)!;
      }),
    ).then(() => {
      status();
    });
  }
  applyMode();
  const ready = ensureRequired();
  return {
    group,
    ready,
    update() {
      // The scene restores opacity before each frame; only the outer skin uses
      // a layer-dependent opacity. Other systems stay opaque and depth-tested.
      holders.get("skin")?.traverse((object) => {
        if (!(object instanceof T.Mesh)) return;
        for (const material of Array.isArray(object.material)
          ? object.material
          : [object.material])
          material.opacity = mode === "surface" ? 1 : 0.065;
      });
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      owned.forEach(disposeObject);
      group.clear();
    },
  };
}

export function createExplorationModel(
  node: Pick<WorldNode, "model"> &
    Partial<Pick<WorldNode, "id" | "color" | "atomic">>,
  seed = 1,
  bodyMode: AnatomyMode = "surface",
): WorldModel {
  if (node.model === "human") return anatomyModel("skin", true, bodyMode);
  if (node.id === "human/vein/segment") return createVeinSection();
  const key = (node.id && routes[node.id]) || anatomyKeyForModel(node.model);
  if (key) return anatomyModel(key, false);
  return createWorldModel(node.model, node.color, seed, node.atomic);
}

/** A 4 cm vessel specimen with a roughly 3 mm lumen, not millimetre-sized
 * erythrocytes. Blood stays a continuous volume until its microscopic sample. */
function createVeinSection(): WorldModel {
  const group = new T.Group();
  const geometries: T.BufferGeometry[] = [];
  const materials: T.Material[] = [];
  const mesh = (
    geometry: T.BufferGeometry,
    color: string,
    transparent = false,
  ) => {
    const material = new T.MeshStandardMaterial({
      color,
      roughness: 0.47,
      side: T.DoubleSide,
      transparent,
      opacity: transparent ? 0.8 : 1,
      depthWrite: !transparent,
    });
    const object = new T.Mesh(geometry, material);
    group.add(object);
    geometries.push(geometry);
    materials.push(material);
    return object;
  };
  mesh(
    new T.CylinderGeometry(0.042, 0.042, 1, 48, 1, true, 0.6, Math.PI * 1.5),
    "#7b86bd",
  );
  mesh(
    new T.CylinderGeometry(
      0.036,
      0.036,
      0.998,
      48,
      1,
      true,
      0.6,
      Math.PI * 1.5,
    ),
    "#bd8299",
  );
  mesh(new T.CylinderGeometry(0.032, 0.032, 0.97, 32), "#922f48", true);
  for (const y of [-0.495, 0.495]) {
    const ring = mesh(
      new T.TorusGeometry(0.039, 0.003, 8, 48, Math.PI * 1.5),
      "#dba5af",
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = y;
  }
  group.userData.childNodeAnchors = { "human/vein/blood": [0, 0, 0.01] };
  group.userData.modelKind = "vein";
  group.userData.normalizedExtent = 1;
  return {
    group,
    update() {},
    dispose() {
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
      group.clear();
    },
  };
}
