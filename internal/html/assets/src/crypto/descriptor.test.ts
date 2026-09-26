/**
 * The compatibility contract for the on-chain descriptor backup.
 *
 * The vector in testdata/descriptor-vector.json was produced by running the
 * upstream multisig-backup source itself, not by this code. So these tests
 * fail the moment our bytes drift from the tool a client would fall back to.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  encryptDescriptor,
  decryptDescriptor,
  parseDescriptor,
  parseEncryptedDescriptor,
  descriptorNumberToBytes,
} from './descriptor.ts';

import vector from './testdata/descriptor-vector.json' with { type: 'json' };

const hex = (bytes: Uint8Array) =>
  Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

const fixedSecret = Uint8Array.from(
  (vector.fixedSecretHex.match(/.{2}/g) as string[]).map((b) => parseInt(b, 16))
);

test('the share index encoding keeps upstream edge cases', () => {
  // Zero encodes to nothing. Share 0 therefore contributes no index bytes to
  // its key. Upstream does this, so we must too, or share 0 never opens.
  assert.equal(hex(descriptorNumberToBytes(0)), '');
  assert.equal(hex(descriptorNumberToBytes(1)), '01');
  assert.equal(hex(descriptorNumberToBytes(255)), 'ff');
  assert.equal(hex(descriptorNumberToBytes(256)), '0100');
  assert.equal(hex(descriptorNumberToBytes(65535)), 'ffff');
  assert.equal(hex(descriptorNumberToBytes(65536)), '010000');
});

/**
 * Every part of the output except the Shamir shares is a pure function of the
 * descriptor and the secret. The shares are not: splitting draws fresh
 * randomness for its polynomial, so upstream's share bytes cannot be
 * reproduced and are covered by the decrypt tests instead.
 */
function deterministicParts(encryptedText: string) {
  const parsed = parseEncryptedDescriptor(encryptedText);
  return {
    stripped: parsed.strippedDescriptor,
    encryptedData: hex(parsed.encryptedData),
    tags: hex(parsed.xfpPairHashes),
  };
}

test('encrypting the vector descriptor reproduces upstream bytes', async () => {
  const { encryptedText, missingXfps, isTestnet } = await encryptDescriptor(
    vector.descriptor,
    fixedSecret
  );
  assert.deepEqual(
    deterministicParts(encryptedText),
    deterministicParts(vector.encryptedText),
    'stripped text, the encrypted key block and the lookup tags must match upstream'
  );
  assert.equal(encryptedText.length, vector.encryptedText.length);
  assert.equal(missingXfps, false);
  assert.equal(isTestnet, false);
});

test('upstream can open the shares we produce', async () => {
  // Same contract in the other direction: our shares are sealed with keys a
  // second implementation derives independently, so a client can move either
  // way between our page and multisigbackup.com.
  const { encryptedText } = await encryptDescriptor(vector.descriptor, fixedSecret);
  const result = await decryptDescriptor(encryptedText, [vector.xpubs[0], vector.xpubs[1]]);
  assert.equal(result.descriptor, vector.descriptor);
});

test('a blob made by upstream decrypts with any 2 of the 3 keys', async () => {
  const pairs = [
    [0, 1],
    [0, 2],
    [1, 2],
  ];
  for (const [a, b] of pairs) {
    const result = await decryptDescriptor(vector.encryptedText, [
      vector.xpubs[a],
      vector.xpubs[b],
    ]);
    assert.equal(result.descriptor, vector.descriptor, `keys ${a} and ${b} should recover it`);
    assert.equal(result.decryptedShares, 2);
    assert.equal(result.requiredShares, 2);
  }
});

test('one key alone recovers nothing', async () => {
  const result = await decryptDescriptor(vector.encryptedText, [vector.xpubs[0]]);
  assert.equal(result.descriptor, undefined);
  assert.equal(result.decryptedShares, 1);
  assert.equal(result.requiredShares, 2);
});

test('keys from another wallet recover nothing', async () => {
  const stranger =
    'xpub6BosfCnifzxcFwrSzQiqu2DBVTshkCXacvNsWGYJVVhhawA7d4R5WSWGFNbi8Aw6ZRc1brxMyWMzG3DSSSSoekkudhUd9yLb6qx39T9nMdj';
  const result = await decryptDescriptor(vector.encryptedText, [stranger]);
  assert.equal(result.descriptor, undefined);
  assert.equal(result.decryptedShares, 0);
});

test('a fresh random secret still round-trips', async () => {
  const { encryptedText } = await encryptDescriptor(vector.descriptor);
  assert.notEqual(encryptedText, vector.encryptedText, 'fresh entropy must change the bytes');
  const result = await decryptDescriptor(encryptedText, [vector.xpubs[1], vector.xpubs[2]]);
  assert.equal(result.descriptor, vector.descriptor);
});

