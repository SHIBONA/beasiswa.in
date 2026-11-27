"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import type { CvParseResponse, Profile, ProfileResponse } from "@beasiswa/shared";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { ApiError, api, errorText, sendJson } from "@/lib/api";
import { MAX_CV_BYTES, pdfText } from "@/lib/pdf";
import { cn } from "@/lib/utils";

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
  const [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api<ProfileResponse>("/profile").then(({ profile }) => setForm(profile ? toForm(profile) : EMPTY), (err) => setError(errorText(err)));
  }, []);

  if (!form) return error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null;

  const set = (name: Field) => (value: string) => setForm({ ...form, [name]: value });

  async function uploadCv(file: File) {
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) return setCv({ kind: "error", text: "File harus PDF." });
    if (file.size > MAX_CV_BYTES) return setCv({ kind: "error", text: "CV maksimal 5 MB." });
    setReading(true);
    setCv({ kind: "steps", done: [], now: `Membaca ${file.name}…` });
    try {
      const text = await pdfText(file);
      setCv({ kind: "steps", done: [`Teks CV terbaca (${text.length} karakter)`], now: "Mengekstrak data akademik…" });
      const { fields } = await api<CvParseResponse>("/cv/parse", sendJson("POST", { text }));
      const entries = Object.entries(fields).filter(([k]) => k in FIELD_LABELS);
      setForm((current) => current && { ...current, ...Object.fromEntries(entries.map(([k, v]) => [k, String(v)])) });
      setFilled(new Set(entries.map(([k]) => k)));
      const names = entries.map(([k]) => FIELD_LABELS[k]);
      setCv(names.length
        ? { kind: "ok", text: `✓ ${names.length} kolom terisi dari CV (pembacaan otomatis): ${names.join(", ")}. Kolom berwarna hijau, cek lalu klik Simpan profil. Negara tujuan & jenjang tujuan tetap kamu pilih sendiri.` }
        : { kind: "error", text: "Tidak ada data akademik yang terbaca dari CV. Isi manual di bawah." });
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
    try {
      await api<ProfileResponse>("/profile", sendJson("PUT", body));
      toast("Profil beasiswa tersimpan");
      router.push("/cari");
    } catch (err) {
      const fields = err instanceof ApiError ? err.body.fields : undefined;
      setError(`${errorText(err)}${fields ? ": " + fields.join(", ") : ""}`);
    }
  }

  const fieldClass = (name: string) => cn("w-full", filled.has(name) && "ring-2 ring-emerald-500");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Profil Beasiswa</h1>
        <p className="text-muted-foreground">
          Profil disimpan di perangkat ini. Pencarian web memakai jenjang tujuan, negara yang dikenali, dan kategori bidang umum. Data akademik dan prestasi dipakai untuk menghitung skor secara lokal.
        </p>
      </div>

      <Card className="border-dashed">
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <b>📄 Isi otomatis dari CV</b>
              <p className="text-sm text-muted-foreground">PDF berisi teks, maksimal 5 MB dan 15 halaman. CV diproses di perangkat ini tanpa mengirimkannya ke penyedia AI.</p>
            </div>
            <Button type="button" variant="outline" disabled={reading} onClick={() => fileInput.current?.click()}>Upload CV (PDF)</Button>
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
              <ul className="space-y-1 text-sm">
                {cv.done.map((s) => <li key={s}>✓ {s}</li>)}
                <li className="font-medium">⏳ {cv.now}</li>
              </ul>
            )}
            {cv?.kind === "ok" && <Alert><AlertDescription>{cv.text}</AlertDescription></Alert>}
            {cv?.kind === "error" && <Alert variant="destructive"><AlertDescription>{cv.text}</AlertDescription></Alert>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <form onSubmit={save} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="f1">Jenjang saat ini</Label>
                <NativeSelect id="f1" name="jenjang_saat_ini" className={fieldClass("jenjang_saat_ini")} value={form.jenjang_saat_ini} onChange={(e) => set("jenjang_saat_ini")(e.target.value)}>
                  {["SMA", "D3", "S1", "S2"].map((v) => <NativeSelectOption key={v}>{v}</NativeSelectOption>)}
                </NativeSelect>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="f2">Jenjang tujuan</Label>
                <NativeSelect id="f2" name="jenjang_tujuan" className="w-full" value={form.jenjang_tujuan} onChange={(e) => set("jenjang_tujuan")(e.target.value)}>
                  {["Exchange", "S1", "S2", "S3"].map((v) => <NativeSelectOption key={v}>{v}</NativeSelectOption>)}
                </NativeSelect>
              </div>
              <TextField id="f3" name="prodi" label="Program studi" required maxLength={100} placeholder="Teknik Elektro" value={form.prodi} onChange={set("prodi")} className={fieldClass("prodi")} />
              <TextField id="f4" name="ipk" label="IPK" hint="(0–4)" type="number" step="0.01" min="0" max="4" required value={form.ipk} onChange={set("ipk")} className={fieldClass("ipk")} />
              <TextField id="f5" name="semester" label="Semester" type="number" min="1" max="14" required value={form.semester} onChange={set("semester")} className={fieldClass("semester")} />
              <TextField id="f6" name="skor_bahasa" label="Skor bahasa" hint="(IELTS/setara, 0 jika belum)" type="number" step="0.5" min="0" max="9" required value={form.skor_bahasa} onChange={set("skor_bahasa")} className={fieldClass("skor_bahasa")} />
              <TextField id="f7" name="negara_tujuan" label="Negara tujuan" hint="(pisahkan koma)" maxLength={200} placeholder="Jepang, Australia" value={form.negara_tujuan} onChange={set("negara_tujuan")} />
              <TextField id="f8" name="bidang_minat" label="Bidang minat" maxLength={200} placeholder="Teknik, AI, energi" value={form.bidang_minat} onChange={set("bidang_minat")} className={fieldClass("bidang_minat")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="f9">Prestasi</Label>
              <Textarea id="f9" name="prestasi" rows={2} maxLength={500} placeholder="Juara 2 lomba nasional, ketua himpunan…" value={form.prestasi} onChange={(e) => set("prestasi")(e.target.value)} className={fieldClass("prestasi")} />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Label className="font-medium">
                <Checkbox checked={form.butuh_pendanaan} onCheckedChange={(checked) => setForm({ ...form, butuh_pendanaan: checked })} /> Saya butuh pendanaan penuh
              </Label>
              <Button type="submit">Simpan profil</Button>
            </div>
            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

type TextFieldProps = Omit<React.ComponentProps<typeof Input>, "onChange"> & { label: string; hint?: string; onChange: (value: string) => void };

function TextField({ id, label, hint, onChange, ...props }: TextFieldProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}{hint && <span className="font-normal text-muted-foreground"> {hint}</span>}</Label>
      <Input id={id} onChange={(e) => onChange(e.target.value)} {...props} />
    </div>
  );
}
