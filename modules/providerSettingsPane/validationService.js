export class ValidationService {
    constructor() {
        this.ipcRenderer = window.require ? window.require('electron').ipcRenderer : null;
        this.appState = window.appState;
    }

    async validateDeepgramApiKey() {
        const deepgramApiKeyInput = document.getElementById('deepgramApiKey');
        const statusElement = document.getElementById('deepgramValidationStatus');
        
        if (!deepgramApiKeyInput || !statusElement) return;

        statusElement.textContent = "Validating...";
        statusElement.className = "validation-status pending";

        try {
            const apiKey = deepgramApiKeyInput.value.trim();
            if (!apiKey) {
                statusElement.textContent = "API key is empty";
                statusElement.className = "validation-status error";
                return;
            }

            const result = await window.settingsPane.validateDeepgramToken(apiKey);
            
            if (result.status === "valid") {
                statusElement.textContent = "API key is valid";
                statusElement.className = "validation-status success";
                
                // Enhanced saving with verification
                try {
                    const saveResult = await this.ipcRenderer.invoke('store-set', 'deepgramApiKey', apiKey);
                    if (!saveResult) {
                        throw new Error('Failed to save API key to storage');
                    }
                    
                    // Verify the save worked
                    const savedKey = await this.ipcRenderer.invoke('store-get', 'deepgramApiKey', '');
                    if (savedKey !== apiKey) {
                        throw new Error('API key verification failed after save');
                    }
                    
                    if (this.appState) {
                        this.appState.setDeepgramApiKey(apiKey);
                    }
                    
                    console.log('[ValidationService] Deepgram API key saved and verified successfully');
                    statusElement.textContent = "API key is valid and saved";
                    
                } catch (saveError) {
                    console.error('[ValidationService] Error saving Deepgram API key:', saveError);
                    statusElement.textContent = `API key valid but save failed: ${saveError.message}`;
                    statusElement.className = "validation-status error";
                }
            } else {
                statusElement.textContent = result.message;
                statusElement.className = "validation-status error";
            }
        } catch (error) {
            console.error('[ValidationService] Deepgram validation error:', error);
            statusElement.textContent = `Error: ${error.message}`;
            statusElement.className = "validation-status error";
        }
    }

    async validateSelectedProvider(translateAiProviders) {
        const defaultAiProviderSelect = document.getElementById('defaultAiProviderSelect');
        const defaultAiModelSelect = document.getElementById('defaultAiModelSelect');
        const statusElement = document.getElementById('providerValidationStatus');
        
        if (!defaultAiProviderSelect || !defaultAiModelSelect || !statusElement) return;

        statusElement.textContent = "Validating provider...";
        statusElement.className = "validation-status pending";

        try {
            const providerId = defaultAiProviderSelect.value;
            const provider = translateAiProviders.find(p => p.id === providerId);
            
            if (!provider) {
                statusElement.textContent = "Provider not found";
                statusElement.className = "validation-status error";
                return;
            }

            const apiKey = await this.ipcRenderer.invoke('store-get', provider.apiKeySettingKey, '');
            if (!apiKey) {
                statusElement.textContent = `API key for ${provider.name} is not set`;
                statusElement.className = "validation-status error";
                return;
            }

            const model = defaultAiModelSelect.value;
            const endpoint = provider.endpoint;
            
            if (!endpoint) {
                statusElement.textContent = "Provider endpoint is not set";
                statusElement.className = "validation-status error";
                return;
            }

            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            };

            const isGemini = !!provider.isGemini;
            const requestBody = {
                model: model,
                messages: [
                    {
                        role: "system",
                        content: "You are a translation assistant."
                    },
                    {
                        role: "user",
                        content: "Translate 'hello' to Spanish."
                    }
                ],
                temperature: 0.3,
                max_tokens: 50
            };

            statusElement.textContent = `Testing connection to ${provider.name}...`;

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            try {
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify(requestBody),
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (response.ok) {
                    statusElement.textContent = `${provider.name} provider is working correctly`;
                    statusElement.className = "validation-status success";
                } else {
                    const errorData = await response.text();
                    statusElement.textContent = `API Error: ${response.status} ${response.statusText}`;
                    statusElement.className = "validation-status error";
                }
            } catch (fetchError) {
                if (fetchError.name === 'AbortError') {
                    statusElement.textContent = "Request timed out";
                } else {
                    statusElement.textContent = `Network error: ${fetchError.message}`;
                }
                statusElement.className = "validation-status error";
            }
        } catch (error) {
            console.error('[ValidationService] Provider validation error:', error);
            statusElement.textContent = `Error: ${error.message}`;
            statusElement.className = "validation-status error";
        }
    }
}
