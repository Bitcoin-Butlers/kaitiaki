package core

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// The share markers and the compact prefix exist in THREE places: here, in
// internal/html/assets/src/crypto/share.ts, and in a regex in
// internal/html/assets/src/app.ts. Renaming them on 2026-09-24 broke the
// browser because only one copy moved, and nothing failed until a paste in a
// browser test came back empty.
//
// A guardian's README is not reissued when a project is renamed, so every
// copy must also keep reading the old spellings. This pins that.
func TestEveryCopyOfTheShareFormatAgrees(t *testing.T) {
	sources := map[string][]string{
		filepath.Join("..", "html", "assets", "src", "crypto", "share.ts"): {
			ShareBegin, ShareEnd, legacyShareBegin, legacyShareEnd,
		},
		filepath.Join("..", "html", "assets", "src", "app.ts"): {
			// Both halves of the regex, named separately: checking one
			// substring passed while the other half was broken.
			"BEGIN (?:INHERITANCE|REMEMORY) SHARE",
			"END (?:INHERITANCE|REMEMORY) SHARE",
		},
	}

	for path, wants := range sources {
		body, err := os.ReadFile(path)
		if err != nil {
			t.Fatalf("reading %s: %v", path, err)
		}
		text := string(body)
		for _, want := range wants {
			if !strings.Contains(text, want) {
				t.Errorf("%s must handle %q; the Go side writes or accepts it",
					filepath.Base(path), want)
			}
		}
	}

	// The compact prefix, same rule.
	tsPath := filepath.Join("..", "html", "assets", "src", "crypto", "share.ts")
	ts, err := os.ReadFile(tsPath)
	if err != nil {
		t.Fatalf("reading %s: %v", tsPath, err)
	}
	if !strings.Contains(string(ts), "IH|RM") {
		t.Error("crypto/share.ts must accept both compact prefixes")
	}
	if !strings.Contains(string(ts), "`"+CompactPrefix+"${") {
		t.Errorf("crypto/share.ts must WRITE the current prefix %q", CompactPrefix)
	}
}
