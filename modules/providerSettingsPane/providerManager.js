export class ProviderManager {
    constructor() {
        this.translateAiProviders = [];
        this.editingProviderId = null;
        this.electronAPI = window.electronAPI; // Use electronAPI from preload
    }

    generateUniqueId() {
        return Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
    }

    getApiKeyStorageKey(providerId) {
        return `aiProviderApiKey_${providerId}`;
    }

    getDefaultProviders() {
        return [
            { id: 'openai', name: "OpenAI", apiKeySettingKey: this.getApiKeyStorageKey('openai'), models: ['gpt-3.5-turbo', 'o3-mini-2025-01-31', 'gpt-4o-mini'], defaultModel: 'gpt-3.5-turbo', endpoint: "https://api.openai.com/v1/chat/completions" },
            { id: 'sambanova', name: "SambaNova AI", apiKeySettingKey: this.getApiKeyStorageKey('sambanova'), models: ["DeepSeek-R1-Distill-Llama-70B"], defaultModel: "DeepSeek-R1-Distill-Llama-70B", endpoint: "https://api.sambanova.ai/v1/chat/completions" },
            { id: 'gemini', name: "Google Gemini", apiKeySettingKey: this.getApiKeyStorageKey('gemini'), models: ["gemini-2.0-flash-001", "gemini-2.0-pro-exp-02-05"], defaultModel: "gemini-1.5-flash", endpoint: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", isGemini: true },
            { id: 'groq', name: "Groq AI", apiKeySettingKey: this.getApiKeyStorageKey('groq'), models: ["distil-whisper-large-v3-en", "gemma2-9b-it"], defaultModel: "gemma2-9b-it", endpoint: "https://api.groq.com/openai/v1/chat/completions" }
        ];
    }

    async initializeProviders() {
        const defaultProviders = this.getDefaultProviders();
        if (!this.electronAPI) {
            console.error("[ProviderManager] electronAPI not available for initializing providers.");
            this.translateAiProviders = defaultProviders;
            return;
        }

        try {
            const storedProvidersRaw = await this.electronAPI.invoke('store-get', 'aiProviders', null);
            console.log('[ProviderManager] Retrieved stored providers raw:', storedProvidersRaw);

            if (storedProvidersRaw) {
                try {
                    this.translateAiProviders = JSON.parse(storedProvidersRaw);
                    console.log('[ProviderManager] Parsed stored providers count:', this.translateAiProviders.length);
                    
                    // Merge with defaults, ensuring all default providers exist and have apiKeySettingKey
                    defaultProviders.forEach(defaultProvider => {
                        const existingProvider = this.translateAiProviders.find(p => p.id === defaultProvider.id);
                        if (!existingProvider) {
                            console.log('[ProviderManager] Adding missing default provider:', defaultProvider.name);
                            this.translateAiProviders.push({...defaultProvider}); // Ensure it's a new object
                        } else {
                            // Ensure apiKeySettingKey is present if it was missing from old stored data
                            if (!existingProvider.apiKeySettingKey) {
                                existingProvider.apiKeySettingKey = this.getApiKeyStorageKey(existingProvider.id);
                            }
                        }
                    });
                } catch (e) {
                    console.error("Error parsing stored aiProviders, using defaults:", e);
                    this.translateAiProviders = defaultProviders.map(p => ({...p})); // Ensure new objects
                }
            } else {
                console.log('[ProviderManager] No stored providers found, using defaults');
                this.translateAiProviders = defaultProviders.map(p => ({...p})); // Ensure new objects
            }
            
            // Save the potentially updated/merged providers list
            this.electronAPI.send('setting-changed', { key: 'aiProviders', value: JSON.stringify(this.translateAiProviders) });
            console.log('[ProviderManager] Providers initialized and update sent via setting-changed.');

        } catch (error) {
            console.error('[ProviderManager] Error initializing providers:', error);
            this.translateAiProviders = defaultProviders.map(p => ({...p})); // Fallback to defaults
        }
    }

    async saveCurrentProvider(providerData, uiManager) {
        if (!this.electronAPI) {
            console.error("[ProviderManager] electronAPI not available for saving provider.");
            throw new Error("electronAPI not available");
        }
        try {
            const apiKeyInput = document.getElementById('providerApiKey');
            const apiKey = apiKeyInput ? apiKeyInput.value : '';

            // Ensure apiKeySettingKey exists
            if (!providerData.apiKeySettingKey) {
                providerData.apiKeySettingKey = this.getApiKeyStorageKey(providerData.id);
            }

            // Save API key using 'setting-changed' IPC
            this.electronAPI.send('setting-changed', { key: providerData.apiKeySettingKey, value: apiKey });
            console.log('[ProviderManager] API key update sent via setting-changed for provider:', providerData.name);
            
            // Update local list
            if (this.editingProviderId) {
                const index = this.translateAiProviders.findIndex(p => p.id === this.editingProviderId);
                if (index !== -1) {
                    this.translateAiProviders[index] = providerData;
                    console.log('[ProviderManager] Updated existing provider:', providerData.name);
                } else {
                    console.warn('[ProviderManager] Provider to edit not found, adding as new');
                    this.translateAiProviders.push(providerData);
                }
            } else {
                this.translateAiProviders.push(providerData);
                console.log('[ProviderManager] Added new provider:', providerData.name);
            }

            // Save updated providers list using 'setting-changed' IPC
            this.electronAPI.send('setting-changed', { key: 'aiProviders', value: JSON.stringify(this.translateAiProviders) });
            console.log('[ProviderManager] Providers list update sent via setting-changed.');

            uiManager.populateProviderList(this.translateAiProviders);
            uiManager.hideProviderEditForm();
            uiManager.populateDefaultAiProvidersDropdown(this.translateAiProviders);
            
            const translateDefaultAiProviderSelect = document.getElementById('defaultAiProviderSelect');
            if (translateDefaultAiProviderSelect) {
                translateDefaultAiProviderSelect.value = providerData.id;
                await uiManager.updateDefaultAiModelsDropdown(providerData.id, this.translateAiProviders);
            }
        } catch (error) {
            console.error('[ProviderManager] Error saving provider:', error);
            const statusElement = document.getElementById('providerValidationStatus');
            if (statusElement) {
                statusElement.textContent = `Save failed: ${error.message}`;
                statusElement.className = "validation-status error";
            }
            throw error; 
        }
    }

    async deleteProvider(providerId, uiManager) {
        if (!this.electronAPI) {
            console.error("[ProviderManager] electronAPI not available for deleting provider.");
            return;
        }
        try {
            const initialLength = this.translateAiProviders.length;
            const providerToDelete = this.translateAiProviders.find(p => p.id === providerId);
            
            this.translateAiProviders = this.translateAiProviders.filter(provider => provider.id !== providerId);

            if (this.translateAiProviders.length === initialLength && providerToDelete) {
                console.warn('[ProviderManager] Provider to delete not found in list, but was identified:', providerId);
            } else if (!providerToDelete) {
                 console.warn('[ProviderManager] Provider to delete completely not found:', providerId);
                 return; // Nothing to do
            }
            console.log('[ProviderManager] Removed provider from memory:', providerId);

            // Save updated list via IPC
            this.electronAPI.send('setting-changed', { key: 'aiProviders', value: JSON.stringify(this.translateAiProviders) });

            // Delete the API key for this provider
            if (providerToDelete && providerToDelete.apiKeySettingKey) {
                await this.electronAPI.invoke('store-delete', providerToDelete.apiKeySettingKey);
                console.log('[ProviderManager] Deleted API key for provider via store-delete:', providerId);
            } else {
                console.warn(`[ProviderManager] Could not delete API key for provider ${providerId}, apiKeySettingKey missing.`);
            }

            uiManager.populateProviderList(this.translateAiProviders);
            uiManager.populateDefaultAiProvidersDropdown(this.translateAiProviders);
        } catch (error) {
            console.error('[ProviderManager] Error deleting provider:', error);
            const statusElement = document.getElementById('providerValidationStatus');
            if (statusElement) {
                statusElement.textContent = `Delete failed: ${error.message}`;
                statusElement.className = "validation-status error";
            }
        }
    }

    getProviderById(providerId) {
        return this.translateAiProviders.find(p => p.id === providerId);
    }

    setEditingProviderId(providerId) {
        this.editingProviderId = providerId;
    }

    getEditingProviderId() {
        return this.editingProviderId;
    }

    clearEditingProviderId() {
        this.editingProviderId = null;
    }

    async verifyStorePersistence() {
        if (!this.electronAPI) {
            console.warn("[ProviderManager] electronAPI not available for store persistence test.");
            return false;
        }
        try {
            const testKey = 'providerManager_test_' + Date.now();
            const testValue = 'test_value_' + Math.random();
            
            const saveResult = await this.electronAPI.invoke('store-set', testKey, testValue);
            if (!saveResult) { throw new Error('Store set operation failed'); }
            
            const retrievedValue = await this.electronAPI.invoke('store-get', testKey, null);
            if (retrievedValue !== testValue) { throw new Error('Store get operation failed or returned wrong value'); }
            
            const deleteResult = await this.electronAPI.invoke('store-delete', testKey);
            if (!deleteResult) { console.warn('[ProviderManager] Store delete test failed (non-critical)'); }
            
            console.log('[ProviderManager] Store persistence test passed');
            return true;
        } catch (error) {
            console.error('[ProviderManager] Store persistence test failed:', error);
            return false;
        }
    }
    async getStoreInfo() {
        if (!this.electronAPI) {
            console.warn("[ProviderManager] electronAPI not available for getStoreInfo.");
            return { available: false, error: "electronAPI not available" };
        }
        try {
            const info = await this.electronAPI.invoke('store-info');
            console.log('[ProviderManager] Store info:', info);
            return info;
        } catch (error) {
            console.error('[ProviderManager] Error getting store info:', error);
            return { available: false, error: error.message };
        }
    }
}
