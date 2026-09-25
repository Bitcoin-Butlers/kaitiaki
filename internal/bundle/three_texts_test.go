package bundle

import (
	"strings"
	"testing"
	"time"

	"github.com/eljojo/rememory/internal/core"
)

// Everything the owner writes is sealed inside the encrypted archive, so it
// reaches a reader only when enough guardians combine their pieces.
//
// README.txt is built to be forwarded: a guardian's own copy tells them to
// send it to whoever asks for their piece. Until 2026-09-24 it also carried
// the roster, the owner's method and the chain copy, so a single guardian
// read all three and a colluding one knew who else to recruit.

const (
	steps     = "2 of 3. Open Sparrow, load the descriptor, connect any two signers."
	locations = "Key 1: the safe at home. Key 2: Hannah has it. Key 3: bank box."
	payload   = "QklQMTM4AQAFLr8hjVQ5qqHdxyiEOfHcVsZlnWdF"
	txid      = "4801ea9c10e14a5ea5c0e5e68bfe08fd2422005ea0a3a9631fead29ce910a4df"
)

func baseData() ReadmeData {
	return ReadmeData{
		ProjectName: "Test Project",
		Holder:      "Alice",
		Threshold:   2,
		Total:       3,
		Version:     "v0.0.22",
		Created:     time.Date(2026, 9, 22, 12, 0, 0, 0, time.UTC),
		Language:    "en",
		Share:       core.NewShare(2, 1, 3, 2, "Alice", []byte{1, 2, 3, 4, 5, 6, 7, 8}),
	}
}

// The strongest test in this file. A README travels to whoever asks a guardian
// for their piece, so none of the owner's words may be in one.
//
// ReadmeData has no field that could hold them, which is the real guarantee.
// This test cannot enforce that: it greps one rendered output, so a new field
// that nothing populates would slip past it. The compiler is what stops the
// field coming back; this pins the rendered text.
func TestNoOwnerTextCanReachTheReadme(t *testing.T) {
	got := GenerateReadme(baseData())

	// Walk the list itself, so a fourth sealed file added later is covered
	// here without anyone remembering to add it.
	for _, name := range SealedFileNames {
		if strings.Contains(got, name) {
			t.Errorf("a README must not name a sealed file, found %q", name)
		}
	}

	for _, secret := range []string{
		steps, locations, payload, txid,
		"Hannah", "bank box", "safe at home",
		"THE CHAIN COPY", "the owner wrote this",
		"any ONE of the wallet's keys",
	} {
		if strings.Contains(got, secret) {
			t.Errorf("a README must never carry the owner's words, found %q", secret)
		}
	}
}

// A guardian learns their own name and nobody else's.
func TestTheReadmeNamesNoOtherGuardian(t *testing.T) {
	d := baseData()
	got := GenerateReadme(d)

	if !strings.Contains(got, d.Holder) {
		t.Error("a guardian must be able to tell the bundle is theirs")
	}
	for _, marker := range []string{"Bob", "bob@example.com", "OTHER GUARDIANS", "Contact:"} {
		if strings.Contains(got, marker) {
			t.Errorf("a README must name nobody but its holder, found %q", marker)
		}
	}
}

// The recovery steps must not send the reader to a list that no longer exists.
func TestTheReadmeDoesNotSendAnyoneToAContactList(t *testing.T) {
	got := GenerateReadme(baseData())
	for _, marker := range []string{"contact list", "next to each guardian's name"} {
		if strings.Contains(got, marker) {
			t.Errorf("the steps must not describe a list the page does not show, found %q", marker)
		}
	}
}

func TestKeyLocationsGoInTheSealedArchiveFile(t *testing.T) {
	name, content := PeopleAndPlacesFile(locations, "en")
	if name != PeopleAndPlacesFileName {
		t.Errorf("file name: got %q want %q", name, PeopleAndPlacesFileName)
	}
	body := string(content)
	if !strings.Contains(body, locations) {
		t.Error("the owner's text must be in the file")
	}
	if !strings.Contains(body, "enough guardians combine their pieces") {
		t.Error("the file must say why it was sealed, so a reader knows what they are holding")
	}
}

