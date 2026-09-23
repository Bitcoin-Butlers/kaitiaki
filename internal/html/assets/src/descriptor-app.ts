/**
 * The descriptor backup page.
 *
 * Two jobs. Encrypt a multisig descriptor so the wallet's own keys unlock it,
 * and read one back off the chain. The crypto lives in crypto/descriptor.ts
 * (threshold) and crypto/bip138.ts (any one key); this file is the page.
 *
 * The encrypt side never touches the network. The recover side touches it in
 * exactly one place, fetching a transaction by id, and says so on screen.
 */

import {
  decryptDescriptor as decryptThreshold,
  parseDescriptor,
  parseEncryptedDescriptor,
} from './crypto/descriptor';
import {
  decryptDescriptor as decryptAnyKey,
} from './crypto/bip138';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;



function show(el: HTMLElement, visible: boolean) {
  el.classList.toggle('hidden', !visible);
}

function fail(el: HTMLElement, error: unknown) {
  el.textContent = error instanceof Error ? error.message : String(error);
  show(el, true);
}

function copyToClipboard(text: string, button: HTMLButtonElement) {
  const done = () => {
    const original = button.textContent;
    button.textContent = 'Copied';
    setTimeout(() => {
      button.textContent = original;
    }, 1500);
  };
  navigator.clipboard?.writeText(text).then(done).catch(() => {
    // Clipboard access can be refused on a file:// page. Select it instead so
    // the reader can copy by hand rather than being told nothing happened.
    const area = document.createElement('textarea');
    area.value = text;
    document.body.appendChild(area);
    area.select();
    document.execCommand('copy');
    area.remove();
    done();
  });
}

function saveFile(text: string, filename: string) {
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Reading a descriptor well enough to describe it back to the reader
// ---------------------------------------------------------------------------

interface Shape {
  threshold: number;
  keys: number;
  paths: string[];
}

/**
 * Derivation paths as a person should read them.
 *
 * The crypto layer's own path list is filtered the way upstream filters it,
 * which keeps a fingerprint stuck to the front whenever that fingerprint
 * happens to be all digits, and drops the path entirely when it is not. That
 * is harmless for encryption and useless on screen, so the page reads the
 * origin fields itself. Handles both `[abcd1234/48h/0h/0h/2h]` and the
 * stripped `[48h/0h/0h/2h]` that comes back out of an encrypted backup.
 */
function displayPaths(descriptor: string): string[] {
  const origins = descriptor.matchAll(/\[(?:[0-9a-fA-F]{8})?\/?((?:\d+['h]?)(?:\/\d+['h]?)*)\]/g);
  return [...new Set([...origins].map((m) => m[1]).filter(Boolean))];
}


function describe(descriptor: string): Shape {
  const { multisigs } = parseDescriptor(descriptor);
  const first = multisigs[0];
  return {
    threshold: first.requiredSigs,
    keys: first.numXpubs,
    paths: displayPaths(descriptor),
  };
}

function renderShape(target: HTMLElement, shape: Shape, extra = '') {
  const paths = shape.paths.length > 0 ? shape.paths.join(', ') : 'none stated';
  target.innerHTML = '';
  const line = document.createElement('p');
  line.textContent = `${shape.threshold} of ${shape.keys}. Derivation ${paths}.`;
  target.appendChild(line);
  if (extra) {
    const note = document.createElement('p');
    note.className = 'note';
    note.textContent = extra;
    target.appendChild(note);
  }
  show(target, true);
}

// ---------------------------------------------------------------------------
// Protect
// ---------------------------------------------------------------------------




/**
 * Reads the published backup back off the chain and proves three things:
 * the bytes are the ones we made, they decrypt, and what comes out is the
 * descriptor we started from. Anything less is not proof.
 */


/** The lines that go onto the page kept with the will. */

// ---------------------------------------------------------------------------
// Recover
// ---------------------------------------------------------------------------

function looksLikeBip138(text: string): boolean {
  // A BIP-138 backup is base64 and its first bytes spell BIP138, which base64
  // renders as this prefix. Cheaper and clearer than decoding to find out.
  return text.trimStart().startsWith('QklQMTM4');
}

/** Pulls the OP_RETURN payload out of a transaction from an Esplora-style API. */
async function fetchFromChain(txid: string, base: string): Promise<string> {
  const clean = txid.trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(clean)) {
    throw new Error('A transaction id is 64 hexadecimal characters.');
  }
  const response = await fetch(`${base.replace(/\/$/, '')}/tx/${clean}`);
  if (!response.ok) {
    throw new Error(`The explorer answered ${response.status}. Check the id and the explorer address.`);
  }
  const tx = (await response.json()) as {
    vout: { scriptpubkey: string; scriptpubkey_type: string }[];
  };
  const outputs = tx.vout.filter((v) => v.scriptpubkey_type === 'op_return');
  if (outputs.length === 0) {
    throw new Error('That transaction carries no OP_RETURN output.');
  }

  for (const output of outputs) {
    const decoded = decodeOpReturn(output.scriptpubkey);
    if (decoded) return decoded;
  }
  throw new Error('The OP_RETURN output in that transaction is not readable text.');
}

