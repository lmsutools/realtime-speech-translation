import { ProviderManager } from './providerManager.js';
import { ValidationService } from './validationService.js';
import { UIManager } from './uiManager.js';
import { FormHandler } from './formHandler.js';

class ProviderSettingsPane {
    constructor() {
        this.providerManager = new ProviderManager();
        this.validationService = new ValidationService();
        this.uiManager = new UIManager();
        this.formHandler = new FormHandler();
        
        this.ipcRenderer = window.require ? window.require('electron').ipcRenderer : null;
        this.appState = window.appState;
        this.isInitialized = false;
    }

    async initialize() {
        if (this.isInitialized) {
            console.log('[ProviderSettingsPane] Already initialized, skipping');
            return;
        }

        try {
            console.log('[ProviderSettingsPane] Starting initialization...');
            
            // Verify store functionality first
            const storeInfo = await this.providerManager.getStoreInfo();
            console.log('[ProviderSettingsPane] Store status:', storeInfo);
            
            if (!storeInfo.available) {
                console.error('[ProviderSettingsPane] Store not available:', storeInfo.error);
                this.showStoreError(storeInfo.error);
            }
            
            const storeTest = await this.providerManager.verifyStorePersistence();
            if (!storeTest) {
                console.warn('[ProviderSettingsPane] Store persistence test failed');
                this.showStorePersistenceWarning();
            }

            await this.loadProviderSettings();
            this.setupEventListeners();
            
            this.isInitialized = true;
            console.log('[ProviderSettingsPane] Initialization completed successfully');
            
        } catch (error) {
            console.error('[ProviderSettingsPane] Initialization failed:', error);
            this.showInitializationError(error);
        }
    }

    showStoreError(error) {
        const apiPane = document.getElementById('api');
        if (apiPane) {
            apiPane.innerHTML = `
                <div class="setting-group">
                    <div class="validation-status error">
                        <strong>Configuration Storage Error</strong><br>
                        Settings may not persist between sessions.<br>
                        Error: ${error}<br><br>
                        Please restart the application or contact support if this persists.
                    </div>
                </div>
            `;
        }
    }

    showStorePersistenceWarning() {
        const apiPane = document.getElementById('api');
        if (apiPane) {
            const warningDiv = document.createElement('div');
            warningDiv.className = 'validation-status error';
            warningDiv.style.marginBottom = '15px';
            warningDiv.innerHTML = `
                <strong>Warning:</strong> Settings persistence test failed. 
                Your API keys and provider settings may not save properly. 
                Please verify your settings are saved after configuration.
            `;
            apiPane.insertBefore(warningDiv, apiPane.firstChild);
        }
    }

    showInitializationError(error) {
        const apiPane = document.getElementById('api');
        if (apiPane) {
            apiPane.innerHTML = `
                <div class="setting-group">
                    <div class="validation-status error">
                        <strong>Initialization Error</strong><br>
                        Failed to load provider settings.<br>
                        Error: ${error.message}<br><br>
                        <button onclick="location.reload()">Reload Page</button>
                    </div>
                </div>
            `;
        }
    }

    async loadProviderSettings() {
        const apiPane = document.getElementById('api');
        if (!apiPane) {
            console.error('[ProviderSettingsPane] API pane not found');
            return;
        }

        this.uiManager.renderMainInterface(apiPane);
        
        await this.loadDeepgramSettings();
        await this.providerManager.initializeProviders();
        await this.loadDefaultAiSettings();
        
        this.uiManager.populateProviderList(this.providerManager.translateAiProviders);
        this.setupValidationButtons();
    }

    async loadDeepgramSettings() {
        const deepgramApiKeyInput = document.getElementById('deepgramApiKey');
        if (!deepgramApiKeyInput) {
            console.warn('[ProviderSettingsPane] Deepgram API key input not found');
            return;
        }

        try {
            const deepgramApiKey = await this.ipcRenderer.invoke('store-get', 'deepgramApiKey', '');
            deepgramApiKeyInput.value = deepgramApiKey;
            console.log('[ProviderSettingsPane] Loaded Deepgram API key:', deepgramApiKey ? '***SET***' : 'NOT SET');
        } catch (error) {
            console.error('[ProviderSettingsPane] Error loading Deepgram settings:', error);
        }
    }

    setupValidationButtons() {
        const validateDeepgramButton = document.getElementById('validateDeepgramButton');
        if (validateDeepgramButton) {
            validateDeepgramButton.addEventListener('click', async () => {
                await this.validationService.validateDeepgramApiKey();
            });
        }

        const validateProviderButton = document.getElementById('validateProviderButton');
        if (validateProviderButton) {
            validateProviderButton.addEventListener('click', async () => {
                await this.validationService.validateSelectedProvider(this.providerManager.translateAiProviders);
            });
        }
    }

    setupEventListeners() {
        this.formHandler.setupProviderFormListeners(this.providerManager, this.uiManager);
        this.setupDropdownListeners();
        this.setupDeepgramInputListener();
    }

    setupDropdownListeners() {
        const translateDefaultAiProviderSelect = document.getElementById('defaultAiProviderSelect');
        const translateDefaultAiModelSelect = document.getElementById('defaultAiModelSelect');

        if (translateDefaultAiProviderSelect) {
            translateDefaultAiProviderSelect.addEventListener('change', async (event) => {
                const selectedProviderId = event.target.value;
                await this.uiManager.updateDefaultAiModelsDropdown(selectedProviderId, this.providerManager.translateAiProviders);
                await this.saveProviderSettings();
            });
        }

        if (translateDefaultAiModelSelect) {
            translateDefaultAiModelSelect.addEventListener('change', async () => {
                await this.saveProviderSettings();
            });
        }
    }

