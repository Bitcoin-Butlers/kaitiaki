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
	docsAsk       = regexp.MustCompile(`(?i)\b(type|paste|enter|send|read|ask)\b(?:[^.!?]|\.[^\s.!?]){0,60}\b(recovery words|recovery phrase|seed words|seed phrase|seed share|secret key|private key|your words|their words|the words|share text)\b|\b(type|paste|enter) them\b|\bpaste the text\b`)
	docsWarning   = regexp.MustCompile(`(?i)\b(never|not|no)\b`)
	docsTag       = regexp.MustCompile(`<[^>]+>`)
	docsReadAttr  = regexp.MustCompile(`(?i)\b(?:alt|aria-label|title)\s*=\s*(?:"([^"]*)"|'([^']*)')`)
	docsSentence  = regexp.MustCompile(`[.!?]\s+|\n`)
	docsScreenSrc = regexp.MustCompile(`src="screenshots/([^"]+)"`)
)

func TestGenerateDocsHTMLAsksForNoSecret(t *testing.T) {
	for _, sentence := range docsAsks(GenerateDocsHTML("en", false)) {
		t.Errorf("asks for a secret: %q", sentence)
	}
}

// A crawler and a screen reader read an alt, aria-label or title too.
func TestDocsAsksReadsAttributes(t *testing.T) {
	for _, tag := range []string{
		`<img src="screenshots/en/a.png" alt="Type your recovery words from the printed PDF into the recovery tool">`,
		`<button aria-label="Enter your seed phrase to continue">`,
		`<div title='Paste your secret key here'>`,
	} {
		if len(docsAsks(tag)) == 0 {
			t.Errorf("not caught: %s", tag)
		}
	}
}

// Each name for the words counts, the plain ones too.
func TestDocsAsksNamesEachSecret(t *testing.T) {
	for _, sentence := range []string{
		"Type your recovery phrase into the tool.",
		"Enter your seed phrase to continue.",
		"Paste your recovery words here.",
	} {
		if len(docsAsks(sentence)) == 0 {
			t.Errorf("not caught: %s", sentence)
		}
	}
}

// docsAsks returns each sentence of the page that asks for a secret.
func docsAsks(html string) []string {
	var asks []string
	// A tag goes, but its alt, aria-label and title stay, each on its own line.
	text := docsTag.ReplaceAllStringFunc(html, func(tag string) string {
		read := " "
		for _, m := range docsReadAttr.FindAllStringSubmatch(tag, -1) {
			read += "\n" + m[1] + m[2] + "\n"
		}
		return read
	})
	for _, sentence := range docsSentence.Split(text, -1) {
		sentence = strings.Join(strings.Fields(sentence), " ")
		if docsAsk.MatchString(sentence) && !docsWarning.MatchString(sentence) {
			asks = append(asks, sentence)
		}
	}
	return asks
}

func TestGenerateDocsHTMLScreenshotsExist(t *testing.T) {
	for _, m := range docsScreenSrc.FindAllStringSubmatch(GenerateDocsHTML("en", false), -1) {
		if _, err := os.Stat(filepath.Join("..", "..", "docs", "screenshots", m[1])); err != nil {
			t.Errorf("missing screenshot: %s", m[1])
		}
	}
}
