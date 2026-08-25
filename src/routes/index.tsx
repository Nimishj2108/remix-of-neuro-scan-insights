import { useEffect, useRef, useState, lazy, Suspense } from "react";
import { createFileRoute, Link, ClientOnly } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  BookOpen,
  FileText,
  Cpu,
  Shield,
  BarChart3,
  Activity,
} from "lucide-react";
import type { BrainPhase } from "@/components/neuro/BrainScene";

const BrainScene = lazy(() => import("@/components/neuro/BrainScene"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NeuroScan — AI Brain CT Analysis" },
      {
        name: "description",
        content:
          "NeuroScan analyzes brain CT scans with deep learning: 3D tumor segmentation, pathology detection, and an interactive neural-web visualization.",
      },
      { property: "og:title", content: "NeuroScan — AI Brain CT Analysis" },
      {
        property: "og:description",
        content:
          "Deep-learning brain CT analysis with 3D tumor segmentation and an interactive neural-web viewer.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const features = [
  {
    icon: Cpu,
    title: "nnU-Net + 3D-ResNet",
    desc: "Deep learning pipeline trained on thousands of CT volumes for tumor segmentation.",
  },
  {
    icon: Activity,
    title: "Real-Time Detection",
    desc: "Detects and localizes gliomas, edema, and necrotic cores with high confidence.",
  },
  {
    icon: Shield,
    title: "Clinical-Grade Accuracy",
    desc: "Built on peer-reviewed BraTS datasets and validated against clinical guidelines.",
  },
  {
    icon: BarChart3,
    title: "Severity Classification",
    desc: "Grades findings from low to critical with visual explanations on each slice.",
  },
];

function Index() {
  const [brainPhase, setBrainPhase] = useState<BrainPhase>("exterior");
  const isExterior = brainPhase === "exterior";

  // Scroll-up-at-top dive detection (ported from the original):
  // only triggers at scroll Y=0, before the user has scrolled down.
  const hasScrolledDown = useRef(false);
  const scrollUpAccum = useRef(0);
  const SCROLL_UP_THRESHOLD = 300;

  useEffect(() => {
    hasScrolledDown.current = false;
    scrollUpAccum.current = 0;

    if (brainPhase !== "exterior") return;

    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });

    const onScroll = () => {
      if (window.scrollY > 10) {
        hasScrolledDown.current = true;
        scrollUpAccum.current = 0;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [brainPhase]);

  useEffect(() => {
    if (brainPhase !== "exterior") return;
    const onWheel = (e: WheelEvent) => {
      if (window.scrollY > 5) return;
      if (hasScrolledDown.current) return;
      if (e.deltaY < 0) {
        scrollUpAccum.current += Math.abs(e.deltaY);
        if (scrollUpAccum.current >= SCROLL_UP_THRESHOLD) {
          scrollUpAccum.current = 0;
          setBrainPhase("diving");
        }
      } else {
        scrollUpAccum.current = 0;
      }
    };
    window.addEventListener("wheel", onWheel, { passive: true });
    return () => window.removeEventListener("wheel", onWheel);
  }, [brainPhase]);

  // diving → interior after the fly-in; ESC surfaces
  useEffect(() => {
    if (brainPhase === "diving") {
      const t = setTimeout(() => setBrainPhase("interior"), 2800);
      return () => clearTimeout(t);
    }
    if (brainPhase === "surfacing") {
      const t = setTimeout(() => setBrainPhase("exterior"), 900);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [brainPhase]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && brainPhase === "interior") {
        setBrainPhase("surfacing");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [brainPhase]);

  return (
    <main className="min-h-screen w-full bg-dark-base overflow-x-hidden relative">
      {/* 3D Brain Background */}
      <div className={`fixed inset-0 ${isExterior ? "z-10" : "z-30"}`}>
        <ClientOnly fallback={null}>
          <Suspense fallback={null}>
            <BrainScene phase={brainPhase} onPhaseChange={setBrainPhase} />
          </Suspense>
        </ClientOnly>
      </div>

      {/* Page content */}
      <div
        className={`relative z-20 transition-opacity duration-700 ${isExterior ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      >
        {/* ═══════════ HERO ═══════════ */}
        <section className="relative z-10 flex flex-col items-center justify-center min-h-screen text-center px-4">
          <motion.h1
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.6, 0.01, 0.05, 0.95] }}
            className="font-pixel text-4xl md:text-6xl text-coral glow-text-coral tracking-wider"
            style={{ WebkitTextStroke: "1.5px black", paintOrder: "stroke fill" }}
          >
            NeuroScan
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="font-mono text-lg md:text-2xl text-cream mt-4 max-w-xl"
          >
            Advanced Brain Tumor Detection from CT
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.5 }}
            className="flex flex-wrap items-center justify-center gap-4 mt-10"
          >
            <Link
              to="/scanner"
              className="btn-retro px-6 py-3 font-pixel text-xs md:text-sm"
            >
              Open Scanner
            </Link>
            <Link
              to="/learn-more"
              className="btn-retro-outline px-6 py-3 font-pixel text-xs md:text-sm flex items-center gap-2"
            >
              <BookOpen className="w-4 h-4" />
              Learn More
            </Link>
            <Link
              to="/citations"
              className="btn-retro-outline px-6 py-3 font-pixel text-xs md:text-sm flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Citations
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.6 }}
            className="absolute bottom-8 left-0 right-0 text-center"
          >
            <p className="font-mono text-sm text-cream/30 animate-pulse-slow">
              ▼ scroll down to explore &nbsp;·&nbsp; ▲ scroll up to dive inside
            </p>
          </motion.div>
        </section>

        {/* ═══════════ FEATURE CARDS ═══════════ */}
        <section className="relative z-10 px-4 py-24 max-w-5xl mx-auto">
          <motion.h2
            initial={{ scale: 0.8, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: false, amount: 0.5 }}
            transition={{ duration: 0.5, ease: [0.6, 0.01, 0.05, 0.95] }}
            className="font-pixel text-xl md:text-2xl text-coral text-center mb-16 glow-text-coral"
          >
            What Powers NeuroScan
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.div
                  key={i}
                  initial={{ scale: 0.8, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ once: false, amount: 0.5 }}
                  transition={{
                    delay: i * 0.1,
                    duration: 0.5,
                    ease: [0.6, 0.01, 0.05, 0.95],
                  }}
                  className="pixel-border p-6 hover:shadow-coral-glow transition-shadow"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 pixel-border-sm flex items-center justify-center">
                      <Icon className="w-5 h-5 text-coral" />
                    </div>
                    <div>
                      <h3 className="font-pixel text-xs text-coral mb-2">
                        {f.title}
                      </h3>
                      <p className="font-mono text-sm text-cream/70 leading-relaxed">
                        {f.desc}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* ═══════════ CTA ═══════════ */}
        <section className="relative z-10 text-center pb-24 px-4">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: false, amount: 0.5 }}
            transition={{ duration: 0.5 }}
          >
            <Link
              to="/scanner"
              className="btn-retro px-8 py-4 font-pixel text-xs md:text-sm inline-block"
            >
              Start Scanning →
            </Link>
          </motion.div>
        </section>
      </div>
    </main>
  );
}
