import { useEffect, useId, useRef, useState } from "react";
import { ArrowRight, Check, Rotate3D } from "lucide-react";
import * as T from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { elements, molecules } from "./data";
import type { MoleculeId } from "./data";

function Thumbnail({ id }: { id: MoleculeId }) {
  const uid = useId();
  const m = molecules[id];
  const points = m.atoms.map(({ element, pos: [x, y, z] }) => ({
    x: 70 + (x * 0.93 + z * 0.37) * 22,
    y: 47 - (y * 0.94 - z * 0.27) * 22,
    z,
    element,
  }));
  return (
    <svg viewBox="0 0 140 94" aria-hidden="true">
      <defs>
        {Object.entries(elements).map(([key, e]) => (
          <radialGradient
            id={`${uid}-${key}`}
            key={key}
            cx="32%"
            cy="25%"
            r="75%"
          >
            <stop stopColor="#fff" stopOpacity=".85" />
            <stop offset=".3" stopColor={e.color} />
            <stop offset="1" stopColor={e.color} stopOpacity=".4" />
          </radialGradient>
        ))}
      </defs>
      {m.bonds.map(([a, b, order], i) =>
        Array.from({ length: order }, (_, j) => {
          const dx = points[b].x - points[a].x,
            dy = points[b].y - points[a].y;
          const shift = (j - (order - 1) / 2) * 7,
            length = Math.hypot(dx, dy);
          const ox = (-dy / length) * shift,
            oy = (dx / length) * shift;
          return (
            <line
              key={`${i}-${j}`}
              x1={points[a].x + ox}
              y1={points[a].y + oy}
              x2={points[b].x + ox}
              y2={points[b].y + oy}
              stroke="#929baa"
              strokeWidth="4"
            />
          );
        }),
      )}
      {points
        .map((p, i) => ({ ...p, i }))
        .sort((a, b) => a.z - b.z)
        .map((p) => (
          <circle
            key={p.i}
            cx={p.x}
            cy={p.y}
            r={p.element === "H" ? 10 : 15}
            fill={`url(#${uid}-${p.element})`}
            stroke={elements[p.element].color}
            strokeOpacity=".25"
          />
        ))}
    </svg>
  );
}

function Preview({ id, light }: { id: MoleculeId; light: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const change = useRef<((id: MoleculeId) => void) | null>(null);
  const initial = useRef(id);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const el = host.current!;
    let renderer: T.WebGLRenderer;
    try {
      renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      setFailed(true);
      return;
    }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = light ? 1.3 : 1.1;
    renderer.domElement.setAttribute(
      "aria-label",
      "Aperçu 3D de la molécule, glisser pour tourner",
    );
    el.appendChild(renderer.domElement);
    const scene = new T.Scene(),
      camera = new T.PerspectiveCamera(34, 1, 0.1, 50);
    const room = new RoomEnvironment(),
      pmrem = new T.PMREMGenerator(renderer);
    const env = pmrem.fromScene(room);
    scene.environment = env.texture;
    room.dispose();
    pmrem.dispose();
    scene.add(new T.HemisphereLight(0xffffff, 0x4c5569, 2));
    const key = new T.DirectionalLight(0xffffff, 3);
    key.position.set(-3, 5, 4);
    scene.add(key);
    const group = new T.Group();
    scene.add(group);
    const sphere = new T.SphereGeometry(1, 40, 28),
      cylinder = new T.CylinderGeometry(1, 1, 1, 16);
    const materials = Object.fromEntries(
      Object.entries(elements).map(([k, e]) => [
        k,
        new T.MeshPhysicalMaterial({
          color: e.color,
          roughness: 0.27,
          metalness: 0.12,
          clearcoat: 0.45,
        }),
      ]),
    );
    const bondMaterial = new T.MeshStandardMaterial({
      color: 0x929baa,
      roughness: 0.32,
      metalness: 0.3,
    });
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.autoRotateSpeed = 1.2;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const preference = () => {
      controls.autoRotate = !motion.matches;
      controls.enableDamping = !motion.matches;
    };
    preference();
    motion.addEventListener("change", preference);
    let radius = 3;
    function resize() {
      const w = el.clientWidth,
        h = el.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      const distance =
        (radius /
          Math.sin(T.MathUtils.degToRad(17)) /
          Math.min(1, camera.aspect)) *
        1.12;
      camera.position
        .sub(controls.target)
        .normalize()
        .multiplyScalar(distance)
        .add(controls.target);
      controls.update();
    }
    function show(next: MoleculeId) {
      group.clear();
      const molecule = molecules[next];
      molecule.atoms.forEach((a) => {
        const mesh = new T.Mesh(sphere, materials[a.element]);
        mesh.position.set(...a.pos);
        mesh.scale.setScalar(a.element === "H" ? 0.43 : 0.65);
        group.add(mesh);
      });
      molecule.bonds.forEach(([a, b, order]) => {
        const start = new T.Vector3(...molecule.atoms[a].pos),
          end = new T.Vector3(...molecule.atoms[b].pos);
        const direction = end.clone().sub(start),
          unit = direction.clone().normalize();
        const offset = new T.Vector3()
          .crossVectors(unit, new T.Vector3(0, 0, 1))
          .normalize();
        for (let i = 0; i < order; i++) {
          const mesh = new T.Mesh(cylinder, bondMaterial);
          mesh.position
            .copy(start)
            .add(end)
            .multiplyScalar(0.5)
            .addScaledVector(offset, (i - (order - 1) / 2) * 0.25);
          mesh.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), unit);
          mesh.scale.set(0.095, direction.length(), 0.095);
          group.add(mesh);
        }
      });
      const bounds = new T.Box3().setFromObject(group),
        center = bounds.getCenter(new T.Vector3());
      radius = bounds.getBoundingSphere(new T.Sphere()).radius;
      controls.target.copy(center);
      camera.position
        .copy(center)
        .add(new T.Vector3(0.5, 0.35, 1).normalize().multiplyScalar(10));
      if (next !== "methane")
        camera.position
          .copy(center)
          .add(new T.Vector3(0.15, 0.1, 1).multiplyScalar(10));
      resize();
      renderer.domElement.dataset.moleculePreview = next;
    }
    change.current = show;
    show(initial.current);
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    let frame = 0,
      last = performance.now();
    const animate = (now: number) => {
      controls.update(Math.min((now - last) / 1000, 0.1));
      last = now;
      renderer.render(scene, camera);
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => {
      change.current = null;
      cancelAnimationFrame(frame);
      observer.disconnect();
      motion.removeEventListener("change", preference);
      controls.dispose();
      sphere.dispose();
      cylinder.dispose();
      bondMaterial.dispose();
      Object.values(materials).forEach((m) => m.dispose());
      env.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, [light]);
  useEffect(() => {
    change.current?.(id);
  }, [id]);
  return (
    <div className="molecule-preview" ref={host}>
      {failed && <Thumbnail id={id} />}
    </div>
  );
}

