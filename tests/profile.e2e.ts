import { describe, test } from '@e2e-dev/web';
import { expect } from 'e2e';

describe('Profil Beasiswa', () => {
  test('autofills profile fields from a local PDF', async ({ app, screen, browser }) => {
    await app.open('/#/profil');
    await screen.getByRole('button', 'Upload CV (PDF)').waitFor();

    await browser.locator('#cvfile').setInputFiles('contoh-cv.pdf');

    await expect(browser.locator('#cvstatus')).toContainText('kolom terisi dari CV');
    await expect(screen.getByLabel('Program studi')).toHaveValue('Teknik Elektro');
    await expect(browser.locator('[name=ipk]')).toHaveValue('3.62');
    await expect(browser.locator('[name=prestasi]')).toHaveValue(/Juara/i);
  });

  test('keeps the form available after an unreadable CV', async ({ app, screen, browser }) => {
    await app.open('/#/profil');
    await screen.getByRole('button', 'Upload CV (PDF)').waitFor();

    await browser.locator('#cvfile').setInputFiles({
      name: 'cv.txt', mimeType: 'text/plain', buffer: Buffer.from('CV contoh dalam format teks'),
    });

    await expect(browser.locator('#cvstatus')).toContainText('File harus PDF.');
    await expect(screen.getByRole('button', 'Upload CV (PDF)')).toBeEnabled();
  });

  test('renders stored profile text literally after saving', async ({ app, screen, browser }) => {
    await app.open('/#/profil');
    const major = 'Teknik <Energi> & "Sistem"';
    await screen.getByLabel('Program studi').fill(major);
    await browser.locator('[name=ipk]').fill('3.62');
    await screen.getByLabel('Semester').fill('7');
    await browser.locator('[name=skor_bahasa]').fill('6');

    await screen.getByRole('button', 'Simpan profil').tap();

    await expect(screen.getByRole('heading', { name: 'Cari Beasiswa' })).toBeVisible();
    await expect(screen.getByText(major, { exact: false })).toBeVisible();
  });
});
