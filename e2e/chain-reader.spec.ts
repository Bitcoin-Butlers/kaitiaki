import { test, expect } from './fixtures';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { getRememoryBin, generateStandaloneHTML } from './helpers';

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
    if (!fs.existsSync(getRememoryBin())) {
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
