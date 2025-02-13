import { getStoreValue, setStoreValue } from './storeBridge.js';

export function updateTranslationUI(enableTranslation) {
  const translationContainer = document.getElementById('translated-text').parentNode;
  const targetLanguageSelect = document.getElementById('targetLanguage');
  const arrowSpan = document.querySelector('.arrow');
  const displayValue = enableTranslation ? 'block' : 'none';
  translationContainer.style.display = displayValue;
  targetLanguageSelect.style.display = displayValue;
  arrowSpan.style.display = displayValue;
}

export function updateLanguageOptions(languageSelect, model) {
  languageSelect.innerHTML = '';
  const options = (model === 'nova-2')
    ? [
        { value: 'en-US', text: 'English (US)' },
        { value: 'es-ES', text: 'Spanish (Spain)' },
        { value: 'zh', text: 'Chinese Mandarin Simplified' },
        { value: 'multi', text: 'Multi (English + Spanish)' }
      ]
    : [{ value: 'en', text: 'English' }];
  options.forEach(opt => {
    const optionElement = document.createElement('option');
    optionElement.value = opt.value;
    optionElement.text = opt.text;
    languageSelect.appendChild(optionElement);
  });
}

export async function updateSourceLanguageDropdown(model) {
  const sourceLanguageSelect = document.getElementById('sourceLanguage');
  updateLanguageOptions(sourceLanguageSelect, model);
  const defaultLang = (model === 'nova-3') ? 'en' : 'multi';
  const storedLang = await getStoreValue('sourceLanguage', defaultLang);
  sourceLanguageSelect.value = storedLang;
  await setStoreValue('sourceLanguage', storedLang);
}

export async function applySettingsToUI() {
  // Retrieve persistent settings via storeBridge.
  const enableTranslation = (await getStoreValue('enableTranslation', false)) === true;
  const model = await getStoreValue('model', 'nova-2');
  const sourceLanguage = await getStoreValue('sourceLanguage', model === 'nova-2' ? 'multi' : 'en');
  const targetLanguage = await getStoreValue('targetLanguage', 'en');

  // Update Source Language
  const sourceLanguageSelect = document.getElementById('sourceLanguage');
  updateLanguageOptions(sourceLanguageSelect, model);
  sourceLanguageSelect.value = sourceLanguage;
  // Save changes if user selects a different source language.
  sourceLanguageSelect.addEventListener('change', async (e) => {
    await setStoreValue('sourceLanguage', e.target.value);
  });

  // Update Target Language
  const targetLanguageSelect = document.getElementById('targetLanguage');
  targetLanguageSelect.innerHTML = '';
  const targetLanguageOptions = [
    { value: 'en', text: 'English' },
    { value: 'es', text: 'Spanish' },
    { value: 'zh', text: 'Chinese Simplified' }
  ];
  targetLanguageOptions.forEach(opt => {
    const optionElement = document.createElement('option');
    optionElement.value = opt.value;
    optionElement.text = opt.text;
    targetLanguageSelect.appendChild(optionElement);
  });
  targetLanguageSelect.value = targetLanguage;
  // Save changes if user selects a different target language.
  targetLanguageSelect.addEventListener('change', async (e) => {
    await setStoreValue('targetLanguage', e.target.value);
  });

  // Update translation UI based on enableTranslation setting.
  updateTranslationUI(enableTranslation);
}

export function initializeUI() {
  document.addEventListener('DOMContentLoaded', async () => {
    // Set up Reset button.
    document.getElementById('reset').addEventListener('click', () => {
      document.getElementById('source-text').textContent = '';
      document.getElementById('translated-text').textContent = '';
    });
    await applySettingsToUI();
  });
}
