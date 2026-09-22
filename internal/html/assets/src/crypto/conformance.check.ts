/**
 * Checks that the TypeScript implementation opens what the Go one wrote.
 *
 * The browser writes a chain backup with the Go code compiled to WASM, and the
 * heir-side recover page reads it with this TypeScript. If the two ever
 * disagree, a client's backup becomes unreadable by the page we point their
 * heir at. Run through `make test-xlang`.
 */
import { readFileSync } from 'node:fs';
import { base64 } from '@scure/base';
import { decryptDescriptor as decryptThreshold } from './descriptor';
import { decryptBackup, decryptDescriptor as decryptBip138 } from './bip138';

const d = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const failures: string[] = [];
const check = (name: string, ok: boolean, detail = '') => {
  console.log(`  ${ok ? 'pass' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failures.push(name);
};

(async () => {
  // Threshold format: two of the three keys must be enough.
  const t = await decryptThreshold(d.threshold, [d.xpubs[0], d.xpubs[2]]);
  check('threshold blob from Go opens with 2 of 3 keys',
    t.descriptor === d.descriptor, `${t.decryptedShares} of ${t.requiredShares} shares`);

  // BIP-138: any one key must be enough.
  check('BIP-138 blob from Go opens with one key',
    decryptBip138(d.bip138, d.xpubs[1]) === d.descriptor);

  // A String note must not stop a descriptor-only reader.
  check('BIP-138 blob with a note still yields the descriptor',
    decryptBip138(d.bip138Note, d.xpubs[1]) === d.descriptor);

  // The note itself is skipped by this reader, which is what the BIP intends.
  const items = decryptBackup(base64.decode(d.bip138Note), 
    (await import('@scure/base')).base58check((await import('@noble/hashes/sha2')).sha256)
      .decode(d.xpubs[1].trim()).slice(45));
  check('this reader skips the note rather than failing',
    items.length === 1 && items[0].bip === 380, `${items.length} item(s) returned`);

  if (failures.length > 0) {
    console.error(`\n${failures.length} cross-language check(s) failed`);
    process.exit(1);
  }
  console.log('\nGo and TypeScript agree on both formats.');
})();
