import { useId } from "react";
import type { CSSProperties } from "react";
import { t, useLocale } from "../i18n";
import "./mechanism.css";

export const MECHANISM_MESSAGES = {
  "Explanatory animation · not to scale":
    "Animation explicative · hors échelle",
  "Oxygen moves, the red cell stays in blood":
    "L’oxygène circule, le globule reste dans le sang",
  "Four hemes, up to four oxygen molecules":
    "Quatre hèmes, jusqu’à quatre molécules d’oxygène",
  "Oxygen leaves hemoglobin for tissues":
    "L’oxygène quitte l’hémoglobine vers les tissus",
  "Alveolar air": "Air alvéolaire",
  "Thin barrier": "Fine barrière",
  "Blood plasma": "Plasma sanguin",
  "Red cell": "Globule rouge",
  "Tissue cells": "Cellules du tissu",
  "Heme iron": "Fer de l’hème",
  "Double helix, two connected backbones":
    "Double hélice, deux squelettes liés",
  "DNA wraps around eight histones": "L’ADN entoure huit histones",
  "Chromatin changes its organization": "La chromatine change d’organisation",
  "Paired bases": "Bases appariées",
  "8 histones": "8 histones",
  "DNA sequence preserved": "Séquence d’ADN conservée",
  "Accessible DNA": "ADN accessible",
  "Dynamic folding": "Repliement dynamique",
  "Calcium allows binding sites to open":
    "Le calcium permet d’exposer les sites de liaison",
  "Actin slides; filament lengths stay fixed":
    "L’actine glisse ; la longueur des filaments reste fixe",
  "ATP lets myosin detach and reset":
    "L’ATP permet à la myosine de se détacher et de se réarmer",
  Actin: "Actine",
  Myosin: "Myosine",
  "Binding sites": "Sites de liaison",
  "Unchanged filament length": "Longueur de filament inchangée",
  "Light reaches thylakoid pigments":
    "La lumière atteint les pigments des thylakoïdes",
  "Light reactions store usable energy":
    "Les réactions lumineuses stockent de l’énergie utilisable",
  "Carbon is incorporated in the stroma":
    "Le carbone est incorporé dans le stroma",
  "Thylakoid membrane": "Membrane du thylakoïde",
  Stroma: "Stroma",
  "Organic compounds": "Composés organiques",
  Photons: "Photons",
  "Animation paused": "Animation en pause",
} as const;

const msg = (key: keyof typeof MECHANISM_MESSAGES) => t(key);
const delay = (seconds: number): CSSProperties => ({
  animationDelay: `${seconds}s`,
});
const colors = ["#dfa5a9", "#a6cad9", "#dbbe84", "#b4a3d8"];

