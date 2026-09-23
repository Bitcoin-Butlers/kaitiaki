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
3. **Quorum recovery rehearsal. The guardian drives, and you stay
   silent.** k guardians (rotate WHICH k each year) perform a recovery:
   preferred via recover.html offline on a guardian's own computer;
   every third year, run the independence path instead,
   contrib/combine.py + stock age per docs/independent-recovery.md, so
   the client re-proves the tool is not a dependency.

   **Hand the keyboard to the least technical guardian present.** You do
   not touch it. You do not answer a question the first time it is
   asked, because a real recovery has nobody to ask. Answer on the
   second ask, and write down that you had to.

   A Butler who drives this step proves the Butler can recover. That is
   not the thing the client is buying. The client is buying the
   confidence that these people, on a bad day, without you, can do it.

   **The list of places they hesitated is the drill's real output.**
   Every pause, every reread, every wrong click. Most of them are fixed
   by a sentence in the estate insert or a clearer guardian briefing,
   not by teaching the guardian. If the same pause appears two years
   running, the document is wrong and the guardian is fine.
4. **Read the on-chain descriptor back.** Only where the client has one.
   Take the transaction id from the estate insert, open the descriptor
   page's Recover panel, and rebuild the descriptor with the client's own
   keys. This checks three things at once: the estate insert still holds
   the right id, the client can still produce enough keys, and the chain
   copy still reads. It costs nothing and it takes two minutes.

   **Then read the bundle's copy too, and compare.** Every bundle carries
   the chain copy in its own README, so an heir who cannot gather enough
   guardians still has a way in. Open one guardian's README and check the
   text matches what came off the chain. Two reads, not one.

   **If the two differ, find out WHICH part differs. They are not the same
   problem.** Corrected 2026-09-23: this step used to assume the bundles were
   the older copy. It is the other way round. A bundle is re-issued whenever
   the owner revises anything, and the chain copy can never be re-written, so
   the chain copy is the one that goes out of date.

   **The words differ, the descriptor matches. Expected. Do nothing.**
   The owner revised their instructions and the bundles carry the new ones.
   The chain copy holds the words as they were on the day it was published,
   and it always will. That is the design, not a fault. Tell the client the
   bundle is the copy that counts and move on.

   **The descriptor differs. This is the failure.** The chain copy names a
   wallet that no longer exists, so the day every bundle is gone, it leads an
   heir to nothing. Publish a new chain copy, write the new transaction id on
   the insert, and say plainly that the old one stays on the chain forever and
   is now wrong. This is the only case that triggers a republish, and Bitcoin
   Butlers pays for it.

   **The chain copy will not read at all.** Not stale. Broken, or the client
   cannot produce enough keys. Treat it as a failed drill and repair it before
   you leave.

   Whichever it is, the rule the heir follows never changes and the client
   should hear it in these words: if the bundle and the chain copy disagree,
   use the bundle. The bundle is newer and it carries its own date.

5. **Payload freshness.** Has the wallet changed (new cosigner, new
   descriptor, moved funds structure)? Stale payload = failed drill →
   re-seal session.

   A re-seal re-issues EVERY bundle, not the ones that changed. The maker
   generates a fresh secret and splits it anew, so a guardian's old piece and
   another guardian's new piece cannot be combined at all. A client left
   holding a mix has no working plan, and nothing on the outside of the
   bundles would show it. Collect and destroy the old media in the same
   session.
6. **Sign the drill record** in the estate insert: date, guardians
   confirmed, quorum used, recovery verified, payload version.

## Pass / fail

PASS: every guardian confirmed AND one quorum recovered the payload
WITH A GUARDIAN DRIVING AND THE BUTLER SILENT AND payload matches
current wallet reality. A recovery the Butler drove is a demonstration
and does not count as a pass. Anything less is a FAIL with a
named repair action and a booked follow-up. A failed drill is the
service working, say so to the client.

A chain copy whose WORDS are out of date does not fail a drill. It is the
expected state of a copy that cannot be re-written, and the bundles carry the
current words. A chain copy whose DESCRIPTOR is out of date does fail it,
because it points an heir at a wallet that no longer exists.

## Widow test

Each drill, one question answered in writing by the client: "If I am
gone tomorrow, who does your least-technical guardian call first, and
what do they read?" The answer must be one name and one page of the
estate insert. If it takes longer to answer, the insert needs work,
not the guardian.
