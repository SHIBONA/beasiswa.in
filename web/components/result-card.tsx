"use client";

import Link from "next/link";
import type { ApiResult } from "@beasiswa/shared";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Quote, SourceLink } from "@/components/source-link";
import { fmtDate, hostOf } from "@/lib/format";
import { cn } from "@/lib/utils";

const SOURCE_NOTES: Record<string, string> = {
  demo: "Angka syarat: data contoh mode demo. Cek angka resmi di situs penyelenggara.",
  firecrawl: "Angka diekstrak Firecrawl, tetapi kalimat aslinya tidak ditemukan kata per kata di halaman. Cek manual.",
  claude: "Angka dirangkum agen dari hasil pencarian web. Cek di situs resmi.",
};

export const programKey = (r: ApiResult) => r.program_id ?? r.id;

type Props = { result: ApiResult; saved: boolean; busy?: boolean; fromBookmarks?: boolean; onToggleSave: (r: ApiResult) => void };

export function ResultCard({ result: r, saved, busy = false, fromBookmarks = false, onToggleSave }: Props) {
  const score = Number(r.score) || 0;
  const color = score >= 75 ? "var(--color-emerald-600)" : score >= 50 ? "var(--primary)" : "var(--color-amber-600)";
  const limits = r.limits ?? [];
  const evidence = r.program?.evidence;
  const checked = r.program?.source_checked_at;
  const checkedDate = checked && Number.isFinite(Date.parse(checked))
    ? new Date(checked).toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta", day: "numeric", month: "long", year: "numeric" })
    : "";
  const quotes = evidence?.jenjang
    ? [["Jenjang", evidence.jenjang], ["Lokasi studi", evidence.lokasi], ["Pendaftaran buka", evidence.pembukaan], ["Batas pendaftaran", evidence.deadline]].filter(([, quote]) => quote)
    : [];

  return (
    <Card role="article" aria-label={r.name} data-limited={limits.length > 0} className={cn(limits.length > 0 && "ring-amber-300 dark:ring-amber-800")}>
      <CardContent className="grid gap-4 sm:grid-cols-[auto_1fr]">
        <div
          role="img"
          aria-label={`Skor kecocokan ${score}`}
          className={cn("grid size-16 place-items-center rounded-full", limits.length > 0 && "opacity-70")}
          style={{ background: `conic-gradient(${color} ${score}%, var(--border) 0)` }}
        >
          <span className="grid size-12 place-items-center rounded-full bg-card text-lg font-bold">{score}</span>
        </div>
        <div className="min-w-0 space-y-3">
          <h3 className="text-lg font-semibold">{r.name}</h3>
          {limits.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {limits.map((l) => <Badge key={l} className="bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200">⚠ {l}</Badge>)}
            </div>
          )}
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="secondary">{r.provider}</Badge>
            <Badge variant="secondary">📍 {r.country}</Badge>
            <Badge variant="secondary">🎓 {r.level}</Badge>
            <Badge variant="secondary">💰 {r.funding}</Badge>
            <Badge variant="secondary">⏰ {fmtDate(r.deadline)}</Badge>
          </div>
          {checkedDate && <p className="text-sm text-muted-foreground">Sumber diperiksa {checkedDate}</p>}
          {quotes.length > 0 && (
            <details>
              <summary className="cursor-pointer text-sm font-medium">Bukti dari sumber</summary>
              {quotes.map(([label, quote]) => (
                <blockquote key={label} className="my-2 border-l-4 border-primary/40 bg-muted/60 px-3 py-2 text-sm"><b>{label}</b><br />{quote}</blockquote>
              ))}
            </details>
          )}
          <p className="text-sm"><b>Syarat ringkas:</b> {r.requirements}</p>
          <InsightBlock r={r} />
          <BreakdownBlock r={r} />
          <AchievementsBlock r={r} />
          <AwardeeBlock r={r} />
          <div className="flex flex-wrap gap-2 pt-1">
            {r.program && (
              <Link className={buttonVariants()} href={`/sesuaikan/${encodeURIComponent(r.id)}${fromBookmarks ? "?dari=tersimpan" : ""}`}>🛠 Sesuaikan CV</Link>
            )}
            <SourceLink href={r.url} className={buttonVariants({ variant: "outline" })}>
              {r.program?.official === false ? "Buka sumber ↗" : "Buka sumber resmi ↗"}
            </SourceLink>
            <Button variant={saved ? "secondary" : "outline"} disabled={busy} aria-pressed={saved} onClick={() => onToggleSave(r)}>
              {saved ? "★ Tersimpan" : "☆ Simpan"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Panel({ title, children }: { title: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border bg-muted/30 p-3">
      <h4 className="mb-2 text-sm font-semibold">{title}</h4>
      {children}
    </section>
  );
}

// Why this program fits, per selection stage (older saved results fall back to reasons/gaps).
function InsightBlock({ r }: { r: ApiResult }) {
  if (!r.insight) {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <Panel title="✓ Kenapa cocok">
          <ul className="list-disc pl-5 text-sm">{(r.reasons ?? []).map((x) => <li key={x}>{x}</li>)}{!r.reasons?.length && <li>-</li>}</ul>
        </Panel>
        <Panel title="! Belum terpenuhi">
          <ul className="list-disc pl-5 text-sm">{(r.gaps ?? []).map((x) => <li key={x}>{x}</li>)}{!r.gaps?.length && <li>Semua syarat utama terpenuhi</li>}</ul>
        </Panel>
      </div>
    );
  }
  return (
    <Panel title={`💡 Analisis peluang di ${r.name}`}>
      <div className="space-y-2">
        {r.insight.map((i) => (
          <div key={i.label} className={cn("rounded-md border-l-4 px-3 py-2 text-sm", i.ok ? "border-emerald-500" : "border-amber-500")}>
            <b className={i.ok ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"}>{i.ok ? "✓" : "!"} {i.label}</b>
            <p>{i.text}</p>
            {(i.quotes ?? []).map((q) => <Quote key={q.quote} quote={q.quote} cite={`${q.text}, teks sumber ${hostOf(r.url)}`} />)}
          </div>
        ))}
      </div>
    </Panel>
  );
}

// Quantitative indicator: points per component, sums to the score.
function BreakdownBlock({ r }: { r: ApiResult }) {
  if (!r.breakdown?.length) return null;
  return (
    <Panel title={<>📊 Rincian skor ({Number(r.score) || 0}/100) <span className="font-normal text-muted-foreground">· klik baris untuk melihat dasar penilaian</span></>}>
      {r.breakdown.map((b, i) => {
        const penalty = b.points < 0;
        const pct = penalty ? 100 : b.max ? Math.round((b.points / b.max) * 100) : 0;
        const tone = penalty ? "bg-red-500" : pct >= 70 ? "bg-emerald-500" : pct >= 40 ? "bg-primary" : "bg-amber-500";
        const sourced = ["ipk", "bahasa", "pendanaan", "penalti"].includes(b.key);
        return (
          <details key={`${b.key}-${i}`} className="group border-b last:border-b-0">
            <summary className="grid cursor-pointer grid-cols-[7rem_1fr_auto] items-center gap-3 py-1.5 text-sm">
              <span>{b.label}</span>
              <span className="h-2 overflow-hidden rounded-full bg-muted"><i className={cn("block h-full", tone)} style={{ width: `${pct}%` }} /></span>
              <span className="tabular-nums">{penalty ? b.points : `${b.points}/${b.max}`}</span>
            </summary>
            <div className="space-y-1 pb-2 text-sm">
              <div><b>{b.detail}</b></div>
              {b.rule && <div><span className="text-muted-foreground">Aturan poin:</span> {b.rule}</div>}
              {b.quote ? <Quote quote={b.quote} cite={`teks sumber ${hostOf(r.url)}`} />
                : <div className="text-muted-foreground">{sourced ? SOURCE_NOTES[r.source] ?? SOURCE_NOTES.demo : "Dihitung dari profil beasiswamu dan data program."}</div>}
            </div>
          </details>
        );
      })}
    </Panel>
  );
}

function AchievementsBlock({ r }: { r: ApiResult }) {
  if (!r.achievements?.length) return null;
  const relevant = r.achievements.filter((a) => a.relevant.length).length;
  const total = r.breakdown?.find((b) => b.key === "prestasi");
  return (
    <Panel title={`🏆 Prestasi yang cocok: ${relevant} dari ${r.achievements.length}${total ? ` · ${total.points}/${total.max} poin` : ""}`}>
      <ul className="space-y-1.5 text-sm">
        {r.achievements.map((a) => (
          <li key={a.text} className="flex flex-wrap items-center gap-1.5">
            <span className={cn("rounded-md px-1.5 font-semibold tabular-nums", a.relevant.length ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200" : "bg-muted")}>+{a.points}</span>
            <span>{a.text}</span>
            <Badge variant="secondary">{a.level}</Badge>
            {a.relevant.map((t) => <Badge key={t} variant="outline">✓ {t}</Badge>)}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-muted-foreground">
        Poin = tingkat (internasional 8 · nasional 6 · regional 4 · kampus 3) + 3 jika sesuai kriteria program + 1–2 untuk juara. Tidak relevan = setengah poin tingkat. Maks 20.
      </p>
    </Panel>
  );
}

function AwardeeBlock({ r }: { r: ApiResult }) {
  if (!r.awardee_refs?.length) return null;
  return (
    <Panel title={<>🎓 Pengalaman awardee <span className="font-normal text-muted-foreground">· artikel publik hasil pencarian, belum diperiksa tim</span></>}>
      <ul className="space-y-1.5 text-sm">
        {r.awardee_refs.map((x) => (
          <li key={x.url}>
            <SourceLink href={x.url}>{x.title || hostOf(x.url) || "Sumber"}</SourceLink> <span className="text-muted-foreground">{hostOf(x.url)}</span>
            {x.description && <div className="text-muted-foreground">{x.description.slice(0, 200)}</div>}
          </li>
        ))}
      </ul>
    </Panel>
  );
}
