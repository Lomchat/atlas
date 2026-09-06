import { t } from "./i18n";
import * as T from "three";
import { molecules, elements } from "./data";
import type { MoleculeId } from "./data";

/** Shared object palette: the flask is colored glass, not colored methane. */
export const objectPalette = {
  water: { body: "#258ec9", edge: "#96dfff", accent: "#2479b5" },
  co2: { body: "#249bae", edge: "#b0f0f6", accent: "#299baf" },
  methane: { body: "#254bca", edge: "#7fafff", accent: "#b97447" },
};

/** A local-coordinate model shared by the gallery and the continuous scene. */
export function macroModel(id: MoleculeId, portion = false) {
  let updateLanguage = () => {};
  const group = new T.Group(),
    materials = new Set<T.Material>(),
    geometries = new Set<T.BufferGeometry>(),
    textures = new Set<T.Texture>();
  const palette = objectPalette[id];
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
  const surface = (
    color: string,
    opacity = 1,
    metalness = 0.15,
    roughness = 0.24,
  ) =>
    new T.MeshPhysicalMaterial({
      color,
      opacity,
      metalness,
      roughness,
      transparent: true,
      depthWrite: opacity === 1,
      envMapIntensity: 0.45,
      clearcoat: 0.65,
      clearcoatRoughness: 0.16,
    });
  // A scale-independent optical edge keeps clear vessels readable at both
  // gallery scale and world scale. Gas interiors remain transparent.
  const optical = (color: string, edge: string, density: number) =>
    new T.ShaderMaterial({
      uniforms: {
        tint: { value: new T.Color(color) },
        edge: { value: new T.Color(edge) },
        density: { value: density },
        opacity: { value: 1 },
      },
      vertexShader: `varying vec3 vNormal; varying vec3 vEye;
      void main() { vec4 p = modelViewMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal); vEye = -p.xyz;
        gl_Position = projectionMatrix * p; }`,
      fragmentShader: `uniform vec3 tint; uniform vec3 edge; uniform float density;
      uniform float opacity; varying vec3 vNormal; varying vec3 vEye;
      void main() { float rim = pow(1.0 - abs(dot(normalize(vNormal), normalize(vEye))), 2.6);
        gl_FragColor = vec4(mix(tint, edge, rim * 0.7), (density + rim * (0.82-density)) * opacity);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
      transparent: true,
      depthWrite: false,
      side: T.DoubleSide,
      forceSinglePass: true,
    });
  const rim = surface(palette.edge, 0.64, 0.25, 0.16);
  const ring = (
    r: number,
    y: number,
    material: T.Material = rim,
    thickness = 0.018,
  ) => {
    const mesh = add(new T.TorusGeometry(r, thickness, 12, 96), material);
    mesh.rotation.x = Math.PI / 2;
    mesh.position.y = y;
    return mesh;
  };
  const lathe = (profile: number[][], material: T.Material) =>
    add(
      new T.LatheGeometry(
        profile.map(([r, y]) => new T.Vector2(r, y)),
        96,
      ),
      material,
    );

  if (portion) {
    add(
      new T.SphereGeometry(1, 64, 40),
      optical(palette.body, palette.edge, id === "water" ? 0.16 : 0.035),
    );
    if (id !== "co2") {
      const boundary = surface(palette.edge, 0.26);
      for (let axis = 0; axis < 3; axis++) {
        const mesh = add(new T.TorusGeometry(1.005, 0.002, 6, 96), boundary);
        if (axis === 1) mesh.rotation.x = Math.PI / 2;
        if (axis === 2) mesh.rotation.y = Math.PI / 2;
      }
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
    const geo = new T.BufferGeometry();
    geo.setAttribute("position", new T.BufferAttribute(specks, 3));
    const mat = new T.PointsMaterial({
      color: palette.edge,
      size: 1.5,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
    });
    group.add(new T.Points(geo, mat));
    geometries.add(geo);
    materials.add(mat);
  } else {
    if (id === "methane") {
      lathe(
        [
          [0, -1.2],
          [0.73, -1.2],
          [0.83, -1.19],
          [0.9, -1.15],
          [0.93, -1.08],
          [0.93, 0.35],
          [0.92, 0.47],
          [0.88, 0.59],
          [0.81, 0.7],
          [0.68, 0.82],
          [0.5, 0.94],
          [0.38, 1.04],
          [0.35, 1.12],
          [0.35, 1.31],
          [0.31, 1.31],
          [0.31, 1.12],
          [0.34, 1.04],
          [0.46, 0.94],
          [0.64, 0.82],
          [0.77, 0.7],
          [0.84, 0.59],
          [0.88, 0.47],
          [0.89, 0.35],
          [0.89, -1.04],
          [0.85, -1.1],
          [0, -1.1],
        ],
        optical(palette.body, palette.edge, 0.32),
      );
      ring(0.87, -1.13, rim, 0.035);
      ring(0.35, 1.26, surface(palette.accent, 1, 0.65));
      const copper = surface(palette.accent, 1, 0.65, 0.29);
      lathe(
        [
          [0, 1.29],
          [0.37, 1.29],
          [0.4, 1.31],
          [0.405, 1.43],
          [0.39, 1.47],
          [0, 1.47],
        ],
        copper,
      );
      ring(0.39, 1.32, copper, 0.018);
      // Fine machined ribs make the stopper readable when rotating the bottle.
      const ribGeo = new T.CylinderGeometry(0.009, 0.009, 0.105, 5);
      for (let i = 0; i < 48; i++) {
        const a = (i / 48) * Math.PI * 2;
        const rib = add(ribGeo, copper);
        rib.position.set(Math.sin(a) * 0.405, 1.38, Math.cos(a) * 0.405);
      }
      const canvas = document.createElement("canvas");
      canvas.width = 1024;
      canvas.height = 512;
      const ctx = canvas.getContext("2d")!;
      const paintLabel = () => {
        ctx.fillStyle = "#f0e7d5";
        ctx.fillRect(0, 0, 1024, 512);
        ctx.fillStyle = "#b97447";
        ctx.fillRect(0, 0, 1024, 16);
        ctx.fillRect(0, 496, 1024, 16);
        ctx.fillStyle = "#26436d";
        ctx.textAlign = "center";
        ctx.font = "500 29px sans-serif";
        ctx.fillText(t("MATTER  /  COLLECTION"), 512, 83);
        ctx.font = "600 154px sans-serif";
        ctx.fillText("CH₄", 512, 252);
        ctx.font = "600 42px sans-serif";
        ctx.fillText(t("METHANE"), 512, 328);
        ctx.fillStyle = "#b97447";
        ctx.fillRect(434, 367, 156, 3);
        ctx.fillStyle = "#53647a";
        ctx.font = "28px sans-serif";
        ctx.fillText(t("GAS • COLORLESS"), 512, 433);
      };
      paintLabel();
      const texture = new T.CanvasTexture(canvas);
      texture.colorSpace = T.SRGBColorSpace;
      texture.anisotropy = 4;
      updateLanguage = () => {
        paintLabel();
        texture.needsUpdate = true;
      };
      textures.add(texture);
      // Printed ink retains its contrast under the bright studio lights.
      const labelMat = new T.MeshBasicMaterial({
        map: texture,
        toneMapped: false,
      });
      const label = add(
        new T.CylinderGeometry(0.942, 0.942, 0.84, 64, 1, true, -1.1, 2.2),
        labelMat,
      );
      label.position.y = -0.43;
      // Discreet graduation marks on the opposite side of the laboratory flask.
      const markings = surface("#b6ceff", 0.7, 0, 0.6);
      for (let i = 0; i < 7; i++) {
        const mark = add(
          new T.CylinderGeometry(
            0.944,
            0.944,
            0.007,
            12,
            1,
            true,
            2.5,
            i % 2 ? 0.1 : 0.19,
          ),
          markings,
        );
        mark.position.y = -0.72 + i * 0.15;
      }
    } else {
      const glass = optical(palette.body, palette.edge, 0.06);
      // Closed, rounded wall profile: thick foot, thin walls and a rolled lip.
      lathe(
        [
          [0, -1.25],
          [0.7, -1.25],
          [0.77, -1.23],
          [0.8, -1.19],
          [0.97, 1.18],
          [0.976, 1.215],
          [0.968, 1.234],
          [0.95, 1.24],
          [0.932, 1.23],
          [0.926, 1.212],
          [0.923, 1.18],
          [0.763, -1.08],
          [0.74, -1.12],
          [0, -1.12],
        ],
        glass,
      );
      ring(0.951, 1.218, rim, 0.022);
      ring(0.765, -1.205, rim, 0.035);
      const waterMat = surface(
        id === "water" ? "#258bc3" : "#3aafc3",
        0.36,
        0.02,
        0.15,
      );
      waterMat.side = T.DoubleSide;
      const body = add(
        new T.CylinderGeometry(0.886, 0.766, 1.72, 96, 1, true),
        waterMat,
      );
      body.position.y = -0.25;
      const top = add(
        new T.CircleGeometry(0.885, 96),
        surface(palette.body, 0.49, 0.02, 0.13),
      );
      top.rotation.x = -Math.PI / 2;
      top.position.y = 0.61;
      top.material.side = T.DoubleSide;
      ring(0.885, 0.613, surface(palette.edge, 0.54, 0.15, 0.13), 0.009);
      // Narrow reflections follow the vessel taper, rather than flat white fills.
      const highlight = surface("#d8f3ff", 0.23, 0, 0.18);
      for (const a of [-0.74, 2.25]) {
        const stripe = add(
          new T.CylinderGeometry(0.958, 0.795, 2.2, 10, 1, true, a, 0.028),
          highlight,
        );
        stripe.position.y = -0.01;
      }
      if (id === "co2") {
        const bubbleGeo = new T.SphereGeometry(1, 20, 16);
        const bubbleMat = optical("#a0dbe9", "#e0fbff", 0.035);
        for (let i = 0; i < 46; i++) {
          const a = i * 2.399,
            radius = 0.022 + (i % 5) * 0.012;
          const mesh = add(bubbleGeo, bubbleMat);
          mesh.scale.setScalar(radius);
          mesh.position.set(
            Math.cos(a) * (0.2 + (i % 4) * 0.15),
            -1.01 + (i / 46) * 1.53,
            Math.sin(a) * (0.28 + (i % 3) * 0.14),
          );
        }
      }
    }
    // A ceramic coaster with a colored enamel edge grounds the transparent object.
    const ceramic = surface(
      id === "methane" ? "#172b51" : "#192e40",
      1,
      0.05,
      0.62,
    );
    ceramic.clearcoat = 0.12;
    ceramic.envMapIntensity = 0.15;
    lathe(
      [
        [0, -1.39],
        [1.1, -1.39],
        [1.17, -1.375],
        [1.2, -1.34],
        [1.19, -1.3],
        [1.15, -1.28],
        [0, -1.28],
      ],
      ceramic,
    );
    ring(1.18, -1.325, surface(palette.accent, 1, 0.45, 0.23), 0.022);
    ring(1.06, -1.278, surface(palette.accent, 0.55, 0.3, 0.3), 0.006);
  }
  const opacities = new Map<T.Material, number>();
  materials.forEach((m) => {
    opacities.set(m, m.opacity);
    m.transparent = true;
  });
  return {
    group,
    updateLanguage: () => updateLanguage(),
    fade(alpha: number) {
      group.visible = alpha > 0.002;
      materials.forEach((m) => {
        m.opacity = opacities.get(m)! * alpha;
        if (m instanceof T.ShaderMaterial) m.uniforms.opacity.value = alpha;
        // Opaque labels and coasters must not occlude the next zoom layer.
        m.depthWrite =
          opacities.get(m) === 1 &&
          !(m instanceof T.ShaderMaterial) &&
          alpha > 0.98;
      });
    },
    dispose() {
      materials.forEach((m) => m.dispose());
      geometries.forEach((g) => g.dispose());
      textures.forEach((t) => t.dispose());
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
  const trailGeo = new T.BufferGeometry();
  trailGeo.setAttribute(
    "position",
    new T.BufferAttribute(new Float32Array(30 * 6), 3),
  );
  const trailMat = new T.LineBasicMaterial({
    color: "#c7d7ea",
    transparent: true,
    opacity: 0.45,
  });
  const trails = new T.LineSegments(trailGeo, trailMat);
  group.add(trails);
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
        const t = reduced ? phase * 0.6 : time * 2.3;
        const bounce = (x: number) =>
          22 - Math.abs(((((x + 66) % 88) + 88) % 88) - 44);
        const attr = trailGeo.getAttribute("position") as T.BufferAttribute;
        attr.setXYZ(
          seed * 2,
          bounce(home.x + (t - 0.65) * (1 + (seed % 4))),
          bounce(home.y + (t - 0.65) * ((seed % 3) - 1) * 2),
          bounce(home.z + (t - 0.65) * ((seed % 5) - 2)),
        );
        g.position.set(
          bounce(home.x + t * (1 + (seed % 4))),
          bounce(home.y + t * ((seed % 3) - 1) * 2),
          bounce(home.z + t * ((seed % 5) - 2)),
        );
        attr.setXYZ(seed * 2 + 1, g.position.x, g.position.y, g.position.z);
      } else if (interaction === "cohesion" && phase > 0) {
        const t = reduced ? phase : time;
        g.position.add(
          new T.Vector3(
            Math.sin(t * 0.8 + seed) * 1.3,
            Math.cos(t * 0.7 + seed) * 1.3,
            0,
          ),
        );
      }
    });
    trails.visible = interaction === "motion" && phase > 0;
    if (trails.visible) {
      (trailGeo.getAttribute("position") as T.BufferAttribute).needsUpdate =
        true;
      trailGeo.computeBoundingSphere();
      trailMat.opacity = alpha * 0.5;
    }
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
      linkMat.opacity =
        alpha * (reduced ? 0.7 : 0.5 + 0.25 * Math.sin(time * 2.2));
    }
    box.visible = interaction === "motion" && phase === 2;
    boxMat.opacity =
      alpha *
      (entries.some(
        (e) =>
          Math.max(
            Math.abs(e.group.position.x),
            Math.abs(e.group.position.y),
            Math.abs(e.group.position.z),
          ) > 20.5,
      )
        ? 0.6
        : 0.25);
  }
  return {
    group,
    update,
    dispose() {
      sphere.dispose();
      cylinder.dispose();
      Object.values(mats).forEach((m) => m.dispose());
      bond.dispose();
      trailGeo.dispose();
      trailMat.dispose();
      linkGeo.dispose();
      linkMat.dispose();
      boxGeo.dispose();
      boxMat.dispose();
    },
  };
}
