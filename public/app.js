import { publicWebUrl } from "./web-url.mjs";

const DISCLAIMER = "Hasil dikumpulkan AI dari web dan bisa keliru. Selalu cek syarat & deadline di situs resmi penyelenggara.";
const POLL_MS = 1200;
const METHOD_NOTE = `<details class="card method"><summary><b>ℹ️ Cara skor dihitung dan seberapa valid</b></summary><ul>
  <li><b>Syarat angka</b> (IPK, IELTS, deadline, dana) dirangkum dari sumber yang ditemukan. Di mode Firecrawl, kutipan ditampilkan jika ditemukan dalam teks sumber. Tetap cek apakah kutipan berlaku untuk program dan periode yang kamu incar.</li>
  <li><b>Bobot</b> IPK 25 · Bahasa 15 · Negara 20 · Prestasi 20 · Bidang 10 · Pendanaan 10, dikurangi penalti syarat mutlak. Urutannya mengikuti tahap seleksi umum: syarat administrasi (gugur jika tidak terpenuhi), lalu substansi (esai, prestasi, wawancara).</li>
  <li><b>Batasan:</b> bobot ini rancangan tim beasiswa.in untuk prototipe dan <b>belum divalidasi alumni penerima atau ahli</b>. Skor mengukur kecocokan dengan syarat tertulis, bukan peluang lolos.</li>
  <li><b>Pengalaman awardee</b> adalah artikel publik hasil pencarian, belum diperiksa tim.</li>
</ul></details>`;
const app = document.getElementById("app");
let pollTimer = null;
let meta = {};

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
function sourceLink(input, label, className = "") {
  const url = publicWebUrl(input, { keepFragment: true });
  return url
    ? `<a class="${className}" href="${esc(url.href)}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>`
    : `<span class="hint">${esc(label)} (tautan tidak tersedia)</span>`;
}
const fmtDate = (d) => (d ? new Date(d + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "Tidak tertulis");
const fmtTime = (iso) => new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
const STATUS = { queued: "Antre", running: "Berjalan", succeeded: "Selesai", failed: "Gagal" };

async function api(path, options = {}) {
  const res = await fetch("/api" + path, { headers: { "Content-Type": "application/json" }, ...options });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(body.error || "Terjadi kesalahan."), { status: res.status, body });
  return body;
}

function toast(text) {
  const t = document.getElementById("toast");
  t.textContent = text;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2000);
}

async function refreshMeta() {
  meta = await api("/meta");
  const MODES = { firecrawl: "Agen: LIVE (Firecrawl web)", live: "Agen AI: LIVE (Claude + web)", demo: "Mode DEMO (data contoh offline)" };
  document.getElementById("mode").textContent = MODES[meta.mode] ?? MODES.demo;
}

