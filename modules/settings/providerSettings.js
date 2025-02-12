import { ipcRenderer } from 'electron';

let translateAiProviders = []; // Renamed variable
let editingProviderId = null;

// --- Helper Functions (No changes) ---
function generateUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
}

function getApiKeyStorageKey(providerId) {
    return `aiProviderApiKey_${providerId}`;
}

// --- Load and Save Providers (Modified to merge default providers) ---
export function loadProviderSettings() {
    // Define the default providers including Gemini and now Groq
    const defaultProviders = [{
            id: 'openai',
            name: "OpenAI",
            apiKeySettingKey: getApiKeyStorageKey('openai'),
            models: ['gpt-3.5-turbo', 'o3-mini-2025-01-31', 'gpt-4o-mini'],
            defaultModel: 'gpt-3.5-turbo',
            endpoint: "https://api.openai.com/v1/chat/completions"
        },
        {
            id: 'sambanova',
            name: "SambaNova AI",
            apiKeySettingKey: getApiKeyStorageKey('sambanova'),
            models: ["DeepSeek-R1-Distill-Llama-70B"],
            defaultModel: "DeepSeek-R1-Distill-Llama-70B",
            endpoint: "https://api.sambanova.ai/v1/chat/completions"
        },
        {
            id: 'gemini',
            name: "Google Gemini",
            apiKeySettingKey: getApiKeyStorageKey('gemini'),
            models: ["gemini-2.0-flash-001", "gemini-2.0-pro-exp-02-05", "gemini-2.0-flash-lite-preview-02-05", "gemini-2.0-flash-thinking-exp-01-21", "gemini-1.5-flash", "gemini-1.5-pro"],
            defaultModel: "gemini-1.5-flash",
            endpoint: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
            isGemini: true
        },
        {
            id: 'groq',
            name: "Groq AI",
            apiKeySettingKey: getApiKeyStorageKey('groq'),
            models: ["distil-whisper-large-v3-en", "gemma2-9b-it", "llama-3.3-70b-versatile", "llama-3.1-8b-instant"],
            defaultModel: "gemma2-9b-it",
            endpoint: "https://api.groq.com/openai/v1/chat/completions"
        }
    ];
    const storedProviders = localStorage.getItem('aiProviders');
    if (storedProviders) {
        translateAiProviders = JSON.parse(storedProviders);
        // Merge default providers that are missing from persistent storage
        defaultProviders.forEach(defaultProvider => {
            if (!translateAiProviders.some(provider => provider.id === defaultProvider.id)) {
                translateAiProviders.push(defaultProvider);
            }
        });
    } else {
        translateAiProviders = defaultProviders;
    }
    localStorage.setItem('aiProviders', JSON.stringify(translateAiProviders));
     loadDefaultAiSettings();
}

export function saveProviderSettings() {
    localStorage.setItem('aiProviders', JSON.stringify(translateAiProviders));
     saveDefaultAiSettings();
}


// --- Populate UI Dropdowns (Modified variables names) ---
function populateProviderList() {
    const providerListDiv = document.getElementById('providerList');
    if(!providerListDiv) return;
    providerListDiv.innerHTML = '';
    translateAiProviders.forEach(provider => {
        const providerItem = document.createElement('div');
        providerItem.classList.add('provider-item');
        providerItem.innerHTML = `<span>${provider.name}</span><div class="provider-actions"><button class="edit-provider" data-id="${provider.id}">Edit</button><button class="delete-provider" data-id="${provider.id}">Delete</button></div>`;
        providerListDiv.appendChild(providerItem);
    });
}

function populateDefaultAiProvidersDropdown() {
    const translateDefaultAiProviderSelect = document.getElementById('defaultAiProviderSelect');
    if(!translateDefaultAiProviderSelect) return;
    translateDefaultAiProviderSelect.innerHTML = '';
    translateAiProviders.forEach(provider => {
        const option = document.createElement('option');
        option.value = provider.id;
        option.text = provider.name;
        translateDefaultAiProviderSelect.appendChild(option);
    });
}

function updateDefaultAiModelsDropdown(selectedProviderId) {
    const translateDefaultAiModelSelect = document.getElementById('defaultAiModelSelect');
    if(!translateDefaultAiModelSelect) return;
    translateDefaultAiModelSelect.innerHTML = '';
    const provider = translateAiProviders.find(p => p.id === selectedProviderId);
    if (provider && provider.models) {
        provider.models.forEach(modelName => {
            const modelOption = document.createElement('option');
            modelOption.value = modelName;
            modelOption.text = modelName;
            translateDefaultAiModelSelect.appendChild(modelOption);
        });
        translateDefaultAiModelSelect.value = localStorage.getItem('translateDefaultAiModel') || provider.defaultModel || provider.models[0];
    }
}

