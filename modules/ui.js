(function() {
    // Use the globally available electron
    const ipcRenderer = window.require ? window.require('electron').ipcRenderer : null;

    // Get appState from the global window object
    const appState = window.appState;

    // Define auto-scroll states
    window.sourceAutoScrollEnabled = true;
    window.translatedAutoScrollEnabled = true;

    // Utility functions for store operations
    async function getStoreValue(key, defaultValue) {
        if (ipcRenderer) {
            return ipcRenderer.invoke('store-get', key, defaultValue);
        }
        return defaultValue;
    }

    async function setStoreValue(key, value) {
        if (ipcRenderer) {
            return ipcRenderer.invoke('store-set', key, value);
        }
        return false;
    }

    function updateTranslationUI(enableTranslation) {
        // Make sure the DOM is ready before accessing elements
        const translatedPane = document.querySelector('.translated-pane');
        if (!translatedPane) {
            console.warn('Translation pane not found in DOM');
            return;
        }
        const targetLanguageSelect = document.getElementById('targetLanguage');
        const mainContent = document.querySelector('.main-content');
        const arrowSpan = document.querySelector('.arrow');

        if (enableTranslation) {
            translatedPane.classList.add('visible');
            if (targetLanguageSelect) targetLanguageSelect.style.display = 'block';
            if (arrowSpan) arrowSpan.style.display = 'block';
            if (mainContent) {
                mainContent.style.gridTemplateColumns = '1fr 1fr';
            }
            // Add a test button if it doesn't exist
            addTestButton();
        } else {
            translatedPane.classList.remove('visible');
            if (targetLanguageSelect) targetLanguageSelect.style.display = 'none';
            if (arrowSpan) arrowSpan.style.display = 'none';
            if (mainContent) {
                mainContent.style.gridTemplateColumns = '1fr';
            }
        }
    }

    // Add a test button to the translation pane
    function addTestButton() {
        if (document.getElementById('testTranslation')) {
            return; // Button already exists
        }
        const translationHeader = document.querySelector('.translation-header .pane-controls');
        if (!translationHeader) return;
        const testButton = document.createElement('button');
        testButton.id = 'testTranslation';
        testButton.className = 'small-button';
        testButton.textContent = 'Test';
        testButton.title = 'Test translation';
        testButton.addEventListener('click', async () => {
            const translatedTextElement = document.getElementById('translated-text');
            if (!translatedTextElement) return;
            translatedTextElement.innerHTML += '<div class="translation-status">Testing translation...</div>';
            try {
                // Direct import of the translateWithAI function
                const importPromise = import('./translation.js').then(module => {
                    if (module && typeof module.translateWithAI === 'function') {
                        return module.translateWithAI("This is a test message.", "", "");
                    } else {
                        throw new Error("Translation function not found");
                    }
                }).catch(err => {
                    console.error("Could not import translation module:", err);
                    // Fallback: try to use window.translateWithAI if available
                    if (window.translateWithAI && typeof window.translateWithAI === 'function') {
                        return window.translateWithAI("This is a test message.", "", "");
                    } else {
                        throw new Error("Translation module not available");
                    }
                });

                const result = await importPromise;

                if (result.startsWith("Translation Error:")) {
                    translatedTextElement.innerHTML += `<div class="error-message">${result}</div>`;
                } else {
                    translatedTextElement.innerHTML += `<div>Test translation: "${result}"</div>`;
                    // Auto-scroll to the bottom after adding content
                    scrollToBottom(translatedTextElement);
                }
            } catch (error) {
                console.error("Test translation error:", error);
                translatedTextElement.innerHTML += `<div class="error-message">Test error: ${error.message || "Unknown error"}</div>`;
            }
        });
        translationHeader.appendChild(testButton);
    }

    // This function is likely legacy, but we clean it up for good measure.
    function updateLanguageOptions(languageSelect, model) {
        if (!languageSelect) return;
        languageSelect.innerHTML = '';
        const options = [{ value: 'multi', text: 'Multi-Language' }]; // Default to Nova-3's only option
        options.forEach(opt => {
            const optionElement = document.createElement('option');
            optionElement.value = opt.value;
            optionElement.text = opt.text;
            languageSelect.appendChild(optionElement);
        });
    }

    async function updateSourceLanguageDropdown() {
        const sourceLanguageSelect = document.getElementById('sourceLanguage');
        if (!sourceLanguageSelect) {
            console.warn('Source language select not found');
            return;
        }
        sourceLanguageSelect.innerHTML = '';

        // Only include Nova-3 options
        const combinedOptions = [
            { value: 'nova-3|multi', text: '(Nova-3) Multi-Language' },
        ];

        combinedOptions.forEach(opt => {
            const optionElement = document.createElement('option');
            optionElement.value = opt.value;
            optionElement.text = opt.text;
            sourceLanguageSelect.appendChild(optionElement);
        });

        // Set the dropdown value from the global appState or store
        if (appState && appState.sourceLanguage) {
            sourceLanguageSelect.value = appState.sourceLanguage;
        } else {
            const storedValue = await getStoreValue('sourceLanguage', 'nova-3|multi');
            sourceLanguageSelect.value = storedValue;
        }
    }

    async function applySettingsToUI() {
        // Check if DOM is loaded
        if (document.readyState !== 'complete' && document.readyState !== 'interactive') {
            console.log('DOM not ready, waiting for load');
            return;
        }

        // Get UI elements
        const sourceLanguageSelect = document.getElementById('sourceLanguage');
        const targetLanguageSelect = document.getElementById('targetLanguage');
        if (!sourceLanguageSelect || !targetLanguageSelect) {
            console.warn('Language selects not found, may need to wait for DOM');
            return;
        }

        // Get settings
        const enableTranslation = appState && appState.enableTranslation ||
            await getStoreValue('enableTranslation', false);
        const targetLanguage = appState && appState.targetLanguage ||
            await getStoreValue('targetLanguage', 'en');

        // Update source language dropdown
        await updateSourceLanguageDropdown();

        // Update target language dropdown
        targetLanguageSelect.innerHTML = '';
        const targetLanguageOptions = [
            { value: 'en', text: 'English' },
            { value: 'es', text: 'Spanish' },
            { value: 'zh', text: 'Chinese Simplified' }
        ];

        targetLanguageOptions.forEach(opt => {
            const optionElement = document.createElement('option');
            optionElement.value = opt.value;
            optionElement.text = opt.text;
            targetLanguageSelect.appendChild(optionElement);
        });
        targetLanguageSelect.value = targetLanguage;

        // Attach event listeners
        sourceLanguageSelect.addEventListener('change', (e) => {
            if (appState) {
                appState.setSourceLanguage(e.target.value);
            }
            setStoreValue('sourceLanguage', e.target.value);
        });

        targetLanguageSelect.addEventListener('change', (e) => {
            if (appState) {
                appState.setTargetLanguage(e.target.value);
            }
            setStoreValue('targetLanguage', e.target.value);
        });

        // Update translation UI
        updateTranslationUI(enableTranslation);
    }

    // Utility function to scroll to the bottom of an element
    function scrollToBottom(element) {
        if (element) {
            element.scrollTop = element.scrollHeight;
        }
    }

    function initializeUI() {
        console.log('Initializing UI...');

        // Function to initialize when DOM is ready
        function init() {
            console.log('DOM fully loaded, applying settings');

            // Set up Reset button
            const resetButton = document.getElementById('reset');
            if (resetButton) {
                resetButton.addEventListener('click', () => {
                    const sourceTextElement = document.getElementById('source-text');
                    const translatedTextElement = document.getElementById('translated-text');
                    if (sourceTextElement) sourceTextElement.textContent = '';
                    if (translatedTextElement) translatedTextElement.textContent = '';
                });
            }

            // Add base CSS for error messages
            addErrorStyles();

            // Apply settings to UI
            applySettingsToUI().catch(err => {
                console.error('Error applying settings to UI:', err);
            });

            // Set up auto-scroll toggles
            const sourceToggle = document.querySelector('.auto-scroll-toggle[data-pane="source"]');
            const translatedToggle = document.querySelector('.auto-scroll-toggle[data-pane="translated"]');

            if (sourceToggle) {
                sourceToggle.classList.add('enabled');
                sourceToggle.textContent = 'Auto-Scroll On';
                sourceToggle.addEventListener('click', () => {
                    window.sourceAutoScrollEnabled = !window.sourceAutoScrollEnabled;
                    sourceToggle.textContent = window.sourceAutoScrollEnabled ? 'Auto-Scroll On' : 'Auto-Scroll Off';
                    sourceToggle.classList.toggle('enabled', window.sourceAutoScrollEnabled);
                    sourceToggle.classList.toggle('disabled', !window.sourceAutoScrollEnabled);
                    // Save preference to store
                    setStoreValue('sourceAutoScrollEnabled', window.sourceAutoScrollEnabled);
                });
            }

            if (translatedToggle) {
                translatedToggle.classList.add('enabled');
                translatedToggle.textContent = 'Auto-Scroll On';
                translatedToggle.addEventListener('click', () => {
                    window.translatedAutoScrollEnabled = !window.translatedAutoScrollEnabled;
                    translatedToggle.textContent = window.translatedAutoScrollEnabled ? 'Auto-Scroll On' : 'Auto-Scroll Off';
                    translatedToggle.classList.toggle('enabled', window.translatedAutoScrollEnabled);
                    translatedToggle.classList.toggle('disabled', !window.translatedAutoScrollEnabled);
                    // Save preference to store
                    setStoreValue('translatedAutoScrollEnabled', window.translatedAutoScrollEnabled);
                });
            }

            // Load saved auto-scroll preferences
            getStoreValue('sourceAutoScrollEnabled', true).then(value => {
                window.sourceAutoScrollEnabled = value;
                if (sourceToggle) {
                    sourceToggle.textContent = window.sourceAutoScrollEnabled ? 'Auto-Scroll On' : 'Auto-Scroll Off';
                    sourceToggle.classList.toggle('enabled', window.sourceAutoScrollEnabled);
                    sourceToggle.classList.toggle('disabled', !window.sourceAutoScrollEnabled);
                }
            });

            getStoreValue('translatedAutoScrollEnabled', true).then(value => {
                window.translatedAutoScrollEnabled = value;
                if (translatedToggle) {
                    translatedToggle.textContent = window.translatedAutoScrollEnabled ? 'Auto-Scroll On' : 'Auto-Scroll Off';
                    translatedToggle.classList.toggle('enabled', window.translatedAutoScrollEnabled);
                    translatedToggle.classList.toggle('disabled', !window.translatedAutoScrollEnabled);
                }
            });
        }

        // Check if document is already loaded
        if (document.readyState === 'complete' || document.readyState === 'interactive') {
            console.log('Document already loaded, initializing immediately');
            init();
        } else {
            console.log('Document not ready, adding load event listener');
            document.addEventListener('DOMContentLoaded', init);
        }
    }

    // Add CSS for error messages
    function addErrorStyles() {
        // Check if styles already exist
        if (document.getElementById('error-styles')) {
            return;
        }
        const styleElement = document.createElement('style');
        styleElement.id = 'error-styles';
        styleElement.textContent = `
            .error-message {
                color: #e53935;
                font-weight: 500;
                padding: 4px 8px;
                background-color: rgba(229, 57, 53, 0.1);
                border-radius: 4px;
                margin: 4px 0;
                display: inline-block;
            }
            .translation-status {
                color: #666;
                font-style: italic;
                margin-top: 4px;
                font-size: 0.9em;
            }
            .small-button {
                padding: 4px 8px;
                margin-left: 8px;
                border-radius: 4px;
                background-color: #f5f5f5;
                border: 1px solid #ccc;
                cursor: pointer;
            }
            .small-button:hover {
                background-color: #e0e0e0;
            }
            .translation-loading {
                display: inline-block;
                width: 16px;
                height: 16px;
                border: 2px solid rgba(0, 0, 0, 0.1);
                border-top: 2px solid #3498db;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin-left: 8px;
                vertical-align: middle;
            }
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(styleElement);
    }

    function updateToggleButton(buttonId, isEnabled) {
        const button = document.getElementById(buttonId);
        if (button) {
            if (isEnabled) button.classList.add('active');
            else button.classList.remove('active');
        }
    }

    // Export functions globally
    window.ui = {
        initializeUI,
        updateSourceLanguageDropdown,
        updateTranslationUI,
        updateLanguageOptions,
        applySettingsToUI,
        updateToggleButton,
        scrollToBottom
    };

    // Immediately call initializeUI so it's ready to run
    initializeUI();
})();
