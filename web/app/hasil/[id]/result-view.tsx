"use client";

import { InfoIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { ApiResult, SearchHit, SearchResponse } from "@beasiswa/shared";
import { AgentTrace } from "@/components/agent-trace";
import { SearchStatus } from "@/components/history-table";
import { ResultCard } from "@/components/result-card";
import { SourceLink } from "@/components/source-link";
import { LoadError, Loading } from "@/components/states";
import { useBookmarks } from "@/components/use-bookmarks";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { api, errorText } from "@/lib/api";
import { DISCLAIMER, fmtTime, hostOf } from "@/lib/format";

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

  if (!data) return error ? <LoadError title="Hasil pencarian tidak bisa dibuka" message={error} /> : <Loading>Memuat hasil pencarian…</Loading>;
  const { search, saved_ids } = data;
  const live = search.status === "queued" || search.status === "running";
  const countries = search.target_countries?.map((name) => name.replace(/\b\w/g, (c) => c.toUpperCase())).join(", ");
  const target = [search.target_level && `Tujuan ${search.target_level}`, countries, fmtTime(search.created_at)].filter(Boolean).join(" · ");

  return (
    <div className="space-y-10">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Hasil Pencarian</h1>
          <SearchStatus status={search.status} />
        </div>
        <p className="text-muted-foreground">{target}</p>
        {search.notes && <p className="text-sm">Catatan: {search.notes}</p>}
      </div>

      <section aria-live="polite" aria-labelledby="langkah" className="space-y-3">
        <h2 id="langkah" className="text-sm font-medium">Langkah agen</h2>
        <AgentTrace steps={search.steps} live={live} error={search.status === "failed" ? search.error : null} />
        {search.status === "failed" && (
          <Alert variant="destructive">
            <AlertTitle>Pencarian gagal.</AlertTitle>
            <AlertDescription>
              Kuota hari ini tidak terpakai. <Link className="underline underline-offset-4" href="/cari">Coba lagi</Link>
            </AlertDescription>
          </Alert>
        )}
      </section>

      {search.status === "succeeded" && (
        <>
          <ResultsList search={search} savedIds={saved_ids} />
          {search.mode !== "firecrawl" && <OthersBlock others={search.others} />}
          <Alert>
            <InfoIcon />
            <AlertTitle>Cek ulang di situs resmi</AlertTitle>
            <AlertDescription>{DISCLAIMER}</AlertDescription>
          </Alert>
          <MethodNote />
        </>
      )}
    </div>
  );
}

// Eligible programs first; programs with hard limits stay visible below, labelled.
function ResultsList({ search, savedIds }: { search: Search; savedIds: string[] }) {
  const savedKeys = search.results.filter((r) => savedIds.includes(r.id)).map((r) => r.program_id ?? r.id);
  const bookmarks = useBookmarks(savedKeys);
  if (search.mode === "firecrawl" && !Array.isArray(search.target_countries)) {
    return (
      <p>
        Pencarian ini dibuat oleh versi lama yang belum memeriksa jadwal pendaftaran.{" "}
        <Link className="underline underline-offset-4" href="/cari">Mulai pencarian baru</Link> untuk melihat jadwal tiap beasiswa.
      </p>
    );
  }
  if (!search.results.length) {
    return (
      <p className="text-muted-foreground">
        Belum ada beasiswa dengan bukti jenjang, lokasi, dan jadwal pendaftaran dari halaman yang diperiksa. Langkah agen di atas menunjukkan bukti apa yang kurang di tiap halaman.
      </p>
    );
  }
  const limited = (r: ApiResult) => (r.limits ?? []).length > 0;
  const ok = search.results.filter((r) => !limited(r));
  const rest = search.results.filter(limited);
  const card = (r: ApiResult) => (
    <ResultCard key={r.id} result={r} saved={bookmarks.isSaved(r)} busy={bookmarks.isBusy(r)} onToggleSave={bookmarks.toggle} />
  );
  const okLabel = search.mode === "firecrawl" ? "pendaftarannya sedang buka" : "sesuai jenjang dan deadline";
  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">{ok.length ? `${ok.length} beasiswa ${okLabel}` : `Belum ada beasiswa yang ${okLabel}`}</h2>
        {ok.map(card)}
      </section>
      {rest.length > 0 && (
        <section className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">{rest.length} beasiswa dengan catatan</h2>
            <p className="text-sm text-muted-foreground">Jenjang, jadwal pendaftaran, atau sumbernya belum pas. Baca catatan di tiap kartu.</p>
          </div>
          {rest.map(card)}
        </section>
      )}
    </div>
  );
}

function MethodNote() {
  return (
    <Collapsible className="border-t pt-4">
      <CollapsibleTrigger className="rounded-md text-sm font-medium underline underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
        Cara skor dihitung dan batasnya
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
          <li>Syarat angka (IPK, IELTS, deadline, dana) dirangkum dari sumber yang ditemukan. Di mode Firecrawl, kutipan hanya tampil jika kalimatnya ada di teks sumber. Tetap cek apakah kutipan berlaku untuk program dan periode yang kamu incar.</li>
          <li>Bobot: IPK 25, bahasa 15, negara 20, prestasi 20, bidang 10, pendanaan 10, dikurangi penalti syarat mutlak. Urutannya mengikuti tahap seleksi umum: syarat administrasi dulu (gugur jika tidak terpenuhi), lalu substansi (esai, prestasi, wawancara).</li>
          <li>Bobot ini rancangan tim beasiswa.in untuk prototipe dan belum divalidasi alumni penerima atau ahli. Skor mengukur kecocokan dengan syarat tertulis, bukan peluang lolos.</li>
          <li>Cerita awardee adalah artikel publik hasil pencarian dan belum diperiksa tim.</li>
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}

// Searches saved by older versions may list unscored candidates.
function OthersBlock({ others }: { others?: SearchHit[] }) {
  if (!others?.length) return null;
  return (
    <Collapsible className="border-t pt-4">
      <CollapsibleTrigger className="rounded-md text-sm font-medium underline underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
        {others.length} kandidat lain yang belum dibaca agen
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ul className="mt-3 space-y-3 text-sm">
          {others.map((x) => (
            <li key={x.url} className="space-y-1">
              <SourceLink href={x.url}>{x.title || hostOf(x.url) || "Sumber"}</SourceLink>
              <p className="text-muted-foreground">{hostOf(x.url)}{x.description && ` · ${x.description.slice(0, 200)}`}</p>
            </li>
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}
