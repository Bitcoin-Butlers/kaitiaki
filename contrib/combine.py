#!/usr/bin/env python3
# Standalone Shamir combiner for Bitcoin Inheritance / Rememory shares.
#
# Share format (hashicorp/vault shamir, as used by this project):
#   - Field: GF(2^8) with the AES polynomial 0x11b.
#   - Each share is the secret length in y-bytes, plus one trailing
#     x-coordinate byte.
#   - Combine: Lagrange interpolation at x = 0, byte by byte.
#
# The secret is the age passphrase itself, as a UTF-8 string.
# (The tool generates a base64url passphrase and splits its raw
# string bytes.)
#
# Usage:
#   python3 combine.py SHARE-a.txt SHARE-b.txt [SHARE-c.txt ...]
#
# Input files are the "-----BEGIN REMEMORY SHARE-----" text files.
# The script reads the base64 body of each file. It prints the
# recovered passphrase on stdout. Feed that passphrase to stock
# `age -d` to decrypt MANIFEST.age. No Bitcoin Inheritance/Rememory code runs.
#
# If you give fewer shares than the threshold, the output is garbage
# and age rejects it. That is expected and safe.
import base64
import re
import sys


def gmul(a, b):
    p = 0
    for _ in range(8):
        if b & 1:
            p ^= a
        hi = a & 0x80
        a = (a << 1) & 0xFF
        if hi:
            a ^= 0x1B
        b >>= 1
    return p


def ginv(a):
    # a^254 == a^-1 in GF(2^8)
    r = 1
    for _ in range(254):
        r = gmul(r, a)
    return r


shares = []
version = 1
for f in sys.argv[1:]:
    txt = open(f).read()
    m = re.search(r"Version:\s*(\d+)", txt)
    if m:
        version = max(version, int(m.group(1)))
    # Base64 body: one or more base64 lines after the blank line that
    # ends the headers (PDF copy/paste may wrap the body over lines).
    m = re.search(r"\n\s*\n((?:[A-Za-z0-9+/=]+\s*\n)+)", txt)
    if not m:
        sys.exit(f"{f}: no base64 share body found")
    raw = base64.b64decode(re.sub(r"\s", "", m.group(1)))
    if len(raw) < 2:
        sys.exit(f"{f}: share body too short")
    shares.append((raw[-1], raw[:-1]))

xs = [x for x, _ in shares]
if len(set(xs)) != len(xs):
    sys.exit("duplicate share detected (same x-coordinate): each file must be a different holder's share")
if len({len(y) for _, y in shares}) != 1:
    sys.exit("shares have different lengths: they are not from the same seal")

secret = bytearray(len(shares[0][1]))
for i in range(len(secret)):
    acc = 0
    for j, (xj, yj) in enumerate(shares):
        num = 1
        den = 1
        for m, (xm, _) in enumerate(shares):
            if m == j:
                continue
            num = gmul(num, xm)  # (0 - xm) == xm in GF(2^8)
            den = gmul(den, xj ^ xm)
        acc ^= gmul(yj[i], gmul(num, ginv(den)))
    secret[i] = acc

if version >= 2:
    # v2 shares split the raw random bytes; the age passphrase is their
    # base64url encoding (no padding).
    out = base64.urlsafe_b64encode(bytes(secret)).rstrip(b"=").decode()
else:
    # v1 shares split the passphrase string itself.
    try:
        out = secret.decode("utf-8")
        if not out.isprintable():
            raise ValueError
    except (UnicodeDecodeError, ValueError):
        out = base64.urlsafe_b64encode(bytes(secret)).rstrip(b"=").decode()
print(out)
