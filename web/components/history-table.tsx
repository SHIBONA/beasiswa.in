"use client";

import { CheckIcon, CircleAlertIcon } from "lucide-react";
import Link from "next/link";
import type { HistoryRow } from "@beasiswa/shared";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { STATUS, fmtTime } from "@/lib/format";

// Status is always written out; the icon only repeats it.
export function SearchStatus({ status }: { status: string }) {
  const icon = status === "succeeded" ? <CheckIcon aria-hidden="true" className="size-4 text-success" />
    : status === "failed" ? <CircleAlertIcon aria-hidden="true" className="size-4 text-destructive" />
      : <Spinner aria-hidden="true" />;
  return <span className="inline-flex items-center gap-1.5 text-sm">{icon}{STATUS[status] ?? status}</span>;
}

export function HistoryTable({ searches, onDelete }: { searches: HistoryRow[]; onDelete?: (id: string) => void }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Waktu</TableHead>
          <TableHead>Catatan</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Hasil</TableHead>
          <TableHead><span className="sr-only">Aksi</span></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {searches.map((s) => (
          <TableRow key={s.id}>
            <TableCell className="text-muted-foreground">{fmtTime(s.created_at)}</TableCell>
            <TableCell className="min-w-40 whitespace-normal">{s.notes || "Tanpa catatan"}</TableCell>
            <TableCell><SearchStatus status={s.status} /></TableCell>
            <TableCell className="min-w-48 whitespace-normal">
              {s.status === "succeeded" ? (
                s.count ? <>{s.count} beasiswa<span className="block text-muted-foreground">Teratas: {s.top}</span></> : "Tidak ada beasiswa berbukti"
              ) : s.status === "failed" ? s.error : "Masih berjalan"}
            </TableCell>
            <TableCell>
              <div className="flex items-center justify-end gap-2">
                <Link className="rounded-md px-2 py-1 underline underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50" href={`/hasil/${encodeURIComponent(s.id)}`}>
                  Lihat
                </Link>
                {onDelete && s.status !== "running" && s.status !== "queued" && (
                  <Button variant="ghost" onClick={() => onDelete(s.id)}>Hapus</Button>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
