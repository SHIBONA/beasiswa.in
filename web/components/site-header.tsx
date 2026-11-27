"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { MetaResponse } from "@beasiswa/shared";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/cari", label: "Cari" },
  { href: "/profil", label: "Profil" },
  { href: "/riwayat", label: "Riwayat" },
  { href: "/tersimpan", label: "Tersimpan" },
];
const MODES: Record<string, string> = {
  firecrawl: "Live, lewat Firecrawl",
  live: "Live, lewat Claude",
  demo: "Demo, data contoh",
};

export function SiteHeader() {
  const pathname = usePathname();
  const fromBookmarks = useSearchParams().get("dari") === "tersimpan";
  const [mode, setMode] = useState("");
  useEffect(() => {
    api<MetaResponse>("/meta").then((meta) => setMode(MODES[meta.mode] ?? MODES.demo), () => setMode("Server API tidak terhubung"));
  }, []);
  // Result and coach pages belong to the tab the member came from.
  const section = pathname.startsWith("/hasil") || pathname.startsWith("/sesuaikan") ? (fromBookmarks ? "/tersimpan" : "/cari") : pathname;

  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-x-6 gap-y-2 px-4 pt-4 sm:px-6 sm:py-4">
        <Link href="/cari" className="rounded-md text-base font-semibold tracking-tight outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
          beasiswa.in
        </Link>
        {mode && <span className="text-sm text-muted-foreground">{mode}</span>}
        {/* On phones the four destinations become equal tabs on their own row. */}
        <nav aria-label="Menu utama" className="grid w-full grid-cols-4 sm:ml-auto sm:flex sm:w-auto sm:gap-1">
          {NAV.map(({ href, label }) => {
            const active = section === href;
            return (
              <Link
                key={href}
                href={href}
                data-slot="nav-link"
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center justify-center border-b-2 border-transparent px-3 py-3 text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 sm:rounded-md sm:border-b-0 sm:py-1.5",
                  active && "border-foreground font-medium text-foreground sm:bg-muted",
                )}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
