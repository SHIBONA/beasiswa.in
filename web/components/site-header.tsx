"use client";

import { MenuIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { startTransition, useOptimistic, useState, ViewTransition } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { NAV, SECTIONS } from "@/lib/nav";
import { cn } from "@/lib/utils";

const focusRing = "outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

// One row on every screen: the five destinations sit inline from `sm` up; on phones they move into a
// labelled "Menu" sheet instead of wrapping onto a second row.
export function SiteHeader() {
  const pathname = usePathname();
  const fromBookmarks = useSearchParams().get("dari") === "tersimpan";
  // Result and coach pages belong to the tab the member came from.
  const section = pathname.startsWith("/hasil") || pathname.startsWith("/sesuaikan") ? (fromBookmarks ? "/tersimpan" : "/cari") : pathname;
  // The clicked tab reads as current at once; the marker moves when the route actually commits.
  const [optimistic, setOptimistic] = useOptimistic(section);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-6 px-4 sm:px-6">
        <Link
          href="/cari"
          transitionTypes={NAV.lateral}
          className={cn("inline-flex min-h-14 items-center rounded-md font-heading text-base font-medium tracking-tight", focusRing)}
          translate="no"
        >
          beasiswa.in
        </Link>

        <nav aria-label="Menu utama" className="hidden sm:flex sm:gap-1">
          {SECTIONS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              transitionTypes={NAV.lateral}
              onNavigate={() => startTransition(() => setOptimistic(href))}
              data-slot="nav-link"
              aria-current={optimistic === href ? "page" : undefined}
              className={cn(
                "relative flex items-center px-3 py-4 text-sm text-muted-foreground hover:text-foreground",
                focusRing,
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

        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger render={<Button variant="ghost" className="sm:hidden" />}>
            <MenuIcon aria-hidden="true" />
            Menu
          </SheetTrigger>
          <SheetContent side="right" className="w-72 p-0">
            <SheetHeader className="border-b px-4 py-4">
              <SheetTitle className="font-heading text-base font-medium" translate="no">beasiswa.in</SheetTitle>
            </SheetHeader>
            <nav aria-label="Menu utama" className="flex flex-col px-2 pb-4">
              {SECTIONS.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  transitionTypes={NAV.lateral}
                  onNavigate={() => setMenuOpen(false)}
                  aria-current={section === href ? "page" : undefined}
                  className={cn(
                    "flex min-h-12 items-center rounded-md px-3 text-base text-muted-foreground hover:bg-muted hover:text-foreground",
                    focusRing,
                    section === href && "bg-primary font-medium text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                  )}
                >
                  {label}
                </Link>
              ))}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
