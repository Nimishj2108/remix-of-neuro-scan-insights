import {
  CLINICAL_DISCLAIMER,
  type AIResult,
  type AnalysisStatus,
  type Case,
  type CTStudy,
  type ClinicalReport,
  type Finding,
  type Lesion,
  type TriageResult,
  type VolumeData,
} from "./types";

/**
 * Fixed mock payloads standing in for the future FastAPI backend.
 * Values are deterministic placeholders — nothing here is randomized.
 */

export const MOCK_CASE_ID = "CASE-0001";
export const MOCK_STUDY_ID = "CT-0001";
export const MOCK_ANALYSIS_ID = "AN-0001";

export const MOCK_CASE: Case = {
  caseId: MOCK_CASE_ID,
  subjectRef: "ANON-0001",
  createdAt: "2026-01-01T00:00:00.000Z",
  studyIds: [MOCK_STUDY_ID],
  status: "COMPLETE",
};

export const MOCK_STUDY: CTStudy = {
  studyId: MOCK_STUDY_ID,
  caseId: MOCK_CASE_ID,
  modality: "CT",
  seriesDescription: "Head CT — non-contrast, axial",
  sliceCount: 155,
  sliceThicknessMm: 1,
  pixelSpacingMm: [0.45, 0.45],
  contrast: false,
  acquiredAt: "2026-01-01T00:00:00.000Z",
};

export const MOCK_LESIONS: Lesion[] = [
  {
    lesionId: "L1",
    label: "Hyperdense focus",
    location: "Right basal ganglia",
    estimatedVolumeMl: 31.4,
    centroid: { x: 132, y: 118, z: 78 },
    normalized: { x: 62, y: 46, z: 50 },
    longestDiameterMm: 38.2,
    hu: {
      meanHU: 68.2,
      minHU: 52,
      maxHU: 78,
      stdHU: 6.4,
      hyperdenseFraction: 0.82,
      strength: "Strong",
    },
    spatialCoherence: "High",
  },
  {
    lesionId: "L2",
    label: "Perilesional hypodensity",
    location: "Right frontal white matter",
    estimatedVolumeMl: 12.7,
    centroid: { x: 121, y: 96, z: 84 },
    normalized: { x: 57, y: 34, z: 58 },
    longestDiameterMm: 24.5,
    hu: {
      meanHU: 18.4,
      minHU: 8,
      maxHU: 27,
      stdHU: 4.1,
      hyperdenseFraction: 0.04,
      strength: "Moderate",
    },
    spatialCoherence: "Moderate",
  },
];

export const MOCK_AI_RESULT: AIResult = {
  analysisId: MOCK_ANALYSIS_ID,
  modelName: "neuroscan-ct-triage",
  modelVersion: "0.1.0-mock",
  predictedLabel: "Suspected intracranial hemorrhage",
  confidence: 0.94,
  lesions: MOCK_LESIONS,
  explainabilityMapIds: ["MAP-L1-saliency", "MAP-L2-saliency"],
};

export const MOCK_FINDINGS: Finding[] = [
  {
    findingId: "F1",
    finding: "Suspected intracranial hemorrhage",
    subtype: "Intraparenchymal",
    location: "Right basal ganglia",
    estimatedVolumeMl: 31.4,
    meanHU: 68.2,
    aiConfidence: 0.94,
    huEvidence: "Strong",
    spatialCoherence: "High",
    evidenceAgreement: "Concordant",
    triage: "URGENT_REVIEW",
    rationale:
      "Attenuation values in the hyperdense range agree with the model prediction and the region is spatially coherent across adjacent slices.",
    lesionId: "L1",
  },
  {
    findingId: "F2",
    finding: "Suspected perilesional oedema",
    subtype: "Vasogenic pattern",
    location: "Right frontal white matter",
    estimatedVolumeMl: 12.7,
    meanHU: 18.4,
    aiConfidence: 0.71,
    huEvidence: "Moderate",
    spatialCoherence: "Moderate",
    evidenceAgreement: "Partial",
    triage: "PRIORITY_REVIEW",
    rationale:
      "Low-attenuation region adjacent to the primary lesion; quantitative evidence only partially supports the model prediction.",
    lesionId: "L2",
  },
];

export const MOCK_TRIAGE: TriageResult = {
  analysisId: MOCK_ANALYSIS_ID,
  overallTriage: "URGENT_REVIEW",
  urgencyScore: 88,
  rankedFindingIds: ["F1", "F2"],
  summary:
    "Study flagged for urgent clinical review based on a concordant hyperdense intraparenchymal finding.",
};

export const MOCK_REPORT: ClinicalReport = {
  reportId: "RPT-0001",
  analysisId: MOCK_ANALYSIS_ID,
  studyId: MOCK_STUDY_ID,
  generatedAt: "2026-01-01T00:00:00.000Z",
  impression:
    "Suspected intracranial hemorrhage in the right basal ganglia with adjacent low-attenuation change. Flagged for urgent clinical review.",
  technique: "Axial non-contrast head CT, 1 mm slices, 155 images.",
  quantitativeSummary: [
    "Primary region: 31.4 mL, mean 68.2 HU, hyperdense fraction 0.82",
    "Secondary region: 12.7 mL, mean 18.4 HU",
    "Evidence agreement: concordant for the primary region",
  ],
  findings: MOCK_FINDINGS,
  triage: MOCK_TRIAGE,
  recommendedAction:
    "Route to on-call radiology for urgent clinical review and correlation with the clinical presentation.",
  disclaimer: CLINICAL_DISCLAIMER,
};

export const MOCK_VOLUME: VolumeData = {
  studyId: MOCK_STUDY_ID,
  dimensions: { x: 512, y: 512, z: 155 },
  spacingMm: { x: 0.45, y: 0.45, z: 1 },
  windowPresets: [
    { name: "Brain", windowWidth: 80, windowLevel: 40 },
    { name: "Subdural", windowWidth: 200, windowLevel: 70 },
    { name: "Bone", windowWidth: 2800, windowLevel: 600 },
  ],
  volumeUrl: null,
};

/** Ordered pipeline stages used to drive mock status polling. */
export const PIPELINE_STAGES: Array<Pick<AnalysisStatus, "state" | "stageLabel"> & { progress: number }> = [
  { state: "QUEUED", stageLabel: "Queued for processing", progress: 5 },
  { state: "PREPROCESSING", stageLabel: "Preprocessing CT volume", progress: 20 },
  { state: "INFERENCE", stageLabel: "Running AI inference", progress: 45 },
  { state: "LOCALIZATION", stageLabel: "3D localization of regions", progress: 65 },
  { state: "EVIDENCE_FUSION", stageLabel: "Fusing quantitative and AI evidence", progress: 82 },
  { state: "REPORTING", stageLabel: "Composing clinical report", progress: 94 },
  { state: "COMPLETE", stageLabel: "Analysis complete", progress: 100 },
];
