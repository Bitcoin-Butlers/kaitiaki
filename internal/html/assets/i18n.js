const translations = {{TRANSLATIONS_JSON}};
{{EXTRA_DECLARATIONS}}

let currentLang = 'en';

function t(key, ...args) {
  let text = translations[currentLang][key] || translations['en'][key] || key;
  args.forEach((arg, i) => {
    text = text.replace(`{${i}}`, arg);
  });
  return text;
}

function setLanguage(lang) {
  currentLang = lang;

  // Update all translatable elements
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    el.textContent = t(key);
  });

  // Update placeholder attributes
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.dataset.i18nPlaceholder;
    el.placeholder = t(key);
  });

  // Update page title (only if the component provides one)
  var translatedTitle = t('title');
  if (translatedTitle && translatedTitle !== 'title') {
    document.title = translatedTitle;
  }

  // Re-render dynamic content
  if (typeof window.rememoryUpdateUI === 'function') {
    window.rememoryUpdateUI();
  }

  {{SET_LANGUAGE_EXTRA}}

}

// Apply strings after DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  {{DOM_CONTENT_LOADED_PRE}}

  setLanguage(currentLang);
});
