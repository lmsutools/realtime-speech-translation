import { recordingState } from './recordingState.js';

export class IPCHandler {
    static setupListeners() {
        // Get electronAPI from window
        const electronAPI = window.electronAPI;
        
        if (!electronAPI) {
            console.error('[IPCHandler] electronAPI not available');
            return;
        }
        
        electronAPI.on('typing-app-typing-mode-changed', (isActive) => {
            recordingState.typingActive = isActive;
        });
    }
    
    static sendRecordingStateChanged(isRecording) {
        const electronAPI = window.electronAPI;
        if (electronAPI) {
            electronAPI.send('typing-app-recording-state-changed', isRecording);
        }
    }
    
    static sendTranscriptUpdated(text) {
        const electronAPI = window.electronAPI;
        if (electronAPI) {
            electronAPI.send('typing-app-transcript-updated', text);
        }
    }
}
