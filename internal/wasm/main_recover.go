//go:build js && wasm && !create

package main

import (
	"syscall/js"
)

func main() {
	// Register recovery functions on the global object
	js.Global().Set("inheritanceParseShare", js.FuncOf(parseShareJS))
	js.Global().Set("inheritanceCombineShares", js.FuncOf(combineSharesJS))
	js.Global().Set("inheritanceDecryptManifest", js.FuncOf(decryptManifestJS))
	js.Global().Set("inheritanceExtractArchive", js.FuncOf(extractArchiveJS))
	js.Global().Set("inheritanceExtractBundle", js.FuncOf(extractBundleJS))
	js.Global().Set("inheritanceParseCompactShare", js.FuncOf(parseCompactShareJS))
	js.Global().Set("inheritanceDecodeWords", js.FuncOf(decodeWordsJS))

	// Signal that WASM is ready
	js.Global().Set("inheritanceReady", true)

	// Keep the Go program running
	select {}
}
