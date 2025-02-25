import { initializeUI, updateSourceLanguageDropdown, updateTranslationUI } from './modules/ui.js';
import { startRecording, stopRecording, resetRecordingData } from './modules/recording.js';
import { ipcRenderer } from 'electron';
import { appState } from './stores/appState.js';

async function validateDeepgramToken(apiKey) {
  if (!apiKey) {
    return { status: "not_set", message: "Deepgram API key is not set. Please set it in settings." };
  }
  try {
    const response = await fetch("https://api.deepgram.com/v1/auth/token", { headers: { "Authorization": `Token ${apiKey}` } });
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

function updateToggleButton(buttonId, isEnabled) {
  const button = document.getElementById(buttonId);
  if (button) {
    if (isEnabled) {
      button.classList.add('active');
    } else {
      button.classList.remove('active');
    }
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

// Toggle button event listeners for top-bar buttons
document.addEventListener('DOMContentLoaded', async () => {
  const toggleDiarize = document.getElementById('toggleDiarize');
  const toggleTranslate = document.getElementById('toggleTranslate');

  // Load saved states from electron-store via IPC
  const diarizationEnabled = await ipcRenderer.invoke('store-get', 'diarizationEnabled', false);
  const enableTranslation = await ipcRenderer.invoke('store-get', 'enableTranslation', false);

  appState.setDiarizationEnabled(diarizationEnabled);
  appState.setEnableTranslation(enableTranslation);

  // Initialize toggle UI states
  updateToggleButton('toggleDiarize', diarizationEnabled);
  updateToggleButton('toggleTranslate', enableTranslation);

  toggleDiarize.addEventListener('click', () => {
    const newState = !appState.diarizationEnabled;
    appState.setDiarizationEnabled(newState);
    updateToggleButton('toggleDiarize', newState);
    ipcRenderer.invoke('store-set', 'diarizationEnabled', newState); // Persist to store
  });

  toggleTranslate.addEventListener('click', () => {
    const newState = !appState.enableTranslation;
    appState.setEnableTranslation(newState);
    updateToggleButton('toggleTranslate', newState);
    ipcRenderer.invoke('store-set', 'enableTranslation', newState); // Persist to store
    updateTranslationUI(newState); // Update UI visibility
    ipcRenderer.send('translation-setting-changed', newState); // Notify main process
  });

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

ipcRenderer.on('update-app-state', (event, data) => {
  if (typeof data.enableTranslation !== 'undefined') {
    appState.setEnableTranslation(data.enableTranslation);
    console.log(`[Renderer] Received update-app-state, appState.enableTranslation: ${data.enableTranslation}`);
  }
});
