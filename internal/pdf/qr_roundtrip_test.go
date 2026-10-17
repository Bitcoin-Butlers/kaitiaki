package pdf

import (
	"bytes"
	"image/png"
	"testing"
)

// The chain copy is printed as a QR code because nobody types 876 characters
// of base64 correctly. This checks the code is actually generated and is a
// real image, at a size a phone can read.
func TestChainCopyQRIsAReadableImage(t *testing.T) {
	payload := "QklQMTM4AQAFLr8hjVQ5qqHdxyiEOfHcVsZlnWdF" +
		"QklQMTM4AQAFLr8hjVQ5qqHdxyiEOfHcVsZlnWdFQklQMTM4AQAF"
	raw, err := generateQRPNG(payload)
	if err != nil {
		t.Fatalf("generateQRPNG: %v", err)
	}
	img, err := png.Decode(bytes.NewReader(raw))
	if err != nil {
		t.Fatalf("the QR code is not a valid PNG: %v", err)
	}
	b := img.Bounds()
	if b.Dx() < 256 || b.Dy() < 256 {
		t.Errorf("the QR code is %dx%d, too small to scan reliably from paper", b.Dx(), b.Dy())
	}
}
