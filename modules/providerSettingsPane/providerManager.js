export class ProviderManager {
    constructor() {
        this.translateAiProviders = [];
        this.editingProviderId = null;
        this.ipcRenderer = window.require ? window.require('electron').ipcRenderer : null;
    }

    generateUniqueId() {
        return Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
    }

    getApiKeyStorageKey(providerId) {
        return `aiProviderApiKey_${providerId}`;
    }

    getDefaultProviders() {
        return [
            {
                id: 'openai',
                name: "OpenAI",
                apiKeySettingKey: this.getApiKeyStorageKey('openai'),
                models: ['gpt-3.5-turbo', 'o3-mini-2025-01-31', 'gpt-4o-mini'],
                defaultModel: 'gpt-3.5-turbo',
                endpoint: "https://api.openai.com/v1/chat/completions"
            },
            {
                id: 'sambanova',
                name: "SambaNova AI",
                apiKeySettingKey: this.getApiKeyStorageKey('sambanova'),
                models: ["DeepSeek-R1-Distill-Llama-70B"],
                defaultModel: "DeepSeek-R1-Distill-Llama-70B",
                endpoint: "https://api.sambanova.ai/v1/chat/completions"
            },
            {
                id: 'gemini',
                name: "Google Gemini",
                apiKeySettingKey: this.getApiKeyStorageKey('gemini'),
                models: ["gemini-2.0-flash-001", "gemini-2.0-pro-exp-02-05"],
                defaultModel: "gemini-1.5-flash",
                endpoint: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
                isGemini: true
            },
            {
                id: 'groq',
                name: "Groq AI",
                apiKeySettingKey: this.getApiKeyStorageKey('groq'),
                models: ["distil-whisper-large-v3-en", "gemma2-9b-it"],
                defaultModel: "gemma2-9b-it",
                endpoint: "https://api.groq.com/openai/v1/chat/completions"
            }
        ];
    }

    async initializeProviders() {
        const defaultProviders = this.getDefaultProviders();
        
        try {
            const storedProviders = await this.ipcRenderer.invoke('store-get', 'aiProviders', null);
            console.log('[ProviderManager] Retrieved stored providers:', storedProviders);

            if (storedProviders) {
                try {
                    this.translateAiProviders = JSON.parse(storedProviders);
                    console.log('[ProviderManager] Parsed stored providers:', this.translateAiProviders.length);
                    
                    // Merge with defaults, ensuring all default providers exist
                    defaultProviders.forEach(defaultProvider => {
                        if (!this.translateAiProviders.some(provider => provider.id === defaultProvider.id)) {
                            console.log('[ProviderManager] Adding missing default provider:', defaultProvider.name);
                            this.translateAiProviders.push(defaultProvider);
                        }
                    });
                } catch (e) {
                    console.error("Error parsing stored aiProviders, using defaults:", e);
                    this.translateAiProviders = defaultProviders;
                }
            } else {
                console.log('[ProviderManager] No stored providers found, using defaults');
                this.translateAiProviders = defaultProviders;
            }

            // Save the updated providers list with enhanced error handling
            const saveResult = await this.ipcRenderer.invoke('store-set', 'aiProviders', JSON.stringify(this.translateAiProviders));
            if (!saveResult) {
                console.warn('[ProviderManager] Failed to save providers to store');
            } else {
                // Verify the save worked
                const verification = await this.ipcRenderer.invoke('store-get', 'aiProviders', null);
                if (verification) {
                    console.log('[ProviderManager] Providers saved and verified successfully');
                } else {
                    console.warn('[ProviderManager] Provider save verification failed');
                }
            }
            
        } catch (error) {
            console.error('[ProviderManager] Error initializing providers:', error);
            this.translateAiProviders = defaultProviders;
        }
    }

    async saveCurrentProvider(providerData, uiManager) {
        try {
            const apiKey = document.getElementById('providerApiKey').value;
            
            // Save API key with verification
            const apiKeySaveResult = await this.ipcRenderer.invoke('store-set', providerData.apiKeySettingKey, apiKey);
            if (!apiKeySaveResult) {
                throw new Error('Failed to save API key to storage');
            }
            
            // Verify API key was saved
            const savedApiKey = await this.ipcRenderer.invoke('store-get', providerData.apiKeySettingKey, '');
            if (savedApiKey !== apiKey) {
                throw new Error('API key verification failed after save');
            }
            
            console.log('[ProviderManager] API key saved and verified for provider:', providerData.name);

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

            // Save providers list with verification
            const providersSaveResult = await this.ipcRenderer.invoke('store-set', 'aiProviders', JSON.stringify(this.translateAiProviders));
            if (!providersSaveResult) {
                throw new Error('Failed to save providers list to storage');
            }
            
            // Verify providers list was saved
            const savedProviders = await this.ipcRenderer.invoke('store-get', 'aiProviders', null);
            if (!savedProviders) {
                throw new Error('Providers list verification failed after save');
            }
            
            console.log('[ProviderManager] Providers list saved and verified successfully');

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
            
            // Show user-friendly error message
            const statusElement = document.getElementById('providerValidationStatus');
            if (statusElement) {
                statusElement.textContent = `Save failed: ${error.message}`;
                statusElement.className = "validation-status error";
            }
            
            throw error; // Re-throw so caller knows it failed
        }
    }

    async deleteProvider(providerId, uiManager) {
        try {
            // Remove from memory
            const initialLength = this.translateAiProviders.length;
            this.translateAiProviders = this.translateAiProviders.filter(provider => provider.id !== providerId);
            
            if (this.translateAiProviders.length === initialLength) {
                console.warn('[ProviderManager] Provider to delete not found:', providerId);
                return;
            }
            
            console.log('[ProviderManager] Removed provider from memory:', providerId);
            
            // Save updated list with verification
            const saveResult = await this.ipcRenderer.invoke('store-set', 'aiProviders', JSON.stringify(this.translateAiProviders));
            if (!saveResult) {
                throw new Error('Failed to save updated providers list');
            }
            
            // Verify the save
            const verification = await this.ipcRenderer.invoke('store-get', 'aiProviders', null);
            if (!verification) {
                throw new Error('Provider deletion verification failed');
            }
            
            console.log('[ProviderManager] Provider deletion saved and verified');
            
            // Also try to remove the API key for this provider
            const provider = this.getDefaultProviders().find(p => p.id === providerId);
            if (provider) {
                await this.ipcRenderer.invoke('store-delete', provider.apiKeySettingKey);
                console.log('[ProviderManager] Deleted API key for provider:', providerId);
            }
            
            uiManager.populateProviderList(this.translateAiProviders);
            uiManager.populateDefaultAiProvidersDropdown(this.translateAiProviders);
            
        } catch (error) {
            console.error('[ProviderManager] Error deleting provider:', error);
            
            // Show user-friendly error message
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
        try {
            // Test basic store functionality
            const testKey = 'providerManager_test_' + Date.now();
            const testValue = 'test_value_' + Math.random();
            
            const saveResult = await this.ipcRenderer.invoke('store-set', testKey, testValue);
            if (!saveResult) {
                throw new Error('Store set operation failed');
            }
            
            const retrievedValue = await this.ipcRenderer.invoke('store-get', testKey, null);
            if (retrievedValue !== testValue) {
                throw new Error('Store get operation failed or returned wrong value');
            }
            
            const deleteResult = await this.ipcRenderer.invoke('store-delete', testKey);
            if (!deleteResult) {
                console.warn('[ProviderManager] Store delete test failed (non-critical)');
            }
            
            console.log('[ProviderManager] Store persistence test passed');
            return true;
            
        } catch (error) {
            console.error('[ProviderManager] Store persistence test failed:', error);
            return false;
        }
    }

    async getStoreInfo() {
        try {
            const info = await this.ipcRenderer.invoke('store-info');
            console.log('[ProviderManager] Store info:', info);
            return info;
        } catch (error) {
            console.error('[ProviderManager] Error getting store info:', error);
            return { available: false, error: error.message };
        }
    }
}
