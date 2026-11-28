// Shared by the header (client) and footer (server), so it lives outside any "use client" module.
export const SECTIONS = [
  { href: "/cari", label: "Cari" },
  { href: "/profil", label: "Profil" },
  { href: "/development", label: "Persiapan" },
  { href: "/riwayat", label: "Riwayat" },
  { href: "/tersimpan", label: "Tersimpan" },
] as const;

// View transition types for links and router.push (motion in globals.css):
//   tabs, footer links, profile save           → lateral: fade
//   Cari/Riwayat → Hasil, Hasil/Tersimpan → CV → forward: slide from the right
//   Sesuaikan CV → Hasil or Tersimpan          → back: slide from the left
// Browser back/forward carries no type, so it swaps without motion.
export const NAV = {
  forward: ["nav-forward"],
  back: ["nav-back"],
  lateral: ["nav-lateral"],
};

export const SOURCE_REPO = "https://github.com/SHIBONA/beasiswa.in";
