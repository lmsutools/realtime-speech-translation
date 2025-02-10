/*
 * ATTENTION: The "eval" devtool has been used (maybe by default in mode: "development").
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ "./modules/devices.js":
/*!****************************!*\
  !*** ./modules/devices.js ***!
  \****************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   populateInputDevices: () => (/* binding */ populateInputDevices)\n/* harmony export */ });\nasync function populateInputDevices(selectElementId) {\r\n    try {\r\n        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });\r\n        const devices = await navigator.mediaDevices.enumerateDevices();\r\n        const audioInputDevices = devices.filter(device => device.kind === 'audioinput');\r\n        const inputSelect = document.getElementById(selectElementId);\r\n        if (!inputSelect) {\r\n            console.error(`Select element with ID '${selectElementId}' not found.`);\r\n            return;\r\n        }\r\n        inputSelect.innerHTML = ''; // Clear options\r\n\r\n        const savedDeviceId = localStorage.getItem('defaultInputDevice'); // Get saved ID here\r\n\r\n        audioInputDevices.forEach(device => {\r\n            const option = document.createElement('option');\r\n            option.value = device.deviceId;\r\n            option.text = device.label || `Microphone ${inputSelect.length + 1}`;\r\n\r\n            // --- Set 'selected' attribute during population ---\r\n            if (savedDeviceId && device.deviceId === savedDeviceId) {\r\n                option.selected = true; // Select the matching device\r\n                console.log(`Device ${device.label} marked as selected because it matches saved ID: ${savedDeviceId}`);\r\n            }\r\n\r\n            inputSelect.appendChild(option);\r\n        });\r\n        stream.getTracks().forEach(track => track.stop());\r\n\r\n    } catch (error) {\r\n        console.error('Error populating input devices:', error);\r\n    }\r\n}\r\n\n\n//# sourceURL=webpack://realtime-translator/./modules/devices.js?");

/***/ }),

