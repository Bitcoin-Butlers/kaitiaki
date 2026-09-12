---
title: "Bitcoin Inheritance Guide"
subtitle: "How to create bundles and recover files"
cli_guide_note: 'There is also a <a href="{{GITHUB_REPO}}/blob/main/docs/guide.md">CLI guide</a>.'
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

Bitcoin Inheritance is a digital safe with multiple keys. You choose who holds them and how many must come together to open it.

Under the hood, it encrypts your files with [age](https://github.com/FiloSottile/age), splits the key among people you trust, and gives each person a self-contained bundle for recovery.

Recovery is opening a file in a browser.\* No servers, no need for this website to exist.

<p style="font-size: 0.8125rem; color: #8A8480;">* <a href="#timelock" style="color: #8A8480;">Time-locked</a> archives need a brief internet connection at recovery time.</p>

<div class="tip">
<strong>Tip:</strong> No one person can access your data. They need to bring together enough pieces, for example 3 of 5.
</div>

## Why Bitcoin Inheritance {#why-bitcoin-inheritance}

You probably have digital secrets that matter: password manager recovery codes, important documents, instructions for loved ones. What happens to these if you're suddenly unavailable?

Think of it like a safe deposit box that needs two keys to open. No single person holds enough to get in alone.

Traditional approaches have weaknesses:

- **Give one person everything**: a single point of failure and trust
- **Split files manually**: confusing, error-prone, no encryption
- **Use a password manager's emergency access**: similar to "give one person everything", also relies on the company existing
- **Write it in a will**: becomes public record, slow legal process

Bitcoin Inheritance takes a different approach:

- **No single point of failure**: requires multiple people to cooperate
- **No trust in any one person**: even your most trusted guardian cannot access your secrets alone
- **Offline and self-contained**: recovery works without internet or servers\*
- **Designed for anyone**: clear instructions, not cryptographic puzzles

## Creating Bundles {#creating}

Three steps. Everything happens in your browser. Your files never leave your device. Open the [bundle creator](maker.html) to get started.

### Step 1: Add Guardians {#step1}

Add the people who will hold pieces of your recovery key. For each, provide a name and optionally contact information.

<figure class="screenshot">
<img src="screenshots/en/friends.png" alt="Adding guardians in Step 1">
<figcaption>Each person here will hold one piece of the key</figcaption>
</figure>

Then choose your **threshold**: how many people must come together to recover your files.

<div class="tip">
<strong>Choosing a threshold:</strong>
<ul>
<li><strong>3 people, threshold 2:</strong> The simplest setup</li>
<li><strong>5 people, threshold 3:</strong> A good balance</li>
<li><strong>7 people, threshold 4–5:</strong> More secure, more coordination</li>
</ul>
High enough that collusion is unlikely. Low enough that recovery works if one or two people are unavailable.
</div>

### Step 2: Add Files {#step2}

Drag and drop the files or folder you want to protect.

<figure class="screenshot">
<img src="screenshots/en/files.png" alt="Adding files in Step 2">
<figcaption>Add the files you want to protect</figcaption>
</figure>

**Good candidates:**

- Password manager recovery codes
- Important account credentials
- Instructions for loved ones
- Legal document locations
- Safe combinations

<div class="warning">
<strong>Not for Bitcoin seeds or private keys.</strong> Never put seed words or private keys in a bundle. Those belong on a steel backup or a codex32 split, kept offline. Use Bitcoin Inheritance for the instructions around them, such as where the steel plates are and who to call.
</div>

<div class="warning">
<strong>Note:</strong> Avoid files that change often. This is designed for secrets you set once and leave.
</div>

### Step 3: Generate Bundles {#step3}

Click "Generate Bundles" to encrypt your files and create a bundle for each person.

<figure class="screenshot">
<img src="screenshots/en/bundles.png" alt="Generating bundles in Step 3">
<figcaption>Download each bundle, or all at once</figcaption>
</figure>

Each bundle includes the full recovery tool. It works even if this website is gone.

### Distributing to Guardians {#distributing}

Hand each guardian their bundle by the most private channel you can manage, in this order of preference:

1. **In person:** A USB drive or printed PDF, handed over directly. The most private option.
1. **Encrypted messaging:** Signal or another end-to-end encrypted messenger.
1. **Plain email or cloud drives:** Discouraged for sensitive payloads. The provider keeps a copy, and your account becomes a collection point.

If you must send bundles by email or messaging, delete the messages from your sent folder once each guardian confirms receipt. Otherwise your account ends up holding a copy of every piece, which defeats the point of splitting them.

### After Creating Bundles {#after-creating}

Once your bundles are ready, there are a few things worth doing before you put this out of your mind:

- Verify each person received their bundle and can open `recover.html`
- Tell each person what this is, why they have it, and that they should keep it safe. They cannot use it alone. They will need to coordinate with others.
- Keep a copy of `MANIFEST.age` somewhere safe. It is just encrypted data, useless without enough pieces
- Save your `project.yml` so you can regenerate bundles later
- Print `README.pdf` as a paper backup before sending the digital bundle. Paper doesn't need adapters or power.
- Set a yearly reminder to check in. See [Keeping Bundles Current](#keeping-current)
- Consider running a [recovery drill](#recovery-drills). It is the only way to know your plan actually works

## Recovering Files {#recovering}

If you are here because someone you care about is no longer available, take a breath. There's no rush. The bundles don't expire, and the process is designed to be done at your own pace.

If you don't have a bundle yet, you can open the [recovery tool](recover.html) directly. You will add pieces manually as you collect them from other holders.

### What Guardians Receive {#bundle-contents}

Each bundle contains:

<div class="bundle-contents">
<div class="file">
<span class="file-name">README.txt</span>
<span class="file-desc">Instructions, your unique piece, contact list</span>
</div>
<div class="file">
<span class="file-name">README.pdf</span>
<span class="file-desc">Same content, formatted for printing. Includes a <strong>QR code</strong> for importing the piece.</span>
</div>
<div class="file">
<span class="file-name">MANIFEST.age</span>
<span class="file-desc">Your encrypted files. Included as a separate file for larger archives.</span>
</div>
<div class="file">
<span class="file-name">OWNER.age</span>
<span class="file-desc">Only present when the bundles were made with an owner key. Lets the owner recover alone. Useless to anyone without the owner's secret key.</span>
</div>
<div class="file">
<span class="file-name">recover.html</span>
<span class="file-desc">Recovery tool (~300 KB), runs in any browser</span>
</div>
</div>

<p style="margin-top: 1rem;">
Each bundle is personalized. The guardian's share is pre-loaded, and a contact list shows who else holds pieces. When the encrypted data is small enough, it's embedded too.
</p>

### Path A: I Have the Bundle ZIP {#recovery-bundle}

The simplest path. If you have the bundle ZIP (or the files from it):

<div class="step-guide">
<div class="step-number">1</div>
<div class="step-content">
<h4>Extract the ZIP and open recover.html</h4>
<p>Open it in any modern browser. Your share is already loaded.</p>
</div>
</div>

<div class="step-guide">
<div class="step-number">2</div>
<div class="step-content">
<h4>Load the encrypted manifest</h4>
<p>For small archives (≤ 10 MB), this is automatic because the data is already embedded. Otherwise, drag <code>MANIFEST.age</code> from the bundle onto the page.</p>
</div>
</div>

<div class="step-guide">
<div class="step-number">3</div>
<div class="step-content">
<h4>Coordinate with other guardians</h4>
<p>The tool shows a contact list with other guardians' names and how to reach them. Ask them to send their <code>README.txt</code>.</p>
</div>
</div>

<div class="step-guide">
<div class="step-number">4</div>
<div class="step-content">
<h4>Add shares from other guardians</h4>
<p>For each guardian's piece: drag their <code>README.txt</code> onto the page, paste the text, or scan a QR code from their PDF. A checkmark appears as each piece is added.</p>
</div>
</div>

<div class="step-guide">
<div class="step-number">5</div>
<div class="step-content">
<h4>Recovery happens automatically</h4>
<p>Once enough pieces are gathered (e.g., 3 of 5), recovery starts on its own.</p>
</div>
</div>

<div class="tip">
<strong>Tip:</strong> If a guardian sends their entire <code>.zip</code> bundle, drag it onto the page. Both the piece and the archive are imported at once.
</div>

<figure class="screenshot">
<img src="screenshots/en/recovery-1.png" alt="Recovery interface - collecting shares">
<figcaption>The recovery tool showing collected shares and contact list</figcaption>
</figure>

<figure class="screenshot">
<img src="screenshots/en/recovery-2.png" alt="Recovery interface - decryption complete">
<figcaption>Once threshold is met, files are decrypted and ready to download</figcaption>
</figure>

### Path B: I Have a Printed PDF with Words {#recovery-words}

Each printed PDF includes your share as a list of numbered words. Type them into the recovery tool. No camera or scanner is needed.

<div class="step-guide">
<div class="step-number">1</div>
<div class="step-content">
<h4>Open the recovery tool</h4>
<p>Visit the URL printed on the PDF, or open <code>recover.html</code> from any guardian's bundle.</p>
</div>
</div>

<div class="step-guide">
<div class="step-number">2</div>
<div class="step-content">
<h4>Type in your recovery words</h4>
<p>Find the word list on your PDF and type the words into the text area. You do not need the numbers, just the words, separated by spaces.</p>
</div>
</div>

<figure class="screenshot">
<img src="screenshots/en/recovery-words-typing.png" alt="Typing recovery words from a printed PDF into the recovery tool">
<figcaption>Type the numbered words from your printed PDF into the text area</figcaption>
</figure>

<figure class="screenshot">
<img src="screenshots/en/recovery-words-recognized.png" alt="Recovery tool after words have been entered, showing the share was recognized">
<figcaption>The recovery tool recognizes the words and loads your share</figcaption>
</figure>

<div class="step-guide">
<div class="step-number">3</div>
<div class="step-content">
<h4>Load the encrypted manifest</h4>
<p>You may need the <code>MANIFEST.age</code> file. Drag it onto the page or click to browse. If you do not have it, any guardian can send theirs. Every bundle has the same copy.</p>
</div>
</div>

<div class="step-guide">
<div class="step-number">4</div>
<div class="step-content">
<h4>Collect shares from other guardians</h4>
<p>Contact other guardians and ask for their pieces. They can send their <code>README.txt</code>, read their words over the phone, or you can scan their QR code.</p>
</div>
</div>

<div class="step-guide">
<div class="step-number">5</div>
<div class="step-content">
<h4>Recovery happens automatically</h4>
<p>Once the threshold is met, decryption starts immediately.</p>
</div>
</div>

<div class="tip">
<strong>Tip:</strong> Words are the easiest to share over the phone. If a guardian cannot send their share digitally, they can read the words aloud and you type them in.
</div>

### Path C: I Have a Printed PDF with QR Code {#recovery-pdf}

If your device has a camera, scan the QR code on the PDF to import your share directly.

<div class="step-guide">
<div class="step-number">1</div>
<div class="step-content">
<h4>Open the recovery tool</h4>
<p>Scan the QR code with your phone camera. It opens the recovery tool with your share pre-filled. Or visit the URL on the PDF and type the short code shown below the QR code.</p>
</div>
</div>

<figure class="screenshot">
<img src="screenshots/scan-qr-button.png" alt="The share step of the recovery tool, with the Scan QR code button">
<figcaption>Choose Scan QR code. Your browser then asks for permission to use the camera.</figcaption>
</figure>

<figure class="screenshot">
<img src="screenshots/qr-scanning.png" alt="The recovery tool's scanner with a printed QR code in view">
<figcaption>Point your camera at the QR code on the printed PDF to import the share</figcaption>
</figure>

<div class="step-guide">
<div class="step-number">2</div>
<div class="step-content">
<h4>Load the encrypted manifest</h4>
<p>You may need the <code>MANIFEST.age</code> file. Drag it onto the page or click to browse. If you do not have it, any guardian can send theirs. Every bundle has the same copy.</p>
</div>
</div>

<figure class="screenshot">
<img src="screenshots/manifest-drop-zone.png" alt="The manifest step of the recovery tool, waiting for MANIFEST.age">
<figcaption>Drop MANIFEST.age here, or click to choose it. A recover.html from any guardian's bundle works too.</figcaption>
</figure>

<div class="step-guide">
<div class="step-number">3</div>
<div class="step-content">
<h4>Collect shares from other guardians</h4>
<p>Contact other guardians and ask for their pieces. They can send their <code>README.txt</code>, or you can scan their QR code.</p>
</div>
</div>

<div class="step-guide">
<div class="step-number">4</div>
<div class="step-content">
<h4>Recovery happens automatically</h4>
<p>Once the threshold is met, decryption starts immediately.</p>
</div>
</div>

<div class="tip">
<strong>About recovery:</strong>
<ul>
<li>Works entirely <span title="No internet needed. Time-locked archives need a connection to verify the unlock date.">offline*</span></li>
<li>Nothing leaves the browser</li>
<li>Guardians can be anywhere. They just need to send their README.txt files</li>
</ul>
</div>

## Best Practices {#best-practices}

### Choosing Guardians

- **Longevity:** People likely to be reachable in 5–10 years
- **Geographic spread:** Not all in the same place
- **Technical ability:** Any mix is fine. The tool is designed for everyone
- **Relationships:** Will they cooperate with each other?
- **Trust:** A single piece reveals nothing, but you're trusting them with responsibility

### Security Considerations

- Do not keep all bundles together. That defeats the point of splitting
- Consider printing `README.pdf`. Paper survives digital disasters
- Save `project.yml` if you want to regenerate bundles later

### Storing Bundles Safely {#storing-bundles}

Bundles are small (under 10 MB) and designed to be stored in everyday places. Here's what works well:

- **Email** is a surprisingly good option. Most people keep the same email address for decades, and bundles are small enough to attach. Many email providers retain messages indefinitely.
- **Cloud storage** (Google Drive, Dropbox, iCloud) works well as a secondary copy.
- **USB drives** can work, but keep in mind that connectors change over time (USB-A is already giving way to USB-C) and flash memory can degrade if left unpowered for years. Not ideal as the only copy.
- **Paper** is the most durable option. Printing `README.pdf` gives your guardians a copy that does not need adapters, power, or any working device.

The best approach is redundancy: email plus paper, or cloud plus paper. More than one copy, in more than one form.

### Keeping Bundles Current {#keeping-current}

Set a yearly reminder to check in with your guardians. Confirm they still have their bundles and update contact details if anything has changed.

When your files change, create new bundles and send them. The old bundles won't open the new archive, so there is no risk in leaving them around. Still, ask guardians to replace theirs to keep things tidy.

When contacts change, for example someone moves or you want to add or remove someone, do the same thing: new bundles, ask people to delete the old ones.

Between updates, keep your source files in an encrypted vault. Tools like [Cryptomator](https://cryptomator.org) or [VeraCrypt](https://veracrypt.fr) work well. Don't leave plaintext copies sitting in a regular folder.

Think of it like updating your emergency contacts. Brief, periodic, worth doing.

### Recovery Drills {#recovery-drills}

Nobody tests their backup plan. A recovery drill changes that, and it turns out to be basically an escape room.

Create a test bundle with a harmless secret (a photo, a message, a recipe). Hand out pieces to your guardians. Set a [timelock](#timelock) if you want a real countdown. Then step back and let them figure it out: coordinate, combine pieces, and unlock the files without your help.

What you learn:

- Can your guardians actually find their bundles when they need them?
- Do they understand the instructions, or do they get stuck?
- Can they reach each other without you coordinating?

A drill that goes smoothly means your real plan will too. A drill that goes badly is a gift: you found the problem before it mattered.

### Revoking Access {#revoking-access}

Once a piece has been distributed, it cannot be revoked. This is by design. There is no server, no central authority.

If you need to change who holds pieces:

1. **Create new bundles** with a new set of guardians and a fresh key
1. **Send new bundles** to the guardians you still trust
1. **Ask every remaining guardian to delete their old bundle** and replace it with the new one

<div class="warning">
<strong>Important:</strong> Old pieces still work with old archives. When you send a new bundle, be clear: <strong>delete the old one</strong>, keep only the new one. No version history, no "just in case."
</div>

The same applies when secrets change. New bundles mean a new key and new pieces. Old pieces won't open the new archive, but they still work with the old one. Make sure guardians are not holding on to old copies.

### About project.yml {#project-file}

When you create bundles, your project is saved in a `project.yml` file. This file stores:

- Guardians' names and contact information
- Your chosen threshold (e.g., 3 of 5)
- A verification hash for checking if bundles match
- Share checksums for verifying bundle integrity

It does **not** store any secrets: no passphrase, no key material, no file contents. It's safe to keep alongside your other project files.

With `project.yml`, you can regenerate bundles, verify existing ones, and check the status of your setup.

## Understanding the Security {#security}

Bitcoin Inheritance composes well-established cryptographic tools rather than inventing its own. Here's what that means in practice.

### What Protects Your Data {#cryptography}

Your files are locked with a modern encryption tool ([age](https://github.com/FiloSottile/age)), which is widely reviewed with no known weaknesses.

The key that locks them is 256 bits long, generated from your operating system's random number generator. For scale: guessing it would take longer than the universe has existed.

Even if someone tried every possible password, scrypt makes each guess deliberately slow, millions of times slower than a naive attempt.

The key is then split using Shamir's Secret Sharing. **Any fewer than *threshold* pieces contain zero information about the original.** Not "very little." Mathematically zero.

Each bundle includes checksums so the recovery tool can verify nothing was corrupted or tampered with.

### What Could Go Wrong {#what-could-go-wrong}

<div class="bundle-contents">
<div class="file">
<span class="file-name">A guardian loses their bundle</span>
<span class="file-desc">Fine, as long as enough other guardians still have theirs. That's why you set the threshold below the total.</span>
</div>
<div class="file">
<span class="file-name">A guardian leaks their piece publicly</span>
<span class="file-desc">A single piece is useless without the others. Someone would still need threshold-1 more pieces to do anything.</span>
</div>
<div class="file">
<span class="file-name">Some guardians cannot be reached</span>
<span class="file-desc">That is why you set the threshold below the total number of guardians. If you chose 3-of-5, any three will do.</span>
</div>
<div class="file">
<span class="file-name">Bitcoin Inheritance disappears in 10 years</span>
<span class="file-desc"><code>recover.html</code> still works because it is self-contained. No servers, no downloads, no dependencies on this project.</span>
</div>
<div class="file">
<span class="file-name">Browsers change dramatically</span>
<span class="file-desc">The recovery tool uses standard JavaScript and the Web Crypto API: browser fundamentals, not trends.</span>
</div>
<div class="file">
<span class="file-name">You forget how this works</span>
<span class="file-desc">Each bundle's README.txt explains everything. Your guardians do not need to remember anything. It is all written down for them.</span>
</div>
</div>

The things that *do* need to be true: your device is trusted when you create bundles, and the browser used for recovery isn't compromised. These are the same assumptions you make any time you use a computer for something important.

For a detailed technical evaluation, see the [security self-review]({{GITHUB_REPO}}/blob/main/docs/security-review.md).

## How It Compares {#comparison}

Bitcoin Inheritance isn't the first tool to use Shamir's Secret Sharing. There are many others, from command-line tools to web apps. Here's what sets Bitcoin Inheritance apart:

- **Handles files, not just text.** Most Shamir tools only split passwords or short text. Bitcoin Inheritance encrypts entire files and folders.
- **Self-contained recovery tool.** Each guardian receives `recover.html`, a complete recovery tool that runs in any browser, offline.\* No installation, no CLI needed.
- **Contact details included.** Each bundle includes a list of other guardians and how to reach them, so coordination doesn't depend on you being available.
- **No server dependency.** Everything runs locally. There's no service to sign up for, no account to maintain, nothing that needs to stay online.

For a detailed comparison with other tools, see the [full comparison table on GitHub]({{GITHUB_REPO}}#other-similar-tools).

## CLI Alternative {#cli}

There is also a command-line tool for those who prefer a terminal or need to automate bundle creation.

<a href="{{GITHUB_REPO}}/blob/main/docs/guide.md" class="btn btn-secondary">Read the CLI Guide</a>

<p style="margin-top: 1rem;">
The CLI provides the same functionality, plus batch operations and scripting.
</p>

## Advanced: Anonymous Mode {#anonymous}

When holders should not know each other's identities, use **anonymous mode**:

- People are labeled as "Share 1", "Share 2", etc.
- No contact information is collected or stored
- READMEs skip the "Other Share Holders" section
- Bundle filenames use numbers instead of names

### When to Use Anonymous Mode

This is useful when:

- Holders should not know each other
- You're testing quickly without entering names
- You have another way to coordinate recovery
- Privacy is a higher priority than ease of coordination

### How to Enable

In the [bundle creator](maker.html), enable the **Anonymous** toggle in the Guardians section:

- The guardian list is replaced by a share count
- Set how many shares and the threshold
- Bundles are named `bundle-share-1.zip`, `bundle-share-2.zip`, etc.

### Recovery in Anonymous Mode

Recovery works the same way, but without the contact list. Holders see generic labels like "Share 1" instead of names.

<div class="warning">
<strong>Important:</strong> Without a built-in contact list, make sure holders know how to reach each other when recovery is needed.
</div>

## Advanced: Owner Key {#owner-key}

By default, only a group of guardians can decrypt your backup. That is the right shape for an estate, but it means you cannot open your own backup without convening them.

The owner key is an optional second path. You give the bundle maker an [age](https://github.com/FiloSottile/age) public key (it starts with `age1`). Every bundle then also contains `OWNER.age`: the recovery passphrase locked to that key. With the matching secret key you can recover alone, any time. Guardians see no difference, and bundles made without an owner key are exactly as before.

### How to Enable

1. Create an age keypair with any age tool, for example `age-keygen -o owner-key.txt`. The file shows your public key (`age1...`) and holds your secret key (`AGE-SECRET-KEY-1...`).
1. In the bundle maker, open **Owner key (optional)** in step 3 and paste the *public* key.
1. After generating, store `owner-key.txt` somewhere safe and separate from your bundles, for example printed on paper with your other vital documents. You can also save `OWNER.age` on its own; every bundle already contains a copy.

**Never paste seed words or other secrets into the owner key field.** It takes an age public key only.

### How to Recover With It

In the recovery tool: drop any one bundle, open **I am the owner and have my owner key**, and paste your secret key (`AGE-SECRET-KEY-1...`). Recovery runs immediately, no other pieces needed.

Without the tool, any age CLI works:

```
age -d -i owner-key.txt OWNER.age   # prints the recovery passphrase
age -d MANIFEST.age > archive       # enter that passphrase when asked
```

### The Tradeoff, Plainly

The owner key is a single key that opens the whole backup. Anyone who holds the secret key can read everything in it, alone, with no guardian involved. Store it with the same care as the things it protects. If you lose it, nothing is lost: the guardian path still works, and you can regenerate bundles with a new owner key at any time.

If you derive the owner key from another secret you already guard (rather than generating a random one), understand that the two are then linked: whoever controls that secret controls this backup too.

## Advanced: Descriptor Backup on Bitcoin {#descriptor-backup}

This one is for multisig wallets, and it solves a different problem from the rest of Bitcoin Inheritance.

A multisig wallet needs two things to spend: enough keys, and the **descriptor** that says how those keys fit together. People protect the keys carefully and then lose the descriptor, and the keys alone will not open the wallet. A 2 of 3 should mean two keys is enough. Without the descriptor, it is not.

The [descriptor backup page](descriptor.html) encrypts the descriptor so that your own keys unlock it, and gives you one line of text to write onto the Bitcoin blockchain. After that, your keys really are enough. The chain cannot lose it and nobody can delete it.

### Who Can Open It

You choose, and the choice matters:

- **Your wallet's threshold.** The same number of keys it takes to spend. A 2 of 3 wallet needs two keys to open the backup. This matches your wallet exactly, so the backup is never harder to open than the money is to spend.
- **Any one of your keys.** One key opens it. Easier to recover, and easier for anyone who gets hold of a single key. This follows the draft BIP-138 format, which other wallets are beginning to read.

### What Is Public

The text goes into one OP_RETURN output. It is public and permanent. The descriptor is encrypted before it goes there, and only your keys open it. What an observer can read without your keys depends on the format you chose.

- **Threshold backup.** Your extended public keys and their fingerprints are encrypted. The shape of the wallet is written in plain text in front of the encrypted part: the script type, the threshold and the derivation paths. For a 2 of 3 the text begins `wsh(sortedmulti(2,[48h/0h/0h/2h]<0;1>/*,...`. That plain part is what lets multisigbackup.com read the backup with no software from us. After the encrypted part come short lookup tags, one per pair of your fingerprints. The tags let someone who already holds two of your keys find the backup, and they reveal nothing else.
- **One-key backup (BIP-138).** The whole descriptor is inside the encryption, script type and threshold included. In plain text there is the marker `BIP138`, seven key slots, and any derivation path outside the common set. Some slots hold your real keys, the rest hold random decoys, and nothing tells them apart. Standard multisig paths are left out, so an observer cannot tell the script family.

In both formats anyone can see that a wallet backup exists. In neither can anyone read a key without your keys. That is the trade, and it is deliberate. A backup that only you can find is a backup that dies with you. This one survives you, survives us, and survives the guardians.

### How to Recover It

Open the page, choose **Recover**, and give it either the text or the transaction id. Then paste the wallet's extended public keys, which any of your signing devices can produce from your seeds. The page rebuilds the descriptor.

Keep the transaction id on your estate insert. It is the fastest way in. If it is lost, a threshold backup can still be found by searching the chain for a short tag built from any two of your wallet's fingerprints.

### Recovery Without This Page

Neither format is ours to own, and that is the point. A threshold backup uses the published multisig-backup format. A one-key backup follows draft BIP-138. Both are open specifications with other software already reading them, so a technical person can rebuild your descriptor with no Bitcoin Butlers involved.

Your estate insert names the tool to use and how to reach it, because that is the page someone reads on the day we are not here. Our own test vectors are in the [source repository](https://github.com/Bitcoin-Butlers/kaitiaki) for anyone who wants to check the formats match, byte for byte.

### Never Put Seeds Here

The page takes a descriptor and nothing else. Seeds belong on steel or in a codex32 kit, never on a public chain.

## Advanced: Time-Delayed Recovery {#timelock}

You can set a waiting period when creating bundles. Even if your guardians combine their pieces early, the files stay locked until the date you chose: 30 days, 6 months, or a specific date.

### How to Enable

In the [bundle creator](maker.html), switch to **Advanced** mode and check **Add a time lock**. Choose how long the files should stay locked, up to two years.

The two-year limit is deliberate. Time locks depend on the League of Entropy continuing to operate, and we don't think it's responsible to lock your files behind a longer bet on external infrastructure. If you need a longer duration and understand the trade-off, the CLI has no cap: `inheritance seal --timelock 5y`.

<figure class="screenshot">
<img src="screenshots/en/tlock-setup.png" alt="Time lock setup in Advanced mode">
<figcaption>The time lock option appears in Advanced mode</figcaption>
</figure>

### Recovery

When someone opens a time-locked bundle before the date, the recovery tool shows a waiting notice. Once the time passes, recovery proceeds normally.

<figure class="screenshot">
<img src="screenshots/en/tlock-waiting.png" alt="Recovery tool showing a time lock waiting notice">
<figcaption>The recovery tool waits until the time lock expires</figcaption>
</figure>

Opening a time-locked archive requires a brief internet connection. Your files are not sent anywhere. The connection only verifies that enough time has passed. Without the time lock, recovery is fully offline.

<div class="warning">
<strong>Experimental.</strong> Time-delayed recovery depends on the <a href="https://www.cloudflare.com/en-ca/leagueofentropy/" target="_blank">League of Entropy</a>, a distributed network operated by serious organizations around the world. If this network stops operating before a time lock expires, that archive becomes unrecoverable. Bundles without a time lock are not affected.
</div>

### How It Works {#timelock-technical}

The League of Entropy produces a new cryptographic value every 3 seconds. Each value is numbered. You can predict which number corresponds to a given time, but no one can produce the value for that number early, not even the network operators.

When you create a time-locked bundle, the archive is encrypted to a specific future value. The key to open it doesn't exist yet. It will come from the network when that moment arrives.

For a deeper look at the cryptography behind this, see the [drand timelock encryption documentation](https://docs.drand.love/docs/timelock-encryption/).

## Self-Hosting {#selfhosted}

Bitcoin Inheritance can also run as a web app on your own server using `inheritance serve`. The server provides the same creation and recovery tools through a browser. Guardians only need their share. The encrypted archive is served automatically.

This is an advanced option for people who already run a homelab or want a shared web UI. The offline bundles remain the primary way to use Bitcoin Inheritance and work without any server. See the [self-hosting guide](https://github.com/eljojo/rememory/blob/main/docs/selfhosted.md) on GitHub for details.
