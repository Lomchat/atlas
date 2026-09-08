import * as T from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import {
  createQuartzGrain,
  createQuartzNetwork,
  createCelluloseMicrofibril,
  createCelluloseChain,
} from "./mineralModels";

/** Procedural teaching models. Shapes are idealised, not medical imaging.
 * All dimensions below are local drawing coordinates. The enclosing atlas owns
 * the physical calibration; this factory normalises the longest dimension to 1.
 * There are deliberately no embedded words or language-dependent resources. */
export type WorldModel = {
  group: T.Group;
  ready?: Promise<void>;
  update: (time: number, opened?: number) => void;
  dispose: () => void;
};

type Point = [number, number, number];
const TAU = Math.PI * 2;
const palette = {
  red: "#df4d66",
  darkRed: "#982d4d",
  blue: "#609de0",
  violet: "#a487df",
  gold: "#edbb68",
  teal: "#6cc8bd",
  green: "#68b37b",
  cream: "#ead8bb",
  oxygen: "#e96572",
  carbon: "#718397",
  hydrogen: "#e7f2f4",
  nitrogen: "#6993ee",
};

/** Deterministic positions keep landmarks still while the camera moves. */
export function createWorldModel(
  kind: string,
  color?: string,
  seed = 1,
  atomic?: { atomicNumber?: number; massNumber?: number; charge?: number },
): WorldModel {
  switch (kind) {
    case "quartz":
      return createQuartzGrain(seed);
    case "crystalLattice":
      return createQuartzNetwork();
    case "celluloseMicrofibril":
      return createCelluloseMicrofibril();
    case "cellulose":
      return createCelluloseChain();
  }
  const group = new T.Group();
  group.name = `world-model:${kind}`;
  const model = new T.Group();
  group.add(model);
  const geometries = new Set<T.BufferGeometry>();
  const materials = new Set<T.Material>();
  const cache = new Map<string, T.MeshStandardMaterial>();
  const animated: Array<(time: number) => void> = [];
  const shells: Array<{ material: T.Material; opacity: number }> = [];
  let randomState = seed | 0 || 1;
  const rand = () => {
    randomState = (Math.imul(randomState, 1664525) + 1013904223) | 0;
    return (randomState >>> 0) / 4294967296;
  };
  const mat = (tint: string, opacity = 1, roughness = 0.4) => {
    const key = `${tint}:${opacity}:${roughness}`;
    let material = cache.get(key);
    if (!material) {
      material = new T.MeshStandardMaterial({
        color: tint,
        roughness,
        metalness: 0.035,
        transparent: opacity < 1,
        opacity,
        depthWrite: opacity >= 1,
        side: opacity < 1 ? T.DoubleSide : T.FrontSide,
      });
      materials.add(material);
      cache.set(key, material);
    }
    return material;
  };
  const add = (
    geometry: T.BufferGeometry,
    material: T.Material,
    parent: T.Object3D = model,
  ) => {
    geometries.add(geometry);
    materials.add(material);
    const mesh = new T.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const sphereGeometry = new T.SphereGeometry(1, 24, 16);
  geometries.add(sphereGeometry);
  const ball = (
    p: Point,
    scale: number | Point,
    tint: string | T.Material,
    parent: T.Object3D = model,
  ) => {
    const mesh = add(
      sphereGeometry,
      typeof tint === "string" ? mat(tint) : tint,
      parent,
    );
    mesh.position.set(...p);
    if (typeof scale === "number") mesh.scale.setScalar(scale);
    else mesh.scale.set(...scale);
    return mesh;
  };
  const rod = (
    a: Point,
    b: Point,
    radius: number,
    tint: string,
    parent: T.Object3D = model,
    endRadius = radius,
  ) => {
    const start = new T.Vector3(...a),
      end = new T.Vector3(...b);
    const mesh = add(
      new T.CylinderGeometry(endRadius, radius, start.distanceTo(end), 12),
      mat(tint),
      parent,
    );
    mesh.position.copy(start).add(end).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(
      new T.Vector3(0, 1, 0),
      end.sub(start).normalize(),
    );
    return mesh;
  };
  const tube = (
    points: Point[],
    radius: number,
    tint: string | T.Material,
    parent: T.Object3D = model,
    closed = false,
  ) =>
    add(
      new T.TubeGeometry(
        new T.CatmullRomCurve3(
          points.map((p) => new T.Vector3(...p)),
          closed,
        ),
        Math.max(24, points.length * 5),
        radius,
        8,
        closed,
      ),
      typeof tint === "string" ? mat(tint) : tint,
      parent,
    );
  const ring = (
    radius: number,
    thickness: number,
    tint: string | T.Material,
    p: Point = [0, 0, 0],
    parent: T.Object3D = model,
  ) => {
    const mesh = add(
      new T.TorusGeometry(radius, thickness, 8, 48),
      typeof tint === "string" ? mat(tint) : tint,
      parent,
    );
    mesh.position.set(...p);
    return mesh;
  };
  const cylinder = (
    r: number,
    h: number,
    tint: string | T.Material,
    p: Point = [0, 0, 0],
    parent: T.Object3D = model,
    rTop = r,
  ) => {
    const mesh = add(
      new T.CylinderGeometry(rTop, r, h, 36),
      typeof tint === "string" ? mat(tint) : tint,
      parent,
    );
    mesh.position.set(...p);
    return mesh;
  };
  const box = (
    dimensions: Point,
    tint: string | T.Material,
    p: Point = [0, 0, 0],
    parent: T.Object3D = model,
  ) => {
    const mesh = add(
      new T.BoxGeometry(...dimensions),
      typeof tint === "string" ? mat(tint) : tint,
      parent,
    );
    mesh.position.set(...p);
    return mesh;
  };
  const instances = (
    geometry: T.BufferGeometry,
    tint: string,
    positions: Point[],
    scales: number[] | number,
    parent: T.Object3D = model,
  ) => {
    geometries.add(geometry);
    const mesh = new T.InstancedMesh(geometry, mat(tint), positions.length);
    const transform = new T.Object3D();
    positions.forEach((p, i) => {
      transform.position.set(...p);
      transform.scale.setScalar(
        typeof scales === "number" ? scales : scales[i],
      );
      transform.rotation.set(
        rand() * Math.PI,
        rand() * Math.PI,
        rand() * Math.PI,
      );
      transform.updateMatrix();
      mesh.setMatrixAt(i, transform.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    parent.add(mesh);
    return mesh;
  };
  const shell = (p: Point, scale: Point, tint: string, opacity = 0.18) => {
    // Shells need independent materials: opening one must not fade organelles.
    const material = mat(tint, opacity).clone();
    materials.add(material);
    shells.push({ material, opacity });
    return ball(p, scale, material);
  };
  const branch = (
    a: Point,
    b: Point,
    radius: number,
    tint: string,
    parent: T.Object3D = model,
  ) => {
    rod(a, b, radius, tint, parent, radius * 0.6);
    ball(b, radius * 0.62, tint, parent);
  };
  const molecularBond = (
    a: Point,
    b: Point,
    ca: string,
    cb: string,
    radius = 0.022,
    parent: T.Object3D = model,
  ) => {
    const mid: Point = [
      (a[0] + b[0]) / 2,
      (a[1] + b[1]) / 2,
      (a[2] + b[2]) / 2,
    ];
    rod(a, mid, radius, ca, parent);
    rod(mid, b, radius, cb, parent);
  };
  const childModel = <O extends T.Object3D>(
    object: O,
    modelKind: string,
    atomicNumber?: number,
  ): O => {
    object.traverse((part) => {
      part.userData.worldChildModel = modelKind;
      if (atomicNumber !== undefined)
        part.userData.worldChildAtomicNumber = atomicNumber;
    });
    return object;
  };

  const redCellGeometry = () => {
    // Smooth surface of revolution: a shallow centre and a thick rounded rim.
    // The shape is a biconcave disc, not a torus (there is no hole).
    const profile: T.Vector2[] = [];
    const thickness = (r: number) =>
      0.5 *
      Math.sqrt(Math.max(0, 1 - r * r)) *
      (0.207 + 2.003 * r * r - 1.123 * r ** 4);
    for (let i = 0; i <= 30; i++) {
      const r = i / 30;
      profile.push(new T.Vector2(r, thickness(r)));
    }
    for (let i = 29; i >= 0; i--) {
      const r = i / 30;
      profile.push(new T.Vector2(r, -thickness(r)));
    }
    // Lathe profiles run bottom-to-top for outward-facing normals.
    return new T.LatheGeometry(profile.reverse(), 40);
  };

  function makeHuman(parent: T.Object3D = model) {
    const body = new T.Group();
    parent.add(body);
    const skin = mat(color || "#d6a98a", 0.92).clone();
    materials.add(skin);
    shells.push({ material: skin, opacity: 0.92 });
    const limb = (a: Point, b: Point, r: number, rx = 1) => {
      const av = new T.Vector3(...a),
        bv = new T.Vector3(...b);
      const mesh = add(
        new T.CapsuleGeometry(r, av.distanceTo(bv) - r * 2, 6, 12),
        skin,
        body,
      );
      mesh.position.copy(av).add(bv).multiplyScalar(0.5);
      mesh.quaternion.setFromUnitVectors(
        new T.Vector3(0, 1, 0),
        bv.sub(av).normalize(),
      );
      mesh.scale.x = rx;
      return mesh;
    };
    // Adult head-to-body proportions, approximately one head per 7 heights.
    ball([0, 0.355, 0], [0.052, 0.068, 0.056], skin, body);
    ball([0, 0.34, 0.053], [0.01, 0.014, 0.012], skin, body);
    ball([0, 0.236, 0], [0.032, 0.06, 0.035], skin, body);
    ball([0, 0.11, 0], [0.116, 0.155, 0.059], skin, body);
    ball([0, -0.048, -0.003], [0.087, 0.069, 0.061], skin, body);
    for (const side of [-1, 1]) {
      limb([side * 0.089, 0.188, 0], [side * 0.157, 0.025, 0], 0.035);
      limb([side * 0.157, 0.025, 0], [side * 0.175, -0.112, 0.015], 0.025);
      ball([side * 0.18, -0.136, 0.018], [0.024, 0.045, 0.013], skin, body);
      limb([side * 0.052, -0.063, 0], [side * 0.058, -0.24, 0.012], 0.049);
      limb([side * 0.058, -0.24, 0.012], [side * 0.06, -0.424, 0], 0.033);
      ball([side * 0.06, -0.444, 0.033], [0.034, 0.022, 0.063], skin, body);
      ball([side * 0.02, 0.367, 0.052], [0.005, 0.003, 0.002], "#705951", body);
    }
    // Restrained translucent internal silhouettes make the human an invitation
    // to anatomy, while detailed organs are separate selectable atlas models.
    const organMaterial = mat("#ae6379", 0.65);
    childModel(
      ball([-0.041, 0.136, 0.018], [0.038, 0.066, 0.035], organMaterial, body),
      "lung",
    );
    childModel(
      ball([0.041, 0.136, 0.018], [0.038, 0.066, 0.035], organMaterial, body),
      "lung",
    );
    childModel(
      ball(
        [0.011, 0.108, 0.045],
        [0.028, 0.039, 0.025],
        mat(palette.red, 0.9),
        body,
      ),
      "heart",
    ).rotation.z = -0.25;
    childModel(
      tube(
        [
          [0, 0.19, 0.051],
          [0.009, 0.11, 0.055],
          [0, -0.03, 0.046],
        ],
        0.006,
        palette.red,
        body,
      ),
      "vein",
    );
    return body;
  }

  function makeTree(parent: T.Object3D = model) {
    const tree = new T.Group();
    parent.add(tree);
    const bark = "#886148";
    branch([0, -0.45, 0], [0.022, 0.15, 0], 0.065, bark, tree);
    for (let i = 0; i < 7; i++) {
      const a = i * 2.399;
      const end: Point = [
        Math.cos(a) * 0.24,
        0.2 + (i % 3) * 0.065,
        Math.sin(a) * 0.21,
      ];
      branch([0.008, -0.06 + i * 0.025, 0], end, 0.028, bark, tree);
      ball(
        end,
        [0.18, 0.165, 0.175],
        ["#477f63", "#5f9c6f", "#7eac73"][i % 3],
        tree,
      );
      tube(
        [
          [0, -0.38, 0],
          [Math.cos(a) * 0.1, -0.435, Math.sin(a) * 0.1],
          [Math.cos(a) * 0.21, -0.47, Math.sin(a) * 0.19],
        ],
        0.014,
        bark,
        tree,
      );
    }
    ball([0.01, 0.32, 0], [0.21, 0.19, 0.19], "#75a575", tree);
    for (let i = 0; i < 6; i++) {
      const a = (i * TAU) / 6;
      tube(
        [
          [Math.cos(a) * 0.049, -0.4, Math.sin(a) * 0.049],
          [Math.cos(a + 0.06) * 0.056, -0.2, Math.sin(a + 0.06) * 0.056],
          [Math.cos(a) * 0.037, 0.06, Math.sin(a) * 0.037],
        ],
        0.003,
        "#b18a61",
        tree,
      );
    }
    return tree;
  }

  function makeGlass(parent: T.Object3D = model) {
    const glass = new T.Group();
    parent.add(glass);
    const wall = mat("#b8e8ee", 0.15, 0.1);
    const profile = [
      [0, -0.43],
      [0.245, -0.43],
      [0.31, 0.44],
      [0.296, 0.44],
      [0.226, -0.399],
      [0, -0.399],
    ];
    add(
      new T.LatheGeometry(
        profile.map((p) => new T.Vector2(...(p as [number, number]))),
        56,
      ),
      wall,
      glass,
    );
    const water = mat("#66c2dc", 0.38, 0.16);
    cylinder(0.235, 0.58, water, [0, -0.1, 0], glass, 0.276);
    ring(0.303, 0.011, mat("#d0f0f3", 0.8), [0, 0.44, 0], glass).rotation.x =
      Math.PI / 2;
    ring(0.242, 0.013, mat("#a3d1df", 0.65), [0, -0.417, 0], glass).rotation.x =
      Math.PI / 2;
    for (let i = 0; i < 3; i++)
      ring(
        0.11 + i * 0.07,
        0.0025,
        mat("#d8faff", 0.32),
        [0, 0.193 + i * 0.0005, 0],
        glass,
      ).rotation.x = Math.PI / 2;
    tube(
      [
        [-0.242, -0.28, 0.08],
        [-0.254, -0.08, 0.08],
        [-0.274, 0.29, 0.08],
      ],
      0.005,
      mat("#f0fdff", 0.68),
      glass,
    );
    return glass;
  }

  function makeCloud(parent: T.Object3D = model) {
    const cloud = new T.Group();
    parent.add(cloud);
    const lobes: Array<[Point, Point]> = [
      [
        [-0.26, -0.055, 0],
        [0.24, 0.17, 0.21],
      ],
      [
        [0.05, 0, 0],
        [0.3, 0.23, 0.23],
      ],
      [
        [0.29, -0.055, 0.015],
        [0.21, 0.16, 0.19],
      ],
      [
        [-0.06, 0.115, 0],
        [0.22, 0.2, 0.2],
      ],
      [
        [0.15, -0.1, 0.13],
        [0.22, 0.105, 0.16],
      ],
    ];
    lobes.forEach(([p, s], i) =>
      ball(p, s, ["#c7dce4", "#e3edf1", "#d7e5eb"][i % 3], cloud),
    );
    return cloud;
  }

  function makeDNA(
    parent: T.Object3D = model,
    length = 0.86,
    rungs = 28,
    radius = 0.068,
  ) {
    const dna = new T.Group();
    parent.add(dna);
    const strands: Point[][] = [[], []];
    for (let i = 0; i <= rungs; i++) {
      const angle = (i * TAU) / 10.5;
      const y = -length / 2 + (i * length) / rungs;
      // With +Y as the helix axis, -sin gives the right-handed B-DNA twist.
      const a: Point = [Math.cos(angle) * radius, y, -Math.sin(angle) * radius];
      const b: Point = [
        Math.cos(angle + Math.PI) * radius,
        y,
        -Math.sin(angle + Math.PI) * radius,
      ];
      strands[0].push(a);
      strands[1].push(b);
      const colors =
        i % 2 ? [palette.gold, palette.teal] : [palette.red, palette.violet];
      molecularBond(a, b, colors[0], colors[1], 0.014, dna);
      ball(a, 0.023, "#76b6dc", dna);
      ball(b, 0.023, "#ddb381", dna);
    }
    tube(strands[0], 0.015, "#70b8e4", dna);
    tube(strands[1], 0.015, "#e4b889", dna);
    return dna;
  }

  function makeProtein(
    parent: T.Object3D = model,
    tint = palette.violet,
    offset = 0,
  ) {
    const p = new T.Group();
    parent.add(p);
    const points: Point[] = [];
    for (let i = 0; i < 64; i++) {
      const u = (i / 63) * TAU * 2.4 + offset;
      points.push([
        Math.sin(u * 1.27) * (0.21 + 0.06 * Math.cos(u * 4)),
        Math.cos(u * 0.92) * 0.25,
        Math.sin(u * 1.79) * 0.21,
      ]);
    }
    tube(points, 0.025, tint, p);
    // Compact helices and ribbon-like strands evoke a folded protein. This is
    // an explanatory fold, never claimed as a PDB-derived molecular structure.
    for (let h = 0; h < 3; h++) {
      const helix: Point[] = [];
      for (let j = 0; j < 42; j++) {
        const angle = (j / 41) * TAU * 4;
        helix.push([
          -0.16 + h * 0.15 + Math.cos(angle) * 0.042,
          -0.14 + (j / 41) * 0.3,
          Math.sin(angle) * 0.042 + (h - 1) * 0.07,
        ]);
      }
      tube(helix, 0.016, h === 1 ? palette.gold : tint, p);
    }
    return p;
  }

  function makeMitochondrion(parent: T.Object3D = model) {
    const mito = new T.Group();
    parent.add(mito);
    ball([0, 0, 0], [0.41, 0.19, 0.2], mat("#d99572", 0.25), mito);
    const inner = add(
      new T.SphereGeometry(1, 32, 20, 0, Math.PI),
      mat("#ba6e61"),
      mito,
    );
    inner.scale.set(0.39, 0.175, 0.175);
    inner.rotation.y = Math.PI;
    // Continuous cristae folds are connected to the inner membrane.
    const cristae: Point[] = [];
    for (let i = 0; i <= 40; i++) {
      const x = -0.31 + (i / 40) * 0.62;
      cristae.push([
        x,
        Math.sin((i / 40) * TAU * 5) *
          0.125 *
          Math.sqrt(Math.max(0, 1 - (x / 0.37) ** 2)),
        0.04,
      ]);
    }
    tube(cristae, 0.022, "#f0bd88", mito);
    ring(0.07, 0.006, palette.violet, [0.21, 0.04, 0.035], mito).scale.y = 0.7;
    return mito;
  }

  function makeLeaf(parent: T.Object3D = model) {
    const leaf = new T.Group();
    parent.add(leaf);
    const shape = new T.Shape();
    shape.moveTo(0, -0.43);
    shape.bezierCurveTo(-0.31, -0.24, -0.4, 0.06, 0, 0.46);
    shape.bezierCurveTo(0.38, 0.13, 0.34, -0.24, 0, -0.43);
    const blade = add(
      new T.ExtrudeGeometry(shape, {
        depth: 0.018,
        bevelEnabled: true,
        bevelThickness: 0.01,
        bevelSize: 0.012,
        bevelSegments: 2,
        steps: 1,
        curveSegments: 16,
      }),
      mat("#5b9f69"),
      leaf,
    );
    blade.position.z = -0.01;
    tube(
      [
        [0, -0.49, 0.019],
        [0, -0.1, 0.03],
        [0.005, 0.22, 0.03],
        [0, 0.42, 0.018],
      ],
      0.012,
      "#abd181",
      leaf,
    );
    for (let i = 0; i < 6; i++)
      for (const sign of [-1, 1]) {
        const y = -0.29 + i * 0.105;
        const x = Math.sin(((i + 1) / 8) * Math.PI) * 0.235;
        tube(
          [
            [0, y, 0.028],
            [sign * x * 0.5, y + 0.07, 0.026],
            [sign * x, y + 0.11, 0.023],
          ],
          0.0035,
          "#9ec978",
          leaf,
        );
      }
    return leaf;
  }

  switch (kind) {
    case "world": {
      ball([0, -0.107, 0], [0.65, 0.1, 0.44], "#665f4d");
      ball([0, -0.055, 0], [0.635, 0.055, 0.43], "#59795e");
      const groundHeight = (x: number, z: number) =>
        -0.055 +
        0.055 * Math.sqrt(Math.max(0, 1 - (x / 0.635) ** 2 - (z / 0.43) ** 2));
      const river = new T.CatmullRomCurve3(
        [
          [-0.54, 0, 0.1],
          [-0.29, 0, 0.19],
          [-0.08, 0, 0.085],
          [0.15, 0, 0.13],
          [0.5, 0, 0.2],
        ].map((p) => new T.Vector3(...(p as Point))),
      );
      const ribbon = (width: number, tint: string, lift: number) => {
        const positions: number[] = [],
          uv: number[] = [],
          indices: number[] = [];
        for (let i = 0; i <= 60; i++) {
          const u = i / 60,
            p = river.getPoint(u),
            direction = river.getTangent(u);
          const half = width * (0.9 + Math.sin(u * Math.PI * 3) * 0.11);
          for (const sign of [-1, 1]) {
            const x = p.x + direction.z * half * sign,
              z = p.z - direction.x * half * sign;
            positions.push(x, groundHeight(x, z) + lift, z);
            uv.push(u, sign > 0 ? 1 : 0);
          }
          if (i < 60) {
            const v = i * 2;
            indices.push(v, v + 2, v + 1, v + 1, v + 2, v + 3);
          }
        }
        const geometry = new T.BufferGeometry();
        geometry.setAttribute(
          "position",
          new T.Float32BufferAttribute(positions, 3),
        );
        geometry.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();
        const material = mat(tint, 1, 0.66);
        material.side = T.DoubleSide;
        add(geometry, material);
      };
      ribbon(0.041, "#b1a37d", 0.002);
      ribbon(0.033, "#568e9b", 0.003);
      // Selectable world specimens are placed independently by the atlas using
      // their physical dimensions. Only background terrain belongs here.
      for (let i = 0; i < 8; i++) {
        const stone = add(
          new T.DodecahedronGeometry(0.008 + rand() * 0.011, 0),
          mat("#b1a79c"),
        );
        const x = -0.5 + rand(),
          z = -0.3 + rand() * 0.6;
        stone.position.set(x, groundHeight(x, z) + 0.006, z);
        stone.scale.set(1, 0.65, 0.9);
      }
      const grass: Point[] = [];
      for (let i = 0; i < 42; i++) {
        const a = rand() * TAU,
          r = Math.sqrt(rand());
        const x = Math.cos(a) * r * 0.53,
          z = Math.sin(a) * r * 0.33;
        grass.push([x, groundHeight(x, z) + 0.004, z]);
      }
      const tufts = instances(
        new T.ConeGeometry(0.004, 0.008, 4),
        "#99b985",
        grass,
        1,
      );
      const tuft = new T.Object3D();
      grass.forEach((p, i) => {
        tuft.position.set(...p);
        tuft.rotation.set((rand() - 0.5) * 0.3, rand() * TAU, 0);
        tuft.updateMatrix();
        tufts.setMatrixAt(i, tuft.matrix);
      });
      tufts.instanceMatrix.needsUpdate = true;
      tufts.computeBoundingSphere();
      break;
    }
    case "human":
      makeHuman();
      break;
    case "tree":
      makeTree();
      break;
    case "glass":
    case "waterGlass":
    case "water":
      makeGlass();
      break;
    case "cloud":
      makeCloud();
      break;
    case "rock": {
      const rock = add(
        new T.DodecahedronGeometry(0.44, 1),
        mat(color || "#a49b96", 1, 0.8),
      );
      const position = rock.geometry.attributes.position;
      for (let i = 0; i < position.count; i++) {
        const x = position.getX(i),
          y = position.getY(i),
          z = position.getZ(i);
        const f = 1 + 0.09 * Math.sin(x * 13 + y * 7) * Math.cos(z * 17);
        position.setXYZ(i, x * f, y * f * 0.78, z * f * 0.85);
      }
      rock.geometry.computeVertexNormals();
      for (let i = 0; i < 5; i++) {
        const crystal = add(
          new T.CylinderGeometry(0.045, 0.07, 0.23, 6),
          mat(["#d2bde8", "#bba5d1", "#daccec"][i % 3], 0.83, 0.2),
        );
        crystal.position.set(-0.16 + i * 0.067, 0.21 + (i % 2) * 0.028, 0.07);
        crystal.rotation.z = (i - 2) * -0.17;
        const tip = add(new T.ConeGeometry(0.047, 0.07, 6), crystal.material);
        tip.position
          .copy(crystal.position)
          .add(new T.Vector3(0, 0.14, 0).applyEuler(crystal.rotation));
        tip.rotation.copy(crystal.rotation);
      }
      break;
    }
    case "heart": {
      const heart = new T.Group();
      model.add(heart);
      const left = ball(
        [-0.12, 0.02, 0],
        [0.2, 0.3, 0.16],
        color || "#be4e63",
        heart,
      );
      left.rotation.z = -0.28;
      const right = ball(
        [0.105, 0.02, 0.015],
        [0.19, 0.25, 0.15],
        "#d56174",
        heart,
      );
      right.rotation.z = 0.24;
      ball([-0.14, 0.22, -0.03], [0.13, 0.11, 0.14], "#c97681", heart);
      ball([0.15, 0.22, -0.02], [0.11, 0.105, 0.13], "#b8667b", heart);
      tube(
        [
          [0.04, 0.19, 0],
          [0.065, 0.37, 0],
          [-0.065, 0.43, -0.015],
          [-0.14, 0.32, -0.02],
        ],
        0.063,
        "#e67d80",
        heart,
      );
      tube(
        [
          [-0.12, 0.25, -0.05],
          [-0.17, 0.43, -0.06],
        ],
        0.049,
        palette.blue,
        heart,
      );
      tube(
        [
          [0.01, 0.21, 0.14],
          [-0.07, 0.12, 0.169],
          [-0.07, -0.04, 0.17],
          [-0.12, -0.18, 0.095],
        ],
        0.012,
        "#f1b497",
        heart,
      );
      tube(
        [
          [-0.07, 0.12, 0.169],
          [0.055, 0.085, 0.169],
          [0.19, -0.025, 0.128],
        ],
        0.009,
        "#f1b497",
        heart,
      );
      animated.push((time) =>
        heart.scale.setScalar(
          1 + Math.max(0, Math.sin(time * 5.2)) ** 5 * 0.025,
        ),
      );
      break;
    }
    case "lungs":
    case "lung": {
      for (const side of [-1, 1]) {
        const lung = ball(
          [side * 0.19, -0.055, 0],
          [0.175, 0.31, 0.13],
          mat("#d592a1", 0.75),
        );
        lung.rotation.z = side * 0.12;
        tube(
          [
            [0, 0.21, 0.08],
            [side * 0.08, 0.11, 0.1],
            [side * 0.17, -0.07, 0.12],
            [side * 0.21, -0.22, 0.11],
          ],
          0.025,
          "#efd7b8",
        );
        for (let i = 0; i < 3; i++) {
          const y = 0.07 - i * 0.1;
          tube(
            [
              [side * (0.1 + i * 0.035), y, 0.12],
              [side * 0.25, y - 0.015, 0.11],
              [side * 0.3, y - 0.065, 0.08],
            ],
            0.012,
            "#efc4b3",
          );
        }
      }
      cylinder(0.035, 0.27, "#dbc7ac", [0, 0.3, 0.045]);
      for (let i = 0; i < 8; i++)
        ring(0.037, 0.007, "#f2dfc3", [0, 0.2 + i * 0.03, 0.045]).rotation.x =
          Math.PI / 2;
      animated.push((time) => {
        model.scale.x = 1 + Math.sin(time * 1.4) * 0.012;
      });
      break;
    }
    case "brain": {
      for (const side of [-1, 1]) {
        ball([side * 0.16, 0.035, 0], [0.235, 0.275, 0.28], "#c993a9");
        for (let ridge = 0; ridge < 18; ridge++) {
          const path: Point[] = [];
          const longitude = -Math.PI + (ridge / 18) * TAU;
          for (let i = 0; i < 22; i++) {
            const theta = 0.17 + (i / 21) * 2.7;
            const phi = longitude + Math.sin(i * 0.92 + ridge) * 0.15;
            path.push([
              side * (0.16 + Math.sin(theta) * Math.cos(phi) * 0.223),
              0.035 + Math.cos(theta) * 0.26,
              Math.sin(theta) * Math.sin(phi) * 0.265,
            ]);
          }
          tube(path, 0.024, ridge % 2 ? "#e5b1bb" : "#dca6b6");
        }
      }
      ball([0, -0.205, -0.13], [0.2, 0.11, 0.15], "#b9849e");
      cylinder(0.053, 0.18, "#d4a9b2", [0, -0.29, -0.08]);
      break;
    }
    case "liver": {
      ball([-0.13, 0, 0], [0.35, 0.235, 0.2], color || "#a95462").rotation.z =
        0.22;
      ball([0.24, 0.005, -0.025], [0.25, 0.145, 0.15], "#bb6e74").rotation.z =
        0.1;
      ball([0.055, -0.17, 0.07], [0.04, 0.09, 0.035], "#719767").rotation.z =
        -0.2;
      tube(
        [
          [0.05, -0.18, 0.075],
          [0.055, -0.015, 0.16],
          [-0.03, 0.055, 0.19],
        ],
        0.014,
        "#9cbd82",
      );
      break;
    }
    case "vein":
    case "vessel":
    case "capillary": {
      const wall = add(
        new T.CylinderGeometry(
          0.255,
          0.255,
          0.92,
          48,
          1,
          true,
          0.2,
          Math.PI * 1.48,
        ),
        mat(color || "#657eb2"),
      );
      wall.rotation.z = Math.PI / 2;
      const inner = add(
        new T.CylinderGeometry(
          0.225,
          0.225,
          0.925,
          48,
          1,
          true,
          0.2,
          Math.PI * 1.48,
        ),
        mat("#c286a4"),
      );
      inner.rotation.z = Math.PI / 2;
      (inner.material as T.Material).side = T.DoubleSide;
      for (const x of [-0.46, 0.46]) {
        const lip = ring(0.238, 0.017, "#d3a2b5", [x, 0, 0]);
        lip.rotation.y = Math.PI / 2;
      }
      const geometry = redCellGeometry();
      geometries.add(geometry);
      for (let i = 0; i < 7; i++) {
        const cell = add(geometry, mat(i % 2 ? palette.red : palette.darkRed));
        cell.scale.setScalar(0.077);
        cell.position.set(
          -0.33 + i * 0.11,
          Math.sin(i * 2) * 0.09,
          Math.cos(i * 2) * 0.065,
        );
        cell.rotation.set(i * 0.8, i * 0.7, 0.4);
        childModel(cell, "blood");
      }
      break;
    }
    case "blood": {
      shell([0, 0, 0], [0.49, 0.29, 0.31], "#e5b177", 0.07);
      const geometry = redCellGeometry();
      geometries.add(geometry);
      for (let i = 0; i < 15; i++) {
        const cell = add(geometry, mat(i % 3 ? "#d84764" : "#b73d59"));
        cell.scale.setScalar(0.09);
        const a = i * 2.399,
          r = 0.08 + Math.sqrt(i / 15) * 0.29;
        cell.position.set(
          Math.cos(a) * r,
          Math.sin(a) * r * 0.65,
          Math.sin(i * 3.4) * 0.17,
        );
        cell.rotation.set(i * 0.7, 0, i * 0.5);
        childModel(cell, "redBloodCell");
      }
      childModel(ball([0.19, 0.06, 0.17], 0.1, "#dbd9ea"), "whiteBloodCell");
      childModel(
        ball([0.19, 0.07, 0.239], [0.043, 0.055, 0.028], palette.violet),
        "whiteBloodCell",
      );
      childModel(
        instances(
          sphereGeometry,
          "#d7abda",
          [
            [-0.24, 0.17, 0.12],
            [0.08, -0.21, 0.05],
            [0.35, 0.03, 0.07],
          ],
          0.025,
        ),
        "platelet",
      );
      break;
    }
    case "redBloodCell": {
      const cell = add(redCellGeometry(), mat(color || "#d84b65", 1, 0.3));
      cell.rotation.x = 0.7;
      cell.rotation.z = -0.16;
      break;
    }
    case "whiteBloodCell": {
      childModel(
        shell([0, 0, 0], [0.4, 0.39, 0.4], "#d5d3ed", 0.47),
        "membrane",
      );
      // The content selects a lymphocyte: one large, rounded nucleus,
      // rather than the segmented nucleus of a neutrophil.
      childModel(
        ball([-0.035, 0.025, 0.055], [0.20, 0.21, 0.19], "#9675bd"),
        "cellNucleus",
      );
      const p: Point[] = [];
      for (let i = 0; i < 64; i++) {
        const y = 1 - (2 * (i + 0.5)) / 64,
          r = Math.sqrt(1 - y * y),
          a = i * 2.399;
        p.push([Math.cos(a) * r * 0.375, y * 0.365, Math.sin(a) * r * 0.375]);
      }
      instances(sphereGeometry, "#e5dfef", p, 0.026);
      break;
    }
    case "platelet": {
      ball([0, 0, 0], [0.3, 0.16, 0.29], "#b58ec1");
      for (let i = 0; i < 9; i++) {
        const a = (i * TAU) / 9;
        tube(
          [
            [Math.cos(a) * 0.24, 0, Math.sin(a) * 0.23],
            [Math.cos(a) * 0.35, Math.sin(i * 2) * 0.06, Math.sin(a) * 0.34],
            [
              Math.cos(a + 0.08) * 0.45,
              Math.sin(i) * 0.06,
              Math.sin(a + 0.08) * 0.42,
            ],
          ],
          0.025,
          "#caa5d1",
        );
      }
      instances(
        sphereGeometry,
        "#e1c0df",
        [
          [-0.1, 0.15, 0.06],
          [0.04, 0.155, 0.1],
          [0.12, 0.13, -0.08],
        ],
        0.04,
      );
      break;
    }
    case "cell":
    case "animalCell":
    case "plantCell": {
      const plant = kind === "plantCell";
      if (plant) {
        box([0.9, 0.73, 0.53], mat("#87b78e", 0.12));
        for (const y of [-0.365, 0.365])
          for (const z of [-0.265, 0.265])
            rod([-0.45, y, z], [0.45, y, z], 0.021, "#8bb587");
        for (const x of [-0.45, 0.45])
          for (const z of [-0.265, 0.265])
            rod([x, -0.365, z], [x, 0.365, z], 0.021, "#8bb587");
        for (const x of [-0.45, 0.45])
          for (const y of [-0.365, 0.365])
            rod([x, y, -0.265], [x, y, 0.265], 0.021, "#8bb587");
        ball([0.03, 0.02, -0.03], [0.265, 0.26, 0.19], mat("#8cccd0", 0.3));
        childModel(
          ball([-0.29, -0.14, 0.09], [0.12, 0.12, 0.1], "#b296d4"),
          "cellNucleus",
        );
        for (let i = 0; i < 5; i++) {
          const a = (i * TAU) / 5;
          const c = ball(
            [Math.cos(a) * 0.33, Math.sin(a) * 0.27, 0.1],
            [0.077, 0.036, 0.03],
            "#5d9f77",
          );
          c.rotation.z = a + Math.PI / 2;
          childModel(c, "chloroplast");
        }
      } else {
        childModel(
          shell([0, 0, 0], [0.48, 0.37, 0.34], color || "#d19bab", 0.16),
          "membrane",
        );
        const back = add(
          new T.SphereGeometry(1, 32, 24, 0, Math.PI),
          mat("#b17692", 0.3),
        );
        back.scale.set(0.48, 0.37, 0.34);
        back.rotation.y = Math.PI;
        childModel(
          ball([-0.1, 0.05, 0.035], [0.155, 0.145, 0.135], "#aa8bd0"),
          "cellNucleus",
        );
        childModel(ball([-0.08, 0.07, 0.145], 0.046, "#d3b8e5"), "cellNucleus");
        for (let i = 0; i < 4; i++) {
          const path: Point[] = [];
          for (let j = 0; j <= 14; j++) {
            const a = -1.4 + (j / 14) * 2.8;
            path.push([
              -0.1 + Math.cos(a) * (0.18 + i * 0.028),
              0.04 + Math.sin(a) * (0.16 + i * 0.025),
              0.01 + i * 0.02,
            ]);
          }
          tube(path, 0.012, i % 2 ? "#d9a8c3" : "#b280ae");
        }
      }
      for (let i = 0; i < 3; i++) {
        const mito = makeMitochondrion();
        mito.scale.setScalar(0.23);
        mito.position.set(-0.22 + i * 0.22, -0.21 + (i % 2) * 0.045, 0.12);
        mito.rotation.z = i * 0.7;
        childModel(mito, "mitochondrion");
      }
      const granules: Point[] = [];
      for (let i = 0; i < 32; i++) {
        const a = rand() * TAU;
        granules.push([
          Math.cos(a) * (0.2 + rand() * 0.18),
          Math.sin(a) * (0.18 + rand() * 0.1),
          (rand() - 0.5) * 0.32,
        ]);
      }
      childModel(
        instances(sphereGeometry, "#e5c19a", granules, 0.012),
        "ribosome",
      );
      break;
    }
    case "nucleus":
    case "cellNucleus": {
      shell([0, 0, 0], [0.4, 0.4, 0.4], "#ac92d0", 0.21);
      ball([0.1, -0.07, 0.07], 0.12, "#d0abd9");
      for (let c = 0; c < 3; c++) {
        const points: Point[] = [];
        for (let i = 0; i < 45; i++) {
          const a = (i / 44) * TAU * 2.3 + c * 2;
          points.push([
            Math.cos(a) * (0.2 + Math.sin(a * 3) * 0.05),
            Math.sin(a * 1.37) * 0.25,
            Math.sin(a) * 0.22,
          ]);
        }
        childModel(
          tube(points, 0.012, ["#9d76bf", "#d2acde", "#8e84c9"][c]),
          "chromatin",
        );
      }
      for (let i = 0; i < 14; i++) {
        const y = 1 - (2 * (i + 0.5)) / 14,
          r = Math.sqrt(1 - y * y),
          a = i * 2.399;
        const p = new T.Vector3(Math.cos(a) * r, y, Math.sin(a) * r);
        const pore = ring(
          0.032,
          0.008,
          "#d8c3e6",
          p.clone().multiplyScalar(0.397).toArray() as Point,
        );
        pore.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), p);
      }
      break;
    }
    case "mitochondrion":
      makeMitochondrion();
      break;
    case "membrane":
    case "phospholipid": {
      const single = kind === "phospholipid";
      const size = single ? 1 : 7;
      for (let x = 0; x < size; x++)
        for (let z = 0; z < (single ? 1 : 5); z++)
          for (const side of single ? [1] : [-1, 1]) {
            const px = (x - (size - 1) / 2) * 0.11,
              pz = (z - (single ? 0 : 2)) * 0.11;
            ball(
              [px, side * 0.17, pz],
              single ? 0.075 : 0.045,
              side > 0 ? "#86c5d3" : "#c89ace",
            );
            for (const offset of [-0.017, 0.017])
              tube(
                [
                  [px + offset, side * 0.135, pz],
                  [px + offset, side * 0.075, pz],
                  [
                    px + offset + (offset > 0 ? 0.018 : 0),
                    side * 0.028,
                    pz + 0.01,
                  ],
                ],
                single ? 0.014 : 0.009,
                "#e1be7e",
              );
          }
      if (!single) {
        const channel = add(
          new T.TorusGeometry(0.075, 0.027, 12, 32),
          mat("#ba83aa"),
        );
        channel.rotation.x = Math.PI / 2;
        channel.position.set(0.14, 0.177, 0);
        const channelWall = add(
          new T.CylinderGeometry(0.073, 0.073, 0.3, 28, 1, true),
          mat("#ae83b8", 0.88),
        );
        channelWall.position.set(0.14, 0, 0);
      }
      break;
    }
    case "hemoglobin": {
      const positions: Point[] = [
        [-0.17, 0.15, 0.055],
        [0.17, 0.13, -0.06],
        [-0.15, -0.15, -0.07],
        [0.15, -0.15, 0.065],
      ];
      positions.forEach((p, i) => {
        const subunit = makeProtein(
          model,
          i % 2 ? "#bb83b1" : "#df8b80",
          i * 0.8,
        );
        subunit.scale.setScalar(0.65);
        subunit.position.set(...p);
        subunit.rotation.y = i * 0.7;
        childModel(subunit, "protein");
        const heme = ring(0.038, 0.008, palette.gold, [
          p[0],
          p[1],
          p[2] + 0.13,
        ]);
        heme.rotation.z = Math.PI / 4;
        childModel(heme, "heme");
        childModel(ball([p[0], p[1], p[2] + 0.13], 0.017, "#edb66a"), "heme");
      });
      break;
    }
    case "protein":
    case "actin":
    case "myosin":
      makeProtein(model, color || palette.violet);
      break;
    case "ribosome": {
      const big = new T.Group();
      model.add(big);
      ball([-0.04, 0.1, -0.025], [0.3, 0.22, 0.24], "#b397cb", big);
      ball([0.06, -0.17, 0.025], [0.26, 0.11, 0.2], "#e1af8f");
      for (let i = 0; i < 15; i++) {
        const a = i * 2.399,
          y = 1 - (2 * (i + 0.5)) / 15,
          r = Math.sqrt(1 - y * y);
        ball(
          [
            -0.04 + Math.cos(a) * r * 0.26,
            0.1 + y * 0.18,
            -0.025 + Math.sin(a) * r * 0.2,
          ],
          0.047,
          i % 2 ? "#c4a8d6" : "#a98cc1",
        );
      }
      tube(
        [
          [-0.46, -0.085, 0.07],
          [-0.21, -0.085, 0.07],
          [0, -0.075, 0.085],
          [0.24, -0.085, 0.07],
          [0.46, -0.13, 0.03],
        ],
        0.016,
        "#89c6d0",
      );
      const nascent: Point[] = [];
      for (let i = 0; i < 16; i++)
        nascent.push([
          -0.11 + Math.sin(i * 0.85) * 0.055,
          0.21 + i * 0.015,
          0.17 + Math.cos(i * 0.85) * 0.025,
        ]);
      tube(nascent, 0.012, palette.gold);
      break;
    }
    case "polymer":
    case "lignin":
    case "chitin": {
      const chitin = kind === "chitin";
      const units = chitin ? 7 : 11;
      const centers: Point[] = [];
      for (let i = 0; i < units; i++) {
        const p: Point = chitin
          ? [0.03 * Math.sin(i), -0.42 + i * 0.14, 0.018 * Math.cos(i)]
          : [
              Math.sin(i * 1.95) * (0.13 + i * 0.018),
              -0.36 + i * 0.069,
              Math.cos(i * 1.95) * 0.15,
            ];
        centers.push(p);
        const unit = ring(0.05, 0.009, chitin ? "#b8c1a2" : "#b29e7a", p);
        unit.rotation.set(
          chitin ? Math.PI / 2 : i * 0.47,
          chitin ? (i % 2) * Math.PI : i * 0.34,
          0,
        );
        if (chitin) {
          const n: Point = [p[0] + (i % 2 ? -0.095 : 0.095), p[1], p[2]];
          molecularBond(p, n, palette.carbon, palette.nitrogen, 0.012);
          ball(n, 0.023, palette.nitrogen);
          const carbonyl: Point = [
            n[0] + (i % 2 ? -0.045 : 0.045),
            n[1] + 0.035,
            n[2],
          ];
          ball(carbonyl, 0.02, palette.carbon);
          molecularBond(n, carbonyl, palette.nitrogen, palette.carbon, 0.01);
          ball(
            [carbonyl[0], carbonyl[1] + 0.045, carbonyl[2]],
            0.019,
            palette.oxygen,
          );
          rod(
            carbonyl,
            [carbonyl[0], carbonyl[1] + 0.045, carbonyl[2]],
            0.009,
            palette.oxygen,
          );
        }
      }
      tube(centers, 0.014, chitin ? "#d4cda5" : "#998260");
      if (!chitin)
        for (let i = 2; i < units - 1; i += 3)
          rod(centers[i - 2], centers[i + 1], 0.009, "#c4ae83");
      break;
    }
    case "heme":
    case "chlorophyll": {
      const green = kind === "chlorophyll";
      // Porphyrin/chlorin topology is schematic; the central metal is explicit.
      const centerColor = green ? "#83b481" : "#dc9f61";
      ball([0, 0, 0], 0.07, centerColor);
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2 + Math.PI / 4;
        const points: Point[] = [];
        for (let j = 0; j < 5; j++) {
          const angle = a + Math.PI + (j / 5) * TAU;
          const p: Point = [
            Math.cos(a) * 0.24 + Math.cos(angle) * 0.11,
            Math.sin(a) * 0.24 + Math.sin(angle) * 0.11,
            0,
          ];
          points.push(p);
          ball(
            p,
            j === 0 ? 0.035 : 0.028,
            j === 0 ? palette.nitrogen : palette.carbon,
          );
        }
        molecularBond(
          [0, 0, 0],
          points[0],
          centerColor,
          palette.nitrogen,
          0.011,
        );
        points.forEach((p, j) =>
          molecularBond(
            p,
            points[(j + 1) % 5],
            j === 0 ? palette.nitrogen : palette.carbon,
            j === 4 ? palette.nitrogen : palette.carbon,
            0.013,
          ),
        );
        const nextA = a + Math.PI / 2;
        const nextRingCarbon: Point = [
          Math.cos(nextA) * 0.24 + Math.cos(nextA + Math.PI + TAU / 5) * 0.11,
          Math.sin(nextA) * 0.24 + Math.sin(nextA + Math.PI + TAU / 5) * 0.11,
          0,
        ];
        const bridge: Point = [
          Math.cos(a + Math.PI / 4) * 0.225,
          Math.sin(a + Math.PI / 4) * 0.225,
          0,
        ];
        ball(bridge, 0.028, palette.carbon);
        molecularBond(points[4], bridge, palette.carbon, palette.carbon, 0.013);
        molecularBond(
          bridge,
          nextRingCarbon,
          palette.carbon,
          palette.carbon,
          0.013,
        );
      }
      if (green)
        tube(
          [
            [0.2, -0.19, 0],
            [0.33, -0.29, 0],
            [0.27, -0.4, 0.06],
            [0.39, -0.49, 0.02],
            [0.34, -0.58, 0.08],
          ],
          0.022,
          "#99b677",
        );
      break;
    }
    case "dna":
      makeDNA();
      break;
    case "chromatin":
    case "nucleosome": {
      const count = kind === "nucleosome" ? 1 : 4;
      const linker: Point[] = [];
      for (let i = 0; i < count; i++) {
        const x = (i - (count - 1) / 2) * 0.23,
          y = Math.sin(i * 1.8) * 0.085;
        for (let h = 0; h < 8; h++) {
          const a = (h * TAU) / 8;
          ball(
            [x + Math.cos(a) * 0.05, y + Math.sin(a) * 0.05, 0],
            [0.037, 0.037, 0.066],
            h % 2 ? "#b78bc7" : "#d0a0c9",
          );
        }
        const winding: Point[] = [];
        for (let j = 0; j < 52; j++) {
          const a = (j / 51) * TAU * 1.65;
          winding.push([
            x + Math.cos(a) * 0.102,
            y + Math.sin(a) * 0.102,
            -0.06 + (j / 51) * 0.12,
          ]);
        }
        tube(winding, 0.009, "#80bcdc");
        linker.push([x - 0.11, y, -0.04], [x, y + 0.1, 0], [x + 0.11, y, 0.04]);
      }
      if (count > 1) tube(linker, 0.008, "#dabb8d");
      break;
    }
    case "nucleotide": {
      ball([-0.3, 0.04, 0], 0.082, "#e3b96e");
      const points: Point[] = [];
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * TAU + Math.PI / 2;
        points.push([Math.cos(a) * 0.13 - 0.06, Math.sin(a) * 0.13, 0]);
      }
      points.forEach((p, i) => {
        ball(p, 0.035, i === 1 ? palette.oxygen : palette.carbon);
        molecularBond(p, points[(i + 1) % 5], palette.carbon, palette.carbon);
      });
      molecularBond([-0.3, 0.04, 0], points[1], palette.gold, palette.carbon);
      const base = add(
        new T.CylinderGeometry(0.13, 0.13, 0.028, 6),
        mat("#9b9ed4"),
      );
      base.rotation.x = Math.PI / 2;
      base.position.set(0.25, 0.035, 0);
      molecularBond(
        points[4],
        [0.14, 0.035, 0],
        palette.carbon,
        palette.nitrogen,
      );
      break;
    }
    case "atom": {
      for (let layer = 0; layer < 3; layer++)
        shell(
          [0, 0, 0],
          [0.45 - layer * 0.09, 0.45 - layer * 0.09, 0.45 - layer * 0.09],
          color || "#79b9df",
          0.035 + layer * 0.015,
        );
      const p: Point[] = [],
        sizes: number[] = [];
      for (let i = 0; i < 260; i++) {
        const a = rand() * TAU,
          z = rand() * 2 - 1,
          r = Math.pow(rand(), 0.56) * 0.43;
        p.push([
          Math.cos(a) * Math.sqrt(1 - z * z) * r,
          z * r,
          Math.sin(a) * Math.sqrt(1 - z * z) * r,
        ]);
        sizes.push(0.002 + rand() * 0.003);
      }
      childModel(instances(sphereGeometry, "#8fc9e3", p, sizes), "electron");
      // This is a locator symbol; the physical nucleus is far below this view's
      // resolution. The atlas labels the marker as enlarged, never as a radius.
      const locator = childModel(
        ball([0, 0, 0], 0.012, palette.gold),
        "atomicNucleus",
      );
      locator.userData.nucleusMarker = true;
      group.userData.hasNucleusLocator = true;
      break;
    }
    case "atomicNucleus": {
      const z = Math.max(
        1,
        Math.min(92, Math.round(atomic?.atomicNumber ?? 8)),
      );
      const count = Math.max(
        z,
        Math.min(238, Math.round(atomic?.massNumber ?? z * 2)),
      );
      const nucleonRadius = 0.42 / (Math.cbrt(count) + 1);
      for (let i = 0; i < count; i++) {
        // Concentric staggered shells make a compact nucleus, not a hollow ball.
        const shellCount =
          count > 20
            ? i < Math.floor(count * 0.25)
              ? Math.floor(count * 0.25)
              : count - Math.floor(count * 0.25)
            : count;
        const shellIndex =
          count > 20 && i >= Math.floor(count * 0.25)
            ? i - Math.floor(count * 0.25)
            : i;
        const y = 1 - (2 * (shellIndex + 0.5)) / shellCount,
          r = Math.sqrt(Math.max(0, 1 - y * y)),
          a = i * 2.399;
        const distance =
          count === 1
            ? 0
            : count > 20 && i < Math.floor(count * 0.25)
              ? 0.13
              : 0.28;
        const proton =
          Math.floor(((i + 1) * z) / count) > Math.floor((i * z) / count);
        const particle = ball(
          [
            Math.cos(a) * r * distance,
            y * distance,
            Math.sin(a) * r * distance,
          ],
          nucleonRadius,
          proton ? palette.red : palette.blue,
        );
        particle.userData.constituent = proton ? "proton" : "neutron";
        particle.userData.worldChildModel = proton ? "proton" : "neutron";
      }
      group.userData.protons = z;
      group.userData.neutrons = count - z;
      break;
    }
    case "nucleon":
    case "proton":
    case "neutron": {
      shell([0, 0, 0], [0.4, 0.4, 0.4], color || palette.violet, 0.12);
      const points: Point[] = [
        [-0.18, -0.09, 0.03],
        [0.18, -0.09, 0.03],
        [0, 0.2, -0.04],
      ];
      points.forEach((p, i) => {
        const quark = childModel(
          ball(p, 0.072, [palette.red, palette.green, palette.blue][i]),
          "quark",
        );
        const neutron =
          kind === "neutron" || (kind === "nucleon" && atomic?.charge === 0);
        quark.userData.worldQuarkFlavor = (
          neutron ? ["up", "down", "down"] : ["up", "up", "down"]
        )[i];
      });
      for (let i = 0; i < 3; i++) {
        const a = points[i],
          b = points[(i + 1) % 3],
          curve: Point[] = [];
        for (let j = 0; j <= 24; j++) {
          const u = j / 24;
          curve.push([
            a[0] * (1 - u) + b[0] * u,
            a[1] * (1 - u) + b[1] * u + Math.sin(u * TAU * 4) * 0.018,
            a[2] * (1 - u) + b[2] * u + Math.cos(u * TAU * 4) * 0.018,
          ]);
        }
        tube(curve, 0.008, palette.gold);
      }
      group.userData.particleDiagram = true;
      break;
    }
    case "quark":
    case "electron":
    case "photon": {
      ball([0, 0, 0], 0.13, color || palette.gold);
      for (let i = 0; i < 3; i++)
        shell(
          [0, 0, 0],
          [0.22 + i * 0.075, 0.22 + i * 0.075, 0.22 + i * 0.075],
          color || palette.gold,
          0.045 - i * 0.01,
        );
      group.userData.particleMarker = true;
      break;
    }
    case "wood": {
      cylinder(0.42, 0.55, "#8e6147");
      cylinder(0.407, 0.015, "#d2ac76", [0, 0.283, 0]);
      for (let i = 1; i <= 12; i++) {
        const growth = ring(
          i * 0.032,
          0.004 + (i % 3) * 0.001,
          i % 2 ? "#b28556" : "#bd935e",
          [0, 0.293, 0],
        );
        growth.rotation.x = Math.PI / 2;
        growth.scale.x = 1 + Math.sin(i * 1.3) * 0.025;
      }
      for (let i = 0; i < 19; i++) {
        const a = i * 2.399,
          r = 0.065 + Math.sqrt(i / 19) * 0.3;
        cylinder(0.011 + (i % 3) * 0.002, 0.006, "#795637", [
          Math.cos(a) * r,
          0.295,
          Math.sin(a) * r,
        ]);
      }
      for (let i = 0; i < 17; i++) {
        const a = (i * TAU) / 17;
        tube(
          [
            [Math.cos(a) * 0.422, -0.27, Math.sin(a) * 0.422],
            [Math.cos(a + 0.01) * 0.423, 0, Math.sin(a + 0.01) * 0.423],
            [Math.cos(a) * 0.422, 0.25, Math.sin(a) * 0.422],
          ],
          0.006,
          "#ae7d53",
        );
      }
      model.rotation.x = 0.34;
      break;
    }
    case "xylem": {
      for (let i = 0; i < 7; i++) {
        const a = (i * TAU) / 6,
          r = i === 6 ? 0 : 0.245;
        const x = Math.cos(a) * r,
          z = Math.sin(a) * r;
        const tubeMesh = add(
          new T.CylinderGeometry(0.105, 0.105, 0.86, 24, 1, true),
          mat(i % 2 ? "#d3b47b" : "#baa570", 0.7),
        );
        tubeMesh.position.set(x, 0, z);
        const winding: Point[] = [];
        for (let j = 0; j < 72; j++) {
          const t = j / 71;
          winding.push([
            x + Math.cos(t * TAU * 8) * 0.107,
            -0.4 + t * 0.8,
            z + Math.sin(t * TAU * 8) * 0.107,
          ]);
        }
        tube(winding, 0.008, "#968a58");
        for (const y of [-0.43, 0.43])
          ring(0.104, 0.012, "#e8cc94", [x, y, z]).rotation.x = Math.PI / 2;
      }
      break;
    }
    case "cellWall": {
      box([0.88, 0.65, 0.22], mat("#bdc992", 0.24));
      for (let layer = 0; layer < 3; layer++)
        for (let strand = 0; strand < 6; strand++) {
          const points: Point[] = [];
          for (let i = 0; i < 16; i++) {
            const u = i / 15;
            points.push([
              -0.41 + u * 0.82,
              -0.26 + strand * 0.1 + Math.sin(u * TAU + layer) * 0.013,
              -0.07 + layer * 0.075,
            ]);
          }
          const fiber = tube(
            points,
            0.009,
            ["#cbdba1", "#9fb987", "#e6d7a2"][layer],
          );
          fiber.rotation.z = layer === 1 ? 0.13 : -0.025;
        }
      break;
    }
    case "glucose":
    case "glucoseResidue": {
      const residue = kind === "glucoseResidue";
      const points: Point[] = [];
      const atom = (p: Point, element: "C" | "O" | "H") => {
        const tint = {
          C: palette.carbon,
          O: palette.oxygen,
          H: palette.hydrogen,
        }[element];
        const mesh = childModel(
          ball(
            p,
            element === "H" ? 0.026 : element === "O" ? 0.043 : 0.055,
            tint,
          ),
          "atom",
          { C: 6, O: 8, H: 1 }[element],
        );
        mesh.userData.worldElement = element;
        return mesh;
      };
      for (let i = 0; i < 6; i++) {
        const a = (i * TAU) / 6;
        points.push([
          Math.cos(a) * 0.22,
          Math.sin(a) * 0.22,
          (i % 2 ? 1 : -1) * 0.045,
        ]);
      }
      points.forEach((p, i) => {
        const tint = i === 5 ? palette.oxygen : palette.carbon;
        atom(p, i === 5 ? "O" : "C");
        molecularBond(
          p,
          points[(i + 1) % 6],
          tint,
          i === 4 ? palette.oxygen : palette.carbon,
        );
        if (residue && i === 0) {
          const ringH: Point = [p[0] * 0.95, p[1] * 0.95, p[2] + 0.105];
          atom(ringH, "H");
          molecularBond(p, ringH, palette.carbon, palette.hydrogen, 0.012);
          // An open bond ends at the crop boundary, not an extra atom.
          rod(
            p,
            [p[0] * 1.65, p[1] * 1.65, p[2] - 0.055],
            0.012,
            palette.carbon,
          );
          return;
        }
        if (i !== 5) {
          const end: Point = [
            p[0] * 1.53,
            p[1] * 1.53,
            p[2] + (i % 2 ? 0.08 : -0.07),
          ];
          atom(end, i === 4 ? "C" : "O");
          molecularBond(
            p,
            end,
            tint,
            i === 4 ? palette.carbon : palette.oxygen,
          );
          const ringH: Point = [
            p[0] * 0.95,
            p[1] * 0.95,
            p[2] + (i % 2 ? -0.105 : 0.105),
          ];
          atom(ringH, "H");
          molecularBond(p, ringH, palette.carbon, palette.hydrogen, 0.012);
          if (i === 4) {
            const hydroxyl: Point = [end[0] * 1.23, end[1] * 1.23, end[2]];
            atom(hydroxyl, "O");
            molecularBond(end, hydroxyl, palette.carbon, palette.oxygen, 0.016);
            const hydroxylH: Point = [
              hydroxyl[0] + 0.018,
              hydroxyl[1] - 0.062,
              hydroxyl[2] + 0.038,
            ];
            atom(hydroxylH, "H");
            molecularBond(
              hydroxyl,
              hydroxylH,
              palette.oxygen,
              palette.hydrogen,
              0.012,
            );
            for (const sign of [-1, 1]) {
              const terminalH: Point = [
                end[0] + sign * 0.025,
                end[1] + 0.018,
                end[2] + sign * 0.085,
              ];
              atom(terminalH, "H");
              molecularBond(
                end,
                terminalH,
                palette.carbon,
                palette.hydrogen,
                0.012,
              );
            }
          } else if (residue && i === 3) {
            rod(
              end,
              [end[0] * 1.33, end[1] * 1.33, end[2] - 0.03],
              0.012,
              palette.oxygen,
            );
          } else {
            const h: Point = [end[0] * 1.1, end[1] * 1.1, end[2] + 0.065];
            atom(h, "H");
            molecularBond(end, h, palette.oxygen, palette.hydrogen, 0.014);
          }
        }
      });
      group.userData.formula = residue ? "C6H10O5" : "C6H12O6";
      break;
    }
    case "leaf":
      makeLeaf();
      break;
    case "chloroplast": {
      shell([0, 0, 0], [0.46, 0.24, 0.26], "#87b887", 0.22);
      for (let i = 0; i < 6; i++) {
        const x = -0.29 + (i % 3) * 0.27,
          z = i < 3 ? -0.08 : 0.1;
        for (let j = 0; j < 5; j++)
          cylinder(0.073, 0.018, j % 2 ? "#579771" : "#8abb83", [
            x,
            -0.045 + j * 0.024,
            z,
          ]);
        if (i % 3 < 2)
          tube(
            [
              [x, -0.014, z],
              [x + 0.12, 0.01, z],
              [x + 0.26, -0.014, z],
            ],
            0.013,
            "#9dbf8a",
          );
      }
      break;
    }
    case "thylakoid": {
      for (let i = 0; i < 8; i++)
        cylinder(0.36, 0.033, i % 2 ? "#4e9570" : "#80b785", [
          0,
          -0.22 + i * 0.06,
          0,
        ]);
      for (let i = 0; i < 8; i++)
        ring(0.345, 0.018, "#a3cf90", [0, -0.205 + i * 0.06, 0]).rotation.x =
          Math.PI / 2;
      break;
    }
    case "droplet": {
      const profile: T.Vector2[] = [];
      for (let i = 0; i <= 40; i++) {
        const theta = (i / 40) * Math.PI;
        profile.push(
          new T.Vector2(
            Math.sin(theta) * (0.3 - 0.085 * Math.cos(theta)),
            Math.cos(theta) * 0.43,
          ),
        );
      }
      add(
        new T.LatheGeometry(profile.reverse(), 48),
        mat(color || "#72c5e4", 0.68, 0.12),
      );
      tube(
        [
          [-0.17, 0.18, 0.14],
          [-0.235, 0.03, 0.15],
          [-0.22, -0.13, 0.17],
        ],
        0.009,
        mat("#e6fbff", 0.75),
      );
      break;
    }
    case "waterMolecule": {
      const o: Point = [0, 0.045, 0],
        h1: Point = [-0.252, -0.15, 0],
        h2: Point = [0.252, -0.15, 0];
      childModel(ball(o, 0.16, palette.oxygen), "atom", 8);
      childModel(ball(h1, 0.105, palette.hydrogen), "atom", 1);
      childModel(ball(h2, 0.105, palette.hydrogen), "atom", 1);
      molecularBond(o, h1, palette.oxygen, palette.hydrogen, 0.048);
      molecularBond(o, h2, palette.oxygen, palette.hydrogen, 0.048);
      break;
    }
    case "oxygen":
    case "nitrogen":
    case "air": {
      const isAir = kind === "air";
      const count = isAir ? 13 : 1;
      for (let i = 0; i < count; i++) {
        const nitrogen = kind === "nitrogen" || (isAir && i % 5 !== 0);
        const tint = nitrogen ? palette.nitrogen : palette.oxygen;
        const molecule = new T.Group();
        model.add(molecule);
        ball([-0.095, 0, 0], 0.082, tint, molecule);
        ball([0.095, 0, 0], 0.082, tint, molecule);
        const multiplicity = nitrogen ? [-1, 0, 1] : [-0.6, 0.6];
        multiplicity.forEach((bond) =>
          rod(
            [-0.065, bond * 0.028, 0],
            [0.065, bond * 0.028, 0],
            0.01,
            tint,
            molecule,
          ),
        );
        if (isAir) {
          const y = 1 - (2 * (i + 0.5)) / count,
            a = i * 2.399;
          molecule.scale.setScalar(0.5);
          molecule.position.set(
            Math.cos(a) * 0.27,
            y * 0.35,
            Math.sin(a) * 0.24,
          );
          molecule.rotation.set(
            rand() * Math.PI,
            rand() * Math.PI,
            rand() * Math.PI,
          );
        }
      }
      break;
    }
    case "ice": {
      const crystal = add(
        new T.CylinderGeometry(0.27, 0.3, 0.67, 6),
        mat("#a1d3e4", 0.48, 0.13),
      );
      crystal.rotation.y = Math.PI / 6;
      for (let i = 0; i < 6; i++) {
        const a = (i * TAU) / 6 + Math.PI / 6;
        tube(
          [
            [Math.sin(a) * 0.3, -0.335, Math.cos(a) * 0.3],
            [Math.sin(a) * 0.27, 0.335, Math.cos(a) * 0.27],
          ],
          0.004,
          mat("#d9f4fb", 0.7),
        );
        const b = ((i + 1) * TAU) / 6 + Math.PI / 6;
        rod(
          [Math.sin(a) * 0.27, 0.335, Math.cos(a) * 0.27],
          [Math.sin(b) * 0.27, 0.335, Math.cos(b) * 0.27],
          0.004,
          "#c9eaf3",
        );
      }
      break;
    }
    case "iceLattice": {
      // Hexagonal network schematic. Hydrogen bonds are slender blue links;
      // water molecules remain bent at approximately 104.5 degrees.
      const vertices: Point[] = [];
      for (let layer = 0; layer < 2; layer++)
        for (let i = 0; i < 6; i++) {
          const a = (i * TAU) / 6;
          vertices.push([
            Math.cos(a) * 0.32,
            (layer - 0.5) * 0.38,
            Math.sin(a) * 0.32,
          ]);
        }
      vertices.forEach((p, i) => {
        ball(p, 0.058, palette.oxygen);
        const a = (i * TAU) / 6;
        for (const turn of [-0.912, 0.912]) {
          const h: Point = [
            p[0] + Math.cos(a + turn) * 0.085,
            p[1],
            p[2] + Math.sin(a + turn) * 0.085,
          ];
          ball(h, 0.031, palette.hydrogen);
          molecularBond(p, h, palette.oxygen, palette.hydrogen, 0.014);
        }
        const next = Math.floor(i / 6) * 6 + ((i + 1) % 6);
        rod(p, vertices[next], 0.007, "#89b9d0");
        if (i < 6) rod(p, vertices[i + 6], 0.007, "#89b9d0");
      });
      break;
    }
    case "muscle":
    case "muscleFiber": {
      const single = kind === "muscleFiber";
      if (!single)
        for (let i = 0; i < 13; i++) {
          const a = i * 2.399,
            r = Math.sqrt(i / 13) * 0.16;
          const fiber = ball(
            [Math.cos(a) * r, 0, Math.sin(a) * r],
            [0.053, 0.42 - r * 0.35, 0.053],
            i % 2 ? "#c76b7c" : "#db8b91",
          );
          fiber.rotation.z = Math.cos(a) * 0.05;
        }
      else {
        cylinder(0.18, 0.9, "#c47c91");
        for (let i = 0; i < 24; i++)
          ring(0.182, 0.007, i % 3 ? "#e3a9b2" : "#aa6585", [
            0,
            -0.43 + i * 0.037,
            0,
          ]).rotation.x = Math.PI / 2;
        for (let i = 0; i < 5; i++)
          ball(
            [
              Math.cos(i * 2.4) * 0.18,
              -0.3 + i * 0.14,
              Math.sin(i * 2.4) * 0.18,
            ],
            [0.027, 0.05, 0.027],
            "#9e81bd",
          );
      }
      if (!single)
        for (const side of [-1, 1])
          ball([0, side * 0.43, 0], [0.077, 0.12, 0.058], "#e5d9bf");
      break;
    }
    case "sarcomere": {
      for (const x of [-0.43, 0.43])
        box([0.027, 0.46, 0.25], "#9286b2", [x, 0, 0]);
      for (let line = 0; line < 5; line++) {
        const y = -0.17 + line * 0.085;
        rod([-0.22, y, 0], [0.22, y, 0], 0.023, "#d9a66b");
        for (const side of [-1, 1]) {
          for (let i = 0; i < 13; i++) {
            const x = side * (0.425 - i * 0.022);
            ball([x, y + 0.029, 0], 0.013, "#92bfc7");
            ball([x, y + 0.043, 0.013], 0.012, "#79a6bb");
          }
        }
        for (let i = 0; i < 8; i++)
          rod(
            [-0.18 + i * 0.051, y, 0],
            [-0.161 + i * 0.051, y + 0.034, 0.005],
            0.007,
            "#f0c787",
          );
      }
      break;
    }
    case "alveoli": {
      tube(
        [
          [0, 0.44, -0.04],
          [0, 0.23, -0.03],
          [-0.04, 0.1, 0],
        ],
        0.065,
        "#ddb1a9",
      );
      for (let i = 0; i < 14; i++) {
        const a = i * 2.399,
          y = 1 - (2 * (i + 0.5)) / 14,
          r = Math.sqrt(1 - y * y);
        const p: Point = [
          Math.cos(a) * r * 0.245,
          y * 0.22 - 0.075,
          Math.sin(a) * r * 0.2,
        ];
        ball(p, [0.105, 0.1, 0.1], mat(i % 2 ? "#e5a8b4" : "#d894a6", 0.85));
        const capillary = ring(0.084, 0.007, i % 2 ? "#81add8" : "#d16b82", [
          p[0],
          p[1],
          p[2] + 0.047,
        ]);
        capillary.rotation.set(i * 0.7, i * 0.5, 0);
      }
      break;
    }
    case "skin": {
      box([0.85, 0.15, 0.55], "#dfba8d", [0, -0.19, 0]);
      box([0.85, 0.24, 0.55], "#cb8d92", [0, 0, 0]);
      box([0.85, 0.055, 0.55], color || "#e4b694", [0, 0.148, 0]);
      for (let i = 0; i < 3; i++) {
        const x = -0.26 + i * 0.25;
        tube(
          [
            [x, -0.13, 0.13],
            [x - 0.025, 0.07, 0.13],
            [x + 0.03, 0.33, 0.11],
          ],
          0.01,
          "#6e584c",
        );
        ball([x, -0.12, 0.13], [0.026, 0.044, 0.026], "#ab6977");
      }
      tube(
        [
          [-0.4, -0.07, 0.285],
          [-0.2, -0.045, 0.285],
          [0, -0.08, 0.285],
          [0.22, -0.045, 0.285],
          [0.41, -0.07, 0.285],
        ],
        0.013,
        palette.red,
      );
      tube(
        [
          [-0.4, -0.11, 0.286],
          [-0.2, -0.095, 0.286],
          [0, -0.13, 0.286],
          [0.22, -0.095, 0.286],
          [0.41, -0.11, 0.286],
        ],
        0.01,
        palette.blue,
      );
      break;
    }
    case "hair": {
      cylinder(0.11, 0.9, "#9e775c");
      cylinder(0.075, 0.908, "#c19a71");
      cylinder(0.024, 0.912, "#716354");
      for (let row = 0; row < 18; row++) {
        const band = ring(0.11, 0.005, row % 2 ? "#d0a875" : "#b98d63", [
          0,
          -0.43 + row * 0.05,
          0,
        ]);
        band.rotation.set(Math.PI / 2, row % 2 ? 0.1 : -0.1, 0);
      }
      model.rotation.z = -0.19;
      break;
    }
    case "neuron": {
      ball([-0.13, 0.05, 0], [0.12, 0.11, 0.09], "#b193ca");
      ball([-0.13, 0.05, 0.075], 0.037, "#d6b6df");
      for (let i = 0; i < 7; i++) {
        const a = 0.55 + i * 0.76;
        const start: Point = [
          -0.13 + Math.cos(a) * 0.08,
          0.05 + Math.sin(a) * 0.08,
          0,
        ];
        const middle: Point = [
          -0.13 + Math.cos(a) * 0.23,
          0.05 + Math.sin(a) * 0.22,
          Math.sin(i * 2) * 0.035,
        ];
        const end: Point = [
          -0.13 + Math.cos(a + 0.1) * 0.32,
          0.05 + Math.sin(a + 0.1) * 0.32,
          Math.sin(i * 2) * 0.045,
        ];
        tube([start, middle, end], 0.011, "#c4a4d3");
        for (const sign of [-1, 1]) {
          const tip: Point = [
            middle[0] + Math.cos(a + sign * 0.7) * 0.11,
            middle[1] + Math.sin(a + sign * 0.7) * 0.11,
            middle[2] + sign * 0.025,
          ];
          tube([middle, tip], 0.006, "#d9bddd");
        }
      }
      const axon: Point[] = [
        [-0.04, 0.015, 0],
        [0.1, -0.015, 0],
        [0.24, -0.07, 0],
        [0.42, -0.08, 0],
      ];
      tube(axon, 0.014, "#b09bbb");
      for (let i = 0; i < 4; i++) {
        const sheath = ball(
          [0.065 + i * 0.082, -0.009 - i * 0.019, 0],
          [0.033, 0.033, 0.038],
          "#ddc68e",
        );
        sheath.rotation.z = -0.2;
      }
      for (const sign of [-1, 0, 1]) {
        tube(
          [
            [0.37, -0.08, 0],
            [0.47, -0.08 + sign * 0.09, 0],
          ],
          0.008,
          "#c3a2d0",
        );
        ball([0.47, -0.08 + sign * 0.09, 0], 0.018, "#d8b1d7");
      }
      break;
    }
    case "synapse": {
      ball([0, 0.235, 0], [0.35, 0.19, 0.2], mat("#ad98c9", 0.42));
      cylinder(0.11, 0.15, "#bfa9d8", [0, 0.43, 0]);
      ball([0, -0.2, 0], [0.38, 0.13, 0.22], "#d7a5b8");
      for (let i = 0; i < 7; i++) {
        const x = -0.23 + (i % 4) * 0.14,
          y = 0.15 + Math.floor(i / 4) * 0.115;
        ball([x, y, 0.09], 0.043, mat("#c8d6ae", 0.7));
        for (let j = 0; j < 3; j++)
          ball(
            [
              x + Math.cos((j * TAU) / 3) * 0.018,
              y + Math.sin((j * TAU) / 3) * 0.018,
              0.12,
            ],
            0.007,
            palette.gold,
          );
      }
      for (let i = 0; i < 6; i++) {
        const receptor = ring(0.021, 0.008, "#9aa6cd", [
          -0.25 + i * 0.1,
          -0.08,
          0.1,
        ]);
        receptor.rotation.x = Math.PI / 2;
        ball(
          [-0.22 + i * 0.09, -0.012 + Math.sin(i * 2) * 0.035, 0.09],
          0.01,
          palette.gold,
        );
      }
      break;
    }
    case "root": {
      tube(
        [
          [0.02, 0.43, 0],
          [0, 0.2, 0],
          [-0.025, -0.08, 0],
          [0.015, -0.42, 0.01],
        ],
        0.04,
        "#c2a984",
      );
      for (let i = 0; i < 11; i++) {
        const y = 0.26 - i * 0.055,
          a = i * 2.399;
        const x = Math.cos(a),
          z = Math.sin(a);
        tube(
          [
            [0, y, 0],
            [x * 0.13, y - 0.06, z * 0.09],
            [x * (0.24 - i * 0.01), y - 0.16, z * 0.16],
          ],
          0.009 + (11 - i) * 0.0007,
          "#dbbe90",
        );
        tube(
          [
            [x * 0.12, y - 0.06, z * 0.09],
            [x * 0.2, y - 0.13, z * 0.04],
          ],
          0.004,
          "#e5cea4",
        );
      }
      break;
    }
    case "mushroom": {
      const capProfile: T.Vector2[] = [];
      for (let i = 0; i <= 22; i++) {
        const a = ((i / 22) * Math.PI) / 2;
        capProfile.push(
          new T.Vector2(Math.sin(a) * 0.42, 0.21 + Math.cos(a) * 0.18),
        );
      }
      capProfile.push(new T.Vector2(0.4, 0.185), new T.Vector2(0.08, 0.15));
      add(
        new T.LatheGeometry(capProfile.reverse(), 48),
        mat(color || "#b47b69"),
      );
      tube(
        [
          [0.02, -0.37, 0],
          [-0.018, -0.12, 0],
          [0, 0.19, 0],
        ],
        0.068,
        "#e4d4b2",
      );
      for (let i = 0; i < 36; i++) {
        const a = (i * TAU) / 36;
        const gill = box([0.31, 0.025, 0.004], "#d6bfa0", [
          Math.cos(a) * 0.23,
          0.181,
          Math.sin(a) * 0.23,
        ]);
        gill.rotation.y = -a;
      }
      for (let i = 0; i < 7; i++) {
        const a = i * 2.399;
        tube(
          [
            [0.01, -0.36, 0],
            [Math.cos(a) * 0.1, -0.4, Math.sin(a) * 0.1],
            [Math.cos(a + 0.25) * 0.24, -0.41, Math.sin(a + 0.25) * 0.19],
          ],
          0.008,
          "#d0c7a5",
        );
      }
      break;
    }
    case "hypha": {
      const branches: Point[][] = [
        [
          [-0.44, -0.21, 0],
          [-0.2, -0.1, 0],
          [0.09, 0.08, 0],
          [0.43, 0.23, 0],
        ],
        [
          [-0.12, -0.05, 0],
          [0, 0.18, 0.04],
          [0.09, 0.39, 0.02],
        ],
        [
          [0.14, 0.1, 0],
          [0.25, -0.1, -0.025],
          [0.34, -0.3, -0.01],
        ],
      ];
      branches.forEach((path, i) => {
        tube(path, i ? 0.045 : 0.061, mat("#c5c6a6", 0.55));
        for (let segment = 0; segment < path.length - 1; segment++) {
          const a = new T.Vector3(...path[segment]),
            b = new T.Vector3(...path[segment + 1]);
          const center = a.clone().lerp(b, 0.55);
          const septum = ring(
            i ? 0.042 : 0.057,
            0.005,
            "#e3d8b3",
            center.toArray() as Point,
          );
          septum.quaternion.setFromUnitVectors(
            new T.Vector3(0, 0, 1),
            b.sub(a).normalize(),
          );
          ball(center.toArray() as Point, 0.016, "#a996bd");
        }
      });
      break;
    }
    default: {
      // A visibly neutral specimen only for future, not-yet-modelled records.
      const mesh = add(
        new T.IcosahedronGeometry(0.4, 2),
        mat(color || "#8fbac6"),
      );
      mesh.rotation.set(0.1, 0.3, 0);
    }
  }

  // Batch static teaching detail by parent and material. Transform-bearing
  // groups (the beating heart, for example) remain intact, while hundreds of
  // lipid heads or actin beads cost a few draws instead of hundreds. Atomic
  // constituents keep their semantic identity for isotope audits and picking.
  const parents: T.Object3D[] = [];
  model.traverse((object) => {
    if (object.children.length) parents.push(object);
  });
  parents.forEach((parent) => {
    const batches = new Map<T.Material, T.Mesh[]>();
    parent.children.forEach((child) => {
      if (
        !(child instanceof T.Mesh) ||
        child instanceof T.InstancedMesh ||
        Array.isArray(child.material) ||
        child.userData.constituent ||
        child.userData.worldChildModel
      )
        return;
      if (!child.geometry.attributes.normal || !child.geometry.attributes.uv)
        return;
      const batch = batches.get(child.material) ?? [];
      batch.push(child);
      batches.set(child.material, batch);
    });
    batches.forEach((meshes, material) => {
      if (meshes.length < 6) return;
      const sharedGeometry = meshes.every(
        (mesh) => mesh.geometry === meshes[0].geometry,
      );
      if (sharedGeometry) {
        const instanced = new T.InstancedMesh(
          meshes[0].geometry,
          material,
          meshes.length,
        );
        meshes.forEach((mesh, i) => {
          mesh.updateMatrix();
          instanced.setMatrixAt(i, mesh.matrix);
          parent.remove(mesh);
        });
        instanced.instanceMatrix.needsUpdate = true;
        instanced.computeBoundingSphere();
        parent.add(instanced);
      } else {
        const transformed = meshes.map((mesh) => {
          mesh.updateMatrix();
          const geometry = mesh.geometry.clone().applyMatrix4(mesh.matrix);
          if (!geometry.index) return geometry;
          const unindexed = geometry.toNonIndexed();
          geometry.dispose();
          return unindexed;
        });
        const merged = mergeGeometries(transformed, false);
        transformed.forEach((geometry) => geometry.dispose());
        if (!merged) return;
        add(merged, material, parent);
        meshes.forEach((mesh) => parent.remove(mesh));
      }
    });
  });

  model.updateMatrixWorld(true);
  const bounds = new T.Box3().setFromObject(model);
  const size = bounds.getSize(new T.Vector3());
  const center = bounds.getCenter(new T.Vector3());
  const largest = Math.max(size.x, size.y, size.z, 0.001);
  // Put the calibration on a separate parent so per-model motion cannot erase it.
  const calibration = new T.Group();
  group.remove(model);
  group.add(calibration);
  calibration.add(model);
  calibration.scale.setScalar(1 / largest);
  calibration.position.copy(center).multiplyScalar(-1 / largest);
  group.userData.modelKind = kind;
  group.userData.normalizedExtent = 1;
  if (kind === "world") group.userData.groundY = -center.y / largest;
  if (kind === "human") {
    const anchors: Record<string, Point> = {
      heart: [0.011, 0.108, 0.03],
      lung: [0, 0.15, 0.008],
      brain: [0, 0.369, -0.006],
      liver: [-0.033, 0.026, 0.02],
      vein: [0.151, 0.015, 0.015],
    };
    group.userData.childAnchors = Object.fromEntries(
      Object.entries(anchors).map(([key, p]) => [
        key,
        new T.Vector3(...p).sub(center).divideScalar(largest).toArray(),
      ]),
    );
  }
  group.updateMatrixWorld(true);
  let disposed = false;
  return {
    group,
    update(time, opened = 0) {
      if (disposed) return;
      animated.forEach((update) => update(time));
      shells.forEach(({ material, opacity }) => {
        material.opacity =
          opacity * (1 - T.MathUtils.clamp(opened, 0, 1) * 0.82);
      });
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      group.traverse((object) => {
        if (object instanceof T.InstancedMesh) object.dispose();
      });
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
      group.clear();
    },
  };
}
