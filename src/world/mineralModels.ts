import * as T from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type { WorldModel } from "./models";

type Point = [number, number, number];
type Element = "Si" | "O";
export type QuartzAtom = {
  element: Element;
  position: Point;
  boundary: boolean;
};
export type QuartzNetwork = {
  atoms: QuartzAtom[];
  bonds: [number, number][];
  tetrahedra: { silicon: number; oxygen: number[] }[];
};

/** Kihara (1990), as tabulated by Sutter et al. (2022), Tables 2–4.
 * https://journals.iucr.org/j/issues/2022/04/00/te5094/
 * Dextro alpha-quartz, z(+) setting, P3₂21, right-handed hexagonal axes.
 * These are mean atom centres at 298 K; drawn radii are teaching markers.
 */
export const QUARTZ_CELL = {
  aAngstrom: 4.9137,
  cAngstrom: 5.4047,
  temperatureK: 298,
  spaceGroup: "P3₂21",
  source: "https://doi.org/10.1107/S1600576722005945",
} as const;
const u = 0.4697,
  x = 0.4133,
  y = 0.2672,
  z = 0.1188;
export const QUARTZ_BASIS: { element: Element; fractional: Point }[] = [
  { element: "Si", fractional: [u, 0, 0] },
  { element: "Si", fractional: [0, u, 2 / 3] },
  { element: "Si", fractional: [-u, -u, 1 / 3] },
  { element: "O", fractional: [x, y, z] },
  { element: "O", fractional: [-y, x - y, z + 2 / 3] },
  { element: "O", fractional: [y - x, -x, z + 1 / 3] },
  { element: "O", fractional: [x - y, -y, -z] },
  { element: "O", fractional: [-x, y - x, -z + 1 / 3] },
  { element: "O", fractional: [y, x, -z + 2 / 3] },
];

/** Cartesian Angstrom coordinates. The final rotation (X,Z,-Y) puts c upward
 * without reflecting the crystal or changing its handedness. */
export function quartzCartesian([a, b, c]: Point): Point {
  return [
    QUARTZ_CELL.aAngstrom * (a - b * 0.5),
    QUARTZ_CELL.cAngstrom * c,
    -QUARTZ_CELL.aAngstrom * Math.sqrt(3) * 0.5 * b,
  ];
}

/** Select complete SiO4 tetrahedra from a periodic crystal, then deduplicate
 * their shared oxygen atoms. Boundary oxygen atoms have a missing neighbour
 * outside this excerpt: they are NOT terminal oxygens of a SiO2 molecule. */
export function createQuartzNetworkData(): QuartzNetwork {
  const all: QuartzAtom[] = [];
  for (let a = -3; a <= 3; a++)
    for (let b = -3; b <= 3; b++)
      for (let c = -3; c <= 3; c++)
        for (const atom of QUARTZ_BASIS) {
          const f = atom.fractional.map((v, i) => v + [a, b, c][i]) as Point;
          all.push({
            element: atom.element,
            position: quartzCartesian(f),
            boundary: false,
          });
        }
  const silicon = all.filter(
    (atom) =>
      atom.element === "Si" &&
      (atom.position[0] / 7.6) ** 2 +
        (atom.position[1] / 7.9) ** 2 +
        (atom.position[2] / 6.4) ** 2 <
        1,
  );
  const oxygen = all.filter((atom) => atom.element === "O");
  const atoms: QuartzAtom[] = [];
  const indices = new Map<QuartzAtom, number>();
  const include = (atom: QuartzAtom) => {
    let index = indices.get(atom);
    if (index === undefined) {
      index = atoms.length;
      atoms.push(atom);
      indices.set(atom, index);
    }
    return index;
  };
  const bonds: [number, number][] = [];
  const tetrahedra: QuartzNetwork["tetrahedra"] = [];
  for (const atom of silicon) {
    const si = include(atom);
    const neighbours = oxygen.filter(
      (o) =>
        Math.hypot(...o.position.map((v, i) => v - atom.position[i])) < 1.8,
    );
    const ids = neighbours.map(include);
    for (const o of ids) bonds.push([si, o]);
    tetrahedra.push({ silicon: si, oxygen: ids });
  }
  const degree = atoms.map(() => 0);
  for (const [a, b] of bonds) {
    degree[a]++;
    degree[b]++;
  }
  atoms.forEach((atom, i) => {
    atom.boundary = atom.element === "O" && degree[i] < 2;
  });
  return { atoms, bonds, tetrahedra };
}

