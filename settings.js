import { populateInputDevices } from './modules/devices.js';
import { ipcRenderer } from 'electron';

document.addEventListener('DOMContentLoaded', () => {
    const modelSelect = document.getElementById('model');
    const inputDeviceSettingsSelect = document.getElementById('inputDeviceSettings');
    const diarizationSettingsCheckbox = document.getElementById('diarizationSettings');
    const enableTranslationSettingsCheckbox = document.getElementById('enableTranslationSettings');
    const deepgramApiKeyInput = document.getElementById('deepgramApiKey');

    // Load settings
    function loadSettings() {
        modelSelect.value = localStorage.getItem('model') || 'nova-2';
        populateInputDevices('inputDeviceSettings');
        const savedDevice = localStorage.getItem('defaultInputDevice');
        if (savedDevice) {
            inputDeviceSettingsSelect.value = savedDevice;
        }
        diarizationSettingsCheckbox.checked = localStorage.getItem('diarizationEnabled') === 'true';
        enableTranslationSettingsCheckbox.checked = localStorage.getItem('enableTranslation') === 'true';
        deepgramApiKeyInput.value = localStorage.getItem('deepgramApiKey') || '';
    }

    // Save settings
    function saveSettings() {
        let modelChanged = false; // Flag to check if the model actually changed
        if (modelSelect) {
            const previousModel = localStorage.getItem('model');
            localStorage.setItem('model', modelSelect.value);
            if (previousModel !== modelSelect.value) {
                modelChanged = true; // Model has changed
            }
        }
        if (inputDeviceSettingsSelect) {
            localStorage.setItem('defaultInputDevice', inputDeviceSettingsSelect.value);
        }
        if (diarizationSettingsCheckbox) {
            localStorage.setItem('diarizationEnabled', diarizationSettingsCheckbox.checked);
        }
        if (enableTranslationSettingsCheckbox) {
            localStorage.setItem('enableTranslation', enableTranslationSettingsCheckbox.checked);
            ipcRenderer.send('translation-setting-changed', enableTranslationSettingsCheckbox.checked);
        }
        if (deepgramApiKeyInput) {
            localStorage.setItem('deepgramApiKey', deepgramApiKeyInput.value);
        }

        if (modelChanged && modelSelect) {
            // Send message to main process to update source languages in main window
            ipcRenderer.send('model-setting-changed', modelSelect.value);
        }
    }

    // Event listeners
    modelSelect.addEventListener('change', saveSettings);
    inputDeviceSettingsSelect.addEventListener('change', saveSettings);
    diarizationSettingsCheckbox.addEventListener('change', saveSettings);
    enableTranslationSettingsCheckbox.addEventListener('change', saveSettings);
    deepgramApiKeyInput.addEventListener('input', saveSettings);

    // Initial loading
    loadSettings();
});
