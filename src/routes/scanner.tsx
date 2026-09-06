import { useCallback, useEffect, useRef, useState, lazy, Suspense } from "react";
import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import {
  Brain,
  ShieldCheck,
  Gauge,
  ScanSearch,
  Activity,
  Info,
  RotateCcw,
  AlertTriangle,
  Upload,
  Users,
  RefreshCw,
} from "lucide-react";
import NeuralWebCanvas from "@/components/neuro/NeuralWebCanvas";
import Navigation from "@/components/neuro/Navigation";
import RetroLoadingBar from "@/components/neuro/RetroLoadingBar";
import BrainFindings3D from "@/components/neuro/BrainFindings3D";
import ClinicalDisclaimer from "@/components/neuro/ClinicalDisclaimer";
import {
  PATIENTS,
  PROCESSING_MESSAGES,
  runMockAnalysis,
  severityColor,
  type AnalysisResult,
  type Patient,
} from "@/lib/neuro-data";

const CTVolumeViewer = lazy(() => import("@/components/CTVolumeViewer"));
const CT_CASE_ID = "ct_case_001";
const CT_API_URL =
  (import.meta.env["VITE_CT_API_URL"] as string | undefined) ??
  "http://127.0.0.1:8000";

export const Route = createFileRoute("/scanner")({
  head: () => ({
    meta: [
      { title: "NeuroScan Scanner — Brain CT Analysis" },
      {
        name: "description",
        content:
          "Select a patient CT study or upload a scan, run the NeuroScan detection model, and inspect findings on an interactive 3D brain.",
      },
      { property: "og:title", content: "NeuroScan Scanner — Brain CT Analysis" },
      {
        property: "og:description",
        content:
          "Run deep-learning tumor detection on brain CT scans and explore findings in 3D.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ScannerPage,
});

type ActiveTab = "patients" | "upload";
const ANALYZE_DURATION = 9000;

function ScannerPage() {
  const zoomLevel = useMotionValue(1);
  const dashboardOpacity = useTransform(zoomLevel, [1, 10, 50], [1, 0.5, 0.2]);

  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("patients");

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processingMessage, setProcessingMessage] = useState("");
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(null);
  const [viewerMode, setViewerMode] = useState<"volume" | "findings">("volume");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTracked = useCallback(() => {
    for (const t of timersRef.current) clearTimeout(t);
    timersRef.current = [];
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => clearTracked, [clearTracked]);

  const closeFact = useCallback(() => {
    animate(zoomLevel, 1, { duration: 1.5, ease: [0.6, 0.01, 0.05, 0.95] });
  }, [zoomLevel]);

  const handleAnalyze = useCallback(() => {
    closeFact();

    if (activeTab === "patients" && !selectedPatient) {
      setAnalysisError("Please select a patient first.");
      return;
    }
    if (activeTab === "upload" && !uploadedFile) {
      setAnalysisError("Please upload a file first.");
      return;
    }

    clearTracked();
    setAnalysisError(null);
    setIsAnalyzing(true);
    setAnalysisResult(null);
    setProgress(0);

    animate(zoomLevel, 50, { duration: 3, ease: [0.6, 0.01, 0.05, 0.95] });

    let idx = 0;
    setProcessingMessage(PROCESSING_MESSAGES[0]!);
    intervalRef.current = setInterval(() => {
      idx = (idx + 1) % PROCESSING_MESSAGES.length;
      setProcessingMessage(PROCESSING_MESSAGES[idx]!);
    }, ANALYZE_DURATION / PROCESSING_MESSAGES.length);

    const start = Date.now();
    const tickProgress = () => {
      const elapsed = Date.now() - start;
      setProgress(Math.min((elapsed / ANALYZE_DURATION) * 100, 99));
    };
    const progressInterval = setInterval(tickProgress, 120);
    timersRef.current.push(progressInterval as unknown as ReturnType<typeof setTimeout>);

    const finish = setTimeout(() => {
      clearTracked();
      clearInterval(progressInterval);
      setProgress(100);
      const id =
        activeTab === "patients"
          ? selectedPatient!.patient_id
          : `upload-${uploadedFile!.name}`;
      const result = runMockAnalysis(id);
      setAnalysisResult(result);
      setSelectedFindingId(result.findings[0]?.id ?? null);
      setIsAnalyzing(false);
      // ease back out of the neural-web dive so the dashboard is legible
      animate(zoomLevel, 3, { duration: 2, ease: [0.6, 0.01, 0.05, 0.95] });
    }, ANALYZE_DURATION);
    timersRef.current.push(finish);
  }, [
    activeTab,
    selectedPatient,
    uploadedFile,
    zoomLevel,
    closeFact,
    clearTracked,
  ]);

  const handleReset = useCallback(() => {
    clearTracked();
    closeFact();
    setSelectedPatient(null);
    setUploadedFile(null);
    setAnalysisResult(null);
    setAnalysisError(null);
    setIsAnalyzing(false);
    setProgress(0);
  }, [closeFact, clearTracked]);

  const handleSelectPatient = (p: Patient) => {
    setSelectedPatient(p);
    setAnalysisResult(null);
    setAnalysisError(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      setAnalysisResult(null);
      setAnalysisError(null);
    }
  };

  return (
    <div className="min-h-screen w-full bg-dark-base overflow-hidden relative">
      {/* 3D neural-web background */}
      <div className="absolute inset-0 z-0">
        <NeuralWebCanvas zoomLevel={zoomLevel} />
      </div>

      <Navigation />

      {/* 3-6-3 grid */}
      <motion.div
        style={{ opacity: dashboardOpacity }}
        className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 pt-20 min-h-screen"
      >
        {/* ── Left: Model Info ── */}
        <div className="lg:col-span-3">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6 }}
            className="pixel-border p-6 space-y-6"
          >
            <div>
              <h3 className="font-pixel text-[10px] text-coral mb-4 flex items-center gap-2">
                <Brain size={16} />
                MODEL INFO
              </h3>
              <div className="space-y-3 font-mono text-sm">
                {[
                  ["Model", "NeuroScan v1.3"],
                  ["Architecture", "nnU-Net + 3D-ResNet"],
                  ["Training Data", "BraTS 2020/2021"],
                  ["Input", "DICOM CT Series"],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-cream/50">{k}</span>
                    <span className="text-coral font-semibold">{v}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-coral/20" />

            <div>
              <h3 className="font-pixel text-[10px] text-coral mb-4 flex items-center gap-2">
                <ShieldCheck size={16} />
                CAPABILITIES
              </h3>
              <ul className="space-y-2.5 font-mono text-sm">
                {[
                  { icon: Gauge, text: "Tumor severity grading (I–IV)" },
                  { icon: ScanSearch, text: "Edema & necrosis segmentation" },
                  { icon: Activity, text: "3D anomaly localization" },
                  { icon: Info, text: "Radiologist-ready reports" },
                ].map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-start gap-2 text-cream/60">
                    <Icon size={14} className="text-coral mt-0.5 shrink-0" />
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-t border-coral/20" />

            <div className="font-mono text-xs text-cream/40 leading-relaxed">
              Demo mode: analysis runs locally with simulated model output. No
              patient data leaves your browser.
            </div>
          </motion.div>
        </div>

        {/* ── Center: CT Scan Analysis ── */}
        <div className="lg:col-span-6 space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="pixel-border p-6 space-y-6"
          >
            <h3 className="font-pixel text-[10px] text-coral">
              CT SCAN ANALYSIS
            </h3>

            {/* Viewer area */}
            {isAnalyzing ? (
              <div className="pixel-border-sm p-8">
                <RetroLoadingBar
                  progress={progress}
                  label="ANALYZING"
                  message={processingMessage}
                />
              </div>
            ) : analysisResult ? (
              <div className="space-y-4">
                <div className="flex gap-2">
                  {(
                    [
                      { id: "volume", label: "CT Volume" },
                      { id: "findings", label: "Findings Map" },
                    ] as const
                  ).map(({ id, label }) => (
                    <button
                      key={id}
                      onClick={() => setViewerMode(id)}
                      className={`flex-1 py-2 font-pixel text-[9px] transition-colors ${
                        viewerMode === id ? "btn-retro" : "btn-retro-outline"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {viewerMode === "volume" ? (
                  <div className="pixel-border-sm h-[420px] overflow-hidden">
                    <ClientOnly
                      fallback={
                        <div className="h-full w-full flex items-center justify-center font-mono text-xs text-cream/40">
                          Preparing CT volume viewer…
                        </div>
                      }
                    >
                      <Suspense
                        fallback={
                          <div className="h-full w-full flex items-center justify-center font-mono text-xs text-cream/40">
                            Loading CT volume viewer…
                          </div>
                        }
                      >
                        <CTVolumeViewer caseId={CT_CASE_ID} apiUrl={CT_API_URL} />
                      </Suspense>
                    </ClientOnly>
                  </div>
                ) : (
                  <BrainFindings3D
                    findings={analysisResult.findings}
                    selectedId={selectedFindingId}
                    onSelect={setSelectedFindingId}
                  />
                )}

                <div className="pixel-border-sm p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-pixel text-[8px] text-coral">
                      RESULT
                    </span>
                    <span
                      className="font-pixel text-[8px] uppercase"
                      style={{ color: severityColor(analysisResult.severity) }}
                    >
                      {analysisResult.severity}
                    </span>
                  </div>
                  <p className="font-mono text-sm text-cream/80">
                    {analysisResult.prediction}
                  </p>
                  <p className="font-mono text-xs text-cream/50">
                    Top confidence: {(analysisResult.confidence * 100).toFixed(1)}%
                  </p>
                </div>

                {/* Findings list */}
                <div className="space-y-2">
                  {analysisResult.findings.map((f) => (
                    <div
                      key={f.id}
                      onClick={() => setSelectedFindingId(f.id)}
                      className={`pixel-border-sm p-3 cursor-pointer transition-colors ${
                        selectedFindingId === f.id ? "bg-coral/10" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className="font-pixel text-[8px]"
                          style={{ color: severityColor(f.severity) }}
                        >
                          {f.id} · {f.type}
                        </span>
                        <span className="font-mono text-xs text-cream/60">
                          {(f.confidence * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-1.5 bg-charcoal mb-2">
                        <div
                          className="h-full"
                          style={{
                            width: `${f.confidence * 100}%`,
                            backgroundColor: severityColor(f.severity),
                          }}
                        />
                      </div>
                      <p className="font-mono text-xs text-cream/60 leading-snug">
                        {f.region} · {f.size_mm}mm — {f.description}
                      </p>
                    </div>
                  ))}
                </div>

                <details className="group">
                  <summary className="font-mono text-xs text-cream/40 cursor-pointer hover:text-cream/70 transition-colors">
                    Raw JSON ▸
                  </summary>
                  <div className="mt-2 bg-dark-base p-3 pixel-border-sm">
                    <pre className="text-xs text-cream/50 overflow-auto max-h-48 font-terminal">
                      {JSON.stringify(analysisResult, null, 2)}
                    </pre>
                  </div>
                </details>

                <button
                  onClick={handleReset}
                  className="btn-retro-outline w-full py-3 font-pixel text-[10px] flex items-center justify-center gap-2"
                >
                  <RotateCcw size={14} />
                  New Scan
                </button>
              </div>
            ) : (
              <div className="pixel-border-sm p-8 text-center">
                <Brain
                  size={48}
                  className="mx-auto text-coral/40 mb-3 animate-pulse-slow"
                />
                <p className="font-mono text-sm text-cream/50">
                  Select a patient study or upload a CT series, then run the
                  analysis.
                </p>
              </div>
            )}

            {/* Input controls — hidden while analyzing / showing results */}
            {!isAnalyzing && !analysisResult && (
              <>
                {/* Tabs */}
                <div className="flex gap-2">
                  {(
                    [
                      { id: "patients", label: "Patients", icon: Users },
                      { id: "upload", label: "Upload", icon: Upload },
                    ] as const
                  ).map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      onClick={() => setActiveTab(id)}
                      className={`flex-1 py-2 font-pixel text-[9px] flex items-center justify-center gap-2 transition-colors ${
                        activeTab === id ? "btn-retro" : "btn-retro-outline"
                      }`}
                    >
                      <Icon size={12} />
                      {label}
                    </button>
                  ))}
                </div>

                {activeTab === "patients" ? (
                  <div className="pixel-border-sm max-h-56 overflow-y-auto">
                    <div className="flex items-center justify-between px-3 py-2 border-b border-coral/20">
                      <span className="font-pixel text-[8px] text-coral/70">
                        BRATS STUDIES
                      </span>
                      <RefreshCw size={12} className="text-coral/40" />
                    </div>
                    {PATIENTS.map((p) => (
                      <button
                        key={p.patient_id}
                        onClick={() => handleSelectPatient(p)}
                        className={`w-full text-left px-3 py-2.5 font-mono text-sm flex justify-between items-center transition-colors ${
                          selectedPatient?.patient_id === p.patient_id
                            ? "bg-coral/15 text-coral"
                            : "text-cream/60 hover:bg-coral/5"
                        }`}
                      >
                        <span>{p.patient_id}</span>
                        <span className="text-xs text-cream/40">
                          {p.slice_count} slices · {p.subset}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".png,.jpg,.jpeg,.dcm,.dicom,.nii,.nii.gz"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-6 border-2 border-dashed border-coral/30 text-cream/50 hover:text-cream/80 hover:border-coral/50 transition-colors font-mono text-sm"
                    >
                      {uploadedFile ? (
                        <span className="text-coral font-semibold">
                          {uploadedFile.name}
                        </span>
                      ) : (
                        "Click to upload CT scan (DICOM, NIfTI, PNG)"
                      )}
                    </button>
                  </div>
                )}

                {analysisError && (
                  <div className="flex items-start gap-2 text-destructive font-mono text-sm pixel-border-sm p-3">
                    <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                    {analysisError}
                  </div>
                )}

                <motion.button
                  onClick={handleAnalyze}
                  whileTap={{ x: 2, y: 2 }}
                  className="btn-retro w-full py-4 font-pixel text-xs flex items-center justify-center gap-3"
                >
                  <ScanSearch size={16} />
                  Run Analysis
                </motion.button>
              </>
            )}
          </motion.div>
        </div>

        {/* ── Right: Selected Patient ── */}
        <div className="lg:col-span-3">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="pixel-border p-6 space-y-4"
          >
            <h3 className="font-pixel text-[10px] text-coral">
              SELECTED PATIENT
            </h3>
            {selectedPatient ? (
              <div className="space-y-2 font-mono text-sm">
                <div className="flex justify-between">
                  <span className="text-cream/50">Patient ID</span>
                  <span className="text-coral font-semibold text-xs">
                    {selectedPatient.patient_id}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-cream/50">Slices</span>
                  <span className="text-coral font-semibold">
                    {selectedPatient.slice_count}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-cream/50">Subset</span>
                  <span className="text-coral font-semibold">
                    {selectedPatient.subset}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-cream/50">Modality</span>
                  <span className="text-coral font-semibold">CT · Contrast</span>
                </div>
              </div>
            ) : uploadedFile ? (
              <div className="space-y-2 font-mono text-sm">
                <div className="flex justify-between">
                  <span className="text-cream/50">Source</span>
                  <span className="text-coral font-semibold text-xs">Upload</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-cream/50">File</span>
                  <span className="text-coral font-semibold text-xs truncate max-w-[120px]">
                    {uploadedFile.name}
                  </span>
                </div>
              </div>
            ) : (
              <p className="font-mono text-sm text-cream/40 italic">
                None selected
              </p>
            )}

            <div className="border-t border-coral/20" />

            <div>
              <h3 className="font-pixel text-[10px] text-coral mb-3">
                HOW IT WORKS
              </h3>
              <ul className="space-y-2 font-mono text-sm text-cream/60">
                {[
                  "Pick a BraTS study or upload a CT series",
                  "Run the analysis pipeline",
                  "Inspect findings on the 3D brain",
                  "Click markers for per-finding detail",
                ].map((step, i) => (
                  <li key={step} className="flex items-start gap-2">
                    <span className="text-coral mt-0.5">{i + 1}.</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>

            <ClinicalDisclaimer />
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
