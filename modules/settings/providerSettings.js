import { ipcRenderer } from 'electron';
import { getStoreValue, setStoreValue } from '../storeBridge.js';

let translateAiProviders = []; // Renamed variable
let editingProviderId = null;

function generateUniqueId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
}

function getApiKeyStorageKey(providerId) {
  return `aiProviderApiKey_${providerId}`;
}

export async function loadProviderSettings() {
  const defaultProviders = [
    { id: 'openai', name: "OpenAI", apiKeySettingKey: getApiKeyStorageKey('openai'), models: ['gpt-3.5-turbo', 'o3-mini-2025-01-31', 'gpt-4o-mini'], defaultModel: 'gpt-3.5-turbo', endpoint: "https://api.openai.com/v1/chat/completions" },
    { id: 'sambanova', name: "SambaNova AI", apiKeySettingKey: getApiKeyStorageKey('sambanova'), models: ["DeepSeek-R1-Distill-Llama-70B"], defaultModel: "DeepSeek-R1-Distill-Llama-70B", endpoint: "https://api.sambanova.ai/v1/chat/completions" },
    { id: 'gemini', name: "Google Gemini", apiKeySettingKey: getApiKeyStorageKey('gemini'), models: ["gemini-2.0-flash-001", "gemini-2.0-pro-exp-02-05", "gemini-2.0-flash-lite-preview-02-05", "gemini-2.0-flash-thinking-exp-01-21", "gemini-1.5-flash", "gemini-1.5-pro"], defaultModel: "gemini-1.5-flash", endpoint: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", isGemini: true },
    { id: 'groq', name: "Groq AI", apiKeySettingKey: getApiKeyStorageKey('groq'), models: ["distil-whisper-large-v3-en", "gemma2-9b-it", "llama-3.3-70b-versatile", "llama-3.1-8b-instant"], defaultModel: "gemma2-9b-it", endpoint: "https://api.groq.com/openai/v1/chat/completions" }
  ];
  
  const storedProviders = await getStoreValue('aiProviders', null);
  if (storedProviders) {
    try {
      translateAiProviders = JSON.parse(storedProviders);
      // Merge missing default providers.
      defaultProviders.forEach(defaultProvider => {
        if (!translateAiProviders.some(provider => provider.id === defaultProvider.id)) {
          translateAiProviders.push(defaultProvider);
        }
      });
    } catch (e) {
      console.error("Error parsing stored aiProviders, using defaults.");
      translateAiProviders = defaultProviders;
    }
  } else {
    translateAiProviders = defaultProviders;
  }
  await setStoreValue('aiProviders', JSON.stringify(translateAiProviders));
  await loadDefaultAiSettings();
}

export async function saveProviderSettings() {
  await setStoreValue('aiProviders', JSON.stringify(translateAiProviders));
  await saveDefaultAiSettings();
}

function populateProviderList() {
  const providerListDiv = document.getElementById('providerList');
  if (!providerListDiv) return;
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
  if (!translateDefaultAiProviderSelect) return;
  translateDefaultAiProviderSelect.innerHTML = '';
  translateAiProviders.forEach(provider => {
    const option = document.createElement('option');
    option.value = provider.id;
    option.text = provider.name;
    translateDefaultAiProviderSelect.appendChild(option);
  });
}

async function updateDefaultAiModelsDropdown(selectedProviderId) {
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
    translateDefaultAiModelSelect.value = await getStoreValue('translateDefaultAiModel', provider.defaultModel || provider.models[0]);
  }
}

