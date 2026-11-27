"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ApiResult, SearchHit, SearchResponse } from "@beasiswa/shared";
import { statusTone } from "@/components/history-table";
import { ResultCard } from "@/components/result-card";
import { SourceLink } from "@/components/source-link";
import { useBookmarks } from "@/components/use-bookmarks";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { api, errorText } from "@/lib/api";
import { DISCLAIMER, STATUS, fmtTime, hostOf } from "@/lib/format";
import { cn } from "@/lib/utils";

const POLL_MS = 1200;
type Search = SearchResponse["search"];

export function ResultView({ id }: { id: string }) {
  const [data, setData] = useState<SearchResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;
    async function load() {
      try {
        const next = await api<SearchResponse>(`/searches/${encodeURIComponent(id)}`);
        if (stopped) return;
        setData(next);
        if (next.search.status === "queued" || next.search.status === "running") timer = setTimeout(load, POLL_MS);
      } catch (err) {
        if (!stopped) setError(errorText(err));
      }
    }
    load();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [id]);

  if (!data) return error ? <Card><CardContent className="py-6 text-center text-muted-foreground">{error}</CardContent></Card> : null;
  const { search, saved_ids } = data;
  const live = search.status === "queued" || search.status === "running";
  const countries = search.target_countries?.map((name) => name.replace(/\b\w/g, (c) => c.toUpperCase())).join(", ");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Hasil Pencarian</h1>
          <p className="text-muted-foreground">
            {search.target_level ? `Tujuan ${search.target_level}${countries ? ` · ${countries}` : ""} · ` : ""}
            {fmtTime(search.created_at)}
            {search.notes ? ` · “${search.notes}”` : ""}
          </p>
        </div>
        <Badge className={statusTone[search.status]}>{STATUS[search.status]}</Badge>
      </div>

      <Card aria-live="polite">
        <CardContent className="space-y-2">
          <h2 className="font-semibold">Langkah agen</h2>
          <ol className="space-y-1 text-sm">
            {search.steps.length
              ? search.steps.map((s, i) => (
                <li key={i} className={cn("border-l-2 pl-3", live && i === search.steps.length - 1 ? "border-primary font-medium" : "border-border text-muted-foreground")}>{s.text}</li>
              ))
              : <li className="border-l-2 border-primary pl-3 font-medium">Menyiapkan agen…</li>}
          </ol>
          {search.status === "failed" && (
            <Alert variant="destructive">
              <AlertDescription>
                <p><b>Pencarian gagal.</b> {search.error}</p>
                <p>Kuota hari ini tidak terpakai. <Link className="underline" href="/cari">Coba lagi</Link></p>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {search.status === "succeeded" && (
        <>
          <Alert className="border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
            <AlertDescription className="text-inherit">⚠️ {DISCLAIMER}</AlertDescription>
          </Alert>
          <MethodNote />
          <ResultsList search={search} savedIds={saved_ids} />
          {search.mode !== "firecrawl" && <OthersBlock others={search.others} />}
        </>
      )}
    </div>
  );
}

// Eligible programs first; programs with hard limits stay visible below a divider, labelled.
function ResultsList({ search, savedIds }: { search: Search; savedIds: string[] }) {
  const savedKeys = search.results.filter((r) => savedIds.includes(r.id)).map((r) => r.program_id ?? r.id);
  const bookmarks = useBookmarks(savedKeys);
  if (search.mode === "firecrawl" && !Array.isArray(search.target_countries)) {
    return <Card><CardContent>Pencarian lama ini dibuat sebelum pemeriksaan periode pendaftaran tersedia. <Link className="text-primary underline" href="/cari">Mulai pencarian baru</Link> untuk melihat beasiswa yang masih buka.</CardContent></Card>;
  }
  if (!search.results.length) {
    return <Card><CardContent>Belum ada beasiswa dengan bukti jenjang, lokasi, dan jadwal pendaftaran untuk tujuan ini dari sumber yang diperiksa. Langkah agen di atas menjelaskan bukti apa yang kurang di tiap halaman.</CardContent></Card>;
  }
  const limited = (r: ApiResult) => (r.limits ?? []).length > 0;
  const ok = search.results.filter((r) => !limited(r));
  const rest = search.results.filter(limited);
  const card = (r: ApiResult) => (
    <ResultCard key={r.id} result={r} saved={bookmarks.isSaved(r)} busy={bookmarks.isBusy(r)} onToggleSave={bookmarks.toggle} />
  );
  const summary = search.mode === "firecrawl" ? "pendaftaran masih buka" : "sesuai jenjang & deadline";
  return (
    <div className="space-y-4">
      <p className="text-muted-foreground">
        <b className="text-foreground">{search.results.length} beasiswa</b> · {ok.length} {summary}
        {rest.length > 0 && ` · ${rest.length} dengan catatan`}
      </p>
      {ok.map(card)}
      {rest.length > 0 && (
        <>
          <div className="border-t pt-3">
            <b>Tetap ditampilkan dengan batasan ({rest.length})</b>
            <p className="text-sm text-muted-foreground">Periksa batasan pada setiap kartu, termasuk jadwal pendaftaran, deadline dan sumber informasi.</p>
          </div>
          {rest.map(card)}
        </>
      )}
    </div>
  );
}

function MethodNote() {
  return (
    <Card>
      <CardContent>
        <details>
          <summary className="cursor-pointer font-semibold">ℹ️ Cara skor dihitung dan seberapa valid</summary>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            <li><b>Syarat angka</b> (IPK, IELTS, deadline, dana) dirangkum dari sumber yang ditemukan. Di mode Firecrawl, kutipan ditampilkan jika ditemukan dalam teks sumber. Tetap cek apakah kutipan berlaku untuk program dan periode yang kamu incar.</li>
            <li><b>Bobot</b> IPK 25 · Bahasa 15 · Negara 20 · Prestasi 20 · Bidang 10 · Pendanaan 10, dikurangi penalti syarat mutlak. Urutannya mengikuti tahap seleksi umum: syarat administrasi (gugur jika tidak terpenuhi), lalu substansi (esai, prestasi, wawancara).</li>
            <li><b>Batasan:</b> bobot ini rancangan tim beasiswa.in untuk prototipe dan <b>belum divalidasi alumni penerima atau ahli</b>. Skor mengukur kecocokan dengan syarat tertulis, bukan peluang lolos.</li>
            <li><b>Pengalaman awardee</b> adalah artikel publik hasil pencarian, belum diperiksa tim.</li>
          </ul>
        </details>
      </CardContent>
    </Card>
  );
}

// Searches saved by older versions may list unscored candidates.
function OthersBlock({ others }: { others?: SearchHit[] }) {
  if (!others?.length) return null;
  return (
    <Card>
      <CardContent>
        <details>
          <summary className="cursor-pointer"><b>🔗 Kandidat lain dari pencarian ({others.length})</b> <span className="text-muted-foreground">· belum dibaca agen, tanpa skor</span></summary>
          <ul className="mt-2 space-y-1.5 text-sm">
            {others.map((x) => (
              <li key={x.url}>
                <SourceLink href={x.url}>{x.title || hostOf(x.url) || "Sumber"}</SourceLink> <span className="text-muted-foreground">{hostOf(x.url)}</span>
                {x.description && <div className="text-muted-foreground">{x.description.slice(0, 200)}</div>}
              </li>
            ))}
          </ul>
        </details>
      </CardContent>
    </Card>
  );
}
