import { execFileSync, execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

function getInheritanceBin(): string {
  const binEnv = process.env.INHERITANCE_BIN || './inheritance';
  return path.resolve(binEnv);
}

async function globalSetup() {
  const bin = getInheritanceBin();
  if (!fs.existsSync(bin)) {
    console.log('Global setup: inheritance binary not found, skipping shared resource creation');
    return;
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'inheritance-e2e-global-'));

  // --- Projects ---

  // Standard test project (3 friends, threshold 2)
  const standardProject = path.join(tmpDir, 'standard-project');
  execFileSync(bin, [
    'init', standardProject, '--name', 'E2E Test', '--threshold', '2',
    '--friend', 'Alice,alice@test.com', '--friend', 'Bob,bob@test.com', '--friend', 'Carol,carol@test.com',
  ], { stdio: 'inherit' });
  const standardManifest = path.join(standardProject, 'manifest');
  fs.writeFileSync(path.join(standardManifest, 'secret.txt'), 'The secret password is: correct-horse-battery-staple');
  fs.writeFileSync(path.join(standardManifest, 'notes.txt'), 'Remember to feed the cat!');
  execFileSync(bin, ['seal'], { cwd: standardProject, stdio: 'inherit' });
  execFileSync(bin, ['bundle'], { cwd: standardProject, stdio: 'inherit' });

  // No-embed test project (same config, --no-embed-manifest)
  const noEmbedProject = path.join(tmpDir, 'no-embed-project');
  execFileSync(bin, [
    'init', noEmbedProject, '--name', 'E2E Test', '--threshold', '2',
    '--friend', 'Alice,alice@test.com', '--friend', 'Bob,bob@test.com', '--friend', 'Carol,carol@test.com',
  ], { stdio: 'inherit' });
  const noEmbedManifest = path.join(noEmbedProject, 'manifest');
  fs.writeFileSync(path.join(noEmbedManifest, 'secret.txt'), 'The secret password is: correct-horse-battery-staple');
  fs.writeFileSync(path.join(noEmbedManifest, 'notes.txt'), 'Remember to feed the cat!');
  execFileSync(bin, ['seal', '--no-embed-manifest'], { cwd: noEmbedProject, stdio: 'inherit' });
  execFileSync(bin, ['bundle', '--no-embed-manifest'], { cwd: noEmbedProject, stdio: 'inherit' });

  // --- Standalone HTML files ---

  const makerHtml = path.join(tmpDir, 'maker.html');
  execFileSync(bin, ['html', 'create', '-o', makerHtml], { stdio: 'inherit' });

  const recoverHtml = path.join(tmpDir, 'recover.html');
  execFileSync(bin, ['html', 'recover', '-o', recoverHtml], { stdio: 'inherit' });

  const docsHtml = path.join(tmpDir, 'docs.html');
  execFileSync(bin, ['html', 'docs', '-o', docsHtml], { stdio: 'inherit' });

  const indexHtml = path.join(tmpDir, 'index.html');
  execFileSync(bin, ['html', 'index', '-o', indexHtml], { stdio: 'inherit' });

  // --- Crypto test HTML ---

  const cryptoJsPath = path.join(tmpDir, 'crypto.js');
  execSync(
    `npx esbuild internal/html/assets/src/crypto/index.ts --bundle --format=iife --global-name=RememoryCrypto --outfile=${cryptoJsPath} --loader:.txt=text`,
    { cwd: process.cwd(), stdio: 'inherit' }
  );

  const cryptoJs = fs.readFileSync(cryptoJsPath, 'utf8');
  const cryptoTestHtml = path.join(tmpDir, 'crypto-test.html');
  fs.writeFileSync(cryptoTestHtml, `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Crypto Test</title></head>
<body>
  <script>${cryptoJs}</script>
  <script>window.inheritanceCrypto = RememoryCrypto; window.testReady = true;</script>
</body>
</html>`);

  // --- Write setup JSON ---

  const setup = {
    tmpDir,
    standardProject,
    noEmbedProject,
    makerHtml,
    recoverHtml,
    docsHtml,
    indexHtml,
    cryptoTestHtml,
  };

  const setupPath = path.join(tmpDir, 'setup.json');
  fs.writeFileSync(setupPath, JSON.stringify(setup, null, 2));
  process.env.INHERITANCE_E2E_SETUP = setupPath;
}

export default globalSetup;