/***/ "./modules/recording.js":
/*!******************************!*\
  !*** ./modules/recording.js ***!
  \******************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   startRecording: () => (/* binding */ startRecording),\n/* harmony export */   stopRecording: () => (/* binding */ stopRecording)\n/* harmony export */ });\n/* harmony import */ var _translation_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./translation.js */ \"./modules/translation.js\");\n/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./utils.js */ \"./modules/utils.js\");\n/* harmony import */ var _devices_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./devices.js */ \"./modules/devices.js\");\n\r\n\r\n // Import the new function\r\n\r\nlet mediaRecorder;\r\nlet socket;\r\nlet transcriptions = [];\r\nlet translations = [];\r\n\r\nasync function startRecording() {\r\n    try {\r\n        // Get settings from localStorage\r\n        const selectedModel = localStorage.getItem('model') || 'nova-2';\r\n        const selectedLanguage = localStorage.getItem('sourceLanguage');\r\n        const targetLanguage = localStorage.getItem('targetLanguage');\r\n        const diarizationEnabled = localStorage.getItem('diarizationEnabled') === 'true';\r\n        const translationEnabled = localStorage.getItem('enableTranslation') === 'true';\r\n        let selectedDeviceId = localStorage.getItem('defaultInputDevice'); // Get stored ID\r\n\r\n        if (!selectedLanguage) {\r\n            console.error(\"No source language selected.\");\r\n            return;\r\n        }\r\n        if (!targetLanguage) {\r\n            console.error(\"No target language selected.\");\r\n            return;\r\n        }\r\n\r\n        // --- Device Availability Check ---\r\n        if (selectedDeviceId && !(await (0,_devices_js__WEBPACK_IMPORTED_MODULE_2__.isInputDeviceAvailable)(selectedDeviceId))) {\r\n            console.warn(`Previously selected input device (${selectedDeviceId}) is not available.`);\r\n            localStorage.removeItem('defaultInputDevice'); // Clear the stored ID\r\n            selectedDeviceId = null; // Don't use the unavailable device\r\n             //Show message in UI.\r\n            document.getElementById('source-text').textContent = 'Previously selected input device is not available. Using default device.';\r\n        }\r\n\r\n        let stream;\r\n        if (selectedDeviceId) {\r\n            // If we have a valid, available device ID, use it\r\n            stream = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: selectedDeviceId } });\r\n        } else {\r\n            // Otherwise, fall back to the default device\r\n            console.warn(\"Using default input device.\");\r\n            stream = await navigator.mediaDevices.getUserMedia({ audio: true });\r\n             //Show message in UI.\r\n            document.getElementById('source-text').textContent = 'Using default input device.';\r\n\r\n        }\r\n\r\n        mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });\r\n\r\n        let queryParams = `?model=${selectedModel}&language=${selectedLanguage}&punctuate=true`;\r\n        if (diarizationEnabled) {\r\n            queryParams += `&diarize=true`;\r\n        }\r\n\r\n        socket = new WebSocket(`wss://api.deepgram.com/v1/listen${queryParams}`, ['token', process.env.DEEPGRAM_KEY]);\r\n\r\n        socket.onmessage = async (msg) => {\r\n            const parsed = JSON.parse(msg.data || '{}');\r\n            const transcript = parsed?.channel?.alternatives[0]?.transcript;\r\n\r\n            if (transcript) {\r\n                console.log(transcript);\r\n                 //Show message in UI.\r\n                if(document.getElementById('source-text').textContent == 'Previously selected input device is not available. Using default device.'\r\n                || document.getElementById('source-text').textContent == 'Using default input device.'){\r\n                     document.getElementById('source-text').textContent = '';\r\n                }\r\n                document.getElementById('source-text').textContent += ` ${transcript}`;\r\n                transcriptions.push(transcript);\r\n                if (transcriptions.length > 10) {\r\n                    transcriptions.shift();\r\n                }\r\n\r\n                const pasteOption = document.getElementById('pasteOption').value;\r\n                if (pasteOption === 'source') {\r\n                    (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.pasteText)(transcript);\r\n                }\r\n\r\n                if (translationEnabled) {\r\n                    const translation = await (0,_translation_js__WEBPACK_IMPORTED_MODULE_0__.translateWithAI)(transcript, transcriptions.join(' '), translations.join(' '));\r\n                    translations.push(translation);\r\n                    if (translations.length > 10) {\r\n                        translations.shift();\r\n                    }\r\n                    console.log('translation', translation);\r\n                    document.getElementById('translated-text').textContent += ` ${translation}`;\r\n                    if (pasteOption === 'translated') {\r\n                        (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.pasteText)(translation);\r\n                    }\r\n                }\r\n            }\r\n        };\r\n\r\n        socket.onerror = (error) => {\r\n            console.error('WebSocket error:', error);\r\n        };\r\n        socket.onclose = () => {\r\n            console.log('WebSocket connection closed');\r\n        };\r\n        socket.onopen = () => {\r\n            mediaRecorder.start(50);\r\n            console.log('MediaRecorder started');\r\n        };\r\n        mediaRecorder.ondataavailable = (event) => {\r\n            if (event.data.size > 0 && socket?.readyState === WebSocket.OPEN) {\r\n                socket.send(event.data);\r\n            }\r\n        };\r\n        document.getElementById('start').style.display = 'none';\r\n        document.getElementById('stop').style.display = 'block';\r\n\r\n    } catch (error) {\r\n        console.error('Error starting recording:', error);\r\n    }\r\n}\r\n\r\nfunction stopRecording() {\r\n    if (mediaRecorder && mediaRecorder.state !== 'inactive') {\r\n        mediaRecorder.stop();\r\n        console.log('Recording stopped');\r\n    }\r\n    if (socket) {\r\n        socket.close();\r\n        socket = null;\r\n    }\r\n    document.getElementById('start').style.display = 'block';\r\n    document.getElementById('stop').style.display = 'none';\r\n}\r\n\n\n//# sourceURL=webpack://realtime-translator/./modules/recording.js?");

/***/ }),

