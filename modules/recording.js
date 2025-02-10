import { translateWithAI } from './translation.js';
import { pasteText } from './utils.js';
import { isInputDeviceAvailable } from './devices.js'; // Import the new function

let mediaRecorder;
let socket;
let transcriptions = [];
let translations = [];

export async function startRecording() {
    try {
        // Get settings from localStorage
        const selectedModel = localStorage.getItem('model') || 'nova-2';
        const selectedLanguage = localStorage.getItem('sourceLanguage');
        const targetLanguage = localStorage.getItem('targetLanguage');
        const diarizationEnabled = localStorage.getItem('diarizationEnabled') === 'true';
        const translationEnabled = localStorage.getItem('enableTranslation') === 'true';
        let selectedDeviceId = localStorage.getItem('defaultInputDevice'); // Get stored ID

        if (!selectedLanguage) {
            console.error("No source language selected.");
            return;
        }
        if (!targetLanguage) {
            console.error("No target language selected.");
            return;
        }

        // --- Device Availability Check ---
        if (selectedDeviceId && !(await isInputDeviceAvailable(selectedDeviceId))) {
            console.warn(`Previously selected input device (${selectedDeviceId}) is not available.`);
            localStorage.removeItem('defaultInputDevice'); // Clear the stored ID
            selectedDeviceId = null; // Don't use the unavailable device
             //Show message in UI.
            document.getElementById('source-text').textContent = 'Previously selected input device is not available. Using default device.';
        }

        let stream;
        if (selectedDeviceId) {
            // If we have a valid, available device ID, use it
            stream = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: selectedDeviceId } });
        } else {
            // Otherwise, fall back to the default device
            console.warn("Using default input device.");
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
             //Show message in UI.
            document.getElementById('source-text').textContent = 'Using default input device.';

        }

        mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

        let queryParams = `?model=${selectedModel}&language=${selectedLanguage}&punctuate=true`;
        if (diarizationEnabled) {
            queryParams += `&diarize=true`;
        }

        socket = new WebSocket(`wss://api.deepgram.com/v1/listen${queryParams}`, ['token', process.env.DEEPGRAM_KEY]);

        socket.onmessage = async (msg) => {
            const parsed = JSON.parse(msg.data || '{}');
            const transcript = parsed?.channel?.alternatives[0]?.transcript;

            if (transcript) {
                console.log(transcript);
                 //Show message in UI.
                if(document.getElementById('source-text').textContent == 'Previously selected input device is not available. Using default device.'
                || document.getElementById('source-text').textContent == 'Using default input device.'){
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
                    console.log('translation', translation);
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
        };
        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0 && socket?.readyState === WebSocket.OPEN) {
                socket.send(event.data);
            }
        };
        document.getElementById('start').style.display = 'none';
        document.getElementById('stop').style.display = 'block';

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
    document.getElementById('start').style.display = 'block';
    document.getElementById('stop').style.display = 'none';
}
