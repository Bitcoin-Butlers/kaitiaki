// Package descriptorbackup encrypts a multisig descriptor so that the
// wallet's own keys unlock it, in the two formats Bitcoin Inheritance writes
// to the chain.
//
// This file is the Go port of internal/html/assets/src/crypto/bip138.ts. Any
// key opens a BIP-138 backup, where the threshold format in descriptor.go
// needs k of them. Say that out loud in the placement session, because it
// changes who can read the backup.
//
// Primitives come from the standard library and golang.org/x/crypto. This
// file writes plumbing only.
package descriptorbackup

import (
	"bytes"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/binary"
	"encoding/hex"
	"errors"
	"fmt"
	"regexp"
	"sort"

	"golang.org/x/crypto/chacha20poly1305"
)

// Magic is the ASCII text "BIP138" that opens every backup.
var Magic = []byte{0x42, 0x49, 0x50, 0x31, 0x33, 0x38}

const (
	// Version is the only format version the BIP defines.
	Version = 0x01
	// EncryptionChaCha20Poly1305 is the only cipher the BIP defines.
	EncryptionChaCha20Poly1305 = 0x01
	// BIP380 is the BIP number for output descriptors.
	BIP380 = 380
	// ContentTypeBIP marks a content item named by BIP number.
	ContentTypeBIP = 0x01
	// ContentTypeString marks a UTF-8 string content item.
	ContentTypeString = 0x03
)

// numsXOnly is the BIP-341 NUMS point. Its private key is unknown by
// construction, so it is public knowledge and must never seed a backup key.
const numsXOnly = "50929b74c1a04954b78b4b6035e97a5e078a5a0f28ec96d547bfee9ace803ac0"

// SecretEntryBuckets are the entry counts BIP-138 asks an encoder to pad to,
// so that counting the entries does not count the cosigners.
var SecretEntryBuckets = []int{5, 10, 20}

// Backup is a decoded BIP-138 file.
type Backup struct {
	Version           int
	DerivationPaths   [][]uint32
	IndividualSecrets [][]byte
	Encryption        int
	Nonce             []byte
	Ciphertext        []byte
}

// ContentItem is one entry inside the encrypted payload. Exactly one of BIP or
// String carries meaning, chosen by Type.
type ContentItem struct {
	Type    int
	BIP     int
	Content []byte
}

// --------------------------------------------------------------------------
// Bytes
// --------------------------------------------------------------------------

func xorBytes(a, b []byte) []byte {
	out := make([]byte, len(a))
	for i := range a {
		out[i] = a[i] ^ b[i]
	}
	return out
}

// TaggedHash is the BIP-340 tagged hash: sha256(sha256(tag) | sha256(tag) | message).
func TaggedHash(tag string, message []byte) []byte {
	t := sha256.Sum256([]byte(tag))
	h := sha256.New()
	h.Write(t[:])
	h.Write(t[:])
	h.Write(message)
	return h.Sum(nil)
}

// EncodeCompactSize writes Bitcoin's compact-size integer.
func EncodeCompactSize(n int) []byte {
	switch {
	case n < 0:
		panic("a length cannot be negative")
	case n < 0xfd:
		return []byte{byte(n)}
	case n <= 0xffff:
		out := make([]byte, 3)
		out[0] = 0xfd
		binary.LittleEndian.PutUint16(out[1:], uint16(n))
		return out
	case n <= 0xffffffff:
		out := make([]byte, 5)
		out[0] = 0xfe
		binary.LittleEndian.PutUint32(out[1:], uint32(n))
		return out
	default:
		out := make([]byte, 9)
		out[0] = 0xff
		binary.LittleEndian.PutUint64(out[1:], uint64(n))
		return out
	}
}

func readCompactSize(b []byte, at int) (value int, next int, err error) {
	if at >= len(b) {
		return 0, 0, errors.New("the backup ends in the middle of a length")
	}
	first := b[at]
	switch {
	case first < 0xfd:
		return int(first), at + 1, nil
	case first == 0xfd:
		if at+3 > len(b) {
			return 0, 0, errors.New("the backup ends in the middle of a length")
		}
		return int(binary.LittleEndian.Uint16(b[at+1:])), at + 3, nil
	case first == 0xfe:
		if at+5 > len(b) {
			return 0, 0, errors.New("the backup ends in the middle of a length")
		}
		return int(binary.LittleEndian.Uint32(b[at+1:])), at + 5, nil
	default:
		if at+9 > len(b) {
			return 0, 0, errors.New("the backup ends in the middle of a length")
		}
		return int(binary.LittleEndian.Uint64(b[at+1:])), at + 9, nil
	}
}

