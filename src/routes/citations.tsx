import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";
import NeuralWebCanvas from "@/components/neuro/NeuralWebCanvas";
import Navigation from "@/components/neuro/Navigation";
import { CITATIONS } from "@/lib/neuro-data";

export const Route = createFileRoute("/citations")({
  head: () => ({
    meta: [
      { title: "Citations — NeuroScan" },
      {
        name: "description",
        content:
          "Datasets, papers, and resources behind NeuroScan's brain CT analysis pipeline.",
      },
      { property: "og:title", content: "Citations — NeuroScan" },
      {
        property: "og:description",
        content:
          "Datasets, papers, and resources behind NeuroScan's brain MRI analysis pipeline.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CitationsPage,
});

function CitationsPage() {
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
          Citations
        </motion.h1>

        <div className="space-y-6">
          {CITATIONS.map((c, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="pixel-border p-6"
            >
              <h2 className="font-pixel text-[10px] text-coral mb-3">
                {c.title}
              </h2>
              <p className="font-mono text-sm text-cream/80 leading-relaxed mb-3">
                {c.description}
              </p>
              <p className="font-mono text-sm text-cream/60 leading-relaxed mb-4">
                {c.details}
              </p>
              <a
                href={c.link}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs text-coral hover:text-coral-bright inline-flex items-center gap-1.5 transition-colors"
              >
                <ExternalLink size={12} />
                {c.link}
              </a>
            </motion.div>
          ))}
        </div>
      </div>
    </main>
  );
}
