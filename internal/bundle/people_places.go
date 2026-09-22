package bundle

import (
	"strings"

	"github.com/eljojo/rememory/internal/translations"
)

// PeopleAndPlacesFileName is what the owner's key locations are called inside
// the encrypted archive.
const PeopleAndPlacesFileName = "WHERE-THE-KEYS-ARE.txt"

// PeopleAndPlacesFile turns the owner's text into the file that carries it.
//
// This text is sealed INSIDE the encrypted archive, so it appears only when
// enough guardians combine their pieces. It never goes in a README, because a
// README is built to be forwarded: a guardian's own copy tells them to send it
// to whoever asks for their piece. Key locations must not travel that way.
//
// The name and the header are decided here rather than in the browser, so a
// bundle made by the command line matches one made in a browser.
func PeopleAndPlacesFile(text, lang string) (name string, content []byte) {
	if lang == "" {
		lang = "en"
	}
	header := translations.T("readme", lang, "people_places_file_header")
	body := strings.TrimRight(text, "\n")
	return PeopleAndPlacesFileName, []byte(header + "\n" + body + "\n")
}
