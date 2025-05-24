(function() {
    // Use the electronAPI from preload
    const electronAPI = window.electronAPI;
    
    // Get appState from the global window object
    const appState = window.appState;
    
    // Utility functions for store operations
    async function getStoreValue(key, defaultValue) {
        if (electronAPI) {
            return electronAPI.invoke('store-get', key, defaultValue);
        }
        return defaultValue;
    }
    
    async function setStoreValue(key, value) {
        if (electronAPI) {
            return electronAPI.invoke('store-set', key, value);
        }
        return false;
    }
    
    function updateLanguageOptions(languageSelect, model) {
        if (!languageSelect) return;
        
        languageSelect.innerHTML = '';
        
        const options = (model === 'nova-2') ? [
            { value: 'en-US', text: 'English' },
            { value: 'es-ES', text: 'Spanish' },
            { value: 'zh', text: 'Chinese Mandarin Simplified' },
            { value: 'multi', text: 'Multi, English + Spanish' }
        ] : [
            { value: 'en', text: 'English' }
        ];
        
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
        
        const combinedOptions = [
            { value: 'nova-2|en-US', text: '(Nova-2) English' },
            { value: 'nova-2|es-ES', text: '(Nova-2) Spanish' },
            { value: 'nova-2|zh', text: '(Nova-2) Mandarin Simplified' },
            { value: 'nova-2|multi', text: '(Nova-2) Multi, English & Spanish' },
            { value: 'nova-3|en', text: '(Nova-3) English' }
        ];
        
        combinedOptions.forEach(opt => {
            const optionElement = document.createElement('option');
            optionElement.value = opt.value;
            optionElement.text = opt.text;
            sourceLanguageSelect.appendChild(optionElement);
        });
        
        // Set the dropdown value from the global appState
        if (appState && appState.sourceLanguage) {
            sourceLanguageSelect.value = appState.sourceLanguage;
        } else {
            const storedValue = await getStoreValue('sourceLanguage', 'nova-2|multi');
            sourceLanguageSelect.value = storedValue;
        }
    }
    
    // Export functions globally
    window.languageManager = {
        updateLanguageOptions,
        updateSourceLanguageDropdown
    };
})();
