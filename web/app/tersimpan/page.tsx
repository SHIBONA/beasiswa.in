"use client";

import { useCallback, useEffect, useState } from "react";
import type { ApiResult, SavedResponse } from "@beasiswa/shared";
import { ResultCard, programKey } from "@/components/result-card";
import { useBookmarks } from "@/components/use-bookmarks";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { api, errorText } from "@/lib/api";
import { DISCLAIMER } from "@/lib/format";

export default function SavedPage() {
  const [saved, setSaved] = useState<ApiResult[] | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    api<SavedResponse>("/saved").then(({ saved }) => setSaved(saved), (err) => setError(errorText(err)));
  }, []);
  useEffect(load, [load]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Beasiswa Tersimpan</h1>
        <p className="text-muted-foreground">Beasiswa yang kamu tandai untuk dipersiapkan.</p>
      </div>
      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      {saved && (saved.length ? <SavedList saved={saved} onChange={load} /> : (
        <Card><CardContent className="py-6 text-center text-muted-foreground">Belum ada beasiswa tersimpan.</CardContent></Card>
      ))}
    </div>
  );
}

function SavedList({ saved, onChange }: { saved: ApiResult[]; onChange: () => void }) {
  const bookmarks = useBookmarks(saved.map(programKey), onChange);
  return (
    <>
      <Alert className="border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
        <AlertDescription className="text-inherit">⚠️ {DISCLAIMER}</AlertDescription>
      </Alert>
      {saved.map((r) => (
        <ResultCard key={r.id} result={r} saved={bookmarks.isSaved(r)} busy={bookmarks.isBusy(r)} fromBookmarks onToggleSave={bookmarks.toggle} />
      ))}
    </>
  );
}
