import { ipcRenderer } from 'electron';

let translateAiProviders = [];
let editingProviderId = null;

function generateUniqueId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
}

function getApiKeyStorageKey(providerId) {
  return `aiProviderApiKey_${providerId}`;
}

export async function loadProviderSettings() {
  const apiPane = document.getElementById('api');
  apiPane.innerHTML = `
    <div class="setting-group">
      <label for="deepgramApiKey">Deepgram API Key:</label>
      <input type="text" id="deepgramApiKey">
    </div>
    <div class="setting-group">
      <h3>AI Providers</h3>
      <div class="provider-grid">
        <div class="provider-left">
          <div id="providerList"></div>
          <button class="add-provider-btn" id="addProviderButton">Add Provider</button>
        </div>
        <div class="provider-right">
          <div id="providerDefaults">
            <div class="setting-group">
              <label for="defaultAiProviderSelect">Default Provider:</label>
              <select id="defaultAiProviderSelect"></select>
            </div>
            <div class="setting-group">
              <label for="defaultAiModelSelect">Default Model:</label>
              <select id="defaultAiModelSelect"></select>
            </div>
          </div>
          <div id="providerEditForm" class="setting-group" style="display: none;">
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

  const deepgramApiKeyInput = document.getElementById('deepgramApiKey');
  const deepgramApiKey = await ipcRenderer.invoke('store-get', 'deepgramApiKey', '');
  deepgramApiKeyInput.value = deepgramApiKey;

  const defaultProviders = [
    { id: 'openai', name: "OpenAI", apiKeySettingKey: getApiKeyStorageKey('openai'), models: ['gpt-3.5-turbo', 'o3-mini-2025-01-31', 'gpt-4o-mini'], defaultModel: 'gpt-3.5-turbo', endpoint: "https://api.openai.com/v1/chat/completions" },
    { id: 'sambanova', name: "SambaNova AI", apiKeySettingKey: getApiKeyStorageKey('sambanova'), models: ["DeepSeek-R1-Distill-Llama-70B"], defaultModel: "DeepSeek-R1-Distill-Llama-70B", endpoint: "https://api.sambanova.ai/v1/chat/completions" },
    { id: 'gemini', name: "Google Gemini", apiKeySettingKey: getApiKeyStorageKey('gemini'), models: ["gemini-2.0-flash-001", "gemini-2.0-pro-exp-02-05"], defaultModel: "gemini-1.5-flash", endpoint: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", isGemini: true },
    { id: 'groq', name: "Groq AI", apiKeySettingKey: getApiKeyStorageKey('groq'), models: ["distil-whisper-large-v3-en", "gemma2-9b-it"], defaultModel: "gemma2-9b-it", endpoint: "https://api.groq.com/openai/v1/chat/completions" }
  ];

  const storedProviders = await ipcRenderer.invoke('store-get', 'aiProviders', null);
  if (storedProviders) {
    try {
      translateAiProviders = JSON.parse(storedProviders);
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
  await ipcRenderer.invoke('store-set', 'aiProviders', JSON.stringify(translateAiProviders));
  await loadDefaultAiSettings();
  populateProviderList();
}

export async function saveProviderSettings() {
  const deepgramApiKeyInput = document.getElementById('deepgramApiKey');
  if (deepgramApiKeyInput) {
    const value = deepgramApiKeyInput.value;
    appState.setDeepgramApiKey(value);
    ipcRenderer.invoke('store-set', 'deepgramApiKey', value);
  }
  await ipcRenderer.invoke('store-set', 'aiProviders', JSON.stringify(translateAiProviders));
  await saveDefaultAiSettings();
}

function populateProviderList() {
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
    translateDefaultAiModelSelect.value = await ipcRenderer.invoke('store-get', 'translateDefaultAiModel', provider.defaultModel || provider.models[0]);
  }
}

async function showProviderEditForm(provider = null) {
  const providerEditFormDiv = document.getElementById('providerEditForm');
  const providerDefaultsDiv = document.getElementById('providerDefaults');
  if (!providerEditFormDiv || !providerDefaultsDiv) return;

  const providerNameInput = document.getElementById('providerName');
  const providerApiKeyInput = document.getElementById('providerApiKey');
  const providerModelsTextarea = document.getElementById('providerModels');
  const providerEndpointInput = document.getElementById('providerEndpoint');
  const translateDefaultAiModelSelect = document.getElementById('defaultAiModelSelect');

  editingProviderId = provider ? provider.id : null;

  // Hide defaults and show form with animation
  providerDefaultsDiv.style.display = 'none';
  providerEditFormDiv.style.display = 'block';
  providerEditFormDiv.classList.remove('fade-out');
  providerEditFormDiv.classList.add('fade-in');

  if (provider) {
    providerNameInput.value = provider.name;
    const apiKey = await ipcRenderer.invoke('store-get', provider.apiKeySettingKey, '');
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
  const providerDefaultsDiv = document.getElementById('providerDefaults');
  if (!providerEditFormDiv || !providerDefaultsDiv) return;

  providerEditFormDiv.classList.remove('fade-in');
  providerEditFormDiv.classList.add('fade-out');
  
  // Wait for animation to complete before hiding
  setTimeout(() => {
    providerEditFormDiv.style.display = 'none';
    providerDefaultsDiv.style.display = 'block';
    providerDefaultsDiv.classList.remove('fade-out');
    providerDefaultsDiv.classList.add('fade-in');
  }, 200); // Match animation duration

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
  await ipcRenderer.invoke('store-set', providerData.apiKeySettingKey, providerApiKeyInput.value);
  if (editingProviderId) {
    const index = translateAiProviders.findIndex(p => p.id === editingProviderId);
    if (index !== -1) translateAiProviders[index] = providerData;
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
  const savedDefaultProvider = await ipcRenderer.invoke('store-get', 'translateDefaultAiProvider', 'openai');
  translateDefaultAiProviderSelect.value = savedDefaultProvider;
  await updateDefaultAiModelsDropdown(savedDefaultProvider);
  const translateDefaultAiModelSelect = document.getElementById('defaultAiModelSelect');
  if (!translateDefaultAiModelSelect) return;
  translateDefaultAiModelSelect.value = await ipcRenderer.invoke('store-get', 'translateDefaultAiModel', '');
}

async function saveDefaultAiSettings() {
  const translateDefaultAiProviderSelect = document.getElementById('defaultAiProviderSelect');
  const translateDefaultAiModelSelect = document.getElementById('defaultAiModelSelect');
  if (translateDefaultAiProviderSelect) {
    await ipcRenderer.invoke('store-set', 'translateDefaultAiProvider', translateDefaultAiProviderSelect.value);
  }
  if (translateDefaultAiModelSelect) {
    await ipcRenderer.invoke('store-set', 'translateDefaultAiModel', translateDefaultAiModelSelect.value);
  }
}

export async function initializeProviderSettingsUI() {
  await loadProviderSettings();
  const addProviderButton = document.getElementById('addProviderButton');
  const cancelProviderButton = document.getElementById('cancelProviderButton');
  const saveProviderButton = document.getElementById('saveProviderButton');
  const providerListDiv = document.getElementById('providerList');
  const translateDefaultAiProviderSelect = document.getElementById('defaultAiProviderSelect');
  const translateDefaultAiModelSelect = document.getElementById('defaultAiModelSelect');
  const deepgramApiKeyInput = document.getElementById('deepgramApiKey');
  if (addProviderButton) addProviderButton.addEventListener('click', () => showProviderEditForm(null));
  if (cancelProviderButton) cancelProviderButton.addEventListener('click', hideProviderEditForm);
  if (saveProviderButton) saveProviderButton.addEventListener('click', saveCurrentProvider);
  if (providerListDiv) {
    providerListDiv.addEventListener('click', (event) => {
      if (event.target.classList.contains('edit-provider')) {
        const providerId = event.target.dataset.id;
        const providerToEdit = translateAiProviders.find(p => p.id === providerId);
        if (providerToEdit) showProviderEditForm(providerToEdit);
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
  if (deepgramApiKeyInput) {
    const debouncedSaveSettings = debounce(saveProviderSettings, 500);
    deepgramApiKeyInput.addEventListener('input', debouncedSaveSettings);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initializeProviderSettingsUI();
});