/** Dedicated resource owner: early factory dispatch never allocates the generic
 * model resources. All InstancedMesh instance buffers are disposed as well. */
function builder(kind: string) {
  const group = new T.Group();
  group.name = `world-model:${kind}`;
  const content = new T.Group();
  group.add(content);
  const geometries = new Set<T.BufferGeometry>();
  const materials = new Set<T.Material>();
  const instances: T.InstancedMesh[] = [];
  const ownGeometry = <G extends T.BufferGeometry>(geometry: G): G => {
    geometries.add(geometry);
    return geometry;
  };
  const ownMaterial = <M extends T.Material>(material: M): M => {
    materials.add(material);
    return material;
  };
  const mesh = (
    geometry: T.BufferGeometry,
    material: T.Material,
    parent: T.Object3D = content,
  ) => {
    const object = new T.Mesh(ownGeometry(geometry), ownMaterial(material));
    object.castShadow = object.receiveShadow = true;
    parent.add(object);
    return object;
  };
  const instanced = (
    geometry: T.BufferGeometry,
    material: T.Material,
    count: number,
  ) => {
    const object = new T.InstancedMesh(
      ownGeometry(geometry),
      ownMaterial(material),
      count,
    );
    object.castShadow = object.receiveShadow = true;
    content.add(object);
    instances.push(object);
    return object;
  };
  const finish = (): WorldModel => {
    // Batch within semantic parents: residue groups stay separate pick targets.
    // Tagged meshes and instances remain intact, preserving element identity.
    const parents: T.Object3D[] = [];
    content.traverse((object) => {
      if (object.children.length) parents.push(object);
    });
    for (const parent of parents) {
      const buckets = new Map<T.Material, T.Mesh[]>();
      for (const child of parent.children) {
        if (
          !(child instanceof T.Mesh) ||
          child instanceof T.InstancedMesh ||
          child.userData.worldChildModel ||
          Array.isArray(child.material)
        )
          continue;
        const bucket = buckets.get(child.material) || [];
        bucket.push(child);
        buckets.set(child.material, bucket);
      }
      for (const [material, meshes] of buckets) {
        if (meshes.length < 2) continue;
        const transformed = meshes.map((object) => {
          object.updateMatrix();
          return object.geometry.clone().applyMatrix4(object.matrix);
        });
        const merged = mergeGeometries(transformed, false);
        transformed.forEach((geometry) => geometry.dispose());
        if (!merged) continue;
        meshes.forEach((object) => parent.remove(object));
        mesh(merged, material, parent);
      }
    }
    group.updateMatrixWorld(true);
    const bounds = new T.Box3().setFromObject(group);
    const size = bounds.getSize(new T.Vector3());
    const longest = Math.max(size.x, size.y, size.z);
    content.position.sub(bounds.getCenter(new T.Vector3()));
    // Factory contract: outer group stays transform-free for parent SI scaling.
    content.position.multiplyScalar(1 / longest);
    content.scale.setScalar(1 / longest);
    group.userData.nativeExtent = longest;
    group.updateMatrixWorld(true);
    let disposed = false;
    return {
      group,
      update: () => {},
      dispose: () => {
        if (disposed) return;
        disposed = true;
        instances.forEach((object) => object.dispose());
        geometries.forEach((geometry) => geometry.dispose());
        materials.forEach((material) => material.dispose());
        group.clear();
      },
    };
  };
  return { group, content, mesh, instanced, ownGeometry, ownMaterial, finish };
}

/** Macroscopic quartz habit: six prism faces and alternating termination faces.
 * Shape, faint growth striae and inclusions are illustrative, not a scan.
 * https://www.handbookofmineralogy.org/pdfs/quartz.pdf
 */
