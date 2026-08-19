package html

// GenerateIndexHTML creates the landing page HTML with embedded CSS.
func GenerateIndexHTML(selfhosted bool) string {
	content := aboutHTMLTemplate

	result := applyLayout(LayoutOptions{
		Title:      "Kaitiaki - A digital safe with multiple keys",
		BodyClass:  "landing",
		Selfhosted: selfhosted,
		HeadMeta: `<meta name="generator" content="Kaitiaki {{VERSION}}">
  <meta name="description" content="A digital safe with multiple keys, held by people you trust. No accounts, no servers. Recovery works offline.">
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website">
  <meta property="og:title" content="Kaitiaki - A digital safe with multiple keys">
  <meta property="og:description" content="A digital safe with multiple keys, held by people you trust. No accounts, no servers. Recovery works offline.">
  <meta property="og:image" content="{{GITHUB_PAGES}}/screenshots/recovery-1.png">
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Kaitiaki - A digital safe with multiple keys">
  <meta name="twitter:description" content="A digital safe with multiple keys, held by people you trust. No accounts, no servers. Recovery works offline.">
  <meta name="twitter:image" content="{{GITHUB_PAGES}}/screenshots/recovery-1.png">`,
		PageStyles: indexCSS,
		Content:    content,
		FooterContent: `<p style="font-size: 0.8125rem; color: var(--text-muted);" data-i18n-html="footer_timelock">* <a href="docs.html#timelock" style="color: var(--text-muted);">Time-locked</a> archives need a brief internet connection at recovery time.</p>
    <p>
      <a href="{{GITHUB_REPO}}" target="_blank" data-i18n="footer_source">Source Code</a> &#xB7;
      <a href="{{GITHUB_URL}}" target="_blank" data-i18n="footer_download">Download</a> &#xB7;
      <a href="docs.html" data-i18n="footer_docs">Documentation</a>
    </p>
    <p class="version"><a href="{{GITHUB_REPO}}/blob/main/CHANGELOG.md" target="_blank" style="color: var(--text-muted); text-decoration: none;">{{VERSION}}</a></p>
    <p class="version">Built on <a href="https://github.com/eljojo/rememory" target="_blank" style="color: var(--text-muted);">Rememory</a> by eljojo (Apache-2.0)</p>`,
		Scripts: `<script>document.querySelector('#nav-links-main a[href="about.html"]')?.remove();</script>

  <script>` + dataflowJS + `</script>` + i18nScript(I18nScriptOptions{
			Component:         "index",
			SetLanguageExtra:  i18nIndexSetlangJS,
		}),
	})

	return result
}