async function showProviderEditForm(provider = null) {
  const providerEditFormDiv = document.getElementById('providerEditForm');
  if (!providerEditFormDiv) return;
  const providerNameInput = document.getElementById('providerName');
  const providerApiKeyInput = document.getElementById('providerApiKey');
  const providerModelsTextarea = document.getElementById('providerModels');
  const providerEndpointInput = document.getElementById('providerEndpoint');
  const translateDefaultAiModelSelect = document.getElementById('defaultAiModelSelect');
  editingProviderId = provider ? provider.id : null;
  providerEditFormDiv.style.display = 'block';
  if (provider) {
    providerNameInput.value = provider.name;
    const apiKey = await getStoreValue(provider.apiKeySettingKey, '');
    providerApiKeyInput.value = apiKey;
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
  if (!providerEditFormDiv) return;
  providerEditFormDiv.style.display = 'none';
  editingProviderId = null;
}

async function saveCurrentProvider() {
  const providerNameInput = document.getElementById('providerName');
  const providerApiKeyInput = document.getElementById('providerApiKey');
  const providerModelsTextarea = document.getElementById('providerModels');
  const providerEndpointInput = document.getElementById('providerEndpoint');
  const translateDefaultAiModelSelect = document.getElementById('defaultAiModelSelect');
  if (!providerNameInput || !providerApiKeyInput || !providerModelsTextarea || !providerEndpointInput || !translateDefaultAiModelSelect) return;
  const providerData = {
    id: editingProviderId || generateUniqueId(),
    name: providerNameInput.value,
    models: providerModelsTextarea.value.split(',').map(m => m.trim()).filter(m => m),
    endpoint: providerEndpointInput.value,
    apiKeySettingKey: editingProviderId ? getApiKeyStorageKey(editingProviderId) : getApiKeyStorageKey(generateUniqueId()),
    defaultModel: translateDefaultAiModelSelect.value
  };
  await setStoreValue(providerData.apiKeySettingKey, providerApiKeyInput.value);
  if (editingProviderId) {
    const index = translateAiProviders.findIndex(p => p.id === editingProviderId);
    if (index !== -1) {
      translateAiProviders[index] = providerData;
    }
  } else {
    translateAiProviders.push(providerData);
  }
  await saveProviderSettings();
  populateProviderList();
  hideProviderEditForm();
  populateDefaultAiProvidersDropdown();
  const translateDefaultAiProviderSelect = document.getElementById('defaultAiProviderSelect');
  if (translateDefaultAiProviderSelect) {
    translateDefaultAiProviderSelect.value = providerData.id;
    await updateDefaultAiModelsDropdown(providerData.id);
  }
}

function deleteProvider(providerId) {
  translateAiProviders = translateAiProviders.filter(provider => provider.id !== providerId);
  saveProviderSettings();
  populateProviderList();
  populateDefaultAiProvidersDropdown();
}

async function loadDefaultAiSettings() {
  populateDefaultAiProvidersDropdown();
  const translateDefaultAiProviderSelect = document.getElementById('defaultAiProviderSelect');
  if (!translateDefaultAiProviderSelect) return;
  const savedDefaultProvider = await getStoreValue('translateDefaultAiProvider', 'openai');
  translateDefaultAiProviderSelect.value = savedDefaultProvider;
  await updateDefaultAiModelsDropdown(savedDefaultProvider);
  const translateDefaultAiModelSelect = document.getElementById('defaultAiModelSelect');
  if (!translateDefaultAiModelSelect) return;
  translateDefaultAiModelSelect.value = await getStoreValue('translateDefaultAiModel', '');
}

async function saveDefaultAiSettings() {
  const translateDefaultAiProviderSelect = document.getElementById('defaultAiProviderSelect');
  const translateDefaultAiModelSelect = document.getElementById('defaultAiModelSelect');
  if (translateDefaultAiProviderSelect) {
    await setStoreValue('translateDefaultAiProvider', translateDefaultAiProviderSelect.value);
  }
  if (translateDefaultAiModelSelect) {
    await setStoreValue('translateDefaultAiModel', translateDefaultAiModelSelect.value);
  }
}

export async function initializeProviderSettingsUI() {
  const addProviderButton = document.getElementById('addProviderButton');
  const cancelProviderButton = document.getElementById('cancelProviderButton');
  const saveProviderButton = document.getElementById('saveProviderButton');
  const providerListDiv = document.getElementById('providerList');
  const translateDefaultAiProviderSelect = document.getElementById('defaultAiProviderSelect');
  const translateDefaultAiModelSelect = document.getElementById('defaultAiModelSelect');
  
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
  if (translateDefaultAiProviderSelect) {
    translateDefaultAiProviderSelect.addEventListener('change', async (event) => {
      const selectedProviderId = event.target.value;
      await updateDefaultAiModelsDropdown(selectedProviderId);
      await saveProviderSettings();
    });
  }
  if (translateDefaultAiModelSelect) {
    translateDefaultAiModelSelect.addEventListener('change', async () => {
      await saveProviderSettings();
    });
  }
  await loadProviderSettings();
  populateProviderList();
  await loadDefaultAiSettings();
}

export { getStoreValue, setStoreValue };