/***/ "./modules/translation.js":
/*!********************************!*\
  !*** ./modules/translation.js ***!
  \********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   translateWithAI: () => (/* binding */ translateWithAI)\n/* harmony export */ });\n\r\nasync function translateWithAI(text, context, translationContext) {\r\n  try {\r\n    // Get the target language from the dropdown.\r\n    const targetLangCode = document.getElementById('targetLanguage').value;\r\n    const targetLanguageMapping = {\r\n      en: \"English\",\r\n      es: \"Spanish\",\r\n      zh: \"Chinese Simplified\"\r\n    };\r\n    const targetLanguage = targetLanguageMapping[targetLangCode] || \"English\";\r\n\r\n    const response = await fetch('https://api.openai.com/v1/chat/completions', {\r\n      method: 'POST',\r\n      headers: {\r\n        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,\r\n        'Content-Type': 'application/json',\r\n      },\r\n      body: JSON.stringify({\r\n        model: 'gpt-3.5-turbo',\r\n        messages: [{\r\n          role: 'user',\r\n          content: `### **Translation Guidelines**:\r\n1. **Contextual Continuity**: Use the provided context to predict and translate the next word naturally.\r\n2. **Accuracy & Brevity**: Ensure translations are concise and grammatically correct.\r\n3. **Preserve English Words**: Maintain words already in English.\r\n4. **Names & Locations**: Retain original names and locations.\r\n5. **Omit Quotation Marks**: Do not include quotation marks or extra characters.\r\n6. **Skip Ambiguous Words**: Skip words if uncertain.\r\n7. **No Redundancies**: Avoid repeating already translated words.\r\n8. **Avoid Over-translation**: Do not retranslate words already correctly translated.\r\n9. **Natural Translation**: Ensure natural phrasing.\r\n10. **Speed & Precision**: Prioritize fast, accurate translations.\r\n#### **Examples**:\r\n- Input: \"महात्मा\" with context \"मेरा नाम\" → Output: \"is Mahatma\"\r\n- Input: \"profesor\" with context \"Él es\" → Output: \"a teacher\"\r\n- Input: \"bonjour\" with context \"He greeted her saying\" → Output: \"hello\"\r\n- Input: \"Escuela\" with context \"Estamos en la\" → Output: \"school\"\r\n\r\n#### Translate the following text to ${targetLanguage}:\r\n- **Input**: Text: \"${text}\"\r\n- Input Context: \"${context}\"\r\n- Translation Context: \"${translationContext}\"\r\nOutput:`,\r\n        }],\r\n      }),\r\n    });\r\n\r\n    if (!response.ok) {\r\n      console.error(`Error in translation request: ${response.statusText}`);\r\n      return '';\r\n    }\r\n    const { choices } = await response.json();\r\n    return (choices[0]?.message?.content || '')\r\n      .replaceAll('\"', '')\r\n      .replaceAll(`'`, '');\r\n  } catch (error) {\r\n    console.error('Error during translation:', error.message);\r\n    return '';\r\n  }\r\n}\r\n\n\n//# sourceURL=webpack://realtime-translator/./modules/translation.js?");

/***/ }),