// sortUniqueBytes sorts byte slices by their own bytes and drops duplicates.
func sortUniqueBytes(in [][]byte) [][]byte {
	sorted := make([][]byte, len(in))
	copy(sorted, in)
	sort.SliceStable(sorted, func(i, j int) bool { return bytes.Compare(sorted[i], sorted[j]) < 0 })
	out := make([][]byte, 0, len(sorted))
	for _, v := range sorted {
		if len(out) == 0 || !bytes.Equal(out[len(out)-1], v) {
			out = append(out, v)
		}
	}
	return out
}

// --------------------------------------------------------------------------
// Secrets
// --------------------------------------------------------------------------

// ToXOnly drops the parity byte from a 33-byte compressed key.
func ToXOnly(pubkey []byte) ([]byte, error) {
	switch len(pubkey) {
	case 32:
		return pubkey, nil
	case 33:
		return pubkey[1:], nil
	default:
		return nil, fmt.Errorf("a public key must be 32 or 33 bytes, got %d", len(pubkey))
	}
}

// NormalizeKeys takes the keys to x-only, sorts them, drops duplicates and
// removes the NUMS point, as the BIP requires. Two keys that differ only in
// parity share an x coordinate and collapse to one entry.
func NormalizeKeys(pubkeys [][]byte) ([][]byte, error) {
	xOnly := make([][]byte, 0, len(pubkeys))
	for _, p := range pubkeys {
		x, err := ToXOnly(p)
		if err != nil {
			return nil, err
		}
		if hex.EncodeToString(x) == numsXOnly {
			continue
		}
		xOnly = append(xOnly, x)
	}
	return sortUniqueBytes(xOnly), nil
}

// DeriveSecrets returns the shared decryption secret and one individual secret
// per key, in sorted key order.
func DeriveSecrets(pubkeys [][]byte) (secret []byte, individual [][]byte, err error) {
	keys, err := NormalizeKeys(pubkeys)
	if err != nil {
		return nil, nil, err
	}
	if len(keys) == 0 {
		return nil, nil, errors.New("a backup needs at least one usable public key")
	}
	var joined []byte
	for _, k := range keys {
		joined = append(joined, k...)
	}
	secret = TaggedHash("BIP138_DECRYPTION_SECRET", joined)
	individual = make([][]byte, 0, len(keys))
	for _, k := range keys {
		individual = append(individual, xorBytes(secret, TaggedHash("BIP138_INDIVIDUAL_SECRET", k)))
	}
	return secret, individual, nil
}

// --------------------------------------------------------------------------
// Field encoding
// --------------------------------------------------------------------------

const hardened = 0x80000000

var derivationStep = regexp.MustCompile(`^(\d+)(['h])?$`)

// ParseDerivationPath reads "m/48'/0'/0'/2'" or "m/48h/0h/0h/2h".
func ParseDerivationPath(path string) ([]uint32, error) {
	body := path
	if len(body) > 0 && body[0] == 'm' {
		body = body[1:]
	}
	if len(body) > 0 && body[0] == '/' {
		body = body[1:]
	}
	if body == "" {
		return nil, nil
	}
	parts := splitOn(body, '/')
	out := make([]uint32, 0, len(parts))
	for _, part := range parts {
		m := derivationStep.FindStringSubmatch(part)
		if m == nil {
			return nil, fmt.Errorf("%q is not a valid derivation step", part)
		}
		var index uint64
		for _, c := range m[1] {
			index = index*10 + uint64(c-'0')
			if index > 0x7fffffff {
				return nil, fmt.Errorf("%q is not a valid derivation step", part)
			}
		}
		v := uint32(index)
		if m[2] != "" {
			v += hardened
		}
		out = append(out, v)
	}
	return out, nil
}

func splitOn(s string, sep byte) []string {
	var out []string
	start := 0
	for i := 0; i < len(s); i++ {
		if s[i] == sep {
			out = append(out, s[start:i])
			start = i + 1
		}
	}
	return append(out, s[start:])
}

