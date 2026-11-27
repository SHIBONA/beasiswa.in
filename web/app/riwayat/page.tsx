"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { HistoryResponse, HistoryRow } from "@beasiswa/shared";
import { HistoryTable } from "@/components/history-table";
import { LoadError, Loading, PageHeading } from "@/components/states";
import { animate, PageTransition, Reveal } from "@/components/transitions";
import { buttonVariants } from "@/components/ui/button";
import { api, errorText } from "@/lib/api";
import { NAV } from "@/lib/nav";

export default function HistoryPage() {
  const [searches, setSearches] = useState<HistoryRow[] | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    // In a transition, so a deleted row fades out and the rows below move up.
    api<HistoryResponse>("/searches").then(({ searches }) => animate(() => setSearches(searches)), (err) => setError(errorText(err)));
  }, []);
  useEffect(load, [load]);

  async function remove(id: string) {
    try {
      await api(`/searches/${encodeURIComponent(id)}`, { method: "DELETE" });
      toast("Riwayat dihapus");
    } catch (err) {
      toast(errorText(err));
    }
    load();
  }

  return (
    <PageTransition>
      <div>
        <PageHeading title="Riwayat Pencarian">Urut dari yang terbaru. Hapus riwayat yang tidak ingin kamu simpan.</PageHeading>
        {error ? <LoadError title="Riwayat tidak bisa dimuat" message={error} />
          : !searches ? <Loading>Memuat riwayat…</Loading>
            : (
              <Reveal>
                {searches.length ? <HistoryTable searches={searches} onDelete={remove} /> : (
                  <div className="space-y-4">
                    <p>Belum ada pencarian. Pencarian yang kamu jalankan akan tercatat di sini.</p>
                    <Link className={buttonVariants()} href="/cari" transitionTypes={NAV.lateral}>Mulai mencari</Link>
                  </div>
                )}
              </Reveal>
            )}
      </div>
    </PageTransition>
  );
}
