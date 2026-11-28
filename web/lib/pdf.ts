import { MAX_CV_CHARS } from "@beasiswa/shared";

export const MAX_CV_BYTES = 5 * 1024 * 1024;
const MAX_CV_PAGES = 15;
const READ_TIMEOUT_MS = 15_000;

// Reads the text of a PDF in the browser; the file itself never leaves the device.
export async function pdfText(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist").catch(() => {
    throw new Error("Pembaca PDF gagal dimuat. Jalankan bun install di folder aplikasi.");
  });
  pdfjs.GlobalWorkerOptions.workerPort ??= new Worker(new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url), { type: "module" });
  const task = pdfjs.getDocument({ data: await file.arrayBuffer(), useWasm: false, isOffscreenCanvasSupported: false });
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("Waktu membaca PDF habis.")), READ_TIMEOUT_MS);
    });
    return await Promise.race([readText(task.promise), timeout]);
  } finally {
    clearTimeout(timer);
    await task.destroy().catch(() => {});
  }
}

async function readText(loading: Promise<import("pdfjs-dist").PDFDocumentProxy>) {
  const pdf = await loading;
  if (pdf.numPages > MAX_CV_PAGES) throw new Error(`CV maksimal ${MAX_CV_PAGES} halaman.`);
  let text = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const { items } = await (await pdf.getPage(i)).getTextContent();
    for (const item of items) {
      if (!("str" in item)) continue;
      if (text.length + item.str.length + 1 > MAX_CV_CHARS) throw new Error("CV terlalu panjang.");
      text += item.str + (item.hasEOL ? "\n" : " ");
    }
    text += "\n";
    if (text.length > MAX_CV_CHARS) throw new Error("CV terlalu panjang.");
  }
  return text;
}
