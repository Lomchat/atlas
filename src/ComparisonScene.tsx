import { useEffect, useRef } from "react";
import * as T from "three";
import { comparisonModel } from "./ComparisonModels";
import type { MatterNode } from "./continuum";
import type { MoleculeId } from "./data";
import { t, useLocale } from "./i18n";

type Props = {
  reference: string;
  referenceMeters: number;
  subject: string;
  subjectMeters: number;
  node: MatterNode;
  molecule: MoleculeId;
  onMeasure: (meters: number) => void;
};
export default function ComparisonScene(props: Props) {
  const host = useRef<HTMLDivElement>(null),
    current = useRef(props);
  current.current = props;
  const locale = useLocale();
  const language = useRef(locale);
  language.current = locale;
  useEffect(() => {
    const el = host.current!;
    let renderer: T.WebGLRenderer;
    try {
      renderer = new T.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: "low-power",
      });
    } catch {
      return;
    }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.domElement.dataset.comparisonScene = "true";
    el.appendChild(renderer.domElement);
    const scene = new T.Scene();
    scene.add(new T.HemisphereLight("#dceaff", "#45405a", 2.8));
    const key = new T.DirectionalLight("#fff0d8", 4);
    key.position.set(-3, 4, 6);
    scene.add(key);
    const rim = new T.DirectionalLight("#87b8df", 2);
    rim.position.set(4, 0, -3);
    scene.add(rim);
    const camera = new T.OrthographicCamera(-3, 3, 1.5, -1.5, 0.01, 100);
    camera.position.set(0, 0.12, 8);
    camera.lookAt(0, 0, 0);
    const left = comparisonModel(props.subject, props.molecule, props.node),
      right = comparisonModel(props.reference, props.molecule);
    if (props.subject === "sample") current.current.onMeasure(left.dimension);
    const a = new T.Group(),
      b = new T.Group();
    a.add(left.group);
    b.add(right.group);
    scene.add(a, b);
    let frame = 0,
      last = "",
      width = 1,
      height = 1;
    const resize = new ResizeObserver(() => {
      width = el.clientWidth;
      height = el.clientHeight;
      renderer.setSize(width, height);
      last = "";
    });
    resize.observe(el);
    function render() {
      frame = requestAnimationFrame(render);
      const p = current.current;
      if (renderer.domElement.dataset.locale !== language.current) {
        renderer.domElement.dataset.locale = language.current;
        left.updateLanguage();
        right.updateLanguage();
        last = "";
      }
      const signature = `${p.referenceMeters}:${p.subjectMeters}:${width}:${height}`;
      if (signature === last) return;
      last = signature;
      const max = Math.max(p.subjectMeters, p.referenceMeters, 1e-30);
      const subjectScale = p.subjectMeters / max,
        referenceScale = p.referenceMeters / max;
      a.scale.setScalar(subjectScale);
      b.scale.setScalar(referenceScale);
      a.position.set(-0.9, 0, 0);
      b.position.set(0.9, 0, 0);
      a.rotation.y = -0.24;
      b.rotation.y = 0.28;
      const box = new T.Box3().setFromObject(scene),
        size = box.getSize(new T.Vector3());
      const halfHeight = Math.max(
        0.66,
        size.y * 0.58,
        (size.x * 0.6) / (width / height),
      );
      camera.top = halfHeight;
      camera.bottom = -halfHeight;
      camera.left = (-halfHeight * width) / height;
      camera.right = (halfHeight * width) / height;
      camera.updateProjectionMatrix();
      renderer.domElement.dataset.referenceMeters = String(p.referenceMeters);
      renderer.domElement.dataset.subjectMeters = String(p.subjectMeters);
      renderer.domElement.dataset.referencePixels = String(
        (referenceScale * height) / (halfHeight * 2),
      );
      renderer.domElement.dataset.subjectPixels = String(
        (subjectScale * height) / (halfHeight * 2),
      );
      renderer.render(scene, camera);
    }
    render();
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      left.dispose();
      right.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, [props.reference, props.subject, props.molecule, props.node.element]);
  return (
    <div
      className="comparison-stage"
      ref={host}
      role="img"
      aria-label={t("3D comparison: both objects share the same scale")}
    />
  );
}
