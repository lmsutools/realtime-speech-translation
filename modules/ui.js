import { appState } from '../stores/appState.js';
import { getStoreValue, setStoreValue } from './storeBridge.js';

// Debounce: No changes
export function debounce(func, wait) {
  let timeout;
  return function (...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
}

// KEY PART: Update Translate UI (now toggles .visible on .translated-pane)
export function updateTranslationUI(enableTranslation) {
  // Get the translation elements
  const translatedPane = document.querySelector('.translated-pane');
  const translationContainer = translatedPane?.parentNode; // not actually used, left for backward compat
  const targetLanguageSelect = document.getElementById('targetLanguage');
  const arrowSpan = document.querySelector('.arrow');
  const mainContent = document.querySelector('.main-content');

  // Debug
  //console.log('[updateTranslationUI] enableTranslation:', enableTranslation);

  // Toggle .visible class on .translated-pane
  if (translatedPane) {
    if (enableTranslation) {
      translatedPane.classList.add('visible');
    } else {
      translatedPane.classList.remove('visible');
    }
  }

  // the select and the 'arrow' (if any)
  if (targetLanguageSelect) {
    targetLanguageSelect.style.display = enableTranslation ? 'block' : 'none';
  }
  if (arrowSpan) {
    arrowSpan.style.display = enableTranslation ? 'block' : 'none';
  }

  // main content: CSS grid columns
  if (mainContent) {
    mainContent.style.gridTemplateColumns = enableTranslation ? '1fr 1fr' : '1fr';
  }

  // Optionally clear translation text if hiding
  if (!enableTranslation) {
    const t = document.getElementById('translated-text');
    if (t) t.textContent = '';
  }
}

export function updateLanguageOptions(languageSelect, model) {
  languageSelect.innerHTML = '';
  const options =
    model === 'nova-2'
      ? [
          { value: 'en-US', text: 'English' },
          { value: 'es-ES', text: 'Spanish' },
          { value: 'zh', text: 'Chinese Mandarin Simplified' },
          { value: 'multi', text: 'Multi, English + Spanish' },
        ]
      : [{ value: 'en', text: 'English' }];

  options.forEach((opt) => {
    const optionElement = document.createElement('option');
    optionElement.value = opt.value;
    optionElement.text = opt.text;
    languageSelect.appendChild(optionElement);
  });
}

export async function updateSourceLanguageDropdown() {
  const sourceLanguageSelect = document.getElementById('sourceLanguage');
  sourceLanguageSelect.innerHTML = '';
  const combinedOptions = [
    { value: 'nova-2|en-US', text: '(Nova-2) English' },
    { value: 'nova-2|es-ES', text: '(Nova-2) Spanish' },
    { value: 'nova-2|zh', text: '(Nova-2) Mandarin Simplified' },
    { value: 'nova-2|multi', text: '(Nova-2) Multi, English & Spanish' },
    { value: 'nova-3|en', text: '(Nova-3) English' },
  ];
  combinedOptions.forEach((opt) => {
    const optionElement = document.createElement('option');
    optionElement.value = opt.value;
    optionElement.text = opt.text;
    sourceLanguageSelect.appendChild(optionElement);
  });
  sourceLanguageSelect.value = appState.sourceLanguage;
}

export async function applySettingsToUI() {
  const enableTranslation = appState.enableTranslation;
  const targetLanguage = appState.targetLanguage;
  await updateSourceLanguageDropdown();

  const targetLanguageSelect = document.getElementById('targetLanguage');
  targetLanguageSelect.innerHTML = '';
  const targetLanguageOptions = [
    { value: 'en', text: 'English' },
    { value: 'es', text: 'Spanish' },
    { value: 'zh', text: 'Chinese Simplified' },
  ];
  targetLanguageOptions.forEach((opt) => {
    const optionElement = document.createElement('option');
    optionElement.value = opt.value;
    optionElement.text = opt.text;
    targetLanguageSelect.appendChild(optionElement);
  });
  targetLanguageSelect.value = targetLanguage;

  const sourceLanguageSelect = document.getElementById('sourceLanguage');
  sourceLanguageSelect.addEventListener('change', (e) => {
    appState.setSourceLanguage(e.target.value);
  });
  targetLanguageSelect.addEventListener('change', (e) => {
    appState.setTargetLanguage(e.target.value);
  });

  updateTranslationUI(enableTranslation);
}

export function initializeUI() {
  document.addEventListener('DOMContentLoaded', async () => {
    document.getElementById('reset').addEventListener('click', () => {
      document.getElementById('source-text').textContent = '';
      document.getElementById('translated-text').textContent = '';
    });
    await applySettingsToUI();
  });
}
