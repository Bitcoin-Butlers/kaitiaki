/**
 * BIP-138, the compact encryption scheme for non-seed wallet data.
 *
 * This is the second of the two on-chain backup formats Kaitiaki offers. It
 * differs from the k-of-n scheme in `descriptor.ts` in one way that matters to
 * a client: ANY ONE of the wallet's extended public keys opens a BIP-138
 * backup, where the other scheme needs k of them. Say that out loud in the
 * placement session, because it changes who can read the backup.
 *
 * Written against draft BIP-138 as of PR bitcoin/bips#1951, commit
 * 5af62cba9958a519218bcad8a0aae9e2090bb5bd (read 2026-09-10). The draft is
 * open and its bytes can still change, so the version byte and the conformance
 * tests against the draft's own vectors are what make a change safe to take.
 *
 * Primitives come from @noble/hashes, @noble/ciphers and @scure/base.
 */

import { chacha20poly1305 } from '@noble/ciphers/chacha.js';
import { sha256 } from '@noble/hashes/sha2';
import { base58check as base58checkWith, base64 } from '@scure/base';

const base58check = base58checkWith(sha256);
const utf8 = new TextEncoder();

/** ASCII "BIP138". */
export const MAGIC = Uint8Array.from([0x42, 0x49, 0x50, 0x31, 0x33, 0x38]);
/** The only format version this draft defines. */
export const VERSION = 0x01;
/** The only cipher this draft defines. */
export const ENCRYPTION_CHACHA20_POLY1305 = 0x01;
/** Content type 0x01 is "BIP number", and 380 is the descriptor BIP. */
export const BIP380 = 380;

/**
 * The BIP-341 NUMS point. Its private key is unknown by construction, so it is
 * public knowledge and must never seed a backup key.
 */
const NUMS_X_ONLY = '50929b74c1a04954b78b4b6035e97a5e078a5a0f28ec96d547bfee9ace803ac0';

export interface Bip138Backup {
  version: number;
  derivationPaths: number[][];
  individualSecrets: Uint8Array[];
  encryption: number;
  nonce: Uint8Array;
  ciphertext: Uint8Array;
}

export interface ContentItem {
  /** A BIP number for type 0x01 content. */
  bip: number;
  content: Uint8Array;
}

// --------------------------------------------------------------------------
// Bytes
// --------------------------------------------------------------------------

function concat(...arrays: Uint8Array[]): Uint8Array {
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

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function hexToBytes(hex: string): Uint8Array {
  const pairs = hex.match(/.{1,2}/g) || [];
  return new Uint8Array(pairs.map((b) => parseInt(b, 16)));
}

function xor(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length);
  for (let i = 0; i < a.length; i++) out[i] = a[i] ^ b[i];
  return out;
}

/** The BIP-340 tagged hash: sha256(sha256(tag) | sha256(tag) | message). */
export function taggedHash(tag: string, message: Uint8Array): Uint8Array {
  const t = sha256(utf8.encode(tag));
  return sha256(concat(t, t, message));
}

/** Bitcoin's compact-size integer. */
export function encodeCompactSize(n: number): Uint8Array {
  if (n < 0) throw new Error('A length cannot be negative');
  if (n < 0xfd) return Uint8Array.from([n]);
  if (n <= 0xffff) return Uint8Array.from([0xfd, n & 0xff, (n >> 8) & 0xff]);
  if (n <= 0xffffffff) {
    return Uint8Array.from([0xfe, n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >>> 24) & 0xff]);
  }
  const out = new Uint8Array(9);
  out[0] = 0xff;
  new DataView(out.buffer).setBigUint64(1, BigInt(n), true);
  return out;
}

function readCompactSize(bytes: Uint8Array, at: number): { value: number; next: number } {
  const first = bytes[at];
  if (first === undefined) throw new Error('The backup ends in the middle of a length');
  if (first < 0xfd) return { value: first, next: at + 1 };
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (first === 0xfd) return { value: view.getUint16(at + 1, true), next: at + 3 };
  if (first === 0xfe) return { value: view.getUint32(at + 1, true), next: at + 5 };
  return { value: Number(view.getBigUint64(at + 1, true)), next: at + 9 };
}

