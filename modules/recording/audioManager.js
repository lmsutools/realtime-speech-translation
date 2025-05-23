import { isInputDeviceAvailable } from '../devices.js';
import { ipcRenderer } from 'electron';

export class AudioManager {
    constructor() {
        this.stream = null;
        this.mediaRecorder = null;
    }

    async initializeAudio(isRestart = false) {
        const selectedDeviceId = await ipcRenderer.invoke('store-get', 'defaultInputDevice', '');
        
        if (selectedDeviceId && await isInputDeviceAvailable(selectedDeviceId)) {
            this.stream = await navigator.mediaDevices.getUserMedia({ 
                audio: { deviceId: selectedDeviceId } 
            });
        } else {
            console.warn('[AudioManager] Using default input device');
            this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            if (!isRestart) {
                document.getElementById('source-text').textContent = 'Using default input device.';
            }
        }

        this.mediaRecorder = new MediaRecorder(this.stream, { mimeType: 'audio/webm' });
        return this.mediaRecorder;
    }

    setupDataHandler(socket) {
        if (this.mediaRecorder) {
            this.mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0 && socket?.readyState === WebSocket.OPEN) {
                    socket.send(e.data);
                }
            };
        }
    }

    startRecording() {
        if (this.mediaRecorder) {
            this.mediaRecorder.start(50);
        }
    }

    stopRecording() {
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
        }
        
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
        }
        
        console.log('[AudioManager] Recording stopped');
    }

    cleanup() {
        this.stopRecording();
        this.stream = null;
        this.mediaRecorder = null;
    }
}
