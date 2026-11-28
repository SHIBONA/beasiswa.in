"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useDeferredValue, useEffect, useState } from "react";
import {
  ALL_OPPORTUNITIES as ALL, AREA_LABELS, developmentPlan,
  type Opportunity, type OpportunityArea, type ProfileResponse,
} from "@beasiswa/shared";
import { SourceLink } from "@/components/source-link";
import { LoadError, Loading, PageHeading } from "@/components/states";
import { ListItem, PageTransition, Reveal, animate } from "@/components/transitions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { api, errorText } from "@/lib/api";
import { NAV } from "@/lib/nav";

export type Filters = { area: string; free: boolean; q: string };

const AREAS = Object.entries(AREA_LABELS) as [OpportunityArea, string][];
const COST_LABELS = { gratis: "Gratis", "gratis sebagian": "Gratis sebagian", berbayar: "Berbayar" };

const toQuery = ({ area, free, q }: Filters) => {
  const params = new URLSearchParams();
  if (area) params.set("area", area);
  if (free) params.set("gratis", "1");
  if (q.trim()) params.set("q", q.trim());
  const query = params.toString();
  return query ? `?${query}` : "";
};

export function DevelopmentView({ initial }: { initial: Filters }) {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileResponse["profile"] | undefined>(undefined);
  const [loadError, setLoadError] = useState("");
  const [filters, setFilters] = useState(initial);
  // Typing stays responsive; the list follows a moment later.
  const query = useDeferredValue(filters.q);

  useEffect(() => {
    api<ProfileResponse>("/profile").then(({ profile }) => animate(() => setProfile(profile)), (err) => setLoadError(errorText(err)));
  }, []);

  function update(next: Partial<Filters>) {
    const merged = { ...filters, ...next };
    const syncUrl = () => router.replace(`/development${toQuery(merged)}`, { scroll: false });
    if ("q" in next) {
      // The search box updates at once; the list follows through the deferred query.
      setFilters(merged);
      startTransition(syncUrl);
    } else {
      // In a transition, so items leaving and entering the filtered list animate.
      startTransition(() => {
        setFilters(merged);
        syncUrl();
      });
    }
  }

  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const shown = ALL.filter((o) =>
    (!filters.area || o.area === filters.area) &&
    (!filters.free || o.cost === "gratis") &&
    words.every((w) => `${o.title} ${o.note} ${o.kind}`.toLowerCase().includes(w)));

  return (
    <PageTransition>
      <div className="space-y-16">
        <PageHeading title="Persiapan sebelum mendaftar">
          Belum punya pengalaman atau sertifikat? Mulai dari sini. Kursus, tes bahasa, lomba, organisasi, relawan, dan magang di bawah ini bisa menjadi bukti di CV beasiswamu.
        </PageHeading>

        <section aria-labelledby="untukmu" className="space-y-6">
          <h2 id="untukmu" className="text-lg">Disarankan untuk profilmu</h2>
          {profile === undefined
            ? (loadError ? <LoadError title="Profil tidak bisa dimuat" message={loadError} /> : <Loading>Membaca profilmu…</Loading>)
            : (
              <Reveal>
                <div className="space-y-10">
                  {!profile ? (
                    <div className="space-y-4">
                      <p>Isi profil dulu supaya saran di sini mengikuti bidang, skor bahasa, dan prestasimu.</p>
                      <Link className={buttonVariants()} href="/profil" transitionTypes={NAV.lateral}>Isi profil</Link>
                    </div>
                  ) : <Plan steps={developmentPlan(profile)} />}
                </div>
              </Reveal>
            )}
        </section>

        <section aria-labelledby="semua" className="space-y-6 border-t pt-10">
          <div className="space-y-1">
            <h2 id="semua" className="text-lg">Semua peluang</h2>
            <p className="text-sm text-muted-foreground">Saring berdasarkan area yang ingin kamu perkuat.</p>
          </div>
          <div className="space-y-4">
            <ToggleGroup
              aria-label="Area"
              value={[filters.area || "semua"]}
              onValueChange={(value) => update({ area: value[0] && value[0] !== "semua" ? String(value[0]) : "" })}
              variant="outline"
              className="flex-wrap"
            >
              <ToggleGroupItem value="semua">Semua</ToggleGroupItem>
              {AREAS.map(([area, label]) => <ToggleGroupItem key={area} value={area}>{label}</ToggleGroupItem>)}
            </ToggleGroup>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-2">
                <Label htmlFor="cari-peluang">Cari</Label>
                <Input
                  id="cari-peluang" type="search" name="q" autoComplete="off" spellCheck={false}
                  placeholder="Contoh: sertifikat, Jepang, data…" value={filters.q} onChange={(e) => update({ q: e.target.value })}
                />
              </div>
              <Label className="font-normal sm:pb-2">
                <Checkbox checked={filters.free} onCheckedChange={(free) => update({ free })} /> Hanya yang gratis
              </Label>
            </div>
          </div>
          <p id="jumlah-peluang" role="status" className="text-sm text-muted-foreground">{shown.length} dari {ALL.length} peluang</p>
          {shown.length ? (
            <ul className="divide-y border-y">
              {shown.map((o) => <ListItem key={`${o.title}|${o.url}`}><li><OpportunityRow o={o} /></li></ListItem>)}
            </ul>
          ) : (
            <div className="space-y-3">
              <p>Tidak ada peluang yang cocok dengan filter ini.</p>
              <Button variant="outline" onClick={() => update({ area: "", free: false, q: "" })}>Hapus semua filter</Button>
            </div>
          )}
        </section>
      </div>
    </PageTransition>
  );
}

function Plan({ steps }: { steps: ReturnType<typeof developmentPlan> }) {
  if (!steps.length) {
    return <p>Profilmu sudah punya prestasi, skor bahasa, dan arah bidang. Telusuri daftar di bawah untuk memperkuat area yang dinilai beasiswa incaranmu.</p>;
  }
  return steps.map((step, i) => (
    <div key={step.area} className="space-y-3">
      <h3 className="text-base"><span className="font-mono text-sm text-muted-foreground">{String(i + 1).padStart(2, "0")}</span> {step.area}</h3>
      <p className="text-sm text-muted-foreground">{step.why}</p>
      <ul className="divide-y border-y">{step.items.map((o) => <li key={`${o.title}|${o.url}`}><OpportunityRow o={o} /></li>)}</ul>
    </div>
  ));
}

function OpportunityRow({ o }: { o: Opportunity }) {
  return (
    <div className="space-y-1 py-3">
      <p className="font-medium">{o.url ? <SourceLink href={o.url}>{o.title}</SourceLink> : o.title}</p>
      <p className="text-sm text-muted-foreground">{o.note}</p>
      <p className="text-xs text-muted-foreground">
        {AREA_LABELS[o.area]} · {o.kind} · {COST_LABELS[o.cost]}{o.url ? "" : " · tanpa tautan, cek lewat kampus"}
      </p>
    </div>
  );
}