function Oxygen({ phase }: { phase: number }) {
  const hemes = [
    [224, 115],
    [334, 115],
    [224, 199],
    [334, 199],
  ];
  return (
    <g className={`wmv-oxygen phase-${phase}`}>
      {phase === 0 ? (
        <>
          <rect
            x="28"
            y="65"
            width="158"
            height="190"
            rx="34"
            fill="#a7cad210"
            stroke="#a7cad255"
          />
          <path
            d="M207 55 Q216 95 207 135 T207 260 M221 55 Q230 95 221 135 T221 260"
            stroke="#dfbda6"
            strokeWidth="4"
            fill="none"
          />
          <ellipse
            cx="397"
            cy="162"
            rx="102"
            ry="67"
            fill="#c560793d"
            stroke="#d899ac"
            strokeWidth="3"
          />
          <ellipse
            cx="397"
            cy="162"
            rx="48"
            ry="29"
            fill="#3c2733"
            stroke="#c9839b"
            strokeWidth="2"
          />
          <text x="104" y="44" textAnchor="middle">
            {msg("Alveolar air")}
          </text>
          <text x="362" y="44" textAnchor="middle">
            {msg("Blood plasma")}
          </text>
          <text x="397" y="258" textAnchor="middle">
            {msg("Red cell")}
          </text>
          <text x="215" y="291" textAnchor="middle" className="wmv-small">
            {msg("Thin barrier")}
          </text>
          {[0, 1, 2, 3].map((i) => (
            <g key={i} className="wmv-diffusing" style={delay(-i * 0.75)}>
              <circle cx="79" cy={97 + i * 39} r="8" fill="#e8b36f" />
              <circle cx="92" cy={97 + i * 39} r="8" fill="#e8b36f" />
            </g>
          ))}
          <path
            d="M111 270 H391"
            className="wmv-arrow"
            markerEnd="var(--wmv-arrow)"
          />
        </>
      ) : (
        <>
          {hemes.map(([x, y], i) => (
            <g key={i}>
              <path
                d={`M${x - 48} ${y} C${x - 65} ${y - 49},${x + 19} ${y - 48},${x + 45} ${y - 14} C${x + 73} ${y + 31},${x - 29} ${y + 58},${x - 48} ${y}Z`}
                fill={i % 2 ? "#a68ac44d" : "#cb829c4d"}
                stroke={i % 2 ? "#b6a1d9" : "#d59bae"}
                strokeWidth="2"
              />
              <rect
                x={x - 15}
                y={y - 15}
                width="30"
                height="30"
                rx="6"
                fill="#ba995329"
                stroke="#e1bd78"
                strokeWidth="3"
              />
              <circle cx={x} cy={y} r="5" fill="#e5be74" />
              <g
                className={phase === 1 ? "wmv-binding" : "wmv-releasing"}
                style={delay(-i * 0.7)}
              >
                <circle cx={x - 5} cy={y - 29} r="6" fill="#efb878" />
                <circle cx={x + 5} cy={y - 29} r="6" fill="#efb878" />
              </g>
            </g>
          ))}
          {phase === 1 ? (
            <>
              <text x="280" y="49" textAnchor="middle">
                {"HbA · α₂β₂"}
              </text>
              <text x="280" y="278" textAnchor="middle">
                {msg("Heme iron")}
              </text>
            </>
          ) : (
            <>
              <path
                d="M410 62 V250"
                stroke="#9daebc77"
                strokeWidth="3"
                strokeDasharray="5 7"
              />
              {[108, 183].map((y) => (
                <g key={y}>
                  <ellipse
                    cx="486"
                    cy={y}
                    rx="43"
                    ry="30"
                    fill="#83b4a925"
                    stroke="#9dc8b8"
                    strokeWidth="2"
                  />
                  <circle cx="493" cy={y} r="10" fill="#ac94c557" />
                </g>
              ))}
              <text x="477" y="272" textAnchor="middle" className="wmv-small">
                {msg("Tissue cells")}
              </text>
            </>
          )}
        </>
      )}
    </g>
  );
}

function Histone({
  x,
  y,
  compact = false,
}: {
  x: number;
  y: number;
  compact?: boolean;
}) {
  const r = compact ? 5 : 11;
  return (
    <g transform={`translate(${x} ${y})`}>
      {Array.from({ length: 8 }, (_, i) => (
        <circle
          key={i}
          cx={Math.cos((i * Math.PI) / 4) * r * 1.5}
          cy={Math.sin((i * Math.PI) / 4) * r * 1.5}
          r={r}
          fill={i % 2 ? "#b19bcc" : "#ceafcf"}
          stroke="#6d597b"
          strokeWidth="1"
        />
      ))}
    </g>
  );
}