// EncodeDerivationPaths writes the path list, sorted and de-duplicated so the
// order leaks nothing about the encoder.
func EncodeDerivationPaths(paths [][]uint32) ([]byte, error) {
	encoded := make([][]byte, 0, len(paths))
	for _, children := range paths {
		if len(children) == 0 || len(children) > 255 {
			return nil, errors.New("a derivation path must have 1 to 255 steps")
		}
		out := make([]byte, 1+4*len(children))
		out[0] = byte(len(children))
		for i, child := range children {
			binary.BigEndian.PutUint32(out[1+4*i:], child)
		}
		encoded = append(encoded, out)
	}
	unique := sortUniqueBytes(encoded)
	if len(unique) > 255 {
		return nil, errors.New("a backup can carry at most 255 derivation paths")
	}
	out := []byte{byte(len(unique))}
	for _, p := range unique {
		out = append(out, p...)
	}
	return out, nil
}

// IsCommonDerivationPath is true for the account paths every compliant wallet
// tries on its own during recovery.
func IsCommonDerivationPath(children []uint32) bool {
	inRange := func(v uint32) bool { return v >= hardened && v-hardened <= 9 }
	if len(children) != 3 && len(children) != 4 {
		return false
	}
	purpose, coin, account := children[0], children[1], children[2]
	if coin != 0+hardened && coin != 1+hardened {
		return false
	}
	if !inRange(account) {
		return false
	}
	if len(children) == 3 {
		for _, p := range []uint32{44, 49, 84, 86, 87} {
			if purpose == p+hardened {
				return true
			}
		}
		return false
	}
	script := children[3]
	return purpose == 48+hardened && (script == 1+hardened || script == 2+hardened)
}

// DropCommonDerivationPaths removes the paths a recovering wallet would try
// anyway. Writing them out costs bytes and tells an observer which script
// family the backup belongs to, for no gain.
func DropCommonDerivationPaths(paths [][]uint32) [][]uint32 {
	out := make([][]uint32, 0, len(paths))
	for _, p := range paths {
		if !IsCommonDerivationPath(p) {
			out = append(out, p)
		}
	}
	return out
}

// EncodeIndividualSecrets writes the entry list, sorted by its own bytes so
// the file order hides which key is whose.
func EncodeIndividualSecrets(secrets [][]byte) ([]byte, error) {
	for _, s := range secrets {
		if len(s) != 32 {
			return nil, errors.New("an individual secret must be 32 bytes")
		}
	}
	unique := sortUniqueBytes(secrets)
	if len(unique) == 0 || len(unique) > 255 {
		return nil, errors.New("a backup carries 1 to 255 individual secrets")
	}
	out := []byte{byte(len(unique))}
	for _, s := range unique {
		out = append(out, s...)
	}
	return out, nil
}

// EncodeBipContentType writes content type 0x01: a BIP number as a big-endian
// 16-bit integer.
func EncodeBipContentType(bip int) ([]byte, error) {
	if bip < 0 || bip > 0xffff {
		return nil, errors.New("invalid BIP number")
	}
	return []byte{ContentTypeBIP, byte(bip >> 8), byte(bip)}, nil
}

// EncodePayload writes the content items that go inside the encryption.
func EncodePayload(items []ContentItem) ([]byte, error) {
	if len(items) == 0 {
		return nil, errors.New("a payload must carry at least one content item")
	}
	var out []byte
	for _, item := range items {
		switch item.Type {
		case ContentTypeString:
			// The BIP: "For all TYPE values except 0x01, TYPE_LENGTH MUST be
			// present", and "0x03: TYPE_PARAMS MUST be empty". So the type
			// byte is followed by a zero-length TYPE_PARAMS.
			out = append(out, ContentTypeString, 0x00)
		default:
			head, err := EncodeBipContentType(item.BIP)
			if err != nil {
				return nil, err
			}
			out = append(out, head...)
		}
		out = append(out, EncodeCompactSize(len(item.Content))...)
		out = append(out, item.Content...)
	}
	return out, nil
}

