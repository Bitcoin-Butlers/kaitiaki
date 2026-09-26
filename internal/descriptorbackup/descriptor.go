// Threshold format: encrypt a multisig descriptor so that any k of its n
// extended public keys can rebuild it.
//
// This is the Go port of internal/html/assets/src/crypto/descriptor.ts, which
// is itself a port of the scheme in joshdoman/multisig-backup (MIT), kept byte
// for byte compatible on purpose. A client who holds our ciphertext can paste
// it into multisigbackup.com and recover there, with no Bitcoin Butlers
// software in the path. That promise is the reason for every quirk this file
// reproduces, so do not "clean up" the layout below without a new test vector.
//
// Only the encrypt path lives here. The heir-side recover page stays in
// TypeScript so that a grieving heir never loads the maker's WASM to read a
// backup.
package descriptorbackup

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"math/bits"
	"regexp"
	"strconv"
	"strings"

	vault "github.com/hashicorp/vault/shamir"
	"golang.org/x/crypto/chacha20"
	"golang.org/x/crypto/chacha20poly1305"
	"golang.org/x/crypto/hkdf"
)

const (
	// xfpBytes is what a master fingerprint contributes.
	xfpBytes = 4
	// secretBytes is the entropy behind every backup.
	secretBytes = 16
)

var zeroNonce = make([]byte, 12)

// Multisig is one multisig group pulled out of a descriptor.
type Multisig struct {
	RequiredSigs    int
	Xfps            [][]byte
	Xpubs           [][]byte
	DerivationPaths []string
	NumXfps         int
	NumXpubs        int
}

// EncryptResult is the output of the threshold format.
type EncryptResult struct {
	// EncryptedText is the stripped descriptor followed by unpadded base64.
	EncryptedText string
	// MissingXfps is true when the descriptor omitted some fingerprints,
	// which hurts recovery.
	MissingXfps bool
	// IsTestnet is true when any key is a testnet key.
	IsTestnet bool
}

// --------------------------------------------------------------------------
// Byte helpers. These match multisig-backup exactly, including its edge cases.
// --------------------------------------------------------------------------

func joinBytes(arrays ...[]byte) []byte {
	total := 0
	for _, a := range arrays {
		total += len(a)
	}
	out := make([]byte, 0, total)
	for _, a := range arrays {
		out = append(out, a...)
	}
	return out
}

// NumberToBytes writes a number big-endian, shortest form, and EMPTY for zero.
//
// Share index 0 therefore contributes no bytes at all to its key material.
// That looks like a bug and is not one to fix here: the same function runs on
// multisigbackup.com, so changing it would make our ciphertext unreadable
// there.
func NumberToBytes(n int) []byte {
	if n <= 0 {
		return []byte{}
	}
	length := (bits.Len(uint(n)) + 7) / 8
	out := make([]byte, length)
	for i := 0; i < length; i++ {
		out[i] = byte(n >> (8 * (length - i - 1)))
	}
	return out
}

func base64Unpadded(b []byte) string {
	return base64.RawStdEncoding.EncodeToString(b)
}

// deriveKey is HKDF-SHA256 with an empty salt and empty info, 256 bits out.
func deriveKey(secret []byte) ([]byte, error) {
	out := make([]byte, 32)
	if _, err := hkdf.New(sha256.New, secret, nil, nil).Read(out); err != nil {
		return nil, err
	}
	return out, nil
}

// sortsBefore is true when a sorts before b the way multisig-backup sorts them.
//
// Upstream writes (a < b) on two Uint8Arrays. JavaScript turns each one into
// its comma-joined decimal string first, so [2,0,0,0] sorts AFTER [10,0,0,0]
// because "2," beats "10,". That is not byte order, and using byte order here
// would put the lookup tags in a different order than the tool a client falls
// back to. Pinned by the tag bytes in the golden vector.
func sortsBefore(a, b []byte) bool {
	return jsString(a) < jsString(b)
}

