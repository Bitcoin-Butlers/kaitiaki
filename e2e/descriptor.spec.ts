import { test, expect } from './fixtures';
import * as fs from 'fs';
import { getInheritanceBin, getDescriptorHtml } from './helpers';
import vector from '../internal/html/assets/src/crypto/testdata/descriptor-vector.json';

/**
 * The descriptor page, as an heir drives it.
 *
 * The page used to make backups as well as read them. Making one moved to
 * Create Bundles, so this file covers only what is left: somebody with a
 * backup and the wallet's keys, getting the descriptor back.
 *
 * The crypto itself is covered by `make test` in internal/descriptorbackup and
 * by `make test-xlang`, which proves Go and TypeScript open each other's
 * backups. What these tests prove is that the page wires it up: the right keys
 * open it, the wrong ones do not, and a mistyped transaction id is refused
 * before anybody is asked for it.
 *
 * They use the PUBLISHED vector, so they read the same bytes that sit on
 * mainnet at block 966450 rather than something made moments earlier.
 */
test.describe('Descriptor page', () => {
  let pagePath: string;

  test.beforeAll(async () => {
    if (!fs.existsSync(getInheritanceBin())) {
      test.skip();
      return;
    }
    pagePath = getDescriptorHtml();
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('file://' + pagePath);
  });

  test('is a reading page now, and says where to make one', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Read a Descriptor Backup');
    // The protect half is gone, not hidden.
    await expect(page.locator('#panel-protect')).toHaveCount(0);
    await expect(page.locator('.mode-tab')).toHaveCount(0);
    // Somebody who wanted to make one must be told where to go, in the page
    // itself and not only in the nav that is on every page.
    await expect(page.locator('.page-intro a[href="maker.html"]')).toBeVisible();
  });

  test('threshold backup: two keys open it, one key does not', async ({ page }) => {
    await page.fill('#recover-input', vector.encryptedText);

    // One key alone, where this backup needs two.
    await page.fill('#xpubs-input', vector.xpubs[0]);
    await page.click('#recover-btn');
    await expect(page.locator('#recover-output')).toBeHidden();

    // Two of the three, and it opens.
    await page.fill('#xpubs-input', `${vector.xpubs[0]}\n${vector.xpubs[2]}`);
    await page.click('#recover-btn');
    await expect(page.locator('#recover-output')).toBeVisible();
    expect(await page.locator('#recover-output').inputValue()).toBe(vector.descriptor);
  });

  test('a stranger key opens nothing', async ({ page }) => {
    await page.fill('#recover-input', vector.encryptedText);
    // A well-formed key from another wallet.
    await page.fill(
      '#xpubs-input',
      'xpub661MyMwAqRbcFtXgS5sYJABqqG9YLmC4Q1Rdap9gSE8NqtwybGhePY2gZ29ESFjqJoCu1Rupje8YtGqsefD265TMg7usUDFdp6W1EGMcet8'
    );
    await page.click('#recover-btn');
    await expect(page.locator('#recover-output')).toBeHidden();
  });

  test('fetching by transaction id validates the id before asking anyone', async ({ page }) => {
    // Nothing may leave the machine for an id that cannot be real.
    let requests = 0;
    await page.route('**/*', (route) => {
      if (!route.request().url().startsWith('file://')) requests++;
      return route.request().url().startsWith('file://') ? route.continue() : route.abort();
    });

    await page.check('input[name="source"][value="txid"]');
    await page.fill('#txid-input', 'not-a-transaction-id');
    await page.click('#fetch-btn');
    await page.waitForTimeout(300);
    expect(requests).toBe(0);
  });
});
