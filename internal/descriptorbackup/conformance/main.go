// Command conformance writes backups with the Go implementation so that the
// TypeScript one can try to open them.
//
// The two implementations must agree, because the browser writes with one and
// the heir-side recover page reads with the other. Run it through
// `make test-xlang`, which pipes the output into the TypeScript checker.
package main

import (
	"encoding/json"
	"fmt"
	"os"

	db "github.com/eljojo/rememory/internal/descriptorbackup"
)

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

	out, err := json.MarshalIndent(map[string]any{
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
