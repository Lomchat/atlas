import { useEffect, useRef, useState } from "react";
import * as T from "three";
import { t, useLocale } from "../i18n";
import { WORLD_NODES } from "./data";
import { createWorldModel } from "./models";
import type { WorldModel } from "./models";
import "./comparison.css";
const references = [
  { model: "human", meters: 1.7, key: "A person · 1.7 m" },
  { model: "rock", meters: 0.0005, key: "Sand grain · 0.5 mm" },
  { model: "hair-section", meters: 80e-6, key: "Hair · 80 µm across" },
  { model: "redBloodCell", meters: 8e-6, key: "Red cell · 8 µm" },
  { model: "dna", meters: 10e-9, key: "DNA excerpt · 10 nm" },
  { model: "waterMolecule", meters: 0.3e-9, key: "Water molecule · 0.3 nm" },
  { model: "nucleon", meters: 1.7e-15, key: "Proton · ≈1.7 fm" },
] as const;
function referenceFor(id: string) {
  const meters = WORLD_NODES[id].sizeMeters || 1.7e-15;
  return references.reduce((best, item) =>
    Math.abs(Math.log10(meters / item.meters)) <
    Math.abs(Math.log10(meters / best.meters))
      ? item
      : best,
  );
}
export function WorldComparison({ selectedId }: { selectedId: string }) {
  const locale = useLocale(),
    host = useRef<HTMLDivElement>(null);
  const api = useRef<((id: string) => void) | undefined>(undefined);
  const [unresolved, setUnresolved] = useState(false);
  const node = WORLD_NODES[selectedId],
    reference = referenceFor(selectedId);
  useEffect(() => {
    const element = host.current!;
    let renderer: T.WebGLRenderer;
    try {
      renderer = new T.WebGLRenderer({ alpha: true, antialias: true });
    } catch {
      return;
    }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    renderer.setClearColor(0, 0);
    renderer.outputColorSpace = T.SRGBColorSpace;
    const canvas = renderer.domElement;
    canvas.dataset.worldComparison = "true";
    element.append(canvas);
    const scene = new T.Scene();
    scene.add(new T.HemisphereLight("#eef5ff", "#586273", 2.5));
    const light = new T.DirectionalLight("#fff4df", 2.5);
    light.position.set(-2, 3, 4);
    scene.add(light);
    const camera = new T.OrthographicCamera(-1.45, 1.45, 0.66, -0.66, 0.01, 10);
    camera.position.set(0, 0, 4);
    let models: WorldModel[] = [];
    const render = () => {
      renderer.setSize(element.clientWidth, element.clientHeight, false);
      renderer.render(scene, camera);
    };
    const set = (id: string) => {
      for (const model of models) {
        scene.remove(model.group);
        model.dispose();
      }
      models = [];
      const n = WORLD_NODES[id],
        ref = referenceFor(id),
        largest = Math.max(n.sizeMeters || 0, ref.meters);
      if (n.sizeMeters) {
        const model = createWorldModel(n.model, n.color, 2, n.atomic);
        model.group.scale.setScalar(n.sizeMeters / largest);
        model.group.position.x = -0.72;
        model.group.rotation.y = 0.2;
        scene.add(model.group);
        models.push(model);
      }
      let model: WorldModel;
      if (ref.model === "hair-section") {
        const geometry = new T.CylinderGeometry(0.5, 0.5, 0.55, 24),
          material = new T.MeshStandardMaterial({
            color: "#c19b6e",
            roughness: 0.4,
          }),
          group = new T.Group();
        const mesh = new T.Mesh(geometry, material);
        mesh.rotation.set(0.5, 0, 0.3);
        group.add(mesh);
        model = {
          group,
          update: () => {},
          dispose: () => {
            geometry.dispose();
            material.dispose();
          },
        };
      } else model = createWorldModel(ref.model, undefined, 3);
      model.group.scale.setScalar(ref.meters / largest);
      model.group.position.x = 0.72;
      model.group.rotation.y = 0.2;
      scene.add(model.group);
      models.push(model);
      const tiny = Boolean(
        n.sizeMeters && Math.min(n.sizeMeters, ref.meters) / largest < 0.025,
      );
      setUnresolved(tiny);
      canvas.dataset.ratio = n.sizeMeters
        ? String(n.sizeMeters / ref.meters)
        : "unknown";
      canvas.dataset.reference = ref.model;
      canvas.dataset.selected = id;
      render();
    };
    api.current = set;
    set(selectedId);
    const observer = new ResizeObserver(render);
    observer.observe(element);
    return () => {
      observer.disconnect();
      models.forEach((model) => model.dispose());
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
      api.current = undefined;
    };
  }, []);
  useEffect(() => api.current?.(selectedId), [selectedId]);
  return (
    <div className="world-comparison">
      <div className="world-comparison-caption">
        {t("Same scale · separate view")}
      </div>
      <div
        className="world-comparison-canvas"
        ref={host}
        role="img"
        aria-label={t("Size comparison: {name} and {reference}", {
          name: node.name[locale],
          reference: t(reference.key),
        })}
      />
      <div className="world-comparison-names">
        <span>
          {node.sizeMeters ? node.name[locale] : t("No measured diameter")}
        </span>
        <span>{t(reference.key)}</span>
      </div>
      {unresolved && (
        <p>{t("The smaller object is below this view’s resolution.")}</p>
      )}
    </div>
  );
}