function Chromatin({ phase }: { phase: number }) {
  return (
    <g className={`wmv-chromatin phase-${phase}`}>
      {phase === 0 ? (
        <>
          {Array.from({ length: 19 }, (_, i) => {
            const x = 55 + i * 25,
              s = Math.sin((i * Math.PI) / 5) * 48;
            return (
              <line
                key={i}
                x1={x}
                y1={147 + s}
                x2={x}
                y2={147 - s}
                stroke={colors[i % 4]}
                strokeWidth="6"
                strokeLinecap="round"
              />
            );
          })}
          <path
            d="M55 147 C80 82 130 82 155 147 S230 212 255 147 S330 82 355 147 S430 212 455 147 S490 104 505 104"
            stroke="#95c3d9"
            strokeWidth="8"
            fill="none"
          />
          <path
            d="M55 147 C80 212 130 212 155 147 S230 82 255 147 S330 212 355 147 S430 82 455 147 S490 190 505 190"
            stroke="#dec399"
            strokeWidth="8"
            fill="none"
          />
          <circle r="7" fill="#f3dbad" className="wmv-backbone-signal" />
          <text x="280" y="260" textAnchor="middle">
            {msg("Paired bases")}
          </text>
        </>
      ) : phase === 1 ? (
        <>
          <Histone x={280} y={150} />
          <path
            d="M37 186 C91 194 181 157 225 142 C251 128 301 93 324 133 C358 191 228 223 223 164 C217 105 340 76 340 149 C340 203 426 111 516 107"
            stroke="#86bfd9"
            strokeWidth="8"
            fill="none"
            className="wmv-dna-wrap"
          />
          <path
            d="M37 193 C91 201 181 164 225 149 C251 135 301 100 324 140 C358 198 228 230 223 171 C217 112 340 83 340 156 C340 210 426 118 516 114"
            stroke="#e1be91"
            strokeWidth="3"
            fill="none"
          />
          <text x="280" y="63" textAnchor="middle">
            {msg("8 histones")}
          </text>
          <text x="280" y="270" textAnchor="middle">
            {msg("DNA sequence preserved")}
          </text>
        </>
      ) : (
        <>
          <g className="wmv-folding">
            <path
              d="M61 181 C111 68 188 58 217 138 S280 232 331 121 S441 104 494 176"
              stroke="#92c4d9"
              strokeWidth="6"
              fill="none"
            />
            {[
              [90, 132],
              [159, 102],
              [226, 162],
              [299, 183],
              [369, 113],
              [455, 132],
            ].map(([x, y], i) => (
              <g key={i} className="wmv-nucleosome" style={delay(-i * 0.3)}>
                <Histone x={x} y={y} compact />
                <ellipse
                  cx={x}
                  cy={y}
                  rx="23"
                  ry="19"
                  fill="none"
                  stroke="#d8bd8e"
                  strokeWidth="3"
                  transform={`rotate(${i * 24} ${x} ${y})`}
                />
              </g>
            ))}
          </g>
          <text x="280" y="267" textAnchor="middle">
            {msg("Dynamic folding")}
          </text>
          <text x="280" y="45" textAnchor="middle" className="wmv-small">
            {msg("Accessible DNA")}
          </text>
        </>
      )}
    </g>
  );
}

