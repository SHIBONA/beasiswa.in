"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { HistoryResponse, HistoryRow } from "@beasiswa/shared";
import { HistoryTable } from "@/components/history-table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
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
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Riwayat Pencarian</h1>
        <p className="text-muted-foreground">Urut terbaru. Kamu bisa menghapus riwayat kapan saja.</p>
      </div>
      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      {searches && (
        <Card>
          <CardContent>
            {searches.length ? <HistoryTable searches={searches} onDelete={remove} /> : <p className="py-6 text-center text-muted-foreground">Belum ada pencarian.</p>}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
