# Kaitiaki Placement Session — Butler runbook

One session, 2–3 hours, at the client's table. The session ends with a
tested recovery, a completed estate insert, and every bundle physically
placed. Nothing about this session is technical from the client's side.

## Before the visit

- [ ] Client intake: what the payload is (descriptor, cosigner xpubs,
      wallet exports, estate letter). Confirm NO seed words in payload —
      seeds are steel/codex32-kit territory; refuse them into Kaitiaki.
- [ ] Quorum worksheet done with the client in advance: guardians named,
      k-of-n chosen. Defaults that work: couple + lawyer = 2-of-3;
      whānau trust = 3-of-5. One guardian should be outside the household
      fire radius.
- [ ] Decide disclose vs --hide-quorum with the client (default:
      disclose; hide only when a stolen bundle must reveal nothing about
      the scheme's shape).
- [ ] Butler laptop: offline-capable, kaitiaki binary present, printer
      access for the estate insert.

## The session

1. **Assemble the payload together.** Client drags files into
   manifest/. Read the manifest back aloud — what is here, what is
   deliberately not (no seeds).
2. **Seal.** `kaitiaki init` (k, n, guardian names) → `seal`. Show the
   client the bundles appearing; open one METADATA.yaml and read it —
   this is the transparency moment.
3. **Live test recovery, before anything is placed.** Recover with k
   bundles on the spot (`kaitiaki recover` or one recover.html). The
   client watches their own files come back. Never skip this; it is the
   product.
4. **Place each bundle.** USB stick or archival microSD per guardian,
   labeled with the guardian's name and year only (never "BITCOIN").
   Record in the estate insert: guardian, location, date, media.
   Bundles that leave the session travel with the client or by the
   guardian's own hand — Butlers never retain a copy. Say this out loud.
5. **Guardian briefing sheets.** One per guardian (template below):
   what they hold, what it cannot do alone, what to do when contacted,
   and that the recovery page inside works offline in any browser.
6. **Estate insert into the client's documents.** Where the will lives.
7. **Book the first annual drill before leaving.**

## Rules that make it a Butlers service

- Butlers NEVER hold a bundle, a share, or the payload. We are the
  choreography, not a guardian. State it in session, print it in the
  insert.
- The client's k and n, guardian names, and locations exist only in the
  client's estate insert — not in Butlers records. Our file holds: date,
  drill schedule, and payload CATEGORIES only.
- If the client wants a Butler as a guardian: decline; offer to help
  them choose a professional (lawyer/accountant) instead.
