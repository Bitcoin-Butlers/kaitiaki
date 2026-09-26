package html

import (
	"fmt"
	"path/filepath"
	"strings"

	"github.com/Bitcoin-Butlers/kaitiaki/internal/core"
)

// DocsLanguages returns the language codes that have a translated docs guide
// (e.g. ["es"]). English is excluded since it's the default.
func DocsLanguages() []string {
	entries, err := docsContentFS.ReadDir("docs-content")
	if err != nil {
		return nil
	}
	var langs []string
	for _, e := range entries {
		if e.IsDir() {
			continue
		}
		lang := strings.TrimSuffix(e.Name(), filepath.Ext(e.Name()))
		if lang != "en" {
			langs = append(langs, lang)
		}
	}
	return langs
}

// GenerateDocsHTML creates the documentation page HTML from Markdown content.
// lang is the language code (e.g. "en", "es"). Falls back to "en" if not found.
func GenerateDocsHTML(lang string, selfhosted bool) string {
	if lang == "" {
		lang = "en"
	}

	// Load Markdown content for the requested language (fall back to English)
	mdContent, err := docsContentFS.ReadFile("docs-content/" + lang + ".md")
	if err != nil {
		mdContent, err = docsContentFS.ReadFile("docs-content/en.md")
		if err != nil {
			return fmt.Sprintf("<!-- error loading docs content: %v -->", err)
		}
		lang = "en"
	}

	// Parse frontmatter
	fm, body, err := parseFrontmatter(mdContent)
	if err != nil {
		return fmt.Sprintf("<!-- error parsing frontmatter: %v -->", err)
	}

	// Render Markdown to HTML + extract TOC
	content, tocEntries, err := renderDocsMarkdown(body)
	if err != nil {
		return fmt.Sprintf("<!-- error rendering markdown: %v -->", err)
	}

	// Generate TOC HTML
	tocHTML := renderTOC(tocEntries)

	// Inject into template
	result := docsHTMLTemplate

	// Embed styles
	result = strings.Replace(result, "{{STYLES}}", stylesCSS, 1)

	// Language
	result = strings.Replace(result, "{{LANG}}", lang, 1)

	// Frontmatter strings
	result = strings.Replace(result, "{{PAGE_TITLE}}", fm.Title, -1)
	result = strings.Replace(result, "{{PAGE_SUBTITLE}}", fm.Subtitle, -1)
	result = strings.Replace(result, "{{CLI_GUIDE_NOTE}}", fm.CLIGuideNote, 1)
	result = strings.Replace(result, "{{NAV_HOME}}", fm.NavHome, 1)
	result = strings.Replace(result, "{{NAV_HOME_LINK}}", fm.NavHomeLink, 1)
	result = strings.Replace(result, "{{NAV_CREATE}}", fm.NavCreate, 1)
	result = strings.Replace(result, "{{NAV_RECOVER}}", fm.NavRecover, 1)
	result = strings.Replace(result, "{{TOC_TITLE}}", fm.TOCTitle, 1)
	result = strings.Replace(result, "{{FOOTER_SOURCE}}", fm.FooterSource, 1)
	result = strings.Replace(result, "{{FOOTER_DOWNLOAD}}", fm.FooterDL, 1)
	result = strings.Replace(result, "{{FOOTER_HOME}}", fm.FooterHome, 1)

	// Logo href: "/" for selfhosted, "about.html" for static
	logoHref := "about.html"
	if selfhosted {
		logoHref = "/"
	}
	result = strings.Replace(result, "{{LOGO_HREF}}", logoHref, -1)

	// Content
	result = strings.Replace(result, "{{TOC}}", tocHTML, 1)
	result = strings.Replace(result, "{{DOCS_CONTENT}}", content, 1)

	// Replace version and GitHub URLs
	result = strings.Replace(result, "{{VERSION}}", pkgVersion, -1)
	result = strings.Replace(result, "{{GITHUB_REPO}}", core.GitHubRepo, -1)
	result = strings.Replace(result, "{{BUTLERS_URL}}", butlersSiteURL, -1)
	result = strings.Replace(result, "%7B%7BGITHUB_REPO%7D%7D", core.GitHubRepo, -1)
	result = strings.Replace(result, "{{GITHUB_PAGES}}", core.GitHubPages, -1)
	result = strings.Replace(result, "%7B%7BGITHUB_PAGES%7D%7D", core.GitHubPages, -1)
	result = strings.Replace(result, "{{GITHUB_URL}}", githubURL(), -1)
	result = strings.Replace(result, "%7B%7BGITHUB_URL%7D%7D", githubURL(), -1)

	return result
}
