package core

import (
	"bytes"
	"fmt"
	"io"
	"strings"

	"filippo.io/age"
	"filippo.io/age/armor"
)

// ValidateOwnerRecipient checks that s is a valid age X25519 recipient
// (an "age1..." string). Returns a normalized form.
func ValidateOwnerRecipient(s string) (string, error) {
	s = strings.TrimSpace(s)
	if _, err := age.ParseX25519Recipient(s); err != nil {
		return "", fmt.Errorf("invalid owner recipient: %w", err)
	}
	return s, nil
}

// EncryptPassphraseToOwner encrypts the bundle passphrase to the owner's
// age X25519 recipient. Output is ASCII-armored so it also survives on
// paper. Any standard age tool can decrypt it with the owner identity.
func EncryptPassphraseToOwner(passphrase, recipientStr string) ([]byte, error) {
	recipientStr, err := ValidateOwnerRecipient(recipientStr)
	if err != nil {
		return nil, err
	}
	recipient, err := age.ParseX25519Recipient(recipientStr)
	if err != nil {
		return nil, fmt.Errorf("invalid owner recipient: %w", err)
	}
	var buf bytes.Buffer
	aw := armor.NewWriter(&buf)
	w, err := age.Encrypt(aw, recipient)
	if err != nil {
		return nil, fmt.Errorf("encrypting to owner: %w", err)
	}
	if _, err := io.WriteString(w, passphrase); err != nil {
		return nil, fmt.Errorf("writing passphrase: %w", err)
	}
	if err := w.Close(); err != nil {
		return nil, fmt.Errorf("closing encryption: %w", err)
	}
	if err := aw.Close(); err != nil {
		return nil, fmt.Errorf("closing armor: %w", err)
	}
	return buf.Bytes(), nil
}