/***/ "./modules/ui.js":
/*!***********************!*\
  !*** ./modules/ui.js ***!
  \***********************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   initializeUI: () => (/* binding */ initializeUI),\n/* harmony export */   updateSourceLanguageDropdown: () => (/* binding */ updateSourceLanguageDropdown),\n/* harmony export */   updateTranslationUI: () => (/* binding */ updateTranslationUI)\n/* harmony export */ });\n/* harmony import */ var _devices_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./devices.js */ \"./modules/devices.js\");\n\r\n\r\n// Function to update the translation UI\r\nfunction updateTranslationUI(enableTranslation) {\r\n    const translationContainer = document.getElementById('translated-text').parentNode;\r\n    const targetLanguageSelect = document.getElementById('targetLanguage');\r\n    const arrowSpan = document.querySelector('.arrow');\r\n\r\n    const displayValue = enableTranslation ? 'block' : 'none';\r\n    translationContainer.style.display = displayValue;\r\n    targetLanguageSelect.style.display = displayValue;\r\n    arrowSpan.style.display = displayValue;\r\n}\r\n\r\n// New function to update ONLY the source language dropdown\r\nfunction updateSourceLanguageDropdown(model) {\r\n    const sourceLanguageSelect = document.getElementById('sourceLanguage');\r\n    updateLanguageOptions(sourceLanguageSelect, model); // Populate options based on model\r\n\r\n    // Set default source language based on model\r\n    if (model === 'nova-3') {\r\n        sourceLanguageSelect.value = 'en';\r\n        localStorage.setItem('sourceLanguage', 'en'); // Update localStorage too\r\n    } else if (model === 'nova-2') {\r\n        sourceLanguageSelect.value = 'multi';\r\n        localStorage.setItem('sourceLanguage', 'multi'); //Update local storage too\r\n    }\r\n}\r\n\r\n\r\nfunction updateLanguageOptions(languageSelect, model) {\r\n    languageSelect.innerHTML = '';\r\n\r\n    const options = (model === 'nova-2') ? [\r\n        { value: 'en-US', text: 'English (US)' },\r\n        { value: 'es-ES', text: 'Spanish (Spain)' },\r\n        { value: 'zh', text: 'Chinese Mandarin Simplified' },\r\n        { value: 'multi', text: 'Multi (English + Spanish)' }\r\n    ] : [\r\n        { value: 'en', text: 'English' }\r\n    ];\r\n\r\n    options.forEach(opt => {\r\n        const optionElement = document.createElement('option');\r\n        optionElement.value = opt.value;\r\n        optionElement.text = opt.text;\r\n        languageSelect.appendChild(optionElement);\r\n    });\r\n}\r\n\r\nfunction applySettingsToUI() {\r\n    const enableTranslation = localStorage.getItem('enableTranslation') === 'true';\r\n    const model = localStorage.getItem('model') || 'nova-2';\r\n\r\n    // --- Source Language ---\r\n    const sourceLanguageSelect = document.getElementById('sourceLanguage');\r\n    updateLanguageOptions(sourceLanguageSelect, model);\r\n    sourceLanguageSelect.value = localStorage.getItem('sourceLanguage') || (model === 'nova-2' ? 'multi' : 'en');\r\n    localStorage.setItem('sourceLanguage', sourceLanguageSelect.value);\r\n\r\n    // --- Target Language ---\r\n    const targetLanguageSelect = document.getElementById('targetLanguage');\r\n    const targetLanguageOptions = [\r\n        { value: 'en', text: 'English' },\r\n        { value: 'es', text: 'Spanish' },\r\n        { value: 'zh', text: 'Chinese Simplified' }\r\n    ];\r\n    targetLanguageOptions.forEach(opt => {\r\n        const optionElement = document.createElement('option');\r\n        optionElement.value = opt.value;\r\n        optionElement.text = opt.text;\r\n        targetLanguageSelect.appendChild(optionElement);\r\n    });\r\n    targetLanguageSelect.value = localStorage.getItem('targetLanguage') || 'en';\r\n    localStorage.setItem('targetLanguage', targetLanguageSelect.value);\r\n\r\n    // --- Translation Toggle ---\r\n    updateTranslationUI(enableTranslation);\r\n}\r\n\r\n\r\nfunction initializeUI() {\r\n    document.addEventListener('DOMContentLoaded', () => {\r\n        // Set up Reset button.\r\n        document.getElementById('reset').addEventListener('click', () => {\r\n            document.getElementById('source-text').textContent = '';\r\n            document.getElementById('translated-text').textContent = '';\r\n        });\r\n\r\n        applySettingsToUI();\r\n    });\r\n}\r\n\r\n\n\n//# sourceURL=webpack://realtime-translator/./modules/ui.js?");

/***/ }),

/***/ "./modules/utils.js":
/*!**************************!*\
  !*** ./modules/utils.js ***!
  \**************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   pasteText: () => (/* binding */ pasteText)\n/* harmony export */ });\n/* harmony import */ var electron__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! electron */ \"electron\");\n/* harmony import */ var electron__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(electron__WEBPACK_IMPORTED_MODULE_0__);\n\r\n\r\nasync function pasteText(text) {\r\n    try {\r\n        await electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.invoke('paste-text', text);\r\n    } catch (error) {\r\n        console.error('Error simulating auto paste:', error);\r\n    }\r\n}\r\n\n\n//# sourceURL=webpack://realtime-translator/./modules/utils.js?");

/***/ }),

