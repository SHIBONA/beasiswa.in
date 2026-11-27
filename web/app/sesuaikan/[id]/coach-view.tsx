"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { CoachResponse, CvEdit, Link as GrowthLink, PreviewReport, Profile, ProfileResponse } from "@beasiswa/shared";
import { Quote, SourceLink } from "@/components/source-link";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, errorText, sendJson } from "@/lib/api";
import { hostOf } from "@/lib/format";
import { cn } from "@/lib/utils";

type Loaded = { coach: CoachResponse; profile: Profile };
// Per achievement line: the chosen option ("" keeps the line) and the member's edits to option texts.
type Choice = { pick: string; texts: Record<string, string> };

const okBox = "border-emerald-300 bg-emerald-50 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100";

export function CoachView({ resultId, fromBookmarks }: { resultId: string; fromBookmarks: boolean }) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState("");
  const [choices, setChoices] = useState<Partial<Record<number, Choice>>>({});
  const [profileEdits, setProfileEdits] = useState<Set<number>>(new Set());
  const [truth, setTruth] = useState(false);
  const [preview, setPreview] = useState<PreviewReport | null>(null);
  const [previewError, setPreviewError] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    Promise.all([api<CoachResponse>(`/coach/${encodeURIComponent(resultId)}`), api<ProfileResponse>("/profile")]).then(
      ([coach, { profile }]) => (profile ? setLoaded({ coach, profile }) : setError("Isi profil beasiswa dulu.")),
      (err) => setError(errorText(err)),
    );
  }, [resultId, reload]);

  if (!loaded) {
    return error ? <Alert variant="destructive"><AlertDescription>{error} <Link className="underline" href="/cari">Kembali</Link></AlertDescription></Alert> : null;
  }
  const { coach: c, profile } = loaded;
  const items = String(profile.prestasi ?? "").split(/;|\n/).map((x) => x.trim()).filter((x) => x.length > 3);
  const backToSaved = fromBookmarks || c.saved_only;

  const patch = () => {
    const chosen = items.map((text, i) => {
      const choice = choices[i];
      if (!choice?.pick) return text;
      const edit = c.cv_edits.find((e) => e.index === i);
      return (choice.texts[choice.pick] ?? edit?.options[Number(choice.pick)]?.text ?? "").trim() || text;
    });
    const out: Partial<Profile> = { prestasi: chosen.join("; ") };
    for (const k of profileEdits) {
      const e = c.profile_edits[k];
      if (e.field === "bidang_minat" || e.field === "negara_tujuan") out[e.field] = e.value;
    }
    return out;
  };

  async function runPreview() {
    try {
      setPreview(await api<PreviewReport>(`/coach/${encodeURIComponent(resultId)}/preview`, sendJson("POST", patch())));
      setPreviewError("");
    } catch (err) {
      setPreviewError(errorText(err));
    }
  }

  async function apply() {
    try {
      await api<ProfileResponse>("/profile", sendJson("PUT", { ...profile, ...patch() }));
      toast("Profil diperbarui. Skor baru dipakai di pencarian berikutnya.");
      setChoices({});
      setProfileEdits(new Set());
      setTruth(false);
      setPreview(null);
      setReload((n) => n + 1);
    } catch (err) {
      toast(errorText(err));
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(String(patch().prestasi).split("; ").join("\n"));
      toast("Teks prestasi disalin");
    } catch {
      toast("Browser menolak akses clipboard");
    }
  }

  const setChoice = (index: number, next: Partial<Choice>) =>
    setChoices((prev) => ({ ...prev, [index]: { pick: "", texts: {}, ...prev[index], ...next } }));

  return (
    <div className="space-y-4">
      <p>
        <Link className="text-primary underline-offset-4 hover:underline" href={backToSaved ? "/tersimpan" : `/hasil/${encodeURIComponent(resultId.split(":")[0])}`}>
          ← Kembali ke {backToSaved ? "tersimpan" : "hasil"}
        </Link>
      </p>
      <div>
        <h1 className="text-2xl font-bold">Sesuaikan CV untuk {c.program.name}</h1>
        <p className="text-muted-foreground">
          Skor sekarang <b className="text-foreground">{c.before}</b>. Potensi jika semua saran kalimat dipakai: <b className="text-foreground">{c.best}</b>{" "}
          ({c.best > c.before ? `naik ${c.best - c.before} poin` : "tidak berubah"}). Program menilai: {c.program.values.join(", ") || "-"}.{" "}
          <SourceLink href={c.program.url}>Buka sumber ↗</SourceLink>
        </p>
      </div>

      <Card>
        <CardContent className="space-y-4">
          <h2 className="text-lg font-semibold">✍️ Bisa ditingkatkan lewat CV</h2>
          <p className="text-sm text-muted-foreground">Opsi di bawah tidak menambah fakta baru: hanya menyebut kategori atau tingkat yang dinilai program agar terbaca jelas. Kalimat bisa kamu ubah (misalnya tambahkan angka nyata).</p>
          {c.cv_note && <Alert className={okBox}><AlertDescription className="text-inherit">{c.cv_note}</AlertDescription></Alert>}
          {c.cv_edits.map((e) => (
            <EditBlock key={e.index} edit={e} choice={choices[e.index]} onChange={(next) => setChoice(e.index, next)} />
          ))}
          {c.profile_edits.map((e, k) => (
            <Label key={k} className="flex items-start gap-2 rounded-lg border p-3 font-normal">
              <Checkbox
                checked={profileEdits.has(k)}
                onCheckedChange={(checked) => setProfileEdits((prev) => {
                  const next = new Set(prev);
                  if (checked) next.add(k);
                  else next.delete(k);
                  return next;
                })}
              />
              <span><b className="text-emerald-700 dark:text-emerald-400">+{e.delta} poin → {e.after}</b> {e.label} <span className="text-muted-foreground"><b>{e.condition}</b></span></span>
            </Label>
          ))}
          <Label className="font-medium">
            <Checkbox checked={truth} onCheckedChange={setTruth} /> Saya pastikan semua kalimat yang dipilih sesuai fakta dan bisa dibuktikan.
          </Label>
          <div className="flex flex-wrap gap-2">
            <Button onClick={runPreview}>🔁 Hitung ulang skor</Button>
            <Button variant="outline" disabled={!truth} onClick={apply}>💾 Simpan ke profil</Button>
            <Button variant="outline" onClick={copy}>📋 Salin teks prestasi</Button>
          </div>
          <div id="previewOut" aria-live="polite">
            {preview && <Compare report={preview} />}
            {previewError && <Alert variant="destructive"><AlertDescription>{previewError}</AlertDescription></Alert>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3">
          <h2 className="text-lg font-semibold">🚫 Tidak bisa diatasi dengan edit CV</h2>
          {c.hard_gaps.length ? c.hard_gaps.map((g) => (
            <div key={g.title} className="space-y-1 border-t pt-3 first:border-t-0 first:pt-0">
              <b>{g.title}</b>{g.potential > 0 && <> <Badge variant="secondary">potensi +{g.potential} poin jika terpenuhi</Badge></>}
              <p className="text-sm">{g.why}</p>
              {g.quote && <Quote quote={g.quote} cite={`teks sumber ${hostOf(c.program.url)}`} />}
              {g.actions.length > 0 && (
                <>
                  <p className="text-sm text-muted-foreground">Yang bisa kamu lakukan:</p>
                  <LinkList links={g.actions} />
                </>
              )}
            </div>
          )) : <Alert className={okBox}><AlertDescription className="text-inherit">Semua syarat angka yang tertulis sudah terpenuhi.</AlertDescription></Alert>}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3">
          <h2 className="text-lg font-semibold">📈 Rencana pengembangan</h2>
          {c.growth.length ? c.growth.map((g) => (
            <div key={g.area} className="space-y-1 border-t pt-3 first:border-t-0 first:pt-0">
              <b>{g.area}</b>
              <p className="text-sm">{g.why}</p>
              {g.quote && <Quote quote={g.quote} cite={`teks sumber ${hostOf(c.program.url)}`} />}
              <LinkList links={g.links} />
            </div>
          )) : <Alert className={okBox}><AlertDescription className="text-inherit">Profilmu sudah kuat untuk kriteria program ini. Fokus ke esai dan wawancara.</AlertDescription></Alert>}
        </CardContent>
      </Card>
      <p className="text-sm text-muted-foreground">Dasar saran: syarat dan kriteria tertulis program (beserta kutipan bila ada) dan aturan skor yang sama dengan halaman hasil. Bukan jaminan lolos; bobot belum divalidasi ahli.</p>
    </div>
  );
}

