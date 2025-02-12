import { populateInputDevices } from '../devices.js';
import { ipcRenderer } from 'electron';
import { loadProviderSettings, saveProviderSettings, initializeProviderSettingsUI } from './providerSettings.js';
import { initializeSettingsUI } from './uiSettings.js'

export function loadSettings() {
    const modelSelect = document.getElementById('model');
    const inputDeviceSettingsSelect = document.getElementById('inputDeviceSettings');
    const diarizationSettingsCheckbox = document.getElementById('diarizationSettings');
    const enableTranslationSettingsCheckbox = document.getElementById('enableTranslationSettings');
    const deepgramApiKeyInput = document.getElementById('deepgramApiKey');

    modelSelect.value = localStorage.getItem('model') || 'nova-2';
    populateInputDevices('inputDeviceSettings');
    const savedDevice = localStorage.getItem('defaultInputDevice');
    if (savedDevice) {
        inputDeviceSettingsSelect.value = savedDevice;
    }
    diarizationSettingsCheckbox.checked = localStorage.getItem('diarizationEnabled') === 'true';
    enableTranslationSettingsCheckbox.checked = localStorage.getItem('enableTranslation') === 'true';
    deepgramApiKeyInput.value = localStorage.getItem('deepgramApiKey') || '';

    // Load Translate Tab Settings - load defaults - call last for dependency order
    loadProviderSettings(); // From providerSettings.js

}

export function saveSettings() {
    const modelSelect = document.getElementById('model');
    const inputDeviceSettingsSelect = document.getElementById('inputDeviceSettings');
    const diarizationSettingsCheckbox = document.getElementById('diarizationSettings');
    const enableTranslationSettingsCheckbox = document.getElementById('enableTranslationSettings');
    const deepgramApiKeyInput = document.getElementById('deepgramApiKey');

    if (modelSelect) {
        localStorage.setItem('model', modelSelect.value);
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

    saveProviderSettings(); // Save from providerSettings.js

}

document.addEventListener('DOMContentLoaded', () => {
    const modelSelect = document.getElementById('model');
    const inputDeviceSettingsSelect = document.getElementById('inputDeviceSettings');
    const diarizationSettingsCheckbox = document.getElementById('diarizationSettings');
    const enableTranslationSettingsCheckbox = document.getElementById('enableTranslationSettings');
    const deepgramApiKeyInput = document.getElementById('deepgramApiKey');

    initializeSettingsUI(); // Initialize UI elements common to all tabs

    // --- Speech Tab Event Listeners ---
    if (modelSelect) {
        modelSelect.addEventListener('change', () => {
            saveSettings();
            ipcRenderer.send('model-setting-changed', modelSelect.value);
        });
    }
    if (inputDeviceSettingsSelect) inputDeviceSettingsSelect.addEventListener('change', saveSettings);
    if (diarizationSettingsCheckbox) diarizationSettingsCheckbox.addEventListener('change', saveSettings);
    if (enableTranslationSettingsCheckbox) enableTranslationSettingsCheckbox.addEventListener('change', saveSettings);
    if (deepgramApiKeyInput) deepgramApiKeyInput.addEventListener('input', saveSettings);

    initializeProviderSettingsUI(); // Initialize the provider-specific UI elements and event listeners.

    loadSettings();
});