export function createQuartzGrain(seed = 1): WorldModel {
  const b = builder("quartz");
  b.content.userData.worldSampleChildModel = "crystalLattice";
  b.content.userData.worldMaterialRegion = "quartz";
  let state = seed | 0 || 1;
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) | 0;
    return (state >>> 0) / 4294967296;
  };
  const base: Point[] = [],
    shoulder: Point[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3 + Math.PI / 6;
    const radius = 0.27 * (1 + ((i % 3) - 1) * 0.035);
    base.push([
      Math.cos(angle) * radius,
      -0.46 + random() * 0.045,
      Math.sin(angle) * radius,
    ]);
    shoulder.push([
      Math.cos(angle) * radius,
      0.17 + (i % 2) * 0.037,
      Math.sin(angle) * radius,
    ]);
  }
  const tip: Point = [0.014, 0.54, -0.008];
  const positions: number[] = [],
    colors: number[] = [];
  const tint = new T.Color();
  const face = (points: Point[], color: string) => {
    tint.set(color);
    for (let i = 1; i < points.length - 1; i++)
      for (const p of [points[0], points[i], points[i + 1]]) {
        positions.push(...p);
        colors.push(tint.r, tint.g, tint.b);
      }
  };
  const sideColors = [
    "#d1dae2",
    "#9cabbc",
    "#c8c9db",
    "#e1e7ed",
    "#bbcbd8",
    "#aeb2c9",
  ];
  for (let i = 0; i < 6; i++) {
    const j = (i + 1) % 6;
    face([base[i], shoulder[i], shoulder[j], base[j]], sideColors[i]);
    face([shoulder[i], tip, shoulder[j]], i % 2 ? "#f0eaf5" : "#bfcadd");
  }
  face(base, "#9fa6b5");
  const crystal = new T.BufferGeometry();
  crystal.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
  crystal.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
  crystal.computeVertexNormals();
  b.mesh(
    crystal,
    new T.MeshPhysicalMaterial({
      vertexColors: true,
      roughness: 0.17,
      metalness: 0,
      clearcoat: 1,
      clearcoatRoughness: 0.13,
      ior: 1.54,
      transparent: true,
      opacity: 0.91,
      depthWrite: true,
      side: T.DoubleSide,
    }),
  );
  const edges = new T.LineSegments(
    b.ownGeometry(new T.EdgesGeometry(crystal, 24)),
    b.ownMaterial(
      new T.LineBasicMaterial({
        color: "#e7eff9",
        transparent: true,
        opacity: 0.32,
      }),
    ),
  );
  b.content.add(edges);
  const striae: number[] = [];
  for (let i = 0; i < 6; i++)
    for (let row = 0; row < 16; row++) {
      const height = -0.37 + row * 0.031 + random() * 0.007;
      const start = new T.Vector3(...base[i]).lerp(
        new T.Vector3(...base[(i + 1) % 6]),
        0.12 + random() * 0.07,
      );
      const end = new T.Vector3(...base[i]).lerp(
        new T.Vector3(...base[(i + 1) % 6]),
        0.73 + random() * 0.12,
      );
      start.y = end.y = height;
      start.x *= 1.002;
      start.z *= 1.002;
      end.x *= 1.002;
      end.z *= 1.002;
      striae.push(...start.toArray(), ...end.toArray());
    }
  const striaeGeometry = b.ownGeometry(new T.BufferGeometry());
  striaeGeometry.setAttribute(
    "position",
    new T.Float32BufferAttribute(striae, 3),
  );
  b.content.add(
    new T.LineSegments(
      striaeGeometry,
      b.ownMaterial(
        new T.LineBasicMaterial({
          color: "#f1f3f7",
          transparent: true,
          opacity: 0.16,
        }),
      ),
    ),
  );
  const fractureMaterial = new T.MeshBasicMaterial({
    color: "#e9eff8",
    transparent: true,
    opacity: 0.16,
    depthWrite: false,
    side: T.DoubleSide,
  });
  for (let i = 0; i < 6; i++) {
    const plane = b.mesh(
      new T.CircleGeometry(0.075 + random() * 0.045, 5),
      fractureMaterial,
    );
    plane.position.set(
      (random() - 0.5) * 0.14,
      -0.28 + random() * 0.5,
      (random() - 0.5) * 0.14,
    );
    plane.rotation.set(random(), random(), random() * 3);
  }
  b.group.userData.representation = "crystal-habit";
  return b.finish();
}

