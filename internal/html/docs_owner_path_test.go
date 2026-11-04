package html

import (
	"strings"
	"testing"
)

// The guide's owner path takes MANIFEST.age out of recover.html with grep.
// The grep finds it only while recover.html writes the field as below.
const ownerPathManifestField = `"manifestB64":"`

func TestGuideOwnerPathTakesTheManifestOutOfRecoverHTML(t *testing.T) {
	guide, err := docsContentFS.ReadFile("docs-content/en.md")
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(guide), `grep -o '`+ownerPathManifestField+`[^"]*' recover.html`) {
		t.Error("the owner path does not take MANIFEST.age out of recover.html")
	}

	page := GenerateRecoverHTML(&PersonalizationData{
		Holder:      "Alice",
		HolderShare: "test-share",
		Threshold:   2,
		Total:       3,
		ManifestB64: "YWdl",
	})
	if !strings.Contains(page, ownerPathManifestField+`YWdl"`) {
		t.Errorf("recover.html no longer writes %sYWdl\", so the guide's grep finds nothing", ownerPathManifestField)
	}
}
