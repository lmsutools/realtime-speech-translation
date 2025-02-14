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
        { value: 'en-US', text: 'English' },
        { value: 'es-ES', text: 'Spanish' },
        { value: 'zh', text: 'Chinese Mandarin Simplified' },
        { value: 'multi', text: 'Multi, English + Spanish' }
      ]
    : [{ value: 'en', text: 'English' }];
  options.forEach(opt => {
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
    { value: 'nova-3|en', text: '(Nova-3) English' }
  ];
  combinedOptions.forEach(opt => {
    const optionElement = document.createElement('option');
    optionElement.value = opt.value;
    optionElement.text = opt.text;
    sourceLanguageSelect.appendChild(optionElement);
  });
  const storedValue = await getStoreValue('sourceLanguage', 'nova-2|multi');
  sourceLanguageSelect.value = storedValue;
}

export async function applySettingsToUI() {
  const enableTranslation = (await getStoreValue('enableTranslation', false)) === true;
  const storedSourceLanguage = await getStoreValue('sourceLanguage', 'nova-2|multi');
  const targetLanguage = await getStoreValue('targetLanguage', 'en');
  // Update Source Language Dropdown with combined options.
  const sourceLanguageSelect = document.getElementById('sourceLanguage');
  updateSourceLanguageDropdown();
  // Update Target Language Dropdown.
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
  await setStoreValue('targetLanguage', targetLanguage);
  updateTranslationUI(enableTranslation);
  sourceLanguageSelect.addEventListener('change', async (e) => {
    await setStoreValue('sourceLanguage', e.target.value);
  });
  targetLanguageSelect.addEventListener('change', async (e) => {
    await setStoreValue('targetLanguage', e.target.value);
  });
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
