import type { ReactNode } from "react";
import { publicWebUrl } from "@beasiswa/shared";

// Links only to public http(s) pages; anything else (old data, private hosts) is shown as text.
export function SourceLink({ href, children, className }: { href: unknown; children: ReactNode; className?: string }) {
  const url = publicWebUrl(href, { keepFragment: true });
  if (!url) return <span className="text-muted-foreground">{children} (tautan tidak tersedia)</span>;
  return (
    <a className={className ?? "text-primary underline-offset-4 hover:underline"} href={url.href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

export function Quote({ quote, cite }: { quote: string; cite: string }) {
  return (
    <blockquote className="my-2 border-l-4 border-primary/40 bg-muted/60 px-3 py-2 text-sm">
      “{quote}”<cite className="mt-1 block text-xs text-muted-foreground not-italic">— {cite}</cite>
    </blockquote>
  );
}
