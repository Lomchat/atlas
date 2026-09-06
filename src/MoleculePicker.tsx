import { useEffect, useId, useRef, useState } from "react";
import { ArrowRight, Check, Rotate3D } from "lucide-react";
import * as T from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { macroModel, objectPalette } from "./MacroModel";
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
  const palette = objectPalette[id];
  return (
    <svg viewBox="0 0 140 94" aria-hidden="true">
      <defs>
        <linearGradient id={uid}>
          <stop stopColor={palette.edge} stopOpacity=".7" />
          <stop offset=".25" stopColor={palette.body} stopOpacity=".35" />
          <stop
            offset=".65"
            stopColor={palette.body}
            stopOpacity={id === "methane" ? ".8" : ".1"}
          />
          <stop offset="1" stopColor={palette.edge} stopOpacity=".65" />
        </linearGradient>
      </defs>
      <ellipse
        cx="70"
        cy="82"
        rx="34"
        ry="7"
        fill="#233b51"
        stroke={palette.accent}
        strokeWidth="1.4"
      />
      {id === "methane" ? (
        <>
          <path
            d="M59 18 L59 29 Q59 33 52 37 Q43 42 43 49 L43 75 Q43 84 70 84 Q97 84 97 75 L97 49 Q97 42 88 37 Q81 33 81 29 L81 18 Z"
            fill={`url(#${uid})`}
            stroke={palette.edge}
            strokeWidth="1.2"
          />
          <rect
            x="56"
            y="11"
            width="28"
            height="11"
            rx="3"
            fill={palette.accent}
          />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <path
              key={i}
              d={`M${60 + i * 4} 13 v6`}
              stroke="#e9b07d"
              strokeOpacity=".6"
            />
          ))}
          <path d="M44 53 Q70 58 96 53 L96 73 Q70 79 44 73 Z" fill="#f0e7d5" />
          <text
            x="70"
            y="69"
            textAnchor="middle"
            fill="#26436d"
            fontSize="13"
            fontWeight="700"
          >
            CH₄
          </text>
          <path
            d="M49 46 L49 51 M49 77 L49 78"
            stroke="#c1dcff"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </>
      ) : (
        <>
          <path
            d="M44 20 L50 76 Q51 84 70 84 Q89 84 90 76 L96 20"
            fill={`url(#${uid})`}
            stroke={palette.edge}
            strokeWidth="1.4"
          />
          <path
            d="M47 39 Q70 47 93 39 L90 76 Q70 84 50 76 Z"
            fill={palette.body}
            opacity=".48"
          />
          <ellipse
            cx="70"
            cy="39"
            rx="23"
            ry="6"
            fill={palette.body}
            opacity=".7"
            stroke={palette.edge}
            strokeWidth=".8"
          />
          <ellipse
            cx="70"
            cy="20"
            rx="26"
            ry="7"
            fill="none"
            stroke={palette.edge}
            strokeWidth="1.6"
          />
          <path
            d="M49 26 L53 72"
            stroke="#dcf6ff"
            strokeWidth="2"
            strokeLinecap="round"
            opacity=".65"
          />
          {id === "co2" &&
            Array.from({ length: 10 }, (_, i) => (
              <circle
                key={i}
                cx={59 + (i % 3) * 10}
                cy={47 + ((i * 7) % 29)}
                r={1.3 + (i % 3) * 0.5}
                fill="#b3edfa"
                fillOpacity=".12"
                stroke="#e0fbff"
                strokeOpacity=".85"
                strokeWidth=".9"
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
      "3D object preview, drag to rotate",
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
        <span className="eyebrow">COLLECTION · 03 WORLDS</span>
        <h2 id="dialog-title">From the visible to the invisible.</h2>
        <p>Choose an object. Discover the matter inside.</p>
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
              Inside<strong>{m.formula}</strong>
            </span>
          </div>
          <span className="preview-hint">
            <Rotate3D size={14} /> Drag to rotate
          </span>
          <div className="preview-caption">
            <span>{environments[selected].name}</span>
            <span>≈ cm → nm</span>
          </div>
        </div>
        <div className="picker-collection" aria-label="Available materials">
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
                  atoms
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
              <span>Object</span> →{" "}
              <span>{selected === "co2" ? "Bubble" : "Volume"}</span> →{" "}
              <span>Neighborhood</span> → <strong>{m.formula}</strong>
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
          From objects to quarks.
          <small>The same world, at every scale.</small>
        </span>
        <button
          className="picker-enter"
          data-molecule-enter
          onClick={() => onChoose(selected)}
        >
          {selected === current ? "Resume exploration" : "Explore this object"}
          <ArrowRight size={17} />
        </button>
      </div>
    </>
  );
}
