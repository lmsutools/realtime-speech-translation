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

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   getCorrectInputDevice: () => (/* binding */ getCorrectInputDevice),\n/* harmony export */   populateInputDevices: () => (/* binding */ populateInputDevices)\n/* harmony export */ });\nasync function populateInputDevices(selectElementId) {\r\n    try {\r\n        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });\r\n        const devices = await navigator.mediaDevices.enumerateDevices();\r\n        const audioInputDevices = devices.filter(device => device.kind === 'audioinput');\r\n        const inputSelect = document.getElementById(selectElementId);\r\n        if (!inputSelect) {\r\n          console.error(`Select element with ID '${selectElementId}' not found.`);\r\n          return;\r\n        }\r\n\t\tinputSelect.innerHTML = '';\r\n        audioInputDevices.forEach(device => {\r\n            const option = document.createElement('option');\r\n            option.value = device.deviceId;\r\n            option.text = device.label || `Microphone ${inputSelect.length + 1}`;\r\n            inputSelect.appendChild(option);\r\n        });\r\n        stream.getTracks().forEach(track => track.stop());\r\n\r\n    } catch (error) {\r\n        console.error('Error populating input devices:', error);\r\n    }\r\n}\r\n\r\n//This is not used anymore by recording, but kept if needed.\r\nasync function getCorrectInputDevice() {\r\n    try {\r\n        const inputSelect = document.getElementById('inputDevice');\r\n\r\n         //Check for saved\r\n        const defaultInputDevice = localStorage.getItem('defaultInputDevice')\r\n        const deviceId =  defaultInputDevice? defaultInputDevice : inputSelect.value;\r\n\r\n        console.log('Using input device:', deviceId);\r\n        const stream = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: deviceId } });\r\n        return stream;\r\n    } catch (error) {\r\n        console.error('Error selecting input device:', error);\r\n    }\r\n}\r\n\n\n//# sourceURL=webpack://realtime-translator/./modules/devices.js?");

/***/ }),

