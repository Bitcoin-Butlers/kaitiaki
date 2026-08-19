package bundle

import (
	"archive/zip"
	"fmt"
	"os"
	"path/filepath"
	"time"
)

// ZipFile represents a file to be added to a ZIP archive.
type ZipFile struct {
	Name    string
	Content []byte
	ModTime time.Time
}

// CreateZip creates a ZIP archive at the given path with the given files.
// It writes to a temporary file and renames into place, so a failure
// never leaves a truncated or corrupt ZIP at the destination.
func CreateZip(path string, files []ZipFile) error {
	f, err := os.CreateTemp(filepath.Dir(path), ".zip-tmp-*")
	if err != nil {
		return fmt.Errorf("creating zip file: %w", err)
	}
	tmpPath := f.Name()
	defer func() {
		f.Close()
		os.Remove(tmpPath) // no-op after successful rename
	}()

	w := zip.NewWriter(f)

	for _, file := range files {
		header := &zip.FileHeader{
			Name:   file.Name,
			Method: zip.Deflate,
		}
		header.Modified = file.ModTime

		fw, err := w.CreateHeader(header)
		if err != nil {
			return fmt.Errorf("creating entry %s: %w", file.Name, err)
		}

		if _, err := fw.Write(file.Content); err != nil {
			return fmt.Errorf("writing entry %s: %w", file.Name, err)
		}
	}

	if err := w.Close(); err != nil {
		return fmt.Errorf("finalizing zip: %w", err)
	}
	if err := f.Close(); err != nil {
		return fmt.Errorf("closing zip file: %w", err)
	}
	if err := os.Chmod(tmpPath, 0644); err != nil {
		return fmt.Errorf("setting zip permissions: %w", err)
	}
	if err := os.Rename(tmpPath, path); err != nil {
		return fmt.Errorf("moving zip into place: %w", err)
	}

	return nil
}
