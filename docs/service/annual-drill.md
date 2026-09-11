# Bitcoin Inheritance Annual Drill, Butler runbook + client sheets

**Remote, global. USD 195/year.** Once a year. One hour plus guardian
coordination. The drill is the service: it finds rot while rot is
cheap, before the funeral, never at it. Guardians join by video from
wherever they are; the rehearsal recovery runs on a guardian's own
computer with the Butler directing by voice only.

## Drill sequence

1. **Roll call.** Contact every guardian (not just k). Confirm: bundle
   still in their possession, still at the recorded location, readable
   media. Any guardian moved, estranged, or deceased → placement repair
   (re-seal with new guardian set; old bundles destroyed on camera).
2. **Media check.** Each guardian opens their bundle's zip listing (not
   the recovery) and confirms README + recover.html open. USB sticks
   rot; this catches it. Rotate media every 5 years or at first read
   error.
3. **Quorum recovery rehearsal.** k guardians (rotate WHICH k each
   year) perform a recovery: preferred via recover.html offline on a
   guardian's own computer; every third year, run the independence
   path instead, contrib/combine.py + stock age per
   docs/independent-recovery.md, so the client re-proves the tool
   is not a dependency.
4. **Read the on-chain descriptor back.** Only where the client has one.
   Take the transaction id from the estate insert, open the descriptor
   page's Recover panel, and rebuild the descriptor with the client's own
   keys. This checks three things at once: the estate insert still holds
   the right id, the client can still produce enough keys, and the chain
   copy still reads. It costs nothing and it takes two minutes.

   If the wallet changed since the last drill, the chain copy is stale.
   Publish a new one and write the new id on the insert. The old one stays
   on the chain forever and that is fine; the insert says which is current.

5. **Payload freshness.** Has the wallet changed (new cosigner, new
   descriptor, moved funds structure)? Stale payload = failed drill →
   re-seal session.
6. **Sign the drill record** in the estate insert: date, guardians
   confirmed, quorum used, recovery verified, payload version.

## Pass / fail

PASS: every guardian confirmed AND one quorum recovered the payload AND
payload matches current wallet reality. Anything less is a FAIL with a
named repair action and a booked follow-up. A failed drill is the
service working, say so to the client.

## Widow test

Each drill, one question answered in writing by the client: "If I am
gone tomorrow, who does your least-technical guardian call first, and
what do they read?" The answer must be one name and one page of the
estate insert. If it takes longer to answer, the insert needs work,
not the guardian.