    setupDeepgramInputListener() {
        const deepgramApiKeyInput = document.getElementById('deepgramApiKey');
        if (deepgramApiKeyInput) {
            const debouncedSaveSettings = this.debounce(this.saveProviderSettings.bind(this), 500);
            deepgramApiKeyInput.addEventListener('input', debouncedSaveSettings);
        }
    }

    async saveProviderSettings() {
        try {
            const deepgramApiKeyInput = document.getElementById('deepgramApiKey');
            if (deepgramApiKeyInput) {
                const value = deepgramApiKeyInput.value;
                
                // Save with verification
                const saveResult = await this.ipcRenderer.invoke('store-set', 'deepgramApiKey', value);
                if (!saveResult) {
                    throw new Error('Failed to save Deepgram API key');
                }
                
                // Verify the save
                const savedValue = await this.ipcRenderer.invoke('store-get', 'deepgramApiKey', '');
                if (savedValue !== value) {
                    throw new Error('Deepgram API key verification failed');
                }
                
                if (this.appState) {
                    this.appState.setDeepgramApiKey(value);
                }
                
                console.log('[ProviderSettingsPane] Deepgram API key saved and verified');
            }

            // Save providers list with verification
            const providersJson = JSON.stringify(this.providerManager.translateAiProviders);
            const providersSaveResult = await this.ipcRenderer.invoke('store-set', 'aiProviders', providersJson);
            if (!providersSaveResult) {
                throw new Error('Failed to save AI providers');
            }
            
            // Verify providers save
            const savedProviders = await this.ipcRenderer.invoke('store-get', 'aiProviders', null);
            if (!savedProviders || savedProviders !== providersJson) {
                throw new Error('AI providers verification failed');
            }
            
            console.log('[ProviderSettingsPane] AI providers saved and verified');

            await this.saveDefaultAiSettings();
            this.uiManager.addValidationStyles();
            
            console.log('[ProviderSettingsPane] All provider settings saved successfully');
            
        } catch (error) {
            console.error('[ProviderSettingsPane] Error saving provider settings:', error);
            
            // Show error to user
            const statusElement = document.getElementById('providerValidationStatus') || document.getElementById('deepgramValidationStatus');
            if (statusElement) {
                statusElement.textContent = `Save failed: ${error.message}`;
                statusElement.className = "validation-status error";
            }
        }
    }

    async loadDefaultAiSettings() {
        try {
            this.uiManager.populateDefaultAiProvidersDropdown(this.providerManager.translateAiProviders);
            
            const translateDefaultAiProviderSelect = document.getElementById('defaultAiProviderSelect');
            if (!translateDefaultAiProviderSelect) {
                console.warn('[ProviderSettingsPane] Default AI provider select not found');
                return;
            }

            const savedDefaultProvider = await this.ipcRenderer.invoke('store-get', 'translateDefaultAiProvider', 'openai');
            translateDefaultAiProviderSelect.value = savedDefaultProvider;
            await this.uiManager.updateDefaultAiModelsDropdown(savedDefaultProvider, this.providerManager.translateAiProviders);

            const translateDefaultAiModelSelect = document.getElementById('defaultAiModelSelect');
            if (translateDefaultAiModelSelect) {
                const savedDefaultModel = await this.ipcRenderer.invoke('store-get', 'translateDefaultAiModel', '');
                translateDefaultAiModelSelect.value = savedDefaultModel;
            }
            
            console.log('[ProviderSettingsPane] Default AI settings loaded successfully');
            
        } catch (error) {
            console.error('[ProviderSettingsPane] Error loading default AI settings:', error);
        }
    }

    async saveDefaultAiSettings() {
        try {
            const translateDefaultAiProviderSelect = document.getElementById('defaultAiProviderSelect');
            const translateDefaultAiModelSelect = document.getElementById('defaultAiModelSelect');

            if (translateDefaultAiProviderSelect) {
                const providerSaveResult = await this.ipcRenderer.invoke('store-set', 'translateDefaultAiProvider', translateDefaultAiProviderSelect.value);
                if (!providerSaveResult) {
                    throw new Error('Failed to save default AI provider');
                }
            }

            if (translateDefaultAiModelSelect) {
                const modelSaveResult = await this.ipcRenderer.invoke('store-set', 'translateDefaultAiModel', translateDefaultAiModelSelect.value);
                if (!modelSaveResult) {
                    throw new Error('Failed to save default AI model');
                }
            }
            
            console.log('[ProviderSettingsPane] Default AI settings saved successfully');
            
        } catch (error) {
            console.error('[ProviderSettingsPane] Error saving default AI settings:', error);
            throw error;
        }
    }

    debounce(func, wait) {
        let timeout;
        return function (...args) {
            const context = this;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), wait);
        };
    }
}

const providerSettingsPane = new ProviderSettingsPane();

document.addEventListener('DOMContentLoaded', () => {
    providerSettingsPane.initialize();
});

window.providerSettingsPane = {
    loadProviderSettings: () => providerSettingsPane.loadProviderSettings(),
    saveProviderSettings: () => providerSettingsPane.saveProviderSettings(),
    initializeProviderSettingsUI: () => providerSettingsPane.initialize()
};
