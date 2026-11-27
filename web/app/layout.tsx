import type { Metadata, Viewport } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "beasiswa.in · Cari Beasiswa",
  icons: { icon: "data:," },
};

// Browser chrome matches the page: white, or pure black in dark mode.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Every page gets a fresh CSP nonce from proxy.ts, so pages render per request.
  await connection();
  return (
    <html lang="id">
      <body className="flex min-h-dvh flex-col bg-background antialiased">
        <a
          href="#konten"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
        >
          Langsung ke konten
        </a>
        <Suspense>
          <SiteHeader />
        </Suspense>
        <main id="konten" className="mx-auto w-full flex-1 max-w-3xl px-4 pt-8 sm:px-6 sm:pt-12">{children}</main>
        <SiteFooter />
        <Toaster position="bottom-center" />
      </body>
    </html>
  );
}
