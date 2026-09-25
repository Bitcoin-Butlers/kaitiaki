package pdf

import (
	"bytes"
	"compress/zlib"
	"io"
	"strings"
	"testing"
	"time"

	"github.com/Bitcoin-Butlers/kaitiaki/internal/core"
)

// The printed page is the easiest of the three surfaces to photograph and pass
// on, and it was the only one with no disclosure test. It also broke silently
// once, on 2026-09-24: a translation-key rename left it printing the literal
// text "recover_anon_step3", and the only PDF test asserted the file was not
// empty, so nothing caught it.
//
// pdfText renders the real artifact and reads it back, rather than trusting
// the struct. fpdf compresses its content streams, so they are inflated here.
func pdfText(t *testing.T, raw []byte) string {
	t.Helper()
	var out strings.Builder
	rest := raw
	for {
		i := bytes.Index(rest, []byte("stream"))
		if i < 0 {
			break
		}
		body := rest[i+len("stream"):]
		body = bytes.TrimLeft(body, "\r\n")
		j := bytes.Index(body, []byte("endstream"))
		if j < 0 {
			break
		}
		if zr, err := zlib.NewReader(bytes.NewReader(body[:j])); err == nil {
			if dec, err := io.ReadAll(zr); err == nil {
				out.Write(dec)
			}
			zr.Close()
		}
		rest = body[j:]
	}
	if out.Len() == 0 {
		t.Fatal("no content stream could be read, so this test proves nothing")
	}
	// fpdf writes the text as UTF-16BE inside the Tj operands, so every ASCII
	// character arrives preceded by a zero byte. Drop them and the stream
	// reads as plain text.
	return strings.ReplaceAll(out.String(), "\x00", "")
}

func disclosureData() ReadmeData {
	return ReadmeData{
		ProjectName:      "Test Project",
		Holder:           "Alice",
		Share:            core.NewShare(2, 1, 3, 2, "Alice", []byte{1, 2, 3, 4, 5, 6, 7, 8}),
		Threshold:        2,
		Total:            3,
		Version:          "v0.0.22",
		GitHubReleaseURL: "https://github.com/Bitcoin-Butlers/kaitiaki",
		ManifestChecksum: "sha256:abcdef",
		RecoverChecksum:  "sha256:123456",
		Created:          time.Date(2026, 9, 24, 12, 0, 0, 0, time.UTC),
		Language:         "en",
	}
}

func TestThePrintedPageNamesNoOtherGuardian(t *testing.T) {
	raw, err := GenerateReadme(disclosureData())
	if err != nil {
		t.Fatalf("GenerateReadme: %v", err)
	}
	text := pdfText(t, raw)

	if !strings.Contains(text, "Alice") {
		t.Error("a guardian must be able to tell the printed page is theirs")
	}
	for _, secret := range []string{"Bob", "Carol", "bob@example.com", "OTHER GUARDIANS", "Contact:"} {
		if strings.Contains(text, secret) {
			t.Errorf("the printed page must name nobody but its holder, found %q", secret)
		}
	}
}

func TestThePrintedPageCarriesNoOwnerText(t *testing.T) {
	text := pdfText(t, mustRender(t))

	for _, secret := range []string{"THE CHAIN COPY", "the owner wrote this", "any ONE of the wallet's keys"} {
		if strings.Contains(text, secret) {
			t.Errorf("the printed page must carry none of the owner's words, found %q", secret)
		}
	}
	// Non-vacuity control. fpdf breaks a line across Tj operands, so only a
	// short contiguous run is a reliable probe; the holder's name is one, and
	// if the extraction above ever stops working this fails first.
	if !strings.Contains(text, "Alice") {
		t.Fatal("the extraction read nothing, so the assertions above prove nothing")
	}
}

func mustRender(t *testing.T) []byte {
	t.Helper()
	raw, err := GenerateReadme(disclosureData())
	if err != nil {
		t.Fatalf("GenerateReadme: %v", err)
	}
	return raw
}
