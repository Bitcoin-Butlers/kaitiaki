package bundle

import (
	"strings"
	"time"

	"github.com/Bitcoin-Butlers/kaitiaki/internal/translations"
)

// The texts an owner may write, and the one rule they share: every one of them
// is sealed INSIDE the encrypted archive, so it appears only when enough
// guardians combine their pieces.
//
// A README is built to be forwarded. A guardian's own copy tells them to send
// it to whoever asks for their piece, so nothing that names people, places or
// the wallet may travel in it. That includes the chain copy: its ciphertext
// needs one of the wallet's own keys, but a guardian who never reads it does
// not know a chain copy exists, where to look, or that a key they hold would
// open it.
//
// The names and the headers are decided here rather than in the browser, so a
// bundle made by the command line matches one made in a browser.
const (
	PeopleAndPlacesFileName = "WHERE-THE-KEYS-ARE.txt"
	RecoveryStepsFileName   = "HOW-THE-WALLET-WORKS.txt"
	ChainCopyFileName       = "CHAIN-COPY.txt"
)

// SealedFileNames lists every file this package seals inside the archive.
// Tests walk it to assert that no README, PDF or recover page carries any of
// their content.
var SealedFileNames = []string{
	PeopleAndPlacesFileName,
	RecoveryStepsFileName,
	ChainCopyFileName,
}

func langOrEnglish(lang string) string {
	if lang == "" {
		return "en"
	}
	return lang
}

// PeopleAndPlacesFile turns the owner's key locations into the file that
// carries them.
func PeopleAndPlacesFile(text, lang string) (name string, content []byte) {
	lang = langOrEnglish(lang)
	header := translations.T("readme", lang, "people_places_file_header")
	body := strings.TrimRight(text, "\n")
	return PeopleAndPlacesFileName, []byte(header + "\n" + body + "\n")
}

// RecoveryStepsFile turns the owner's method into the file that carries it.
//
// This text sat in the plaintext README until 2026-09-24, on the reasoning
// that a lone guardian may safely hold it. It may not: read beside the roster
// it told a colluding guardian how the wallet works and who to recruit.
func RecoveryStepsFile(text, lang string) (name string, content []byte) {
	lang = langOrEnglish(lang)
	t := func(key string) string { return translations.T("readme", lang, key) }
	var sb strings.Builder
	sb.WriteString(t("owner_steps_title") + "\n\n")
	sb.WriteString(t("owner_steps_intro") + "\n")
	sb.WriteString(t("recovery_steps_file_note") + "\n\n")
	sb.WriteString(strings.TrimRight(text, "\n") + "\n")
	return RecoveryStepsFileName, []byte(sb.String())
}

// ChainCopyFile turns the published chain copy into the file that carries it.
//
// The txid travels with the ciphertext. Leaving it behind in a README would
// undo the move: a reader who holds one of the wallet's keys needs only the
// transaction id to fetch the same payload from the chain.
//
// An owner who publishes AFTER sealing cannot get their id in here at all: the
// archive is encrypted and its key is already split. That is why the placement
// session publishes before it seals, and why the estate insert carries the id
// as well. See docs/wayfinder/guardian-privacy/tickets/08-where-the-txid-lives.md.
func ChainCopyFile(payload, txid, lang string) (name string, content []byte) {
	lang = langOrEnglish(lang)
	t := func(key string) string { return translations.T("readme", lang, key) }
	var sb strings.Builder
	sb.WriteString(t("chain_copy_title") + "\n\n")
	sb.WriteString(t("chain_copy_intro") + "\n\n")
	sb.WriteString(t("chain_copy_may_be_older") + "\n\n")
	sb.WriteString(strings.TrimRight(payload, "\n") + "\n\n")
	sb.WriteString(t("chain_copy_txid") + " ")
	if txid != "" {
		sb.WriteString(txid + "\n")
	} else {
		// No blank line to fill in. This file is sealed inside an encrypted
		// archive, so nobody can write on it after the fact. Say where the id
		// is instead.
		sb.WriteString("\n" + t("chain_copy_txid_blank") + "\n")
	}
	return ChainCopyFileName, []byte(sb.String())
}

// SealedTexts is everything an owner writes. They travel together because
// they share one rule, and deciding which of them gets sealed in two places
// is how the CLI and the browser drift apart.
type SealedTexts struct {
	PeopleAndPlaces string
	RecoverySteps   string
	ChainPayload    string
	// ChainTxid is only ever known here when the owner published BEFORE
	// sealing. See ChainCopyFile.
	ChainTxid string
}

// SealedFiles turns the owner's texts into the files the archive carries.
// The CLI and the browser both call this, so a bundle made either way holds
// the same files under the same names.
func SealedFiles(texts SealedTexts, lang string, modTime time.Time) []ZipFile {
	var out []ZipFile
	add := func(name string, content []byte) {
		out = append(out, ZipFile{Name: name, Content: content, ModTime: modTime})
	}
	if texts.PeopleAndPlaces != "" {
		add(PeopleAndPlacesFile(texts.PeopleAndPlaces, lang))
	}
	if texts.RecoverySteps != "" {
		add(RecoveryStepsFile(texts.RecoverySteps, lang))
	}
	if texts.ChainPayload != "" {
		add(ChainCopyFile(texts.ChainPayload, texts.ChainTxid, lang))
	}
	return out
}
