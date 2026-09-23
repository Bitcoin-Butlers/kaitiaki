import { test, expect } from './fixtures';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import AdmZip from 'adm-zip';
import { getRememoryBin, generateStandaloneHTML, CreationPage } from './helpers';

/**
 * The test run.
 *
 * An owner who has never seen a recovery cannot tell a good bundle from a bad
 * one, so the maker offers throwaway bundles to practise on. Two things make
 * that safe, and both are tested here rather than trusted:
 *
 *   1. A test bundle carries NONE of the owner's own material. Not their
 *      files, and not the people and places, which is the most sensitive
 *      thing they write.
 *   2. Every test bundle is stamped, so a drill can never be mistaken for the
 *      real thing.
 *
 * The nudge that offers it is an offer and never a gate. A required gate was
 * rejected while this was decided, because people fake a gate to get past it.
 */
test.describe('Test run', () => {
  let htmlPath: string;
  let tmpDir: string;

  const SECRET = 'SAFE-BEHIND-THE-PAINTING-42';

  test.beforeAll(async () => {
    const bin = getRememoryBin();
    if (!fs.existsSync(bin)) {
      test.skip();
      return;
    }
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rememory-testrun-e2e-'));
    htmlPath = generateStandaloneHTML(tmpDir, 'create');
  });

  test.afterAll(async () => {
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('offers a test run once, and never blocks Generate', async ({ page }) => {
    const creation = new CreationPage(page, htmlPath);
    await creation.open();

    await expect(page.locator('#test-nudge')).toBeVisible();
    await expect(page.locator('#test-banner')).toBeHidden();
    // The offer must never disable the real button beside it.
    await expect(page.locator('#generate-btn')).toBeEnabled();

    await page.locator('#test-nudge-btn').click();
    await expect(page.locator('#test-banner')).toBeVisible();
    await expect(page.locator('#test-nudge')).toBeHidden();

    // Said once. A reload must not offer it again.
    await page.reload();
    await expect(page.locator('#test-nudge')).toBeHidden();
    await expect(page.locator('#test-banner')).toBeHidden();
  });

  test('a test bundle is stamped and carries none of the owner material', async ({ page }) => {
    const creation = new CreationPage(page, htmlPath);
    await creation.open();

    // Something sensitive in the owner's words, so its absence is proved
    // rather than assumed.
    await page.locator('#words-keys').fill(SECRET);

    await creation.setFriend(0, 'Alice');
    await creation.setFriend(1, 'Bob');

    await page.locator('#test-nudge-btn').click();
    await expect(page.locator('#test-banner')).toBeVisible();

    // No files added on purpose: a test run brings its own sample.
    await page.locator('#generate-btn').click();
    await expect(page.locator('#bundles-list')).toBeVisible({ timeout: 120_000 });

    // The list must show the name the file will actually be saved under.
    await expect(page.locator('#bundles-list')).toContainText('TEST-bundle-alice.zip');

    const download = await Promise.all([
      page.waitForEvent('download'),
      page.locator('#bundles-list button[data-index="0"]').click(),
    ]).then(([d]) => d);

    expect(download.suggestedFilename()).toBe('TEST-bundle-alice.zip');

    const saved = path.join(tmpDir, 'downloaded.zip');
    await download.saveAs(saved);
    const zip = new AdmZip(saved);
    const entries = zip.getEntries().map((e) => e.entryName);
    const readme = zip.readAsText('README.txt');

    // Stamped where a guardian reads it first.
    expect(readme).toContain('TEST');
    // And carrying nothing of the owner's.
    expect(readme).not.toContain(SECRET);
    expect(entries).not.toContain('WHERE-THE-KEYS-ARE.txt');
    expect(zip.toBuffer().toString('latin1')).not.toContain(SECRET);
  });

  test('turning the test run off unstamps the next run, not the last one', async ({ page }) => {
    const creation = new CreationPage(page, htmlPath);
    await creation.open();

    await creation.setFriend(0, 'Alice');
    await creation.setFriend(1, 'Bob');

    await page.locator('#test-nudge-btn').click();
    await page.locator('#generate-btn').click();
    await expect(page.locator('#bundles-list')).toBeVisible({ timeout: 120_000 });

    // The stamp belongs to the bundles that exist, so turning the mode off
    // must not rename what is already made. Reading it at click time was a
    // real bug: the list said TEST and the saved file did not.
    await page.locator('#test-off-btn').click();
    await expect(page.locator('#test-banner')).toBeHidden();
    await expect(page.locator('#bundles-list')).toContainText('TEST-bundle-alice.zip');

    const download = await Promise.all([
      page.waitForEvent('download'),
      page.locator('#bundles-list button[data-index="0"]').click(),
    ]).then(([d]) => d);
    expect(download.suggestedFilename()).toBe('TEST-bundle-alice.zip');
  });
});
