package bundle

import (
	"strings"
	"testing"
	"time"

	"github.com/eljojo/rememory/internal/core"
)

// The three texts must land exactly where the split-by-harm decision put them.
// README.txt is built to be forwarded: a guardian's own copy tells them to send
// it to whoever asks. So the method and the chain copy may sit in it, and the
// key locations may not.

const (
	steps     = "2 of 3. Open Sparrow, load the descriptor, connect any two signers."
	locations = "Key 1: the safe at home. Key 2: Hannah has it. Key 3: bank box."
	payload   = "QklQMTM4AQAFLr8hjVQ5qqHdxyiEOfHcVsZlnWdF"
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

func TestRecoveryStepsAppearInTheReadme(t *testing.T) {
	d := baseData()
	d.RecoverySteps = steps
	got := GenerateReadme(d)

	if !strings.Contains(got, steps) {
		t.Error("the owner's method must be readable by a lone guardian")
	}
	if !strings.Contains(got, "the owner wrote this") && !strings.Contains(got, "owner wrote this") {
		t.Error("the README must say these are the owner's words, not the tool's")
	}
}

func TestChainCopyAppearsWithABlankTxidLine(t *testing.T) {
	d := baseData()
	d.ChainPayload = payload
	got := GenerateReadme(d)

	if !strings.Contains(got, payload) {
		t.Error("the chain copy must be in the README, so an heir with one bundle and one key can use it")
	}
	if !strings.Contains(got, "____") {
		t.Error("a blank line must be left for the transaction id, which does not exist at bundle time")
	}
	if !strings.Contains(got, "any ONE of the wallet's keys") {
		t.Error("the README must say one key opens the chain copy")
	}
}

// Which copy wins.
//
// The chain copy cannot be rewritten, so an owner who revises their
// instructions leaves an older copy on the chain for good. A guardian meets
// the second copy here, in this README, and needs the rule beside it rather
// than in a document they do not have. Decided 2026-09-23.
func TestTheReadmeSaysTheBundleWinsOverTheChainCopy(t *testing.T) {
	d := baseData()
	d.ChainPayload = payload
	got := GenerateReadme(d)

	if !strings.Contains(got, "trust this bundle") {
		t.Error("the README must name the bundle as the copy to trust when the two disagree")
	}
	if !strings.Contains(got, "may be older") {
		t.Error("the README must say the chain copy can be the older of the two")
	}

	// A bundle with no chain copy has nothing to reconcile, and a rule about
	// a second copy that does not exist is noise.
	plain := GenerateReadme(baseData())
	if strings.Contains(plain, "trust this bundle") {
		t.Error("a bundle with no chain copy must not discuss which copy wins")
	}
}

func TestAKnownTxidReplacesTheBlank(t *testing.T) {
	d := baseData()
	d.ChainPayload = payload
	d.ChainTxid = "4801ea9c10e14a5ea5c0e5e68bfe08fd2422005ea0a3a9631fead29ce910a4df"
	got := GenerateReadme(d)

	if !strings.Contains(got, d.ChainTxid) {
		t.Error("a transaction id that is known must be printed")
	}
	if strings.Contains(got, "____") {
		t.Error("the blank line must go once the transaction id is known")
	}
}

func TestKeyLocationsNeverReachTheReadme(t *testing.T) {
	// The strongest test in this file. A README travels to whoever asks a
	// guardian for their piece. Key locations must never be in one.
	d := baseData()
	d.RecoverySteps = steps
	d.ChainPayload = payload
	got := GenerateReadme(d)

	for _, secret := range []string{locations, "Hannah", "bank box", "safe at home"} {
		if strings.Contains(got, secret) {
			t.Errorf("a README must never carry key locations, found %q", secret)
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

func TestNothingIsClaimedWhenTheOwnerWroteNothing(t *testing.T) {
	// An owner who skips the boxes must not get a heading that says they
	// wrote something, an empty chain section, or a blank transaction line
	// for a transaction that does not exist.
	//
	// The README DOES gain a note saying no instructions were left, decided
	// in the empty-bundle ticket, so that an heir can tell a decision from a
	// lost file. That is asserted separately.
	got := GenerateReadme(baseData())
	for _, marker := range []string{"THE CHAIN COPY", "the owner wrote this", "____"} {
		if strings.Contains(got, marker) {
			t.Errorf("an empty field must claim nothing, found %q", marker)
		}
	}
}

// The CLI and the browser must put the owner's words in the same place. The
// browser fills BundleParams from its WASM config; the CLI fills the same
// struct from project.yml and a flag. This pins the struct that both use.
func TestBundleParamsCarryTheOwnersTexts(t *testing.T) {
	d := baseData()
	d.RecoverySteps = steps
	d.ChainPayload = payload
	d.ChainTxid = "4801ea9c10e14a5ea5c0e5e68bfe08fd2422005ea0a3a9631fead29ce910a4df"

	got := GenerateReadme(d)
	for _, want := range []string{steps, payload, d.ChainTxid} {
		if !strings.Contains(got, want) {
			t.Errorf("a README built from these fields must carry %q", want)
		}
	}

	// And a project that says nothing still produces the old README.
	plain := GenerateReadme(baseData())
	if strings.Contains(plain, "THE CHAIN COPY") {
		t.Error("a project with no chain copy must not grow an empty section")
	}
}

func TestAnEmptyBundleSaysSo(t *testing.T) {
	// An heir holding a bundle with no instructions cannot otherwise tell
	// whether that was the owner's decision or a lost file. At the moment
	// they are reading this, that difference matters.
	got := GenerateReadme(baseData())
	if !strings.Contains(got, "did not leave instructions") {
		t.Error("a bundle with no instructions must say so")
	}
	if !strings.Contains(got, "not missing a page") {
		t.Error("the heir must be told nothing has gone wrong")
	}
}

func TestABundleWithWordsDoesNotSaySo(t *testing.T) {
	d := baseData()
	d.RecoverySteps = steps
	got := GenerateReadme(d)
	if strings.Contains(got, "did not leave instructions") {
		t.Error("a bundle that carries the owner's words must not claim otherwise")
	}
}
