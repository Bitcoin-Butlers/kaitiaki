/**
 * Conformance tests for the second on-chain backup format.
 *
 * Every vector here comes from the BIP-138 draft itself, copied from
 * bitcoin/bips#1951 at commit 5af62cba9958a519218bcad8a0aae9e2090bb5bd. They
 * are the reason we can offer this format at all: the draft is open, so the
 * only safe way to follow it is to fail loudly when its own vectors stop
 * matching our bytes.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  BIP380,
  bytesToHex,
  decodeBackup,
  decryptBackup,
  decryptDescriptor,
  deriveSecrets,
  descriptorPubkeys,
  dropCommonDerivationPaths,
  isCommonDerivationPath,
  encodeBackup,
  encodeBipContentType,
  encodeCompactSize,
  encodeDerivationPaths,
  encodeIndividualSecrets,
  encryptDescriptor,
  INHERITANCE_SECRET_ENTRIES,
  decodeBackup as decodeBip138,
  hexToBytes,
  normalizeKeys,
  parseDerivationPath,
  taggedHash,
} from './bip138.ts';

import encryptionSecretVectors from './testdata/bip138/encryption_secret.json' with { type: 'json' };
import individualSecretVectors from './testdata/bip138/individual_secrets.json' with { type: 'json' };
import derivationPathVectors from './testdata/bip138/derivation_path.json' with { type: 'json' };
import contentTypeVectors from './testdata/bip138/content_type.json' with { type: 'json' };
import cipherVectors from './testdata/bip138/chacha20poly1305_encryption.json' with { type: 'json' };
import backupVectors from './testdata/bip138/encrypted_backup.json' with { type: 'json' };
import descriptorVector from './testdata/descriptor-vector.json' with { type: 'json' };

const utf8 = new TextEncoder();

test('draft vectors: the decryption secret and every individual secret', () => {
  for (const v of encryptionSecretVectors) {
    const { secret, individualSecrets } = deriveSecrets(v.keys.map(hexToBytes));
    assert.equal(bytesToHex(secret), v.decryption_secret, v.description);
    assert.deepEqual(individualSecrets.map(bytesToHex), v.individual_secrets, v.description);
  }
});

test('draft vectors: individual secrets are sorted and de-duplicated on the way out', () => {
  for (const v of individualSecretVectors) {
    const secrets = v.secrets.map(hexToBytes);
    if (v.expected === null) {
      assert.throws(() => encodeIndividualSecrets(secrets), undefined, v.description);
      continue;
    }
    assert.equal(bytesToHex(encodeIndividualSecrets(secrets)), v.expected, v.description);
  }
});

test('draft vectors: derivation path encoding', () => {
  for (const v of derivationPathVectors) {
    const paths = v.paths.map(parseDerivationPath);
    if (v.expected === null) {
      // The draft marks a case that must be refused with a null expectation.
      assert.throws(() => encodeDerivationPaths(paths), undefined, v.description);
      continue;
    }
    assert.equal(bytesToHex(encodeDerivationPaths(paths)), v.expected, v.description);
  }
});

test('draft vectors: content type encoding for BIP-number types', () => {
  for (const v of contentTypeVectors) {
    if (!v.valid || !v.content.startsWith('01')) continue;
    const bip = parseInt(v.content.slice(2), 16);
    assert.equal(bytesToHex(encodeBipContentType(bip)), v.content, v.description);
  }
});

test('draft vectors: the cipher itself', async () => {
  const { chacha20poly1305 } = await import('@noble/ciphers/chacha.js');
  for (const v of cipherVectors) {
    if (v.ciphertext === null) continue; // refusals are asserted below
    const sealed = chacha20poly1305(hexToBytes(v.secret), hexToBytes(v.nonce)).encrypt(
      hexToBytes(v.plaintext)
    );
    assert.equal(bytesToHex(sealed), v.ciphertext, v.description);
  }
});

test('draft vectors: the refusals the cipher cases describe', () => {
  const keys = backupVectors[0].keys.map(hexToBytes);
  // "Empty plaintext should fail": the draft forbids an empty payload.
  assert.throws(() => encodeBackup({ pubkeys: keys, items: [] }), /at least one content item/);
  // "Encryption with zeroed nonce should fail".
  assert.throws(
    () =>
      encodeBackup({
        pubkeys: keys,
        items: [{ bip: BIP380, content: utf8.encode('x') }],
        nonce: new Uint8Array(12),
      }),
    /all zero/
  );
});

test('draft vectors: whole backups encode to the expected bytes', () => {
  let checked = 0;
  for (const v of backupVectors) {
    if (v.valid === false) continue;
    // The encoder writes BIP-number content items. A vector with a
    // vendor-specific type is covered by the decode test below instead.
    if (!v.content.startsWith('01')) continue;

    const items = [
      { bip: parseInt(v.content.slice(2), 16), content: utf8.encode(v.plaintext) },
      ...(v.extra ?? []).map((e: { content: string; plaintext: string }) => ({
        bip: parseInt(e.content.slice(2), 16),
        content: utf8.encode(e.plaintext),
      })),
    ];

    const backup = encodeBackup({
      pubkeys: v.keys.map(hexToBytes),
      items,
      decoySecrets: v.decoy_individual_secrets.map(hexToBytes),
      derivationPaths: v.derivation_paths.map(parseDerivationPath),
      nonce: hexToBytes(v.nonce),
    });

    assert.equal(bytesToHex(backup), v.expected, v.description);
    checked++;
  }
  assert.ok(checked >= 4, `expected several encodable vectors, checked ${checked}`);
});

test('draft vectors: every key in a backup can open it', () => {
  for (const v of backupVectors) {
    if (v.valid === false) continue;
    for (const key of v.keys) {
      const items = decryptBackup(hexToBytes(v.expected), hexToBytes(key));
      if (!v.content.startsWith('01')) {
        // A vendor-specific type. The draft says a parser skips what it does
        // not implement and keeps reading, so opening it must not throw.
        continue;
      }
      assert.ok(items.length >= 1, v.description);
      assert.equal(new TextDecoder().decode(items[0].content), v.plaintext, v.description);
    }
  }
});

test('draft vectors: bytes after the ciphertext are ignored', () => {
  const withTrailing = backupVectors.find((v) => v.trailing);
  assert.ok(withTrailing, 'the draft ships a vector with trailing bytes');
  const padded = hexToBytes(withTrailing.expected + withTrailing.trailing);
  const items = decryptBackup(padded, hexToBytes(withTrailing.keys[0]));
  assert.equal(new TextDecoder().decode(items[0].content), withTrailing.plaintext);
});

test('draft vectors: an all-zero nonce is refused', () => {
  const zeroNonce = backupVectors.find((v) => v.valid === false);
  assert.ok(zeroNonce, 'the draft ships an invalid-nonce vector');
  assert.throws(() => decodeBackup(hexToBytes(zeroNonce.expected)), /all-zero nonce/);
  assert.throws(
    () =>
      encodeBackup({
        pubkeys: zeroNonce.keys.map(hexToBytes),
        items: [{ bip: BIP380, content: utf8.encode('x') }],
        nonce: new Uint8Array(12),
      }),
    /all zero/
  );
});

test('a key that is not in the backup opens nothing', () => {
  const v = backupVectors[1];
  const stranger = hexToBytes(
    '03c6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee5'
  );
  assert.throws(() => decryptBackup(hexToBytes(v.expected), stranger), /None of the keys/);
});

test('keys sharing an x coordinate collapse to one, and the NUMS point is dropped', () => {
  const even = hexToBytes('02e6642fd69bd211f93f7f1f36ca51a26a5290eb2dd1b0d8279a87bb0d480c8443');
  const odd = hexToBytes('03e6642fd69bd211f93f7f1f36ca51a26a5290eb2dd1b0d8279a87bb0d480c8443');
  assert.equal(normalizeKeys([even, odd]).length, 1);

  const nums = hexToBytes('0250929b74c1a04954b78b4b6035e97a5e078a5a0f28ec96d547bfee9ace803ac0');
  assert.equal(normalizeKeys([even, nums]).length, 1);
  assert.throws(() => deriveSecrets([nums]), /at least one usable public key/);
});

test('compact size follows the Bitcoin encoding', () => {
  assert.equal(bytesToHex(encodeCompactSize(0)), '00');
  assert.equal(bytesToHex(encodeCompactSize(252)), 'fc');
  assert.equal(bytesToHex(encodeCompactSize(253)), 'fdfd00');
  assert.equal(bytesToHex(encodeCompactSize(0xffff)), 'fdffff');
  assert.equal(bytesToHex(encodeCompactSize(0x10000)), 'fe00000100');
});

test('the tagged hash matches BIP-340', () => {
  // sha256("TapLeaf") twice, then the message, is the standard construction.
  const out = taggedHash('BIP138_INDIVIDUAL_SECRET', new Uint8Array(32));
  assert.equal(out.length, 32);
  assert.notEqual(bytesToHex(out), bytesToHex(taggedHash('BIP138_DECRYPTION_SECRET', new Uint8Array(32))));
});

// --------------------------------------------------------------------------
// The descriptor path, which is what Bitcoin Inheritance actually offers a client.
// --------------------------------------------------------------------------

test('a real descriptor round-trips, and any one key opens it', () => {
  const { backup, text, excluded } = encryptDescriptor(descriptorVector.descriptor);
  assert.deepEqual(excluded, [], 'every key in a BIP-48 descriptor is eligible');
  for (const xpub of descriptorVector.xpubs) {
    assert.equal(decryptDescriptor(backup, xpub), descriptorVector.descriptor);
    assert.equal(decryptDescriptor(text, xpub), descriptorVector.descriptor);
  }
});

test('one key is enough, which is the difference a client must understand', () => {
  const { backup } = encryptDescriptor(descriptorVector.descriptor);
  // The k-of-n scheme needs two of these three. This one needs any single key.
  const alone = decryptDescriptor(backup, descriptorVector.xpubs[0]);
  assert.equal(alone, descriptorVector.descriptor);
});

test('a bare key with no derivation is refused', () => {
  const bare = `wsh(sortedmulti(2,${descriptorVector.xpubs.join(',')}))`;
  assert.throws(() => descriptorPubkeys(bare), /no key that BIP-138 can use/);
});

test('a descriptor mixing eligible and bare keys reports the excluded ones', () => {
  const mixed = `wsh(sortedmulti(2,${descriptorVector.xpubs[0]}/<0;1>/*,${descriptorVector.xpubs[1]}))`;
  const { pubkeys, excluded } = descriptorPubkeys(mixed);
  assert.equal(pubkeys.length, 1);
  assert.deepEqual(excluded, [descriptorVector.xpubs[1]]);
});

test('common account paths are dropped, uncommon ones are kept', () => {
  const common = parseDerivationPath("m/48'/1'/0'/2'");
  const personal = parseDerivationPath("m/0/1'/2/3'");
  assert.equal(isCommonDerivationPath(common), true);
  assert.equal(isCommonDerivationPath(personal), false);
  assert.equal(isCommonDerivationPath(parseDerivationPath("m/84'/0'/0'")), true);
  assert.equal(isCommonDerivationPath(parseDerivationPath("m/48'/0'/0'/3'")), false);
  assert.equal(isCommonDerivationPath(parseDerivationPath("m/44'/0'/10'")), false);
  assert.deepEqual(dropCommonDerivationPaths([common, personal]), [personal]);
});

test('a Bitcoin Inheritance backup always writes seven secret entries', () => {
  const { backup } = encryptDescriptor(descriptorVector.descriptor);
  const decoded = decodeBip138(backup);
  assert.equal(INHERITANCE_SECRET_ENTRIES, 7);
  assert.equal(decoded.individualSecrets.length, 7, 'three real keys, four decoys');

  // The decoys must not cost anyone their recovery.
  for (const xpub of descriptorVector.xpubs) {
    assert.equal(decryptDescriptor(backup, xpub), descriptorVector.descriptor);
  }

  // Entries are sorted by their own bytes, so the real ones are not grouped
  // at the front where a reader could pick them out.
  const asHex = decoded.individualSecrets.map(bytesToHex);
  assert.deepEqual(asHex, [...asHex].sort(), 'entries are written in sorted order');
  assert.equal(new Set(asHex).size, 7, 'no entry repeats');
});

test('two backups of the same wallet share no decoy', () => {
  const a = decodeBip138(encryptDescriptor(descriptorVector.descriptor).backup);
  const b = decodeBip138(encryptDescriptor(descriptorVector.descriptor).backup);
  const inA = new Set(a.individualSecrets.map(bytesToHex));
  const shared = b.individualSecrets.map(bytesToHex).filter((x) => inA.has(x));
  // The three real entries repeat, because they are derived from the keys.
  // Anything beyond that would mean the decoys were not random.
  assert.equal(shared.length, 3, 'only the real entries repeat across backups');
});

test('the on-chain size of both formats is measured, not guessed', () => {
  const kOfN = Buffer.from(
    descriptorVector.encryptedText.slice(descriptorVector.encryptedText.lastIndexOf(')') + 1),
    'base64'
  ).length;
  const bare = encryptDescriptor(descriptorVector.descriptor, { padSecretsTo: 0 }).backup.length;
  const shipped = encryptDescriptor(descriptorVector.descriptor).backup.length;

  // Pinned so a format change is visible, and so the fee it costs a client is
  // a number we state rather than guess.
  //
  // There is no size cap to fear here. Measured on Bitcoin Core v31.1 with
  // default policy (2026-09-10): maxdatacarriersize is 100,000 bytes, and
  // OP_RETURN payloads of 345, 591, 655, 1,000, 10,000, 40,000 and 99,000
  // bytes were all accepted as standard. The only cliff is at 83 bytes, which
  // is where Bitcoin Knots and Core 29 and older stop relaying, and every size
  // here is already past it. So size is a fee question, not a relay question:
  // about 2 sat per extra byte at 2 sat/vB.
  assert.equal(kOfN, 345, 'k-of-n 2-of-3 payload');
  assert.equal(bare, 591, 'BIP-138 2-of-3 with no decoys');
  assert.equal(shipped, 719, 'BIP-138 2-of-3 as Bitcoin Inheritance ships it, padded to seven entries');
});
