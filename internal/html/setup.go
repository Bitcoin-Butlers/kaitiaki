package html

// GenerateSetupHTML creates the admin password setup page.
func GenerateSetupHTML() string {
	return applyLayout(LayoutOptions{
		Title:      "Bitcoin Inheritance Setup",
		BodyClass:  "setup",
		Selfhosted: true,
		PageStyles: setupCSS,
		Content:    setupHTMLTemplate,
		Scripts:    `<script>` + setupJS + `</script>`,
	})
}
