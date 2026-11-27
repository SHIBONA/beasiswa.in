import { describe, test } from '@e2e-dev/web';
import { expect } from 'e2e';

const profile = {
  jenjang_saat_ini: 'S1', jenjang_tujuan: 'S2', prodi: 'Teknik Elektro',
  ipk: 3.62, semester: 7, skor_bahasa: 6, negara_tujuan: 'Jepang',
  bidang_minat: 'IoT', butuh_pendanaan: true,
  prestasi: 'Juara 2 Lomba Karya Tulis Ilmiah Nasional Energi Terbarukan 2025; Asisten Laboratorium Sistem Tenaga Listrik 2024',
};

async function seedProfile(baseUrl: string) {
  const response = await fetch(new URL('/api/profile', baseUrl), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile),
  });
  if (!response.ok) throw new Error(`Profil tes gagal disiapkan (HTTP ${response.status}).`);
}

describe('Cari Beasiswa', () => {
  test('shows scored recommendations and agent steps', async ({ app, screen, browser }) => {
    await seedProfile(app.baseUrl);
    await app.open('/#/cari');

    await screen.getByRole('button', { name: /Cari beasiswa/i }).tap();

    await expect(screen.getByRole('heading', { name: 'Hasil Pencarian' })).toBeVisible();
    await expect(screen.getByRole('heading', { name: 'Langkah agen' })).toBeVisible();
    await expect(browser.locator('article.result')).toHaveCount(24);
    await expect(browser.locator('article.limited').first()).toBeVisible();
  });

  test('calculates and saves a truthful CV adjustment for LPDP', async ({ app, screen, browser }) => {
    await seedProfile(app.baseUrl);
    await app.open('/#/cari');
    await screen.getByRole('button', { name: /Cari beasiswa/i }).tap();
    await browser.locator('article').filter({ hasText: 'Beasiswa LPDP Reguler' }).getByRole('link', { name: /Sesuaikan CV/ }).tap();
    const save = screen.getByRole('button', { name: /Simpan ke profil/ });
    await expect(save).toBeDisabled();
    await browser.locator('.edit[data-index] input[type=radio]:not([value=""])').first().check();
    await screen.getByRole('button', { name: /Hitung ulang skor/ }).tap();
    await expect(browser.locator('#previewOut .ba')).toContainText(/Sebelum.*Sesudah.*\+\d+ poin/s);
    await screen.getByLabel(/Saya pastikan semua kalimat/).check();

    await save.tap();

    await expect(screen.getByText(/Profil diperbarui/)).toBeVisible();
    await expect(screen.getByRole('link', { name: /Kembali ke hasil/ })).toHaveAttribute('href', /^#\/hasil\//);
  });

  test('saves a recommendation and reads it from Tersimpan', async ({ app, screen, browser }) => {
    await seedProfile(app.baseUrl);
    await app.open('/#/cari');
    await screen.getByRole('button', { name: /Cari beasiswa/i }).tap();
    const card = browser.locator('article').filter({ hasText: 'Beasiswa LPDP Reguler' });

    await card.getByRole('button', { name: /Simpan/ }).tap();
    await card.getByRole('button', { name: /Tersimpan/ }).waitFor();
    await screen.getByRole('link', 'Tersimpan').tap();

    await expect(screen.getByRole('heading', { name: 'Beasiswa Tersimpan' })).toBeVisible();
    await expect(screen.getByRole('heading', { name: 'Beasiswa LPDP Reguler' })).toBeVisible();
    await card.getByRole('link', { name: /Sesuaikan CV/ }).tap();
    await expect(screen.getByRole('link', { name: /Kembali ke tersimpan/ })).toHaveAttribute('href', '#/tersimpan');
  });

  test('removes a failed search from Riwayat', async ({ app, screen, browser }) => {
    await seedProfile(app.baseUrl);
    await app.open('/#/cari');
    await browser.locator('#notes').fill('simulasi gagal');
    await screen.getByRole('button', { name: /Cari beasiswa/i }).tap();
    await screen.getByText('Pencarian gagal.', { exact: true }).waitFor();
    await screen.getByRole('link', 'Riwayat').tap();
    const failed = browser.locator('tr').filter({ hasText: 'simulasi gagal' });

    await failed.getByRole('button', 'Hapus').tap();

    await expect(failed).toHaveCount(0);
  });

  test('disables a private source URL from older saved data', async ({ app, screen, browser }) => {
    await browser.route('**/api/saved', (route) => route.fulfill({ json: {
      saved: [
        { id: 'old-private', name: 'Sumber lama', url: 'http://127.0.0.1/document', score: 72 },
        { id: 'old-public', name: 'Sumber publik', url: 'https://example.com/program#syarat', score: 81 },
      ],
    } }));

    await app.open('/#/tersimpan');

    const privateCard = browser.locator('article').filter({ hasText: 'Sumber lama' });
    const publicCard = browser.locator('article').filter({ hasText: 'Sumber publik' });
    await expect(privateCard.getByText(/tautan tidak tersedia/)).toBeVisible();
    await expect(privateCard.getByRole('link')).toHaveCount(0);
    await expect(publicCard.getByRole('link')).toHaveAttribute('href', 'https://example.com/program#syarat');
  });
});
