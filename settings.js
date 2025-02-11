import { populateInputDevices } from './modules/devices.js';
import { ipcRenderer } from 'electron';

document.addEventListener('DOMContentLoaded', () => {
    const modelSelect = document.getElementById('model');
    const inputDeviceSettingsSelect = document.getElementById('inputDeviceSettings');
    const diarizationSettingsCheckbox = document.getElementById('diarizationSettings');
    const enableTranslationSettingsCheckbox = document.getElementById('enableTranslationSettings');
    const deepgramApiKeyInput = document.getElementById('deepgramApiKey');
    // --- Translate Tab Elements ---
    const providerListDiv = document.getElementById('providerList');
    const addProviderButton = document.getElementById('addProviderButton');
    const providerEditFormDiv = document.getElementById('providerEditForm');
    const providerNameInput = document.getElementById('providerName');
    const providerApiKeyInput = document.getElementById('providerApiKey');
    const providerModelsTextarea = document.getElementById('providerModels');
    const providerEndpointInput = document.getElementById('providerEndpoint');
    const saveProviderButton = document.getElementById('saveProviderButton');
    const cancelProviderButton = document.getElementById('cancelProviderButton');
    // New elements for default translate provider and model selection
    const translateDefaultAiProviderSelect = document.getElementById('defaultAiProviderSelect'); // Renamed
    const translateDefaultAiModelSelect = document.getElementById('defaultAiModelSelect'); // Renamed

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
    function loadProviders() {
        // Define the default providers including Gemini and now Groq
        const defaultProviders = [
            {
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
                models: [
                    "gemini-2.0-flash-001",
                    "gemini-2.0-pro-exp-02-05",
                    "gemini-2.0-flash-lite-preview-02-05",
                    "gemini-2.0-flash-thinking-exp-01-21",
                    "gemini-1.5-flash",
                    "gemini-1.5-pro"
                ],
                defaultModel: "gemini-1.5-flash",
                endpoint: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
                isGemini: true
            },
            {
                id: 'groq',
                name: "Groq AI",
                apiKeySettingKey: getApiKeyStorageKey('groq'),
                models: [
                    "distil-whisper-large-v3-en",
                    "gemma2-9b-it",
                    "llama-3.3-70b-versatile",
                    "llama-3.1-8b-instant"
                ],
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
    }
    function saveProviders() {
        localStorage.setItem('aiProviders', JSON.stringify(translateAiProviders));
    }

    // --- Populate UI Dropdowns (Modified variables names) ---
    function populateProviderList() {
        providerListDiv.innerHTML = '';
        translateAiProviders.forEach(provider => {
            const providerItem = document.createElement('div');
            providerItem.classList.add('provider-item');
            providerItem.innerHTML = `<span>${provider.name}</span><div class="provider-actions"><button class="edit-provider" data-id="${provider.id}">Edit</button><button class="delete-provider" data-id="${provider.id}">Delete</button></div>`;
            providerListDiv.appendChild(providerItem);
        });
    }
    function populateDefaultAiProvidersDropdown() {
        translateDefaultAiProviderSelect.innerHTML = '';
        translateAiProviders.forEach(provider => {
            const option = document.createElement('option');
            option.value = provider.id;
            option.text = provider.name;
            translateDefaultAiProviderSelect.appendChild(option);
        });
    }
    function updateDefaultAiModelsDropdown(selectedProviderId) {
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
        providerEditFormDiv.style.display = 'none';
        editingProviderId = null;
    }
    function saveCurrentProvider() {
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
        saveProviders();
        populateProviderList();
        hideProviderEditForm();
        populateDefaultAiProvidersDropdown();
        translateDefaultAiProviderSelect.value = providerData.id;
        updateDefaultAiModelsDropdown(providerData.id);
    }
    function deleteProvider(providerId) {
        translateAiProviders = translateAiProviders.filter(provider => provider.id !== providerId);
        saveProviders();
        populateProviderList();
        populateDefaultAiProvidersDropdown();
    }

    // Load settings (Speech Tab - existing functionality) (No changes)
    function loadSettings() {
        modelSelect.value = localStorage.getItem('model') || 'nova-2';
        populateInputDevices('inputDeviceSettings');
        const savedDevice = localStorage.getItem('defaultInputDevice');
        if (savedDevice) {
            inputDeviceSettingsSelect.value = savedDevice;
        }
        diarizationSettingsCheckbox.checked = localStorage.getItem('diarizationEnabled') === 'true';
        enableTranslationSettingsCheckbox.checked = localStorage.getItem('enableTranslation') === 'true';
        deepgramApiKeyInput.value = localStorage.getItem('deepgramApiKey') || '';
        // Load Translate Tab Settings - load defaults - call last for dependency order
        loadDefaultAiSettings();
    }
    function loadDefaultAiSettings(){
        populateDefaultAiProvidersDropdown();
        const savedDefaultProvider = localStorage.getItem('translateDefaultAiProvider') || 'openai';
        translateDefaultAiProviderSelect.value = savedDefaultProvider;
        updateDefaultAiModelsDropdown(savedDefaultProvider);
        translateDefaultAiModelSelect.value = localStorage.getItem('translateDefaultAiModel') || '';
    }
    // Save settings (Speech Tab - existing functionality) (No changes)
    function saveSettings() {
        if (modelSelect) {
            localStorage.setItem('model', modelSelect.value);
        }
        if (inputDeviceSettingsSelect) {
            localStorage.setItem('defaultInputDevice', inputDeviceSettingsSelect.value);
        }
        if (diarizationSettingsCheckbox) {
            localStorage.setItem('diarizationEnabled', diarizationSettingsCheckbox.checked);
        }
        if (enableTranslationSettingsCheckbox) {
            localStorage.setItem('enableTranslation', enableTranslationSettingsCheckbox.checked);
            ipcRenderer.send('translation-setting-changed', enableTranslationSettingsCheckbox.checked);
        }
        if (deepgramApiKeyInput) {
            localStorage.setItem('deepgramApiKey', deepgramApiKeyInput.value);
        }
        saveDefaultAiSettings();
    }
    function saveDefaultAiSettings(){
        if (translateDefaultAiProviderSelect) {
            localStorage.setItem('translateDefaultAiProvider', translateDefaultAiProviderSelect.value);
        }
        if (translateDefaultAiModelSelect) {
            localStorage.setItem('translateDefaultAiModel', translateDefaultAiModelSelect.value);
        }
    }

    // --- Event Listeners ---
    // Speech Tab Event Listeners (existing)
    // UPDATED: When the model select changes, save settings and notify main window to update sourceLanguage options.
    modelSelect.addEventListener('change', () => {
        saveSettings();
        ipcRenderer.send('model-setting-changed', modelSelect.value);
    });
    inputDeviceSettingsSelect.addEventListener('change', saveSettings);
    diarizationSettingsCheckbox.addEventListener('change', saveSettings);
    enableTranslationSettingsCheckbox.addEventListener('change', saveSettings);
    deepgramApiKeyInput.addEventListener('input', saveSettings);
    // --- Translate Tab Event Listeners ---
    addProviderButton.addEventListener('click', () => showProviderEditForm(null));
    cancelProviderButton.addEventListener('click', hideProviderEditForm);
    saveProviderButton.addEventListener('click', saveCurrentProvider);
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
    // Event listeners for default AI provider and model selection
    translateDefaultAiProviderSelect.addEventListener('change', (event) => {
        const selectedProviderId = event.target.value;
        updateDefaultAiModelsDropdown(selectedProviderId);
        saveSettings();
    });
    translateDefaultAiModelSelect.addEventListener('change', saveSettings);

    // --- Initial Setup ---
    loadSettings();
    loadProviders();
    populateProviderList();
    loadDefaultAiSettings();
});
