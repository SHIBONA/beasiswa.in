"use client";

import { CheckIcon, CircleAlertIcon, UploadIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import type { CvParseResponse, Profile, ProfileResponse } from "@beasiswa/shared";
import { LoadError, Loading, PageHeading } from "@/components/states";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { Trace, TraceIcon, TraceLine, TraceTitle } from "@/components/ui/trace";
import { ApiError, api, errorText, sendJson } from "@/lib/api";
import { MAX_CV_BYTES, pdfText } from "@/lib/pdf";

// Form values stay strings while typing; numbers are parsed on save.
type Form = Omit<Profile, "ipk" | "semester" | "skor_bahasa"> & { ipk: string; semester: string; skor_bahasa: string };
type Field = Exclude<keyof Form, "butuh_pendanaan">;

const EMPTY: Form = {
  jenjang_saat_ini: "S1", jenjang_tujuan: "S2", prodi: "", ipk: "", semester: "", skor_bahasa: "",
  negara_tujuan: "", bidang_minat: "", prestasi: "", butuh_pendanaan: true,
};
const toForm = (p: Profile): Form => ({ ...p, ipk: String(p.ipk), semester: String(p.semester), skor_bahasa: String(p.skor_bahasa) });
const FIELD_LABELS: Record<string, string> = {
  jenjang_saat_ini: "jenjang", prodi: "prodi", ipk: "IPK", semester: "semester", skor_bahasa: "skor bahasa", bidang_minat: "bidang minat", prestasi: "prestasi",
};

type CvStatus = { kind: "steps"; done: string[]; now: string } | { kind: "ok" | "error"; text: string } | null;

export default function ProfilePage() {
  const router = useRouter();
  const [form, setForm] = useState<Form | null>(null);
  const [filled, setFilled] = useState<Set<string>>(new Set());
  const [cv, setCv] = useState<CvStatus>(null);
  const [reading, setReading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api<ProfileResponse>("/profile").then(({ profile }) => setForm(profile ? toForm(profile) : EMPTY), (err) => setLoadError(errorText(err)));
  }, []);

  if (!form) return loadError ? <LoadError title="Profil tidak bisa dimuat" message={loadError} /> : <Loading>Memuat profil…</Loading>;

  const set = (name: Field) => (value: string) => setForm({ ...form, [name]: value });

  async function uploadCv(file: File) {
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) return setCv({ kind: "error", text: "File harus PDF." });
    if (file.size > MAX_CV_BYTES) return setCv({ kind: "error", text: "CV maksimal 5 MB." });
    setReading(true);
    setCv({ kind: "steps", done: [], now: `Membaca ${file.name}…` });
    try {
      const text = await pdfText(file);
      setCv({ kind: "steps", done: [`Teks CV terbaca (${text.length} karakter)`], now: "Mengambil data akademik…" });
      const { fields } = await api<CvParseResponse>("/cv/parse", sendJson("POST", { text }));
      const entries = Object.entries(fields).filter(([k]) => k in FIELD_LABELS);
      setForm((current) => current && { ...current, ...Object.fromEntries(entries.map(([k, v]) => [k, String(v)])) });
      setFilled(new Set(entries.map(([k]) => k)));
      const names = entries.map(([k]) => FIELD_LABELS[k]);
      setCv(names.length
        ? { kind: "ok", text: `${names.length} kolom terisi dari CV: ${names.join(", ")}. Periksa kolom bertanda "dari CV", lalu simpan. Negara dan jenjang tujuan tetap kamu pilih sendiri.` }
        : { kind: "error", text: "Tidak ada data akademik yang terbaca dari CV ini. Isi kolom di bawah secara manual." });
    } catch (err) {
      setCv({ kind: "error", text: errorText(err) });
    } finally {
      setReading(false);
    }
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    const body: Profile = {
      ...form,
      prodi: form.prodi.trim(), negara_tujuan: form.negara_tujuan.trim(), bidang_minat: form.bidang_minat.trim(), prestasi: form.prestasi.trim(),
      ipk: Number(form.ipk), semester: Number(form.semester), skor_bahasa: Number(form.skor_bahasa),
    };
    setSaving(true);
    setError("");
    try {
      await api<ProfileResponse>("/profile", sendJson("PUT", body));
      toast("Profil beasiswa tersimpan");
      router.push("/cari");
    } catch (err) {
      const fields = err instanceof ApiError ? err.body.fields : undefined;
      setError(`${errorText(err)}${fields ? ": " + fields.join(", ") : ""}`);
      setSaving(false);
    }
  }

  return (
    <div className="space-y-12">
      <PageHeading title="Profil Beasiswa">
        Profil disimpan di komputer ini. Pencarian web hanya memakai jenjang tujuan, negara, dan bidang umum. IPK dan prestasi dipakai untuk menghitung skor di sini saja.
      </PageHeading>

      <section aria-labelledby="cv-title" className="space-y-4 border-b pb-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-md space-y-1">
            <h2 id="cv-title" className="font-semibold">Isi otomatis dari CV</h2>
            <p className="text-sm text-muted-foreground">PDF berisi teks, maksimal 5 MB dan 15 halaman. File dibaca di browser ini dan tidak dikirim ke penyedia AI.</p>
          </div>
          <Button type="button" variant="outline" disabled={reading} onClick={() => fileInput.current?.click()}>
            {reading ? <Spinner aria-hidden="true" /> : <UploadIcon aria-hidden="true" />}
            Upload CV (PDF)
          </Button>
          <input
            ref={fileInput} id="cvfile" type="file" accept="application/pdf,.pdf" hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) uploadCv(file);
            }}
          />
        </div>
        <div id="cvstatus" aria-live="polite">
          {cv?.kind === "steps" && (
            <Trace>
              {cv.done.map((s) => (
                <TraceLine key={s}><TraceIcon><CheckIcon /></TraceIcon><TraceTitle>{s}</TraceTitle></TraceLine>
              ))}
              <TraceLine status="running"><TraceIcon><Spinner aria-hidden="true" /></TraceIcon><TraceTitle>{cv.now}</TraceTitle></TraceLine>
            </Trace>
          )}
          {cv?.kind === "ok" && <p className="flex gap-2 text-sm"><CheckIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-success" />{cv.text}</p>}
          {cv?.kind === "error" && <p className="flex gap-2 text-sm text-destructive"><CircleAlertIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />{cv.text}</p>}
        </div>
      </section>

      <form onSubmit={save} className="space-y-8">
        <fieldset className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
          <legend className="sr-only">Data akademik</legend>
          <div className="space-y-2">
            <FieldLabel htmlFor="f1" fromCv={filled.has("jenjang_saat_ini")}>Jenjang saat ini</FieldLabel>
            <NativeSelect id="f1" name="jenjang_saat_ini" aria-describedby={cvNote("f1", filled.has("jenjang_saat_ini"))} className="w-full" value={form.jenjang_saat_ini} onChange={(e) => set("jenjang_saat_ini")(e.target.value)}>
              {["SMA", "D3", "S1", "S2"].map((v) => <NativeSelectOption key={v}>{v}</NativeSelectOption>)}
            </NativeSelect>
          </div>
          <div className="space-y-2">
            <FieldLabel htmlFor="f2">Jenjang tujuan</FieldLabel>
            <NativeSelect id="f2" name="jenjang_tujuan" className="w-full" value={form.jenjang_tujuan} onChange={(e) => set("jenjang_tujuan")(e.target.value)}>
              {["Exchange", "S1", "S2", "S3"].map((v) => <NativeSelectOption key={v}>{v}</NativeSelectOption>)}
            </NativeSelect>
          </div>
          <TextField id="f3" name="prodi" label="Program studi" fromCv={filled.has("prodi")} required maxLength={100} placeholder="Teknik Elektro" value={form.prodi} onChange={set("prodi")} className="sm:col-span-2" />
          <TextField id="f4" name="ipk" label="IPK" hint="skala 0 sampai 4" fromCv={filled.has("ipk")} type="number" inputMode="decimal" step="0.01" min="0" max="4" required value={form.ipk} onChange={set("ipk")} />
          <TextField id="f5" name="semester" label="Semester" fromCv={filled.has("semester")} type="number" inputMode="numeric" min="1" max="14" required value={form.semester} onChange={set("semester")} />
          <TextField id="f6" name="skor_bahasa" label="Skor bahasa" hint="IELTS atau setara, 0 jika belum" fromCv={filled.has("skor_bahasa")} type="number" inputMode="decimal" step="0.5" min="0" max="9" required value={form.skor_bahasa} onChange={set("skor_bahasa")} />
          <TextField id="f7" name="negara_tujuan" label="Negara tujuan" hint="pisahkan dengan koma" maxLength={200} placeholder="Jepang, Australia" value={form.negara_tujuan} onChange={set("negara_tujuan")} />
          <TextField id="f8" name="bidang_minat" label="Bidang minat" fromCv={filled.has("bidang_minat")} maxLength={200} placeholder="Teknik, AI, energi" value={form.bidang_minat} onChange={set("bidang_minat")} className="sm:col-span-2" />
          <div className="space-y-2 sm:col-span-2">
            <FieldLabel htmlFor="f9" hint="pisahkan dengan titik koma" fromCv={filled.has("prestasi")}>Prestasi</FieldLabel>
            <Textarea id="f9" name="prestasi" aria-describedby={cvNote("f9", filled.has("prestasi"))} rows={4} maxLength={500} placeholder="Juara 2 lomba nasional; ketua himpunan" value={form.prestasi} onChange={(e) => set("prestasi")(e.target.value)} />
          </div>
        </fieldset>
        <Label className="font-normal">
          <Checkbox checked={form.butuh_pendanaan} onCheckedChange={(checked) => setForm({ ...form, butuh_pendanaan: checked })} /> Saya butuh pendanaan penuh
        </Label>
        {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
        <Button type="submit" size="lg" disabled={saving}>{saving && <Spinner aria-hidden="true" />}Simpan profil</Button>
      </form>
    </div>
  );
}

// "dari CV" describes the field instead of renaming it, so the field keeps its name for screen readers.
const cvNote = (id: string, fromCv?: boolean) => (fromCv ? `${id}-cv` : undefined);

function FieldLabel({ htmlFor, hint, fromCv, children }: { htmlFor: string; hint?: string; fromCv?: boolean; children: string }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-2">
      <Label htmlFor={htmlFor}>
        {children}
        {hint && <span className="font-normal text-muted-foreground">({hint})</span>}
      </Label>
      {fromCv && <span id={cvNote(htmlFor, fromCv)} className="text-sm text-success">dari CV</span>}
    </div>
  );
}

type TextFieldProps = Omit<React.ComponentProps<typeof Input>, "onChange"> & {
  id: string; label: string; hint?: string; fromCv?: boolean; onChange: (value: string) => void;
};

function TextField({ id, label, hint, fromCv, onChange, className, ...props }: TextFieldProps) {
  return (
    <div className={`space-y-2 ${className ?? ""}`}>
      <FieldLabel htmlFor={id} hint={hint} fromCv={fromCv}>{label}</FieldLabel>
      <Input id={id} aria-describedby={cvNote(id, fromCv)} onChange={(e) => onChange(e.target.value)} {...props} />
    </div>
  );
}
