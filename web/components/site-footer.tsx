import Link from "next/link";
import { ApiStatus } from "@/components/api-status";
import { SourceLink } from "@/components/source-link";
import { NAV, SECTIONS, SOURCE_REPO } from "@/lib/nav";

const linkClass = "inline-flex items-center pointer-coarse:min-h-11 rounded-sm underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50";

// Brand, the app's real destinations, and an oversized wordmark that closes the page.
// The wordmark is decoration: the brand name above stays the readable text, so the giant one is hidden from screen readers.
export function SiteFooter() {
  return (
    <footer className="mt-24 overflow-hidden border-t">
      <div className="mx-auto grid max-w-3xl gap-10 px-4 pt-12 pb-10 sm:grid-cols-[1fr_auto_auto] sm:gap-16 sm:px-6">
        <div className="max-w-xs space-y-3">
          <p className="font-semibold tracking-tight" translate="no">beasiswa.in</p>
          <p className="text-sm text-muted-foreground">
            Pencari beasiswa untuk satu mahasiswa yang berjalan di komputermu. Profil, riwayat, dan bookmark disimpan di perangkat ini.
          </p>
          <ApiStatus />
        </div>
        <nav aria-labelledby="footer-app" className="space-y-3">
          <h2 id="footer-app" className="text-sm font-medium">Aplikasi</h2>
          <ul className="space-y-2 text-sm text-muted-foreground pointer-coarse:space-y-0">
            {SECTIONS.map(({ href, label }) => (
              <li key={href}><Link href={href} transitionTypes={NAV.lateral} className={linkClass}>{label}</Link></li>
            ))}
          </ul>
        </nav>
        <div className="space-y-3">
          <h2 className="text-sm font-medium">Proyek</h2>
          <ul className="space-y-2 text-sm text-muted-foreground pointer-coarse:space-y-0">
            <li><SourceLink href={SOURCE_REPO} className="no-underline hover:underline pointer-coarse:min-h-11">Kode sumber</SourceLink></li>
            <li><SourceLink href={`${SOURCE_REPO}/issues`} className="no-underline hover:underline pointer-coarse:min-h-11">Laporkan masalah</SourceLink></li>
          </ul>
        </div>
      </div>
      <p className="mx-auto max-w-3xl px-4 pb-8 text-xs text-muted-foreground sm:px-6">
        Prototipe. Skor mengukur kecocokan dengan syarat tertulis, bukan peluang lolos.
      </p>
      <p
        aria-hidden="true"
        translate="no"
        className="pointer-events-none -mb-[0.18em] text-center text-[19vw] leading-[0.8] font-semibold tracking-[-0.06em] whitespace-nowrap text-foreground/[0.07] select-none"
      >
        beasiswa.in
      </p>
    </footer>
  );
}
