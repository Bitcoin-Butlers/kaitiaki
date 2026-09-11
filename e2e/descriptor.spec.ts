import { test, expect } from './fixtures';
import * as fs from 'fs';
import { getRememoryBin, getDescriptorHtml } from './helpers';
import vector from '../internal/html/assets/src/crypto/testdata/descriptor-vector.json';

/**
 * The descriptor backup page, driven the way a client and an heir drive it.
 *
 * The crypto is covered by `make test-ts`. What these tests prove is that the
 * page wires it up correctly: what comes out of the protect step is what the
 * recover step can open, with the right keys and not with the wrong ones.
 */
test.describe('Descriptor Backup page', () => {
  let pagePath: string;

  test.beforeAll(async () => {
    if (!fs.existsSync(getRememoryBin())) {
      test.skip();
      return;
    }
    pagePath = getDescriptorHtml();
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('file://' + pagePath);
  });

  test('loads with both panels and the protect step first', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Descriptor Backup');
    await expect(page.locator('#panel-protect')).toBeVisible();
    await expect(page.locator('#panel-recover')).toBeHidden();
    // Every page in this fork links home.
    await expect(page.locator('.site-nav a', { hasText: 'Bitcoin Butlers' })).toHaveAttribute(
      'href',
      /bitcoinbutlers\.com/
    );
  });

  test('reads the shape of a descriptor as it is typed', async ({ page }) => {
    await page.fill('#descriptor-input', vector.descriptor);
    const summary = page.locator('#descriptor-summary');
    await expect(summary).toBeVisible();
    await expect(summary).toContainText('2 of 3');
    // The fingerprint belongs to the key, not to the path, so it must not
    // appear glued to the front of the derivation.
    await expect(summary).toContainText("Derivation 48h/0h/0h/2h.");
    for (const xfp of vector.xfps) {
      await expect(summary).not.toContainText(xfp);
    }
  });

  test('threshold backup: two keys open it, one key does not', async ({ page }) => {
    await page.fill('#descriptor-input', vector.descriptor);
    await page.click('#protect-btn');

    const output = page.locator('#protect-output');
    await expect(output).toBeVisible();
    const text = await output.inputValue();
    expect(text.startsWith('wsh(sortedmulti(2,')).toBe(true);
    for (const xpub of vector.xpubs) {
      expect(text).not.toContain(xpub);
    }
    await expect(page.locator('#protect-meta')).toContainText('Any 2 of your 3 keys');
    await expect(page.locator('#core-command')).toContainText('bitcoin-cli');

    // Now recover it, the way an heir would.
    await page.click('.mode-tab[data-panel="recover"]');
    await page.fill('#recover-input', text);
    await expect(page.locator('#recover-summary')).toContainText('2 of 3');

    await page.fill('#xpubs-input', vector.xpubs[0]);
    await page.click('#recover-btn');
    await expect(page.locator('#recover-error')).toContainText('not enough');

    await page.fill('#xpubs-input', `${vector.xpubs[0]}\n${vector.xpubs[2]}`);
    await page.click('#recover-btn');
    await expect(page.locator('#recover-output')).toHaveValue(vector.descriptor);
    await expect(page.locator('#recover-detail')).toContainText('2 of the 2 keys');
  });

  test('one-key backup: any single key opens it', async ({ page }) => {
    await page.fill('#descriptor-input', vector.descriptor);
    await page.check('input[name="scheme"][value="any"]');
    await page.click('#protect-btn');

    const text = await page.locator('#protect-output').inputValue();
    // A BIP-138 backup in base64 starts with the letters BIP138 encoded.
    expect(text.startsWith('QklQMTM4')).toBe(true);
    await expect(page.locator('#protect-meta')).toContainText('Any one of your keys');

    await page.click('.mode-tab[data-panel="recover"]');
    await page.fill('#recover-input', text);
    await expect(page.locator('#recover-summary')).toContainText('one-key backup');

    await page.fill('#xpubs-input', vector.xpubs[1]);
    await page.click('#recover-btn');
    await expect(page.locator('#recover-output')).toHaveValue(vector.descriptor);
  });

  test('a stranger key opens nothing', async ({ page }) => {
    await page.fill('#descriptor-input', vector.descriptor);
    await page.click('#protect-btn');
    const text = await page.locator('#protect-output').inputValue();

    await page.click('.mode-tab[data-panel="recover"]');
    await page.fill('#recover-input', text);
    await page.fill(
      '#xpubs-input',
      'xpub6BosfCnifzxcFwrSzQiqu2DBVTshkCXacvNsWGYJVVhhawA7d4R5WSWGFNbi8Aw6ZRc1brxMyWMzG3DSSSSoekkudhUd9yLb6qx39T9nMdj'
    );
    await page.click('#recover-btn');
    await expect(page.locator('#recover-error')).toBeVisible();
    await expect(page.locator('#recover-output')).toBeHidden();
  });

  test('the protect step refuses an empty descriptor and a taproot one', async ({ page }) => {
    await page.click('#protect-btn');
    await expect(page.locator('#protect-error')).toContainText('Paste your descriptor');

    await page.fill('#descriptor-input', 'tr(xpub661MyMwAqRbcFtXgS5sYJABqqG9YLmC4Q1Rdap9gSE8NqtwybGhePY2gZ29ESFjqJoCu1Rupje8YtGqsefD265TMg7usUDFdp6W1EGMcet8/0/*)');
    await page.click('#protect-btn');
    await expect(page.locator('#protect-error')).toContainText('Taproot');
  });

  test('fetching by transaction id validates the id before asking anyone', async ({ page }) => {
    await page.click('.mode-tab[data-panel="recover"]');
    await page.check('input[name="source"][value="txid"]');
    await expect(page.locator('#source-txid')).toBeVisible();
    await page.fill('#txid-input', 'not-a-txid');
    await page.click('#fetch-btn');
    await expect(page.locator('#fetch-status')).toContainText('64 hexadecimal characters');
  });
});