export function createQuartzNetwork(
  kind: "crystalLattice" | "glassNetwork" = "crystalLattice",
): WorldModel {
  const b = builder(kind);
  const network = createQuartzNetworkData();
  if (kind === "glassNetwork") {
    // Local Si–O connectivity guide only: smoothly distort the finite scaffold
    // to distinguish disorder. This is not a measured amorphous coordinate set.
    for (const atom of network.atoms) {
      const [x, y, z] = atom.position;
      atom.position = [
        x + 0.5 * Math.sin(y * 0.7 + z * 0.3),
        y + 0.45 * Math.sin(z * 0.8 + x * 0.4),
        z + 0.45 * Math.sin(x * 0.7 - y * 0.3),
      ];
    }
  }
  const sphere = new T.SphereGeometry(1, 20, 14);
  const transform = new T.Object3D();
  const atomColors = { Si: "#baa9e8", O: "#ef7b80" };
  // Small opaque markers keep the tetrahedral bonds legible; marker radii are
  // not electron-cloud radii. Coordinates retain the measured Angstrom metric.
  for (const element of ["Si", "O"] as const) {
    const atoms = network.atoms.filter((atom) => atom.element === element);
    const object = b.instanced(
      sphere,
      new T.MeshStandardMaterial({
        color: atomColors[element],
        roughness: 0.31,
        metalness: 0.04,
      }),
      atoms.length,
    );
    object.userData.worldChildModel = "atom";
    object.userData.worldChildAtomicNumber = element === "Si" ? 14 : 8;
    object.userData.worldElement = element;
    atoms.forEach((atom, i) => {
      transform.position.set(...atom.position);
      transform.scale.setScalar(element === "Si" ? 0.43 : 0.34);
      transform.updateMatrix();
      object.setMatrixAt(i, transform.matrix);
    });
    object.computeBoundingBox();
    object.computeBoundingSphere();
  }
  const bonds = b.instanced(
    new T.CylinderGeometry(0.1, 0.1, 1, 8),
    new T.MeshStandardMaterial({ color: "#c5bed5", roughness: 0.48 }),
    network.bonds.length,
  );
  const up = new T.Vector3(0, 1, 0);
  network.bonds.forEach(([i, j], index) => {
    const a = new T.Vector3(...network.atoms[i].position),
      c = new T.Vector3(...network.atoms[j].position);
    transform.position.copy(a).lerp(c, 0.5);
    transform.quaternion.setFromUnitVectors(up, c.clone().sub(a).normalize());
    transform.scale.set(1, a.distanceTo(c), 1);
    transform.updateMatrix();
    bonds.setMatrixAt(index, transform.matrix);
  });
  bonds.computeBoundingBox();
  bonds.computeBoundingSphere();
  // A few transparent polyhedra explain coordination without closing every
  // cavity. Faces are geometric guides, not extra physical matter.
  const faces: number[] = [];
  const selected = [...network.tetrahedra]
    .sort(
      (a, c) =>
        Math.hypot(...network.atoms[a.silicon].position) -
        Math.hypot(...network.atoms[c.silicon].position),
    )
    .slice(0, 7);
  for (const tetra of selected) {
    const vertices = tetra.oxygen.map((i) => network.atoms[i].position);
    for (const face of [
      [0, 1, 2],
      [0, 3, 1],
      [0, 2, 3],
      [1, 3, 2],
    ])
      for (const i of face) faces.push(...vertices[i]);
  }
  const tetrahedra = new T.BufferGeometry();
  tetrahedra.setAttribute("position", new T.Float32BufferAttribute(faces, 3));
  tetrahedra.computeVertexNormals();
  b.mesh(
    tetrahedra,
    new T.MeshBasicMaterial({
      color: "#bdaae9",
      transparent: true,
      opacity: 0.1,
      depthWrite: false,
      side: T.DoubleSide,
    }),
  );
  b.group.userData.networkDiagram = true;
  b.group.userData.representation =
    kind === "glassNetwork"
      ? "disordered-connectivity-diagram"
      : "crystallographic-network";
  if (kind === "crystalLattice")
    b.group.userData.crystallography = { ...QUARTZ_CELL, ...network };
  const result = b.finish();
  b.group.userData.physicalExtentMeters = b.group.userData.nativeExtent * 1e-10;
  return result;
}

/** Microfibril: parallel chains as continuous ribbons at this scale. The 18
 * strands are one illustrative packing, not a universal cellulose chain count.
 * Width/length approximately 3 nm / 30 nm. The illustrative 2/3/4/4/3/2
 * packing follows a proposed spruce model, not a universal measured count:
 * https://www.nature.com/articles/s41467-019-12979-9
 * Other wood measurements support different counts, including 24:
 * https://www.nature.com/articles/s41477-023-01430-z */
