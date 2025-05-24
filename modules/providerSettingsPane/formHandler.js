export class FormHandler {
    constructor() {
        this.electronAPI = window.electronAPI; // Use electronAPI from preload
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
                const target = event.target;
                if (target.classList.contains('edit-provider')) {
                    const providerId = target.dataset.id;
                    const providerToEdit = providerManager.getProviderById(providerId);
                    if (providerToEdit) {
                        uiManager.showProviderEditForm(providerToEdit, providerManager);
                    }
                } else if (target.classList.contains('delete-provider')) {
                    const providerId = target.dataset.id;
                    if (confirm(`Are you sure you want to delete provider with ID: ${providerId}? This cannot be undone.`)) {
                        providerManager.deleteProvider(providerId, uiManager);
                    }
                }
            });
        }
    }

    async saveCurrentProvider(providerManager, uiManager) {
        const providerNameInput = document.getElementById('providerName');
        const providerApiKeyInput = document.getElementById('providerApiKey'); // This is read by ProviderManager
        const providerModelsTextarea = document.getElementById('providerModels');
        const providerEndpointInput = document.getElementById('providerEndpoint');
        const translateDefaultAiModelSelect = document.getElementById('defaultAiModelSelect');

        if (!providerNameInput || !providerModelsTextarea || !providerEndpointInput || !translateDefaultAiModelSelect) {
            console.error("[FormHandler] One or more form elements not found for saving provider.");
            return;
        }

        const editingProviderId = providerManager.getEditingProviderId();
        const providerId = editingProviderId || providerManager.generateUniqueId();
        
        const providerData = {
            id: providerId,
            name: providerNameInput.value,
            models: providerModelsTextarea.value.split(',').map(m => m.trim()).filter(m => m),
            endpoint: providerEndpointInput.value,
            apiKeySettingKey: editingProviderId ? providerManager.getApiKeyStorageKey(editingProviderId) : providerManager.getApiKeyStorageKey(providerId),
            defaultModel: translateDefaultAiModelSelect.value
        };

        try {
            await providerManager.saveCurrentProvider(providerData, uiManager);
            providerManager.clearEditingProviderId(); // Clear after successful save
        } catch (error) {
            console.error("[FormHandler] Error during saveCurrentProvider in ProviderManager:", error);
            // Error display is handled within ProviderManager or UIManager
        }
    }
}
