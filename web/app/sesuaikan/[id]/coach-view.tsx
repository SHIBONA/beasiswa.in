"use client";

import { ArrowLeftIcon, CheckIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { CoachResponse, CvEdit, Link as GrowthLink, PreviewReport, Profile, ProfileResponse } from "@beasiswa/shared";
import { Quote, SourceLink } from "@/components/source-link";
import { LoadError, Loading } from "@/components/states";
import { animate, PageTransition, Reveal } from "@/components/transitions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, errorText, sendJson } from "@/lib/api";
import { hostOf } from "@/lib/format";
import { NAV } from "@/lib/nav";
import { cn } from "@/lib/utils";

type Loaded = { coach: CoachResponse; profile: Profile };
// Per achievement line: the chosen option ("" keeps the line) and the member's edits to option texts.
type Choice = { pick: string; texts: Record<string, string> };

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
      ([coach, { profile }]) => (profile ? animate(() => setLoaded({ coach, profile })) : setError("Isi profil beasiswa dulu")),
      (err) => setError(errorText(err)),
    );
  }, [resultId, reload]);

  const back = fromBookmarks || loaded?.coach.saved_only
    ? { href: "/tersimpan", label: "Kembali ke tersimpan" }
    : { href: `/hasil/${encodeURIComponent(resultId.split(":")[0])}`, label: "Kembali ke hasil" };
  const backLink = (
    <Link className="inline-flex items-center gap-1.5 text-sm underline underline-offset-4 pointer-coarse:min-h-11" href={back.href} transitionTypes={NAV.back}>
      <ArrowLeftIcon aria-hidden="true" className="size-4" />{back.label}
    </Link>
  );

  if (!loaded) {
    return (
      <PageTransition>
        {error
          ? <div className="space-y-4"><LoadError title="Saran CV tidak bisa dimuat" message={error} />{backLink}</div>
          : <Loading>Menghitung saran untuk beasiswa ini…</Loading>}
      </PageTransition>
    );
  }
  const { coach: c, profile } = loaded;
  const items = String(profile.prestasi ?? "").split(/;|\n/).map((x) => x.trim()).filter((x) => x.length > 3);

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
      const report = await api<PreviewReport>(`/coach/${encodeURIComponent(resultId)}/preview`, sendJson("POST", patch()));
      animate(() => setPreview(report));
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
    <PageTransition>
      <Reveal>
        <div className="space-y-12">
          <div className="space-y-4">
            {backLink}
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Sesuaikan CV untuk {c.program.name}</h1>
            <p className="text-muted-foreground">
              Skor sekarang <span className="font-medium text-foreground">{c.before}</span>. Jika semua saran kalimat dipakai, skor bisa menjadi{" "}
              <span className="font-medium text-foreground">{c.best}</span>{c.best > c.before ? ` (naik ${c.best - c.before} poin)` : " (tidak berubah)"}.
              {" "}Program ini menilai {c.program.values.join(", ") || "kriteria umum"}. <SourceLink href={c.program.url}>Buka sumber</SourceLink>
            </p>
          </div>

          <section aria-labelledby="cv-edits" className="space-y-6">
            <div className="space-y-1">
              <h2 id="cv-edits" className="text-lg font-semibold">Yang bisa diperbaiki lewat CV</h2>
              <p className="text-sm text-muted-foreground">Opsi di bawah tidak menambah fakta. Opsi hanya menyebut kategori atau tingkat yang dinilai program agar terbaca jelas. Kalimatnya boleh kamu ubah, misalnya dengan angka nyata.</p>
            </div>
            {c.cv_note && <Done>{c.cv_note}</Done>}
            {c.cv_edits.map((e) => (
              <EditBlock key={e.index} edit={e} choice={choices[e.index]} onChange={(next) => setChoice(e.index, next)} />
            ))}
            {c.profile_edits.map((e, k) => (
              <Label key={k} className="items-start gap-3 rounded-lg border p-4 font-normal">
                <Checkbox
                  className="mt-0.5"
                  checked={profileEdits.has(k)}
                  onCheckedChange={(checked) => setProfileEdits((prev) => {
                    const next = new Set(prev);
                    if (checked) next.add(k);
                    else next.delete(k);
                    return next;
                  })}
                />
                <span className="space-y-1">
                  <span className="block">{e.label}: <span className="font-medium">+{e.delta} poin, skor menjadi {e.after}</span></span>
                  <span className="block text-muted-foreground">{e.condition}</span>
                </span>
              </Label>
            ))}
            <div className="space-y-4 border-t pt-6">
              <Label className="items-start gap-3 font-normal">
                <Checkbox className="mt-0.5" checked={truth} onCheckedChange={setTruth} />
                Saya pastikan semua kalimat yang dipilih sesuai fakta dan bisa dibuktikan.
              </Label>
              <div className="flex flex-wrap gap-2">
                <Button onClick={runPreview}>Hitung ulang skor</Button>
                <Button variant="outline" disabled={!truth} onClick={apply}>Simpan ke profil</Button>
                <Button variant="ghost" onClick={copy}>Salin teks prestasi</Button>
              </div>
              {!truth && <p className="text-sm text-muted-foreground">Centang pernyataan di atas untuk menyimpan ke profil.</p>}
            </div>
            <div id="previewOut" aria-live="polite">
              {preview && <Reveal key={`${preview.before}-${preview.after}`}><Compare report={preview} /></Reveal>}
              {previewError && <Alert variant="destructive"><AlertDescription>{previewError}</AlertDescription></Alert>}
            </div>
          </section>

          <section aria-labelledby="hard-gaps" className="space-y-6 border-t pt-10">
            <h2 id="hard-gaps" className="text-lg font-semibold">Yang tidak bisa diatasi dengan edit CV</h2>
            {c.hard_gaps.length ? c.hard_gaps.map((g) => (
              <div key={g.title} className="space-y-2">
                <h3 className="font-medium">{g.title}</h3>
                {g.potential > 0 && <p className="text-sm">Jika terpenuhi, skor bisa naik {g.potential} poin.</p>}
                <p className="text-sm text-muted-foreground">{g.why}</p>
                {g.quote && <Quote quote={g.quote} cite={`Teks sumber, ${hostOf(c.program.url)}`} />}
                {g.actions.length > 0 && <LinkList links={g.actions} />}
              </div>
            )) : <Done>Semua syarat angka yang tertulis sudah terpenuhi.</Done>}
          </section>

          <section aria-labelledby="growth" className="space-y-6 border-t pt-10">
            <h2 id="growth" className="text-lg font-semibold">Rencana pengembangan</h2>
            {c.growth.length ? c.growth.map((g) => (
              <div key={g.area} className="space-y-2">
                <h3 className="font-medium first-letter:uppercase">{g.area}</h3>
                <p className="text-sm text-muted-foreground">{g.why}</p>
                {g.quote && <Quote quote={g.quote} cite={`Teks sumber, ${hostOf(c.program.url)}`} />}
                <LinkList links={g.links} />
              </div>
            )) : <Done>Profilmu sudah kuat untuk kriteria program ini. Fokus ke esai dan wawancara.</Done>}
          </section>

          <p className="border-t pt-6 text-sm text-muted-foreground">
            Saran ini berdasar syarat dan kriteria tertulis program, beserta kutipannya bila ada, dan memakai aturan skor yang sama dengan halaman hasil. Saran ini bukan jaminan lolos, dan bobotnya belum divalidasi ahli.
          </p>
        </div>
      </Reveal>
    </PageTransition>
  );
}