/***/ "./node_modules/dotenv/lib/main.js":
/*!*****************************************!*\
  !*** ./node_modules/dotenv/lib/main.js ***!
  \*****************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

eval("const fs = __webpack_require__(/*! fs */ \"fs\")\nconst path = __webpack_require__(/*! path */ \"path\")\nconst os = __webpack_require__(/*! os */ \"os\")\nconst crypto = __webpack_require__(/*! crypto */ \"crypto\")\nconst packageJson = __webpack_require__(/*! ../package.json */ \"./node_modules/dotenv/package.json\")\n\nconst version = packageJson.version\n\nconst LINE = /(?:^|^)\\s*(?:export\\s+)?([\\w.-]+)(?:\\s*=\\s*?|:\\s+?)(\\s*'(?:\\\\'|[^'])*'|\\s*\"(?:\\\\\"|[^\"])*\"|\\s*`(?:\\\\`|[^`])*`|[^#\\r\\n]+)?\\s*(?:#.*)?(?:$|$)/mg\n\n// Parse src into an Object\nfunction parse (src) {\n  const obj = {}\n\n  // Convert buffer to string\n  let lines = src.toString()\n\n  // Convert line breaks to same format\n  lines = lines.replace(/\\r\\n?/mg, '\\n')\n\n  let match\n  while ((match = LINE.exec(lines)) != null) {\n    const key = match[1]\n\n    // Default undefined or null to empty string\n    let value = (match[2] || '')\n\n    // Remove whitespace\n    value = value.trim()\n\n    // Check if double quoted\n    const maybeQuote = value[0]\n\n    // Remove surrounding quotes\n    value = value.replace(/^(['\"`])([\\s\\S]*)\\1$/mg, '$2')\n\n    // Expand newlines if double quoted\n    if (maybeQuote === '\"') {\n      value = value.replace(/\\\\n/g, '\\n')\n      value = value.replace(/\\\\r/g, '\\r')\n    }\n\n    // Add to object\n    obj[key] = value\n  }\n\n  return obj\n}\n\nfunction _parseVault (options) {\n  const vaultPath = _vaultPath(options)\n\n  // Parse .env.vault\n  const result = DotenvModule.configDotenv({ path: vaultPath })\n  if (!result.parsed) {\n    const err = new Error(`MISSING_DATA: Cannot parse ${vaultPath} for an unknown reason`)\n    err.code = 'MISSING_DATA'\n    throw err\n  }\n\n  // handle scenario for comma separated keys - for use with key rotation\n  // example: DOTENV_KEY=\"dotenv://:key_1234@dotenvx.com/vault/.env.vault?environment=prod,dotenv://:key_7890@dotenvx.com/vault/.env.vault?environment=prod\"\n  const keys = _dotenvKey(options).split(',')\n  const length = keys.length\n\n  let decrypted\n  for (let i = 0; i < length; i++) {\n    try {\n      // Get full key\n      const key = keys[i].trim()\n\n      // Get instructions for decrypt\n      const attrs = _instructions(result, key)\n\n      // Decrypt\n      decrypted = DotenvModule.decrypt(attrs.ciphertext, attrs.key)\n\n      break\n    } catch (error) {\n      // last key\n      if (i + 1 >= length) {\n        throw error\n      }\n      // try next key\n    }\n  }\n\n  // Parse decrypted .env string\n  return DotenvModule.parse(decrypted)\n}\n\nfunction _log (message) {\n  console.log(`[dotenv@${version}][INFO] ${message}`)\n}\n\nfunction _warn (message) {\n  console.log(`[dotenv@${version}][WARN] ${message}`)\n}\n\nfunction _debug (message) {\n  console.log(`[dotenv@${version}][DEBUG] ${message}`)\n}\n\nfunction _dotenvKey (options) {\n  // prioritize developer directly setting options.DOTENV_KEY\n  if (options && options.DOTENV_KEY && options.DOTENV_KEY.length > 0) {\n    return options.DOTENV_KEY\n  }\n\n  // secondary infra already contains a DOTENV_KEY environment variable\n  if (process.env.DOTENV_KEY && process.env.DOTENV_KEY.length > 0) {\n    return process.env.DOTENV_KEY\n  }\n\n  // fallback to empty string\n  return ''\n}\n\nfunction _instructions (result, dotenvKey) {\n  // Parse DOTENV_KEY. Format is a URI\n  let uri\n  try {\n    uri = new URL(dotenvKey)\n  } catch (error) {\n    if (error.code === 'ERR_INVALID_URL') {\n      const err = new Error('INVALID_DOTENV_KEY: Wrong format. Must be in valid uri format like dotenv://:key_1234@dotenvx.com/vault/.env.vault?environment=development')\n      err.code = 'INVALID_DOTENV_KEY'\n      throw err\n    }\n\n    throw error\n  }\n\n  // Get decrypt key\n  const key = uri.password\n  if (!key) {\n    const err = new Error('INVALID_DOTENV_KEY: Missing key part')\n    err.code = 'INVALID_DOTENV_KEY'\n    throw err\n  }\n\n  // Get environment\n  const environment = uri.searchParams.get('environment')\n  if (!environment) {\n    const err = new Error('INVALID_DOTENV_KEY: Missing environment part')\n    err.code = 'INVALID_DOTENV_KEY'\n    throw err\n  }\n\n  // Get ciphertext payload\n  const environmentKey = `DOTENV_VAULT_${environment.toUpperCase()}`\n  const ciphertext = result.parsed[environmentKey] // DOTENV_VAULT_PRODUCTION\n  if (!ciphertext) {\n    const err = new Error(`NOT_FOUND_DOTENV_ENVIRONMENT: Cannot locate environment ${environmentKey} in your .env.vault file.`)\n    err.code = 'NOT_FOUND_DOTENV_ENVIRONMENT'\n    throw err\n  }\n\n  return { ciphertext, key }\n}\n\nfunction _vaultPath (options) {\n  let possibleVaultPath = null\n\n  if (options && options.path && options.path.length > 0) {\n    if (Array.isArray(options.path)) {\n      for (const filepath of options.path) {\n        if (fs.existsSync(filepath)) {\n          possibleVaultPath = filepath.endsWith('.vault') ? filepath : `${filepath}.vault`\n        }\n      }\n    } else {\n      possibleVaultPath = options.path.endsWith('.vault') ? options.path : `${options.path}.vault`\n    }\n  } else {\n    possibleVaultPath = path.resolve(process.cwd(), '.env.vault')\n  }\n\n  if (fs.existsSync(possibleVaultPath)) {\n    return possibleVaultPath\n  }\n\n  return null\n}\n\nfunction _resolveHome (envPath) {\n  return envPath[0] === '~' ? path.join(os.homedir(), envPath.slice(1)) : envPath\n}\n\nfunction _configVault (options) {\n  _log('Loading env from encrypted .env.vault')\n\n  const parsed = DotenvModule._parseVault(options)\n\n  let processEnv = process.env\n  if (options && options.processEnv != null) {\n    processEnv = options.processEnv\n  }\n\n  DotenvModule.populate(processEnv, parsed, options)\n\n  return { parsed }\n}\n\nfunction configDotenv (options) {\n  const dotenvPath = path.resolve(process.cwd(), '.env')\n  let encoding = 'utf8'\n  const debug = Boolean(options && options.debug)\n\n  if (options && options.encoding) {\n    encoding = options.encoding\n  } else {\n    if (debug) {\n      _debug('No encoding is specified. UTF-8 is used by default')\n    }\n  }\n\n  let optionPaths = [dotenvPath] // default, look for .env\n  if (options && options.path) {\n    if (!Array.isArray(options.path)) {\n      optionPaths = [_resolveHome(options.path)]\n    } else {\n      optionPaths = [] // reset default\n      for (const filepath of options.path) {\n        optionPaths.push(_resolveHome(filepath))\n      }\n    }\n  }\n\n  // Build the parsed data in a temporary object (because we need to return it).  Once we have the final\n  // parsed data, we will combine it with process.env (or options.processEnv if provided).\n  let lastError\n  const parsedAll = {}\n  for (const path of optionPaths) {\n    try {\n      // Specifying an encoding returns a string instead of a buffer\n      const parsed = DotenvModule.parse(fs.readFileSync(path, { encoding }))\n\n      DotenvModule.populate(parsedAll, parsed, options)\n    } catch (e) {\n      if (debug) {\n        _debug(`Failed to load ${path} ${e.message}`)\n      }\n      lastError = e\n    }\n  }\n\n  let processEnv = process.env\n  if (options && options.processEnv != null) {\n    processEnv = options.processEnv\n  }\n\n  DotenvModule.populate(processEnv, parsedAll, options)\n\n  if (lastError) {\n    return { parsed: parsedAll, error: lastError }\n  } else {\n    return { parsed: parsedAll }\n  }\n}\n\n// Populates process.env from .env file\nfunction config (options) {\n  // fallback to original dotenv if DOTENV_KEY is not set\n  if (_dotenvKey(options).length === 0) {\n    return DotenvModule.configDotenv(options)\n  }\n\n  const vaultPath = _vaultPath(options)\n\n  // dotenvKey exists but .env.vault file does not exist\n  if (!vaultPath) {\n    _warn(`You set DOTENV_KEY but you are missing a .env.vault file at ${vaultPath}. Did you forget to build it?`)\n\n    return DotenvModule.configDotenv(options)\n  }\n\n  return DotenvModule._configVault(options)\n}\n\nfunction decrypt (encrypted, keyStr) {\n  const key = Buffer.from(keyStr.slice(-64), 'hex')\n  let ciphertext = Buffer.from(encrypted, 'base64')\n\n  const nonce = ciphertext.subarray(0, 12)\n  const authTag = ciphertext.subarray(-16)\n  ciphertext = ciphertext.subarray(12, -16)\n\n  try {\n    const aesgcm = crypto.createDecipheriv('aes-256-gcm', key, nonce)\n    aesgcm.setAuthTag(authTag)\n    return `${aesgcm.update(ciphertext)}${aesgcm.final()}`\n  } catch (error) {\n    const isRange = error instanceof RangeError\n    const invalidKeyLength = error.message === 'Invalid key length'\n    const decryptionFailed = error.message === 'Unsupported state or unable to authenticate data'\n\n    if (isRange || invalidKeyLength) {\n      const err = new Error('INVALID_DOTENV_KEY: It must be 64 characters long (or more)')\n      err.code = 'INVALID_DOTENV_KEY'\n      throw err\n    } else if (decryptionFailed) {\n      const err = new Error('DECRYPTION_FAILED: Please check your DOTENV_KEY')\n      err.code = 'DECRYPTION_FAILED'\n      throw err\n    } else {\n      throw error\n    }\n  }\n}\n\n// Populate process.env with parsed values\nfunction populate (processEnv, parsed, options = {}) {\n  const debug = Boolean(options && options.debug)\n  const override = Boolean(options && options.override)\n\n  if (typeof parsed !== 'object') {\n    const err = new Error('OBJECT_REQUIRED: Please check the processEnv argument being passed to populate')\n    err.code = 'OBJECT_REQUIRED'\n    throw err\n  }\n\n  // Set process.env\n  for (const key of Object.keys(parsed)) {\n    if (Object.prototype.hasOwnProperty.call(processEnv, key)) {\n      if (override === true) {\n        processEnv[key] = parsed[key]\n      }\n\n      if (debug) {\n        if (override === true) {\n          _debug(`\"${key}\" is already defined and WAS overwritten`)\n        } else {\n          _debug(`\"${key}\" is already defined and was NOT overwritten`)\n        }\n      }\n    } else {\n      processEnv[key] = parsed[key]\n    }\n  }\n}\n\nconst DotenvModule = {\n  configDotenv,\n  _configVault,\n  _parseVault,\n  config,\n  decrypt,\n  parse,\n  populate\n}\n\nmodule.exports.configDotenv = DotenvModule.configDotenv\nmodule.exports._configVault = DotenvModule._configVault\nmodule.exports._parseVault = DotenvModule._parseVault\nmodule.exports.config = DotenvModule.config\nmodule.exports.decrypt = DotenvModule.decrypt\nmodule.exports.parse = DotenvModule.parse\nmodule.exports.populate = DotenvModule.populate\n\nmodule.exports = DotenvModule\n\n\n//# sourceURL=webpack://realtime-translator/./node_modules/dotenv/lib/main.js?");

