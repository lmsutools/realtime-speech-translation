import { initializeUI, updateSourceLanguageDropdown, updateTranslationUI } from './modules/ui.js';
import { startRecording, stopRecording, resetRecordingData } from './modules/recording.js';
import { ipcRenderer } from 'electron';
import { appState } from './stores/appState.js';

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
    }
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

initializeUI();

document.getElementById('start').addEventListener('click', startRecording);
document.getElementById('stop').addEventListener('click', stopRecording);
document.getElementById('reset').addEventListener('click', () => {
  resetRecordingData();
  document.getElementById('source-text').textContent = 'Reset complete';
  document.getElementById('translated-text').textContent = '';
  ipcRenderer.send('reset-typing-app');
  setTimeout(() => { document.getElementById('source-text').textContent = ''; }, 2000);
});

document.getElementById('typingAppButton').addEventListener('click', () => {
  console.log('[Renderer] Typing App button clicked');
  document.getElementById('pasteOption').value = 'source';
  ipcRenderer.send('open-typing-app');
});

document.getElementById('settingsIcon').addEventListener('click', () => {
  ipcRenderer.send('open-settings');
});

ipcRenderer.on('update-translation-ui', (event, enableTranslation) => {
  import('./modules/ui.js').then(ui => {
    ui.updateTranslationUI(enableTranslation);
  });
});

ipcRenderer.on('update-source-languages', (event, selectedModel) => {
  updateSourceLanguageDropdown(selectedModel);
});

ipcRenderer.on('deepgram-validation-result', (event, result) => {
  updateDeepgramValidationStatus();
});

ipcRenderer.on('global-toggle-recording', () => {
  const stopBtn = document.getElementById('stop');
  console.log(`[Renderer] Received global-toggle-recording, stopBtn display: ${stopBtn.style.display}`);
  if (stopBtn.style.display === 'block') {
    console.log('[Renderer] Stopping recording');
    stopRecording();
  } else {
    console.log('[Renderer] Starting recording');
    startRecording();
  }
});

ipcRenderer.on('typing-app-window-closed', () => {
  console.log('[Renderer] Typing App closed -> stopping recording, if active');
  stopRecording();
});

// Load stored enableTranslation on startup and update UI accordingly
document.addEventListener('DOMContentLoaded', async () => {
  const storedEnableTranslation = await ipcRenderer.invoke('store-get', 'enableTranslation', false);
  appState.setEnableTranslation(storedEnableTranslation);
  console.log(`[Renderer] Initialized appState.enableTranslation to: ${storedEnableTranslation}`);
  updateTranslationUI(storedEnableTranslation);
  updateDeepgramValidationStatus();
  const sourceLanguageSelect = document.getElementById('sourceLanguage');
  if (sourceLanguageSelect) {
    sourceLanguageSelect.addEventListener('change', () => {
      const stopBtn = document.getElementById('stop');
      if (stopBtn.style.display === 'block') {
        stopRecording();
        setTimeout(() => { startRecording(); }, 1000);
      }
    });
  }
});

// Listen for state updates from main
ipcRenderer.on('update-app-state', (event, data) => {
  if (typeof data.enableTranslation !== 'undefined') {
    appState.setEnableTranslation(data.enableTranslation);
    console.log(`[Renderer] Received update-app-state, appState.enableTranslation: ${data.enableTranslation}`);
  }
});
