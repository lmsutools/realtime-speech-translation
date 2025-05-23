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
    }

    async initialize() {
        await this.loadProviderSettings();
        this.setupEventListeners();
    }

    async loadProviderSettings() {
        const apiPane = document.getElementById('api');
        if (!apiPane) return;

        this.uiManager.renderMainInterface(apiPane);
        
        await this.loadDeepgramSettings();
        await this.providerManager.initializeProviders();
        await this.loadDefaultAiSettings();
        
        this.uiManager.populateProviderList(this.providerManager.translateAiProviders);
        this.setupValidationButtons();
    }

    async loadDeepgramSettings() {
        const deepgramApiKeyInput = document.getElementById('deepgramApiKey');
        if (!deepgramApiKeyInput) return;

        const deepgramApiKey = await this.ipcRenderer.invoke('store-get', 'deepgramApiKey', '');
        deepgramApiKeyInput.value = deepgramApiKey;
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
        const deepgramApiKeyInput = document.getElementById('deepgramApiKey');
        if (deepgramApiKeyInput) {
            const value = deepgramApiKeyInput.value;
            if (this.appState) {
                this.appState.setDeepgramApiKey(value);
            }
            this.ipcRenderer.invoke('store-set', 'deepgramApiKey', value);
        }

        await this.ipcRenderer.invoke('store-set', 'aiProviders', JSON.stringify(this.providerManager.translateAiProviders));
        await this.saveDefaultAiSettings();
        this.uiManager.addValidationStyles();
    }

    async loadDefaultAiSettings() {
        this.uiManager.populateDefaultAiProvidersDropdown(this.providerManager.translateAiProviders);
        
        const translateDefaultAiProviderSelect = document.getElementById('defaultAiProviderSelect');
        if (!translateDefaultAiProviderSelect) return;

        const savedDefaultProvider = await this.ipcRenderer.invoke('store-get', 'translateDefaultAiProvider', 'openai');
        translateDefaultAiProviderSelect.value = savedDefaultProvider;
        await this.uiManager.updateDefaultAiModelsDropdown(savedDefaultProvider, this.providerManager.translateAiProviders);

        const translateDefaultAiModelSelect = document.getElementById('defaultAiModelSelect');
        if (translateDefaultAiModelSelect) {
            translateDefaultAiModelSelect.value = await this.ipcRenderer.invoke('store-get', 'translateDefaultAiModel', '');
        }
    }

    async saveDefaultAiSettings() {
        const translateDefaultAiProviderSelect = document.getElementById('defaultAiProviderSelect');
        const translateDefaultAiModelSelect = document.getElementById('defaultAiModelSelect');

        if (translateDefaultAiProviderSelect) {
            await this.ipcRenderer.invoke('store-set', 'translateDefaultAiProvider', translateDefaultAiProviderSelect.value);
        }

        if (translateDefaultAiModelSelect) {
            await this.ipcRenderer.invoke('store-set', 'translateDefaultAiModel', translateDefaultAiModelSelect.value);
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
