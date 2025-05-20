(function() {
    // This bridge file allows accessing the appState from both webpack modules and script tags
    
    // Get the appState from window if it exists (set by webpack), or create a mock version
    const appState = window.appState || {
        enableTranslation: false,
        sourceLanguage: "nova-2|multi",
        targetLanguage: "en",
        deepgramApiKey: "",
        diarizationEnabled: false,
        typingAppGlobalShortcut: "CommandOrControl+Shift+T",
        typingAppActiveWidth: 400,
        typingAppActiveHeight: 400,
        isRecording: false,
        transcript: "",
        translatedText: "",
        typingActive: false,
        
        setEnableTranslation(value) {
            this.enableTranslation = value;
        },
        setSourceLanguage(value) {
            this.sourceLanguage = value;
        },
        setTargetLanguage(value) {
            this.targetLanguage = value;
        },
        setDeepgramApiKey(value) {
            this.deepgramApiKey = value;
        },
        setDiarizationEnabled(value) {
            this.diarizationEnabled = value;
        },
        setTypingAppGlobalShortcut(value) {
            this.typingAppGlobalShortcut = value;
        },
        setTypingAppActiveWidth(value) {
            this.typingAppActiveWidth = value;
        },
        setTypingAppActiveHeight(value) {
            this.typingAppActiveHeight = value;
        },
        setIsRecording(value) {
            this.isRecording = value;
        },
        setTranscript(value) {
            this.transcript = value;
        },
        appendTranscript(value) {
            this.transcript += value;
        },
        setTranslatedText(value) {
            this.translatedText = value;
        },
        appendTranslatedText(value) {
            this.translatedText += value;
        },
        setTypingActive(value) {
            this.typingActive = value;
        }
    };
    
    // Make the appState available globally
    window.appState = appState;
})();