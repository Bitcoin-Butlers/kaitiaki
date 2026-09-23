# Bitcoin Inheritance Placement Session, Butler runbook

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
      seeds are steel/codex32-kit territory; refuse them into Bitcoin Inheritance.
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
      (inheritance binary or the web maker page saved locally), 3–5 blank
      USB sticks or microSD cards purchased by the client, printer for
      the estate insert. Remote rule: everything runs on the CLIENT's
      machine; the Butler never receives a file.

## The session

1. **Assemble the payload together.** Client drags files into
   manifest/. Read the manifest back aloud, what is here, what is
   deliberately not (no seeds).

   **Then ask them what their heirs need to know.** The maker asks this in
   its own step: the method in one group, the people and places in another.
   Do not write it for them. Read each example aloud, then let them answer
   in their own words. This is the part that dies with them, and it is the
   reason they are in the room.

   Say where each half goes, because the page says it and they should hear
   it too: the method travels to the chain and into every bundle, the
   people and places stay sealed inside the encrypted archive.
2. **Seal.** `inheritance init` (k, n, guardian names) → `seal`. Show the
   client the bundles appearing; open one METADATA.yaml and read it , 
   this is the transparency moment.
3. **Live test recovery, before anything is placed.** Recover with k
   bundles on the spot (`inheritance recover` or one recover.html). The
   client watches their own files come back. Never skip this; it is the
   product.
4. **Put the wallet's descriptor on the chain.** Only for a client with a
   multisig wallet. In Create Bundles, where you already are, set the
   destination to "Bundles and the chain" and paste their descriptor. Read
   back what the page says it is (2 of 3, and the derivation path) before
   going on. The page picks the format: their words on the chain means any
   ONE of their keys opens it. Say that out loud.

   **Check the fee rate before you publish.** Open mempool.space. Publish
   when the rate is under 5 sat per vbyte. A chain backup is never urgent,
   so waiting a day costs nothing and it can save several thousand sat.

   You may already know. From 2026-09-23 the site estimates this cost when
   the client books, and emails Bitcoin Butlers when publishing that day
   would cost more than 21 US dollars. No alert does not mean go ahead: fees
   move between the booking and the session, so check mempool.space anyway.
   The alert warns, it never blocks, and the answer to an expensive day is
   always the same. Wait.

   Butlers pay opreturnbot.com to publish it, with its Private box ticked.
   Take the transaction id, the block height and the block hash.

   **Then read it back, in front of them.** Open
   bitcoinbutlers.com/tools/inheritance/descriptor.html,
   paste the transaction id, add the client's keys, and watch the
   descriptor come back. A backup nobody has read back is a guess. Write
   the four details onto the estate insert.

   Say the tradeoff plainly: this copy is public and permanent. Anyone can
   see that a wallet backup exists. Say who can open it in the same breath,
   because "only their keys" sounds like "only you" and is not the same
   thing. If they chose any-one-key, ANY one of their keys opens it, now or
   in twenty years, including a key they later stop using. That is the
   price of a copy that outlives Bitcoin Butlers and outlives the guardians.

   Tell them what the page put on the chain: the wallet's method, never the
   people or the places. Those stayed sealed inside the guardian bundles.

   **Say the argument against it, out loud, before they agree.** Something
   like: "Some very good Bitcoin engineers think this is the wrong use of
   the chain. Every node stores it forever and nobody but you needs it.
   Their alternative is to hide it in backups you keep anyway, and that is
   what your guardians are holding. This copy is for the day all of those
   are gone. You can skip it and I will not think less of the plan."

   Then wait. If they skip it, the placement is still complete. A client who
   was talked into a permanent public record did not consent to it.

5. **Write the transaction id onto every printed README.** Each bundle's
   README.pdf has a blank line for it, because the transaction did not
   exist when the bundles were made. Write the same id on every copy. It
   is proof the chain copy landed, and it is never the way in: the bundle
   already carries the chain copy itself, so a missing or mistyped id
   costs the heir nothing.

6. **Place each bundle.** USB stick or archival microSD per guardian,
   labeled with the guardian's name and year only (never "BITCOIN").
   Record in the estate insert: guardian, location, date, media. The media
   column is not bookkeeping. It is the retrieval list the owner needs the day
   they revise, because a revision replaces every bundle and they have to know
   what to swap. See `revision-session.md`.
   Bundles that leave the session travel with the client or by the
   guardian's own hand, Butlers never retain a copy. Say this out loud.
7. **Guardian briefing sheets.** One per guardian (template below):
   what they hold, what it cannot do alone, what to do when contacted,
   and that the recovery page inside works offline in any browser.
8. **Estate insert into the client's documents.** Where the will lives.
9. **Book the first annual drill before leaving.**

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
  from the Butlers account. Budget about 2,700 sat for a 2-of-3 carrying
  250 bytes of method, AT 2 SAT PER VBYTE. State the rate whenever you
  state the budget: the same transaction costs about 13,500 sat at 10 sat
  per vbyte, which is why the fee check in step 4 exists. Never fund it from a client's coins, because
  that would tie their wallet to their own backup on the chain. Never put
  two clients in one transaction, because that states on the chain that
  they are one set.
- This rule did not change when other Butlers could run a placement.
  Confirmed 2026-09-23: Bitcoin Butlers pays, whoever runs the session. The
  client pays their Butler's hourly rate for the length of the session and
  nothing else, and no Butler needs sats of their own to take this work.
  The alert in step 4 exists because Bitcoin Butlers carries the cost.
