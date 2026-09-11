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

  /**
   * Step 4 is the one that turns "I published something" into proof, so it is
   * worth testing both ways: it must go green on the real bytes, and it must
   * refuse loudly on anything else.
   */
  async function mockChain(page: import('@playwright/test').Page, opReturnText: string, confirmed = true) {
    const bytes = Buffer.from(opReturnText, 'utf8');
    // OP_RETURN then OP_PUSHDATA2, which is what a payload this size uses.
    const script =
      '6a4d' +
      bytes.length.toString(16).padStart(4, '0').match(/../g)!.reverse().join('') +
      bytes.toString('hex');
    // A single glob for both /api/tx/<id> and /api/tx/<id>/status. A single
    // star stops at a slash, which let the status call reach the real network.
    await page.route('**/api/tx/**', async (route) => {
      if (route.request().url().endsWith('/status')) {
        return route.fulfill({
          json: confirmed
            ? { confirmed: true, block_height: 966450, block_hash: '0000000000000000000012345' }
            : { confirmed: false },
        });
      }
      return route.fulfill({
        json: { vout: [{ scriptpubkey: script, scriptpubkey_type: 'op_return' }] },
      });
    });
  }

  const TXID = '4801ea9c10e14a5ea5c0e5e68bfe08fd2422005ea0a3a9631fead29ce910a4df';

  test('step 4 verifies the backup and writes the estate block', async ({ page }) => {
    await page.fill('#descriptor-input', vector.descriptor);
    await page.click('#protect-btn');
    const text = await page.locator('#protect-output').inputValue();

    await mockChain(page, text);
    await page.fill('#confirm-txid', TXID);
    await page.click('#confirm-btn');

    const detail = page.locator('#confirm-detail');
    await expect(detail).toContainText('gives it back exactly');
    await expect(detail).toContainText('exact bytes this page produced');
    await expect(detail).toContainText('block 966450');

    // The reader typed no keys. The descriptor they pasted carried them.
    const estate = await page.locator('#estate-block').inputValue();
    expect(estate).toContain(TXID);
    expect(estate).toContain('966450');
    expect(estate).toContain('the same number of keys it takes to spend');
  });

  test('step 4 works after a reload, with nothing left in memory', async ({ page }) => {
    // The page tells people to come back later with a transaction id. Before
    // the review this was impossible: verification compared against session
    // state, and re-encrypting drew fresh entropy, so a good backup was
    // reported as the wrong bytes.
    await page.fill('#descriptor-input', vector.descriptor);
    await page.click('#protect-btn');
    const text = await page.locator('#protect-output').inputValue();

    await page.reload();
    await expect(page.locator('#confirm-card')).toBeVisible();

    await mockChain(page, text);
    await page.fill('#descriptor-input', vector.descriptor);
    await page.fill('#confirm-txid', TXID);
    await page.click('#confirm-btn');

    await expect(page.locator('#confirm-detail')).toContainText('gives it back exactly');
    // We cannot claim these are our bytes when we never made them this visit.
    await expect(page.locator('#confirm-detail')).not.toContainText('exact bytes');
  });

  test('step 4 accepts a descriptor that carries a checksum', async ({ page }) => {
    // Sparrow exports with #checksum and the page tells people to use
    // Sparrow. Encryption drops the checksum, so a raw string comparison
    // condemned a perfectly good backup.
    const withChecksum = `${vector.descriptor}#abcdefgh`;
    await page.fill('#descriptor-input', withChecksum);
    await page.click('#protect-btn');
    const text = await page.locator('#protect-output').inputValue();

    await mockChain(page, text);
    await page.fill('#confirm-txid', TXID);
    await page.click('#confirm-btn');

    await expect(page.locator('#confirm-error')).toBeHidden();
    await expect(page.locator('#confirm-detail')).toContainText('gives it back exactly');
  });

  test('step 4 refuses when the chain holds a different wallet', async ({ page }) => {
    // Publish one wallet's backup, then ask the page to check it against a
    // different wallet. It must refuse rather than wave it through.
    await page.fill('#descriptor-input', vector.descriptor);
    await page.click('#protect-btn');
    const text = await page.locator('#protect-output').inputValue();

    await mockChain(page, text);
    const otherWallet = `wsh(sortedmulti(2,[${vector.xfps[0]}/48h/0h/0h/2h]${vector.xpubs[0]}/<0;1>/*,[${vector.xfps[1]}/48h/0h/0h/2h]${vector.xpubs[1]}/<0;1>/*))`;
    await page.fill('#descriptor-input', otherWallet);
    await page.fill('#confirm-txid', TXID);
    await page.click('#confirm-btn');

    await expect(page.locator('#confirm-error')).toContainText('did not give back the descriptor');
    await expect(page.locator('#confirm-result')).toBeHidden();
  });

  test('a half-copied backup gets a readable error, not a DOM exception', async ({ page }) => {
    await page.click('.mode-tab[data-panel="recover"]');
    await page.fill('#recover-input', 'wsh(sortedmulti(2,[48h/0h/0h/2h]<0;1>/*))NOTBASE64!!');
    await page.fill('#xpubs-input', vector.xpubs[0]);
    await page.click('#recover-btn');
    await expect(page.locator('#recover-error')).toContainText('missing');
  });

  test('step 4 says so when the transaction is still unconfirmed', async ({ page }) => {
    await page.fill('#descriptor-input', vector.descriptor);
    await page.check('input[name="scheme"][value="any"]');
    await page.click('#protect-btn');
    const text = await page.locator('#protect-output').inputValue();

    await mockChain(page, text, false);
    await page.fill('#confirm-txid', TXID);
    await page.click('#confirm-btn');

    await expect(page.locator('#confirm-detail')).toContainText('Still in the mempool');
    await expect(page.locator('#estate-block')).toHaveValue(/any one of the wallet keys/);
  });

  test('a descriptor with two multisig groups is refused outright', async ({ page }) => {
    // The fallback tool cannot open such a backup, so publishing one would
    // be permanent and useless.
    const a = vector.xpubs[0];
    const b = vector.xpubs[1];
    await page.fill(
      '#descriptor-input',
      `wsh(or_d(sortedmulti(2,${a}/<0;1>/*,${b}/<0;1>/*),and_v(v:older(65535),sortedmulti(2,${a}/<2;3>/*,${b}/<2;3>/*))))`
    );
    await page.click('#protect-btn');
    await expect(page.locator('#protect-error')).toContainText('more than one multisig group');
    await expect(page.locator('#protect-result')).toBeHidden();
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
