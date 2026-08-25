import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, type MotionValue } from "framer-motion";
import { NEURO_FACTS } from "@/lib/neuro-data";

/**
 * NeuralWebCanvas — scroll/zoom-driven 3D neural web rendered on a 2D canvas.
 *
 * Two brain hemispheres made of neural clusters; synapse wiring inside each
 * cluster; signal particles travelling along the wires. Scrolling dives the
 * camera into the web; passing a cluster at close range surfaces a neuro fact.
 */

const CFG = {
  baseDepth: 600,
  baseFocalLength: 600,
  scrollSensitivity: 0.8,
  maxCameraZ: 1400,
  focalBoostPerZ: 0.7,
  hemisphereSeparationGain: 2.0,
  rotVelX: 0.0008,
  rotVelY: 0.0005,
  bgColor: "#0a0a0a",
  pR: 232,
  pG: 80,
  pB: 106,
  shellPointsPerHemi: 90,
  shellSpreadX: 200,
  shellSpreadY: 190,
  shellSpreadZ: 150,
  shellSize: 3,
  shellOpacity: 0.06,
  shellFadeStart: 200,
  shellFadeEnd: 600,
  hemisphereOffsetX: 120,
  clustersPerHemi: 12,
  clusterJitter: 3,
  clusterSpread: 100,
  neuronsPerCluster: 38,
  neuronJitter: 10,
  clusterRadius: 30,
  neuronBaseSize: 4,
  neuronSizeJitter: 2,
  intraRadius: 0.65,
  intraChance: 0.12,
  wireWidth: 0.3,
  minOpacity: 0.04,
  maxOpacity: 0.55,
  nearZ: 30,
  farZ: 900,
  particleCount: 50,
  particleSpeed: 0.005,
  particleSize: 1.1,
  triggerScale: 25,
  dismissScale: 80,
  finalThreshold: 1000,
  overdriveGain: 3.0,
  insideRingCount: 14,
};

interface ShellPoint {
  baseX: number;
  baseY: number;
  baseZ: number;
  hemiIdx: number;
}
interface Cluster {
  hemiIdx: number;
  baseCX: number;
  baseCY: number;
  baseCZ: number;
  nodeStart: number;
  nodeEnd: number;
  factText: string;
}
interface Node3D {
  baseX: number;
  baseY: number;
  baseZ: number;
  size: number;
  clusterIdx: number;
}
interface Edge {
  a: number;
  b: number;
}
interface Particle {
  edgeIdx: number;
  progress: number;
  speed: number;
}

interface NeuralWebCanvasProps {
  zoomLevel?: MotionValue<number>;
  onFact?: (fact: string | null) => void;
  decorative?: boolean;
}

