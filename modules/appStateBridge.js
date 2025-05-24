(function() {
    // This bridge file allows accessing the appState from both webpack modules and script tags
    // It assumes bundle.js (which contains bridgeConnector.js) has already loaded and set window.appState.
    if (!window.appState) {
        console.warn('[AppStateBridge] window.appState was not set by the bundle. This might lead to issues if bundle.js is not loaded first.');
        // Fallback to a mock if absolutely necessary, but this indicates a loading order problem.
        window.appState = {
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
            setEnableTranslation(value) { this.enableTranslation = value; },
            setSourceLanguage(value) { this.sourceLanguage = value; },
            setTargetLanguage(value) { this.targetLanguage = value; },
            setDeepgramApiKey(value) { this.deepgramApiKey = value; },
            setDiarizationEnabled(value) { this.diarizationEnabled = value; },
            setTypingAppGlobalShortcut(value) { this.typingAppGlobalShortcut = value; },
            setTypingAppActiveWidth(value) { this.typingAppActiveWidth = value; },
            setTypingAppActiveHeight(value) { this.typingAppActiveHeight = value; },
            setIsRecording(value) { this.isRecording = value; },
            setTranscript(value) { this.transcript = value; },
            appendTranscript(value) { this.transcript += value; },
            setTranslatedText(value) { this.translatedText = value; },
            appendTranslatedText(value) { this.translatedText += value; },
            setTypingActive(value) { this.typingActive = value; }
        };
    }
    // Ensure it's globally available (even if already set by bundle)
    // This line is mostly for clarity or if a script *really* expects this file to define it.
    // window.appState = window.appState; 
})();
