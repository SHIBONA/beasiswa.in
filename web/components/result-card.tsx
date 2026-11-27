"use client";

import { BookmarkCheckIcon, BookmarkIcon, CheckIcon, ChevronDownIcon, CircleAlertIcon, TriangleAlertIcon } from "lucide-react";
import Link from "next/link";
import type { ApiResult } from "@beasiswa/shared";
import { Quote, SourceLink } from "@/components/source-link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { fmtDate, hostOf } from "@/lib/format";
import { NAV } from "@/lib/nav";
import { cn } from "@/lib/utils";

const SOURCE_NOTES: Record<string, string> = {
  demo: "Angka syarat ini data contoh mode demo. Cek angka resmi di situs penyelenggara.",
  firecrawl: "Firecrawl mengekstrak angka ini, tetapi kalimat aslinya tidak ditemukan kata per kata di halaman. Cek manual.",
  claude: "Agen merangkum angka ini dari hasil pencarian web. Cek di situs resmi.",
};

export const programKey = (r: ApiResult) => r.program_id ?? r.id;

type Props = { result: ApiResult; saved: boolean; busy?: boolean; fromBookmarks?: boolean; onToggleSave: (r: ApiResult) => void };

export function ResultCard({ result: r, saved, busy = false, fromBookmarks = false, onToggleSave }: Props) {
  const score = Number(r.score) || 0;
  const limits = r.limits ?? [];
  const evidence = r.program?.evidence;
  const checked = r.program?.source_checked_at;
  const checkedDate = checked && Number.isFinite(Date.parse(checked))
    ? new Date(checked).toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta", day: "numeric", month: "long", year: "numeric" })
    : "";
  const quotes = evidence?.jenjang
    ? [["Jenjang", evidence.jenjang], ["Lokasi studi", evidence.lokasi], ["Pendaftaran dibuka", evidence.pembukaan], ["Batas pendaftaran", evidence.deadline]].filter(([, quote]) => quote)
    : [];
  const facts = [r.provider, r.country, r.level, r.funding && `Dana ${r.funding.toLowerCase()}`].filter(Boolean);

  return (
    <Card role="article" aria-label={r.name} data-limited={limits.length > 0}>
      <CardContent className="space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-1.5">
            <h3 className="text-lg font-semibold leading-snug">{r.name}</h3>
            <p className="text-sm text-muted-foreground">{facts.join(" · ")}</p>
            <p className="text-sm">
              Tutup pendaftaran: <span className="font-medium">{fmtDate(r.deadline)}</span>
              {checkedDate && <span className="text-muted-foreground"> · sumber diperiksa {checkedDate}</span>}
            </p>
          </div>
          <p className="shrink-0 text-right" aria-label={`Skor kecocokan ${score} dari 100`}>
            <span aria-hidden="true" className="block text-3xl font-semibold tabular-nums leading-none">{score}</span>
            <span aria-hidden="true" className="text-xs text-muted-foreground">dari 100</span>
          </p>
        </div>

        {limits.length > 0 && (
          <ul className="space-y-1 text-sm text-warning">
            {limits.map((l) => (
              <li key={l} className="flex gap-2"><TriangleAlertIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />{l}</li>
            ))}
          </ul>
        )}

        <p className="text-sm"><span className="text-muted-foreground">Syarat ringkas: </span>{r.requirements}</p>

        <InsightList r={r} />

        <div className="divide-y border-y">
          {quotes.length > 0 && (
            <Section title="Bukti dari halaman sumber">
              <div className="space-y-3">{quotes.map(([label, quote]) => <Quote key={label} quote={quote} cite={label} />)}</div>
            </Section>
          )}
          <Breakdown r={r} />
          <Achievements r={r} />
          <Awardees r={r} />
        </div>

        <div className="flex flex-wrap gap-2">
          {r.program && (
            <Link className={buttonVariants()} href={`/sesuaikan/${encodeURIComponent(r.id)}${fromBookmarks ? "?dari=tersimpan" : ""}`} transitionTypes={NAV.forward}>Sesuaikan CV</Link>
          )}
          <SourceLink href={r.url} className={cn(buttonVariants({ variant: "outline" }), "no-underline hover:text-foreground")}>
            {r.program?.official === false ? "Buka sumber" : "Buka situs resmi"}
          </SourceLink>
          <Button variant="outline" disabled={busy} aria-pressed={saved} onClick={() => onToggleSave(r)}>
            {saved ? <BookmarkCheckIcon aria-hidden="true" /> : <BookmarkIcon aria-hidden="true" />}
            {saved ? "Tersimpan" : "Simpan"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// A closed-by-default section; the heading says what is inside.
function Section({ title, children }: { title: React.ReactNode; children: React.ReactNode }) {
  return (
    <Collapsible>
      <CollapsibleTrigger className="group flex w-full items-center justify-between gap-3 rounded-md py-3 text-left text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
        {title}
        <ChevronDownIcon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground transition-transform group-aria-expanded:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="pb-4">{children}</CollapsibleContent>
    </Collapsible>
  );
}

// Why this program fits, per selection stage (older saved results fall back to reasons/gaps).
function InsightList({ r }: { r: ApiResult }) {
  const stages = r.insight ?? [
    { label: "Kenapa cocok", ok: true, text: (r.reasons ?? []).join(". ") || "-" },
    { label: "Belum terpenuhi", ok: !(r.gaps ?? []).length, text: (r.gaps ?? []).join(". ") || "Semua syarat utama terpenuhi" },
  ];
  return (
    <ul className="space-y-3">
      {stages.map((i) => (
        <li key={i.label} className="flex gap-3 text-sm">
          {i.ok
            ? <CheckIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-success" />
            : <CircleAlertIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-warning" />}
          <div className="min-w-0 space-y-2">
            <p><span className="font-medium">{i.label}</span> <span className="text-muted-foreground">({i.ok ? "terpenuhi" : "perlu perhatian"})</span></p>
            <p className="text-muted-foreground">{i.text}</p>
            {"quotes" in i && (i.quotes ?? []).map((q) => <Quote key={q.quote} quote={q.quote} cite={`${q.text}, ${hostOf(r.url)}`} />)}
          </div>
        </li>
      ))}
    </ul>
  );
}

// Points per component; they add up to the score.
function Breakdown({ r }: { r: ApiResult }) {
  if (!r.breakdown?.length) return null;
  return (
    <Section title={`Rincian skor (${Number(r.score) || 0} dari 100)`}>
      <ul className="space-y-1">
        {r.breakdown.map((b, i) => {
          const penalty = b.points < 0;
          const sourced = ["ipk", "bahasa", "pendanaan", "penalti"].includes(b.key);
          return (
            <li key={`${b.key}-${i}`}>
              <Collapsible>
                <CollapsibleTrigger className="grid w-full grid-cols-[6.5rem_1fr_auto] items-center gap-3 rounded-md py-2 text-left text-sm outline-none hover:bg-muted pointer-coarse:py-3 focus-visible:ring-3 focus-visible:ring-ring/50">
                  <span>{b.label}</span>
                  {penalty
                    ? <span className="text-destructive">Penalti</span>
                    : (
                      // Inside a button, so plain spans; the numbers beside it carry the value for screen readers.
                      <span aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <span className="block h-full rounded-full bg-primary" style={{ width: `${b.max ? Math.round((b.points / b.max) * 100) : 0}%` }} />
                      </span>
                    )}
                  <span className={cn("tabular-nums", penalty && "text-destructive")}>{penalty ? b.points : `${b.points}/${b.max}`}</span>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 pb-3 text-sm">
                  <p className="font-medium">{b.detail}</p>
                  {b.rule && <p className="text-muted-foreground">Aturan poin: {b.rule}</p>}
                  {b.quote
                    ? <Quote quote={b.quote} cite={`Teks sumber, ${hostOf(r.url)}`} />
                    : <p className="text-muted-foreground">{sourced ? SOURCE_NOTES[r.source] ?? SOURCE_NOTES.demo : "Dihitung dari profil beasiswamu dan data program."}</p>}
                </CollapsibleContent>
              </Collapsible>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

function Achievements({ r }: { r: ApiResult }) {
  if (!r.achievements?.length) return null;
  const relevant = r.achievements.filter((a) => a.relevant.length).length;
  const total = r.breakdown?.find((b) => b.key === "prestasi");
  return (
    <Section title={`Prestasi yang cocok: ${relevant} dari ${r.achievements.length}${total ? `, ${total.points}/${total.max} poin` : ""}`}>
      <ul className="space-y-2 text-sm">
        {r.achievements.map((a) => (
          <li key={a.text} className="grid grid-cols-[2.5rem_1fr] gap-2">
            <span className="tabular-nums text-muted-foreground">+{a.points}</span>
            <span>
              {a.text} <span className="text-muted-foreground">· {a.level}{a.relevant.length ? ` · cocok dengan ${a.relevant.join(", ")}` : ""}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-muted-foreground">
        Poin = tingkat (internasional 8, nasional 6, regional 4, kampus 3) + 3 jika sesuai kriteria program + 1 sampai 2 untuk juara. Prestasi di luar kriteria mendapat setengah poin tingkat. Maksimal 20.
      </p>
    </Section>
  );
}

function Awardees({ r }: { r: ApiResult }) {
  if (!r.awardee_refs?.length) return null;
  return (
    <Section title={`Cerita awardee (${r.awardee_refs.length}), artikel publik yang belum diperiksa tim`}>
      <ul className="space-y-3 text-sm">
        {r.awardee_refs.map((x) => (
          <li key={x.url} className="space-y-1">
            <SourceLink href={x.url}>{x.title || hostOf(x.url) || "Sumber"}</SourceLink>
            <p className="text-muted-foreground">{hostOf(x.url)}{x.description && ` · ${x.description.slice(0, 200)}`}</p>
          </li>
        ))}
      </ul>
    </Section>
  );
}