/***/ }),

/***/ "./renderer.js":
/*!*********************!*\
  !*** ./renderer.js ***!
  \*********************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony import */ var dotenv__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! dotenv */ \"./node_modules/dotenv/lib/main.js\");\n/* harmony import */ var dotenv__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(dotenv__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var _modules_ui_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./modules/ui.js */ \"./modules/ui.js\");\n/* harmony import */ var _modules_recording_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./modules/recording.js */ \"./modules/recording.js\");\n/* harmony import */ var electron__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! electron */ \"electron\");\n/* harmony import */ var electron__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(electron__WEBPACK_IMPORTED_MODULE_3__);\n\r\ndotenv__WEBPACK_IMPORTED_MODULE_0___default().config();\r\n // Import the new function\r\n\r\n\r\n\r\n(0,_modules_ui_js__WEBPACK_IMPORTED_MODULE_1__.initializeUI)();\r\n\r\ndocument.getElementById('start').addEventListener('click', _modules_recording_js__WEBPACK_IMPORTED_MODULE_2__.startRecording);\r\ndocument.getElementById('stop').addEventListener('click', _modules_recording_js__WEBPACK_IMPORTED_MODULE_2__.stopRecording);\r\ndocument.getElementById('typingAppButton').addEventListener('click', () => {\r\n    console.log('Typing App button clicked');\r\n});\r\n\r\ndocument.getElementById('settingsIcon').addEventListener('click', () => {\r\n    electron__WEBPACK_IMPORTED_MODULE_3__.ipcRenderer.send('open-settings');\r\n});\r\n\r\nelectron__WEBPACK_IMPORTED_MODULE_3__.ipcRenderer.on('update-translation-ui', (event, enableTranslation) => {\r\n    Promise.resolve(/*! import() */).then(__webpack_require__.bind(__webpack_require__, /*! ./modules/ui.js */ \"./modules/ui.js\")).then(ui => {\r\n        ui.updateTranslationUI(enableTranslation);\r\n    });\r\n});\r\n\r\n// Listen for source language updates from main process\r\nelectron__WEBPACK_IMPORTED_MODULE_3__.ipcRenderer.on('update-source-languages', (event, selectedModel) => {\r\n    (0,_modules_ui_js__WEBPACK_IMPORTED_MODULE_1__.updateSourceLanguageDropdown)(selectedModel); // Call directly, already imported\r\n});\r\n\n\n//# sourceURL=webpack://realtime-translator/./renderer.js?");

