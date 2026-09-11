# Owner key test vector

The owner key feature adds `OWNER.age` to bundles: the recovery
passphrase encrypted to an age X25519 recipient. This file gives a
reference vector so any implementation (and any auditor) can verify the
derivation and the recovery path independently.

## Random owner key (the default)

No vector needed: any age keypair works.

```
age-keygen -o owner-key.txt
```

## Seed-derived owner key (opt-in, concierge)

Derivation: BIP39 mnemonic (+ optional passphrase) -> 64-byte BIP39
seed (PBKDF2-HMAC-SHA512, 2048 rounds, salt "mnemonic"+passphrase) ->
SLIP-21 node m/"inheritance" -> the node's key (bytes 32..64) is the
X25519 scalar of the age identity.

SLIP-21 (https://github.com/satoshilabs/slips/blob/master/slip-0021.md):

```
master        = HMAC-SHA512(key = "Symmetric key seed", msg = seed)
child(label)  = HMAC-SHA512(key = parent[0:32], msg = 0x00 || label)
key(node)     = node[32:64]
```

### Vector

```
mnemonic   = "all all all all all all all all all all all all"
passphrase = ""
label      = "inheritance"

identity   = AGE-SECRET-KEY-1E3PUXA5R3R9Y3R9DPTF57F8HD4YXL7DNWWGUJMRMTFWNARP3KQFSJ2M754
recipient  = age17pv0xledcth6mtfpgmtaxc3gahxdkt5ad79cxwxtgj966kqxq9fs3m8ced
```

Intermediate values for debugging, from the SLIP-0021 spec's example
seed (same mnemonic):

```
seed    = c76c4ac4f4e4a00d6b274d5c39c700bb4a7ddc04fbc6f78e85ca75007b5b495f
          74a9043eeb77bdd53aa6fc3a0e31462270316fa04b8c19114c8798706cd02ac8
key(m)  = dbf12b44133eaab506a740f6565cc117228cbf1dd70635cfa8ddfdc9af734756
```

## Independent recovery check

Given a bundle made with the recipient above:

```
echo "AGE-SECRET-KEY-1E3PUXA5R3R9Y3R9DPTF57F8HD4YXL7DNWWGUJMRMTFWNARP3KQFSJ2M754" > id.txt
age -d -i id.txt OWNER.age        # prints the recovery passphrase
age -d MANIFEST.age > archive.zip # enter that passphrase when asked
```

`OWNER.age` is ASCII-armored; the age CLI detects this automatically.
Implementations using typage (the age JavaScript library) must strip
the armor before decrypting.

DO NOT use the vector mnemonic for real funds or real backups. It is a
public test value.
