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

/***/ "./modules/recording.js":
/*!******************************!*\
  !*** ./modules/recording.js ***!
  \******************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   startRecording: () => (/* binding */ startRecording),\n/* harmony export */   stopRecording: () => (/* binding */ stopRecording)\n/* harmony export */ });\n/* harmony import */ var _translation_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./translation.js */ \"./modules/translation.js\");\n/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./utils.js */ \"./modules/utils.js\");\n/* harmony import */ var _devices_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./devices.js */ \"./modules/devices.js\");\n\r\n\r\n\r\n\r\nlet mediaRecorder;\r\nlet socket;\r\nlet transcriptions = [];\r\nlet translations = [];\r\n\r\nasync function startRecording() {\r\n    try {\r\n        // Get ALL settings from localStorage\r\n        const selectedModel = localStorage.getItem('model') || 'nova-2';\r\n        const selectedLanguage = localStorage.getItem('sourceLanguage');\r\n        const targetLanguage = localStorage.getItem('targetLanguage');\r\n        const diarizationEnabled = localStorage.getItem('diarizationEnabled') === 'true';\r\n        const translationEnabled = localStorage.getItem('enableTranslation') === 'true';\r\n        const selectedDeviceId = localStorage.getItem('defaultInputDevice');\r\n        const deepgramKey = localStorage.getItem('deepgramApiKey');\r\n\r\n        // --- Get AI Provider Settings from localStorage using the unified keys ---\r\n        const defaultAiProviderId = localStorage.getItem('translateDefaultAiProvider') || 'openai';\r\n        const providersJson = localStorage.getItem('aiProviders');\r\n        const aiProviders = JSON.parse(providersJson);\r\n        const defaultAiProvider = aiProviders.find(provider => provider.id === defaultAiProviderId);\r\n        const defaultAiModel = localStorage.getItem('translateDefaultAiModel') || defaultAiProvider.defaultModel;\r\n\r\n\r\n        if (!selectedLanguage) {\r\n            console.error(\"No source language selected.\");\r\n            return;\r\n        }\r\n        if (!targetLanguage) {\r\n            console.error(\"No target language selected.\");\r\n            return;\r\n        }\r\n        if (!deepgramKey) {\r\n            console.error(\"Deepgram API key is not set. Please set it in settings.\");\r\n            document.getElementById('source-text').textContent =\r\n                'Deepgram API key is not set. Please set it in settings.';\r\n            return;\r\n        }\r\n\r\n        if (selectedDeviceId && !(await (0,_devices_js__WEBPACK_IMPORTED_MODULE_2__.isInputDeviceAvailable)(selectedDeviceId))) {\r\n            console.warn(`Previously selected input device (${selectedDeviceId}) is not available.`);\r\n            localStorage.removeItem('defaultInputDevice');\r\n            document.getElementById('source-text').textContent =\r\n                'Previously selected input device is not available. Using default device.';\r\n        }\r\n\r\n        let stream;\r\n        if (selectedDeviceId) {\r\n            stream = await navigator.mediaDevices.getUserMedia({\r\n                audio: {\r\n                    deviceId: selectedDeviceId\r\n                }\r\n            });\r\n        } else {\r\n            console.warn(\"Using default input device.\");\r\n            stream = await navigator.mediaDevices.getUserMedia({\r\n                audio: true\r\n            });\r\n            document.getElementById('source-text').textContent = 'Using default input device.';\r\n        }\r\n\r\n        mediaRecorder = new MediaRecorder(stream, {\r\n            mimeType: 'audio/webm'\r\n        });\r\n\r\n        // Build query parameters for Deepgram’s /listen endpoint.\r\n        // Always include model, language, and punctuation.\r\n        let queryParams = `?model=${selectedModel}&language=${selectedLanguage}&punctuate=true`;\r\n        if (diarizationEnabled) {\r\n            queryParams += `&diarize=true`;\r\n        }\r\n\r\n        socket = new WebSocket(`wss://api.deepgram.com/v1/listen${queryParams}`, ['token', deepgramKey]);\r\n\r\n        socket.onmessage = async (msg) => {\r\n            const parsed = JSON.parse(msg.data || '{}');\r\n            const transcript = parsed?.channel?.alternatives[0]?.transcript;\r\n            if (transcript) {\r\n                console.log(transcript);\r\n                if (document.getElementById('source-text').textContent === 'Previously selected input device is not available. Using default device.' ||\r\n                    document.getElementById('source-text').textContent === 'Using default input device.' ||\r\n                    document.getElementById('source-text').textContent === 'Deepgram API key is not set. Please set it in settings.') {\r\n                    document.getElementById('source-text').textContent = '';\r\n                }\r\n                document.getElementById('source-text').textContent += ` ${transcript}`;\r\n                transcriptions.push(transcript);\r\n\r\n                if (transcriptions.length > 10) {\r\n                    transcriptions.shift();\r\n                }\r\n\r\n                const pasteOption = document.getElementById('pasteOption').value;\r\n                if (pasteOption === 'source') {\r\n                    (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.pasteText)(transcript);\r\n                }\r\n\r\n                if (translationEnabled) {\r\n                    // Pass the transcript to translateWithAI (which handles provider selection)\r\n                    const translation = await (0,_translation_js__WEBPACK_IMPORTED_MODULE_0__.translateWithAI)(transcript, transcriptions.join(' '), translations.join(' '));\r\n                    translations.push(translation);\r\n                    if (translations.length > 10) {\r\n                        translations.shift();\r\n                    }\r\n                    console.log('translation', translation)\r\n                    document.getElementById('translated-text').textContent += ` ${translation}`;\r\n                    if (pasteOption === 'translated') {\r\n                        (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.pasteText)(translation);\r\n                    }\r\n                }\r\n            }\r\n        };\r\n\r\n        socket.onerror = (error) => {\r\n            console.error('WebSocket error:', error);\r\n        };\r\n\r\n        socket.onclose = () => {\r\n            console.log('WebSocket connection closed');\r\n        };\r\n\r\n        socket.onopen = () => {\r\n            mediaRecorder.start(50);\r\n            console.log('MediaRecorder started');\r\n            // Debug: Log the selected AI Provider and Model for verification.\r\n            console.log(\"Using AI Provider on Start:\", defaultAiProvider.name);\r\n            console.log(\"Using AI Model on Start:\", defaultAiModel);\r\n\r\n        };\r\n\r\n        mediaRecorder.ondataavailable = (event) => {\r\n            if (event.data.size > 0 && socket?.readyState === WebSocket.OPEN) {\r\n                socket.send(event.data);\r\n            }\r\n        };\r\n\r\n        document.getElementById('start').style.display = 'none';\r\n        document.getElementById('stop').style.display = 'block'; // Show Stop button\r\n\r\n    } catch (error) {\r\n        console.error('Error starting recording:', error);\r\n    }\r\n}\r\n\r\nfunction stopRecording() {\r\n    if (mediaRecorder && mediaRecorder.state !== 'inactive') {\r\n        mediaRecorder.stop();\r\n        console.log('Recording stopped');\r\n    }\r\n    if (socket) {\r\n        socket.close();\r\n        socket = null;\r\n    }\r\n    document.getElementById('start').style.display = 'block'; // Show Start button\r\n    document.getElementById('stop').style.display = 'none'; // Hide Stop button\r\n}\r\n\n\n//# sourceURL=webpack://realtime-translator/./modules/recording.js?");

