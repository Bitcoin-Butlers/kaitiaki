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
    await expect(page.locator('h1')).toContainText('Kaitiaki');

    // Key sections
    await expect(page.locator('.intro')).toBeVisible();
    await expect(page.locator('.how-it-works')).toBeVisible();
    await expect(page.locator('.what-is')).toBeVisible();
    await expect(page.locator('.try-it')).toBeVisible();
    await expect(page.locator('.trust')).toBeVisible();
    await expect(page.locator('.background')).toBeVisible();
  });

  test('language picker is present', async ({ page }) => {
    await page.goto('file://' + indexPath);

    const langSelect = page.locator('#lang-select');
    await expect(langSelect).toBeVisible();

    // Should have multiple options
    const options = langSelect.locator('option');
    expect(await options.count()).toBeGreaterThan(1);

    // English should be available
    await expect(langSelect.locator('option[value="en"]')).toBeAttached();
    // Te reo Māori should be available
    await expect(langSelect.locator('option[value="mi"]')).toBeAttached();
  });

  test('language picker switches text to te reo Māori', async ({ page }) => {
    await page.goto('file://' + indexPath);

    // Start with English content
    await expect(page.locator('.how-it-works h2')).toContainText('How it works');

    // Switch to te reo Māori
    await page.locator('#lang-select').selectOption('mi');

    // Text should be in te reo Māori
    await expect(page.locator('.how-it-works h2')).toContainText('Me pēhea te mahi');
    await expect(page.locator('.what-is h2')).toContainText('He aha tēnei, he aha hoki ehara');
    await expect(page.locator('.try-it h2')).toContainText('Kia kite me pēhea te mahi');
    await expect(page.locator('.background h2')).toContainText('He aha au i hanga ai i tēnei');
  });

  test('language preference persists via localStorage', async ({ page }) => {
    await page.goto('file://' + indexPath);

    // Switch to te reo Māori
    await page.locator('#lang-select').selectOption('mi');
    await expect(page.locator('.how-it-works h2')).toContainText('Me pēhea te mahi');

    // Reload the page
    await page.reload();

    // Should still be in te reo Māori
    await expect(page.locator('#lang-select')).toHaveValue('mi');
    await expect(page.locator('.how-it-works h2')).toContainText('Me pēhea te mahi');
  });

  test('switching back to English works', async ({ page }) => {
    await page.goto('file://' + indexPath);

    // Switch to te reo Māori then back to English
    await page.locator('#lang-select').selectOption('mi');
    await expect(page.locator('.how-it-works h2')).toContainText('Me pēhea te mahi');

    await page.locator('#lang-select').selectOption('en');
    await expect(page.locator('.how-it-works h2')).toContainText('How it works');
  });

  test('HTML content in translations renders correctly', async ({ page }) => {
    await page.goto('file://' + indexPath);

    // Switch to te reo Māori
    await page.locator('#lang-select').selectOption('mi');

    // Elements with data-i18n-html should render HTML (strong tags, spans)
    const summary = page.locator('[data-i18n-html="summary_1"]');
    const strong = summary.locator('strong');
    await expect(strong.first()).toBeAttached();
  });

  test('footer links are present', async ({ page }) => {
    await page.goto('file://' + indexPath);

    const footer = page.locator('#footer');
    await expect(footer).toBeVisible();
    await expect(footer.locator('a')).not.toHaveCount(0);
  });
});
