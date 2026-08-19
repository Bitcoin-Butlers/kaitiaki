#!/usr/bin/env python3
# Standalone Shamir combiner for Kaitiaki / Rememory shares.
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
# `age -d` to decrypt MANIFEST.age. No Kaitiaki/Rememory code runs.
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
for f in sys.argv[1:]:
    txt = open(f).read()
    b64 = re.search(r"\n\n([A-Za-z0-9+/=]+)\n", txt).group(1)
    raw = base64.b64decode(b64)
    shares.append((raw[-1], raw[:-1]))

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

try:
    out = secret.decode("utf-8")
    if not out.isprintable():
        raise ValueError
except (UnicodeDecodeError, ValueError):
    # Non-text secret: print base64url instead.
    out = base64.urlsafe_b64encode(bytes(secret)).rstrip(b"=").decode()
print(out)
