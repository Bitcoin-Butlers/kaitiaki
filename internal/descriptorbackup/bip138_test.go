package descriptorbackup

import (
	"encoding/hex"
	"encoding/json"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"testing"

	"golang.org/x/crypto/chacha20poly1305"
)

const vectorDir = "../html/assets/src/crypto/testdata/bip138"

func loadVectors(t *testing.T, name string, out any) {
	t.Helper()
	b, err := os.ReadFile(filepath.Join(vectorDir, name))
	if err != nil {
		t.Fatalf("reading %s: %v", name, err)
	}
	if err := json.Unmarshal(b, out); err != nil {
		t.Fatalf("parsing %s: %v", name, err)
	}
}

func mustHex(t *testing.T, s string) []byte {
	t.Helper()
	b, err := hex.DecodeString(s)
	if err != nil {
		t.Fatalf("bad hex %q: %v", s, err)
	}
	return b
}

func TestVectorEncryptionSecret(t *testing.T) {
	var vs []struct {
		Description       string   `json:"description"`
		Keys              []string `json:"keys"`
		DecryptionSecret  string   `json:"decryption_secret"`
		IndividualSecrets []string `json:"individual_secrets"`
	}
	loadVectors(t, "encryption_secret.json", &vs)
	if len(vs) == 0 {
		t.Fatal("no vectors")
	}
	for _, v := range vs {
		t.Run(v.Description, func(t *testing.T) {
			keys := make([][]byte, 0, len(v.Keys))
			for _, k := range v.Keys {
				keys = append(keys, mustHex(t, k))
			}
			secret, individual, err := DeriveSecrets(keys)
			if err != nil {
				t.Fatalf("DeriveSecrets: %v", err)
			}
			if got := hex.EncodeToString(secret); got != v.DecryptionSecret {
				t.Errorf("decryption secret\n got %s\nwant %s", got, v.DecryptionSecret)
			}
			if len(individual) != len(v.IndividualSecrets) {
				t.Fatalf("individual secret count: got %d want %d", len(individual), len(v.IndividualSecrets))
			}
			for i, want := range v.IndividualSecrets {
				if got := hex.EncodeToString(individual[i]); got != want {
					t.Errorf("individual secret %d\n got %s\nwant %s", i, got, want)
				}
			}
		})
	}
}

func TestVectorDerivationPath(t *testing.T) {
	var vs []struct {
		Description string   `json:"description"`
		Paths       []string `json:"paths"`
		Expected    *string  `json:"expected"`
	}
	loadVectors(t, "derivation_path.json", &vs)
	for _, v := range vs {
		t.Run(v.Description, func(t *testing.T) {
			paths := make([][]uint32, 0, len(v.Paths))
			for _, p := range v.Paths {
				children, err := ParseDerivationPath(p)
				if err != nil {
					// The draft marks a case that must be refused with a null
					// expectation, and some of those are refused at parse time.
					if v.Expected == nil {
						return
					}
					t.Fatalf("ParseDerivationPath(%q): %v", p, err)
				}
				paths = append(paths, children)
			}
			got, err := EncodeDerivationPaths(paths)
			if v.Expected == nil {
				if err == nil {
					t.Fatalf("expected a refusal, got %s", hex.EncodeToString(got))
				}
				return
			}
			if err != nil {
				t.Fatalf("EncodeDerivationPaths: %v", err)
			}
			if hex.EncodeToString(got) != *v.Expected {
				t.Errorf("\n got %s\nwant %s", hex.EncodeToString(got), *v.Expected)
			}
		})
	}
}

func TestVectorIndividualSecrets(t *testing.T) {
	var vs []struct {
		Description string   `json:"description"`
		Secrets     []string `json:"secrets"`
		Expected    *string  `json:"expected"`
	}
	loadVectors(t, "individual_secrets.json", &vs)
	for _, v := range vs {
		t.Run(v.Description, func(t *testing.T) {
			secrets := make([][]byte, 0, len(v.Secrets))
			for _, s := range v.Secrets {
				secrets = append(secrets, mustHex(t, s))
			}
			got, err := EncodeIndividualSecrets(secrets)
			if v.Expected == nil {
				if err == nil {
					t.Fatalf("expected a refusal, got %s", hex.EncodeToString(got))
				}
				return
			}
			if err != nil {
				t.Fatalf("EncodeIndividualSecrets: %v", err)
			}
			if hex.EncodeToString(got) != *v.Expected {
				t.Errorf("\n got %s\nwant %s", hex.EncodeToString(got), *v.Expected)
			}
		})
	}
}

