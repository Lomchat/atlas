import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { getPart, lookupPart } from "../public/models/bodyparts3d/picking.mjs";

const root = new URL("../public/models/bodyparts3d/", import.meta.url);
const read = (name) => fs.readFileSync(new URL(name, root));
const json = (name) => JSON.parse(read(name));
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const close = (a, b, label) => assert.ok(Math.abs(a - b) < 2e-8, label);

// Reviewed source geometry is independent of the picking-sidecar mutation.
// Update these only after an intentional source/provenance review, never just
// because regenerated manifest hashes disagree with the current fixtures.
const reviewedProvenanceSha256 =
  "ccc3c0011d8a1f7fd8e7a6aedf0a3595e91cd0317a2d7bcf2246453109253eb4";
const reviewedGeometrySha256 =
  "285e6400a5077c83d80220a7f641f2cdfc97894acbe460776d355b1db47dd034";

/** Inspect serialized GLB accessors, not a second reconstruction of the mesh. */
function primitiveData(bytes, label) {
  assert.equal(bytes.toString("ascii", 0, 4), "glTF", `${label}: GLB magic`);
  assert.equal(bytes.readUInt32LE(4), 2, `${label}: GLB version`);
  assert.equal(bytes.readUInt32LE(8), bytes.length, `${label}: complete binary`);
  let document;
  let binary;
  for (let cursor = 12; cursor < bytes.length;) {
    const length = bytes.readUInt32LE(cursor);
    const type = bytes.toString("ascii", cursor + 4, cursor + 8);
    assert.ok(cursor + 8 + length <= bytes.length, `${label}: bounded chunk`);
    const contents = bytes.subarray(cursor + 8, cursor + 8 + length);
    if (type === "JSON") document = JSON.parse(contents.toString());
    if (type === "BIN\0") binary = contents;
    cursor += 8 + length;
  }
  assert.ok(document && binary, `${label}: JSON and binary chunks`);
  assert.equal(document.meshes.length, 1, `${label}: one merged display mesh`);
  assert.equal(document.meshes[0].primitives.length, 1, `${label}: one primitive`);
  const primitive = document.meshes[0].primitives[0];
  assert.equal(primitive.mode ?? 4, 4, `${label}: indexed triangle topology`);
  const accessor = (id) => {
    const item = document.accessors[id];
    assert.ok(item && !item.sparse, `${label}: direct accessor`);
    const view = document.bufferViews[item.bufferView];
    assert.equal(view.buffer, 0, `${label}: embedded buffer`);
    const component = {
      5123: { bytes: 2, read: (offset) => binary.readUInt16LE(offset) },
      5125: { bytes: 4, read: (offset) => binary.readUInt32LE(offset) },
      5126: { bytes: 4, read: (offset) => binary.readFloatLE(offset) },
    }[item.componentType];
    const width = { SCALAR: 1, VEC3: 3 }[item.type];
    assert.ok(component && width, `${label}: supported accessor representation`);
    const offset = (view.byteOffset ?? 0) + (item.byteOffset ?? 0);
    const stride = view.byteStride ?? component.bytes * width;
    assert.ok(offset + (item.count - 1) * stride + width * component.bytes <= binary.length, `${label}: accessor stays within binary`);
    return {
      count: item.count,
      width,
      read(index, axis = 0) {
        assert.ok(index >= 0 && index < item.count && axis < width, `${label}: accessor index`);
        return component.read(offset + index * stride + axis * component.bytes);
      },
    };
  };
  const positions = accessor(primitive.attributes.POSITION);
  const normals = accessor(primitive.attributes.NORMAL);
  const indices = accessor(primitive.indices);
  assert.equal(positions.width, 3, `${label}: 3D positions`);
  assert.equal(normals.count, positions.count, `${label}: one normal per vertex`);
  assert.equal(indices.width, 1, `${label}: scalar indices`);
  assert.equal(indices.count % 3, 0, `${label}: complete triangles`);
  return { positions, normals, indices };
}

