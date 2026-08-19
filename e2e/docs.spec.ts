import { test, expect } from './fixtures';
import * as fs from 'fs';
import { getRememoryBin, getDocsHtml, getDocsMiHtml } from './helpers';

test.describe('Documentation Page', () => {
  let docsPath: string;
  let docsMiPath: string;

  test.beforeAll(async () => {
    if (!fs.existsSync(getRememoryBin())) {
      test.skip();
      return;
    }
    docsPath = getDocsHtml();
    docsMiPath = getDocsMiHtml();
  });

  test('docs.html loads with TOC and sections', async ({ page }) => {
    await page.goto('file://' + docsPath);

    // Page title
    await expect(page).toHaveTitle(/Kaitiaki Guide/);

    // TOC sidebar is visible
    const toc = page.locator('.toc');
    await expect(toc).toBeVisible();

    // TOC has entries
    const tocLinks = toc.locator('a');
    expect(await tocLinks.count()).toBeGreaterThan(10);

    // Key sections exist
    await expect(page.locator('section#overview')).toBeAttached();
    await expect(page.locator('section#creating')).toBeAttached();
    await expect(page.locator('section#recovering')).toBeAttached();
    await expect(page.locator('section#security')).toBeAttached();
    await expect(page.locator('section#timelock')).toBeAttached();
  });

  test('TOC links navigate to sections', async ({ page }) => {
    await page.goto('file://' + docsPath);

    // Click on a TOC link
    await page.locator('.toc a[href="#recovering"]').click();

    // The section should be scrolled into view
    await expect(page.locator('section#recovering')).toBeInViewport();
  });

  test('section anchors work via URL hash', async ({ page }) => {
    await page.goto('file://' + docsPath + '#security');

    // The section should exist
    await expect(page.locator('section#security')).toBeAttached();
  });

  test('scroll spy highlights active TOC item', async ({ page }) => {
    await page.goto('file://' + docsPath);

    // Scroll to the recovering section
    await page.locator('section#recovering').scrollIntoViewIfNeeded();
    await page.waitForTimeout(200); // Wait for scroll spy

    // The recovering TOC link should be active
    const activeLink = page.locator('.toc a.active');
    await expect(activeLink).toBeAttached();
  });

  test('docs.mi.html loads with te reo Māori content', async ({ page }) => {
    await page.goto('file://' + docsMiPath);

    // Page should have te reo Māori lang attribute
    await expect(page.locator('html')).toHaveAttribute('lang', 'mi');

    // Page title should be in te reo Māori
    await expect(page).toHaveTitle(/Te Aratohu Kaitiaki/);

    // Nav should have te reo Māori text
    await expect(page.locator('.docs-nav')).toContainText('Waihanga Paihere');

    // TOC should be in te reo Māori
    await expect(page.locator('.toc h2')).toContainText('Ngā Kaupapa');

    // Content sections should exist with same IDs
    await expect(page.locator('section#overview')).toBeAttached();
    await expect(page.locator('section#creating')).toBeAttached();

    // Footer should be in te reo Māori
    await expect(page.locator('.docs-footer')).toContainText('Pūtake Waehere');
  });

  test('nav links are present and correct', async ({ page }) => {
    await page.goto('file://' + docsPath);

    const nav = page.locator('.docs-nav');
    await expect(nav.locator('a', { hasText: 'Home' })).toBeAttached();
    await expect(nav.locator('a', { hasText: 'Create Bundles' })).toBeAttached();
    await expect(nav.locator('a', { hasText: 'Recover' })).toBeAttached();
    await expect(nav.locator('a', { hasText: 'GitHub' })).toBeAttached();
  });
});
