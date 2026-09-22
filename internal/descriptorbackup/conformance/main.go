// Command conformance writes backups with the Go implementation so that the
// TypeScript one can try to open them.
//
// The two implementations must agree, because the browser writes with one and
// the heir-side recover page reads with the other. Run it through
// `make test-xlang`, which pipes the output into the TypeScript checker.
package main

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"os"

	db "github.com/eljojo/rememory/internal/descriptorbackup"
	"golang.org/x/crypto/chacha20poly1305"
)

// unreadableBackup builds a backup the key genuinely opens, holding a content
// type this version must refuse. It exists so the checker can prove neither
// implementation blames the key for contents it cannot read.
func unreadableBackup(pubkey []byte) string {
	secret, individual, err := db.DeriveSecrets([][]byte{pubkey})
	if err != nil {
		panic(err)
	}
	nonce := []byte{1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12}
	aead, err := chacha20poly1305.New(secret)
	if err != nil {
		panic(err)
	}
	ciphertext := aead.Seal(nil, nonce, []byte{0x80, 0x00, 0x00}, nil)
	block, err := db.EncodeIndividualSecrets(individual)
	if err != nil {
		panic(err)
	}
	out := append([]byte{}, db.Magic...)
	out = append(out, db.Version, 0x00)
	out = append(out, block...)
	out = append(out, db.EncryptionChaCha20Poly1305)
	out = append(out, nonce...)
	out = append(out, db.EncodeCompactSize(len(ciphertext))...)
	out = append(out, ciphertext...)
	return base64.StdEncoding.EncodeToString(out)
}

func main() {
	if len(os.Args) < 2 {
		fmt.Fprintln(os.Stderr, "usage: conformance <output.json>")
		os.Exit(2)
	}
	var vector struct {
		Descriptor string   `json:"descriptor"`
		Xpubs      []string `json:"xpubs"`
	}
	raw, err := os.ReadFile("internal/html/assets/src/crypto/testdata/descriptor-vector.json")
	if err != nil {
		panic(err)
	}
	if err := json.Unmarshal(raw, &vector); err != nil {
		panic(err)
	}

	note := "2 of 3. Sparrow. Connect any two signers."

	threshold, err := db.EncryptDescriptorThreshold(vector.Descriptor, nil)
	if err != nil {
		panic(err)
	}
	_, plain, _, err := db.EncryptDescriptor(vector.Descriptor, nil, db.EncodeOptions{})
	if err != nil {
		panic(err)
	}
	_, withNote, _, err := db.EncryptDescriptor(vector.Descriptor, []db.ContentItem{
		{Type: db.ContentTypeString, Content: []byte(note)},
	}, db.EncodeOptions{})
	if err != nil {
		panic(err)
	}

	pubkeys, _, err := db.DescriptorPubkeys(vector.Descriptor)
	if err != nil {
		panic(err)
	}

	out, err := json.MarshalIndent(map[string]any{
		"unreadable": unreadableBackup(pubkeys[1]),
		"descriptor": vector.Descriptor,
		"xpubs":      vector.Xpubs,
		"note":       note,
		"threshold":  threshold.EncryptedText,
		"bip138":     plain,
		"bip138Note": withNote,
	}, "", " ")
	if err != nil {
		panic(err)
	}
	if err := os.WriteFile(os.Args[1], out, 0o644); err != nil {
		panic(err)
	}
	fmt.Println("wrote", os.Args[1])
}
