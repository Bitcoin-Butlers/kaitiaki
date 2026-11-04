package html

import (
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"testing"
)

// The Bitcoin Butlers site carries this guide, and its owner ruled on
// 2026-11-01: no page asks a visitor to type, paste, send or read out their
// words or a secret key. A crawler reads such a sentence as a phishing ask.
// A warning ("Never paste seed words here") is not an ask, and it stays.
var (
	docsAsk       = regexp.MustCompile(`(?i)\b(type|paste|enter|send|read|ask)\b(?:[^.!?]|\.[^\s.!?]){0,60}\b(recovery words|seed words|seed phrase|seed share|secret key|private key|your words|their words|the words|share text)\b|\b(type|paste|enter) them\b|\bpaste the text\b`)
	docsWarning   = regexp.MustCompile(`(?i)\b(never|not|no)\b`)
	docsTag       = regexp.MustCompile(`<[^>]+>`)
	docsSentence  = regexp.MustCompile(`[.!?]\s+|\n`)
	docsScreenSrc = regexp.MustCompile(`src="screenshots/([^"]+)"`)
)

func TestGenerateDocsHTMLAsksForNoSecret(t *testing.T) {
	text := docsTag.ReplaceAllString(GenerateDocsHTML("en", false), " ")
	for _, sentence := range docsSentence.Split(text, -1) {
		sentence = strings.Join(strings.Fields(sentence), " ")
		if docsAsk.MatchString(sentence) && !docsWarning.MatchString(sentence) {
			t.Errorf("asks for a secret: %q", sentence)
		}
	}
}

func TestGenerateDocsHTMLScreenshotsExist(t *testing.T) {
	for _, m := range docsScreenSrc.FindAllStringSubmatch(GenerateDocsHTML("en", false), -1) {
		if _, err := os.Stat(filepath.Join("..", "..", "docs", "screenshots", m[1])); err != nil {
			t.Errorf("missing screenshot: %s", m[1])
		}
	}
}
