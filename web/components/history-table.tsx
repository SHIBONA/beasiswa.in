"use client";

import Link from "next/link";
import type { HistoryRow } from "@beasiswa/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { STATUS, fmtTime } from "@/lib/format";

export const statusTone: Record<string, string> = {
  queued: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  running: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  succeeded: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  failed: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200",
};

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
            <TableCell>{fmtTime(s.created_at)}</TableCell>
            <TableCell className="whitespace-normal">{s.notes || "-"}</TableCell>
            <TableCell><Badge className={statusTone[s.status]}>{STATUS[s.status]}</Badge></TableCell>
            <TableCell className="whitespace-normal">
              {s.status === "succeeded" ? (
                <>{s.count} beasiswa<br /><span className="text-muted-foreground">Teratas: {s.top}</span></>
              ) : s.status === "failed" ? s.error : "…"}
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <Link className="text-primary underline-offset-4 hover:underline" href={`/hasil/${encodeURIComponent(s.id)}`}>Lihat</Link>
                {onDelete && s.status !== "running" && s.status !== "queued" && (
                  <Button variant="outline" size="sm" onClick={() => onDelete(s.id)}>Hapus</Button>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
