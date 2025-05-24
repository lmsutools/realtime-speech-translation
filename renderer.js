// Simplified version that uses the electronAPI from preload
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Renderer initialized');
    
    // Get the electronAPI from preload
    const electronAPI = window.electronAPI;
    
    // Get functions from globals
    const ui = window.uiCore || {};
    
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
        const deepgramApiKey = await electronAPI.invoke('store-get', 'deepgramApiKey', '');
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
        electronAPI.send('reset-typing-app');
        setTimeout(() => {
            document.getElementById('source-text').textContent = '';
        }, 2000);
    });
    
    document.getElementById('typingAppButton')?.addEventListener('click', () => {
        console.log('[Renderer] Typing App button clicked');
        document.getElementById('pasteOption').value = 'source';
        electronAPI.send('open-typing-app');
    });
    
    document.getElementById('settingsIcon')?.addEventListener('click', () => {
        document.querySelector('.settings-panel').classList.add('visible');
    });
    
    // Get toggle buttons
    const toggleDiarize = document.getElementById('toggleDiarize');
    const toggleTranslate = document.getElementById('toggleTranslate');
    
    // Get settings
    const diarizationEnabled = await electronAPI.invoke('store-get', 'diarizationEnabled', false);
    const enableTranslation = await electronAPI.invoke('store-get', 'enableTranslation', false);
    
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
        
        await electronAPI.invoke('store-set', 'diarizationEnabled', newState);
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
    
    toggleTranslate?.addEventListener('click', async () => {
        const newState = !(window.appState?.enableTranslation || false);
        
        if (window.appState) {
            window.appState.setEnableTranslation(newState);
        }
        
        updateToggleButton('toggleTranslate', newState);
        await electronAPI.invoke('store-set', 'enableTranslation', newState);
        
        if (window.translationUI && window.translationUI.updateTranslationUI) {
            window.translationUI.updateTranslationUI(newState);
        }
        
        electronAPI.send('translation-setting-changed', newState);
    });
    
    // Initialize UI
    const storedEnableTranslation = await electronAPI.invoke('store-get', 'enableTranslation', false);
    if (window.translationUI && window.translationUI.updateTranslationUI) {
        window.translationUI.updateTranslationUI(storedEnableTranslation);
    }
    
    if (window.languageManager && window.languageManager.updateSourceLanguageDropdown) {
        window.languageManager.updateSourceLanguageDropdown();
    }
    
    await updateDeepgramValidationStatus();
    
    // Add IPC listeners
    const globalToggleListener = electronAPI.on('global-toggle-recording', () => {
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
    
    // Update recording indicator
    const recordingStateListener = electronAPI.on('recording-state-update', (isRecording) => {
        const indicator = document.getElementById('recordingIndicator');
        if (indicator) {
            if (isRecording) {
                indicator.classList.add('active');
            } else {
                indicator.classList.remove('active');
            }
        }
    });
    
    // Cleanup listeners on window unload
    window.addEventListener('beforeunload', () => {
        if (globalToggleListener) globalToggleListener();
        if (recordingStateListener) recordingStateListener();
    });
});
