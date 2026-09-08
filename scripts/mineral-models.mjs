import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { buildSync } from "esbuild";
import * as T from "three";
import { loadWorldContent } from "./world-content.mjs";

let factory;
function loadModels() {
  if (factory) return factory;
  const result = buildSync({
    entryPoints: [
      fileURLToPath(new URL("../src/world/mineralModels.ts", import.meta.url)),
    ],
    bundle: true,
    platform: "node",
    format: "cjs",
    packages: "external",
    write: false,
  });
  const module = { exports: {} };
  new Function("require", "module", "exports", result.outputFiles[0].text)(
    createRequire(import.meta.url),
    module,
    module.exports,
  );
  factory = module.exports;
  return factory;
}

/** Same geometry, calibration, semantics and content assertions in both locales.
 * Browser world suites can call this guard before creating their renderer. */
export function assertMineralModels(locale) {
  assert.ok(
    ["en", "fr"].includes(locale),
    "Explicit supported locale required",
  );
  const m = loadModels();
  const { WORLD_NODES: nodes } = loadWorldContent();
  const networkNode = nodes["rock/quartz/network"];
  assert.equal(
    nodes["tree/wood/xylem/wall/microfibril"].model,
    "celluloseMicrofibril",
  );
  assert.equal(
    nodes["tree/wood/xylem/wall/microfibril/cellulose"].model,
    "cellulose",
  );
  for (const id of [
    "rock/quartz",
    networkNode.id,
    "tree/wood/xylem/wall/microfibril",
  ])
    assert.ok(nodes[id].name[locale].trim(), `${id}: translated identity`);
  const structure = m.createQuartzNetworkData();
  assert.deepEqual(
    m.createQuartzNetworkData(),
    structure,
    "Crystallography is deterministic",
  );
  assert.equal(m.QUARTZ_BASIS.filter((a) => a.element === "Si").length, 3);
  assert.equal(m.QUARTZ_BASIS.filter((a) => a.element === "O").length, 6);
  const degree = structure.atoms.map(() => 0);
  const neighbours = structure.atoms.map(() => []);
  for (const [i, j] of structure.bonds) {
    assert.equal(structure.atoms[i].element, "Si");
    assert.equal(structure.atoms[j].element, "O");
    const d = new T.Vector3(...structure.atoms[i].position).distanceTo(
      new T.Vector3(...structure.atoms[j].position),
    );
    assert.ok(d > 1.6 && d < 1.62, "Experimental Si–O bond length in Angstrom");
    degree[i]++;
    degree[j]++;
    neighbours[i].push(j);
    neighbours[j].push(i);
  }
  for (const [i, atom] of structure.atoms.entries()) {
    assert.equal(degree[i], atom.element === "Si" ? 4 : atom.boundary ? 1 : 2);
    if (atom.element !== "O" || atom.boundary) continue;
    const a = new T.Vector3(...structure.atoms[neighbours[i][0]].position).sub(
      new T.Vector3(...atom.position),
    );
    const b = new T.Vector3(...structure.atoms[neighbours[i][1]].position).sub(
      new T.Vector3(...atom.position),
    );
    const degrees = (a.angleTo(b) * 180) / Math.PI;
    assert.ok(
      degrees > 140 && degrees < 148,
      "Bent Si–O–Si bridge, never artificial 180° bonds",
    );
  }
  assert.ok(
    structure.atoms.some((atom) => atom.boundary),
    "Explicit clipped crystal edges",
  );

  const representations = new Set();
  for (const fn of [
    "createQuartzGrain",
    "createQuartzNetwork",
    "createCelluloseMicrofibril",
    "createCelluloseChain",
  ]) {
    const model = m[fn]();
    representations.add(model.group.userData.representation);
    model.group.updateMatrixWorld(true);
    const bounds = new T.Box3().setFromObject(model.group);
    const size = bounds.getSize(new T.Vector3());
    assert.ok(
      Math.abs(Math.max(size.x, size.y, size.z) - 1) < 1e-6,
      `${fn}: longest extent 1`,
    );
    assert.ok(
      bounds.getCenter(new T.Vector3()).length() < 1e-6,
      `${fn}: centred`,
    );
    const geometries = new Set(),
      materials = new Set(),
      instances = [],
      semantic = [];
    let drawCalls = 0;
    model.group.traverse((object) => {
      if (object.geometry) {
        geometries.add(object.geometry);
        drawCalls++;
      }
      if (object.material)
        (Array.isArray(object.material)
          ? object.material
          : [object.material]
        ).forEach((material) => materials.add(material));
      if (object.isInstancedMesh) instances.push(object);
      if (object.userData.worldChildModel) semantic.push(object);
    });
    assert.ok(drawCalls <= 50, `${fn}: bounded draw calls`);
    if (fn === "createQuartzGrain") {
      assert.equal(semantic.length, 0, "Grain never depicts atom spheres");
      const body = model.group.children[0].children.find(
        (object) => object.material?.vertexColors,
      );
      const p = body.geometry.attributes.position,
        n = body.geometry.attributes.normal;
      for (let i = 0; i < p.count; i += 3) {
        const centroid = new T.Vector3()
          .fromBufferAttribute(p, i)
          .add(new T.Vector3().fromBufferAttribute(p, i + 1))
          .add(new T.Vector3().fromBufferAttribute(p, i + 2))
          .divideScalar(3);
        assert.ok(
          centroid.dot(new T.Vector3().fromBufferAttribute(n, i)) > 0,
          "Crystal faces point outward",
        );
      }
    }
    if (fn === "createQuartzNetwork") {
      assert.deepEqual(
        semantic
          .map((o) => o.userData.worldChildAtomicNumber)
          .sort((a, b) => a - b),
        [8, 14],
      );
      for (const object of semantic)
        assert.ok(
          networkNode.children.some(
            (id) =>
              nodes[id].atomic?.atomicNumber ===
              object.userData.worldChildAtomicNumber,
          ),
          "Both pictured elements navigate to their own branch",
        );
      const extent = model.group.userData.physicalExtentMeters;
      assert.ok(
        Math.abs(networkNode.sizeMeters / extent - 1) < 1e-7,
        "Registry SI size preserves experimental atom distances",
      );
      const positions = new Map();
      for (const object of semantic) {
        const points = [];
        for (let i = 0; i < object.count; i++) {
          const matrix = new T.Matrix4();
          object.getMatrixAt(i, matrix);
          points.push(
            new T.Vector3()
              .setFromMatrixPosition(matrix)
              .applyMatrix4(object.matrixWorld),
          );
        }
        positions.set(object.userData.worldElement, points);
      }
      const counts = { Si: 0, O: 0 };
      const world = structure.atoms.map(
        (atom) => positions.get(atom.element)[counts[atom.element]++],
      );
      for (const [i, j] of structure.bonds) {
        const distanceMeters =
          world[i].distanceTo(world[j]) * networkNode.sizeMeters;
        assert.ok(
          distanceMeters > 1.6e-10 && distanceMeters < 1.62e-10,
          "Rendered SI bonds retain calibration after normalization",
        );
      }
    }
    if (fn === "createCelluloseMicrofibril") {
      assert.ok(
        semantic.length > 10 &&
          semantic.every((o) => o.userData.worldChildModel === "cellulose"),
      );
      assert.ok(
        size.x < 0.11 && size.z < 0.11,
        "A few nanometres wide over a 30 nm segment",
      );
    }
    if (fn === "createCelluloseChain") {
      assert.equal(
        semantic.length,
        15,
        "One linear sequence, not four competing chains",
      );
      assert.ok(
        semantic.every((o) => o.userData.worldChildModel === "glucoseResidue"),
      );
      assert.equal(
        new Set(semantic.map((o) => o.position.y)).size,
        semantic.length,
        "Residue pick origins follow the chain",
      );
    }
    const resources = [...geometries, ...materials, ...instances];
    let disposals = 0;
    resources.forEach((resource) =>
      resource.addEventListener("dispose", () => disposals++),
    );
    model.dispose();
    assert.equal(
      disposals,
      resources.length,
      `${fn}: release every attached GPU resource`,
    );
    model.dispose();
    assert.equal(disposals, resources.length, `${fn}: disposal is idempotent`);
  }
  assert.equal(
    representations.size,
    4,
    "Four distinct material representations",
  );
  return {
    locale,
    quartzAtoms: structure.atoms.length,
    tetrahedra: structure.tetrahedra.length,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  for (const locale of ["en", "fr"]) console.log(assertMineralModels(locale));
}