/***/ }),

/***/ "crypto":
/*!*************************!*\
  !*** external "crypto" ***!
  \*************************/
/***/ ((module) => {

"use strict";
module.exports = require("crypto");

/***/ }),

/***/ "electron":
/*!***************************!*\
  !*** external "electron" ***!
  \***************************/
/***/ ((module) => {

"use strict";
module.exports = require("electron");

/***/ }),

/***/ "fs":
/*!*********************!*\
  !*** external "fs" ***!
  \*********************/
/***/ ((module) => {

"use strict";
module.exports = require("fs");

/***/ }),

/***/ "os":
/*!*********************!*\
  !*** external "os" ***!
  \*********************/
/***/ ((module) => {

"use strict";
module.exports = require("os");

/***/ }),

/***/ "path":
/*!***********************!*\
  !*** external "path" ***!
  \***********************/
/***/ ((module) => {

"use strict";
module.exports = require("path");

/***/ }),

/***/ "./node_modules/dotenv/package.json":
/*!******************************************!*\
  !*** ./node_modules/dotenv/package.json ***!
  \******************************************/
/***/ ((module) => {

"use strict";
eval("module.exports = /*#__PURE__*/JSON.parse('{\"name\":\"dotenv\",\"version\":\"16.4.5\",\"description\":\"Loads environment variables from .env file\",\"main\":\"lib/main.js\",\"types\":\"lib/main.d.ts\",\"exports\":{\".\":{\"types\":\"./lib/main.d.ts\",\"require\":\"./lib/main.js\",\"default\":\"./lib/main.js\"},\"./config\":\"./config.js\",\"./config.js\":\"./config.js\",\"./lib/env-options\":\"./lib/env-options.js\",\"./lib/env-options.js\":\"./lib/env-options.js\",\"./lib/cli-options\":\"./lib/cli-options.js\",\"./lib/cli-options.js\":\"./lib/cli-options.js\",\"./package.json\":\"./package.json\"},\"scripts\":{\"dts-check\":\"tsc --project tests/types/tsconfig.json\",\"lint\":\"standard\",\"lint-readme\":\"standard-markdown\",\"pretest\":\"npm run lint && npm run dts-check\",\"test\":\"tap tests/*.js --100 -Rspec\",\"test:coverage\":\"tap --coverage-report=lcov\",\"prerelease\":\"npm test\",\"release\":\"standard-version\"},\"repository\":{\"type\":\"git\",\"url\":\"git://github.com/motdotla/dotenv.git\"},\"funding\":\"https://dotenvx.com\",\"keywords\":[\"dotenv\",\"env\",\".env\",\"environment\",\"variables\",\"config\",\"settings\"],\"readmeFilename\":\"README.md\",\"license\":\"BSD-2-Clause\",\"devDependencies\":{\"@definitelytyped/dtslint\":\"^0.0.133\",\"@types/node\":\"^18.11.3\",\"decache\":\"^4.6.1\",\"sinon\":\"^14.0.1\",\"standard\":\"^17.0.0\",\"standard-markdown\":\"^7.1.0\",\"standard-version\":\"^9.5.0\",\"tap\":\"^16.3.0\",\"tar\":\"^6.1.11\",\"typescript\":\"^4.8.4\"},\"engines\":{\"node\":\">=12\"},\"browser\":{\"fs\":false}}');\n\n//# sourceURL=webpack://realtime-translator/./node_modules/dotenv/package.json?");

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