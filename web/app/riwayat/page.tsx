"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { HistoryResponse, HistoryRow } from "@beasiswa/shared";
import { HistoryTable } from "@/components/history-table";
import { LoadError, Loading, PageHeading } from "@/components/states";
import { buttonVariants } from "@/components/ui/button";
import { api, errorText } from "@/lib/api";

export default function HistoryPage() {
  const [searches, setSearches] = useState<HistoryRow[] | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    api<HistoryResponse>("/searches").then(({ searches }) => setSearches(searches), (err) => setError(errorText(err)));
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
    <div>
      <PageHeading title="Riwayat Pencarian">Urut dari yang terbaru. Hapus riwayat yang tidak ingin kamu simpan.</PageHeading>
      {error ? <LoadError title="Riwayat tidak bisa dimuat" message={error} />
        : !searches ? <Loading>Memuat riwayat…</Loading>
          : searches.length ? <HistoryTable searches={searches} onDelete={remove} />
            : (
              <div className="space-y-4">
                <p>Belum ada pencarian. Pencarian yang kamu jalankan akan tercatat di sini.</p>
                <Link className={buttonVariants()} href="/cari">Mulai mencari</Link>
              </div>
            )}
    </div>
  );
}
