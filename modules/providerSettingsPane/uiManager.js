export class UIManager {
    constructor() {
        this.electronAPI = null;
    }
    
    getElectronAPI() {
        if (!this.electronAPI) {
            this.electronAPI = window.electronAPI;
        }
        return this.electronAPI;
    }
    
    renderMainInterface(apiPane) {
        apiPane.innerHTML = `
            <div class="setting-group">
                <label for="deepgramApiKey">Deepgram API Key:</label>
                <input type="text" id="deepgramApiKey">
                <button id="validateDeepgramButton" class="small-button">Validate</button>
                <div id="deepgramValidationStatus"></div>
            </div>
            <div class="setting-group">
                <h3>AI Providers</h3>
                <div class="provider-grid">
                    <div class="provider-left">
                        <div id="providerList"></div>
                        <button class="add-provider-btn" id="addProviderButton">Add Provider</button>
                    </div>
                    <div class="provider-right">
                        <div id="providerDefaults" style="display: block; opacity: 1;">
                            <div class="setting-group">
                                <label for="defaultAiProviderSelect">Default Provider:</label>
                                <select id="defaultAiProviderSelect"></select>
                            </div>
                            <div class="setting-group">
                                <label for="defaultAiModelSelect">Default Model:</label>
                                <select id="defaultAiModelSelect"></select>
                            </div>
                            <div id="providerValidationStatus"></div>
                            <button id="validateProviderButton" class="small-button">Validate Provider</button>
                        </div>
                        <div id="providerEditForm" class="setting-group" style="display: none; opacity: 0;">
                            <label for="providerName">Name:</label>
                            <input type="text" id="providerName">
                            <label for="providerApiKey">API Key:</label>
                            <input type="text" id="providerApiKey">
                            <label for="providerModels">Models (comma-separated):</label>
                            <textarea id="providerModels"></textarea>
                            <label for="providerEndpoint">Endpoint:</label>
                            <input type="text" id="providerEndpoint">
                            <div class="form-actions">
                                <button id="saveProviderButton">Save</button>
                                <button id="cancelProviderButton">Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    populateProviderList(translateAiProviders) {
        const providerListDiv = document.getElementById('providerList');
        if (!providerListDiv) return;
        
        providerListDiv.innerHTML = '';
        translateAiProviders.forEach(provider => {
            const providerItem = document.createElement('div');
            providerItem.classList.add('provider-item');
            providerItem.innerHTML = `
                <span>${provider.name}</span>
                <div class="provider-actions">
                    <button class="edit-provider" data-id="${provider.id}">Edit</button>
                    <button class="delete-provider" data-id="${provider.id}">Delete</button>
                </div>
            `;
            providerListDiv.appendChild(providerItem);
        });
    }
    
    populateDefaultAiProvidersDropdown(translateAiProviders) {
        const translateDefaultAiProviderSelect = document.getElementById('defaultAiProviderSelect');
        if (!translateDefaultAiProviderSelect) return;
        
        translateDefaultAiProviderSelect.innerHTML = '';
        translateAiProviders.forEach(provider => {
            const option = document.createElement('option');
            option.value = provider.id;
            option.text = provider.name;
            translateDefaultAiProviderSelect.appendChild(option);
        });
    }
    
    async updateDefaultAiModelsDropdown(selectedProviderId, translateAiProviders) {
        const translateDefaultAiModelSelect = document.getElementById('defaultAiModelSelect');
        if (!translateDefaultAiModelSelect) return;
        
        translateDefaultAiModelSelect.innerHTML = '';
        const provider = translateAiProviders.find(p => p.id === selectedProviderId);
        if (provider && provider.models) {
            provider.models.forEach(modelName => {
                const modelOption = document.createElement('option');
                modelOption.value = modelName;
                modelOption.text = modelName;
                translateDefaultAiModelSelect.appendChild(modelOption);
            });
            
            const electronAPI = this.getElectronAPI();
            if (electronAPI) {
                translateDefaultAiModelSelect.value = await electronAPI.invoke(
                    'store-get',
                    'translateDefaultAiModel',
                    provider.defaultModel || provider.models[0]
                );
            }
        }
    }
    
    async showProviderEditForm(provider = null, providerManager) {
        const providerEditFormDiv = document.getElementById('providerEditForm');
        const providerDefaultsDiv = document.getElementById('providerDefaults');
        
        if (!providerEditFormDiv || !providerDefaultsDiv) return;
        
        const providerNameInput = document.getElementById('providerName');
        const providerApiKeyInput = document.getElementById('providerApiKey');
        const providerModelsTextarea = document.getElementById('providerModels');
        const providerEndpointInput = document.getElementById('providerEndpoint');
        const translateDefaultAiModelSelect = document.getElementById('defaultAiModelSelect');
        
        providerManager.setEditingProviderId(provider ? provider.id : null);
        
        // Hide defaults with animation
        providerDefaultsDiv.style.opacity = '0';
        providerDefaultsDiv.classList.remove('fade-in');
        providerDefaultsDiv.classList.add('fade-out');
        
        setTimeout(() => {
            providerDefaultsDiv.style.display = 'none';
            
            // Show form with animation
            providerEditFormDiv.style.display = 'block';
            providerEditFormDiv.style.opacity = '0';
            providerEditFormDiv.classList.remove('fade-out');
            providerEditFormDiv.classList.add('fade-in');
            
            // Animate opacity
            setTimeout(() => {
                providerEditFormDiv.style.opacity = '1';
            }, 10);
        }, 200);
        
        if (provider) {
            providerNameInput.value = provider.name;
            const electronAPI = this.getElectronAPI();
            if (electronAPI) {
                const apiKey = await electronAPI.invoke('store-get', provider.apiKeySettingKey, '');
                providerApiKeyInput.value = apiKey;
            }
            providerModelsTextarea.value = provider.models.join(', ');
            providerEndpointInput.value = provider.endpoint;
            
            translateDefaultAiModelSelect.innerHTML = '';
            provider.models.forEach(modelName => {
                const modelOption = document.createElement('option');
                modelOption.value = modelName;
                modelOption.text = modelName;
                translateDefaultAiModelSelect.appendChild(modelOption);
            });
            translateDefaultAiModelSelect.value = provider.defaultModel || provider.models[0];
        } else {
            providerNameInput.value = '';
            providerApiKeyInput.value = '';
            providerModelsTextarea.value = '';
            providerEndpointInput.value = '';
            translateDefaultAiModelSelect.innerHTML = '';
        }
    }
    
    hideProviderEditForm() {
        const providerEditFormDiv = document.getElementById('providerEditForm');
        const providerDefaultsDiv = document.getElementById('providerDefaults');
        
        if (!providerEditFormDiv || !providerDefaultsDiv) return;
        
        // Hide form with animation
        providerEditFormDiv.style.opacity = '0';
        providerEditFormDiv.classList.remove('fade-in');
        providerEditFormDiv.classList.add('fade-out');
        
        setTimeout(() => {
            providerEditFormDiv.style.display = 'none';
            
            // Show defaults with animation
            providerDefaultsDiv.style.display = 'block';
            providerDefaultsDiv.style.opacity = '0';
            providerDefaultsDiv.classList.remove('fade-out');
            providerDefaultsDiv.classList.add('fade-in');
            
            // Animate opacity
            setTimeout(() => {
                providerDefaultsDiv.style.opacity = '1';
            }, 10);
        }, 200);
    }
    
    addValidationStyles() {
        if (document.getElementById('validation-styles')) {
            return;
        }
        
        const styleElement = document.createElement('style');
        styleElement.id = 'validation-styles';
        styleElement.textContent = `
            .validation-status {
                margin-top: 8px;
                padding: 8px 12px;
                border-radius: 12px;
                font-size: 0.9em;
            }
            .validation-status.success {
                background-color: rgba(76, 175, 80, 0.2);
                color: #4caf50;
            }
            .validation-status.error {
                background-color: rgba(244, 67, 54, 0.2);
                color: #f44336;
            }
            .validation-status.pending {
                background-color: rgba(33, 150, 243, 0.2);
                color: #2196f3;
            }
            .fade-in {
                animation: fadeInAnimation 0.2s ease forwards;
            }
            .fade-out {
                animation: fadeOutAnimation 0.2s ease forwards;
            }
            @keyframes fadeInAnimation {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            @keyframes fadeOutAnimation {
                from { opacity: 1; transform: translateY(0); }
                to { opacity: 0; transform: translateY(-10px); }
            }
            #providerDefaults {
                transition: opacity 0.2s ease, transform 0.2s ease;
            }
            #providerEditForm {
                transition: opacity 0.2s ease, transform 0.2s ease;
            }
            .provider-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px;
                margin-bottom: 8px;
                background: rgba(255, 255, 255, 0.05);
                border-radius: 8px;
            }
            .provider-actions {
                display: flex;
                gap: 8px;
            }
            .provider-actions button {
                padding: 4px 12px;
                font-size: 12px;
                background: rgba(255, 255, 255, 0.1);
                border: none;
                border-radius: 6px;
                color: white;
                cursor: pointer;
                transition: background 0.2s;
            }
            .provider-actions button:hover {
                background: rgba(255, 255, 255, 0.2);
            }
        `;
        document.head.appendChild(styleElement);
    }
}
