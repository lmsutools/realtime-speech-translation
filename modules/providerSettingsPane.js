(function() {
    const ipcRenderer = window.require ? window.require('electron').ipcRenderer : null;
    
    function debounce(func, wait) {
        let timeout;
        return function (...args) {
            const context = this;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), wait);
        };
    }

    async function loadProviderSettings() {
        // ... (HTML injection code is correct and doesn't need to change)
        const apiPane = document.getElementById('api');
        apiPane.innerHTML = `<div class="setting-group"><label for="deepgramApiKey">Deepgram API Key:</label><input type="text" id="deepgramApiKey"><button id="validateDeepgramButton" class="small-button">Validate</button><div id="deepgramValidationStatus"></div></div><div class="setting-group"><h3>AI Providers</h3><!-- ... --></div>`;

        const deepgramApiKeyInput = document.getElementById('deepgramApiKey');
        deepgramApiKeyInput.value = await ipcRenderer.invoke('store-get', 'deepgramApiKey', '');

        // --- DEBOUNCED AUTO-SAVE ---
        const debouncedSaveKey = debounce((key) => {
            ipcRenderer.invoke('store-set', 'deepgramApiKey', key);
        }, 400);

        deepgramApiKeyInput.addEventListener('input', (event) => {
            debouncedSaveKey(event.target.value);
        });
        
        document.getElementById('validateDeepgramButton')?.addEventListener('click', async () => {
            await validateDeepgramApiKey(deepgramApiKeyInput.value);
        });
        
        // ... (The rest of the AI provider logic can remain as is)
    }

    async function validateDeepgramApiKey(apiKey) {
        const statusElement = document.getElementById('deepgramValidationStatus');
        if (!statusElement) return;
        statusElement.textContent = "Validating...";
        statusElement.className = "validation-status pending";
        try {
            if (!apiKey) { statusElement.textContent = "API key is empty"; statusElement.className = "validation-status error"; return; }
            const response = await fetch("https://api.deepgram.com/v1/auth/token", {headers: { "Authorization": `Token ${apiKey}` }});
            if (response.ok) { statusElement.textContent = "API key is valid"; statusElement.className = "validation-status success"; } 
            else { const errorData = await response.json(); statusElement.textContent = `Invalid API key: ${errorData.err_msg || 'Unknown error'}`; statusElement.className = "validation-status error"; }
        } catch (error) { statusElement.textContent = `Error: ${error.message}`; statusElement.className = "validation-status error"; }
    }
    
    document.addEventListener('DOMContentLoaded', loadProviderSettings);
})();