// ---------- Profil Beasiswa (S1) ----------
async function viewProfile() {
  const { profile } = await api("/profile");
  const p = profile || { jenjang_saat_ini: "S1", jenjang_tujuan: "S2", prodi: "", ipk: "", semester: "", negara_tujuan: "", bidang_minat: "", skor_bahasa: "", prestasi: "", butuh_pendanaan: true };
  const opt = (vals, cur) => vals.map((v) => `<option ${v === cur ? "selected" : ""}>${v}</option>`).join("");
  app.innerHTML = `
    <h1>Profil Beasiswa</h1>
    <p class="sub">Profil disimpan di perangkat ini. Pencarian web memakai jenjang tujuan, negara yang dikenali, dan kategori bidang umum. Data akademik dan prestasi dipakai untuk menghitung skor secara lokal.</p>
    <div class="card cv">
      <div class="row" style="justify-content:space-between">
        <div>
          <b>📄 Isi otomatis dari CV</b>
          <div class="hint">PDF berisi teks, maksimal 5 MB dan 15 halaman. CV diproses di perangkat ini tanpa mengirimkannya ke penyedia AI.</div>
        </div>
        <button type="button" id="cvbtn">Upload CV (PDF)</button>
        <input id="cvfile" type="file" accept="application/pdf,.pdf" hidden>
      </div>
      <div id="cvstatus"></div>
    </div>
    <form class="card" id="pf">
      <div class="grid">
        <div><label for="f1">Jenjang saat ini</label><select id="f1" name="jenjang_saat_ini">${opt(["SMA", "D3", "S1", "S2"], p.jenjang_saat_ini)}</select></div>
        <div><label for="f2">Jenjang tujuan</label><select id="f2" name="jenjang_tujuan">${opt(["Exchange", "S1", "S2", "S3"], p.jenjang_tujuan)}</select></div>
        <div><label for="f3">Program studi</label><input id="f3" name="prodi" required maxlength="100" value="${esc(p.prodi)}" placeholder="Teknik Elektro"></div>
        <div><label for="f4">IPK <span class="hint">(0–4)</span></label><input id="f4" name="ipk" type="number" step="0.01" min="0" max="4" required value="${esc(p.ipk)}"></div>
        <div><label for="f5">Semester</label><input id="f5" name="semester" type="number" min="1" max="14" required value="${esc(p.semester)}"></div>
        <div><label for="f6">Skor bahasa <span class="hint">(IELTS/setara, 0 jika belum)</span></label><input id="f6" name="skor_bahasa" type="number" step="0.5" min="0" max="9" required value="${esc(p.skor_bahasa)}"></div>
        <div><label for="f7">Negara tujuan <span class="hint">(pisahkan koma)</span></label><input id="f7" name="negara_tujuan" maxlength="200" value="${esc(p.negara_tujuan)}" placeholder="Jepang, Australia"></div>
        <div><label for="f8">Bidang minat</label><input id="f8" name="bidang_minat" maxlength="200" value="${esc(p.bidang_minat)}" placeholder="Teknik, AI, energi"></div>
      </div>
      <div style="margin-top:14px"><label for="f9">Prestasi</label><textarea id="f9" name="prestasi" rows="2" maxlength="500" placeholder="Juara 2 lomba nasional, ketua himpunan…">${esc(p.prestasi)}</textarea></div>
      <div class="row" style="margin-top:14px; justify-content:space-between">
        <label class="check"><input type="checkbox" name="butuh_pendanaan" ${p.butuh_pendanaan ? "checked" : ""}> Saya butuh pendanaan penuh</label>
        <button type="submit">Simpan profil</button>
      </div>
      <div id="pferr"></div>
    </form>`;
  document.getElementById("cvbtn").onclick = () => document.getElementById("cvfile").click();
  document.getElementById("cvfile").onchange = (e) => e.target.files[0] && uploadCv(e.target.files[0], e.target);
  document.getElementById("pf").onsubmit = async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const body = {
      jenjang_saat_ini: f.get("jenjang_saat_ini"), jenjang_tujuan: f.get("jenjang_tujuan"), prodi: f.get("prodi").trim(),
      ipk: Number(f.get("ipk")), semester: Number(f.get("semester")), skor_bahasa: Number(f.get("skor_bahasa")),
      negara_tujuan: f.get("negara_tujuan").trim(), bidang_minat: f.get("bidang_minat").trim(), prestasi: f.get("prestasi").trim(),
      butuh_pendanaan: f.get("butuh_pendanaan") === "on",
    };
    try {
      await api("/profile", { method: "PUT", body: JSON.stringify(body) });
      toast("Profil beasiswa tersimpan");
      location.hash = "#/cari";
    } catch (err) {
      document.getElementById("pferr").innerHTML = `<div class="error">${esc(err.message)}${err.body?.fields ? ": " + esc(err.body.fields.join(", ")) : ""}</div>`;
    }
  };
}

// ---------- Upload CV: text extracted in the browser, PDF never leaves it ----------
const MAX_CV_BYTES = 5 * 1024 * 1024;
const MAX_CV_PAGES = 15;
const MAX_CV_CHARS = 30_000;
const FIELD_LABELS = { jenjang_saat_ini: "jenjang", prodi: "prodi", ipk: "IPK", semester: "semester", skor_bahasa: "skor bahasa", bidang_minat: "bidang minat", prestasi: "prestasi" };

async function pdfText(file) {
  const pdfjs = await import("/pdf/pdf.mjs").catch(() => {
    throw new Error("Pembaca PDF gagal dimuat. Jalankan npm ci di folder aplikasi.");
  });
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf/pdf.worker.mjs";
  const task = pdfjs.getDocument({ data: await file.arrayBuffer(), isEvalSupported: false, useWasm: false, isOffscreenCanvasSupported: false });
  let timer;
  try {
    async function readText() {
      const pdf = await task.promise;
      if (pdf.numPages > MAX_CV_PAGES) throw new Error(`CV maksimal ${MAX_CV_PAGES} halaman.`);
      let text = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const { items } = await (await pdf.getPage(i)).getTextContent();
        for (const item of items) {
          if (typeof item.str !== "string") continue;
          if (text.length + item.str.length + 1 > MAX_CV_CHARS) throw new Error("CV terlalu panjang.");
          text += item.str + (item.hasEOL ? "\n" : " ");
        }
        text += "\n";
        if (text.length > MAX_CV_CHARS) throw new Error("CV terlalu panjang.");
      }
      return text;
    }
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error("Waktu membaca PDF habis.")), 15_000);
    });
    return await Promise.race([readText(), timeout]);
  } finally {
    clearTimeout(timer);
    await task.destroy().catch(() => {});
  }
}

