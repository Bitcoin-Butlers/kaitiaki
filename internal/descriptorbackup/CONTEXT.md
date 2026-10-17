# descriptorbackup

The words this package, its tests, the tickets and Ben all use for the same
thing. Use these and no synonym.

## The two formats

**Threshold format.** Any **k of n** of the wallet's extended public keys
rebuild the descriptor. A port of joshdoman/multisig-backup, kept byte for
byte compatible on purpose, so a client can paste our text into
multisigbackup.com and recover with no Bitcoin Butlers software in the path.
Only the ENCRYPT path lives here. The heir-side recover page stays in
TypeScript, so a grieving heir never loads the maker's WASM to read a backup.

**BIP-138.** **Any one** key opens it. Carries the descriptor as a BIP-380
content item, and the owner's recovery steps beside it as a `0x03` String item.
Say the one-key difference out loud in a placement session, because it changes
who can read the backup.

The page picks the format. Recovery steps present means BIP-138. The owner is
never asked to understand both.

## Terms

- **the chain** — the blockchain, in prose and in the UI. Never "blockchain".
- **descriptor backup** — the artifact this package makes. Never "session".
- **stripped descriptor** — the readable text in front of the threshold
  format's ciphertext: script type, threshold and derivation paths. A
  recovering heir needs them to know which keys to derive.
- **lookup tags** — four bytes per unordered pair of master fingerprints, so a
  scanner can find a backup from any two fingerprints. They reveal nothing
  without the keys.
- **individual secret** — one 32-byte entry per key in a BIP-138 backup,
  `xor(shared secret, taggedHash("BIP138_INDIVIDUAL_SECRET", key))`. It is a
  derived secret and never a key.
- **entry bucket** — the count a BIP-138 entry list is padded to: 5, 10 or 20.
  A 2-of-3 pads to five, a 3-of-7 to ten. Padding stops an onlooker counting
  the cosigners.
- **decoy** — a random 32-byte entry added to reach the bucket.

## Quirks that are not bugs

Two pieces of this look wrong and must not be "cleaned up" without a new
published vector, because the same logic runs on multisigbackup.com and our
bytes have to match it.

- `NumberToBytes(0)` returns NO bytes, so share index 0 contributes nothing to
  its key material.
- `sortsBefore` compares JavaScript's string form of a byte array, so
  `[2,0,0,0]` sorts AFTER `[10,0,0,0]`. That is not byte order, and byte order
  would put the lookup tags in a different order than the fallback tool.

## Tests

- `go test ./internal/descriptorbackup/` runs the BIP's own vectors and the
  published mainnet vector.
- `make test-xlang` proves Go and TypeScript open each other's backups. Run it
  after ANY change here. The browser writes with the Go code compiled to WASM
  and the heir-side page reads with the TypeScript, so a disagreement makes a
  client's backup unreadable by the page we point their heir at.

The published vector cannot be reproduced byte for byte. Shamir picks random
x-coordinates and coefficients per run, so the share bytes differ every time.
Compare the stripped descriptor, the encrypted key block, the lookup tags and
the total length, which is what the TypeScript test does too.
