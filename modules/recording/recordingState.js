export class RecordingState {
    constructor() {
        this.mediaRecorder = null;
        this.socket = null;
        this.deepgramCaptions = [];
        this.transcriptions = [];
        this.translations = [];
        this.finalTranscription = "";
        this.finalParagraphs = [];
        this.translationParagraphs = [];
        this.ephemeralWords = new Map();
        this.autoStopTimerId = null;
        this.typingActive = false;
        this.preservedContent = "";
        this.isTranslating = false;
    }

    reset() {
        this.transcriptions = [];
        this.translations = [];
        this.deepgramCaptions = [];
        this.finalTranscription = "";
        this.finalParagraphs = [];
        this.translationParagraphs = [];
        this.ephemeralWords.clear();
        this.preservedContent = "";
    }

    preserveCurrentContent() {
        const { appState } = require('../../stores/appState.js');
        const { buildHTMLTranscript } = require('./paragraphBuilder.js');
        
        if (appState.diarizationEnabled) {
            this.preservedContent = document.getElementById('source-text').innerHTML || buildHTMLTranscript(this.finalParagraphs, []);
        } else {
            this.preservedContent = document.getElementById('source-text').innerHTML || this.finalTranscription.trim();
        }
        
        this.finalParagraphs = [];
        this.finalTranscription = "";
        this.ephemeralWords.clear();
    }

    clearAutoStopTimer() {
        if (this.autoStopTimerId) {
            clearTimeout(this.autoStopTimerId);
            this.autoStopTimerId = null;
        }
    }
}

export const recordingState = new RecordingState();
