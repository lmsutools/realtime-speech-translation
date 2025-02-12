import { translateWithAI } from './translation.js';
import { pasteText } from './utils.js';
import { isInputDeviceAvailable } from './devices.js';

let mediaRecorder;
let socket;
let transcriptions = [];
let translations = [];

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

        // --- Get AI Provider Settings from localStorage using the unified keys ---
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
        if (!deepgramKey) {
            console.error("Deepgram API key is not set. Please set it in settings.");
            document.getElementById('source-text').textContent =
                'Deepgram API key is not set. Please set it in settings.';
            return;
        }

        if (selectedDeviceId && !(await isInputDeviceAvailable(selectedDeviceId))) {
            console.warn(`Previously selected input device (${selectedDeviceId}) is not available.`);
            localStorage.removeItem('defaultInputDevice');
            document.getElementById('source-text').textContent =
                'Previously selected input device is not available. Using default device.';
        }

        let stream;
        if (selectedDeviceId) {
            stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    deviceId: selectedDeviceId
                }
            });
        } else {
            console.warn("Using default input device.");
            stream = await navigator.mediaDevices.getUserMedia({
                audio: true
            });
            document.getElementById('source-text').textContent = 'Using default input device.';
        }

        mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'audio/webm'
        });

        // Build query parameters for Deepgram’s /listen endpoint.
        // Always include model, language, and punctuation.
        let queryParams = `?model=${selectedModel}&language=${selectedLanguage}&punctuate=true`;
        if (diarizationEnabled) {
            queryParams += `&diarize=true`;
        }

        socket = new WebSocket(`wss://api.deepgram.com/v1/listen${queryParams}`, ['token', deepgramKey]);

        socket.onmessage = async (msg) => {
            const parsed = JSON.parse(msg.data || '{}');
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
                    // Pass the transcript to translateWithAI (which handles provider selection)
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
            console.error('WebSocket error:', error);
        };

        socket.onclose = () => {
            console.log('WebSocket connection closed');
        };

        socket.onopen = () => {
            mediaRecorder.start(50);
            console.log('MediaRecorder started');
            // Debug: Log the selected AI Provider and Model for verification.
            console.log("Using AI Provider on Start:", defaultAiProvider.name);
            console.log("Using AI Model on Start:", defaultAiModel);

        };

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0 && socket?.readyState === WebSocket.OPEN) {
                socket.send(event.data);
            }
        };

        document.getElementById('start').style.display = 'none';
        document.getElementById('stop').style.display = 'block'; // Show Stop button

    } catch (error) {
        console.error('Error starting recording:', error);
    }
}

export function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        console.log('Recording stopped');
    }
    if (socket) {
        socket.close();
        socket = null;
    }
    document.getElementById('start').style.display = 'block'; // Show Start button
    document.getElementById('stop').style.display = 'none'; // Hide Stop button
}
