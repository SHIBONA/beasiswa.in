// Pages the extraction eval reads, and what a correct extraction finds on each.
// Labels were written by reading the page text captured on CAPTURED_ON; when a page changes, recapture and relabel.
// `match` is a lowercase fragment of the programme name; a card counts as that programme when its name contains it.
export const CAPTURED_ON = "2026-11-28";

export type Expected = {
  match: string;
  deadline?: string; // YYYY-MM-DD of the latest application period on the page
  opens_at?: string;
};
export type EvalCase = {
  id: string;
  url: string;
  target: string; // degree the search asked for
  destinations: string[]; // study countries the search asked for
  expect: Expected[]; // empty: the page has no card the app should show for this search
  note?: string;
};

export const CASES: EvalCase[] = [
  { id: "mext-kedutaan", url: "https://www.id.emb-japan.go.jp/itpr_id/sch_rs.html", target: "S2", destinations: ["jepang"], expect: [{ match: "mext", opens_at: "2026-04-01", deadline: "2026-04-22" }] },
  { id: "mext-studyinjapan", url: "https://www.studyinjapan.go.jp/en/smap-stopj-applications-research.html", target: "S2", destinations: ["jepang"], expect: [], note: "periods given as months only (between April and May)" },
  { id: "inpex", url: "https://www.inpex-s.com/en/scholarship-program/index.php", target: "S2", destinations: ["jepang"], expect: [], note: "2027 round closed; the period itself is only in the linked PDF" },
  { id: "adb-jsp", url: "https://www.adb.org/work-with-us/careers/japan-scholarship-program", target: "S2", destinations: ["jepang"], expect: [], note: "no application dates on the page" },
  { id: "jds", url: "https://www.jds-scholarship.org/", target: "S2", destinations: ["jepang"], expect: [], note: "no application dates on the page" },
  { id: "fulbright-aminef", url: "https://www.aminef.or.id/grants-for-indonesians/fulbright-programs/", target: "S2", destinations: ["amerika serikat"], expect: [], note: "no application dates on the page" },
  { id: "nl-scholarship", url: "https://www.studyinnl.org/finances/nl-scholarship", target: "S2", destinations: ["belanda"], expect: [], note: "no application dates on the page" },
  { id: "eiffel", url: "https://www.campusfrance.org/en/france-excellence-eiffel-scholarship-program", target: "S2", destinations: ["prancis"], expect: [{ match: "eiffel", deadline: "2027-01-06" }], note: "opening is given as a month only (October 2026)" },
  { id: "gates-cambridge", url: "https://www.gatescambridge.org/", target: "S3", destinations: ["inggris"], expect: [], note: "no application dates on the page" },
  { id: "swiss-excellence", url: "https://www.sbfi.admin.ch/en/swiss-government-excellence-scholarships", target: "S3", destinations: ["swiss"], expect: [], note: "opening date only; deadlines are per country on other pages" },
  { id: "taiwan-scholarship", url: "https://taiwanscholarship.moe.gov.tw/", target: "S2", destinations: ["taiwan"], expect: [], note: "no application dates on the page" },
  { id: "stipendium-hungaricum", url: "https://stipendiumhungaricum.hu/apply/", target: "S2", destinations: ["hungaria"], expect: [{ match: "stipendium", deadline: "2026-01-15" }], note: "2026/27 round, already closed" },
  { id: "fast-retailing", url: "https://www.fastretailing-foundation.or.jp/eng/scholarships/indonesia.html", target: "S1", destinations: ["jepang"], expect: [], note: "dates 2026-07-01 to 2026-09-01 are on the page, but no degree level is, so the app must not show it" },
  { id: "schwarzman", url: "https://www.schwarzmanscholars.org/admissions/", target: "S2", destinations: ["tiongkok"], expect: [], note: "application periods given as months only" },
];
