package main

import (
	"os"

	"github.com/Bitcoin-Butlers/kaitiaki/internal/cmd"
)

var version = "dev"
var buildDate = ""

func main() {
	if err := cmd.Execute(version, buildDate); err != nil {
		os.Exit(1)
	}
}
