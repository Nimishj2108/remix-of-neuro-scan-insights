export interface Patient {
  patient_id: string;
  slice_count: number;
  subset: string;
}

export interface ScanFinding {
  id: string;
  type: string;
  severity: "low" | "moderate" | "high" | "critical";
  confidence: number;
  region: string;
  size_mm: number;
  description: string;
  /** 0-100 coords on the axial slice viewer */
  x: number;
  y: number;
}

export interface AnalysisResult {
  patient_id: string;
  prediction: string;
  confidence: number;
  severity: ScanFinding["severity"];
  findings: ScanFinding[];
  timestamp: string;
}

export const PATIENTS: Patient[] = [
  { patient_id: "BraTS20-00134", slice_count: 155, subset: "train" },
  { patient_id: "BraTS20-00217", slice_count: 155, subset: "train" },
  { patient_id: "BraTS20-00389", slice_count: 139, subset: "validation" },
  { patient_id: "BraTS20-00462", slice_count: 155, subset: "train" },
  { patient_id: "BraTS20-00571", slice_count: 148, subset: "validation" },
  { patient_id: "BraTS20-00688", slice_count: 155, subset: "train" },
  { patient_id: "BraTS20-00745", slice_count: 155, subset: "train" },
  { patient_id: "BraTS20-00812", slice_count: 133, subset: "validation" },
];

export const NEURO_FACTS: string[] = [
  "The human brain contains ~86 billion neurons wired by 100 trillion synapses.",
  "A single neuron can fire up to 200 times per second.",
  "Glioblastoma is the most aggressive primary brain tumor, with median survival of ~15 months.",
  "MRI detects brain tumors by measuring how hydrogen protons respond to magnetic fields.",
  "The blood-brain barrier blocks most drugs — a major challenge in neuro-oncology.",
  "White matter tracts carry signals at up to 120 m/s along myelinated axons.",
  "The cerebral cortex is only 2-4 mm thick, yet holds most of our neurons.",
  "Neurons consume 20% of the body's oxygen despite being 2% of its mass.",
  "FLAIR MRI sequences suppress fluid signal to reveal peritumoral edema.",
  "Meningiomas arise from the membranes surrounding the brain, not the brain itself.",
  "Each cubic millimeter of cortex contains roughly one kilometer of axons.",
  "Diffusion tensor imaging maps white-matter pathways that tumors can displace or invade.",
  "Early MRI detection can double treatment options for low-grade gliomas.",
  "The brain has no pain receptors — tumors grow silently until they press on tissue.",
  "Synaptic pruning removes up to 40% of synapses between childhood and adulthood.",
  "AI segmentation of tumor subregions guides surgical margins within millimeters.",
  "A resting neuron maintains a -70 mV electrical potential across its membrane.",
  "Contrast-enhanced T1 MRI highlights tumor regions where the blood-brain barrier leaks.",
];

export const PROCESSING_MESSAGES = [
  "Loading MRI scan slices...",
  "Preprocessing DICOM series...",
  "Skull-stripping and co-registering...",
  "Segmenting brain tissue...",
  "Extracting radiomic features...",
  "Running tumor detection model...",
  "Building 3D visualization...",
  "Generating analysis report...",
];

const FINDING_POOL: Array<
  Omit<ScanFinding, "id" | "confidence" | "x" | "y" | "size_mm">
> = [
  {
    type: "Enhancing tumor core",
    severity: "critical",
    region: "Left frontal lobe",
    description:
      "Contrast-enhancing region with irregular margins, consistent with high-grade glioma.",
  },
  {
    type: "Peritumoral edema",
    severity: "high",
    region: "Right temporal lobe",
    description:
      "FLAIR hyperintensity surrounding the lesion, indicating vasogenic edema.",
  },
  {
    type: "Necrotic core",
    severity: "high",
    region: "Left parietal lobe",
    description:
      "Non-enhancing central necrosis within the tumor mass, typical of GBM.",
  },
  {
    type: "Suspected low-grade glioma",
    severity: "moderate",
    region: "Right frontal lobe",
    description:
      "Diffuse T2 hyperintensity without enhancement — recommend follow-up imaging.",
  },
  {
    type: "Mass effect",
    severity: "moderate",
    region: "Midline structures",
    description:
      "Subtle midline shift of 2.1 mm caused by the adjacent lesion volume.",
  },
  {
    type: "White matter anomaly",
    severity: "low",
    region: "Corpus callosum",
    description:
      "Small region of signal change; likely benign, flagged for radiologist review.",
  },
];

function seededRandom(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

/** Deterministic demo analysis — stands in for the ML pipeline. */
export function runMockAnalysis(patientId: string): AnalysisResult {
  const rand = seededRandom(patientId);
  const count = 2 + Math.floor(rand() * 3);
  const shuffled = [...FINDING_POOL].sort(() => rand() - 0.5);
  const findings: ScanFinding[] = shuffled.slice(0, count).map((f, i) => ({
    ...f,
    id: `F${i + 1}`,
    confidence: 0.62 + rand() * 0.36,
    size_mm: Math.round((4 + rand() * 32) * 10) / 10,
    x: 22 + rand() * 56,
    y: 20 + rand() * 56,
  }));

  const SEVERITY_ORDER: ScanFinding["severity"][] = [
    "critical",
    "high",
    "moderate",
    "low",
  ];
  const mostSevere =
    findings
      .slice()
      .sort(
        (a, b) =>
          SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity),
      )[0]?.severity ?? "low";
  const topConf = Math.max(...findings.map((f) => f.confidence));

  return {
    patient_id: patientId,
    prediction: `${findings.length} finding${findings.length > 1 ? "s" : ""} detected — ${mostSevere.toUpperCase()} priority`,
    confidence: topConf,
    severity: mostSevere,
    findings,
    timestamp: new Date().toISOString(),
  };
}

export function severityColor(severity: ScanFinding["severity"]) {
  switch (severity) {
    case "critical":
      return "#ff2d40";
    case "high":
      return "#ff7a4d";
    case "moderate":
      return "#f5c94d";
    case "low":
      return "#4ade80";
  }
}
