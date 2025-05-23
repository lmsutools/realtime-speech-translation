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
        const storedProviders = await this.ipcRenderer.invoke('store-get', 'aiProviders', null);

        if (storedProviders) {
            try {
                this.translateAiProviders = JSON.parse(storedProviders);
                defaultProviders.forEach(defaultProvider => {
                    if (!this.translateAiProviders.some(provider => provider.id === defaultProvider.id)) {
                        this.translateAiProviders.push(defaultProvider);
                    }
                });
            } catch (e) {
                console.error("Error parsing stored aiProviders, using defaults.");
                this.translateAiProviders = defaultProviders;
            }
        } else {
            this.translateAiProviders = defaultProviders;
        }

        await this.ipcRenderer.invoke('store-set', 'aiProviders', JSON.stringify(this.translateAiProviders));
    }

    async saveCurrentProvider(providerData, uiManager) {
        const apiKey = document.getElementById('providerApiKey').value;
        
        await this.ipcRenderer.invoke('store-set', providerData.apiKeySettingKey, apiKey);

        if (this.editingProviderId) {
            const index = this.translateAiProviders.findIndex(p => p.id === this.editingProviderId);
            if (index !== -1) this.translateAiProviders[index] = providerData;
        } else {
            this.translateAiProviders.push(providerData);
        }

        uiManager.populateProviderList(this.translateAiProviders);
        uiManager.hideProviderEditForm();
        uiManager.populateDefaultAiProvidersDropdown(this.translateAiProviders);

        const translateDefaultAiProviderSelect = document.getElementById('defaultAiProviderSelect');
        if (translateDefaultAiProviderSelect) {
            translateDefaultAiProviderSelect.value = providerData.id;
            await uiManager.updateDefaultAiModelsDropdown(providerData.id, this.translateAiProviders);
        }
    }

    deleteProvider(providerId, uiManager) {
        this.translateAiProviders = this.translateAiProviders.filter(provider => provider.id !== providerId);
        uiManager.populateProviderList(this.translateAiProviders);
        uiManager.populateDefaultAiProvidersDropdown(this.translateAiProviders);
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
}
