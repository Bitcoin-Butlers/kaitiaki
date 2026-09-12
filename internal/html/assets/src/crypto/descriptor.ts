/**
 * Encrypt and decrypt a multisig descriptor so that any k of its n extended
 * public keys can rebuild it.
 *
 * This is a port of the scheme in joshdoman/multisig-backup (MIT), kept byte
 * for byte compatible on purpose. A client who holds our ciphertext can paste
 * it into multisigbackup.com and recover there, with no Bitcoin Butlers
 * software in the path. That promise is the reason for every quirk this file
 * reproduces, so do not "clean up" the layout below without a new test vector.
 *
 * What the scheme protects: the master fingerprints and the extended public
 * keys. The script type, the threshold and the derivation paths stay in clear
 * text, because a recovering heir needs them to know which keys to derive.
 *
 * Sources of the primitives: @noble/ciphers, @noble/hashes, @scure/base and
 * shamir-secret-sharing. We write plumbing only.
 */

import { split, combine } from 'shamir-secret-sharing';
import { chacha20, chacha20poly1305 } from '@noble/ciphers/chacha.js';
import { sha256 as nobleSha256 } from '@noble/hashes/sha2';
import { hkdf as nobleHkdf } from '@noble/hashes/hkdf';
import { base58check as base58checkWith } from '@scure/base';

const base58check = base58checkWith(nobleSha256);

/** Bytes an extended key contributes once its 4 version bytes are removed. */
const XPUB_BODY_BYTES = 74;
/** Bytes a master fingerprint contributes. */
const XFP_BYTES = 4;
/** Bytes of entropy behind every backup. */
const SECRET_BYTES = 16;

const ZERO_NONCE = new Uint8Array(12);

export interface Multisig {
  requiredSigs: number;
  xfps: Uint8Array[];
  xpubs: Uint8Array[];
  derivationPaths: string[];
  numXfps: number;
  numXpubs: number;
}

export interface EncryptResult {
  /** Stripped descriptor followed by unpadded base64 of the encrypted data. */
  encryptedText: string;
  /** True when the descriptor omitted some fingerprints, which hurts recovery. */
  missingXfps: boolean;
  /** True when any key is a testnet key. */
  isTestnet: boolean;
}

export interface DecryptResult {
  descriptor?: string;
  decryptedShares: number;
  requiredShares: number;
}

// --------------------------------------------------------------------------
// Byte helpers. These match multisig-backup exactly, including its edge cases.
// --------------------------------------------------------------------------

function joinBytes(arrays: Uint8Array[]): Uint8Array {
  let total = 0;
  for (const a of arrays) total += a.length;
  const out = new Uint8Array(total);
  let at = 0;
  for (const a of arrays) {
    out.set(a, at);
    at += a.length;
  }
  return out;
}

/**
 * Big-endian, shortest form, and EMPTY for zero.
 *
 * Share index 0 therefore contributes no bytes at all to its key material.
 * That looks like a bug and is not one to fix here: the same function runs on
 * multisigbackup.com, so changing it would make our ciphertext unreadable
 * there. `descriptorNumberToBytes(0)` returning an empty array is pinned by a
 * test for exactly that reason.
 */
export function descriptorNumberToBytes(n: number): Uint8Array {
  const length = Math.ceil(Math.log2(n + 1) / 8);
  return Uint8Array.from(Array(length), (_unused, i) => (n >> (8 * (length - i - 1))) & 0xff);
}

function bytesToBase64Unpadded(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/=/g, '');
}

