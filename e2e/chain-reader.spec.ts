import { test, expect } from './fixtures';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import AdmZip from 'adm-zip';
import { execFileSync } from 'child_process';
import { getInheritanceBin, generateStandaloneHTML } from './helpers';

/**
 * The chain copy is the second way in. An heir holding one bundle and one of
 * the wallet's own keys must be able to read the wallet's instructions with no
 * other guardian, no internet, and nothing of ours alive.
 *
 * These tests open recover.html from a file:// URL and block every network
 * request, so a page that quietly depends on the network fails here.
 */
test.describe('Chain copy reader', () => {
  let htmlPath: string;
  let tmpDir: string;

  // The published mainnet vector. Its transaction is at block 966450, and
  // these are the same bytes docs/descriptor-backup-vector.md publishes.
  const thresholdText =
    'wsh(sortedmulti(2,[48h/0h/0h/2h]<0;1>/*,[48h/0h/0h/2h]<0;1>/*,[48h/0h/0h/2h]<0;1>/*))' +
    'CCQDZ+maZ+y+OQ3xN/t/RZCLXHg0rDBPAPxLFXpWi+D8rqeGVJ+QlP/v3vh84/7D71chAqsOuYfY72DZ7rC7ObyBg9YPUbUgXmW66Jn6iIbr4t39jhDoCVGG0a29hLZ5W9qzH9/HrHyt+BXgawtDuAl/E5Q4F+ZfORyTT+cZOTnND2uQQ6MVPUTOhyII4ixLC/y4ESC9EjzU4nTjtjTTdsijdeFRICvQY5dePPA5ZhqevBwi2OBkmV/FgPJichRTkIl7+vjbuWKwd7ylbnqK8q1L3v/yCtFzohW9rXEoBZGVKI63kdiDjHtNyaeTZ3eurWwihnPtAYsBhvxgpoM/9p2iU/11IpSTqkWc41MeO0mMIDXEi8TsoCzBLc8kqn+9HaVpJxoXovivKh70SuzUQXcMtRU9GLgiE+TI3HG5oNP50zeAwpbZLHXDDetqL5dIt//lNdXEWciU';

  const xpubs = [
    'xpub6DkFAXWQ2dHxq2vatrt9qyA3bXYU4ToWQwCHbf5XB2mSTexcHZCeKS1VZYcPoBd5X8yVcbXFHJR9R8UCVpt82VX1VhR28mCyxUFL4r6KFrf',
    'xpub6FQya7zGhR92kacYsNnjreouvnHJMpXYsUXnW6NJJAJRCKsa26TzDy4LdnGhEurr3d6y1J8PJ7EEMKQp74XTqYvmGJNogYXSKDszYHtF8mX',
    'xpub6DnEBNkSJKBYQmsbhS1sP9cNdtU5c9PLFGCjTJmxicxc13WB8zNNGQazabQpyFAGW5bV9tMko4uBxDxjUKL6dSAcx1tEbgEHtgSqyRsekh6',
  ];

  test.beforeAll(() => {
    if (!fs.existsSync(getInheritanceBin())) {
      test.skip();
      return;
    }
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chain-reader-'));
    htmlPath = generateStandaloneHTML(tmpDir, 'recover');
  });

  test.afterAll(() => {
    if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('reads a threshold backup offline, with two of three keys', async ({ page }) => {
    // Nothing may reach the network. A bundle opened in twenty years will not
    // have one.
    await page.route('**/*', (route) =>
      route.request().url().startsWith('file://') ? route.continue() : route.abort()
    );
    await page.goto(`file://${htmlPath}`);

    await page.locator('#chain-reader').evaluate((el: HTMLDetailsElement) => { el.open = true; });
    await page.fill('#chain-payload', thresholdText);
    await page.fill('#chain-keys', `${xpubs[0]}\n${xpubs[2]}`);
    await page.click('#chain-btn');

    const out = page.locator('#chain-output');
    await expect(out).toBeVisible();
    const descriptor = await out.inputValue();
    expect(descriptor).toContain('73c5da0a');
    expect(descriptor).toContain('b8688df1');
    expect(descriptor).toContain('28645006');
  });

  /**
   * Which copy wins.
   *
   * The chain copy cannot be rewritten, so an owner who revises their
   * instructions leaves an older copy on the chain for good. An heir holding
   * a bundle AND a chain copy that disagree needs a rule, and the rule is the
   * bundle. Decided 2026-09-23.
   *
   * The line appears only after a successful read: an heir holding one copy
   * has nothing to reconcile, and telling them about a conflict they do not
   * have is noise at the worst possible moment.
   */
  test('names the bundle as the copy to trust, only once a copy is read', async ({ page }) => {
    await page.route('**/*', (route) =>
      route.request().url().startsWith('file://') ? route.continue() : route.abort()
    );
    await page.goto(`file://${htmlPath}`);
    await page.locator('#chain-reader').evaluate((el: HTMLDetailsElement) => { el.open = true; });

    // The standing warning is there before anything is read.
    await expect(page.locator('[data-i18n="chain_may_be_older"]')).toBeVisible();
    // The reconciliation line is not.
    await expect(page.locator('#chain-trust')).toBeHidden();

    await page.fill('#chain-payload', thresholdText);
    await page.fill('#chain-keys', `${xpubs[0]}\n${xpubs[2]}`);
    await page.click('#chain-btn');

    await expect(page.locator('#chain-output')).toBeVisible();
    await expect(page.locator('#chain-trust')).toBeVisible();
    await expect(page.locator('#chain-trust')).toContainText('use your bundle');

    // A failed read must not leave the line standing over nothing.
    await page.fill('#chain-keys', 'xpub-that-is-not-a-key');
    await page.click('#chain-btn');
    await expect(page.locator('#chain-trust')).toBeHidden();
  });


  // A BIP-138 backup, made by the Go implementation. Any ONE key opens it,
  // which is the difference a client hears about in the placement session.
  const bip138Text =
    'QklQMTM4AQAFLr8hjVQ5qqHdxyiEOfHcVsZlnWdFBZR9xHmWCtp4tWJaR5/Cbp/DWykbBs37bRC+vp1ToWylanVO6uQDWu1x45/taF28lFxuwUKt3hmq5YasCTz1fxRUnANNnssRCOf00cg8WqSKA1PbeolnJQbVy97ikTTCyTTdKgQYn/2C7/napS9kgdiVSkXkgKT+WdBv/zade3Vo1gUKHyv8CE2JgAFPrSBQu9z6+UWgPeL91gG4TJBM1DTmZKr0p6ORm04ZwSdGC3wiRyUbDB5JjwCC22Mnx6hKa9zsPdAFGxUahgNPmWVc14/nGxXiCaGyggmHG3VKu1tK2GpQqbdcSS3b9ly1S68Poj+Mlxpay9PAS2Z8lNbWIuuqUpQ0XpWRu3fn1zfA1XPqfz50/jL0us093r9WCdinuZFq0Wn10zjQD4PM0tjgWiEosLQad6g5BPQWrjDPi8eCMh66y4zi1I5+DKDHhUTeq29428RG2CysFMaj7PlthJ/BBtMhhqOjvQGPU3m2V2aUWoh31bvlLuMJIRn/oKwNXnQtQyOFejye7kTK8lKE3ZTNIQakiS1BFInRkDZzd6zfCE/YppG1o07zTv+GHJl7ys0EA/b7gy/2KRrN8uwLJeVNmz9y2dOpzAo7TzF/BdhParVQb1fqq75spBvsPkcju3XTRd/I7nLRaA7bpXDr5YzNBx/X65bii/mZkGquiocw8OF368t8J3M4YPnRaFC7Lq5dP+IpKgN2fgIOGae+OGA5XxD9xMS531LAOYn2urbrcATvm8wraJlH00gdTNMZss8fUSw0kH5ovtH6YR24MFiUrzCXoa98+x9ohLDaJsZ1h2PSCh/uwIozIJ5+lO87gA==';

  test('reads a BIP-138 backup offline, with one key', async ({ page }) => {
    await page.route('**/*', (route) =>
      route.request().url().startsWith('file://') ? route.continue() : route.abort()
    );
    await page.goto(`file://${htmlPath}`);

    await page.locator('#chain-reader').evaluate((el: HTMLDetailsElement) => { el.open = true; });
    await page.fill('#chain-payload', bip138Text);
    // The middle key alone. A threshold backup would refuse this.
    await page.fill('#chain-keys', xpubs[1]);
    await page.click('#chain-btn');

    const out = page.locator('#chain-output');
    await expect(out).toBeVisible();
    expect(await out.inputValue()).toContain('73c5da0a');
  });

  test('says the keys are wrong rather than blaming the text', async ({ page }) => {
    await page.route('**/*', (route) =>
      route.request().url().startsWith('file://') ? route.continue() : route.abort()
    );
    await page.goto(`file://${htmlPath}`);

    await page.locator('#chain-reader').evaluate((el: HTMLDetailsElement) => { el.open = true; });
    await page.fill('#chain-payload', thresholdText);
    // One key, where this backup needs two.
    await page.fill('#chain-keys', xpubs[0]);
    await page.click('#chain-btn');

    await expect(page.locator('#chain-output')).toBeHidden();
    await expect(page.locator('#chain-status')).toContainText(/keys/i);
  });

  test('offers itself when the heir cannot gather enough guardians', async ({ page }) => {
    // The heir this exists for: one bundle, not enough pieces. They must not
    // have to find a collapsed panel underneath a dead end.
    const projectDir = path.join(tmpDir, 'stall');
    const bin = getInheritanceBin();
    execFileSync(bin, ['demo', projectDir], { stdio: 'ignore' });

    const bundlesDir = path.join(projectDir, 'output', 'bundles');
    const oneBundle = path.join(tmpDir, 'one');
    fs.mkdirSync(oneBundle, { recursive: true });
    new AdmZip(path.join(bundlesDir, 'bundle-alice.zip')).extractAllTo(oneBundle, true);

    await page.goto(`file://${path.join(oneBundle, 'recover.html')}`);

    // Closed to begin with.
    await expect(page.locator('#chain-reader')).not.toHaveAttribute('open', /.*/);

    // Add a second guardian's piece. The demo needs three, so this stalls.
    const second = path.join(tmpDir, 'two');
    fs.mkdirSync(second, { recursive: true });
    new AdmZip(path.join(bundlesDir, 'bundle-bob.zip')).extractAllTo(second, true);
    await page.locator('#share-file-input').setInputFiles(path.join(second, 'README.txt'));
    await expect(page.locator('#chain-reader')).toHaveAttribute('open', /.*/);
    await expect(page.locator('#chain-nudge')).toBeVisible();
  });

  test('says the text is wrong when the text is wrong', async ({ page }) => {
    await page.route('**/*', (route) =>
      route.request().url().startsWith('file://') ? route.continue() : route.abort()
    );
    await page.goto(`file://${htmlPath}`);

    await page.locator('#chain-reader').evaluate((el: HTMLDetailsElement) => { el.open = true; });
    await page.fill('#chain-payload', '');
    await page.fill('#chain-keys', xpubs[0]);
    await page.click('#chain-btn');

    await expect(page.locator('#chain-status')).toContainText(/backup|missing/i);
  });
});
