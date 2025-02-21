import { populateInputDevices } from '../devices.js';
import { ipcRenderer } from 'electron';
import { appState } from '../../stores/appState.js';
import { loadProviderSettings, saveProviderSettings, initializeProviderSettingsUI } from './providerSettings.js';
import { initializeSettingsUI } from './uiSettings.js';

function debounce(func, wait) {
  let timeout;
  return function (...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
}

async function validateDeepgramToken(apiKey) {
  if (!apiKey) {
    return { status: "not_set", message: "Deepgram API key is not set." };
  }
  try {
    const response = await fetch("https://api.deepgram.com/v1/auth/token", {
      headers: { "Authorization": `Token ${apiKey}` }
    });
    if (response.ok) return { status: "valid" };
    const errorData = await response.json();
    return { status: "invalid", message: `Invalid Deepgram API Key: ${errorData.err_msg || 'Unknown error'}` };
  } catch (error) {
    return { status: "invalid", message: `Error validating Deepgram API key: ${error.message}` };
  }
}

export async function loadSettings() {
  const inputDeviceSettingsSelect = document.getElementById('inputDeviceSettings');
  const diarizationSettingsCheckbox = document.getElementById('diarizationSettings');
  const enableTranslationSettingsCheckbox = document.getElementById('enableTranslationSettings');
  const deepgramApiKeyInput = document.getElementById('deepgramApiKey');
  const autoStopTimerInput = document.getElementById('autoStopTimer');

  const defaultInputDevice = await ipcRenderer.invoke('store-get', 'defaultInputDevice', '');
  populateInputDevices('inputDeviceSettings').then(() => {
    if (defaultInputDevice) inputDeviceSettingsSelect.value = defaultInputDevice;
  });

  // Use MobX store values for settings
  diarizationSettingsCheckbox.checked = appState.diarizationEnabled;
  enableTranslationSettingsCheckbox.checked = appState.enableTranslation;
  deepgramApiKeyInput.value = appState.deepgramApiKey;
  autoStopTimerInput.value = await ipcRenderer.invoke('store-get', 'autoStopTimer', 60);

  loadProviderSettings();
}

export async function saveSettings() {
  const inputDeviceSettingsSelect = document.getElementById('inputDeviceSettings');
  const diarizationSettingsCheckbox = document.getElementById('diarizationSettings');
  const enableTranslationSettingsCheckbox = document.getElementById('enableTranslationSettings');
  const deepgramApiKeyInput = document.getElementById('deepgramApiKey');
  const autoStopTimerInput = document.getElementById('autoStopTimer');

  if (inputDeviceSettingsSelect) {
    ipcRenderer.invoke('store-set', 'defaultInputDevice', inputDeviceSettingsSelect.value);
  }
  if (diarizationSettingsCheckbox) {
    appState.setDiarizationEnabled(diarizationSettingsCheckbox.checked);
  }
  if (enableTranslationSettingsCheckbox) {
    appState.setEnableTranslation(enableTranslationSettingsCheckbox.checked);
    ipcRenderer.send('translation-setting-changed', enableTranslationSettingsCheckbox.checked);
  }
  if (deepgramApiKeyInput) {
    appState.setDeepgramApiKey(deepgramApiKeyInput.value);
  }
  if (autoStopTimerInput) {
    ipcRenderer.invoke('store-set', 'autoStopTimer', autoStopTimerInput.value);
  }
  saveProviderSettings();
  const apiKey = deepgramApiKeyInput.value;
  const result = await validateDeepgramToken(apiKey);
  ipcRenderer.send('deepgram-validation-result', result);
}

document.addEventListener('DOMContentLoaded', async () => {
  const inputDeviceSettingsSelect = document.getElementById('inputDeviceSettings');
  const diarizationSettingsCheckbox = document.getElementById('diarizationSettings');
  const enableTranslationSettingsCheckbox = document.getElementById('enableTranslationSettings');
  const deepgramApiKeyInput = document.getElementById('deepgramApiKey');
  const autoStopTimerInput = document.getElementById('autoStopTimer');

  initializeSettingsUI();

  if (inputDeviceSettingsSelect) inputDeviceSettingsSelect.addEventListener('change', saveSettings);
  if (diarizationSettingsCheckbox) diarizationSettingsCheckbox.addEventListener('change', saveSettings);
  if (enableTranslationSettingsCheckbox) enableTranslationSettingsCheckbox.addEventListener('change', saveSettings);
  if (deepgramApiKeyInput) {
    const debouncedSaveSettings = debounce(saveSettings, 500);
    deepgramApiKeyInput.addEventListener('input', debouncedSaveSettings);
  }
  if (autoStopTimerInput) autoStopTimerInput.addEventListener('change', saveSettings);
  initializeProviderSettingsUI();
  await loadSettings();
});

import './typingApp.js'; // Ensure Typing App settings are included
