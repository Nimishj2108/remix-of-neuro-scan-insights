import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ScanFinding } from "@/lib/neuro-data";
import { severityColor } from "@/lib/neuro-data";

/**
 * BrainSliceViewer — stylized axial MRI slice with clickable finding markers.
 */
export default function BrainSliceViewer({
  findings,
}: {
  findings: ScanFinding[];
}) {
  const [active, setActive] = useState<ScanFinding | null>(null);

  return (
    <div className="relative">
      <svg
        viewBox="0 0 100 100"
        className="w-full aspect-square bg-dark-base pixel-border-sm"
        role="img"
        aria-label="Axial brain MRI slice with detected findings"
      >
        <defs>
          <radialGradient id="tissue" cx="50%" cy="46%" r="55%">
            <stop offset="0%" stopColor="#3a242c" />
            <stop offset="60%" stopColor="#241419" />
            <stop offset="100%" stopColor="#120a0d" />
          </radialGradient>
          <radialGradient id="ventricle" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#0a0a0a" />
            <stop offset="100%" stopColor="#1a0f13" />
          </radialGradient>
        </defs>

        {/* Skull ring */}
        <ellipse cx="50" cy="50" rx="44" ry="48" fill="#1c1015" />
        {/* Brain tissue */}
        <ellipse cx="50" cy="50" rx="40" ry="44" fill="url(#tissue)" />
        {/* Hemispheric fissure */}
        <line
          x1="50"
          y1="8"
          x2="50"
          y2="92"
          stroke="#0a0a0a"
          strokeWidth="1.2"
          opacity="0.8"
        />
        {/* Ventricles */}
        <ellipse cx="44" cy="48" rx="4.5" ry="9" fill="url(#ventricle)" />
        <ellipse cx="56" cy="48" rx="4.5" ry="9" fill="url(#ventricle)" />
        {/* Cortical folds */}
        {Array.from({ length: 26 }).map((_, i) => {
          const a = (i / 26) * Math.PI * 2;
          const x1 = 50 + Math.cos(a) * 34;
          const y1 = 50 + Math.sin(a) * 38;
          const x2 = 50 + Math.cos(a) * 39;
          const y2 = 50 + Math.sin(a) * 43;
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="#0f080b"
              strokeWidth="1.6"
              opacity="0.7"
            />
          );
        })}
        {/* Scan grid */}
        {Array.from({ length: 7 }).map((_, i) => (
          <line
            key={`h${i}`}
            x1="6"
            y1={14 + i * 12}
            x2="94"
            y2={14 + i * 12}
            stroke="#E8506A"
            strokeWidth="0.15"
            opacity="0.15"
          />
        ))}

        {/* Finding markers */}
        {findings.map((f) => {
          const color = severityColor(f.severity);
          const isActive = active?.id === f.id;
          return (
            <g
              key={f.id}
              onClick={() => setActive(isActive ? null : f)}
              className="cursor-pointer"
              role="button"
              aria-label={`Finding: ${f.type}`}
            >
              <circle
                cx={f.x}
                cy={f.y}
                r={isActive ? 7 : 5}
                fill="none"
                stroke={color}
                strokeWidth="0.5"
                opacity="0.5"
              >
                <animate
                  attributeName="r"
                  values={`${isActive ? 7 : 5};${isActive ? 9 : 7};${isActive ? 7 : 5}`}
                  dur="2s"
                  repeatCount="indefinite"
                />
              </circle>
              <circle cx={f.x} cy={f.y} r="2.2" fill={color} />
              <text
                x={f.x + 3.5}
                y={f.y - 3}
                fill={color}
                fontSize="3.4"
                fontFamily="monospace"
              >
                {f.id}
              </text>
            </g>
          );
        })}

        {/* Corner HUD */}
        <text x="7" y="11" fill="#E8506A" fontSize="3" fontFamily="monospace" opacity="0.8">
          AXIAL · T1-CE
        </text>
        <text x="93" y="11" fill="#E8506A" fontSize="3" fontFamily="monospace" textAnchor="end" opacity="0.8">
          SLICE 78/155
        </text>
      </svg>

      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="absolute left-2 right-2 bottom-2 pixel-border-sm p-3"
          >
            <div className="flex items-center justify-between mb-1">
              <p
                className="font-pixel text-[8px]"
                style={{ color: severityColor(active.severity) }}
              >
                {active.id} · {active.type}
              </p>
              <button
                onClick={() => setActive(null)}
                className="font-mono text-xs text-cream/50 hover:text-cream px-1"
              >
                ✕
              </button>
            </div>
            <p className="font-mono text-xs text-cream/70 leading-snug">
              {active.region} — {active.size_mm}mm ·{" "}
              {(active.confidence * 100).toFixed(1)}% confidence
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
