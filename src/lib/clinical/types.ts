/**
 * NeuroScan clinical data model.
 *
 * Pipeline: CT Volume -> Quantitative Imaging Evidence -> AI Inference
 * -> 3D Localization -> Explainability -> Evidence Fusion
 * -> Urgency Prioritization -> Clinical Report
 *
 * These types describe the contract the frontend expects from the future
 * FastAPI backend. No AI logic lives in the frontend.
 */

export type EvidenceStrength = "Weak" | "Moderate" | "Strong";
export type SpatialCoherence = "Low" | "Moderate" | "High";
export type EvidenceAgreement = "Discordant" | "Partial" | "Concordant";

export type TriageLevel =
  | "ROUTINE"
  | "PRIORITY_REVIEW"
  | "URGENT_REVIEW"
  | "CRITICAL_REVIEW";

export type AnalysisState =
  | "IDLE"
  | "UPLOADED"
  | "QUEUED"
  | "PREPROCESSING"
  | "INFERENCE"
  | "LOCALIZATION"
  | "EVIDENCE_FUSION"
  | "REPORTING"
  | "COMPLETE"
  | "FAILED";

/** A clinical case: one subject, one or more CT studies. */
export interface Case {
  caseId: string;
  subjectRef: string;
  createdAt: string;
  studyIds: string[];
  status: AnalysisState;
}

/** A non-contrast or contrast CT study (DICOM series metadata). */
export interface CTStudy {
  studyId: string;
  caseId: string;
  modality: "CT";
  seriesDescription: string;
  sliceCount: number;
  sliceThicknessMm: number;
  pixelSpacingMm: [number, number];
  contrast: boolean;
  acquiredAt: string;
  sourceFileName?: string;
}

/** Progress of the analysis pipeline for one study. */
export interface AnalysisStatus {
  analysisId: string;
  studyId: string;
  state: AnalysisState;
  /** 0-100 */
  progress: number;
  stageLabel: string;
  startedAt: string;
  completedAt?: string;
  error?: string;
}

/** Quantitative Hounsfield-unit evidence supporting a lesion. */
export interface HUEvidence {
  meanHU: number;
  minHU: number;
  maxHU: number;
  stdHU: number;
  /** Fraction of voxels in the hyperdense range. */
  hyperdenseFraction: number;
  strength: EvidenceStrength;
}

/** A localized region of interest in the CT volume. */
export interface Lesion {
  lesionId: string;
  label: string;
  /** Anatomical description, e.g. "Right basal ganglia". */
  location: string;
  estimatedVolumeMl: number;
  /** Voxel-space centroid in the source volume. */
  centroid: { x: number; y: number; z: number };
  /** Normalized 0-100 coordinates for viewer placement. */
  normalized: { x: number; y: number; z: number };
  longestDiameterMm: number;
  hu: HUEvidence;
  spatialCoherence: SpatialCoherence;
}

/** Raw model output before evidence fusion. */
export interface AIResult {
  analysisId: string;
  modelName: string;
  modelVersion: string;
  /** Predicted class label, phrased as a suspicion, never a diagnosis. */
  predictedLabel: string;
  confidence: number;
  lesions: Lesion[];
  /** Saliency/heatmap references for explainability. */
  explainabilityMapIds: string[];
}

/** Fused, clinician-facing finding. */
export interface Finding {
  findingId: string;
  finding: string;
  subtype: string;
  location: string;
  estimatedVolumeMl: number;
  meanHU: number;
  aiConfidence: number;
  huEvidence: EvidenceStrength;
  spatialCoherence: SpatialCoherence;
  evidenceAgreement: EvidenceAgreement;
  triage: TriageLevel;
  /** Plain-language explanation of why this was flagged. */
  rationale: string;
  lesionId: string;
}

/** Urgency prioritization across all findings in a study. */
export interface TriageResult {
  analysisId: string;
  overallTriage: TriageLevel;
  /** 0-100 relative urgency score used for worklist ordering. */
  urgencyScore: number;
  /** Finding ids ordered most to least urgent. */
  rankedFindingIds: string[];
  summary: string;
}

/** Structured decision-support report. */
export interface ClinicalReport {
  reportId: string;
  analysisId: string;
  studyId: string;
  generatedAt: string;
  impression: string;
  technique: string;
  quantitativeSummary: string[];
  findings: Finding[];
  triage: TriageResult;
  recommendedAction: string;
  disclaimer: string;
}

/** Volume metadata for the (future) 3D viewer. */
export interface VolumeData {
  studyId: string;
  dimensions: { x: number; y: number; z: number };
  spacingMm: { x: number; y: number; z: number };
  /** Window/level presets for CT display. */
  windowPresets: Array<{ name: string; windowWidth: number; windowLevel: number }>;
  /** URL to the volume payload once a backend exists. */
  volumeUrl: string | null;
}

export const CLINICAL_DISCLAIMER =
  "AI-generated clinical decision support for triage. Final interpretation requires qualified clinical review.";

export const TRIAGE_LABEL: Record<TriageLevel, string> = {
  ROUTINE: "Routine review",
  PRIORITY_REVIEW: "Flagged for priority clinical review",
  URGENT_REVIEW: "Flagged for urgent clinical review",
  CRITICAL_REVIEW: "Flagged for immediate clinical review",
};
