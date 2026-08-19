package bundle

import (
	"archive/zip"
	"io"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/eljojo/rememory/internal/core"
	"github.com/eljojo/rememory/internal/project"
	"gopkg.in/yaml.v3"
)

// TestBundleContainsMetadataFile generates a bundle and asserts that
// METADATA.yaml is present with all required keys.
func TestBundleContainsMetadataFile(t *testing.T) {
	dir := t.TempDir()
	bundlePath := filepath.Join(dir, "bundle-test.zip")

	created := time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)
	share := core.NewShare(2, 1, 3, 2, "Alice", []byte("test-share-data-bytes-here-12345"))

	err := GenerateBundle(BundleParams{
		OutputPath:       bundlePath,
		ProjectName:      "test-project",
		Friend:           project.Friend{Name: "Alice"},
		Share:            share,
		Threshold:        2,
		Total:            3,
		ManifestData:     []byte("fake manifest data"),
		ManifestChecksum: core.HashBytes([]byte("fake manifest data")),
		RecoverHTML:      "<html></html>",
		RecoverChecksum:  core.HashString("<html></html>"),
		Version:          "v0.0.0-test",
		SealedAt:         created,
		Language:         "en",
	})
	if err != nil {
		t.Fatalf("GenerateBundle: %v", err)
	}

	r, err := zip.OpenReader(bundlePath)
	if err != nil {
		t.Fatalf("opening bundle: %v", err)
	}
	defer r.Close()

	var raw []byte
	for _, f := range r.File {
		if f.Name == MetadataFilename {
			rc, err := f.Open()
			if err != nil {
				t.Fatalf("opening %s: %v", MetadataFilename, err)
			}
			raw, err = io.ReadAll(rc)
			rc.Close()
			if err != nil {
				t.Fatalf("reading %s: %v", MetadataFilename, err)
			}
		}
	}
	if raw == nil {
		t.Fatalf("%s not found in bundle", MetadataFilename)
	}

	var meta map[string]any
	if err := yaml.Unmarshal(raw, &meta); err != nil {
		t.Fatalf("unmarshaling %s: %v", MetadataFilename, err)
	}

	for _, key := range []string{
		"scheme_version", "created", "threshold", "total_shares",
		"share_index", "holder", "payload", "recovery",
	} {
		if _, ok := meta[key]; !ok {
			t.Errorf("missing required key %q", key)
		}
	}

	if meta["scheme_version"] != 2 {
		t.Errorf("scheme_version = %v, want 2", meta["scheme_version"])
	}
	if meta["threshold"] != 2 || meta["total_shares"] != 3 || meta["share_index"] != 1 {
		t.Errorf("quorum fields wrong: %v", meta)
	}
	if meta["holder"] != "Alice" {
		t.Errorf("holder = %v, want Alice", meta["holder"])
	}
	if meta["created"] != created.Format(time.RFC3339) {
		t.Errorf("created = %v, want %s", meta["created"], created.Format(time.RFC3339))
	}

	payload, ok := meta["payload"].([]any)
	if !ok || len(payload) == 0 {
		t.Fatalf("payload manifest missing or empty: %v", meta["payload"])
	}
	seen := map[string]bool{}
	for _, e := range payload {
		entry, ok := e.(map[string]any)
		if !ok {
			t.Fatalf("payload entry not a map: %v", e)
		}
		name, _ := entry["filename"].(string)
		sum, _ := entry["sha256"].(string)
		if name == "" || len(sum) != 64 {
			t.Errorf("bad payload entry: %v", entry)
		}
		seen[name] = true
	}
	for _, want := range []string{"README.txt", "README.pdf", "recover.html", "MANIFEST.age"} {
		if !seen[want] {
			t.Errorf("payload manifest missing %s", want)
		}
	}

	recovery, ok := meta["recovery"].(map[string]any)
	if !ok {
		t.Fatalf("recovery section not a map: %v", meta["recovery"])
	}
	doc, _ := recovery["doc"].(string)
	if !strings.Contains(doc, "docs/independent-recovery.md") {
		t.Errorf("recovery.doc does not point at docs/independent-recovery.md: %q", doc)
	}

	// The metadata file must not list itself.
	if seen[MetadataFilename] {
		t.Errorf("payload manifest must not list %s", MetadataFilename)
	}

	_ = os.Remove(bundlePath)
}

// TestMetadataHideQuorumOmitsFields: in hide-quorum mode (Threshold and
// Total zero) METADATA.yaml must not contain the quorum keys at all.
func TestMetadataHideQuorumOmitsFields(t *testing.T) {
	created := time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)
	share := core.NewShare(2, 1, 0, 0, "Alice", []byte("test-share-data-bytes-here-12345"))

	raw, err := GenerateMetadata(BundleParams{
		Friend:    project.Friend{Name: "Alice"},
		Share:     share,
		Threshold: 0,
		Total:     0,
		SealedAt:  created,
	}, []ZipFile{{Name: "README.txt", Content: []byte("x")}})
	if err != nil {
		t.Fatalf("GenerateMetadata: %v", err)
	}

	text := string(raw)
	if strings.Contains(text, "threshold:") || strings.Contains(text, "total_shares:") {
		t.Fatalf("hide-quorum metadata discloses quorum:\n%s", text)
	}

	var meta map[string]any
	if err := yaml.Unmarshal(raw, &meta); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if meta["share_index"] != 1 || meta["holder"] != "Alice" {
		t.Fatalf("unexpected metadata: %v", meta)
	}
}

// TestCreateZipAtomic: a successful CreateZip leaves exactly the target
// file (no temp leftovers), and the result is a readable ZIP.
func TestCreateZipAtomic(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "out.zip")
	if err := CreateZip(path, []ZipFile{{Name: "a.txt", Content: []byte("hello"), ModTime: time.Now()}}); err != nil {
		t.Fatalf("CreateZip: %v", err)
	}
	entries, err := os.ReadDir(dir)
	if err != nil {
		t.Fatal(err)
	}
	if len(entries) != 1 || entries[0].Name() != "out.zip" {
		t.Fatalf("unexpected directory contents: %v", entries)
	}
	r, err := zip.OpenReader(path)
	if err != nil {
		t.Fatalf("result is not a valid zip: %v", err)
	}
	r.Close()
}