function Muscle({ phase }: { phase: number }) {
  return (
    <g className={`wmv-muscle phase-${phase}`}>
      <text x="112" y="40" textAnchor="middle" fill="#a2c8d8">
        {msg("Actin")}
      </text>
      <text x="280" y="40" textAnchor="middle" fill="#e4bf86">
        {msg("Myosin")}
      </text>
      <g className="wmv-actin-left">
        <path d="M69 91 V219" stroke="#b09cc5" strokeWidth="7" />
        {[108, 208].map((y) => (
          <g key={y}>
            <path d={`M75 ${y} H255`} stroke="#9ebbcf" strokeWidth="6" />
            {Array.from({ length: 16 }, (_, i) => (
              <circle
                key={i}
                cx={78 + i * 11.5}
                cy={y}
                r="6"
                fill={i % 2 ? "#9dc9d7" : "#688da7"}
              />
            ))}
          </g>
        ))}
      </g>
      <g className="wmv-actin-right">
        <path d="M492 91 V219" stroke="#b09cc5" strokeWidth="7" />
        {[108, 208].map((y) => (
          <g key={y}>
            <path d={`M307 ${y} H486`} stroke="#9ebbcf" strokeWidth="6" />
            {Array.from({ length: 16 }, (_, i) => (
              <circle
                key={i}
                cx={309 + i * 11.5}
                cy={y}
                r="6"
                fill={i % 2 ? "#9dc9d7" : "#688da7"}
              />
            ))}
          </g>
        ))}
      </g>
      <path
        d="M176 158 H387"
        stroke="#d0a365"
        strokeWidth="18"
        strokeLinecap="round"
      />
      {[198, 235, 325, 362].map((x, i) => (
        <g
          key={i}
          className="wmv-myosin-head"
          style={{ transformOrigin: `${x}px 158px`, ...delay(-i * 0.18) }}
        >
          <path
            d={`M${x} 158 l${i < 2 ? 17 : -17} -29`}
            stroke="#efc788"
            strokeWidth="6"
            strokeLinecap="round"
          />
          <ellipse
            cx={x + (i < 2 ? 17 : -17)}
            cy="128"
            rx="7"
            ry="10"
            fill="#efc788"
          />
        </g>
      ))}
      {phase === 0 ? (
        <>
          {[136, 194, 360, 423].map((x, i) => (
            <g key={i} className="wmv-calcium" style={delay(-i * 0.45)}>
              <circle cx={x} cy="71" r="10" fill="#c0a8df" />
              <text x={x} y="75" textAnchor="middle" className="wmv-ion">
                {"+"}
              </text>
            </g>
          ))}
          <text x="280" y="79" textAnchor="middle" className="wmv-small">
            {"Ca²⁺"}
          </text>
          <text x="280" y="268" textAnchor="middle">
            {msg("Binding sites")}
          </text>
        </>
      ) : phase === 1 ? (
        <>
          <path
            d="M111 69 H196"
            className="wmv-arrow"
            markerEnd="var(--wmv-arrow)"
          />
          <path
            d="M449 69 H364"
            className="wmv-arrow"
            markerEnd="var(--wmv-arrow)"
          />
          <text x="280" y="268" textAnchor="middle">
            {msg("Unchanged filament length")}
          </text>
        </>
      ) : (
        <>
          <g className="wmv-atp">
            <rect
              x="247"
              y="67"
              width="65"
              height="30"
              rx="15"
              fill="#94bba233"
              stroke="#a2c8a4"
            />
            <text x="280" y="88" textAnchor="middle">
              {"ATP"}
            </text>
          </g>
          <text x="280" y="268" textAnchor="middle">
            {"ATP → ADP + Pᵢ"}
          </text>
        </>
      )}
    </g>
  );
}

function Photosynthesis({ phase }: { phase: number }) {
  return (
    <g className={`wmv-photosynthesis phase-${phase}`}>
      <rect
        x="44"
        y="81"
        width="463"
        height="156"
        rx="72"
        fill="#88b5930d"
        stroke="#87b99e77"
        strokeWidth="2"
      />
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect
            x="116"
            y={112 + i * 30}
            width="130"
            height="24"
            rx="12"
            fill="#74a88955"
            stroke="#aad0a3"
            strokeWidth="2"
          />
          <path
            d={`M131 ${124 + i * 30} H230`}
            stroke="#a9c499"
            strokeWidth="3"
          />
        </g>
      ))}
      <text x="184" y="270" textAnchor="middle" className="wmv-small">
        {msg("Thylakoid membrane")}
      </text>
      <text x="390" y="262" textAnchor="middle">
        {msg("Stroma")}
      </text>
      {phase === 0 ? (
        <>
          {[0, 1, 2].map((i) => (
            <path
              key={i}
              d={`M${68 + i * 55} 28 l-9 17 17 1 -9 18 17 1 -7 21`}
              fill="none"
              stroke="#e9c17d"
              strokeWidth="4"
              className="wmv-photon"
              style={delay(-i * 0.6)}
            />
          ))}
          <text x="374" y="60" textAnchor="middle">
            {msg("Photons")}
          </text>
          <circle
            cx="209"
            cy="147"
            r="11"
            fill="#dcc97b"
            className="wmv-pigment"
          />
        </>
      ) : phase === 1 ? (
        <>
          <path
            d="M250 131 C290 99 320 98 355 119 M250 174 C301 206 321 198 356 179"
            className="wmv-energy-flow"
          />
          <g className="wmv-energy-token">
            <rect
              x="353"
              y="103"
              width="87"
              height="35"
              rx="17"
              fill="#d9bd7a24"
              stroke="#d9bd7a"
            />
            <text x="397" y="127" textAnchor="middle">
              {"ATP"}
            </text>
          </g>
          <g className="wmv-energy-token" style={delay(-1.2)}>
            <rect
              x="343"
              y="164"
              width="105"
              height="35"
              rx="17"
              fill="#a5bad524"
              stroke="#a5bad5"
            />
            <text x="397" y="188" textAnchor="middle">
              {"NADPH"}
            </text>
          </g>
          <text x="280" y="56" textAnchor="middle" className="wmv-small">
            {"2 H₂O → O₂ + 4 H⁺ + 4 e⁻"}
          </text>
        </>
      ) : (
        <>
          <g className="wmv-carbon-in">
            <text x="350" y="55" textAnchor="middle">
              {"CO₂"}
            </text>
            <path
              d="M350 65 V107"
              className="wmv-arrow"
              markerEnd="var(--wmv-arrow)"
            />
          </g>
          <path
            d="M320 151 a51 43 0 1 1 52 38"
            fill="none"
            stroke="#a4c8a5"
            strokeWidth="4"
            className="wmv-fixation-cycle"
            markerEnd="var(--wmv-arrow)"
          />
          <text x="374" y="144" textAnchor="middle" className="wmv-small">
            {"ATP"}
          </text>
          <text x="374" y="168" textAnchor="middle" className="wmv-small">
            {"NADPH"}
          </text>
          <path
            d="M430 171 l45 40"
            className="wmv-arrow"
            markerEnd="var(--wmv-arrow)"
          />
          <text x="280" y="297" textAnchor="middle" className="wmv-small">
            {msg("Organic compounds")}
          </text>
        </>
      )}
    </g>
  );
}

