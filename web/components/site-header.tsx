"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { startTransition, useOptimistic, ViewTransition } from "react";
import { NAV, SECTIONS } from "@/lib/nav";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const pathname = usePathname();
  const fromBookmarks = useSearchParams().get("dari") === "tersimpan";
  // Result and coach pages belong to the tab the member came from.
  const section = pathname.startsWith("/hasil") || pathname.startsWith("/sesuaikan") ? (fromBookmarks ? "/tersimpan" : "/cari") : pathname;
  // The clicked tab reads as current at once; the marker moves when the route actually commits.
  const [optimistic, setOptimistic] = useOptimistic(section);

  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-x-6 gap-y-2 px-4 pt-4 sm:px-6 sm:pt-0">
        <Link
          href="/cari"
          transitionTypes={NAV.lateral}
          className="inline-flex items-center rounded-md font-heading text-base font-medium tracking-tight pointer-coarse:min-h-11 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:py-4"
          translate="no"
        >
          beasiswa.in
        </Link>
        {/* On phones the four destinations become equal tabs on their own row. */}
        <nav aria-label="Menu utama" className="grid w-full grid-cols-5 sm:ml-auto sm:flex sm:w-auto sm:gap-1">
          {SECTIONS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              transitionTypes={NAV.lateral}
              onNavigate={() => startTransition(() => setOptimistic(href))}
              data-slot="nav-link"
              aria-current={optimistic === href ? "page" : undefined}
              className={cn(
                "relative flex items-center justify-center px-1 py-3 text-sm sm:px-3 text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 sm:py-4",
                optimistic === href && "font-medium text-foreground",
              )}
            >
              {label}
              {section === href && (
                <ViewTransition name="tab-marker" share="tab-marker">
                  <span aria-hidden="true" className="absolute inset-x-3 -bottom-px h-0.5 bg-foreground" />
                </ViewTransition>
              )}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
