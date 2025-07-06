import { startRecording, stopRecording, resetRecordingData, preserveCurrentContent } from './modules/recording.js';
import { appState } from './stores/appState.js';
import { runInAction, autorun } from 'mobx';

// --- THE CENTRAL CONTROLLER ---
document.addEventListener('DOMContentLoaded', () => {
    console.log('[Bridge] DOM Loaded. Initializing controller...');
    
    const { ipcRenderer } = window.require('electron');

    const appCommands = {
        initializeState: (settings) => {
            console.log('[Bridge] Initializing state with:', settings);
            runInAction(() => {
                for (const [key, value] of Object.entries(settings)) {
                    switch (key) {
                        case 'deepgramApiKey': appState.setDeepgramApiKey(value); break;
                        case 'defaultInputDevice': appState.setDefaultInputDevice(value); break;
                        case 'enableTranslation': appState.setEnableTranslation(value); break;
                        case 'diarizationEnabled': appState.setDiarizationEnabled(value); break;
                        case 'sourceLanguage': appState.setSourceLanguage(value); break;
                        case 'targetLanguage': appState.setTargetLanguage(value); break;
                    }
                }
            });
        },
        updateSetting: (key, value) => {
            console.log(`[Bridge] Executing command to update setting: ${key}`);
            runInAction(() => {
                switch (key) {
                    case 'deepgramApiKey': appState.setDeepgramApiKey(value); break;
                    case 'defaultInputDevice': appState.setDefaultInputDevice(value); break;
                    case 'enableTranslation': appState.setEnableTranslation(value); break;
                    case 'diarizationEnabled': appState.setDiarizationEnabled(value); break;
                }
            });
        }
    };

    ipcRenderer.once('initialize-state', (event, settings) => {
        appCommands.initializeState(settings);
        if(window.rendererUtils) {
            window.rendererUtils.updateToggleButton('toggleDiarize', settings.diarizationEnabled);
            window.rendererUtils.updateToggleButton('toggleTranslate', settings.enableTranslation);
            window.rendererUtils.updateDeepgramValidationStatus();
        }
    });

    ipcRenderer.on('setting-changed', async (event, { key, value }) => {
        const wasRecording = appState.isRecording;
        appCommands.updateSetting(key, value);

        if(window.rendererUtils) {
            switch (key) {
                case 'enableTranslation':
                    window.rendererUtils.updateToggleButton('toggleTranslate', value);
                    if (window.ui && window.ui.updateTranslationUI) window.ui.updateTranslationUI(value);
                    break;
                case 'diarizationEnabled':
                    window.rendererUtils.updateToggleButton('toggleDiarize', value);
                    if (wasRecording) {
                        console.log('[Bridge] Diarization changed while recording. Restarting...');
                        preserveCurrentContent();
                        stopRecording();
                        await new Promise(resolve => setTimeout(resolve, 150));
                        startRecording(true);
                    }
                    break;
                case 'deepgramApiKey':
                    window.rendererUtils.updateDeepgramValidationStatus();
                    break;
            }
        }
    });

    // --- Event Listener Attachment ---
    document.getElementById('start')?.addEventListener('click', () => startRecording(false));
    document.getElementById('stop')?.addEventListener('click', stopRecording);
    document.getElementById('reset')?.addEventListener('click', resetRecordingData);
    
    // --- Reactive UI Controller ---
    autorun(() => {
        console.log(`[Autorun] Reactive state changed: isRecording is now ${appState.isRecording}`);
        const startButton = document.getElementById('start');
        const stopButton = document.getElementById('stop');

        if (!startButton || !stopButton) return;

        if (appState.isRecording) {
            startButton.style.display = 'none';
            stopButton.style.display = 'block';
        } else {
            startButton.style.display = 'block';
            stopButton.style.display = 'none';
        }
    });

    // Global shortcut handler
    ipcRenderer.on('global-toggle-recording', () => {
        if (appState.isRecording) {
            stopRecording();
        } else {
            startRecording(false);
        }
    });

    console.log('[Bridge] Controller initialized and event listeners attached.');
});