// DecodePayload reads the content items back.
func DecodePayload(payload []byte) ([]ContentItem, error) {
	var items []ContentItem
	at := 0
	for at < len(payload) {
		typ := int(payload[at])
		// 0x00 ends the items. Everything after it is padding.
		if typ == 0x00 {
			break
		}
		at++
		if typ == ContentTypeBIP {
			if at+2 > len(payload) {
				return nil, errors.New("this backup is truncated")
			}
			bip := int(payload[at])<<8 | int(payload[at+1])
			at += 2
			length, next, err := readCompactSize(payload, at)
			if err != nil {
				return nil, err
			}
			at = next
			if at+length > len(payload) {
				return nil, errors.New("this backup is truncated")
			}
			items = append(items, ContentItem{Type: ContentTypeBIP, BIP: bip, Content: payload[at : at+length]})
			at += length
			continue
		}
		if typ == ContentTypeString {
			// TYPE_LENGTH, then TYPE_PARAMS (empty for a string), then the content.
			paramLen, paramNext, err := readCompactSize(payload, at)
			if err != nil {
				return nil, err
			}
			at = paramNext + paramLen
			length, next, err := readCompactSize(payload, at)
			if err != nil {
				return nil, err
			}
			at = next
			if at+length > len(payload) {
				return nil, errors.New("this backup is truncated")
			}
			items = append(items, ContentItem{Type: ContentTypeString, Content: payload[at : at+length]})
			at += length
			continue
		}
		if typ >= 0x80 {
			return nil, fmt.Errorf("this backup uses content type 0x%x, which this version cannot read", typ)
		}
		// A known-shape unknown type: skip its params, then skip its content.
		pv, pn, err := readCompactSize(payload, at)
		if err != nil {
			return nil, err
		}
		at = pn + pv
		bv, bn, err := readCompactSize(payload, at)
		if err != nil {
			return nil, err
		}
		at = bn + bv
	}
	return items, nil
}

// --------------------------------------------------------------------------
// Container
// --------------------------------------------------------------------------

// EncodeOptions controls one backup.
type EncodeOptions struct {
	// Pubkeys is every public key that may open this backup.
	Pubkeys [][]byte
	Items   []ContentItem
	// DecoySecrets are extra 32-byte entries that hide how many keys are real.
	DecoySecrets [][]byte
	// PadSecretsTo pads the entry list up to this many entries. Use
	// SecretEntryBucket to choose the value. The BIP tells an encoder to pad to
	// a bucket, so that counting the entries does not reveal how many
	// cosigners a wallet has.
	PadSecretsTo    int
	DerivationPaths [][]uint32
	// Nonce is 12 bytes and never all zero. Supply it only to reproduce a vector.
	Nonce []byte
}

// SecretEntryBucket returns the smallest bucket that holds keyCount secrets.
// A 2-of-3 pads to five. A 3-of-7 pads to ten.
func SecretEntryBucket(keyCount int) int {
	for _, bucket := range SecretEntryBuckets {
		if keyCount <= bucket {
			return bucket
		}
	}
	stepped := ((keyCount + 19) / 20) * 20
	if stepped > 255 {
		return 255
	}
	return stepped
}

// padWithDecoys adds random 32-byte entries until the list holds target
// distinct ones. A decoy that collided with a real secret would be dropped by
// the encoder's de-duplication and would quietly shrink the count, so this
// checks.
func padWithDecoys(secrets [][]byte, target int) ([][]byte, error) {
	if target <= len(secrets) {
		return secrets, nil
	}
	if target > 255 {
		return nil, errors.New("a backup carries at most 255 individual secrets")
	}
	seen := make(map[string]bool, target)
	for _, s := range secrets {
		seen[string(s)] = true
	}
	padded := make([][]byte, len(secrets), target)
	copy(padded, secrets)
	for len(padded) < target {
		decoy := make([]byte, 32)
		if _, err := rand.Read(decoy); err != nil {
			return nil, err
		}
		if seen[string(decoy)] {
			continue
		}
		seen[string(decoy)] = true
		padded = append(padded, decoy)
	}
	return padded, nil
}

func randomNonce() ([]byte, error) {
	for {
		nonce := make([]byte, 12)
		if _, err := rand.Read(nonce); err != nil {
			return nil, err
		}
		for _, b := range nonce {
			if b != 0 {
				return nonce, nil
			}
		}
	}
}

