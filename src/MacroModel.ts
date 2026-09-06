import * as T from "three";
import { molecules, elements } from "./data";
import type { MoleculeId } from "./data";
import { environments } from "./scales";

/** A local-coordinate model shared by the gallery and the continuous scene. */
export function macroModel(id: MoleculeId, portion = false) {
  const group = new T.Group(),
    materials = new Set<T.Material>(),
    geometries = new Set<T.BufferGeometry>();
  const add = (
    geo: T.BufferGeometry,
    mat: T.Material,
    parent: T.Object3D = group,
  ) => {
    geometries.add(geo);
    materials.add(mat);
    const mesh = new T.Mesh(geo, mat);
    parent.add(mesh);
    return mesh;
  };
  const glass = new T.MeshPhysicalMaterial({
    color: "#c0d3e2",
    metalness: 0.08,
    roughness: 0.12,
    transparent: true,
    opacity: 0.12,
    side: T.DoubleSide,
    depthWrite: false,
  });
  const rim = new T.MeshStandardMaterial({
    color: "#bfd0df",
    metalness: 0.45,
    roughness: 0.21,
    transparent: true,
    opacity: 0.55,
  });
  const water = new T.MeshPhysicalMaterial({
    color: environments[id].color,
    metalness: 0.15,
    roughness: 0.12,
    transparent: true,
    opacity: 0.1,
    side: T.DoubleSide,
    depthWrite: false,
  });
  const ring = (r: number, y: number) => {
    const mesh = add(new T.TorusGeometry(r, 0.018, 10, 80), rim);
    mesh.rotation.x = Math.PI / 2;
    mesh.position.y = y;
  };
  if (portion) {
    const shell = add(new T.SphereGeometry(1, 48, 32), water);
    shell.scale.set(1, 1, 1);
    if (id !== "co2")
      for (let axis = 0; axis < 3; axis++) {
        const mesh = add(new T.TorusGeometry(1.005, 0.0015, 4, 80), rim);
        if (axis === 1) mesh.rotation.x = Math.PI / 2;
        if (axis === 2) mesh.rotation.y = Math.PI / 2;
      }
    const specks = new Float32Array(1200);
    for (let i = 0; i < 400; i++) {
      const a = i * 2.39996,
        y = (i / 400) * 2 - 1,
        r = Math.cbrt(((i * 71) % 397) / 397) * 0.94;
      specks.set(
        [
          Math.cos(a) * Math.sqrt(1 - y * y) * r,
          y * r,
          Math.sin(a) * Math.sqrt(1 - y * y) * r,
        ],
        i * 3,
      );
    }
    const speckGeo = new T.BufferGeometry();
    speckGeo.setAttribute("position", new T.BufferAttribute(specks, 3));
    const speckMat = new T.PointsMaterial({
      color: environments[id].color,
      size: 1.5,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    });
    group.add(new T.Points(speckGeo, speckMat));
    geometries.add(speckGeo);
    materials.add(speckMat);
  } else {
    if (id === "methane") {
      const profile = [
        new T.Vector2(0.01, -1.2),
        new T.Vector2(0.83, -1.2),
        new T.Vector2(0.93, -1.08),
        new T.Vector2(0.93, 0.4),
        new T.Vector2(0.86, 0.66),
        new T.Vector2(0.35, 1.02),
        new T.Vector2(0.35, 1.32),
      ];
      add(new T.LatheGeometry(profile, 64), glass);
      ring(0.35, 1.3);
      ring(0.87, -1.15);
      const cap = add(
        new T.CylinderGeometry(0.4, 0.4, 0.14, 48),
        new T.MeshStandardMaterial({
          color: "#8e91a9",
          metalness: 0.6,
          roughness: 0.32,
        }),
      );
      cap.position.y = 1.39;
      const label = add(
        new T.CylinderGeometry(
          0.938,
          0.938,
          0.33,
          64,
          1,
          true,
          Math.PI * 0.07,
          Math.PI * 0.86,
        ),
        new T.MeshStandardMaterial({
          color: "#a8abc0",
          transparent: true,
          opacity: 0.3,
          side: T.DoubleSide,
        }),
      );
      label.position.y = -0.58;
    } else {
      add(new T.CylinderGeometry(0.97, 0.78, 2.45, 64, 1, true), glass);
      ring(0.97, 1.225);
      ring(0.79, -1.225);
      const body = add(new T.CylinderGeometry(0.916, 0.775, 1.84, 64), water);
      body.position.y = -0.29;
      ring(0.916, 0.63);
      if (id === "co2") {
        for (let i = 0; i < 18; i++) {
          const mesh = add(new T.SphereGeometry(1, 16, 12), glass);
          const a = i * 2.399;
          mesh.scale.setScalar(0.028 + (i % 4) * 0.012);
          mesh.position.set(
            Math.cos(a) * (0.22 + (i % 3) * 0.16),
            -1 + (i / 18) * 1.55,
            Math.sin(a) * 0.5,
          );
        }
      }
    }
    const pedestal = add(
      new T.CylinderGeometry(1.2, 1.25, 0.075, 80),
      new T.MeshStandardMaterial({
        color: "#414958",
        metalness: 0.4,
        roughness: 0.5,
      }),
    );
    pedestal.position.y = -1.31;
  }
  const opacities = new Map<T.Material, number>();
  materials.forEach((m) => {
    opacities.set(m, m.opacity);
    m.transparent = true;
  });
  return {
    group,
    fade(alpha: number) {
      group.visible = alpha > 0.002;
      materials.forEach((m) => {
        m.opacity = opacities.get(m)! * alpha;
      });
    },
    dispose() {
      materials.forEach((m) => m.dispose());
      geometries.forEach((g) => g.dispose());
    },
  };
}

