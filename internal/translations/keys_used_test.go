package translations

import (
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"testing"
)

// A missing key renders as its own name. On 2026-09-24 a key rename left the
// PDF printing the literal text "recover_anon_step3" where the recovery steps
// belong, and it shipped: the PDF test only asserted the file was not empty,
// and the rendered text is split across PDF operators, so grepping the output
// could not catch it reliably either.
//
// Catch it at the source instead. Every key the bundle and PDF generators ask
// for must exist.
func TestEveryKeyTheGeneratorsAskForExists(t *testing.T) {
	// t("some_key") and t("some_key", args...). The trailing [,)] keeps out
	// keys built by concatenation, such as t("lang_" + lang), which this test
	// cannot resolve and must not guess at.
	call := regexp.MustCompile(`\bt\("([a-z0-9_]+)"\s*[,)]`)

	keys, err := GetComponentKeys("readme")
	if err != nil {
		t.Fatalf("reading readme keys: %v", err)
	}
	have := make(map[string]bool, len(keys))
	for _, k := range keys {
		have[k] = true
	}

	sources := []string{
		filepath.Join("..", "bundle", "readme.go"),
		filepath.Join("..", "bundle", "sealed_texts.go"),
		filepath.Join("..", "pdf", "readme.go"),
	}

	checked := 0
	for _, src := range sources {
		body, err := os.ReadFile(src)
		if err != nil {
			t.Fatalf("reading %s: %v", src, err)
		}
		for _, m := range call.FindAllStringSubmatch(string(body), -1) {
			key := m[1]
			checked++
			if !have[key] {
				t.Errorf("%s asks for readme key %q, which does not exist", filepath.Base(src), key)
			}
		}
	}

	// Without this the test passes when the regex stops matching anything.
	if checked < 30 {
		t.Fatalf("only %d key uses found across %s; the scan is not working",
			checked, strings.Join(sources, ", "))
	}
}
