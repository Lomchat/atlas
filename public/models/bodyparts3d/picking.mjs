/** Decode the compact, source-derived anatomical identity table.
 *
 * Names are exact English source metadata, not translated product copy.
 * Regions are approximate navigation hints, not FMA region assignments.
 * `null` name/FMA means an unnamed original source part; never invent a name.
 */
export function getPart(data, partId) {
  if (!data || data.formatVersion !== 1 || typeof partId !== "string") return null;
  const row = data.parts?.[partId];
  if (!Array.isArray(row) || row.length !== 7) return null;
  const [assetIndex, name, fmaId, categoryIndex, regionIndex, center, extent] = row;
  const assetId = data.assetIds?.[assetIndex];
  const category = data.categories?.[categoryIndex];
  const region = data.regions?.[regionIndex];
  if (!assetId || !category || !region) return null;
  return {
    partId,
    assetId,
    name,
    fmaId,
    category,
    region,
    center,
    extent,
    identitySource: name && fmaId ? "obj-header" : "unnamed-source-part",
  };
}

/** Find the actual anatomical part under Three.js Intersection.faceIndex.
 *
 * Ranges use [firstTriangle, firstTriangle + triangleCount); faceIndex is a
 * triangle ordinal, not a vertex/index-buffer offset. O(log numberOfParts).
 * Pass the loaded GLB's manifest SHA-256 to reject a mismatching sidecar.
 * Reordering triangles or merging different GLBs invalidates these ranges.
 */
export function lookupPart(data, assetId, faceIndex, expectedSha256) {
  if (!data?.assets || !Object.hasOwn(data.assets, assetId)) return null;
  const asset = data?.assets?.[assetId];
  if (!asset || !Number.isSafeInteger(faceIndex) || faceIndex < 0 ||
      faceIndex >= asset.triangleCount ||
      (expectedSha256 !== undefined && asset.sha256 !== expectedSha256)) return null;
  const ranges = asset.ranges;
  let left = 0;
  let right = ranges.length - 1;
  while (left <= right) {
    const middle = (left + right) >>> 1;
    const [firstTriangle, triangleCount, partId, firstVertex, vertexCount] = ranges[middle];
    if (faceIndex < firstTriangle) right = middle - 1;
    else if (faceIndex >= firstTriangle + triangleCount) left = middle + 1;
    else {
      const part = getPart(data, partId);
      if (!part || part.assetId !== assetId) return null;
      return { ...part, range: { firstTriangle, triangleCount, firstVertex, vertexCount } };
    }
  }
  return null;
}
