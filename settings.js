import { populateInputDevices } from './modules/devices.js';

document.addEventListener('DOMContentLoaded', () => {
    const modelSelect = document.getElementById('model');
    const defaultSourceLanguageSelect = document.getElementById('defaultSourceLanguage');
    const defaultTargetLanguageSelect = document.getElementById('defaultTargetLanguage');
    const inputDeviceSettingsSelect = document.getElementById('inputDeviceSettings');
    const diarizationSettingsCheckbox = document.getElementById('diarizationSettings');
    const enableTranslationSettingsCheckbox = document.getElementById('enableTranslationSettings');
    const saveSettingsButton = document.getElementById('saveSettingsButton');


     const targetLanguageOptions = [  //Target options
        { value: 'en', text: 'English' },
        { value: 'es', text: 'Spanish' },
        { value: 'zh', text: 'Chinese Simplified' }
    ];

    // Populate Source Language Options (Consider moving this to a separate function)
    const sourceLanguageOptions = [
        { value: 'en-US', text: 'English (US)' },
        { value: 'es-ES', text: 'Spanish (Spain)' },
        { value: 'zh', text: 'Chinese Mandarin Simplified' },
        { value: 'multi', text: 'Multi (English + Spanish)' }
    ];
    sourceLanguageOptions.forEach(opt => {
        const optionElement = document.createElement('option');
        optionElement.value = opt.value;
        optionElement.text = opt.text;
        defaultSourceLanguageSelect.appendChild(optionElement);
    });

     targetLanguageOptions.forEach(opt => {  //populate target
        const optionElement = document.createElement('option');
        optionElement.value = opt.value;
        optionElement.text = opt.text;
        defaultTargetLanguageSelect.appendChild(optionElement);
    });

    function updateLanguageOptionsByModel(languageSelect, model) {
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

    }

   // Save settings
    function saveSettings() {
        // Check if each element exists before accessing its properties
        if (modelSelect) {
            localStorage.setItem('model', modelSelect.value);
        }
        if (defaultSourceLanguageSelect) {
            localStorage.setItem('defaultSourceLanguage', defaultSourceLanguageSelect.value);
        }
        if (defaultTargetLanguageSelect) {
            localStorage.setItem('defaultTargetLanguage', defaultTargetLanguageSelect.value);
        }
        if (inputDeviceSettingsSelect) {
            localStorage.setItem('defaultInputDevice', inputDeviceSettingsSelect.value);
        }
        if (diarizationSettingsCheckbox) {
            localStorage.setItem('diarizationEnabled', diarizationSettingsCheckbox.checked);
        }
        if (enableTranslationSettingsCheckbox) {
            localStorage.setItem('enableTranslation', enableTranslationSettingsCheckbox.checked);
        }

        // Update language options when model changes (if modelSelect exists)
        if (modelSelect && defaultSourceLanguageSelect) {
            updateLanguageOptionsByModel(defaultSourceLanguageSelect, modelSelect.value);
        }
    }

    // Load settings
    function loadSettings() {
        // Load Model and update languages
        const savedModel = localStorage.getItem('model') || 'nova-2';
        modelSelect.value = savedModel;
        updateLanguageOptionsByModel(defaultSourceLanguageSelect, savedModel);
        defaultSourceLanguageSelect.value = localStorage.getItem('defaultSourceLanguage') || 'multi'; //Default
        defaultTargetLanguageSelect.value = localStorage.getItem('defaultTargetLanguage') || 'en';

        populateInputDevices('inputDeviceSettings');
        inputDeviceSettingsSelect.value = localStorage.getItem('defaultInputDevice') || ''; // No fallback
        diarizationSettingsCheckbox.checked = localStorage.getItem('diarizationEnabled') === 'true';
        enableTranslationSettingsCheckbox.checked = localStorage.getItem('enableTranslation') === 'true'; //Here no problem
    }


    // Event listeners for changes
    modelSelect.addEventListener('change', saveSettings);
    defaultSourceLanguageSelect.addEventListener('change', saveSettings);
    defaultTargetLanguageSelect.addEventListener('change', saveSettings);
    inputDeviceSettingsSelect.addEventListener('change', saveSettings);
    diarizationSettingsCheckbox.addEventListener('change', saveSettings);
    enableTranslationSettingsCheckbox.addEventListener('change', saveSettings);
     //Update language by model
     modelSelect.addEventListener('change', () => updateLanguageOptionsByModel(defaultSourceLanguageSelect, modelSelect.value));

    // Explicit Save Button
    saveSettingsButton.addEventListener('click', saveSettings);


    // Initial loading
    loadSettings();
});
