import { describe, test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { ALL_OPPORTUNITIES } from '@beasiswa/shared';

const matches = (area: string, word = '') =>
  ALL_OPPORTUNITIES.filter((o) => o.area === area && `${o.title} ${o.note} ${o.kind}`.toLowerCase().includes(word)).length;

describe('Persiapan', () => {
  test('asks for a profile, then filters opportunities and keeps the filter in the address', async ({ app, screen, browser }) => {
    await app.open('/development');
    await expect(screen.getByText(/Isi profil dulu/)).toBeVisible();
    await expect(browser.locator('#jumlah-peluang')).toHaveText(`${ALL_OPPORTUNITIES.length} dari ${ALL_OPPORTUNITIES.length} peluang`);

    await screen.getByRole('button', 'Bahasa').tap();
    await expect(browser.locator('#jumlah-peluang')).toHaveText(`${matches('bahasa')} dari ${ALL_OPPORTUNITIES.length} peluang`);

    await screen.getByLabel('Cari').fill('jepang');
    await expect(browser.locator('#jumlah-peluang')).toHaveText(`${matches('bahasa', 'jepang')} dari ${ALL_OPPORTUNITIES.length} peluang`);

    await app.open('/development?area=bahasa&q=jepang');
    await expect(screen.getByRole('button', 'Bahasa')).toHaveAttribute('aria-pressed', 'true');
    await expect(browser.locator('#jumlah-peluang')).toHaveText(`${matches('bahasa', 'jepang')} dari ${ALL_OPPORTUNITIES.length} peluang`);
  });
});
