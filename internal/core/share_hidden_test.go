package core

import (
	"strings"
	"testing"
	"time"
)

// TestShareEncodeHiddenQuorum checks that a hide-quorum share omits
// Total and Threshold and still round-trips through ParseShare.
func TestShareEncodeHiddenQuorum(t *testing.T) {
	data := []byte("some-share-data-bytes-for-testing")
	s := NewShare(2, 3, 0, 0, "Alice", data)
	s.Created = time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)

	enc := s.Encode()
	if strings.Contains(enc, "Total:") || strings.Contains(enc, "Threshold:") {
		t.Fatalf("hidden-quorum share discloses quorum:\n%s", enc)
	}

	parsed, err := ParseShare([]byte(enc))
	if err != nil {
		t.Fatalf("ParseShare: %v", err)
	}
	if parsed.Total != 0 || parsed.Threshold != 0 {
		t.Errorf("quorum not zero after parse: total=%d threshold=%d", parsed.Total, parsed.Threshold)
	}
	if parsed.Index != 3 || parsed.Holder != "Alice" {
		t.Errorf("round-trip lost fields: %+v", parsed)
	}

	// Compact encoding round-trip with zero quorum.
	compact := s.CompactEncode()
	if !strings.Contains(compact, ":0:0:") {
		t.Fatalf("compact encoding should carry zeros for hidden quorum: %s", compact)
	}
	cp, err := ParseCompact(compact)
	if err != nil {
		t.Fatalf("ParseCompact: %v", err)
	}
	if cp.Total != 0 || cp.Threshold != 0 || cp.Index != 3 {
		t.Errorf("compact round-trip wrong: %+v", cp)
	}

	// Disclosed shares must still encode the quorum.
	d := NewShare(2, 1, 5, 3, "Bob", data)
	if !strings.Contains(d.Encode(), "Total: 5") || !strings.Contains(d.Encode(), "Threshold: 3") {
		t.Errorf("disclosed share must keep quorum headers")
	}
}
