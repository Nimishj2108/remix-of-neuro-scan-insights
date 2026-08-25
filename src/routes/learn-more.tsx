import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import NeuralWebCanvas from "@/components/neuro/NeuralWebCanvas";
import Navigation from "@/components/neuro/Navigation";
import { NEURO_FACTS } from "@/lib/neuro-data";

export const Route = createFileRoute("/learn-more")({
  head: () => ({
    meta: [
      { title: "Learn More — NeuroScan" },
      {
        name: "description",
        content:
          "How NeuroScan detects brain tumors from CT: datasets, model architecture, and clinical context behind the deep-learning pipeline.",
      },
      { property: "og:title", content: "Learn More — NeuroScan" },
      {
        property: "og:description",
        content:
          "The science behind NeuroScan: BraTS datasets, nnU-Net segmentation, and clinical context for brain CT analysis.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LearnMorePage,
});

function LearnMorePage() {
  return (
    <main className="min-h-screen w-full bg-dark-base relative">
      <div className="fixed inset-0 z-0">
        <NeuralWebCanvas />
      </div>
      <Navigation />

      <div className="relative z-10 px-4 pt-28 pb-24 max-w-3xl mx-auto">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-pixel text-xl md:text-3xl text-coral glow-text-coral text-center mb-12"
        >
          Learn More
        </motion.h1>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="pixel-border p-8"
        >
          <div className="space-y-5 font-mono text-sm text-cream/80 leading-relaxed">
            <p>
              NeuroScan applies state-of-the-art deep learning to brain CT
              scans to detect, localize, and grade tumors. The pipeline combines
              an nnU-Net architecture for 3D tumor segmentation with a
              3D-ResNet classifier for severity grading — a pairing proven on
              the BraTS (Brain Tumor Segmentation) benchmark.
            </p>
            <p>
              Each analysis produces per-slice findings with confidence scores,
              severity labels, and anatomical localization. Radiologists can
              navigate the axial plane and inspect each flagged region directly
              on the slice view.
            </p>
            <p>
              NeuroScan was built at HackCanada 2025 to show how accessible,
              visual AI tooling can support early detection workflows. It is a
              research demonstration — not a diagnostic device — and every
              output should be reviewed by a qualified clinician.
            </p>
          </div>

          <h2 className="font-pixel text-xs text-coral mt-10 mb-4">
            BRAIN TUMOR FACTS
          </h2>
          <ul className="space-y-3">
            {NEURO_FACTS.map((fact, i) => (
              <li key={i} className="flex gap-3 font-mono text-sm text-cream/70">
                <span className="text-coral">▸</span>
                <span>{fact}</span>
              </li>
            ))}
          </ul>
        </motion.section>
      </div>
    </main>
  );
}
