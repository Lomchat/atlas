import * as T from "three";
import { macroFactor } from "./physicalScale";
import { molecules } from "./data";
import type { MoleculeId } from "./data";
import type { Kind } from "./continuum";

export type Site = [number, number, number];
export type Constituent = {
  id: string;
  parent: string | null;
  kind: Kind;
  position: T.Vector3;
  radius: number;
  openRadius: number;
  color: string;
  children: boolean;
};
const vec = () => new T.Vector3();
const smooth = (min: number, max: number, x: number) =>
  T.MathUtils.smoothstep(x, min, max);
const hash = (x: number, y: number, z: number, salt: number) => {
  let h =
    Math.imul(x, 73856093) ^
    Math.imul(y, 19349663) ^
    Math.imul(z, 83492791) ^
    salt;
  h = Math.imul(h ^ (h >>> 16), 2246822519);
  h = Math.imul(h ^ (h >>> 13), 3266489917);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
export function sitePosition(site: Site, id: MoleculeId): T.Vector3 {
  if (site.every((n) => n === 0)) return vec();
  const spacing = id === "water" ? 8 : 14;
  return new T.Vector3(...site)
    .add(
      new T.Vector3(
        (hash(...site, 17) - 0.5) * 0.75,
        (hash(...site, 31) - 0.5) * 0.75,
        (hash(...site, 73) - 0.5) * 0.75,
      ),
    )
    .multiplyScalar(spacing);
}
export function siteRotation(site: Site): T.Quaternion {
  if (site.every((n) => n === 0)) return new T.Quaternion();
  return new T.Quaternion().setFromEuler(
    new T.Euler(
      hash(...site, 101) * Math.PI * 2,
      hash(...site, 103) * Math.PI * 2,
      hash(...site, 107) * Math.PI * 2,
    ),
  );
}
export const gasBubbles = [
  { center: vec(), radius: 126 },
  ...Array.from({ length: 46 }, (_, i) => ({
    center: new T.Vector3(
      Math.cos(i * 2.399) * (0.2 + (i % 4) * 0.15),
      -1.01 + (i / 46) * 1.53,
      Math.sin(i * 2.399) * (0.28 + (i % 3) * 0.14),
    ).multiplyScalar(900),
    radius: (0.022 + (i % 5) * 0.012) * 900,
  })),
];
export function insideMatter(point: T.Vector3, id: MoleculeId) {
  const p = point.clone().divideScalar(macroFactor(id));
  if (id === "co2")
    return gasBubbles.some(
      (b) => p.distanceToSquared(b.center) < (b.radius - 3) ** 2,
    );
  if (id === "water") {
    const radius = 690 + ((p.y + 990) / 1540) * 106;
    return p.y > -990 && p.y < 549 && p.x * p.x + p.z * p.z < (radius - 6) ** 2;
  }
  const radius = p.y < 360 ? 780 : Math.max(260, 780 - (p.y - 360) * 0.88);
  return p.y > -930 && p.y < 1120 && p.x * p.x + p.z * p.z < radius ** 2;
}

/** A deterministic, spatially streamed volume. Cells never depend on the camera.
 * Far dots represent occupied volumes, not individual molecules. At molecular
 * distances these give way to bonded atoms, then each nearby atom's contents.
 */
export function matterVolume(id: MoleculeId) {
  const group = new T.Group();
  const origin = vec();
  const macroScale = macroFactor(id);
  const spacing = id === "water" ? 8 : 14;
  const sphere = new T.SphereGeometry(1, 16, 12);
  const cylinder = new T.CylinderGeometry(1, 1, 1, 8);
  const capacity = 4096;
  type Batch = {
    mesh: T.InstancedMesh;
    alpha: T.InstancedBufferAttribute;
    count: number;
    hits: { site: Site; node: string }[];
  };
  const batches = new Map<string, Batch>();
  function batch(color: string, bond = false, translucent = true) {
    const key = color + (bond ? "bond" : "") + (translucent ? "fade" : "solid");
    if (batches.has(key)) return batches.get(key)!;
    const geometry = (bond ? cylinder : sphere).clone();
    const alpha = new T.InstancedBufferAttribute(new Float32Array(capacity), 1);
    geometry.setAttribute("instanceAlpha", alpha);
    const material = new T.MeshStandardMaterial({
      color,
      roughness: 0.32,
      metalness: 0.16,
      transparent: translucent,
      depthWrite: !translucent,
    });
    material.onBeforeCompile = (shader) => {
      shader.vertexShader =
        "attribute float instanceAlpha; varying float vInstanceAlpha;\n" +
        shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nvInstanceAlpha = instanceAlpha;",
      );
      shader.fragmentShader =
        "varying float vInstanceAlpha;\n" + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <color_fragment>",
        "#include <color_fragment>\ndiffuseColor.a *= vInstanceAlpha;",
      );
    };
    const mesh = new T.InstancedMesh(geometry, material, capacity);
    mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
    mesh.frustumCulled = false;
    mesh.count = 0;
    group.add(mesh);
    const entry = { mesh, alpha, count: 0, hits: [] };
    batches.set(key, entry);
    return entry;
  }
  const pointGeo = new T.BufferGeometry();
  const pointPositions = new Float32Array(12000 * 3);
  pointGeo.setAttribute("position", new T.BufferAttribute(pointPositions, 3));
  const pointMaterial = new T.PointsMaterial({
    color: "#84c8e8",
    size: 2.2,
    sizeAttenuation: false,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
  });
  pointMaterial.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <clipping_planes_fragment>",
      "#include <clipping_planes_fragment>\nif(length(gl_PointCoord-vec2(.5))>.5) discard;",
    );
  };
  const dots = new T.Points(pointGeo, pointMaterial);
  dots.frustumCulled = false;
  group.add(dots);
  let templates: Constituent[] = [];
  let cells: { site: Site; position: T.Vector3; rotation: T.Quaternion }[] = [];
  let lastKey = "";
  const dummy = new T.Object3D();
  const identityRotation = new T.Quaternion();
  const p = vec(),
    q = vec(),
    direction = vec();
  let shown = 0;
  let pickDistance = Infinity;
  const put = (
    b: Batch,
    position: T.Vector3,
    radius: number,
    opacity: number,
    site: Site,
    node: string,
    rotation?: T.Quaternion,
    length?: number,
  ) => {
    if (b.count >= capacity || opacity < 0.008) return;
    dummy.position.copy(position);
    dummy.quaternion.copy(rotation || identityRotation);
    dummy.scale.set(radius, length || radius, radius);
    dummy.updateMatrix();
    b.mesh.setMatrixAt(b.count, dummy.matrix);
    b.alpha.setX(b.count, opacity);
    b.hits[b.count] = { site, node };
    b.count++;
  };
  const nearest = (localPoint: T.Vector3): Site | null => {
    const point = localPoint.clone().add(origin);
    const home = point.clone().divideScalar(spacing).round();
    let best: Site | null = null,
      distance = Infinity;
    for (let x = -1; x <= 1; x++)
      for (let y = -1; y <= 1; y++)
        for (let z = -1; z <= 1; z++) {
          const site: Site = [home.x + x, home.y + y, home.z + z];
          const pos = sitePosition(site, id),
            d = pos.distanceToSquared(point);
          if (d < distance && insideMatter(pos, id)) {
            best = site;
            distance = d;
          }
        }
    return best;
  };
  function update(
    camera: T.PerspectiveCamera,
    target: T.Vector3,
    halfView: number,
    detailUnit: number,
    height: number,
    active: Site,
    force = false,
  ) {
    const stride = Math.max(
      1,
      2 **
        Math.ceil(Math.log2(Math.max(1, halfView / Math.max(65, spacing * 4)))),
    );
    const step = spacing * stride;
    const center = target.clone().add(origin).divideScalar(step).round();
    const key = `${center.toArray()}:${stride}`;
    if (key !== lastKey || force) {
      lastKey = key;
      cells = [];
      const extent = stride === 1 ? 5 : 7;
      for (let x = -extent; x <= extent; x++)
        for (let y = -extent; y <= extent; y++)
          for (let z = -extent; z <= extent; z++) {
            if (x * x + y * y + z * z > extent * extent) continue;
            const site: Site = [
              (center.x + x) * stride,
              (center.y + y) * stride,
              (center.z + z) * stride,
            ];
            const position = sitePosition(site, id);
            if (insideMatter(position, id))
              cells.push({
                site,
                position: position.sub(origin),
                rotation: siteRotation(site),
              });
          }
    }
    batches.forEach((b) => {
      b.count = 0;
    });
    let pointCount = 0;
    shown = 0;
    const molecularAlpha = 1 - smooth(26, 65, halfView);
    const densityAlpha =
      smooth(20, 60, halfView) *
      (1 - smooth(700 * macroScale, 1800 * macroScale, halfView));
    pickDistance =
      camera.position.distanceTo(target) * 0.85 +
      Math.max(halfView * 2.8, 0.15) * 0.85;
    const projection =
      height / Math.tan(T.MathUtils.degToRad(camera.fov / 2)) / detailUnit;
    for (const cell of cells) {
      if (pointCount < 12000 && densityAlpha > 0.001) {
        pointPositions.set(cell.position.toArray(), pointCount++ * 3);
      }
      if (
        molecularAlpha < 0.005 ||
        stride > 1 ||
        cell.site.every((n, i) => n === active[i])
      )
        continue;
      // A sphere test avoids building contents of distant / off-screen molecules.
      p.copy(cell.position).project(camera);
      if (p.z > 1 || Math.abs(p.x) > 1.4 || Math.abs(p.y) > 1.4) continue;
      const edgeAlpha =
        1 -
        smooth(spacing * 3.5, spacing * 5, cell.position.distanceTo(target));
      if (edgeAlpha < 0.01) continue;
      shown++;
      const openings = new Map<string, { open: number; reveal: number }>();
      for (const n of templates) {
        const parent = n.parent ? openings.get(n.parent) : undefined;
        const reveal = n.parent
          ? parent
            ? parent.reveal * smooth(0.08, 0.65, parent.open)
            : 0
          : molecularAlpha * edgeAlpha;
        if (reveal < 0.008) continue;
        p.copy(n.position).applyQuaternion(cell.rotation).add(cell.position);
        const ratio =
          (projection * n.radius) /
          Math.max(1e-12, camera.position.distanceTo(p));
        const atom = n.kind === "atom",
          nucleus = n.kind === "nucleus";
        const open = n.children
          ? smooth(
              atom
                ? 0.7
                : nucleus
                  ? 0.6
                  : n.parent &&
                      templates.find((p) => p.id === n.parent)?.radius ===
                        n.radius
                    ? 1.1
                    : 0.45,
              atom
                ? 1.25
                : nucleus
                  ? 1.05
                  : n.parent &&
                      templates.find((p) => p.id === n.parent)?.radius ===
                        n.radius
                    ? 1.6
                    : 0.85,
              ratio,
            )
          : 0;
        openings.set(n.id, { open, reveal });
        const alpha = reveal * (1 - smooth(0.05, 0.7, open) * 0.975);
        put(
          batch(n.color, false, alpha < 0.98),
          p,
          T.MathUtils.lerp(n.radius, n.openRadius, open),
          alpha,
          cell.site,
          n.id,
        );
      }
      const m = molecules[id];
      for (const [a, b, order] of m.bonds) {
        const alpha =
          molecularAlpha *
          edgeAlpha *
          (1 -
            Math.max(
              openings.get(`atom-${a}`)?.open || 0,
              openings.get(`atom-${b}`)?.open || 0,
            ));
        if (alpha < 0.01) continue;
        p.set(...m.atoms[a].pos)
          .applyQuaternion(cell.rotation)
          .add(cell.position);
        q.set(...m.atoms[b].pos)
          .applyQuaternion(cell.rotation)
          .add(cell.position);
        direction.copy(q).sub(p);
        const length = direction.length();
        const rotation = new T.Quaternion().setFromUnitVectors(
          new T.Vector3(0, 1, 0),
          direction.normalize(),
        );
        p.add(q).multiplyScalar(0.5);
        for (let j = 0; j < order; j++) {
          q.set(0, 0, (j - (order - 1) / 2) * 0.32)
            .applyQuaternion(cell.rotation)
            .add(p);
          put(
            batch("#8993a4", true, alpha < 0.98),
            q,
            0.105,
            alpha,
            cell.site,
            "molecule",
            rotation,
            length,
          );
        }
      }
    }
    pointGeo.setDrawRange(0, pointCount);
    pointGeo.attributes.position.needsUpdate = true;
    dots.visible = densityAlpha > 0.001;
    pointMaterial.opacity = densityAlpha * 0.58;
    batches.forEach((b) => {
      b.mesh.count = b.count;
      b.mesh.visible = b.count > 0;
      b.mesh.instanceMatrix.needsUpdate = true;
      // Ray bounds must follow streamed cells, including after moving to a
      // distant region. InstancedMesh otherwise caches the first region forever.
      b.mesh.boundingSphere = null;
      b.alpha.needsUpdate = true;
    });
  }
  return {
    group,
    nearest,
    setOrigin(value: T.Vector3) {
      origin.copy(value);
      lastKey = "";
    },
    update,
    setTemplates(value: Constituent[]) {
      templates = value;
    },
    get count() {
      return shown;
    },
    get cells() {
      return cells;
    },
    get instanceCount() {
      return [...batches.values()].reduce((n, b) => n + b.count, 0);
    },
    hit(raycaster: T.Raycaster) {
      const hits = raycaster.intersectObjects(
        [...batches.values()].filter((b) => b.count > 0).map((b) => b.mesh),
      );
      for (const hit of hits) {
        const b = [...batches.values()].find((b) => b.mesh === hit.object)!;
        if (hit.distance > pickDistance) continue;
        if (hit.instanceId === undefined || b.alpha.getX(hit.instanceId) < 0.15)
          continue;
        return { ...b.hits[hit.instanceId], point: hit.point };
      }
      return null;
    },
    volumeHit(localRay: T.Ray, localTarget: T.Vector3) {
      // Work in vessel units for bounded ray marching, then return render coordinates.
      const ray = new T.Ray(
        localRay.origin.clone().add(origin).divideScalar(macroScale),
        localRay.direction,
      );
      const target = localTarget.clone().add(origin).divideScalar(macroScale);
      const local = (p: T.Vector3) => p.multiplyScalar(macroScale).sub(origin);
      const inside = (p: T.Vector3) =>
        insideMatter(p.clone().multiplyScalar(macroScale), id);
      // Project onto the current exploration plane first, then search along the
      // ray through the vessel. This also works after orbiting or from inside.
      const plane = new T.Plane().setFromNormalAndCoplanarPoint(
        ray.direction,
        target,
      );
      const hit = ray.intersectPlane(plane, vec());
      if (hit && inside(hit)) return local(hit);
      if (id === "co2") {
        let best: T.Vector3 | null = null;
        for (const bubble of gasBubbles) {
          const point = ray.intersectSphere(
            new T.Sphere(bubble.center, bubble.radius - 4),
            vec(),
          );
          if (
            point &&
            (!best ||
              ray.origin.distanceToSquared(point) <
                ray.origin.distanceToSquared(best))
          )
            best = point.addScaledVector(ray.direction, 4);
        }
        return best && local(best);
      }
      const sphereHit = ray.intersectSphere(new T.Sphere(vec(), 1600), vec());
      const start = sphereHit
        ? Math.max(0, ray.origin.distanceTo(sphereHit))
        : 0;
      for (let d = start; d < start + 3200; d += 12) {
        const point = ray.at(d, vec());
        if (inside(point))
          return local(point.addScaledVector(ray.direction, 8));
      }
      return null;
    },
    dispose() {
      batches.forEach((b) => {
        b.mesh.geometry.dispose();
        (b.mesh.material as T.Material).dispose();
        b.mesh.dispose();
      });
      sphere.dispose();
      cylinder.dispose();
      pointGeo.dispose();
      pointMaterial.dispose();
    },
  };
}
