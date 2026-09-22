package descriptorbackup

import (
	"bytes"
	"crypto/sha256"
	"errors"
	"math/big"
)

const base58Alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"

var base58Index = func() map[byte]int {
	m := make(map[byte]int, len(base58Alphabet))
	for i := 0; i < len(base58Alphabet); i++ {
		m[base58Alphabet[i]] = i
	}
	return m
}()

// base58Decode turns a base58 string into bytes, keeping leading zero bytes
// for every leading '1', the way Bitcoin's encoding requires.
func base58Decode(s string) ([]byte, error) {
	n := new(big.Int)
	radix := big.NewInt(58)
	for i := 0; i < len(s); i++ {
		v, ok := base58Index[s[i]]
		if !ok {
			return nil, errors.New("this is not valid base58 text")
		}
		n.Mul(n, radix)
		n.Add(n, big.NewInt(int64(v)))
	}
	body := n.Bytes()
	zeros := 0
	for zeros < len(s) && s[zeros] == '1' {
		zeros++
	}
	out := make([]byte, zeros+len(body))
	copy(out[zeros:], body)
	return out, nil
}

// base58CheckDecode strips and verifies the four-byte double-SHA256 checksum.
func base58CheckDecode(s string) ([]byte, error) {
	raw, err := base58Decode(s)
	if err != nil {
		return nil, err
	}
	if len(raw) < 5 {
		return nil, errors.New("this base58 text is too short to carry a checksum")
	}
	body, want := raw[:len(raw)-4], raw[len(raw)-4:]
	first := sha256.Sum256(body)
	second := sha256.Sum256(first[:])
	if !bytes.Equal(second[:4], want) {
		return nil, errors.New("the checksum does not match, so this key is mistyped or damaged")
	}
	return body, nil
}