function Done({ children }: { children: React.ReactNode }) {
  return <p className="flex gap-2 text-sm"><CheckIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-success" />{children}</p>;
}

function EditBlock({ edit: e, choice, onChange }: { edit: CvEdit; choice?: Choice; onChange: (next: Partial<Choice>) => void }) {
  const pick = choice?.pick ?? "";
  return (
    <fieldset className="space-y-3 rounded-lg border p-4">
      <legend className="sr-only">Pilihan kalimat untuk: {e.original}</legend>
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">Kalimat sekarang, tingkat {e.level.toLowerCase()}, kategori {e.tags.join(", ") || "belum terbaca"}</p>
        <p className="font-medium">{e.original}</p>
      </div>
      <RadioGroup value={pick} onValueChange={(value) => onChange({ pick: String(value) })} className="gap-3">
        <Label className="font-normal"><RadioGroupItem value="" /> Biarkan apa adanya</Label>
        {e.options.map((o, k) => (
          <div key={k} className={cn("space-y-2 rounded-md p-3", pick === String(k) ? "bg-muted" : "bg-transparent")}>
            <Label className="font-normal">
              <RadioGroupItem value={String(k)} />
              <span className="font-medium">+{o.delta} poin → {o.after}</span>
            </Label>
            <Input
              aria-label={`Kalimat opsi ${k + 1}`}
              value={choice?.texts[String(k)] ?? o.text}
              onChange={(ev) => onChange({ texts: { ...choice?.texts, [String(k)]: ev.target.value } })}
            />
            <p className="text-sm text-muted-foreground">{o.why} {o.condition}</p>
          </div>
        ))}
      </RadioGroup>
    </fieldset>
  );
}

function LinkList({ links }: { links: GrowthLink[] }) {
  return (
    <ul className="space-y-2 text-sm">
      {links.map((l) => (
        <li key={l.title}>
          {l.url ? <SourceLink href={l.url}>{l.title}</SourceLink> : <span className="font-medium">{l.title}</span>}
          <span className="text-muted-foreground"> · {l.note}</span>
        </li>
      ))}
    </ul>
  );
}

const delta = (d: number) => (d > 0 ? `+${d}` : String(d));

function Compare({ report: p }: { report: PreviewReport }) {
  return (
    <div className="space-y-4 border-t pt-6">
      <p className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
        <span><span className="text-sm text-muted-foreground">Sebelum </span><span className="text-2xl font-semibold tabular-nums">{p.before}</span></span>
        <span><span className="text-sm text-muted-foreground">Sesudah </span><span className="text-2xl font-semibold tabular-nums">{p.after}</span></span>
        <span className="font-medium">{delta(p.after - p.before)} poin</span>
      </p>
      <Table>
        <TableHeader>
          <TableRow><TableHead>Komponen</TableHead><TableHead>Sebelum</TableHead><TableHead>Sesudah</TableHead><TableHead>Selisih</TableHead><TableHead>Alasan perubahan</TableHead></TableRow>
        </TableHeader>
        <TableBody>
          {p.rows.map((r) => {
            const changed = r.after !== r.before;
            return (
              <TableRow key={r.key}>
                <TableCell className={cn(changed && "font-medium")}>{r.label}</TableCell>
                <TableCell className="tabular-nums">{r.before}{r.max ? `/${r.max}` : ""}</TableCell>
                <TableCell className="tabular-nums">{r.after}{r.max ? `/${r.max}` : ""}</TableCell>
                <TableCell className={cn("tabular-nums", !changed && "text-muted-foreground")}>{delta(r.after - r.before)}</TableCell>
                <TableCell className="min-w-56 whitespace-normal text-muted-foreground">{changed ? r.detail : "Tidak berubah"}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
