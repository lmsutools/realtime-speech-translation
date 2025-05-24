export class ValidationService {
    constructor() {
        this.electronAPI = window.electronAPI; // Use electronAPI from preload
        this.appState = window.appState; // Assumes appState is globally available
    }

    async validateDeepgramApiKey() {
        const deepgramApiKeyInput = document.getElementById('deepgramApiKey');
        const statusElement = document.getElementById('deepgramValidationStatus');

        if (!deepgramApiKeyInput || !statusElement) {
            console.error('[ValidationService] UI elements for Deepgram validation not found.');
            return;
        }

        statusElement.textContent = "Validating...";
        statusElement.className = "validation-status pending";

        try {
            const apiKey = deepgramApiKeyInput.value.trim();
            if (!apiKey) {
                statusElement.textContent = "API key is empty";
                statusElement.className = "validation-status error";
                return;
            }

            // Assuming settingsPane.validateDeepgramToken is available globally from settingsPane.js
            if (!window.settingsPane || typeof window.settingsPane.validateDeepgramToken !== 'function') {
                throw new Error("settingsPane.validateDeepgramToken function is not available.");
            }
            const result = await window.settingsPane.validateDeepgramToken(apiKey);

            if (result.status === "valid") {
                statusElement.textContent = "API key is valid";
                statusElement.className = "validation-status success";
                
                try {
                    // Use 'setting-changed' IPC to ensure main process appState is also updated
                    this.electronAPI.send('setting-changed', { key: 'deepgramApiKey', value: apiKey });
                    
                    // Optionally, verify it was set in store (main process handles this)
                    const savedKey = await this.electronAPI.invoke('store-get', 'deepgramApiKey', '');
                    if (savedKey !== apiKey) {
                         console.warn('[ValidationService] API key verification after save failed. Main process might be asynchronous.');
                    }

                    if (this.appState && typeof this.appState.setDeepgramApiKey === 'function') {
                        this.appState.setDeepgramApiKey(apiKey); // Update local renderer appState
                    }
                    console.log('[ValidationService] Deepgram API key updated via setting-changed IPC and local appState.');
                    statusElement.textContent = "API key is valid and update sent.";

                } catch (saveError) {
                    console.error('[ValidationService] Error sending Deepgram API key update:', saveError);
                    statusElement.textContent = `API key valid but update/save failed: ${saveError.message}`;
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

        if (!defaultAiProviderSelect || !defaultAiModelSelect || !statusElement) {
            console.error('[ValidationService] UI elements for provider validation not found.');
            return;
        }
        if (!this.electronAPI) {
            statusElement.textContent = "Error: electronAPI not available.";
            statusElement.className = "validation-status error";
            return;
        }

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

            const apiKey = await this.electronAPI.invoke('store-get', provider.apiKeySettingKey, '');
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
            
            const requestBody = {
                model: model,
                messages: [
                    { role: "system", content: "You are a translation assistant." },
                    { role: "user", content: "Translate 'hello' to Spanish." }
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
                    statusElement.textContent = `API Error: ${response.status} ${response.statusText}. Details: ${errorData.substring(0,100)}`;
                    statusElement.className = "validation-status error";
                }
            } catch (fetchError) {
                clearTimeout(timeoutId); // Ensure timeout is cleared on any fetch error
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
