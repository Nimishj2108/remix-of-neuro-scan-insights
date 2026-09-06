/**
 * CQ500 CT case worklist client.
 *
 * Fetches the indexed CQ500 CT cases from the FastAPI backend
 * (GET {apiUrl}/cases/ct). No mock/placeholder data lives here —
 * if the backend is unreachable the query simply fails and the UI
 * shows an unavailable state.
 */

export interface CTCaseMeta {
  case_id: string;
  modality: string;
  study_description: string | null;
  num_slices: number | null;
  dimensions: number[] | null;
  spacing: number[] | null;
  source: string | null;
  available_volume: boolean;
}

/** Tolerant normalizer — backend field names may vary slightly. */
function normalizeCase(raw: Record<string, unknown>): CTCaseMeta {
  const num = (v: unknown): number | null =>
    typeof v === "number" && Number.isFinite(v) ? v : null;
  const numArr = (v: unknown): number[] | null =>
    Array.isArray(v) && v.every((n) => typeof n === "number")
      ? (v as number[])
      : null;
  const str = (v: unknown): string | null =>
    typeof v === "string" && v.length > 0 ? v : null;

  return {
    case_id: String(raw["case_id"] ?? raw["id"] ?? ""),
    modality: str(raw["modality"]) ?? "CT",
    study_description:
      str(raw["study_description"]) ?? str(raw["description"]) ?? null,
    num_slices: num(raw["num_slices"] ?? raw["slices"] ?? raw["slice_count"]),
    dimensions: numArr(raw["dimensions"] ?? raw["shape"]),
    spacing: numArr(raw["spacing"] ?? raw["voxel_spacing"]),
    source: str(raw["source"]) ?? str(raw["dataset"]) ?? "CQ500",
    available_volume: Boolean(
      raw["available_volume"] ?? raw["volume_available"] ?? raw["prepared"],
    ),
  };
}

export async function fetchCTCases(apiUrl: string): Promise<CTCaseMeta[]> {
  const res = await fetch(`${apiUrl}/cases/ct`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Failed to load CT case list (${res.status})`);
  }
  const body: unknown = await res.json();
  const list = Array.isArray(body)
    ? body
    : ((body as Record<string, unknown>)?.["cases"] as unknown[] | undefined);
  if (!Array.isArray(list)) {
    throw new Error("Unexpected /cases/ct response shape");
  }
  const cases = list
    .filter((c): c is Record<string, unknown> => typeof c === "object" && c !== null)
    .map(normalizeCase)
    .filter((c) => c.case_id.length > 0);

  // Prioritize prepared volumes, with ct_case_001 first for the demo.
  return cases.sort((a, b) => {
    const aFirst = a.case_id === "ct_case_001" ? 0 : a.available_volume ? 1 : 2;
    const bFirst = b.case_id === "ct_case_001" ? 0 : b.available_volume ? 1 : 2;
    return aFirst - bFirst || a.case_id.localeCompare(b.case_id);
  });
}