/***/ "./settings.js":
/*!*********************!*\
  !*** ./settings.js ***!
  \*********************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony import */ var _modules_devices_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./modules/devices.js */ \"./modules/devices.js\");\n\r\n\r\ndocument.addEventListener('DOMContentLoaded', () => {\r\n    const modelSelect = document.getElementById('model');\r\n    const defaultSourceLanguageSelect = document.getElementById('defaultSourceLanguage');\r\n    const defaultTargetLanguageSelect = document.getElementById('defaultTargetLanguage');\r\n    const inputDeviceSettingsSelect = document.getElementById('inputDeviceSettings');\r\n    const diarizationSettingsCheckbox = document.getElementById('diarizationSettings');\r\n    const enableTranslationSettingsCheckbox = document.getElementById('enableTranslationSettings');\r\n    const saveSettingsButton = document.getElementById('saveSettingsButton');\r\n\r\n\r\n     const targetLanguageOptions = [  //Target options\r\n        { value: 'en', text: 'English' },\r\n        { value: 'es', text: 'Spanish' },\r\n        { value: 'zh', text: 'Chinese Simplified' }\r\n    ];\r\n\r\n    // Populate Source Language Options (Consider moving this to a separate function)\r\n    const sourceLanguageOptions = [\r\n        { value: 'en-US', text: 'English (US)' },\r\n        { value: 'es-ES', text: 'Spanish (Spain)' },\r\n        { value: 'zh', text: 'Chinese Mandarin Simplified' },\r\n        { value: 'multi', text: 'Multi (English + Spanish)' }\r\n    ];\r\n    sourceLanguageOptions.forEach(opt => {\r\n        const optionElement = document.createElement('option');\r\n        optionElement.value = opt.value;\r\n        optionElement.text = opt.text;\r\n        defaultSourceLanguageSelect.appendChild(optionElement);\r\n    });\r\n\r\n     targetLanguageOptions.forEach(opt => {  //populate target\r\n        const optionElement = document.createElement('option');\r\n        optionElement.value = opt.value;\r\n        optionElement.text = opt.text;\r\n        defaultTargetLanguageSelect.appendChild(optionElement);\r\n    });\r\n\r\n    function updateLanguageOptionsByModel(languageSelect, model) {\r\n        languageSelect.innerHTML = ''; // Clear existing options\r\n\r\n        const options = (model === 'nova-2') ? [\r\n            { value: 'en-US', text: 'English (US)' },\r\n            { value: 'es-ES', text: 'Spanish (Spain)' },\r\n            { value: 'zh', text: 'Chinese Mandarin Simplified' },\r\n            { value: 'multi', text: 'Multi (English + Spanish)' }\r\n        ] : [\r\n            { value: 'en', text: 'English' } // nova-3 only supports English\r\n        ];\r\n\r\n        options.forEach(opt => {\r\n            const optionElement = document.createElement('option');\r\n            optionElement.value = opt.value;\r\n            optionElement.text = opt.text;\r\n            languageSelect.appendChild(optionElement);\r\n        });\r\n\r\n    }\r\n\r\n   // Save settings\r\n    function saveSettings() {\r\n        // Check if each element exists before accessing its properties\r\n        if (modelSelect) {\r\n            localStorage.setItem('model', modelSelect.value);\r\n        }\r\n        if (defaultSourceLanguageSelect) {\r\n            localStorage.setItem('defaultSourceLanguage', defaultSourceLanguageSelect.value);\r\n        }\r\n        if (defaultTargetLanguageSelect) {\r\n            localStorage.setItem('defaultTargetLanguage', defaultTargetLanguageSelect.value);\r\n        }\r\n        if (inputDeviceSettingsSelect) {\r\n            localStorage.setItem('defaultInputDevice', inputDeviceSettingsSelect.value);\r\n        }\r\n        if (diarizationSettingsCheckbox) {\r\n            localStorage.setItem('diarizationEnabled', diarizationSettingsCheckbox.checked);\r\n        }\r\n        if (enableTranslationSettingsCheckbox) {\r\n            localStorage.setItem('enableTranslation', enableTranslationSettingsCheckbox.checked);\r\n        }\r\n\r\n        // Update language options when model changes (if modelSelect exists)\r\n        if (modelSelect && defaultSourceLanguageSelect) {\r\n            updateLanguageOptionsByModel(defaultSourceLanguageSelect, modelSelect.value);\r\n        }\r\n    }\r\n\r\n    // Load settings\r\n    function loadSettings() {\r\n        // Load Model and update languages\r\n        const savedModel = localStorage.getItem('model') || 'nova-2';\r\n        modelSelect.value = savedModel;\r\n        updateLanguageOptionsByModel(defaultSourceLanguageSelect, savedModel);\r\n        defaultSourceLanguageSelect.value = localStorage.getItem('defaultSourceLanguage') || 'multi'; //Default\r\n        defaultTargetLanguageSelect.value = localStorage.getItem('defaultTargetLanguage') || 'en';\r\n\r\n        (0,_modules_devices_js__WEBPACK_IMPORTED_MODULE_0__.populateInputDevices)('inputDeviceSettings');\r\n        inputDeviceSettingsSelect.value = localStorage.getItem('defaultInputDevice') || ''; // No fallback\r\n        diarizationSettingsCheckbox.checked = localStorage.getItem('diarizationEnabled') === 'true';\r\n        enableTranslationSettingsCheckbox.checked = localStorage.getItem('enableTranslation') === 'true'; //Here no problem\r\n    }\r\n\r\n\r\n    // Event listeners for changes\r\n    modelSelect.addEventListener('change', saveSettings);\r\n    defaultSourceLanguageSelect.addEventListener('change', saveSettings);\r\n    defaultTargetLanguageSelect.addEventListener('change', saveSettings);\r\n    inputDeviceSettingsSelect.addEventListener('change', saveSettings);\r\n    diarizationSettingsCheckbox.addEventListener('change', saveSettings);\r\n    enableTranslationSettingsCheckbox.addEventListener('change', saveSettings);\r\n     //Update language by model\r\n     modelSelect.addEventListener('change', () => updateLanguageOptionsByModel(defaultSourceLanguageSelect, modelSelect.value));\r\n\r\n    // Explicit Save Button\r\n    saveSettingsButton.addEventListener('click', saveSettings);\r\n\r\n\r\n    // Initial loading\r\n    loadSettings();\r\n});\r\n\n\n//# sourceURL=webpack://realtime-translator/./settings.js?");

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