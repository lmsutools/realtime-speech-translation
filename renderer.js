// file: renderer.js
import { initializeUI, updateSourceLanguageDropdown, updateTranslationUI } from './modules/ui.js';
import { startRecording, stopRecording, resetRecordingData, preserveCurrentContent } from './modules/recording.js';
import { ipcRenderer } from 'electron';
import { appState } from './stores/appState.js';
import './modules/settingsPane.js';
import './modules/providerSettingsPane.js';
import './modules/typingAppPane.js';

async function validateDeepgramToken(apiKey) {
  if (!apiKey) {
    return { status: "not_set", message: "Deepgram API key is not set. Please set it in settings." };
  }
  try {
    const response = await fetch("https://api.deepgram.com/v1/auth/token", {
      headers: {
        "Authorization": `Token ${apiKey}`
      }
    });
    if (response.ok) return { status: "valid" };
    const errorData = await response.json();
    return { status: "invalid", message: `Deepgram API Key is invalid: ${errorData.err_msg || 'Unknown error'}` };
  } catch (error) {
    return { status: "invalid", message: `Error validating Deepgram API key: ${error.message}` };
  }
}

async function updateDeepgramValidationStatus() {
  const deepgramApiKey = await ipcRenderer.invoke('store-get', 'deepgramApiKey', '');
  const result = await validateDeepgramToken(deepgramApiKey);
  const sourceTextElement = document.getElementById('source-text');
  const startButton = document.getElementById('start');
  if (result.status === "valid") {
    sourceTextElement.textContent = '';
    startButton.disabled = false;
  } else {
    sourceTextElement.textContent = result.message;
    startButton.disabled = true;
  }
}

function updateToggleButton(buttonId, isEnabled) {
  const button = document.getElementById(buttonId);
  if (button) {
    if (isEnabled) button.classList.add('active');
    else button.classList.remove('active');
  }
}

initializeUI();

document.getElementById('start').addEventListener('click', () => startRecording(false));
document.getElementById('stop').addEventListener('click', stopRecording);
document.getElementById('reset').addEventListener('click', () => {
  resetRecordingData();
  document.getElementById('source-text').textContent = 'Reset complete';
  document.getElementById('translated-text').textContent = '';
  ipcRenderer.send('reset-typing-app');
  setTimeout(() => {
    document.getElementById('source-text').textContent = '';
  }, 2000);
});
document.getElementById('typingAppButton').addEventListener('click', () => {
  console.log('[Renderer] Typing App button clicked');
  document.getElementById('pasteOption').value = 'source';
  ipcRenderer.send('open-typing-app');
});
document.getElementById('settingsIcon').addEventListener('click', () => {
  document.querySelector('.settings-panel').classList.add('visible');
});

document.addEventListener('DOMContentLoaded', async () => {
  const toggleDiarize = document.getElementById('toggleDiarize');
  const toggleTranslate = document.getElementById('toggleTranslate');
  const diarizationEnabled = await ipcRenderer.invoke('store-get', 'diarizationEnabled', false);
  const enableTranslation = await ipcRenderer.invoke('store-get', 'enableTranslation', false);
  appState.setDiarizationEnabled(diarizationEnabled);
  appState.setEnableTranslation(enableTranslation);
  updateToggleButton('toggleDiarize', diarizationEnabled);
  updateToggleButton('toggleTranslate', enableTranslation);
  toggleDiarize.addEventListener('click', async () => {
    const oldState = appState.diarizationEnabled;
    const newState = !oldState;
    appState.setDiarizationEnabled(newState);
    ipcRenderer.invoke('store-set', 'diarizationEnabled', newState);
    updateToggleButton('toggleDiarize', newState);
    if (appState.isRecording) {
      preserveCurrentContent();
      stopRecording();
      await new Promise(resolve => setTimeout(resolve, 100));
      startRecording(true);
    }
  });
  toggleTranslate.addEventListener('click', () => {
    const newState = !appState.enableTranslation;
    appState.setEnableTranslation(newState);
    updateToggleButton('toggleTranslate', newState);
    ipcRenderer.invoke('store-set', 'enableTranslation', newState);
    updateTranslationUI(newState);
    ipcRenderer.send('translation-setting-changed', newState);
  });
  const storedEnableTranslation = await ipcRenderer.invoke('store-get', 'enableTranslation', false);
  updateTranslationUI(storedEnableTranslation);
  updateSourceLanguageDropdown();
  updateDeepgramValidationStatus();
});

// Add missing IPC listener for global-toggle-recording event so the miniapp can toggle recording
ipcRenderer.on('global-toggle-recording', () => {
  const stopBtn = document.getElementById('stop');
  console.log(`[Renderer] Received global-toggle-recording, stopBtn display: ${stopBtn.style.display}`);
  if (stopBtn.style.display === 'block') {
    console.log('[Renderer] Stopping recording');
    stopRecording();
  } else {
    console.log('[Renderer] Starting recording');
    startRecording(false);
  }
});