// jsString reproduces JavaScript's String(Uint8Array): decimal values joined
// by commas.
func jsString(b []byte) string {
	parts := make([]string, len(b))
	for i, v := range b {
		parts[i] = strconv.Itoa(int(v))
	}
	return strings.Join(parts, ",")
}

// --------------------------------------------------------------------------
// Parsing
// --------------------------------------------------------------------------

var (
	multiGroup     = regexp.MustCompile(`multi(?:_a)?\(([^)]*)\)`)
	multiHead      = regexp.MustCompile(`multi(?:_a)?\((\d+),([^)]+)`)
	xfpPattern     = regexp.MustCompile(`\[([a-f0-9]{8})/`)
	xpubPattern    = regexp.MustCompile(`([xyztuvUVYZ]pub[a-zA-Z0-9]{107})`)
	pathPattern    = regexp.MustCompile(`\[([0-9/'h]*)\]`)
	testnetPattern = regexp.MustCompile(`[tuvUV]pub[a-zA-Z0-9]{107}`)
	stripXpub      = regexp.MustCompile(`[xyztuvUVYZ]pub[a-zA-Z0-9]{107}/?`)
	stripXfp       = regexp.MustCompile(`\[[a-f0-9]{8}/`)
	bip32Step      = regexp.MustCompile(`^\d+['h]?$`)
)

func isValidBip32Path(path string) bool {
	if path == "" {
		return false
	}
	body := strings.TrimPrefix(path, "m/")
	for _, part := range strings.Split(body, "/") {
		if !bip32Step.MatchString(part) {
			return false
		}
	}
	return true
}

// ParseDescriptor pulls every multisig group out of a descriptor.
func ParseDescriptor(descriptor string) ([]Multisig, error) {
	if strings.Contains(descriptor, "tr(") {
		// Taproot key aggregation puts the keys somewhere this layout cannot
		// describe. Upstream refuses it too, so a refusal here keeps both
		// tools agreeing about which descriptors have a backup at all.
		return nil, errors.New("taproot descriptors are not supported yet")
	}
	groups := multiGroup.FindAllString(descriptor, -1)
	if groups == nil {
		return nil, errors.New(`not a multisig descriptor. It must contain "[sorted]multi[_a](...)"`)
	}

	var out []Multisig
	for _, group := range groups {
		parts := multiHead.FindStringSubmatch(group)
		if parts == nil {
			return nil, errors.New("invalid descriptor format")
		}
		required, err := strconv.Atoi(parts[1])
		if err != nil {
			return nil, errors.New("invalid descriptor format")
		}
		body := parts[2]

		var xfps [][]byte
		for _, m := range xfpPattern.FindAllStringSubmatch(body, -1) {
			raw, err := hex.DecodeString(m[1])
			if err != nil {
				return nil, err
			}
			xfps = append(xfps, raw)
		}
		var xpubs [][]byte
		for _, m := range xpubPattern.FindAllStringSubmatch(body, -1) {
			raw, err := base58CheckDecode(m[1])
			if err != nil {
				return nil, err
			}
			xpubs = append(xpubs, raw)
		}
		var paths []string
		for _, m := range pathPattern.FindAllStringSubmatch(body, -1) {
			if isValidBip32Path(m[1]) {
				paths = append(paths, m[1])
			}
		}

		out = append(out, Multisig{
			RequiredSigs:    required,
			Xfps:            xfps,
			Xpubs:           xpubs,
			DerivationPaths: paths,
			NumXpubs:        len(strings.Split(body, ",")),
			NumXfps:         strings.Count(body, "["),
		})
	}
	return out, nil
}

// --------------------------------------------------------------------------
// Encrypt
// --------------------------------------------------------------------------

