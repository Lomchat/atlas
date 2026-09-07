import * as T from "three";
import { macroModel } from "./MacroModel";
import { molecules, elements } from "./data";
import {
  metersPerUnit,
  physicalRadius,
  protonRadiusMeters,
} from "./physicalScale";
import type { MoleculeId } from "./data";
import type { MatterNode } from "./continuum";

export function comparisonModel(
  kind: string,
  molecule: MoleculeId,
  node?: MatterNode,
) {
  const group = new T.Group();
  const geometries = new Set<T.BufferGeometry>();
  const materials = new Set<T.Material>();
  let externalDispose = () => {};
  let updateLanguage = () => {};
  const mat = (color: string, extra = {}) => {
    const m = new T.MeshPhysicalMaterial({
      color,
      roughness: 0.3,
      metalness: 0.12,
      clearcoat: 0.8,
      ...extra,
    });
    materials.add(m);
    return m;
  };
  const add = (
    geo: T.BufferGeometry,
    material: T.Material,
    parent: T.Object3D = group,
  ) => {
    geometries.add(geo);
    const mesh = new T.Mesh(geo, material);
    parent.add(mesh);
    return mesh;
  };
  const sphere = new T.SphereGeometry(1, 28, 20);
  geometries.add(sphere);
  const ball = (
    x: number,
    y: number,
    z: number,
    r: number,
    material: T.Material,
  ) => {
    const m = add(sphere, material);
    m.position.set(x, y, z);
    m.scale.setScalar(r);
    return m;
  };
  const rod = (a: T.Vector3, b: T.Vector3, r: number, material: T.Material) => {
    const m = add(new T.CylinderGeometry(r, r, a.distanceTo(b), 10), material);
    m.position.copy(a).add(b).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(
      new T.Vector3(0, 1, 0),
      b.clone().sub(a).normalize(),
    );
    return m;
  };
  let dimension = 1;
  if (kind === "sample") {
    const model = macroModel(molecule);
    model.fade(1);
    group.add(model.group);
    externalDispose = model.dispose;
    updateLanguage = model.updateLanguage;
    const box = new T.Box3().setFromObject(model.group),
      size = box.getSize(new T.Vector3()),
      center = box.getCenter(new T.Vector3());
    dimension = size.y * 0.04;
    model.group.position.sub(center);
    group.scale.setScalar(1 / size.y);
  } else if (kind === "molecule") {
    const m = molecules[molecule];
    m.atoms.forEach((a, i) => {
      const n = {
        ...node!,
        kind: "atom" as const,
        element: a.element,
        atom: i,
      };
      ball(
        ...a.pos,
        physicalRadius(n, molecule),
        mat(elements[a.element].color),
      );
    });
    m.bonds.forEach(([a, b, order]) => {
      for (let j = 0; j < order; j++) {
        const offset = new T.Vector3(0, 0, (j - (order - 1) / 2) * 0.24);
        rod(
          new T.Vector3(...m.atoms[a].pos).add(offset),
          new T.Vector3(...m.atoms[b].pos).add(offset),
          0.07,
          mat("#9eafc7"),
        );
      }
    });
    const box = new T.Box3().setFromObject(group),
      size = box.getSize(new T.Vector3()),
      center = box.getCenter(new T.Vector3());
    const max = Math.max(size.x, size.y, size.z);
    dimension = max * metersPerUnit(molecule);
    group.children.forEach((c) => c.position.sub(center));
    group.scale.setScalar(1 / max);
  } else if (kind === "rice") {
    const rice = ball(0, 0, 0, 0.5, mat("#f3dfb0", { roughness: 0.48 }));
    rice.scale.set(0.5, 0.15, 0.13);
    rice.rotation.z = -0.18;
    const groove = mat("#c5a775");
    const curve = new T.CatmullRomCurve3([
      new T.Vector3(-0.4, 0.01, 0.1),
      new T.Vector3(0, 0.045, 0.13),
      new T.Vector3(0.4, 0.01, 0.1),
    ]);
    add(new T.TubeGeometry(curve, 24, 0.007, 6, false), groove);
  } else if (kind === "hair") {
    const curve = new T.CatmullRomCurve3([
      new T.Vector3(-0.1, -0.85, 0),
      new T.Vector3(0, 0, 0.05),
      new T.Vector3(0.12, 0.85, 0),
    ]);
    add(
      new T.TubeGeometry(curve, 36, 0.5, 32, false),
      mat("#785038", { roughness: 0.48 }),
    );
    // Cuticle scales give the fiber a readable surface; width is the measured axis.
    const cuticle = mat("#b58b5f", { roughness: 0.55 });
    for (let i = 0; i < 11; i++) {
      const ring = add(new T.TorusGeometry(0.501, 0.009, 5, 40), cuticle);
      ring.rotation.x = Math.PI / 2;
      ring.position.copy(curve.getPoint(i / 10));
    }
    group.rotation.set(0.1, 0, -0.3);
  } else if (kind === "dna") {
    const strandA = mat("#67c4db"),
      strandB = mat("#e4a18b");
    const bases = [mat("#dcbf78"), mat("#8f99d6")];
    const strands = [[], []] as T.Vector3[][];
    for (let i = 0; i <= 64; i++) {
      const u = i / 64,
        angle = u * Math.PI * 5;
      for (let s = 0; s < 2; s++)
        strands[s].push(
          new T.Vector3(
            Math.cos(angle + s * Math.PI) * 0.43,
            (u - 0.5) * 1.8,
            Math.sin(angle + s * Math.PI) * 0.43,
          ),
        );
    }
    strands.forEach((points, i) =>
      add(
        new T.TubeGeometry(new T.CatmullRomCurve3(points), 96, 0.07, 10, false),
        i ? strandB : strandA,
      ),
    );
    for (let i = 0; i <= 64; i += 4)
      rod(strands[0][i], strands[1][i], 0.025, bases[(i / 4) % 2]);
    group.rotation.z = 0.16;
  } else if (kind === "ruler") {
    add(new T.BoxGeometry(1, 0.22, 0.035), mat("#c7aa74"));
    const ink = mat("#554731");
    for (let i = 0; i <= 20; i++) {
      const mark = add(
        new T.BoxGeometry(0.004, i % 5 === 0 ? 0.11 : 0.055, 0.003),
        ink,
      );
      mark.position.set(
        -0.48 + i * 0.048,
        0.105 - (i % 5 === 0 ? 0.055 : 0.0275),
        0.02,
      );
    }
    group.rotation.set(-0.28, 0.1, -0.08);
  } else if (kind === "nucleus") {
    const count = node
      ? elements[node.element].z + elements[node.element].n
      : 12;
    const a = mat("#d99680"),
      b = mat("#92abc5");
    if (count === 1) ball(0, 0, 0, 0.5, a);
    else
      for (let i = 0; i < count; i++) {
        const beadRadius =
          protonRadiusMeters / (2 * 1.2e-15 * Math.cbrt(count));
        const shellRadius = 0.5 - beadRadius;
        const y = 1 - (2 * (i + 0.5)) / count,
          r = Math.sqrt(1 - y * y),
          theta = i * 2.39996;
        ball(
          Math.cos(theta) * r * shellRadius,
          y * shellRadius,
          Math.sin(theta) * r * shellRadius,
          beadRadius,
          i % 2 ? a : b,
        );
      }
  } else if (kind === "viewport") {
    const pane = add(
      new T.BoxGeometry(1, 0.63, 0.015),
      mat("#72aecb", { transparent: true, opacity: 0.13, depthWrite: false }),
    );
    const edge = new T.EdgesGeometry(pane.geometry);
    geometries.add(edge);
    const m = new T.LineBasicMaterial({ color: "#9dc8e0" });
    materials.add(m);
    group.add(new T.LineSegments(edge, m));
    const cross = mat("#9dc8e0");
    rod(
      new T.Vector3(-0.06, 0, 0.015),
      new T.Vector3(0.06, 0, 0.015),
      0.003,
      cross,
    );
    rod(
      new T.Vector3(0, -0.06, 0.015),
      new T.Vector3(0, 0.06, 0.015),
      0.003,
      cross,
    );
  } else {
    const atom = kind === "atom";
    ball(
      0,
      0,
      0,
      0.5,
      mat(
        atom
          ? elements[node?.element || "C"].color
          : kind === "neutron"
            ? "#779fc7"
            : "#d99077",
        {
          transparent: atom,
          opacity: atom ? 0.48 : 1,
          depthWrite: !atom,
        },
      ),
    );
    if (atom) {
      const ringMat = mat("#bddbec", { transparent: true, opacity: 0.6 });
      for (let i = 0; i < 3; i++) {
        const ring = add(new T.TorusGeometry(0.45, 0.006, 5, 64), ringMat);
        ring.rotation.set(i * 0.85, i * 0.6, 0.3);
      }
    }
  }
  if (node && ["atom", "nucleus", "proton", "neutron"].includes(kind))
    dimension = 2 * physicalRadius(node, molecule) * metersPerUnit(molecule);
  const nativeScale = group.scale.x;
  return {
    group,
    dimension,
    nativeScale,
    updateLanguage: () => updateLanguage(),
    dispose() {
      externalDispose();
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
    },
  };
}