// EncodeBackup writes a complete BIP-138 backup.
func EncodeBackup(options EncodeOptions) ([]byte, error) {
	secret, individual, err := DeriveSecrets(options.Pubkeys)
	if err != nil {
		return nil, err
	}

	nonce := options.Nonce
	if nonce == nil {
		if nonce, err = randomNonce(); err != nil {
			return nil, err
		}
	}
	if len(nonce) != 12 {
		return nil, errors.New("the nonce must be 12 bytes")
	}
	allZero := true
	for _, b := range nonce {
		if b != 0 {
			allZero = false
			break
		}
	}
	if allZero {
		return nil, errors.New("the nonce must not be all zero")
	}

	payload, err := EncodePayload(options.Items)
	if err != nil {
		return nil, err
	}
	aead, err := chacha20poly1305.New(secret)
	if err != nil {
		return nil, err
	}
	ciphertext := aead.Seal(nil, nonce, payload, nil)

	entries := append(append([][]byte{}, individual...), options.DecoySecrets...)
	entries, err = padWithDecoys(entries, options.PadSecretsTo)
	if err != nil {
		return nil, err
	}

	paths, err := EncodeDerivationPaths(DropCommonDerivationPaths(options.DerivationPaths))
	if err != nil {
		return nil, err
	}
	secretBlock, err := EncodeIndividualSecrets(entries)
	if err != nil {
		return nil, err
	}

	out := append([]byte{}, Magic...)
	out = append(out, Version)
	out = append(out, paths...)
	out = append(out, secretBlock...)
	out = append(out, EncryptionChaCha20Poly1305)
	out = append(out, nonce...)
	out = append(out, EncodeCompactSize(len(ciphertext))...)
	out = append(out, ciphertext...)
	return out, nil
}

// DecodeBackup reads the container without decrypting it.
func DecodeBackup(b []byte) (*Backup, error) {
	if len(b) < len(Magic)+1 || !bytes.Equal(b[:len(Magic)], Magic) {
		return nil, errors.New("this is not a BIP-138 backup")
	}
	at := len(Magic)
	version := int(b[at])
	at++
	if version != Version {
		return nil, fmt.Errorf("this backup is format version %d, which this version cannot read", version)
	}

	if at >= len(b) {
		return nil, errors.New("this backup is truncated")
	}
	pathCount := int(b[at])
	at++
	paths := make([][]uint32, 0, pathCount)
	for i := 0; i < pathCount; i++ {
		if at >= len(b) {
			return nil, errors.New("this backup is truncated")
		}
		childCount := int(b[at])
		at++
		if at+4*childCount > len(b) {
			return nil, errors.New("this backup is truncated")
		}
		children := make([]uint32, 0, childCount)
		for c := 0; c < childCount; c++ {
			children = append(children, binary.BigEndian.Uint32(b[at:]))
			at += 4
		}
		paths = append(paths, children)
	}

	if at >= len(b) {
		return nil, errors.New("this backup is truncated")
	}
	secretCount := int(b[at])
	at++
	if secretCount == 0 {
		return nil, errors.New("this backup carries no individual secrets")
	}
	if at+32*secretCount > len(b) {
		return nil, errors.New("this backup is truncated")
	}
	secrets := make([][]byte, 0, secretCount)
	for i := 0; i < secretCount; i++ {
		secrets = append(secrets, b[at:at+32])
		at += 32
	}

	if at+13 > len(b) {
		return nil, errors.New("this backup is truncated")
	}
	encryption := int(b[at])
	at++
	nonce := b[at : at+12]
	at += 12
	allZero := true
	for _, x := range nonce {
		if x != 0 {
			allZero = false
			break
		}
	}
	if allZero {
		return nil, errors.New("this backup has an all-zero nonce, which is not allowed")
	}

	length, next, err := readCompactSize(b, at)
	if err != nil {
		return nil, err
	}
	at = next
	if at+length > len(b) {
		return nil, errors.New("this backup is truncated")
	}
	// Any bytes after the ciphertext are reserved and ignored on purpose.
	return &Backup{
		Version:           version,
		DerivationPaths:   paths,
		IndividualSecrets: secrets,
		Encryption:        encryption,
		Nonce:             nonce,
		Ciphertext:        b[at : at+length],
	}, nil
}

// DecryptBackup opens a backup with one public key. It tries every entry in
// the file, so decoy entries cost the reader nothing but a few failed
// authentications.
func DecryptBackup(b []byte, pubkey []byte) ([]ContentItem, error) {
	backup, err := DecodeBackup(b)
	if err != nil {
		return nil, err
	}
	if backup.Encryption != EncryptionChaCha20Poly1305 {
		return nil, fmt.Errorf("this backup uses cipher %d, which this version cannot read", backup.Encryption)
	}
	x, err := ToXOnly(pubkey)
	if err != nil {
		return nil, err
	}
	mine := TaggedHash("BIP138_INDIVIDUAL_SECRET", x)

	for _, entry := range backup.IndividualSecrets {
		aead, err := chacha20poly1305.New(xorBytes(entry, mine))
		if err != nil {
			continue
		}
		payload, err := aead.Open(nil, backup.Nonce, backup.Ciphertext, nil)
		if err != nil {
			// Not our entry, or a decoy. Try the next one.
			continue
		}
		// The key worked. Anything that fails from here is about the contents,
		// so it must never be reported as a key problem. An heir told to find
		// more keys goes hunting for keys they already have enough of.
		items, err := DecodePayload(payload)
		if err != nil {
			return nil, fmt.Errorf("your key opened this backup, but this page cannot read what is inside it: %w", err)
		}
		return items, nil
	}
	return nil, errors.New("none of the keys you supplied can open this backup")
}

