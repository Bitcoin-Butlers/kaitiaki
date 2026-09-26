package core

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// The generated file must be current. This replaced a guardrail that read the
// TypeScript looking for the right strings: that one only shouted after
// somebody had already typed the wrong thing, and it passed once while half
// of one regex was broken. There is nothing to type now, so there is one
// question left, and this asks it.
func TestShareFormatTSIsCurrent(t *testing.T) {
	path := filepath.Join("..", "html", "assets", "src", "crypto", "share-format.ts")
	want := ShareFormatTS()

	if *generate {
		if err := os.WriteFile(path, []byte(want), 0644); err != nil {
			t.Fatalf("writing %s: %v", path, err)
		}
		t.Logf("regenerated %s", path)
		return
	}

	got, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("reading %s: %v (run: go test ./internal/core/ -run ShareFormat -generate)", path, err)
	}
	if string(got) != want {
		t.Errorf("%s is stale. Regenerate with:\n  go test ./internal/core/ -run ShareFormat -generate",
			filepath.Base(path))
	}
}

// And the markers a guardian reads must not name the project we forked from.
func TestTheGeneratedFormatNamesThisProject(t *testing.T) {
	ts := ShareFormatTS()
	if !strings.Contains(ts, "BEGIN INHERITANCE SHARE") {
		t.Error("the generated format must write our own marker")
	}
	if !strings.Contains(ts, "REMEMORY") {
		t.Error("the generated format must still READ the old marker")
	}
}
