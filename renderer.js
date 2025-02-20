import { initializeUI, updateSourceLanguageDropdown } from './modules/ui.js';
import { startRecording, stopRecording, resetRecordingData } from './modules/recording.js';
import { ipcRenderer } from 'electron';

async function validateDeepgramToken(apiKey) {
    if (!apiKey) {
        return {status: "not_set", message: "Deepgram API key is not set. Please set it in settings."};
    }
    try {
        const response = await fetch("https://api.deepgram.com/v1/auth/token", {headers: { "Authorization": `Token ${apiKey}` }});
        if (response.ok) {
            return { status: "valid" };
        } else {
            const errorData = await response.json();
            return {status: "invalid", message: `Deepgram API Key is invalid: ${errorData.err_msg || 'Unknown error'}`};
        }
    } catch (error) {
        return {status: "invalid", message: `Error validating Deepgram API key: ${error.message}`};
    }
}

async function updateDeepgramValidationStatus() {
    const apiKey = localStorage.getItem('deepgramApiKey');
    const result = await validateDeepgramToken(apiKey);
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
    resetRecordingData(); // Clear internal recording data
    document.getElementById('source-text').textContent = 'Reset complete';
    document.getElementById('translated-text').textContent = '';
    ipcRenderer.send('reset-typing-app'); // Sync typing app reset
    setTimeout(() => {
        document.getElementById('source-text').textContent = '';
    }, 2000); // Clear feedback after 2 seconds
});

document.getElementById('typingAppButton').addEventListener('click', () => {
    console.log('Typing App button clicked');
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
    if (stopBtn.style.display === 'block') {
        stopRecording();
    } else {
        startRecording();
    }
});

const sourceTextElement = document.getElementById('source-text');
const mutationObserver = new MutationObserver(() => {
    const fullText = sourceTextElement.textContent;
    ipcRenderer.send('typing-app-transcript-updated', fullText);
});
mutationObserver.observe(sourceTextElement, { childList: true, subtree: true });

ipcRenderer.on('typing-app-window-closed', () => {
    console.log('Typing App closed -> stopping recording, if active');
    stopRecording();
});

document.addEventListener('DOMContentLoaded', () => {
    updateDeepgramValidationStatus();
    // Automatically restart transcription when source language selection changes.
    const sourceLanguageSelect = document.getElementById('sourceLanguage');
    if (sourceLanguageSelect) {
        sourceLanguageSelect.addEventListener('change', () => {
            // Check if transcription is active.
            const stopBtn = document.getElementById('stop');
            if (stopBtn.style.display === 'block') {
                stopRecording();
                // Restart after a brief delay to ensure the previous connection is fully closed.
                setTimeout(() => {
                    startRecording();
                }, 1000);
            }
        });
    }
});
