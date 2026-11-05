import { test, expect } from './fixtures';
import { execFileSync, spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  getRememoryBin, getDocsHtml, generateStandaloneHTML,
  OWNER_RECIPIENT, OWNER_IDENTITY, createBundlesWithOwner,
} from './helpers';

// The guide says to run its commands in a macOS or Linux terminal. These are
// the default shells there, started as a new terminal starts them, without rc
// files that could change how a pasted line is read.
const SHELLS = [
  { name: 'bash', argv: ['bash', '--norc', '--noprofile', '-i'] },
  { name: 'zsh', argv: ['zsh', '-f', '-i'] },
];

function filesUnder(dir: string): Map<string, Buffer> {
  const files = new Map<string, Buffer>();
  for (const entry of fs.readdirSync(dir, { recursive: true, withFileTypes: true })) {
    if (entry.isFile()) {
      files.set(entry.name, fs.readFileSync(path.join(entry.parentPath, entry.name)));
    }
  }
  return files;
}

test.describe('Guide commands', () => {
  let htmlPath: string;
  let tmpDir: string;
  let ageBin: string;

  test.beforeAll(async () => {
    if (!fs.existsSync(getRememoryBin())) {
      test.skip();
      return;
    }
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rememory-guide-e2e-'));
    htmlPath = generateStandaloneHTML(tmpDir, 'create');
    // The stock age CLI the guide names, at the version go.mod pins as a tool.
    ageBin = path.join(tmpDir, 'bin', 'age');
    execFileSync('go', ['build', '-o', ageBin, 'filippo.io/age/cmd/age'], { stdio: 'inherit' });
  });

  test.afterAll(async () => {
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  for (const shell of SHELLS) {
    test(`the guide's commands recover the original files in ${shell.name}`, async ({ page }, testInfo) => {
      testInfo.setTimeout(180000);
      const prefix = `guide-${shell.name}`;
      const bundleDir = path.join(await createBundlesWithOwner(page, htmlPath, tmpDir, prefix), 'alice');

      // The file `age-keygen -o owner-key.txt` writes, as the guide's How to Enable says
      const keyFile = path.join(bundleDir, 'owner-key.txt');
      fs.writeFileSync(keyFile, `# public key: ${OWNER_RECIPIENT}\n${OWNER_IDENTITY}\n`);

      await page.goto('file://' + getDocsHtml());
      const blocks = await page.locator('pre code').allTextContents();
      expect(blocks.length).toBeGreaterThan(0);

      // The terminal types the passphrase only once the guide's commands have shown it
      const passphrase = execFileSync(ageBin, ['-d', '-i', keyFile, path.join(bundleDir, 'OWNER.age')]);
      const passphraseFile = path.join(tmpDir, `${prefix}-passphrase`);
      fs.writeFileSync(passphraseFile, passphrase);
      const commandsFile = path.join(tmpDir, `${prefix}-commands`);
      fs.writeFileSync(commandsFile, blocks.join('\n'));

      const run = spawnSync('python3', [
        path.resolve('e2e/terminal.py'), commandsFile, passphraseFile, ...shell.argv,
      ], {
        cwd: bundleDir,
        encoding: 'utf8',
        timeout: 150000,
        env: {
          ...process.env,
          PATH: `${path.dirname(ageBin)}${path.delimiter}${process.env.PATH}`,
          BASH_SILENCE_DEPRECATION_WARNING: '1',
        },
      });
      const transcript = `${run.stdout}\n${run.stderr}\n${run.error ?? ''}`;
      expect(run.status, transcript).toBe(0);

      const archive = path.join(bundleDir, 'archive');
      expect(fs.existsSync(archive), transcript).toBe(true);
      const outDir = path.join(tmpDir, `${prefix}-out`);
      fs.mkdirSync(outDir);
      execFileSync('tar', ['-xzf', archive, '-C', outDir]);

      const original = filesUnder(path.join(tmpDir, `test-files-${prefix}`));
      const recovered = filesUnder(outDir);
      expect([...recovered.keys()].sort(), transcript).toEqual([...original.keys()].sort());
      for (const [name, data] of original) {
        expect(recovered.get(name)!.equals(data), `${name} differs\n${transcript}`).toBe(true);
      }
    });
  }
});