/** Lexicographic order on the bytes themselves. */
function byteOrder(a: Uint8Array, b: Uint8Array): number {
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return a.length - b.length;
}

// --------------------------------------------------------------------------
// Secrets
// --------------------------------------------------------------------------

/** Drops the parity byte from a 33-byte compressed key. */
export function toXOnly(pubkey: Uint8Array): Uint8Array {
  if (pubkey.length === 32) return pubkey;
  if (pubkey.length === 33) return pubkey.slice(1);
  throw new Error(`A public key must be 32 or 33 bytes, got ${pubkey.length}`);
}

/**
 * Normalizes a set of public keys the way the draft requires: to x-only, then
 * sorted, then de-duplicated, with the NUMS point removed.
 *
 * Two keys that differ only in parity share an x coordinate and so collapse to
 * one entry. The draft's own vectors cover both that case and plain duplicates.
 */
export function normalizeKeys(pubkeys: Uint8Array[]): Uint8Array[] {
  const xOnly = pubkeys.map(toXOnly).filter((p) => bytesToHex(p) !== NUMS_X_ONLY);
  const sorted = [...xOnly].sort(byteOrder);
  const unique: Uint8Array[] = [];
  for (const key of sorted) {
    if (unique.length === 0 || byteOrder(unique[unique.length - 1], key) !== 0) unique.push(key);
  }
  return unique;
}

/**
 * The shared decryption secret and one individual secret per key.
 *
 * The individual secrets come back in sorted key order, which is the order the
 * draft's secret vectors use. The encoder sorts them again by their own bytes
 * before writing them out, so the file order hides which key is whose.
 */
export function deriveSecrets(pubkeys: Uint8Array[]): {
  secret: Uint8Array;
  individualSecrets: Uint8Array[];
} {
  const keys = normalizeKeys(pubkeys);
  if (keys.length === 0) throw new Error('A backup needs at least one usable public key');
  const secret = taggedHash('BIP138_DECRYPTION_SECRET', concat(...keys));
  const individualSecrets = keys.map((key) =>
    xor(secret, taggedHash('BIP138_INDIVIDUAL_SECRET', key))
  );
  return { secret, individualSecrets };
}

// --------------------------------------------------------------------------
// Field encoding
// --------------------------------------------------------------------------

