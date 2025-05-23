(function() {
// Use the globally available electron
const ipcRenderer = window.require ? window.require('electron').ipcRenderer : null;

// Get appState from the global window object
const appState = window.appState;

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

// Utility function to scroll to the bottom of an element
function scrollToBottom(element) {
    if (element) {
        element.scrollTop = element.scrollHeight;
    }
}

function updateToggleButton(buttonId, isEnabled) {
    const button = document.getElementById(buttonId);
    if (button) {
        if (isEnabled) button.classList.add('active');
        else button.classList.remove('active');
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
    if (window.languageManager) {
        await window.languageManager.updateSourceLanguageDropdown();
    }

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
    if (window.translationUI) {
        window.translationUI.updateTranslationUI(enableTranslation);
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

        // Initialize auto-scroll if available
        if (window.autoScrollManager) {
            window.autoScrollManager.initializeAutoScroll();
        }
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

// Export functions globally
window.uiCore = {
    initializeUI,
    applySettingsToUI,
    updateToggleButton,
    scrollToBottom,
    getStoreValue,
    setStoreValue
};

// Immediately call initializeUI so it's ready to run
initializeUI();

})();