/** Strips OP_RETURN and its push opcode, then reads the bytes as text. */
function decodeOpReturn(scriptHex: string): string | null {
  const bytes = Uint8Array.from((scriptHex.match(/.{2}/g) ?? []).map((b) => parseInt(b, 16)));
  if (bytes[0] !== 0x6a) return null;
  let at = 1;
  const opcode = bytes[at++];
  let length: number;
  if (opcode <= 0x4b) {
    length = opcode;
  } else if (opcode === 0x4c) {
    length = bytes[at];
    at += 1;
  } else if (opcode === 0x4d) {
    length = bytes[at] | (bytes[at + 1] << 8);
    at += 2;
  } else if (opcode === 0x4e) {
    length = bytes[at] | (bytes[at + 1] << 8) | (bytes[at + 2] << 16) | (bytes[at + 3] << 24);
    at += 4;
  } else {
    return null;
  }
  const data = bytes.slice(at, at + length);
  if (data.length !== length) return null;
  return new TextDecoder().decode(data);
}

function describeBackup(text: string) {
  const summary = $('recover-summary');
  const needed = $('keys-needed');
  if (looksLikeBip138(text)) {
    summary.innerHTML = '';
    const p = document.createElement('p');
    p.textContent = 'A one-key backup. Any single key of the wallet opens it.';
    summary.appendChild(p);
    show(summary, true);
    needed.textContent = 'Paste one extended public key of the wallet. More than one is fine.';
    return;
  }
  try {
    const parsed = parseEncryptedDescriptor(text);
    const shape = describe(parsed.strippedDescriptor);
    renderShape(
      summary,
      shape,
      'Derive these keys from your seeds with the paths above, then paste the extended public keys below.'
    );
    needed.textContent = `Paste at least ${shape.threshold} extended public keys of the wallet, one per line.`;
  } catch {
    show(summary, false);
    needed.textContent = 'Paste the extended public keys of the wallet, one per line.';
  }
}

async function recover() {
  const errorBox = $('recover-error');
  const result = $('recover-result');
  show(errorBox, false);
  show(result, false);

  const text = $<HTMLTextAreaElement>('recover-input').value.trim();
  const xpubs = $<HTMLTextAreaElement>('xpubs-input')
    .value.split(/\s+/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!text) {
    fail(errorBox, new Error('Paste the backup text, or fetch it by transaction id.'));
    return;
  }
  if (xpubs.length === 0) {
    fail(errorBox, new Error('Paste at least one extended public key.'));
    return;
  }

  try {
    let descriptor: string;
    let detail: string;

    if (looksLikeBip138(text)) {
      let lastError: unknown = new Error('None of those keys opened this backup.');
      let opened: string | null = null;
      for (const xpub of xpubs) {
        try {
          opened = decryptAnyKey(text, xpub);
          break;
        } catch (error) {
          lastError = error;
        }
      }
      if (!opened) throw lastError;
      descriptor = opened;
      detail = 'Opened with one key.';
    } else {
      const outcome = await decryptThreshold(text, xpubs);
      if (!outcome.descriptor) {
        throw new Error(
          `That is not enough. ${outcome.decryptedShares} of your keys matched, and this backup needs ${outcome.requiredShares}.`
        );
      }
      descriptor = outcome.descriptor;
      detail = `Opened with ${outcome.decryptedShares} of the ${outcome.requiredShares} keys it needs.`;
    }

    $('recover-detail').textContent = detail;
    $<HTMLTextAreaElement>('recover-output').value = descriptor;
    show(result, true);
  } catch (error) {
    fail(errorBox, error);
  }
}

// ---------------------------------------------------------------------------
// Wiring
// ---------------------------------------------------------------------------

function init() {
  // Recover
  $('source-choice').addEventListener('change', () => {
    const source = document.querySelector<HTMLInputElement>('input[name="source"]:checked')?.value;
    show($('source-text'), source === 'text');
    show($('source-txid'), source === 'txid');
  });
  const recoverInput = $<HTMLTextAreaElement>('recover-input');
  recoverInput.addEventListener('input', () => {
    const value = recoverInput.value.trim();
    if (value) describeBackup(value);
    else show($('recover-summary'), false);
  });
  $<HTMLButtonElement>('fetch-btn').addEventListener('click', async () => {
    const status = $('fetch-status');
    status.textContent = 'Asking the explorer...';
    try {
      const text = await fetchFromChain($<HTMLInputElement>('txid-input').value, $<HTMLInputElement>('explorer-input').value);
      recoverInput.value = text;
      describeBackup(text);
      status.textContent = `Found ${text.length} characters. Now add your keys below.`;
    } catch (error) {
      status.textContent = error instanceof Error ? error.message : String(error);
    }
  });
  $<HTMLButtonElement>('recover-btn').addEventListener('click', recover);
  $<HTMLButtonElement>('copy-recovered').addEventListener('click', (event) =>
    copyToClipboard($<HTMLTextAreaElement>('recover-output').value, event.currentTarget as HTMLButtonElement)
  );
  $<HTMLButtonElement>('download-recovered').addEventListener('click', () =>
    saveFile($<HTMLTextAreaElement>('recover-output').value, 'descriptor.txt')
  );
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
