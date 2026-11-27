import { ExternalLinkIcon } from "lucide-react";
import type { ReactNode } from "react";
import { publicWebUrl } from "@beasiswa/shared";
import { cn } from "@/lib/utils";

// Links only to public http(s) pages; anything else (old data, private hosts) is shown as text.
export function SourceLink({ href, children, className }: { href: unknown; children: ReactNode; className?: string }) {
  const url = publicWebUrl(href, { keepFragment: true });
  if (!url) return <span className="text-muted-foreground">{children} (tautan tidak tersedia)</span>;
  return (
    <a
      className={cn("inline-flex items-center gap-1 underline underline-offset-4 hover:text-muted-foreground", className)}
      href={url.href}
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
      <ExternalLinkIcon aria-hidden="true" className="size-3.5 shrink-0" />
      <span className="sr-only">(buka di tab baru)</span>
    </a>
  );
}

export function Quote({ quote, cite }: { quote: string; cite: string }) {
  return (
    <figure className="border-l-2 pl-3 text-sm">
      <blockquote>“{quote}”</blockquote>
      <figcaption className="mt-1 text-muted-foreground">{cite}</figcaption>
    </figure>
  );
}
