export const DISCLAIMER = "Hasil dikumpulkan AI dari web dan bisa keliru. Selalu cek syarat & deadline di situs resmi penyelenggara.";

export const STATUS: Record<string, string> = { queued: "Antre", running: "Berjalan", succeeded: "Selesai", failed: "Gagal" };

export const fmtDate = (d: string | undefined) =>
  d ? new Date(d + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "Tidak tertulis";

export const fmtTime = (iso: string) => new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });

export const hostOf = (u: string) => {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};