function EditBlock({ edit: e, choice, onChange }: { edit: CvEdit; choice?: Choice; onChange: (next: Partial<Choice>) => void }) {
  const pick = choice?.pick ?? "";
  return (
    <div className="space-y-2 rounded-lg border p-3">
      <p className="text-sm text-muted-foreground">Kalimat sekarang · tingkat {e.level.toLowerCase()} · kategori {e.tags.join(", ") || "belum terbaca"}</p>
      <p className="font-medium">{e.original}</p>
      <RadioGroup value={pick} onValueChange={(value) => onChange({ pick: String(value) })} aria-label={`Pilihan kalimat untuk: ${e.original}`}>
        <Label className="font-normal"><RadioGroupItem value="" /> Biarkan apa adanya</Label>
        {e.options.map((o, k) => (
          <div key={k} className={cn("space-y-1.5 rounded-md p-2", pick === String(k) && "bg-muted/60")}>
            <Label className="font-normal">
              <RadioGroupItem value={String(k)} />
              <b className="text-emerald-700 dark:text-emerald-400">+{o.delta} poin → {o.after}</b>
            </Label>
            <Input
              aria-label={`Kalimat opsi ${k + 1}`}
              value={choice?.texts[String(k)] ?? o.text}
              onChange={(ev) => onChange({ texts: { ...choice?.texts, [String(k)]: ev.target.value } })}
            />
            <p className="text-sm text-muted-foreground">{o.why} <b>{o.condition}</b></p>
          </div>
        ))}
      </RadioGroup>
    </div>
  );
}

