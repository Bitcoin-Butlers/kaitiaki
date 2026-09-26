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

1. **Assemble the payload together.** The whole session runs in Create
   Bundles (`maker.html`) on the CLIENT's machine. The client drags their
   files into step 2 of the page. Read the list back aloud, what is here,
   what is deliberately not (no seeds).

   Decided 2026-09-24: the browser makes the bundles, always. The command
   line makes the same bundles and is there for whoever wants it, but a
   placement never mixes the two, and this is why.

   The page's Save project.yml writes four things: name, threshold,
   language and the guardian list. The command line's `seal` reads the
   owner's texts from three OTHER fields in that file, `recovery_steps`,
   `chain_payload` and `chain_txid`, which the page never writes. Seal
   skips an empty field, so bundles sealed that way come out with no
   `HOW-THE-WALLET-WORKS.txt` and no `CHAIN-COPY.txt` at all. Not a
   missing transaction id. The owner's words and the whole chain copy,
   gone, in bundles that otherwise look finished.

   **Then ask them what their heirs need to know.** The maker asks this in
   its own step: the method in one group, the people and places in another.
   Do not write it for them. Read each example aloud, then let them answer
   in their own words. This is the part that dies with them, and it is the
   reason they are in the room.

   Say where each half goes, because the page says it and they should hear
   it too: both halves are sealed inside the encrypted archive and open
   only when enough guardians come together. The method may ALSO go on the
   chain if they ask for it. The people and places never do.
2. **Put the wallet's descriptor on the chain, BEFORE you seal.** Only for a client with a
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

   **Paste the transaction id back into the maker before you generate.**
   The field sits under the descriptor. This is the whole reason this step
   comes before the seal: the archive is encrypted and its key is split into
   the guardians' pieces at seal time, so an id discovered afterwards can
   never be added to it. Publish first and the id is sealed inside
   CHAIN-COPY.txt as well as written on the insert. Publish after and the
   insert is the only copy there will ever be.

   Reordered 2026-09-24. This step used to come after the seal, which is why
   no bundle ever carried an id.

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

3. **Generate.** Press Generate in Create Bundles. Show the client the
   bundles appearing, then open one bundle's `README.txt` and read it
   aloud. This is the transparency moment, and it does more work than it
   used to: it is the page their guardian will actually read, so the
   client hears exactly what that person can and cannot see. Point at
   what is NOT there, by name. No other guardian. Nothing the client
   wrote. Those are sealed.
4. **Live test recovery, before anything is placed.** Open one bundle's
   `recover.html` and add k bundles on the spot. The client watches their
   own files come back, and sees the sealed files arrive with them:
   `HOW-THE-WALLET-WORKS.txt`, `WHERE-THE-KEYS-ARE.txt`, and
   `CHAIN-COPY.txt` if they published one. Never skip this; it is the
   product.
5. **Write the transaction id on the estate insert too, and check it twice.**
   The bundles carry it only if you pasted it in at step 2. Either way the
   insert gets it, because the copy inside the archive needs enough
   guardians to open, and an heir who cannot reach that many has the insert
   and nothing else. `descriptor.html` cannot search the chain for a lost
   id. **A mistyped id costs that heir the chain copy.** Read it back to
   the client digit by digit.

   Changed 2026-09-24. The printed README used to carry the id on a blank
   line for you to fill in. That is gone: nothing an owner writes goes in a
   file that can be forwarded.

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

   **Say plainly that they will not know the other guardians.** A guardian
   who expects a contact list and finds none will think the bundle is
   broken. Tell them it is deliberate, and that it is what stops any two
   of them agreeing to open the client's backup between themselves. Tell
   them how a real request will reach them: with the client's estate
   papers, on a page that names them. Nothing else is proof.
8. **Estate insert into the client's documents.** Where the will lives.
   Before it goes in, say out loud what it is now the only copy of: the
   guardian list, the transaction id, and the page a guardian checks
   before releasing a piece. No bundle holds any of those. Lose the insert
   and the bundles cannot find each other. The client chose this over a
   second copy; make sure they chose it knowingly.
9. **Book the first annual drill before leaving.**

## Rules that make it a Butlers service

- Butlers NEVER hold a bundle, a share, or the payload. We are the
  choreography, not a guardian. State it in session, print it in the
  insert.
- The client's k and n, guardian names, and locations exist only in the
  client's estate insert, not in Butlers records and, since 2026-09-24,
  not in any bundle either. Our file holds: date,
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
