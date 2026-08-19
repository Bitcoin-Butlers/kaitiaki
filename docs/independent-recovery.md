# Independent recovery

This document proves one promise: you can recover a payload from the
shares and `MANIFEST.age` with independent tools. You do not need this
project's code. You need:

- `age` (https://age-encryption.org), any stock build.
- Python 3 and the standalone combiner at
  [`contrib/combine.py`](../contrib/combine.py) (stdlib only, ~70 lines).

## Published vectors

The repository's own golden fixtures are the test vectors:

- `internal/core/testdata/v1-bundle/` — five share files
  (`SHARE-alice.txt` … `SHARE-eve.txt`), the encrypted payload
  `MANIFEST.age`, and the expected plaintext in `expected-output/`.
- `internal/core/testdata/v1-golden.json` — the same shares with the
  known passphrase, share bytes in hex, and checksums.
- `internal/core/testdata/v2-bundle/` and `v2-golden.json` — the same
  for format version 2.

The fixtures use a 3-of-5 split. The known v1 passphrase is
`dGhpc19pc19hX3Rlc3RfcGFzc3BocmFzZV92MV9nbGRu`.

## Format facts you need

- Shamir field: GF(2^8) with the AES polynomial `0x11b`
  (hashicorp/vault `shamir` package).
- A share is N y-bytes plus one trailing x-coordinate byte, where N is
  the secret length. Combine by Lagrange interpolation at `x = 0`.
- The secret is the age passphrase itself, as a UTF-8 string. The tool
  generates a base64url passphrase and splits its raw string bytes.
- `MANIFEST.age` is age scrypt-passphrase encryption over a gzipped
  tar archive of the payload directory.

## The command sequence

Run this from the repository root. It uses any 3 of the 5 fixture
shares.

```sh
cd internal/core/testdata/v1-bundle

# 1. Combine shares with the standalone combiner. It prints the
#    age passphrase.
python3 ../../../../contrib/combine.py \
    SHARE-alice.txt SHARE-carol.txt SHARE-eve.txt
# -> dGhpc19pc19hX3Rlc3RfcGFzc3BocmFzZV92MV9nbGRu

# 2. Decrypt with stock age. Type the passphrase from step 1 at the
#    prompt.
age -d -o manifest.tar.gz MANIFEST.age

# 3. Unpack and compare with the published expected output.
tar xzf manifest.tar.gz
diff -r manifest expected-output/manifest && echo MATCH
```

Verified result (2026-08-18, age v1.2.1, Python 3): step 1 printed the
known passphrase, step 2 decrypted, and step 3 printed `MATCH`. The
recovered `manifest/secret.txt` reads
`The secret passphrase is: correct-horse-battery-staple`.

## Fewer shares than the threshold

If you combine fewer than k shares, interpolation still produces
bytes, but they are garbage. age then rejects the passphrase. This
makes try-decrypt sound: attempt a combine and decrypt each time a new
share arrives, and stop when age accepts.

## Why this matters

The archives must outlive the software. Because recovery needs only
age, Python, and this document, this project is never a single point
of failure.
