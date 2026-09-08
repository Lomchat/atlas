import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { buildSync } from "esbuild";
import * as T from "three";

let factory;
function loadModels() {
  if (factory) return factory;
  const source = new URL("../src/world/", import.meta.url);
  const entries = ["models.ts", "data.ts", "spatial-targets.ts"].map(
    (name) =>
      `export * from ${JSON.stringify(fileURLToPath(new URL(name, source)))};`,
  );
  const result = buildSync({
    stdin: {
      contents: entries.join("\n"),
      resolveDir: fileURLToPath(source),
      loader: "ts",
    },
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

/** Material routing and geometry have identical assertions in both languages. */
export function assertSpatialModels(locale) {
  assert.ok(
    ["en", "fr"].includes(locale),
    "Explicit supported locale required",
  );
  const { WORLD_NODES: nodes, createWorldModel, sampleTarget } = loadModels();
  const contexts = Object.values(nodes);
  const cache = new Map();
  const byKind = (kind) => {
    if (!cache.has(kind)) cache.set(kind, createWorldModel(kind));
    return cache.get(kind);
  };
  let regions = 0;
  try {
    for (const node of contexts) {
      assert.ok(node.name[locale]?.trim(), `${node.id}: translated identity`);
      if (!node.children.length) continue;
      const group = byKind(node.model).group;
      group.traverse((object) => {
        if (
          !object.userData.worldSampleChildModel &&
          !object.userData.worldSampleChildId
        )
          return;
        // A baked organelle belongs to the corresponding child's frame. Its own
        // internal material annotations must not be resolved against its parent.
        for (let ancestor = object.parent; ancestor; ancestor = ancestor.parent)
          if (ancestor.userData.worldChildModel) return;
        const target = sampleTarget(node, object);
        assert.ok(
          target && node.children.includes(target),
          `${node.id}: ${object.userData.worldMaterialRegion} resolves one direct sample`,
        );
        regions++;
      });
    }

    for (const id of [
      "tree/leaf/cell/wall",
      "tree/root/cell/wall",
      "world/grass/cell/wall",
      "mushroom/hypha/wall",
    ]) {
      const wall = nodes[id];
      const matrix = nodes[id + "/matrix"];
      assert.equal(matrix.parent, wall.id);
      assert.equal(matrix.model, "polymer");
      assert.ok(matrix.sizeMeters < wall.sizeMeters);
      assert.ok(matrix.description[locale].trim());
      const requiredSource = id.startsWith("mushroom")
        ? "s41467-021-26749-z"
        : "168/3/871/6113743";
      assert.ok(
        matrix.sources.some((source) => source.url.includes(requiredSource)),
      );
      const matrixModel = byKind("polymer");
      assert.equal(
        matrixModel.group.userData.representation,
        "representative-polymer-network",
      );
      let coarseRegion,
        oxygenCount = 0;
      matrixModel.group.traverse((object) => {
        if (object.userData.worldSampleAtomicNumber === 6)
          coarseRegion = object;
        if (
          object.userData.worldChildModel === "atom" &&
          object.userData.worldChildAtomicNumber === 8
        )
          oxygenCount++;
      });
      assert.ok(
        coarseRegion,
        "Carbon sampling is explicitly qualified by atomic number",
      );
      assert.equal(sampleTarget(matrix, coarseRegion), id + "/matrix/carbon");
      assert.ok(
        oxygenCount > 0,
        "Oxygen markers retain explicit elemental identity",
      );
      assert.equal(nodes[id + "/matrix/oxygen"].atomic.atomicNumber, 8);
      const unqualified = new T.Object3D();
      unqualified.userData.worldSampleChildModel = "atom";
      assert.equal(
        sampleTarget(matrix, unqualified),
        undefined,
        "An ambiguous atom sample never picks C or O arbitrarily",
      );
      unqualified.userData.worldSampleAtomicNumber = 8;
      assert.equal(sampleTarget(matrix, unqualified), id + "/matrix/oxygen");
      unqualified.userData.worldSampleAtomicNumber = 26;
      assert.equal(
        sampleTarget(matrix, unqualified),
        undefined,
        "An absent element never falls through to another element",
      );

      const wallModel = byKind("cellWall");
      wallModel.group.updateMatrixWorld(true);
      const ray = new T.Raycaster(
        new T.Vector3(0.1, 0.02, 2),
        new T.Vector3(0, 0, -1),
      );
      const hits = ray.intersectObject(wallModel.group, true);
      assert.ok(
        hits.some(
          (hit) =>
            hit.object.userData.worldMaterialRegion === "cell-wall-matrix",
        ),
        "The matrix is an actual hittable surface away from a child locator",
      );
      const hit = hits.find(
        (hit) => hit.object.userData.worldMaterialRegion === "cell-wall-matrix",
      );
      assert.equal(sampleTarget(wall, hit.object), matrix.id);
      let fiber;
      wallModel.group.traverse((object) => {
        if (object.userData.worldMaterialRegion === "cell-wall-fiber")
          fiber = object;
      });
      const fiberTarget = sampleTarget(wall, fiber);
      assert.ok(
        fiberTarget && fiberTarget !== matrix.id,
        "Fiber and surrounding matrix remain distinct",
      );
      assert.equal(
        nodes[fiberTarget].model,
        id.startsWith("mushroom") ? "chitin" : "celluloseMicrofibril",
      );
    }

    const world = byKind("world");
    world.group.traverse((object) => {
      if (object.userData.worldMaterialRegion !== "grass") return;
      assert.equal(sampleTarget(nodes.world, object), "world/grass");
    });
    byKind("rootCell").group.traverse((object) =>
      assert.notEqual(
        object.userData.worldChildModel,
        "chloroplast",
        "Non-photosynthetic root cell has no chloroplast",
      ),
    );

    for (const [kind, model] of cache) {
      model.group.updateMatrixWorld(true);
      const size = new T.Box3()
        .setFromObject(model.group)
        .getSize(new T.Vector3());
      assert.ok(
        Math.abs(Math.max(size.x, size.y, size.z) - 1) < 1e-5,
        `${kind}: largest extent normalized`,
      );
      model.update(0, 0.3);
    }
  } finally {
    for (const model of cache.values()) {
      model.dispose();
      model.dispose();
    }
  }
  return {
    locale,
    contexts: contexts.length,
    materialRegions: regions,
    modelKinds: cache.size,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url))
  for (const locale of ["en", "fr"]) console.log(assertSpatialModels(locale));
