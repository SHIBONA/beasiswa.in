// Contract between the API server (src/) and the web front-end (web/): the data the API stores and returns.
export { publicWebUrl } from "./web-url";

// Longest CV text the browser sends and the server reads.
export const MAX_CV_CHARS = 30_000;

// ---------- Profile and program facts ----------
// The member's saved profile, as validated by the server.
export type Profile = {
  jenjang_saat_ini: string; jenjang_tujuan: string; prodi: string; ipk: number; semester: number;
  negara_tujuan: string; bidang_minat: string; skor_bahasa: number; prestasi: string; butuh_pendanaan: boolean;
};
export type Criterion = { text: string; quote: string };
// Sentences verified on the official page (Firecrawl mode); empty when not found.
export type Evidence = {
  jenjang: string; lokasi: string; pembukaan: string; ipk: string; bahasa: string;
  deadline: string; pendanaan: string; kerja: string; kriteria: Criterion[];
};
// Program facts from the demo catalog or extracted from the web; the scorer reads only these.
export type Scholarship = {
  name: string; provider: string; country: string; countries: string[]; levels: string[]; funding: string;
  deadline: string; url: string; requirements: string; fields: string[]; values: string[];
  min_gpa?: number; ielts?: number; min_sem?: number; max_sem?: number; work_years?: number; need_based?: boolean;
  evidence?: Evidence; official?: boolean; source?: string;
  opens_at?: string; application_status?: string; source_checked_at?: string;
};
export type SearchHit = { url: string; title: string; description: string };

// ---------- Scored results ----------
export type BreakdownRow = { key: string; label: string; points: number; max: number; detail: string; rule: string; quote: string };
export type ScoredAchievement = { text: string; level: string; relevant: string[]; points: number };
// One selection stage of the program-specific explanation shown on each result card.
export type Insight = { label: string; ok: boolean; text: string; quotes?: Criterion[] };
export type RankedResult = {
  name: string; provider: string; country: string; level: string; funding: string; deadline: string;
  requirements: string; url: string; source: string; limits: string[];
  score: number; reasons: string[]; gaps: string[]; breakdown: BreakdownRow[];
  achievements: ScoredAchievement[]; insight: Insight[];
  program: Scholarship; // raw facts, so the CV coach can re-score "what if" profiles later
};
export type AgentResult = RankedResult & { awardee_refs?: SearchHit[] };

// ---------- Stored documents ----------
// Results and searches are stored as JSON documents; older versions may lack the newer fields.
export type StoredResult = {
  id: string; name?: string; provider?: string; country?: string; deadline?: string;
  score?: number; limits?: string[]; program_id?: string; program?: Scholarship; [field: string]: unknown;
};
export type SearchStatus = "queued" | "running" | "succeeded" | "failed";
export type Search = {
  id: string; created_at: string; day: string; status: SearchStatus; target_level: string; notes: string; mode: string;
  steps: { at: string; text: string }[]; results: StoredResult[]; expired: number; error: string | null;
  target_countries?: string[]; usage?: Record<string, number> | null; others?: SearchHit[]; duration_ms?: number;
};
export type HistoryRow = {
  id: string; created_at: string; status: string; notes: string | null; mode: string | null;
  error: string | null; count: number; top: string | null;
};

// ---------- CV coach ----------
export type Link = { title: string; url: string; note: string };
export type CvOption = { text: string; why: string; condition: string; after: number; delta: number };
export type CvEdit = { index: number; original: string; level: string; tags: string[]; options: CvOption[] };
export type ProfileEdit = { field: string; value: string; label: string; condition: string; after: number; delta: number };
export type HardGap = { title: string; detail: string; quote: string; potential: number; why: string; actions: Link[] };
export type GrowthStep = { area: string; why: string; quote: string; links: Link[] };
export type CoachReport = {
  program: { name: string; url: string; country: string; levels: string[]; values: string[] };
  before: number; best: number; breakdown: BreakdownRow[];
  cv_edits: CvEdit[]; cv_note: string; profile_edits: ProfileEdit[];
  hard_gaps: HardGap[]; growth: GrowthStep[];
};
export type PreviewRow = { key: string; label: string; max: number; before: number; after: number; detail: string };
export type PreviewReport = { before: number; after: number; rows: PreviewRow[] };

// ---------- HTTP responses (src/server.ts) ----------
// A result as the API returns it: ranked, with its storage id. Older saved results may lack newer fields.
export type ApiResult = AgentResult & { id: string; program_id?: string; saved_at?: string };
export type MetaResponse = { mode: string; quota_left: number; daily_quota: number; today: string };
export type ProfileResponse = { profile: Profile | null };
export type CvParseResponse = { fields: Partial<Profile> };
export type SearchStartResponse = { search_id: string };
export type SearchResponse = { search: Omit<Search, "results"> & { results: ApiResult[] }; saved_ids: string[] };
export type HistoryResponse = { searches: HistoryRow[] };
export type SavedResponse = { saved: ApiResult[] };
export type CoachResponse = CoachReport & { result_id: string; saved_only: boolean };
export type ApiErrorBody = { error?: string; fields?: string[]; retry_after?: number };
