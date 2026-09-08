#!/usr/bin/env python3
"""Reproduce Atlas's aligned BodyParts3D 4.0 GLBs from the official archive.

python3 -m venv /tmp/atlas-bodyparts3d-tools
/tmp/atlas-bodyparts3d-tools/bin/pip install -r scripts/bodyparts3d-requirements.txt
/tmp/atlas-bodyparts3d-tools/bin/python scripts/convert-bodyparts3d.py --download

Source archives stay under ignored artifacts/. No Blender or npm additions are needed.
"""

import argparse
import csv
import hashlib
import http.cookiejar
import html
import io
import json
import re
import struct
import urllib.request
import urllib.parse
import zipfile
from pathlib import Path

import numpy as np
import trimesh

BASE = "https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/"
ARCHIVE = "isa_BP3D_4.0_obj_99.zip"
ARCHIVE_SHA256 = "40665852c49f218326590e204db91064a1ecfc3c6f8cbd7bbbcaac62c7cd409e"
ATTRIBUTION = "BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International"
VIEWER = "https://lifesciencedb.jp/bp3d/"
LUNG_PARTS = [f"FJ{number}" for number in range(6595, 6613)]
LUNG_ZIP = "official-supplement-lungs-4.3.zip"
LICENSE_40 = {"name": "CC Attribution 4.0 International", "id": "CC-BY-4.0", "url": "https://creativecommons.org/licenses/by/4.0/", "attribution": ATTRIBUTION}
LICENSE_43 = {"name": "CC Attribution-Share Alike 2.1 Japan", "id": "CC-BY-SA-2.1-JP", "url": "https://creativecommons.org/licenses/by-sa/2.1/jp/", "attribution": "BodyParts3D, © The Database Center for Life Science licensed under CC Attribution-Share Alike 2.1 Japan"}
URLS = {
    ARCHIVE: BASE + ARCHIVE,
    "isa_element_parts.txt": BASE + "isa_element_parts.txt",
    "partof_element_parts.txt": BASE + "partof_element_parts.txt",
    "isa_parts_list_e.txt": BASE + "isa_parts_list_e.txt",
    "partof_parts_list_e.txt": BASE + "partof_parts_list_e.txt",
    "README_e.html": BASE + "README_e.html",
    "release_4.0_e.html": BASE + "release_4.0_e.html",
    "license.html": "https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html",
    "download.html": "https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html",
    "coordinate_system.png": "https://dbarchive.biosciencedbc.jp/archive/bodyparts3d/images/coordinate_system.png",
    "official-viewer-4.3-mapping.zip": VIEWER + "get-info.cgi?version=4.3&cmd=concept-objfiles-list",
    "viewer-information.html": VIEWER + "info_en/index.html",
}

# Explicit FMA concepts are resolved through the official element-part tables.
# Budgets are maximum triangles, after retaining each selected part's geometry.
SPECS = [
    ("skin", "surface", "isa", ["FMA7163"], 30000, "#cfa385"),
    ("heart", "organs", "partof", ["FMA7088"], 16000, "#b84e60"),
    ("lungs", "organs", "partof", ["FMA7309", "FMA7310"], 22000, "#db8f9c"),
    ("brain", "organs", "partof", ["FMA50801"], 26000, "#c5a3b5"),
    ("vein", "vessels", "isa", ["FMA13326"], 5000, "#657fc4"),
    ("muscle", "muscles", "isa", ["FMA37685", "FMA37687"], 5000, "#b96462"),
    ("liver", "organs", "partof", ["FMA7197"], 14000, "#9a5058"),
    ("kidneys", "organs", "isa", ["FMA7204", "FMA7205"], 9000, "#b56265"),
    ("stomach", "organs", "isa", ["FMA7148"], 8000, "#d99b8c"),
    ("intestines", "organs", "partof", ["FMA7200", "FMA7201"], 18000, "#c795ad"),
    ("femur", "skeleton", "isa", ["FMA24475"], 6000, "#e6d9be"),
    ("context-skeleton", "skeleton", "isa", ["FMA5018"], 65000, "#dcd0b7"),
    ("context-muscles", "muscles", "isa", ["FMA5022", "FMA85453"], 80000, "#ae6967"),
    ("context-vessels", "vessels", "isa", ["FMA50720", "FMA50723"], 65000, "#7189c4"),
]


