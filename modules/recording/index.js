import { AudioManager } from './audioManager.js';
import { DeepgramService } from './deepgramService.js';
import { TranscriptProcessor } from './transcriptProcessor.js';
import { UIUpdater } from './uiUpdater.js';
import { IPCHandler } from './ipcHandler.js';
import { recordingState } from './recordingState.js';
import { appState } from '../../stores/appState.js';
import { runInAction } from 'mobx';
import { translateWithAI } from '../translation.js';

const electronAPI = window.electronAPI;
const audioManager = new AudioManager();
const deepgramService = new DeepgramService();

IPCHandler.setupListeners();

export async function startRecording(isRestart = false) {
    recordingState.socket = null;
    
    try {
        const diarizationEnabledFromStore = await electronAPI.invoke('store-get', 'diarizationEnabled', false);
        runInAction(() => { appState.setDiarizationEnabled(diarizationEnabledFromStore); });
        
        console.log('[Recording] diarizationEnabled:', appState.diarizationEnabled);
        
        // Initialize audio
        recordingState.mediaRecorder = await audioManager.initializeAudio(isRestart);
        
        // Validate translation configuration if enabled
        if (appState.enableTranslation) {
            const { validateTranslationConfig } = await import('../translation.js');
            const validationResult = await validateTranslationConfig();
            if (!validationResult.valid) {
                document.getElementById('translated-text').innerHTML = `<span class="error-message">${validationResult.message}</span>`;
            }
        }
        
        // Create WebSocket connection
        recordingState.socket = await deepgramService.createWebSocket();
        deepgramService.setupErrorHandler();
        
        recordingState.socket.onopen = async () => {
            console.log('[Recording] WebSocket opened');
            runInAction(() => { appState.setIsRecording(true); });
            
            if (isRestart && recordingState.preservedContent) {
                UIUpdater.updateSourceText('', recordingState.preservedContent);
            } else if (!isRestart) {
                recordingState.preservedContent = "";
                recordingState.finalTranscription = "";
                recordingState.finalParagraphs = [];
                recordingState.translationParagraphs = [];
                recordingState.ephemeralWords.clear();
                UIUpdater.clearTexts();
            }
            
            audioManager.setupDataHandler(recordingState.socket);
            audioManager.startRecording();
            IPCHandler.sendRecordingStateChanged(true);
            
            console.log('[Recording] Recording started');
            
            const autoStopTimer = await electronAPI.invoke('store-get', 'autoStopTimer', 60);
            recordingState.autoStopTimerId = setTimeout(() => {
                stopRecording();
                document.getElementById('source-text').textContent += "\n---TRANSCRIPTION STOPPED, TIME LIMIT REACHED---";
            }, autoStopTimer * 60000);
        };
        
        recordingState.socket.onmessage = async (event) => {
            const parsed = JSON.parse(event.data || '{}');
            recordingState.deepgramCaptions.push(parsed);
            await TranscriptProcessor.processMessage(parsed);
        };
        
        deepgramService.setupCloseHandler();
        UIUpdater.updateButtons(true);
        
        // Update recording indicator
        electronAPI.send('recording-state-update', true);
        const indicator = document.getElementById('recordingIndicator');
        if (indicator) {
            indicator.classList.add('active');
        }
        
    } catch (error) {
        console.error('[Recording] Error starting recording:', error);
        document.getElementById('source-text').textContent = 'Recording failed: ' + error.message;
        IPCHandler.sendRecordingStateChanged(false);
        UIUpdater.updateButtons(false);
    }
}

export function stopRecording() {
    audioManager.stopRecording();
    deepgramService.close();
    recordingState.socket = null;
    
    runInAction(() => { appState.setIsRecording(false); });
    IPCHandler.sendRecordingStateChanged(false);
    recordingState.clearAutoStopTimer();
    UIUpdater.updateButtons(false);
    
    // Update recording indicator
    electronAPI.send('recording-state-update', false);
    const indicator = document.getElementById('recordingIndicator');
    if (indicator) {
        indicator.classList.remove('active');
    }
}

export function onResetClicked() {
    const isRecordingActive = !!(recordingState.mediaRecorder && 
        recordingState.mediaRecorder.state !== 'inactive' && 
        recordingState.socket);
    
    if (isRecordingActive) {
        recordingState.finalParagraphs = [];
       recordingState.translationParagraphs = [];
       recordingState.ephemeralWords.clear();
       recordingState.finalTranscription = "";
       recordingState.deepgramCaptions = [];
       recordingState.transcriptions = [];
       recordingState.translations = [];
       recordingState.preservedContent = "";
       
       UIUpdater.clearTexts();
       UIUpdater.scrollPaneToTop('.source-pane');
       UIUpdater.scrollPaneToTop('.translated-pane');
       
       console.log('[Recording] Partial reset done. Recording continues...');
   } else {
       resetRecordingData();
   }
}

export function resetRecordingData() {
   recordingState.reset();
   UIUpdater.clearTexts();
   UIUpdater.scrollPaneToTop('.source-pane');
   UIUpdater.scrollPaneToTop('.translated-pane');
   console.log('[Recording] Full recording data reset');
}

export function preserveCurrentContent() {
   recordingState.preserveCurrentContent();
}

// Export the translation function to window for direct access
window.translateWithAI = translateWithAI;