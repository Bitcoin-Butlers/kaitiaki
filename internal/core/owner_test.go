package core

import (
	"bytes"
	"io"
	"strings"
	"testing"

	"filippo.io/age"
	"filippo.io/age/armor"
)

func TestOwnerRoundTrip(t *testing.T) {
	id, err := age.GenerateX25519Identity()
	if err != nil {
		t.Fatal(err)
	}
	data, err := EncryptPassphraseToOwner("correct horse battery staple", id.Recipient().String())
	if err != nil {
		t.Fatal(err)
	}
	if !strings.HasPrefix(string(data), "-----BEGIN AGE ENCRYPTED FILE-----") {
		t.Fatalf("expected armored output, got %q", string(data[:40]))
	}
	r, err := age.Decrypt(armor.NewReader(bytes.NewReader(data)), id)
	if err != nil {
		t.Fatal(err)
	}
	got, err := io.ReadAll(r)
	if err != nil {
		t.Fatal(err)
	}
	if string(got) != "correct horse battery staple" {
		t.Fatalf("round trip mismatch: %q", got)
	}
}

func TestOwnerRecipientValidation(t *testing.T) {
	bad := []string{"", "age1", "AGE-SECRET-KEY-1XYZ", "not-a-key",
		"age1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq"}
	for _, s := range bad {
		if _, err := ValidateOwnerRecipient(s); err == nil {
			t.Errorf("expected error for %q", s)
		}
	}
	// A known-good vector from the owner-key derivation tests.
	good := "age17pv0xledcth6mtfpgmtaxc3gahxdkt5ad79cxwxtgj966kqxq9fs3m8ced"
	if _, err := ValidateOwnerRecipient(" " + good + " "); err != nil {
		t.Errorf("expected valid, got %v", err)
	}
	if _, err := EncryptPassphraseToOwner("p", good); err != nil {
		t.Errorf("encrypt to known recipient failed: %v", err)
	}
}
