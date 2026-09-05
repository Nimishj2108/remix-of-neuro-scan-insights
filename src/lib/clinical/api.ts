import {
  MOCK_AI_RESULT,
  MOCK_ANALYSIS_ID,
  MOCK_CASE,
  MOCK_FINDINGS,
  MOCK_REPORT,
  MOCK_STUDY,
  MOCK_VOLUME,
  PIPELINE_STAGES,
} from "./mock-data";
import type {
  AIResult,
  AnalysisStatus,
  CTStudy,
  ClinicalReport,
  Finding,
  VolumeData,
} from "./types";

/**
 * Frontend service layer for the NeuroScan pipeline.
 *
 * Every call here is the single place the UI talks to the analysis backend.
 * Today they resolve fixed mock payloads; swapping USE_MOCK off (and filling
 * in the fetch calls) points the same API at a FastAPI service without any
 * UI changes. No AI or clinical logic belongs in the frontend.
 */

const USE_MOCK = true;
export const API_BASE_URL = "/api/neuroscan";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

function notImplemented(fn: string): never {
  throw new Error(
    `${fn}: live backend not connected yet. Set USE_MOCK = false only once the FastAPI service exists.`,
  );
}

/** Registers a CT study (DICOM series or archive) with the backend. */
export async function uploadCTStudy(
  file: File,
): Promise<{ caseId: string; study: CTStudy }> {
  if (!USE_MOCK) notImplemented("uploadCTStudy");
  await delay(400);
  return {
    caseId: MOCK_CASE.caseId,
    study: { ...MOCK_STUDY, sourceFileName: file.name },
  };
}

/** Looks up a preloaded demo study by identifier. */
export async function getStudy(studyId: string): Promise<CTStudy> {
  if (!USE_MOCK) notImplemented("getStudy");
  await delay(150);
  return { ...MOCK_STUDY, studyId };
}

/** Kicks off the analysis pipeline for a study. */
export async function startAnalysis(
  studyId: string,
): Promise<{ analysisId: string; status: AnalysisStatus }> {
  if (!USE_MOCK) notImplemented("startAnalysis");
  await delay(250);
  const first = PIPELINE_STAGES[0]!;
  return {
    analysisId: MOCK_ANALYSIS_ID,
    status: {
      analysisId: MOCK_ANALYSIS_ID,
      studyId,
      state: first.state,
      progress: first.progress,
      stageLabel: first.stageLabel,
      startedAt: new Date().toISOString(),
    },
  };
}

/**
 * Polls pipeline progress. The mock advances by `step`, which the caller
 * increments; a real backend ignores it and reports true server state.
 */
export async function getAnalysisStatus(
  analysisId: string,
  step = PIPELINE_STAGES.length - 1,
): Promise<AnalysisStatus> {
  if (!USE_MOCK) notImplemented("getAnalysisStatus");
  await delay(120);
  const index = Math.min(Math.max(step, 0), PIPELINE_STAGES.length - 1);
  const stage = PIPELINE_STAGES[index]!;
  return {
    analysisId,
    studyId: MOCK_STUDY.studyId,
    state: stage.state,
    progress: stage.progress,
    stageLabel: stage.stageLabel,
    startedAt: MOCK_CASE.createdAt,
    ...(stage.state === "COMPLETE"
      ? { completedAt: MOCK_REPORT.generatedAt }
      : {}),
  };
}

/** Raw model output plus localized lesions, before clinician-facing fusion. */
export async function getAIResult(analysisId: string): Promise<AIResult> {
  if (!USE_MOCK) notImplemented("getAIResult");
  await delay(150);
  return { ...MOCK_AI_RESULT, analysisId };
}

/** Fused, triage-ranked findings for the results view. */
export async function getFindings(analysisId: string): Promise<Finding[]> {
  if (!USE_MOCK) notImplemented("getFindings");
  await delay(200);
  void analysisId;
  return MOCK_FINDINGS;
}

/** Volume geometry and CT window presets for the future 3D viewer. */
export async function getVolumeData(studyId: string): Promise<VolumeData> {
  if (!USE_MOCK) notImplemented("getVolumeData");
  await delay(150);
  return { ...MOCK_VOLUME, studyId };
}

/** Structured decision-support report. */
export async function getReport(analysisId: string): Promise<ClinicalReport> {
  if (!USE_MOCK) notImplemented("getReport");
  await delay(250);
  return { ...MOCK_REPORT, analysisId };
}