async function uploadCv(file, input) {
  const status = document.getElementById("cvstatus");
  const show = (html) => (status.innerHTML = html);
  input.value = "";
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) return show(`<div class="error">File harus PDF.</div>`);
  if (file.size > MAX_CV_BYTES) return show(`<div class="error">CV maksimal 5 MB.</div>`);
  const button = document.getElementById("cvbtn");
  button.disabled = true;
  show(`<ul class="steps" style="margin-top:12px"><li class="now">Membaca ${esc(file.name)}…</li></ul>`);
  try {
    const text = await pdfText(file);
    show(`<ul class="steps" style="margin-top:12px"><li>Teks CV terbaca (${text.length} karakter)</li><li class="now">Mengekstrak data akademik…</li></ul>`);
    const { fields, source } = await api("/cv/parse", { method: "POST", body: JSON.stringify({ text }) });
    if (!input.isConnected) return;
    const form = input.closest(".cv").nextElementSibling;
    form.querySelectorAll(".filled").forEach((el) => el.classList.remove("filled"));
    for (const [k, v] of Object.entries(fields)) {
      const el = form.elements[k];
      if (!el) continue;
      el.value = v;
      el.classList.add("filled");
    }
    const names = Object.keys(fields).map((k) => FIELD_LABELS[k] ?? k);
    show(names.length
      ? `<div class="okbox">✓ ${names.length} kolom terisi dari CV (${source === "ai" ? "dibaca AI" : "pembacaan otomatis"}): ${esc(names.join(", "))}. Kolom berwarna hijau, cek lalu klik <b>Simpan profil</b>. Negara tujuan & jenjang tujuan tetap kamu pilih sendiri.</div>`
      : `<div class="error">Tidak ada data akademik yang terbaca dari CV. Isi manual di bawah.</div>`);
  } catch (err) {
    show(`<div class="error">${esc(err.message)}</div>`);
  } finally {
    button.disabled = false;
  }
}

// ---------- Mulai pencarian (S2, S7) ----------
async function viewSearch() {
  const [{ profile }, { searches }] = await Promise.all([api("/profile"), api("/searches"), refreshMeta()]);
  const recent = searches.slice(0, 3);
  app.innerHTML = `
    <h1>Cari Beasiswa</h1>
    <p class="sub">Agen AI mencari beasiswa di web lalu mengurutkannya berdasarkan kecocokan dengan profilmu.</p>
    ${profile ? `
    <div class="card">
      <div class="row" style="justify-content:space-between; margin-bottom:12px">
        <div><b>Profil:</b> ${esc(profile.jenjang_saat_ini)} ${esc(profile.prodi)} → ${esc(profile.jenjang_tujuan)} · IPK ${esc(profile.ipk)} · ${esc(profile.negara_tujuan || "semua negara")}</div>
        <a href="#/profil" class="btn ghost">Ubah profil / upload CV</a>
      </div>
      <label for="notes">Catatan tambahan <span class="hint">(opsional)</span></label>
      <input id="notes" maxlength="300" placeholder='Contoh: "fully funded, Jepang, S2 2027"'>
      <div class="row" style="margin-top:14px; justify-content:space-between">
        <span class="pill">Sisa kuota hari ini: ${meta.quota_left}/${meta.daily_quota}</span>
        <button id="go">🔎 Cari beasiswa</button>
      </div>
      <div id="err"></div>
    </div>` : `
    <div class="card empty">Isi profil beasiswa dulu supaya agen tahu apa yang cocok untukmu.<br><br><a class="btn" href="#/profil">Upload CV / isi profil</a></div>`}
    ${recent.length ? `<div class="card"><h4 style="margin-bottom:8px">Pencarian terakhir</h4>${historyTable(recent, false)}</div>` : ""}`;
  const go = document.getElementById("go");
  if (!go) return;
  go.onclick = async () => {
    go.disabled = true;
    try {
      const { search_id } = await api("/searches", { method: "POST", body: JSON.stringify({ notes: document.getElementById("notes").value }) });
      location.hash = "#/hasil/" + search_id;
    } catch (err) {
      const s = err.body?.retry_after;
      const retry = s ? ` Coba lagi dalam ${s > 3600 ? Math.ceil(s / 3600) + " jam" : s + " detik"}.` : "";
      document.getElementById("err").innerHTML = `<div class="error">${esc(err.message)}${retry}</div>`;
      go.disabled = false;
    }
  };
}

