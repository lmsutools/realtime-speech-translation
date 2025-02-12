import { initializeUI, updateSourceLanguageDropdown } from './modules/ui.js';
import { startRecording, stopRecording } from './modules/recording.js';
import { ipcRenderer } from 'electron';

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

document.getElementById('typingAppButton').addEventListener('click', () => {
    console.log('Typing App button clicked');
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

// Perform initial validation on startup
document.addEventListener('DOMContentLoaded', () => {
    updateDeepgramValidationStatus();
});
