import { initializeUI, updateSourceLanguageDropdown } from './modules/ui.js';
import { startRecording, stopRecording } from './modules/recording.js';
import { ipcRenderer } from 'electron';

async function validateDeepgramToken(apiKey) {
  if (!apiKey) {
    return {
      status: "not_set",
      message: "Deepgram API key is not set. Please set it in settings."
    };
  }
  try {
    const response = await fetch("https://api.deepgram.com/v1/auth/token", {
      headers: { "Authorization": `Token ${apiKey}` }
    });
    if (response.ok) {
      return { status: "valid" };
    } else {
      const errorData = await response.json();
      return {
        status: "invalid",
        message: `Deepgram API Key is invalid: ${errorData.err_msg || 'Unknown error'}`
      };
    }
  } catch (error) {
    return {
      status: "invalid",
      message: `Error validating Deepgram API key: ${error.message}`
    };
  }
}

async function updateDeepgramValidationStatus() {
  const apiKey = localStorage.getItem('deepgramApiKey');
  const result = await validateDeepgramToken(apiKey);
  const sourceTextElement = document.getElementById('source-text');
  const startButton = document.getElementById('start');

  if (result.status === "valid") {
    sourceTextElement.textContent = ''; // Clear any previous error messages
    startButton.disabled = false; // Enable the Start button.
  } else {
    sourceTextElement.textContent = result.message;
    startButton.disabled = true; // Disable the Start button.
  }
}

initializeUI();

document.getElementById('start').addEventListener('click', startRecording);
document.getElementById('stop').addEventListener('click', stopRecording);
document.getElementById('reset').addEventListener('click', () => {
  document.getElementById('source-text').textContent = '';
  document.getElementById('translated-text').textContent = '';
});

// ---------------- NEW: Typing App Button ----------------------
document.getElementById('typingAppButton').addEventListener('click', () => {
  console.log('Typing App button clicked');
  // Force "pasteOption" to "source"
  document.getElementById('pasteOption').value = 'source';
  // Request main to open the typing app
  ipcRenderer.send('open-typing-app');
});
// -------------------------------------------------------------

document.getElementById('settingsIcon').addEventListener('click', () => {
  ipcRenderer.send('open-settings');
});

// Listen for translation UI updates
ipcRenderer.on('update-translation-ui', (event, enableTranslation) => {
  import('./modules/ui.js').then(ui => {
    ui.updateTranslationUI(enableTranslation);
  });
});

// Listen for model changes
ipcRenderer.on('update-source-languages', (event, selectedModel) => {
  updateSourceLanguageDropdown(selectedModel);
});

// Listen for Deepgram validation
ipcRenderer.on('deepgram-validation-result', (event, result) => {
  updateDeepgramValidationStatus();
});

// ---------------- NEW: Global Toggle Recording ----------------
ipcRenderer.on('global-toggle-recording', () => {
  // If currently recording, stop. Else, start.
  const stopBtn = document.getElementById('stop');
  if (stopBtn.style.display === 'block') {
    stopRecording();
  } else {
    startRecording();
  }
});

// ---------------- NEW: Send transcript to Typing App ----------
// Whenever the source text updates, forward to Typing App
// We can do this simply by an observer or hooking into the place we update text.
// One approach is hooking into 'recording.js' events, but here is a quick example:
const sourceTextElement = document.getElementById('source-text');
const mutationObserver = new MutationObserver(() => {
  const fullText = sourceTextElement.textContent;
  ipcRenderer.send('typing-app-transcript-updated', fullText);
});
mutationObserver.observe(sourceTextElement, { childList: true, subtree: true });

// If the typing app window was closed, we stop recording and restore main (per requirements).
ipcRenderer.on('typing-app-window-closed', () => {
  console.log('Typing App closed -> stopping recording, if active');
  stopRecording(); // also toggles UI
});

// Perform initial validation on startup
document.addEventListener('DOMContentLoaded', () => {
  updateDeepgramValidationStatus();
});
