package core

import "fmt"

// ShareFormatTS is the TypeScript source of the share-format constants,
// generated from the Go constants above so the browser and the command line
// cannot disagree about the format.
//
// Before 2026-09-24 these values were typed out three times: here, in
// crypto/share.ts, and again as a regex in app.ts. Renaming them moved two
// copies and left the third, and the browser silently stopped reading a
// pasted README. Nothing failed until a paste came back empty.
//
// Regenerate with: go test ./internal/core/ -run ShareFormat -generate
func ShareFormatTS() string {
	return fmt.Sprintf(`// Code generated from internal/core/share.go. DO NOT EDIT.
//
// Regenerate with:
//   go test ./internal/core/ -run ShareFormat -generate
//
// The share markers and the compact prefix are one format with two readers,
// Go and this file. They are generated so the two cannot drift.
//
// The legacy values are read forever: a guardian's README is not reissued
// because the project was renamed.

export const PEM_BEGIN = %q;
export const PEM_END = %q;
export const LEGACY_PEM_BEGIN = %q;
export const LEGACY_PEM_END = %q;

export const COMPACT_PREFIX = %q;
export const LEGACY_COMPACT_PREFIX = %q;

/** Matches either spelling of the PEM block, capturing its contents. */
export const SHARE_BLOCK_REGEX =
  /-----BEGIN (?:%s|%s) SHARE-----([\s\S]*?)-----END (?:%s|%s) SHARE-----/;

/** Matches either compact prefix. */
export const COMPACT_REGEX =
  /^(?:%s|%s)(\d+):(\d+):(\d+):(\d+):([A-Za-z0-9_-]+):([0-9a-f]{4})$/;

/** Matches a whole compact share line, for sniffing pasted text. */
export const COMPACT_LINE_REGEX =
  /^(?:%s|%s)\d+:\d+:\d+:\d+:[A-Za-z0-9_-]+:[0-9a-f]{4}$/;
`,
		ShareBegin, ShareEnd, legacyShareBegin, legacyShareEnd,
		CompactPrefix, legacyCompactPrefix,
		shareWord, legacyShareWord, shareWord, legacyShareWord,
		CompactPrefix, legacyCompactPrefix,
		CompactPrefix, legacyCompactPrefix,
	)
}

// The bare words inside the PEM markers, used to build the browser's regex.
const (
	shareWord       = "INHERITANCE"
	legacyShareWord = "REMEMORY"
)