def sha(data):
    return hashlib.sha256(data).hexdigest()


def rounded(value):
    return np.asarray(value).round(10).tolist()


def glb_arrays(binary):
    """Read the actual indexed primitive, so ranges follow GLTFLoader faceIndex.

    A later geometry optimizer may reorder triangles; fail instead of silently
    attaching anatomical identities to the wrong faces.
    """
    magic, version, length = struct.unpack_from("<4sII", binary)
    assert magic == b"glTF" and version == 2 and length == len(binary)
    cursor, document, buffer = 12, None, None
    while cursor < len(binary):
        size, kind = struct.unpack_from("<I4s", binary, cursor)
        chunk = binary[cursor + 8:cursor + 8 + size]
        if kind == b"JSON":
            document = json.loads(chunk)
        elif kind == b"BIN\0":
            buffer = chunk
        cursor += 8 + size
    assert document is not None and buffer is not None
    assert len(document["meshes"]) == 1 and len(document["meshes"][0]["primitives"]) == 1
    primitive = document["meshes"][0]["primitives"][0]
    assert primitive.get("mode", 4) == 4

    def accessor(index):
        item = document["accessors"][index]
        view = document["bufferViews"][item["bufferView"]]
        dtype = np.dtype({5126: "<f4", 5125: "<u4", 5123: "<u2"}[item["componentType"]])
        components = {"SCALAR": 1, "VEC3": 3}[item["type"]]
        stride = view.get("byteStride", dtype.itemsize * components)
        offset = view.get("byteOffset", 0) + item.get("byteOffset", 0)
        return np.ndarray((item["count"], components), dtype=dtype, buffer=buffer,
                          offset=offset, strides=(stride, dtype.itemsize))

    return accessor(primitive["attributes"]["POSITION"]), accessor(primitive["indices"]).reshape(-1, 3)


