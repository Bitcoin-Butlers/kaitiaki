package descriptorbackup

import (
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// fixedSecret is the 16-byte secret the published vector was made with, so
// that the deterministic parts of the output are reproducible.
var fixedSecret = []byte{1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16}

type descriptorVector struct {
	Descriptor    string   `json:"descriptor"`
	EncryptedText string   `json:"encryptedText"`
	Xpubs         []string `json:"xpubs"`
}

func loadDescriptorVector(t *testing.T) descriptorVector {
	t.Helper()
	b, err := os.ReadFile(filepath.Join("../html/assets/src/crypto/testdata", "descriptor-vector.json"))
	if err != nil {
		t.Fatalf("reading the vector: %v", err)
	}
	var v descriptorVector
	if err := json.Unmarshal(b, &v); err != nil {
		t.Fatalf("parsing the vector: %v", err)
	}
	return v
}

// deterministicParts mirrors the TypeScript test helper of the same name. The
// Shamir shares carry random x-coordinates and coefficients, so they differ on
// every run and are excluded on purpose. Everything else must match upstream.
func deterministicParts(t *testing.T, encryptedText string, numXfps, numXpubs, numPairs int) (stripped, ciphertext, tags string) {
	t.Helper()
	cut := strings.LastIndex(encryptedText, ")")
	if cut < 0 {
		t.Fatalf("this is not an encrypted descriptor")
	}
	stripped = encryptedText[:cut+1]
	raw, err := base64.RawStdEncoding.DecodeString(encryptedText[cut+1:])
	if err != nil {
		t.Fatalf("the text after the policy is not valid base64: %v", err)
	}
	// Each sealed share is the share plus a 16-byte authentication tag.
	shareLen := 17 + 16
	dataLen := xfpBytes*numXfps + 74*numXpubs
	at := shareLen * numXpubs
	if at+dataLen > len(raw) {
		t.Fatalf("the backup is shorter than its own layout: %d bytes", len(raw))
	}
	ciphertext = hex.EncodeToString(raw[at : at+dataLen])
	at += dataLen
	tags = hex.EncodeToString(raw[at : at+xfpBytes*numPairs])
	return stripped, ciphertext, tags
}

func TestThresholdReproducesTheVector(t *testing.T) {
	v := loadDescriptorVector(t)
	got, err := EncryptDescriptorThreshold(v.Descriptor, fixedSecret)
	if err != nil {
		t.Fatalf("EncryptDescriptorThreshold: %v", err)
	}

	gotStripped, gotCipher, gotTags := deterministicParts(t, got.EncryptedText, 3, 3, 3)
	wantStripped, wantCipher, wantTags := deterministicParts(t, v.EncryptedText, 3, 3, 3)

	if gotStripped != wantStripped {
		t.Errorf("stripped descriptor\n got %s\nwant %s", gotStripped, wantStripped)
	}
	if gotCipher != wantCipher {
		t.Errorf("encrypted key block\n got %s\nwant %s", gotCipher, wantCipher)
	}
	if gotTags != wantTags {
		t.Errorf("lookup tags\n got %s\nwant %s", gotTags, wantTags)
	}
	if len(got.EncryptedText) != len(v.EncryptedText) {
		t.Errorf("total length: got %d want %d", len(got.EncryptedText), len(v.EncryptedText))
	}
	if got.MissingXfps {
		t.Error("MissingXfps should be false for the vector")
	}
	if got.IsTestnet {
		t.Error("IsTestnet should be false for the vector")
	}
}

func TestNumberToBytesKeepsUpstreamEdgeCases(t *testing.T) {
	// Zero contributes NO bytes. Pinned because multisigbackup.com does the
	// same, and changing it would make our ciphertext unreadable there.
	for _, c := range []struct {
		n    int
		want string
	}{
		{0, ""},
		{1, "01"},
		{255, "ff"},
		{256, "0100"},
		{65535, "ffff"},
		{65536, "010000"},
	} {
		if got := hex.EncodeToString(NumberToBytes(c.n)); got != c.want {
			t.Errorf("NumberToBytes(%d) = %q, want %q", c.n, got, c.want)
		}
	}
}

func TestSortsBeforeUsesJavaScriptStringOrder(t *testing.T) {
	// [2,0,0,0] sorts AFTER [10,0,0,0] because "2," beats "10,". Byte order
	// would say the opposite, and would put the lookup tags in a different
	// order than the tool a client falls back to.
	a := []byte{2, 0, 0, 0}
	b := []byte{10, 0, 0, 0}
	if sortsBefore(a, b) {
		t.Error("[2,0,0,0] must sort after [10,0,0,0], the way JavaScript compares them")
	}
	if !sortsBefore(b, a) {
		t.Error("[10,0,0,0] must sort before [2,0,0,0]")
	}
}

func TestTaprootIsRefused(t *testing.T) {
	if _, err := ParseDescriptor("tr(xpub.../<0;1>/*)"); err == nil {
		t.Error("a taproot descriptor must be refused, the same as upstream")
	}
}