export function neighborsModel(id: MoleculeId) {
  const group = new T.Group(),
    sphere = new T.SphereGeometry(1, 18, 12),
    cylinder = new T.CylinderGeometry(0.1, 0.1, 1, 8);
  const mats = Object.fromEntries(
    Object.entries(elements).map(([k, e]) => [
      k,
      new T.MeshStandardMaterial({
        color: e.color,
        roughness: 0.38,
        metalness: 0.1,
        transparent: true,
      }),
    ]),
  );
  const bond = new T.MeshStandardMaterial({
    color: "#8993a4",
    roughness: 0.4,
    transparent: true,
  });
  const entries: { group: T.Group; home: T.Vector3; seed: number }[] = [];
  const m = molecules[id];
  for (let i = 0; i < 30; i++) {
    const model = new T.Group(),
      a = i * 2.39996,
      y = ((i + 0.5) / 30) * 2 - 1,
      r = id === "water" ? 8 + (i % 4) * 3 : 11 + (i % 3) * 4;
    const home = new T.Vector3(
      Math.cos(a) * Math.sqrt(1 - y * y) * r,
      y * r,
      Math.sin(a) * Math.sqrt(1 - y * y) * r,
    );
    model.position.copy(home);
    model.rotation.set(i * 0.31, i * 0.6, i * 0.18);
    m.atoms.forEach((atom) => {
      const mesh = new T.Mesh(sphere, mats[atom.element]);
      mesh.position.set(...atom.pos);
      mesh.scale.setScalar(atom.element === "H" ? 0.45 : 0.67);
      model.add(mesh);
    });
    m.bonds.forEach(([a, b, order]) => {
      const start = new T.Vector3(...m.atoms[a].pos),
        end = new T.Vector3(...m.atoms[b].pos),
        d = end.clone().sub(start);
      for (let j = 0; j < order; j++) {
        const mesh = new T.Mesh(cylinder, bond);
        mesh.position.copy(start).add(end).multiplyScalar(0.5);
        mesh.position.z += (j - (order - 1) / 2) * 0.25;
        mesh.quaternion.setFromUnitVectors(
          new T.Vector3(0, 1, 0),
          d.clone().normalize(),
        );
        mesh.scale.y = d.length();
        model.add(mesh);
      }
    });
    group.add(model);
    entries.push({ group: model, home, seed: i });
  }
  const linkGeo = new T.BufferGeometry();
  const positions = new Float32Array(24 * 3);
  linkGeo.setAttribute("position", new T.BufferAttribute(positions, 3));
  const linkMat = new T.LineDashedMaterial({
    color: "#dfba84",
    dashSize: 0.35,
    gapSize: 0.2,
    transparent: true,
    opacity: 0.8,
    depthTest: false,
  });
  const links = new T.LineSegments(linkGeo, linkMat);
  group.add(links);
  const boxGeo = new T.EdgesGeometry(new T.BoxGeometry(44, 44, 44)),
    boxMat = new T.LineBasicMaterial({
      color: "#adb8cb",
      transparent: true,
      opacity: 0.12,
    });
  const box = new T.LineSegments(boxGeo, boxMat);
  group.add(box);
  function update(
    alpha: number,
    time: number,
    interaction: string,
    phase: number,
    reduced: boolean,
  ) {
    group.visible = alpha > 0.005;
    Object.values(mats).forEach((m) => (m.opacity = alpha * 0.72));
    bond.opacity = alpha * 0.6;
    entries.forEach(({ group: g, home, seed }) => {
      g.position.copy(home);
      if (interaction === "motion" && phase > 0) {
        const t = reduced ? phase * 0.6 : time * 0.8;
        const bounce = (x: number) =>
          22 - Math.abs(((((x + 66) % 88) + 88) % 88) - 44);
        g.position.set(
          bounce(home.x + t * (1 + (seed % 4))),
          bounce(home.y + t * ((seed % 3) - 1) * 2),
          bounce(home.z + t * ((seed % 5) - 2)),
        );
      } else if (interaction === "cohesion" && phase > 0) {
        const t = reduced ? phase : time;
        g.position.add(
          new T.Vector3(
            Math.sin(t * 0.6 + seed) * 0.4,
            Math.cos(t * 0.7 + seed) * 0.4,
            0,
          ),
        );
      }
    });
    links.visible = interaction === "cohesion" && phase > 0;
    if (links.visible) {
      const attr = linkGeo.getAttribute("position") as T.BufferAttribute;
      for (let i = 0; i < 12; i++) {
        const start =
          i < 3 ? new T.Vector3(0, 0.5, 0) : entries[i - 3].group.position;
        const nearest = entries
          .filter((_, j) => (i < 3 ? j === i + 12 : j !== i - 3))
          .sort(
            (a, b) =>
              a.group.position.distanceToSquared(start) -
              b.group.position.distanceToSquared(start),
          )[0].group.position;
        attr.setXYZ(i * 2, start.x, start.y, start.z);
        attr.setXYZ(i * 2 + 1, nearest.x, nearest.y, nearest.z);
      }
      attr.needsUpdate = true;
      links.computeLineDistances();
      linkMat.opacity = alpha * 0.6;
    }
    box.visible = interaction === "motion" && phase === 2;
    boxMat.opacity = alpha * 0.25;
  }
  return {
    group,
    update,
    dispose() {
      sphere.dispose();
      cylinder.dispose();
      Object.values(mats).forEach((m) => m.dispose());
      bond.dispose();
      linkGeo.dispose();
      linkMat.dispose();
      boxGeo.dispose();
      boxMat.dispose();
    },
  };
}
