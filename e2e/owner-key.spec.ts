import { test, expect } from './fixtures';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import AdmZip from 'adm-zip';
import { getRememoryBin, CreationPage, RecoveryPage, generateStandaloneHTML } from './helpers';

// Test vector from docs/owner-key-vector.md (public, never for real use)
const OWNER_RECIPIENT =
  'age17pv0xledcth6mtfpgmtaxc3gahxdkt5ad79cxwxtgj966kqxq9fs3m8ced';
const OWNER_IDENTITY =
  'AGE-SECRET-KEY-1E3PUXA5R3R9Y3R9DPTF57F8HD4YXL7DNWWGUJMRMTFWNARP3KQFSJ2M754';
// Valid bech32 shape, wrong key
const WRONG_IDENTITY =
  'AGE-SECRET-KEY-1GFPYYSJZGFPYYSJZGFPYYSJZGFPYYSJZGFPYYSJZGFPYYSJZGFPQ4EGAEX';

test.describe('Owner Key', () => {
  let htmlPath: string;
  let tmpDir: string;

  test.beforeAll(async () => {
    const bin = getRememoryBin();
    if (!fs.existsSync(bin)) {
      test.skip();
      return;
    }
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rememory-owner-e2e-'));
    htmlPath = generateStandaloneHTML(tmpDir, 'create');
  });

  test.afterAll(async () => {
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  async function createBundlesWithOwner(page: any, prefix: string): Promise<string> {
    const creation = new CreationPage(page, htmlPath);
    await creation.open();
    await creation.setFriend(0, 'Alice', 'alice@test.com');
    await creation.setFriend(1, 'Bob', 'bob@test.com');
    const testFiles = creation.createTestFiles(tmpDir, prefix);
    await creation.addFiles(testFiles);

    await page.locator('.owner-key-section summary').click();
    await page.locator('#owner-recipient').fill(OWNER_RECIPIENT);

    await creation.generate();
    await creation.expectGenerationComplete();
    await creation.expectBundleCount(2);

    const bundlesDir = path.join(tmpDir, `${prefix}-bundles`);
    fs.mkdirSync(bundlesDir, { recursive: true });
    for (const [i, name] of ['alice', 'bob'].entries()) {
      const data = await creation.downloadBundle(i);
      expect(data).toBeTruthy();
      const zipPath = path.join(bundlesDir, `bundle-${name}.zip`);
      fs.writeFileSync(zipPath, data!);
      new AdmZip(zipPath).extractAllTo(path.join(bundlesDir, name), true);
    }
    return bundlesDir;
  }

  test('bundles carry OWNER.age and the save link appears', async ({ page }, testInfo) => {
    testInfo.setTimeout(120000);
    const bundlesDir = await createBundlesWithOwner(page, 'carry');

    await expect(page.locator('#download-owner-btn')).toBeVisible();

    for (const name of ['alice', 'bob']) {
      const ownerPath = path.join(bundlesDir, name, 'OWNER.age');
      expect(fs.existsSync(ownerPath)).toBe(true);
      const content = fs.readFileSync(ownerPath, 'utf8');
      expect(content.startsWith('-----BEGIN AGE ENCRYPTED FILE-----')).toBe(true);
    }

    // Guardian README explains the extra file
    const readme = fs.readFileSync(
      path.join(bundlesDir, 'alice', 'README.txt'), 'utf8');
    expect(readme).toContain('OWNER.age');
  });

  test('owner recovers alone with one bundle and the owner key', async ({ page }, testInfo) => {
    testInfo.setTimeout(120000);
    const bundlesDir = await createBundlesWithOwner(page, 'solo');

    // Alice's recover.html has 1 share of a 2-of-2 scheme: below threshold
    const recovery = new RecoveryPage(page, path.join(bundlesDir, 'alice'));
    await recovery.open();
    await recovery.expectShareCount(1);

    await page.locator('#owner-section summary').click();
    await page.locator('#owner-identity').fill(OWNER_IDENTITY);

    await expect(page.locator('#status-message')).toContainText('ready', { timeout: 60000 });
    await expect(page.locator('#files-list')).toContainText('secret');
  });

  test('a wrong owner key of valid shape fails with a clear message', async ({ page }, testInfo) => {
    testInfo.setTimeout(120000);
    const bundlesDir = await createBundlesWithOwner(page, 'wrongkey');

    const recovery = new RecoveryPage(page, path.join(bundlesDir, 'alice'));
    await recovery.open();
    await recovery.expectShareCount(1);

    await page.locator('#owner-section summary').click();
    await page.locator('#owner-identity').fill(WRONG_IDENTITY);

    await expect(page.getByText('does not open OWNER.age').first()).toBeVisible({ timeout: 60000 });
  });

  test('guardians recover exactly as before, owner field untouched', async ({ page }, testInfo) => {
    testInfo.setTimeout(120000);
    const bundlesDir = await createBundlesWithOwner(page, 'guardian');

    const recovery = new RecoveryPage(page, path.join(bundlesDir, 'alice'));
    await recovery.open();
    await recovery.expectShareCount(1);

    // Add Bob's share from his README
    const bobReadme = path.join(bundlesDir, 'bob', 'README.txt');
    await page.locator('#share-file-input').setInputFiles([bobReadme]);

    await expect(page.locator('#status-message')).toContainText('ready', { timeout: 60000 });
    await expect(page.locator('#files-list')).toContainText('secret');
  });

  test('an invalid owner recipient fails bundle creation loudly', async ({ page }, testInfo) => {
    testInfo.setTimeout(120000);
    const creation = new CreationPage(page, htmlPath);
    await creation.open();
    await creation.setFriend(0, 'Alice');
    await creation.setFriend(1, 'Bob');
    await creation.addFiles(creation.createTestFiles(tmpDir, 'badrecipient'));

    await page.locator('.owner-key-section summary').click();
    await page.locator('#owner-recipient').fill('age1notakey');

    await creation.generate();
    await expect(page.locator('#status-message')).toContainText('invalid owner recipient', { timeout: 60000 });
  });
});
