"use client";

import { CheckIcon, CircleAlertIcon } from "lucide-react";
import Link from "next/link";
import { ListItem } from "@/components/transitions";
import type { HistoryRow } from "@beasiswa/shared";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { STATUS, fmtTime } from "@/lib/format";
import { NAV } from "@/lib/nav";

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
          <ListItem key={s.id}>
            <TableRow>
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
                  <Link className="inline-flex items-center rounded-md px-2 py-1 underline pointer-coarse:min-h-11 underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50" href={`/hasil/${encodeURIComponent(s.id)}`} transitionTypes={NAV.forward}>
                    Lihat
                  </Link>
                  {onDelete && s.status !== "running" && s.status !== "queued" && <DeleteSearch notes={s.notes} onConfirm={() => onDelete(s.id)} />}
                </div>
              </TableCell>
            </TableRow>
          </ListItem>
        ))}
      </TableBody>
    </Table>
  );
}

// Deleting cannot be undone, so it asks first.
function DeleteSearch({ notes, onConfirm }: { notes: string | null; onConfirm: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="ghost" />}>Hapus</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus pencarian ini?</AlertDialogTitle>
          <AlertDialogDescription>
            Pencarian {notes ? `“${notes}”` : "tanpa catatan"} dan hasilnya hilang dari riwayat dan tidak bisa dikembalikan. Beasiswa yang sudah kamu simpan tetap ada. Kuota hari ini tidak bertambah.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>Hapus</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
