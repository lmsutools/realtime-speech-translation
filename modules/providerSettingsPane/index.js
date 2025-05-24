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
        
        // These will be set in initialize, once window.electronAPI and window.appState are confirmed
        this.electronAPI = null; 
        this.appState = null;
        this.isInitialized = false;
    }

    async initialize() {
        if (this.isInitialized) {
            console.log('[ProviderSettingsPane] Already initialized, skipping');
            return;
        }

        // Ensure electronAPI and appState are available from the window scope
        if (!window.electronAPI || !window.appState) {
            console.error('[ProviderSettingsPane] electronAPI or appState not available on window. Waiting...');
            // Implement a more robust wait or fail gracefully
            await new Promise(resolve => setTimeout(resolve, 200)); // Simple wait
            if (!window.electronAPI || !window.appState) {
                console.error('[ProviderSettingsPane] electronAPI or appState still not available. Initialization failed.');
                this.showInitializationError(new Error("Core APIs (electronAPI or appState) not loaded."));
                return;
            }
        }
        this.electronAPI = window.electronAPI;
        this.appState = window.appState;

        // Update child services with the now available APIs
        this.providerManager.electronAPI = this.electronAPI;
        this.validationService.electronAPI = this.electronAPI;
        this.validationService.appState = this.appState;
        this.formHandler.electronAPI = this.electronAPI;
        this.uiManager.electronAPI = this.electronAPI;


        try {
            console.log('[ProviderSettingsPane] Starting initialization...');
            
            const storeInfo = await this.providerManager.getStoreInfo();
            console.log('[ProviderSettingsPane] Store status:', storeInfo);
            if (!storeInfo.available) {
                console.error('[ProviderSettingsPane] Store not available:', storeInfo.error);
                this.showStoreError(storeInfo.error || "Unknown store error");
            }

            const storeTest = await this.providerManager.verifyStorePersistence();
            if (!storeTest) {
                console.warn('[ProviderSettingsPane] Store persistence test failed');
                this.showStorePersistenceWarning();
            }
            
            await this.loadProviderSettingsDOM(); // Renamed to avoid conflict
            this.setupEventListeners();
            this.isInitialized = true;
            console.log('[ProviderSettingsPane] Initialization completed successfully');
        } catch (error) {
            console.error('[ProviderSettingsPane] Initialization failed:', error);
            this.showInitializationError(error);
        }
    }
    
    showStoreError(errorMsg) {
        const apiPane = document.getElementById('api');
        if (apiPane) {
            apiPane.innerHTML = `<div class="setting-group"><div class="validation-status error"><strong>Configuration Storage Error</strong><br>Settings may not persist between sessions.<br>Error: ${errorMsg}<br><br>Please restart the application or contact support if this persists.</div></div>`;
        }
    }

    showStorePersistenceWarning() {
        const apiPane = document.getElementById('api');
        if (apiPane) {
            const warningDiv = document.createElement('div');
            warningDiv.className = 'validation-status error';
            warningDiv.style.marginBottom = '15px';
            warningDiv.innerHTML = `<strong>Warning:</strong> Settings persistence test failed. Your API keys and provider settings may not save properly. Please verify your settings are saved after configuration.`;
            if (apiPane.firstChild) {
                apiPane.insertBefore(warningDiv, apiPane.firstChild);
            } else {
                apiPane.appendChild(warningDiv);
            }
        }
    }

    showInitializationError(error) {
        const apiPane = document.getElementById('api');
        if (apiPane) {
            apiPane.innerHTML = `<div class="setting-group"><div class="validation-status error"><strong>Initialization Error</strong><br>Failed to load provider settings.<br>Error: ${error.message}<br><br><button onclick="location.reload()">Reload Page</button></div></div>`;
        }
    }

    async loadProviderSettingsDOM() {
        const apiPane = document.getElementById('api');
        if (!apiPane) {
            console.error('[ProviderSettingsPane] API pane not found');
            return;
        }
        this.uiManager.renderMainInterface(apiPane);
        await this.loadDeepgramSettings();
        await this.providerManager.initializeProviders(); // This now gets providers and saves if needed
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
            const deepgramApiKey = await this.electronAPI.invoke('store-get', 'deepgramApiKey', '');
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
                await this.saveDefaultAiSettings(); // Save all default AI settings on change
            });
        }

        if (translateDefaultAiModelSelect) {
            translateDefaultAiModelSelect.addEventListener('change', async () => {
                await this.saveDefaultAiSettings(); // Save all default AI settings on change
            });
        }
    }

    setupDeepgramInputListener() {
        const deepgramApiKeyInput = document.getElementById('deepgramApiKey');
        if (deepgramApiKeyInput) {
            const debouncedSave = this.debounce(() => {
                this.electronAPI.send('setting-changed', { key: 'deepgramApiKey', value: deepgramApiKeyInput.value });
                if (this.appState) this.appState.setDeepgramApiKey(deepgramApiKeyInput.value);
                 console.log('[ProviderSettingsPane] Debounced Deepgram API key update sent.');
            }, 500);
            deepgramApiKeyInput.addEventListener('input', debouncedSave);
        }
    }
    
    async saveAllSettings() { // Renamed for clarity, this is a general "save all configured"
        try {
            const deepgramApiKeyInput = document.getElementById('deepgramApiKey');
            if (deepgramApiKeyInput) {
                this.electronAPI.send('setting-changed', { key: 'deepgramApiKey', value: deepgramApiKeyInput.value });
                if (this.appState) this.appState.setDeepgramApiKey(deepgramApiKeyInput.value);
            }

            this.electronAPI.send('setting-changed', { key: 'aiProviders', value: JSON.stringify(this.providerManager.translateAiProviders) });
            
            await this.saveDefaultAiSettings();
            this.uiManager.addValidationStyles(); // Ensure styles are present
            console.log('[ProviderSettingsPane] All provider settings updates sent via setting-changed IPC.');
        } catch (error) {
            console.error('[ProviderSettingsPane] Error saving all settings:', error);
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
                console.warn('[ProviderSettingsPane] Default AI provider select not found'); return;
            }
            const savedDefaultProvider = await this.electronAPI.invoke('store-get', 'translateDefaultAiProvider', 'openai');
            translateDefaultAiProviderSelect.value = savedDefaultProvider;
            
            await this.uiManager.updateDefaultAiModelsDropdown(savedDefaultProvider, this.providerManager.translateAiProviders);
            
            const translateDefaultAiModelSelect = document.getElementById('defaultAiModelSelect');
            if (translateDefaultAiModelSelect) {
                const defaultModelForProvider = this.providerManager.translateAiProviders.find(p => p.id === savedDefaultProvider)?.defaultModel;
                const savedDefaultModel = await this.electronAPI.invoke('store-get', 'translateDefaultAiModel', defaultModelForProvider || '');
                translateDefaultAiModelSelect.value = savedDefaultModel;
            }
            console.log('[ProviderSettingsPane] Default AI settings loaded successfully');
        } catch (error) {
            console.error('[ProviderSettingsPane] Error loading default AI settings:', error);
        }
    }

    async saveDefaultAiSettings() { // This now saves both provider and model choice
        try {
            const translateDefaultAiProviderSelect = document.getElementById('defaultAiProviderSelect');
            const translateDefaultAiModelSelect = document.getElementById('defaultAiModelSelect');

            if (translateDefaultAiProviderSelect) {
                 this.electronAPI.send('setting-changed', { 
                    key: 'translateDefaultAiProvider', 
                    value: translateDefaultAiProviderSelect.value 
                });
            }
            if (translateDefaultAiModelSelect) {
                 this.electronAPI.send('setting-changed', { 
                    key: 'translateDefaultAiModel', 
                    value: translateDefaultAiModelSelect.value 
                });
            }
            console.log('[ProviderSettingsPane] Default AI provider/model settings update sent.');
        } catch (error) {
            console.error('[ProviderSettingsPane] Error saving default AI settings:', error);
            // Optionally re-throw or display error to user
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

const providerSettingsPaneInstance = new ProviderSettingsPane();

// Initialize when the DOM is ready and core APIs are expected to be available
document.addEventListener('DOMContentLoaded', () => {
    // A short delay can sometimes help ensure all window properties are settled
    setTimeout(() => {
        providerSettingsPaneInstance.initialize();
    }, 100); 
});

// Expose a limited API to the window if other non-module scripts need to interact
window.providerSettingsPane = {
    // Expose specific methods if needed, e.g., for manual refresh from console
    // loadProviderSettings: () => providerSettingsPaneInstance.loadProviderSettingsDOM(),
    // saveProviderSettings: () => providerSettingsPaneInstance.saveAllSettings(),
    initializeProviderSettingsUI: () => providerSettingsPaneInstance.initialize()
};
