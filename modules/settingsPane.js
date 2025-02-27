import { ipcRenderer } from 'electron';
import { appState } from '../stores/appState.js';
import { populateInputDevices } from './devices.js';

function debounce(func, wait) {
  let timeout;
  return function (...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
}

async function validateDeepgramToken(apiKey) {
  if (!apiKey) return { status: "not_set", message: "Deepgram API key is not set." };
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
  const generalPane = document.getElementById('general');
  generalPane.innerHTML = `
    <div class="setting-group">
      <label for="inputDeviceSettings">Input Device:</label>
      <select id="inputDeviceSettings"></select>
    </div>
    <div class="setting-group">
      <label for="autoStopTimer">Auto-Stop Timer (minutes):</label>
      <input type="number" id="autoStopTimer" min="1" value="60">
    </div>
  `;
  const inputDeviceSettingsSelect = document.getElementById('inputDeviceSettings');
  const autoStopTimerInput = document.getElementById('autoStopTimer');
  const defaultInputDevice = await ipcRenderer.invoke('store-get', 'defaultInputDevice', '');
  await populateInputDevices('inputDeviceSettings');
  if (defaultInputDevice) inputDeviceSettingsSelect.value = defaultInputDevice;
  const autoStopTimer = await ipcRenderer.invoke('store-get', 'autoStopTimer', 60);
  autoStopTimerInput.value = autoStopTimer;
}

export async function saveSettings() {
  const inputDeviceSettingsSelect = document.getElementById('inputDeviceSettings');
  const autoStopTimerInput = document.getElementById('autoStopTimer');
  if (inputDeviceSettingsSelect) {
    ipcRenderer.invoke('store-set', 'defaultInputDevice', inputDeviceSettingsSelect.value);
  }
  if (autoStopTimerInput) {
    ipcRenderer.invoke('store-set', 'autoStopTimer', autoStopTimerInput.value);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const inputDeviceSettingsSelect = document.getElementById('inputDeviceSettings');
  const autoStopTimerInput = document.getElementById('autoStopTimer');
  await loadSettings();
  if (inputDeviceSettingsSelect) inputDeviceSettingsSelect.addEventListener('change', saveSettings);
  if (autoStopTimerInput) autoStopTimerInput.addEventListener('change', saveSettings);

  const tabButtons = document.querySelectorAll('.tab-button');
  const tabPanes = document.querySelectorAll('.tab-pane');

  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabPanes.forEach(pane => pane.classList.remove('active'));

      button.classList.add('active');
      const tabId = button.dataset.tab;
      const targetPane = document.getElementById(tabId);
      if (targetPane) {
        targetPane.classList.add('active');
      } else {
        console.error(`Tab pane with ID '${tabId}' not found`);
      }
    });
  });

  document.querySelector('.close-settings').addEventListener('click', () => {
    document.querySelector('.settings-panel').classList.remove('visible');
  });
});
