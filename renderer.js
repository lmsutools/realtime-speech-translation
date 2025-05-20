// Simplified version that uses global window objects instead of imports

// Access the functions from the global window object
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Renderer initialized');
    
    // Get a reference to the electron module
    const { ipcRenderer } = window.require ? window.require('electron') : {};
    
    // Get functions from globals
    const ui = window.ui || {};
    
    // Initialize UI
    if (typeof ui.initializeUI === 'function') {
        ui.initializeUI();
    }
    
    // Validation function
    async function validateDeepgramToken(apiKey) {
        if (!apiKey) {
            return { status: "not_set", message: "Deepgram API key is not set. Please set it in settings." };
        }
        try {
            const response = await fetch("https://api.deepgram.com/v1/auth/token", {
                headers: {"Authorization": `Token ${apiKey}`}
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
    
    // Button event handlers
    document.getElementById('start')?.addEventListener('click', () => {
        // We'll trigger external startRecording function
        if (window.recording && typeof window.recording.startRecording === 'function') {
            window.recording.startRecording(false);
        } else {
            console.error('startRecording function not found');
        }
    });
    
    document.getElementById('stop')?.addEventListener('click', () => {
        if (window.recording && typeof window.recording.stopRecording === 'function') {
            window.recording.stopRecording();
        } else {
            console.error('stopRecording function not found');
        }
    });
    
    document.getElementById('reset')?.addEventListener('click', () => {
        if (window.recording && typeof window.recording.resetRecordingData === 'function') {
            window.recording.resetRecordingData();
        }
        document.getElementById('source-text').textContent = 'Reset complete';
        document.getElementById('translated-text').textContent = '';
        ipcRenderer.send('reset-typing-app');
        setTimeout(() => {
            document.getElementById('source-text').textContent = '';
        }, 2000);
    });
    
    document.getElementById('typingAppButton')?.addEventListener('click', () => {
        console.log('[Renderer] Typing App button clicked');
        document.getElementById('pasteOption').value = 'source';
        ipcRenderer.send('open-typing-app');
    });
    
    document.getElementById('settingsIcon')?.addEventListener('click', () => {
        document.querySelector('.settings-panel').classList.add('visible');
    });
    
    // Get toggle buttons
    const toggleDiarize = document.getElementById('toggleDiarize');
    const toggleTranslate = document.getElementById('toggleTranslate');
    
    // Get settings
    const diarizationEnabled = await ipcRenderer.invoke('store-get', 'diarizationEnabled', false);
    const enableTranslation = await ipcRenderer.invoke('store-get', 'enableTranslation', false);
    
    // Update app state
    if (window.appState) {
        window.appState.setDiarizationEnabled(diarizationEnabled);
        window.appState.setEnableTranslation(enableTranslation);
    }
    
    // Update UI
    function updateToggleButton(buttonId, isEnabled) {
        const button = document.getElementById(buttonId);
        if (button) {
            if (isEnabled) button.classList.add('active');
            else button.classList.remove('active');
        }
    }
    
    updateToggleButton('toggleDiarize', diarizationEnabled);
    updateToggleButton('toggleTranslate', enableTranslation);
    
    // Button event handlers
    toggleDiarize?.addEventListener('click', async () => {
        const oldState = window.appState?.diarizationEnabled || false;
        const newState = !oldState;
        if (window.appState) {
            window.appState.setDiarizationEnabled(newState);
        }
        ipcRenderer.invoke('store-set', 'diarizationEnabled', newState);
        updateToggleButton('toggleDiarize', newState);
        
        if (window.appState?.isRecording) {
            if (window.recording) {
                window.recording.preserveCurrentContent();
                window.recording.stopRecording();
                await new Promise(resolve => setTimeout(resolve, 100));
                window.recording.startRecording(true);
            }
        }
    });
    
    toggleTranslate?.addEventListener('click', () => {
        const newState = !(window.appState?.enableTranslation || false);
        if (window.appState) {
            window.appState.setEnableTranslation(newState);
        }
        updateToggleButton('toggleTranslate', newState);
        ipcRenderer.invoke('store-set', 'enableTranslation', newState);
        
        if (ui.updateTranslationUI) {
            ui.updateTranslationUI(newState);
        }
        
        ipcRenderer.send('translation-setting-changed', newState);
    });
    
    // Initialize UI
    const storedEnableTranslation = await ipcRenderer.invoke('store-get', 'enableTranslation', false);
    if (ui.updateTranslationUI) {
        ui.updateTranslationUI(storedEnableTranslation);
    }
    
    if (ui.updateSourceLanguageDropdown) {
        ui.updateSourceLanguageDropdown();
    }
    
    await updateDeepgramValidationStatus();
    
    // Add missing IPC listener for global-toggle-recording event
    ipcRenderer.on('global-toggle-recording', () => {
        const stopBtn = document.getElementById('stop');
        console.log(`[Renderer] Received global-toggle-recording, stopBtn display: ${stopBtn.style.display}`);
        
        if (stopBtn.style.display === 'block') {
            console.log('[Renderer] Stopping recording');
            if (window.recording) {
                window.recording.stopRecording();
            }
        } else {
            console.log('[Renderer] Starting recording');
            if (window.recording) {
                window.recording.startRecording(false);
            }
        }
    });
});