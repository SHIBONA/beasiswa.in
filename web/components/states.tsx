import { CircleAlertIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";

// Loading and error states say what is loading or what failed, so a slow or broken server is never a blank page.
export function Loading({ children }: { children: string }) {
  return (
    <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
      <Spinner aria-hidden="true" /> {children}
    </p>
  );
}

export function LoadError({ title, message }: { title: string; message: string }) {
  return (
    <Alert variant="destructive">
      <CircleAlertIcon />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{message}. Pastikan server API berjalan, lalu muat ulang halaman.</AlertDescription>
    </Alert>
  );
}

export function PageHeading({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-8 space-y-2">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
      {children && <p className="text-muted-foreground">{children}</p>}
    </div>
  );
}
