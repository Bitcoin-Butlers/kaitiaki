# Descriptor backup test vector

The descriptor backup page encrypts a multisig descriptor so that the
wallet's own keys unlock it. This file lets anyone check that our bytes
are the same bytes another implementation produces and reads.

**These wallets are BIP-39 test mnemonics. They hold nothing. Never use
them.**

## Threshold format (any k of n keys)

This format is the scheme published by
[joshdoman/multisig-backup](https://github.com/joshdoman/multisig-backup)
(MIT), reproduced byte for byte on purpose, so a client can recover at
multisigbackup.com with no Bitcoin Butlers software in the path.

### Inputs

Mnemonics, each with no passphrase:

```
abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about
legal winner thank year wave sausage worth useful legal winner thank yellow
letter advice cage absurd amount doctor acoustic avoid letter advice cage above
```

Account path for all three: `m/48'/0'/0'/2'`

Master fingerprints: `73c5da0a, b8688df1, 28645006`

Extended public keys:

```
xpub6DkFAXWQ2dHxq2vatrt9qyA3bXYU4ToWQwCHbf5XB2mSTexcHZCeKS1VZYcPoBd5X8yVcbXFHJR9R8UCVpt82VX1VhR28mCyxUFL4r6KFrf
xpub6FQya7zGhR92kacYsNnjreouvnHJMpXYsUXnW6NJJAJRCKsa26TzDy4LdnGhEurr3d6y1J8PJ7EEMKQp74XTqYvmGJNogYXSKDszYHtF8mX
xpub6DnEBNkSJKBYQmsbhS1sP9cNdtU5c9PLFGCjTJmxicxc13WB8zNNGQazabQpyFAGW5bV9tMko4uBxDxjUKL6dSAcx1tEbgEHtgSqyRsekh6
```

Descriptor:

```
wsh(sortedmulti(2,[73c5da0a/48h/0h/0h/2h]xpub6DkFAXWQ2dHxq2vatrt9qyA3bXYU4ToWQwCHbf5XB2mSTexcHZCeKS1VZYcPoBd5X8yVcbXFHJR9R8UCVpt82VX1VhR28mCyxUFL4r6KFrf/<0;1>/*,[b8688df1/48h/0h/0h/2h]xpub6FQya7zGhR92kacYsNnjreouvnHJMpXYsUXnW6NJJAJRCKsa26TzDy4LdnGhEurr3d6y1J8PJ7EEMKQp74XTqYvmGJNogYXSKDszYHtF8mX/<0;1>/*,[28645006/48h/0h/0h/2h]xpub6DnEBNkSJKBYQmsbhS1sP9cNdtU5c9PLFGCjTJmxicxc13WB8zNNGQazabQpyFAGW5bV9tMko4uBxDxjUKL6dSAcx1tEbgEHtgSqyRsekh6/<0;1>/*))
```

### Output

Encrypted text, 345 bytes of encrypted data after the
readable part:

```
wsh(sortedmulti(2,[48h/0h/0h/2h]<0;1>/*,[48h/0h/0h/2h]<0;1>/*,[48h/0h/0h/2h]<0;1>/*))CCQDZ+maZ+y+OQ3xN/t/RZCLXHg0rDBPAPxLFXpWi+D8rqeGVJ+QlP/v3vh84/7D71chAqsOuYfY72DZ7rC7ObyBg9YPUbUgXmW66Jn6iIbr4t39jhDoCVGG0a29hLZ5W9qzH9/HrHyt+BXgawtDuAl/E5Q4F+ZfORyTT+cZOTnND2uQQ6MVPUTOhyII4ixLC/y4ESC9EjzU4nTjtjTTdsijdeFRICvQY5dePPA5ZhqevBwi2OBkmV/FgPJichRTkIl7+vjbuWKwd7ylbnqK8q1L3v/yCtFzohW9rXEoBZGVKI63kdiDjHtNyaeTZ3eurWwihnPtAYsBhvxgpoM/9p2iU/11IpSTqkWc41MeO0mMIDXEi8TsoCzBLc8kqn+9HaVpJxoXovivKh70SuzUQXcMtRU9GLgiE+TI3HG5oNP50zeAwpbZLHXDDetqL5dIt//lNdXEWciU
```

The encrypted data in this vector was produced with a fixed 16-byte
secret, `0102030405060708090a0b0c0d0e0f10`, so that it is reproducible. In real use
the secret is fresh entropy, so two runs of the same descriptor produce
different text. Both open with the same keys.

### It is on the chain

This exact text was published on Bitcoin mainnet on 2026-09-10, so the
whole path can be checked by anyone with no software from us:

| | |
|---|---|
| Transaction | `4801ea9c10e14a5ea5c0e5e68bfe08fd2422005ea0a3a9631fead29ce910a4df` |
| Published through | opreturnbot.com, Private flag set |
| Payload | 545 bytes in one OP_RETURN output |
| Transaction size | 671 vB, 3,355 sat at 5 sat/vB |
| Confirmed in | block 966450, `00000000000000000000e747012e57d01eda2fa303a2a5da6c32eaadbfd493c7` |
| Mined by | ViaBTC, in the first block after broadcast |

Read the transaction on any explorer, take the OP_RETURN bytes as text,
and decrypt them with any two of the three keys above. You get the
descriptor above.

### Verify it independently

1. Open [multisigbackup.com](https://multisigbackup.com).
2. Go to the recover step and paste the encrypted text above.
3. Paste any two of the three extended public keys.
4. It prints the original descriptor.

That is the whole promise: the text survives us.

### Byte layout

After the readable descriptor comes unpadded base64 of, in order:

| Field | Size | Note |
|---|---|---|
| One sealed share per key | 33 bytes each | 32 when the wallet is 1 of n |
| Fingerprints, then key bodies | 4 and 74 bytes each | one ChaCha20 block |
| Lookup tags | 4 bytes per pair of fingerprints | optional, used to find the backup |

For this 2 of 3: 3 x 33 + (3 x 4 + 3 x 74) + 3 x 4 = 345 bytes.

Keys: the secret is 16 bytes of entropy; the data key is
HKDF-SHA256 of it with an empty salt and empty info; each share is sealed
with ChaCha20-Poly1305 under SHA-256(key body, ciphertext, share index).
Every nonce is zero, which is safe here because no two keys repeat.

## One-key format (BIP-138)

The one-key format follows
[BIP-138](https://github.com/bitcoin/bips/blob/master/bip-0138.md), which
has a number and the status Draft. It uses a random nonce and random decoy
entries, so there is no fixed output to publish. Check it against the BIP's
own vectors, which this repository runs in its test suite:
`internal/html/assets/src/crypto/testdata/bip138/`.

Two things about our encoder are worth stating:

- We drop the common account paths from the encoding, because a
  recovering wallet tries them anyway. The draft's end-to-end vectors do
  the same.
- We pad the entry list to the buckets the BIP asks for, 5, 10 and 20, so
  that counting the entries does not count the cosigners. A 2-of-3 pads to
  five and a 3-of-7 pads to ten. We wrote a fixed seven until 2026-09-22.
  That number covered every wallet up to seven cosigners, and it also marked
  our backups as ours among all BIP-138 backups. A 2-of-3 is 64 bytes
  smaller on the bucket: 655 bytes rather than 719.

## Running the checks

```
make test-ts
```

That type-checks and runs both suites: the threshold format against the
vector above, and the one-key format against every vector the BIP-138
draft ships.
