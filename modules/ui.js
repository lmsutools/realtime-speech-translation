import { populateInputDevices } from './devices.js';

// Function to update the translation UI
export function updateTranslationUI(enableTranslation) {
    const translationContainer = document.getElementById('translated-text').parentNode;
    const targetLanguageSelect = document.getElementById('targetLanguage');
    const arrowSpan = document.querySelector('.arrow');

    const displayValue = enableTranslation ? 'block' : 'none';
    translationContainer.style.display = displayValue;
    targetLanguageSelect.style.display = displayValue;
    arrowSpan.style.display = displayValue;
}

// New function to update ONLY the source language dropdown
export function updateSourceLanguageDropdown(model) {
    const sourceLanguageSelect = document.getElementById('sourceLanguage');
    updateLanguageOptions(sourceLanguageSelect, model); // Populate options based on model

    // Set default source language based on model
    if (model === 'nova-3') {
        sourceLanguageSelect.value = 'en';
        localStorage.setItem('sourceLanguage', 'en'); // Update localStorage too
    } else if (model === 'nova-2') {
        sourceLanguageSelect.value = 'multi';
        localStorage.setItem('sourceLanguage', 'multi'); //Update local storage too
    }
}


function updateLanguageOptions(languageSelect, model) {
    languageSelect.innerHTML = '';

    const options = (model === 'nova-2') ? [
        { value: 'en-US', text: 'English (US)' },
        { value: 'es-ES', text: 'Spanish (Spain)' },
        { value: 'zh', text: 'Chinese Mandarin Simplified' },
        { value: 'multi', text: 'Multi (English + Spanish)' }
    ] : [
        { value: 'en', text: 'English' }
    ];

    options.forEach(opt => {
        const optionElement = document.createElement('option');
        optionElement.value = opt.value;
        optionElement.text = opt.text;
        languageSelect.appendChild(optionElement);
    });
}

function applySettingsToUI() {
    const enableTranslation = localStorage.getItem('enableTranslation') === 'true';
    const model = localStorage.getItem('model') || 'nova-2';

    // --- Source Language ---
    const sourceLanguageSelect = document.getElementById('sourceLanguage');
    updateLanguageOptions(sourceLanguageSelect, model);
    sourceLanguageSelect.value = localStorage.getItem('sourceLanguage') || (model === 'nova-2' ? 'multi' : 'en');
    localStorage.setItem('sourceLanguage', sourceLanguageSelect.value);

    // --- Target Language ---
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
    targetLanguageSelect.value = localStorage.getItem('targetLanguage') || 'en';
    localStorage.setItem('targetLanguage', targetLanguageSelect.value);

    // --- Translation Toggle ---
    updateTranslationUI(enableTranslation);
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