// ---------- Status live + hasil (S3, S4, S5, S8) ----------
async function viewResult(id) {
  let data;
  try {
    data = await api("/searches/" + encodeURIComponent(id));
  } catch (err) {
    if (location.hash === "#/hasil/" + id) app.innerHTML = `<div class="card empty">${esc(err.message)}</div>`;
    return;
  }
  if (location.hash !== "#/hasil/" + id) return;
  const { search, saved_ids } = data;
  const live = search.status === "queued" || search.status === "running";
  const countries = search.target_countries?.map((name) => name.replace(/\b\w/g, (c) => c.toUpperCase())).join(", ");
  const steps = search.steps.map((s, i) => `<li class="${live && i === search.steps.length - 1 ? "now" : ""}">${esc(s.text)}</li>`).join("");
  app.innerHTML = `
    <div class="row" style="justify-content:space-between">
      <div><h1>Hasil Pencarian</h1><p class="sub">${search.target_level ? "Tujuan " + esc(search.target_level) + (countries ? " · " + esc(countries) : "") + " · " : ""}${fmtTime(search.created_at)}${search.notes ? " · “" + esc(search.notes) + "”" : ""}</p></div>
      <span class="pill ${esc(search.status)}">${esc(STATUS[search.status])}</span>
    </div>
    <div class="card" aria-live="polite">
      <h4 style="margin-bottom:6px">Langkah agen</h4>
      <ul class="steps">${steps || `<li class="now">Menyiapkan agen…</li>`}</ul>
      ${search.status === "failed" ? `<div class="error"><b>Pencarian gagal.</b> ${esc(search.error)}<br>Kuota hari ini tidak terpakai. <a href="#/cari">Coba lagi</a></div>` : ""}
    </div>
    ${search.status === "succeeded" ? `
      <div class="disclaimer">⚠️ ${DISCLAIMER}</div>
      ${METHOD_NOTE}
      ${resultsList(search, saved_ids)}
      ${search.mode === "firecrawl" ? "" : othersBlock(search.others)}` : ""}`;
  bindStars();
  clearTimeout(pollTimer);
  if (live) pollTimer = setTimeout(() => location.hash === "#/hasil/" + id && viewResult(id), POLL_MS);
}

// Eligible programs first; programs with hard limits stay visible below a divider, labelled.
function resultsList(search, savedIds) {
  if (search.mode === "firecrawl" && !Array.isArray(search.target_countries)) {
    return `<div class="card">Pencarian lama ini dibuat sebelum pemeriksaan periode pendaftaran tersedia. <a href="#/cari">Mulai pencarian baru</a> untuk melihat beasiswa yang masih buka.</div>`;
  }
  if (!search.results.length) {
    return `<div class="card">Belum ada beasiswa yang bisa dipastikan masih buka untuk tujuan ini dari sumber yang diperiksa.</div>`;
  }
  const limited = (r) => (r.limits ?? []).length > 0;
  const ok = search.results.filter((r) => !limited(r));
  const rest = search.results.filter(limited);
  const card = (r) => resultCard(r, savedIds.includes(r.id));
  const summary = search.mode === "firecrawl" ? "pendaftaran masih buka" : "sesuai jenjang & deadline";
  return `<p class="sub"><b>${search.results.length} beasiswa</b> · ${search.mode === "firecrawl" ? summary : `${ok.length} ${summary}`} ${rest.length ? `· ${rest.length} dengan catatan` : ""}</p>
    ${ok.map(card).join("")}
    ${rest.length ? `<div class="divider"><b>Tetap ditampilkan dengan batasan (${rest.length})</b><span class="hint">Periksa batasan pada setiap kartu, termasuk deadline dan sumber informasi.</span></div>${rest.map(card).join("")}` : ""}`;
}

function othersBlock(others) {
  if (!others?.length) return "";
  return `<details class="card"><summary><b>🔗 Kandidat lain dari pencarian (${others.length})</b> <span class="hint">· belum dibaca agen, tanpa skor</span></summary>
    <ul class="refs" style="margin-top:10px">${others.map((x) => `<li>
      ${sourceLink(x.url, x.title || hostOf(x.url) || "Sumber")} <span class="hint">${esc(hostOf(x.url))}</span>
      ${x.description ? `<div class="hint">${esc(x.description.slice(0, 200))}</div>` : ""}
    </li>`).join("")}</ul></details>`;
}

