//go:build js && wasm && create

package main

import (
	"syscall/js"

	db "github.com/eljojo/rememory/internal/descriptorbackup"
)

// TxOverheadVBytes is what a one-output OP_RETURN transaction costs before the
// payload. The descriptor page uses the same number, so the two agree about
// what a client will pay.
const TxOverheadVBytes = 137

// encryptChainCopyJS builds the text an owner publishes on the chain.
//
// Args: { descriptor: string, recoverySteps: string }
// Returns: { text, bytes, vbytes, satAt2, satAt10, format, excluded, error }
//
// The format is chosen here rather than offered to the owner. Recovery steps
// present means BIP-138, because only BIP-138 carries a String item beside the
// descriptor. A descriptor on its own may use the threshold format, which stays
// byte-compatible with multisigbackup.com so a client can recover there with no
// Bitcoin Butlers software in the path.
func encryptChainCopyJS(this js.Value, args []js.Value) any {
	if len(args) < 1 {
		return errorResult("missing config argument")
	}
	cfg := args[0]

	descriptor := ""
	if v := cfg.Get("descriptor"); !v.IsUndefined() && !v.IsNull() {
		descriptor = v.String()
	}
	if descriptor == "" {
		return errorResult("paste the wallet's descriptor first")
	}

	steps := ""
	if v := cfg.Get("recoverySteps"); !v.IsUndefined() && !v.IsNull() {
		steps = v.String()
	}

	var (
		text     string
		format   string
		excluded []string
	)

	if steps == "" {
		res, err := db.EncryptDescriptorThreshold(descriptor, nil)
		if err != nil {
			return errorResult(err.Error())
		}
		text, format = res.EncryptedText, "threshold"
	} else {
		_, t, ex, err := db.EncryptDescriptor(descriptor, []db.ContentItem{
			{Type: db.ContentTypeString, Content: []byte(steps)},
		}, db.EncodeOptions{})
		if err != nil {
			return errorResult(err.Error())
		}
		text, format, excluded = t, "bip138", ex
	}

	bytes := len(text)
	vbytes := bytes + TxOverheadVBytes

	skipped := make([]any, len(excluded))
	for i, x := range excluded {
		skipped[i] = x
	}

	return js.ValueOf(map[string]any{
		"text":     text,
		"bytes":    bytes,
		"vbytes":   vbytes,
		"satAt2":   vbytes * 2,
		"satAt10":  vbytes * 10,
		"format":   format,
		"excluded": skipped,
		"error":    nil,
	})
}
