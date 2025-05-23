export class FormHandler {
    constructor() {
        this.ipcRenderer = window.require ? window.require('electron').ipcRenderer : null;
    }

    setupProviderFormListeners(providerManager, uiManager) {
        this.setupAddProviderButton(providerManager, uiManager);
        this.setupCancelButton(providerManager, uiManager);
        this.setupSaveButton(providerManager, uiManager);
        this.setupProviderListActions(providerManager, uiManager);
    }

    setupAddProviderButton(providerManager, uiManager) {
        const addProviderButton = document.getElementById('addProviderButton');
        if (addProviderButton) {
            addProviderButton.addEventListener('click', () => {
                uiManager.showProviderEditForm(null, providerManager);
            });
        }
    }

    setupCancelButton(providerManager, uiManager) {
        const cancelProviderButton = document.getElementById('cancelProviderButton');
        if (cancelProviderButton) {
            cancelProviderButton.addEventListener('click', () => {
                uiManager.hideProviderEditForm();
                providerManager.clearEditingProviderId();
            });
        }
    }

    setupSaveButton(providerManager, uiManager) {
        const saveProviderButton = document.getElementById('saveProviderButton');
        if (saveProviderButton) {
            saveProviderButton.addEventListener('click', async () => {
                await this.saveCurrentProvider(providerManager, uiManager);
            });
        }
    }

    setupProviderListActions(providerManager, uiManager) {
        const providerListDiv = document.getElementById('providerList');
        if (providerListDiv) {
            providerListDiv.addEventListener('click', (event) => {
                if (event.target.classList.contains('edit-provider')) {
                    const providerId = event.target.dataset.id;
                    const providerToEdit = providerManager.getProviderById(providerId);
                    if (providerToEdit) {
                        uiManager.showProviderEditForm(providerToEdit, providerManager);
                    }
                } else if (event.target.classList.contains('delete-provider')) {
                    const providerId = event.target.dataset.id;
                    providerManager.deleteProvider(providerId, uiManager);
                }
            });
        }
    }

    async saveCurrentProvider(providerManager, uiManager) {
        const providerNameInput = document.getElementById('providerName');
        const providerApiKeyInput = document.getElementById('providerApiKey');
        const providerModelsTextarea = document.getElementById('providerModels');
        const providerEndpointInput = document.getElementById('providerEndpoint');
        const translateDefaultAiModelSelect = document.getElementById('defaultAiModelSelect');

        if (!providerNameInput || !providerApiKeyInput || !providerModelsTextarea ||
            !providerEndpointInput || !translateDefaultAiModelSelect) return;

        const editingProviderId = providerManager.getEditingProviderId();
        const providerId = editingProviderId || providerManager.generateUniqueId();

        const providerData = {
            id: providerId,
            name: providerNameInput.value,
            models: providerModelsTextarea.value.split(',').map(m => m.trim()).filter(m => m),
            endpoint: providerEndpointInput.value,
            apiKeySettingKey: editingProviderId ?
                providerManager.getApiKeyStorageKey(editingProviderId) :
                providerManager.getApiKeyStorageKey(providerId),
            defaultModel: translateDefaultAiModelSelect.value
        };

        await providerManager.saveCurrentProvider(providerData, uiManager);
        providerManager.clearEditingProviderId();

        // Trigger save of provider settings
        if (window.providerSettingsPane && window.providerSettingsPane.saveProviderSettings) {
            await window.providerSettingsPane.saveProviderSettings();
        }
    }
}