func TestVectorContentType(t *testing.T) {
	var vs []struct {
		Description string `json:"description"`
		Valid       bool   `json:"valid"`
		Content     string `json:"content"`
	}
	loadVectors(t, "content_type.json", &vs)
	checked := 0
	for _, v := range vs {
		if !v.Valid || len(v.Content) != 6 || v.Content[:2] != "01" {
			continue
		}
		t.Run(v.Description, func(t *testing.T) {
			raw := mustHex(t, v.Content)
			bip := int(raw[1])<<8 | int(raw[2])
			got, err := EncodeBipContentType(bip)
			if err != nil {
				t.Fatalf("EncodeBipContentType: %v", err)
			}
			if hex.EncodeToString(got) != v.Content {
				t.Errorf("\n got %s\nwant %s", hex.EncodeToString(got), v.Content)
			}
		})
		checked++
	}
	if checked == 0 {
		t.Fatal("no BIP-number content-type vectors were exercised")
	}
}

func TestVectorEncryptedBackup(t *testing.T) {
	type extraItem struct {
		Content   string `json:"content"`
		Plaintext string `json:"plaintext"`
	}
	var vs []struct {
		Description            string      `json:"description"`
		Valid                  *bool       `json:"valid"`
		Content                string      `json:"content"`
		Keys                   []string    `json:"keys"`
		DecoyIndividualSecrets []string    `json:"decoy_individual_secrets"`
		DerivationPaths        []string    `json:"derivation_paths"`
		Plaintext              string      `json:"plaintext"`
		Extra                  []extraItem `json:"extra"`
		Nonce                  string      `json:"nonce"`
		Expected               string      `json:"expected"`
	}
	loadVectors(t, "encrypted_backup.json", &vs)

	checked := 0
	for _, v := range vs {
		if v.Valid != nil && !*v.Valid {
			continue
		}
		// The encoder writes BIP-number content items. A vector with a
		// vendor-specific type is covered by the decode test instead.
		if len(v.Content) < 2 || v.Content[:2] != "01" {
			continue
		}
		t.Run(v.Description, func(t *testing.T) {
			keys := make([][]byte, 0, len(v.Keys))
			for _, k := range v.Keys {
				keys = append(keys, mustHex(t, k))
			}
			decoys := make([][]byte, 0, len(v.DecoyIndividualSecrets))
			for _, d := range v.DecoyIndividualSecrets {
				decoys = append(decoys, mustHex(t, d))
			}
			paths := make([][]uint32, 0, len(v.DerivationPaths))
			for _, p := range v.DerivationPaths {
				children, err := ParseDerivationPath(p)
				if err != nil {
					t.Fatalf("ParseDerivationPath(%q): %v", p, err)
				}
				paths = append(paths, children)
			}

			// plaintext is UTF-8 text in these vectors, never hex.
			items := []ContentItem{{Type: ContentTypeBIP, BIP: bipFromContent(t, v.Content), Content: []byte(v.Plaintext)}}
			for _, e := range v.Extra {
				items = append(items, ContentItem{Type: ContentTypeBIP, BIP: bipFromContent(t, e.Content), Content: []byte(e.Plaintext)})
			}

			got, err := EncodeBackup(EncodeOptions{
				Pubkeys:         keys,
				Items:           items,
				DecoySecrets:    decoys,
				DerivationPaths: paths,
				Nonce:           mustHex(t, v.Nonce),
			})
			if err != nil {
				t.Fatalf("EncodeBackup: %v", err)
			}
			if hex.EncodeToString(got) != v.Expected {
				t.Errorf("\n got  %s\nwant  %s", hex.EncodeToString(got), v.Expected)
			}
		})
		checked++
	}
	if checked == 0 {
		t.Fatal("no whole-backup vectors were exercised")
	}
}

