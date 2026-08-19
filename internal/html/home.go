package html

import (
	"encoding/json"
	"strings"

)

// GenerateHomeHTML creates the selfhosted home page with bundle data.
func GenerateHomeHTML(bundlesJSON string) string {
	content := homeHTMLTemplate
	content = strings.Replace(content, "{{BUNDLES_JSON}}", bundlesJSON, 1)

	navExtras := ""

	// Build scripts: i18n first, then home logic
	var scripts strings.Builder
	scripts.WriteString(i18nScript(I18nScriptOptions{
		Component:         "home",
	}))
	scripts.WriteString("\n  <script>" + strings.Replace(homeJS, "{{BUNDLES_JSON}}", bundlesJSON, 1) + "</script>")

	result := applyLayout(LayoutOptions{
		Title:         "Kaitiaki",
		Selfhosted:    true,
		PageStyles:    homeCSS,
		NavExtras:     navExtras,
		Content:       content,
		FooterContent: `<p>Kaitiaki</p><p class="version">{{VERSION}}</p>`,
		Scripts:       scripts.String(),
	})

	return result
}

// HomeBundlesJSON serializes bundle metadata to JSON for the home page.
func HomeBundlesJSON(bundles any) string {
	data, _ := json.Marshal(bundles)
	return string(data)
}
