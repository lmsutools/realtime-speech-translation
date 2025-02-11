/*
 * ATTENTION: The "eval" devtool has been used (maybe by default in mode: "development").
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./modules/devices.js":
/*!****************************!*\
  !*** ./modules/devices.js ***!
  \****************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   isInputDeviceAvailable: () => (/* binding */ isInputDeviceAvailable),\n/* harmony export */   populateInputDevices: () => (/* binding */ populateInputDevices)\n/* harmony export */ });\n\r\nasync function populateInputDevices(selectElementId) {\r\n    try {\r\n        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });\r\n        const devices = await navigator.mediaDevices.enumerateDevices();\r\n        const audioInputDevices = devices.filter(device => device.kind === 'audioinput');\r\n        const inputSelect = document.getElementById(selectElementId);\r\n        if (!inputSelect) {\r\n            console.error(`Select element with ID '${selectElementId}' not found.`);\r\n            return;\r\n        }\r\n        inputSelect.innerHTML = ''; // Clear options\r\n\r\n        const savedDeviceId = localStorage.getItem('defaultInputDevice'); // Get saved ID here\r\n\r\n        audioInputDevices.forEach(device => {\r\n            const option = document.createElement('option');\r\n            option.value = device.deviceId;\r\n            option.text = device.label || `Microphone ${inputSelect.length + 1}`;\r\n\r\n            if (savedDeviceId && device.deviceId === savedDeviceId) {\r\n                option.selected = true;\r\n                console.log(`Device ${device.label} marked as selected because it matches saved ID: ${savedDeviceId}`);\r\n            }\r\n\r\n            inputSelect.appendChild(option);\r\n        });\r\n        stream.getTracks().forEach(track => track.stop());\r\n\r\n    } catch (error) {\r\n        console.error('Error populating input devices:', error);\r\n    }\r\n}\r\n\r\n// --- Explicitly export isInputDeviceAvailable ---\r\nasync function isInputDeviceAvailable(deviceId) {\r\n    try {\r\n        const devices = await navigator.mediaDevices.enumerateDevices();\r\n        const audioInputDevices = devices.filter(device => device.kind === 'audioinput');\r\n        return audioInputDevices.some(device => device.deviceId === deviceId);\r\n    } catch (error) {\r\n        console.error('Error checking device availability:', error);\r\n        return false;\r\n    }\r\n}\n\n//# sourceURL=webpack://realtime-translator/./modules/devices.js?");

/***/ }),