/***/ }),

/***/ "./modules/translation.js":
/*!********************************!*\
  !*** ./modules/translation.js ***!
  \********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   translateWithAI: () => (/* binding */ translateWithAI)\n/* harmony export */ });\nasync function translateWithAI(text, context, translationContext) {\r\n  try {\r\n    const targetLangCode = document.getElementById('targetLanguage').value;\r\n    const targetLanguageMapping = { en: \"English\", es: \"Spanish\", zh: \"Chinese Simplified\" };\r\n    const targetLanguage = targetLanguageMapping[targetLangCode] || \"English\";\r\n    \r\n    // --- Get Translate AI Provider Settings from localStorage ---\r\n    const selectedProviderId = localStorage.getItem('translateDefaultAiProvider') || 'openai';\r\n    const providersJson = localStorage.getItem('aiProviders');\r\n    const translateAiProviders = JSON.parse(providersJson);\r\n    const selectedProvider = translateAiProviders.find(provider => provider.id === selectedProviderId);\r\n    if (!selectedProvider) {\r\n      console.error(`AI Provider with ID \"${selectedProviderId}\" not found in settings.`);\r\n      return `AI Provider \"${selectedProviderId}\" not configured.`;\r\n    }\r\n    const apiKey = localStorage.getItem(selectedProvider.apiKeySettingKey);\r\n    const translateAiModel = localStorage.getItem('translateDefaultAiModel') || selectedProvider.defaultModel;\r\n    if (!apiKey) {\r\n      console.error(`${selectedProvider.name} API key is not set. Please set it in settings.`);\r\n      return `${selectedProvider.name} API key not set.`;\r\n    }\r\n    \r\n    console.log(\"Using AI Provider:\", selectedProvider.name);\r\n    console.log(\"Using AI Model:\", translateAiModel);\r\n    \r\n    // --- Use OpenAI-compatible API call for all providers ---\r\n    let apiEndpoint = selectedProvider.endpoint;\r\n    // Override endpoints for providers that may have legacy endpoints in storage:\r\n    if (selectedProvider.id === 'gemini') {\r\n      apiEndpoint = \"https://generativelanguage.googleapis.com/v1beta/openai/chat/completions\";\r\n    } else if (selectedProvider.id === 'groq') {\r\n      apiEndpoint = \"https://api.groq.com/openai/v1/chat/completions\";\r\n    }\r\n    \r\n    const response = await fetch(apiEndpoint, {\r\n      method: 'POST',\r\n      headers: {\r\n        Authorization: `Bearer ${apiKey}`,\r\n        'Content-Type': 'application/json',\r\n      },\r\n      body: JSON.stringify({\r\n        model: translateAiModel,\r\n        messages: [{\r\n          role: 'user',\r\n          content: `### **Translation Guidelines**:\r\n1. **Contextual Continuity**: Use the provided context to predict and translate the next word naturally.\r\n2. **Accuracy & Brevity**: Ensure translations are concise and grammatically correct.\r\n3. **Preserve English Words**: Maintain words already in English.\r\n4. **Names & Locations**: Retain original names and locations.\r\n5. **Omit Quotation Marks**: Do not include quotation marks or extra characters.\r\n6. **Skip Ambiguous Words**: Skip words if uncertain.\r\n7. **No Redundancies**: Avoid repeating already translated words.\r\n8. **Avoid Over-translation**: Do not retranslate words already correctly translated.\r\n9. **Natural Translation**: Ensure natural phrasing.\r\n10. **Speed & Precision**: Prioritize fast, accurate translations.\r\n#### **Examples**:\r\n- Input: \"महात्मा\" with context \"मेरा नाम\" → Output: \"is Mahatma\"\r\n- Input: \"profesor\" with context \"Él es\" → Output: \"a teacher\"\r\n- Input: \"bonjour\" with context \"He greeted her saying\" → Output: \"hello\"\r\n- Input: \"Escuela\" with context \"Estamos en la\" → Output: \"school\"\r\n#### Translate the following text to ${targetLanguage}:\r\n- **Input**: Text: \"${text}\"\r\n- Input Context: \"${context}\"\r\n- Translation Context: \"${translationContext}\"\r\nOutput:`\r\n        }],\r\n      }),\r\n    });\r\n    \r\n    if (!response.ok) {\r\n      console.error(`Error in translation request: ${response.statusText}`);\r\n      return `Translation Error: ${response.statusText}`;\r\n    }\r\n    \r\n    const result = await response.json();\r\n    const translatedText = (result.choices && result.choices[0]?.message?.content)\r\n      ? result.choices[0].message.content.replaceAll('\"', '').replaceAll(`'`, '')\r\n      : '';\r\n    return translatedText.replace(/<think>.*?<\\/think>/gs, '').trim();\r\n  } catch (error) {\r\n    console.error('Error during translation:', error.message);\r\n    return `Translation Error: ${error.message}`;\r\n  }\r\n}\r\n\n\n//# sourceURL=webpack://realtime-translator/./modules/translation.js?");

/***/ }),

