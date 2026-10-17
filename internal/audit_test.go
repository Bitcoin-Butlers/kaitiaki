package integration

import (
	"bytes"
	"strings"
	"testing"

	"github.com/Bitcoin-Butlers/kaitiaki/internal/core"
	"github.com/Bitcoin-Butlers/kaitiaki/internal/crypto"
)

// sealSecret encrypts secret with a fresh v2 passphrase and splits the raw
// bytes into n shares with the given threshold. Returns the encoded share
// texts and the age ciphertext.
func sealSecret(t *testing.T, secret []byte, n, k, total, threshold int) ([]string, []byte) {
	t.Helper()

	raw, passphrase, err := crypto.GenerateRawPassphrase(crypto.DefaultPassphraseBytes)
	if err != nil {
		t.Fatalf("generating passphrase: %v", err)
	}

	var ct bytes.Buffer
	if err := core.Encrypt(&ct, bytes.NewReader(secret), passphrase); err != nil {
		t.Fatalf("encrypting: %v", err)
	}

	parts, err := core.Split(raw, n, k)
	if err != nil {
		t.Fatalf("splitting: %v", err)
	}

	encoded := make([]string, n)
	for i, p := range parts {
		encoded[i] = core.NewShare(2, i+1, total, threshold, "", p).Encode()
	}
	return encoded, ct.Bytes()
}

// recoverSecret parses encoded shares, combines them, and decrypts ct.
func recoverSecret(t *testing.T, encoded []string, ct []byte) ([]byte, error) {
	t.Helper()

	data := make([][]byte, len(encoded))
	for i, e := range encoded {
		s, err := core.ParseShare([]byte(e))
		if err != nil {
			t.Fatalf("parsing share %d: %v", i, err)
		}
		if err := s.Verify(); err != nil {
			return nil, err
		}
		data[i] = s.Data
	}

	combined, err := core.Combine(data)
	if err != nil {
		return nil, err
	}
	passphrase := core.RecoverPassphrase(combined, 2)

	var out bytes.Buffer
	if err := core.Decrypt(&out, bytes.NewReader(ct), passphrase); err != nil {
		return nil, err
	}
	return out.Bytes(), nil
}

// TestLifecycle2of3 covers the full v2 lifecycle: seal a secret 2-of-3,
// recover with exactly 2 shares through the text share encoding.
func TestLifecycle2of3(t *testing.T) {
	secret := []byte("the butler's secret")
	shares, ct := sealSecret(t, secret, 3, 2, 3, 2)

	got, err := recoverSecret(t, []string{shares[0], shares[2]}, ct)
	if err != nil {
		t.Fatalf("recovering: %v", err)
	}
	if !bytes.Equal(got, secret) {
		t.Fatalf("recovered %q, want %q", got, secret)
	}
}

// TestHideQuorumLifecycle covers hide-quorum shares (Total/Threshold
// encoded as 0): the quorum must not appear in the share text, parsing
// must not error, and recovery with enough shares must still work.
func TestHideQuorumLifecycle(t *testing.T) {
	secret := []byte("hidden quorum secret")
	shares, ct := sealSecret(t, secret, 3, 2, 0, 0)

	for i, s := range shares {
		if strings.Contains(s, "Total:") || strings.Contains(s, "Threshold:") {
			t.Fatalf("share %d discloses quorum:\n%s", i, s)
		}
		parsed, err := core.ParseShare([]byte(s))
		if err != nil {
			t.Fatalf("parsing hidden-quorum share %d: %v", i, err)
		}
		if parsed.Total != 0 || parsed.Threshold != 0 {
			t.Fatalf("share %d parsed quorum %d/%d, want 0/0", i, parsed.Threshold, parsed.Total)
		}
	}

	got, err := recoverSecret(t, []string{shares[1], shares[2]}, ct)
	if err != nil {
		t.Fatalf("recovering with hidden quorum: %v", err)
	}
	if !bytes.Equal(got, secret) {
		t.Fatalf("recovered %q, want %q", got, secret)
	}

	// Below threshold: combining 1 share is rejected outright.
	if _, err := core.Combine([][]byte{nil}); err == nil {
		t.Fatal("Combine with one share should fail")
	}
}

// TestHideQuorumUnderThresholdFailsLoudly: with the quorum hidden, an
// under-threshold combine yields a wrong passphrase and age must reject it.
func TestHideQuorumUnderThresholdFailsLoudly(t *testing.T) {
	secret := []byte("needs three")
	shares, ct := sealSecret(t, secret, 4, 3, 0, 0)

	// Only 2 of the 3 required shares.
	if _, err := recoverSecret(t, []string{shares[0], shares[1]}, ct); err == nil {
		t.Fatal("recovery below threshold must fail (age must reject the garbage passphrase)")
	}
}

// TestTamperedShareFailsLoudly: flipping one byte of a share's data must
// fail checksum verification.
func TestTamperedShareFailsLoudly(t *testing.T) {
	shares, _ := sealSecret(t, []byte("x"), 3, 2, 3, 2)

	parsed, err := core.ParseShare([]byte(shares[0]))
	if err != nil {
		t.Fatalf("parsing: %v", err)
	}
	parsed.Data[0] ^= 0xFF
	if err := parsed.Verify(); err == nil {
		t.Fatal("Verify must fail for tampered share data")
	}
}

// TestTamperedCiphertextRejected: flipping a payload byte of the age file
// must make decryption fail.
func TestTamperedCiphertextRejected(t *testing.T) {
	secret := []byte("integrity matters")
	shares, ct := sealSecret(t, secret, 3, 2, 3, 2)

	tampered := append([]byte(nil), ct...)
	tampered[len(tampered)-1] ^= 0x01

	if _, err := recoverSecret(t, []string{shares[0], shares[1]}, tampered); err == nil {
		t.Fatal("age must reject a tampered ciphertext")
	}
}