/** Parses "m/48'/0'/0'/2'" or "m/48h/0h/0h/2h" into BIP-32 child indexes. */
export function parseDerivationPath(path: string): number[] {
  const body = path.replace(/^m\/?/, '');
  if (body === '') return [];
  return body.split('/').map((part) => {
    const hardened = /['h]$/.test(part);
    const index = parseInt(hardened ? part.slice(0, -1) : part, 10);
    if (!Number.isInteger(index) || index < 0 || index > 0x7fffffff) {
      throw new Error(`"${part}" is not a valid derivation step`);
    }
    return hardened ? index + 0x80000000 : index;
  });
}

export function encodeDerivationPaths(paths: number[][]): Uint8Array {
  const encoded = paths.map((children) => {
    if (children.length === 0 || children.length > 255) {
      throw new Error('A derivation path must have 1 to 255 steps');
    }
    const out = new Uint8Array(1 + 4 * children.length);
    out[0] = children.length;
    const view = new DataView(out.buffer);
    children.forEach((child, i) => view.setUint32(1 + 4 * i, child >>> 0, false));
    return out;
  });
  // Sorted and de-duplicated, so the order leaks nothing about the encoder.
  const unique: Uint8Array[] = [];
  for (const path of [...encoded].sort(byteOrder)) {
    if (unique.length === 0 || byteOrder(unique[unique.length - 1], path) !== 0) unique.push(path);
  }
  if (unique.length > 255) throw new Error('A backup can carry at most 255 derivation paths');
  return concat(Uint8Array.from([unique.length]), ...unique);
}

const HARDENED = 0x80000000;

/**
 * True for the account paths every compliant wallet tries on its own during
 * recovery: BIP-44, 49, 84, 86 and 87 accounts 0 to 9, and the two BIP-48
 * script types, on mainnet and on test networks.
 */
export function isCommonDerivationPath(children: number[]): boolean {
  const hardened = (v: number) => v >= HARDENED && v - HARDENED <= 9;
  const [purpose, coin, account, script] = children;
  if (coin !== 0 + HARDENED && coin !== 1 + HARDENED) return false;
  if (!hardened(account)) return false;

  if (children.length === 3) {
    return [44, 49, 84, 86, 87].some((p) => purpose === p + HARDENED);
  }
  if (children.length === 4) {
    return purpose === 48 + HARDENED && (script === 1 + HARDENED || script === 2 + HARDENED);
  }
  return false;
}

/**
 * Drops the paths a recovering wallet would try anyway.
 *
 * Writing them out would cost 13 or 17 bytes each and would tell an observer
 * which script family the backup belongs to, for no gain. The draft's own
 * end-to-end vectors encode only the uncommon paths, so this is also what
 * conformance requires.
 */
export function dropCommonDerivationPaths(paths: number[][]): number[][] {
  return paths.filter((path) => !isCommonDerivationPath(path));
}

export function encodeIndividualSecrets(secrets: Uint8Array[]): Uint8Array {
  const unique: Uint8Array[] = [];
  for (const secret of [...secrets].sort(byteOrder)) {
    if (secret.length !== 32) throw new Error('An individual secret must be 32 bytes');
    if (unique.length === 0 || byteOrder(unique[unique.length - 1], secret) !== 0) {
      unique.push(secret);
    }
  }
  if (unique.length === 0 || unique.length > 255) {
    throw new Error('A backup carries 1 to 255 individual secrets');
  }
  return concat(Uint8Array.from([unique.length]), ...unique);
}

/** Content type 0x01: a BIP number as a big-endian 16-bit integer. */
export function encodeBipContentType(bip: number): Uint8Array {
  if (!Number.isInteger(bip) || bip < 0 || bip > 0xffff) throw new Error('Invalid BIP number');
  return Uint8Array.from([0x01, (bip >> 8) & 0xff, bip & 0xff]);
}

export function encodePayload(items: ContentItem[]): Uint8Array {
  if (items.length === 0) throw new Error('A payload must carry at least one content item');
  return concat(
    ...items.flatMap((item) => [
      encodeBipContentType(item.bip),
      encodeCompactSize(item.content.length),
      item.content,
    ])
  );
}

export function decodePayload(payload: Uint8Array): ContentItem[] {
  const items: ContentItem[] = [];
  let at = 0;
  while (at < payload.length) {
    const type = payload[at];
    // 0x00 ends the items. Everything after it is padding.
    if (type === 0x00) break;
    at += 1;
    if (type === 0x01) {
      const bip = (payload[at] << 8) | payload[at + 1];
      at += 2;
      const { value: length, next } = readCompactSize(payload, at);
      at = next;
      items.push({ bip, content: payload.slice(at, at + length) });
      at += length;
      continue;
    }
    if (type >= 0x80) throw new Error(`This backup uses content type 0x${type.toString(16)}, which this version cannot read`);
    // A known-shape unknown type: skip its params, then skip its content.
    const params = readCompactSize(payload, at);
    at = params.next + params.value;
    const body = readCompactSize(payload, at);
    at = body.next + body.value;
  }
  return items;
}

// --------------------------------------------------------------------------
// Container
// --------------------------------------------------------------------------

export interface EncodeOptions {
  /** Every public key that may open this backup, compressed or x-only. */
  pubkeys: Uint8Array[];
  items: ContentItem[];
  /** Extra 32-byte entries that hide how many keys are real. */
  decoySecrets?: Uint8Array[];
  /**
   * Pad the entry list with random decoys up to this many entries.
   *
   * The draft suggests buckets of 5, 10, 20. Kaitiaki uses 7, decided by Ben
   * on 2026-09-10: it covers every wallet up to seven cosigners without
   * jumping to ten, and the 128 extra bytes cost about 128 sat. An unusual
   * bucket would normally make our backups stand out, which does not apply
   * here because a BIP-138 backup already begins with the ASCII text BIP138.
   */
  padSecretsTo?: number;
  derivationPaths?: number[][];
  /** 12 bytes, never all zero. Supply it only to reproduce a vector. */
  nonce?: Uint8Array;
}

export function encodeBackup(options: EncodeOptions): Uint8Array {
  const { individualSecrets, secret } = deriveSecrets(options.pubkeys);

  const nonce = options.nonce ?? randomNonce();
  if (nonce.length !== 12) throw new Error('The nonce must be 12 bytes');
  if (nonce.every((b) => b === 0)) throw new Error('The nonce must not be all zero');

  const payload = encodePayload(options.items);
  const ciphertext = chacha20poly1305(secret, nonce).encrypt(payload);

  const entries = padWithDecoys(
    [...individualSecrets, ...(options.decoySecrets ?? [])],
    options.padSecretsTo
  );

  return concat(
    MAGIC,
    Uint8Array.from([VERSION]),
    encodeDerivationPaths(dropCommonDerivationPaths(options.derivationPaths ?? [])),
    encodeIndividualSecrets(entries),
    Uint8Array.from([ENCRYPTION_CHACHA20_POLY1305]),
    nonce,
    encodeCompactSize(ciphertext.length),
    ciphertext
  );
}

/**
 * Adds random 32-byte entries until the list holds `target` distinct ones.
 *
 * A decoy that collided with a real secret would be dropped by the encoder's
 * de-duplication and would quietly shrink the count back, so this checks.
 */
function padWithDecoys(secrets: Uint8Array[], target?: number): Uint8Array[] {
  if (!target || target <= secrets.length) return secrets;
  if (target > 255) throw new Error('A backup carries at most 255 individual secrets');

  const seen = new Set(secrets.map(bytesToHex));
  const padded = [...secrets];
  while (padded.length < target) {
    const decoy = crypto.getRandomValues(new Uint8Array(32));
    const key = bytesToHex(decoy);
    if (seen.has(key)) continue;
    seen.add(key);
    padded.push(decoy);
  }
  return padded;
}

/** How many individual-secret entries a Kaitiaki backup writes. */
export const KAITIAKI_SECRET_ENTRIES = 7;

/** A 12-byte nonce that is never all zero, as the draft requires. */
function randomNonce(): Uint8Array {
  for (;;) {
    const nonce = crypto.getRandomValues(new Uint8Array(12));
    if (!nonce.every((b) => b === 0)) return nonce;
  }
}

export function decodeBackup(bytes: Uint8Array): Bip138Backup {
  if (bytes.length < MAGIC.length + 1) throw new Error('This is not a BIP-138 backup');
  for (let i = 0; i < MAGIC.length; i++) {
    if (bytes[i] !== MAGIC[i]) throw new Error('This is not a BIP-138 backup');
  }
  let at = MAGIC.length;
  const version = bytes[at++];
  if (version !== VERSION) throw new Error(`This backup is format version ${version}, which this version cannot read`);

  const pathCount = bytes[at++];
  const derivationPaths: number[][] = [];
  for (let i = 0; i < pathCount; i++) {
    const childCount = bytes[at++];
    const children: number[] = [];
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    for (let c = 0; c < childCount; c++) {
      children.push(view.getUint32(at, false));
      at += 4;
    }
    derivationPaths.push(children);
  }

  const secretCount = bytes[at++];
  if (secretCount === 0) throw new Error('This backup carries no individual secrets');
  const individualSecrets: Uint8Array[] = [];
  for (let i = 0; i < secretCount; i++) {
    individualSecrets.push(bytes.slice(at, at + 32));
    at += 32;
  }

  const encryption = bytes[at++];
  const nonce = bytes.slice(at, at + 12);
  at += 12;
  if (nonce.length !== 12 || nonce.every((b) => b === 0)) {
    throw new Error('This backup has an all-zero nonce, which is not allowed');
  }

  const { value: length, next } = readCompactSize(bytes, at);
  at = next;
  const ciphertext = bytes.slice(at, at + length);
  if (ciphertext.length !== length) throw new Error('This backup is truncated');
  // Any bytes after the ciphertext are reserved and ignored on purpose.

  return { version, derivationPaths, individualSecrets, encryption, nonce, ciphertext };
}

/**
 * Opens a backup with one public key. Tries every entry in the file, so decoy
 * entries cost the reader nothing but a few failed authentications.
 */
export function decryptBackup(bytes: Uint8Array, pubkey: Uint8Array): ContentItem[] {
  const backup = decodeBackup(bytes);
  if (backup.encryption !== ENCRYPTION_CHACHA20_POLY1305) {
    throw new Error(`This backup uses cipher ${backup.encryption}, which this version cannot read`);
  }
  const mine = taggedHash('BIP138_INDIVIDUAL_SECRET', toXOnly(pubkey));

  for (const entry of backup.individualSecrets) {
    try {
      const payload = chacha20poly1305(xor(entry, mine), backup.nonce).decrypt(backup.ciphertext);
      return decodePayload(payload);
    } catch {
      // Not our entry, or a decoy. Try the next one.
    }
  }
  throw new Error('None of the keys you supplied can open this backup');
}

// --------------------------------------------------------------------------
// Descriptors
// --------------------------------------------------------------------------

/**
 * The root public keys of a descriptor's eligible key expressions.
 *
 * Only extended keys with a trailing derivation step or wildcard count. A bare
 * xpub or a literal public key is refused, because its root key is also the key
 * that appears on chain, so one observed spend would hand an outsider the
 * decryption secret.
 */
export function descriptorPubkeys(descriptor: string): {
  pubkeys: Uint8Array[];
  excluded: string[];
} {
  const pubkeys: Uint8Array[] = [];
  const excluded: string[] = [];

  const expression = /([xyztuvUVYZ]pub[a-zA-Z0-9]{107})((?:\/(?:\d+['h]?|<[\d;'h]+>|\*))*)/g;
  for (const match of descriptor.matchAll(expression)) {
    const [, xpub, trailing] = match;
    if (!trailing || trailing === '') {
      excluded.push(xpub);
      continue;
    }
    // The last 33 bytes of the 78-byte payload are the compressed key.
    pubkeys.push(base58check.decode(xpub).slice(45));
  }

  if (pubkeys.length === 0) {
    throw new Error('This descriptor has no key that BIP-138 can use. Every key needs a derivation step or a wildcard.');
  }
  return { pubkeys, excluded };
}

/** Wraps a descriptor as a BIP-380 content item and encodes a backup. */
export function encryptDescriptor(
  descriptor: string,
  options: Omit<EncodeOptions, 'pubkeys' | 'items'> = {}
): { backup: Uint8Array; text: string; excluded: string[] } {
  const { pubkeys, excluded } = descriptorPubkeys(descriptor);
  const backup = encodeBackup({
    padSecretsTo: KAITIAKI_SECRET_ENTRIES,
    ...options,
    pubkeys,
    items: [{ bip: BIP380, content: utf8.encode(descriptor) }],
  });
  return { backup, text: base64.encode(backup), excluded };
}

/** Opens a BIP-380 descriptor backup with one extended public key. */
export function decryptDescriptor(backup: Uint8Array | string, xpub: string): string {
  const bytes = typeof backup === 'string' ? base64.decode(backup.trim()) : backup;
  const pubkey = base58check.decode(xpub.trim()).slice(45);
  const items = decryptBackup(bytes, pubkey);
  const descriptor = items.find((item) => item.bip === BIP380);
  if (!descriptor) throw new Error('This backup holds no descriptor');
  return new TextDecoder().decode(descriptor.content);
}
