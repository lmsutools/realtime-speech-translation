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

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   populateInputDevices: () => (/* binding */ populateInputDevices)\n/* harmony export */ });\nasync function populateInputDevices(selectElementId) {\r\n    try {\r\n        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });\r\n        const devices = await navigator.mediaDevices.enumerateDevices();\r\n        const audioInputDevices = devices.filter(device => device.kind === 'audioinput');\r\n        const inputSelect = document.getElementById(selectElementId);\r\n        if (!inputSelect) {\r\n            console.error(`Select element with ID '${selectElementId}' not found.`);\r\n            return;\r\n        }\r\n        inputSelect.innerHTML = ''; // Clear options\r\n\r\n        const savedDeviceId = localStorage.getItem('defaultInputDevice'); // Get saved ID here\r\n\r\n        audioInputDevices.forEach(device => {\r\n            const option = document.createElement('option');\r\n            option.value = device.deviceId;\r\n            option.text = device.label || `Microphone ${inputSelect.length + 1}`;\r\n\r\n            // --- Set 'selected' attribute during population ---\r\n            if (savedDeviceId && device.deviceId === savedDeviceId) {\r\n                option.selected = true; // Select the matching device\r\n                console.log(`Device ${device.label} marked as selected because it matches saved ID: ${savedDeviceId}`);\r\n            }\r\n\r\n            inputSelect.appendChild(option);\r\n        });\r\n        stream.getTracks().forEach(track => track.stop());\r\n\r\n    } catch (error) {\r\n        console.error('Error populating input devices:', error);\r\n    }\r\n}\r\n\n\n//# sourceURL=webpack://realtime-translator/./modules/devices.js?");

/***/ }),

/***/ "./settings.js":
/*!*********************!*\
  !*** ./settings.js ***!
  \*********************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony import */ var _modules_devices_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./modules/devices.js */ \"./modules/devices.js\");\n/* harmony import */ var electron__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! electron */ \"electron\");\n/* harmony import */ var electron__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(electron__WEBPACK_IMPORTED_MODULE_1__);\n\r\n\r\n\r\ndocument.addEventListener('DOMContentLoaded', () => {\r\n    const modelSelect = document.getElementById('model');\r\n    const inputDeviceSettingsSelect = document.getElementById('inputDeviceSettings');\r\n    const diarizationSettingsCheckbox = document.getElementById('diarizationSettings');\r\n    const enableTranslationSettingsCheckbox = document.getElementById('enableTranslationSettings');\r\n    const deepgramApiKeyInput = document.getElementById('deepgramApiKey');\r\n\r\n    // Load settings\r\n    function loadSettings() {\r\n        modelSelect.value = localStorage.getItem('model') || 'nova-2';\r\n        (0,_modules_devices_js__WEBPACK_IMPORTED_MODULE_0__.populateInputDevices)('inputDeviceSettings');\r\n        const savedDevice = localStorage.getItem('defaultInputDevice');\r\n        if (savedDevice) {\r\n            inputDeviceSettingsSelect.value = savedDevice;\r\n        }\r\n        diarizationSettingsCheckbox.checked = localStorage.getItem('diarizationEnabled') === 'true';\r\n        enableTranslationSettingsCheckbox.checked = localStorage.getItem('enableTranslation') === 'true';\r\n        deepgramApiKeyInput.value = localStorage.getItem('deepgramApiKey') || '';\r\n    }\r\n\r\n    // Save settings\r\n    function saveSettings() {\r\n        let modelChanged = false; // Flag to check if the model actually changed\r\n        if (modelSelect) {\r\n            const previousModel = localStorage.getItem('model');\r\n            localStorage.setItem('model', modelSelect.value);\r\n            if (previousModel !== modelSelect.value) {\r\n                modelChanged = true; // Model has changed\r\n            }\r\n        }\r\n        if (inputDeviceSettingsSelect) {\r\n            localStorage.setItem('defaultInputDevice', inputDeviceSettingsSelect.value);\r\n        }\r\n        if (diarizationSettingsCheckbox) {\r\n            localStorage.setItem('diarizationEnabled', diarizationSettingsCheckbox.checked);\r\n        }\r\n        if (enableTranslationSettingsCheckbox) {\r\n            localStorage.setItem('enableTranslation', enableTranslationSettingsCheckbox.checked);\r\n            electron__WEBPACK_IMPORTED_MODULE_1__.ipcRenderer.send('translation-setting-changed', enableTranslationSettingsCheckbox.checked);\r\n        }\r\n        if (deepgramApiKeyInput) {\r\n            localStorage.setItem('deepgramApiKey', deepgramApiKeyInput.value);\r\n        }\r\n\r\n        if (modelChanged && modelSelect) {\r\n            // Send message to main process to update source languages in main window\r\n            electron__WEBPACK_IMPORTED_MODULE_1__.ipcRenderer.send('model-setting-changed', modelSelect.value);\r\n        }\r\n    }\r\n\r\n    // Event listeners\r\n    modelSelect.addEventListener('change', saveSettings);\r\n    inputDeviceSettingsSelect.addEventListener('change', saveSettings);\r\n    diarizationSettingsCheckbox.addEventListener('change', saveSettings);\r\n    enableTranslationSettingsCheckbox.addEventListener('change', saveSettings);\r\n    deepgramApiKeyInput.addEventListener('input', saveSettings);\r\n\r\n    // Initial loading\r\n    loadSettings();\r\n});\r\n\n\n//# sourceURL=webpack://realtime-translator/./settings.js?");

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