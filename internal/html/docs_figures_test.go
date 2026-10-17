package html

import (
	"crypto/sha256"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"testing"
)

// The guide is written by hand and the pages it documents are not. These tests
// hold the two together, because nothing else does and the drift is invisible
// to a reader: a figure of the wrong card is still a figure of a real card.
//
// All three read committed files, so they are deterministic and run in CI with
// the rest of `make test`. Regenerating the figures is not: five of the eleven
// differ between two runs with identical inputs, so a regenerate-and-diff check
// would be flaky and is deliberately absent.

// figuresDir is docs/screenshots/en, reached from this package's directory.
const figuresDir = "../../docs/screenshots/en"

// TestNoTwoFiguresAreIdentical catches a capture that frames the wrong card.
//
// On 2026-09-22 a step was inserted into maker.html and Generate Bundles moved
// from card index 2 to 3. Two screenshot tests kept framing index 2, so
// owners-words.png and tlock-setup.png became BYTE IDENTICAL and the guide
// showed the owner's-words card under the time lock heading. Two distinct
// captures producing the same bytes means they framed the same thing.
func TestNoTwoFiguresAreIdentical(t *testing.T) {
	entries, err := os.ReadDir(figuresDir)
	if err != nil {
		t.Fatalf("cannot read %s: %v", figuresDir, err)
	}

	seen := map[[32]byte]string{}
	for _, e := range entries {
		if filepath.Ext(e.Name()) != ".png" {
			continue
		}
		data, err := os.ReadFile(filepath.Join(figuresDir, e.Name()))
		if err != nil {
			t.Fatalf("cannot read %s: %v", e.Name(), err)
		}
		sum := sha256.Sum256(data)
		if first, dup := seen[sum]; dup {
			t.Errorf("%s and %s are byte identical, so one of them frames the wrong card", first, e.Name())
			continue
		}
		seen[sum] = e.Name()
	}
	if len(seen) == 0 {
		t.Fatal("no figures found; the path is wrong or the figures were deleted")
	}
}

// TestEveryFigureTheGuideReferencesExists catches a renamed or deleted figure.
func TestEveryFigureTheGuideReferencesExists(t *testing.T) {
	guide, err := docsContentFS.ReadFile("docs-content/en.md")
	if err != nil {
		t.Fatalf("cannot read the guide: %v", err)
	}

	refs := regexp.MustCompile(`src="(screenshots/[^"]+)"`).FindAllSubmatch(guide, -1)
	if len(refs) == 0 {
		t.Fatal("the guide references no figures; the pattern is wrong")
	}
	for _, m := range refs {
		rel := string(m[1])
		if _, err := os.Stat(filepath.Join("../../docs", rel)); err != nil {
			t.Errorf("the guide references %s, which is not on disk", rel)
		}
	}
}

// TestTheGuideHasOneStepPerStepInTheMaker catches the guide falling behind the
// page it documents.
//
// The guide described three steps for a four-step maker from 2026-09-22 until
// 2026-09-23, so a reader following it looked for a Generate button in the
// step that now asks what their heirs need to know.
func TestTheGuideHasOneStepPerStepInTheMaker(t *testing.T) {
	guide, err := docsContentFS.ReadFile("docs-content/en.md")
	if err != nil {
		t.Fatalf("cannot read the guide: %v", err)
	}

	guideSteps := regexp.MustCompile(`(?m)^### Step (\d+):`).FindAllSubmatch(guide, -1)
	// Match the number the reader sees, not the id: step 1 carries no id
	// because it is never pending.
	makerSteps := regexp.MustCompile(`class="step-number[^"]*"[^>]*>(\d+)`).FindAllStringSubmatch(makerHTMLTemplate, -1)

	if len(guideSteps) != len(makerSteps) {
		t.Fatalf("the maker has %d steps and the guide documents %d", len(makerSteps), len(guideSteps))
	}
	if len(guideSteps) == 0 {
		t.Fatal("no steps found in either file; a pattern is wrong")
	}

	// And they are numbered 1..N in order, so an inserted step renumbers the
	// ones after it in both places rather than in one.
	for i, m := range guideSteps {
		want := i + 1
		got, _ := strconv.Atoi(string(m[1]))
		if got != want {
			t.Errorf("the guide's step %d is numbered %d", want, got)
		}
	}
}
