// Age encryption/decryption using typage (age-encryption npm package)

import { Decrypter } from 'age-encryption';

/**
 * Decrypt age-encrypted data using a passphrase (scrypt mode).
 * Returns the decrypted data as Uint8Array.
 */
export async function decrypt(
  encrypted: Uint8Array,
  passphrase: string
): Promise<Uint8Array> {
  const d = new Decrypter();
  d.addPassphrase(passphrase);

  // age-encryption expects the data in a format it can read
  // For Uint8Array input, we need to convert appropriately
  const result = await d.decrypt(encrypted, 'uint8array');
  return result;
}

const ARMOR_BEGIN = '-----BEGIN AGE ENCRYPTED FILE-----';

/**
 * Strip ASCII armor if present (typage only reads the binary age format;
 * the age CLI auto-detects armor, so armored files are what OWNER.age uses).
 */
export function dearmor(data: Uint8Array): Uint8Array {
  const text = new TextDecoder().decode(data).trim();
  if (!text.startsWith(ARMOR_BEGIN)) return data;
  const lines = text.split(/\r?\n/);
  const b64 = lines.slice(1, lines.length - 1).join('');
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * Decrypt an OWNER.age file with the owner's age identity
 * (AGE-SECRET-KEY-1...). Returns the bundle passphrase.
 */
export async function decryptOwnerAge(
  ownerAge: Uint8Array,
  identity: string
): Promise<string> {
  const d = new Decrypter();
  d.addIdentity(identity.trim());
  return await d.decrypt(dearmor(ownerAge), 'text');
}
