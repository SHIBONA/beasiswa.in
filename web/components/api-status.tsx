"use client";

import { useEffect, useState } from "react";
import type { MetaResponse } from "@beasiswa/shared";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

type State = { label: string; tone: "live" | "demo" | "down" | "checking" };

const MODES: Record<string, State> = {
  firecrawl: { label: "Live · pencarian web lewat Firecrawl", tone: "live" },
  live: { label: "Live · pencarian web lewat Claude", tone: "live" },
  demo: { label: "Demo · data contoh offline", tone: "demo" },
};
const DOT = { live: "bg-success", demo: "bg-warning", down: "bg-destructive", checking: "bg-muted-foreground" };

// Which search mode the API server runs in, like an infrastructure status line. The dot repeats what the text says.
export function ApiStatus() {
  const [state, setState] = useState<State>({ label: "Memeriksa server…", tone: "checking" });
  useEffect(() => {
    api<MetaResponse>("/meta").then(
      (meta) => setState(MODES[meta.mode] ?? MODES.demo),
      () => setState({ label: "Server API tidak terhubung", tone: "down" }),
    );
  }, []);
  return (
    <Badge variant="outline" className="h-auto gap-2 rounded-full px-3 py-1 text-xs font-normal">
      <span aria-hidden="true" className={cn("size-2 shrink-0 rounded-full", DOT[state.tone])} />
      {state.label}
    </Badge>
  );
}
