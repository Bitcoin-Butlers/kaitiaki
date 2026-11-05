import { test, expect } from './fixtures';
import { execFileSync, spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import AdmZip from 'adm-zip';
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

// The maker embeds MANIFEST.age in recover.html only up to 10 MiB. Above
// that the bundle holds MANIFEST.age, and the guide's commands must keep it.
const BUNDLES = [
  { label: '', suffix: '', embedManifest: true },
  { label: ' when the bundle holds MANIFEST.age', suffix: '-file', embedManifest: false },
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

// Run terminal.py on one command line, in a session of its own. A signal
// that terminal.py sends to the wrong group then stops only terminal.py,
// and the test can still report it.
function runTerminal(line: string, shellArgv: string[]) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rememory-guide-terminal-'));
  try {
    const commandsFile = path.join(dir, 'commands');
    fs.writeFileSync(commandsFile, `${line}\n`);
    const passphraseFile = path.join(dir, 'passphrase');
    fs.writeFileSync(passphraseFile, '');
    const run = spawnSync('python3', [
      '-c', 'import os, sys; os.setsid(); os.execvp(sys.argv[1], sys.argv[1:])',
      'python3', path.resolve('e2e/terminal.py'), commandsFile, passphraseFile, ...shellArgv,
    ], {
      cwd: dir,
      encoding: 'utf8',
      timeout: 30000,
      env: { ...process.env, TERMINAL_TIMEOUT: '5', BASH_SILENCE_DEPRECATION_WARNING: '1' },
    });
    const transcript = `${run.stdout}\n${run.stderr}\n${run.error ?? ''}\nsignal ${run.signal}`;
    // The caller's timeout or a stray signal must not be what stops the run,
    // or the transcript is lost
    expect(run.error, transcript).toBeUndefined();
    expect(run.signal, transcript).toBeNull();
    expect(run.status, transcript).toBe(1);
    expect(run.stdout, transcript).toContain(line);
    return transcript;
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test.describe('Guide terminal', () => {
  for (const [i, shell] of SHELLS.entries()) {
    test(`a guide line that does not finish fails in time in ${shell.name}`, async () => {
      // One duration per test, so pgrep finds only this test's command.
      // nohup keeps it alive through the hangup when terminal.py exits, so
      // only terminal.py's own kill can stop it.
      const hang = `sleep ${597 + i}`;
      try {
        const transcript = runTerminal(`nohup ${hang}`, shell.argv);
        expect(spawnSync('pgrep', ['-f', hang]).status, transcript).toBe(1);
      } finally {
        spawnSync('pkill', ['-f', hang]);
      }
    });

    test(`a guide line that ends the shell fails in ${shell.name}`, async () => {
      runTerminal('exit', shell.argv);
    });
  }
});

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

  for (const shell of SHELLS) for (const bundle of BUNDLES) {
    test(`the guide's commands recover the original files in ${shell.name}${bundle.label}`, async ({ page }, testInfo) => {
      testInfo.setTimeout(180000);
      const prefix = `guide-${shell.name}${bundle.suffix}`;
      const bundleDir = path.join(await createBundlesWithOwner(page, htmlPath, tmpDir, prefix, {
        embedManifest: bundle.embedManifest,
      }), 'alice');
      const manifestFile = path.join(bundleDir, 'MANIFEST.age');
      expect(fs.existsSync(manifestFile)).toBe(!bundle.embedManifest);
      const manifest = bundle.embedManifest ? null : fs.readFileSync(manifestFile);

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
      // A person sees this error even when the files still come back
      expect(transcript).not.toContain('command not found');

      const archive = path.join(bundleDir, 'archive');
      expect(fs.existsSync(archive), transcript).toBe(true);
      if (manifest) {
        expect(fs.readFileSync(manifestFile).equals(manifest), `MANIFEST.age changed\n${transcript}`).toBe(true);
      }
      const outDir = path.join(tmpDir, `${prefix}-out`);
      fs.mkdirSync(outDir);
      // The maker writes a ZIP. bsdtar on macOS opens it as tar, and GNU tar does not.
      new AdmZip(archive).extractAllTo(outDir, true);

      const original = filesUnder(path.join(tmpDir, `test-files-${prefix}`));
      const recovered = filesUnder(outDir);
      expect([...recovered.keys()].sort(), transcript).toEqual([...original.keys()].sort());
      for (const [name, data] of original) {
        expect(recovered.get(name)!.equals(data), `${name} differs\n${transcript}`).toBe(true);
      }
    });
  }
});