function base64ToBytes(text: string): Uint8Array {
  let binary: string;
  try {
    binary = atob(text);
  } catch {
    // atob throws a raw DOM exception, which is no use to a person holding
    // a half-copied backup. Say what is actually wrong.
    throw new Error(
      'The text after the policy is not valid base64. It looks like part of the backup is missing.'
    );
  }
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

function hexToBytes(hex: string): Uint8Array {
  const pairs = hex.match(/.{1,2}/g) || [];
  return new Uint8Array(pairs.map((byte) => parseInt(byte, 16)));
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** HKDF-SHA256 with an empty salt and empty info, 256 bits out. */
function deriveKey(secret: Uint8Array): Uint8Array {
  return nobleHkdf(nobleSha256, secret, new Uint8Array(0), new Uint8Array(0), 32);
}

/**
 * Accepts a BIP-32 path with or without a leading "m", in either hardened
 * notation. Replaces the single call multisig-backup makes into
 * @caravan/bitcoin, so this file carries no wallet-library dependency.
 */
function isValidBip32Path(path: string): boolean {
  if (path === '') return false;
  const body = path.startsWith('m/') ? path.slice(2) : path;
  if (body === '') return false;
  return body.split('/').every((part) => /^\d+['h]?$/.test(part));
}

// --------------------------------------------------------------------------
// Parsing
// --------------------------------------------------------------------------

/** Pulls every multisig group out of a descriptor. */
export function parseDescriptor(descriptor: string): { multisigs: Multisig[] } {
  if (descriptor.includes('tr(')) {
    // Taproot key aggregation puts the keys somewhere this layout cannot
    // describe. Upstream refuses it too, so a refusal here keeps both tools
    // agreeing about which descriptors have a backup at all.
    throw new Error('Taproot descriptors are not supported yet');
  }

  const groups = descriptor.match(/multi(?:_a)?\(([^)]*)\)/g);
  if (!groups) {
    throw new Error('Not a multisig descriptor. It must contain "[sorted]multi[_a](...)".');
  }

  const multisigs: Multisig[] = [];
  for (const group of groups) {
    const parts = group.match(/multi(?:_a)?\((\d+),([^)]+)/);
    if (!parts) throw new Error('Invalid descriptor format.');

    const requiredSigs = parseInt(parts[1], 10);
    const body = parts[2];
    const xfps = [...body.matchAll(/\[([a-f0-9]{8})\//g)].map((m) => hexToBytes(m[1]));
    const xpubs = [...body.matchAll(/([xyztuvUVYZ]pub[a-zA-Z0-9]{107})/g)].map((m) =>
      base58check.decode(m[1])
    );
    const numXpubs = body.split(',').length;
    const numXfps = body.split('[').length - 1;
    const derivationPaths = [...body.matchAll(/\[([0-9/'h]*)\]/g)]
      .map((m) => m[1])
      .filter((p) => isValidBip32Path(p));

    multisigs.push({ requiredSigs, xfps, xpubs, derivationPaths, numXfps, numXpubs });
  }

  return { multisigs };
}

/** Splits an encrypted descriptor back into its stripped text and its parts. */
export function parseEncryptedDescriptor(encryptedText: string) {
  // The checksum is stripped, so the descriptor always ends at the last ")"
  // and everything after it is base64.
  const parts = encryptedText.match(/(.*\))([A-Za-z0-9+/]*)/);
  if (!parts || parts.length !== 3) throw new Error('This is not an encrypted descriptor.');

  const strippedDescriptor = parts[1];
  const encodedData = base64ToBytes(parts[2]);
  const { multisigs } = parseDescriptor(strippedDescriptor);

  let totalXpubs = 0;
  let totalXfps = 0;
  let at = 0;
  const groupedEncryptedShares: { encryptedShares: Uint8Array[]; requiredSigs: number }[] = [];
  const bip32Paths: string[] = [];

  for (const { requiredSigs, numXfps, numXpubs, derivationPaths } of multisigs) {
    if (requiredSigs === 0 || numXpubs === 0) throw new Error('This is not an encrypted descriptor.');
    totalXpubs += numXpubs;
    totalXfps += numXfps;
    bip32Paths.push(...derivationPaths);

    // A Shamir share carries one extra index byte; a lone secret does not.
    const shareBytes = numXpubs > 1 && requiredSigs > 1 ? 33 : 32;
    if (at + shareBytes * numXpubs > encodedData.length) {
      throw new Error('This encrypted descriptor is truncated.');
    }

    const all = encodedData.slice(at, at + shareBytes * numXpubs);
    const encryptedShares = Array.from({ length: numXpubs }, (_unused, j) =>
      all.slice(j * shareBytes, (j + 1) * shareBytes)
    );

    // Accumulate. Upstream assigns here instead, which reads the second and
    // later groups from the wrong offset and makes a multi-group backup
    // impossible to open. For a single group, the only shape either tool
    // will encrypt, the two are identical because `at` starts at zero, so
    // this costs no compatibility and lets us read a blob upstream cannot.
    at += shareBytes * numXpubs;
    groupedEncryptedShares.push({ encryptedShares, requiredSigs });
  }

  const encryptedBytes = XFP_BYTES * totalXfps + XPUB_BODY_BYTES * totalXpubs;
  if (at + encryptedBytes > encodedData.length) {
    throw new Error('This encrypted descriptor is truncated.');
  }
  const encryptedData = encodedData.slice(at, at + encryptedBytes);

  // Optional lookup tags. Decryption never reads them.
  const numPairs = (totalXfps * (totalXfps - 1)) / 2;
  const xfpPairHashes =
    at + encryptedBytes + XFP_BYTES * numPairs <= encodedData.length
      ? encodedData.slice(at + encryptedBytes, at + encryptedBytes + XFP_BYTES * numPairs)
      : new Uint8Array(0);

  return {
    strippedDescriptor,
    groupedEncryptedShares,
    encryptedData,
    xfpPairHashes,
    totalXfps,
    totalXpubs,
    bip32Paths,
  };
}

// --------------------------------------------------------------------------
// Encrypt
// --------------------------------------------------------------------------

/**
 * Strips the sensitive parts out of a descriptor and encrypts them so that any
 * `k` of the descriptor's own extended public keys can put them back.
 *
 * `secret` exists only so tests can pin a vector. Leave it out in production
 * and the browser supplies fresh entropy.
 */
export async function encryptDescriptor(
  descriptor: string,
  secret?: Uint8Array
): Promise<EncryptResult> {
  const { multisigs } = parseDescriptor(descriptor);

  // A descriptor with more than one multisig group cannot be promised.
  // multisigbackup.com, the tool a client falls back to, reads the second
  // and later groups from the wrong offset and cannot open such a backup at
  // all. Refusing here is the only honest answer: the alternative is a
  // permanent, public, unopenable backup, which is worse than no backup.
  if (multisigs.length > 1) {
    throw new Error(
      'This descriptor has more than one multisig group, and this format cannot back it up safely. Back up the wallet another way.'
    );
  }

  const entropy = secret ?? crypto.getRandomValues(new Uint8Array(SECRET_BYTES));
  if (entropy.length !== SECRET_BYTES) {
    throw new Error(`The secret must be ${SECRET_BYTES} bytes`);
  }
  const derivedKey = deriveKey(entropy);

  const shares: Uint8Array[] = [];
  const xfpPairHashes: Uint8Array[] = [];
  const allXfps: Uint8Array[] = [];
  const allXpubs: Uint8Array[] = [];

  for (const { xfps, xpubs, requiredSigs } of multisigs) {
    if (xpubs.length < requiredSigs) {
      throw new Error('The descriptor has fewer keys than it requires signatures.');
    }

    // One tag per unordered pair, so a scanner can find the backup from any
    // two fingerprints. The tag reveals nothing without the keys themselves.
    for (let i = 0; i < xfps.length; i++) {
      for (let j = i + 1; j < xfps.length; j++) {
        const a = xfps[i];
        const b = xfps[j];
        const ordered = sortsBefore(a, b) ? [a, b] : [b, a];
        xfpPairHashes.push(nobleSha256(joinBytes(ordered)));
      }
    }

    if (xpubs.length > 1 && requiredSigs > 1) {
      shares.push(...(await split(entropy, xpubs.length, requiredSigs)));
    } else {
      // One key, or a 1-of-n: every holder gets the whole secret.
      shares.push(...xpubs.map(() => entropy));
    }

    allXfps.push(...xfps);
    allXpubs.push(...xpubs);
  }

  // Fingerprints first, then key bodies, in the order they appear.
  const plaintext = joinBytes([
    ...allXfps,
    ...allXpubs.map((xpub) => xpub.slice(4)),
  ]);
  const encryptedData = chacha20(derivedKey, ZERO_NONCE, plaintext);

  const data: Uint8Array[] = [];
  for (const [i, xpub] of allXpubs.entries()) {
    // Each share is locked to one key. The ciphertext and the index go into
    // the key material, so no two shares ever share a key. That is what makes
    // the all-zero nonce safe here.
    const key = nobleSha256(
      joinBytes([xpub.slice(4), encryptedData, descriptorNumberToBytes(i)])
    );
    data.push(chacha20poly1305(key, ZERO_NONCE).encrypt(shares[i]));
  }
  data.push(encryptedData);
  for (const hash of xfpPairHashes) data.push(hash.slice(0, XFP_BYTES));

  const strippedDescriptor = descriptor
    .replace(/[xyztuvUVYZ]pub[a-zA-Z0-9]{107}\/?/g, '')
    .replace(/\[[a-f0-9]{8}\//g, '[')
    .split('#')[0];

  const isTestnet = /[tuvUV]pub[a-zA-Z0-9]{107}/.test(descriptor);

  return {
    encryptedText: strippedDescriptor + bytesToBase64Unpadded(joinBytes(data)),
    missingXfps: allXfps.length < allXpubs.length,
    isTestnet,
  };
}

/**
 * True when `a` sorts before `b` the way multisig-backup sorts them.
 *
 * Upstream writes `(a < b)` on two Uint8Arrays. JavaScript turns each one into
 * its comma-joined decimal string first, so [2,0,0,0] sorts AFTER [10,0,0,0]
 * because "2," beats "10,". That is not byte order, and copying byte order
 * here would put the lookup tags in a different order than the tool a client
 * falls back to. Pinned by the tag bytes in the golden vector.
 */
function sortsBefore(a: Uint8Array, b: Uint8Array): boolean {
  return String(a) < String(b);
}

// --------------------------------------------------------------------------
// Decrypt
// --------------------------------------------------------------------------

/**
 * Rebuilds the descriptor from its encrypted text and at least `k` of its
 * extended public keys. Extra or wrong keys are allowed; they simply fail to
 * open their share.
 */
export async function decryptDescriptor(
  encryptedText: string,
  xpubs: string[]
): Promise<DecryptResult> {
  const { strippedDescriptor, groupedEncryptedShares, encryptedData, totalXfps, totalXpubs } =
    parseEncryptedDescriptor(encryptedText);

  const decoded: Uint8Array[] = [];
  // Keys are re-encoded with the version bytes of whichever key was supplied,
  // so a descriptor of Zpubs comes back as Zpubs.
  let versionBytes = hexToBytes('0488b21e');
  for (const xpub of xpubs) {
    if (!xpub) continue;
    const bytes = base58check.decode(xpub.trim());
    decoded.push(bytes);
    versionBytes = bytes.slice(0, 4);
  }

  let plaintext: Uint8Array | undefined;
  let shareIndex = 0;
  let requiredShares = 0;
  let decryptedShares = 0;

  for (const { encryptedShares, requiredSigs } of groupedEncryptedShares) {
    requiredShares = Math.max(requiredSigs, requiredShares);

    const opened: Uint8Array[] = [];
    for (const encryptedShare of encryptedShares) {
      for (const xpub of decoded) {
        try {
          const key = nobleSha256(
            joinBytes([xpub.slice(4), encryptedData, descriptorNumberToBytes(shareIndex)])
          );
          opened.push(chacha20poly1305(key, ZERO_NONCE).decrypt(encryptedShare));
        } catch {
          // Wrong key for this share. Try the next one.
        }
      }
      shareIndex++;
    }

    decryptedShares = opened.length;

    if (opened.length >= requiredSigs) {
      const secret = requiredSigs > 1 ? await combine(opened) : opened[0];
      plaintext = chacha20(deriveKey(secret), ZERO_NONCE, encryptedData);
    }
  }

  if (!plaintext) return { descriptor: undefined, decryptedShares, requiredShares };

  const xfps: string[] = [];
  const recoveredXpubs: string[] = [];
  for (let i = 0; i < totalXfps; i++) {
    xfps.push(bytesToHex(plaintext.slice(XFP_BYTES * i, XFP_BYTES * (i + 1))));
  }
  for (let i = 0; i < totalXpubs; i++) {
    const start = XFP_BYTES * totalXfps + XPUB_BODY_BYTES * i;
    recoveredXpubs.push(
      base58check.encode(
        joinBytes([versionBytes, plaintext.slice(start, start + XPUB_BODY_BYTES)])
      )
    );
  }

  let descriptor: string | undefined;
  if (recoveredXpubs.length > 0) {
    const xfpSlot = /\[(?![\da-f]{8})/g;
    const xpubSlot = /([,\]])([\d,)<])/g;
    let xfpIndex = 0;
    let xpubIndex = 0;
    descriptor = strippedDescriptor
      .replace(xpubSlot, (match, before, after) => {
        if (xpubIndex < recoveredXpubs.length) {
          const separator = !isNaN(after) || after === '<' ? '/' : '';
          return `${before}${recoveredXpubs[xpubIndex++]}${separator}${after}`;
        }
        return match;
      })
      .replace(xfpSlot, (match) => (xfpIndex < xfps.length ? `[${xfps[xfpIndex++]}/` : match));
  }

  return { descriptor, decryptedShares, requiredShares };
}
