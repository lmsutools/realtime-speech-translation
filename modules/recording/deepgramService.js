import { appState } from '../../stores/appState.js';

const electronAPI = window.electronAPI;

export class DeepgramService {
    constructor() {
        this.socket = null;
    }
    
    async createWebSocket() {
        const combined = appState.sourceLanguage;
        const [selectedModel, selectedLanguage] = combined.split('|');
        
        let deepgramKey = appState.deepgramApiKey;
        if (!deepgramKey) {
            deepgramKey = await electronAPI.invoke('store-get', 'deepgramApiKey', '');
            if (deepgramKey) {
                const { runInAction } = require("mobx");
                runInAction(() => { appState.setDeepgramApiKey(deepgramKey); });
            }
        }
        
        if (!deepgramKey) {
            throw new Error('No Deepgram API key set');
        }
        
        let queryParams = `?model=${selectedModel}&language=${selectedLanguage}&punctuate=true&interim_results=true`;
        if (appState.diarizationEnabled) {
            queryParams += '&diarize=true';
        }
        
        const wsUrl = `wss://api.deepgram.com/v1/listen${queryParams}`;
        console.log('[DeepgramService] WebSocket URL:', wsUrl);
        
        this.socket = new WebSocket(wsUrl, ['token', deepgramKey]);
        return this.socket;
    }
    
    setupErrorHandler() {
        if (this.socket) {
            this.socket.onerror = (error) => {
                console.error('[DeepgramService] WebSocket error:', error);
                document.getElementById('source-text').textContent = "Deepgram connection failed.";
                electronAPI.send('typing-app-recording-state-changed', false);
            };
        }
    }
    
    setupCloseHandler() {
        if (this.socket) {
            this.socket.onclose = () => {
                console.log('[DeepgramService] WebSocket connection closed');
            };
        }
    }
    
    close() {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
    }
}
