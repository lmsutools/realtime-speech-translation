
import { populateInputDevices } from './devices.js';

export function updateLanguageOptions() {
  const model = document.getElementById('model').value;
  const languageSelect = document.getElementById('language');
  languageSelect.innerHTML = ''; // Clear existing options

  if (model === 'nova-2') {
    const options = [
      { value: 'en-US', text: 'English (US)' },
      { value: 'es-ES', text: 'Spanish (Spain)' },
      { value: 'zh', text: 'Chinese Mandarin Simplified' },
      { value: 'multi', text: 'Multi (English + Spanish)' }
    ];
    options.forEach(opt => {
      const optionElement = document.createElement('option');
      optionElement.value = opt.value;
      optionElement.text = opt.text;
      languageSelect.appendChild(optionElement);
    });
    // Set default for nova-2.
    languageSelect.value = 'multi';
  } else if (model === 'nova-3') {
    // nova-3 supports only English.
    const optionElement = document.createElement('option');
    optionElement.value = 'en';
    optionElement.text = 'English';
    languageSelect.appendChild(optionElement);
  }
}

export function initializeUI() {
  document.addEventListener('DOMContentLoaded', () => {
    // Populate devices and set up language options.
    populateInputDevices();
    updateLanguageOptions();

    // Update language options when the model selection changes.
    document.getElementById('model').addEventListener('change', updateLanguageOptions);

    // Handle enabling/disabling of translation UI.
    const enableTranslationCheckbox = document.getElementById('enableTranslation');
    const translationContainer = document.getElementById('translation-container');
    const targetLanguageContainer = document.getElementById('targetLanguageContainer');

    const toggleTranslationUI = () => {
      const displayValue = enableTranslationCheckbox.checked ? 'block' : 'none';
      translationContainer.style.display = displayValue;
      targetLanguageContainer.style.display = displayValue;
    };
    enableTranslationCheckbox.addEventListener('change', toggleTranslationUI);
    // Initialize UI based on default checkbox state.
    toggleTranslationUI();

    // Set up Reset button to clear both text boxes.
    document.getElementById('reset').addEventListener('click', () => {
      document.getElementById('source-text').textContent = '';
      document.getElementById('translated-text').textContent = '';
    });
  });
}
