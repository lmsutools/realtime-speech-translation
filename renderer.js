// --- This is now a "Dumb" View Script ---
// Its only job is to define UI utility functions and handle simple, non-stateful events.

// Define UI utilities on a global object so the bridge can call them.
window.rendererUtils = {
    updateToggleButton: (buttonId, isEnabled) => {
        const button = document.getElementById(buttonId);
        if (button) {
            if (isEnabled) button.classList.add('active');
            else button.classList.remove('active');
        }
    },
    validateDeepgramToken: async (apiKey) => {
        if (!apiKey) { return { status: "not_set", message: "Deepgram API key is not set. Please set it in settings." }; }
        try {
            const response = await fetch("https://api.deepgram.com/v1/auth/token", { headers: { "Authorization": `Token ${apiKey}` } });
            if (response.ok) return { status: "valid" };
            const errorData = await response.json();
            return { status: "invalid", message: `Deepgram API Key is invalid: ${errorData.err_msg || 'Unknown error'}` };
        } catch (error) {
            return { status: "invalid", message: `Error validating Deepgram API key: ${error.message}` };
        }
    },
    updateDeepgramValidationStatus: async () => {
        const { ipcRenderer } = window.require('electron');
        const apiKey = await ipcRenderer.invoke('store-get', 'deepgramApiKey', ''); // Get latest from store for validation
        const result = await window.rendererUtils.validateDeepgramToken(apiKey);
        const sourceTextElement = document.getElementById('source-text');
        const startButton = document.getElementById('start');
        if (result.status === "valid") { sourceTextElement.textContent = ''; startButton.disabled = false; }
        else { sourceTextElement.textContent = result.message; startButton.disabled = true; }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    console.log('Renderer DOM Loaded. UI elements are ready.');
    const { ipcRenderer } = window.require('electron');
    const ui = window.ui || {};

    // Initialize non-stateful UI components
    if (ui.initializeUI) {
        ui.initializeUI();
    }

    // --- These event listeners are "safe" because they only send IPC messages ---
    document.getElementById('typingAppButton')?.addEventListener('click', () => { ipcRenderer.send('open-typing-app'); });
    document.getElementById('settingsIcon')?.addEventListener('click', () => { document.querySelector('.settings-panel').classList.add('visible'); });
    
    document.getElementById('toggleDiarize')?.addEventListener('click', async () => {
        const currentState = await ipcRenderer.invoke('store-get', 'diarizationEnabled', false);
        await ipcRenderer.invoke('store-set', 'diarizationEnabled', !currentState);
    });
    
    document.getElementById('toggleTranslate')?.addEventListener('click', async () => {
        const currentState = await ipcRenderer.invoke('store-get', 'enableTranslation', false);
        await ipcRenderer.invoke('store-set', 'enableTranslation', !currentState);
    });
});
