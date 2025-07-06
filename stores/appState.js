const { makeAutoObservable, runInAction } = require("mobx");

class AppState {
    enableTranslation = false;
    sourceLanguage = "nova-3|multi";
    targetLanguage = "en";
    deepgramApiKey = "";
    defaultInputDevice = ""; // Added for consistency
    diarizationEnabled = false;
    typingAppGlobalShortcut = "CommandOrControl+Shift+T";
    typingAppActiveWidth = 400;
    typingAppActiveHeight = 400;
    isRecording = false;
    transcript = "";
    translatedText = "";
    typingActive = false;

    constructor() {
        makeAutoObservable(this);
    }

    setEnableTranslation(value) { this.enableTranslation = value; }
    setSourceLanguage(value) { this.sourceLanguage = value; }
    setTargetLanguage(value) { this.targetLanguage = value; }
    setDeepgramApiKey(value) { this.deepgramApiKey = value; }
    setDefaultInputDevice(value) { this.defaultInputDevice = value; }
    setDiarizationEnabled(value) { this.diarizationEnabled = value; }
    setTypingAppGlobalShortcut(value) { this.typingAppGlobalShortcut = value; }
    setTypingAppActiveWidth(value) { this.typingAppActiveWidth = value; }
    setTypingAppActiveHeight(value) { this.typingAppActiveHeight = value; }
    setIsRecording(value) { this.isRecording = value; }
    setTranscript(value) { this.transcript = value; }
    appendTranscript(value) { this.transcript += value; }
    setTranslatedText(value) { this.translatedText = value; }
    appendTranslatedText(value) { this.translatedText += value; }
    setTypingActive(value) { this.typingActive = value; }
}

const appState = new AppState();

module.exports = { appState };
