import { useEffect, useId, useRef, useState } from "react";
import { ArrowRight, Check, Rotate3D } from "lucide-react";
import * as T from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { macroModel } from "./MacroModel";
import { environments } from "./scales";
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

function MacroThumbnail({ id }: { id: MoleculeId }) {
  const uid = useId();
  return (
    <svg viewBox="0 0 140 94" aria-hidden="true">
      <defs>
        <linearGradient id={uid}>
          <stop stopColor="#dbe9f7" stopOpacity=".4" />
          <stop offset=".5" stopColor="#bdd2e7" stopOpacity=".04" />
          <stop offset="1" stopColor="#dbe9f7" stopOpacity=".5" />
        </linearGradient>
      </defs>
      {id === "methane" ? (
        <>
          <path
            d="M59 18 L59 31 Q43 38 43 47 L43 78 Q70 86 97 78 L97 47 Q97 38 81 31 L81 18 Z"
            fill={`url(#${uid})`}
            stroke="#b5bdd2"
            strokeWidth="1.4"
          />
          <rect x="56" y="12" width="28" height="9" rx="2" fill="#9295ae" />
          <path
            d="M44 57 Q70 64 96 57 L96 68 Q70 75 44 68 Z"
            fill="#a8abc0"
            opacity=".3"
          />
        </>
      ) : (
        <>
          <path
            d="M44 20 L50 78 Q70 86 90 78 L96 20"
            fill={`url(#${uid})`}
            stroke="#b6ccdd"
            strokeWidth="1.4"
          />
          <ellipse
            cx="70"
            cy="20"
            rx="26"
            ry="7"
            fill="none"
            stroke="#d0deeb"
          />
          <path
            d="M47 39 Q70 47 93 39 L90 77 Q70 84 50 77 Z"
            fill="#9ebdd6"
            opacity=".28"
          />
          <ellipse
            cx="70"
            cy="39"
            rx="23"
            ry="6"
            fill="#a9c9e0"
            opacity=".22"
          />
          {id === "co2" &&
            [0, 1, 2, 3, 4, 5].map((i) => (
              <circle
                key={i}
                cx={61 + (i % 3) * 9}
                cy={48 + i * 4}
                r={1.5 + (i % 2)}
                fill="none"
                stroke="#d2e2ef"
                strokeOpacity=".7"
              />
            ))}
        </>
      )}
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
      "Aperçu 3D de l’objet, glisser pour tourner",
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
    let model: ReturnType<typeof macroModel> | null = null;
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
      model?.dispose();
      model = macroModel(next);
      group.add(model.group);
      const bounds = new T.Box3().setFromObject(group),
        center = bounds.getCenter(new T.Vector3());
      radius = bounds.getBoundingSphere(new T.Sphere()).radius * 0.78;
      controls.target.copy(center);
      camera.position
        .copy(center)
        .add(new T.Vector3(0.5, 0.35, 1).normalize().multiplyScalar(10));
      if (next !== "methane")
        camera.position
          .copy(center)
          .add(new T.Vector3(0.15, 0.3, 1).multiplyScalar(10));
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
      model?.dispose();
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
      {failed && <MacroThumbnail id={id} />}
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
        <span className="eyebrow">COLLECTION · 03 MONDES</span>
        <h2 id="dialog-title">Du visible à l’invisible.</h2>
        <p>Choisissez un objet. Découvrez la matière qu’il contient.</p>
      </div>
      <div className="picker-body">
        <div className="picker-stage">
          <span className="preview-formula" aria-hidden="true">
            {environments[selected].state}
          </span>
          <Preview id={selected} light={light} />
          <div className="molecule-inset">
            <Thumbnail id={selected} />
            <span>
              À l’intérieur<strong>{m.formula}</strong>
            </span>
          </div>
          <span className="preview-hint">
            <Rotate3D size={14} /> Glisser pour tourner
          </span>
          <div className="preview-caption">
            <span>{environments[selected].name}</span>
            <span>≈ cm → nm</span>
          </div>
        </div>
        <div className="picker-collection" aria-label="Matières disponibles">
          {(Object.keys(molecules) as MoleculeId[]).map((id, i) => (
            <button
              key={id}
              className="molecule-choice"
              data-molecule-choice={id}
              aria-pressed={selected === id}
              onClick={() => setSelected(id)}
            >
              <span className="choice-number">0{i + 1}</span>
              <MacroThumbnail id={id} />
              <span className="choice-copy">
                <strong>{environments[id].name}</strong>
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
            <p>{environments[selected].subtitle}</p>
            <div className="picker-route">
              <span>Objet</span> →{" "}
              <span>{selected === "co2" ? "Bulle" : "Volume"}</span> →{" "}
              <span>Voisinage</span> → <strong>{m.formula}</strong>
            </div>
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
          De l’objet aux quarks.
          <small>Le même monde, à chaque échelle.</small>
        </span>
        <button
          className="picker-enter"
          data-molecule-enter
          onClick={() => onChoose(selected)}
        >
          {selected === current
            ? "Reprendre l’exploration"
            : "Explorer cet objet"}
          <ArrowRight size={17} />
        </button>
      </div>
    </>
  );
}
