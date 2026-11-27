import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { SiteHeader } from "@/components/site-header";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "beasiswa.in · Cari Beasiswa",
  icons: { icon: "data:," },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Every page gets a fresh CSP nonce from proxy.ts, so pages render per request.
  await connection();
  return (
    <html lang="id">
      <body className="min-h-dvh bg-muted/40 antialiased">
        <Suspense>
          <SiteHeader />
        </Suspense>
        <main className="mx-auto w-full max-w-5xl px-4 pt-6 pb-16">{children}</main>
        <Toaster position="bottom-center" />
      </body>
    </html>
  );
}
