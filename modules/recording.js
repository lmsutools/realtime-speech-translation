import { translateWithAI } from './translation.js';
import { pasteText } from './utils.js';

let mediaRecorder;
let socket;
let transcriptions = [];
let translations = [];

export async function startRecording() {
    try {
        // Get ALL settings from localStorage
        const selectedModel = localStorage.getItem('model') || 'nova-2';
        const selectedLanguage = localStorage.getItem('defaultSourceLanguage') || 'multi';
        const diarizationEnabled = localStorage.getItem('diarizationEnabled') === 'true';
        const translationEnabled = localStorage.getItem('enableTranslation') === 'true'; // Get from localStorage
        const selectedDeviceId = localStorage.getItem('defaultInputDevice'); // No fallback

        if (!selectedDeviceId) {
            console.error("No input device selected.  Please select one in settings.");
            return; // Exit if no device is selected
        }

        const stream = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: selectedDeviceId } });
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
                document.getElementById('source-text').textContent += ` ${transcript}`;
                transcriptions.push(transcript);
                if (transcriptions.length > 10) {
                    transcriptions.shift();
                }

                const pasteOption = document.getElementById('pasteOption').value;
                if (pasteOption === 'source') {
                    pasteText(transcript);
                }

                // Use translationEnabled from localStorage here:
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