// EncryptDescriptorThreshold encrypts a descriptor so that any k of its n
// extended public keys can rebuild it. Pass a secret only to reproduce a
// vector; otherwise leave it nil and fresh entropy is used.
func EncryptDescriptorThreshold(descriptor string, secret []byte) (*EncryptResult, error) {
	multisigs, err := ParseDescriptor(descriptor)
	if err != nil {
		return nil, err
	}
	// A descriptor with more than one multisig group cannot be promised.
	// multisigbackup.com, the tool a client falls back to, reads the second
	// and later groups from the wrong offset and cannot open such a backup at
	// all. Refusing here is the only honest answer: the alternative is a
	// permanent, public, unopenable backup, which is worse than no backup.
	if len(multisigs) > 1 {
		return nil, errors.New("this descriptor has more than one multisig group, and this format cannot back it up safely. Back up the wallet another way")
	}

	entropy := secret
	if entropy == nil {
		entropy = make([]byte, secretBytes)
		if _, err := rand.Read(entropy); err != nil {
			return nil, err
		}
	}
	if len(entropy) != secretBytes {
		return nil, fmt.Errorf("the secret must be %d bytes", secretBytes)
	}
	derivedKey, err := deriveKey(entropy)
	if err != nil {
		return nil, err
	}

	var shares, xfpPairHashes, allXfps, allXpubs [][]byte
	for _, ms := range multisigs {
		if len(ms.Xpubs) < ms.RequiredSigs {
			return nil, errors.New("the descriptor has fewer keys than it requires signatures")
		}
		// One tag per unordered pair, so a scanner can find the backup from
		// any two fingerprints. The tag reveals nothing without the keys.
		for i := 0; i < len(ms.Xfps); i++ {
			for j := i + 1; j < len(ms.Xfps); j++ {
				a, b := ms.Xfps[i], ms.Xfps[j]
				if !sortsBefore(a, b) {
					a, b = b, a
				}
				sum := sha256.Sum256(joinBytes(a, b))
				xfpPairHashes = append(xfpPairHashes, sum[:])
			}
		}

		if len(ms.Xpubs) > 1 && ms.RequiredSigs > 1 {
			parts, err := vault.Split(entropy, len(ms.Xpubs), ms.RequiredSigs)
			if err != nil {
				return nil, err
			}
			shares = append(shares, parts...)
		} else {
			// One key, or a 1-of-n: every holder gets the whole secret.
			for range ms.Xpubs {
				shares = append(shares, entropy)
			}
		}

		allXfps = append(allXfps, ms.Xfps...)
		allXpubs = append(allXpubs, ms.Xpubs...)
	}

	// Fingerprints first, then key bodies, in the order they appear.
	plainParts := append([][]byte{}, allXfps...)
	for _, xpub := range allXpubs {
		plainParts = append(plainParts, xpub[4:])
	}
	plaintext := joinBytes(plainParts...)

	stream, err := chacha20.NewUnauthenticatedCipher(derivedKey, zeroNonce)
	if err != nil {
		return nil, err
	}
	encryptedData := make([]byte, len(plaintext))
	stream.XORKeyStream(encryptedData, plaintext)

	var data [][]byte
	for i, xpub := range allXpubs {
		// Each share is locked to one key. The ciphertext and the index go
		// into the key material, so no two shares ever share a key. That is
		// what makes the all-zero nonce safe here.
		keySum := sha256.Sum256(joinBytes(xpub[4:], encryptedData, NumberToBytes(i)))
		aead, err := chacha20poly1305.New(keySum[:])
		if err != nil {
			return nil, err
		}
		data = append(data, aead.Seal(nil, zeroNonce, shares[i], nil))
	}
	data = append(data, encryptedData)
	for _, h := range xfpPairHashes {
		data = append(data, h[:xfpBytes])
	}

	stripped := stripXpub.ReplaceAllString(descriptor, "")
	stripped = stripXfp.ReplaceAllString(stripped, "[")
	stripped = strings.Split(stripped, "#")[0]

	return &EncryptResult{
		EncryptedText: stripped + base64Unpadded(joinBytes(data...)),
		MissingXfps:   len(allXfps) < len(allXpubs),
		IsTestnet:     testnetPattern.MatchString(descriptor),
	}, nil
}