export function createCelluloseMicrofibril(): WorldModel {
  const b = builder("celluloseMicrofibril");
  const hues = ["#d8c192", "#c1af80", "#a5bd91", "#e5cda0"];
  const centres: [number, number][] = [];
  for (let row = 0; row < 6; row++) {
    const count = [2, 3, 4, 4, 3, 2][row];
    for (let column = 0; column < count; column++)
      centres.push([(column - (count - 1) / 2) * 0.017, (row - 2.5) * 0.015]);
  }
  centres.forEach(([x, z], i) => {
    const points: T.Vector3[] = [];
    for (let j = 0; j <= 30; j++) {
      const t = j / 30,
        twist = (t - 0.5) * 0.32;
      points.push(
        new T.Vector3(
          x * Math.cos(twist) - z * Math.sin(twist),
          t - 0.5,
          x * Math.sin(twist) + z * Math.cos(twist),
        ),
      );
    }
    const strand = b.mesh(
      new T.TubeGeometry(new T.CatmullRomCurve3(points), 40, 0.0072, 7, false),
      new T.MeshStandardMaterial({
        color: hues[i % hues.length],
        roughness: 0.48,
      }),
    );
    // Semantic mesh origin belongs to this strand, not the bundle centre.
    strand.geometry.translate(-x, 0, -z);
    strand.position.set(x, 0, z);
    strand.userData.worldChildModel = "cellulose";
  });
  b.group.userData.representation = "parallel-chain-bundle";
  return b.finish();
}

/** A single beta(1→4) linked chain, with alternating residue orientation.
 * Ring outlines and linking oxygens are a topology diagram; side groups are
 * omitted here and become visible in the dedicated glucose-residue layer. */
export function createCelluloseChain(): WorldModel {
  const b = builder("cellulose");
  const count = 15,
    step = 0.0645;
  const sphere = new T.SphereGeometry(1, 12, 8);
  const carbon = new T.MeshStandardMaterial({
    color: "#d9c39c",
    roughness: 0.47,
  });
  const oxygen = new T.MeshStandardMaterial({
    color: "#d87677",
    roughness: 0.4,
  });
  const bond = new T.MeshStandardMaterial({
    color: "#b8ac91",
    roughness: 0.55,
  });
  const ringPositions: Point[][] = [];
  const connect = (
    a: Point,
    c: Point,
    radius: number,
    material: T.Material,
    parent: T.Object3D,
  ) => {
    const p = new T.Vector3(...a),
      q = new T.Vector3(...c);
    const cylinder = b.mesh(
      new T.CylinderGeometry(radius, radius, p.distanceTo(q), 7),
      material,
      parent,
    );
    cylinder.position.copy(p).lerp(q, 0.5);
    cylinder.quaternion.setFromUnitVectors(
      new T.Vector3(0, 1, 0),
      q.sub(p).normalize(),
    );
  };
  for (let residue = 0; residue < count; residue++) {
    const group = new T.Group();
    b.content.add(group);
    group.userData.worldChildModel = "glucoseResidue";
    const cy = (residue - (count - 1) / 2) * step;
    group.position.y = cy;
    const sign = residue % 2 ? -1 : 1;
    const vertices: Point[] = [];
    // Ring viewed obliquely: the chair puckering is schematic, not atom data.
    for (let j = 0; j < 6; j++) {
      const a = (j * Math.PI) / 3;
      const p: Point = [
        Math.sin(a) * 0.026 * sign,
        Math.cos(a) * 0.024,
        (j % 2 ? 1 : -1) * 0.007 * sign,
      ];
      vertices.push(p);
      const atom = b.mesh(sphere, j === 2 ? oxygen : carbon, group);
      atom.position.set(...p);
      atom.scale.setScalar(0.006);
    }
    for (let j = 0; j < 6; j++)
      connect(vertices[j], vertices[(j + 1) % 6], 0.0028, bond, group);
    ringPositions.push(vertices.map((p) => [p[0], p[1] + cy, p[2]]));
  }
  for (let i = 0; i < count - 1; i++) {
    const a = ringPositions[i][0],
      c = ringPositions[i + 1][3];
    const p = new T.Vector3(...a).lerp(new T.Vector3(...c), 0.5);
    p.x += (i % 2 ? -1 : 1) * 0.008;
    const link = b.mesh(sphere, oxygen);
    link.position.copy(p);
    link.scale.setScalar(0.0045);
    connect(a, p.toArray(), 0.0027, bond, b.content);
    connect(p.toArray(), c, 0.0027, bond, b.content);
  }
  b.group.userData.representation = "single-polymer-chain";
  return b.finish();
}
