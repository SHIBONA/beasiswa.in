"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { ApiResult } from "@beasiswa/shared";
import { programKey } from "@/components/result-card";
import { api, errorText } from "@/lib/api";

// Bookmarks are per program: saving one card marks every card of the same program.
export function useBookmarks(initial: Iterable<string>, onChange?: () => void) {
  const [saved, setSaved] = useState(() => new Set(initial));
  const [busy, setBusy] = useState<string | null>(null);

  async function toggle(r: ApiResult) {
    const key = programKey(r);
    const wasSaved = saved.has(key);
    setBusy(key);
    try {
      await api(`/saved/${encodeURIComponent(r.id)}`, { method: wasSaved ? "DELETE" : "PUT" });
    } catch (err) {
      toast(errorText(err));
      return;
    } finally {
      setBusy(null);
    }
    setSaved((prev) => {
      const next = new Set(prev);
      if (wasSaved) next.delete(key);
      else next.add(key);
      return next;
    });
    toast(wasSaved ? "Dihapus dari tersimpan" : "Disimpan ke daftar beasiswa");
    onChange?.();
  }

  return { isSaved: (r: ApiResult) => saved.has(programKey(r)), isBusy: (r: ApiResult) => busy === programKey(r), toggle };
}