function resultCard(r, saved, fromBookmarks = false) {
  const color = r.score >= 75 ? "var(--ok)" : r.score >= 50 ? "var(--brand)" : "var(--warn)";
  const limits = r.limits ?? [];
  const evidence = r.program?.evidence;
  const checked = r.program?.source_checked_at;
  const checkedDate = checked && Number.isFinite(Date.parse(checked))
    ? new Date(checked).toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta", day: "numeric", month: "long", year: "numeric" })
    : "";
  return `
    <article class="card result ${limits.length ? "limited" : ""}">
      <div class="score" style="--s:${Number(r.score) || 0}; --c:${color}" aria-label="Skor kecocokan ${Number(r.score) || 0}"><span>${Number(r.score) || 0}</span></div>
      <div>
        <h3>${esc(r.name)}</h3>
        ${limits.length ? `<div class="limits">${limits.map((l) => `<span class="pill lim">⚠ ${esc(l)}</span>`).join("")}</div>` : ""}
        <div class="meta">
          <span class="pill">${esc(r.provider)}</span><span class="pill">📍 ${esc(r.country)}</span>
          <span class="pill">🎓 ${esc(r.level)}</span><span class="pill">💰 ${esc(r.funding)}</span>
          <span class="pill">⏰ ${esc(fmtDate(r.deadline))}</span>
        </div>
        ${checkedDate ? `<p class="hint">Sumber diperiksa ${esc(checkedDate)}</p>` : ""}
        ${evidence?.jenjang ? `<details><summary>Bukti dari sumber</summary>
          ${[["Jenjang", evidence.jenjang], ["Lokasi studi", evidence.lokasi], ["Pendaftaran buka", evidence.pembukaan], ["Batas pendaftaran", evidence.deadline]].filter(([, quote]) => quote).map(([label, quote]) => `<blockquote><b>${label}</b><br>${esc(quote)}</blockquote>`).join("")}
        </details>` : ""}
        <p class="req"><b>Syarat ringkas:</b> ${esc(r.requirements)}</p>
        ${insightBlock(r)}
        ${breakdownBlock(r)}
        ${achievementsBlock(r)}
        ${awardeeBlock(r)}
        <div class="actions">
          ${r.program ? `<a class="btn" href="#/sesuaikan/${encodeURIComponent(r.id)}${fromBookmarks ? "/tersimpan" : ""}">🛠 Sesuaikan CV</a>` : ""}
          ${sourceLink(r.url, r.program?.official === false ? "Buka sumber ↗" : "Buka sumber resmi ↗", "btn ghost")}
          <button class="star ${saved ? "on" : ""}" data-id="${esc(r.id)}" data-program="${esc(r.program_id ?? r.id)}" data-saved="${saved}">${saved ? "★ Tersimpan" : "☆ Simpan"}</button>
        </div>
      </div>
    </article>`;
}

// Quantitative indicator: points per component, sums to the score.
function breakdownBlock(r) {
  if (!r.breakdown?.length) return "";
  const rows = r.breakdown.map((b) => {
    const penalty = b.points < 0;
    const pct = penalty ? 100 : b.max ? Math.round((b.points / b.max) * 100) : 0;
    const tone = penalty ? "bad" : pct >= 70 ? "ok" : pct >= 40 ? "mid" : "low";
    return `<details class="bd-row"><summary class="bd">
      <span class="bd-l">${esc(b.label)}</span>
      <span class="bd-bar"><i class="${tone}" style="width:${pct}%"></i></span>
      <span class="bd-v">${esc(penalty ? b.points : `${b.points}/${b.max}`)}</span>
      <span class="bd-more">dasar ▾</span>
    </summary>
    <div class="basis">
      <div><b>${esc(b.detail)}</b></div>
      ${b.rule ? `<div><span class="hint">Aturan poin:</span> ${esc(b.rule)}</div>` : ""}
      ${b.quote ? quoteHtml(b.quote, `teks sumber ${hostOf(r.url)}`) : sourceNote(r, b.key)}
    </div></details>`;
  }).join("");
  return `<div class="panel"><h4>📊 Rincian skor (${Number(r.score) || 0}/100) <span class="hint">· klik baris untuk melihat dasar penilaian</span></h4>${rows}</div>`;
}

const hostOf = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; } };
const quoteHtml = (q, cite) => `<blockquote>“${esc(q)}”<cite>— ${esc(cite)}</cite></blockquote>`;
const SOURCE_NOTES = {
  demo: "Angka syarat: data contoh mode demo. Cek angka resmi di situs penyelenggara.",
  firecrawl: "Angka diekstrak Firecrawl, tetapi kalimat aslinya tidak ditemukan kata per kata di halaman. Cek manual.",
  claude: "Angka dirangkum agen dari hasil pencarian web. Cek di situs resmi.",
};
function sourceNote(r, key) {
  if (!["ipk", "bahasa", "pendanaan", "penalti"].includes(key)) return `<div class="hint">Dihitung dari profil beasiswamu dan data program.</div>`;
  return `<div class="hint">${esc(SOURCE_NOTES[r.source] ?? SOURCE_NOTES.demo)}</div>`;
}

// Why this program fits, per selection stage (older saved results fall back to reasons/gaps).
function insightBlock(r) {
  if (!r.insight) {
    return `<div class="cols">
      <div class="good"><h4>✓ Kenapa cocok</h4><ul>${(r.reasons ?? []).map((x) => `<li>${esc(x)}</li>`).join("") || "<li>-</li>"}</ul></div>
      <div class="gap"><h4>! Belum terpenuhi</h4><ul>${(r.gaps ?? []).map((x) => `<li>${esc(x)}</li>`).join("") || "<li>Semua syarat utama terpenuhi</li>"}</ul></div>
    </div>`;
  }
  return `<div class="panel"><h4>💡 Analisis peluang di ${esc(r.name)}</h4>
    ${r.insight.map((i) => `<div class="ins ${i.ok ? "ok" : "warn"}">
      <b>${i.ok ? "✓" : "!"} ${esc(i.label)}</b>
      <p>${esc(i.text)}</p>
      ${(i.quotes ?? []).map((q) => quoteHtml(q.quote, `${q.text}, teks sumber ${hostOf(r.url)}`)).join("")}
    </div>`).join("")}
  </div>`;
}