const titles: Record<string, readonly (keyof typeof MECHANISM_MESSAGES)[]> = {
  "oxygen-transfer": [
    "Oxygen moves, the red cell stays in blood",
    "Four hemes, up to four oxygen molecules",
    "Oxygen leaves hemoglobin for tissues",
  ],
  "chromatin-packing": [
    "Double helix, two connected backbones",
    "DNA wraps around eight histones",
    "Chromatin changes its organization",
  ],
  "muscle-sliding": [
    "Calcium allows binding sites to open",
    "Actin slides; filament lengths stay fixed",
    "ATP lets myosin detach and reset",
  ],
  photosynthesis: [
    "Light reaches thylakoid pigments",
    "Light reactions store usable energy",
    "Carbon is incorporated in the stroma",
  ],
};

export default function WorldMechanismVisual({
  id,
  phase,
  playing,
}: {
  id: string | null;
  phase: number;
  playing: boolean;
}) {
  useLocale();
  const markerId = `wmv-arrow-${useId().replace(/:/g, "")}`;
  if (!id || !titles[id]) return null;
  const current = Math.max(0, Math.min(2, phase));
  const title = msg(titles[id][current]);
  return (
    <section
      className="world-mechanism-visual"
      style={{ "--wmv-arrow": `url(#${markerId})` } as CSSProperties}
      data-world-mechanism-visual={id}
      data-phase={current}
      data-playing={playing}
      aria-label={title}
    >
      <header>
        <span className="wmv-status-dot" />
        <strong>{title}</strong>
        {!playing && (
          <span className="wmv-paused">{msg("Animation paused")}</span>
        )}
      </header>
      <svg viewBox="0 0 560 315" role="img" aria-label={title}>
        <defs>
          <marker
            id={markerId}
            markerWidth="8"
            markerHeight="8"
            refX="6"
            refY="4"
            orient="auto"
          >
            <path
              d="M1 1 L6 4 L1 7"
              fill="none"
              stroke="#c6cfda"
              strokeWidth="1.5"
            />
          </marker>
        </defs>
        <g key={`${id}:${current}`}>
          {id === "oxygen-transfer" && <Oxygen phase={current} />}
          {id === "chromatin-packing" && <Chromatin phase={current} />}
          {id === "muscle-sliding" && <Muscle phase={current} />}
          {id === "photosynthesis" && <Photosynthesis phase={current} />}
        </g>
      </svg>
      <footer>{msg("Explanatory animation · not to scale")}</footer>
    </section>
  );
}