function LinkList({ links }: { links: GrowthLink[] }) {
  return (
    <ul className="list-disc space-y-1 pl-5 text-sm">
      {links.map((l) => (
        <li key={l.title}>
          {l.url ? <SourceLink href={l.url}>{l.title} ↗</SourceLink> : <b>{l.title}</b>} <span className="text-muted-foreground">{l.note}</span>
        </li>
      ))}
    </ul>
  );
}

const Delta = ({ d }: { d: number }) =>
  d > 0 ? <span className="font-semibold text-emerald-700 dark:text-emerald-400">+{d}</span>
    : d < 0 ? <span className="font-semibold text-red-700 dark:text-red-400">{d}</span>
      : <span className="text-muted-foreground">0</span>;

function Compare({ report: p }: { report: PreviewReport }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-4 rounded-lg bg-muted/60 p-3">
        <div><span className="block text-xs text-muted-foreground">Sebelum</span><b className="text-xl">{p.before}</b></div>
        <span aria-hidden="true">→</span>
        <div><span className="block text-xs text-muted-foreground">Sesudah</span><b className="text-xl">{p.after}</b></div>
        <div><Delta d={p.after - p.before} /> poin</div>
      </div>
      <Table>
        <TableHeader>
          <TableRow><TableHead>Komponen</TableHead><TableHead>Sebelum</TableHead><TableHead>Sesudah</TableHead><TableHead>Δ</TableHead><TableHead>Alasan perubahan</TableHead></TableRow>
        </TableHeader>
        <TableBody>
          {p.rows.map((r) => (
            <TableRow key={r.key} className={cn(r.after !== r.before && "bg-emerald-50 dark:bg-emerald-950/40")}>
              <TableCell>{r.label}</TableCell>
              <TableCell>{r.before}{r.max ? `/${r.max}` : ""}</TableCell>
              <TableCell>{r.after}{r.max ? `/${r.max}` : ""}</TableCell>
              <TableCell><Delta d={r.after - r.before} /></TableCell>
              <TableCell className="whitespace-normal text-muted-foreground">{r.after !== r.before ? r.detail : ""}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