// --- Handle Provider Editing Form (Modified variables names) ---
function showProviderEditForm(provider = null) {
     const providerEditFormDiv = document.getElementById('providerEditForm');
    if(!providerEditFormDiv) return;
    const providerNameInput = document.getElementById('providerName');
    const providerApiKeyInput = document.getElementById('providerApiKey');
    const providerModelsTextarea = document.getElementById('providerModels');
    const providerEndpointInput = document.getElementById('providerEndpoint');
    const translateDefaultAiModelSelect = document.getElementById('defaultAiModelSelect');

    editingProviderId = provider ? provider.id : null;
    providerEditFormDiv.style.display = 'block';
    if (provider) {
        providerNameInput.value = provider.name;
        providerApiKeyInput.value = localStorage.getItem(provider.apiKeySettingKey) || '';
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

function hideProviderEditForm() {
    const providerEditFormDiv = document.getElementById('providerEditForm');
    if(!providerEditFormDiv) return;
    providerEditFormDiv.style.display = 'none';
    editingProviderId = null;
}

function saveCurrentProvider() {
    const providerNameInput = document.getElementById('providerName');
    const providerApiKeyInput = document.getElementById('providerApiKey');
    const providerModelsTextarea = document.getElementById('providerModels');
    const providerEndpointInput = document.getElementById('providerEndpoint');
    const translateDefaultAiModelSelect = document.getElementById('defaultAiModelSelect');
     if(!providerNameInput || !providerApiKeyInput || !providerModelsTextarea || !providerEndpointInput || !translateDefaultAiModelSelect) return;

    const providerData = {
        id: editingProviderId || generateUniqueId(),
        name: providerNameInput.value,
        models: providerModelsTextarea.value.split(',').map(m => m.trim()).filter(m => m),
        endpoint: providerEndpointInput.value,
        apiKeySettingKey: getApiKeyStorageKey(editingProviderId || generateUniqueId()),
        defaultModel: translateDefaultAiModelSelect.value
    };
    localStorage.setItem(providerData.apiKeySettingKey, providerApiKeyInput.value);
    if (editingProviderId) {
        const index = translateAiProviders.findIndex(p => p.id === editingProviderId);
        if (index !== -1) {
            translateAiProviders[index] = providerData;
        }
    } else {
        translateAiProviders.push(providerData);
    }
    saveProviderSettings();
    populateProviderList();
    hideProviderEditForm();
    populateDefaultAiProvidersDropdown();
      const translateDefaultAiProviderSelect = document.getElementById('defaultAiProviderSelect');
    if (translateDefaultAiProviderSelect) {
        translateDefaultAiProviderSelect.value = providerData.id;
        updateDefaultAiModelsDropdown(providerData.id);
    }
}

function deleteProvider(providerId) {
    translateAiProviders = translateAiProviders.filter(provider => provider.id !== providerId);
    saveProviderSettings();
    populateProviderList();
    populateDefaultAiProvidersDropdown();
}

function loadDefaultAiSettings(){
    populateDefaultAiProvidersDropdown();
    const translateDefaultAiProviderSelect = document.getElementById('defaultAiProviderSelect');
    if(!translateDefaultAiProviderSelect) return;
    const savedDefaultProvider = localStorage.getItem('translateDefaultAiProvider') || 'openai';
    translateDefaultAiProviderSelect.value = savedDefaultProvider;
    updateDefaultAiModelsDropdown(savedDefaultProvider);
    const translateDefaultAiModelSelect = document.getElementById('defaultAiModelSelect');
     if(!translateDefaultAiModelSelect) return;
    translateDefaultAiModelSelect.value = localStorage.getItem('translateDefaultAiModel') || '';
}

 function saveDefaultAiSettings(){
    const translateDefaultAiProviderSelect = document.getElementById('defaultAiProviderSelect');
    const translateDefaultAiModelSelect = document.getElementById('defaultAiModelSelect');
    if (translateDefaultAiProviderSelect) {
        localStorage.setItem('translateDefaultAiProvider', translateDefaultAiProviderSelect.value);
    }
    if (translateDefaultAiModelSelect) {
        localStorage.setItem('translateDefaultAiModel', translateDefaultAiModelSelect.value);
    }
}

export function initializeProviderSettingsUI() {
    const addProviderButton = document.getElementById('addProviderButton');
    const cancelProviderButton = document.getElementById('cancelProviderButton');
    const saveProviderButton = document.getElementById('saveProviderButton');
    const providerListDiv = document.getElementById('providerList');
    const translateDefaultAiProviderSelect = document.getElementById('defaultAiProviderSelect');
    const translateDefaultAiModelSelect = document.getElementById('defaultAiModelSelect');
    // --- Translate Tab Event Listeners ---
    if (addProviderButton) addProviderButton.addEventListener('click', () => showProviderEditForm(null));
    if (cancelProviderButton) cancelProviderButton.addEventListener('click', hideProviderEditForm);
    if (saveProviderButton) saveProviderButton.addEventListener('click', saveCurrentProvider);
    if (providerListDiv) {
        providerListDiv.addEventListener('click', (event) => {
            if (event.target.classList.contains('edit-provider')) {
                const providerId = event.target.dataset.id;
                const providerToEdit = translateAiProviders.find(p => p.id === providerId);
                if (providerToEdit) {
                    showProviderEditForm(providerToEdit);
                }
            } else if (event.target.classList.contains('delete-provider')) {
                const providerId = event.target.dataset.id;
                deleteProvider(providerId);
            }
        });
    }

    // Event listeners for default AI provider and model selection
     if(translateDefaultAiProviderSelect) {
        translateDefaultAiProviderSelect.addEventListener('change', (event) => {
            const selectedProviderId = event.target.value;
            updateDefaultAiModelsDropdown(selectedProviderId);
             saveProviderSettings();
        });
     }

    if(translateDefaultAiModelSelect){
        translateDefaultAiModelSelect.addEventListener('change',  saveProviderSettings);
    }

    loadProviderSettings();
    populateProviderList();
    loadDefaultAiSettings()
}
