import { test, expect } from './fixtures';
import * as fs from 'fs';
import { execFileSync } from 'child_process';
import * as path from 'path';
import * as os from 'os';
import AdmZip from 'adm-zip';
import {
  getInheritanceBin,
  CreationPage,
  RecoveryPage,
  generateStandaloneHTML
} from './helpers';

test.describe('Browser Bundle Creation Tool', () => {
  let htmlPath: string;
  let tmpDir: string;

  test.beforeAll(async () => {
    // Skip if inheritance binary not available
    const bin = getInheritanceBin();
    if (!fs.existsSync(bin)) {
      test.skip();
      return;
    }

    // Generate standalone maker.html for testing
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'inheritance-create-e2e-'));
    htmlPath = generateStandaloneHTML(tmpDir, 'create');
  });

  test.afterAll(async () => {
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('security notes links and mode tabs are legible on the dark theme', async ({ page }) => {
    const creation = new CreationPage(page, htmlPath);
    await creation.open();

    // Links in the security notes used to fall back to the browser default blue.
    const link = page.locator('.how-secure-intro a').first();
    await expect(link).toHaveCSS('color', 'rgb(251, 220, 123)');

    // Active tabs (Simple/Advanced in step 3) used
    // to be white text on a white pill.
    const activeTabs = page.locator('.mode-tab.active');
    const count = await activeTabs.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      await expect(activeTabs.nth(i)).toHaveCSS('background-color', 'rgb(251, 220, 123)');
      await expect(activeTabs.nth(i)).toHaveCSS('color', 'rgb(10, 10, 10)');
    }
    await expect(page.locator('.site-nav a', { hasText: 'Bitcoin Butlers' })).toHaveAttribute('href', /bitcoinbutlers\.com/);
  });

  test('maker.html loads and shows UI', async ({ page }) => {
    const creation = new CreationPage(page, htmlPath);

    await creation.open();
    await creation.expectUIElements();
  });

  test('can add and remove friends', async ({ page }) => {
    const creation = new CreationPage(page, htmlPath);

    await creation.open();

    // Should start with 2 friends
    await creation.expectFriendCount(2);

    // Add a friend
    await creation.addFriend();
    await creation.expectFriendCount(3);

    // Remove a friend
    await creation.removeFriend(2);
    await creation.expectFriendCount(2);
  });

  test('threshold updates with friend count', async ({ page }) => {
    const creation = new CreationPage(page, htmlPath);

    await creation.open();

    // With 2 friends, threshold should be "2 of 2"
    await creation.expectThresholdOptions(['2 of 2']);

    // Add a friend
    await creation.addFriend();

    // With 3 friends, threshold options should include 2 and 3
    await creation.expectThresholdOptions(['2 of 3', '3 of 3']);
  });

  test('threshold is visible and selectable', async ({ page }) => {
    const creation = new CreationPage(page, htmlPath);

    await creation.open();

    // Threshold is hidden until 2 friends have names
    await creation.expectThresholdHidden();

    // Fill in both names — threshold appears
    await creation.setFriend(0, 'Alice');
    await creation.expectThresholdHidden();
    await creation.setFriend(1, 'Bob');
    await creation.expectThresholdVisible();
    await creation.expectThresholdOptions(['2 of 2']);

    // Add a third friend and verify the threshold can be changed
    await creation.addFriend();
    await creation.setFriend(2, 'Carol');
    await creation.expectThresholdVisible();
    await creation.expectThresholdOptions(['2 of 3', '3 of 3']);
    await creation.setThreshold(3);

    // Remove a friend — threshold should still be visible with 2 named friends
    await creation.removeFriend(2);
    await creation.expectThresholdVisible();
    await creation.expectThresholdOptions(['2 of 2']);
  });

  test('step numbers and button reflect progress', async ({ page }) => {
    const creation = new CreationPage(page, htmlPath);

    await creation.open();

    // Initial state: steps 2 and 3 are pending, button is secondary
    await creation.expectStepPending(2);
    await creation.expectStepPending(3);
    await creation.expectGenerateSecondary();

    // Fill in friend names — step 2 unlocks, step 3 still pending (no files)
    await creation.setFriend(0, 'Alice', 'alice@test.com');
    await creation.setFriend(1, 'Bob', 'bob@test.com');
    await creation.expectStepActive(2);
    await creation.expectStepPending(3);
    await creation.expectGenerateSecondary();

    // Add files — step 3 unlocks, button turns green
    const testFiles = creation.createTestFiles(tmpDir, 'btn-test');
    await creation.addFiles(testFiles);
    await creation.expectStepActive(2);
    await creation.expectStepActive(3);
    await creation.expectGeneratePrimary();

    // Clear a friend name — steps 2 and 3 go pending, button goes secondary
    await creation.setFriend(0, '', '');
    await creation.expectStepPending(2);
    await creation.expectStepPending(3);
    await creation.expectGenerateSecondary();

    // Restore the name — everything unlocks again
    await creation.setFriend(0, 'Alice', 'alice@test.com');
    await creation.expectStepActive(2);
    await creation.expectStepActive(3);
    await creation.expectGeneratePrimary();
  });

  test('validates required fields', async ({ page }) => {
    const creation = new CreationPage(page, htmlPath);

    await creation.open();

    // Generate button is enabled but clicking it shows validation errors
    await creation.expectGenerateEnabled();

    // Click generate without filling required fields - should show validation
    await creation.generate();

    // Should show validation toast
    await expect(page.locator('.toast-warning')).toBeVisible();

    // Required fields should be highlighted
    await expect(page.locator('.input-error').first()).toBeVisible();

    // Dismiss the toast by clicking the backdrop
    await page.locator('.toast-close').first().click();

    // Fill in friends
    await creation.setFriend(0, 'Alice', 'alice@test.com');
    await creation.setFriend(1, 'Bob', 'bob@test.com');

    // Click generate again without files - still should show file validation (name is the only required field)
    await creation.generate();
    await expect(page.locator('#files-drop-zone.has-error')).toBeVisible(); // Files drop zone should be highlighted
  });

  test('can import contacts from YAML', async ({ page }) => {
    const creation = new CreationPage(page, htmlPath);

    await creation.open();

    const yamlContent = `
name: imported-project
threshold: 2
friends:
  - name: Charlie
    contact: charlie@test.com
  - name: Diana
    contact: diana@test.com
  - name: Eve
    contact: eve@test.com
`;

    await creation.importYAML(yamlContent);

    // Friends should be imported
    await creation.expectFriendCount(3);
    await creation.expectFriendData(0, 'Charlie', 'charlie@test.com');
    await creation.expectFriendData(1, 'Diana', 'diana@test.com');
    await creation.expectFriendData(2, 'Eve', 'eve@test.com');
  });

  test('file selection shows preview', async ({ page }) => {
    const creation = new CreationPage(page, htmlPath);

    await creation.open();

    // Create test files
    const testFiles = creation.createTestFiles(tmpDir);

    // Add files
    await creation.addFiles(testFiles);

    // Should show file preview
    await creation.expectFilesPreviewVisible();
    await creation.expectFileCount(2);
  });

  test('adding more files appends to existing files', async ({ page }) => {
    const creation = new CreationPage(page, htmlPath);

    await creation.open();

    // Create first batch of test files
    const firstBatch = creation.createTestFiles(tmpDir, 'batch1');

    // Add first batch
    await creation.addFiles(firstBatch);
    await creation.expectFilesPreviewVisible();
    await creation.expectFileCount(2);

    // Create second batch of test files
    const secondBatch = creation.createTestFiles(tmpDir, 'batch2');

    // Add second batch - should append, not replace
    await creation.addFiles(secondBatch);

    // Should now have all 4 files
    await creation.expectFileCount(4);
  });

  test('minimum 2 friends required — remove clears fields instead', async ({ page }) => {
    const creation = new CreationPage(page, htmlPath);

    await creation.open();

    // Fill in both friends
    await creation.setFriend(0, 'Alice', 'alice@test.com');
    await creation.setFriend(1, 'Bob', 'bob@test.com');

    // Try to remove a friend — should clear fields, not remove the row
    await creation.removeFriend(1);
    await creation.expectFriendCount(2);
    await creation.expectFriendData(1, '', '');

    // First friend should be untouched
    await creation.expectFriendData(0, 'Alice', 'alice@test.com');
  });

  test('YAML export escapes special characters in friend names and contact fields', async ({ page }) => {
    const creation = new CreationPage(page, htmlPath);

    await creation.open();

    // Set friends with special characters that need escaping
    // Focus on testing quote and backslash escaping which are most critical for YAML validity
    await page.locator('.friend-entry').nth(0).locator('.friend-name').fill('Alice "The Hacker" Smith');
    await page.locator('.friend-entry').nth(0).locator('.friend-contact').fill('Email: alice@test.com');

    await page.locator('.friend-entry').nth(1).locator('.friend-name').fill('Bob\\Johnson');
    await page.locator('.friend-entry').nth(1).locator('.friend-contact').fill('Contact info: bob@example.com');

    // Export YAML
    const yamlContent = await creation.exportYAML();

    // Verify the YAML contains properly escaped characters
    // The escaping function should convert:
    // - Double quotes to \" (backslash-quote)
    // - Backslashes to \\ (backslash-backslash)
    // This prevents YAML injection and ensures syntactic validity
    expect(yamlContent).toContain('\\"The Hacker\\"');  // Quotes should be escaped
    expect(yamlContent).toContain('Bob\\\\Johnson');     // Backslashes should be doubled
    
    // Verify that the entire name and contact fields are properly quoted
    expect(yamlContent).toMatch(/name: "Alice \\"The Hacker\\" Smith"/);
    expect(yamlContent).toMatch(/name: "Bob\\\\Johnson"/);
    expect(yamlContent).toMatch(/contact: "Email: alice@test\.com"/);
    expect(yamlContent).toMatch(/contact: "Contact info: bob@example\.com"/);
    
    // Verify the YAML can be parsed (imported) without errors
    // This tests that the escaping produces valid YAML
    await creation.importYAML(yamlContent);

    // Should have successfully imported 2 friends
    await creation.expectFriendCount(2);
  });

  test('the chain copy is opt in, and the label never promises more than it does', async ({ page }) => {
    const creation = new CreationPage(page, htmlPath);
    await creation.open();

    // Default: bundles only. The label must not claim the chain, because a
    // page about inheritance cannot make a promise it does not keep.
    await expect(page.locator('.words-dest-chain')).toHaveText(/bundles only/i);
    await expect(page.locator('#chain-fields')).toBeHidden();

    await page.check('input[name="destination"][value="both"]');
    await expect(page.locator('.words-dest-chain')).toHaveText(/chain/i);
    await expect(page.locator('#chain-fields')).toBeVisible();

    // A real descriptor produces a real size, worked out from the payload
    // rather than estimated, so the sat figure is what the client pays.
    await page.fill('#words-wallet', 'A 2 of 3. Any two of the three keys can spend.');
    await page.fill('#chain-descriptor',
      'wsh(sortedmulti(2,[73c5da0a/48h/0h/0h/2h]xpub6DkFAXWQ2dHxq2vatrt9qyA3bXYU4ToWQwCHbf5XB2mSTexcHZCeKS1VZYcPoBd5X8yVcbXFHJR9R8UCVpt82VX1VhR28mCyxUFL4r6KFrf/<0;1>/*,[b8688df1/48h/0h/0h/2h]xpub6FQya7zGhR92kacYsNnjreouvnHJMpXYsUXnW6NJJAJRCKsa26TzDy4LdnGhEurr3d6y1J8PJ7EEMKQp74XTqYvmGJNogYXSKDszYHtF8mX/<0;1>/*,[28645006/48h/0h/0h/2h]xpub6DnEBNkSJKBYQmsbhS1sP9cNdtU5c9PLFGCjTJmxicxc13WB8zNNGQazabQpyFAGW5bV9tMko4uBxDxjUKL6dSAcx1tEbgEHtgSqyRsekh6/<0;1>/*))');

    await expect(page.locator('#chain-size')).toContainText(/characters on the chain/i);
    await expect(page.locator('#chain-size')).toContainText(/sat/i);

    // Going back to bundles only clears it again.
    await page.check('input[name="destination"][value="bundles"]');
    await expect(page.locator('.words-dest-chain')).toHaveText(/bundles only/i);
    await expect(page.locator('#chain-size')).toHaveText('');
  });

  // The id can only get into the archive if the owner publishes BEFORE
  // sealing, because the archive is encrypted and its key split before any
  // transaction exists. Until 2026-09-24 nothing passed it at all, so every
  // CHAIN-COPY.txt shipped without one and no test noticed.
  test('a transaction id pasted before generating lands inside the archive', async ({ page }, testInfo) => {
    testInfo.setTimeout(120000);
    const creation = new CreationPage(page, htmlPath);
    await creation.open();

    await creation.setFriend(0, 'Hannah', 'hannah@test.com');
    await creation.setFriend(1, 'Sebastian', 'sebastian@test.com');
    await page.check('input[name="destination"][value="both"]');
    await page.fill('#words-wallet', 'A 2 of 3. Any two of the three keys can spend.');
    await page.fill('#chain-descriptor',
      'wsh(sortedmulti(2,[73c5da0a/48h/0h/0h/2h]xpub6DkFAXWQ2dHxq2vatrt9qyA3bXYU4ToWQwCHbf5XB2mSTexcHZCeKS1VZYcPoBd5X8yVcbXFHJR9R8UCVpt82VX1VhR28mCyxUFL4r6KFrf/<0;1>/*,[b8688df1/48h/0h/0h/2h]xpub6FQya7zGhR92kacYsNnjreouvnHJMpXYsUXnW6NJJAJRCKsa26TzDy4LdnGhEurr3d6y1J8PJ7EEMKQp74XTqYvmGJNogYXSKDszYHtF8mX/<0;1>/*,[28645006/48h/0h/0h/2h]xpub6DnEBNkSJKBYQmsbhS1sP9cNdtU5c9PLFGCjTJmxicxc13WB8zNNGQazabQpyFAGW5bV9tMko4uBxDxjUKL6dSAcx1tEbgEHtgSqyRsekh6/<0;1>/*))');

    const txid = '4801ea9c10e14a5ea5c0e5e68bfe08fd2422005ea0a3a9631fead29ce910a4df';
    await page.fill('#chain-txid', txid);

    const testFiles = creation.createTestFiles(tmpDir, 'txid');
    await creation.addFiles(testFiles);
    await creation.generate();
    await creation.expectGenerationComplete();

    const dir = path.join(tmpDir, 'txid-bundles');
    fs.mkdirSync(dir, { recursive: true });
    const first = path.join(dir, 'a');
    const second = path.join(dir, 'b');
    fs.mkdirSync(first, { recursive: true });
    fs.mkdirSync(second, { recursive: true });
    const firstZip = path.join(dir, 'a.zip');
    const secondZip = path.join(dir, 'b.zip');
    fs.writeFileSync(firstZip, (await creation.downloadBundle(0))!);
    fs.writeFileSync(secondZip, (await creation.downloadBundle(1))!);
    new AdmZip(firstZip).extractAllTo(first, true);
    new AdmZip(secondZip).extractAllTo(second, true);

    // Not in the open, on any surface.
    expect(new AdmZip(firstZip).readAsText('README.txt')).not.toContain(txid);
    expect(new AdmZip(firstZip).readAsText('recover.html')).not.toContain(txid);

    // But sealed, and IN the file once the guardians combine. Asserting only
    // that CHAIN-COPY.txt exists would pass with an empty id, which is exactly
    // the bug this test is here for.
    const out = path.join(dir, 'recovered');
    fs.mkdirSync(out, { recursive: true });
    execFileSync(getInheritanceBin(), [
      'recover',
      path.join(first, 'README.txt'),
      path.join(second, 'README.txt'),
      '--manifest', path.join(first, 'recover.html'),
    ], { cwd: out, stdio: 'pipe' });

    const found = execFileSync('find', [out, '-name', 'CHAIN-COPY.txt'], { encoding: 'utf8' })
      .trim().split('\n')[0];
    expect(found).toBeTruthy();
    const sealed = fs.readFileSync(found, 'utf8');
    expect(sealed).toContain(txid);
  });

  test('warns when the owner has written nothing, and never blocks', async ({ page }) => {
    const creation = new CreationPage(page, htmlPath);
    await creation.open();

    // Visible from the start, because nothing has been written.
    await expect(page.locator('#empty-words-warning')).toBeVisible();

    // It must never stand between the owner and the button. A gate on a free
    // tool is satisfied by typing a full stop, and then the heir holds a
    // bundle that passed the check and still says nothing.
    await creation.setFriend(0, 'Hannah', 'hannah@test.com');
    await creation.setFriend(1, 'Sebastian', 'sebastian@test.com');
    const testFiles = creation.createTestFiles(tmpDir, 'emptywords');
    await creation.addFiles(testFiles);
    await expect(page.locator('#generate-btn')).toBeEnabled();

    // One word anywhere clears it.
    await page.fill('#words-wallet', 'A 2 of 3.');
    await expect(page.locator('#empty-words-warning')).toBeHidden();

    // Clearing it again brings the warning back.
    await page.fill('#words-wallet', '');
    await expect(page.locator('#empty-words-warning')).toBeVisible();
  });

  test("the owner's words land where they were decided to land", async ({ page }, testInfo) => {
    // The one that must never silently regress. A README is built to be
    // forwarded: a guardian's own copy tells them to send it to whoever asks
    // for their piece. So nothing the owner writes may sit in one. Every word
    // is sealed in the encrypted archive, which opens only when enough
    // guardians combine their pieces.
    //
    // The method sat in the open until 2026-09-24, beside the roster. Read
    // together they told a colluding guardian how the wallet works and who
    // else to approach.
    testInfo.setTimeout(120000);
    const creation = new CreationPage(page, htmlPath);
    await creation.open();

    await creation.setFriend(0, 'Hannah', 'hannah@test.com');
    await creation.setFriend(1, 'Sebastian', 'sebastian@test.com');

    const method = 'The older Coldcard needs firmware 5.1 or it will not show the wallet.';
    const location = 'Key 1: the safe at the Wellington house.';
    const alsoNote = 'The safe code is my birth year backwards.';

    await page.fill('#words-wallet', 'A 2 of 3. Any two of the three keys can spend.');
    await page.fill('#words-sign', method);
    await page.fill('#words-keys', location);
    await page.fill('#words-call', 'Hannah. She has done this drill twice.');
    await page.fill('.words-else', alsoNote);

    const testFiles = creation.createTestFiles(tmpDir, 'ownerwords');
    await creation.addFiles(testFiles);
    await creation.generate();
    await creation.expectGenerationComplete();

    const data = await creation.downloadBundle(0);
    expect(data).toBeTruthy();
    const dir = path.join(tmpDir, 'ownerwords-bundle');
    fs.mkdirSync(dir, { recursive: true });
    const zipPath = path.join(dir, 'bundle.zip');
    fs.writeFileSync(zipPath, data!);
    const readme = new AdmZip(zipPath).readAsText('README.txt');

    // Not one word of it, on any surface a lone guardian can read.
    expect(readme).not.toContain(method);
    expect(readme).not.toContain(location);
    expect(readme).not.toContain(alsoNote);
    expect(readme).not.toContain('Wellington');
    expect(readme).not.toContain('Coldcard');

    // And no other guardian is named.
    expect(readme).not.toContain('Sebastian');
    expect(readme).not.toContain('sebastian@test.com');

    // The personalised recover page is the third surface. A fix that misses
    // one of the three leaks everything.
    const recoverHtml = new AdmZip(zipPath).readAsText('recover.html');
    expect(recoverHtml).not.toContain(method);
    expect(recoverHtml).not.toContain(location);
    expect(recoverHtml).not.toContain('sebastian@test.com');

    // And now the half that matters just as much: the words must still be
    // THERE, sealed, not quietly dropped. A test that only checks absence
    // passes just as well when the maker loses the owner's writing.
    const secondData = await creation.downloadBundle(1);
    const secondDir = path.join(dir, 'sebastian');
    const secondZipPath = path.join(secondDir, 'bundle.zip');
    fs.mkdirSync(secondDir, { recursive: true });
    fs.writeFileSync(secondZipPath, secondData!);
    new AdmZip(secondZipPath).extractAllTo(path.join(secondDir, 'x'), true);

    const firstDir = path.join(dir, 'hannah');
    fs.mkdirSync(firstDir, { recursive: true });
    new AdmZip(zipPath).extractAllTo(firstDir, true);

    const recovery = new RecoveryPage(page, firstDir);
    await recovery.open();
    await recovery.addShares(path.join(secondDir, 'x'));
    await recovery.expectRecoveryComplete();

    const recovered = await page.locator('.file-item').allInnerTexts();
    const names = recovered.join('\n');
    expect(names).toContain('HOW-THE-WALLET-WORKS.txt');
    expect(names).toContain('WHERE-THE-KEYS-ARE.txt');
  });

  test('browser-created bundles can be recovered @cross-browser', async ({ page }, testInfo) => {
    testInfo.setTimeout(120000);
    const creation = new CreationPage(page, htmlPath);

    await creation.open();

    // Set up friends
    await creation.setFriend(0, 'Alice', 'alice@test.com');
    await creation.setFriend(1, 'Bob', 'bob@test.com');

    // Add test files
    const testFiles = creation.createTestFiles(tmpDir, 'roundtrip');
    await creation.addFiles(testFiles);

    // Generate bundles via WASM
    await creation.generate();
    await creation.expectGenerationComplete();
    await creation.expectBundleCount(2);

    // Download both bundles
    const aliceData = await creation.downloadBundle(0);
    const bobData = await creation.downloadBundle(1);
    expect(aliceData).toBeTruthy();
    expect(bobData).toBeTruthy();

    // Save and extract bundles
    const bundlesDir = path.join(tmpDir, 'roundtrip-bundles');
    fs.mkdirSync(bundlesDir, { recursive: true });

    const aliceZipPath = path.join(bundlesDir, 'bundle-alice.zip');
    fs.writeFileSync(aliceZipPath, aliceData!);
    const aliceZip = new AdmZip(aliceZipPath);
    const aliceDir = path.join(bundlesDir, 'alice');
    aliceZip.extractAllTo(aliceDir, true);

    const bobZipPath = path.join(bundlesDir, 'bundle-bob.zip');
    fs.writeFileSync(bobZipPath, bobData!);
    const bobZip = new AdmZip(bobZipPath);
    const bobDir = path.join(bundlesDir, 'bob');
    bobZip.extractAllTo(bobDir, true);

    // Open Alice's recover.html (share + manifest pre-loaded)
    const recovery = new RecoveryPage(page, aliceDir);
    await recovery.open();
    await recovery.expectShareCount(1);

    // Add Bob's share — triggers auto-recovery
    await recovery.addShares(bobDir);

    // Recovery should complete
    await recovery.expectRecoveryComplete();
    await recovery.expectFileCount(2);
    await recovery.expectDownloadVisible();
  });
});