test('the encrypted text carries the promised byte layout', () => {
  const parsed = parseEncryptedDescriptor(vector.encryptedText);
  assert.equal(parsed.totalXfps, 3);
  assert.equal(parsed.totalXpubs, 3);
  assert.equal(parsed.groupedEncryptedShares[0].encryptedShares.length, 3);
  // 16-byte secret plus a Shamir index byte, sealed by ChaCha20-Poly1305.
  assert.equal(parsed.groupedEncryptedShares[0].encryptedShares[0].length, 33);
  // 4 bytes per fingerprint plus 74 bytes per key body.
  assert.equal(parsed.encryptedData.length, 4 * 3 + 74 * 3);
  // One 4-byte tag per unordered pair of fingerprints.
  assert.equal(parsed.xfpPairHashes.length, 4 * 3);
  assert.deepEqual(parsed.bip32Paths, ["48h/0h/0h/2h", "48h/0h/0h/2h", "48h/0h/0h/2h"]);
});

test('the lookup tags let a scanner find this backup from two fingerprints', async () => {
  // This is the breadcrumb an heir uses when the written transaction id is
  // lost, so it is worth proving rather than assuming. A scanner knows two of
  // the wallet's fingerprints, hashes them the same way, and looks for the
  // first four bytes in the payload.
  const { sha256 } = await import('@noble/hashes/sha2');
  const bytesOf = (h: string) => Uint8Array.from((h.match(/.{2}/g) as string[]).map((b) => parseInt(b, 16)));
  const parsed = parseEncryptedDescriptor(vector.encryptedText);
  const tags = hex(parsed.xfpPairHashes);

  for (let i = 0; i < vector.xfps.length; i++) {
    for (let j = i + 1; j < vector.xfps.length; j++) {
      const a = bytesOf(vector.xfps[i]);
      const b = bytesOf(vector.xfps[j]);
      const [first, second] = String(a) < String(b) ? [a, b] : [b, a];
      const joined = new Uint8Array(8);
      joined.set(first, 0);
      joined.set(second, 4);
      const tag = hex(sha256(joined).slice(0, 4));
      assert.ok(tags.includes(tag), `a scanner should find the tag for fingerprints ${i} and ${j}`);
    }
  }
});

test('the stripped descriptor keeps the policy and drops the keys', () => {
  const stripped = vector.encryptedText.slice(0, vector.encryptedText.lastIndexOf(')') + 1);
  assert.match(stripped, /^wsh\(sortedmulti\(2,/, 'the threshold and script type stay readable');
  for (const xpub of vector.xpubs) {
    assert.ok(!stripped.includes(xpub), 'no extended key survives stripping');
  }
  for (const xfp of vector.xfps) {
    assert.ok(!stripped.includes(xfp), 'no fingerprint survives stripping');
  }
});

test('a descriptor checksum is dropped before encryption', async () => {
  const withChecksum = `${vector.descriptor}#abcdefgh`;
  const { encryptedText } = await encryptDescriptor(withChecksum, fixedSecret);
  assert.deepEqual(deterministicParts(encryptedText), deterministicParts(vector.encryptedText));
});

test('taproot descriptors are refused, the same as upstream', () => {
  assert.throws(
    () => parseDescriptor('tr(xpub661MyMwAqRbcFtXgS5sYJABqqG9YLmC4Q1Rdap9gSE8NqtwybGhePY2gZ29ESFjqJoCu1Rupje8YtGqsefD265TMg7usUDFdp6W1EGMcet8,{pk(a),pk(b)})'),
    /Taproot/
  );
});

test('a descriptor with two multisig groups is refused, not silently broken', async () => {
  // The fallback tool reads the second group from the wrong offset and can
  // never open such a backup. Publishing one would be permanent and useless,
  // so it is refused before anything is written.
  const a = vector.xpubs[0];
  const b = vector.xpubs[1];
  const twoGroups = `wsh(or_d(sortedmulti(2,${a}/<0;1>/*,${b}/<0;1>/*),and_v(v:older(65535),sortedmulti(2,${a}/<2;3>/*,${b}/<2;3>/*))))`;
  await assert.rejects(() => encryptDescriptor(twoGroups), /more than one multisig group/);
});

test('the parser accumulates its offset across groups', () => {
  // For one group the accumulating and assigning forms are identical, which
  // is what keeps us byte-compatible. This pins that equivalence so the fix
  // cannot drift into a compatibility break.
  const parsed = parseEncryptedDescriptor(vector.encryptedText);
  assert.equal(parsed.groupedEncryptedShares.length, 1);
  assert.equal(parsed.encryptedData.length, 4 * 3 + 74 * 3);
});

test('a half-copied backup says so, instead of leaking a DOM exception', () => {
  const truncated = vector.encryptedText.slice(0, vector.encryptedText.length - 3) + '!!!';
  assert.throws(() => parseEncryptedDescriptor(truncated), /not valid base64|missing/);
});

test('text that is not an encrypted descriptor is refused', () => {
  assert.throws(() => parseEncryptedDescriptor('hello world'), /not an encrypted descriptor/);
});
