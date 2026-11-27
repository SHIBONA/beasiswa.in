"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { MetaResponse } from "@beasiswa/shared";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/cari", label: "Cari Beasiswa" },
  { href: "/profil", label: "Profil Beasiswa" },
  { href: "/riwayat", label: "Riwayat" },
  { href: "/tersimpan", label: "Tersimpan" },
];
const MODES: Record<string, string> = {
  firecrawl: "Agen: LIVE (Firecrawl web)",
  live: "Agen AI: LIVE (Claude + web)",
  demo: "Mode DEMO (data contoh offline)",
};

export function SiteHeader() {
  const pathname = usePathname();
  const fromBookmarks = useSearchParams().get("dari") === "tersimpan";
  const [mode, setMode] = useState("…");
  useEffect(() => {
    api<MetaResponse>("/meta").then((meta) => setMode(MODES[meta.mode] ?? MODES.demo), () => setMode("Server tidak bisa dihubungi"));
  }, []);
  // Result and coach pages belong to the tab the member came from.
  const section = pathname.startsWith("/hasil") || pathname.startsWith("/sesuaikan") ? (fromBookmarks ? "/tersimpan" : "/cari") : pathname;

  return (
    <header className="bg-indigo-950 text-white">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 py-3.5">
        <Link href="/cari" className="flex items-center gap-1 font-bold tracking-wide">
          beasiswa<b className="rounded-md bg-white px-2 text-indigo-950">.in</b>
        </Link>
        <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs">{mode}</span>
        <nav className="flex flex-wrap gap-1 sm:ml-auto" aria-label="Menu utama">
          {NAV.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              aria-current={section === href ? "page" : undefined}
              className={cn("rounded-lg px-3 py-1.5 font-medium text-indigo-100 hover:bg-white/15 hover:text-white", section === href && "bg-white/15 text-white")}
            >
              {label}
            </Link>
          ))}
        </nav>
        <span className="text-sm opacity-85">👤 Member Demo</span>
      </div>
    </header>
  );
}