/** Same source/picking invariants run at the start of both anatomy locale suites. */
export function assertAnatomyParts(locale) {
  assert.ok(["en", "fr"].includes(locale), "Anatomical checks require an explicit locale");
  const manifest = json("manifest.json");
  const provenance = json("provenance.json");
  assert.equal(hash(read("provenance.json")), reviewedProvenanceSha256,
    "Picking metadata preserves the reviewed anatomical provenance record");
  assert.equal(hash(JSON.stringify(Object.keys(manifest.assets).sort().map(
    (id) => [id, manifest.assets[id].sha256],
  ))), reviewedGeometrySha256,
    "Picking metadata preserves all reviewed anatomical GLB fingerprints");
  assert.deepEqual(manifest.versions, ["4.0", "4.3"],
    "Archive and supplementary source versions remain separately disclosed");
  assert.equal(manifest.source.archiveSha256,
    "40665852c49f218326590e204db91064a1ecfc3c6f8cbd7bbbcaac62c7cd409e",
    "The original archive remains the audited official source");
  assert.equal(provenance.sourceFiles[manifest.source.archive].sha256,
    manifest.source.archiveSha256, "Archive provenance and manifest agree");
  assert.equal(manifest.transform.sharedAcrossEveryAsset, true,
    "Every source mesh preserves the same anatomical frame");
  assert.equal(manifest.transform.bodyUnitMeters, 1.7194712,
    "Picking metadata cannot recalibrate the source body");
  const bytes = read(manifest.picking.file);
  const data = JSON.parse(bytes);
  assert.equal(data.formatVersion, 1, "Reviewed picking schema");
  assert.equal(manifest.picking.sha256, hash(bytes), "Sidecar hash matches manifest");
  assert.equal(manifest.picking.bytes, bytes.length, "Sidecar byte length matches manifest");
  assert.ok(bytes.length < 300_000, "Anatomical identity remains compact");
  assert.deepEqual(data.partFields, ["assetIndex", "name", "fmaId", "categoryIndex", "regionIndex", "center", "extent"]);
  assert.deepEqual(data.rangeFields, ["firstTriangle", "triangleCount", "partId", "firstVertex", "vertexCount"]);
  assert.deepEqual(Object.keys(data.notes).sort(), ["en", "fr"], "Both locales disclose identity and region limits");
  assert.ok(data.notes[locale].trim().length > 100, "Active-locale source limitations are meaningful");
  assert.match(data.notes.en, /approximate navigation hints/);
  assert.match(data.notes.fr, /repères approximatifs de navigation/);
  assert.match(data.notes.en, /null means/);
  assert.match(data.notes.fr, /null indique/);
  assert.deepEqual(data.assetIds.slice().sort(), Object.keys(manifest.assets).sort());
  assert.deepEqual(Object.keys(data.assets).sort(), data.assetIds.slice().sort());
  const seen = new Set();
  let triangleCount = 0;
  let unnamed = 0;

  for (const [assetId, asset] of Object.entries(data.assets)) {
    const source = manifest.assets[assetId];
    assert.equal(source.version, assetId === "lungs" ? "4.3" : "4.0",
      `${assetId}: the documented supplementary source remains isolated`);
    assert.equal(source.license.id,
      assetId === "lungs" ? "CC-BY-SA-2.1-JP" : "CC-BY-4.0",
      `${assetId}: source-specific license is not silently replaced`);
    const binary = read(source.file);
    assert.equal(hash(binary), asset.sha256, `${assetId}: sidecar matches actual GLB bytes`);
    assert.equal(source.sha256, asset.sha256, `${assetId}: manifest and ranges agree`);
    const { positions, normals, indices } = primitiveData(binary, assetId);
    assert.equal(asset.triangleCount, indices.count / 3, `${assetId}: serialized face count`);
    assert.equal(asset.triangleCount, source.triangles, `${assetId}: public triangle count`);
    assert.equal(asset.vertexCount, positions.count, `${assetId}: serialized vertex count`);
    assert.ok(asset.ranges.length > 0, `${assetId}: source ranges available`);
    let nextFace = 0;
    let nextVertex = 0;
    const assetParts = [];
    for (const row of asset.ranges) {
      assert.equal(row.length, 5, `${assetId}: complete range tuple`);
      const [first, count, partId, vertex, vertices] = row;
      assert.equal(first, nextFace, `${partId}: no face overlap or gap`);
      assert.equal(vertex, nextVertex, `${partId}: no vertex overlap or gap`);
      assert.ok(Number.isInteger(count) && count > 0 && Number.isInteger(vertices) && vertices > 0, `${partId}: nonempty source geometry`);
      assert.match(partId, /^FJ\d+M?$/, `${partId}: actual source element identity`);
      assert.ok(!seen.has(partId), `${partId}: exactly one owning asset`);
      seen.add(partId);
      assetParts.push(partId);
      const part = getPart(data, partId);
      const original = provenance.parts[partId];
      assert.ok(part && original, `${partId}: identity has published source provenance`);
      assert.match(original.sha256, /^[a-f\d]{64}$/,
        `${partId}: exact downloaded source object has a recorded fingerprint`);
      assert.equal(part.assetId, assetId, `${partId}: stable owning asset`);
      assert.equal(part.name, original.name || null, `${partId}: exact source name without invented fallback`);
      assert.equal(part.fmaId, original.fmaId || null, `${partId}: exact FMA identity`);
      if (part.fmaId) assert.match(part.fmaId, /^FMA\d+$/, `${partId}: FMA identifier`);
      assert.ok(data.categories.includes(part.category), `${partId}: reviewed category`);
      assert.ok(data.regions.includes(part.region), `${partId}: reviewed approximate region`);
      if (!part.name || !part.fmaId) {
        unnamed++;
        assert.equal(part.identitySource, "unnamed-source-part", `${partId}: incomplete identity is explicit`);
      } else assert.equal(part.identitySource, "obj-header", `${partId}: identity confidence has a source`);
      if (assetId === "context-vessels") assert.ok(["vein", "artery", "unknown"].includes(part.category), `${partId}: vessel type, never a guessed organ`);
      if (assetId === "context-skeleton") assert.equal(part.category, "bone");
      if (assetId === "context-muscles") assert.equal(part.category, "muscle");
      assert.equal(original.version, source.version, `${partId}: source version preserved`);
      assert.ok(source.license.name && source.license.attribution && source.license.url.startsWith("https://"), `${partId}: source license stays attached`);
      const minimum = [Infinity, Infinity, Infinity];
      const maximum = [-Infinity, -Infinity, -Infinity];
      for (let i = vertex; i < vertex + vertices; i++) {
        for (let axis = 0; axis < 3; axis++) {
          const value = positions.read(i, axis);
          assert.ok(Number.isFinite(value), `${partId}: finite coordinates`);
          assert.ok(Number.isFinite(normals.read(i, axis)), `${partId}: finite normals`);
          minimum[axis] = Math.min(minimum[axis], value);
          maximum[axis] = Math.max(maximum[axis], value);
        }
      }
      for (let i = first * 3; i < (first + count) * 3; i++) {
        const index = indices.read(i);
        assert.ok(index >= vertex && index < vertex + vertices, `${partId}: each picked face uses this source part's vertices`);
      }
      for (let axis = 0; axis < 3; axis++) close(part.center[axis], (minimum[axis] + maximum[axis]) / 2, `${partId}: center matches serialized source part`);
      close(part.extent, Math.max(...maximum.map((value, axis) => value - minimum[axis])), `${partId}: extent matches serialized source part`);
      assert.ok(part.extent > 0, `${partId}: positive spatial frame`);
      for (const index of [first, first + count - 1]) assert.equal(lookupPart(data, assetId, index, asset.sha256)?.partId, partId, `${partId}: both range boundaries pick the correct part`);
      nextFace += count;
      nextVertex += vertices;
    }
    assert.deepEqual(assetParts, source.partIds, `${assetId}: all and only selected source elements`);
    assert.equal(nextFace, asset.triangleCount, `${assetId}: every visible triangle has an identity`);
    assert.equal(nextVertex, asset.vertexCount, `${assetId}: every vertex belongs to a source part`);
    for (const index of [-1, asset.triangleCount, 0.5, NaN, Infinity]) assert.equal(lookupPart(data, assetId, index), null, `${assetId}: invalid face cannot resolve to another part`);
    assert.equal(lookupPart(data, assetId, 0, "stale-sha256"), null, `${assetId}: mismatching geometry rejected`);
    triangleCount += asset.triangleCount;
  }
  assert.equal(seen.size, Object.keys(data.parts).length, "No orphan anatomical identities");
  assert.equal(manifest.picking.parts, seen.size, "Published identity count");
  assert.equal(lookupPart(data, "__proto__", 0), null, "Invalid asset cannot resolve through an object prototype");
  // Concrete source fixtures prevent a leg vessel from silently inheriting the
  // cephalic-vein name or an artery from taking a venous branch.
  for (const [id, fmaId, region] of [["FJ2103", "FMA21380", "left-leg"], ["FJ2145", "FMA21379", "right-leg"], ["FJ2220", "FMA13326", "left-arm"]]) {
    const part = getPart(data, id);
    assert.equal(part.fmaId, fmaId, `${id}: exact source vein`);
    assert.equal(part.category, "vein", `${id}: source venous category`);
    assert.equal(part.region, region, `${id}: stable regional navigation hint`);
  }
  const arteries = [...seen].map((id) => getPart(data, id)).filter((part) => part.category === "artery");
  assert.ok(arteries.some((part) => part.region === "left-leg") && arteries.some((part) => part.region === "right-leg"), "Both legs retain a distinct arterial branch");
  assert.ok(unnamed > 0, "Unassigned source identities remain explicit, rather than fabricated");
  return { manifest, data, validation: { locale, assets: data.assetIds.length, parts: seen.size, triangles: triangleCount, unnamed } };
}