def approximate_region(name, source_bounds, category):
    """Navigation hint only: source name + broad source-coordinate regions.

    This is not an FMA region assignment or an anatomical boundary segmentation.
    Long vessels can cross several regions; their midpoint determines this hint.
    """
    if category == "surface":
        return "unknown"  # the full-body skin is not confined to one region
    name = (name or "").lower()
    x, _, z = np.mean(source_bounds, axis=0)
    explicit_left, explicit_right = "left" in name, "right" in name
    if explicit_left != explicit_right:
        side = "left" if explicit_left else "right"
    else:
        side = "left" if x > 0 else "right"
    if any(word in name for word in ["femur", "femoral", "tibia", "tibial", "fibula", "fibular", "saphenous", "popliteal", "patella", "calcane", "tarsal", "metatars", "plantar", "dorsalis pedis", "soleus", "gastrocnem", "biceps femoris", "quadriceps", "vastus", "sartorius", "gracilis", "semitendinos", "semimembranos"]):
        return side + "-leg"
    if any(word in name for word in ["brachial", "brachii", "cephalic vein", "basilic", "humerus", "humeral", "ulna", "radius", "radial", "carpal", "metacarp", "palmar", "deltoid", "supraspinatus", "infraspinatus", "teres minor", "teres major"]):
        return side + "-arm"
    if any(word in name for word in ["cerebr", "cranial", "skull", "occipital", "maxilla", "mandib", "facial", "nasal", "orbital", "ophthalm", "temporal bone", "frontal bone", "parietal bone"]):
        return "head"
    if z > 1380:
        return "head"
    if z < 730 and abs(x) > 20:
        return side + "-leg"
    if abs(x) > 150 and z > 730:
        return side + "-arm"
    return "trunk"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=Path("artifacts/bodyparts3d/source"))
    parser.add_argument("--output", type=Path, default=Path("public/models/bodyparts3d"))
    parser.add_argument("--download", action="store_true")
    parser.add_argument("--metadata-only", action="store_true", help="Recompute face ranges, require byte-identical existing GLBs, and write only picking metadata")
    args = parser.parse_args()
    args.source.mkdir(parents=True, exist_ok=True)
    args.output.mkdir(parents=True, exist_ok=True)
    for filename, url in URLS.items():
        path = args.source / filename
        if not path.exists():
            if not args.download:
                raise FileNotFoundError(f"Missing {path}; pass --download to acquire official sources")
            print(f"Downloading {filename}", flush=True)
            urllib.request.urlretrieve(url, path)
    if sha((args.source / ARCHIVE).read_bytes()) != ARCHIVE_SHA256:
        raise ValueError("Official archive checksum differs from the audited 4.0 source; review before converting")
    # The 4.0 archive's lung compounds contain only vessels/bronchi. Supplement
    # their surface with genuine segmental parenchyma from the official 4.3 set.
    # Membership in the version-stamped mapping and each OBJ header is checked.
    mapping43 = zipfile.ZipFile(args.source / "official-viewer-4.3-mapping.zip").read("FMA2Obj.txt").decode()
    assert "# Data Version\t4.3" in mapping43 and "# Objects set\t4.3" in mapping43
    official_lung_parts = set()
    for line in mapping43.splitlines():
        if line.startswith(("FMA7309\t", "FMA7310\t")):
            official_lung_parts.update(line.split("\t")[2].split("+"))
    assert set(LUNG_PARTS) <= official_lung_parts
    if not (args.source / LUNG_ZIP).exists():
        if not args.download:
            raise FileNotFoundError("Missing official 4.3 lung supplement; pass --download")
        browser = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
        browser.addheaders = [("User-Agent", "Mozilla/5.0"), ("Referer", VIEWER + "?lng=en")]
        browser.open(VIEWER + "?lng=en").read()
        table_request = {"cmd": "upload-all-list", "load": "1", "md_abbr": "bp3d", "title": "obj2FMA", "tree": "isa", "version": "4.3"}
        object_table = browser.open(VIEWER + "get-info.cgi", urllib.parse.urlencode(table_request).encode()).read().decode()
        (args.source / "official-viewer-object-map.html").write_text(object_table)
        representations = {}
        for row in re.findall(r"<tr>\s*(.*?)\s*</tr>", object_table, re.S):
            cells = [html.unescape(re.sub(r"<[^>]*>", "", cell)).strip() for cell in re.findall(r"<td[^>]*>(.*?)</td>", row, re.S)]
            if len(cells) > 6 and cells[1] in LUNG_PARTS:
                representations[cells[1]] = cells[2]
        assert set(representations) == set(LUNG_PARTS)
        request = {"ids": json.dumps(LUNG_PARTS), "rep_id": json.dumps(sorted(set(representations.values()))), "type": "art_file", "all_downloads": "1", "filename": "atlas-lung-surfaces-4.3"}
        (args.source / "official-supplement-lungs-request.json").write_text(json.dumps(request, indent=2) + "\n")
        (args.source / LUNG_ZIP).write_bytes(browser.open(VIEWER + "download.cgi", urllib.parse.urlencode(request).encode(), timeout=120).read())

    tables = {}
    for index in ["isa", "partof"]:
        rows = csv.DictReader((args.source / f"{index}_element_parts.txt").open(), delimiter="\t")
        concepts = {}
        for row in rows:
            entry = concepts.setdefault(row["concept id"], {"name": row["name"], "parts": set()})
            entry["parts"].add(row["element file id"])
        tables[index] = concepts

    archive = zipfile.ZipFile(args.source / ARCHIVE)
    lung_archive = zipfile.ZipFile(args.source / LUNG_ZIP)
    lung_files = {Path(name).name.split("_")[0]: name for name in lung_archive.namelist() if name.endswith(".obj")}
    assert set(lung_files) == set(LUNG_PARTS)
    part_metadata = {}
    meshes = {}

    def load_part(part):
        if part not in meshes:
            supplement = part in lung_files
            filename = lung_files[part] if supplement else f"isa_BP3D_4.0_obj_99/{part}.obj"
            data = (lung_archive if supplement else archive).read(filename)
            source = data.decode("utf-8")
            fields = dict(re.findall(r"^# ([^:\n]+?)[ \t]*:[ \t]*(.*?)$", source, re.M))
            if fields.get("Compatibility version") not in (["4.3"] if supplement else ["4.0", ""]):
                raise ValueError(f"Unexpected BodyParts3D version in {part}")
            mesh = trimesh.load(io.BytesIO(data), file_type="obj", force="mesh", process=True)
            # OBJ normal seams otherwise leave coincident but disconnected
            # vertices, preventing QEM from meeting the browser triangle budget.
            mesh.merge_vertices(merge_norm=True, merge_tex=True)
            mesh.update_faces(mesh.nondegenerate_faces())
            mesh.remove_unreferenced_vertices()
            if not np.isfinite(mesh.vertices).all() or not len(mesh.faces):
                raise ValueError(f"Invalid source mesh {part}")
            meshes[part] = mesh
            part_metadata[part] = {
                "file": filename,
                "version": "4.3" if supplement else "4.0",
                "archive": LUNG_ZIP if supplement else ARCHIVE,
                "sha256": sha(data),
                "fmaId": fields.get("Concept ID"),
                "representationId": fields.get("Representation ID"),
                "name": fields.get("English name"),
                "compatibilityVersionHeader": fields.get("Compatibility version"),
                "sourceBoundsMillimeters": rounded(mesh.bounds),
                "triangles": len(mesh.faces),
            }
        return meshes[part]

    skin = load_part("FJ2810")
    body_bounds = skin.bounds.copy()
    body_center = body_bounds.mean(axis=0)
    body_extent = float(np.ptp(body_bounds, axis=0).max())
    rotation = np.array([[1, 0, 0], [0, 0, 1], [0, -1, 0]], dtype=float)

    def normalize(vertices):
        return ((vertices - body_center) @ rotation.T) / body_extent

    selections = {}
    for key, system, index, concepts, budget, color in SPECS:
        parts = set().union(*(tables[index][concept]["parts"] for concept in concepts))
        selections[key] = parts
    selections["heart"] |= tables["isa"]["FMA13884"]["parts"]
    selections["lungs"] = set(LUNG_PARTS)
    # Every source triangle belongs to at most one exported asset. In particular,
    # embedded pulmonary/hepatic/cardiac vessels remain in their owning organ.
    standalone = set().union(*(parts for key, parts in selections.items() if not key.startswith("context-")))
    for key in ["context-skeleton", "context-muscles", "context-vessels"]:
        selections[key] -= standalone

    assets = {}
    picking = {
        "formatVersion": 1,
        "partFields": ["assetIndex", "name", "fmaId", "categoryIndex", "regionIndex", "center", "extent"],
        "rangeFields": ["firstTriangle", "triangleCount", "partId", "firstVertex", "vertexCount"],
        "assetIds": [spec[0] for spec in SPECS],
        "categories": ["unknown", "surface", "organ", "bone", "muscle", "artery", "vein"],
        "regions": ["unknown", "head", "trunk", "left-arm", "right-arm", "left-leg", "right-leg"],
        "assets": {}, "parts": {},
        "notes": {
            "en": "Names and FMA IDs are copied from source OBJ headers; null means the source did not identify that part. Categories use the official IS-A classes. Regions are approximate navigation hints inferred from names and broad source-coordinate zones, not anatomical boundaries. A long vessel can cross multiple regions. Ranges refer to the merged GLB's original triangle order; reordering indices invalidates them.",
            "fr": "Les noms et identifiants FMA proviennent des en-têtes OBJ sources ; null indique une partie non identifiée dans la source. Les catégories utilisent les classes IS-A officielles. Les régions sont des repères approximatifs de navigation déduits des noms et de grandes zones de coordonnées, pas des limites anatomiques. Un long vaisseau peut traverser plusieurs régions. Les plages suivent l’ordre original des triangles du GLB fusionné ; réordonner les indices les invalide.",
        },
    }

    def category_for(part, system):
        for category, concept in [("artery", "FMA50720"), ("vein", "FMA50723"), ("bone", "FMA5018"), ("muscle", "FMA5022"), ("muscle", "FMA85453")]:
            if part in tables["isa"][concept]["parts"]:
                return category
        return "surface" if system == "surface" else "organ" if system == "organs" else "unknown"

    for key, system, index, concepts, budget, color in SPECS:
        parts = sorted(selections[key])
        source_meshes = [load_part(part) for part in parts]
        combined = trimesh.util.concatenate(source_meshes)
        source_bounds = combined.bounds.copy()
        source_triangles = len(combined.faces)
        # Proportional per-part budgets retain even small source bones/vessels;
        # a single global collapse could erase disconnected anatomy entirely.
        fraction = min(1.0, budget / source_triangles)
        reduced = []
        for mesh in source_meshes:
            target = max(24, int(len(mesh.faces) * fraction))
            adapted = mesh.simplify_quadric_decimation(face_count=target) if target < len(mesh.faces) else mesh.copy()
            adapted.vertices = normalize(adapted.vertices)
            reduced.append(adapted)
        adapted = trimesh.util.concatenate(reduced)
        rgb = [int(color[i:i + 2], 16) for i in (1, 3, 5)]
        adapted.visual = trimesh.visual.TextureVisuals(material=trimesh.visual.material.PBRMaterial(
            name=f"Atlas explanatory {system} color", baseColorFactor=rgb + [255],
            metallicFactor=0, roughnessFactor=0.55, doubleSided=False,
        ))
        version = "4.3" if key == "lungs" else "4.0"
        license_info = LICENSE_43 if key == "lungs" else LICENSE_40
        adapted.metadata = {"assetKey": key, "system": system, "fmaIds": concepts, "sourcePartIds": parts,
                            "source": f"BodyParts3D {version}", "license": license_info["id"]}
        scene = trimesh.Scene()
        scene.add_geometry(adapted, node_name=key, geom_name=key)
        binary = scene.export(file_type="glb", include_normals=True)
        filename = key + ".glb"
        if args.metadata_only:
            if not (args.output / filename).exists() or (args.output / filename).read_bytes() != binary:
                raise ValueError(f"{filename} differs from the reproducible geometry; refusing to attach stale anatomical ranges")
        else:
            (args.output / filename).write_bytes(binary)
        positions, faces = glb_arrays(binary)
        assert np.array_equal(positions, adapted.vertices.astype(np.float32)), f"{key}: exported vertex order changed"
        assert np.array_equal(faces, adapted.faces), f"{key}: exported triangle order changed"
        ranges = []
        triangle_offset, vertex_offset = 0, 0
        for part, mesh in zip(parts, reduced):
            face_count, vertex_count = len(mesh.faces), len(mesh.vertices)
            part_faces = faces[triangle_offset:triangle_offset + face_count]
            assert np.array_equal(part_faces, mesh.faces + vertex_offset), f"{part}: triangle identity mismatch"
            assert part_faces.min() >= vertex_offset and part_faces.max() < vertex_offset + vertex_count
            part_positions = positions[vertex_offset:vertex_offset + vertex_count]
            part_bounds = np.array([part_positions.min(axis=0), part_positions.max(axis=0)], dtype=float)
            identity = part_metadata[part]
            category = category_for(part, system)
            region = approximate_region(identity["name"], identity["sourceBoundsMillimeters"], category)
            assert part not in picking["parts"], f"{part}: duplicate ownership"
            picking["parts"][part] = [
                picking["assetIds"].index(key), identity["name"] or None, identity["fmaId"] or None,
                picking["categories"].index(category), picking["regions"].index(region),
                np.mean(part_bounds, axis=0).round(8).tolist(), round(float(np.ptp(part_bounds, axis=0).max()), 8),
            ]
            ranges.append([triangle_offset, face_count, part, vertex_offset, vertex_count])
            triangle_offset += face_count
            vertex_offset += vertex_count
        assert triangle_offset == len(faces) and vertex_offset == len(positions)
        picking["assets"][key] = {"sha256": sha(binary), "triangleCount": len(faces), "vertexCount": len(positions), "ranges": ranges}
        # Bounds come from the exported float32 positions, rather than assuming
        # that simplification preserved extrema exactly.
        parsed = trimesh.load(io.BytesIO(binary), file_type="glb", force="scene")
        bounds = parsed.bounds
        extent = float(np.ptp(bounds, axis=0).max())
        assets[key] = {
            "file": filename, "center": rounded(bounds.mean(axis=0)), "extent": round(extent, 10),
            "normalizedBounds": rounded(bounds), "sourceBoundsMillimeters": rounded(source_bounds),
            "extentMeters": round(extent * body_extent / 1000, 10),
            "sourceExtentMeters": round(float(np.ptp(source_bounds, axis=0).max()) / 1000, 10),
            "system": system, "fmaIds": concepts,
            "version": version, "license": license_info,
            "names": [tables[index][concept]["name"] for concept in concepts],
            "partIds": parts, "sourceIndex": index, "sourceTriangles": source_triangles,
            "triangles": len(adapted.faces), "bytes": len(binary), "sha256": sha(binary),
            "route": "human" if key == "skin" else None if key.startswith("context-") else f"human/{key}",
        }
        if key == "heart":
            assets[key]["selectionNote"] = "Official 4.0 compound heart plus FMA13884/FJ2428 ventricular wall, whose generic IS-A identity is omitted by the compound heart's PART-OF mapping."
            assets[key]["additionalFmaIds"] = ["FMA13884"]
        if key == "lungs":
            assets[key]["selectionNote"] = "18 official 4.3 segmental pulmonary parenchyma meshes form the paired lung surface; the incomplete 4.0 bronchial/vascular compound is not used for this surface asset."
            assets[key]["sourceIndex"] = "4.3 version-stamped PART-OF mapping and primary object headers"
        print(f"{key}: {len(parts)} parts, {source_triangles:,} → {len(adapted.faces):,} triangles, "
              f"{len(binary):,} bytes, extent {assets[key]['extentMeters']:.6f} m", flush=True)

    # A reproducible point on the anterior skin over the middle of the left
    # radius. This is a surface locator, not an invented organ center.
    radius = load_part("FJ3277")
    reference = radius.bounds.mean(axis=0)
    distances = np.linalg.norm(skin.vertices[:, [0, 2]] - reference[[0, 2]], axis=1)
    candidates = np.flatnonzero(distances < 12)
    if not len(candidates):
        raise ValueError("Could not sample forearm skin")
    vertex = int(candidates[np.argmin(skin.vertices[candidates, 1])])
    anchor = {
        "bodyPosition": rounded(normalize(skin.vertices[vertex])),
        "bodyNormal": rounded(skin.vertex_normals[vertex] @ rotation.T),
        "sourcePositionMillimeters": rounded(skin.vertices[vertex]),
        "sourceVertexIndex": vertex, "sourcePartId": "FJ2810", "referencePartId": "FJ3277",
        "location": {"en": "Anterior skin over the middle of the left forearm", "fr": "Peau antérieure au milieu de l’avant-bras gauche"},
        "method": "Most anterior skin vertex within 12 mm in source X/Z of the left radius bounding-box center; locator only.",
    }
    vein = load_part("FJ2220")
    vein_vertex = int(np.argmin(np.linalg.norm(vein.vertices - vein.bounds.mean(axis=0), axis=1)))
    vein_anchor = {
        "bodyPosition": rounded(normalize(vein.vertices[vein_vertex])),
        "bodyNormal": rounded(vein.vertex_normals[vein_vertex] @ rotation.T),
        "sourcePositionMillimeters": rounded(vein.vertices[vein_vertex]),
        "sourceVertexIndex": vein_vertex, "sourcePartId": "FJ2220", "fmaId": "FMA13326",
        "location": {"en": "Surface of the left cephalic vein near its middle", "fr": "Surface de la veine céphalique gauche près de son milieu"},
        "method": "Source vein vertex nearest the full vein bounding-box center; entry locator for a schematic 4 cm segment.",
    }
    matrix = np.eye(4)
    matrix[:3, :3] = rotation / body_extent
    matrix[:3, 3] = -(rotation @ body_center) / body_extent
    manifest = {
        "formatVersion": 1,
        "versions": ["4.0", "4.3"],
        "source": {
            "project": "BodyParts3D", "version": "4.0", "archive": ARCHIVE,
            "archiveSha256": ARCHIVE_SHA256, "archiveUrl": URLS[ARCHIVE],
            "downloadUrl": URLS["download.html"], "releaseUrl": URLS["release_4.0_e.html"],
            "licenseUrl": URLS["license.html"], "license": "CC-BY-4.0",
            "licenseLegalcodeUrl": "https://creativecommons.org/licenses/by/4.0/legalcode.en",
            "attribution": ATTRIBUTION, "licensePageUpdated": "2025-02-27", "retrieved": "2026-09-08",
            "legacyHeaderLicense": "CC Attribution-Share Alike 2.1 Japan (historical OBJ headers; current official terms are CC BY 4.0)",
            "units": "millimeters", "sourceAxes": {"x": "patient left", "y": "posterior", "z": "superior"},
            "bodyBoundsMillimeters": rounded(body_bounds), "bodyCenterMillimeters": rounded(body_center),
            "bodyExtentMillimeters": round(body_extent, 7), "bodyExtentMeters": round(body_extent / 1000, 10),
            "supplements": [{"version": "4.3", "asset": "lungs", "sourceUrl": VIEWER, "mappingUrl": URLS["official-viewer-4.3-mapping.zip"], "downloadUrl": VIEWER + "download.cgi", "archiveSha256": sha((args.source / LUNG_ZIP).read_bytes()), "license": LICENSE_43}],
        },
        "transform": {
            "axes": {"x": "patient left", "y": "superior", "z": "anterior"},
            "matrixRows": rounded(matrix),
            "formula": "[(X-Cx), (Z-Cz), -(Y-Cy)] / H; source coordinates and H in millimeters",
            "bodyUnitMeters": round(body_extent / 1000, 10), "sharedAcrossEveryAsset": True,
        },
        "adaptations": ["Selected source parts using official FMA element-part mappings", "Welded duplicate vertices and removed degenerate triangles",
                        "Per-source-part quadric-error mesh reduction; merged each display asset", "One shared rigid rotation, translation and uniform unit conversion",
                        "Generated vertex normals and assigned illustrative colors; no per-organ relocation or scaling", "Omitted already-selected source parts from system context assets"],
        "limitations": {
            "en": "An anatomical reference reconstruction, not a patient scan or a diagnostic model. Meshes are simplified, colors are explanatory, and human anatomy varies. Millimeter coordinates describe this reference specimen; they are not population averages.",
            "fr": "Une reconstruction anatomique de référence, pas un examen de patient ni un modèle diagnostique. Les maillages sont simplifiés, les couleurs sont explicatives et l’anatomie humaine varie. Les coordonnées en millimètres décrivent ce spécimen de référence, pas des moyennes de population.",
        },
        "anchors": {"skinForearm": anchor, "veinSegment": vein_anchor},
        "assets": assets,
    }
    picking_bytes = (json.dumps(picking, ensure_ascii=False, separators=(",", ":")) + "\n").encode()
    (args.output / "parts.json").write_bytes(picking_bytes)
    if args.metadata_only:
        manifest = json.loads((args.output / "manifest.json").read_text())
    manifest["picking"] = {"file": "parts.json", "formatVersion": 1, "sha256": sha(picking_bytes), "bytes": len(picking_bytes), "parts": len(picking["parts"])}
    (args.output / "manifest.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n")
    provenance = {
        "sourceFiles": {filename: {"url": url, "sha256": sha((args.source / filename).read_bytes())} for filename, url in URLS.items()},
        "parts": dict(sorted(part_metadata.items())),
        "conversion": {"script": "scripts/convert-bodyparts3d.py", "requirements": "scripts/bodyparts3d-requirements.txt",
                       "trimeshVersion": trimesh.__version__, "numpyVersion": np.__version__},
        "supplement43": {"url": VIEWER + "download.cgi", "method": "POST", "request": json.loads((args.source / "official-supplement-lungs-request.json").read_text()), "sha256": sha((args.source / LUNG_ZIP).read_bytes()), "license": LICENSE_43},
    }
    if not args.metadata_only:
        (args.output / "provenance.json").write_text(json.dumps(provenance, indent=2, ensure_ascii=False) + "\n")
    print(f"Total: {sum(a['bytes'] for a in assets.values()):,} GLB bytes; {sum(a['triangles'] for a in assets.values()):,} triangles", flush=True)
    print(f"Picking: {len(picking['parts']):,} identified source parts, {len(picking_bytes):,} JSON bytes; GLB triangle and vertex order checked", flush=True)
    print("Forearm anchor:", anchor, flush=True)


if __name__ == "__main__":
    main()
