import { ipcRenderer } from 'electron';
import { appState } from '../../stores/appState.js';

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
    const response = await fetch("https://api.deepgram.com/v1/auth/token", { headers: { "Authorization": `Token ${apiKey}` } });
    if (response.ok) return { status: "valid" };
    const errorData = await response.json();
    return { status: "invalid", message: `Invalid Deepgram API Key: ${errorData.err_msg || 'Unknown error'}` };
  } catch (error) {
    return { status: "invalid", message: `Error validating Deepgram API key: ${error.message}` };
  }
}

export async function loadSettings() {
  const inputDeviceSettingsSelect = document.getElementById('inputDeviceSettings');
  const deepgramApiKeyInput = document.getElementById('deepgramApiKey');
  const autoStopTimerInput = document.getElementById('autoStopTimer');
  const defaultInputDevice = await ipcRenderer.invoke('store-get', 'defaultInputDevice', '');

  // Populate input devices
  try {
    await import('../devices.js').then(module => module.populateInputDevices('inputDeviceSettings')).then(() => {
      if (defaultInputDevice) inputDeviceSettingsSelect.value = defaultInputDevice;
    });
  } catch (error) {
    console.error('Error populating input devices:', error);
  }

  // Load values from store via IPC
  const deepgramApiKey = await ipcRenderer.invoke('store-get', 'deepgramApiKey', '');
  const autoStopTimer = await ipcRenderer.invoke('store-get', 'autoStopTimer', 60);
  console.log('[Settings] Loaded deepgramApiKey:', deepgramApiKey);

  // Update appState and UI
  const { runInAction } = require("mobx");
  runInAction(() => {
    appState.setDeepgramApiKey(deepgramApiKey);
  });
  deepgramApiKeyInput.value = deepgramApiKey;
  autoStopTimerInput.value = autoStopTimer;
}

export async function saveSettings() {
  const inputDeviceSettingsSelect = document.getElementById('inputDeviceSettings');
  const deepgramApiKeyInput = document.getElementById('deepgramApiKey');
  const autoStopTimerInput = document.getElementById('autoStopTimer');

  if (inputDeviceSettingsSelect) {
    ipcRenderer.invoke('store-set', 'defaultInputDevice', inputDeviceSettingsSelect.value);
  }
  if (deepgramApiKeyInput) {
    const value = deepgramApiKeyInput.value;
    appState.setDeepgramApiKey(value);
    ipcRenderer.invoke('store-set', 'deepgramApiKey', value);
    console.log('[Settings] Saving deepgramApiKey:', value);
  }
  if (autoStopTimerInput) {
    ipcRenderer.invoke('store-set', 'autoStopTimer', autoStopTimerInput.value);
  }

  await import('./providerSettings.js').then(module => module.saveProviderSettings());
  const apiKey = deepgramApiKeyInput.value;
  const result = await validateDeepgramToken(apiKey);
  ipcRenderer.send('deepgram-validation-result', result);
}

document.addEventListener('DOMContentLoaded', async () => {
  const inputDeviceSettingsSelect = document.getElementById('inputDeviceSettings');
  const deepgramApiKeyInput = document.getElementById('deepgramApiKey');
  const autoStopTimerInput = document.getElementById('autoStopTimer');

  await import('./uiSettings.js').then(module => module.initializeSettingsUI());
  if (inputDeviceSettingsSelect) inputDeviceSettingsSelect.addEventListener('change', saveSettings);
  if (deepgramApiKeyInput) {
    const debouncedSaveSettings = debounce(saveSettings, 500);
    deepgramApiKeyInput.addEventListener('input', debouncedSaveSettings);
  }
  if (autoStopTimerInput) autoStopTimerInput.addEventListener('change', saveSettings);

  await import('./providerSettings.js').then(module => module.initializeProviderSettingsUI());
  await loadSettings();
});

import './typingApp.js'; // Ensure Typing App settings are included
