# hide-quorum: design and remaining work

## What ships now

`rememory init --hide-quorum` stores `hide_quorum: true` in
`project.yml`. On seal:

- Share headers omit `Total:` and `Threshold:` (encoded as 0
  internally; `ParseShare` and `ParseCompact` accept the absence).
- README.txt and README.pdf omit every k-of-N statement, including
  the metadata footers.
- METADATA.yaml omits `threshold` and `total_shares`.
- `project.yml` keeps the real values. It stays outside the bundles,
  so the owner still knows the quorum.

CLI recovery works by try-decrypt: `rememory recover` combines the
shares you give it and attempts decryption. With too few shares the
combined passphrase is garbage and age rejects it (proven in the
2026-08-18 evaluation). Add a share and try again.

Disclose stays the default. Hiding the quorum trades recovery UX for
privacy; most users should not hide it.

## Remaining work

1. **recover.html (browser recovery).** The TypeScript app
   (`internal/html/assets/src/app.ts`) drives its UI from the
   threshold: progress checkmarks, "N more shares needed" text, and
   auto-combine when the count is reached. With threshold 0 it needs a
   try-decrypt loop: after each share is added, attempt combine +
   decrypt, show "not enough shares yet" on failure, and show a
   "Try recovery" button instead of a countdown. The Go side already
   passes Threshold/Total = 0 into `PersonalizationData`; only the JS
   needs the new mode.

2. **Compact/QR format.** `RM2:i:0:0:data:check` keeps the 6-field
   layout. An observer of one QR learns that the quorum is hidden, but
   not the quorum. A future format bump could drop the fields.

3. **`verify` command and translated templates.** Audit
   `rememory verify` / `verify-bundle` output and the non-English
   readme strings for stray "N of M" phrasing with zero values.

4. **Tests.** Add an e2e test: init --hide-quorum, seal, assert no
   quorum string in any bundle artifact (including the PDF text), and
   recover with exactly k bundles. Done by hand on 2026-08-18; not yet
   automated.
