import { populateInputDevices } from '../devices.js';
import { ipcRenderer } from 'electron';
import { getStoreValue, setStoreValue } from '../storeBridge.js';
import { loadProviderSettings, saveProviderSettings, initializeProviderSettingsUI } from './providerSettings.js';
import { initializeSettingsUI } from './uiSettings.js';

async function validateDeepgramToken(apiKey) {
  if (!apiKey) {
    return { status: "not_set", message: "Deepgram API key is not set. Please set it in settings." };
  }
  try {
    const response = await fetch("https://api.deepgram.com/v1/auth/token", {
      headers: { "Authorization": `Token ${apiKey}` }
    });
    if (response.ok) {
      return { status: "valid" };
    } else {
      const errorData = await response.json();
      return { status: "invalid", message: `Deepgram API Key is invalid: ${errorData.err_msg || 'Unknown error'}` };
    }
  } catch (error) {
    return { status: "invalid", message: `Error validating Deepgram API key: ${error.message}` };
  }
}

export async function loadSettings() {
  const modelSelect = document.getElementById('model');
  const inputDeviceSettingsSelect = document.getElementById('inputDeviceSettings');
  const diarizationSettingsCheckbox = document.getElementById('diarizationSettings');
  const enableTranslationSettingsCheckbox = document.getElementById('enableTranslationSettings');
  const deepgramApiKeyInput = document.getElementById('deepgramApiKey');

  // Use storeBridge to load persistent settings with defaults
  const model = await getStoreValue('model', 'nova-2');
  modelSelect.value = model;
  const defaultInputDevice = await getStoreValue('defaultInputDevice', '');
  populateInputDevices('inputDeviceSettings').then(() => {
    if (defaultInputDevice) {
      inputDeviceSettingsSelect.value = defaultInputDevice;
    }
  });
  const diarizationEnabled = await getStoreValue('diarizationEnabled', false);
  diarizationSettingsCheckbox.checked = diarizationEnabled;
  const enableTranslation = await getStoreValue('enableTranslation', false);
  enableTranslationSettingsCheckbox.checked = enableTranslation;
  const deepgramApiKey = await getStoreValue('deepgramApiKey', '');
  deepgramApiKeyInput.value = deepgramApiKey;

  // Load Translate Tab Settings
  loadProviderSettings();
}

export async function saveSettings() {
  const modelSelect = document.getElementById('model');
  const inputDeviceSettingsSelect = document.getElementById('inputDeviceSettings');
  const diarizationSettingsCheckbox = document.getElementById('diarizationSettings');
  const enableTranslationSettingsCheckbox = document.getElementById('enableTranslationSettings');
  const deepgramApiKeyInput = document.getElementById('deepgramApiKey');

  if (modelSelect) {
    await setStoreValue('model', modelSelect.value);
  }
  if (inputDeviceSettingsSelect) {
    await setStoreValue('defaultInputDevice', inputDeviceSettingsSelect.value);
  }
  if (diarizationSettingsCheckbox) {
    await setStoreValue('diarizationEnabled', diarizationSettingsCheckbox.checked);
  }
  if (enableTranslationSettingsCheckbox) {
    await setStoreValue('enableTranslation', enableTranslationSettingsCheckbox.checked);
    ipcRenderer.send('translation-setting-changed', enableTranslationSettingsCheckbox.checked);
  }
  if (deepgramApiKeyInput) {
    await setStoreValue('deepgramApiKey', deepgramApiKeyInput.value);
  }

  saveProviderSettings();

  const apiKey = deepgramApiKeyInput.value;
  const result = await validateDeepgramToken(apiKey);
  ipcRenderer.send('deepgram-validation-result', result);
}

document.addEventListener('DOMContentLoaded', async () => {
  const modelSelect = document.getElementById('model');
  const inputDeviceSettingsSelect = document.getElementById('inputDeviceSettings');
  const diarizationSettingsCheckbox = document.getElementById('diarizationSettings');
  const enableTranslationSettingsCheckbox = document.getElementById('enableTranslationSettings');
  const deepgramApiKeyInput = document.getElementById('deepgramApiKey');

  initializeSettingsUI();

  if (modelSelect) {
    modelSelect.addEventListener('change', () => {
      saveSettings();
      ipcRenderer.send('model-setting-changed', modelSelect.value);
    });
  }
  if (inputDeviceSettingsSelect) {
    inputDeviceSettingsSelect.addEventListener('change', saveSettings);
  }
  if (diarizationSettingsCheckbox) {
    diarizationSettingsCheckbox.addEventListener('change', saveSettings);
  }
  if (enableTranslationSettingsCheckbox) {
    enableTranslationSettingsCheckbox.addEventListener('change', saveSettings);
  }
  if (deepgramApiKeyInput) {
    deepgramApiKeyInput.addEventListener('input', saveSettings);
  }

  initializeProviderSettingsUI();
  await loadSettings();
});

// NEW: Import Typing App Settings logic
import './typingApp.js';
