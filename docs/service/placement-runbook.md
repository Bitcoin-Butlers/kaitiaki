# Kaitiaki Placement Session, Butler runbook

**Remote-first, offered globally. USD 495 (bundled free into the
multisig concierge package). One session, 2–3 hours, over video with
the client at their own computer.** In-person available where a Butler
is local; the choreography is identical.

Remote delivery is a security feature, not a compromise: every file and
every bundle stays on the client's machine and in the client's hands
for the entire session. Butlers see screens, never bytes: the client
shares their screen for guidance but never transfers the payload or
bundles to us.

One session, 2–3 hours, at the client's (virtual) table. The session ends with a
tested recovery, a completed estate insert, and every bundle physically
placed. Nothing about this session is technical from the client's side.

## Before the visit

- [ ] Client intake: what the payload is (descriptor, cosigner xpubs,
      wallet exports, estate letter). Confirm NO seed words in payload , 
      seeds are steel/codex32-kit territory; refuse them into Kaitiaki.
- [ ] Quorum worksheet done with the client in advance: guardians named,
      k-of-n chosen. Defaults that work: couple + lawyer = 2-of-3;
      whānau trust = 3-of-5. One guardian should be outside the household
      fire radius.
- [ ] Decide disclose vs --hide-quorum with the client (default:
      disclose; hide only when a stolen bundle must reveal nothing about
      the scheme's shape).
- [ ] For a multisig client: confirm they can export the wallet
      descriptor, and tell them Butlers pay the chain fee for putting it
      on Bitcoin. They need no node, no wallet software and no sats.
- [ ] Client prep sheet sent ahead: install/download checklist
      (kaitiaki binary or the web maker page saved locally), 3–5 blank
      USB sticks or microSD cards purchased by the client, printer for
      the estate insert. Remote rule: everything runs on the CLIENT's
      machine; the Butler never receives a file.

## The session

1. **Assemble the payload together.** Client drags files into
   manifest/. Read the manifest back aloud, what is here, what is
   deliberately not (no seeds).
2. **Seal.** `kaitiaki init` (k, n, guardian names) → `seal`. Show the
   client the bundles appearing; open one METADATA.yaml and read it , 
   this is the transparency moment.
3. **Live test recovery, before anything is placed.** Recover with k
   bundles on the spot (`kaitiaki recover` or one recover.html). The
   client watches their own files come back. Never skip this; it is the
   product.
4. **Put the wallet's descriptor on the chain.** Only for a client with a
   multisig wallet. Open bitcoinbutlers.com/tools/kaitiaki/descriptor.html
   with the client. Paste their descriptor, and read back what the page
   says it is (2 of 3, and the derivation path) before going on. Let the
   client choose who can open it: their wallet's own threshold, or any one
   of their keys. Explain the difference in one sentence each. Butlers pay
   opreturnbot.com to publish it, with its Private box ticked. Take the
   transaction id, the block height and the block hash.

   **Then read it back, in front of them.** Open the page's Recover panel,
   paste the transaction id, add the client's keys, and watch the
   descriptor come back. A backup nobody has read back is a guess. Write
   the four details onto the estate insert.

   Say the tradeoff plainly: this copy is public and permanent. Anyone can
   see that a wallet backup exists. Only their keys can open it. That is
   what makes it outlive Bitcoin Butlers and outlive the guardians.

5. **Place each bundle.** USB stick or archival microSD per guardian,
   labeled with the guardian's name and year only (never "BITCOIN").
   Record in the estate insert: guardian, location, date, media.
   Bundles that leave the session travel with the client or by the
   guardian's own hand, Butlers never retain a copy. Say this out loud.
6. **Guardian briefing sheets.** One per guardian (template below):
   what they hold, what it cannot do alone, what to do when contacted,
   and that the recovery page inside works offline in any browser.
7. **Estate insert into the client's documents.** Where the will lives.
8. **Book the first annual drill before leaving.**

## Rules that make it a Butlers service

- Butlers NEVER hold a bundle, a share, or the payload. We are the
  choreography, not a guardian. State it in session, print it in the
  insert.
- The client's k and n, guardian names, and locations exist only in the
  client's estate insert, not in Butlers records. Our file holds: date,
  drill schedule, and payload CATEGORIES only.
- If the client wants a Butler as a guardian: decline; offer to help
  them choose a professional (lawyer/accountant) instead.
- Butlers pay for the on-chain descriptor copy through opreturnbot.com,
  from the Butlers account. Never fund it from a client's coins, because
  that would tie their wallet to their own backup on the chain. Never put
  two clients in one transaction, because that states on the chain that
  they are one set.
