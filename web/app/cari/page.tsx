"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import type { HistoryResponse, MetaResponse, ProfileResponse, SearchStartResponse } from "@beasiswa/shared";
import { HistoryTable } from "@/components/history-table";
import { LoadError, Loading, PageHeading } from "@/components/states";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { ApiError, api, errorText, sendJson } from "@/lib/api";

type Data = ProfileResponse & HistoryResponse & { meta: MetaResponse };

export default function SearchPage() {
  const router = useRouter();
  const [data, setData] = useState<Data | null>(null);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api<ProfileResponse>("/profile"), api<HistoryResponse>("/searches"), api<MetaResponse>("/meta")])
      .then(([{ profile }, { searches }, meta]) => setData({ profile, searches, meta }), (err) => setLoadError(errorText(err)));
  }, []);

  async function start(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { search_id } = await api<SearchStartResponse>("/searches", sendJson("POST", { notes }));
      router.push(`/hasil/${encodeURIComponent(search_id)}`);
    } catch (err) {
      const s = err instanceof ApiError ? err.body.retry_after : undefined;
      const retry = s ? ` Coba lagi dalam ${s > 3600 ? Math.ceil(s / 3600) + " jam" : s + " detik"}.` : "";
      setError(errorText(err) + retry);
      setBusy(false);
    }
  }

  if (!data) return loadError ? <LoadError title="Halaman pencarian tidak bisa dimuat" message={loadError} /> : <Loading>Memuat profil dan riwayat…</Loading>;
  const { profile, searches, meta } = data;
  const recent = searches.slice(0, 3);

  return (
    <div className="space-y-12">
      <PageHeading title="Cari Beasiswa">
        Agen mencari beasiswa di web, lalu mengurutkannya dari yang paling cocok dengan profilmu.
      </PageHeading>

      {profile ? (
        <form onSubmit={start} className="space-y-6">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 border-b pb-4">
            <p>
              <span className="text-muted-foreground">Profil: </span>
              {profile.jenjang_saat_ini} {profile.prodi}, tujuan {profile.jenjang_tujuan} · IPK {profile.ipk} · {profile.negara_tujuan || "semua negara"}
            </p>
            <Link href="/profil" className="text-sm underline underline-offset-4">Ubah profil</Link>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Catatan untuk agen <span className="font-normal text-muted-foreground">(opsional)</span></Label>
            <Input id="notes" maxLength={300} placeholder="Contoh: fully funded, Jepang, S2 2027" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Button type="submit" size="lg" disabled={busy}>
              {busy && <Spinner aria-hidden="true" />}
              Cari beasiswa
            </Button>
            <p className="text-sm text-muted-foreground">Sisa {meta.quota_left} dari {meta.daily_quota} pencarian hari ini</p>
          </div>
          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
        </form>
      ) : (
        <div className="space-y-4">
          <p>Agen butuh profil beasiswamu untuk menilai kecocokan. Isi manual atau unggah CV, hanya perlu sekali.</p>
          <Link className={buttonVariants()} href="/profil">Isi profil</Link>
        </div>
      )}

      {recent.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-lg font-semibold">Pencarian terakhir</h2>
            <Link href="/riwayat" className="text-sm underline underline-offset-4">Semua riwayat</Link>
          </div>
          <HistoryTable searches={recent} />
        </section>
      )}
    </div>
  );
}
