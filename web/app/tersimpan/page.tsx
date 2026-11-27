"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { ApiResult, SavedResponse } from "@beasiswa/shared";
import { ResultCard, programKey } from "@/components/result-card";
import { LoadError, Loading, PageHeading } from "@/components/states";
import { animate, ListItem, PageTransition, Reveal } from "@/components/transitions";
import { useBookmarks } from "@/components/use-bookmarks";
import { buttonVariants } from "@/components/ui/button";
import { api, errorText } from "@/lib/api";
import { DISCLAIMER } from "@/lib/format";
import { NAV } from "@/lib/nav";

export default function SavedPage() {
  const [saved, setSaved] = useState<ApiResult[] | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    // In a transition, so an unsaved card fades out and the cards below move up.
    api<SavedResponse>("/saved").then(({ saved }) => animate(() => setSaved(saved)), (err) => setError(errorText(err)));
  }, []);
  useEffect(load, [load]);

  return (
    <PageTransition>
      <div>
        <PageHeading title="Beasiswa Tersimpan">Beasiswa yang kamu tandai untuk dipersiapkan. {saved?.length ? DISCLAIMER : ""}</PageHeading>
        {error ? <LoadError title="Daftar tersimpan tidak bisa dimuat" message={error} />
          : !saved ? <Loading>Memuat beasiswa tersimpan…</Loading>
            : (
              <Reveal>
                {saved.length ? <SavedList saved={saved} onChange={load} /> : (
                  <div className="space-y-4">
                    <p>Belum ada beasiswa tersimpan. Tekan Simpan di kartu hasil pencarian untuk menandainya.</p>
                    <Link className={buttonVariants()} href="/cari" transitionTypes={NAV.lateral}>Cari beasiswa</Link>
                  </div>
                )}
              </Reveal>
            )}
      </div>
    </PageTransition>
  );
}

function SavedList({ saved, onChange }: { saved: ApiResult[]; onChange: () => void }) {
  const bookmarks = useBookmarks(saved.map(programKey), onChange);
  return (
    <div className="space-y-4">
      {saved.map((r) => (
        <ListItem key={r.id}>
          <ResultCard result={r} saved={bookmarks.isSaved(r)} busy={bookmarks.isBusy(r)} fromBookmarks onToggleSave={bookmarks.toggle} />
        </ListItem>
      ))}
    </div>
  );
}