function awardeeBlock(r) {
  if (!r.awardee_refs?.length) return "";
  return `<div class="panel"><h4>🎓 Pengalaman awardee <span class="hint">· artikel publik hasil pencarian, belum diperiksa tim</span></h4>
    <ul class="refs">${r.awardee_refs.map((x) => `<li>
      ${sourceLink(x.url, x.title || hostOf(x.url) || "Sumber")} <span class="hint">${esc(hostOf(x.url))}</span>
      ${x.description ? `<div class="hint">${esc(x.description.slice(0, 200))}</div>` : ""}
    </li>`).join("")}</ul></div>`;
}

function achievementsBlock(r) {
  if (!r.achievements?.length) return "";
  const rows = r.achievements.map((a) => `<li class="${a.relevant.length ? "rel" : ""}">
      <span class="ach-pts">+${a.points}</span>
      <span>${esc(a.text)}</span>
      <span class="pill">${esc(a.level)}</span>
      ${a.relevant.map((t) => `<span class="pill tag">✓ ${esc(t)}</span>`).join("")}
    </li>`).join("");
  const rel = r.achievements.filter((a) => a.relevant.length).length;
  const total = r.breakdown?.find((b) => b.key === "prestasi");
  return `<div class="panel"><h4>🏆 Prestasi yang cocok: ${rel} dari ${r.achievements.length}${total ? ` · ${total.points}/${total.max} poin` : ""}</h4>
    <ul class="ach">${rows}</ul>
    <div class="hint" style="font-size:12px">Poin = tingkat (internasional 8 · nasional 6 · regional 4 · kampus 3) + 3 jika sesuai kriteria program + 1–2 untuk juara. Tidak relevan = setengah poin tingkat. Maks 20.</div></div>`;
}

function bindStars() {
  const stars = Array.from(document.querySelectorAll(".star"));
  stars.forEach((b) => {
    b.onclick = async () => {
      const saved = b.dataset.saved === "true";
      const related = stars.filter((star) => star.dataset.program === b.dataset.program);
      related.forEach((star) => { star.disabled = true; });
      try {
        await api("/saved/" + encodeURIComponent(b.dataset.id), { method: saved ? "DELETE" : "PUT" });
      } catch (err) {
        toast(err.message);
        return;
      } finally {
        related.forEach((star) => { star.disabled = false; });
      }
      for (const star of related) {
        star.dataset.saved = String(!saved);
        star.classList.toggle("on", !saved);
        star.textContent = !saved ? "★ Tersimpan" : "☆ Simpan";
      }
      toast(!saved ? "Disimpan ke daftar beasiswa" : "Dihapus dari tersimpan");
      if (location.hash === "#/tersimpan" && saved) viewSaved();
    };
  });
}

// ---------- Sesuaikan CV: rewording options re-scored before/after, hard gaps, growth plan ----------
const linkHtml = (l) => `<li>${l.url ? sourceLink(l.url, `${l.title} ↗`) : `<b>${esc(l.title)}</b>`} <span class="hint">${esc(l.note)}</span></li>`;
const deltaHtml = (d) => (d > 0 ? `<span class="up">+${d}</span>` : d < 0 ? `<span class="down">${d}</span>` : `<span class="hint">0</span>`);