/***/ "./modules/ui.js":
/*!***********************!*\
  !*** ./modules/ui.js ***!
  \***********************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   initializeUI: () => (/* binding */ initializeUI),\n/* harmony export */   updateSourceLanguageDropdown: () => (/* binding */ updateSourceLanguageDropdown),\n/* harmony export */   updateTranslationUI: () => (/* binding */ updateTranslationUI)\n/* harmony export */ });\n/* harmony import */ var _devices_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./devices.js */ \"./modules/devices.js\");\n\r\n\r\n// Function to update the translation UI\r\nfunction updateTranslationUI(enableTranslation) {\r\n    const translationContainer = document.getElementById('translated-text').parentNode;\r\n    const targetLanguageSelect = document.getElementById('targetLanguage');\r\n    const arrowSpan = document.querySelector('.arrow');\r\n\r\n    const displayValue = enableTranslation ? 'block' : 'none';\r\n    translationContainer.style.display = displayValue;\r\n    targetLanguageSelect.style.display = displayValue;\r\n    arrowSpan.style.display = displayValue;\r\n}\r\n\r\n// New function to update ONLY the source language dropdown\r\nfunction updateSourceLanguageDropdown(model) {\r\n    const sourceLanguageSelect = document.getElementById('sourceLanguage');\r\n    updateLanguageOptions(sourceLanguageSelect, model); // Populate options based on model\r\n\r\n    // Set default source language based on model\r\n    if (model === 'nova-3') {\r\n        sourceLanguageSelect.value = 'en';\r\n        localStorage.setItem('sourceLanguage', 'en'); // Update localStorage too\r\n    } else if (model === 'nova-2') {\r\n        sourceLanguageSelect.value = 'multi';\r\n        localStorage.setItem('sourceLanguage', 'multi'); //Update local storage too\r\n    }\r\n}\r\n\r\n\r\nfunction updateLanguageOptions(languageSelect, model) {\r\n    languageSelect.innerHTML = '';\r\n\r\n    const options = (model === 'nova-2') ? [\r\n        { value: 'en-US', text: 'English (US)' },\r\n        { value: 'es-ES', text: 'Spanish (Spain)' },\r\n        { value: 'zh', text: 'Chinese Mandarin Simplified' },\r\n        { value: 'multi', text: 'Multi (English + Spanish)' }\r\n    ] : [\r\n        { value: 'en', text: 'English' }\r\n    ];\r\n\r\n    options.forEach(opt => {\r\n        const optionElement = document.createElement('option');\r\n        optionElement.value = opt.value;\r\n        optionElement.text = opt.text;\r\n        languageSelect.appendChild(optionElement);\r\n    });\r\n}\r\n\r\nfunction applySettingsToUI() {\r\n    const enableTranslation = localStorage.getItem('enableTranslation') === 'true';\r\n    const model = localStorage.getItem('model') || 'nova-2';\r\n\r\n    // --- Source Language ---\r\n    const sourceLanguageSelect = document.getElementById('sourceLanguage');\r\n    updateLanguageOptions(sourceLanguageSelect, model);\r\n    sourceLanguageSelect.value = localStorage.getItem('sourceLanguage') || (model === 'nova-2' ? 'multi' : 'en');\r\n    localStorage.setItem('sourceLanguage', sourceLanguageSelect.value);\r\n\r\n    // --- Target Language ---\r\n    const targetLanguageSelect = document.getElementById('targetLanguage');\r\n    const targetLanguageOptions = [\r\n        { value: 'en', text: 'English' },\r\n        { value: 'es', text: 'Spanish' },\r\n        { value: 'zh', text: 'Chinese Simplified' }\r\n    ];\r\n    targetLanguageOptions.forEach(opt => {\r\n        const optionElement = document.createElement('option');\r\n        optionElement.value = opt.value;\r\n        optionElement.text = opt.text;\r\n        targetLanguageSelect.appendChild(optionElement);\r\n    });\r\n    targetLanguageSelect.value = localStorage.getItem('targetLanguage') || 'en';\r\n    localStorage.setItem('targetLanguage', targetLanguageSelect.value);\r\n\r\n    // --- Translation Toggle ---\r\n    updateTranslationUI(enableTranslation);\r\n}\r\n\r\n\r\nfunction initializeUI() {\r\n    document.addEventListener('DOMContentLoaded', () => {\r\n        // Set up Reset button.\r\n        document.getElementById('reset').addEventListener('click', () => {\r\n            document.getElementById('source-text').textContent = '';\r\n            document.getElementById('translated-text').textContent = '';\r\n        });\r\n\r\n        applySettingsToUI();\r\n    });\r\n}\r\n\r\n\n\n//# sourceURL=webpack://realtime-translator/./modules/ui.js?");