/***/ "./settings.js":
/*!*********************!*\
  !*** ./settings.js ***!
  \*********************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony import */ var _modules_devices_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./modules/devices.js */ \"./modules/devices.js\");\n/* harmony import */ var electron__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! electron */ \"electron\");\n/* harmony import */ var electron__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(electron__WEBPACK_IMPORTED_MODULE_1__);\n\r\n\r\n\r\ndocument.addEventListener('DOMContentLoaded', () => {\r\n    const modelSelect = document.getElementById('model');\r\n    const inputDeviceSettingsSelect = document.getElementById('inputDeviceSettings');\r\n    const diarizationSettingsCheckbox = document.getElementById('diarizationSettings');\r\n    const enableTranslationSettingsCheckbox = document.getElementById('enableTranslationSettings');\r\n    const deepgramApiKeyInput = document.getElementById('deepgramApiKey');\r\n    // --- Translate Tab Elements ---\r\n    const providerListDiv = document.getElementById('providerList');\r\n    const addProviderButton = document.getElementById('addProviderButton');\r\n    const providerEditFormDiv = document.getElementById('providerEditForm');\r\n    const providerNameInput = document.getElementById('providerName');\r\n    const providerApiKeyInput = document.getElementById('providerApiKey');\r\n    const providerModelsTextarea = document.getElementById('providerModels');\r\n    const providerEndpointInput = document.getElementById('providerEndpoint');\r\n    const saveProviderButton = document.getElementById('saveProviderButton');\r\n    const cancelProviderButton = document.getElementById('cancelProviderButton');\r\n    // New elements for default translate provider and model selection\r\n    const translateDefaultAiProviderSelect = document.getElementById('defaultAiProviderSelect'); // Renamed\r\n    const translateDefaultAiModelSelect = document.getElementById('defaultAiModelSelect'); // Renamed\r\n\r\n    let translateAiProviders = []; // Renamed variable\r\n    let editingProviderId = null;\r\n\r\n    // --- Helper Functions (No changes) ---\r\n    function generateUniqueId() {\r\n        return Date.now().toString(36) + Math.random().toString(36).substring(2, 5);\r\n    }\r\n    function getApiKeyStorageKey(providerId) {\r\n        return `aiProviderApiKey_${providerId}`;\r\n    }\r\n\r\n    // --- Load and Save Providers (Modified to merge default providers) ---\r\n    function loadProviders() {\r\n        // Define the default providers including Gemini and now Groq\r\n        const defaultProviders = [\r\n            {\r\n                id: 'openai',\r\n                name: \"OpenAI\",\r\n                apiKeySettingKey: getApiKeyStorageKey('openai'),\r\n                models: ['gpt-3.5-turbo', 'o3-mini-2025-01-31', 'gpt-4o-mini'],\r\n                defaultModel: 'gpt-3.5-turbo',\r\n                endpoint: \"https://api.openai.com/v1/chat/completions\"\r\n            },\r\n            {\r\n                id: 'sambanova',\r\n                name: \"SambaNova AI\",\r\n                apiKeySettingKey: getApiKeyStorageKey('sambanova'),\r\n                models: [\"DeepSeek-R1-Distill-Llama-70B\"],\r\n                defaultModel: \"DeepSeek-R1-Distill-Llama-70B\",\r\n                endpoint: \"https://api.sambanova.ai/v1/chat/completions\"\r\n            },\r\n            {\r\n                id: 'gemini',\r\n                name: \"Google Gemini\",\r\n                apiKeySettingKey: getApiKeyStorageKey('gemini'),\r\n                models: [\r\n                    \"gemini-2.0-flash-001\",\r\n                    \"gemini-2.0-pro-exp-02-05\",\r\n                    \"gemini-2.0-flash-lite-preview-02-05\",\r\n                    \"gemini-2.0-flash-thinking-exp-01-21\",\r\n                    \"gemini-1.5-flash\",\r\n                    \"gemini-1.5-pro\"\r\n                ],\r\n                defaultModel: \"gemini-1.5-flash\",\r\n                endpoint: \"https://generativelanguage.googleapis.com/v1beta/openai/chat/completions\",\r\n                isGemini: true\r\n            },\r\n            {\r\n                id: 'groq',\r\n                name: \"Groq AI\",\r\n                apiKeySettingKey: getApiKeyStorageKey('groq'),\r\n                models: [\r\n                    \"distil-whisper-large-v3-en\",\r\n                    \"gemma2-9b-it\",\r\n                    \"llama-3.3-70b-versatile\",\r\n                    \"llama-3.1-8b-instant\"\r\n                ],\r\n                defaultModel: \"gemma2-9b-it\",\r\n                endpoint: \"https://api.groq.com/openai/v1/chat/completions\"\r\n            }\r\n        ];\r\n\r\n        const storedProviders = localStorage.getItem('aiProviders');\r\n        if (storedProviders) {\r\n            translateAiProviders = JSON.parse(storedProviders);\r\n            // Merge default providers that are missing from persistent storage\r\n            defaultProviders.forEach(defaultProvider => {\r\n                if (!translateAiProviders.some(provider => provider.id === defaultProvider.id)) {\r\n                    translateAiProviders.push(defaultProvider);\r\n                }\r\n            });\r\n        } else {\r\n            translateAiProviders = defaultProviders;\r\n        }\r\n        localStorage.setItem('aiProviders', JSON.stringify(translateAiProviders));\r\n    }\r\n    function saveProviders() {\r\n        localStorage.setItem('aiProviders', JSON.stringify(translateAiProviders));\r\n    }\r\n\r\n    // --- Populate UI Dropdowns (Modified variables names) ---\r\n    function populateProviderList() {\r\n        providerListDiv.innerHTML = '';\r\n        translateAiProviders.forEach(provider => {\r\n            const providerItem = document.createElement('div');\r\n            providerItem.classList.add('provider-item');\r\n            providerItem.innerHTML = `<span>${provider.name}</span><div class=\"provider-actions\"><button class=\"edit-provider\" data-id=\"${provider.id}\">Edit</button><button class=\"delete-provider\" data-id=\"${provider.id}\">Delete</button></div>`;\r\n            providerListDiv.appendChild(providerItem);\r\n        });\r\n    }\r\n    function populateDefaultAiProvidersDropdown() {\r\n        translateDefaultAiProviderSelect.innerHTML = '';\r\n        translateAiProviders.forEach(provider => {\r\n            const option = document.createElement('option');\r\n            option.value = provider.id;\r\n            option.text = provider.name;\r\n            translateDefaultAiProviderSelect.appendChild(option);\r\n        });\r\n    }\r\n    function updateDefaultAiModelsDropdown(selectedProviderId) {\r\n        translateDefaultAiModelSelect.innerHTML = '';\r\n        const provider = translateAiProviders.find(p => p.id === selectedProviderId);\r\n        if (provider && provider.models) {\r\n            provider.models.forEach(modelName => {\r\n                const modelOption = document.createElement('option');\r\n                modelOption.value = modelName;\r\n                modelOption.text = modelName;\r\n                translateDefaultAiModelSelect.appendChild(modelOption);\r\n            });\r\n            translateDefaultAiModelSelect.value = localStorage.getItem('translateDefaultAiModel') || provider.defaultModel || provider.models[0];\r\n        }\r\n    }\r\n\r\n    // --- Handle Provider Editing Form (Modified variables names) ---\r\n    function showProviderEditForm(provider = null) {\r\n        editingProviderId = provider ? provider.id : null;\r\n        providerEditFormDiv.style.display = 'block';\r\n        if (provider) {\r\n            providerNameInput.value = provider.name;\r\n            providerApiKeyInput.value = localStorage.getItem(provider.apiKeySettingKey) || '';\r\n            providerModelsTextarea.value = provider.models.join(', ');\r\n            providerEndpointInput.value = provider.endpoint;\r\n            translateDefaultAiModelSelect.innerHTML = '';\r\n            provider.models.forEach(modelName => {\r\n                const modelOption = document.createElement('option');\r\n                modelOption.value = modelName;\r\n                modelOption.text = modelName;\r\n                translateDefaultAiModelSelect.appendChild(modelOption);\r\n            });\r\n            translateDefaultAiModelSelect.value = provider.defaultModel || provider.models[0];\r\n        } else {\r\n            providerNameInput.value = '';\r\n            providerApiKeyInput.value = '';\r\n            providerModelsTextarea.value = '';\r\n            providerEndpointInput.value = '';\r\n            translateDefaultAiModelSelect.innerHTML = '';\r\n        }\r\n    }\r\n    function hideProviderEditForm() {\r\n        providerEditFormDiv.style.display = 'none';\r\n        editingProviderId = null;\r\n    }\r\n    function saveCurrentProvider() {\r\n        const providerData = {\r\n            id: editingProviderId || generateUniqueId(),\r\n            name: providerNameInput.value,\r\n            models: providerModelsTextarea.value.split(',').map(m => m.trim()).filter(m => m),\r\n            endpoint: providerEndpointInput.value,\r\n            apiKeySettingKey: getApiKeyStorageKey(editingProviderId || generateUniqueId()),\r\n            defaultModel: translateDefaultAiModelSelect.value\r\n        };\r\n        localStorage.setItem(providerData.apiKeySettingKey, providerApiKeyInput.value);\r\n        if (editingProviderId) {\r\n            const index = translateAiProviders.findIndex(p => p.id === editingProviderId);\r\n            if (index !== -1) {\r\n                translateAiProviders[index] = providerData;\r\n            }\r\n        } else {\r\n            translateAiProviders.push(providerData);\r\n        }\r\n        saveProviders();\r\n        populateProviderList();\r\n        hideProviderEditForm();\r\n        populateDefaultAiProvidersDropdown();\r\n        translateDefaultAiProviderSelect.value = providerData.id;\r\n        updateDefaultAiModelsDropdown(providerData.id);\r\n    }\r\n    function deleteProvider(providerId) {\r\n        translateAiProviders = translateAiProviders.filter(provider => provider.id !== providerId);\r\n        saveProviders();\r\n        populateProviderList();\r\n        populateDefaultAiProvidersDropdown();\r\n    }\r\n\r\n    // Load settings (Speech Tab - existing functionality) (No changes)\r\n    function loadSettings() {\r\n        modelSelect.value = localStorage.getItem('model') || 'nova-2';\r\n        (0,_modules_devices_js__WEBPACK_IMPORTED_MODULE_0__.populateInputDevices)('inputDeviceSettings');\r\n        const savedDevice = localStorage.getItem('defaultInputDevice');\r\n        if (savedDevice) {\r\n            inputDeviceSettingsSelect.value = savedDevice;\r\n        }\r\n        diarizationSettingsCheckbox.checked = localStorage.getItem('diarizationEnabled') === 'true';\r\n        enableTranslationSettingsCheckbox.checked = localStorage.getItem('enableTranslation') === 'true';\r\n        deepgramApiKeyInput.value = localStorage.getItem('deepgramApiKey') || '';\r\n        // Load Translate Tab Settings - load defaults - call last for dependency order\r\n        loadDefaultAiSettings();\r\n    }\r\n    function loadDefaultAiSettings(){\r\n        populateDefaultAiProvidersDropdown();\r\n        const savedDefaultProvider = localStorage.getItem('translateDefaultAiProvider') || 'openai';\r\n        translateDefaultAiProviderSelect.value = savedDefaultProvider;\r\n        updateDefaultAiModelsDropdown(savedDefaultProvider);\r\n        translateDefaultAiModelSelect.value = localStorage.getItem('translateDefaultAiModel') || '';\r\n    }\r\n    // Save settings (Speech Tab - existing functionality) (No changes)\r\n    function saveSettings() {\r\n        if (modelSelect) {\r\n            localStorage.setItem('model', modelSelect.value);\r\n        }\r\n        if (inputDeviceSettingsSelect) {\r\n            localStorage.setItem('defaultInputDevice', inputDeviceSettingsSelect.value);\r\n        }\r\n        if (diarizationSettingsCheckbox) {\r\n            localStorage.setItem('diarizationEnabled', diarizationSettingsCheckbox.checked);\r\n        }\r\n        if (enableTranslationSettingsCheckbox) {\r\n            localStorage.setItem('enableTranslation', enableTranslationSettingsCheckbox.checked);\r\n            electron__WEBPACK_IMPORTED_MODULE_1__.ipcRenderer.send('translation-setting-changed', enableTranslationSettingsCheckbox.checked);\r\n        }\r\n        if (deepgramApiKeyInput) {\r\n            localStorage.setItem('deepgramApiKey', deepgramApiKeyInput.value);\r\n        }\r\n        saveDefaultAiSettings();\r\n    }\r\n    function saveDefaultAiSettings(){\r\n        if (translateDefaultAiProviderSelect) {\r\n            localStorage.setItem('translateDefaultAiProvider', translateDefaultAiProviderSelect.value);\r\n        }\r\n        if (translateDefaultAiModelSelect) {\r\n            localStorage.setItem('translateDefaultAiModel', translateDefaultAiModelSelect.value);\r\n        }\r\n    }\r\n\r\n    // --- Event Listeners ---\r\n    // Speech Tab Event Listeners (existing)\r\n    // UPDATED: When the model select changes, save settings and notify main window to update sourceLanguage options.\r\n    modelSelect.addEventListener('change', () => {\r\n        saveSettings();\r\n        electron__WEBPACK_IMPORTED_MODULE_1__.ipcRenderer.send('model-setting-changed', modelSelect.value);\r\n    });\r\n    inputDeviceSettingsSelect.addEventListener('change', saveSettings);\r\n    diarizationSettingsCheckbox.addEventListener('change', saveSettings);\r\n    enableTranslationSettingsCheckbox.addEventListener('change', saveSettings);\r\n    deepgramApiKeyInput.addEventListener('input', saveSettings);\r\n    // --- Translate Tab Event Listeners ---\r\n    addProviderButton.addEventListener('click', () => showProviderEditForm(null));\r\n    cancelProviderButton.addEventListener('click', hideProviderEditForm);\r\n    saveProviderButton.addEventListener('click', saveCurrentProvider);\r\n    providerListDiv.addEventListener('click', (event) => {\r\n        if (event.target.classList.contains('edit-provider')) {\r\n            const providerId = event.target.dataset.id;\r\n            const providerToEdit = translateAiProviders.find(p => p.id === providerId);\r\n            if (providerToEdit) {\r\n                showProviderEditForm(providerToEdit);\r\n            }\r\n        } else if (event.target.classList.contains('delete-provider')) {\r\n            const providerId = event.target.dataset.id;\r\n            deleteProvider(providerId);\r\n        }\r\n    });\r\n    // Event listeners for default AI provider and model selection\r\n    translateDefaultAiProviderSelect.addEventListener('change', (event) => {\r\n        const selectedProviderId = event.target.value;\r\n        updateDefaultAiModelsDropdown(selectedProviderId);\r\n        saveSettings();\r\n    });\r\n    translateDefaultAiModelSelect.addEventListener('change', saveSettings);\r\n\r\n    // --- Initial Setup ---\r\n    loadSettings();\r\n    loadProviders();\r\n    populateProviderList();\r\n    loadDefaultAiSettings();\r\n});\r\n\n\n//# sourceURL=webpack://realtime-translator/./settings.js?");

/***/ }),

/***/ "electron":
/*!***************************!*\
  !*** external "electron" ***!
  \***************************/
/***/ ((module) => {

module.exports = require("electron");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module can't be inlined because the eval devtool is used.
/******/ 	var __webpack_exports__ = __webpack_require__("./settings.js");
/******/ 	
/******/ })()
;