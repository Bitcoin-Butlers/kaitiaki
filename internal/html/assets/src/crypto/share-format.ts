// Code generated from internal/core/share.go. DO NOT EDIT.
//
// Regenerate with:
//   go test ./internal/core/ -run ShareFormat -generate
//
// The share markers and the compact prefix are one format with two readers,
// Go and this file. They are generated so the two cannot drift.
//
// The legacy values are read forever: a guardian's README is not reissued
// because the project was renamed.

export const PEM_BEGIN = "-----BEGIN INHERITANCE SHARE-----";
export const PEM_END = "-----END INHERITANCE SHARE-----";
export const LEGACY_PEM_BEGIN = "-----BEGIN REMEMORY SHARE-----";
export const LEGACY_PEM_END = "-----END REMEMORY SHARE-----";

export const COMPACT_PREFIX = "IH";
export const LEGACY_COMPACT_PREFIX = "RM";

/** Matches either spelling of the PEM block, capturing its contents. */
export const SHARE_BLOCK_REGEX =
  /-----BEGIN (?:INHERITANCE|REMEMORY) SHARE-----([\s\S]*?)-----END (?:INHERITANCE|REMEMORY) SHARE-----/;

/** Matches either compact prefix. */
export const COMPACT_REGEX =
  /^(?:IH|RM)(\d+):(\d+):(\d+):(\d+):([A-Za-z0-9_-]+):([0-9a-f]{4})$/;

/** Matches a whole compact share line, for sniffing pasted text. */
export const COMPACT_LINE_REGEX =
  /^(?:IH|RM)\d+:\d+:\d+:\d+:[A-Za-z0-9_-]+:[0-9a-f]{4}$/;
