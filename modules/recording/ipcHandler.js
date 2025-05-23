import { ipcRenderer } from 'electron';
import { recordingState } from './recordingState.js';

export class IPCHandler {
    static setupListeners() {
        ipcRenderer.on('typing-app-typing-mode-changed', (event, isActive) => {
            recordingState.typingActive = isActive;
        });
    }

    static sendRecordingStateChanged(isRecording) {
        ipcRenderer.send('typing-app-recording-state-changed', isRecording);
    }

    static sendTranscriptUpdated(text) {
        ipcRenderer.send('typing-app-transcript-updated', text);
    }
}