export default function NeuralWebCanvas({
  zoomLevel,
  onFact,
  decorative = false,
}: NeuralWebCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeFact, setActiveFact] = useState<string | null>(null);
  const onFactRef = useRef(onFact);
  onFactRef.current = onFact;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let destroyed = false;
    let raf = 0;

    let cW = 0;
    let cH = 0;
    const vanish = { x: 0, y: 0 };
    function resize() {
      if (destroyed) return;
      const dpr = window.devicePixelRatio || 1;
      cW = window.innerWidth * dpr;
      cH = window.innerHeight * dpr;
      canvas!.width = cW;
      canvas!.height = cH;
      canvas!.style.width = `${window.innerWidth}px`;
      canvas!.style.height = `${window.innerHeight}px`;
      vanish.x = cW / 2;
      vanish.y = cH / 2;
    }
    resize();
    window.addEventListener("resize", resize);

    let cameraZ = 0;
    function onScroll() {
      if (destroyed) return;
      cameraZ = Math.min(window.scrollY * CFG.scrollSensitivity, CFG.maxCameraZ);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);
    const rgba = (r: number, g: number, b: number, a: number) =>
      `rgba(${r},${g},${b},${Math.max(0, a).toFixed(3)})`;

    function project(
      x: number,
      y: number,
      z: number,
      cosX: number,
      sinX: number,
      cosY: number,
      sinY: number,
      depth: number,
      fl: number,
    ) {
      const y1 = y * cosX - z * sinX;
      const z1 = z * cosX + y * sinX;
      const z2 = z1 * cosY - x * sinY;
      const x1 = x * cosY + z1 * sinY;
      const zF = z2 + depth;
      const sc = fl / Math.max(zF, 1);
      const dn = Math.max(
        0,
        Math.min(1, (zF - CFG.nearZ) / (CFG.farZ - CFG.nearZ)),
      );
      return {
        sx: vanish.x + x1 * sc,
        sy: vanish.y + y1 * sc,
        scale: sc,
        opacity: CFG.maxOpacity - dn * (CFG.maxOpacity - CFG.minOpacity),
      };
    }

    // ── Generation (once) ─────────────────────────────────────
    const shellPoints: ShellPoint[] = [];
    for (let hemi = 0; hemi < 2; hemi++) {
      const sign = hemi === 0 ? -1 : 1;
      for (let i = 0; i < CFG.shellPointsPerHemi; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const rx = CFG.shellSpreadX * (0.7 + Math.random() * 0.3);
        const ry = CFG.shellSpreadY * (0.7 + Math.random() * 0.3);
        const rz = CFG.shellSpreadZ * (0.7 + Math.random() * 0.3);
        shellPoints.push({
          baseX: sign * rx * 0.5 + rx * 0.3 * Math.sin(phi) * Math.cos(theta),
          baseY: ry * 0.5 * Math.sin(phi) * Math.sin(theta),
          baseZ: rz * 0.4 * Math.cos(phi),
          hemiIdx: hemi,
        });
      }
    }

    const clusters: Cluster[] = [];
    const nodes: Node3D[] = [];
    const edges: Edge[] = [];
    const particles: Particle[] = [];
    let factIdx = 0;

    for (let hemi = 0; hemi < 2; hemi++) {
      const hemiX = hemi === 0 ? -CFG.hemisphereOffsetX : CFG.hemisphereOffsetX;
      const clusterCount =
        CFG.clustersPerHemi +
        Math.floor(rand(-CFG.clusterJitter, CFG.clusterJitter));
      for (let s = 0; s < clusterCount; s++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = CFG.clusterSpread * (0.3 + Math.random() * 0.7);
        const cx = hemiX + r * Math.sin(phi) * Math.cos(theta);
        const cy = r * Math.sin(phi) * Math.sin(theta) * 0.8;
        const cz = r * Math.cos(phi) * 0.6;

        const clusterIdx = clusters.length;
        const nodeStart = nodes.length;
        const count =
          CFG.neuronsPerCluster +
          Math.floor(rand(-CFG.neuronJitter, CFG.neuronJitter));
        for (let a = 0; a < count; a++) {
          const at = Math.random() * Math.PI * 2;
          const ap = Math.acos(2 * Math.random() - 1);
          const ar = CFG.clusterRadius * Math.pow(Math.random(), 0.6);
          nodes.push({
            baseX: cx + ar * Math.sin(ap) * Math.cos(at),
            baseY: cy + ar * Math.sin(ap) * Math.sin(at),
            baseZ: cz + ar * Math.cos(ap),
            size:
              CFG.neuronBaseSize +
              rand(-CFG.neuronSizeJitter, CFG.neuronSizeJitter),
            clusterIdx,
          });
        }
        const nodeEnd = nodes.length;

        for (let i = nodeStart; i < nodeEnd; i++) {
          for (let j = i + 1; j < nodeEnd; j++) {
            const dx = nodes[i].baseX - nodes[j].baseX;
            const dy = nodes[i].baseY - nodes[j].baseY;
            const dz = nodes[i].baseZ - nodes[j].baseZ;
            if (
              Math.sqrt(dx * dx + dy * dy + dz * dz) <
                CFG.clusterRadius * CFG.intraRadius &&
              Math.random() < CFG.intraChance
            ) {
              edges.push({ a: i, b: j });
            }
          }
        }

        clusters.push({
          hemiIdx: hemi,
          baseCX: cx,
          baseCY: cy,
          baseCZ: cz,
          nodeStart,
          nodeEnd,
          factText: NEURO_FACTS[factIdx % NEURO_FACTS.length],
        });
        factIdx++;
      }
    }

    for (let p = 0; p < CFG.particleCount && edges.length > 0; p++) {
      particles.push({
        edgeIdx: Math.floor(Math.random() * edges.length),
        progress: Math.random(),
        speed: CFG.particleSpeed * (0.5 + Math.random()),
      });
    }

    // ── Animation loop ────────────────────────────────────────
    let tick = 0;
    let lastFact: string | null = null;

    function loop() {
      if (destroyed || !ctx || !canvas) return;

      ctx.fillStyle = CFG.bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      tick++;

      const pastFinal = cameraZ > CFG.finalThreshold;
      const overdriveT = pastFinal
        ? Math.min(
            (cameraZ - CFG.finalThreshold) /
              (CFG.maxCameraZ - CFG.finalThreshold),
            1,
          )
        : 0;
      const overdriveMultiplier = 1 + overdriveT * CFG.overdriveGain;

      const depth = CFG.baseDepth - cameraZ * overdriveMultiplier;
      const fl =
        CFG.baseFocalLength + cameraZ * CFG.focalBoostPerZ * overdriveMultiplier;
      const diveFraction = Math.min(cameraZ / CFG.maxCameraZ, 1);
      const hemiMult = 1 + diveFraction * CFG.hemisphereSeparationGain;

      const currentZoom = zoomLevel ? zoomLevel.get() : 1;
      const zoomExpand = 1 + (currentZoom - 1) * 0.02;
      const zoomDepth = depth / Math.max(zoomExpand, 0.15);

      const rotX = tick * CFG.rotVelX;
      const rotY = tick * CFG.rotVelY;
      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);
      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);

      // Shell (brain envelope) fades as we dive
      const shellFade = Math.max(
        0,
        Math.min(
          1,
          (CFG.shellFadeEnd - cameraZ) / (CFG.shellFadeEnd - CFG.shellFadeStart),
        ),
      );
      const shellAlpha = CFG.shellOpacity * shellFade;
      const shellExpand = 1 + diveFraction * 1.5;

      if (shellAlpha > 0.002) {
        for (const sp of shellPoints) {
          const sign = sp.hemiIdx === 0 ? -1 : 1;
          const sx = sp.baseX + (hemiMult - 1) * sign * 40;
          const p = project(
            sx * shellExpand,
            sp.baseY * shellExpand,
            sp.baseZ * shellExpand,
            cosX,
            sinX,
            cosY,
            sinY,
            zoomDepth,
            fl,
          );
          const r = CFG.shellSize * p.scale;
          if (r < 0.1) continue;
          ctx.beginPath();
          ctx.arc(p.sx, p.sy, r, 0, Math.PI * 2);
          ctx.fillStyle = rgba(
            CFG.pR,
            CFG.pG,
            CFG.pB,
            shellAlpha * Math.max(0.2, p.opacity),
          );
          ctx.fill();
        }
      }

      // Project nodes
      const px: number[] = new Array(nodes.length);
      const py: number[] = new Array(nodes.length);
      const pscale: number[] = new Array(nodes.length);
      const popacity: number[] = new Array(nodes.length);
      const clusterScaleSum = new Float64Array(clusters.length);
      const clusterScaleCnt = new Float64Array(clusters.length);
      const clusterOnScreen = new Array<boolean>(clusters.length).fill(false);

      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        const c = clusters[n.clusterIdx];
        const sign = c.hemiIdx === 0 ? -1 : 1;
        const ox = (hemiMult - 1) * sign * 40;
        const p = project(
          (n.baseX + ox) * zoomExpand,
          n.baseY * zoomExpand,
          n.baseZ * zoomExpand,
          cosX,
          sinX,
          cosY,
          sinY,
          zoomDepth,
          fl,
        );
        px[i] = p.sx;
        py[i] = p.sy;
        pscale[i] = p.scale;
        popacity[i] = p.opacity;
        clusterScaleSum[n.clusterIdx] += p.scale;
        clusterScaleCnt[n.clusterIdx] += 1;
        if (
          p.sx > -100 &&
          p.sx < cW + 100 &&
          p.sy > -100 &&
          p.sy < cH + 100
        ) {
          clusterOnScreen[n.clusterIdx] = true;
        }
      }

      // Synapse wires
      ctx.lineWidth = CFG.wireWidth;
      for (const e of edges) {
        const o = Math.min(popacity[e.a], popacity[e.b]) * 0.4;
        if (o < 0.01) continue;
        ctx.beginPath();
        ctx.moveTo(px[e.a], py[e.a]);
        ctx.lineTo(px[e.b], py[e.b]);
        ctx.strokeStyle = rgba(CFG.pR, CFG.pG, CFG.pB, o);
        ctx.stroke();
      }

      // Neurons
      for (let i = 0; i < nodes.length; i++) {
        const r = nodes[i].size * pscale[i];
        if (r < 0.1) continue;
        ctx.beginPath();
        ctx.arc(px[i], py[i], r, 0, Math.PI * 2);
        ctx.fillStyle = rgba(CFG.pR, CFG.pG, CFG.pB, popacity[i]);
        ctx.fill();
      }

      // Signal particles
      for (const pt of particles) {
        pt.progress += pt.speed;
        if (pt.progress > 1) {
          pt.progress = 0;
          pt.edgeIdx = Math.floor(Math.random() * edges.length);
        }
        const e = edges[pt.edgeIdx];
        const x = px[e.a] + (px[e.b] - px[e.a]) * pt.progress;
        const y = py[e.a] + (py[e.b] - py[e.a]) * pt.progress;
        const s = (pscale[e.a] + pscale[e.b]) / 2;
        const r = CFG.particleSize * s * 2;
        if (r < 0.2) continue;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = rgba(255, 170, 130, 0.9);
        ctx.shadowColor = "rgba(255,140,100,0.8)";
        ctx.shadowBlur = CFG.particleSize * 5 * s;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Inside-the-cluster rings past the final threshold
      if (pastFinal) {
        ctx.lineWidth = 1.5;
        for (let i = 0; i < CFG.insideRingCount; i++) {
          const t = (i + 1) / CFG.insideRingCount;
          const rad =
            ((tick * 0.4 + t * 400) % 500) * (1 + overdriveT) * (cW / 900);
          ctx.beginPath();
          ctx.arc(vanish.x, vanish.y, rad, 0, Math.PI * 2);
          ctx.strokeStyle = rgba(CFG.pR, CFG.pG, CFG.pB, 0.18 * (1 - t * 0.5));
          ctx.stroke();
        }
      }

      // Fact trigger
      if (!decorative) {
        let fact: string | null = null;
        for (let ci = 0; ci < clusters.length; ci++) {
          if (!clusterOnScreen[ci] || clusterScaleCnt[ci] === 0) continue;
          const avg = clusterScaleSum[ci] / clusterScaleCnt[ci];
          if (avg > CFG.triggerScale && avg < CFG.dismissScale) {
            fact = clusters[ci].factText;
            break;
          }
        }
        if (pastFinal && !fact) {
          fact = clusters[0]?.factText ?? null;
        }
        if (fact !== lastFact) {
          lastFact = fact;
          setActiveFact(fact);
          onFactRef.current?.(fact);
        }
      }

      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);

    return () => {
      destroyed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", onScroll);
    };
  }, [zoomLevel, decorative]);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{ willChange: "transform", transform: "translateZ(0)" }}
      />
      <AnimatePresence>
        {activeFact && !decorative && (
          <motion.div
            key={activeFact}
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 22 }}
            className="fixed bottom-10 right-10 z-[9998] pointer-events-none"
          >
            <div className="bg-dark-base/90 border-2 border-coral px-6 py-3 max-w-md">
              <p className="font-pixel text-[7px] text-coral tracking-[0.2em] mb-1">
                NEURAL CLUSTER
              </p>
              <p className="font-mono text-xs text-coral/80 leading-relaxed">
                {activeFact}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
