"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import type { HistoryResponse, MetaResponse, ProfileResponse, SearchStartResponse } from "@beasiswa/shared";
import { HistoryTable } from "@/components/history-table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, api, errorText, sendJson } from "@/lib/api";

type Data = ProfileResponse & HistoryResponse & { meta: MetaResponse };

export default function SearchPage() {
  const router = useRouter();
  const [data, setData] = useState<Data | null>(null);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api<ProfileResponse>("/profile"), api<HistoryResponse>("/searches"), api<MetaResponse>("/meta")])
      .then(([{ profile }, { searches }, meta]) => setData({ profile, searches, meta }), (err) => setError(errorText(err)));
  }, []);

  async function start(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
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

  if (!data) return error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null;
  const { profile, searches, meta } = data;
  const recent = searches.slice(0, 3);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Cari Beasiswa</h1>
        <p className="text-muted-foreground">Agen AI mencari beasiswa di web lalu mengurutkannya berdasarkan kecocokan dengan profilmu.</p>
      </div>
      {profile ? (
        <Card>
          <CardContent>
            <form onSubmit={start} className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p><b>Profil:</b> {profile.jenjang_saat_ini} {profile.prodi} → {profile.jenjang_tujuan} · IPK {profile.ipk} · {profile.negara_tujuan || "semua negara"}</p>
                <Link href="/profil" className={buttonVariants({ variant: "outline" })}>Ubah profil / upload CV</Link>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="notes">Catatan tambahan <span className="font-normal text-muted-foreground">(opsional)</span></Label>
                <Input id="notes" maxLength={300} placeholder='Contoh: "fully funded, Jepang, S2 2027"' value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Badge variant="secondary">Sisa kuota hari ini: {meta.quota_left}/{meta.daily_quota}</Badge>
                <Button type="submit" disabled={busy}>🔎 Cari beasiswa</Button>
              </div>
              {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
            </form>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="space-y-4 py-6 text-center text-muted-foreground">
            <p>Isi profil beasiswa dulu supaya agen tahu apa yang cocok untukmu.</p>
            <Link className={buttonVariants()} href="/profil">Upload CV / isi profil</Link>
          </CardContent>
        </Card>
      )}
      {recent.length > 0 && (
        <Card>
          <CardContent className="space-y-2">
            <h2 className="font-semibold">Pencarian terakhir</h2>
            <HistoryTable searches={recent} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
