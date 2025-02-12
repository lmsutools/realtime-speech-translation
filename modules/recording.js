import {
    translateWithAI
} from './translation.js';
import {
    pasteText
} from './utils.js';
import {
    isInputDeviceAvailable
} from './devices.js';

let mediaRecorder;
let socket;
let transcriptions = [];
let translations = [];
let deepgramReady = false;

async function testDeepgramKey(deepgramKey) {
    try {
        const response = await fetch('https://api.deepgram.com/v1/auth/token', {
            method: 'GET', // Or POST, depending on Deepgram's current API
            headers: {
                'Authorization': `Token ${deepgramKey}`
            }
        });

        if (!response.ok) {
            // Handle HTTP errors (401 Unauthorized, etc.)
            const errorText = await response.text(); // Get error details
            throw new Error(`Deepgram API Key Test Failed: ${response.status} - ${errorText}`);
        }
        const data = await response.json(); // Parse JSON response

        return data; // Return the successful response data
    } catch (error) {
        console.error("Deepgram Key Test Error:", error); // Consistent error logging
        throw error; // Re-throw to be caught by startRecording
    }
}

export async function startRecording() {
    try {
        // Get ALL settings from localStorage
        const selectedModel = localStorage.getItem('model') || 'nova-2';
        const selectedLanguage = localStorage.getItem('sourceLanguage');
        const targetLanguage = localStorage.getItem('targetLanguage');
        const diarizationEnabled = localStorage.getItem('diarizationEnabled') === 'true';
        const translationEnabled = localStorage.getItem('enableTranslation') === 'true';
        const selectedDeviceId = localStorage.getItem('defaultInputDevice');
        const deepgramKey = localStorage.getItem('deepgramApiKey');

        // --- Get AI Provider Settings ---
        const defaultAiProviderId = localStorage.getItem('translateDefaultAiProvider') || 'openai';
        const providersJson = localStorage.getItem('aiProviders');
        const aiProviders = JSON.parse(providersJson);
        const defaultAiProvider = aiProviders.find(provider => provider.id === defaultAiProviderId);
        const defaultAiModel = localStorage.getItem('translateDefaultAiModel') || defaultAiProvider.defaultModel;

        if (!selectedLanguage) {
            console.error("No source language selected.");
            return;
        }
        if (!targetLanguage) {
            console.error("No target language selected.");
            return;
        }
        // Deepgram API Key check (moved before WebSocket creation and now uses test function)
        if (!deepgramKey) {
            const errorMessage = "Deepgram API key is not set. Please set it in settings.";
            console.error(errorMessage);
            document.getElementById('source-text').textContent = errorMessage;
            return; // Exit early if no API key
        }

        // Test the Deepgram Key *before* connecting
        try {
            const keyTestResult = await testDeepgramKey(deepgramKey);
             console.log("Deepgram key test successful:", keyTestResult); // Log successful test
        } catch (keyTestError) {
            // Key test failed.  Error already logged by testDeepgramKey.
            document.getElementById('source-text').textContent = keyTestError.message; // Show error to user
            return; // Exit. Don't try to connect.
        }
        if (selectedDeviceId && !(await isInputDeviceAvailable(selectedDeviceId))) {
            const warnMessage = `Previously selected input device (${selectedDeviceId}) is not available.`;
            console.warn(warnMessage);
            localStorage.removeItem('defaultInputDevice');
            const deviceNotAvailableMessage = 'Previously selected input device is not available. Using default device.';
            document.getElementById('source-text').textContent = deviceNotAvailableMessage;
        }

        let stream;
        if (selectedDeviceId) {
            stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    deviceId: selectedDeviceId
                }
            });
        } else {
            const defaultDeviceMessage = "Using default input device.";
            console.warn(defaultDeviceMessage);
            stream = await navigator.mediaDevices.getUserMedia({
                audio: true
            });
            document.getElementById('source-text').textContent = defaultDeviceMessage;

        }

        mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'audio/webm'
        });

        // Build query parameters
        let queryParams = `?model=${selectedModel}&language=${selectedLanguage}&punctuate=true`;
        if (diarizationEnabled) {
            queryParams += `&diarize=true`;
        }

        socket = new WebSocket(`wss://api.deepgram.com/v1/listen${queryParams}`, ['token', deepgramKey]);

        socket.onopen = () => {
            // We don't start recording *immediately* onopen.
            // We wait for a sign from Deepgram that everything is OK (Metadata message).
            console.log('WebSocket connection opened');
            deepgramReady = true; // We can set to true after successful key test.
        };

        socket.onmessage = async (msg) => {
            const parsed = JSON.parse(msg.data || '{}');

            // Check for Deepgram's error message (shouldn't happen now, but good practice)
            if (parsed.type === 'ErrorResponse') {
                console.error(`Deepgram Error: ${parsed.description} (Code: ${parsed.request_id})`);
                socket.close(); // Close the connection
                deepgramReady = false;
                return;
            }

            // Start recording after receiving the Metadata message
            if (parsed.type === 'Metadata' && !mediaRecorder.state == "recording") {
                mediaRecorder.start(50);
                console.log('MediaRecorder started');
                console.log("Using AI Provider on Start:", defaultAiProvider.name);
                console.log("Using AI Model on Start:", defaultAiModel);
            }

            const transcript = parsed?.channel?.alternatives[0]?.transcript;
            if (transcript) {
                console.log(transcript);
                if (document.getElementById('source-text').textContent === 'Previously selected input device is not available. Using default device.' ||
                    document.getElementById('source-text').textContent === 'Using default input device.' ||
                    document.getElementById('source-text').textContent === 'Deepgram API key is not set. Please set it in settings.') {
                    document.getElementById('source-text').textContent = '';
                }
                document.getElementById('source-text').textContent += ` ${transcript}`;
                transcriptions.push(transcript);

                if (transcriptions.length > 10) {
                    transcriptions.shift();
                }

                const pasteOption = document.getElementById('pasteOption').value;
                if (pasteOption === 'source') {
                    pasteText(transcript);
                }

                if (translationEnabled) {
                    const translation = await translateWithAI(transcript, transcriptions.join(' '), translations.join(' '));
                    translations.push(translation);
                    if (translations.length > 10) {
                        translations.shift();
                    }
                    console.log('translation', translation)
                    document.getElementById('translated-text').textContent += ` ${translation}`;
                    if (pasteOption === 'translated') {
                        pasteText(translation);
                    }
                }
            }
        };

        socket.onerror = (error) => {
            // General WebSocket errors (network issues, etc.)
            console.error(error);
        };

        socket.onclose = (event) => {
            if (event.wasClean) {
                console.log(`WebSocket connection closed cleanly, code=${event.code}, reason=${event.reason}`);
            } else {
                console.error(event); // Log the close event details
            }
            deepgramReady = false; // Reset the flag on close
        };

        mediaRecorder.ondataavailable = (event) => {
            if (deepgramReady && event.data.size > 0 && socket?.readyState === WebSocket.OPEN) {
                socket.send(event.data);
            }
        };

        document.getElementById('start').style.display = 'none';
        document.getElementById('stop').style.display = 'block';
    } catch (error) {
        // Top-level error handling (e.g., for getUserMedia failures)
        console.error('Error starting recording:', error);
        document.getElementById('source-text').textContent = 'Error starting recording: ' + error.message;
    }
}

export function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        console.log('Recording stopped');
        deepgramReady = false;
    }
    if (socket) {
        socket.close();
        socket = null;
    }
    document.getElementById('start').style.display = 'block';
    document.getElementById('stop').style.display = 'none';
}