/***/ }),

/***/ "./modules/utils.js":
/*!**************************!*\
  !*** ./modules/utils.js ***!
  \**************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   pasteText: () => (/* binding */ pasteText)\n/* harmony export */ });\n/* harmony import */ var electron__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! electron */ \"electron\");\n/* harmony import */ var electron__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(electron__WEBPACK_IMPORTED_MODULE_0__);\n\r\n\r\nasync function pasteText(text) {\r\n    try {\r\n        await electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.invoke('paste-text', text);\r\n    } catch (error) {\r\n        console.error('Error simulating auto paste:', error);\r\n    }\r\n}\r\n\n\n//# sourceURL=webpack://realtime-translator/./modules/utils.js?");

/***/ }),

/***/ "./renderer.js":
/*!*********************!*\
  !*** ./renderer.js ***!
  \*********************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony import */ var _modules_ui_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./modules/ui.js */ \"./modules/ui.js\");\n/* harmony import */ var _modules_recording_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./modules/recording.js */ \"./modules/recording.js\");\n/* harmony import */ var electron__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! electron */ \"electron\");\n/* harmony import */ var electron__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(electron__WEBPACK_IMPORTED_MODULE_2__);\n\r\n\r\n\r\n(0,_modules_ui_js__WEBPACK_IMPORTED_MODULE_0__.initializeUI)();\r\ndocument.getElementById('start').addEventListener('click', _modules_recording_js__WEBPACK_IMPORTED_MODULE_1__.startRecording);\r\ndocument.getElementById('stop').addEventListener('click', _modules_recording_js__WEBPACK_IMPORTED_MODULE_1__.stopRecording);\r\ndocument.getElementById('reset').addEventListener('click', () => {\r\n    document.getElementById('source-text').textContent = '';\r\n    document.getElementById('translated-text').textContent = '';\r\n});\r\ndocument.getElementById('typingAppButton').addEventListener('click', () => {\r\n    console.log('Typing App button clicked');\r\n});\r\ndocument.getElementById('settingsIcon').addEventListener('click', () => {\r\n    electron__WEBPACK_IMPORTED_MODULE_2__.ipcRenderer.send('open-settings');\r\n});\r\nelectron__WEBPACK_IMPORTED_MODULE_2__.ipcRenderer.on('update-translation-ui', (event, enableTranslation) => {\r\n    Promise.resolve(/*! import() */).then(__webpack_require__.bind(__webpack_require__, /*! ./modules/ui.js */ \"./modules/ui.js\")).then(ui => {\r\n        ui.updateTranslationUI(enableTranslation);\r\n    });\r\n});\r\nelectron__WEBPACK_IMPORTED_MODULE_2__.ipcRenderer.on('update-source-languages', (event, selectedModel) => {\r\n    (0,_modules_ui_js__WEBPACK_IMPORTED_MODULE_0__.updateSourceLanguageDropdown)(selectedModel);\r\n});\r\n\n\n//# sourceURL=webpack://realtime-translator/./renderer.js?");

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
/******/ 	var __webpack_exports__ = __webpack_require__("./renderer.js");
/******/ 	
/******/ })()
;