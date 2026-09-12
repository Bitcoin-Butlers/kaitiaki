import { test, expect } from './fixtures';
import * as fs from 'fs';
import { getRememoryBin, getIndexHtml } from './helpers';

test.describe('Landing Page', () => {
  let indexPath: string;

  test.beforeAll(async () => {
    if (!fs.existsSync(getRememoryBin())) {
      test.skip();
      return;
    }
    indexPath = getIndexHtml();
  });

  test('index.html loads with key sections', async ({ page }) => {
    await page.goto('file://' + indexPath);

    // Main heading
    await expect(page.locator('h1')).toContainText('Bitcoin Inheritance');

    // Key sections
    await expect(page.locator('.intro')).toBeVisible();
    await expect(page.locator('.how-it-works')).toBeVisible();
    await expect(page.locator('.what-is')).toBeVisible();
    await expect(page.locator('.try-it')).toBeVisible();
    await expect(page.locator('.trust')).toBeVisible();
    await expect(page.locator('.background')).toBeVisible();
  });

  test('landing shows the shared nav with a link back to Bitcoin Butlers', async ({ page }) => {
    await page.goto('file://' + indexPath);

    const nav = page.locator('.site-nav');
    await expect(nav).toBeVisible();
    await expect(nav.locator('a', { hasText: 'Bitcoin Butlers' })).toHaveAttribute('href', /bitcoinbutlers\.com/);
    // The landing page is the About page, so the About link is dropped.
    await expect(nav.locator('.nav-links a[href="about.html"]')).toHaveCount(0);
  });

  test('no language picker is present', async ({ page }) => {
    await page.goto('file://' + indexPath);
    await expect(page.locator('#lang-select')).toHaveCount(0);
  });

  test('footer links are present', async ({ page }) => {
    await page.goto('file://' + indexPath);

    const footer = page.locator('#footer');
    await expect(footer).toBeVisible();
    await expect(footer.locator('a')).not.toHaveCount(0);
  });
});
