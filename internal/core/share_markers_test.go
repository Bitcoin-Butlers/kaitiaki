package core

import (
	"bytes"
	"strings"
	"testing"
)

// A guardian's README is not reissued because we renamed something. A share
// written with the pre-2026-09-24 markers must parse forever.
func TestALegacyShareStillParses(t *testing.T) {
	cur := NewShare(2, 1, 3, 2, "Alice", []byte{1, 2, 3, 4, 5, 6, 7, 8})
	legacy := strings.ReplaceAll(cur.Encode(), ShareBegin, "-----BEGIN REMEMORY SHARE-----")
	legacy = strings.ReplaceAll(legacy, ShareEnd, "-----END REMEMORY SHARE-----")

	if strings.Contains(legacy, "INHERITANCE SHARE") {
		t.Fatal("the fixture was not converted, so this test proves nothing")
	}

	got, err := ParseShare([]byte(legacy))
	if err != nil {
		t.Fatalf("a share with the old markers must still parse: %v", err)
	}
	if got.Holder != "Alice" || !bytes.Equal(got.Data, cur.Data) {
		t.Errorf("legacy parse lost content: holder %q, data %x", got.Holder, got.Data)
	}

	// And re-encoding it brings it up to the current markers.
	if !strings.Contains(got.Encode(), ShareBegin) {
		t.Error("re-encoding a legacy share must write the current markers")
	}
}

// What a guardian actually reads must not name the project we forked from.
func TestTheCurrentMarkerNamesThisProject(t *testing.T) {
	enc := NewShare(2, 1, 3, 2, "Alice", []byte{1, 2, 3, 4}).Encode()
	if strings.Contains(strings.ToUpper(enc), "REMEMORY") {
		t.Error("a freshly written share must not carry the upstream name")
	}
	if !strings.Contains(enc, "-----BEGIN INHERITANCE SHARE-----") {
		t.Error("a freshly written share must carry the current marker")
	}
}

// The compact form is printed under the QR code on every guardian's PDF, so
// it is read by a person and must not name the upstream project either.
func TestTheCompactPrefixNamesThisProject(t *testing.T) {
	s := NewShare(2, 1, 3, 2, "Alice", []byte{1, 2, 3, 4})
	compact := s.CompactEncode()
	if !strings.HasPrefix(compact, "IH") {
		t.Errorf("a freshly written compact share must start with IH, got %q", compact)
	}

	legacy := "RM" + strings.TrimPrefix(compact, "IH")
	got, err := ParseCompact(legacy)
	if err != nil {
		t.Fatalf("a compact share with the old prefix must still parse: %v", err)
	}
	if !bytes.Equal(got.Data, s.Data) {
		t.Error("legacy compact parse lost the share data")
	}
}
