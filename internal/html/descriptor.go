package html

// GenerateDescriptorHTML creates the descriptor backup page.
//
// The page encrypts a multisig descriptor so the wallet's own keys unlock it,
// and reads one back off the chain. Unlike recover.html it is allowed to make
// one network request, fetching a transaction by id, because a person who has
// lost their paperwork needs that far more than they need an offline promise
// on this particular page. The encrypt half never touches the network, and the
// page says which half does.
func GenerateDescriptorHTML(selfhosted bool) string {
	page := applyLayout(LayoutOptions{
		Title:      "Kaitiaki - Descriptor Backup",
		Selfhosted: selfhosted,
		HeadMeta: `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-{{CSP_NONCE}}'; style-src 'unsafe-inline'; img-src data:; connect-src https:; form-action 'none'; frame-ancestors 'none';">
  <meta name="generator" content="Kaitiaki {{VERSION}}">
  <meta name="description" content="Encrypt a multisig descriptor so that the wallet's own keys unlock it, then keep it on Bitcoin. Runs in your browser.">
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website">
  <meta property="og:title" content="Kaitiaki - Descriptor Backup">
  <meta property="og:description" content="Encrypt a multisig descriptor so that the wallet's own keys unlock it, then keep it on Bitcoin.">
  <meta property="og:image" content="{{GITHUB_PAGES}}/screenshots/recovery-1.png">
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Kaitiaki - Descriptor Backup">
  <meta name="twitter:description" content="Encrypt a multisig descriptor so that the wallet's own keys unlock it, then keep it on Bitcoin.">
  <meta name="twitter:image" content="{{GITHUB_PAGES}}/screenshots/recovery-1.png">`,
		PageStyles:    descriptorCSS,
		Content:       descriptorHTMLTemplate,
		FooterContent: descriptorFooter,
		Scripts:       `<script nonce="{{CSP_NONCE}}">` + descriptorAppJS + "</script>",
	})
	// connect-src stays https: rather than one host, because the reader can
	// point the explorer field at their own node or a Tor mirror. Every other
	// directive is closed.
	return applyCSPNonce(page)
}

const descriptorFooter = `<p>Kaitiaki {{VERSION}}</p>
    <p>
      <a href="{{GITHUB_REPO}}" target="_blank">Source Code</a> &#xB7;
      <a href="docs.html">Documentation</a> &#xB7;
      <a href="{{BUTLERS_URL}}">Bitcoin Butlers</a>
    </p>`