// bipFromContent reads the BIP number out of a content-type header hex string
// such as "01017c", the way the draft's vectors express it.
func bipFromContent(t *testing.T, content string) int {
	t.Helper()
	n, err := strconv.ParseInt(content[2:], 16, 32)
	if err != nil {
		t.Fatalf("bad content type %q: %v", content, err)
	}
	return int(n)
}

func TestVectorCipher(t *testing.T) {
	var vs []struct {
		Description string  `json:"description"`
		Nonce       string  `json:"nonce"`
		Plaintext   string  `json:"plaintext"`
		Secret      string  `json:"secret"`
		Ciphertext  *string `json:"ciphertext"`
	}
	loadVectors(t, "chacha20poly1305_encryption.json", &vs)
	checked := 0
	for _, v := range vs {
		if v.Ciphertext == nil {
			continue
		}
		t.Run(v.Description, func(t *testing.T) {
			aead, err := chacha20poly1305.New(mustHex(t, v.Secret))
			if err != nil {
				t.Fatalf("chacha20poly1305.New: %v", err)
			}
			sealed := aead.Seal(nil, mustHex(t, v.Nonce), mustHex(t, v.Plaintext), nil)
			if hex.EncodeToString(sealed) != *v.Ciphertext {
				t.Errorf("\n got %s\nwant %s", hex.EncodeToString(sealed), *v.Ciphertext)
			}
		})
		checked++
	}
	if checked == 0 {
		t.Fatal("no cipher vectors were exercised")
	}
}

// buildBackupWithPayload assembles a container by hand around a payload that
// is already sealed, so a test can put unreadable contents inside a backup the
// key genuinely opens.
func buildBackupWithPayload(t *testing.T, pubkey []byte, payload []byte) []byte {
	t.Helper()
	secret, individual, err := DeriveSecrets([][]byte{pubkey})
	if err != nil {
		t.Fatalf("DeriveSecrets: %v", err)
	}
	nonce := []byte{1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12}
	aead, err := chacha20poly1305.New(secret)
	if err != nil {
		t.Fatalf("chacha20poly1305.New: %v", err)
	}
	ciphertext := aead.Seal(nil, nonce, payload, nil)

	secretBlock, err := EncodeIndividualSecrets(individual)
	if err != nil {
		t.Fatalf("EncodeIndividualSecrets: %v", err)
	}
	out := append([]byte{}, Magic...)
	out = append(out, Version)
	out = append(out, 0x00) // no derivation paths
	out = append(out, secretBlock...)
	out = append(out, EncryptionChaCha20Poly1305)
	out = append(out, nonce...)
	out = append(out, EncodeCompactSize(len(ciphertext))...)
	return append(out, ciphertext...)
}

func TestUnreadableContentsDoNotBlameTheKey(t *testing.T) {
	pubkey := mustHex(t, "02e6642fd69bd211f93f7f1f36ca51a26a5290eb2dd1b0d8279a87bb0d480c8443")
	// Content type 0x80 and above is one this version must refuse.
	backup := buildBackupWithPayload(t, pubkey, []byte{0x80, 0x00, 0x00})

	_, err := DecryptBackup(backup, pubkey)
	if err == nil {
		t.Fatal("expected a refusal for contents this version cannot read")
	}
	msg := err.Error()
	if strings.Contains(msg, "none of the keys") {
		t.Errorf("the key was correct, so the error must not blame it:\n  %s", msg)
	}
	if !strings.Contains(msg, "opened this backup") {
		t.Errorf("the error should say the key worked:\n  %s", msg)
	}
}

func TestWrongKeyStillBlamesTheKey(t *testing.T) {
	pubkey := mustHex(t, "02e6642fd69bd211f93f7f1f36ca51a26a5290eb2dd1b0d8279a87bb0d480c8443")
	other := mustHex(t, "0339710356a496726c84692621b2b6e3645dd35bc0026c587f16411897990a1e1f")
	backup := buildBackupWithPayload(t, pubkey, []byte{0x01, 0x01, 0x7c, 0x01, 0x78})

	_, err := DecryptBackup(backup, other)
	if err == nil {
		t.Fatal("a backup must not open with a key that is not in it")
	}
	if !strings.Contains(err.Error(), "none of the keys") {
		t.Errorf("a genuinely wrong key should say so:\n  %s", err.Error())
	}
}