function compareHtml(p) {
  const rows = p.rows.map((r) => `<tr class="${r.after !== r.before ? "changed" : ""}">
    <td>${esc(r.label)}</td><td>${r.before}${r.max ? `/${r.max}` : ""}</td><td>${r.after}${r.max ? `/${r.max}` : ""}</td><td>${deltaHtml(r.after - r.before)}</td>
    <td class="hint">${r.after !== r.before ? esc(r.detail) : ""}</td></tr>`).join("");
  return `<div class="ba">
      <div><span class="hint">Sebelum</span><b>${p.before}</b></div><div class="arrow">→</div>
      <div><span class="hint">Sesudah</span><b>${p.after}</b></div><div>${deltaHtml(p.after - p.before)} poin</div>
    </div>
    <div class="table-wrap"><table><thead><tr><th>Komponen</th><th>Sebelum</th><th>Sesudah</th><th>Δ</th><th>Alasan perubahan</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

function editBlock(e) {
  return `<div class="edit" data-index="${e.index}">
    <div class="hint">Kalimat sekarang · tingkat ${esc(e.level.toLowerCase())} · kategori ${esc(e.tags.join(", ") || "belum terbaca")}</div>
    <div class="orig">${esc(e.original)}</div>
    <label class="opt"><input type="radio" name="e${e.index}" value="" checked> <span>Biarkan apa adanya</span></label>
    ${e.options.map((o, k) => `<label class="opt"><input type="radio" name="e${e.index}" value="${k}">
      <span><b class="up">+${o.delta} poin → ${o.after}</b>
      <input class="opttext" data-k="${k}" value="${esc(o.text)}" aria-label="Kalimat opsi ${k + 1}">
      <span class="hint">${esc(o.why)} <b>${esc(o.condition)}</b></span></span></label>`).join("")}
  </div>`;
}

async function viewCoach(id, fromBookmarks = false) {
  const rid = decodeURIComponent(id);
  let c, profile;
  try {
    [c, { profile }] = await Promise.all([api("/coach/" + encodeURIComponent(rid)), api("/profile")]);
  } catch (err) {
    app.innerHTML = `<div class="card error">${esc(err.message)} <a href="#/cari">Kembali</a></div>`;
    return;
  }
  const items = String(profile.prestasi ?? "").split(/;|\n/).map((x) => x.trim()).filter((x) => x.length > 3);
  const backToSaved = fromBookmarks || c.saved_only;
  app.innerHTML = `
    <p><a href="${backToSaved ? "#/tersimpan" : `#/hasil/${encodeURIComponent(rid.split(":")[0])}`}">← Kembali ke ${backToSaved ? "tersimpan" : "hasil"}</a></p>
    <h1>Sesuaikan CV untuk ${esc(c.program.name)}</h1>
    <p class="sub">Skor sekarang <b>${c.before}</b>. Potensi jika semua saran kalimat dipakai: <b>${c.best}</b> (${c.best > c.before ? `naik ${c.best - c.before} poin` : "tidak berubah"}). Program menilai: ${esc(c.program.values.join(", ") || "-")}. ${sourceLink(c.program.url, "Buka sumber ↗")}</p>

    <section class="card">
      <h3>✍️ Bisa ditingkatkan lewat CV</h3>
      <p class="hint">Opsi di bawah tidak menambah fakta baru: hanya menyebut kategori atau tingkat yang dinilai program agar terbaca jelas. Kalimat bisa kamu ubah (misalnya tambahkan angka nyata).</p>
      ${c.cv_note ? `<div class="okbox">${esc(c.cv_note)}</div>` : ""}
      ${c.cv_edits.map(editBlock).join("")}
      ${c.profile_edits.map((e, k) => `<label class="opt edit"><input type="checkbox" class="pe" data-k="${k}">
        <span><b class="up">+${e.delta} poin → ${e.after}</b> ${esc(e.label)} <span class="hint"><b>${esc(e.condition)}</b></span></span></label>`).join("")}
      <label class="check" style="margin-top:12px"><input type="checkbox" id="truth"> Saya pastikan semua kalimat yang dipilih sesuai fakta dan bisa dibuktikan.</label>
      <div class="actions">
        <button id="preview">🔁 Hitung ulang skor</button>
        <button id="apply" class="ghost" disabled>💾 Simpan ke profil</button>
        <button id="copy" class="ghost">📋 Salin teks prestasi</button>
      </div>
      <div id="previewOut" class="compare"></div>
    </section>

    <section class="card">
      <h3>🚫 Tidak bisa diatasi dengan edit CV</h3>
      ${c.hard_gaps.length ? c.hard_gaps.map((g) => `<div class="gapcard">
        <b>${esc(g.title)}</b>${g.potential > 0 ? ` <span class="pill">potensi +${g.potential} poin jika terpenuhi</span>` : ""}
        <p>${esc(g.why)}</p>
        ${g.quote ? quoteHtml(g.quote, `teks sumber ${hostOf(c.program.url)}`) : ""}
        ${g.actions.length ? `<div class="hint">Yang bisa kamu lakukan:</div><ul class="refs">${g.actions.map(linkHtml).join("")}</ul>` : ""}
      </div>`).join("") : `<div class="okbox">Semua syarat angka yang tertulis sudah terpenuhi.</div>`}
    </section>

    <section class="card">
      <h3>📈 Rencana pengembangan</h3>
      ${c.growth.length ? c.growth.map((g) => `<div class="gapcard"><b>${esc(g.area)}</b><p>${esc(g.why)}</p>
        ${g.quote ? quoteHtml(g.quote, `teks sumber ${hostOf(c.program.url)}`) : ""}
        <ul class="refs">${g.links.map(linkHtml).join("")}</ul></div>`).join("") : `<div class="okbox">Profilmu sudah kuat untuk kriteria program ini. Fokus ke esai dan wawancara.</div>`}
    </section>
    <p class="hint">Dasar saran: syarat dan kriteria tertulis program (beserta kutipan bila ada) dan aturan skor yang sama dengan halaman hasil. Bukan jaminan lolos; bobot belum divalidasi ahli.</p>`;

  const patch = () => {
    const chosen = items.map((text, i) => {
      const box = app.querySelector(`.edit[data-index="${i}"]`);
      const pick = box?.querySelector("input[type=radio]:checked")?.value;
      return pick ? box.querySelector(`.opttext[data-k="${pick}"]`).value.trim() || text : text;
    });
    const out = { prestasi: chosen.join("; ") };
    app.querySelectorAll(".pe:checked").forEach((el) => { const e = c.profile_edits[el.dataset.k]; out[e.field] = e.value; });
    return out;
  };
  const truth = document.getElementById("truth");
  const apply = document.getElementById("apply");
  truth.onchange = () => (apply.disabled = !truth.checked);
  document.getElementById("preview").onclick = async () => {
    try {
      document.getElementById("previewOut").innerHTML = compareHtml(await api(`/coach/${encodeURIComponent(rid)}/preview`, { method: "POST", body: JSON.stringify(patch()) }));
    } catch (err) {
      document.getElementById("previewOut").innerHTML = `<div class="error">${esc(err.message)}</div>`;
    }
  };
  apply.onclick = async () => {
    try {
      await api("/profile", { method: "PUT", body: JSON.stringify({ ...profile, ...patch() }) });
      toast("Profil diperbarui. Skor baru dipakai di pencarian berikutnya.");
      viewCoach(id, fromBookmarks);
    } catch (err) {
      toast(err.message);
    }
  };
  document.getElementById("copy").onclick = async () => {
    try {
      await navigator.clipboard.writeText(patch().prestasi.split("; ").join("\n"));
      toast("Teks prestasi disalin");
    } catch {
      toast("Browser menolak akses clipboard");
    }
  };
}

// ---------- Riwayat (S6) ----------
function historyTable(searches, deletable) {
  return `<div class="table-wrap"><table><thead><tr><th>Waktu</th><th>Catatan</th><th>Status</th><th>Hasil</th><th></th></tr></thead><tbody>
    ${searches.map((s) => `<tr>
      <td>${fmtTime(s.created_at)}</td><td>${esc(s.notes || "-")}</td>
      <td><span class="pill ${esc(s.status)}">${esc(STATUS[s.status])}</span></td>
      <td>${s.status === "succeeded" ? `${s.count} beasiswa<br><span class="hint">Teratas: ${esc(s.top)}</span>` : s.status === "failed" ? esc(s.error) : "…"}</td>
      <td><div class="row"><a href="#/hasil/${esc(s.id)}">Lihat</a>${deletable && s.status !== "running" && s.status !== "queued" ? `<button class="ghost del" data-id="${esc(s.id)}" style="padding:4px 10px">Hapus</button>` : ""}</div></td>
    </tr>`).join("")}</tbody></table></div>`;
}

async function viewHistory() {
  const { searches } = await api("/searches");
  app.innerHTML = `<h1>Riwayat Pencarian</h1><p class="sub">Urut terbaru. Kamu bisa menghapus riwayat kapan saja.</p>
    <div class="card">${searches.length ? historyTable(searches, true) : `<div class="empty">Belum ada pencarian.</div>`}</div>`;
  document.querySelectorAll(".del").forEach((b) => (b.onclick = async () => {
    try {
      await api("/searches/" + b.dataset.id, { method: "DELETE" });
      toast("Riwayat dihapus");
    } catch (err) {
      toast(err.message);
    }
    viewHistory();
  }));
}

// ---------- Tersimpan (S5) ----------
async function viewSaved() {
  const { saved } = await api("/saved");
  app.innerHTML = `<h1>Beasiswa Tersimpan</h1><p class="sub">Beasiswa yang kamu tandai untuk dipersiapkan.</p>
    ${saved.length ? `<div class="disclaimer">⚠️ ${DISCLAIMER}</div>` + saved.map((r) => resultCard(r, true, true)).join("") : `<div class="card empty">Belum ada beasiswa tersimpan.</div>`}`;
  bindStars();
}

// ---------- Router ----------
async function route() {
  clearTimeout(pollTimer);
  const [, page, id, from] = location.hash.split("/");
  const fromBookmarks = from === "tersimpan";
  const nav = page === "hasil" || page === "sesuaikan" ? (fromBookmarks ? "tersimpan" : "cari") : page || "cari";
  document.querySelectorAll("[data-nav]").forEach((a) => a.classList.toggle("active", a.dataset.nav === nav));
  try {
    if (page === "profil") await viewProfile();
    else if (page === "hasil" && id) await viewResult(id);
    else if (page === "sesuaikan" && id) await viewCoach(id, fromBookmarks);
    else if (page === "riwayat") await viewHistory();
    else if (page === "tersimpan") await viewSaved();
    else await viewSearch();
  } catch (err) {
    app.innerHTML = `<div class="card error">${esc(err.message)}</div>`;
  }
}
window.addEventListener("hashchange", route);
refreshMeta().then(route).catch((err) => (app.innerHTML = `<div class="card error">Server tidak bisa dihubungi: ${esc(err.message)}</div>`));