export default function MoleculePicker({
  current,
  light,
  onChoose,
}: {
  current: MoleculeId;
  light: boolean;
  onChoose: (id: MoleculeId) => void;
}) {
  const [selected, setSelected] = useState(current);
  const m = molecules[selected];
  const composition = Object.keys(elements).filter((e) =>
    m.atoms.some((a) => a.element === e),
  ) as (keyof typeof elements)[];
  return (
    <>
      <div className="picker-intro">
        <span className="eyebrow">COLLECTION · 03 MOLÉCULES</span>
        <h2 id="dialog-title">Tout commence ici.</h2>
        <p>Choisissez un petit monde à explorer.</p>
      </div>
      <div className="picker-body">
        <div className="picker-stage">
          <span className="preview-formula" aria-hidden="true">
            {m.formula}
          </span>
          <Preview id={selected} light={light} />
          <span className="preview-hint">
            <Rotate3D size={14} /> Glisser pour tourner
          </span>
          <div className="preview-caption">
            <span>{m.facts[0][1]}</span>
            <span>{m.atoms.length} atomes</span>
          </div>
        </div>
        <div className="picker-collection" aria-label="Molécules disponibles">
          {(Object.keys(molecules) as MoleculeId[]).map((id, i) => (
            <button
              key={id}
              className="molecule-choice"
              data-molecule-choice={id}
              aria-pressed={selected === id}
              onClick={() => setSelected(id)}
            >
              <span className="choice-number">0{i + 1}</span>
              <Thumbnail id={id} />
              <span className="choice-copy">
                <strong>{molecules[id].name}</strong>
                <span>
                  {molecules[id].formula} <i>·</i> {molecules[id].atoms.length}{" "}
                  atomes
                </span>
              </span>
              <span className="choice-check">
                {selected === id && <Check size={15} />}
              </span>
            </button>
          ))}
          <div className="picker-facts" aria-live="polite">
            <p>{m.detail}</p>
            <div className="element-chips">
              {composition.map((e) => (
                <span key={e}>
                  <i style={{ background: elements[e].color }} />
                  {m.atoms.filter((a) => a.element === e).length} ×{" "}
                  {elements[e].name.toLowerCase()}
                </span>
              ))}
            </div>
            <dl>
              {m.facts.slice(1).map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
      <div className="picker-footer">
        <span>
          De la molécule aux quarks.
          <small>Le même monde, à chaque échelle.</small>
        </span>
        <button
          className="picker-enter"
          data-molecule-enter
          onClick={() => onChoose(selected)}
        >
          {selected === current
            ? "Reprendre l’exploration"
            : `Explorer ${m.formula}`}
          <ArrowRight size={17} />
        </button>
      </div>
    </>
  );
}