func TestTheMethodGoesInTheSealedArchiveFile(t *testing.T) {
	name, content := RecoveryStepsFile(steps, "en")
	if name != RecoveryStepsFileName {
		t.Errorf("file name: got %q want %q", name, RecoveryStepsFileName)
	}
	body := string(content)
	if !strings.Contains(body, steps) {
		t.Error("the owner's method must be in the file")
	}
	if !strings.Contains(body, "enough guardians combine their pieces") {
		t.Error("the file must say why it was sealed")
	}
	if !strings.Contains(body, "owner wrote this") {
		t.Error("the file must say these are the owner's words, not the tool's")
	}
}

// The transaction id travels with the ciphertext. Splitting them would undo
// the move, because the id alone fetches the same payload off the chain.
func TestTheChainCopyGoesInTheSealedArchiveFileWithItsTxid(t *testing.T) {
	name, content := ChainCopyFile(payload, txid, "en")
	if name != ChainCopyFileName {
		t.Errorf("file name: got %q want %q", name, ChainCopyFileName)
	}
	body := string(content)
	for _, want := range []string{payload, txid, "any ONE of the wallet's keys", "trust this bundle"} {
		if !strings.Contains(body, want) {
			t.Errorf("the sealed chain copy must carry %q", want)
		}
	}
}

// An owner who published after sealing has no id in here, and no way to add
// one: this file is inside an encrypted archive. It must say so rather than
// offer a line to write on, which was the bug until 2026-09-24.
func TestAnUnknownTxidSaysWhereToLookInstead(t *testing.T) {
	_, content := ChainCopyFile(payload, "", "en")
	body := string(content)
	if strings.Contains(body, "____") {
		t.Error("a sealed file must not offer a line to write on, because nobody can write on it")
	}
	if !strings.Contains(body, "estate page") {
		t.Error("a reader with no id must be told where the id is")
	}
	if strings.Contains(body, txid) {
		t.Error("no transaction id may be invented")
	}
}

func TestAnEmptyBundleSaysSo(t *testing.T) {
	// An heir holding a bundle with no instructions cannot otherwise tell
	// whether that was the owner's decision or a lost file. At the moment
	// they are reading this, that difference matters.
	d := baseData()
	d.OwnerWroteNothing = true
	got := GenerateReadme(d)
	if !strings.Contains(got, "did not leave instructions") {
		t.Error("a bundle with no instructions must say so")
	}
	if !strings.Contains(got, "not missing a page") {
		t.Error("the heir must be told nothing has gone wrong")
	}
	if strings.Contains(got, "names of the other guardians") {
		t.Error("the notice must not promise a roster the bundle no longer carries")
	}
}

func TestABundleWithWordsDoesNotSaySo(t *testing.T) {
	// The words themselves are sealed in the archive. The README carries only
	// the fact that there were some, so it stays silent.
	got := GenerateReadme(baseData())
	if strings.Contains(got, "did not leave instructions") {
		t.Error("a bundle that carries the owner's words must not claim otherwise")
	}
}

// A bundle names nobody, so it has to say where the names are. Otherwise an
// heir with one bundle has a count of missing pieces and no thread to pull.
func TestTheReadmeSaysWhereTheRosterLives(t *testing.T) {
	got := GenerateReadme(baseData())

	for _, want := range []string{"will or estate papers", "does not say"} {
		if !strings.Contains(got, want) {
			t.Errorf("the README must point an heir at the roster, missing %q", want)
		}
	}

	// And a guardian who is asked for their piece can no longer ring another
	// guardian to check. The estate papers are the credential instead.
	if !strings.Contains(got, "comes with their estate papers") {
		t.Error("the README must tell a guardian how to check a request is real")
	}
}