// --------------------------------------------------------------------------
// Descriptors
// --------------------------------------------------------------------------

var keyExpression = regexp.MustCompile(`([xyztuvUVYZ]pub[a-zA-Z0-9]{107})((?:/(?:\d+['h]?|<[\d;'h]+>|\*))*)`)

// DescriptorPubkeys returns the root public keys of a descriptor's eligible
// key expressions. Only extended keys with a trailing derivation step or
// wildcard count. A bare xpub is refused, because its root key is also the key
// that appears on chain, so one observed spend would hand an outsider the
// decryption secret.
func DescriptorPubkeys(descriptor string) (pubkeys [][]byte, excluded []string, err error) {
	for _, m := range keyExpression.FindAllStringSubmatch(descriptor, -1) {
		xpub, trailing := m[1], m[2]
		if trailing == "" {
			excluded = append(excluded, xpub)
			continue
		}
		raw, err := base58CheckDecode(xpub)
		if err != nil {
			return nil, nil, err
		}
		if len(raw) < 78 {
			return nil, nil, errors.New("an extended public key must be 78 bytes")
		}
		// The last 33 bytes of the 78-byte payload are the compressed key.
		pubkeys = append(pubkeys, raw[45:])
	}
	if len(pubkeys) == 0 {
		return nil, nil, errors.New("this descriptor has no key that BIP-138 can use. Every key needs a derivation step or a wildcard")
	}
	return pubkeys, excluded, nil
}

// EncryptDescriptor wraps a descriptor as a BIP-380 content item, with any
// extra items beside it, and encodes a backup.
func EncryptDescriptor(descriptor string, extra []ContentItem, options EncodeOptions) (backup []byte, text string, excluded []string, err error) {
	pubkeys, excluded, err := DescriptorPubkeys(descriptor)
	if err != nil {
		return nil, "", nil, err
	}
	options.Pubkeys = pubkeys
	options.Items = append([]ContentItem{{Type: ContentTypeBIP, BIP: BIP380, Content: []byte(descriptor)}}, extra...)
	if options.PadSecretsTo == 0 {
		options.PadSecretsTo = SecretEntryBucket(len(pubkeys))
	}
	backup, err = EncodeBackup(options)
	if err != nil {
		return nil, "", nil, err
	}
	return backup, base64.StdEncoding.EncodeToString(backup), excluded, nil
}

// DecryptDescriptor opens a BIP-380 descriptor backup with one extended
// public key.
func DecryptDescriptor(backup []byte, xpub string) (string, error) {
	raw, err := base58CheckDecode(xpub)
	if err != nil {
		return "", err
	}
	if len(raw) < 78 {
		return "", errors.New("an extended public key must be 78 bytes")
	}
	items, err := DecryptBackup(backup, raw[45:])
	if err != nil {
		return "", err
	}
	for _, item := range items {
		if item.Type == ContentTypeBIP && item.BIP == BIP380 {
			return string(item.Content), nil
		}
	}
	return "", errors.New("this backup holds no descriptor")
}

// DecryptDescriptorText opens a base64 backup with one extended public key.
func DecryptDescriptorText(text, xpub string) (string, error) {
	raw, err := base64.StdEncoding.DecodeString(trimSpace(text))
	if err != nil {
		return "", err
	}
	return DecryptDescriptor(raw, xpub)
}

func trimSpace(s string) string {
	start, end := 0, len(s)
	for start < end && (s[start] == ' ' || s[start] == '\n' || s[start] == '\t' || s[start] == '\r') {
		start++
	}
	for end > start && (s[end-1] == ' ' || s[end-1] == '\n' || s[end-1] == '\t' || s[end-1] == '\r') {
		end--
	}
	return s[start:end]
}
