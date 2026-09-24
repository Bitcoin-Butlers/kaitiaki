---
title: "Bitcoin Inheritance Guide"
subtitle: "How to make bundles, place them with guardians, and recover"
cli_guide_note: 'There is also a <a href="{{GITHUB_REPO}}/blob/main/docs/guide.md">guide for the command line</a>.'
nav_home: "Inheritance"
nav_home_link: "Home"
nav_create: "Create Bundles"
nav_recover: "Recover"
toc_title: "Contents"
footer_source: "Source Code"
footer_download: "Download"
footer_home: "Home"
---

## Overview {#overview}

Bitcoin Inheritance keeps the instructions around your bitcoin safe until the day someone else needs them. You choose the people who hold the pieces, and how many of them must agree before anything opens.

It encrypts your files with [age](https://github.com/FiloSottile/age) into one archive, splits the key into pieces with Shamir's Secret Sharing, and gives each guardian one self-contained bundle. A bundle holds the encrypted archive, one piece of the key, and the recovery tool.

Recovery is opening one file in a browser. It needs no server, no account and no internet connection, and it works if this website is gone. The one exception is a time-locked bundle, which needs a brief connection to check the date. See [Time-Delayed Recovery](#timelock).

<div class="tip">
<strong>No guardian can open anything alone.</strong> A 3 of 5 set needs three of the five guardians together. Two of them learn nothing.
</div>

This site has two tools:

- The **guardian bundles**, made on the [Create Bundles](maker.html) page and opened on the [Recover](recover.html) page. They hold files: your estate letter, your wallet descriptor, where your steel backups are, who to call.
- The **descriptor backup**, made in [Create Bundles](maker.html) and read back on the [Read a Descriptor Backup](descriptor.html) page. It is for multisig wallets only. It puts an encrypted copy of your wallet's descriptor on the Bitcoin chain, where nobody can lose it. See [Descriptor Backup on Bitcoin](#descriptor-backup).

Both tools are free and run in your browser. Bitcoin Butlers also offers them with a Butler on a video call. A [placement session](https://www.bitcoinbutlers.com/concierge/inheritance) ends with a tested recovery and a completed estate insert. An [annual drill](https://www.bitcoinbutlers.com/concierge/inheritance/drill) rehearses the recovery every year. A [descriptor backup](https://www.bitcoinbutlers.com/concierge/inheritance/descriptor) puts a multisig descriptor on the chain while you watch. The Butler guides. Your files stay on your machine, and no Butler ever holds a bundle.

## Why Bitcoin Inheritance {#why-bitcoin-inheritance}

Your seed words belong on steel or in a codex32 kit, offline, and nothing here changes that. The problem is everything around the seeds. Your family needs to know that a wallet exists, where the backups are, which software opens it, what the descriptor is, and who to call. Today one person holds all of that knowledge.

The common ways to pass it on each have a failure mode:

- **One person holds everything.** One accident, one falling out or one theft, and it is gone or exposed.
- **A sealed envelope with a lawyer.** One copy in one office. Whoever opens it reads everything.
- **A will.** A will becomes a public record, and probate is slow.
- **A password manager's emergency access.** The company has to exist and cooperate on the day, and one person gets everything.
- **Files split by hand.** Confusing, error-prone, and usually not encrypted.

Bitcoin Inheritance works differently:

- **Several people must agree.** No guardian can read anything alone, and no single loss ends the plan.
- **Nothing to keep running.** Recovery is one file in one browser. There is no server to keep alive and no company that has to exist.
- **Written for the person who opens it.** Each bundle explains what it is, what it cannot do alone, and who else to contact. The reader needs no help from you.

## Creating Bundles {#creating}

Three steps, all in your browser. Your files never leave your device. Open [Create Bundles](maker.html) to begin.

### Step 1: Add Guardians {#step1}

Add the people who hold one piece of the key each. Give each one a name and, if you want, a way to reach them. The contact details go into every bundle, so the guardians can find each other without you.

<figure class="screenshot">
<img src="screenshots/en/friends.png" alt="Adding guardians in Step 1">
<figcaption>Each person here holds one piece of the key</figcaption>
</figure>

Then set the **threshold**: how many guardians must come together to recover the files.

<div class="tip">
<strong>Choosing a threshold:</strong>
<ul>
<li><strong>3 guardians, threshold 2:</strong> the simplest setup. A couple and a lawyer is a common choice.</li>
<li><strong>5 guardians, threshold 3:</strong> a good balance for a wider family.</li>
<li><strong>7 guardians, threshold 4 or 5:</strong> harder to collude, more people to coordinate.</li>
</ul>
Set it high enough that a small group cannot act alone. Set it low enough that recovery still works when one or two people cannot be reached. Put at least one guardian outside your own household.
</div>

If the guardians should not know each other, use [Anonymous Mode](#anonymous).

### Step 2: Add Files {#step2}

Drag in the files or the folder you want to protect.

<figure class="screenshot">
<img src="screenshots/en/files.png" alt="Adding files in Step 2">
<figcaption>Add the files you want to protect</figcaption>
</figure>

**Good candidates:**

- An estate letter: your own letter to your family about what you hold, where it is, and what you want done with it
- Your wallet descriptor, or a wallet export, so the wallet can be rebuilt
- The extended public keys of each cosigner
- Where each steel backup or codex32 kit is kept, and who has access to it
- Which software and which devices open the wallet
- Who to call: your Butler, your lawyer, your accountant
- Recovery codes for a password manager, and where the legal documents are

<div class="warning">
<strong>Never put seed words or private keys in a bundle.</strong> Seeds belong on steel or in a codex32 kit, kept offline. Use Bitcoin Inheritance for the instructions around them: where the plates are, and who to call.
</div>

<div class="warning">
<strong>Files that change often do not belong here.</strong> Bundles hold things you set once and leave. When a file changes, you make new bundles.
</div>

### Step 3: What Your Heirs Need To Know {#step3}

A bundle full of files tells your heirs nothing about what to do with them. This step is where you write that down, in your own words.

<figure class="screenshot">
<img src="screenshots/en/owners-words.png" alt="Writing what your heirs need to know, in Step 3">
<figcaption>Six prompts in two groups, and where each group travels</figcaption>
</figure>

The page asks six questions in two groups.

**How the wallet works.** What kind of wallet it is, how many keys it takes to spend, which software opens it. This is the method.

**Where the keys are.** Which drawer, which safe, which person holds one. This is the part that dies with you, and it is the reason your heirs are stuck without it.

The two groups are kept apart on purpose, because they do not travel the same way.

- **The method** goes into every bundle, and onto the chain if you ask for it.
- **Where the keys are** goes into the bundle only, in a file called `WHERE-THE-KEYS-ARE.txt`, sealed inside the encrypted archive. It never goes on the chain. A list of where your keys live is the last thing that should be public and permanent.

Under the questions you choose where the method goes: **bundles only**, which is the default, or **the bundles and the chain**. Choosing the chain opens a box for your wallet's descriptor and shows you what it will cost, in characters and in sats, as you type.

You can leave all of it blank. The bundles still work. They will not tell anyone what to do with them.

### Step 4: Generate Bundles {#step4}

Click **Generate Bundles**. The page encrypts your files and makes one bundle for each guardian.

<figure class="screenshot">
<img src="screenshots/en/bundles.png" alt="Generating bundles in Step 4">
<figcaption>Download each bundle, or all at once</figcaption>
</figure>

Each bundle contains the full recovery tool. It works if this website is gone.

Two options live in this step:

- **Owner key (optional).** Gives you a way to open your own backup alone, without calling the guardians. See [Owner Key](#owner-key).
- **Advanced: Add a time lock.** Keeps the files closed until a date you choose, even if the guardians combine their pieces early. See [Time-Delayed Recovery](#timelock).

### Distributing to Guardians {#distributing}

Hand each guardian their bundle by the most private route you can manage. In order of preference:

1. **In person.** A USB stick or a microSD card, or the printed `README.pdf`, handed over directly. Label the media with the guardian's name and the year only. Never write the word bitcoin on it.
1. **An encrypted messenger.** Signal or another end-to-end encrypted messenger.
1. **Email or a cloud drive.** Avoid these for handing out bundles. The provider keeps a copy, and your account becomes a place where every piece can be collected.

If you send a bundle by email or messenger, delete it from your sent folder. Do this once the guardian confirms they have it. An account that holds every piece undoes the split.

### After Creating Bundles {#after-creating}

Before you put this away, do these things:

- Check that each guardian has their bundle and can open its `recover.html`.
- Tell each guardian what they hold, why they hold it, and that it does nothing alone. They need the others.
- You need no separate copy of the encrypted archive. Every guardian's bundle carries it, and it is useless without enough pieces.
- Save your `project.yml`, so you can make new bundles later. See [About project.yml](#project-file).
- Print `README.pdf` for each guardian. Paper needs no adapter, no power and no working device.
- Fill in an estate insert and keep it with your will. It is one printed page. It names the guardians, where each bundle lives, and how to start a recovery. It holds no secrets. The estate letter goes inside the bundles. The estate insert stays outside them. There is a [template]({{GITHUB_REPO}}/blob/main/docs/service/estate-insert.md) in the source repository.
- Set a yearly reminder. See [Keeping Bundles Current](#keeping-current).
- Run a [recovery drill](#recovery-drills). It is the only way to know that the plan works.

## Recovering Files {#recovering}

If you are reading this because someone has died or can no longer act, there is no time limit. The bundles do not expire. Work through the steps at your own pace, and ask the other guardians for help along the way.

You may have a bundle already. If not, open the [Recover](recover.html) page directly and add the pieces as you collect them from the other guardians.

### What Guardians Receive {#bundle-contents}

Each bundle is a ZIP file with these files inside:

<div class="bundle-contents">
<div class="file">
<span class="file-name">README.txt</span>
<span class="file-desc">What this is, your piece of the key, and the list of the other guardians</span>
</div>
<div class="file">
<span class="file-name">README.pdf</span>
<span class="file-desc">The same, laid out for printing, with your piece as a QR code and as a list of words</span>
</div>
<div class="file">
<span class="file-name">MANIFEST.age</span>
<span class="file-desc">The encrypted archive as a separate file. Present only when the archive is larger than 10 MB. A smaller archive sits inside recover.html instead.</span>
</div>
<div class="file">
<span class="file-name">OWNER.age</span>
<span class="file-desc">Only present when the owner set an owner key. It lets the owner recover alone and is useless to anyone else.</span>
</div>
<div class="file">
<span class="file-name">recover.html</span>
<span class="file-desc">The recovery tool. It opens in any browser, offline, with your piece already loaded.</span>
</div>
</div>

<p style="margin-top: 1rem;">
Each bundle is made for its guardian. Your piece is already inside your <code>recover.html</code>, and the contact list shows who else holds one. When the encrypted archive is 10 MB or smaller, it is inside your <code>recover.html</code>, and the bundle has no separate <code>MANIFEST.age</code>.
</p>

### Path A: I Have the Bundle ZIP {#recovery-bundle}

The simplest path. You have the bundle ZIP, or the files from it.

<div class="step-guide">
<div class="step-number">1</div>
<div class="step-content">
<h4>Extract the ZIP and open recover.html</h4>
<p>Open it in any modern browser. Your piece is already loaded.</p>
</div>
</div>

<div class="step-guide">
<div class="step-number">2</div>
<div class="step-content">
<h4>Add the encrypted archive</h4>
<p>For archives of 10 MB or less this is automatic, because the data is inside the page. Otherwise, drag <code>MANIFEST.age</code> from the bundle onto the page.</p>
</div>
</div>

<div class="step-guide">
<div class="step-number">3</div>
<div class="step-content">
<h4>Contact the others</h4>
<p>The page lists the other guardians and how to reach them. Ask each of them for their <code>README.txt</code>, or for their words over the phone.</p>
</div>
</div>

<div class="step-guide">
<div class="step-number">4</div>
<div class="step-content">
<h4>Add their pieces</h4>
<p>For each guardian: drag their <code>README.txt</code> onto the page, paste the text, or scan the QR code on their PDF. A check mark appears as each piece is accepted.</p>
</div>
</div>

<div class="step-guide">
<div class="step-number">5</div>
<div class="step-content">
<h4>Recover the files</h4>
<p>When enough pieces are in, recovery starts on its own. The files open in your browser, and you can download them. If nothing happens, click <strong>Unlock and Recover</strong>.</p>
</div>
</div>

<div class="tip">
<strong>Tip:</strong> If a guardian sends their whole <code>.zip</code> bundle, drag it onto the page. The piece and the archive are both read from it.
</div>

<figure class="screenshot">
<img src="screenshots/en/recovery-1.png" alt="The recovery tool collecting pieces">
<figcaption>The recovery tool with the pieces collected so far and the list of guardians</figcaption>
</figure>

<figure class="screenshot">
<img src="screenshots/en/recovery-2.png" alt="The recovery tool after the files are recovered">
<figcaption>When enough pieces are in, the files are recovered and ready to download</figcaption>
</figure>

### Path B: I Have a Printed PDF with Words {#recovery-words}

Each printed PDF carries your piece as a numbered list of words. Type them into the recovery tool. No camera or scanner is needed.

<div class="step-guide">
<div class="step-number">1</div>
<div class="step-content">
<h4>Open the recovery tool</h4>
<p>Open the address printed on the PDF, or open <code>recover.html</code> from any guardian's bundle.</p>
</div>
</div>

<div class="step-guide">
<div class="step-number">2</div>
<div class="step-content">
<h4>Type in your recovery words</h4>
<p>Choose <strong>Paste a piece or type recovery words</strong>. Type the words from your PDF, separated by spaces. You do not need the numbers.</p>
</div>
</div>

<figure class="screenshot">
<img src="screenshots/en/recovery-words-typing.png" alt="Typing recovery words from a printed PDF into the recovery tool">
<figcaption>Type the numbered words from your printed PDF into the text area</figcaption>
</figure>

<figure class="screenshot">
<img src="screenshots/en/recovery-words-recognized.png" alt="The recovery tool after the words are entered, showing the piece was accepted">
<figcaption>The recovery tool recognizes the words and loads your piece</figcaption>
</figure>

<div class="step-guide">
<div class="step-number">3</div>
<div class="step-content">
<h4>Add the encrypted archive</h4>
<p>The page also needs the encrypted archive. Ask any guardian for one file from their bundle: <code>MANIFEST.age</code> if their bundle has one, otherwise their <code>recover.html</code>, which carries the archive inside it. Drag the file onto the page or click to browse.</p>
</div>
</div>

<div class="step-guide">
<div class="step-number">4</div>
<div class="step-content">
<h4>Collect pieces from the other guardians</h4>
<p>Contact the other guardians and ask for their pieces. They can send their <code>README.txt</code>, read their words to you over the phone, or show you their QR code.</p>
</div>
</div>

<div class="step-guide">
<div class="step-number">5</div>
<div class="step-content">
<h4>Recover the files</h4>
<p>When enough pieces are in, recovery starts on its own. If nothing happens, click <strong>Unlock and Recover</strong>.</p>
</div>
</div>

<div class="tip">
<strong>Tip:</strong> Words are the easiest thing to pass over the phone. A guardian who cannot send a file can read their words aloud while you type them in.
</div>

### Path C: I Have a Printed PDF with QR Code {#recovery-pdf}

If your device has a camera, scan the QR code on the PDF to load your piece directly.

<div class="step-guide">
<div class="step-number">1</div>
<div class="step-content">
<h4>Open the recovery tool</h4>
<p>Scan the QR code with your phone camera. It opens the recovery tool with your piece filled in. Or open the address on the PDF and type the short code printed under the QR code.</p>
</div>
</div>

<figure class="screenshot">
<img src="screenshots/scan-qr-button.png" alt="The pieces step of the recovery tool, with the Scan QR code button">
<figcaption>Choose Scan QR code. Your browser then asks for permission to use the camera.</figcaption>
</figure>

<figure class="screenshot">
<img src="screenshots/qr-scanning.png" alt="The recovery tool's scanner with a printed QR code in view">
<figcaption>Point the camera at the QR code on a printed PDF to load that piece</figcaption>
</figure>

<div class="step-guide">
<div class="step-number">2</div>
<div class="step-content">
<h4>Add the encrypted archive</h4>
<p>The page also needs the encrypted archive. Ask any guardian for one file from their bundle: <code>MANIFEST.age</code> if their bundle has one, otherwise their <code>recover.html</code>, which carries the archive inside it. Drag the file onto the page or click to browse.</p>
</div>
</div>

<figure class="screenshot">
<img src="screenshots/manifest-drop-zone.png" alt="The archive step of the recovery tool, waiting for MANIFEST.age">
<figcaption>Drop MANIFEST.age here, or click to choose it. A recover.html from any guardian's bundle works too.</figcaption>
</figure>

<div class="step-guide">
<div class="step-number">3</div>
<div class="step-content">
<h4>Collect pieces from the other guardians</h4>
<p>Contact the other guardians and ask for their pieces. They can send their <code>README.txt</code>, or you can scan their QR code.</p>
</div>
</div>

<div class="step-guide">
<div class="step-number">4</div>
<div class="step-content">
<h4>Recover the files</h4>
<p>When enough pieces are in, recovery starts on its own. If nothing happens, click <strong>Unlock and Recover</strong>.</p>
</div>
</div>

<div class="tip">
<strong>About recovery:</strong>
<ul>
<li>It works offline. Only a time-locked archive needs a connection, to check the date.</li>
<li>Nothing leaves the browser.</li>
<li>The guardians can be anywhere. They send their <code>README.txt</code>, or read their words to you.</li>
</ul>
</div>

### If You Are the Owner {#recovery-owner}

If the bundles were made with an owner key, you can recover alone. Drop any one bundle onto the Recover page. Open **I am the owner and have my owner key** and paste your secret key. See [Owner Key](#owner-key).

### If the Page Will Not Open {#recovery-independent}

The files can be recovered without this tool. A technical person can do it with `age` and a short Python script from the source repository, using only the pieces and the encrypted archive. The steps and the test files are in [Independent recovery]({{GITHUB_REPO}}/blob/main/docs/independent-recovery.md).

## Descriptor Backup on Bitcoin {#descriptor-backup}

This tool is for multisig wallets, and it solves a different problem from the bundles.

A multisig wallet needs two things to spend: enough keys, and its **descriptor**. The descriptor lists every key in the wallet and says how they fit together. If you still hold every key, the descriptor can be rebuilt with some work. Lose one key and the descriptor together, and the keys you still hold cannot rebuild the wallet, even when they are enough to sign. A 2 of 3 with two keys and no descriptor is locked.

[Create Bundles](maker.html) encrypts the descriptor so that your own keys open it, when you choose to put your words on the chain. Then it gives you one line of text to put into one OP_RETURN output on the chain. After that, your keys are enough again. The text stays on the chain as long as Bitcoin does, and nobody can delete it.

### How to Make One {#descriptor-make}

The descriptor backup is made in [Create Bundles](maker.html), in the same step where you write what your heirs need to know. It is not a separate page any more. [Read a Descriptor Backup](descriptor.html) only reads one back.

1. Work through steps 1 and 2 as normal: guardians, then files.
1. In step 3, answer the questions about your wallet, then choose **the bundles and the chain** as the destination.
1. Paste your descriptor into the box that appears. The page reads it back: the threshold and the derivation path. Check that they match your wallet. It also shows the size and what the chain fee will cost at two fee rates.
1. Generate the bundles. Each one carries the encrypted chain copy in its README, and the page gives you the same text to publish.
1. Put it on the chain, in one of two ways. Pay opreturnbot.com to publish it, ticking **Private**, or send it from your own Bitcoin Core node. Both put the same text into one OP_RETURN output.
1. **Read it back.** Open [Read a Descriptor Backup](descriptor.html), paste the transaction id, add your keys, and watch the descriptor come back. Publishing alone proves nothing. This step proves the backup landed.

If you have never seen this work, that page has a button that does the whole read-back with our own published backup. It costs nothing and moves no coins.

### Who Can Open It {#descriptor-who}

You choose, and the choice matters:

- **Your wallet's threshold.** The same number of keys it takes to spend. A 2 of 3 wallet needs two keys to open the backup. This matches your wallet exactly, so the backup is never harder to open than the money is to spend.
- **Any one of your keys.** One key opens it. Easier to recover, and easier for anyone who gets hold of a single key. This follows the draft BIP-138 format, which other wallets are beginning to read.

### What Is Public {#descriptor-public}

The text goes into one OP_RETURN output. It is public and permanent. The page encrypts the descriptor before it goes there, and only your keys open it. What an observer can read without your keys depends on the format you chose.

- **Threshold backup.** The page encrypts your extended public keys and their fingerprints. It writes the structure of the wallet in plain text in front of the encrypted part: the script type, the threshold and the derivation paths. For a 2 of 3 the text begins `wsh(sortedmulti(2,[48h/0h/0h/2h]<0;1>/*,...`. That plain part is what lets multisigbackup.com read the backup with no software from us. After the encrypted part come short lookup tags, one per pair of your fingerprints. The tags let someone who already holds two of your keys find the backup, and they reveal nothing else.
- **One-key backup (BIP-138).** The whole descriptor is inside the encryption, script type and threshold included. In plain text there is the marker `BIP138`, a list of entries, and any derivation path outside the common set. Each real entry is derived from one of your keys and is not the key itself. The page pads the list with random entries, up to 5, 10 or 20. These are the counts the standard asks for. A wallet with three keys writes five entries. A wallet with seven keys writes ten. The count then does not show how many keys your wallet has, and nothing tells the entries apart. The page leaves out the standard multisig paths, so an observer cannot tell the script family.

In both formats anyone can see that a wallet backup exists. In neither can anyone read a key without your keys. That is the trade, and it is deliberate. A backup that only you can find is lost when you are gone. This one remains after you, after us, and after the guardians.

### How to Recover It {#descriptor-recover}

Choose **Recover a descriptor**. Give the page the text. Or give it the transaction id, and it fetches the text from a public explorer. Then paste the wallet's extended public keys, as many as your choice above requires. Any of your signing devices can produce its extended public key from its seed. Click **Rebuild my descriptor**.

Keep the transaction id on your estate insert. It is the fastest way in. If the id is lost, a technical person can still find a threshold backup. The text carries a short tag built from any two of your wallet's fingerprints, and the chain can be searched for it. This page has no search of its own.

### Recovery Without This Page {#descriptor-independent}

Neither format is ours to own, and that is the point. A threshold backup uses the published multisig-backup format. A one-key backup follows draft BIP-138. Both are open specifications with other software already reading them, so a technical person can rebuild your descriptor with no Bitcoin Butlers involved.

Your estate insert names the tool to use and how to reach it. Someone reads that page after Bitcoin Butlers is gone. Our own test vectors are in the [source repository]({{GITHUB_REPO}}/blob/main/docs/descriptor-backup-vector.md) for anyone who wants to check the formats match, byte for byte.

### The Argument Against This {#descriptor-argument-against}

Serious people think writing a backup onto the chain is the wrong thing to do. Here is their case, in their own words.

Pieter Wuille, who has contributed to Bitcoin Core for over a decade, put it plainly in 2025: "I don't feel like using a globally replicated database for information that just a single person cares about is a good use of the technology. It may appear convenient at times when demand for block space is low, but I would caution against building an expectation that this is a realistic option in the long run."

He is right on both counts. Every node on earth stores your backup forever, and nobody but you needs it. Cheap block space today is a poor thing to build a twenty-year plan on.

Read what he proposed instead, because it matters here: "You need backups for other data anyway, and it ought to be trivial to hide this amount of data in your backups in a plausibly deniable way too."

That is what the guardian bundles are. They are the main path, and every bundle carries the same text the chain does. So the ordinary way your heir recovers has nothing to do with the chain at all.

The chain copy answers one question the bundles cannot: what happens when every bundle is gone. Houses burn, guardians move, drawers get cleared out by people who do not know what they are looking at. Whether that risk is worth a permanent public record is your call, and you can take the bundles alone.

One more thing about Wuille, because half a quotation is worse than none. He argued in favour of dropping Bitcoin Core's limit on this kind of data, and against node operators deciding what belongs in a block. He thinks it is a poor use of the chain. He does not think anyone should stop you.

### Never Put Seeds Here {#descriptor-no-seeds}

The page takes a descriptor and nothing else. Seeds belong on steel or in a codex32 kit, never on a public chain.

## Best Practices {#best-practices}

### Choosing Guardians {#choosing-guardians}

- **Longevity:** people who are likely to be reachable in ten years
- **Spread:** not all in one house, one town or one branch of the family
- **Technical ability:** any mix. The tool is written for everyone.
- **Relationships:** they must be willing to work with each other when the time comes
- **Trust:** a single piece reveals nothing, but each guardian carries a duty
- **Professionals:** a lawyer or an accountant can be one guardian. A Butler cannot. Bitcoin Butlers never holds a piece.

### Security Considerations {#security-considerations}

- Do not keep all the bundles together. That undoes the split.
- Print `README.pdf`. Paper needs no drive and no battery.
- Save `project.yml` if you want to make new bundles later.
- Between updates, keep your source files in an encrypted vault such as [Cryptomator](https://cryptomator.org) or [VeraCrypt](https://veracrypt.fr). Do not leave plain copies in a normal folder.

### Storing Bundles Safely {#storing-bundles}

A bundle is small, in most cases under 10 MB, and it is encrypted. What matters is that each guardian keeps their own, and that no single place holds them all.

- **Paper** is the most durable copy. `README.pdf` holds the piece as words and as a QR code, and it needs no device.
- **USB sticks and microSD cards** work, with two cautions. Connectors change, and flash memory loses data when it sits unpowered for years. Check them at every drill, and replace them every five years or at the first read error.
- **Email and cloud drives** keep a copy for as long as the account lives. Use them as a guardian's second copy only, never as the place where every bundle collects.

More than one copy, in more than one form: paper plus a card, or paper plus the guardian's own cloud drive.

### Keeping Bundles Current {#keeping-current}

Once a year, contact every guardian. Confirm that they still have their bundle, that it still opens, and that their contact details are current.

**Any change means new bundles for everyone.** Not for the guardians affected. For all of them.

Each time you generate, the page makes a brand new recovery key and splits it again. One guardian's old piece and another guardian's new piece cannot be combined at all. So if three of your five guardians swap their bundle and two do not, you no longer have a 3 of 5. You have a 3 of 3, and nothing on the outside of any bundle shows it.

An old bundle still opens. It still looks right. It counts for nothing. That is why the swap matters more than it sounds.

Write down who holds what and when they got it, so that the day you revise you know exactly what to collect. The estate insert has a column for it.

**The chain copy is different, because it cannot be changed.** Once your descriptor is on the chain it is there for good. That is the point of it.

- If your **words** changed and the wallet did not, do nothing on the chain. Your new bundles carry the new words, and the chain copy still tells the truth about the method.
- If your **wallet** changed, a new cosigner or a new device, the chain copy now names a wallet that no longer exists. Publish a new one and write the new transaction id on the estate insert. The old one stays on the chain forever and that is fine, as long as the insert says which is current.

**If a bundle and the chain copy ever disagree, use the bundle.** The bundle is the newer copy, and it carries its own date. The chain copy is for the day every bundle is gone.

### Recovery Drills {#recovery-drills}

Nobody tests a backup plan until they need it. A drill tests it earlier, while a problem is cheap to fix. Run one a year:

1. **Contact every guardian.** Each one confirms that they still have their bundle, where it is, and that the media reads.
1. **Media check.** Each guardian opens the ZIP and confirms that `README.txt` and `recover.html` open.
1. **Rehearsal recovery.** The needed number of guardians recover the files on one guardian's own computer, with `recover.html`, offline. Choose a different group each year.
1. **Read the descriptor back.** If you have a descriptor backup on the chain, open the Descriptor Backup page. Enter the transaction id from the estate insert. Rebuild the descriptor with your keys. It takes two minutes.
1. **Check freshness.** If the wallet or the files changed since the last drill, the bundles are stale. Make new ones.
1. **Sign the drill record** on the estate insert. Write the date, the guardians confirmed, the group that recovered, and the version of the files.

A failed drill is a good result. You found the problem before it mattered.

For a first drill, a test set with a harmless file works well: a photo, a recipe. Hand out the pieces and let the guardians recover it without your help. What you learn: whether they can find their bundles, whether the instructions are clear to them, and whether they can reach each other without you.

Bitcoin Butlers runs this drill with you and your guardians over video, once a year: the [annual drill](https://www.bitcoinbutlers.com/concierge/inheritance/drill).

### Revoking Access {#revoking-access}

Once you hand out a piece, you cannot take it back. There is no server and no central authority, so nothing can revoke it.

If you need to change who holds pieces:

1. **Make new bundles** with the new set of guardians. The key is new too.
1. **Hand out the new bundles** to the guardians you keep.
1. **Ask every remaining guardian to delete their old bundle** and keep only the new one.

<div class="warning">
<strong>Important:</strong> old pieces still open the old archive. When you hand out a new bundle, say it plainly: <strong>delete the old one</strong>, keep only the new one. No version history, no spare copy.
</div>

The same applies when the files change. New bundles mean a new key and new pieces. Old pieces cannot open the new archive. They still open the old one. Check that no guardian keeps an old copy.

### About project.yml {#project-file}

When you make bundles, the page saves your project in a `project.yml` file. It stores:

- The guardians' names and contact details
- Your threshold, for example 3 of 5
- A hash to check that a set of bundles belongs together
- Checksums to check that a bundle is intact

It stores **no secrets**: no passphrase, no key material, no file contents. It is safe to keep with your other project files.

With `project.yml` you can make new bundles for the same guardians, check existing bundles, and see the state of your setup.

## Understanding the Security {#security}

Bitcoin Inheritance combines well-reviewed tools. It invents no ciphers of its own. This is what that means in practice.

### What Protects Your Data {#cryptography}

Bitcoin Inheritance encrypts your files with [age](https://github.com/FiloSottile/age), a modern tool that is widely reviewed and has no known weaknesses.

The key that locks them is 256 bits long, taken from your operating system's random number generator. Guessing it is out of reach in any span of time that matters.

Where a passphrase is involved, scrypt makes each guess slow on purpose. Trying many passphrases then costs millions of times more than it otherwise would.

Shamir's Secret Sharing splits the key into pieces. **Fewer pieces than the threshold hold no information about the key at all.** That is a property of the mathematics, and more computing power does not change it.

Each bundle carries checksums, so the recovery tool can tell when a piece is damaged or altered.

For the details, see the [security review]({{GITHUB_REPO}}/blob/main/docs/security-review.md) in the source repository.

### What Could Go Wrong {#what-could-go-wrong}

<div class="bundle-contents">
<div class="file">
<span class="file-name">A guardian loses their bundle</span>
<span class="file-desc">Fine, as long as enough other guardians still have theirs. That is why the threshold sits below the total.</span>
</div>
<div class="file">
<span class="file-name">A guardian's piece is exposed</span>
<span class="file-desc">A single piece is useless on its own. Whoever has it still needs the rest of the threshold.</span>
</div>
<div class="file">
<span class="file-name">Some guardians cannot be reached</span>
<span class="file-desc">Any group of the threshold size is enough. With 3 of 5, any three guardians recover the files.</span>
</div>
<div class="file">
<span class="file-name">Bitcoin Butlers closes, or this website is gone</span>
<span class="file-desc"><code>recover.html</code> still works, because it is self-contained. The descriptor backup still reads back, because its formats are public. Nothing depends on us.</span>
</div>
<div class="file">
<span class="file-name">Browsers change</span>
<span class="file-desc">The recovery tool uses standard JavaScript and the Web Crypto API: browser fundamentals, in place for years.</span>
</div>
<div class="file">
<span class="file-name">You forget how this works</span>
<span class="file-desc">Each bundle's <code>README.txt</code> explains everything. Your guardians do not need to remember anything. It is all written down for them.</span>
</div>
</div>

Two things do need to be true. You trust the device that makes the bundles, and nobody has compromised the browser that recovers the files. These are the same assumptions you make when you use a computer for anything that matters.

## How It Compares {#comparison}

Bitcoin Inheritance is one of many tools that split a secret with Shamir's Secret Sharing. This is what sets it apart:

- **It holds files.** Most Shamir tools split a password or a short text. Bitcoin Inheritance encrypts whole files and folders: your estate letter, your descriptor, your instructions.
- **Recovery comes with the bundle.** Each guardian receives `recover.html`, a complete recovery tool that runs in any browser, offline. Nothing to install.
- **The guardians can find each other.** Each bundle lists the other guardians and how to reach them, so recovery does not depend on you being available.
- **Nothing to keep running.** There is no service to sign up for, no account to maintain, and nothing that has to stay online.
- **It knows what a multisig needs.** The descriptor backup puts the wallet's descriptor on the chain, so the keys stay enough on their own.

Against the alternatives people reach for first:

- A single trusted person is a single point of failure.
- A will is public, and probate is slow.
- A password manager's emergency access needs the company to exist.
- A multisig wallet on its own protects the keys and leaves the descriptor unprotected.

## Advanced: Anonymous Mode {#anonymous}

When the guardians should not know each other, use **anonymous mode**:

- The page labels the guardians Share 1, Share 2, and so on
- The page collects and stores no contact details
- The READMEs leave out the list of other guardians
- Bundle file names carry numbers instead of names

### When to Use Anonymous Mode {#anonymous-when}

- The guardians should not know each other
- You are testing quickly and do not want to enter names
- You have another way to coordinate a recovery
- Privacy matters more to you than easy coordination

### How to Enable {#anonymous-enable}

On the [Create Bundles](maker.html) page, choose **Anonymous** at the top of the Guardians step:

- A count, labelled **Number of shares**, replaces the list of guardians
- Set how many pieces to make, and the threshold
- The page names the bundles `bundle-share-1.zip`, `bundle-share-2.zip`, and so on

### Recovery in Anonymous Mode {#anonymous-recovery}

Recovery works the same way, without the contact list. Guardians see Share 1, Share 2, and so on instead of names.

<div class="warning">
<strong>Important:</strong> without a built-in contact list, the guardians need another way to reach each other when a recovery is needed. Write it down for them.
</div>

## Advanced: Owner Key {#owner-key}

By default, only a group of guardians can open your backup. That is the right setup for an estate, but it means you cannot open your own backup without calling them together.

The owner key is an optional second path. You give the bundle maker an [age](https://github.com/FiloSottile/age) public key, which starts with `age1`. Every bundle then also contains `OWNER.age`: the recovery passphrase, locked to that key. With the matching secret key you can recover alone, at any time. The guardians see no difference, and bundles made without an owner key are exactly as before.

### How to Enable {#owner-key-enable}

1. Make an age key pair with any age tool, for example `age-keygen -o owner-key.txt`. The file shows your public key (`age1...`) and holds your secret key (`AGE-SECRET-KEY-1...`).
1. On the Create Bundles page, open **Owner key (optional)** in step 3 and paste the *public* key.
1. After generating, store `owner-key.txt` somewhere safe and separate from the bundles. Paper, kept with your other vital documents, works well. You can also keep `OWNER.age` on its own. Every bundle already contains a copy.

**Never paste seed words or any other secret into the owner key field.** It takes an age public key only.

The command line cannot set an owner key yet. Make those bundles in the browser.

### How to Recover With It {#owner-key-recover}

On the Recover page, drop any one bundle. Open **I am the owner and have my owner key** and paste your secret key (`AGE-SECRET-KEY-1...`). Recovery runs at once, with no other pieces needed.

Without the tool, any age command line works:

```
# Prints the recovery passphrase:
age -d -i owner-key.txt OWNER.age
# Enter that passphrase when asked:
age -d MANIFEST.age > archive
```

The test vector for this path is in the [source repository]({{GITHUB_REPO}}/blob/main/docs/owner-key-vector.md).

### The Trade-off, Plainly {#owner-key-tradeoff}

The owner key is a single key that opens the whole backup. Anyone who holds the secret key can read everything in it, alone, with no guardian involved. Store it with the same care as the things it protects. If you lose it, nothing is lost. The guardian path still works, and you can make new bundles with a new owner key at any time.

You can derive the owner key from another secret you already guard instead of generating a random one. Then the two are linked. Whoever controls that secret controls this backup too.

## Advanced: Time-Delayed Recovery {#timelock}

You can set a waiting period when you make the bundles. Even if the guardians combine their pieces early, the files stay closed for the period you chose, for example 30 days or 6 months.

### How to Enable {#timelock-enable}

On the [Create Bundles](maker.html) page, choose the **Advanced** tab in step 3 and tick **Add a time lock**. Choose how long the files stay closed, up to two years.

The two-year limit is deliberate. Time locks depend on the League of Entropy continuing to operate. A longer lock depends on that outside network for longer, and we do not think that is responsible. If you need a longer period and accept the trade-off, the command line has no cap: `inheritance seal --timelock 5y`.

<figure class="screenshot">
<img src="screenshots/en/tlock-setup.png" alt="Time lock setup in the Advanced tab">
<figcaption>The time lock option is in the Advanced tab</figcaption>
</figure>

### Recovery {#timelock-recovery}

When someone opens a time-locked bundle before the date, the recovery tool shows a waiting notice. Once the date has passed, recovery proceeds as normal.

<figure class="screenshot">
<img src="screenshots/en/tlock-waiting.png" alt="The recovery tool showing a time lock waiting notice">
<figcaption>The recovery tool waits until the time lock has passed</figcaption>
</figure>

Opening a time-locked archive needs a brief internet connection. Your files are not sent anywhere. The connection only checks that the date has passed. Without a time lock, recovery is fully offline.

<div class="warning">
<strong>Experimental.</strong> Time-delayed recovery depends on the <a href="https://www.cloudflare.com/en-ca/leagueofentropy/" target="_blank">League of Entropy</a>, a distributed network run by serious organizations around the world. If this network stops before a time lock passes, that archive becomes unrecoverable. Bundles without a time lock are not affected.
</div>

### How It Works {#timelock-technical}

The League of Entropy publishes a new random value every 3 seconds. Each value is numbered. Anyone can work out which number belongs to a given time. Nobody can produce the value for that number early, and that includes the network operators.

When you make a time-locked bundle, the page encrypts the archive to a specific future value. The key to open it does not exist yet. It comes from the network when that moment arrives.

For the details, see the [drand timelock encryption documentation](https://docs.drand.love/docs/timelock-encryption/).

## CLI Alternative {#cli}

The same tool exists for the command line, for people who prefer a terminal or want to script it. The binary is called `inheritance`, and you build it from the [source repository]({{GITHUB_REPO}}) with Go. There are no published binaries yet.

The main commands are `init`, `seal`, `bundle`, `recover`, `verify` and `status`. Run `inheritance --help` for the full list. They make the same bundles as the browser, with two differences. The command line has no cap on the time lock, and it cannot set an owner key.

<a href="{{GITHUB_REPO}}/blob/main/docs/guide.md" class="btn btn-secondary">Read the guide for the command line</a>

## Self-Hosting {#selfhosted}

Every page on this site is one file that works from a disk. Save `maker.html`, `recover.html` and `descriptor.html`, and you have the whole tool, with no server at all.

For people who already run a server, `inheritance serve` provides the same creation and recovery pages from your own machine. The guardians need only their piece; the server holds the encrypted archive. The offline bundles remain the primary way to use Bitcoin Inheritance. See [Hosting Bitcoin Inheritance]({{GITHUB_REPO}}/blob/main/docs/selfhosted.md) in the source repository.
