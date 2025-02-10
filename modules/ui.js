import { populateInputDevices } from './devices.js';

function updateLanguageOptions(languageSelect, model) {
    languageSelect.innerHTML = ''; // Clear existing options

    const options = (model === 'nova-2') ? [
        { value: 'en-US', text: 'English (US)' },
        { value: 'es-ES', text: 'Spanish (Spain)' },
        { value: 'zh', text: 'Chinese Mandarin Simplified' },
        { value: 'multi', text: 'Multi (English + Spanish)' }
    ] : [
        { value: 'en', text: 'English' } // nova-3 only supports English
    ];

    options.forEach(opt => {
        const optionElement = document.createElement('option');
        optionElement.value = opt.value;
        optionElement.text = opt.text;
        languageSelect.appendChild(optionElement);
    });
    if(model === 'nova-2') languageSelect.value = 'multi'
}

function applySettingsToUI() {
    const defaultSourceLanguage = localStorage.getItem('defaultSourceLanguage') || 'multi';
    const defaultTargetLanguage = localStorage.getItem('defaultTargetLanguage') || 'en';
    const enableTranslation = localStorage.getItem('enableTranslation') === 'true'; // Get from localStorage
    const model = localStorage.getItem('model') || 'nova-2';

    // Set values in UI for Source and Target Language selects
    updateLanguageOptions(document.getElementById('sourceLanguage'), model);
    document.getElementById('sourceLanguage').value = defaultSourceLanguage;

    const targetLanguageSelect = document.getElementById('targetLanguage');
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
    targetLanguageSelect.value = defaultTargetLanguage;


    // --- Translation Toggle ---
    const translationContainer = document.getElementById('translated-text').parentNode;
    const toggleTranslationUI = () => {
        // Use the enableTranslation variable from localStorage
        const displayValue = enableTranslation ? 'block' : 'none';
        translationContainer.style.display = displayValue;
    };
    toggleTranslationUI(); // Call immediately to set initial state
}

export function initializeUI() {
    document.addEventListener('DOMContentLoaded', () => {
        // Set up Reset button.
        document.getElementById('reset').addEventListener('click', () => {
            document.getElementById('source-text').textContent = '';
            document.getElementById('translated-text').textContent = '';
        });

        applySettingsToUI();
    });
}

