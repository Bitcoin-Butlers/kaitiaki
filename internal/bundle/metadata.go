package bundle

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"time"

	"gopkg.in/yaml.v3"
)

// MetadataFilename is the name of the machine-readable metadata file
// included in every bundle ZIP.
const MetadataFilename = "METADATA.yaml"

// MetadataFile is the machine-readable description of a bundle. It
// gives future tools (and humans) a versioned, parseable record of
// what the bundle contains and how to recover without this project's
// code.
type MetadataFile struct {
	SchemeVersion int    `yaml:"scheme_version"`
	Created       string `yaml:"created"` // RFC3339
	// Threshold and TotalShares are omitted in hide-quorum mode.
	Threshold   int                `yaml:"threshold,omitempty"`
	TotalShares int                `yaml:"total_shares,omitempty"`
	ShareIndex  int                `yaml:"share_index"`
	Holder      string             `yaml:"holder"`
	Payload     []PayloadFileEntry `yaml:"payload"`
	Recovery    RecoveryInfo       `yaml:"recovery"`
}

// PayloadFileEntry describes one file in the bundle ZIP.
type PayloadFileEntry struct {
	Filename string `yaml:"filename"`
	SHA256   string `yaml:"sha256"`
}

// RecoveryInfo points at the independent-recovery instructions.
type RecoveryInfo struct {
	Doc   string `yaml:"doc"`
	Notes string `yaml:"notes"`
}

// GenerateMetadata builds the METADATA.yaml content for a bundle.
// files must be the other files that go into the ZIP (the metadata
// file does not list itself).
func GenerateMetadata(params BundleParams, files []ZipFile) ([]byte, error) {
	payload := make([]PayloadFileEntry, 0, len(files))
	for _, f := range files {
		sum := sha256.Sum256(f.Content)
		payload = append(payload, PayloadFileEntry{
			Filename: f.Name,
			SHA256:   hex.EncodeToString(sum[:]),
		})
	}

	meta := MetadataFile{
		SchemeVersion: params.Share.Version,
		Created:       params.SealedAt.UTC().Format(time.RFC3339),
		Threshold:     params.Threshold,
		TotalShares:   params.Total,
		ShareIndex:    params.Share.Index,
		Holder:        params.Friend.Name,
		Payload:       payload,
		Recovery: RecoveryInfo{
			Doc: "docs/independent-recovery.md (in the source repository)",
			Notes: "Combine any threshold shares with contrib/combine.py " +
				"(GF(2^8) Lagrange, vault-shamir format), then decrypt " +
				"MANIFEST.age with stock `age -d` using the combined " +
				"passphrase. No project code is required.",
		},
	}

	out, err := yaml.Marshal(&meta)
	if err != nil {
		return nil, fmt.Errorf("marshaling bundle metadata: %w", err)
	}
	return out, nil
}
